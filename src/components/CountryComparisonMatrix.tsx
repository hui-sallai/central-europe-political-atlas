"use client";

import { useMemo, useState } from "react";

export type MatrixColumnMeta = {
  id: string;
  label: string;
  kind: "indicator" | "model";
  unit: string;
  comparison_year: number | null;
  eligible_country_count: number;
  total_countries: number;
  heat_enabled: boolean;
  unavailability_note: string | null;
};

export type MatrixCell = {
  value: number | null;
  year: number | null;
  comparable: boolean;
};

export type MatrixRow = {
  slug: string;
  name_zh: string;
  name: string;
  cells: Record<string, MatrixCell>;
};

export type ComparisonMatrixData = {
  columns: MatrixColumnMeta[];
  rows: MatrixRow[];
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

function downloadJson(value: unknown, fileName: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatValue(value: number, unit: string) {
  if (unit === "EUR") return `${Math.round(value).toLocaleString("zh-CN")}`;
  if (unit === "score") return value.toFixed(1);
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function unitSuffix(unit: string) {
  if (unit === "EUR") return "€";
  if (unit === "%") return "%";
  return "";
}

export function CountryComparisonMatrix({ data }: { data: ComparisonMatrixData }) {
  const [sort, setSort] = useState<SortState>(null);
  const { columns, rows } = data;

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const list = [...rows];
    list.sort((a, b) => {
      let diff: number;
      if (sort.key === "country") {
        diff = a.name_zh.localeCompare(b.name_zh, "zh-CN");
      } else {
        diff = (a.cells[sort.key]?.value ?? Number.POSITIVE_INFINITY) - (b.cells[sort.key]?.value ?? Number.POSITIVE_INFINITY);
      }
      return sort.dir === "asc" ? diff : -diff;
    });
    return list;
  }, [rows, sort]);

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
  for (const column of columns) {
    columnSeries[column.id] = rows.flatMap((row) => {
      const cell = row.cells[column.id];
      return cell && cell.value !== null && cell.comparable ? [cell.value] : [];
    });
  }

  function cellIntensity(key: string, value: number) {
    const values = columnSeries[key] ?? [];
    if (values.length < 2) return 0.3;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    if (range === 0) return 0.3;
    return (value - min) / range;
  }

  function heatStyle(column: MatrixColumnMeta, cell: MatrixCell | undefined) {
    if (!column.heat_enabled || !cell || cell.value === null || !cell.comparable) return {};
    const intensity = cellIntensity(column.id, cell.value);
    return { backgroundColor: `rgba(166, 69, 60, ${0.05 + intensity * 0.26})` };
  }

  const exportPayload = {
    comparison_metadata: columns.map((column) => ({
      column: column.id,
      label: column.label,
      kind: column.kind,
      unit: column.unit,
      comparison_year: column.comparison_year,
      eligible_country_count: column.eligible_country_count,
      excluded_countries: rows
        .filter((row) => (row.cells[column.id]?.value ?? null) === null)
        .map((row) => row.slug),
      exclusion_reason: "no valid observation at the common comparison year",
      heat_enabled: column.heat_enabled,
      unavailability_note: column.unavailability_note,
    })),
    rows: rows.map((row) => ({
      country: row.name_zh,
      country_slug: row.slug,
      values: Object.fromEntries(columns.map((column) => [column.id, row.cells[column.id]?.value ?? null])),
    })),
  };

  return (
    <section className="editorial-panel mt-6 p-5" aria-label="国家指标与模型得分对比矩阵">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <p className="editorial-kicker">Comparison matrix</p>
          <h2 className="mt-2 text-2xl font-semibold">国家 × 指标对比矩阵</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            每一列只读取同一个共同年份的数据；某国在该年没有有效观测时显示“—”，不会回退到旧年份。点击列头可排序。
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadJson(exportPayload, "country-comparison-matrix.json")}
          className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold"
        >
          导出矩阵
        </button>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="research-data-table w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr>
              <th className="px-3 py-3 align-bottom">
                <button type="button" className="font-semibold" onClick={() => toggleSort("country")}>国家{sortIndicator("country")}</button>
              </th>
              {columns.map((column) => (
                <th key={column.id} className="px-3 py-3 align-bottom">
                  <button type="button" className="font-semibold" onClick={() => toggleSort(column.id)}>
                    {column.label}{sortIndicator(column.id)}
                  </button>
                  <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
                    {column.comparison_year ?? "无共同年份"} · {column.eligible_country_count}/{column.total_countries} 国
                  </span>
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
                {columns.map((column) => {
                  const cell = row.cells[column.id];
                  return (
                    <td
                      key={column.id}
                      className="metric-number px-3 py-3"
                      style={heatStyle(column, cell)}
                      title={!cell || cell.value === null
                        ? `${column.label}：${column.comparison_year ?? "—"} 年无有效观测（不回退旧年份）`
                        : `${column.label}：${formatValue(cell.value, column.unit)} ${column.unit === "score" ? "/ 100" : column.unit}（${cell.year}）`}
                    >
                      {!cell || cell.value === null ? (
                        <span className="text-[var(--muted)]">—</span>
                      ) : (
                        <>
                          {formatValue(cell.value, column.unit)}
                          <span className="ml-1 text-xs font-normal text-[var(--muted)]">{unitSuffix(column.unit)}</span>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {columns.some((column) => !column.heat_enabled) ? (
        <p className="mt-4 text-xs leading-6 text-[var(--warning)]">
          部分列未能建立同年、同单位、同定义的比较基础（comparison unavailable），这些列仅以普通数值展示，不着色。
        </p>
      ) : null}
      <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
        单元格颜色深浅仅表示该列在同一共同年份、同一单位与同一定义下的相对位置（深 = 该列中数值高），不构成绝对评价、风险判断或预测。“—” 表示该国在共同年份没有有效观测，缺失值不会被推测或补零。
      </p>
    </section>
  );
}
