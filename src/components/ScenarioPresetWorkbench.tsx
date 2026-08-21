"use client";

import { useMemo, useState } from "react";
import { calculateScenario } from "@/lib/scenarioFramework";
import { scenarioPresets } from "@/lib/scenarioPresets";
import type { Country } from "@/types/Country";
import type { ModelCard, ModelOutput } from "@/types/ModelOutput";
import type { ScenarioDefinition, ScenarioEvidenceLink, ScenarioId, ScenarioRegionalContext, ScenarioResult } from "@/types/Scenario";

export function ScenarioPresetWorkbench({ countries, definitions, cards, outputs, evidence, regionalContexts }: { countries: Country[]; definitions: ScenarioDefinition[]; cards: ModelCard[]; outputs: ModelOutput[]; evidence: ScenarioEvidenceLink[]; regionalContexts: ScenarioRegionalContext[] }) {
  const [countrySlug, setCountrySlug] = useState("poland");
  const [scenarioId, setScenarioId] = useState<ScenarioId>(definitions[0]?.scenario_id ?? "inflation_resurgence");
  const definition = definitions.find((item) => item.scenario_id === scenarioId) ?? definitions[0];
  const [shockValue, setShockValue] = useState(definition?.default_shock_value ?? 0);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const currentEvidence = useMemo(() => evidence.filter((item) => item.country_slug === countrySlug && item.scenario_id === scenarioId), [countrySlug, evidence, scenarioId]);
  const preset = scenarioPresets.find((item) => item.scenario_id === scenarioId);

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
  return <section className="mt-8 grid gap-6">
    <div className="editorial-panel p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <label className="text-xs font-semibold text-[var(--muted)]">Country<select className="field-control mt-2" value={countrySlug} onChange={(event) => { setCountrySlug(event.target.value); setResult(null); }}>{countries.map((country) => <option key={country.slug} value={country.slug}>{country.name_zh} / {country.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--muted)]">Scenario<select className="field-control mt-2" value={scenarioId} onChange={(event) => changeScenario(event.target.value as ScenarioId)}>{definitions.map((item) => <option key={item.scenario_id} value={item.scenario_id}>{item.name_zh}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--muted)]">Shock ({definition.shock_unit})<input className="field-control mt-2" type="number" min={definition.shock_min} max={definition.shock_max} step={definition.shock_step} value={shockValue} onChange={(event) => { setShockValue(Number(event.target.value)); setResult(null); }} /></label>
        <div className="flex items-end"><button type="button" onClick={runScenario} className="w-full rounded-lg bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white">运行情景分析</button></div>
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">Target skill: <strong className="text-[var(--foreground)]">{preset?.target_skill}</strong>. 情景不改写原始 observation。</p>
    </div>

    {!result ? <div className="border-y border-[var(--line)] py-12 text-center"><p className="font-semibold">设置冲击后运行预设</p><p className="mt-2 text-sm text-[var(--muted)]">结果是条件式“如果……那么……”比较，不是预测。</p></div> : <>
      <section className="grid gap-4 md:grid-cols-3">
        {[ ["Baseline", result.baseline_score], ["Scenario", result.scenario_score], ["Change", result.score_change] ].map(([label, value]) => <article key={String(label)} className="editorial-panel p-5"><p className="editorial-kicker">{label}</p><p className="metric-number mt-3 text-4xl font-semibold text-[var(--accent)]">{typeof value === "number" ? `${value > 0 && label === "Change" ? "+" : ""}${value.toFixed(1)}` : "Unavailable"}</p></article>)}
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="editorial-panel p-5"><p className="editorial-kicker">Transmission</p><h2 className="mt-3 text-2xl font-semibold">传导链</h2><ol className="mt-5 grid gap-3">{result.transmission_chain.map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 border-b border-[var(--line)] pb-3 text-sm"><span className="metric-number text-[var(--accent)]">{index + 1}</span><span>{item}</span></li>)}</ol><p className="mt-5 text-sm leading-7 text-[var(--muted)]">{result.interpretation_boundary}</p></article>
        <article className="editorial-panel p-5"><p className="editorial-kicker">Evidence</p><h2 className="mt-3 text-2xl font-semibold">背景证据</h2><p className="mt-3 text-sm text-[var(--muted)]">证据用于解释，不进入冲击数值或基础分数。</p><div className="mt-4 grid gap-3">{currentEvidence.slice(0, 6).map((item) => <a key={item.evidence_link_id} href={item.source_url ?? "#"} target={item.source_url ? "_blank" : undefined} rel="noreferrer" className="border-l-2 border-[var(--secondary)] pl-3 text-sm"><strong>{item.title}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{item.evidence_type} · {item.source_name}</span></a>)}{!currentEvidence.length ? <p className="text-sm text-[var(--muted)]">当前没有通过筛选的背景事件或项目。</p> : null}</div></article>
      </section>
      <details className="advanced-disclosure"><summary>Advanced calculation record</summary><div className="mt-4 grid gap-2 font-mono text-xs text-[var(--muted)]"><p>status={result.status}</p><p>confidence={result.confidence}</p><p>model={result.model_version ?? "unavailable"}</p><p>formula={result.formula_version}</p><p>boundary={result.shock_boundary_status}</p><p>adjusted_observation={result.adjusted_input?.observation_id ?? "unavailable"}</p></div></details>
    </>}
  </section>;
}
