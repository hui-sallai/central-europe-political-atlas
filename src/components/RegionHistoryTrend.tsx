"use client";

import { useEffect, useMemo, useState } from "react";
import { ResearchTimeSeriesChart } from "@/components/ResearchTimeSeriesChart";

// Phase I: historical trend for one region, beside the current snapshot. Only years whose NUTS codes were in force
// (and with no later official break) are drawn as a trend line; back-calculated or pre-break years are shown as
// separate points and listed with their status. Descriptive only — never used for map classes or comparisons.
type RegionalRuntime = {
  status_codes: string[];
  indicators: Record<string, { unit: string; definition: string }>;
  regions: Record<string, { geo_codes: string[]; level: string }>;
  records: [string, string, number, number, number, string, number | null, number][];
};
type StoredPoint = { year: string; value: number; unit: string; region_indicator_id: string };

const indicatorLabels: [string, string][] = [["regional_population", "人口"], ["regional_gdp", "GDP"], ["regional_gdp_per_capita", "人均 GDP"], ["regional_unemployment_rate", "失业率"], ["regional_employment_rate", "就业率"], ["regional_manufacturing_share", "制造业 GVA 比重"]];
const statusLabels: Record<string, string> = { comparable_stable_code: "可比（边界代码稳定）", series_break: "官方序列断点前，不可连成趋势", backcast_boundary_revision: "边界修订前的回溯值，不可连成趋势" };

export function RegionHistoryTrend({ regionId, countryId, stored }: { regionId: string; countryId: string; stored: StoredPoint[] }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [runtime, setRuntime] = useState<{ country: string; data: RegionalRuntime } | null>(null);
  const [failedCountry, setFailedCountry] = useState<string | null>(null);
  const [indicator, setIndicator] = useState("regional_population");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${basePath}/research-data/regional-history/${countryId}.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then((payload: RegionalRuntime) => setRuntime({ country: countryId, data: payload }))
      .catch((error) => { if (!(error instanceof DOMException && error.name === "AbortError")) setFailedCountry(countryId); });
    return () => controller.abort();
  }, [basePath, countryId]);

  const data = runtime?.country === countryId ? runtime.data : null;
  const current = stored.filter((item) => item.region_indicator_id === indicator).map((item) => ({ year: Number(item.year), value: item.value, unit: item.unit })).sort((a, b) => a.year - b.year);
  const history = useMemo(() => (data?.records ?? [])
    .filter((row) => row[0] === regionId && row[1] === indicator)
    .map((row) => ({ year: row[2], value: row[3], status: data!.status_codes[row[4]], nuts: row[5], breakYear: row[6], sourceYear: row[7] }))
    .sort((a, b) => a.year - b.year), [data, indicator, regionId]);
  const comparable = history.filter((item) => item.status === "comparable_stable_code");
  const notComparable = history.filter((item) => item.status !== "comparable_stable_code");
  const unit = current[0]?.unit ?? data?.indicators[indicator]?.unit ?? "";
  const trendStart = comparable.length ? comparable[0].year : current[0]?.year;
  const breakYears = [...new Set(notComparable.map((item) => item.breakYear).filter((year): year is number => year !== null))];
  const boundaryYears = notComparable.filter((item) => item.status === "backcast_boundary_revision").map((item) => item.year);
  const available = indicatorLabels.filter(([id]) => stored.some((item) => item.region_indicator_id === id));

  return (
    <div className="mt-4 rounded-xl border border-[var(--line)] p-3" data-region-history="trend">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--muted)]">历史趋势（描述性）</p>
        <select className="field-control max-w-[12rem] py-1 text-xs" value={indicator} onChange={(event) => setIndicator(event.target.value)} aria-label="历史趋势指标">{available.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
      </div>
      {failedCountry === countryId ? <p className="mt-3 text-xs text-[var(--muted)]">历史数据暂不可用，仅显示当前快照。</p> : !data ? <p className="mt-3 text-xs text-[var(--muted)]">正在加载历史数据…</p> : !history.length ? (
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]" data-trend-status="none">该指标暂无可核验的历史序列（缺少官方回溯值或多区域代码无法合成比率），不绘制趋势。</p>
      ) : (
        <>
          <div className="mt-2">
            <ResearchTimeSeriesChart
              title={`${indicatorLabels.find(([id]) => id === indicator)?.[1] ?? indicator} 历史趋势`}
              description="实线为当前正式快照；虚线为边界代码稳定、无后续官方断点的可比历史；灰点为不可连成趋势的回溯或断点前数值。"
              series={[
                { id: "current", label: "当前快照（2021 起）", color: "#a3432f", markers: true, points: current.map((item) => ({ x: item.year, y: item.value })) },
                ...(comparable.length ? [{ id: "comparable", label: "可比历史", color: "#52616b", dash: "6 4", points: comparable.map((item) => ({ x: item.year, y: item.value })) }] : []),
                ...(notComparable.length ? [{ id: "not-comparable", label: "不可比（仅数值，不连线）", color: "#a7b0b6", width: 0, markers: true, points: notComparable.map((item) => ({ x: item.year, y: item.value })) }] : []),
              ]}
              xKind="number" xLabel="年份" yLabel={unit} formatX={(value) => String(Math.round(value))} height={240}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]" data-trend-status={comparable.length ? "comparable" : "not-comparable"}>
            {comparable.length ? `可比趋势区间：${trendStart}–${current.at(-1)?.year ?? comparable.at(-1)!.year}（NUTS 代码自该年起未变，无后续官方断点）。` : "当前快照之前没有可与之连成趋势的历史年份。"}
            {breakYears.length ? ` 官方序列断点：${breakYears.sort((a, b) => a - b).join("、")} 年，此前数值不与之后连线。` : ""}
            {boundaryYears.length ? ` ${boundaryYears[0]}–${boundaryYears.at(-1)} 年为边界修订前的 Eurostat 回溯值，仅供参考。` : ""}
          </p>
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer font-semibold">逐年边界与来源（{history.length} 年）</summary>
            <div className="data-table-viewport mt-2" tabIndex={0} role="region" aria-label="区域历史逐年表（可滚动）">
              <table className="research-data-table w-full min-w-[520px] text-left">
                <thead><tr>{["年份", "数值", "可比性", "当年 NUTS 版本", "来源年份"].map((header) => <th key={header} className="px-2 py-2">{header}</th>)}</tr></thead>
                <tbody>{[...history].reverse().map((item) => <tr key={item.year}><td className="metric-number px-2 py-1">{item.year}</td><td className="metric-number px-2 py-1">{item.value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}</td><td className="px-2 py-1">{statusLabels[item.status] ?? item.status}</td><td className="px-2 py-1">NUTS {item.nuts}</td><td className="metric-number px-2 py-1">{item.sourceYear}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="mt-2 text-[var(--muted)]">数值均为 Eurostat 按 NUTS 2024 代码（{data.regions[regionId]?.geo_codes.join(" + ")}）发布的序列；本平台未合并不同 NUTS 版本，缺失年份不显示为 0。</p>
          </details>
        </>
      )}
    </div>
  );
}
