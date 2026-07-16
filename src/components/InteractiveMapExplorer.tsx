"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Adm1BoundaryMap } from "@/components/Adm1BoundaryMap";
import { DataStatusBadge, SourceStatusBadge } from "@/components/DataStatusBadge";
import { getBasicIndicators } from "@/lib/basicIndicators";
import { countries, getRegion } from "@/lib/data";
import { getLatestNewsForCountry } from "@/lib/newsData";

type SideMode = "profile" | "news";

type InteractiveMapExplorerProps = {
  variant?: "home" | "full";
};

function politicalSampleStatus(country: (typeof countries)[number]) {
  if (country.parties.some((party) => party.shortName === "TBD")) {
    return {
      badge: "pending" as const,
      access: "待接入",
      label: "政治样本：待核验",
      display: "待接入 / 政治样本：待核验 / 不进入模型",
    };
  }

  return {
    badge: "manual" as const,
    access: "人工整理",
    label: "政治样本：人工整理",
    display: "政治样本：人工整理 / 不进入模型",
  };
}

export function InteractiveMapExplorer({ variant = "full" }: InteractiveMapExplorerProps) {
  const [selectedSlug, setSelectedSlug] = useState(countries[0]?.slug ?? "");
  const [selectedRegionSlug, setSelectedRegionSlug] = useState<string | undefined>();
  const [sideMode, setSideMode] = useState<SideMode>("profile");
  const selectedCountry = useMemo(() => countries.find((country) => country.slug === selectedSlug) ?? countries[0], [selectedSlug]);
  const selectedRegionResult = selectedRegionSlug ? getRegion(selectedRegionSlug) : null;
  const selectedRegion = selectedRegionResult?.country.slug === selectedCountry?.slug ? selectedRegionResult.region : null;

  if (!selectedCountry) {
    return null;
  }

  const isHome = variant === "home";
  const selectedPoliticalStatus = politicalSampleStatus(selectedCountry);
  const selectedNews = getLatestNewsForCountry(selectedCountry.slug);
  const basicIndicators = getBasicIndicators(selectedCountry.slug);
  const homeEconomicIndicators = basicIndicators.filter((indicator) => indicator.id !== "population").slice(0, 4);
  const homeProfileLine = `${selectedCountry.polityZh} / ${selectedCountry.currency} / ${selectedCountry.euMember ? "EU" : "非 EU"} / ${selectedCountry.natoMember ? "NATO" : "非 NATO"}`;

  function selectCountry(slug: string) {
    setSelectedSlug(slug);
    setSelectedRegionSlug(undefined);
  }

  function selectRegion(countrySlug: string) {
    setSelectedSlug(countrySlug);
    setSelectedRegionSlug(undefined);
  }

  return (
    <section className={`grid gap-3 ${isHome ? "home-atlas-grid lg:grid-cols-[minmax(0,1fr)_330px]" : "lg:grid-cols-[1fr_380px]"}`}>
      <div className={`card min-h-0 ${isHome ? "h-full p-2" : "p-4"}`}>
        <Adm1BoundaryMap
          compact={isHome}
          enableRegionSelection={false}
          selectedCountrySlug={selectedCountry.slug}
          selectedRegionSlug={undefined}
          onSelectCountry={selectCountry}
          onSelectRegion={selectRegion}
        />
      </div>

      <aside className={`card ${isHome ? "home-side-panel flex flex-col overflow-hidden p-3" : "overflow-auto p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)]"}`}>
        <div className={isHome ? "shrink-0 border-b border-[var(--line)] pb-2" : "sticky -top-5 z-10 -mx-5 border-b border-[var(--line)] bg-white/95 px-5 py-4 backdrop-blur"}>
          <p className="eyebrow">Current Selection</p>
          <h2 className={`${isHome ? "mt-0.5 text-lg" : "mt-2 text-2xl"} font-semibold`}>{selectedCountry.nameZh}</h2>
          <p className={`${isHome ? "text-xs" : "text-sm"} mt-0.5 text-[var(--muted)]`}>{selectedCountry.nameEn}</p>

          {isHome ? (
            <div className="country-scroll-axis mt-1.5 grid max-h-16 grid-cols-2 gap-1 overflow-y-auto pr-1">
              {countries.map((country) => {
                const isSelected = country.slug === selectedCountry.slug;
                return (
                  <button
                    key={country.slug}
                    type="button"
                    onClick={() => selectCountry(country.slug)}
                    className={`flex items-center justify-between rounded-lg border px-2 py-1 text-left text-[10px] font-semibold transition ${
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                        : "border-transparent bg-white/45 text-[var(--muted)] hover:border-[var(--line)] hover:bg-white/75 hover:text-[var(--foreground)]"
                    }`}
                    title={country.nameZh}
                  >
                    <span>{country.iso2}</span>
                    <span className="max-w-16 truncate text-[10px] font-medium opacity-70">{country.nameZh}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className={`${isHome ? "mt-2" : "mt-4"} grid grid-cols-2 gap-2`}>
            {isHome ? (
              <Link
                href={`/countries/${selectedCountry.slug}`}
                className="rounded-full border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-center text-xs font-semibold text-white transition hover:opacity-90"
              >
                国家详情 →
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setSideMode("profile")}
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  sideMode === "profile"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                国家档案
              </button>
            )}
            <button
              type="button"
              onClick={() => setSideMode("news")}
              className={`rounded-full border px-3 ${isHome ? "py-1.5 text-xs" : "py-2 text-sm"} font-semibold transition ${
                sideMode === "news"
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              新闻周报
            </button>
          </div>
        </div>

        <section className={`${isHome ? "home-side-content mt-2 min-h-0 flex-1 overflow-y-auto p-2.5" : "mt-5 p-4"} rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)]`}>
          {sideMode === "profile" ? (
            <>
              <p className="text-xs font-semibold text-[var(--muted)]">当前国家档案</p>
              <p className={`mt-1.5 text-sm leading-5 ${isHome ? "truncate text-[var(--foreground)]" : ""}`}>
                {isHome ? homeProfileLine : selectedCountry.summaryZh}
              </p>
              {!isHome && selectedRegion ? (
                <div className="mt-4 rounded-xl border border-[var(--line)] bg-white/70 p-3">
                  <p className="text-xs font-semibold text-[var(--muted)]">当前区域</p>
                  <h3 className="mt-2 text-lg font-semibold">{selectedRegion.nameZh}</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">{selectedRegion.nameEn}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {selectedRegion.typeZh}
                    {selectedRegion.capitalZh ? ` / 行政中心：${selectedRegion.capitalZh}` : ""}
                  </p>
                  <span className="mt-3 inline-flex rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                    区域档案预留
                  </span>
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <DataStatusBadge status={selectedPoliticalStatus.badge} />
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)]">{selectedPoliticalStatus.display}</span>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)]">执政结构：待核验</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/70 p-2">
                  <p className="text-xs text-[var(--muted)]">一级行政区</p>
                  <p className="mt-0.5 text-lg font-semibold">{selectedCountry.regions.length}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-2">
                  <p className="text-xs text-[var(--muted)]">货币</p>
                  <p className="mt-0.5 text-lg font-semibold">{selectedCountry.currency}</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {basicIndicators.length > 0 ? (
                  (isHome ? homeEconomicIndicators : basicIndicators.slice(0, 4)).map((indicator) => (
                    <div key={indicator.id} className="rounded-xl bg-white/70 p-2">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-[var(--muted)]">{indicator.label}</p>
                        <DataStatusBadge status={indicator.status === "official" ? "official" : "manual"} />
                      </div>
                      <p className="mt-0.5 text-sm font-semibold">{indicator.value}</p>
                      <p className="mt-0.5 text-[10px] leading-3 text-[var(--muted)]">{indicator.year}</p>
                      <p className="mt-0.5 truncate text-[10px] leading-3 text-[var(--accent)]">{indicator.source}</p>
                      <div className="mt-1">
                        <SourceStatusBadge status={indicator.status === "official" ? "official" : "manual"} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 rounded-xl bg-white/70 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">官方经济数据未接入</p>
                      <DataStatusBadge status="pending" />
                    </div>
                    <div className="mt-2">
                      <SourceStatusBadge status="pending" />
                    </div>
                    <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">主源：各国统计部门最新发布</p>
                  </div>
                )}
              </div>
              {!isHome ? <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{selectedCountry.chinaTradeNote}</p> : null}
              <Link href={`/countries/${selectedCountry.slug}`} className="mt-2 inline-flex rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white">
                {isHome ? "查看国家详情与政治样本" : "查看该国详细数据"}
              </Link>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-[var(--muted)]">新闻周报</p>
              {selectedNews ? (
                <article className="mt-2 rounded-xl bg-white/70 p-3">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <DataStatusBadge status={selectedNews.dataStatus === "sample" ? "sample" : "manual"} />
                    <SourceStatusBadge status={selectedNews.dataStatus === "sample" ? "sample" : selectedNews.sourceUrl ? "manual" : "pending"} />
                  </div>
                  <h3 className={`${isHome ? "text-base leading-6" : "text-lg leading-7"} font-semibold`}>{selectedNews.title}</h3>
                  <p className="mt-2 text-xs font-semibold text-[var(--accent)]">{selectedNews.topic}</p>
                  <p className={`mt-2 text-sm leading-5 text-[var(--muted)] ${isHome ? "compact-clamp-2" : ""}`}>{selectedNews.summary}</p>
                  {selectedNews.dataStatus === "sample" ? (
                    <p className="mt-2 text-[10px] font-semibold text-amber-800">结构样例，不进入模型。</p>
                  ) : null}
                </article>
              ) : (
                <div className="mt-3 rounded-xl bg-white/70 p-3">
                  <DataStatusBadge status="pending" />
                  <p className="mt-2 text-sm text-[var(--muted)]">本周新闻摘要未接入。</p>
                </div>
              )}
            </>
          )}
        </section>

        {sideMode === "profile" && !isHome ? (
          <section className="mt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Countries</p>
                <h3 className="mt-2 text-xl font-semibold">样板国家</h3>
              </div>
              <span className="text-xs text-[var(--muted)]">滚动选择</span>
            </div>

            <div className="mt-4 space-y-3">
              {countries.map((country) => {
                const isSelected = country.slug === selectedCountry.slug;
                const countryNews = getLatestNewsForCountry(country.slug);
                const status = politicalSampleStatus(country);

                return (
                  <button
                    key={country.slug}
                    type="button"
                    onClick={() => selectCountry(country.slug)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--line)] bg-white/60 hover:border-[var(--accent)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-[var(--muted)]">{country.nameEn}</p>
                        <h4 className="mt-0.5 text-lg font-semibold">{country.nameZh}</h4>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-[var(--muted)]">{country.regions.length} 区域</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <DataStatusBadge status={status.badge} />
                      <p className="text-xs font-semibold text-[var(--accent)]">{status.label}</p>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]">{status.access}</span>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]">不进入模型</span>
                    </div>
                    {countryNews ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{countryNews.title}</p> : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </aside>
    </section>
  );
}
