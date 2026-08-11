"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Country } from "@/types/Country";
import type { ModelCard, ModelOutput } from "@/types/ModelOutput";

const trendLabels = {
  rising: "上升",
  falling: "下降",
  stable: "基本稳定",
  not_available: "无法判断",
} as const;

const availabilityLabels = {
  sufficient: "可计算",
  partial: "部分可计算",
  insufficient: "不可计算",
} as const;

function ScorePanel({ output }: { output: ModelOutput }) {
  if (output.score === null) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-muted)] p-5">
        <p className="text-sm font-semibold">不输出精确分数</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          当前只有 {output.data_completeness}% 的启用输入满足来源、数值和状态要求。缺失值不会被零值或推测值替代。
        </p>
        {output.missing_indicator_ids.length > 0 ? <p className="mt-3 font-mono text-xs text-[var(--muted)]">缺失：{output.missing_indicator_ids.join(" / ")}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/75 p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[var(--muted)]">透明压力分数</p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-[var(--accent)]">{output.score.toFixed(1)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">0–100 / 输入年份 {output.input_year}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">趋势：{trendLabels[output.direction]}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">较上年 {output.trend_change === null ? "不可比" : `${output.trend_change > 0 ? "+" : ""}${output.trend_change.toFixed(1)} 分`}</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]" aria-label={`分数 ${output.score.toFixed(1)}`}>
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${output.score}%` }} />
      </div>
    </div>
  );
}

export function ModelExplorer({ countries, cards, outputs }: { countries: Country[]; cards: ModelCard[]; outputs: ModelOutput[] }) {
  const [countrySlug, setCountrySlug] = useState("poland");
  const [modelId, setModelId] = useState<ModelCard["model_id"]>("household_economic_pressure");
  const card = cards.find((candidate) => candidate.model_id === modelId) ?? cards[0];
  const output = useMemo(
    () => outputs.find((candidate) => candidate.country_slug === countrySlug && candidate.model_id === modelId),
    [countrySlug, modelId, outputs],
  );

  if (!card || !output) return null;

  return (
    <div className="mt-6 grid gap-5">
      <section className="card p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <label htmlFor="model-country" className="text-sm font-semibold">
            国家
            <select id="model-country" value={countrySlug} onChange={(event) => setCountrySlug(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-normal">
              {countries.map((country) => <option key={country.slug} value={country.slug}>{country.name_zh} / {country.name}</option>)}
            </select>
          </label>
          <label htmlFor="model-kind" className="text-sm font-semibold">
            模型
            <select id="model-kind" value={modelId} onChange={(event) => setModelId(event.target.value as ModelCard["model_id"])} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-normal">
              {cards.map((item) => <option key={item.model_id} value={item.model_id}>{item.name_zh}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="card p-6">
          <p className="eyebrow">Model Output</p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">{output.country}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{card.name_zh}</p>
            </div>
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{availabilityLabels[output.availability]}</span>
          </div>
          <div className="mt-5"><ScorePanel output={output} /></div>
          {output.score !== null && output.missing_indicator_ids.length > 0 ? (
            <p className="mt-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2 font-mono text-xs text-[var(--muted)]">partial 缺失输入：{output.missing_indicator_ids.join(" / ")}</p>
          ) : null}
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {[
              ["数据完整度", `${output.data_completeness}%`],
              ["置信度", output.confidence],
              ["模型版本 / 计算日期", `${output.model_version} / ${output.calculation_date}`],
              ["解释事件", `${output.related_event_ids.length} 条，不参与加减分`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[var(--surface-muted)] px-3 py-3">
                <dt className="text-xs text-[var(--muted)]">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {output.main_drivers.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold">主要驱动</h3>
              <ul className="mt-2 grid gap-2 text-sm text-[var(--muted)]">
                {output.main_drivers.map((driver) => <li key={driver} className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2">{driver}</li>)}
              </ul>
            </div>
          ) : null}
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">{output.interpretation_boundary}</p>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Traceable Inputs</p>
          <h2 className="mt-3 text-2xl font-semibold">输入数据与贡献</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-xs text-[var(--muted)]">
                  {['指标', '原始值', '标准化', '权重', '贡献', '观测值与来源'].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {output.inputs.map((input) => (
                  <tr key={input.observation_id} className="border-b border-[var(--line)] align-top">
                    <td className="px-3 py-3 font-semibold">{input.indicator_name}</td>
                    <td className="whitespace-nowrap px-3 py-3">{input.raw_value} {input.unit}</td>
                    <td className="px-3 py-3">{input.normalized_score}</td>
                    <td className="px-3 py-3">{Math.round(input.weight * 100)}%</td>
                    <td className="px-3 py-3 font-semibold">{input.weighted_contribution}</td>
                    <td className="min-w-64 px-3 py-3 text-xs leading-5 text-[var(--muted)]">
                      <span className="block font-mono">{input.observation_id}</span>
                      <a href={input.source_url} target="_blank" rel="noreferrer" className="mt-1 block font-semibold text-[var(--accent)] hover:underline">{input.source_name} / {input.source_reliability} 级</a>
                      <Link href={`/data?modelObservation=${encodeURIComponent(input.observation_id)}#model-observation-usage`} className="mt-1 block font-semibold text-[var(--accent)] hover:underline">返回数据页查看该 observation</Link>
                    </td>
                  </tr>
                ))}
                {output.inputs.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--muted)]">没有满足模型准入条件的完整输入组合。</td></tr> : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <details className="card p-6" open>
        <summary className="cursor-pointer text-lg font-semibold">Model Card：{card.name_zh} / {card.model_version}</summary>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3 text-sm leading-6 text-[var(--muted)]">
            <p><strong className="text-[var(--foreground)]">目的：</strong>{card.purpose}</p>
            <p><strong className="text-[var(--foreground)]">计算逻辑：</strong>{card.calculation_logic}</p>
            <p><strong className="text-[var(--foreground)]">权重：</strong>{card.weight_note}</p>
            <p><strong className="text-[var(--foreground)]">输出含义：</strong>{card.output_meaning}</p>
            <p><strong className="text-[var(--foreground)]">完整度规则：</strong>{card.completeness_rule}</p>
            <p><strong className="text-[var(--foreground)]">事件规则：</strong>{card.event_policy}</p>
            <div>
              <strong className="text-[var(--foreground)]">权重版本记录：</strong>
              {card.weight_history.map((record) => <p key={record.version} className="mt-1 font-mono text-xs">{record.version} / {record.effective_date} / {record.note}</p>)}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">启用输入</h3>
            <div className="mt-3 grid gap-2">
              {card.inputs.map((input) => (
                <div key={input.indicator_id} className="rounded-xl border border-[var(--line)] bg-white/65 p-3 text-sm">
                  <div className="flex justify-between gap-4"><strong>{input.label}</strong><span>{Math.round(input.weight * 100)}%</span></div>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{input.rationale}</p>
                </div>
              ))}
            </div>
            <h3 className="mt-5 text-sm font-semibold">暂未启用输入</h3>
            <p className="mt-2 font-mono text-xs leading-6 text-[var(--muted)]">{card.reserved_inputs.join(" / ")}</p>
          </div>
        </div>
        <ul className="mt-5 grid gap-2 text-sm leading-6 text-[var(--muted)] md:grid-cols-3">
          {card.limitations.map((limitation) => <li key={limitation} className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">{limitation}</li>)}
        </ul>
      </details>
    </div>
  );
}
