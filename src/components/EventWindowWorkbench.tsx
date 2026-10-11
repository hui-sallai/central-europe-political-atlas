"use client";
import { LocalizedContent } from "@/i18n/LocalizedContent";
import { useLocale } from "@/i18n/LocaleProvider";
import { englishText } from "@/i18n/reviewedText";

import { useEffect, useMemo, useState } from "react";
import { attachOverlappingEvents, buildLineSegments, computeEventWindow, eventWindowEligibility, type HighFrequencyPoint } from "@/lib/eventWindowEngine";
import { linkedWindowOutcomes, representativeEventIds } from "@/lib/eventAnalysisLinks";
import { EventAnalysisPanel, type WindowAvailability } from "@/components/EventAnalysisPanel";
import type { Country } from "@/types/Country";
import type { Event } from "@/types/Event";
import type { EventChangeSemantics, EventWindowResult } from "@/types/EventWindow";
import type { MacroDriverRuntimeRow } from "@/types/MacroDriver";

// Runtime row layout (high_frequency_runtime.json, schema high-frequency-runtime-v1.31):
// 0 id, 1 country, 2 period, 3 indicator, 4 value, 5 transformation,
// 6 unit, 7 value_semantics, 8 seasonal_adjustment, 9 definition_version,
// 10 source_dataset, 11 data_status
type RuntimeRow = [string, string, string, string, number | null, string, string, HighFrequencyPoint["value_semantics"], string, string, string, string];

const outcomeLabels: Record<string, string> = {
  hicp_monthly_index: "HICP 月度指数",
  hicp_annual_rate: "HICP 年通胀率",
  unemployment_rate_monthly: "月度失业率（季调）",
  industrial_production_index: "工业生产指数（季调日历调整）",
  "policy_rate:level": "政策利率水平",
  "long_term_government_yield:level": "长期政府债券收益率",
  "bilateral_fx_local_per_eur:level": "本币兑欧元汇率",
  "nominal_effective_exchange_rate:level": "名义有效汇率",
  "real_effective_exchange_rate:level": "实际有效汇率",
  "hicp_energy_annual_rate:yoy_rate": "HICP 能源同比",
  "brent_crude_price_usd:level": "布伦特原油价格",
  "europe_natural_gas_price_usd:level": "欧洲天然气价格",
};

function macroValueSemantics(row: MacroDriverRuntimeRow): HighFrequencyPoint["value_semantics"] {
  if (row[7] === "yoy_rate") return "yoy_rate";
  if (row[7].includes("change")) return "growth_rate";
  if (row[6].startsWith("%")) return "rate_percent";
  if (row[6].includes("index")) return "index_level";
  return "currency_level";
}

// Domestic monthly series used to report data coverage around an event when no explained link exists.
const coverageOutcomes = ["hicp_annual_rate", "industrial_production_index", "unemployment_rate_monthly"] as const;

const eventTypeLabels: Record<string, { zh: string; en: string }> = {
  fiscal: { zh: "财政", en: "Fiscal" }, EU_funds: { zh: "欧盟资金", en: "EU funds" }, macro: { zh: "宏观经济", en: "Macroeconomy" },
  energy: { zh: "能源", en: "Energy" }, industrial_policy: { zh: "产业政策", en: "Industrial policy" }, FDI: { zh: "外商直接投资", en: "Foreign direct investment" },
  China: { zh: "对华关系", en: "China relations" }, election: { zh: "选举", en: "Elections" }, regional: { zh: "区域合作", en: "Regional cooperation" },
};

const windowOptions = [6, 12, 18, 24] as const;

const changeLabel: Record<EventChangeSemantics, string> = {
  percentage_points: "事件前后变化（个百分点）",
  index_points: "事件前后变化（指数点）",
  relative_percent: "事件前后变化（相对百分比）",
  absolute_units: "事件前后变化（绝对）",
};

function signed(value: number, suffix: string) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}${suffix}`;
}

function formatChange(value: number | null, semantics: EventChangeSemantics) {
  if (value === null) return "暂不可计算";
  if (semantics === "percentage_points") return signed(value, " 个百分点");
  if (semantics === "index_points") return signed(value, " 指数点");
  if (semantics === "relative_percent") return signed(value, "%");
  return signed(value, "");
}

export function EventWindowWorkbench({ countries, events, initialCountry, initialEvent, initialOutcome }: {
  countries: Country[];
  events: Event[];
  initialCountry?: string;
  initialEvent?: string;
  initialOutcome?: string;
}) {
  const locale = useLocale();
  const en = locale === "en";
  const [series, setSeries] = useState<HighFrequencyPoint[]>([]);
  const [sources, setSources] = useState<Record<string, string>>({});
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [country, setCountry] = useState(initialCountry ?? "hungary");
  const [eventId, setEventId] = useState(initialEvent ?? "");
  // An outcome is preselected only when it has an explained link to the event; a category never selects one.
  const [outcome, setOutcome] = useState(() => { const linked = initialEvent ? linkedWindowOutcomes(initialEvent) : []; return initialOutcome && linked.includes(initialOutcome) ? initialOutcome : linked[0] ?? ""; });
  const [windowMonths, setWindowMonths] = useState(12);
  const [result, setResult] = useState<EventWindowResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    Promise.all([
      fetch(`${basePath}/research-data/high_frequency_runtime.json`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); }),
      fetch(`${basePath}/research-data/macro_driver_runtime.json`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); }),
    ]).then(([payload, macroPayload]: [{ records: RuntimeRow[] }, { records: MacroDriverRuntimeRow[] }]) => {
        const domestic = payload.records.map((row) => ({
          observation_id: row[0],
          country: row[1],
          period: row[2],
          indicator: row[3],
          value: row[4],
          transformation: row[5],
          unit: row[6],
          value_semantics: row[7] ?? undefined,
          seasonal_adjustment: row[8],
          definition_version: row[9],
        }));
        const supported = new Set(Object.keys(outcomeLabels).filter((id) => id.includes(":")));
        const macro = macroPayload.records.flatMap((row) => {
          const indicator = `${row[1]}:${row[7]}`;
          if (!supported.has(indicator)) return [];
          const targetCountries = row[2] ? [row[2]] : (row[20]?.length ? row[20] : countries.map((countryItem) => countryItem.slug));
          return targetCountries.map((countrySlug) => ({
            observation_id: `${row[0]}:${countrySlug}`,
            country: countrySlug,
            period: row[4],
            indicator,
            value: row[5],
            transformation: row[7],
            unit: row[6],
            value_semantics: macroValueSemantics(row),
            seasonal_adjustment: "not_applicable",
            definition_version: row[12],
            derivation_status: row[15], availability_reason: row[16], temporal_alignment_status: row[17],
            series_instance_id: row[18], applicability_scope: row[19], shared_series: row[21], policy_regime_id: row[23],
          } satisfies HighFrequencyPoint));
        });
        setSeries([...domestic, ...macro]);
        setSources(Object.fromEntries(payload.records.filter((row) => row[10]).map((row) => [row[3], row[10]])));
        setLoadState("ready");
      })
      .catch((loadError) => { if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setLoadState("error"); });
    return () => controller.abort();
  }, [countries]);

  const countryEvents = useMemo(() => events
    .filter((event) => event.country_slug === country)
    .map((event) => ({ event, eligibility: eventWindowEligibility(event) }))
    .sort((a, b) => b.event.date.localeCompare(a.event.date)), [events, country]);

  const selectedEvent = countryEvents.find((item) => item.event.event_id === eventId)?.event ?? null;
  const linked = useMemo(() => (selectedEvent ? linkedWindowOutcomes(selectedEvent.event_id) : []), [selectedEvent]);
  // Data coverage at the default ±12 month window, counted by the engine itself (no separate gate logic here).
  const availability = useMemo<WindowAvailability[] | null>(() => {
    if (!selectedEvent || loadState !== "ready" || !eventWindowEligibility(selectedEvent).eligible) return selectedEvent && loadState === "ready" ? [] : null;
    return [...linked, ...coverageOutcomes.filter((id) => !linked.includes(id))].flatMap((id) => {
      const outcomeSeries = series.filter((item) => item.indicator === id && item.country === selectedEvent.country_slug);
      if (!outcomeSeries.length) return [];
      const computed = computeEventWindow(selectedEvent, outcomeSeries);
      return [{ outcome: id, label: en ? englishText(outcomeLabels[id] ?? id) : outcomeLabels[id] ?? id, pre: computed.pre_observations, post: computed.post_observations, gate: computed.gate, linked: linked.includes(id) }];
    });
  }, [selectedEvent, loadState, series, linked, en]);

  function run(selectedOutcome: string = outcome, months: number = windowMonths) {
    if (!selectedEvent || loadState !== "ready" || !selectedOutcome) return;
    const outcomeSeries = series.filter((item) => item.indicator === selectedOutcome);
    const computed = computeEventWindow(selectedEvent, outcomeSeries, { preMonths: months, postMonths: months });
    setResult(attachOverlappingEvents(computed, events));
  }
  function selectEvent(nextCountry: string, nextEvent: string) {
    setCountry(nextCountry); setEventId(nextEvent); setOutcome(linkedWindowOutcomes(nextEvent)[0] ?? ""); setResult(null);
  }
  const representative = representativeEventIds.flatMap((id) => { const event = events.find((item) => item.event_id === id); return event ? [event] : []; });

  const chartValues = result ? result.points.filter((point) => point.value !== null).map((point) => point.value as number) : [];
  const chartMin = chartValues.length ? Math.min(...chartValues) : 0;
  const chartMax = chartValues.length ? Math.max(...chartValues) : 1;
  const chartRange = chartMax - chartMin || 1;
  const plotLeft = 56;
  const plotRight = 660;
  const plotTop = 20;
  const plotBottom = 130;
  const pointX = (index: number) => plotLeft + (index / Math.max(1, (result?.points.length ?? 2) - 1)) * (plotRight - plotLeft);
  const pointY = (value: number) => plotBottom - ((value - chartMin) / chartRange) * (plotBottom - plotTop);
  const axisValue = (value: number) => value.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
  const segments = result ? buildLineSegments(result.points) : [];
  const resultPeriods = new Set(result?.points.map((point) => point.period) ?? []);
  const resultSeries = series.filter((item) => item.country === country && item.indicator === outcome && resultPeriods.has(item.period));
  const policyRegimes = new Set(resultSeries.map((item) => item.policy_regime_id).filter(Boolean));
  const regimeWarning = policyRegimes.size > 1 || resultSeries.some((item) => item.temporal_alignment_status === "regime_break" || item.derivation_status === "regime_blocked");

  return <LocalizedContent>{(
    <div className="mt-6 grid gap-6">
      <section className="editorial-panel p-5">
        <p className="editorial-kicker">Descriptive level 1 · 月度高频与宏观驱动数据</p>
        <h2 className="mt-2 text-2xl font-semibold">事件窗口分析 Event Window Analysis</h2>
        {locale === "en" ? <p className="mt-3 text-xs text-[var(--muted)]">Event titles remain in their original language (Chinese where applicable); no automatic translation is applied.</p> : null}
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">描述已核验事件前后的国内高频结果或宏观驱动变化：事件前均值、事件期数值、事件后均值与变化幅度。事件月单独报告，不计入事件后统计。宏观驱动关联只表示研究相关性；这不是因果事件研究，输出不构成因果效应。</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-[var(--muted)]">国家
            <select className="field-control mt-2" value={country} onChange={(event) => { setCountry(event.target.value); setEventId(""); setResult(null); }}>
              {countries.map((item) => <option key={item.slug} value={item.slug}>{item.name_zh} / {item.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">{en ? "Event (verified events; whether a window can be computed depends on the data)" : "事件（已核验事件；能否计算窗口取决于数据）"}
            <select className="field-control mt-2" value={eventId} onChange={(event) => selectEvent(country, event.target.value)}>
              <option value="">请选择事件</option>
              {countryEvents.map(({ event, eligibility }) => (
                <option lang="zh-CN" data-original-language="zh-CN" key={event.event_id} value={event.event_id} disabled={!eligibility.eligible} title={eligibility.reason ?? undefined}>
                  {event.date} · {event.title}{eligibility.eligible ? "" : "（不可分析）"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">观察指标
            <select className="field-control mt-2" value={outcome} onChange={(event) => { setOutcome(event.target.value); setResult(null); }}>
              <option value="">{en ? "Choose a series" : "请选择序列"}</option>
              {Object.entries(outcomeLabels).map(([id, label]) => <option key={id} value={id}>{en ? englishText(label) : label}{linked.includes(id) ? (en ? " (explained link)" : "（有说明的关联）") : ""}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">分析窗口（前后各 N 个月）
            <select className="field-control mt-2" value={windowMonths} onChange={(event) => { setWindowMonths(Number(event.target.value)); setResult(null); }}>
              {windowOptions.map((option) => <option key={option} value={option}>-{option} 个月 到 +{option} 个月</option>)}
            </select>
          </label>
        </div>
        {selectedEvent ? <p className="mt-3 text-xs text-[var(--muted)]" data-outcome-link-note>{linked.length ? (en ? "Series marked as an explained link have a written rationale for this event. Any other series can be chosen manually and only describes the period." : "标注“有说明的关联”的序列附有针对该事件的书面理由。其他序列可以手动选择，结果只是对该时期的描述。") : (en ? "No series is recommended for this event: no monthly indicator has an explained link to it, and the event category is not used to suggest one. A series can still be chosen manually; the result only describes the period." : "不为该事件推荐序列：没有任何月度指标与它存在经过说明的关联，也不会根据事件类别给出建议。仍可手动选择序列，结果只是对该时期的描述。")}</p> : null}
        <button type="button" className="mt-5 rounded-lg cta-dark px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50" onClick={() => run()} disabled={!selectedEvent || !outcome || loadState !== "ready"}>
          {loadState === "loading" ? "正在加载高频数据…" : loadState === "error" ? "高频数据不可用" : "运行事件窗口分析"}
        </button>
        {loadState === "error" ? <p className="mt-4 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm">无法运行事件窗口分析：高频月度数据未能加载。请稍后重试，或在研究数据包中查看原始序列。</p> : null}
      </section>

      {representative.length ? (
        <section className="border-y border-[var(--line)] py-4" data-representative-events>
          <p className="text-sm font-semibold">{en ? "Representative event studies" : "代表性事件研究"}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{en ? "Four historical events with reviewed background and mechanism notes. They are case descriptions, not causal studies; each shows only the levels its evidence supports." : "四个附有经审阅的背景与机制说明的历史事件。它们是案例描述，不是因果研究；每个事件只显示其证据支持的层次。"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {representative.map((event) => (
              <button key={event.event_id} type="button" aria-pressed={event.event_id === eventId} onClick={() => selectEvent(event.country_slug, event.event_id)} data-representative-event={event.event_id} className={`rounded-full border px-3 py-1 text-left text-xs font-semibold ${event.event_id === eventId ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)]"}`}>
                {event.date} · <span lang="zh-CN" data-original-language="zh-CN">{event.title}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedEvent ? <EventAnalysisPanel event={selectedEvent} availability={availability} onOpenWindow={(id) => { setOutcome(id); setWindowMonths(12); run(id, 12); }} /> : null}

      {result ? (
        <section className="editorial-panel p-5">
          <div className="border-b border-[var(--line)] pb-4">
            <p className="editorial-kicker">{result.event_date} · {countries.find((item) => item.slug === result.country)?.name_zh ?? result.country}</p>
            <h3 lang="zh-CN" data-original-language="zh-CN" className="mt-2 text-xl font-semibold">{result.event_title}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">观察指标：{outcomeLabels[result.outcome] ?? result.outcome} · 窗口：-{result.window.pre_months} / +{result.window.post_months} 个月</p>
          </div>

          {result.gate === "insufficient_data" ? (
            <p className="mt-5 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm" role="alert">数据窗口不足，无法运行完整事件窗口分析。完整窗口需要至少 12 个事件前月度观测与 6 个真正的事件后观测（事件月不计入；当前：{result.pre_observations} / {result.post_observations}）。该事件可能距数据覆盖期末端太近。</p>
          ) : (
            <>
              {result.exploratory ? <p className="mt-5 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm" role="alert">探索性 · 数据窗口较短：当前观测（事件前 {result.pre_observations} / 事件后 {result.post_observations}）未达到完整窗口要求，结果仅供初步浏览。</p> : null}
              {regimeWarning ? <p className="mt-5 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm" role="alert">该窗口跨越政策制度或工具定义切换。切换两侧不能解释为同一政策利率序列的自然连续变化；被阻断月份保持缺口，不做插值。</p> : null}
              {result.overlapping_event_warning ? (
                <div className="mt-5 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm" role="alert">
                  <p className="font-semibold">同期其他事件（{result.overlapping_events.length}）</p>
                  <p className="mt-1">{result.overlapping_event_warning}</p>
                  <ul className="mt-2 grid gap-1 text-xs">
                    {result.overlapping_events.map((overlap) => <li key={overlap.event_id}>{overlap.date} · {eventTypeLabels[overlap.event_type]?.[en ? "en" : "zh"] ?? overlap.event_type} · <span lang="zh-CN" data-original-language="zh-CN">{overlap.title}</span></li>)}
                  </ul>
                </div>
              ) : null}

              <div className="mt-6">
                <svg viewBox="0 0 680 200" className="w-full" role="img" aria-label={locale === "en" ? `Event-window chart: ${englishText(outcomeLabels[result.outcome] ?? result.outcome)}, ${result.window.pre_months} months before and ${result.window.post_months} months after the event` : `${result.event_title} 的事件窗口图：${outcomeLabels[result.outcome] ?? result.outcome} 在事件前后各 ${result.window.pre_months} 个月的变化`}>
                  {[chartMin, chartMin + chartRange / 2, chartMax].map((tick) => (
                    <g key={tick}>
                      <line x1={plotLeft} y1={pointY(tick)} x2={plotRight} y2={pointY(tick)} stroke="var(--line)" strokeWidth="0.5" />
                      <text x={plotLeft - 6} y={pointY(tick) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">{axisValue(tick)}</text>
                    </g>
                  ))}
                  {segments.map((segment) => (
                    <polyline
                      key={segment[0]?.period ?? "empty"}
                      points={segment.map((point) => `${pointX(point.index)},${pointY(point.value)}`).join(" ")}
                      fill="none" stroke="var(--foreground)" strokeWidth="1.5"
                    />
                  ))}
                  {result.points.map((point, index) => point.value === null ? null : (
                    <circle key={point.period} cx={pointX(index)} cy={pointY(point.value)} r={point.relative_month === 0 ? 3 : 1.5} fill={point.relative_month === 0 ? "var(--accent)" : "var(--foreground)"} />
                  ))}
                  <line x1={pointX(result.window.pre_months)} y1={plotTop} x2={pointX(result.window.pre_months)} y2={plotBottom} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" />
                  <text x={pointX(result.window.pre_months)} y={14} textAnchor="middle" fontSize="10" fill="var(--accent)">{en ? `Event month ${result.event_period} (event date ${result.event_date})` : `事件月 ${result.event_period}（事件日期 ${result.event_date}）`}</text>
                  {result.unit ? <text x={4} y={14} fontSize="9" fill="var(--muted)" data-chart-unit>{en ? `Unit: ${englishText(result.unit)}` : `单位：${result.unit}`}</text> : null}
                  {result.pre_period_mean !== null ? <line x1={plotLeft} y1={pointY(result.pre_period_mean)} x2={pointX(result.window.pre_months)} y2={pointY(result.pre_period_mean)} stroke="var(--muted)" strokeWidth="1" strokeDasharray="2 3" /> : null}
                  {result.post_period_mean !== null ? <line x1={pointX(result.window.pre_months)} y1={pointY(result.post_period_mean)} x2={plotRight} y2={pointY(result.post_period_mean)} stroke="var(--muted)" strokeWidth="1" strokeDasharray="2 3" /> : null}
                  {result.points.filter((_, index) => index % Math.ceil(result.points.length / 8) === 0).map((point) => (
                    <text key={point.period} x={pointX(result.points.indexOf(point))} y={146} textAnchor="middle" fontSize="9" fill="var(--muted)">{point.period}</text>
                  ))}
                  <g fontSize="9" fill="var(--muted)">
                    <line x1={plotLeft} y1={162} x2={plotLeft + 18} y2={162} stroke="var(--foreground)" strokeWidth="1.5" />
                    <text x={plotLeft + 24} y={165}>月度观测</text>
                    <line x1={plotLeft + 90} y1={162} x2={plotLeft + 108} y2={162} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" />
                    <text x={plotLeft + 114} y={165}>事件期</text>
                    <line x1={plotLeft + 170} y1={162} x2={plotLeft + 188} y2={162} stroke="var(--muted)" strokeWidth="1" strokeDasharray="2 3" />
                    <text x={plotLeft + 194} y={165}>事件前 / 事件后均值</text>
                    <text x={plotLeft} y={184}>缺失月份在图中断线，不做视觉插值。</text>
                  </g>
                </svg>
              </div>

              <dl className="mt-6 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3 lg:grid-cols-4">
                {([
                  ["事件前均值", result.pre_period_mean === null ? null : result.pre_period_mean.toLocaleString("zh-CN", { maximumFractionDigits: 2 })],
                  ["事件期数值", result.event_period_value === null ? null : result.event_period_value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })],
                  ["事件后均值", result.post_period_mean === null ? null : result.post_period_mean.toLocaleString("zh-CN", { maximumFractionDigits: 2 })],
                  [changeLabel[result.change_semantics], formatChange(result.absolute_change_pre_to_post, result.change_semantics)],
                  ["事件期相对事件前", result.event_vs_pre_difference === null ? null : formatChange(result.event_vs_pre_difference, result.change_semantics)],
                  result.relative_percentage_change === null
                    ? ["相对变化（百分比）", null]
                    : ["相对变化（百分比）", formatChange(result.relative_percentage_change, "relative_percent")],
                  ["数据完整度", `${result.data_completeness}%`],
                  ["观测数（前/后）", `${result.pre_observations} / ${result.post_observations}`],
                ] as Array<[string, string | null]>).map(([label, value]) => (
                  <div key={label} className="bg-white p-3">
                    <dt className="text-xs text-[var(--muted)]">{label}</dt>
                    <dd className="metric-number mt-1 text-sm font-semibold">{value ?? "暂不可计算"}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-[var(--muted)]" data-window-source>{en ? `Observation period: ${result.points[0]?.period} to ${result.points.at(-1)?.period} · Source: ${sources[result.outcome] ?? "see the macro-driver dictionary in the research data package"}` : `观测期：${result.points[0]?.period} 至 ${result.points.at(-1)?.period} · 来源：${sources[result.outcome] ?? "见研究数据包中的宏观驱动字典"}`}</p>
              <p className="mt-3 text-xs text-[var(--muted)]">缺失月份：{result.missing_periods.length ? result.missing_periods.join("、") : "无"} · 单位：{result.unit ?? "—"} · 事件月不计入事件后均值与事件后观测数。</p>
              <p className="mt-5 text-sm leading-7 text-[var(--muted)]">{result.interpretation_boundary}</p>
              <details className="advanced-disclosure mt-4"><summary>数据溯源（{result.data_trace.length} 条月度观测）</summary><p className="mt-3 break-words font-mono text-[10px] leading-5 text-[var(--muted)]">{result.data_trace.join(" · ")}</p></details>
            </>
          )}
        </section>
      ) : null}

      <section className="border-y border-[var(--line)] py-5">
        <p className="text-sm font-semibold">Formal Event Study（因果事件研究）：尚未开放</p>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">正式因果事件研究需要对照组设计与识别策略，当前保持 registry_only，不输出任何估计。</p>
      </section>
    </div>
  )}</LocalizedContent>;
}
