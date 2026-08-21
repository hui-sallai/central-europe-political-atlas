"use client";

import { useEffect, useState } from "react";
import { runAnalysisSkill } from "@/lib/analysisRunner";
import { panelGate, panelIndicatorLabels, panelRunnableIndicators } from "@/lib/panelData";
import type { Country } from "@/types/Country";
import type { PanelAnalysisOutput, PanelRuntimeObservation, PanelSpecification } from "@/types/PanelAnalysis";

function download(content: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function format(value: number) {
  return Number.isFinite(value) ? value.toFixed(4) : "—";
}

export function PanelEconometricsWorkbench({ countries }: { countries: Country[] }) {
  const panelCountries = countries.map((country) => country.slug);
  const [panelObservations, setPanelObservations] = useState<PanelRuntimeObservation[]>([]);
  const [dataLoadState, setDataLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [outcome, setOutcome] = useState("real_gdp_growth");
  const [variables, setVariables] = useState(["consumer_price_inflation", "unemployment_rate"]);
  const [selectedCountries, setSelectedCountries] = useState(panelCountries);
  const [startYear, setStartYear] = useState(2015);
  const [endYear, setEndYear] = useState(2025);
  const [fixedEffects, setFixedEffects] = useState<PanelSpecification["fixed_effects"]>("country_year");
  const [standardErrors, setStandardErrors] = useState<PanelSpecification["standard_errors"]>("cluster_country");
  const [result, setResult] = useState<PanelAnalysisOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${basePath}/research-data/panel_runtime.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then((payload) => {
        setPanelObservations(payload.records.map((row: Array<string | number | null>) => ({ observation_id: String(row[0]), country: String(row[1]), year: Number(row[2]), indicator: String(row[3]), value: row[4] === null ? null : Number(row[4]), comparability_status: String(row[5]) as PanelRuntimeObservation["comparability_status"], data_status: String(row[6]) as PanelRuntimeObservation["data_status"] })));
        setDataLoadState("ready");
      })
      .catch((loadError) => { if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setDataLoadState("error"); });
    return () => controller.abort();
  }, []);

  function toggleVariable(indicator: string) {
    setVariables((current) => current.includes(indicator) ? current.filter((item) => item !== indicator) : [...current, indicator]);
  }

  function toggleCountry(country: string) {
    setSelectedCountries((current) => current.includes(country) ? current.filter((item) => item !== country) : [...current, country]);
  }

  function run() {
    if (dataLoadState !== "ready") { setError("年度面板运行数据尚未加载完成。"); return; }
    const specification: PanelSpecification = { outcome, explanatory_variables: variables, countries: selectedCountries, start_year: startYear, end_year: endYear, fixed_effects: fixedEffects, standard_errors: standardErrors };
    const runResult = runAnalysisSkill({ skillId: "panel_econometrics", dataset: { panel_observations: panelObservations }, parameters: specification as unknown as Record<string, unknown> });
    if (runResult.status !== "completed" || !runResult.estimates || !("coefficients" in runResult.estimates)) {
      setResult(null);
      setError(runResult.diagnostics.validation_gate);
      return;
    }
    setResult(runResult.estimates as PanelAnalysisOutput);
    setError(null);
  }

  function exportCsv() {
    if (!result) return;
    const rows = [["variable", "coefficient", "standard_error", "t_stat", "p_value", "ci_95_low", "ci_95_high"], ...result.coefficients.map((item) => [item.variable, item.coefficient, item.standard_error, item.t_stat, item.p_value, item.ci_95_low, item.ci_95_high])];
    download(rows.map((row) => row.join(",")).join("\n"), "panel-econometrics-result.csv", "text/csv;charset=utf-8");
  }

  const coefficientScale = result ? Math.max(...result.coefficients.flatMap((item) => [Math.abs(item.ci_95_low), Math.abs(item.ci_95_high)]), 0.001) : 1;

  return (
    <div className="mt-6 grid gap-6">
      <section className="editorial-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="editorial-kicker">Panel data gate: {panelGate.status}</p><h2 className="mt-2 text-2xl font-semibold">Annual Panel 2015–2025</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">仅使用 A 级、official / verified 且口径可比的观测。CPI 不冒充 HICP，部分可比的财政与能源代理不会进入估计。</p></div><span className="rounded-full border border-[var(--positive)] px-3 py-1 text-xs font-semibold text-[var(--positive)]">{panelGate.qualified_key_variables} key variables qualified</span></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-[var(--muted)]">Outcome<select className="field-control mt-2" value={outcome} onChange={(event) => { const next = event.target.value; setOutcome(next); setVariables((current) => current.filter((item) => item !== next)); }}>{panelRunnableIndicators.map((indicator) => <option key={indicator} value={indicator}>{panelIndicatorLabels[indicator] ?? indicator}</option>)}</select></label>
          <label className="text-xs font-semibold text-[var(--muted)]">Fixed effects<select className="field-control mt-2" value={fixedEffects} onChange={(event) => setFixedEffects(event.target.value as PanelSpecification["fixed_effects"])}><option value="none">Pooled OLS</option><option value="country">Country FE</option><option value="country_year">Country + Year FE</option></select></label>
          <label className="text-xs font-semibold text-[var(--muted)]">SE method<select className="field-control mt-2" value={standardErrors} onChange={(event) => setStandardErrors(event.target.value as PanelSpecification["standard_errors"])}><option value="robust">HC1 robust</option><option value="cluster_country">Clustered by country</option></select></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-[var(--muted)]">From<input className="field-control mt-2" type="number" min="2015" max={endYear} value={startYear} onChange={(event) => setStartYear(Number(event.target.value))} /></label><label className="text-xs font-semibold text-[var(--muted)]">To<input className="field-control mt-2" type="number" min={startYear} max="2025" value={endYear} onChange={(event) => setEndYear(Number(event.target.value))} /></label></div>
        </div>
        <fieldset className="mt-5"><legend className="text-xs font-semibold text-[var(--muted)]">Explanatory variables</legend><div className="mt-2 flex flex-wrap gap-2">{panelRunnableIndicators.filter((indicator) => indicator !== outcome).map((indicator) => <label key={indicator} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs"><input type="checkbox" className="mr-2" checked={variables.includes(indicator)} onChange={() => toggleVariable(indicator)} />{panelIndicatorLabels[indicator] ?? indicator}</label>)}</div></fieldset>
        <fieldset className="mt-5"><legend className="text-xs font-semibold text-[var(--muted)]">Countries (clustered SE requires at least 8)</legend><div className="mt-2 flex flex-wrap gap-2">{panelCountries.map((slug) => <label key={slug} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs"><input type="checkbox" className="mr-2" checked={selectedCountries.includes(slug)} onChange={() => toggleCountry(slug)} />{countries.find((country) => country.slug === slug)?.name_zh ?? slug}</label>)}</div></fieldset>
        <button type="button" onClick={run} disabled={dataLoadState !== "ready"} className="mt-5 rounded-lg bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{dataLoadState === "loading" ? "Loading panel data…" : dataLoadState === "error" ? "Panel data unavailable" : "Run panel analysis"}</button>
        {error ? <p className="mt-4 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm">未运行：{error}</p> : null}
      </section>

      {result ? <section className="editorial-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="editorial-kicker">{result.model}</p><h2 className="mt-2 text-2xl font-semibold">Coefficient estimates</h2></div><div className="flex gap-2"><button type="button" onClick={() => download(JSON.stringify(result, null, 2), "panel-econometrics-result.json", "application/json") } className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold">JSON</button><button type="button" onClick={exportCsv} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold">CSV</button></div></div>
        <div className="mt-6 grid gap-3">{result.coefficients.map((item) => <div key={item.variable} className="grid gap-2 md:grid-cols-[220px_1fr_90px]"><span className="text-sm font-semibold">{panelIndicatorLabels[item.variable] ?? item.variable}</span><div className="relative h-6 bg-[var(--surface)]"><span className="absolute inset-y-0 left-1/2 w-px bg-[var(--muted)]" /><span className="absolute top-[9px] h-2 bg-[var(--accent-soft)]" style={{ left: `${50 + (item.ci_95_low / coefficientScale) * 45}%`, width: `${Math.max(1, ((item.ci_95_high - item.ci_95_low) / coefficientScale) * 45)}%` }} /><span className="absolute top-1 h-4 w-1 bg-[var(--accent)]" style={{ left: `${50 + (item.coefficient / coefficientScale) * 45}%` }} /></div><span className="metric-number text-right text-sm">{format(item.coefficient)}</span></div>)}</div>
        <div className="mt-6 overflow-x-auto"><table className="research-data-table w-full min-w-[840px] text-left text-sm"><thead><tr>{["Variable", "Coefficient", "Robust SE", "t", "p (asymptotic)", "95% CI"].map((item) => <th key={item} className="px-3 py-3">{item}</th>)}</tr></thead><tbody>{result.coefficients.map((item) => <tr key={item.variable}><td className="px-3 py-3 font-semibold">{panelIndicatorLabels[item.variable] ?? item.variable}</td><td className="metric-number px-3 py-3">{format(item.coefficient)}</td><td className="metric-number px-3 py-3">{format(item.standard_error)}</td><td className="metric-number px-3 py-3">{format(item.t_stat)}</td><td className="metric-number px-3 py-3">{format(item.p_value)}</td><td className="metric-number px-3 py-3">[{format(item.ci_95_low)}, {format(item.ci_95_high)}]</td></tr>)}</tbody></table></div>
        <dl className="mt-6 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3 lg:grid-cols-6">{[["N", result.diagnostics.observations], ["Countries", result.diagnostics.countries], ["Years", result.diagnostics.years], ["R²", format(result.diagnostics.r_squared)], ["Within R²", format(result.diagnostics.within_r_squared)], ["Missing rows", result.diagnostics.missing_rows]].map(([label, value]) => <div key={label} className="bg-white p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="metric-number mt-1 font-semibold">{value}</dd></div>)}</dl>
        {result.diagnostics.multicollinearity_warning ? <p className="mt-4 text-sm text-[var(--warning)]">{result.diagnostics.multicollinearity_warning}</p> : null}
        <p className="mt-5 text-sm leading-7 text-[var(--muted)]">{result.interpretation_boundary}</p>
        <details className="advanced-disclosure mt-5"><summary>Data trace ({result.data_trace.length} observation IDs)</summary><p className="mt-3 break-words font-mono text-[10px] leading-5 text-[var(--muted)]">{result.data_trace.join(" · ")}</p></details>
      </section> : null}
    </div>
  );
}
