"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Country } from "@/types/researchData";
import type { ChinaExposureModelCard, ChinaExposureOutput } from "@/types/ChinaExposure";

const availabilityLabels = { sufficient: "可计算", partial: "部分可计算", insufficient: "不可计算" } as const;

export function ChinaExposureExplorer({ countries, outputs, card }: { countries: Country[]; outputs: ChinaExposureOutput[]; card: ChinaExposureModelCard }) {
  const [countrySlug, setCountrySlug] = useState("hungary");
  const output = useMemo(() => outputs.find((item) => item.country_slug === countrySlug) ?? outputs[0], [countrySlug, outputs]);

  return (
    <section className="mt-6 card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">China Economic Exposure / v0.81 data completion</p>
          <h2 className="mt-3 text-2xl font-semibold">中国经济暴露模型</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">先展示项目、贸易、投资和产业四个维度。只有至少三个核心维度达到充分且可比时才生成总分；当前总分不会被强行计算。</p>
        </div>
        <label className="text-sm font-semibold">
          国家
          <select value={countrySlug} onChange={(event) => setCountrySlug(event.target.value)} className="mt-2 block min-w-52 rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-normal">
            {countries.map((country) => <option key={country.slug} value={country.slug}>{country.name_zh}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <strong>总体判定：{output.overall_decision === "available" ? output.overall_score : "unavailable"}</strong>
        <span className="ml-2">充分维度 {output.sufficient_dimension_count} / 3；暴露不等于政治影响力、地缘政治风险或投资质量。</span>
        <p className="mt-2 text-xs">项目库覆盖：{output.project_database_coverage}；主要缺口：{output.priority_gaps.join(" / ") || "无"}</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {output.dimensions.map((dimension) => (
          <article key={dimension.dimension} className="rounded-2xl border border-[var(--line)] bg-white/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="font-semibold">{dimension.name_zh}</h3><p className="mt-1 text-xs text-[var(--muted)]">完整度 {dimension.data_completeness}% / 置信度 {dimension.confidence}</p></div>
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">{availabilityLabels[dimension.availability]}</span>
            </div>
            <p className="mt-4 text-3xl font-semibold text-[var(--accent)]">{dimension.score === null ? "不输出分数" : dimension.score.toFixed(1)}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{dimension.limitation_note}</p>
            <details className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3">
              <summary className="cursor-pointer text-sm font-semibold">变量与计算追踪</summary>
              <div className="mt-3 grid gap-3">
                {dimension.variables.map((item) => (
                  <div key={item.variable_id} className="rounded-xl bg-white/80 p-3 text-xs leading-5">
                    <div className="flex flex-wrap justify-between gap-2"><strong>{item.variable_id}</strong><span>{item.raw_value === null ? "缺失" : `${item.raw_value} ${item.unit}`}</span></div>
                    <p className="mt-1 text-[var(--muted)]">{item.year ?? "无统一年份"} / {item.source} / {item.source_reliability} 级 / 模型资格 {String(item.model_eligible)}</p>
                    <p className="mt-1 text-[var(--muted)]">方法：{item.calculation_method}</p>
                    {item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex font-semibold text-[var(--accent)] hover:underline">核验来源</a> : null}
                    {item.related_observation_ids[0] ? <Link href={`/data?modelObservation=${encodeURIComponent(item.related_observation_ids[0])}#model-observation-usage`} className="mt-1 ml-3 inline-flex font-semibold text-[var(--accent)] hover:underline">回查 observation</Link> : null}
                  </div>
                ))}
              </div>
            </details>
          </article>
        ))}
      </div>

      <details className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
        <summary className="cursor-pointer font-semibold">Model Card：输入、权重和边界</summary>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{card.purpose}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {card.dimensions.map((dimension) => <div key={dimension.id} className="rounded-xl bg-white/80 p-3 text-xs leading-5"><strong>{dimension.name_zh}</strong><p className="mt-1 text-[var(--muted)]">{dimension.variables.map((item) => `${item.variable_id} ${Math.round(item.weight * 100)}%`).join(" / ")}</p></div>)}
        </div>
        <p className="mt-4 text-sm leading-6"><strong>总分规则：</strong>{card.overall_rule}</p>
        <p className="mt-2 text-sm leading-6"><strong>事件规则：</strong>{card.event_policy}</p>
      </details>
    </section>
  );
}
