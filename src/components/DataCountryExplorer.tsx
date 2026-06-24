"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
  getV4TemplateCoverage,
  v4TemplateIndicatorIds,
  type ChinaProjectRecord,
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

type DataMode = "economy" | "charts" | "comparison" | "tables";
type ProjectAmountFilter = "all" | "available" | "missing";

const dataModes: { id: DataMode; label: string; description: string }[] = [
  { id: "economy", label: "经济数据", description: "近五年宏观经济表、官方统计主源与对华经贸样本。" },
  { id: "charts", label: "图表层", description: "只显示经济数据，可切换 GDP、CPI/通胀、失业率等指标。" },
  { id: "comparison", label: "V4 横向比较", description: "按同一套 V4 模板指标并列比较波兰、匈牙利、捷克和斯洛伐克。" },
  { id: "tables", label: "数据表格", description: "按六张核心表检查当前国家的数据完整性。" },
];

const tableMetricIds: EconomicMetricId[] = ["population", "gdp", "gdpPerCapita", "growth", "inflation", "unemployment"];
const extendedCategoryOrder: ExtendedCategory[] = ["fiscal", "external", "investment", "energy", "industry"];
const v4CountrySlugs = ["poland", "hungary", "czechia", "slovakia"];

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

function formatRawMetricValue(value: number | null, metricId: EconomicMetricId) {
  if (value === null) {
    return "待接入";
  }

  if (metricId === "population") {
    return value.toFixed(2);
  }

  if (metricId === "gdp") {
    return value.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
  }

  if (metricId === "gdpPerCapita") {
    return value.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
  }

  return value.toFixed(1);
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

function reliabilityLevelLabel(value: string) {
  const labels: Record<string, string> = {
    A: "可靠性 A 级",
    B: "可靠性 B 级",
    C: "可靠性 C 级",
    D: "可靠性 D 级",
  };

  return labels[value] ?? value;
}

function reliabilityLevelDescription(value: string) {
  const descriptions: Record<string, string> = {
    A: "官方统计机构、央行、欧盟机构、国际组织；可以作为正式数据或事件依据。",
    B: "主流通讯社、权威智库、官方年报；可以作为正式数据或事件依据。",
    C: "地方媒体、企业公告、行业网站；只作补充线索。",
    D: "未核验二手来源、社交媒体、无明确出处内容；不进入正式数据、事件库和模型计算。",
  };

  return descriptions[value] ?? "来源可靠性规则待补充。";
}

function formatMatrixValue(indicatorId: string, value: number | null) {
  if (value === null) {
    return "待接入";
  }

  if (indicatorId === "energy_import_dependency") {
    return value.toLocaleString("zh-CN", { maximumFractionDigits: 3 });
  }

  return value.toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function PendingCell({ label = "待接入" }: { label?: string }) {
  return <span className="text-xs font-semibold text-[var(--muted)]">{label}</span>;
}

function SourceNameLink({ href, children }: { href: string; children: ReactNode }) {
  if (!href) {
    return <PendingCell label="来源待接入" />;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
      {children}
    </a>
  );
}

function formatObservationValue(value: number | null, indicatorId: string) {
  if (value === null) {
    return "待接入";
  }

  return formatMatrixValue(indicatorId, value);
}

function matrixMeanComparison(value: number | null, mean: number | null) {
  if (value === null || mean === null) {
    return "待比较";
  }

  const tolerance = Math.max(0.0001, Math.abs(mean) * 0.0001);
  if (Math.abs(value - mean) <= tolerance) {
    return "等于均值";
  }

  return value > mean ? "高于均值" : "低于均值";
}

function dataValueClass(value: number | null) {
  return `data-value-token${value !== null && value < 0 ? " data-value-negative" : ""}`;
}

function ObservationRows({ observations }: { observations: ExtendedObservation[] }) {
  return (
    <>
      {observations.map((observation) => {
        const indicator = getExtendedIndicator(observation.indicatorId);

        return (
          <tr key={`${observation.countrySlug}-${observation.indicatorId}`} className="align-top">
            <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{indicator?.labelZh.replaceAll(" / ", "/") ?? observation.indicatorId}</td>
            <td className="data-date-cell border-b border-[var(--line)] px-3 py-3">{observation.date}</td>
            <td className="border-b border-[var(--line)] px-3 py-3 font-mono">
              <span className={dataValueClass(observation.value)}>{formatObservationValue(observation.value, observation.indicatorId)}</span>
            </td>
            <td className="data-unit-cell border-b border-[var(--line)] px-3 py-3">{observation.unit || "待接入"}</td>
            <td className="border-b border-[var(--line)] px-3 py-3">
              <DataStatusBadge status={observation.status} />
            </td>
            <td className="border-b border-[var(--line)] px-3 py-3">
              <div className="flex flex-col gap-2">
                <SourceStatusBadge status={observation.status === "official" ? "official" : observation.status === "sample" ? "sample" : observation.status === "pending" ? "pending" : "manual"} />
                <SourceNameLink href={observation.sourceUrl}>{observation.sourceName}</SourceNameLink>
              </div>
            </td>
            <td className="border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">{observation.updatedAt || "待接入"}</td>
            <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{observation.note ?? "—"}</td>
          </tr>
        );
      })}
    </>
  );
}

function ChinaProjectTable({ projects, countryName }: { projects: ChinaProjectRecord[]; countryName: string }) {
  const [amountFilter, setAmountFilter] = useState<ProjectAmountFilter>("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const sectors = useMemo(() => Array.from(new Set(projects.map((project) => project.sector).filter(Boolean))).sort(), [projects]);
  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const matchesAmount = amountFilter === "all" || (amountFilter === "available" ? project.amount !== null : project.amount === null);
        const matchesSector = sectorFilter === "all" || project.sector === sectorFilter;
        return matchesAmount && matchesSector;
      }),
    [amountFilter, projects, sectorFilter],
  );
  const availableAmountCount = projects.filter((project) => project.amount !== null).length;

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
        <DataStatusBadge status="pending" />
        <SourceStatusBadge status="pending" className="ml-2" />
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">该国对华经贸项目表待接入项目级来源。</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {([
            ["all", `全部项目 ${projects.length}`],
            ["available", `金额已接入 ${availableAmountCount}`],
            ["missing", `金额缺失 ${projects.length - availableAmountCount}`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setAmountFilter(value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                amountFilter === value ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--accent)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
          行业
          <select
            value={sectorFilter}
            onChange={(event) => setSectorFilter(event.target.value)}
            className="max-w-[240px] rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)]"
          >
            <option value="all">全部行业</option>
            {sectors.map((sector) => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
        </label>
      </div>

      {filteredProjects.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="research-data-table w-full min-w-[1360px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                {["项目名称", "国家", "地区/城市", "行业", "中国主体", "当地主体", "金额", "币种", "金额状态", "年份", "状态", "来源", "风险标签", "进入中国经济暴露指数", "备注"].map((header) => (
                  <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.projectId} className="align-top">
                  <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{project.projectName}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{countryName}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{project.regionName || "待接入"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{project.sector || "待接入"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{project.chineseActor || "待接入"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{project.localActor || "待接入"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3 font-mono">
                    <span className={dataValueClass(project.amount)}>{project.amount === null ? "—" : project.amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}</span>
                  </td>
                  <td className="data-unit-cell border-b border-[var(--line)] px-3 py-3">{project.currency ?? "—"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${project.amount === null ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                      {project.amount === null ? "金额缺失" : "金额已接入"}
                    </span>
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{project.year || "待接入"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">
                    <div className="flex flex-col gap-2">
                      <DataStatusBadge status={project.status} />
                      <span className="text-xs text-[var(--muted)]">{project.projectStatus}</span>
                    </div>
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-3">
                    <div className="flex flex-col gap-2">
                      <SourceStatusBadge status={project.status === "official" ? "official" : project.status === "sample" ? "sample" : project.status === "pending" ? "pending" : "manual"} />
                      <SourceNameLink href={project.sourceUrl}>来源链接</SourceNameLink>
                    </div>
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{project.riskTags.length > 0 ? project.riskTags.join(" / ") : "待接入"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{project.exposureIndexEligible ? "候选，待模型启用后复核" : "否，暂作项目样本"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{project.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl border border-[var(--line)] bg-white/65 p-4 text-sm text-[var(--muted)]">当前筛选条件下没有项目记录。</p>
      )}
    </div>
  );
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
  const v4TemplateCoverage = getV4TemplateCoverage(selectedCountry.slug);
  const v4Countries = v4CountrySlugs
    .map((slug) => countries.find((country) => country.slug === slug))
    .filter((country): country is NonNullable<typeof country> => Boolean(country));
  const v4ObservationMaps = new Map(
    v4Countries.map((country) => [
      country.slug,
      new Map(getExtendedObservations(country.slug).map((observation) => [observation.indicatorId, observation])),
    ]),
  );
  const v4CoverageItems = v4Countries.map((country) => {
    const coverage = getV4TemplateCoverage(country.slug);

    return {
      country,
      coverage,
    };
  });
  const v4TotalExpected = v4CoverageItems.reduce((sum, item) => sum + item.coverage.total, 0);
  const v4TotalPresent = v4CoverageItems.reduce((sum, item) => sum + item.coverage.present.length, 0);

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

          <div className="mt-6 grid gap-2 md:grid-cols-4">
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

        {activeMode === "comparison" ? (
          <section className="card overflow-hidden p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="eyebrow">V4 Cross-Country Comparison</p>
                <h2 className="mt-3 text-2xl font-semibold">V4 指标矩阵</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                  按同一套 V4 模板指标并列比较波兰、匈牙利、捷克和斯洛伐克。单元格以数值为主，点击数值可打开对应来源链接；当前区块只做事实数据对照，不输出预测或风险指数。
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-5 py-4 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">模板规模</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">{v4TemplateIndicatorIds.length}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">指标 / 4 国</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Data Completeness Acceptance</p>
                  <h3 className="mt-2 text-xl font-semibold">V4 扩展数据完整度：{v4TotalPresent} / {v4TotalExpected}</h3>
                </div>
                <DataStatusBadge status={v4TotalPresent === v4TotalExpected ? "official" : "pending"} />
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-4">
                {v4CoverageItems.map(({ country, coverage }) => (
                  <div key={country.slug} className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                    <p className="text-xs text-[var(--muted)]">{country.nameEn}</p>
                    <p className="mt-1 font-semibold">{country.nameZh}：{coverage.present.length} / {coverage.total}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="research-data-table w-full min-w-[1480px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    <th className="border-b border-[var(--line)] pb-3 pr-4 font-semibold">指标</th>
                    {v4Countries.map((country) => (
                      <th key={country.slug} className="border-b border-[var(--line)] px-4 pb-3 text-right font-semibold">{country.nameZh}</th>
                    ))}
                    <th className="border-b border-[var(--line)] px-4 pb-3 text-right font-semibold">最高值</th>
                    <th className="border-b border-[var(--line)] px-4 pb-3 text-right font-semibold">最低值</th>
                    <th className="border-b border-[var(--line)] px-4 pb-3 text-right font-semibold">V4 均值</th>
                  </tr>
                </thead>
                <tbody>
                  {v4TemplateIndicatorIds.map((indicatorId) => {
                    const indicator = getExtendedIndicator(indicatorId);
                    const countryObservations = v4Countries.map((country) => ({
                      country,
                      observation: v4ObservationMaps.get(country.slug)?.get(indicatorId),
                    }));
                    const availableObservations = countryObservations.filter(
                      (item): item is typeof item & { observation: ExtendedObservation & { value: number } } => item.observation?.value !== null && item.observation?.value !== undefined,
                    );
                    const values = availableObservations.map((item) => item.observation.value);
                    const mean = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
                    const highest = values.length > 0 ? Math.max(...values) : null;
                    const lowest = values.length > 0 ? Math.min(...values) : null;
                    const highestCountries = highest === null ? [] : availableObservations.filter((item) => item.observation.value === highest).map((item) => item.country.nameZh);
                    const lowestCountries = lowest === null ? [] : availableObservations.filter((item) => item.observation.value === lowest).map((item) => item.country.nameZh);

                    return (
                      <tr key={indicatorId} className="align-top">
                        <td className="border-b border-[var(--line)] py-3 pl-0 pr-4">
                          <p className="font-semibold">{indicator?.labelZh ?? indicatorId}</p>
                          <p className="mt-1 text-[10px] text-[var(--muted)]">{indicator?.unit ?? ""} / {indicator ? extendedIndicatorLabels[indicator.category] : "待接入"}</p>
                        </td>
                        {countryObservations.map(({ country, observation }) => {
                          const comparison = matrixMeanComparison(observation?.value ?? null, mean);

                          return (
                            <td key={`${country.slug}-${indicatorId}`} className="border-b border-[var(--line)] px-4 py-3 text-right">
                              {observation ? (
                                <div className="flex flex-col items-end gap-1.5">
                                  <a
                                    href={observation.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={`${observation.sourceName} / ${observation.date} / ${observation.status}`}
                                    className={dataValueClass(observation.value)}
                                  >
                                    {formatMatrixValue(indicatorId, observation.value)}
                                  </a>
                                  <span className={`whitespace-nowrap text-[10px] font-semibold ${comparison === "高于均值" ? "text-sky-800" : comparison === "低于均值" ? "text-amber-800" : "text-[var(--muted)]"}`}>
                                    {comparison}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[var(--muted)]">待接入</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="border-b border-[var(--line)] px-4 py-3 text-right">
                          <span className={dataValueClass(highest)}>{formatMatrixValue(indicatorId, highest)}</span>
                          <p className="mt-1 whitespace-nowrap text-[10px] text-[var(--muted)]">{highestCountries.join(" / ") || "待接入"}</p>
                        </td>
                        <td className="border-b border-[var(--line)] px-4 py-3 text-right">
                          <span className={dataValueClass(lowest)}>{formatMatrixValue(indicatorId, lowest)}</span>
                          <p className="mt-1 whitespace-nowrap text-[10px] text-[var(--muted)]">{lowestCountries.join(" / ") || "待接入"}</p>
                        </td>
                        <td className="border-b border-[var(--line)] px-4 py-3 text-right">
                          <span className={dataValueClass(mean)}>{formatMatrixValue(indicatorId, mean)}</span>
                          <p className="mt-1 whitespace-nowrap text-[10px] text-[var(--muted)]">算术平均</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-xs text-[var(--muted)]">
              <DataStatusBadge status="official" />
              <span>最高值、最低值和 V4 均值均为当前四国观测值的直接派生比较；高于或低于均值仅表示数值位置，不代表优劣、预测或风险判断。</span>
            </div>
          </section>
        ) : null}

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
                <table className="research-data-table w-full min-w-[1080px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {["指标", "年份", "数值", "单位", "状态", "来源", "更新时间", "备注"].map((header) => (
                        <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {economicRows.flatMap((row) =>
                      tableMetricIds.map((metricId) => {
                        const metric = economicMetricOptions.find((option) => option.id === metricId) ?? economicMetricOptions[0];
                        const value = valueFor(row, metric.id);
                        const status = statusForMetric(value);

                        return (
                          <tr key={`${row.year}-${metric.id}`} className="align-top">
                            <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{metric.label}</td>
                            <td className="data-date-cell border-b border-[var(--line)] px-3 py-3">{row.year}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3 font-mono"><span className={dataValueClass(value)}>{formatRawMetricValue(value, metric.id)}</span></td>
                            <td className="data-unit-cell border-b border-[var(--line)] px-3 py-3">{metric.unit}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">
                              <DataStatusBadge status={status} />
                            </td>
                            <td className="border-b border-[var(--line)] px-3 py-3">
                              <div className="flex flex-col gap-2">
                                <SourceStatusBadge status={status === "official" ? "official" : "pending"} />
                                <SourceLinkList links={getEconomicMetricSourceLinks(selectedCountry.slug, metric.id, row.year, value)} compact />
                              </div>
                            </td>
                            <td className="border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">待接入</td>
                            <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{metric.note} 数据来源：{row.source}</td>
                          </tr>
                        );
                      }),
                    )}
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
                <div className="mt-5">
                  <ChinaProjectTable key={selectedCountry.slug} projects={projectRecords} countryName={selectedCountry.nameZh} />
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
                        <table className="research-data-table w-full min-w-[1020px] border-separate border-spacing-0 text-left text-sm">
                          <thead>
                            <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                              {["指标", "年份", "数值", "单位", "状态", "来源", "更新时间", "备注"].map((header) => (
                                <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <ObservationRows observations={rows} />
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
                <table className="research-data-table w-full min-w-[1080px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {["指标", "年份", "数值", "单位", "状态", "来源", "更新时间", "备注"].map((header) => (
                        <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {economicRows.map((row) => {
                      const value = valueFor(row, activeMetric);
                      const status = statusForMetric(value);
                      return (
                        <tr key={row.year} className="align-top">
                          <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{activeMetricInfo.label}</td>
                          <td className="data-date-cell border-b border-[var(--line)] px-3 py-3">{row.year}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3 font-mono"><span className={dataValueClass(value)}>{formatRawMetricValue(value, activeMetric)}</span></td>
                          <td className="data-unit-cell border-b border-[var(--line)] px-3 py-3">{activeMetricInfo.unit}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">
                            <DataStatusBadge status={status} />
                          </td>
                          <td className="border-b border-[var(--line)] px-3 py-3">
                            <div className="flex flex-col gap-2">
                              <SourceStatusBadge status={status === "official" ? "official" : "pending"} />
                              <SourceLinkList links={getEconomicMetricSourceLinks(selectedCountry.slug, activeMetric, row.year, value)} />
                            </div>
                          </td>
                          <td className="border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">待接入</td>
                          <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{activeMetricInfo.note} 数据来源：{row.source}</td>
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
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="eyebrow">V4 Template Coverage</p>
                  <h2 className="mt-3 text-2xl font-semibold">V4 模板覆盖</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                    以波兰扩展数据作为 V4 第一批横向比较模板，当前只检查四国是否拥有同一组财政、外部、投资、能源和产业指标；不在此处继续给波兰新增指标。
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-5 py-4 text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">接入进度</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">
                    {v4TemplateCoverage.present.length}/{v4TemplateCoverage.total}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{v4TemplateCoverage.complete ? "结构已对齐" : "仍有缺项"}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {v4TemplateCoverage.present.map((indicatorId) => {
                  const indicator = getExtendedIndicator(indicatorId);

                  return (
                    <span key={indicatorId} className="rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                      {indicator?.labelZh ?? indicatorId}
                    </span>
                  );
                })}
                {v4TemplateCoverage.missing.map((indicatorId) => {
                  const indicator = getExtendedIndicator(indicatorId);

                  return (
                    <span key={indicatorId} className="rounded-full border border-dashed border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                      缺失：{indicator?.labelZh ?? indicatorId}
                    </span>
                  );
                })}
              </div>
            </div>

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
                <table className="research-data-table w-full min-w-[1020px] border-separate border-spacing-0 text-left text-sm">
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
                      {["指标", "年份", "数值", "单位", "状态", "来源", "更新时间", "备注"].map((header) => (
                        <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <ObservationRows observations={extendedObservations} />
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-6">
              <p className="eyebrow">Sources / Projects / Events</p>
              <h2 className="mt-3 text-2xl font-semibold">来源表、对华项目表、新闻事件表</h2>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                  <h3 className="font-semibold">来源表</h3>
                  <div className="mt-3 grid gap-3">
                    {sourceTableRecords.map((source) => (
                      <a key={source.sourceId} href={source.url} target="_blank" rel="noreferrer" className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs">
                        <p className="font-semibold text-[var(--foreground)]">{source.sourceName}</p>
                        <p className="mt-1 text-[var(--muted)]">{source.sourceType} / {reliabilityLevelLabel(source.reliabilityLevel)}</p>
                        <p className="mt-1 leading-5 text-[var(--muted)]">{reliabilityLevelDescription(source.reliabilityLevel)}</p>
                        <p className="mt-1 leading-5 text-[var(--muted)]">{source.usageNotes}</p>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                  <h3 className="font-semibold">对华项目表</h3>
                  <div className="mt-3">
                    <ChinaProjectTable key={selectedCountry.slug} projects={projectRecords} countryName={selectedCountry.nameZh} />
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                  <h3 className="font-semibold">新闻事件表</h3>
                  <div className="mt-3 grid gap-3">
                    {newsEventRecords.map((event) => {
                      const source = sourceTableRecords.find((item) => item.sourceId === event.sourceId);

                      return (
                        <div key={event.eventId} className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <DataStatusBadge status={event.status} />
                            {source ? <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-[var(--muted)]">{reliabilityLevelLabel(source.reliabilityLevel)}</span> : null}
                          </div>
                          <p className="mt-2 font-semibold text-[var(--foreground)]">{event.title}</p>
                          <p className="mt-1 text-[var(--muted)]">{event.date} / {event.topic} / {event.eventType}</p>
                          <p className="mt-1 leading-5 text-[var(--muted)]">分析边界：{analysisBoundaryLabel(event.modelImpact)}；涉华：{event.chinaRelated ? "是" : "否"}；强度：{event.intensity ?? "待量化"}</p>
                          <p className="mt-1 leading-5 text-[var(--muted)]">{event.summary}</p>
                          {source ? (
                            <a href={source.url} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                              来源：{source.sourceName}
                            </a>
                          ) : null}
                        </div>
                      );
                    })}
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
