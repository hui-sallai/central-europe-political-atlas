"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { calculateScenario, getSensitivityShockValues } from "@/lib/scenarioFramework";
import type { Country } from "@/types/Country";
import type { ModelCard, ModelOutput } from "@/types/ModelOutput";
import type {
  ScenarioDefinition,
  ScenarioEvidenceLink,
  ScenarioId,
  ScenarioRegionalContext,
} from "@/types/Scenario";

const confidenceLabels = { high: "高", medium: "中", low: "低", not_available: "不可评估" } as const;

function signed(value: number | null) {
  return value === null ? "不可计算" : `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function secondShock(definition: ScenarioDefinition) {
  return definition.scenario_id === "germany_demand_slowdown"
    ? Math.max(definition.shock_min, definition.default_shock_value - 5)
    : Math.min(definition.shock_max, definition.default_shock_value + definition.shock_step * 2);
}

function evidenceQuality(records: ScenarioEvidenceLink[]) {
  if (!records.length) return 0;
  const points: number[] = records.map((record) => record.source_reliability === "A" ? 100 : record.source_reliability === "B" ? 80 : record.source_reliability === "C" ? 50 : 0);
  return Math.round(points.reduce((sum, point) => sum + point, 0) / points.length);
}

export function ScenarioExplorer({
  countries,
  definitions,
  cards,
  outputs,
  regionalContexts,
  evidenceLinks,
}: {
  countries: Country[];
  definitions: ScenarioDefinition[];
  cards: ModelCard[];
  outputs: ModelOutput[];
  regionalContexts: ScenarioRegionalContext[];
  evidenceLinks: ScenarioEvidenceLink[];
}) {
  const [countrySlug, setCountrySlug] = useState("poland");
  const [scenarioId, setScenarioId] = useState<ScenarioId>("inflation_resurgence");
  const definition = definitions.find((item) => item.scenario_id === scenarioId) ?? definitions[0]!;
  const [shockValue, setShockValue] = useState(definition.default_shock_value);
  const [comparisonShock, setComparisonShock] = useState(secondShock(definition));
  const [urlReady, setUrlReady] = useState(false);
  const country = countries.find((item) => item.slug === countrySlug) ?? countries[0]!;
  const regionalContext = regionalContexts.find((item) => item.country_slug === countrySlug && item.scenario_id === scenarioId);
  const evidence = evidenceLinks.filter((item) => item.country_slug === countrySlug && item.scenario_id === scenarioId);
  const contextCoverage = regionalContext?.status === "available" ? 100 : 0;
  const currentEvidenceQuality = evidenceQuality(evidence);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedCountry = params.get("country");
      const requestedScenario = params.get("scenario") as ScenarioId | null;
      const requestedShock = Number(params.get("shock"));
      const nextDefinition = definitions.find((item) => item.scenario_id === requestedScenario);
      if (requestedCountry && countries.some((item) => item.slug === requestedCountry)) setCountrySlug(requestedCountry);
      if (nextDefinition) {
        setScenarioId(nextDefinition.scenario_id);
        const nextShock = Number.isFinite(requestedShock) ? requestedShock : nextDefinition.default_shock_value;
        setShockValue(nextShock);
        setComparisonShock(secondShock(nextDefinition));
      }
      setUrlReady(true);
    });
    return () => window.clearTimeout(timer);
  }, [countries, definitions]);

  useEffect(() => {
    if (!urlReady) return;
    const url = new URL(window.location.href);
    url.searchParams.set("scenario", scenarioId);
    url.searchParams.set("country", countrySlug);
    url.searchParams.set("shock", String(shockValue));
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [countrySlug, scenarioId, shockValue, urlReady]);

  const resultA = calculateScenario({
    definition, countrySlug, shockValue, cards, outputs, regionalContextCoverage: contextCoverage, evidenceQuality: currentEvidenceQuality,
  });
  const resultB = calculateScenario({
    definition, countrySlug, shockValue: comparisonShock, cards, outputs, regionalContextCoverage: contextCoverage, evidenceQuality: currentEvidenceQuality,
  });

  const sensitivity = getSensitivityShockValues(definition).map((value) => calculateScenario({
    definition, countrySlug, shockValue: value, cards, outputs, regionalContextCoverage: contextCoverage, evidenceQuality: currentEvidenceQuality,
  }));

  const countryComparison = countries.map((item) => {
    const context = regionalContexts.find((record) => record.country_slug === item.slug && record.scenario_id === scenarioId);
    const countryEvidence = evidenceLinks.filter((record) => record.country_slug === item.slug && record.scenario_id === scenarioId);
    return {
      country: item,
      result: calculateScenario({
        definition,
        countrySlug: item.slug,
        shockValue,
        cards,
        outputs,
        regionalContextCoverage: context?.status === "available" ? 100 : 0,
        evidenceQuality: evidenceQuality(countryEvidence),
      }),
    };
  });

  function selectScenario(nextId: ScenarioId) {
    const nextDefinition = definitions.find((item) => item.scenario_id === nextId);
    if (!nextDefinition) return;
    setScenarioId(nextId);
    setShockValue(nextDefinition.default_shock_value);
    setComparisonShock(secondShock(nextDefinition));
  }

  const adjustmentRows = [{ label: "Scenario A", result: resultA }, { label: "Scenario B", result: resultB }];

  return (
    <div className="mt-6 grid gap-5">
      <section className="card p-6">
        <p className="eyebrow">Scenario Selector / Shock Controls</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label htmlFor="scenario-country" className="text-sm font-semibold">国家
            <select id="scenario-country" value={countrySlug} onChange={(event) => setCountrySlug(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-normal">
              {countries.map((item) => <option key={item.slug} value={item.slug}>{item.name_zh} / {item.name}</option>)}
            </select>
          </label>
          <label htmlFor="scenario-kind" className="text-sm font-semibold">情景
            <select id="scenario-kind" value={scenarioId} onChange={(event) => selectScenario(event.target.value as ScenarioId)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-normal">
              {definitions.map((item) => <option key={item.scenario_id} value={item.scenario_id}>{item.name_zh} / {item.name}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {[{ id: "scenario-a", label: "Scenario A", value: shockValue, setter: setShockValue }, { id: "scenario-b", label: "Scenario B", value: comparisonShock, setter: setComparisonShock }].map((control) => (
            <div key={control.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-end justify-between gap-4">
                <div><p className="font-semibold">{control.label}</p><p className="mt-1 text-xs text-[var(--muted)]">{definition.shock_label}</p></div>
                <label htmlFor={`${control.id}-number`} className="text-xs font-semibold text-[var(--muted)]">假设值
                  <span className="mt-1 flex items-center gap-2">
                    <input id={`${control.id}-number`} type="number" min={definition.shock_min} max={definition.shock_max} step={definition.shock_step} value={control.value} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value)) control.setter(value); }} className="w-24 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-right text-sm text-[var(--foreground)]" />
                    <span>{definition.shock_unit}</span>
                  </span>
                </label>
              </div>
              <input type="range" min={definition.shock_min} max={definition.shock_max} step={definition.shock_step} value={control.value} onChange={(event) => control.setter(Number(event.target.value))} className="mt-4 w-full accent-[var(--accent)]" aria-label={`${control.label} ${definition.shock_label}`} />
              <div className="mt-2 flex justify-between text-[10px] text-[var(--muted)]"><span>{definition.shock_min}</span><span>{definition.shock_max} {definition.shock_unit}</span></div>
            </div>
          ))}
        </div>
        {resultA.shock_boundary_status !== "within_range" ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">Scenario A 请求值 {resultA.requested_shock_value} 已明确截断为 {resultA.shock_value} {definition.shock_unit}；未按越界值计算。</p> : null}
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">参数被限制在 Scenario Card 公开范围内；URL 保存 scenario、country 和 Scenario A shock，便于分享。任何输入都不会写回原始 observation。</p>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="eyebrow">Baseline / Scenario Compare</p><h2 className="mt-3 text-2xl font-semibold">{country.name_zh}条件式比较</h2></div>
          <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">{resultA.status === "available" ? "可重算" : "不可计算"}</span>
        </div>
        <div className="wide-table-scroll mt-5">
          <table className="research-data-table w-full min-w-[760px] text-left text-sm">
            <thead><tr>{["结果", "冲击假设", "Baseline", "Scenario", "Change", "模型", "状态"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
            <tbody>{adjustmentRows.map(({ label, result }) => <tr key={label}><td className="px-3 py-3 font-semibold">{label}</td><td className="px-3 py-3">{result.requested_shock_value !== result.shock_value ? `${result.requested_shock_value} → ` : ""}{result.shock_value} {definition.shock_unit}</td><td className="px-3 py-3">{result.baseline_score?.toFixed(1) ?? "不可用"}</td><td className="px-3 py-3">{result.scenario_score?.toFixed(1) ?? "不输出"}</td><td className="px-3 py-3 font-semibold">{signed(result.score_change)}</td><td className="px-3 py-3">{result.model_name}</td><td className="px-3 py-3">{result.status === "available" ? result.saturation_status === "normalization_boundary_reached" ? "可计算；已到标准化边界" : "可计算" : result.unavailable_reason}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Scenario A 与 B 是两个独立假设，不合成为综合未来预测。{resultA.interpretation_boundary}</p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="card p-6">
          <p className="eyebrow">Adjusted Inputs</p><h2 className="mt-3 text-2xl font-semibold">输入调整与 observation trace</h2>
          <div className="wide-table-scroll mt-5"><table className="research-data-table w-full min-w-[820px] text-left text-sm"><thead><tr>{["情景", "指标", "基线", "冲击", "调整后", "标准化", "权重", "来源"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>
            {adjustmentRows.map(({ label, result }) => result.adjusted_input ? <tr key={label}><td className="px-3 py-3 font-semibold">{label}</td><td className="px-3 py-3">{result.adjusted_input.indicator_name}</td><td className="px-3 py-3">{result.adjusted_input.baseline_value} {result.adjusted_input.unit}</td><td className="px-3 py-3">{signed(result.adjusted_input.shock_value)} {definition.shock_unit}</td><td className="px-3 py-3 font-semibold">{result.adjusted_input.adjusted_value} {result.adjusted_input.unit}</td><td className="px-3 py-3">{result.adjusted_input.normalized_baseline} → {result.adjusted_input.normalized_adjusted}</td><td className="px-3 py-3">{Math.round(result.adjusted_input.weight * 100)}%</td><td className="px-3 py-3 text-xs"><a href={result.adjusted_input.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">{result.adjusted_input.source_name} / {result.adjusted_input.source_reliability}</a><Link href={`/data?modelObservation=${encodeURIComponent(result.adjusted_input.observation_id)}#model-observation-usage`} className="mt-1 block text-[var(--accent)] hover:underline">{result.adjusted_input.observation_id}</Link></td></tr> : <tr key={label}><td className="px-3 py-3 font-semibold">{label}</td><td colSpan={7} className="px-3 py-3 text-[var(--muted)]">{result.unavailable_reason}</td></tr>)}
          </tbody></table></div>
        </article>
        <article className="card p-6">
          <p className="eyebrow">Confidence Decomposition</p><h2 className="mt-3 text-2xl font-semibold">置信度拆分</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Object.entries({"基线完整度": resultA.confidence_decomposition.baseline_data_completeness, "模型准入": resultA.confidence_decomposition.model_eligibility, "直接传导覆盖": resultA.confidence_decomposition.direct_transmission_coverage, "区域背景覆盖": resultA.confidence_decomposition.regional_context_coverage, "项目/事件证据": resultA.confidence_decomposition.project_event_evidence_quality}).map(([label, value]) => <div key={label} className="rounded-xl bg-[var(--surface-muted)] px-3 py-3"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 font-semibold">{value}%</p></div>)}
          </div>
          <p className="mt-4 text-sm font-semibold">综合：{resultA.confidence_decomposition.aggregate}% / {confidenceLabels[resultA.confidence_decomposition.label]}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">综合值只表示这次条件分析的证据覆盖，不是发生概率或风险分数。</p>
        </article>
      </section>

      <section className="card p-6">
        <p className="eyebrow">Transmission Graph</p><h2 className="mt-3 text-2xl font-semibold">Shock → Variable → Model → Regional Context → Evidence</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {[definition.shock_label, definition.direct_variables.join(" / "), resultA.model_name, definition.contextual_variables.filter((item) => item.startsWith("regional_")).join(" / ") || "无统一地区直接输入", "Events / Projects"].map((step, index) => <li key={`${step}-${index}`} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"><p className="font-mono text-xs font-semibold text-[var(--accent)]">{index + 1}</p><p className="mt-2 text-sm leading-6 break-words">{step}</p></li>)}
        </ol>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="font-semibold">Direct shock variables</p><p className="mt-2 font-mono text-xs leading-6 text-[var(--muted)]">{definition.direct_variables.join(" / ")}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">只有 {definition.adjusted_indicator_id} 当前进入模型公式重算；其他直接变量没有合法模型输入时保持说明状态。</p></div>
          <div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="font-semibold">Contextual exposure</p><p className="mt-2 font-mono text-xs leading-6 text-[var(--muted)]">{definition.contextual_variables.join(" / ")}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">背景变量不被当作冲击，也不直接加减分。</p></div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Regional Context</p><h2 className="mt-3 text-2xl font-semibold">结构背景事实排序</h2>
          {regionalContext?.status === "available" ? <><div className="mt-4 grid gap-2">{regionalContext.values.map((item) => <div key={`${item.indicator_id}-${item.region_id}`} className="grid grid-cols-[1fr_auto] gap-4 rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-sm"><div><p className="font-semibold">{item.region_name}</p><p className="mt-1 text-xs text-[var(--muted)]">{item.indicator_name} / {item.year} / {item.admin_level}</p></div><p className="font-semibold">{item.value.toLocaleString()} {item.unit}</p></div>)}</div>{regionalContext.map_layer_id ? <Link href={`/map?country=${countrySlug}&layer=${regionalContext.map_layer_id}`} className="mt-4 inline-flex rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">View structural context map</Link> : null}</> : <p className="mt-4 rounded-xl bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--muted)]">{regionalContext?.unavailable_reason ?? "Regional context unavailable。"}</p>}
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{regionalContext?.interpretation_boundary}</p>
        </article>
        <article className="card p-6">
          <p className="eyebrow">Scenario Evidence</p><h2 className="mt-3 text-2xl font-semibold">Related Events / Projects</h2>
          <div className="mt-4 grid gap-3">{evidence.slice(0, 6).map((item) => <Link key={item.evidence_link_id} href={item.evidence_type === "event" ? `/news#${item.evidence_id}` : "/data"} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 hover:border-[var(--accent)]"><p className="text-xs text-[var(--muted)]">{item.evidence_type} / {item.relation} / {item.source_reliability} 级 / 不进入分数</p><p className="mt-2 text-sm font-semibold leading-6">{item.title}</p><p className="mt-2 text-xs text-[var(--muted)]">{item.source_name} / {item.evidence_status}</p></Link>)}{!evidence.length ? <p className="rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted)]">当前没有满足国家和指标关联条件的已核验证据。</p> : null}</div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="card p-6"><p className="eyebrow">Cross-Country Scenario Comparison</p><h2 className="mt-3 text-2xl font-semibold">同一假设下的十国 score change</h2><div className="wide-table-scroll mt-5"><table className="research-data-table w-full min-w-[620px] text-left text-sm"><thead><tr>{["国家", "状态", "Baseline", "Change", "输入年份"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{countryComparison.map(({ country: item, result }) => <tr key={item.slug}><td className="px-3 py-3 font-semibold">{item.name_zh}</td><td className="px-3 py-3">{result.status}</td><td className="px-3 py-3">{result.baseline_score?.toFixed(1) ?? "不可用"}</td><td className="px-3 py-3 font-semibold">{signed(result.score_change)}</td><td className="px-3 py-3">{result.baseline_date ?? "待接入"}</td></tr>)}</tbody></table></div><p className="mt-4 text-xs leading-5 text-[var(--muted)]">只比较同一情景、同一 shock 和同一模型定义下的分数变化，不解释为绝对未来结果排名。</p></article>
        <article className="card p-6"><p className="eyebrow">Deterministic Sensitivity</p><h2 className="mt-3 text-2xl font-semibold">冲击参数响应表</h2><div className="wide-table-scroll mt-5"><table className="research-data-table w-full min-w-[420px] text-left text-sm"><thead><tr>{["Shock", "Scenario output", "Change", "状态"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{sensitivity.map((result) => <tr key={result.shock_value}><td className="px-3 py-3 font-semibold">{result.shock_value} {definition.shock_unit}</td><td className="px-3 py-3">{result.scenario_score?.toFixed(1) ?? "不输出"}</td><td className="px-3 py-3">{signed(result.score_change)}</td><td className="px-3 py-3">{result.status}</td></tr>)}</tbody></table></div><p className="mt-4 text-xs leading-5 text-[var(--muted)]">这是固定公式下的 sensitivity，不是 forecast probability。</p></article>
      </section>

      <details className="card p-6" open>
        <summary className="cursor-pointer text-lg font-semibold">Scenario Card：{definition.name_zh}</summary>
        <div className="mt-5 grid gap-4 lg:grid-cols-2 text-sm leading-6 text-[var(--muted)]">
          <div><p><strong className="text-[var(--foreground)]">定义：</strong>{definition.description}</p><p className="mt-3"><strong className="text-[var(--foreground)]">目的：</strong>{definition.purpose}</p><p className="mt-3"><strong className="text-[var(--foreground)]">允许范围：</strong>{definition.shock_min} 至 {definition.shock_max} {definition.shock_unit}；step {definition.shock_step}；default {definition.default_shock_value}</p><p className="mt-3"><strong className="text-[var(--foreground)]">受影响模型：</strong>{definition.affected_models.join(" / ")}</p><p className="mt-3"><strong className="text-[var(--foreground)]">预设传导置信度：</strong>{confidenceLabels[definition.confidence]}</p><p className="mt-3"><strong className="text-[var(--foreground)]">传导逻辑：</strong>{definition.transmission_chain.join(" → ")}</p></div>
          <div><p><strong className="text-[var(--foreground)]">假设：</strong></p><ul className="mt-2 grid gap-2">{definition.assumptions.map((item) => <li key={item} className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">{item}</li>)}</ul></div>
        </div>
        <ul className="mt-5 grid gap-2 text-sm leading-6 text-[var(--muted)] md:grid-cols-2">{definition.limitations.map((item) => <li key={item} className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">{item}</li>)}<li className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">情景 ≠ 预测；暴露 ≠ 风险；相关 ≠ 因果；结构背景 ≠ 精确影响量。</li></ul>
        <p className="mt-4 font-mono text-xs text-[var(--muted)]">baseline={resultA.baseline_date ?? "unavailable"} / model={resultA.model_version ?? "unavailable"} / formula={resultA.formula_version} / weights={resultA.weight_version ?? "unavailable"} / boundary={resultA.shock_boundary_status} / calculation={resultA.calculation_timestamp}</p>
      </details>
    </div>
  );
}
