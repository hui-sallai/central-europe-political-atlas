"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatWithUnit } from "@/lib/format";
import { ResearchSnapshotExport } from "@/components/ResearchSnapshotExport";
import { currentSnapshotUrl, sourceInstitution } from "@/lib/researchSnapshot";

// Side-by-side view of the headline indicators for this country and one other. Each pair uses the latest year in which
// both countries have an official value with the same unit; otherwise "—". Descriptive comparison only.
export type ComparePoint = { country: string; indicator: string; year: number; value: number | null; unit: string; source_name?: string; source_url?: string; status?: string; updated_at?: string; source_reliability?: string; cross_country_comparable?: boolean };

const INDICATORS: [string, string][] = [["gdp_current_eur", "GDP"], ["gdp_per_capita_eur", "人均 GDP"], ["real_gdp_growth", "GDP 实际增长"], ["hicp_inflation", "HICP 通胀率"], ["unemployment_rate", "失业率"], ["government_debt_gdp", "政府债务/GDP"]];

export function CountryComparePanel({ current, countries, points, mapCountries }: { current: string; countries: { slug: string; name_zh: string }[]; points: ComparePoint[]; mapCountries: string[] }) {
  const others = countries.filter((c) => c.slug !== current);
  const [other, setOther] = useState(others[0]?.slug ?? "");
  const [urlReady, setUrlReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requested = new URLSearchParams(window.location.search).get("compare");
      if (requested && countries.some((country) => country.slug === requested && requested !== current)) setOther(requested);
      setUrlReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [countries, current]);
  useEffect(() => {
    if (!urlReady) return;
    const url = new URL(window.location.href); url.searchParams.set("compare", other); window.history.replaceState(null, "", url);
  }, [other, urlReady]);
  const nameOf = (slug: string) => countries.find((c) => c.slug === slug)?.name_zh ?? slug;
  const pair = (indicator: string) => {
    const a = points.filter((p) => p.country === current && p.indicator === indicator && p.value !== null && p.cross_country_comparable !== false);
    const b = points.filter((p) => p.country === other && p.indicator === indicator && p.value !== null && p.cross_country_comparable !== false);
    const years = a.map((p) => p.year).filter((year) => b.some((q) => q.year === year && q.unit === a.find((x) => x.year === year)?.unit)).sort((x, y) => y - x);
    const year = years[0];
    return year === undefined ? null : { year, a: a.find((p) => p.year === year)!, b: b.find((p) => p.year === year)! };
  };

  return (
    <section className="editorial-panel mt-8 p-5" aria-labelledby="compare-title" data-country-compare>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="editorial-kicker">Compare</p>
          <h2 id="compare-title" className="mt-1 text-xl font-semibold">与另一国对比</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">并列展示同一指标、同一年份、同一单位的官方观测；仅作描述性比较，不构成排名或解释性结论。</p>
        </div>
        <label className="text-xs font-semibold text-[var(--muted)]">对比国家
          <select className="field-control mt-2" value={other} onChange={(event) => setOther(event.target.value)}>{others.map((c) => <option key={c.slug} value={c.slug}>{c.name_zh}</option>)}</select>
        </label>
      </div>
      <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="两国指标对比表（可横向滚动）">
        <table className="research-data-table w-full min-w-[520px] text-left text-sm">
          <thead><tr>{["指标", "年份", nameOf(current), nameOf(other)].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead>
          <tbody>{INDICATORS.map(([id, label]) => { const p = pair(id); return (
            <tr key={id}><td className="px-3 py-2 font-semibold">{label}</td><td className="metric-number px-3 py-2">{p ? p.year : "—"}</td>
              <td className="metric-number px-3 py-2">{p ? formatWithUnit(p.a.value, p.a.unit) : "—"}</td><td className="metric-number px-3 py-2">{p ? formatWithUnit(p.b.value, p.b.unit) : "—"}</td></tr>
          ); })}</tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-[var(--accent)]">
        {mapCountries.includes(current) && mapCountries.includes(other) ? <Link href={`/map?mode=comparison&countries=${current},${other}`}>在地图中比较两国区域</Link> : null}
        <Link href="/models?tab=compare">查看十国指标矩阵</Link>
        <Link href={`/countries/${other}`}>打开{nameOf(other)}档案</Link>
        <ResearchSnapshotExport create={() => ({
          title: `${nameOf(current)}与${nameOf(other)} · 描述性比较`, view_type: "country_comparison", page_path: `/countries/${current}/`, shareable_view_url: currentSnapshotUrl(`/countries/${current}/`), countries: [current, other], indicators: INDICATORS.map(([id]) => id),
          filters: { country: current, compare: other }, comparison: { reference_period: "latest_common_year_per_indicator", matching: "same_indicator_year_unit_official_observations", ranking: false }, comparability_status: "same_indicator_year_unit_per_pair",
          limitations: ["各指标使用各自最新共同年份，指标之间的参照年份可能不同；未匹配的单元格保留缺失。"],
          rows: INDICATORS.flatMap(([id]) => {
            const p = pair(id);
            return [current, other].map((country) => {
              const point = p ? country === current ? p.a : p.b : undefined;
              return { id: `${country}:${id}:${point?.year ?? "missing"}`, country, indicator: id, period: point ? String(point.year) : "", value: point?.value ?? null, unit: point?.unit ?? "", layer: "formal_observation", status: point?.status ?? "no_common_comparable_observation", cross_country_comparable: true,
                source: point?.source_url ? { institution: sourceInstitution(point.source_name ?? "", point.source_url), dataset: point.source_name ?? "", source_url: point.source_url, updated_at: point.updated_at, unit: point.unit, reliability: point.source_reliability, source_layer: "formal_observation" } : undefined };
            });
          }),
        })} />
      </div>
    </section>
  );
}
