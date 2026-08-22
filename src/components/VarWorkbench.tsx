"use client";

import { useEffect, useMemo, useState } from "react";
import { isValidMonthPeriod, maximumAllowedVarLag, runReducedFormVar, type VarRunOutcome, type VarSpecification } from "@/lib/varEngine";
import { applyTransformation, TIME_SERIES_TRANSFORMATION_REGISTRY, transformationLabels, transformationSpec } from "@/lib/timeSeriesTransforms";
import type { HighFrequencyPoint } from "@/lib/eventWindowEngine";
import type { InformationCriterion, TransformationId, VarCountryReadiness, VarReadinessPayload, VarSpecificationKind } from "@/types/MacroDynamics";
import type { Country } from "@/types/Country";
import { actionLabels, varLabels } from "@/lib/uiLabels";

type RuntimeRow = [string, string, string, string, number | null, string, string, HighFrequencyPoint["value_semantics"], string, string, string, string];

type ResultTab = keyof typeof varLabels.resultTabs;

const indicatorLabels: Record<string, string> = {
  hicp_monthly_index: "HICP 月度指数",
  hicp_annual_rate: "HICP 年通胀率",
  unemployment_rate_monthly: "月度失业率（季调）",
  industrial_production_index: "工业生产指数（季调日历调整）",
};

const stateClass: Record<string, string> = {
  dynamic_response_ready: "text-[var(--positive)]",
  estimable: "text-[var(--positive)]",
  estimable_with_warning: "text-[var(--warning)]",
};

function downloadJson(value: unknown, fileName: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function VarWorkbench({ countries }: { countries: Country[] }) {
  const [series, setSeries] = useState<HighFrequencyPoint[]>([]);
  const [baselineReadiness, setBaselineReadiness] = useState<VarCountryReadiness[]>([]);
  const [exploratoryReadiness, setExploratoryReadiness] = useState<VarCountryReadiness[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [country, setCountry] = useState("poland");
  const [selected, setSelected] = useState<Array<{ indicator: string; transformation: TransformationId }>>([
    { indicator: "hicp_monthly_index", transformation: "log_difference" },
    { indicator: "industrial_production_index", transformation: "log_difference" },
    { indicator: "unemployment_rate_monthly", transformation: "level" },
  ]);
  const [startPeriod, setStartPeriod] = useState("2015-01");
  const [endPeriod, setEndPeriod] = useState("2026-06");
  const [criterion, setCriterion] = useState<InformationCriterion>("bic");
  const [maxLag, setMaxLag] = useState(6);
  const [outcome, setOutcome] = useState<VarRunOutcome | null>(null);
  const [tab, setTab] = useState<ResultTab>("results");
  const [shockIndex, setShockIndex] = useState(0);
  const [horizon, setHorizon] = useState(12);
  const [showRaw, setShowRaw] = useState(false);
  const [specificationKind, setSpecificationKind] = useState<VarSpecificationKind>("baseline_prespecified");
  const [profileId, setProfileId] = useState<string | null>("baseline_monthly_macro_v1");

  useEffect(() => {
    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    Promise.all([
      fetch(`${basePath}/research-data/high_frequency_runtime.json`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); }),
      fetch(`${basePath}/research-data/var_country_readiness.json`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); }),
    ])
      .then(([runtime, readinessPayload]: [{ records: RuntimeRow[] }, VarReadinessPayload]) => {
        const loadedSeries = runtime.records.map((row) => ({ observation_id: row[0], country: row[1], period: row[2], indicator: row[3], value: row[4], transformation: row[5], unit: row[6], value_semantics: row[7] ?? undefined }));
        setSeries(loadedSeries);
        setBaselineReadiness(readinessPayload.baseline_profile_readiness.records);
        setExploratoryReadiness(readinessPayload.exploratory_profile_readiness.records);
        const latestPolandPeriod = loadedSeries.filter((point) => point.country === "poland" && point.value !== null).map((point) => point.period).sort().at(-1);
        if (latestPolandPeriod) setEndPeriod(latestPolandPeriod);
        setLoadState("ready");
      })
      .catch((loadError) => { if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setLoadState("error"); });
    return () => controller.abort();
  }, []);

  const countryBaseline = baselineReadiness.find((entry) => entry.country === country) ?? null;
  const countryExploratory = exploratoryReadiness.find((entry) => entry.country === country) ?? null;
  const seriesByIndicator = useMemo(() => {
    const map = new Map<string, HighFrequencyPoint[]>();
    for (const point of series) {
      const list = map.get(point.indicator) ?? [];
      list.push(point);
      map.set(point.indicator, list);
    }
    return map;
  }, [series]);

  const preflight = useMemo(() => {
    const validPeriod = isValidMonthPeriod(startPeriod) && isValidMonthPeriod(endPeriod) && startPeriod <= endPeriod;
    if (!validPeriod || selected.length < 2 || selected.length > 4) return { valid: false, effective: 0, maximumLag: 0, message: "请使用 YYYY-MM 月份格式，并选择 2–4 个变量。" };
    const maps = selected.map((variable) => {
      const raw = (seriesByIndicator.get(variable.indicator) ?? []).filter((point) => point.country === country);
      return new Map(applyTransformation(raw, variable.transformation).map((point) => [point.period, point.value]));
    });
    const months = (maps[0] ? [...maps[0].keys()] : []).filter((period) => period >= startPeriod && period <= endPeriod && maps.every((map) => map.get(period) !== null && map.get(period) !== undefined)).sort();
    const monthIndex = (period: string) => { const [year, month] = period.split("-").map(Number); return year * 12 + month - 1; };
    const contiguous = months.every((period, index) => index === 0 || monthIndex(period) - monthIndex(months[index - 1]) === 1);
    const maximumLag = maximumAllowedVarLag(months.length, selected.length);
    const message = months.length < 60 ? `共同有效月份 ${months.length}，低于 60。` : !contiguous ? "共同有效样本存在内部月份缺口；必须先调整窗口或变量。" : `共同有效月份 ${months.length}；当前变量数最多允许 ${maximumLag} 阶。`;
    return { valid: months.length >= 60 && contiguous && maximumLag >= 1, effective: months.length, maximumLag, message };
  }, [country, endPeriod, selected, seriesByIndicator, startPeriod]);

  function markCustom() {
    setSpecificationKind("custom");
    setProfileId(null);
    setOutcome(null);
  }

  function toggleVariable(indicator: string) {
    markCustom();
    setSelected((current) => {
      if (current.some((entry) => entry.indicator === indicator)) {
        return current.filter((entry) => entry.indicator !== indicator);
      }
      const spec = transformationSpec(indicator);
      return [...current, { indicator, transformation: spec?.default_transformation ?? "level" }];
    });
  }

  function setTransformation(indicator: string, transformation: TransformationId) {
    markCustom();
    setSelected((current) => current.map((entry) => entry.indicator === indicator ? { ...entry, transformation } : entry));
  }

  function run() {
    if (loadState !== "ready") return;
    const specification: VarSpecification = {
      country,
      variables: selected,
      start_period: startPeriod,
      end_period: endPeriod,
      ic_criterion: criterion,
      max_lag: maxLag,
      deterministic_terms: "constant",
      profile_id: profileId,
      specification_kind: specificationKind,
    };
    setOutcome(runReducedFormVar(specification, seriesByIndicator));
    setTab("results");
    setShockIndex(0);
  }

  const result = outcome?.status === "ok" ? outcome.result : null;
  const irfOrdering = result?.irf?.ordering ?? [];
  const irfPaths = result?.irf?.paths.filter((path) => path.shock_variable === irfOrdering[shockIndex]) ?? [];

  function chooseCountry(nextCountry: string) {
    setCountry(nextCountry);
    setOutcome(null);
    const registered = baselineReadiness.find((entry) => entry.country === nextCountry);
    if (registered?.variables.length) setSelected(registered.variables);
    setSpecificationKind("baseline_prespecified");
    setProfileId("baseline_monthly_macro_v1");
    const latestPeriod = series.filter((point) => point.country === nextCountry && point.value !== null).map((point) => point.period).sort().at(-1);
    if (latestPeriod) setEndPeriod(latestPeriod);
  }

  function loadProfile(record: VarCountryReadiness | null, kind: VarSpecificationKind, id: string) {
    if (!record) return;
    setSelected(record.variables);
    setSpecificationKind(kind);
    setProfileId(id);
    setOutcome(null);
  }

  function moveVariable(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    markCustom();
    setSelected((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="mt-6 grid gap-6">
      <section className="editorial-panel p-5">
        <p className="editorial-kicker">{varLabels.workbenchKicker}</p>
        <h2 className="mt-2 text-2xl font-semibold">{varLabels.workbenchTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">单国月度简化式 VAR：变换 → 平稳性检验 → 滞后选择 → 估计 → 稳定性与残差诊断 → 动态响应。简化式创新不等于已识别经济冲击；SVAR 与 Local Projections 保持未开放。</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-[var(--muted)]">国家
            <select className="field-control mt-2" value={country} onChange={(event) => chooseCountry(event.target.value)}>
              {countries.map((item) => <option key={item.slug} value={item.slug}>{item.name_zh} / {item.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">{varLabels.icCriterion}
            <select className="field-control mt-2" value={criterion} onChange={(event) => { setCriterion(event.target.value as InformationCriterion); markCustom(); }}>
              <option value="bic">BIC（默认）</option>
              <option value="aic">AIC</option>
              <option value="hqic">HQIC</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">{varLabels.maxLag}
            <select className="field-control mt-2" value={maxLag} onChange={(event) => { setMaxLag(Number(event.target.value)); markCustom(); }}>
              {[2, 3, 4, 6, 8, 10, 12].map((option) => <option key={option} value={option}>{option} 个月</option>)}
            </select>
          </label>
          <div className="text-xs font-semibold text-[var(--muted)]">
            <p>样本窗口</p>
            <div className="mt-2 flex gap-2">
              <input aria-label={varLabels.startPeriod} className="field-control" value={startPeriod} onChange={(event) => { setStartPeriod(event.target.value); markCustom(); }} placeholder="2015-01" />
              <input aria-label={varLabels.endPeriod} className="field-control" value={endPeriod} onChange={(event) => { setEndPeriod(event.target.value); markCustom(); }} placeholder="最新可用月份" />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold text-[var(--muted)]">{varLabels.variables}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TIME_SERIES_TRANSFORMATION_REGISTRY.map((spec) => {
              const active = selected.some((entry) => entry.indicator === spec.indicator);
              return (
                <button key={spec.indicator} type="button" onClick={() => toggleVariable(spec.indicator)}
                  className={active ? "rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white" : "rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"}>
                  {indicatorLabels[spec.indicator] ?? spec.indicator}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {selected.map((entry, index) => {
              const spec = transformationSpec(entry.indicator);
              return (
                <div key={entry.indicator} className="rounded-lg border border-[var(--line)] bg-white p-3 text-xs font-semibold text-[var(--muted)]">
                  <div className="flex items-center justify-between gap-2"><span>{index + 1}. {indicatorLabels[entry.indicator] ?? entry.indicator}</span><span className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => moveVariable(index, -1)} className="rounded border border-[var(--line)] px-2 py-1 disabled:opacity-30">{actionLabels.moveVariableUp}</button><button type="button" disabled={index === selected.length - 1} onClick={() => moveVariable(index, 1)} className="rounded border border-[var(--line)] px-2 py-1 disabled:opacity-30">{actionLabels.moveVariableDown}</button></span></div>
                  <select className="field-control mt-1" value={entry.transformation} onChange={(event) => setTransformation(entry.indicator, event.target.value as TransformationId)}>
                    {(spec?.allowed_transformations ?? []).map((id) => <option key={id} value={id}>{transformationLabels[id]}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {[{ title: "正式 baseline", record: countryBaseline, kind: "baseline_prespecified" as const, id: "baseline_monthly_macro_v1", action: actionLabels.loadRegisteredVarSpec }, { title: "探索性 fallback", record: countryExploratory, kind: "exploratory_fallback" as const, id: "exploratory_monthly_macro_fallback_v1", action: actionLabels.loadExploratoryVarSpec }].map(({ title, record, kind, id, action }) => record ? (
            <div key={title} className="border-l-2 border-[var(--accent)] bg-white/50 p-4">
              <p className="text-xs font-semibold text-[var(--muted)]">{title}</p>
              <p className={`mt-1 text-sm font-semibold ${stateClass[record.readiness_state] ?? "text-[var(--warning)]"}`}>{varLabels.readinessStates[record.readiness_state]}</p>
              <p className="mt-1 text-xs leading-6 text-[var(--muted)]">VAR 可估计：{record.estimable ? "是" : "否"} · 动态响应可用：{record.dynamic_response_ready ? "是" : "否"} · 有效观测：{record.effective_observations || "—"}</p>
              {record.blocking_reasons.length ? <p className="mt-1 text-xs leading-6 text-[var(--muted)]">{record.blocking_reasons.join("；")}</p> : null}
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{record.variables.map((entry) => `${indicatorLabels[entry.indicator] ?? entry.indicator} · ${transformationLabels[entry.transformation]}`).join("；")}</p>
              <button type="button" onClick={() => loadProfile(record, kind, id)} className="mt-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold">{action}</button>
            </div>
          ) : null)}
        </div>

        <div className={`mt-4 rounded-lg border px-4 py-3 text-xs leading-6 ${preflight.valid ? "border-[var(--line)] bg-white" : "border-[var(--warning)] bg-amber-50"}`}>
          <p className="font-semibold">运行前检查 · {specificationKind === "baseline_prespecified" ? "正式 baseline" : specificationKind === "exploratory_fallback" ? "探索性规格" : "用户自定义规格"}</p>
          <p>{preflight.message} 请求最大滞后 {maxLag} 阶，实际将不超过 {preflight.maximumLag || "—"} 阶。</p>
          <p>变量顺序：{selected.map((entry, index) => `${index + 1} ${indicatorLabels[entry.indicator] ?? entry.indicator}`).join(" → ")}</p>
        </div>

        <button type="button" onClick={run} disabled={loadState !== "ready" || !preflight.valid} className="mt-5 rounded-lg bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {loadState === "loading" ? "正在加载高频数据…" : loadState === "error" ? "高频数据不可用" : actionLabels.runVar}
        </button>
        {loadState === "error" ? <p className="mt-4 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm">无法运行 VAR：高频月度数据未能加载。</p> : null}
      </section>

      {outcome?.status === "blocked" ? (
        <section className="editorial-panel border-l-4 border-[var(--warning)] p-5" role="alert">
          <p className="font-semibold">{varLabels.blockedTitle}：{varLabels.readinessStates[outcome.reason_code] ?? outcome.reason_code}</p>
          <ul className="mt-2 grid gap-1 text-sm text-[var(--muted)]">{outcome.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          {outcome.stationarity?.length ? (
            <div className="mt-4 overflow-x-auto"><table className="research-data-table w-full min-w-[640px] text-left text-sm"><thead><tr>{["指标", "变换", "ADF 统计量", "5% 临界值", "p 值", "状态"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead>
              <tbody>{outcome.stationarity.map((entry) => <tr key={`${entry.indicator}-${entry.transformation}`}><td className="px-3 py-2">{indicatorLabels[entry.indicator] ?? entry.indicator}</td><td className="px-3 py-2">{transformationLabels[entry.transformation]}</td><td className="metric-number px-3 py-2">{Number.isFinite(entry.adf.statistic) ? entry.adf.statistic.toFixed(3) : "—"}</td><td className="metric-number px-3 py-2">{entry.adf.critical_values["5%"].toFixed(3)}</td><td className="metric-number px-3 py-2">{Number.isFinite(entry.adf.p_value) ? entry.adf.p_value.toFixed(4) : "—"}</td><td className="px-3 py-2">{entry.adf.status}</td></tr>)}</tbody></table></div>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <section className="editorial-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
            <div>
              <p className="editorial-kicker">{countries.find((item) => item.slug === result.country)?.name_zh ?? result.country} · {result.sample.start_period} — {result.sample.end_period}</p>
              <h3 className="mt-2 text-xl font-semibold">{varLabels.workbenchTitle} · {result.variables.length} 变量 · 滞后 {result.selected_lag}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">变量顺序：{result.variable_order.map((id) => indicatorLabels[id] ?? id).join(" → ")}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">规格：{result.specification_kind} · profile：{result.profile_id ?? "custom"} · comparability signature：{result.comparability_signature.signature_id}</p>
            </div>
            <button type="button" onClick={() => downloadJson(result, `var-${result.country}-lag${result.selected_lag}.json`)} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">{varLabels.coefficientDownload}</button>
          </div>

          <div className="research-tabs mt-5" role="tablist">{(Object.keys(varLabels.resultTabs) as ResultTab[]).map((item) => <button key={item} type="button" role="tab" className="research-tab" aria-selected={tab === item} onClick={() => setTab(item)}>{varLabels.resultTabs[item]}</button>)}</div>

          {tab === "results" ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <dl className="grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
                {([
                  [varLabels.specification, `${result.variables.length} 变量 VAR(${result.selected_lag}) · 常数项`],
                  [varLabels.sampleWindow, `${result.sample.start_period} — ${result.sample.end_period}（${result.sample.effective_observations} 个月）`],
                  [varLabels.selectedLag, `${result.selected_lag}（${result.lag_selection.criterion.toUpperCase()} = ${result.lag_selection.selected_ic_value.toFixed(4)}）`],
                  [varLabels.stabilityCheck, result.diagnostics.stability.stable ? `${varLabels.stable} · 最大根模 ${result.diagnostics.stability.max_root_modulus.toFixed(4)}` : `${varLabels.unstable} · 最大根模 ${result.diagnostics.stability.max_root_modulus.toFixed(4)}`],
                  [varLabels.parameterGate, `${result.parameter_gate.effective_observations} / ${result.parameter_gate.parameters_per_equation} 参数 = ${result.parameter_gate.ratio}（≥4 通过）`],
                  ["滞后预检", `请求 ${result.lag_preflight.requested_max_lag} · 上限 ${result.lag_preflight.maximum_allowed_lag} · 实际候选上限 ${result.lag_preflight.applied_max_lag}`],
                  [varLabels.residualAutocorrelation, `主诊断 h=24 · Q=${Number.isFinite(result.diagnostics.residual_autocorrelation.statistic) ? result.diagnostics.residual_autocorrelation.statistic.toFixed(1) : "—"} · p=${Number.isFinite(result.diagnostics.residual_autocorrelation.p_value) ? result.diagnostics.residual_autocorrelation.p_value.toFixed(4) : "—"}`],
                ] as Array<[string, string]>).map(([label, value]) => (
                  <div key={label} className="bg-white p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>
                ))}
              </dl>
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">{varLabels.residualCovariance}</p>
                <table className="research-data-table mt-2 w-full text-left text-xs"><tbody>{result.residual_covariance.map((row, rowIndex) => (
                  <tr key={rowIndex}>{row.map((value, colIndex) => <td key={colIndex} className="metric-number px-3 py-2">{value.toExponential(3)}</td>)}</tr>
                ))}</tbody></table>
                <p className="mt-3 text-xs leading-6 text-[var(--muted)]">完整滞后系数矩阵与截距包含在下载结果中；主屏不展开几十个滞后系数。</p>
              </div>
            </div>
          ) : null}

          {tab === "irf" ? (
            <div className="mt-6">
              {result.irf ? (
                <>
                  <div className="flex flex-wrap items-end gap-4">
                    <label className="text-xs font-semibold text-[var(--muted)]">{varLabels.shockVariable}
                      <select className="field-control mt-1" value={shockIndex} onChange={(event) => setShockIndex(Number(event.target.value))}>
                        {result.irf.ordering.map((id, index) => <option key={id} value={index}>{indicatorLabels[id] ?? id}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-[var(--muted)]">{varLabels.horizon}
                      <select className="field-control mt-1" value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}>
                        {[6, 12, 18, 24].map((option) => <option key={option} value={option}>{option} 个月</option>)}
                      </select>
                    </label>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-[var(--muted)]">冲击变量：{indicatorLabels[result.irf.ordering[shockIndex]] ?? result.irf.ordering[shockIndex]}；响应单位与对应变换后变量一致。{result.irf.ordering_dependency_note} {result.irf.uncertainty_note}</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {irfPaths.map((path) => {
                      const slice = path.response.slice(0, horizon + 1);
                      const maxAbs = Math.max(...slice.map((value) => Math.abs(value)), 1e-9);
                      const points = slice.map((value, index) => `${20 + (index / Math.max(1, horizon)) * 180},${70 - (value / maxAbs) * 55}`).join(" ");
                      return (
                        <figure key={path.response_variable} className="border border-[var(--line)] p-3">
                          <figcaption className="text-xs font-semibold">{indicatorLabels[path.response_variable] ?? path.response_variable} 的响应</figcaption>
                          <svg viewBox="0 0 220 90" className="mt-2 w-full" role="img" aria-label={`${indicatorLabels[path.response_variable]} 对 ${indicatorLabels[path.shock_variable]} 冲击的响应路径`}>
                            <line x1={20} y1={70} x2={200} y2={70} stroke="var(--line)" strokeWidth="0.75" />
                            <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
                            <text x={20} y={86} fontSize="8" fill="var(--muted)">0</text>
                            <text x={196} y={86} fontSize="8" fill="var(--muted)" textAnchor="end">{horizon} 月</text>
                          </svg>
                          <p className="metric-number text-xs text-[var(--muted)]">期末值 {slice.at(-1)?.toFixed(4)}</p>
                        </figure>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm" role="alert">{result.irf_blocked_reason ?? "动态响应不可用。"}</p>
              )}
            </div>
          ) : null}

          {tab === "diagnostics" ? (
            <div className="mt-6 grid gap-6">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">{varLabels.stationarityTable}</p>
                <div className="mt-2 overflow-x-auto"><table className="research-data-table w-full min-w-[720px] text-left text-sm"><thead><tr>{["指标", "变换", "ADF 统计量", "1% / 5% / 10% 临界值", "p 值", "滞后", "状态"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead>
                  <tbody>{result.stationarity.map((entry) => <tr key={`${entry.indicator}-${entry.transformation}`}><td className="px-3 py-2">{indicatorLabels[entry.indicator] ?? entry.indicator}</td><td className="px-3 py-2">{transformationLabels[entry.transformation]}</td><td className="metric-number px-3 py-2">{Number.isFinite(entry.adf.statistic) ? entry.adf.statistic.toFixed(3) : "—"}</td><td className="metric-number px-3 py-2">{entry.adf.critical_values["1%"].toFixed(2)} / {entry.adf.critical_values["5%"].toFixed(2)} / {entry.adf.critical_values["10%"].toFixed(2)}</td><td className="metric-number px-3 py-2">{Number.isFinite(entry.adf.p_value) ? entry.adf.p_value.toFixed(4) : "—"}</td><td className="metric-number px-3 py-2">{entry.adf.used_lag}</td><td className="px-3 py-2">{entry.adf.status}</td></tr>)}</tbody></table></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">{varLabels.lagSelectionTable}</p>
                <div className="mt-2 overflow-x-auto"><table className="research-data-table w-full min-w-[640px] text-left text-sm"><thead><tr>{["滞后", "AIC", "BIC", "HQIC", "有效观测", "自由参数"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead>
                  <tbody>{result.lag_selection.candidates.map((candidate) => (
                    <tr key={candidate.lag} className={candidate.lag === result.selected_lag ? "font-semibold" : ""}>
                      <td className="metric-number px-3 py-2">{candidate.lag}{candidate.lag === result.selected_lag ? " ✓" : ""}</td>
                      <td className="metric-number px-3 py-2">{candidate.aic.toFixed(4)}</td>
                      <td className="metric-number px-3 py-2">{candidate.bic.toFixed(4)}</td>
                      <td className="metric-number px-3 py-2">{candidate.hqic.toFixed(4)}</td>
                      <td className="metric-number px-3 py-2">{candidate.nobs}</td>
                      <td className="metric-number px-3 py-2">{candidate.free_parameters}</td>
                    </tr>
                  ))}</tbody></table></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">残差自相关敏感性（调整 Portmanteau）</p>
                <div className="mt-2 overflow-x-auto"><table className="research-data-table w-full min-w-[640px] text-left text-sm"><thead><tr>{["VAR 滞后", "诊断视野 h", "Q", "df", "p 值", "状态"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead>
                  <tbody>{result.diagnostics.residual_autocorrelation_sensitivity.map((item) => <tr key={item.lags}><td className="metric-number px-3 py-2">{result.selected_lag}</td><td className="metric-number px-3 py-2">{item.lags}</td><td className="metric-number px-3 py-2">{Number.isFinite(item.statistic) ? item.statistic.toFixed(2) : "—"}</td><td className="metric-number px-3 py-2">{item.degrees_of_freedom}</td><td className="metric-number px-3 py-2">{Number.isFinite(item.p_value) ? item.p_value.toFixed(4) : "—"}</td><td className="px-3 py-2">{item.status === "passed" ? "通过" : item.status === "failed" ? "未通过" : "未检验"}</td></tr>)}</tbody></table></div>
                <p className="mt-2 text-xs text-[var(--muted)]">残差 LM：{result.diagnostics.residual_lm.status}。{result.diagnostics.residual_lm.note}</p>
              </div>
              <dl className="grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
                {([
                  [varLabels.stabilityCheck, `最大根模 ${result.diagnostics.stability.max_root_modulus.toFixed(4)} · ${result.diagnostics.stability.stable ? "稳定" : "不稳定"}`],
                  [varLabels.residualAutocorrelation, `Q(${result.diagnostics.residual_autocorrelation.lags}) = ${result.diagnostics.residual_autocorrelation.statistic.toFixed(2)} · p = ${result.diagnostics.residual_autocorrelation.p_value.toFixed(4)}`],
                  [varLabels.sampleCoverage, `${result.sample.effective_observations} 个有效月 · 剔除 ${result.sample.dropped_periods.length} 个月`],
                ] as Array<[string, string]>).map(([label, value]) => (
                  <div key={label} className="bg-white p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>
                ))}
              </dl>
            </div>
          ) : null}

          {tab === "inputData" ? (
            <div className="mt-6">
              <button type="button" onClick={() => setShowRaw((current) => !current)} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold">{showRaw ? actionLabels.viewTransformedData : actionLabels.viewRawData}</button>
              <div className="mt-4 grid gap-6 lg:grid-cols-3">
                {result.input_series.map((entry) => (
                  <div key={entry.indicator}>
                    <p className="text-xs font-semibold">{indicatorLabels[entry.indicator] ?? entry.indicator} · {transformationLabels[entry.transformation]}</p>
                    <div className="mt-2 max-h-[320px] overflow-y-auto border border-[var(--line)]">
                      <table className="research-data-table w-full text-left text-xs"><thead><tr>{["月份", showRaw ? "原始值" : "变换后值"].map((header) => <th key={header} className="px-2 py-2">{header}</th>)}</tr></thead>
                        <tbody>{entry.points.map((point) => (
                          <tr key={point.period}><td className="metric-number px-2 py-1">{point.period}</td><td className="metric-number px-2 py-1">{showRaw ? (point.raw_values[0] === null ? "缺失" : point.raw_values[0].toFixed(3)) : (point.value === null ? "缺失" : point.value.toFixed(4))}</td></tr>
                        ))}</tbody></table>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">每条变换后观测可追溯到原始观测 ID（共 {result.data_trace.length} 条，见下载结果）。</p>
            </div>
          ) : null}

          {tab === "method" ? (
            <div className="mt-6 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              <p>本模型是单国月度简化式 VAR：每个方程以相同滞后结构做 OLS 估计，滞后阶数由共同有效样本上的 {result.lag_selection.criterion.toUpperCase()} 选择，稳定性按伴随矩阵特征根判定，残差自相关固定检查 h=12/18/24 的调整 Portmanteau。当前未实现多元残差 LM。</p>
              <p className="mt-3">{varLabels.noStructuralNote}</p>
              <p className="mt-3">动态响应为正交化简化式 IRF（Cholesky）：结果依赖变量排序，排序见「变量顺序」。当前版本不提供置信区间。SVAR（结构识别）与 Local Projections 保持 registry_only：Cholesky 排序不等于自动结构识别。</p>
              <p className="mt-3">正式 baseline 不会因单国 ADF 结果自动改换变量定义；探索性 fallback 的所有尝试单独记录，不能冒充 baseline。当前公开确定性规格只支持常数项。</p>
              <p className="mt-3 font-mono text-xs">engine={result.engine_version} · dataset={result.dataset_version} · platform v1.41</p>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
