"use client";
import { SourceAttributionNote } from "@/components/SourceAttributionNote";
import { LocalizedContent } from "@/i18n/LocalizedContent";
import { useLocale } from "@/i18n/LocaleProvider";
import { englishText } from "@/i18n/reviewedText";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Country, Indicator, Observation } from "@/types/researchData";
import { getResearchPackageFilename } from "@/lib/releaseMetadata";
import { MacroDriverWorkbench } from "@/components/MacroDriverWorkbench";
import { ResearchTimeSeriesChart } from "@/components/ResearchTimeSeriesChart";
import { monthlyHistoryFor, useMonthlyHistory } from "@/components/useMonthlyHistory";
import { sorsSeriesLabels, useSerbiaSors } from "@/components/useSerbiaSors";
import { SerbiaSorsMonthlyPanel } from "@/components/SerbiaSorsMonthlyPanel";
import { CopyCitationButton } from "@/components/CopyCitationButton";
import { PLATFORM_NAME, PLATFORM_VERSION } from "@/lib/releaseMetadata";
import { formatNumber } from "@/lib/format";
import { ResearchSnapshotExport } from "@/components/ResearchSnapshotExport";
import { currentSnapshotUrl, sourceInstitution } from "@/lib/researchSnapshot";
import { NotebookCollect } from "./NotebookCollect";

const MOBILE_CARD_LIMIT = 120;

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function formatValue(value: number | null) {
  return formatNumber(value);
}

// high_frequency_runtime.json row layout (schema high-frequency-runtime-v1.31)
type HfRuntimeRow = [string, string, string, string, number | null, string, string, string, string, string, string, string];

const hfIndicatorLabels: Record<string, string> = {
  hicp_monthly_index: "HICP 月度指数",
  hicp_annual_rate: "HICP 年通胀率",
  unemployment_rate_monthly: "月度失业率（季调）",
  industrial_production_index: "工业生产指数（季调日历调整）",
};

// Readable axis titles for Eurostat unit codes in the high-frequency runtime (codes stay in the table and CSV).
const hfUnitLabels: Record<string, string> = { RCH_A: "同比变化率（%）", I15: "指数（2015=100）", I21: "指数（2021=100）", PC_ACT: "占劳动力比例（%）" };

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function HighFrequencyDataView({ countries }: { countries: Country[] }) {
  const locale = useLocale();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [records, setRecords] = useState<HfRuntimeRow[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [countrySlug, setCountrySlug] = useState("hungary");
  const [indicator, setIndicator] = useState("hicp_annual_rate");
  const [yearFrom, setYearFrom] = useState("all");
  const [yearTo, setYearTo] = useState("all");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [includeHistory, setIncludeHistory] = useState(true);
  const monthlyHistory = useMonthlyHistory(basePath);
  const [urlReady, setUrlReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (countries.some((item) => item.slug === params.get("country"))) setCountrySlug(params.get("country")!);
      if (params.get("indicator")! in hfIndicatorLabels) setIndicator(params.get("indicator")!);
      if (/^\d{4}$/.test(params.get("from") ?? "")) setYearFrom(params.get("from")!);
      if (/^\d{4}$/.test(params.get("to") ?? "")) setYearTo(params.get("to")!);
      if (params.get("sort") === "asc") setSortDirection("asc");
      if (params.get("history") === "0") setIncludeHistory(false);
      setUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [countries]);
  useEffect(() => {
    if (!urlReady) return;
    const url = new URL(window.location.href);
    const sorsSeries = url.searchParams.get("sors_series");
    url.search = new URLSearchParams({ tab: "high_frequency", country: countrySlug, indicator, from: yearFrom, to: yearTo, sort: sortDirection, history: includeHistory ? "1" : "0" }).toString();
    if (sorsSeries && countrySlug === "serbia") url.searchParams.set("sors_series", sorsSeries);
    window.history.replaceState(null, "", url);
  }, [urlReady, countrySlug, indicator, yearFrom, yearTo, sortDirection, includeHistory]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${basePath}/research-data/high_frequency_runtime.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then((payload: { records: HfRuntimeRow[] }) => { setRecords(payload.records); setLoadState("ready"); })
      .catch((loadError) => { if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setLoadState("error"); });
    return () => controller.abort();
  }, [basePath]);

  const countryMap = useMemo(() => new Map(countries.map((item) => [item.slug, item])), [countries]);
  const formalSeries = useMemo(() => records.filter((row) => row[1] === countrySlug && row[3] === indicator), [records, countrySlug, indicator]);
  // Phase H descriptive history (ids start with "hist:"); shaped like runtime rows so filters, sort and CSV apply alike.
  const historySeries = useMemo(() => {
    const template = formalSeries.find((row) => row[4] !== null);
    return monthlyHistoryFor(monthlyHistory.data, indicator, countrySlug).map((point): HfRuntimeRow => [`hist:monthly:${countrySlug}:${indicator}:${point.period}`, countrySlug, point.period, indicator, point.value, "", point.source.unit, template?.[7] ?? "", template?.[8] ?? "", "", point.source.source, "历史描述性"]);
  }, [countrySlug, formalSeries, indicator, monthlyHistory.data]);
  const series = useMemo(() => includeHistory ? [...historySeries, ...formalSeries] : formalSeries, [formalSeries, historySeries, includeHistory]);
  const isHistory = (row: HfRuntimeRow) => row[0].startsWith("hist:");
  const years = useMemo(() => [...new Set(series.map((row) => Number(row[2].slice(0, 4))))].sort((a, b) => a - b), [series]);
  const rows = useMemo(() => series
    .filter((row) => row[4] !== null && (yearFrom === "all" || Number(row[2].slice(0, 4)) >= Number(yearFrom)) && (yearTo === "all" || Number(row[2].slice(0, 4)) <= Number(yearTo)))
    .sort((a, b) => sortDirection === "desc" ? b[2].localeCompare(a[2]) : a[2].localeCompare(b[2])), [series, sortDirection, yearFrom, yearTo]);
  const monthNumber = (period: string) => Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1;
  const monthLabel = (n: number) => `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`;
  const coverage = useMemo(() => { const c = coverageOf(series.map((row) => ({ period: monthNumber(row[2]), value: row[4] }))); return { ...c, earliest: c.earliest === null ? null : monthLabel(c.earliest), latest: c.latest === null ? null : monthLabel(c.latest), missing: c.missing.map(monthLabel) }; }, [series]);
  const chartPoints = useMemo(() => [...rows].filter((row) => !isHistory(row)).sort((a, b) => a[2].localeCompare(b[2])).map((row) => ({ x: row[2], y: row[4] })), [rows]);
  const historyPoints = useMemo(() => [...rows].filter(isHistory).sort((a, b) => a[2].localeCompare(b[2])).map((row) => ({ x: row[2], y: row[4] })), [rows]);

  return (
    <LocalizedContent>{<div className="mt-5" data-snapshot-scope="high-frequency">
      <div className="grid gap-4 border-y border-[var(--line)] py-5 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold text-[var(--muted)]">国家
          <select className="field-control mt-2" value={countrySlug} onChange={(event) => setCountrySlug(event.target.value)}>{countries.map((country) => <option key={country.slug} value={country.slug}>{locale === "en" ? country.name : `${country.name_zh} / ${country.name}`}</option>)}</select>
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">指标
          <select className="field-control mt-2" value={indicator} onChange={(event) => setIndicator(event.target.value)}>{Object.entries(hfIndicatorLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-[var(--muted)]">起始年份
            <select className="field-control mt-2" value={yearFrom} onChange={(event) => setYearFrom(event.target.value)}><option value="all">最早</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">结束年份
            <select className="field-control mt-2" value={yearTo} onChange={(event) => setYearTo(event.target.value)}><option value="all">最新</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
        </div>
        <label className="text-xs font-semibold text-[var(--muted)]">排序
          <select className="field-control mt-2" value={sortDirection} onChange={(event) => setSortDirection(event.target.value as "desc" | "asc")}><option value="desc">月份：新 → 旧</option><option value="asc">月份：旧 → 新</option></select>
        </label>
      </div>

      {historySeries.length ? <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--line)] py-4 text-sm" data-history-layer="high-frequency"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={includeHistory} onChange={(event) => setIncludeHistory(event.target.checked)} /> 包含历史描述性数据（{historySeries[0][2]} – {historySeries.at(-1)![2]}）</label><span className="text-xs text-[var(--muted)]">历史段仅供描述研究，从定义一致的官方起点开始；正式高频模型基线仍为 2015 年起的冻结序列。</span></div> : monthlyHistory.state === "ready" && formalSeries.length ? <p className="border-b border-[var(--line)] py-3 text-xs text-[var(--muted)]">该国家与指标暂无安全的历史描述性回填（定义断点需方法复核）。</p> : null}
      {loadState === "ready" && series.length ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]" data-coverage-summary="high-frequency">
          <ResearchTimeSeriesChart title={`${countryMap.get(countrySlug)?.name_zh ?? countrySlug} · ${hfIndicatorLabels[indicator] ?? indicator}`} series={[{ id: "hf", label: "正式观测（2015 起，模型冻结基线）", color: "var(--chart-accent)", points: chartPoints }, ...(historyPoints.length ? [{ id: "history", label: "历史描述性（2000 起，不进入模型）", color: "var(--chart-muted)", dash: "6 4", points: historyPoints }] : [])]} xKind="month" xLabel="月份" legend={historyPoints.length > 0} yLabel={(() => { const unit = series.find((row) => row[4] !== null)?.[6] ?? ""; return hfUnitLabels[unit] ? `${hfUnitLabels[unit]} · ${unit}` : unit; })()} latestMarker height={260} />
          <dl className="editorial-panel grid content-start gap-3 p-4 text-sm">
            <div><dt className="text-xs text-[var(--muted)]">覆盖范围</dt><dd className="metric-number font-semibold">{coverage.earliest ?? "—"} → {coverage.latest ?? "—"}</dd></div>
            <div><dt className="text-xs text-[var(--muted)]">可用月份</dt><dd className="metric-number font-semibold">{coverage.available}</dd></div>
            <div><dt className="text-xs text-[var(--muted)]">缺失月份</dt><dd className="metric-number font-semibold">{coverage.missing.length ? coverage.missing.join("、") : "无"}</dd></div>
            <p className="text-xs leading-5 text-[var(--muted)]">覆盖范围含历史描述性段{includeHistory && historySeries.length ? `（${historySeries.length} 个月）` : "（未包含）"}；正式高频模型基线自 2015 年起保持冻结；缺失月份不会显示为 0。</p>
          </dl>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {loadState === "loading" ? "正在加载高频数据…" : loadState === "error" ? "高频数据不可用" : <>当前视图 <strong className="text-[var(--foreground)]">{rows.length}</strong> 条月度观测</>}
        </p>
        <div className="flex flex-wrap gap-2">
          <ResearchSnapshotExport disabled={loadState !== "ready" || (includeHistory && monthlyHistory.state === "loading")} chart create={() => ({
            title: `${countryMap.get(countrySlug)?.name_zh ?? countrySlug} · ${hfIndicatorLabels[indicator]}`, view_type: "high_frequency", page_path: "/data/",
            shareable_view_url: currentSnapshotUrl("/data/"), countries: [countrySlug], indicators: [indicator],
            filters: { country: countrySlug, indicator, from: yearFrom, to: yearTo, sort: sortDirection, history: includeHistory, eligible_rows: "non_null_visible_rows" },
            limitations: monthlyHistory.state === "error" ? ["历史数据加载失败；本快照只含当前已显示的正式观测。"] : [],
            rows: rows.map((row) => {
              const point = isHistory(row) ? monthlyHistoryFor(monthlyHistory.data, indicator, countrySlug).find((item) => item.period === row[2]) : undefined;
              const dataset = row[10].replace(/^Eurostat\s+/, "");
              const url = point?.source.source_url ?? `https://ec.europa.eu/eurostat/databrowser/view/${encodeURIComponent(dataset)}/default/table`;
              return { id: row[0], country: row[1], indicator: row[3], period: row[2], value: row[4], unit: row[6], layer: isHistory(row) ? "historical_descriptive" : "formal_observation", status: row[11], value_semantics: row[7], seasonal_adjustment: row[8],
                source: { institution: sourceInstitution(row[10], url), dataset, source_url: url, source_code: row[9], unit: row[6], definition: point?.source.definition ?? row[7], status: row[11], source_layer: isHistory(row) ? "historical_descriptive" : "formal_observation" } };
            }),
          })} />
          <button type="button" disabled={loadState !== "ready"} onClick={() => downloadCsv(
            `high-frequency-${countrySlug}-${indicator}.csv`,
            ["country", "indicator", "period", "value", "unit", "value_semantics", "seasonal_adjustment", "source", "status", "layer"],
            rows.map((row) => [row[1], row[3], row[2], row[4], row[6], row[7], row[8], row[10], row[11], isHistory(row) ? "historical_descriptive" : "formal_observation"]),
          )} className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50">下载当前高频筛选结果（CSV）</button>
          <a href={`${basePath}/research-data/${getResearchPackageFilename()}`} className="rounded-full cta-dark px-4 py-2 text-sm font-semibold">下载完整研究数据包（ZIP）</a>
        </div>
      </div>

      {loadState === "ready" ? (
        <div className="data-table-desktop data-table-viewport mt-5" tabIndex={0} role="region" aria-label="高频月度观测表（可滚动）">
          <table className="research-data-table w-full min-w-[860px] text-left text-sm">
            <thead><tr>{["国家", "指标", "月份", "数值", "单位", "来源", "状态"].map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row[0]}>
                <td className="px-3 py-2">{countryMap.get(row[1])?.name_zh ?? row[1]}</td>
                <td className="px-3 py-2 font-semibold">{hfIndicatorLabels[row[3]] ?? row[3]}</td>
                <td className="metric-number px-3 py-2">{row[2]}</td>
                <td className="metric-number px-3 py-2 font-semibold">{formatValue(row[4])}</td>
                <td className="px-3 py-2">{row[6]}</td>
                <td className="px-3 py-2">{row[10]}</td>
                <td className="px-3 py-2">{isHistory(row) ? <span className="inline-block rounded-full border border-dashed border-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]" data-layer="history">历史描述性</span> : row[11]}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}

      {loadState === "ready" && rows.length ? <SourceAttributionNote className="mt-3" sources={[...new Set(rows.map((row) => String(row[10])))]} /> : null}

      {loadState === "ready" && rows.length ? (
        <div className="data-card-mobile mt-5 grid gap-3">
          {rows.slice(0, MOBILE_CARD_LIMIT).map((row) => <article key={row[0]} className="editorial-panel p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{hfIndicatorLabels[row[3]] ?? row[3]}</h3><p className="mt-1 text-xs text-[var(--muted)]">{row[2]} · {row[6]}</p></div><p className="metric-number font-semibold text-[var(--accent)]">{formatValue(row[4])}</p></div><div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-xs"><span>{row[10]}</span><span>{row[11]}</span></div></article>)}
          {rows.length > MOBILE_CARD_LIMIT ? <p className="text-xs text-[var(--muted)]">移动端显示最近 {MOBILE_CARD_LIMIT} 条；完整 {rows.length} 条请下载 CSV。</p> : null}
        </div>
      ) : null}

      {loadState === "ready" && !rows.length ? <p className="mt-5 border-y border-[var(--line)] py-8 text-center text-sm text-[var(--muted)]">当前筛选条件没有观测值；缺失月份不会显示为 0。</p> : null}
      {countrySlug === "serbia" ? <SerbiaSorsMonthlyPanel basePath={basePath} /> : null}
    </div>}</LocalizedContent>
  );
}

// Rows shown in the annual view: formal observations (model inputs) and the Phase G descriptive history.
type AnnualRow = { id: string; country_slug: string; indicator: string; year: number; value: number | null; unit: string; status: string; source_name: string; source_url: string; reliability: string; updated_at: string; layer: "formal" | "history" | "sors"; cross_country_comparable?: boolean; source_code?: string; original_unit?: string | null; original_value?: number; comparable_within_segment?: boolean };
type HistoryRuntime = { sources: { dataset: string; url: string }[]; records: [string, string, number, number, string, string, number][] };

const historyOnlyIndicatorLabels: Record<string, string> = {
  gdp_per_capita_pps: "人均 GDP（购买力标准 PPS）",
  trade_openness: "贸易开放度（进出口 / GDP）",
  labour_productivity_growth: "实际劳动生产率增长（每就业者）",
  compensation_per_employee_eur: "人均雇员报酬（名义，欧元）",
};
const valueStatusLabels: Record<string, string> = { official: "官方", provisional: "初步", estimated: "估计", calculated: "计算", low_reliability: "低可靠性" };
const layerLabels = { formal: "正式观测", history: "历史描述性", sors: "塞尔维亚官方统计（SORS）" } as const;

/** Coverage over a contiguous period axis: missing = periods with no non-null value between first and last. */
export function coverageOf(periods: { period: number; value: number | null }[]) {
  const observed = [...new Set(periods.filter((p) => p.value !== null).map((p) => p.period))].sort((a, b) => a - b);
  if (!observed.length) return { earliest: null, latest: null, available: 0, missing: [] as number[] };
  const have = new Set(observed);
  const missing: number[] = [];
  for (let p = observed[0]; p <= observed.at(-1)!; p += 1) if (!have.has(p)) missing.push(p);
  return { earliest: observed[0], latest: observed.at(-1)!, available: observed.length, missing };
}

export function DataExplorerV11({ countries, indicators, observations }: { countries: Country[]; indicators: Indicator[]; observations: Observation[] }) {
  const locale = useLocale();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [dataset, setDataset] = useState<"annual" | "high_frequency" | "macro_drivers">("annual");
  const [countrySlug, setCountrySlug] = useState("poland");
  const [indicatorId, setIndicatorId] = useState("all");
  const [yearFrom, setYearFrom] = useState("all");
  const [yearTo, setYearTo] = useState("all");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [latestOnly, setLatestOnly] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<HistoryRuntime | null>(null);
  const [includeSors, setIncludeSors] = useState(true);
  const sors = useSerbiaSors(basePath, countrySlug === "serbia");
  const [historyState, setHistoryState] = useState<"loading" | "ready" | "error">("loading");
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "annual" || tab === "high_frequency" || tab === "macro_drivers") setDataset(tab);
      if (params.get("sort") === "asc") setSortDirection("asc");
      if (params.get("latest") === "1") setLatestOnly(true);
      if (params.get("history") === "0") setIncludeHistory(false);
      if (params.get("sors") === "0") setIncludeSors(false);
      if (params.get("q")) setSearch(params.get("q") ?? "");
      const country = params.get("country");
      const indicator = params.get("indicator");
      const selectedYear = params.get("year");
      const from = params.get("from");
      const to = params.get("to");
      if (country && countries.some((item) => item.slug === country)) setCountrySlug(country);
      if (indicator && (indicators.some((item) => item.id === indicator) || indicator in historyOnlyIndicatorLabels || indicator in sorsSeriesLabels)) setIndicatorId(indicator);
      if (selectedYear && /^\d{4}$/.test(selectedYear)) { setYearFrom(selectedYear); setYearTo(selectedYear); }
      if (from && /^\d{4}$/.test(from)) setYearFrom(from);
      if (to && /^\d{4}$/.test(to)) setYearTo(to);
      setUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [countries, indicators]);

  // Keep the URL in sync with the filters (after the initial read), so a view can be shared or bookmarked.
  useEffect(() => {
    if (!urlReady || dataset !== "annual") return;
    const params = new URLSearchParams();
    if (dataset !== "annual") params.set("tab", dataset);
    params.set("country", countrySlug);
    if (indicatorId !== "all") params.set("indicator", indicatorId);
    if (yearFrom !== "all") params.set("from", yearFrom);
    if (yearTo !== "all") params.set("to", yearTo);
    if (sortDirection === "asc") params.set("sort", "asc");
    if (latestOnly) params.set("latest", "1");
    if (!includeHistory) params.set("history", "0");
    if (!includeSors) params.set("sors", "0");
    if (search.trim()) params.set("q", search.trim());
    const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(null, "", next);
  }, [urlReady, dataset, countrySlug, indicatorId, yearFrom, yearTo, sortDirection, latestOnly, includeHistory, includeSors, search]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${basePath}/research-data/annual_history_runtime.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then((payload: HistoryRuntime) => { setHistory(payload); setHistoryState("ready"); })
      .catch((loadError) => { if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setHistoryState("error"); });
    return () => controller.abort();
  }, [basePath]);

  const indicatorMap = useMemo(() => new Map(indicators.map((item) => [item.id, item])), [indicators]);
  const indicatorName = useCallback((id: string) => indicatorMap.get(id)?.name_zh ?? historyOnlyIndicatorLabels[id] ?? sorsSeriesLabels[id] ?? id, [indicatorMap]);
  const countryRows = useMemo<AnnualRow[]>(() => {
    const formal = observations.filter((item) => item.country_slug === countrySlug).map((item): AnnualRow => ({ id: item.id, country_slug: item.country_slug, indicator: item.indicator, year: item.year, value: item.value, unit: item.unit, status: item.status, source_name: item.source_name, source_url: item.source_url, reliability: item.source_reliability, updated_at: item.updated_at, layer: "formal" }));
    const past = includeHistory && history ? history.records.filter((row) => row[0] === countrySlug).map((row): AnnualRow => ({ id: `hist:annual:${row[0]}:${row[1]}:${row[2]}`, country_slug: row[0], indicator: row[1], year: row[2], value: row[3], unit: row[4], status: valueStatusLabels[row[5]] ?? row[5], source_name: history.sources[row[6]].dataset, source_url: history.sources[row[6]].url, reliability: "A", updated_at: "", layer: "history" })) : [];
    // Serbia: SORS annual series as their own layer (Serbia-only, cross-country flag from the audited mapping).
    const official = countrySlug === "serbia" && includeSors && sors.series ? sors.series.filter((item) => item.store === "annual").flatMap((item) => item.points.map((point): AnnualRow => ({ id: `serbia:${item.key}:${point[0]}`, country_slug: "serbia", indicator: item.display_indicator, year: Number(point[0]), value: point[1], unit: item.unit ?? "", status: point[1] === null ? "欧元换算暂缓（汇率断点）" : `${item.status_legend[point[3]] ?? point[3]}${point[4] ? "" : " · 序列断点前"}`, source_name: `SORS ${item.dataset}`, source_url: item.source_url, reliability: "A", updated_at: "", layer: "sors", cross_country_comparable: point[5] === 1, source_code: item.key, original_unit: item.original_unit, original_value: point[2], comparable_within_segment: point[4] === 1 }))) : [];
    return [...formal, ...past, ...official];
  }, [countrySlug, history, includeHistory, includeSors, observations, sors.series]);
  const availableIndicatorIds = useMemo(() => [...new Set(countryRows.map((item) => item.indicator))].sort((a, b) => indicatorName(a).localeCompare(indicatorName(b), "zh-CN")), [countryRows, indicatorName]);
  const availableYears = useMemo(() => [...new Set(countryRows.map((item) => item.year))].sort((a, b) => a - b), [countryRows]);
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = countryRows
      .filter((item) => indicatorId === "all" || item.indicator === indicatorId)
      .filter((item) => (yearFrom === "all" || item.year >= Number(yearFrom)) && (yearTo === "all" || item.year <= Number(yearTo)))
      .filter((item) => !query || [indicatorMap.get(item.indicator)?.name_zh, indicatorMap.get(item.indicator)?.name, historyOnlyIndicatorLabels[item.indicator], item.indicator, item.source_name].some((value) => value?.toLowerCase().includes(query)));
    const latest = latestOnly ? new Map<string, number>() : null;
    if (latest) for (const item of filtered) if (item.value !== null) latest.set(item.indicator, Math.max(latest.get(item.indicator) ?? -Infinity, item.year));
    return filtered
      .filter((item) => !latest || latest.get(item.indicator) === item.year)
      .sort((a, b) => (sortDirection === "desc" ? b.year - a.year : a.year - b.year) || a.indicator.localeCompare(b.indicator));
  }, [countryRows, indicatorId, indicatorMap, latestOnly, search, sortDirection, yearFrom, yearTo]);
  const coverage = useMemo(() => {
    const byIndicator = new Map<string, AnnualRow[]>();
    for (const item of countryRows) { if (!byIndicator.has(item.indicator)) byIndicator.set(item.indicator, []); byIndicator.get(item.indicator)!.push(item); }
    return [...byIndicator.entries()].map(([id, items]) => ({ id, unit: items.find((item) => item.value !== null)?.unit ?? items[0].unit, ...coverageOf(items.map((item) => ({ period: item.year, value: item.value }))), pending: items.filter((item) => item.value === null).map((item) => item.year).sort((a, b) => a - b), historyYears: items.filter((item) => item.layer === "history").length, sorsYears: items.filter((item) => item.layer === "sors" && item.value !== null).length, formalYears: items.filter((item) => item.layer === "formal" && item.value !== null).length }))
      .sort((a, b) => indicatorName(a.id).localeCompare(indicatorName(b.id), "zh-CN"));
  }, [countryRows, indicatorName]);
  const selectedCoverage = indicatorId === "all" ? null : coverage.find((item) => item.id === indicatorId) ?? null;
  const chartRows = indicatorId === "all" ? [] : [...rows].sort((a, b) => a.year - b.year);

  function downloadCurrentView() {
    downloadCsv(
      `observations-${countrySlug}-${indicatorId}-${yearFrom}-${yearTo}.csv`,
      ["country", "indicator", "year", "value", "unit", "status", "layer", "source", "source_url", "updated_at"],
      rows.map((item) => [item.country_slug, item.indicator, item.year, item.value, item.unit, item.status, item.layer === "formal" ? "formal_observation" : "historical_descriptive", item.source_name, item.source_url, item.updated_at]),
    );
  }

  // Citation for one observation: source, value with unit and status, source URL, platform version, access date, view URL.
  const collectObservation = async (item: AnnualRow) => {
    const { notebookObservation } = await import("./notebookEvidence");
    const layer = item.layer === "sors" ? "serbia_sors_descriptive" : item.layer === "history" ? "historical_descriptive" : "formal_observation";
    const params = new URLSearchParams({ tab: "annual", country: item.country_slug, indicator: item.indicator, from: String(item.year), to: String(item.year), history: item.layer === "history" ? "1" : "0", sors: item.layer === "sors" ? "1" : "0" });
    const title = `${indicatorName(item.indicator)} · ${item.country_slug} · ${item.year}`;
    return { ...notebookObservation({ id: item.id, country: item.country_slug, indicator: item.indicator, period: String(item.year), value: item.value, unit: item.unit, layer, status: item.status, cross_country_comparable: item.cross_country_comparable, source: { institution: sourceInstitution(item.source_name,item.source_url), dataset: item.source_name, source_url: item.source_url, source_layer: layer, unit: item.unit, original_unit: item.original_unit ?? undefined, updated_at: item.updated_at, source_code: item.layer === "sors" ? sors.series?.find(s => s.key === item.source_code)?.original_code : item.source_code } }, currentSnapshotUrl(`${locale === "en" ? "/en" : ""}/data/`) .split("?")[0] + `?${params}`, title), labels: { "zh-CN": title, en: englishText(title) } };
  };
  const citationFor = (item: AnnualRow) => {
    const country = countries.find((c) => c.slug === item.country_slug)?.name_zh ?? item.country_slug;
    const accessed = new Date().toLocaleDateString("sv-SE"); // local calendar date, YYYY-MM-DD
    const view = typeof window === "undefined" ? "" : window.location.href;
    return `${item.source_name}. ${country}，${indicatorName(item.indicator)}（${item.indicator}），${item.year}：${displayValue(item)}${item.unit ? ` ${item.unit}` : ""}；状态：${item.status}；数据层：${layerLabels[item.layer]}。来源：${item.source_url}。经 ${PLATFORM_NAME}（${PLATFORM_VERSION.split(" ")[0]}）检索，访问日期 ${accessed}${view ? `，${view}` : ""}。`;
  };
  const displayValue = (item: AnnualRow) => item.value === null && item.layer === "sors" ? "—" : formatValue(item.value);
  const comparabilityNote = (item: AnnualRow) => item.layer === "sors" && item.cross_country_comparable === false ? <span className="mt-1 block text-[10px] text-[var(--muted)]" data-cross-country="false">不可跨国比较（仅作塞尔维亚描述）</span> : null;
  const layerBadge = (layer: AnnualRow["layer"]) => <span className={layer === "formal" ? "inline-block rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] font-semibold" : layer === "sors" ? "inline-block rounded-full border border-dotted border-[var(--chart-sors)] px-2 py-0.5 text-[10px] font-semibold text-[var(--chart-sors)]" : "inline-block rounded-full border border-dashed border-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]"} data-layer={layer}>{layerLabels[layer]}</span>;

  return (
    <LocalizedContent>{<section className="mt-7" data-snapshot-scope="annual">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="数据集选择">
        {([["annual", "年度核心数据"], ["high_frequency", "高频国内数据"], ["macro_drivers", "宏观驱动数据"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={dataset === id} onClick={() => setDataset(id)}
            className={dataset === id ? "rounded-full bg-[var(--cta-bg)] px-4 py-2 text-sm font-semibold text-[var(--cta-fg)]" : "rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"}>
            {label}
          </button>
        ))}
      </div>

      {dataset === "high_frequency" ? <HighFrequencyDataView countries={countries} /> : dataset === "macro_drivers" ? <MacroDriverWorkbench countries={countries} compact /> : (
        <>
      <div className="grid gap-4 border-y border-[var(--line)] py-5 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold text-[var(--muted)]">国家
          <select className="field-control mt-2" value={countrySlug} onChange={(event) => setCountrySlug(event.target.value)}>{countries.map((country) => <option key={country.slug} value={country.slug}>{locale === "en" ? country.name : `${country.name_zh} / ${country.name}`}</option>)}</select>
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">指标
          <select className="field-control mt-2" value={indicatorId} onChange={(event) => setIndicatorId(event.target.value)}><option value="all">全部指标</option>{availableIndicatorIds.map((id) => <option key={id} value={id}>{indicatorName(id)}</option>)}</select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-[var(--muted)]">起始年份
            <select className="field-control mt-2" value={yearFrom} onChange={(event) => setYearFrom(event.target.value)}><option value="all">最早</option>{availableYears.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">结束年份
            <select className="field-control mt-2" value={yearTo} onChange={(event) => setYearTo(event.target.value)}><option value="all">最新</option>{availableYears.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
        </div>
        <label className="text-xs font-semibold text-[var(--muted)]">搜索
          <input className="field-control mt-2" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="指标或来源" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[var(--line)] py-4 text-sm">
        <label className="flex items-center gap-2 font-semibold">排序
          <select className="field-control" value={sortDirection} onChange={(event) => setSortDirection(event.target.value as "desc" | "asc")}><option value="desc">年份：新 → 旧</option><option value="asc">年份：旧 → 新</option></select>
        </label>
        <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={latestOnly} onChange={(event) => setLatestOnly(event.target.checked)} /> 仅显示每个指标的最新值</label>
        <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={includeHistory} onChange={(event) => setIncludeHistory(event.target.checked)} /> 包含历史描述性数据（2000 年起）</label>
        {countrySlug === "serbia" ? <label className="flex items-center gap-2 font-semibold" data-sors-layer="annual"><input type="checkbox" checked={includeSors} onChange={(event) => setIncludeSors(event.target.checked)} /> 包含塞尔维亚官方统计（SORS）</label> : null}
        <span className="text-xs text-[var(--muted)]">{historyState === "loading" ? "正在加载历史数据…" : historyState === "error" ? "历史数据不可用，仅显示正式观测" : "历史描述性数据仅供描述研究，不进入任何模型、指数或情景计算。"}</span>
      </div>

      {selectedCoverage ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]" data-coverage-summary="indicator">
          <ResearchTimeSeriesChart
            title={`${countries.find((c) => c.slug === countrySlug)?.name_zh ?? countrySlug} · ${indicatorName(indicatorId)}`}
            description="年度时间序列；虚线为历史描述性数据，实线为正式观测；缺失年份不连线。"
            series={[
              { id: "history", label: `${layerLabels.history}`, color: "var(--chart-muted)", dash: "6 4", points: chartRows.filter((item) => item.layer === "history").map((item) => ({ x: item.year, y: item.value })) },
              { id: "sors", label: `${layerLabels.sors}`, color: "var(--chart-sors)", dash: "2 3", markers: true, points: chartRows.filter((item) => item.layer === "sors").map((item) => ({ x: item.year, y: item.value })) },
              { id: "formal", label: `${layerLabels.formal}`, color: "var(--chart-accent)", markers: true, points: chartRows.filter((item) => item.layer === "formal").map((item) => ({ x: item.year, y: item.value })) },
            ].filter((series) => series.points.length)}
            xKind="number" xLabel="年份" yLabel={selectedCoverage.unit} formatX={(value) => String(Math.round(value))} height={280}
          />
          <dl className="editorial-panel grid content-start gap-3 p-4 text-sm">
            <div><dt className="text-xs text-[var(--muted)]">覆盖范围</dt><dd className="metric-number font-semibold">{selectedCoverage.earliest ?? "—"} → {selectedCoverage.latest ?? "—"}</dd></div>
            <div><dt className="text-xs text-[var(--muted)]">可用年份</dt><dd className="metric-number font-semibold">{selectedCoverage.available}（正式 {selectedCoverage.formalYears} · 历史 {selectedCoverage.historyYears}{selectedCoverage.sorsYears ? ` · SORS ${selectedCoverage.sorsYears}` : ""}）</dd></div>
            <div><dt className="text-xs text-[var(--muted)]">缺失年份</dt><dd className="metric-number font-semibold">{selectedCoverage.missing.length ? selectedCoverage.missing.join("、") : "无"}</dd></div>
            {selectedCoverage.pending.length ? <div><dt className="text-xs text-[var(--muted)]">待接入</dt><dd className="metric-number font-semibold">{selectedCoverage.pending.join("、")}</dd></div> : null}
            <p className="text-xs leading-5 text-[var(--muted)]">缺失年份不会显示为 0；历史段从定义一致的最早官方年份开始，不跨定义断点拼接。</p>
          </dl>
        </div>
      ) : (
        <details className="mt-5 editorial-panel p-4" data-coverage-summary="all">
          <summary className="cursor-pointer text-sm font-semibold">覆盖概览：{coverage.length} 个指标（选择单个指标可查看完整时间序列）</summary>
          <div className="data-table-viewport mt-3" tabIndex={0} role="region" aria-label="指标覆盖概览（可滚动）">
            <table className="research-data-table w-full min-w-[640px] text-left text-sm">
              <thead><tr>{["指标", "最早 → 最新", "可用年份", "缺失年份", "数据层"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead>
              <tbody>{coverage.map((item) => <tr key={item.id}><td className="px-3 py-2"><button type="button" className="text-left font-semibold text-[var(--accent)] hover:underline" onClick={() => setIndicatorId(item.id)}>{indicatorName(item.id)}</button></td><td className="metric-number px-3 py-2">{item.earliest ?? "—"} → {item.latest ?? "—"}</td><td className="metric-number px-3 py-2">{item.available}</td><td className="metric-number px-3 py-2">{item.missing.length + item.pending.length}</td><td className="px-3 py-2 text-xs">正式 {item.formalYears} · 历史 {item.historyYears}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">当前视图 <strong className="text-[var(--foreground)]">{rows.length}</strong> 条观测值</p>
        <div className="flex flex-wrap gap-2">
          <ResearchSnapshotExport chart={indicatorId !== "all"} disabled={(includeHistory && historyState === "loading") || (countrySlug === "serbia" && includeSors && !sors.snapshotReady)} create={() => ({
            title: `${countries.find((country) => country.slug === countrySlug)?.name_zh ?? countrySlug} · 年度描述性视图`, view_type: "annual", page_path: "/data/", shareable_view_url: currentSnapshotUrl("/data/"),
            countries: [countrySlug], indicators: [...new Set(rows.map((item) => item.indicator))], filters: { country: countrySlug, indicator: indicatorId, from: yearFrom, to: yearTo, latest: latestOnly, history: includeHistory, sors: includeSors, q: search, sort: sortDirection },
            limitations: ["历史段与正式观测并列保留各自数据层；不同定义或单位不合并。", ...(historyState === "error" ? ["历史数据加载失败，仅导出当前显示的记录。"] : [])],
            rows: rows.map((item) => ({ id: item.id, country: item.country_slug, indicator: item.indicator, period: String(item.year), value: item.value, unit: item.unit, status: item.status, layer: item.layer === "sors" ? "serbia_sors_descriptive" : item.layer === "history" ? "historical_descriptive" : "formal_observation", cross_country_comparable: item.cross_country_comparable,
              original_value: item.original_value, original_unit: item.original_unit, comparable_within_segment: item.comparable_within_segment,
              source: { institution: sourceInstitution(item.source_name, item.source_url), dataset: item.source_name, source_url: item.source_url, source_code: item.layer === "sors" ? sors.series?.find((series) => series.key === item.source_code)?.original_code ?? item.source_code : item.source_code, updated_at: item.updated_at, unit: item.unit, original_unit: item.original_unit ?? undefined, reliability: item.reliability, status: item.status, source_layer: item.layer } })),
          })} />
          <button type="button" onClick={downloadCurrentView} className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">下载当前筛选结果（CSV）</button>
          <a href={`${basePath}/research-data/observations.csv`} className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold">下载全部观测数据（CSV）</a>
          <a href={`${basePath}/research-data/${getResearchPackageFilename()}`} className="rounded-full cta-dark px-4 py-2 text-sm font-semibold">下载完整研究数据包（ZIP）</a>
        </div>
      </div>

      <div className="data-table-desktop data-table-viewport mt-5" tabIndex={0} role="region" aria-label="年度观测表（可滚动）">
        <table className="research-data-table w-full min-w-[980px] text-left text-sm">
          <thead><tr>{["指标", "年份", "数值", "单位", "数据层", "来源", "状态", "更新时间", "引用"].map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead>
          <tbody>{rows.map((item) => <tr key={item.id}><td className="px-3 py-3 font-semibold">{indicatorName(item.indicator)}<span className="mt-1 block font-mono text-[10px] font-normal text-[var(--muted)]">{item.indicator}</span></td><td className="metric-number px-3 py-3">{item.year}</td><td className="metric-number px-3 py-3 font-semibold">{displayValue(item)}</td><td className="px-3 py-3">{item.unit}</td><td className="px-3 py-3">{layerBadge(item.layer)}{comparabilityNote(item)}</td><td className="px-3 py-3"><a href={item.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">{item.source_name}</a><span className="mt-1 block text-[10px] text-[var(--muted)]">{item.reliability} 级</span></td><td className="px-3 py-3">{item.status}</td><td className="metric-number px-3 py-3 text-xs">{item.updated_at || "—"}</td><td className="px-3 py-3"><CopyCitationButton text={citationFor(item)} /><NotebookCollect create={() => collectObservation(item)} /></td></tr>)}</tbody>
        </table>
      </div>

      <div className="data-card-mobile mt-5 grid gap-3">
        {rows.slice(0, MOBILE_CARD_LIMIT).map((item) => <article key={item.id} className="editorial-panel p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{indicatorName(item.indicator)}</h3><p className="mt-1 text-xs text-[var(--muted)]">{item.year} · {item.unit}</p></div><p className="metric-number font-semibold text-[var(--accent)]">{displayValue(item)}</p></div><div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-xs"><a href={item.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)]">{item.source_name}</a>{layerBadge(item.layer)}<span>{item.status}</span></div><div className="mt-2 flex justify-end"><CopyCitationButton text={citationFor(item)} /><NotebookCollect create={() => collectObservation(item)} /></div></article>)}
        {rows.length > MOBILE_CARD_LIMIT ? <p className="text-xs text-[var(--muted)]">移动端显示前 {MOBILE_CARD_LIMIT} 条；完整 {rows.length} 条请缩小年份范围或下载 CSV。</p> : null}
      </div>

      {rows.length ? <SourceAttributionNote className="mt-3" sources={[...new Set(rows.flatMap((item) => [item.source_name, item.source_url]))]} /> : null}

      {!rows.length ? <p className="mt-5 border-y border-[var(--line)] py-8 text-center text-sm text-[var(--muted)]">当前筛选条件没有观测值；缺失记录不会显示为 0。</p> : null}
        </>
      )}

    </section>}</LocalizedContent>
  );
}
