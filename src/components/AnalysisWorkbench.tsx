"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BarMeter } from "@/components/ResearchCharts";
import { runAnalysisSkill } from "@/lib/analysisRunner";
import { analysisCategoryLabels, analysisSkills } from "@/lib/analysisSkills";
import type { Country } from "@/types/Country";
import type { AnalysisDiagnostics, AnalysisSkillCategory } from "@/types/AnalysisSkill";
import type { ModelCard, ModelId, ModelOutput } from "@/types/ModelOutput";

const categories = Object.keys(analysisCategoryLabels) as AnalysisSkillCategory[];
const tabLabels = { results: "Results", drivers: "Drivers", method: "Method", data: "Data" } as const;
type ResultTab = keyof typeof tabLabels;
type ConsistencyStatus = "match" | "mismatch" | "missing_reference" | null;

const PanelEconometricsWorkbench = dynamic(() => import("@/components/PanelEconometricsWorkbench").then((module) => module.PanelEconometricsWorkbench), {
  loading: () => <p className="mt-6 border-y border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">Loading panel workspace…</p>,
});
const TradeNetworkWorkbench = dynamic(() => import("@/components/TradeNetworkWorkbench").then((module) => module.TradeNetworkWorkbench), {
  loading: () => <p className="mt-6 border-y border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">Loading network workspace…</p>,
});

function downloadJson(value: unknown, fileName: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function outputsMatch(runtime: ModelOutput, reference: ModelOutput) {
  return runtime.score === reference.score
    && runtime.availability === reference.availability
    && runtime.data_completeness === reference.data_completeness
    && runtime.input_year === reference.input_year
    && runtime.input_observation_ids.join("|") === reference.input_observation_ids.join("|")
    && runtime.missing_indicator_ids.join("|") === reference.missing_indicator_ids.join("|");
}

export function AnalysisWorkbench({ countries, cards, outputs }: { countries: Country[]; cards: ModelCard[]; outputs: ModelOutput[] }) {
  const [category, setCategory] = useState<AnalysisSkillCategory>("composite_indicators");
  const [countrySlug, setCountrySlug] = useState("poland");
  const [modelId, setModelId] = useState<ModelId>(cards[0]?.model_id ?? "household_economic_pressure");
  const [result, setResult] = useState<ModelOutput | null>(null);
  const [diagnostics, setDiagnostics] = useState<AnalysisDiagnostics | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyStatus>(null);
  const [resultTab, setResultTab] = useState<ResultTab>("results");
  const skills = analysisSkills.filter((skill) => skill.category === category);
  const card = cards.find((item) => item.model_id === modelId) ?? cards[0];
  const candidate = useMemo(() => outputs.find((item) => item.country_slug === countrySlug && item.model_id === modelId) ?? null, [countrySlug, modelId, outputs]);

  function runAnalysis() {
    const run = runAnalysisSkill({ skillId: modelId, dataset: { country_slug: countrySlug, model_id: modelId } });
    const compositeResult = run.estimates as ModelOutput | null;
    setResult(compositeResult);
    setDiagnostics(run.diagnostics);
    setConsistency(compositeResult ? candidate ? outputsMatch(compositeResult, candidate) ? "match" : "mismatch" : "missing_reference" : null);
    setResultTab("results");
  }

  return (
    <section className="mt-8">
      <div className="research-tabs" role="tablist" aria-label="分析方法类别">
        {categories.map((item) => <button key={item} type="button" role="tab" className="research-tab" aria-selected={category === item} onClick={() => { setCategory(item); setResult(null); setDiagnostics(null); setConsistency(null); }}>{analysisCategoryLabels[item]}</button>)}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="editorial-panel p-4"><p className="editorial-kicker">Active Analyses</p><p className="mt-2 text-sm font-semibold">Composite Indicators · Panel Econometrics · Network Analysis</p></div>
        <div className="editorial-panel p-4"><p className="editorial-kicker">Interfaces Reserved</p><p className="mt-2 text-sm font-semibold">Wild Cluster Bootstrap</p></div>
        <div className="editorial-panel p-4"><p className="editorial-kicker">Future Methods</p><p className="mt-2 text-sm font-semibold">Event Study · VAR / SVAR · Bayesian · Causal</p></div>
      </div>

      {category === "composite_indicators" ? (        <div className="mt-6 grid gap-6">
          <section className="editorial-panel p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-xs font-semibold text-[var(--muted)]">Country<select className="field-control mt-2" value={countrySlug} onChange={(event) => { setCountrySlug(event.target.value); setResult(null); setDiagnostics(null); setConsistency(null); }}>{countries.map((country) => <option key={country.slug} value={country.slug}>{country.name_zh} / {country.name}</option>)}</select></label>
              <label className="text-xs font-semibold text-[var(--muted)]">Analysis skill<select className="field-control mt-2" value={modelId} onChange={(event) => { setModelId(event.target.value as ModelId); setResult(null); setDiagnostics(null); setConsistency(null); }}>{cards.map((item) => <option key={item.model_id} value={item.model_id}>{item.name_zh}</option>)}</select></label>
              <div className="flex items-end"><button type="button" onClick={runAnalysis} className="w-full rounded-lg bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white">Run analysis</button></div>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs">
              {["Run", "Results", "Diagnostics", "Export"].map((step, index) => <div key={step} className={`border-t-2 pt-2 ${result && index > 0 ? "border-[var(--accent)] text-[var(--foreground)]" : index === 0 ? "border-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"}`}>{step}</div>)}
            </div>
          </section>

          {!result ? <div className="border-y border-[var(--line)] py-12 text-center"><p className="font-semibold">选择国家和分析方法后运行</p><p className="mt-2 text-sm text-[var(--muted)]">运行只读取已通过准入的 canonical observations；缺失值不会被推测或补零。</p></div> : (
            <section className="editorial-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5">
                <div><p className="editorial-kicker">{result.country}</p><h2 className="mt-2 text-3xl font-semibold">{card.name_zh}</h2><p className="mt-2 text-sm text-[var(--muted)]">{result.availability} · 输入年份 {result.input_year ?? "不可用"} · 完整度 {result.data_completeness}%</p></div>
                <button type="button" onClick={() => downloadJson(result, `${result.country_slug}-${result.model_id}.json`)} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">Export result</button>
              </div>
              <div className="research-tabs mt-5" role="tablist">{(Object.keys(tabLabels) as ResultTab[]).map((tab) => <button key={tab} type="button" role="tab" className="research-tab" aria-selected={resultTab === tab} onClick={() => setResultTab(tab)}>{tabLabels[tab]}</button>)}</div>

              {consistency === "mismatch" ? <div className="mt-5 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert"><strong>一致性警告：</strong>现场计算结果与当前发布参考记录不一致，请复核输入版本和导出包。</div> : null}
              {consistency === "match" ? <p className="mt-5 text-xs font-semibold text-[var(--positive)]">现场计算与当前发布参考记录一致。</p> : null}
              {consistency === "missing_reference" ? <p className="mt-5 text-xs font-semibold text-[var(--warning)]">现场计算已完成，但没有找到可比较的发布参考记录。</p> : null}

              {resultTab === "results" ? <div className="mt-6 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]"><div><p className="text-sm text-[var(--muted)]">Score</p><p className="metric-number mt-2 text-5xl font-semibold text-[var(--accent)]">{result.score === null ? "Unavailable" : result.score.toFixed(1)}</p><p className="mt-3 text-sm">Trend: {result.direction} {result.trend_change === null ? "" : `(${result.trend_change > 0 ? "+" : ""}${result.trend_change.toFixed(1)})`}</p><p className="mt-3 text-sm text-[var(--muted)]">Confidence: {result.confidence}</p></div><div>{result.score !== null ? <BarMeter value={result.score} max={100} label={`${result.score.toFixed(1)} / 100`} /> : <p className="border-y border-[var(--line)] py-8 text-sm text-[var(--muted)]">输入不足，不输出精确分数。</p>}<p className="mt-5 text-sm leading-7 text-[var(--muted)]">{result.interpretation_boundary}</p></div></div> : null}
              {resultTab === "drivers" ? <div className="mt-6 grid gap-3 md:grid-cols-2">{result.main_drivers.length ? result.main_drivers.map((driver) => <article key={driver} className="border-l-2 border-[var(--accent)] py-2 pl-4 text-sm">{driver}</article>) : <p className="text-sm text-[var(--muted)]">当前没有足够输入生成主要驱动。</p>}</div> : null}
              {resultTab === "method" ? <div className="mt-6 grid gap-5 md:grid-cols-2"><div><h3 className="font-semibold">计算逻辑</h3><p className="mt-2 text-sm leading-7 text-[var(--muted)]">{card.calculation_logic}</p><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{card.weight_note}</p></div><div><h3 className="font-semibold">输入与权重</h3>{card.inputs.map((input) => <div key={input.indicator_id} className="mt-3 flex justify-between border-b border-[var(--line)] pb-2 text-sm"><span>{input.label}</span><span className="metric-number">{Math.round(input.weight * 100)}%</span></div>)}</div>{diagnostics ? <div className="md:col-span-2"><h3 className="font-semibold">Composite diagnostics</h3><dl className="mt-3 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">{[["Input completeness", diagnostics.input_completeness === null ? "—" : `${diagnostics.input_completeness}%`], ["Year alignment", diagnostics.year_alignment], ["Validation gate", diagnostics.validation_gate], ["Missing variables", diagnostics.missing_variables.length ? diagnostics.missing_variables.join(" / ") : "None"]].map(([label, value]) => <div key={label} className="bg-[var(--surface)] p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}</dl></div> : null}<details className="advanced-disclosure md:col-span-2"><summary>Advanced model metadata and limitations</summary><p className="mt-3 font-mono text-xs text-[var(--muted)]">model={card.model_version} · formula={card.formula_version} · weights={card.weight_version}</p><ul className="mt-3 grid gap-2 text-sm text-[var(--muted)]">{card.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details></div> : null}
              {resultTab === "data" ? <div className="mt-6 overflow-x-auto"><table className="research-data-table w-full min-w-[760px] text-left text-sm"><thead><tr>{["Indicator", "Year", "Value", "Unit", "Source", "Contribution"].map((item) => <th key={item} className="px-3 py-3">{item}</th>)}</tr></thead><tbody>{result.inputs.map((input) => <tr key={input.observation_id}><td className="px-3 py-3 font-semibold">{input.indicator_name}</td><td className="px-3 py-3">{input.year}</td><td className="metric-number px-3 py-3">{input.raw_value}</td><td className="px-3 py-3">{input.unit}</td><td className="px-3 py-3"><a href={input.source_url} target="_blank" rel="noreferrer" className="text-[var(--accent)]">{input.source_name}</a></td><td className="metric-number px-3 py-3">{input.weighted_contribution}</td></tr>)}</tbody></table></div> : null}
            </section>
          )}
        </div>
      ) : category === "panel_econometrics" ? (
        <PanelEconometricsWorkbench countries={countries} />
      ) : category === "network_analysis" ? (
        <TradeNetworkWorkbench countries={countries} />
      ) : (
        <div className="divide-y divide-[var(--line)] border-y border-[var(--line)] mt-6">{skills.map((skill) => <article key={skill.skill_id} className="grid gap-3 py-5 md:grid-cols-[220px_1fr_auto] md:items-start"><div><p className="editorial-kicker">{skill.calculation_mode.replaceAll("_", " ")}</p><h2 className="mt-2 text-xl font-semibold">{skill.name}</h2></div><p className="text-sm leading-7 text-[var(--muted)]">{skill.description}</p><span className="text-xs font-semibold text-[var(--warning)]">{skill.calculation_mode === "blocked" ? "Blocked by data frequency" : skill.calculation_mode === "data_building" ? "Data building" : "Registry only"}</span><details className="advanced-disclosure md:col-span-3"><summary>Registered requirements</summary><p className="mt-3 text-xs text-[var(--muted)]">Required: {skill.required_data.join(" / ")}</p><p className="mt-2 text-xs text-[var(--muted)]">Diagnostics: {skill.diagnostics.join(" / ")}</p></details></article>)}</div>
      )}
    </section>
  );
}
