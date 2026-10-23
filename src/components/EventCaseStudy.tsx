import { useEffect, useMemo, useRef } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { englishText } from "@/i18n/reviewedText";
import { formatWithUnit } from "@/lib/format";
import { getCountryObservations, getResearchIndicator, researchCountries } from "@/lib/researchData";
import { isPublished } from "@/lib/freshnessCore";
import { PLATFORM_BASE_URL } from "@/lib/releaseMetadata";
import { getEventAnalysis, type Bi } from "@/lib/eventAnalysisLinks";
import { annualPhase, getEventCaseStudy, type AlternativeKind, type CaseStage, type ChainBasis } from "@/lib/eventCaseStudies";
import { attachOverlappingEvents, buildLineSegments, computeEventWindow, type HighFrequencyPoint } from "@/lib/eventWindowEngine";
import { NotebookCollect } from "@/components/NotebookCollect";
import type { Event } from "@/types/Event";
import type { EventWindowResult } from "@/types/EventWindow";

// End-to-end case-study dossier for a reviewed event. Documentary content comes from eventCaseStudies.ts and the event's
// analysis record; every number comes from published Atlas observations, and every monthly window is computed by the
// existing event-window engine. Nothing here estimates an effect, and the comparison country is descriptive context only.
const STAGES: CaseStage[] = ["announcement", "proposal", "legal_adoption", "implementation", "observed_outcome"];
const STAGE: Record<CaseStage, Bi> = {
  announcement: { zh: "公告", en: "Announcement" }, proposal: { zh: "提案", en: "Proposal" }, legal_adoption: { zh: "法律通过", en: "Legal adoption" },
  implementation: { zh: "实施", en: "Implementation" }, observed_outcome: { zh: "已观察到的结果", en: "Observed outcome" },
};
const BASIS: Record<ChainBasis, Bi> = {
  documented_fact: { zh: "有文件记录的事实", en: "Documented fact" }, documented_mechanism: { zh: "有文件依据的机制", en: "Documented mechanism" },
  research_hypothesis: { zh: "研究假设", en: "Research hypothesis" }, unsupported_connection: { zh: "不成立的关联", en: "Unsupported connection" },
};
const ALTERNATIVE: Record<AlternativeKind, Bi> = {
  business_cycle: { zh: "经济周期", en: "Business cycle" }, eu_policy: { zh: "欧盟层面政策", en: "EU-wide policy" }, energy_prices: { zh: "能源与大宗商品价格", en: "Energy and commodity prices" },
  government_measures: { zh: "其他政府措施", en: "Other government measures" }, concurrent_projects: { zh: "同期投资项目", en: "Concurrent investment projects" },
  base_effects: { zh: "基数效应", en: "Base effects" }, aggregate_composition: { zh: "总量构成", en: "Composition of the aggregate" },
  statistical_revisions: { zh: "统计修订", en: "Statistical revisions" }, concurrent_events: { zh: "同期其他事件", en: "Other events in the window" },
};
const MONTHLY_LABEL: Record<string, Bi> = {
  "hicp_energy_annual_rate:yoy_rate": { zh: "HICP 能源同比", en: "HICP energy, annual rate" },
  "europe_natural_gas_price_usd:level": { zh: "欧洲天然气价格（美元）", en: "European natural gas price (USD)" },
};
const GATE: Record<EventWindowResult["gate"], Bi> = {
  full: { zh: "完整窗口（事件前 ≥12、事件后 ≥6 个月）", en: "Full window (≥12 months before, ≥6 after)" },
  exploratory: { zh: "仅探索性短窗口", en: "Exploratory short window only" },
  insufficient_data: { zh: "数据不足，不显示数值", en: "Insufficient data; no numbers shown" },
};

function Section({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 border-t border-[var(--line)] pt-4" data-case-section={id}>
      <h4 className="text-base font-semibold"><span className="metric-number mr-2 text-xs text-[var(--muted)]">{n}</span>{title}</h4>
      <div className="mt-3 grid min-w-0 gap-3 text-sm leading-7 [&>*]:min-w-0">{children}</div>
    </section>
  );
}

function AnnualChart({ points, eventYear, label }: { points: Array<{ year: number; value: number | null }>; eventYear: number; label: string }) {
  const values = points.flatMap((point) => (point.value === null ? [] : [point.value]));
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const x = (index: number) => 40 + (index / Math.max(1, points.length - 1)) * 280;
  const y = (value: number) => 90 - ((value - min) / range) * 70;
  const segments: Array<Array<{ index: number; value: number }>> = [];
  let current: Array<{ index: number; value: number }> = [];
  points.forEach((point, index) => { if (point.value === null) { if (current.length) segments.push(current); current = []; } else current.push({ index, value: point.value }); });
  if (current.length) segments.push(current);
  const eventIndex = points.findIndex((point) => point.year === eventYear);
  return (
    <svg viewBox="0 0 340 120" className="w-full max-w-md" role="img" aria-label={label} data-case-annual-chart>
      {min < 0 && max > 0 ? <line x1={40} y1={y(0)} x2={320} y2={y(0)} stroke="var(--line)" strokeWidth="0.75" /> : null}
      {eventIndex >= 0 ? <line x1={x(eventIndex)} y1={14} x2={x(eventIndex)} y2={92} stroke="var(--accent)" strokeDasharray="3 3" /> : null}
      {segments.map((segment) => <polyline key={segment[0].index} points={segment.map((point) => `${x(point.index)},${y(point.value)}`).join(" ")} fill="none" stroke="var(--foreground)" strokeWidth="1.5" />)}
      {points.map((point, index) => point.value === null ? null : <circle key={point.year} cx={x(index)} cy={y(point.value)} r={2} fill="var(--foreground)" />)}
      {points.map((point, index) => <text key={point.year} x={x(index)} y={108} textAnchor="middle" fontSize="9" fill="var(--muted)">{point.year}</text>)}
      <text x={36} y={y(max) + 3} textAnchor="end" fontSize="8" fill="var(--muted)">{max.toLocaleString("en", { maximumFractionDigits: 1 })}</text>
      <text x={36} y={y(min) + 3} textAnchor="end" fontSize="8" fill="var(--muted)">{min.toLocaleString("en", { maximumFractionDigits: 1 })}</text>
    </svg>
  );
}

export function EventCaseStudy({ event, events, series, loadState }: { event: Event; events: Event[]; series: HighFrequencyPoint[]; loadState: "loading" | "ready" | "error" }) {
  const en = useLocale() === "en";
  const t = (text: Bi) => (en ? text.en : text.zh);
  const study = getEventCaseStudy(event.event_id);
  const record = getEventAnalysis(event.event_id);
  const countryName = (slug: string) => { const country = researchCountries.find((item) => item.slug === slug); return en ? country?.name ?? slug : country?.name_zh ?? slug; };
  const number = (value: number | null, digits = 2) => (value === null ? (en ? "not computable" : "无法计算") : value.toLocaleString(en ? "en" : "zh-CN", { maximumFractionDigits: digits }));
  const signed = (value: number | null) => (value === null ? (en ? "not computable" : "无法计算") : `${value > 0 ? "+" : ""}${number(value)}`);

  const monthly = useMemo(() => {
    if (!study?.window || loadState !== "ready") return null;
    const { outcome, months, comparison, external } = study.window;
    const pick = (id: string, slug: string) => series.filter((item) => item.indicator === id && item.country === slug);
    const main = pick(outcome, event.country_slug);
    if (!main.length) return null;
    const result = attachOverlappingEvents(computeEventWindow(event, main, { preMonths: months, postMonths: months }), events);
    const comparisonSeries = comparison ? pick(outcome, comparison.country) : [];
    const comparisonResult = comparison && comparisonSeries.length ? computeEventWindow({ ...event, country_slug: comparison.country }, comparisonSeries, { preMonths: months, postMonths: months }) : null;
    const externalSeries = external ? pick(external.outcome, event.country_slug) : [];
    const externalResult = external && externalSeries.length ? computeEventWindow(event, externalSeries, { preMonths: months, postMonths: months }) : null;
    const latest = main.filter((item) => item.value !== null).map((item) => item.period).sort().at(-1) ?? null;
    return { result, comparisonResult, externalResult, latest, definition: main[0]?.definition_version ?? null };
  }, [study, loadState, series, event, events]);

  // Overlapping verified events: the same engine function, over the same ±12-month window, even when no monthly series is linked.
  const overlaps = useMemo(() => monthly?.result.overlapping_events ?? attachOverlappingEvents(computeEventWindow(event, [], { preMonths: 12, postMonths: 12 }), events).overlapping_events, [monthly, event, events]);

  const focused = useRef(false);
  useEffect(() => {
    if (focused.current || new URLSearchParams(window.location.search).get("section") !== "case" || new URLSearchParams(window.location.search).get("event") !== event.event_id) return;
    focused.current = true;
    const target = document.getElementById("event-case-study");
    target?.scrollIntoView({ block: "start" });
    target?.focus({ preventScroll: true });
  }, [event.event_id]);

  if (!study || !record) return null;
  const eventYear = Number(event.date.slice(0, 4));
  const caseUrl = `${PLATFORM_BASE_URL.replace(/\/$/, "")}${en ? "/en" : ""}/models/?tab=run&skill=event_window_analysis&country=${event.country_slug}&event=${event.event_id}&section=case`;
  const phaseLabel = (phase: "pre" | "event" | "post") => ({ pre: en ? "before" : "事件前", event: en ? "event year" : "事件年", post: en ? "after" : "事件后" })[phase];
  const result = monthly?.result ?? null;
  const chartPoints = result?.points ?? [];
  const allValues = [...chartPoints, ...(monthly?.comparisonResult?.points ?? [])].flatMap((point) => (point.value === null ? [] : [point.value]));
  const cMin = allValues.length ? Math.min(...allValues) : 0, cMax = allValues.length ? Math.max(...allValues) : 1, cRange = cMax - cMin || 1;
  const px = (index: number) => 56 + (index / Math.max(1, chartPoints.length - 1)) * 600;
  const py = (value: number) => 140 - ((value - cMin) / cRange) * 120;

  return (
    <article id="event-case-study" tabIndex={-1} className="editorial-panel min-w-0 scroll-mt-24 p-5 outline-none" data-case-study={event.event_id}>
      <p className="editorial-kicker">{en ? "Reviewed case study" : "经审阅的案例研究"} · {event.date} · {countryName(event.country_slug)}</p>
      <h3 className="mt-2 text-xl font-semibold">{t(study.title)}</h3>
      <p className="mt-2 text-sm leading-7"><span className="font-semibold">{en ? "Research question: " : "研究问题："}</span>{t(study.research_question)}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{en ? "A descriptive case study: documents first, then the mechanism, then published data. It states what the evidence can and cannot establish and estimates no effect." : "描述性案例研究：先看文件，再看机制，最后看已发布数据；说明证据能证实什么、不能证实什么，不估计任何效应。"}</p>

      <div className="mt-4 grid min-w-0 gap-5 [&>*]:min-w-0">
        <Section id="status" n={1} title={en ? "Event identity and status" : "事件身份与状态"}>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div><dt className="text-xs text-[var(--muted)]">{en ? "Atlas event ID" : "Atlas 事件 ID"}</dt><dd className="break-all font-mono text-xs">{event.event_id}</dd></div>
            <div><dt className="text-xs text-[var(--muted)]">{en ? "Event date (Atlas record)" : "事件日期（Atlas 记录）"}</dt><dd className="font-semibold">{event.date}</dd></div>
            <div><dt className="text-xs text-[var(--muted)]">{en ? "Country" : "国家"}</dt><dd className="font-semibold">{countryName(event.country_slug)}</dd></div>
          </dl>
          <ol className="flex flex-wrap gap-2" aria-label={en ? "Stages established by the sources" : "来源所证实的阶段"}>
            {STAGES.map((stage) => {
              const documented = study.stages_documented.includes(stage);
              const relevant = documented || study.stages_not_documented.includes(stage);
              return relevant ? <li key={stage} data-case-stage={stage} data-documented={documented} className={`rounded-full border px-3 py-1 text-xs ${documented ? "border-[var(--foreground)] font-semibold" : "border-dashed border-[var(--line)] text-[var(--muted)]"}`}>{t(STAGE[stage])} · {documented ? (en ? "documented" : "有文件记录") : (en ? "not documented" : "无文件记录")}</li> : null;
            })}
          </ol>
          {study.date_note ? <p className="border-l-4 border-[var(--warning)] pl-3 text-xs" data-case-date-note>{t(study.date_note)}</p> : null}
        </Section>

        <Section id="documents" n={2} title={en ? "Documentary background" : "文件背景"}>
          <div><p className="text-xs text-[var(--muted)]">{en ? "What the sources establish" : "来源所证实的内容"}</p><ul className="list-disc pl-5">{study.establishes.map((item) => <li key={item.en}>{t(item)}</li>)}</ul></div>
          <div>
            <p className="text-xs text-[var(--muted)]">{en ? "Documented milestones" : "有文件记录的节点"}</p>
            <ol className="grid gap-2">{study.milestones.map((milestone) => (
              <li key={`${milestone.date}-${milestone.stage}`} className="border-l-2 border-[var(--line)] pl-3" data-case-milestone={milestone.stage}>
                <span className="metric-number mr-2 font-semibold">{milestone.date}</span><span className="mr-2 text-xs font-semibold text-[var(--accent)]">{t(STAGE[milestone.stage])}</span>{t(milestone.text)} <a href={milestone.source_url} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] underline">{en ? "source" : "来源"} ↗</a>
              </li>
            ))}</ol>
            <p className="mt-1 text-xs text-[var(--muted)]">{en ? "Only milestones stated on a cited source are listed; none is inferred from later economic data." : "只列出引用来源中明确记载的节点；不会根据之后的经济数据推断任何节点。"}</p>
          </div>
          <div><p className="text-xs text-[var(--muted)]">{en ? "Still uncertain" : "仍不确定的内容"}</p><ul className="list-disc pl-5">{study.uncertain.map((item) => <li key={item.en}>{t(item)}</li>)}</ul></div>
        </Section>

        <Section id="mechanism" n={3} title={en ? "Transmission mechanism" : "传导机制"}>
          <p><span className="font-semibold">{t(record.mechanism.channel)}</span>{en ? " — potentially affected: " : " —— 可能受影响的主体："}{t(record.mechanism.affected_actors)}</p>
          <ol className="grid gap-2">{study.chain.map((link, index) => (
            <li key={link.step.en} className={`border-l-2 pl-3 ${link.basis === "unsupported_connection" ? "border-dashed border-[var(--warning)]" : "border-[var(--line)]"}`} data-case-chain={link.basis}>
              <span className="metric-number mr-2 text-xs text-[var(--muted)]">{index + 1}</span><span className="mr-2 text-xs font-semibold text-[var(--accent)]">{t(BASIS[link.basis])}</span>{t(link.step)}
              <span className="block text-xs text-[var(--muted)]">{en ? "Timing: " : "时间："}{t(link.timing)}</span>
            </li>
          ))}</ol>
          <p className="text-xs text-[var(--muted)]">{en ? "The decision date and the timing of any economic response are different things. Links marked as hypotheses are not established; a connection marked unsupported is shown so that it is not assumed." : "政策决定的时间与可能的经济反应时间是两回事。标为研究假设的环节未被证实；标为不成立的关联特意列出，以免被默认接受。"}</p>
        </Section>

        <Section id="indicators" n={4} title={en ? "Indicator choice and rationale" : "指标选择与理由"}>
          <ul className="grid gap-2">
            {study.annual.map((item) => {
              const link = record.indicators.find((candidate) => candidate.indicator_id === item.indicator_id);
              const indicator = getResearchIndicator(item.indicator_id);
              return <li key={item.indicator_id} className="border border-[var(--line)] p-3" data-case-indicator={item.indicator_id}><p className="font-semibold">{indicator ? (en ? indicator.name : indicator.name_zh) : item.indicator_id} · {en ? "annual" : "年度"} · {en ? englishText(indicator?.unit ?? "") : indicator?.unit}</p><p>{t(item.role)}</p>{link ? <p className="text-xs text-[var(--muted)]" data-case-link-basis={link.basis}>{en ? `Link basis: ${link.basis === "documented" ? "stated in the source" : "research hypothesis"} — ` : `关联依据：${link.basis === "documented" ? "来源明确说明" : "研究假设"}——`}{t(link.rationale)}</p> : null}</li>;
            })}
            {study.window ? <li className="border border-[var(--line)] p-3" data-case-indicator={study.window.outcome}><p className="font-semibold">{t(MONTHLY_LABEL[study.window.outcome] ?? { zh: study.window.outcome, en: study.window.outcome })} · {en ? "monthly" : "月度"} · %</p><p>{t(study.window.role)}</p></li> : null}
          </ul>
          <p className="text-xs text-[var(--muted)]">{en ? "Annual and monthly data are kept separate. Indicators come only from the event's reviewed analysis record, never from keywords or the event category." : "年度与月度数据分开处理。指标只来自该事件经过审阅的分析记录，不根据关键词或事件类别选取。"}</p>
        </Section>

        <Section id="evidence" n={5} title={en ? "Observed historical evidence" : "已观察的历史证据"}>
          {study.annual.map((item) => {
            const indicator = getResearchIndicator(item.indicator_id);
            const observations = getCountryObservations(event.country_slug, item.indicator_id).slice().sort((a, b) => a.year - b.year);
            const latest = observations.filter(isPublished).at(-1);
            const name = indicator ? (en ? indicator.name : indicator.name_zh) : item.indicator_id;
            return (
              <div key={item.indicator_id} data-case-annual={item.indicator_id}>
                <p className="font-semibold">{name} · {countryName(event.country_slug)}</p>
                <AnnualChart points={observations.map((observation) => ({ year: observation.year, value: isPublished(observation) ? observation.value : null }))} eventYear={eventYear} label={en ? `${name}, annual, event year ${eventYear} marked` : `${name}，年度，标出事件年 ${eventYear}`} />
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={en ? `${name}: annual observations (horizontally scrollable)` : `${name}：年度观测（可横向滚动）`}>
                  <table className="research-data-table text-left text-xs"><thead><tr><th className="px-2 py-1">{en ? "Year" : "年份"}</th>{observations.map((observation) => <th key={observation.year} className="metric-number px-2 py-1">{observation.year}<span className="block font-normal text-[var(--muted)]">{phaseLabel(annualPhase(observation.year, event.date))}</span></th>)}</tr></thead>
                    <tbody><tr><td className="px-2 py-1">{en ? "Value" : "数值"}</td>{observations.map((observation) => <td key={observation.year} className="metric-number px-2 py-1" data-observation-id={observation.id}>{isPublished(observation) ? (en ? englishText(formatWithUnit(observation.value, observation.unit ?? "")) : formatWithUnit(observation.value, observation.unit ?? "")) : (en ? "pending" : "待发布")}</td>)}</tr></tbody></table>
                </div>
                <p className="text-xs text-[var(--muted)]">{en ? "Source" : "来源"}: {latest?.source_url ? <a href={latest.source_url} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">{latest.source_dataset ?? latest.source_name} ↗</a> : "—"} · {en ? "stored record updated" : "记录更新"} {latest?.updated_at ?? "—"} · {en ? "pending years are not yet published at source and are never filled." : "待发布年份在来源尚未发布，不做填补。"}</p>
              </div>
            );
          })}
          {study.window ? (
            loadState === "loading" ? <p className="text-[var(--muted)]">{en ? "Loading monthly observations…" : "正在加载月度观测…"}</p>
              : !result ? <p className="text-[var(--muted)]" data-case-window-unavailable>{en ? "Monthly observations are not available, so no window is shown." : "月度观测不可用，因此不显示窗口。"}</p>
                : (
                  <div data-case-window={result.gate}>
                    <p className="font-semibold">{t(MONTHLY_LABEL[study.window.outcome] ?? { zh: study.window.outcome, en: study.window.outcome })} · {countryName(event.country_slug)} · {en ? `±${study.window.months} months` : `前后各 ${study.window.months} 个月`} · {t(GATE[result.gate])}</p>
                    {result.gate === "insufficient_data" ? null : (
                      <>
                        <svg viewBox="0 0 680 190" className="w-full" role="img" aria-label={en ? `Monthly window chart, event month ${result.event_period}` : `月度窗口图，事件月 ${result.event_period}`} data-case-window-chart>
                          {[cMin, (cMin + cMax) / 2, cMax].map((tick) => <g key={tick}><line x1={56} y1={py(tick)} x2={656} y2={py(tick)} stroke="var(--line)" strokeWidth="0.5" /><text x={50} y={py(tick) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">{tick.toLocaleString("en", { maximumFractionDigits: 1 })}</text></g>)}
                          {buildLineSegments(result.points).map((segment) => <polyline key={segment[0].period} points={segment.map((point) => `${px(point.index)},${py(point.value)}`).join(" ")} fill="none" stroke="var(--foreground)" strokeWidth="1.5" />)}
                          {monthly?.comparisonResult ? buildLineSegments(monthly.comparisonResult.points).map((segment) => <polyline key={`c-${segment[0].period}`} points={segment.map((point) => `${px(point.index)},${py(point.value)}`).join(" ")} fill="none" stroke="var(--muted)" strokeWidth="1.25" strokeDasharray="4 3" />) : null}
                          <line x1={px(study.window.months)} y1={16} x2={px(study.window.months)} y2={140} stroke="var(--accent)" strokeDasharray="4 3" />
                          {result.points.filter((_, index) => index % 6 === 0).map((point) => <text key={point.period} x={px(result.points.indexOf(point))} y={156} textAnchor="middle" fontSize="9" fill="var(--muted)">{point.period}</text>)}
                          <g fontSize="9" fill="var(--muted)"><line x1={56} y1={176} x2={74} y2={176} stroke="var(--foreground)" strokeWidth="1.5" /><text x={80} y={179}>{countryName(event.country_slug)}</text>{monthly?.comparisonResult ? <><line x1={170} y1={176} x2={188} y2={176} stroke="var(--muted)" strokeDasharray="4 3" /><text x={194} y={179}>{countryName(study.window.comparison!.country)} {en ? "(descriptive context, not a control)" : "（描述性背景，非对照组）"}</text></> : null}<text x={460} y={179}>{en ? `Event month ${result.event_period}; gaps are not interpolated` : `事件月 ${result.event_period}；缺失月份不插值`}</text></g>
                        </svg>
                        <dl className="grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3" data-case-window-stats>
                          {([
                            [en ? "Pre-event mean" : "事件前均值", number(result.pre_period_mean)],
                            [en ? `Event month ${result.event_period} (separate)` : `事件月 ${result.event_period}（单独报告）`, number(result.event_period_value)],
                            [en ? "Post-event mean (event month excluded)" : "事件后均值（不含事件月）", number(result.post_period_mean)],
                            [en ? "Change, pre to post (percentage points)" : "事件前后变化（百分点）", signed(result.absolute_change_pre_to_post)],
                            [en ? "Observations before / after" : "事件前 / 后观测数", `${result.pre_observations} / ${result.post_observations}`],
                            [en ? "Missing months" : "缺失月份", result.missing_periods.length ? result.missing_periods.join(", ") : (en ? "none" : "无")],
                          ] as Array<[string, string]>).map(([label, value]) => <div key={label} className="bg-[var(--surface)] p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="metric-number mt-1 font-semibold">{value}</dd></div>)}
                        </dl>
                        {monthly?.comparisonResult ? <p className="text-xs" data-case-comparison={study.window.comparison!.country}>{en ? `${countryName(study.window.comparison!.country)}, same engine and window: pre-event mean ${number(monthly.comparisonResult.pre_period_mean)}, event month ${number(monthly.comparisonResult.event_period_value)}, post-event mean ${number(monthly.comparisonResult.post_period_mean)}. ` : `${countryName(study.window.comparison!.country)}，相同引擎与窗口：事件前均值 ${number(monthly.comparisonResult.pre_period_mean)}，事件月 ${number(monthly.comparisonResult.event_period_value)}，事件后均值 ${number(monthly.comparisonResult.post_period_mean)}。`}{t(study.window.comparison!.rationale)}</p> : null}
                        <p className="text-xs text-[var(--muted)]" data-case-window-source>{en ? "Observation period" : "观测期"} {result.points[0]?.period}–{result.points.at(-1)?.period} · {en ? "unit" : "单位"} {result.unit ?? "%"} · {en ? "definition" : "定义"} {monthly?.definition ?? "—"} · {en ? "latest published month" : "最新已发布月份"} {monthly?.latest ?? "—"} · <a href={study.window.source.url} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">{study.window.source.label} ↗</a></p>
                        <details className="advanced-disclosure"><summary>{en ? `Observation IDs (${result.data_trace.length})` : `观测 ID（${result.data_trace.length} 条）`}</summary><p className="mt-2 break-words font-mono text-[10px] leading-5 text-[var(--muted)]">{result.data_trace.join(" · ")}</p></details>
                      </>
                    )}
                  </div>
                )
          ) : study.window_blocker ? <p className="border-l-4 border-[var(--warning)] pl-3" data-case-window-blocker>{t(study.window_blocker)}</p> : null}
          <p className="text-xs text-[var(--muted)]">{en ? "National aggregates are not measurements of a single decision or project. The window is computed by the existing event-window engine and is descriptive only." : "国家总量不是对单一决定或项目的测量。窗口由现有事件窗口引擎计算，只作描述。"}</p>
        </Section>

        <Section id="context" n={6} title={en ? "Historical and comparative context" : "历史与比较背景"}>
          <p>{t(study.comparison_note)}</p>
          {study.window?.external && monthly?.externalResult && monthly.externalResult.gate !== "insufficient_data" ? (
            <p data-case-external={study.window.external.outcome}>{t(MONTHLY_LABEL[study.window.external.outcome] ?? { zh: study.window.external.outcome, en: study.window.external.outcome })}{en ? `: pre-event mean ${number(monthly.externalResult.pre_period_mean)}, event month ${number(monthly.externalResult.event_period_value)}, post-event mean ${number(monthly.externalResult.post_period_mean)} (${monthly.externalResult.unit ?? ""}). ` : `：事件前均值 ${number(monthly.externalResult.pre_period_mean)}，事件月 ${number(monthly.externalResult.event_period_value)}，事件后均值 ${number(monthly.externalResult.post_period_mean)}（${monthly.externalResult.unit ?? ""}）。`}{t(study.window.external.rationale)} <a href={study.window.external.source.url} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] underline">{study.window.external.source.label} ↗</a></p>
          ) : null}
        </Section>

        <Section id="alternatives" n={7} title={en ? "Competing explanations" : "其他可能的解释"}>
          <ul className="grid gap-2">{study.alternatives.map((item) => <li key={item.text.en} data-case-alternative={item.kind}><span className="mr-2 text-xs font-semibold text-[var(--accent)]">{t(ALTERNATIVE[item.kind])}</span>{t(item.text)}</li>)}</ul>
          {study.concurrent_projects.length ? <div data-case-concurrent-projects><p className="text-xs text-[var(--muted)]">{en ? "Other Atlas project records, same country" : "Atlas 中同一国家的其他项目记录"}</p><ul className="list-disc pl-5">{study.concurrent_projects.map((project) => <li key={project.project_id}><span className="font-semibold">{t(project.label)}</span> — {t(project.status)}</li>)}</ul></div> : null}
          <div data-case-overlaps={overlaps.length}>
            <p className="text-xs text-[var(--muted)]">{en ? `Other verified events in ${countryName(event.country_slug)} within ±12 months (event-window engine): ${overlaps.length}` : `${countryName(event.country_slug)} 事件前后 12 个月内的其他已核验事件（事件窗口引擎）：${overlaps.length} 件`}</p>
            {overlaps.length ? <ul className="grid gap-1 text-xs">{overlaps.map((overlap) => <li key={overlap.event_id}>{overlap.date} · <span lang="zh-CN" data-original-language="zh-CN">{overlap.title}</span></li>)}</ul> : null}
          </div>
          <p className="text-xs text-[var(--muted)]">{en ? "These are potential confounders or context, not claims that they explain the observed values." : "这些是潜在混杂因素或背景，并不表示它们解释了观察到的数值。"}</p>
        </Section>

        <Section id="limits" n={8} title={en ? "What this case can and cannot establish" : "本案例能证实与不能证实的内容"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div data-case-can><p className="text-xs text-[var(--muted)]">{en ? "Can establish" : "能够证实"}</p><ul className="list-disc pl-5">{study.can_establish.map((item) => <li key={item.en}>{t(item)}</li>)}</ul></div>
            <div data-case-cannot><p className="text-xs text-[var(--muted)]">{en ? "Cannot establish" : "不能证实"}</p><ul className="list-disc pl-5">{study.cannot_establish.map((item) => <li key={item.en}>{t(item)}</li>)}</ul></div>
          </div>
          <p className="text-xs text-[var(--muted)]">{en ? "A descriptive window is not an identified event effect. Formal event studies, difference-in-differences and causal identification remain closed until a separate research design is approved." : "描述性窗口不是经过识别的事件效应。正式事件研究、双重差分和因果识别在另行批准研究设计之前保持关闭。"}</p>
        </Section>

        <Section id="sources" n={9} title={en ? "Original sources" : "原始来源"}>
          <ul className="grid gap-1">{study.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">{source.label} ↗</a> — {t(source.supports)}</li>)}</ul>
          <div className="flex flex-wrap items-center gap-3">
            <NotebookCollect create={() => ({
              type: "event", title: event.title, labels: { "zh-CN": study.title.zh, en: study.title.en }, url: caseUrl,
              canonical_ids: [event.event_id, `case_study:${event.event_id}`], countries: [event.country_slug, ...(study.window?.comparison ? [study.window.comparison.country] : [])], periods: [event.date],
              sources: study.sources.map((source) => ({ institution: source.label, dataset: source.label, url: source.url, layer: "case_study_source" })),
              layer: "reviewed_case_study", comparability: "descriptive_case_study_not_an_identified_effect",
              warnings: ["Reviewed descriptive case study; live research link, not a frozen result.", "Descriptive window only; not an identified event effect."],
              warning_labels: { "zh-CN": ["经审阅的描述性案例研究；这是实时研究链接，不是冻结的结果。", "仅为描述性窗口，不是经过识别的事件效应。"], en: ["Reviewed descriptive case study; live research link, not a frozen result.", "Descriptive window only; not an identified event effect."] },
              metadata: { event_type: event.event_type, status: event.data_status, entersModel: false, original_language: "zh-CN", filters: (study.window ? { outcome: study.window.outcome, window_months: study.window.months, comparison: study.window.comparison?.country ?? "" } : { window: "none" }) as Record<string, string | number>, reference: caseUrl },
            })} label={en ? "Save case configuration to Notebook" : "将案例配置保存到研究笔记"} />
            <p className="text-xs text-[var(--muted)]">{en ? "Saves the case link, its configuration and source references. It is a live research link, not a frozen historical result." : "保存案例链接、配置与来源引用。这是实时研究链接，不是冻结的历史结果。"}</p>
          </div>
        </Section>
      </div>
    </article>
  );
}
