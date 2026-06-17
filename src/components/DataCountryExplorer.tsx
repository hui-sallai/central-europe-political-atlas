"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataStatusBadge, SourceStatusBadge } from "@/components/DataStatusBadge";
import { countries } from "@/lib/data";
import { getEconomicSourcePolicy } from "@/lib/economicSourcePolicy";
import {
  extendedIndicatorLabels,
  extendedIndicators,
  sourceTableRecords,
  getChinaProjectRecords,
  getCountryTableRecord,
  getExtendedIndicator,
  getExtendedObservations,
  getNewsEventRecords,
  type ExtendedCategory,
  type ExtendedObservation,
} from "@/lib/extendedData";
import {
  economicMetricOptions,
  getEconomicFiveYearRows,
  getEconomicMetricSourceLinks,
  getEconomicRowSourceLinks,
  getLatestEconomicRow,
  type EconomicMetricId,
  type EconomicSourceLink,
  type EconomicYearRow,
} from "@/lib/economicTimeSeries";

type DataMode = "economy" | "charts" | "tables";

const dataModes: { id: DataMode; label: string; description: string }[] = [
  { id: "economy", label: "经济数据", description: "近五年宏观经济表、官方统计主源与对华经贸样本。" },
  { id: "charts", label: "图表层", description: "只显示经济数据，可切换 GDP、CPI/通胀、失业率等指标。" },
  { id: "tables", label: "数据表格", description: "按六张核心表检查当前国家的数据完整性。" },
];

const tableMetricIds: EconomicMetricId[] = ["population", "gdp", "gdpPerCapita", "growth", "inflation", "unemployment"];
const extendedCategoryOrder: ExtendedCategory[] = ["fiscal", "external", "energyIndustry"];

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

function statusForMetric(value: number | null): "official" | "pending" {
  return value === null ? "pending" : "official";
}

function analysisUseLabel(value: string) {
  const labels: Record<string, string> = {
    eligible_after_review: "复核后可进入后续分析",
    display_only: "仅展示",
    excluded: "不进入分析计算",
  };

  return labels[value] ?? value;
}

function directionMeaningLabel(value: string) {
  const labels: Record<string, string> = {
    higher_risk: "数值上升代表压力上升",
    lower_risk: "数值上升代表压力下降",
    neutral: "中性",
    context: "背景解释",
  };

  return labels[value] ?? value;
}

function analysisBoundaryLabel(value: string) {
  const labels: Record<string, string> = {
    excluded: "当前不进入分析计算",
    explain_only: "仅作事件解释",
    eligible_after_review: "复核后可进入后续分析",
  };

  return labels[value] ?? value;
}

function formatExtendedValue(observation: ExtendedObservation) {
  if (observation.value === null) {
    return "待接入";
  }

  if (observation.unit === "百万欧元") {
    return `${observation.value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 百万欧元`;
  }

  return `${observation.value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}${observation.unit.startsWith("%") ? "" : " "}${observation.unit}`;
}

function ChartBar({ label, value, max, display }: { label: string; value: number | null; max: number; display: string }) {
  const width = value === null || max <= 0 ? 0 : Math.max(3, Math.min(100, (Math.abs(value) / max) * 100));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold">{label}</span>
        <span className="flex items-center gap-2 text-[var(--muted)]">
          {display}
          <DataStatusBadge status={statusForMetric(value)} />
        </span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/75">
        <div className={`h-full rounded-full ${value === null ? "bg-[var(--surface-muted)]" : "bg-[var(--accent)]"}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function SourceLinkList({ links, compact = false }: { links: EconomicSourceLink[]; compact?: boolean }) {
  if (links.length === 0) {
    return <span className="text-xs text-[var(--muted)]">来源待接入</span>;
  }

  return (
    <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      {links.map((link) => (
        <a
          key={`${link.label}-${link.url}`}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          title={link.note}
          className={`${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[10px]"} rounded-full border border-[var(--line)] bg-white font-semibold text-[var(--accent)]`}
        >
          {link.label}
        </a>
      ))}
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
  const extendedObservations = getExtendedObservations(selectedCountry.slug);
  const projectRecords = getChinaProjectRecords(selectedCountry.slug);
  const countryTableRecord = getCountryTableRecord(selectedCountry.slug);
  const newsEventRecords = getNewsEventRecords(selectedCountry.slug);
  const selectedIndicatorIds = new Set(extendedObservations.map((observation) => observation.indicatorId));
  const selectedIndicators = extendedIndicators.filter((indicator) => selectedIndicatorIds.has(indicator.id));

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
                <div className="mt-2">
                  <DataStatusBadge status={latest ? statusForMetric(latest.gdp) : "pending"} />
                  <SourceStatusBadge status={latest?.gdp === null || !latest ? "pending" : "official"} className="mt-1" />
                  {latest ? (
                    <div className="mt-2">
                      <SourceLinkList links={getEconomicMetricSourceLinks(country.slug, "gdp", latest.year, latest.gdp).slice(0, 1)} compact />
                    </div>
                  ) : null}
                </div>
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

          <div className="mt-6 grid gap-2 md:grid-cols-3">
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
                  { label: "2025 GDP", metricId: "gdp" as EconomicMetricId, value: latestEconomicRow.gdp },
                  { label: "2025 CPI / HICP", metricId: "inflation" as EconomicMetricId, value: latestEconomicRow.inflation },
                  { label: "2025 失业率", metricId: "unemployment" as EconomicMetricId, value: latestEconomicRow.unemployment },
                ].map((item) => (
                  <div key={item.label} className="card p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-[var(--muted)]">{item.label}</p>
                      <DataStatusBadge status={statusForMetric(item.value)} />
                    </div>
                    <p className="mt-2 text-2xl font-semibold">{formatMetricValue(item.value, item.metricId)}</p>
                    <div className="mt-3">
                      <SourceStatusBadge status={item.value === null ? "pending" : "official"} />
                    </div>
                    <div className="mt-3">
                      <SourceLinkList links={getEconomicMetricSourceLinks(selectedCountry.slug, item.metricId, latestEconomicRow.year, item.value)} compact />
                    </div>
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
                        {tableMetricIds.map((metricId) => {
                          const metric = economicMetricOptions.find((option) => option.id === metricId) ?? economicMetricOptions[0];
                          const value = valueFor(row, metric.id);
                          return (
                            <td key={metric.id} className="border-b border-[var(--line)] px-3 py-3">
                              <div className="flex flex-col gap-2">
                                <span>{formatMetricValue(value, metric.id)}</span>
                                <span className="text-[10px] text-[var(--muted)]">{row.year} / {metric.unit}</span>
                                <DataStatusBadge status={statusForMetric(value)} />
                                <SourceStatusBadge status={value === null ? "pending" : "official"} />
                                <SourceLinkList links={getEconomicMetricSourceLinks(selectedCountry.slug, metric.id, row.year, value)} compact />
                              </div>
                            </td>
                          );
                        })}
                        <td className="border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">
                          <div className="flex flex-col gap-2">
                            <span className="font-semibold text-[var(--foreground)]">{row.source}</span>
                            <SourceLinkList links={getEconomicRowSourceLinks(selectedCountry.slug, row.year)} />
                            <DataStatusBadge status="official" />
                            <SourceStatusBadge status="official" />
                          </div>
                        </td>
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
                    <div className="mt-3">
                      <DataStatusBadge status="official" />
                      <SourceStatusBadge status="official" className="ml-2" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{economicPolicy.releaseType}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {economicPolicy.indicators.map((indicator) => (
                        <span key={indicator} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">{indicator}</span>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-[var(--muted)]">辅助核验：{economicPolicy.fallbackSources.join(" / ")}</p>
                  </a>
                ) : (
                  <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/65 p-5 text-sm text-[var(--muted)]">
                    <DataStatusBadge status="pending" />
                    <SourceStatusBadge status="pending" className="ml-2" />
                    <p className="mt-3">该国经济数据主源待补充。</p>
                  </div>
                )}
              </div>

              <div className="card p-6">
                <p className="eyebrow">China Economic Data</p>
                <h2 className="mt-3 text-2xl font-semibold">对华经贸项目表</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{selectedCountry.chinaTradeNote}</p>
                <div className="mt-5 grid gap-3">
                  {projectRecords.length > 0 ? (
                    projectRecords.map((project) => (
                      <div key={project.projectId} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold">{project.projectName}</p>
                          <DataStatusBadge status={project.status} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <SourceStatusBadge status={project.status === "official" ? "official" : project.status === "sample" ? "sample" : project.status === "pending" ? "pending" : "manual"} />
                          <a href={project.sourceUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)]">
                            来源链接
                          </a>
                        </div>
                        <dl className="mt-3 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
                          <div><dt className="font-semibold text-[var(--foreground)]">地区</dt><dd>{project.regionName}</dd></div>
                          <div><dt className="font-semibold text-[var(--foreground)]">行业</dt><dd>{project.sector}</dd></div>
                          <div><dt className="font-semibold text-[var(--foreground)]">主体</dt><dd>{project.actors}</dd></div>
                          <div><dt className="font-semibold text-[var(--foreground)]">金额</dt><dd>{project.amountEur === null ? "待接入" : `${project.amountEur.toLocaleString("zh-CN")} 欧元`}</dd></div>
                          <div><dt className="font-semibold text-[var(--foreground)]">状态</dt><dd>{project.projectStatus}</dd></div>
                          <div><dt className="font-semibold text-[var(--foreground)]">关注标签</dt><dd>{project.riskTags.join(" / ")}</dd></div>
                        </dl>
                        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{project.note}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                      <DataStatusBadge status="pending" />
                      <SourceStatusBadge status="pending" className="ml-2" />
                      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">该国对华经贸项目表待接入项目级来源。</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {extendedObservations.length > 0 ? (
              <section className="grid gap-5">
                {extendedCategoryOrder.map((category) => {
                  const rows = extendedObservations.filter((observation) => getExtendedIndicator(observation.indicatorId)?.category === category);

                  if (rows.length === 0) {
                    return null;
                  }

                  return (
                    <div key={category} className="card overflow-hidden p-6">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <p className="eyebrow">V4 Data Extension</p>
                          <h2 className="mt-3 text-2xl font-semibold">{extendedIndicatorLabels[category]}</h2>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">2024 年官方口径优先；无法确定口径的指标保留为待接入。</p>
                        </div>
                        <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs text-[var(--muted)]">V4 first</span>
                      </div>

                      <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-sm">
                          <thead>
                            <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                              {["指标", "日期", "数值", "状态", "来源", "更新时间", "备注"].map((header) => (
                                <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((observation) => {
                              const indicator = getExtendedIndicator(observation.indicatorId);

                              return (
                                <tr key={`${observation.countrySlug}-${observation.indicatorId}`}>
                                  <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{indicator?.labelZh ?? observation.indicatorId}</td>
                                  <td className="border-b border-[var(--line)] px-3 py-3">{observation.date}</td>
                                  <td className="border-b border-[var(--line)] px-3 py-3">{formatExtendedValue(observation)}</td>
                                  <td className="border-b border-[var(--line)] px-3 py-3">
                                    <DataStatusBadge status={observation.status} />
                                  </td>
                                  <td className="border-b border-[var(--line)] px-3 py-3">
                                    <div className="flex flex-col gap-2">
                                      <SourceStatusBadge status={observation.status === "official" ? "official" : observation.status === "sample" ? "sample" : observation.status === "pending" ? "pending" : "manual"} />
                                      <a href={observation.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)]">
                                        {observation.sourceName}
                                      </a>
                                    </div>
                                  </td>
                                  <td className="border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">{observation.updatedAt || "待接入"}</td>
                                  <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{observation.note ?? "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </section>
            ) : null}
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
                      <th className="border-b border-[var(--line)] px-4 pb-3 font-semibold">数据状态</th>
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
                          <td className="border-b border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">
                            <div className="flex flex-col gap-2">
                              <span className="font-semibold text-[var(--foreground)]">{row.source}</span>
                              <SourceLinkList links={getEconomicMetricSourceLinks(selectedCountry.slug, activeMetric, row.year, value)} />
                            </div>
                          </td>
                          <td className="border-b border-[var(--line)] px-4 py-3">
                            <DataStatusBadge status={statusForMetric(value)} />
                            <div className="mt-2">
                              <SourceStatusBadge status={value === null ? "pending" : "official"} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {activeMode === "tables" ? (
          <section className="grid gap-5">
            <div className="card p-6">
              <p className="eyebrow">Country Table</p>
              <h2 className="mt-3 text-2xl font-semibold">国家表</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {["国家代码", "中文名", "英文名", "欧盟", "欧元区", "区域组别", "优先级", "备注"].map((header) => (
                        <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {countryTableRecord ? (
                      <tr>
                        <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{countryTableRecord.countryCode}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{countryTableRecord.nameZh}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{countryTableRecord.nameEn}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{countryTableRecord.euMember ? "是" : "否"}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{countryTableRecord.eurozoneMember ? "是" : "否"}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{countryTableRecord.regionalGroup}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{countryTableRecord.priority}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{countryTableRecord.notes}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-6">
              <p className="eyebrow">Indicator Dictionary</p>
              <h2 className="mt-3 text-2xl font-semibold">指标字典表</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {["指标ID", "中文名", "英文名", "类别", "单位", "频率", "分析用途", "方向解释", "转换"].map((header) => (
                        <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedIndicators.map((indicator) => (
                      <tr key={indicator.id}>
                        <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{indicator.id}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{indicator.labelZh}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{indicator.labelEn}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{extendedIndicatorLabels[indicator.category]}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{indicator.unit}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{indicator.frequency}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{analysisUseLabel(indicator.modelUse)}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{directionMeaningLabel(indicator.riskDirection)}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3">{indicator.transform}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-6">
              <p className="eyebrow">Observation Table</p>
              <h2 className="mt-3 text-2xl font-semibold">观测值表</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {["国家", "地区", "指标", "日期", "频率", "数值", "单位", "来源", "状态", "更新时间", "备注"].map((header) => (
                        <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {extendedObservations.map((observation) => {
                      const indicator = getExtendedIndicator(observation.indicatorId);

                      return (
                        <tr key={`table-${observation.countrySlug}-${observation.indicatorId}`}>
                          <td className="border-b border-[var(--line)] py-3 pl-0 pr-3">{selectedCountry.iso2}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">国家级</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{indicator?.labelZh ?? observation.indicatorId}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{observation.date}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">annual</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{formatExtendedValue(observation)}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{observation.unit}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">
                            <a href={observation.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)]">{observation.sourceName}</a>
                          </td>
                          <td className="border-b border-[var(--line)] px-3 py-3"><DataStatusBadge status={observation.status} /></td>
                          <td className="border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">{observation.updatedAt || "待接入"}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{observation.note ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-6">
              <p className="eyebrow">Sources / Projects / Events</p>
              <h2 className="mt-3 text-2xl font-semibold">来源表、对华项目表、新闻事件表</h2>
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                  <h3 className="font-semibold">来源表</h3>
                  <div className="mt-3 grid gap-3">
                    {sourceTableRecords.map((source) => (
                      <a key={source.sourceId} href={source.url} target="_blank" rel="noreferrer" className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs">
                        <p className="font-semibold text-[var(--foreground)]">{source.sourceName}</p>
                        <p className="mt-1 text-[var(--muted)]">{source.sourceType} / {source.reliabilityLevel}</p>
                        <p className="mt-1 leading-5 text-[var(--muted)]">{source.usageNotes}</p>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                  <h3 className="font-semibold">对华项目表</h3>
                  <div className="mt-3 grid gap-3">
                    {projectRecords.length > 0 ? projectRecords.map((project) => (
                      <a key={project.projectId} href={project.sourceUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs">
                        <p className="font-semibold text-[var(--foreground)]">{project.projectName}</p>
                        <p className="mt-1 text-[var(--muted)]">{project.regionName} / {project.sector}</p>
                        <p className="mt-1 leading-5 text-[var(--muted)]">{project.actors}；金额：{project.amountEur === null ? "待接入" : project.amountEur}</p>
                      </a>
                    )) : <p className="text-xs text-[var(--muted)]">待接入项目级来源。</p>}
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                  <h3 className="font-semibold">新闻事件表</h3>
                  <div className="mt-3 grid gap-3">
                    {newsEventRecords.map((event) => (
                      <div key={event.eventId} className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs">
                        <p className="font-semibold text-[var(--foreground)]">{event.title}</p>
                        <p className="mt-1 text-[var(--muted)]">{event.date} / {event.topic} / {event.eventType}</p>
                        <p className="mt-1 leading-5 text-[var(--muted)]">分析边界：{analysisBoundaryLabel(event.modelImpact)}；涉华：{event.chinaRelated ? "是" : "否"}；强度：{event.intensity ?? "待量化"}</p>
                        <p className="mt-1 leading-5 text-[var(--muted)]">{event.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
