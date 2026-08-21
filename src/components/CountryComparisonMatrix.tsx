"use client";

import { useMemo, useState } from "react";

export type MatrixIndicatorColumn = {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  year: number | null;
};

export type MatrixModelColumn = {
  model_id: string;
  label: string;
  score: number | null;
  availability: string;
};

export type MatrixRow = {
  slug: string;
  name_zh: string;
  name: string;
  indicators: MatrixIndicatorColumn[];
  models: MatrixModelColumn[];
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

function cellIntensity(values: number[], value: number) {
  if (values.length < 2) return 0.3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return 0.3;
  return (value - min) / range;
}

function formatValue(value: number, unit: string) {
  if (unit === "EUR") return `${Math.round(value).toLocaleString("zh-CN")}`;
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

export function CountryComparisonMatrix({ rows }: { rows: MatrixRow[] }) {
  const [sort, setSort] = useState<SortState>(null);

  const indicatorKeys = useMemo(() => rows[0]?.indicators.map((indicator) => indicator.id) ?? [], [rows]);
  const modelKeys = useMemo(() => rows[0]?.models.map((model) => model.model_id) ?? [], [rows]);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const list = [...rows];
    list.sort((a, b) => {
      let diff: number;
      if (sort.key === "country") {
        diff = a.name_zh.localeCompare(b.name_zh, "zh-CN");
      } else if (indicatorKeys.includes(sort.key)) {
        const aCell = a.indicators.find((indicator) => indicator.id === sort.key);
        const bCell = b.indicators.find((indicator) => indicator.id === sort.key);
        diff = (aCell?.value ?? Number.POSITIVE_INFINITY) - (bCell?.value ?? Number.POSITIVE_INFINITY);
      } else {
        const aCell = a.models.find((model) => model.model_id === sort.key);
        const bCell = b.models.find((model) => model.model_id === sort.key);
        diff = (aCell?.score ?? Number.POSITIVE_INFINITY) - (bCell?.score ?? Number.POSITIVE_INFINITY);
      }
      return sort.dir === "asc" ? diff : -diff;
    });
    return list;
  }, [rows, sort, indicatorKeys]);

  function toggleSort(key: string) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: "desc" };
      if (current.dir === "desc") return { key, dir: "asc" };
      return null;
    });
  }

  function sortIndicator(key: string) {
    return sort?.key === key ? (sort.dir === "desc" ? " ↓" : " ↑") : "";
  }

  const columnSeries: Record<string, number[]> = {};
  for (const key of indicatorKeys) {
    columnSeries[key] = rows.flatMap((row) => {
      const cell = row.indicators.find((indicator) => indicator.id === key);
      return cell?.value !== null && cell?.value !== undefined ? [cell.value] : [];
    });
  }
  for (const key of modelKeys) {
    columnSeries[key] = rows.flatMap((row) => {
      const cell = row.models.find((model) => model.model_id === key);
      return cell?.score !== null && cell?.score !== undefined ? [cell.score] : [];
    });
  }

  function heatStyle(key: string, value: number | null) {
    if (value === null) return {};
    const intensity = cellIntensity(columnSeries[key] ?? [], value);
    return { backgroundColor: `rgba(166, 69, 60, ${0.05 + intensity * 0.26})` };
  }

  return (
    <section className="editorial-panel mt-6 p-5" aria-label="国家指标与模型得分对比矩阵">
      <div className="border-b border-[var(--line)] pb-5">
        <p className="editorial-kicker">Comparison matrix</p>
        <h2 className="mt-2 text-2xl font-semibold">国家 × 指标对比矩阵</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          十国核心经济观测与四个透明模型得分放在同一张矩阵中。点击列头可排序，快速识别相对位置与缺口。
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="research-data-table w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr>
              <th className="px-3 py-3">
                <button type="button" className="font-semibold" onClick={() => toggleSort("country")}>国家{sortIndicator("country")}</button>
              </th>
              {rows[0]?.indicators.map((indicator) => (
                <th key={indicator.id} className="px-3 py-3">
                  <button type="button" className="font-semibold" onClick={() => toggleSort(indicator.id)}>
                    {indicator.label}{sortIndicator(indicator.id)}
                  </button>
                </th>
              ))}
              {rows[0]?.models.map((model) => (
                <th key={model.model_id} className="px-3 py-3">
                  <button type="button" className="font-semibold" onClick={() => toggleSort(model.model_id)}>
                    {model.label}{sortIndicator(model.model_id)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.slug}>
                <td className="px-3 py-3 font-semibold">
                  {row.name_zh}
                  <span className="block text-xs font-normal text-[var(--muted)]">{row.name}</span>
                </td>
                {row.indicators.map((indicator) => (
                  <td
                    key={indicator.id}
                    className="metric-number px-3 py-3"
                    style={heatStyle(indicator.id, indicator.value)}
                    title={indicator.value === null ? "观测待接入" : `${indicator.label}：${formatValue(indicator.value, indicator.unit)} ${indicator.unit}（${indicator.year ?? "年份未知"}）`}
                  >
                    {indicator.value === null ? <span className="text-[var(--muted)]">—</span> : formatValue(indicator.value, indicator.unit)}
                    {indicator.value !== null ? <span className="ml-1 text-xs font-normal text-[var(--muted)]">{indicator.unit === "EUR" ? "€" : indicator.unit === "%" ? "%" : ""}</span> : null}
                  </td>
                ))}
                {row.models.map((model) => (
                  <td
                    key={model.model_id}
                    className="metric-number px-3 py-3"
                    style={heatStyle(model.model_id, model.score)}
                    title={model.score === null ? `${model.label}：输入不足，不输出分数` : `${model.label}：${model.score.toFixed(1)} / 100（${model.availability}）`}
                  >
                    {model.score === null ? <span className="text-[var(--muted)]">—</span> : model.score.toFixed(1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-6 text-[var(--muted)]">
        单元格颜色深浅仅表示该列在十国之内的相对位置（深 = 该列中数值高），不构成绝对评价、风险判断或预测。“—” 表示该观测或模型输入不足，缺失值不会被推测或补零。
      </p>
    </section>
  );
}
