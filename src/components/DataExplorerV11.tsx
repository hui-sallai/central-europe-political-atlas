"use client";

import { useEffect, useMemo, useState } from "react";
import type { Country, Indicator, Observation } from "@/types/researchData";
import { getResearchPackageFilename } from "@/lib/releaseMetadata";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function formatValue(value: number | null) {
  return value === null ? "待接入" : value.toLocaleString("zh-CN", { maximumFractionDigits: 3 });
}

export function DataExplorerV11({ countries, indicators, observations }: { countries: Country[]; indicators: Indicator[]; observations: Observation[] }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [countrySlug, setCountrySlug] = useState("poland");
  const [indicatorId, setIndicatorId] = useState("all");
  const [year, setYear] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const country = params.get("country");
      const indicator = params.get("indicator");
      const selectedYear = params.get("year");
      if (country && countries.some((item) => item.slug === country)) setCountrySlug(country);
      if (indicator && indicators.some((item) => item.id === indicator)) setIndicatorId(indicator);
      if (selectedYear && /^\d{4}$/.test(selectedYear)) setYear(selectedYear);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [countries, indicators]);

  const indicatorMap = useMemo(() => new Map(indicators.map((item) => [item.id, item])), [indicators]);
  const countryObservations = useMemo(() => observations.filter((item) => item.country_slug === countrySlug), [countrySlug, observations]);
  const availableIndicatorIds = useMemo(() => [...new Set(countryObservations.map((item) => item.indicator))], [countryObservations]);
  const availableYears = useMemo(() => [...new Set(countryObservations.map((item) => item.year))].sort((a, b) => b - a), [countryObservations]);
  const rows = useMemo(() => countryObservations
    .filter((item) => indicatorId === "all" || item.indicator === indicatorId)
    .filter((item) => year === "all" || item.year === Number(year))
    .filter((item) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      const indicator = indicatorMap.get(item.indicator);
      return [indicator?.name_zh, indicator?.name, item.indicator, item.source_name].some((value) => value?.toLowerCase().includes(query));
    })
    .sort((a, b) => b.year - a.year || a.indicator.localeCompare(b.indicator)), [countryObservations, indicatorId, indicatorMap, search, year]);

  function downloadCurrentView() {
    const headers = ["country", "indicator", "year", "value", "unit", "status", "source", "source_url", "updated_at"];
    const content = [headers, ...rows.map((item) => [item.country_slug, item.indicator, item.year, item.value, item.unit, item.status, item.source_name, item.source_url, item.updated_at])]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `observations-${countrySlug}-${indicatorId}-${year}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mt-7">
      <div className="grid gap-4 border-y border-[var(--line)] py-5 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold text-[var(--muted)]">Country
          <select className="field-control mt-2" value={countrySlug} onChange={(event) => setCountrySlug(event.target.value)}>{countries.map((country) => <option key={country.slug} value={country.slug}>{country.name_zh} / {country.name}</option>)}</select>
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">Indicator
          <select className="field-control mt-2" value={indicatorId} onChange={(event) => setIndicatorId(event.target.value)}><option value="all">全部指标</option>{availableIndicatorIds.map((id) => <option key={id} value={id}>{indicatorMap.get(id)?.name_zh ?? id}</option>)}</select>
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">Year
          <select className="field-control mt-2" value={year} onChange={(event) => setYear(event.target.value)}><option value="all">全部年份</option>{availableYears.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        </label>
        <label className="text-xs font-semibold text-[var(--muted)]">Search
          <input className="field-control mt-2" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="指标或来源" />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">当前视图 <strong className="text-[var(--foreground)]">{rows.length}</strong> 条观测值</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadCurrentView} className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">Download current view</button>
          <a href={`${basePath}/research-data/observations.csv`} className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold">Download full observations</a>
          <a href={`${basePath}/research-data/${getResearchPackageFilename()}`} className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">Research data package</a>
        </div>
      </div>

      <div className="data-table-desktop wide-table-scroll mt-5">
        <table className="research-data-table w-full min-w-[920px] text-left text-sm">
          <thead><tr>{["Indicator", "Year", "Value", "Unit", "Source", "Status", "Updated"].map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead>
          <tbody>{rows.map((item) => <tr key={item.id}><td className="px-3 py-3 font-semibold">{indicatorMap.get(item.indicator)?.name_zh ?? item.indicator}<span className="mt-1 block font-mono text-[10px] font-normal text-[var(--muted)]">{item.indicator}</span></td><td className="metric-number px-3 py-3">{item.year}</td><td className="metric-number px-3 py-3 font-semibold">{formatValue(item.value)}</td><td className="px-3 py-3">{item.unit}</td><td className="px-3 py-3"><a href={item.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">{item.source_name}</a><span className="mt-1 block text-[10px] text-[var(--muted)]">{item.source_reliability} 级</span></td><td className="px-3 py-3">{item.status}</td><td className="metric-number px-3 py-3 text-xs">{item.updated_at}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="data-card-mobile mt-5 grid gap-3">
        {rows.map((item) => <article key={item.id} className="editorial-panel p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{indicatorMap.get(item.indicator)?.name_zh ?? item.indicator}</h3><p className="mt-1 text-xs text-[var(--muted)]">{item.year} · {item.unit}</p></div><p className="metric-number font-semibold text-[var(--accent)]">{formatValue(item.value)}</p></div><div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-xs"><a href={item.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)]">{item.source_name}</a><span>{item.status}</span></div></article>)}
      </div>

      {!rows.length ? <p className="mt-5 border-y border-[var(--line)] py-8 text-center text-sm text-[var(--muted)]">当前筛选条件没有观测值；缺失记录不会显示为 0。</p> : null}

    </section>
  );
}
