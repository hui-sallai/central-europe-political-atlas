"use client";

import { useMemo, useState } from "react";
import { LocalizedContent } from "@/i18n/LocalizedContent";
import { useLocale } from "@/i18n/LocaleProvider";
import { localeNumber } from "@/i18n/config";
import { calculateScenario } from "@/lib/scenarioFramework";
import { scenarioPresets } from "@/lib/scenarioPresets";
import { getResearchIndicator } from "@/lib/researchData";
import { ResearchTimeSeriesChart } from "./ResearchTimeSeriesChart";
import type { Country } from "@/types/Country";
import type { ModelCard, ModelOutput } from "@/types/ModelOutput";
import type { ScenarioDefinition, ScenarioEvidenceLink, ScenarioId, ScenarioRegionalContext, ScenarioResult } from "@/types/Scenario";

export function ScenarioPresetWorkbench({ countries, definitions, cards, outputs, evidence, regionalContexts }: { countries: Country[]; definitions: ScenarioDefinition[]; cards: ModelCard[]; outputs: ModelOutput[]; evidence: ScenarioEvidenceLink[]; regionalContexts: ScenarioRegionalContext[] }) {
  const locale = useLocale();
  const number = (value: number) => localeNumber(value, locale, { maximumFractionDigits: 3 });
  const [countrySlug, setCountrySlug] = useState("poland");
  const [scenarioId, setScenarioId] = useState<ScenarioId>(definitions[0]?.scenario_id ?? "inflation_resurgence");
  const definition = definitions.find((item) => item.scenario_id === scenarioId) ?? definitions[0];
  const [shockValue, setShockValue] = useState(definition?.default_shock_value ?? 0);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const currentEvidence = useMemo(() => evidence.filter((item) => item.country_slug === countrySlug && item.scenario_id === scenarioId), [countrySlug, evidence, scenarioId]);
  const preset = scenarioPresets.find((item) => item.scenario_id === scenarioId);
  const sensitivity = useMemo(() => definition ? Array.from({ length: 11 }, (_, i) => {
    const shock = definition.shock_min + (definition.shock_max - definition.shock_min) * i / 10;
    const value = calculateScenario({ definition, countrySlug, shockValue: shock, cards, outputs });
    return { x: shock, y: value.scenario_score };
  }) : [], [definition, countrySlug, cards, outputs]);

  function changeScenario(value: ScenarioId) {
    const next = definitions.find((item) => item.scenario_id === value);
    setScenarioId(value);
    setShockValue(next?.default_shock_value ?? 0);
    setResult(null);
  }

  function runScenario() {
    const context = regionalContexts.find((item) => item.country_slug === countrySlug && item.scenario_id === scenarioId);
    const reliability: number[] = currentEvidence.map((item) => item.source_reliability === "A" ? 100 : item.source_reliability === "B" ? 80 : item.source_reliability === "C" ? 50 : 0);
    const evidenceQuality = reliability.length ? Math.round(reliability.reduce((sum, value) => sum + value, 0) / reliability.length) : 0;
    setResult(calculateScenario({ definition, countrySlug, shockValue, cards, outputs, regionalContextCoverage: context?.status === "available" ? 100 : 0, evidenceQuality }));
  }

  if (!definition) return null;
  return <LocalizedContent><section className="mt-8 grid gap-6">
    <div className="editorial-panel p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <label className="text-xs font-semibold text-[var(--muted)]">Country<select className="field-control mt-2" value={countrySlug} onChange={(event) => { setCountrySlug(event.target.value); setResult(null); }}>{countries.map((country) => <option key={country.slug} value={country.slug}>{locale === "en" ? country.name : `${country.name_zh} / ${country.name}`}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--muted)]">Scenario<select className="field-control mt-2" value={scenarioId} onChange={(event) => changeScenario(event.target.value as ScenarioId)}>{definitions.map((item) => <option key={item.scenario_id} value={item.scenario_id}>{locale === "en" ? item.name : item.name_zh}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--muted)]">Shock ({definition.shock_unit})<input className="field-control mt-2" type="number" min={definition.shock_min} max={definition.shock_max} step={definition.shock_step} value={shockValue} onChange={(event) => { setShockValue(Number(event.target.value)); setResult(null); }} /></label>
        <div className="flex items-end"><button type="button" onClick={runScenario} className="w-full rounded-lg cta-dark px-4 py-3 text-sm font-semibold">运行情景分析</button></div>
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">{locale === "en" ? "Reference model" : "参考模型"}: <strong className="text-[var(--foreground)]">{cards.find(card => card.model_id === definition.reference_model_id)?.[locale === "en" ? "name" : "name_zh"] ?? preset?.target_skill}</strong> · {locale === "en" ? "Original observations remain unchanged." : "原始观测保持不变。"}</p>
    </div>

    {!result ? <div className="border-y border-[var(--line)] py-12 text-center"><p className="font-semibold">设置冲击后运行预设</p><p className="mt-2 text-sm text-[var(--muted)]">结果是条件式“如果……那么……”比较，不是预测。</p></div> : <>
      {result.unavailable_reason ? <p role="status" className="editorial-panel p-5 text-[var(--warning)]">{result.unavailable_reason}</p> : null}
      <article className="editorial-panel p-5">
        <h2 className="text-xl font-semibold">{locale === "en" ? "Inputs and assumptions" : "基线输入与情景假设"}</h2>
        <p className="mt-3">{locale === "en" ? "Reference model" : "参考模型"}: {result.model_name} · {result.baseline_date ?? "—"} · {locale === "en" ? "Score: 0–100, not a probability" : "得分 0–100，不是概率"}</p>
        <p className="mt-2">{definition.shock_label}: {result.requested_shock_value} {definition.shock_unit} → {locale === "en" ? "Applied" : "实际采用"} {result.shock_value} {definition.shock_unit}</p>
        <div className="mt-4 overflow-x-auto"><table className="research-data-table w-full min-w-[520px] text-sm"><thead><tr>{["指标", "年份", "基线", "调整后", "单位"].map(label => <th key={label} className="p-2 text-left">{label}</th>)}</tr></thead><tbody>{result.baseline_input_values.map(input => <tr key={input.observation_id}><td className="p-2">{getResearchIndicator(input.indicator_id)?.[locale === "en" ? "name" : "name_zh"] ?? input.indicator_id}</td><td className="p-2">{input.year}</td><td className="p-2 metric-number">{number(input.value)}</td><td className="p-2 metric-number">{number(result.adjusted_input?.indicator_id === input.indicator_id ? result.adjusted_input.adjusted_value : input.value)}</td><td className="p-2">{input.unit}</td></tr>)}</tbody></table></div>
        {result.adjusted_input ? <p className="mt-3 text-sm"><a href={result.adjusted_input.source_url} target="_blank" rel="noreferrer" className="underline">{result.adjusted_input.source_name}</a> · {result.adjusted_input.year} · {locale === "en" ? "Only the stated input changes; other inputs remain fixed." : "仅调整指定输入，其他输入保持不变。"}</p> : null}
        <ul className="mt-4 list-disc pl-5 text-sm leading-7">{definition.assumptions.map(item => <li key={item}>{item}</li>)}</ul>
        <ul className="mt-4 list-disc pl-5 text-sm leading-7 text-[var(--muted)]">{result.limitations.map(item => <li key={item}>{item}</li>)}</ul>
        <a className="mt-4 block text-sm underline" href={`${locale === "en" ? "/en" : ""}/methodology#models`}>{locale === "en" ? "Methodological details" : "方法与尺度说明"}</a>
      </article>
      {result.status === "available" ? <ResearchTimeSeriesChart title={locale === "en" ? "Scenario sensitivity under fixed assumptions" : "固定假设下的情景敏感性"} description={locale === "en" ? "Calculated scores across the permitted shock range; not estimates of future outcomes. No statistical intervals are supplied." : "在允许冲击范围内重算得分，不表示未来结果；未提供统计区间。"} xKind="number" xLabel={`${definition.shock_label} (${definition.shock_unit})`} yLabel={locale === "en" ? "Model score (0–100)" : "模型得分（0–100）"} series={[{ id: "scenario-sensitivity", label: locale === "en" ? "Conditional score" : "条件式得分", color: "#a6453c", points: sensitivity }, { id: "selected-shock", label: locale === "en" ? "Selected shock" : "当前冲击", color: "#246a87", width: 0, markers: true, points: [{ x: result.shock_value, y: result.scenario_score }] }, { id: "baseline-score", label: locale === "en" ? "Frozen baseline" : "冻结基线", color: "#64803c", dash: "5 4", points: sensitivity.map(p => ({ x: p.x, y: result.baseline_score })) }]} /> : null}
      {result.status === "available" ? <article className="editorial-panel p-5">
        <h2 className="text-xl font-semibold">{locale === "en" ? "Baseline versus adjusted scenario" : "基线与调整后情景对照"}</h2>
        <p className="mt-3 text-sm">{locale === "en" ? "Holding other inputs fixed, the stated shock changes the score by" : "保持其他输入不变，指定冲击使得分变化"} {result.score_change === null ? "—" : number(result.score_change)} {locale === "en" ? "score points. This is a conditional recalculation, not a forecast or a causal estimate." : "分。这是条件式重算，不是预测或因果估计。"}</p>
        <svg viewBox="0 0 600 180" className="mt-4 w-full" role="img" aria-label={locale === "en" ? "Baseline and scenario scores, 0–100" : "基线与情景得分，0–100"}>
          {[0, 25, 50, 75, 100].map(t => <g key={t}><line x1={120 + t * 4.4} x2={120 + t * 4.4} y1={20} y2={130} stroke="var(--line)" /><text x={120 + t * 4.4} y={153} textAnchor="middle" fontSize="12" fill="var(--muted)">{t}</text></g>)}
          {[{ label: locale === "en" ? "Baseline" : "基线", value: result.baseline_score }, { label: locale === "en" ? "Scenario" : "情景", value: result.scenario_score }].filter((item): item is { label: string; value: number } => item.value !== null).map((item, i) => <g key={item.label}><text x={110} y={48 + i * 55} textAnchor="end" fontSize="13" fill="var(--foreground)">{item.label}</text><rect x={120} y={30 + i * 55} width={item.value * 4.4} height={25} fill={i ? "#a6453c" : "#246a87"} /><text x={125 + item.value * 4.4} y={48 + i * 55} fontSize="12" fill="var(--foreground)">{number(item.value)}</text></g>)}
          <text x={340} y={176} textAnchor="middle" fontSize="12" fill="var(--muted)">{locale === "en" ? "Score (0–100), not a probability or timeline" : "得分（0–100），不是概率或时间趋势"}</text>
        </svg>
      </article> : null}
      <section className="grid gap-4 md:grid-cols-3">
        {[ ["基线", result.baseline_score], ["情景", result.scenario_score], ["变化", result.score_change] ].map(([label, value]) => <article key={String(label)} className="editorial-panel p-5"><p className="editorial-kicker">{label}</p><p className="metric-number mt-3 text-4xl font-semibold text-[var(--accent)]">{typeof value === "number" ? `${value > 0 && label === "变化" ? "+" : ""}${number(value)}` : result.unavailable_reason ?? (locale === "en" ? "Unavailable: no calculated score." : "不可用：未生成得分。")}</p></article>)}
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="editorial-panel p-5"><p className="editorial-kicker">传导</p><h2 className="mt-3 text-2xl font-semibold">传导链</h2><ol className="mt-5 grid gap-3">{result.transmission_chain.map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 border-b border-[var(--line)] pb-3 text-sm"><span className="metric-number text-[var(--accent)]">{index + 1}</span><span>{item}</span></li>)}</ol><p className="mt-5 text-sm leading-7 text-[var(--muted)]">{result.interpretation_boundary}</p></article>
        <article className="editorial-panel p-5"><p className="editorial-kicker">证据</p><h2 className="mt-3 text-2xl font-semibold">背景证据</h2><p className="mt-3 text-sm text-[var(--muted)]">证据用于解释，不进入冲击数值或基础分数。</p>{locale === "en" ? <p className="mt-3 text-xs text-[var(--muted)]">Evidence titles and source names are retained in their original language (Chinese where applicable); no automatic translation is applied.</p> : null}<div className="mt-4 grid gap-3">{currentEvidence.slice(0, 6).map((item) => <a key={item.evidence_link_id} href={item.source_url ?? "#"} target={item.source_url ? "_blank" : undefined} rel="noreferrer" className="border-l-2 border-[var(--secondary)] pl-3 text-sm"><strong lang="zh-CN" data-original-language="zh-CN">{item.title}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{item.evidence_type} · <span lang="zh-CN" data-original-language="zh-CN">{item.source_name}</span></span></a>)}{!currentEvidence.length ? <p className="text-sm text-[var(--muted)]">当前没有通过筛选的背景事件或项目。</p> : null}</div></article>
      </section>
      <details className="advanced-disclosure"><summary>高级计算记录</summary><div className="mt-4 grid gap-2 font-mono text-xs text-[var(--muted)]"><p>status={result.status}</p><p>confidence={result.confidence}</p><p>model={result.model_version ?? "unavailable"}</p><p>formula={result.formula_version}</p><p>boundary={result.shock_boundary_status}</p><p>adjusted_observation={result.adjusted_input?.observation_id ?? "unavailable"}</p></div></details>
    </>}
  </section></LocalizedContent>;
}
