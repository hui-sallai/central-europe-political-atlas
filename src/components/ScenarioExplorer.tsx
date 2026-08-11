"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { calculateScenario } from "@/lib/scenarioFramework";
import type { Country } from "@/types/Country";
import type { Event } from "@/types/Event";
import type { ModelCard, ModelOutput } from "@/types/ModelOutput";
import type { ScenarioDefinition, ScenarioId } from "@/types/Scenario";

const confidenceLabels = {
  high: "高",
  medium: "中",
  low: "低",
  not_available: "不可评估",
} as const;

const eventTypesByScenario: Record<ScenarioId, Event["event_type"][]> = {
  inflation_resurgence: ["macro"],
  eu_funds_delay: ["EU_funds", "fiscal"],
  energy_price_shock: ["energy"],
  germany_demand_slowdown: ["industrial_policy", "regional"],
};

function formatSigned(value: number | null) {
  if (value === null) return "不可计算";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

export function ScenarioExplorer({
  countries,
  definitions,
  cards,
  outputs,
  events,
}: {
  countries: Country[];
  definitions: ScenarioDefinition[];
  cards: ModelCard[];
  outputs: ModelOutput[];
  events: Event[];
}) {
  const [countrySlug, setCountrySlug] = useState("poland");
  const [scenarioId, setScenarioId] = useState<ScenarioId>("inflation_resurgence");
  const definition = definitions.find((item) => item.scenario_id === scenarioId) ?? definitions[0]!;
  const [shockValue, setShockValue] = useState(definition.default_shock_value);
  const country = countries.find((item) => item.slug === countrySlug) ?? countries[0]!;
  const result = useMemo(
    () => calculateScenario({ definition, countrySlug, shockValue, cards, outputs }),
    [definition, countrySlug, shockValue, cards, outputs],
  );
  const relatedEvents = useMemo(() => events.filter((event) => (
    event.country_slug === countrySlug
    && event.data_status === "verified"
    && (
      event.affected_indicator.some((indicator) => definition.affected_indicators.includes(indicator))
      || eventTypesByScenario[definition.scenario_id].includes(event.event_type)
    )
  )).slice(0, 3), [countrySlug, definition, events]);

  function selectScenario(nextId: ScenarioId) {
    const nextDefinition = definitions.find((item) => item.scenario_id === nextId);
    setScenarioId(nextId);
    if (nextDefinition) setShockValue(nextDefinition.default_shock_value);
  }

  return (
    <div className="mt-6 grid gap-5">
      <section className="card p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <label htmlFor="scenario-country" className="text-sm font-semibold">
            国家
            <select id="scenario-country" value={countrySlug} onChange={(event) => setCountrySlug(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-normal">
              {countries.map((item) => <option key={item.slug} value={item.slug}>{item.name_zh} / {item.name}</option>)}
            </select>
          </label>
          <label htmlFor="scenario-kind" className="text-sm font-semibold">
            情景
            <select id="scenario-kind" value={scenarioId} onChange={(event) => selectScenario(event.target.value as ScenarioId)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-normal">
              {definitions.map((item) => <option key={item.scenario_id} value={item.scenario_id}>{item.name_zh} / {item.name}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{definition.shock_label}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">这是用户设定的假设参数，不会写回原始 observation。</p>
            </div>
            <label htmlFor="scenario-shock-number" className="text-xs font-semibold text-[var(--muted)]">
              假设值
              <span className="mt-1 flex items-center gap-2">
                <input
                  id="scenario-shock-number"
                  type="number"
                  min={definition.shock_min}
                  max={definition.shock_max}
                  step={definition.shock_step}
                  value={shockValue}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value)) setShockValue(value);
                  }}
                  className="w-28 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-right text-sm text-[var(--foreground)]"
                />
                <span>{definition.shock_unit}</span>
              </span>
            </label>
          </div>
          <input
            type="range"
            min={definition.shock_min}
            max={definition.shock_max}
            step={definition.shock_step}
            value={shockValue}
            onChange={(event) => setShockValue(Number(event.target.value))}
            className="mt-4 w-full accent-[var(--accent)]"
            aria-label={definition.shock_label}
          />
          <div className="mt-2 flex justify-between text-[10px] text-[var(--muted)]">
            <span>{definition.shock_min} {definition.shock_unit}</span>
            <span>{definition.shock_max} {definition.shock_unit}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="card p-6">
          <p className="eyebrow">Baseline / Scenario</p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">{country?.name_zh}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{definition.name_zh} → {result.model_name}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${result.status === "available" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
              {result.status === "available" ? "可计算" : "当前不可计算"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Baseline", result.baseline_score === null ? "不可用" : result.baseline_score.toFixed(1)],
              ["Scenario", result.scenario_score === null ? "不输出" : result.scenario_score.toFixed(1)],
              ["Change", formatSigned(result.score_change)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                <p className="font-mono text-xs text-[var(--muted)]">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">{value}</p>
              </div>
            ))}
          </div>

          {result.status === "unavailable" ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
              {result.unavailable_reason}
            </p>
          ) : null}

          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {[
              ["模型置信度", result.confidence === "not_available" ? "不可评估" : confidenceLabels[result.confidence]],
              ["计算日期", result.calculation_date],
              ["基线观测", `${result.input_observation_ids.length} 条`],
              ["原始数据", "未修改"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[var(--surface-muted)] px-3 py-3">
                <dt className="text-xs text-[var(--muted)]">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">{result.interpretation_boundary}</p>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Adjusted Input</p>
          <h2 className="mt-3 text-2xl font-semibold">输入调整与追踪</h2>
          {result.adjusted_input ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-xs text-[var(--muted)]">
                    {['指标', '基线', '冲击', '调整后', '标准化变化', '权重', '观测值与来源'].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--line)] align-top">
                    <td className="px-3 py-3 font-semibold">{result.adjusted_input.indicator_name}</td>
                    <td className="whitespace-nowrap px-3 py-3">{result.adjusted_input.baseline_value} {result.adjusted_input.unit}</td>
                    <td className="whitespace-nowrap px-3 py-3">{formatSigned(result.adjusted_input.shock_value)} {definition.shock_unit}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold">{result.adjusted_input.adjusted_value} {result.adjusted_input.unit}</td>
                    <td className="whitespace-nowrap px-3 py-3">{result.adjusted_input.normalized_baseline} → {result.adjusted_input.normalized_adjusted}</td>
                    <td className="px-3 py-3">{Math.round(result.adjusted_input.weight * 100)}%</td>
                    <td className="min-w-64 px-3 py-3 text-xs leading-5 text-[var(--muted)]">
                      <span className="block font-mono">{result.adjusted_input.observation_id}</span>
                      <a href={result.adjusted_input.source_url} target="_blank" rel="noreferrer" className="mt-1 block font-semibold text-[var(--accent)] hover:underline">{result.adjusted_input.source_name} / {result.adjusted_input.source_reliability} 级</a>
                      <Link href={`/data?modelObservation=${encodeURIComponent(result.adjusted_input.observation_id)}#model-observation-usage`} className="mt-1 block font-semibold text-[var(--accent)] hover:underline">返回数据页查看基线 observation</Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-muted)] p-5">
              <p className="font-semibold">没有生成调整后输入</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{definition.unavailable_reason ?? "该国缺少合格基线输入。"}</p>
              <p className="mt-3 font-mono text-xs text-[var(--muted)]">候选指标：{definition.affected_indicators.join(" / ")}</p>
            </div>
          )}
        </article>
      </section>

      <section className="card p-6">
        <p className="eyebrow">Transmission Chain</p>
        <h2 className="mt-3 text-2xl font-semibold">传导链</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {result.transmission_chain.map((step, index) => (
            <li key={step} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <p className="font-mono text-xs font-semibold text-[var(--accent)]">{index + 1}</p>
              <p className="mt-2 text-sm leading-6">{step}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{definition.description}</p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Historical Context</p>
          <h2 className="mt-3 text-2xl font-semibold">相关已核验事件</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">事件只作历史背景，不使用 intensity 调整情景分数。</p>
          <div className="mt-4 grid gap-3">
            {relatedEvents.map((event) => (
              <Link key={event.event_id} href={`/news#${event.id}`} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 hover:border-[var(--accent)]">
                <p className="text-xs text-[var(--muted)]">{event.date} / {event.event_type} / {event.source_name}</p>
                <p className="mt-2 text-sm font-semibold leading-6">{event.title}</p>
              </Link>
            ))}
            {relatedEvents.length === 0 ? <p className="rounded-2xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted)]">当前没有与该国和情景直接关联的已核验事件。</p> : null}
          </div>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Limitations</p>
          <h2 className="mt-3 text-2xl font-semibold">解释边界</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-[var(--muted)]">
            {result.limitations.map((item) => <li key={item} className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3">{item}</li>)}
            <li className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3">情景不会修改原始 observation，也不代表发生概率或时间预测。</li>
            <li className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3">事件、项目和人工强度标签不参与本轮情景分数。</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
