"use client";

import { useEffect, useMemo, useState } from "react";
import { attachOverlappingEvents, buildLineSegments, computeEventWindow, eventWindowEligibility, suggestedOutcomes, type HighFrequencyPoint } from "@/lib/eventWindowEngine";
import type { Country } from "@/types/Country";
import type { Event } from "@/types/Event";
import type { EventChangeSemantics, EventWindowResult } from "@/types/EventWindow";

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
  const [series, setSeries] = useState<HighFrequencyPoint[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [country, setCountry] = useState(initialCountry ?? "hungary");
  const [eventId, setEventId] = useState(initialEvent ?? "");
  const [outcome, setOutcome] = useState(initialOutcome ?? "hicp_annual_rate");
  const [windowMonths, setWindowMonths] = useState(12);
  const [result, setResult] = useState<EventWindowResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${basePath}/research-data/high_frequency_runtime.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then((payload: { records: RuntimeRow[] }) => {
        setSeries(payload.records.map((row) => ({
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
        })));
        setLoadState("ready");
      })
      .catch((loadError) => { if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setLoadState("error"); });
    return () => controller.abort();
  }, []);

  const countryEvents = useMemo(() => events
    .filter((event) => event.country_slug === country)
    .map((event) => ({ event, eligibility: eventWindowEligibility(event) }))
    .sort((a, b) => b.event.date.localeCompare(a.event.date)), [events, country]);

  const selectedEvent = countryEvents.find((item) => item.event.event_id === eventId)?.event ?? null;
  const suggestions = selectedEvent ? suggestedOutcomes(selectedEvent.event_type) : [];

  function run() {
    if (!selectedEvent || loadState !== "ready") return;
    const outcomeSeries = series.filter((item) => item.indicator === outcome);
    const computed = computeEventWindow(selectedEvent, outcomeSeries, { preMonths: windowMonths, postMonths: windowMonths });
    setResult(attachOverlappingEvents(computed, events));
  }

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

  return (
    <div className="mt-6 grid gap-6">
      <section className="editorial-panel p-5">
        <p className="editorial-kicker">Descriptive level 1 · 月度高频数据</p>
        <h2 className="mt-2 text-2xl font-semibold">事件窗口分析 Event Window Analysis</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">描述已核验事件前后的指标变化：事件前均值、事件期数值、事件后均值与变化幅度。事件月单独报告，不计入事件后统计。这不是因果事件研究（Formal Event Study 保持未开放），输出不构成因果效应。</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-[var(--muted)]">国家
            <select className="field-control mt-2" value={country} onChange={(event) => { setCountry(event.target.value); setEventId(""); setResult(null); }}>
              {countries.map((item) => <option key={item.slug} value={item.slug}>{item.name_zh} / {item.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">事件（仅列出可分析的已核验事件）
            <select className="field-control mt-2" value={eventId} onChange={(event) => { setEventId(event.target.value); setResult(null); }}>
              <option value="">请选择事件</option>
              {countryEvents.map(({ event, eligibility }) => (
                <option key={event.event_id} value={event.event_id} disabled={!eligibility.eligible} title={eligibility.reason ?? undefined}>
                  {event.date} · {event.title}{eligibility.eligible ? "" : "（不可分析）"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">观察指标
            <select className="field-control mt-2" value={outcome} onChange={(event) => { setOutcome(event.target.value); setResult(null); }}>
              {Object.entries(outcomeLabels).map(([id, label]) => <option key={id} value={id}>{label}{suggestions.includes(id) ? "（推荐观察指标）" : ""}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">分析窗口（前后各 N 个月）
            <select className="field-control mt-2" value={windowMonths} onChange={(event) => { setWindowMonths(Number(event.target.value)); setResult(null); }}>
              {windowOptions.map((option) => <option key={option} value={option}>-{option} 个月 到 +{option} 个月</option>)}
            </select>
          </label>
        </div>
        {suggestions.length ? <p className="mt-3 text-xs text-[var(--muted)]">推荐观察指标根据事件类别给出，仅用于导航，不表示因果关系。</p> : null}
        <button type="button" onClick={run} disabled={!selectedEvent || loadState !== "ready"} className="mt-5 rounded-lg bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {loadState === "loading" ? "正在加载高频数据…" : loadState === "error" ? "高频数据不可用" : "运行事件窗口分析"}
        </button>
        {loadState === "error" ? <p className="mt-4 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm">无法运行事件窗口分析：高频月度数据未能加载。请稍后重试，或在研究数据包中查看原始序列。</p> : null}
      </section>

      {result ? (
        <section className="editorial-panel p-5">
          <div className="border-b border-[var(--line)] pb-4">
            <p className="editorial-kicker">{result.event_date} · {countries.find((item) => item.slug === result.country)?.name_zh ?? result.country}</p>
            <h3 className="mt-2 text-xl font-semibold">{result.event_title}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">观察指标：{outcomeLabels[result.outcome] ?? result.outcome} · 窗口：-{result.window.pre_months} / +{result.window.post_months} 个月</p>
          </div>

          {result.gate === "insufficient_data" ? (
            <p className="mt-5 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm" role="alert">数据窗口不足，无法运行完整事件窗口分析。完整窗口需要至少 12 个事件前月度观测与 6 个真正的事件后观测（事件月不计入；当前：{result.pre_observations} / {result.post_observations}）。该事件可能距数据覆盖期末端太近。</p>
          ) : (
            <>
              {result.exploratory ? <p className="mt-5 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm" role="alert">探索性 · 数据窗口较短：当前观测（事件前 {result.pre_observations} / 事件后 {result.post_observations}）未达到完整窗口要求，结果仅供初步浏览。</p> : null}
              {result.overlapping_event_warning ? (
                <div className="mt-5 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm" role="alert">
                  <p className="font-semibold">同期其他事件（{result.overlapping_events.length}）</p>
                  <p className="mt-1">{result.overlapping_event_warning}</p>
                  <ul className="mt-2 grid gap-1 text-xs">
                    {result.overlapping_events.map((overlap) => <li key={overlap.event_id}>{overlap.date} · {overlap.event_type} · {overlap.title}</li>)}
                  </ul>
                </div>
              ) : null}

              <div className="mt-6">
                <svg viewBox="0 0 680 200" className="w-full" role="img" aria-label={`${result.event_title} 的事件窗口图：${outcomeLabels[result.outcome] ?? result.outcome} 在事件前后各 ${result.window.pre_months} 个月的变化`}>
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
                  <text x={pointX(result.window.pre_months)} y={14} textAnchor="middle" fontSize="10" fill="var(--accent)">事件期 {result.event_period}</text>
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
  );
}
