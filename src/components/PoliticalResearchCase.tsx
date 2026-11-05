"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { localeDate, localeNumber, type Locale } from "@/i18n/config";
import { CASE_INDICATOR, RESEARCH_CASE, RESEARCH_CASE_LIMITS, RESEARCH_CASE_PROTOCOL, researchCaseCsv, researchCaseDigest, researchCaseEvidence, researchCaseFindings, runResearchCase } from "@/lib/comparativeResearchCase";
import type { ContextPoint } from "@/lib/politicalEconomicContext";
import type { PoliticalElectionView } from "@/lib/politicalExplorer";
import type { PoliticalIdentityLink } from "@/lib/politicalIdentity";
import type { CaseModelObservation } from "@/lib/researchCaseModels";

const COUNTRY: Record<string, { en: string; zh: string }> = { germany: { en: "Germany", zh: "德国" }, czechia: { en: "Czechia", zh: "捷克" }, poland: { en: "Poland", zh: "波兰" }, slovakia: { en: "Slovakia", zh: "斯洛伐克" }, hungary: { en: "Hungary", zh: "匈牙利" } };
const MODEL: Record<string, { en: string; zh: string }> = { household_economic_pressure: { en: "Household pressure", zh: "居民经济压力" }, fiscal_pressure: { en: "Fiscal pressure", zh: "财政压力" } };
const REASON: Record<string, { en: string; zh: string }> = {
  observation_missing_for_one_election: { en: "missing at one election", zh: "其中一届缺失" },
  definition_differs: { en: "definitions differ", zh: "定义不同" },
  model_inputs_not_held_for_either_year: { en: "model inputs start in 2021", zh: "模型输入从 2021 年开始" },
  model_inputs_not_held_for_one_year: { en: "model inputs start in 2021", zh: "模型输入从 2021 年开始" },
  released_input_not_annual: { en: "released inputs are monthly; the model uses annual inputs", zh: "已发布输入为月度数据，模型使用年度输入" },
  input_release_not_documented: { en: "an input's release was not located", zh: "未找到某项输入的发布" },
  first_release_dates_not_recorded: { en: "no dated releases read for this election", zh: "此届选举未查阅注明日期的发布" },
  released_inputs_different_periods: { en: "released inputs refer to different years", zh: "已发布输入对应不同年份" },
  last_release_not_located: { en: "release not located", zh: "未找到发布" },
};
const RELATION: Record<string, { en: string; zh: string }> = { same_period_revision: { en: "same year: revision", zh: "同一年度：修订" }, different_period: { en: "different year", zh: "不同年度" }, different_frequency: { en: "different frequency", zh: "频率不同" }, different_definition: { en: "different definition", zh: "定义不同" }, no_observation: { en: "no observation", zh: "无观测" } };

// The fixed research case, shown inside the comparative workflow. It runs the existing research functions under one
// protocol and exports everything it shows. It has no selector of its own: the question and scope are the protocol.
export function PoliticalResearchCase({ elections, points, links, models, locale }: { elections: PoliticalElectionView[]; points: ContextPoint[]; links: PoliticalIdentityLink[]; models: CaseModelObservation[]; locale: Locale }) {
  const en = locale === "en", l = en ? "en" : "zh";
  const result = useMemo(() => runResearchCase(elections, points, links, models), [elections, points, links, models]);
  const findings = useMemo(() => researchCaseFindings(result), [result]);
  const [digest, setDigest] = useState<string | null>(null);
  const [open] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("research_study") === "d4");
  const ref = useRef<HTMLDetailsElement>(null);
  // A deep link to the case opens it and brings it into view; it sits at the end of the comparative workflow.
  useEffect(() => { if (open) ref.current?.scrollIntoView({ block: "start" }); }, [open]);
  const n = (v: number | null, digits = 1) => v === null ? "—" : localeNumber(v, locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  const signed = (v: number | null, digits = 2) => v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${localeNumber(Math.abs(v), locale, { maximumFractionDigits: digits })}`;
  const reason = (r: string | null) => r ? REASON[r]?.[l] ?? r.replaceAll("_", " ") : "";
  const name = (id: string) => { const e = elections.find((x) => x.electionId === id); return e ? `${COUNTRY[e.country ?? "germany"][l]} ${e.year}` : id; };
  const scroll = (label: string, table: React.ReactNode) => <div className="mt-3 overflow-x-auto" role="region" tabIndex={0} aria-label={label}>{table}</div>;
  const th = (labels: string[]) => <thead><tr>{labels.map((t) => <th scope="col" key={t} className="p-2">{t}</th>)}</tr></thead>;
  function download(content: string, file: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a"); a.href = url; a.download = file; a.click(); URL.revokeObjectURL(url);
  }
  async function exportJson() {
    const evidence = researchCaseEvidence(result);
    const sha = await researchCaseDigest(evidence);
    setDigest(sha);
    download(JSON.stringify({ evidence_sha256: sha, evidence }, null, 2), `${RESEARCH_CASE.id}.json`, "application/json");
  }
  const dir = (d: string | null) => d === "same" ? (en ? "with turnout" : "与投票率同向") : d === "opposite" ? (en ? "against turnout" : "与投票率反向") : d === "zero" ? (en ? "no change" : "无变化") : "—";

  return <details ref={ref} className="mt-6 scroll-mt-20 rounded border border-[var(--line)] p-4" open={open} data-research-study={RESEARCH_CASE.id} data-research-study-method={RESEARCH_CASE.methodVersion}>
    <summary className="cursor-pointer font-semibold">{en ? "Research case: turnout and pre-election economic conditions in Czechia, Germany, Hungary and Poland" : "研究案例：捷克、德国、匈牙利和波兰的投票率与选举前经济状况"}</summary>
    <p className="mt-3 text-sm" data-research-study-question>{RESEARCH_CASE.question[l]}</p>
    <h5 className="mt-4 font-semibold">{en ? "Protocol" : "研究协议"}</h5>
    <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{RESEARCH_CASE_PROTOCOL.map((p) => <li key={p.en}>{p[l]}</li>)}</ol>

    <h5 className="mt-4 font-semibold">{en ? "Findings" : "结果"}</h5>
    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm" data-research-study-findings>{findings.map((f) => <li key={f.en}>{f[l]}</li>)}</ul>

    <h5 className="mt-4 font-semibold">{en ? "Pairs of successive elections" : "相邻选举组"}</h5>
    {scroll(en ? "Pairs of successive elections (scrollable)" : "相邻选举组（可横向滚动）", <table className="w-full min-w-[860px] text-left text-sm" data-research-study-pairs>
      {th(en ? ["Pair", "Months", "Turnout change (points)", "Turnout basis", "Verified list movement", "Seat rules"] : ["选举组", "间隔月数", "投票率变化（百分点）", "投票率口径", "已核实名单变动", "席位规则"])}
      <tbody>{result.pairs.map((p) => <tr key={p.fromElection} className="border-t border-[var(--line)]" data-study-pair={`${p.fromElection}|${p.toElection}`}>
        <th scope="row" className="p-2 font-normal">{name(p.fromElection)} → {p.toDate.slice(0, 4)}</th><td className="p-2">{p.monthsBetween}</td>
        <td className="p-2 metric-number" data-study-turnout>{signed(p.turnout.change)}</td><td className="p-2 text-xs">{p.turnout.basis ?? reason(p.turnout.reason)}</td>
        <td className="p-2">{p.lists.verifiedShareMovement === null ? (en ? "no verified identity" : "无已核实身份") : `${n(p.lists.verifiedShareMovement, 2)} (${p.lists.units} ${en ? "units" : "个单位"})`}</td>
        <td className="p-2 text-xs">{p.rules.rulesChanged ? (en ? `changed (base seats ${p.rules.fromBaseSeats ?? "—"} → ${p.rules.toBaseSeats ?? "—"})` : `有变化（基础席位 ${p.rules.fromBaseSeats ?? "—"} → ${p.rules.toBaseSeats ?? "—"}）`) : (en ? "same method, thresholds and base seats" : "方法、门槛和基础席位相同")}</td></tr>)}</tbody></table>)}

    <h5 className="mt-4 font-semibold">{en ? "Economic changes between the pairs, two views" : "各组之间的经济变化（两个视图）"}</h5>
    <p className="text-xs">{en ? "Later minus earlier election. Last complete year: the year before polling day. Election year: includes months after polling day." : "后一届减前一届。最后完整年度：投票日前一年。选举年度：包含投票日后的月份。"}</p>
    {scroll(en ? "Economic changes (scrollable)" : "经济变化（可横向滚动）", <table className="w-full min-w-[920px] text-left text-sm" data-research-study-indicators>
      {th(en ? ["Pair", "Indicator", "Last complete year", "Election year", "Sign in both views", "Direction against turnout"] : ["选举组", "指标", "最后完整年度", "选举年度", "两个视图方向", "相对投票率的方向"])}
      <tbody>{result.pairs.flatMap((p) => p.indicators.map((i) => <tr key={`${p.fromElection}${i.indicator}`} className="border-t border-[var(--line)]" data-study-indicator={i.indicator}>
        <th scope="row" className="p-2 font-normal">{name(p.fromElection)} → {p.toDate.slice(0, 4)}</th><td className="p-2">{CASE_INDICATOR[i.indicator][l]}</td>
        <td className="p-2">{i.primary.change === null ? reason(i.primary.reason) : `${signed(i.primary.change)} (${i.primary.fromPeriod}→${i.primary.toPeriod})`}</td>
        <td className="p-2">{i.sensitivity.change === null ? reason(i.sensitivity.reason) : `${signed(i.sensitivity.change)} (${i.sensitivity.fromPeriod}→${i.sensitivity.toPeriod})`}</td>
        <td className="p-2">{i.signAgreement === "same" ? (en ? "same" : "相同") : i.signAgreement === "differs" ? (en ? "differs" : "不同") : "—"}</td><td className="p-2">{dir(i.directionWithTurnout)}</td></tr>))}</tbody></table>)}

    <h5 className="mt-4 font-semibold">{en ? "Direction counts, and each country left out in turn" : "方向计数，以及依次去掉每个国家"}</h5>
    {scroll(en ? "Direction counts (scrollable)" : "方向计数（可横向滚动）", <table className="w-full min-w-[720px] text-left text-sm" data-research-study-direction>
      {th([en ? "Indicator" : "指标", en ? "All pairs: with / against turnout" : "全部组：同向 / 反向", ...RESEARCH_CASE.countries.map((c) => en ? `Without ${COUNTRY[c].en}` : `去掉${COUNTRY[c].zh}`)])}
      <tbody>{result.direction.map((d) => <tr key={d.indicator} className="border-t border-[var(--line)]"><th scope="row" className="p-2 font-normal">{CASE_INDICATOR[d.indicator][l]}</th>
        <td className="p-2">{d.pairs ? `${d.same} / ${d.opposite} (${d.pairs})` : "—"}</td>{d.withoutCountry.map((w) => <td key={w.country} className="p-2">{w.pairs ? `${w.same} / ${w.opposite} (${w.pairs})` : "—"}</td>)}</tr>)}</tbody></table>)}
    <p className="mt-1 text-xs">{en ? "Counts, not a pooled coefficient. A change of zero is in neither column." : "这是计数，不是合并系数。变化为零的组不计入任一列。"}</p>

    <h5 className="mt-4 font-semibold">{en ? "Released before polling day against current figures" : "投票日前已发布数字对比当前数字"}</h5>
    {scroll(en ? "Released and current figures (scrollable)" : "已发布与当前数字（可横向滚动）", <table className="w-full min-w-[820px] text-left text-sm" data-research-study-vintage>
      {th(en ? ["Election", "Indicator", "Released (period, date)", "Last complete year now", "Relation", "Revision"] : ["选举", "指标", "已发布（期间、日期）", "最后完整年度当前值", "关系", "修订"])}
      <tbody>{result.vintage.map((v) => <tr key={`${v.electionId}${v.indicator}`} className="border-t border-[var(--line)]"><th scope="row" className="p-2 font-normal">{name(v.electionId)}</th><td className="p-2">{CASE_INDICATOR[v.indicator][l]}</td>
        <td className="p-2">{v.released ? `${n(v.released.value, 2)} (${v.released.period}, ${localeDate(v.released.publishedOn, locale)}${v.released.flashEstimate ? (en ? ", flash" : "，快速估算") : ""})` : reason(v.reason)}</td>
        <td className="p-2">{v.lastCompleteYear.value === null ? "—" : `${n(v.lastCompleteYear.value, 2)} (${v.lastCompleteYear.period})`}</td><td className="p-2">{RELATION[v.relation]?.[l] ?? v.relation}</td><td className="p-2">{signed(v.revision)}</td></tr>)}</tbody></table>)}

    <h5 className="mt-4 font-semibold">{en ? "Model context" : "模型背景"}</h5>
    <p className="text-xs">{en ? "Index values from 0 to 100 computed by the Atlas's transparent pressure models, with fixed published bounds and weights. They describe the same inputs in another form and do not measure voting intention." : "由 Atlas 透明压力模型计算的 0–100 指数值，使用公开的固定边界和权重。它们只是以另一种形式描述同样的输入，不衡量投票意向。"}</p>
    {scroll(en ? "Model context (scrollable)" : "模型背景（可横向滚动）", <table className="w-full min-w-[720px] text-left text-sm" data-research-study-models>
      {th(en ? ["Pair", "Model", "Earlier", "Later", "Change", "Status"] : ["选举组", "模型", "前一届", "后一届", "变化", "状态"])}
      <tbody>{result.pairs.flatMap((p) => p.models.map((m) => <tr key={`${p.fromElection}${m.modelId}`} className="border-t border-[var(--line)]" data-study-model={m.status}><th scope="row" className="p-2 font-normal">{name(p.fromElection)} → {p.toDate.slice(0, 4)}</th><td className="p-2">{MODEL[m.modelId][l]}</td>
        <td className="p-2">{n(m.fromScore)} ({m.fromYear})</td><td className="p-2">{n(m.toScore)} ({m.toYear})</td><td className="p-2">{signed(m.change, 1)}</td><td className="p-2 text-xs">{m.status === "calculated" ? (en ? "both years held" : "两年均有") : reason(m.reason)}</td></tr>))}</tbody></table>)}
    {scroll(en ? "Model on released figures (scrollable)" : "基于已发布数字的模型（可横向滚动）", <table className="w-full min-w-[720px] text-left text-sm" data-research-study-model-vintage>
      {th(en ? ["Election", "Model", "On released figures", "On current figures", "Current minus released"] : ["选举", "模型", "基于已发布数字", "基于当前数字", "当前减已发布"])}
      <tbody>{result.modelVintage.map((m) => <tr key={`${m.electionId}${m.modelId}`} className="border-t border-[var(--line)]"><th scope="row" className="p-2 font-normal">{name(m.electionId)}</th><td className="p-2">{MODEL[m.modelId][l]}</td>
        <td className="p-2">{m.releasedScore === null ? reason(m.reason) : `${n(m.releasedScore)} (${m.releasedPeriod})`}</td><td className="p-2">{n(m.currentScore)} ({m.currentYear})</td><td className="p-2">{m.difference === null ? (m.status === "different_period" ? (en ? "different year: not a revision" : "不同年度：不是修订") : "—") : signed(m.difference, 1)}</td></tr>)}</tbody></table>)}

    <h5 className="mt-4 font-semibold">{en ? "Context election" : "背景选举"}</h5>
    <ul className="mt-1 list-disc pl-5 text-sm" data-research-study-context>{result.context.map((c) => <li key={c.electionId}>{name(c.electionId)}: {en ? "turnout" : "投票率"} {n(c.turnout, 2)}%{c.turnoutComputed ? (en ? " (computed)" : "（计算值）") : ""}. {c.reason[l]}</li>)}</ul>

    <h5 className="mt-4 font-semibold">{en ? "Electoral-system comparability" : "选举制度可比性"}</h5>
    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm" data-research-study-comparability>{result.comparability.map((c) => <li key={c.country}><strong>{COUNTRY[c.country][l]}</strong> ({c.elections} {en ? "elections" : "届"}; {en ? "turnout" : "投票率"} {c.turnoutBasis}; {en ? "seats" : "席位"} {c.seatScope.join(" | ")}): {c.note[l]}</li>)}</ul>

    <h5 className="mt-4 font-semibold">{en ? "Missing and non-comparable data" : "缺失与不可比数据"}</h5>
    <p className="text-sm" data-research-study-missing>{en ? `${result.missing.withheld.length} indicator changes are withheld (${[...new Set(result.missing.withheld.map((w) => reason(w.reason)))].join("; ")}). ${result.missing.modelGaps.length} model changes are unavailable. Pairs without verified list identity: ${result.missing.noVerifiedIdentity.length}.` : `${result.missing.withheld.length} 个指标变化未计算（${[...new Set(result.missing.withheld.map((w) => reason(w.reason)))].join("；")}）。${result.missing.modelGaps.length} 个模型变化不可得。没有已核实名单身份的组：${result.missing.noVerifiedIdentity.length} 个。`}</p>
    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{RESEARCH_CASE_LIMITS.map((x) => <li key={x.en}>{x[l]}</li>)}</ul>

    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
      <button type="button" className="underline" data-research-study-export-json onClick={() => void exportJson()}>{en ? "Export the case (JSON)" : "导出案例（JSON）"}</button>
      <button type="button" className="underline" data-research-study-export-csv onClick={() => download(researchCaseCsv(result), `${RESEARCH_CASE.id}.csv`, "text/csv;charset=utf-8")}>{en ? "Export the case (CSV)" : "导出案例（CSV）"}</button>
      {digest ? <span className="break-all text-xs" data-research-study-digest>SHA-256: {digest}</span> : null}
    </div>
    <p className="mt-2 text-xs">{en ? "The export holds the protocol, every observation, calculation, sensitivity check, gap and source. The same data give the same digest." : "导出文件包含协议、每个观测、计算、敏感性核查、缺口和来源。相同的数据会得到相同的摘要。"}</p>
  </details>;
}
