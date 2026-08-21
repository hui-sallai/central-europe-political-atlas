"use client";

import { useMemo, useState } from "react";
import { BarMeter } from "@/components/ResearchCharts";
import type { ModelComparisonResult } from "@/lib/modelComparisonGate";
import type { ModelId, ModelOutput } from "@/types/ModelOutput";

const trendLabels: Record<ModelOutput["direction"], string> = {
  rising: "↑ 上升",
  falling: "↓ 下降",
  stable: "→ 稳定",
  not_available: "不可用",
};

const availabilityLabels: Record<ModelOutput["availability"], string> = {
  sufficient: "输入充分",
  partial: "部分输入",
  insufficient: "输入不足",
};

const confidenceLabels: Record<ModelOutput["confidence"], string> = {
  high: "置信度高",
  medium: "置信度中",
  low: "置信度低",
  not_available: "无置信度",
};

const exclusionReasonLabels = {
  insufficient_inputs: "Insufficient inputs",
  unavailable: "Unavailable",
} as const;

const sortOptions = [
  { id: "score_desc", label: "得分从高到低" },
  { id: "score_asc", label: "得分从低到高" },
  { id: "completeness_desc", label: "数据完整度" },
  { id: "name", label: "按国家名称" },
] as const;

type SortOption = (typeof sortOptions)[number]["id"];

function downloadJson(value: unknown, fileName: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function compareOutputs(a: ModelOutput, b: ModelOutput, sort: SortOption) {
  if (sort === "name") return a.country.localeCompare(b.country, "zh-CN");
  if (sort === "completeness_desc") return b.data_completeness - a.data_completeness || a.country.localeCompare(b.country, "zh-CN");
  const base = sort === "score_asc" ? (a.score ?? 0) - (b.score ?? 0) : (b.score ?? 0) - (a.score ?? 0);
  return base || a.country.localeCompare(b.country, "zh-CN");
}

export function ModelComparisonBoard({ comparisons }: { comparisons: ModelComparisonResult[] }) {
  const [modelId, setModelId] = useState<ModelId>((comparisons[0]?.gate.model_id as ModelId | undefined) ?? "household_economic_pressure");
  const [sort, setSort] = useState<SortOption>("score_desc");

  const comparison = comparisons.find((item) => item.gate.model_id === modelId) ?? comparisons[0];
  const { gate } = comparison;

  const rows = useMemo(() => [...comparison.eligible].sort((a, b) => compareOutputs(a, b, sort)), [comparison.eligible, sort]);

  const exportPayload = {
    comparison_metadata: {
      comparison_year: gate.comparison_year,
      eligible_country_count: gate.eligible_country_count,
      total_countries: gate.total_countries,
      all_countries_eligible: gate.all_countries_eligible,
      definition_version: gate.definition_version,
      model_id: gate.model_id,
      model_version: gate.same_model_version,
      formula_version: gate.same_formula_version,
      weight_version: gate.same_weight_version,
    },
    eligible_results: rows,
    excluded_countries: comparison.excluded.map((entry) => ({
      country: entry.country,
      country_slug: entry.country_slug,
      exclusion_reason: entry.reason,
      own_latest_input_year: entry.own_latest_input_year,
      detail: entry.detail,
    })),
  };

  return (
    <section className="editorial-panel mt-6 p-5" aria-label="十国模型得分横向对比">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <p className="editorial-kicker">Cross-country comparison</p>
          <h2 className="mt-2 text-2xl font-semibold">{gate.all_countries_eligible ? "模型得分十国排名" : "模型得分比较可用性"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            正式比较只在同一模型版本、同一公式、同一权重与同一输入年份下进行。未通过比较门控的国家单列展示，不参与排名。
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadJson(exportPayload, `comparison-${modelId}.json`)}
          className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold"
        >
          导出对比结果
        </button>
      </div>

      <div className="research-tabs mt-5" role="tablist" aria-label="选择对比模型">
        {comparisons.map((item) => (
          <button
            key={item.gate.model_id}
            type="button"
            role="tab"
            className="research-tab"
            aria-selected={modelId === item.gate.model_id}
            onClick={() => setModelId(item.gate.model_id as ModelId)}
          >
            {item.gate.model_name_zh}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm font-semibold">
          {gate.comparison_year === null
            ? "没有可用的共同比较年份，无法生成正式对比。"
            : gate.all_countries_eligible
              ? `${gate.eligible_country_count} / ${gate.total_countries} countries comparable · common year = ${gate.comparison_year}`
              : `${gate.eligible_country_count} / ${gate.total_countries} countries comparable · common year = ${gate.comparison_year}（部分国家未通过门控，见下方单列区块）`}
        </p>
        <label className="text-xs font-semibold text-[var(--muted)]">
          排序
          <select className="field-control mt-1" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <ol className="mt-5 grid gap-2">
        {rows.map((row, index) => (
          <li
            key={row.country_slug}
            className="grid items-center gap-4 border-b border-[var(--line)] px-2 py-3 md:grid-cols-[44px_170px_1fr_92px]"
          >
            <span className="metric-number text-lg text-[var(--muted)]">{index + 1}</span>
            <div>
              <p className="text-sm font-semibold">{row.country}</p>
              <p className="text-xs text-[var(--muted)]">{row.country_slug}</p>
            </div>
            <div>
              {row.score !== null ? (
                <BarMeter value={row.score} max={100} label={`${row.country} ${row.score.toFixed(1)} / 100`} />
              ) : (
                <p className="text-xs text-[var(--muted)]">输入不足，不输出精确分数。</p>
              )}
            </div>
            <div className="text-right">
              {row.score !== null ? (
                <p className="metric-number text-lg font-semibold">{row.score.toFixed(1)}</p>
              ) : (
                <p className="metric-number text-lg text-[var(--muted)]">—</p>
              )}
              <p className="mt-1 text-xs text-[var(--muted)]">{trendLabels[row.direction]}{row.trend_change === null ? "" : ` (${row.trend_change > 0 ? "+" : ""}${row.trend_change.toFixed(1)})`}</p>
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-4">
              <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)]">{availabilityLabels[row.availability]}</span>
              <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)]">{confidenceLabels[row.confidence]}</span>
              <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)]">完整度 {row.data_completeness}%</span>
              <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)]">输入年份 {row.input_year ?? "不可用"}</span>
            </div>
          </li>
        ))}
      </ol>

      {comparison.excluded.length > 0 ? (
        <div className="mt-6 border-t border-[var(--line)] pt-5">
          <p className="text-sm font-semibold">未进入正式比较的国家（{comparison.excluded.length}）</p>
          <ul className="mt-3 grid gap-2">
            {comparison.excluded.map((entry) => (
              <li key={entry.country_slug} className="flex flex-wrap items-baseline gap-3 text-sm">
                <span className="font-semibold">{entry.country}</span>
                <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[10px] font-semibold text-[var(--warning)]">{exclusionReasonLabels[entry.reason]}</span>
                <span className="text-xs text-[var(--muted)]">{entry.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-6 text-[var(--muted)]">
        比较门控：同一 model_id / model_version（{gate.same_model_version}）/ formula_version（{gate.same_formula_version}）/ weight_version（{gate.same_weight_version}）/ input_year（{gate.comparison_year ?? "无"}）。不同年份的结果不会进入同一排名。排序不构成评级或预测。
      </p>
    </section>
  );
}
