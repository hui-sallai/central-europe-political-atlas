"use client";

import { useMemo, useState } from "react";
import { BarMeter } from "@/components/ResearchCharts";
import type { ModelCard, ModelId, ModelOutput } from "@/types/ModelOutput";

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
  const aScore = a.score ?? Number.POSITIVE_INFINITY;
  const bScore = b.score ?? Number.POSITIVE_INFINITY;
  const base = sort === "score_asc" ? aScore - bScore : bScore - aScore;
  return base || a.country.localeCompare(b.country, "zh-CN");
}

export function ModelComparisonBoard({ cards, outputs }: { cards: ModelCard[]; outputs: ModelOutput[] }) {
  const [modelId, setModelId] = useState<ModelId>(cards[0]?.model_id ?? "household_economic_pressure");
  const [sort, setSort] = useState<SortOption>("score_desc");

  const card = cards.find((item) => item.model_id === modelId) ?? cards[0];
  const rows = useMemo(() => {
    return outputs
      .filter((output) => output.model_id === modelId)
      .sort((a, b) => compareOutputs(a, b, sort));
  }, [modelId, outputs, sort]);

  const scored = rows.filter((row) => row.score !== null);
  const unscored = rows.filter((row) => row.score === null);
  const availableCount = scored.length;

  return (
    <section className="editorial-panel mt-6 p-5" aria-label="十国模型得分横向对比">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <p className="editorial-kicker">Cross-country comparison</p>
          <h2 className="mt-2 text-2xl font-semibold">模型得分横向对比</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            同一模型下十国结果并排呈现，可直接比较得分、趋势、输入完整度与置信度。得分排序不构成评级或预测。
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadJson(rows, `comparison-${modelId}.json`)}
          className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold"
        >
          导出对比结果
        </button>
      </div>

      <div className="research-tabs mt-5" role="tablist" aria-label="选择对比模型">
        {cards.map((item) => (
          <button
            key={item.model_id}
            type="button"
            role="tab"
            className="research-tab"
            aria-selected={modelId === item.model_id}
            onClick={() => setModelId(item.model_id)}
          >
            {item.name_zh}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-[var(--muted)]">{card.output_meaning}</p>
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
            className={`grid items-center gap-4 border-b border-[var(--line)] px-2 py-3 md:grid-cols-[44px_170px_1fr_92px] ${row.score === null ? "opacity-60" : ""}`}
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

      {unscored.length > 0 ? (
        <p className="mt-4 text-xs leading-6 text-[var(--muted)]">
          {availableCount} / {rows.length} 国有可比得分；其余国家因输入不足仅保留状态展示，缺失值不会被推测或补零。
        </p>
      ) : (
        <p className="mt-4 text-xs leading-6 text-[var(--muted)]">{rows.length} 国均有可比得分。排序仅描述当前输入下的相对位置。</p>
      )}
      <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{card.limitations[0]}</p>
    </section>
  );
}
