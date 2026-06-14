"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { countries } from "@/lib/data";
import { getEconomicSourcePolicy } from "@/lib/economicSourcePolicy";
import {
  economicMetricOptions,
  getEconomicFiveYearRows,
  getLatestEconomicRow,
  type EconomicMetricId,
  type EconomicYearRow,
} from "@/lib/economicTimeSeries";

type DataMode = "economy" | "charts";

const dataModes: { id: DataMode; label: string; description: string }[] = [
  { id: "economy", label: "经济数据", description: "近五年宏观经济表、官方统计主源与对华经贸样本。" },
  { id: "charts", label: "图表层", description: "只显示经济数据，可切换 GDP、CPI/通胀、失业率等指标。" },
];

function formatMetricValue(value: number | null, metricId: EconomicMetricId) {
  if (value === null) {
    return "待接入";
  }

  if (metricId === "population") {
    return `${value.toFixed(2)} 百万人`;
  }

  if (metricId === "gdp") {
    return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 百万欧元`;
  }

  if (metricId === "gdpPerCapita") {
    return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 0 })} 欧元`;
  }

  return `${value.toFixed(1)}%`;
}

function valueFor(row: EconomicYearRow, metricId: EconomicMetricId) {
  return row[metricId];
}

function ChartBar({ label, value, max, display }: { label: string; value: number | null; max: number; display: string }) {
  const width = value === null || max <= 0 ? 0 : Math.max(3, Math.min(100, (Math.abs(value) / max) * 100));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold">{label}</span>
        <span className="text-[var(--muted)]">{display}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/75">
        <div className={`h-full rounded-full ${value === null ? "bg-[var(--surface-muted)]" : "bg-[var(--accent)]"}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function DataCountryExplorer() {
  const [selectedSlug, setSelectedSlug] = useState(countries[0]?.slug ?? "");
  const [activeMode, setActiveMode] = useState<DataMode>("economy");
  const [activeMetric, setActiveMetric] = useState<EconomicMetricId>("gdp");
  const selectedCountry = useMemo(
    () => countries.find((country) => country.slug === selectedSlug) ?? countries[0],
    [selectedSlug],
  );

  if (!selectedCountry) {
    return null;
  }

  const economicRows = getEconomicFiveYearRows(selectedCountry.slug);
  const latestEconomicRow = getLatestEconomicRow(selectedCountry.slug);
  const economicPolicy = getEconomicSourcePolicy(selectedCountry.slug);
  const activeModeInfo = dataModes.find((mode) => mode.id === activeMode) ?? dataModes[0];
  const activeMetricInfo = economicMetricOptions.find((metric) => metric.id === activeMetric) ?? economicMetricOptions[0];
  const metricValues = economicRows.map((row) => valueFor(row, activeMetric)).filter((value): value is number => value !== null);
  const metricMax = Math.max(1, ...metricValues.map((value) => Math.abs(value)));

  return (
    <section className="mt-8 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="card h-fit p-4 lg:sticky lg:top-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Select Country</p>
            <h2 className="mt-2 text-xl font-semibold">国家选择</h2>
          </div>
          <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">{countries.length} 国</span>
        </div>

        <div className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto pr-1 country-scroll-axis">
          {countries.map((country) => {
            const isSelected = country.slug === selectedCountry.slug;
            const latest = getLatestEconomicRow(country.slug);
            return (
              <button
                key={country.slug}
                type="button"
                onClick={() => setSelectedSlug(country.slug)}
                className={`rounded-2xl border p-3 text-left transition ${
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] bg-white/55 hover:border-[var(--accent)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[var(--muted)]">{country.nameEn}</p>
                    <h3 className="mt-0.5 font-semibold">{country.nameZh}</h3>
                  </div>
                  <span className="rounded-full bg-white/75 px-2 py-0.5 text-[10px] text-[var(--muted)]">{country.iso2}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  GDP {latest ? formatMetricValue(latest.gdp, "gdp") : "待接入"}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="grid gap-5">
        <section className="card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="eyebrow">Economic Dataset</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{selectedCountry.nameZh}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{selectedCountry.nameEn}</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{activeModeInfo.description}</p>
            </div>
            <Link href={`/countries/${selectedCountry.slug}`} className="w-fit rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
              打开国家详情页
            </Link>
          </div>

          <div className="mt-6 grid gap-2 md:grid-cols-2">
            {dataModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveMode(mode.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeMode === mode.id
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </section>

        {activeMode === "economy" ? (
          <>
            <section className="grid gap-3 md:grid-cols-3">
              {latestEconomicRow ? (
                [
                  ["2025 GDP", formatMetricValue(latestEconomicRow.gdp, "gdp")],
                  ["2025 CPI / HICP", formatMetricValue(latestEconomicRow.inflation, "inflation")],
                  ["2025 失业率", formatMetricValue(latestEconomicRow.unemployment, "unemployment")],
                ].map(([label, value]) => (
                  <div key={label} className="card p-5">
                    <p className="text-xs text-[var(--muted)]">{label}</p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </div>
                ))
              ) : null}
            </section>

            <section className="card overflow-hidden p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="eyebrow">Five-Year Table</p>
                  <h2 className="mt-3 text-2xl font-semibold">近五年经济数据表</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    覆盖人口、GDP、人均 GDP、GDP 实际增长、CPI/HICP 通胀率和失业率。GDP 统一为欧元口径。
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs text-[var(--muted)]">2021-2025</span>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {["年份", "人口", "GDP", "人均 GDP", "GDP 实际增长", "CPI / HICP", "失业率", "来源"].map((header) => (
                        <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {economicRows.map((row) => (
                      <tr key={row.year} className="align-top">
                        <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{row.year}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{formatMetricValue(row.population, "population")}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{formatMetricValue(row.gdp, "gdp")}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{formatMetricValue(row.gdpPerCapita, "gdpPerCapita")}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{formatMetricValue(row.growth, "growth")}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{formatMetricValue(row.inflation, "inflation")}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{formatMetricValue(row.unemployment, "unemployment")}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">{row.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
              <div className="card p-6">
                <p className="eyebrow">Economic Source Policy</p>
                <h2 className="mt-3 text-2xl font-semibold">经济数据主源</h2>
                {economicPolicy ? (
                  <a href={economicPolicy.primaryUrl} target="_blank" rel="noreferrer" className="mt-5 block rounded-2xl border border-[var(--line)] bg-white/65 p-5 transition hover:border-[var(--accent)]">
                    <p className="text-xs text-[var(--muted)]">主机构</p>
                    <h3 className="mt-2 text-xl font-semibold">{economicPolicy.primaryAgency}</h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{economicPolicy.releaseType}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {economicPolicy.indicators.map((indicator) => (
                        <span key={indicator} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">{indicator}</span>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-[var(--muted)]">辅助核验：{economicPolicy.fallbackSources.join(" / ")}</p>
                  </a>
                ) : (
                  <p className="mt-5 rounded-2xl border border-[var(--line)] bg-white/65 p-5 text-sm text-[var(--muted)]">该国经济数据主源待补充。</p>
                )}
              </div>

              <div className="card p-6">
                <p className="eyebrow">China Economic Data</p>
                <h2 className="mt-3 text-2xl font-semibold">对华经贸样本</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{selectedCountry.chinaTradeNote}</p>
                <div className="mt-5 grid gap-3">
                  {selectedCountry.chinaProjects.map((project) => (
                    <div key={project.name} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                      <p className="font-semibold">{project.name}</p>
                      <p className="mt-2 text-xs text-[var(--accent)]">{project.sector} / {project.status}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{project.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {activeMode === "charts" ? (
          <>
            <section className="card p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="eyebrow">Chart Layer</p>
                  <h2 className="mt-3 text-2xl font-semibold">经济指标图表</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    图表层已改为只显示经济数据。选择一个指标后，下方会展示该国 2021-2025 的序列。
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs text-[var(--muted)]">{activeMetricInfo.unit}</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {economicMetricOptions.map((metric) => (
                  <button
                    key={metric.id}
                    type="button"
                    onClick={() => setActiveMetric(metric.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      activeMetric === metric.id
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/55 p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs text-[var(--muted)]">当前指标</p>
                    <h3 className="mt-1 text-xl font-semibold">{activeMetricInfo.label}</h3>
                  </div>
                  <p className="max-w-xl text-xs leading-5 text-[var(--muted)]">{activeMetricInfo.note}</p>
                </div>

                <div className="mt-6 grid gap-5">
                  {economicRows.map((row) => {
                    const value = valueFor(row, activeMetric);
                    return (
                      <ChartBar
                        key={row.year}
                        label={row.year}
                        value={value}
                        max={metricMax}
                        display={formatMetricValue(value, activeMetric)}
                      />
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="card p-6">
              <p className="eyebrow">Chart Data Table</p>
              <h2 className="mt-3 text-2xl font-semibold">{activeMetricInfo.label} 数据表</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      <th className="border-b border-[var(--line)] pb-3 pr-4 font-semibold">年份</th>
                      <th className="border-b border-[var(--line)] px-4 pb-3 font-semibold">数值</th>
                      <th className="border-b border-[var(--line)] px-4 pb-3 font-semibold">单位</th>
                      <th className="border-b border-[var(--line)] px-4 pb-3 font-semibold">来源</th>
                    </tr>
                  </thead>
                  <tbody>
                    {economicRows.map((row) => {
                      const value = valueFor(row, activeMetric);
                      return (
                        <tr key={row.year}>
                          <td className="border-b border-[var(--line)] py-3 pr-4 font-semibold">{row.year}</td>
                          <td className="border-b border-[var(--line)] px-4 py-3">{formatMetricValue(value, activeMetric)}</td>
                          <td className="border-b border-[var(--line)] px-4 py-3">{activeMetricInfo.unit}</td>
                          <td className="border-b border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">{row.source}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
}
