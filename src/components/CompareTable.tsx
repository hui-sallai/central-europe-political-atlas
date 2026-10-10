import { formatWithUnit } from "@/lib/format";
import { englishText } from "@/i18n/reviewedText";
import type { CompareMode, CompareResult, FreshnessPoint } from "@/lib/freshnessCore";

// Presentational two-country comparison table. The reference period of every value is always visible: one shared
// year in "latest common" mode, each country's own year in "latest available" mode, plus an explicit notice whenever
// the two periods differ. Missing values stay "—".
export type CompareTableRow = { id: string; label: string; result: CompareResult<FreshnessPoint> };

export function mixedPeriodRows(rows: readonly CompareTableRow[]): CompareTableRow[] {
  return rows.filter((row) => row.result.mode === "latest_available" && row.result.periods_differ);
}

export function CompareTable({ rows, current, other, nameOf, mode, locale }: { rows: readonly CompareTableRow[]; current: string; other: string; nameOf: (slug: string) => string; mode: CompareMode; locale: "zh-CN" | "en" }) {
  const en = locale === "en";
  const name = (slug: string) => (en ? englishText(nameOf(slug)) : nameOf(slug));
  const label = (row: CompareTableRow) => (en ? englishText(row.label) : row.label);
  const mixed = mixedPeriodRows(rows);
  const yearCell = (row: CompareTableRow) => {
    const a = row.result.cells[current]?.year ?? null, b = row.result.cells[other]?.year ?? null;
    if (a === null && b === null) return "—";
    if (a !== null && b !== null && a !== b) return `${a} / ${b}`;
    return String(a ?? b);
  };
  const valueCell = (row: CompareTableRow, slug: string) => {
    const cell = row.result.cells[slug];
    if (!cell || cell.value === null) return "—";
    const formatted = formatWithUnit(cell.value, cell.unit ?? "");
    return <>{en ? englishText(formatted) : formatted}{mode === "latest_available" ? <span className="ml-1 text-xs font-normal text-[var(--muted)]" data-cell-year={cell.year ?? ""}>({cell.year})</span> : null}</>;
  };
  return (
    <>
      <p className="mt-3 text-xs leading-5 text-[var(--muted)]" data-compare-mode-note={mode}>
        {mode === "latest_common"
          ? (en ? "Latest common year: both countries use the same year and unit for each indicator; no fallback to older years." : "最新共同年份：每个指标两国使用同一年份、同一单位；没有共同年份时不回退旧年份。")
          : (en ? "Latest available: each country shows its own most recent published year; the year is given beside every value." : "各国最新可得：每个国家显示各自最新已发布年份；每个数值旁标明年份。")}
      </p>
      {mixed.length ? (
        <p className="mt-2 border-l-2 border-[var(--accent)] pl-3 text-xs font-semibold leading-5" role="note" data-mixed-periods={mixed.map((row) => row.id).join(" ")}>
          {en ? "Different reference periods — not a same-period comparison: " : "参照年份不同，不属于同期比较："}
          {mixed.map((row) => `${label(row)} (${name(current)} ${row.result.cells[current].year}, ${name(other)} ${row.result.cells[other].year})`).join(en ? "; " : "；")}
          {en ? "." : "。"}
        </p>
      ) : null}
      <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label={en ? "Two-country indicator comparison (horizontally scrollable)" : "两国指标对比表（可横向滚动）"}>
        <table className="research-data-table w-full min-w-[520px] text-left text-sm">
          <thead><tr>{[en ? "Indicator" : "指标", en ? "Year" : "年份", name(current), name(other)].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.id} data-indicator={row.id} data-periods-differ={row.result.periods_differ ? "true" : "false"}>
              <td className="px-3 py-2 font-semibold">{label(row)}</td><td className="metric-number px-3 py-2">{yearCell(row)}</td>
              <td className="metric-number px-3 py-2">{valueCell(row, current)}</td><td className="metric-number px-3 py-2">{valueCell(row, other)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
