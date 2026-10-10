"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ResearchSnapshotExport } from "@/components/ResearchSnapshotExport";
import { currentSnapshotUrl, sourceInstitution } from "@/lib/researchSnapshot";
import { LocalizedContent } from "@/i18n/LocalizedContent";
import { useLocale } from "@/i18n/LocaleProvider";
import { englishText } from "@/i18n/reviewedText";
import { allowedSlug, countryProfileHref } from "@/lib/safeNavigation";
import { COMPARE_MODES, compareSeries, type CompareMode } from "@/lib/freshnessCore";
import { CompareTable, mixedPeriodRows } from "@/components/CompareTable";

// Side-by-side view of the headline indicators for this country and one other. Each pair uses the latest year in which
// both countries have an official value with the same unit; otherwise "—". Descriptive comparison only.
export type ComparePoint = { country: string; indicator: string; year: number; value: number | null; unit: string; source_name?: string; source_url?: string; status?: string; updated_at?: string; source_reliability?: string; cross_country_comparable?: boolean };

const INDICATORS: [string, string][] = [["gdp_current_eur", "GDP"], ["gdp_per_capita_eur", "人均 GDP"], ["real_gdp_growth", "GDP 实际增长"], ["hicp_inflation", "HICP 通胀率"], ["unemployment_rate", "失业率"], ["government_debt_gdp", "政府债务/GDP"]];

export function CountryComparePanel({ current, countries, points, mapCountries }: { current: string; countries: { slug: string; name_zh: string }[]; points: ComparePoint[]; mapCountries: string[] }) {
  const locale = useLocale();
  const others = countries.filter((c) => c.slug !== current);
  const otherSlugs = others.map((c) => c.slug);
  const [other, setOther] = useState(others[0]?.slug ?? "");
  const [mode, setMode] = useState<CompareMode>("latest_common");
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
  // One definition of "latest" (src/lib/freshnessCore.ts); the reference period of every value is explicit in both modes.
  const comparePoints = (country: string, indicator: string) => points.filter((p) => p.country === country && p.indicator === indicator).map((p) => ({ ...p, comparable: p.cross_country_comparable !== false }));
  const rows = INDICATORS.map(([id, label]) => ({ id, label, result: compareSeries({ [current]: comparePoints(current, id), [other]: comparePoints(other, id) }, mode) }));
  const mixed = mixedPeriodRows(rows);

  return (
    <LocalizedContent><section className="editorial-panel mt-8 p-5" aria-labelledby="compare-title" data-country-compare>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="editorial-kicker">Compare</p>
          <h2 id="compare-title" className="mt-1 text-xl font-semibold">与另一国对比</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">并列展示同一指标、同一年份、同一单位的官方观测；仅作描述性比较，不构成排名或解释性结论。</p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={locale === "en" ? "Reference period" : "参照年份口径"} data-compare-mode={mode}>
            {COMPARE_MODES.map((option) => <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${mode === option ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"}`}>{option === "latest_common" ? (locale === "en" ? "Latest common year" : "最新共同年份") : (locale === "en" ? "Latest available" : "各国最新可得")}</button>)}
          </div>
        </div>
        <label className="text-xs font-semibold text-[var(--muted)]">对比国家
          <select className="field-control mt-2" value={other} onChange={(event) => { const slug = allowedSlug(event.target.value, otherSlugs); if (slug) setOther(slug); }}>{others.map((c) => <option key={c.slug} value={c.slug}>{c.name_zh}</option>)}</select>
        </label>
      </div>
      <CompareTable rows={rows} current={current} other={other} nameOf={nameOf} mode={mode} locale={locale === "en" ? "en" : "zh-CN"} />
      <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-[var(--accent)]">
        {mapCountries.includes(current) && mapCountries.includes(other) && allowedSlug(other, otherSlugs) ? <Link href={`/map?mode=comparison&countries=${encodeURIComponent(current)},${encodeURIComponent(other)}`}>在地图中比较两国区域</Link> : null}
        <Link href="/models?tab=compare">查看十国指标矩阵</Link>
        {(() => { const href = countryProfileHref(other, otherSlugs); return href ? <Link href={href}>打开{nameOf(other)}档案</Link> : null; })()}
        <ResearchSnapshotExport create={() => ({
          title: locale === "en" ? `${englishText(nameOf(current))} and ${englishText(nameOf(other))} · Descriptive comparison` : `${nameOf(current)}与${nameOf(other)} · 描述性比较`, view_type: "country_comparison", page_path: `/countries/${current}/`, shareable_view_url: currentSnapshotUrl(`/countries/${current}/`), countries: [current, other], indicators: INDICATORS.map(([id]) => id),
          filters: { country: current, compare: other, mode }, comparison: { reference_period: mode === "latest_common" ? "latest_common_year_per_indicator" : "latest_available_year_per_country", matching: mode === "latest_common" ? "same_indicator_year_unit_official_observations" : "same_indicator_unit_official_observations_own_latest_year", ranking: false, periods_differ: mixed.length > 0, mixed_period_indicators: mixed.map((row) => row.id), reference_years: Object.fromEntries(rows.map((row) => [row.id, { [current]: row.result.cells[current].year, [other]: row.result.cells[other].year }])) }, comparability_status: mode === "latest_common" ? "same_indicator_year_unit_per_pair" : mixed.length ? "same_indicator_unit_different_reference_periods" : "same_indicator_unit_per_pair",
          limitations: [mode === "latest_common" ? "各指标使用各自最新共同年份，指标之间的参照年份可能不同；未匹配的单元格保留缺失。" : "各国最新可得口径：每个国家使用各自最新已发布年份，两国年份可能不同；年份不同的指标不属于同期比较，缺失值保留缺失。"],
          rows: rows.flatMap(({ id, result }) => {
            return [current, other].map((country) => {
              const point = result.cells[country].point ?? undefined;
              return { id: `${country}:${id}:${point?.year ?? "missing"}`, country, indicator: id, period: point ? String(point.year) : "", value: point?.value ?? null, unit: point?.unit ?? "", layer: "formal_observation", status: point?.status ?? "no_common_comparable_observation", cross_country_comparable: true,
                source: point?.source_url ? { institution: sourceInstitution(point.source_name ?? "", point.source_url), dataset: point.source_name ?? "", source_url: point.source_url, updated_at: point.updated_at, unit: point.unit, reliability: point.source_reliability, source_layer: "formal_observation" } : undefined };
            });
          }),
        })} />
      </div>
    </section></LocalizedContent>
  );
}
