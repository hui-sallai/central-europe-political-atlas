"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { DataStatusBadge, SourceStatusBadge } from "@/components/DataStatusBadge";
import { countries } from "@/lib/data";
import { countryMetadataRecords, researchDataLayerFiles } from "@/lib/countryMetadata";
import { getEconomicSourcePolicy } from "@/lib/economicSourcePolicy";
import {
  extendedIndicatorLabels,
  extendedIndicators,
  sourceTableRecords,
  getChinaProjectRecords,
  getCountryTableRecord,
  getExtendedIndicator,
  getExtendedObservations,
  getLatestExtendedObservation,
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
import { indicatorDictionaryRecords, type IndicatorCategory } from "@/lib/indicatorDictionary";
import { sourceDictionaryRows, type SourceDictionaryRecord } from "@/lib/sourceDictionary";
import { getV4DataQualitySummary, type V4QualityStatus } from "@/lib/v4DataQuality";
import { chinaProjectVerificationLabel, verifyChinaProject, type ChinaProjectVerificationConclusion } from "@/lib/chinaProjectVerification";
import observationsData from "../../public/research-data/observations.json";
import dataQualityChecksData from "../../public/research-data/data_quality_checks.json";

type DataMode = "economy" | "charts" | "comparison" | "tables";
type ProjectAmountFilter = "all" | "available" | "missing";
type QualityFilterState = {
  country: string;
  indicator: string;
  year: string;
  status: string;
  reliability: string;
  official: string;
  pending: string;
  computed: string;
  manual: string;
  comparison: string;
  fiveYearChange: string;
  meanGap: string;
  rankChange: string;
  qualityStatus: string;
};
type DataEntryShortcut = {
  id: string;
  label: string;
  mode: DataMode;
  description: string;
  requiresV4?: boolean;
};
type V4DerivedRow = {
  indicatorId: string;
  label: string;
  unit: string;
  highest: number | null;
  highestCountries: string[];
  lowest: number | null;
  lowestCountries: string[];
  mean: number | null;
  aboveMeanCountries: string[];
  belowMeanCountries: string[];
  equalMeanCountries: string[];
  countryComparisons: V4CountryDerivedComparison[];
  rankChanges: V4RankChange[];
};

type V4CountryDerivedComparison = {
  countrySlug: string;
  countryName: string;
  startYear: string | null;
  startValue: number | null;
  latestYear: string | null;
  latestValue: number | null;
  change: number | null;
  gapToMean: number | null;
  meanBucket: "above" | "below" | "equal" | "pending";
};

type V4RankChange = {
  countrySlug: string;
  countryName: string;
  startRank: number | null;
  latestRank: number | null;
  rankDelta: number | null;
};

type V4ResearchSummary = {
  category: string;
  title: string;
  body: string;
  basis: string;
};

type V4DerivedTableRow = {
  category: ExtendedCategory;
  categoryLabel: string;
  row: V4DerivedRow;
  latestComparableYear: string;
  valuesByCountry: Record<string, number | null>;
  highestCountry: string;
  lowestCountry: string;
  biggestMeanGapCountry: string;
  biggestMeanGapValue: number | null;
  biggestChangeCountry: string;
  biggestChangeValue: number | null;
  pendingObservationCount: number;
  computedObservationCount: number;
};

type CategoryResearchSummary = {
  highLow: string;
  change: string;
  meanGap: string;
  dataGap: string;
};
type IndicatorDictionaryRecord = (typeof indicatorDictionaryRecords)[number];
type V4DataQualitySummary = ReturnType<typeof getV4DataQualitySummary>;
type StandardObservationRecord = (typeof observationsData.records)[number];
type DataQualityCheckRecord = (typeof dataQualityChecksData.records)[number];

const dataModes: { id: DataMode; label: string; description: string }[] = [
  { id: "economy", label: "经济数据", description: "近五年宏观经济表、官方统计主源与对华经贸样本。" },
  { id: "charts", label: "图表层", description: "只显示经济数据，可切换 GDP、CPI/通胀、失业率等指标。" },
  { id: "comparison", label: "V4 横向比较", description: "保留 V4 完整度、数据质量与派生事实摘要；具体横向轴已拆入各个数据板块。" },
  { id: "tables", label: "数据表格", description: "按六张核心表检查当前国家的数据完整性。" },
];
const dataEntryShortcuts: DataEntryShortcut[] = [
  { id: "countries-layer-entry", label: "国家元数据表", mode: "tables", description: "十国 countries 逻辑层，作为 country_id 关联表。" },
  { id: "indicator-dictionary-entry", label: "指标字典入口", mode: "tables", description: "18 个指标的口径、单位、来源优先级和比较资格。" },
  { id: "source-dictionary-entry", label: "来源字典入口", mode: "tables", description: "16 类来源的链接、可靠性等级和使用边界。" },
  { id: "v4-data-quality-entry", label: "数据质量验收入口", mode: "comparison", description: "V4 四国 240 个观测位置的验收清单。", requiresV4: true },
  { id: "v4-derived-comparison-entry", label: "派生比较表入口", mode: "comparison", description: "最高值、最低值、V4 均值和事实派生比较。", requiresV4: true },
  { id: "data-export-entry", label: "CSV / JSON 导出", mode: "tables", description: "9 个逻辑数据层的 JSON 与 CSV 文件。" },
];

const tableMetricIds: EconomicMetricId[] = ["population", "gdp", "gdpPerCapita", "growth", "inflation", "unemployment"];
const economicMetricIndicatorIds: Record<EconomicMetricId, string> = {
  population: "population",
  gdp: "gdp_current_eur",
  gdpPerCapita: "gdp_per_capita_eur",
  growth: "real_gdp_growth",
  inflation: "hicp_inflation",
  unemployment: "unemployment_rate",
};
const extendedCategoryOrder: ExtendedCategory[] = ["fiscal", "external", "investment", "energy", "industry"];
const v4CountrySlugs = ["poland", "hungary", "czechia", "slovakia"];
const v4HistoricalYears = ["2021", "2022", "2023", "2024", "2025"];
const observationTableHeaders = [
  { label: "指标", className: "data-indicator-cell" },
  { label: "年份", className: "data-date-cell" },
  { label: "数值", className: "data-value-cell" },
  { label: "单位", className: "data-unit-cell" },
  { label: "状态", className: "data-status-cell" },
  { label: "来源", className: "data-source-cell" },
  { label: "更新时间", className: "data-updated-cell" },
  { label: "备注", className: "data-note-cell" },
];
const completeIndicatorDictionaryIds = [
  ...tableMetricIds.map((metricId) => economicMetricIndicatorIds[metricId]),
  ...v4TemplateIndicatorIds,
];

const computedIndicatorIds = new Set(["trade_balance", "automotive_export_share"]);

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

function indicatorCategoryLabel(value: IndicatorCategory) {
  const labels: Record<IndicatorCategory, string> = {
    macro: "基础宏观",
    fiscal: "财政",
    external: "外部经济",
    investment: "投资",
    energy: "能源",
    industry: "产业",
  };

  return labels[value];
}

function yesNoLabel(value: boolean) {
  return value ? "是" : "否";
}

function BooleanCell({ value }: { value: boolean }) {
  return (
    <span className={`boolean-cell-token ${value ? "boolean-cell-yes" : "boolean-cell-no"}`}>
      {yesNoLabel(value)}
    </span>
  );
}

function DictionaryToken({ children }: { children: ReactNode }) {
  return <span className="dictionary-token">{children}</span>;
}

function qualityStatusLabel(value: V4QualityStatus) {
  const labels: Record<V4QualityStatus, string> = {
    pass: "通过",
    warning: "有待接入",
    fail: "需修复",
  };

  return labels[value];
}

function qualityStatusClass(value: V4QualityStatus) {
  if (value === "pass") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (value === "warning") {
    return "bg-amber-50 text-amber-800";
  }

  return "bg-rose-50 text-rose-800";
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

function sourceReliabilityForName(sourceName: string | undefined): "A" | "B" | "C" | "D" {
  if (!sourceName) {
    return "D";
  }

  const normalized = sourceName.toLowerCase();
  if (normalized.includes("eurostat") || normalized.includes("statistics") || normalized.includes("statistical") || normalized.includes("central bank")) {
    return "A";
  }

  const sourceRecord = sourceTableRecords.find((source) => source.sourceName.toLowerCase() === normalized);
  return sourceRecord?.reliabilityLevel ?? "D";
}

function sourceStatusForReliability(level: "A" | "B" | "C" | "D", isPending: boolean): "official" | "manual" | "pending" | "sample" {
  if (isPending) {
    return "pending";
  }

  if (level === "A") {
    return "official";
  }

  if (level === "D") {
    return "sample";
  }

  return "manual";
}

function quantificationStatusLabel(value: ChinaProjectRecord["quantificationStatus"]) {
  const labels: Record<ChinaProjectRecord["quantificationStatus"], string> = {
    amount_available: "金额已接入",
    amount_missing: "金额缺失",
    partially_quantifiable: "部分可量化",
    not_quantifiable: "暂不可量化",
  };

  return labels[value];
}

function quantificationStatusClass(value: ChinaProjectRecord["quantificationStatus"]) {
  if (value === "amount_available" || value === "partially_quantifiable") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (value === "amount_missing") {
    return "bg-amber-50 text-amber-800";
  }

  return "bg-slate-50 text-slate-700";
}

function exposureVariableFitLabel(value: ChinaProjectRecord["exposureVariableFit"]) {
  const labels: Record<ChinaProjectRecord["exposureVariableFit"], string> = {
    strong_candidate: "强候选",
    partial_candidate: "部分候选",
    context_only: "仅作背景",
    not_ready: "暂不适合",
  };

  return labels[value];
}

function exposureVariableFitClass(value: ChinaProjectRecord["exposureVariableFit"]) {
  if (value === "strong_candidate") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (value === "partial_candidate") {
    return "bg-sky-50 text-sky-800";
  }

  if (value === "context_only") {
    return "bg-slate-50 text-slate-700";
  }

  return "bg-amber-50 text-amber-800";
}

function projectVerificationClass(value: ChinaProjectVerificationConclusion) {
  if (value === "quantifiable") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (value === "partially_quantifiable") {
    return "bg-sky-50 text-sky-800";
  }

  if (value === "background_only") {
    return "bg-slate-50 text-slate-700";
  }

  return "bg-rose-50 text-rose-800";
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

function UnitToken({ value }: { value: string }) {
  return <span className="data-unit-token">{value || "待接入"}</span>;
}

function SemanticCellPrefix({ label }: { label: string }) {
  return <span className="semantic-cell-prefix">{` ${label}：`}</span>;
}

function displayUnit(value: number | null, unit: string) {
  if (value === null) {
    return unit || "待接入";
  }

  return unit || "待接入";
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

function matrixMeanBucket(value: number | null, mean: number | null): V4CountryDerivedComparison["meanBucket"] {
  const label = matrixMeanComparison(value, mean);

  if (label === "高于均值") {
    return "above";
  }

  if (label === "低于均值") {
    return "below";
  }

  if (label === "等于均值") {
    return "equal";
  }

  return "pending";
}

function formatSignedMatrixValue(indicatorId: string, value: number | null) {
  if (value === null) {
    return "待比较";
  }

  if (Math.abs(value) < 0.0001) {
    return "0.0";
  }

  return `${value > 0 ? "+" : ""}${formatMatrixValue(indicatorId, value)}`;
}

function formatRank(value: number | null) {
  return value === null ? "待比较" : `第 ${value} 位`;
}

function formatRankDelta(value: number | null) {
  if (value === null) {
    return "待比较";
  }

  if (value === 0) {
    return "持平";
  }

  return value > 0 ? `上升 ${value} 位` : `下降 ${Math.abs(value)} 位`;
}

function comparisonFor(row: V4DerivedRow | undefined, countrySlug: string) {
  return row?.countryComparisons.find((item) => item.countrySlug === countrySlug);
}

function researchValueWithUnit(row: V4DerivedRow | undefined, value: number | null | undefined) {
  if (!row || value === null || value === undefined) {
    return "待接入";
  }

  return `${formatMatrixValue(row.indicatorId, value)} ${row.unit}`;
}

function compactResearchValue(row: V4DerivedRow, value: number | null) {
  if (value === null) {
    return "待接入";
  }

  return `${formatMatrixValue(row.indicatorId, value)} ${row.unit}`;
}

function compactSignedResearchValue(row: V4DerivedRow, value: number | null) {
  if (value === null) {
    return "待比较";
  }

  return `${formatSignedMatrixValue(row.indicatorId, value)} ${row.unit}`;
}

function signedResearchValue(row: V4DerivedRow, value: number | null) {
  if (value === null) {
    return "待比较";
  }

  return `${formatSignedMatrixValue(row.indicatorId, value)} ${row.unit}`;
}

function changeDirection(value: number | null) {
  if (value === null) {
    return "待比较";
  }

  if (Math.abs(value) < 0.0001) {
    return "基本持平";
  }

  return value > 0 ? "上升" : "下降";
}

function summarizeCategoryResearch(categoryRows: V4DerivedRow[], categoryObservations: ExtendedObservation[]): CategoryResearchSummary {
  if (categoryRows.length === 0) {
    return {
      highLow: "本板块指标尚未接入，无法形成高低位置摘要。",
      change: "本板块五年序列尚未接入，无法描述变化方向。",
      meanGap: "本板块 V4 均值尚未形成，暂不比较均值差距。",
      dataGap: "本板块观测值待接入。",
    };
  }

  const highLow = categoryRows
    .map((row) => `${row.label}：最高 ${row.highestCountries.join(" / ") || "待接入"}（${compactResearchValue(row, row.highest)}），最低 ${row.lowestCountries.join(" / ") || "待接入"}（${compactResearchValue(row, row.lowest)}）`)
    .join("；");

  const biggestChange = categoryRows
    .flatMap((row) => row.countryComparisons.map((comparison) => ({ row, comparison })))
    .filter((item): item is typeof item & { comparison: V4CountryDerivedComparison & { change: number } } => item.comparison.change !== null)
    .sort((a, b) => Math.abs(b.comparison.change) - Math.abs(a.comparison.change))[0];

  const change = biggestChange
    ? `${biggestChange.comparison.countryName}的${biggestChange.row.label}在 ${biggestChange.comparison.startYear}-${biggestChange.comparison.latestYear} 年${changeDirection(biggestChange.comparison.change)} ${signedResearchValue(biggestChange.row, biggestChange.comparison.change)}；该句只描述数值变化方向。`
    : "本板块可比较五年序列不足，暂不描述变化方向。";

  const biggestGap = categoryRows
    .flatMap((row) => row.countryComparisons.map((comparison) => ({ row, comparison })))
    .filter((item): item is typeof item & { comparison: V4CountryDerivedComparison & { gapToMean: number } } => item.comparison.gapToMean !== null)
    .sort((a, b) => Math.abs(b.comparison.gapToMean) - Math.abs(a.comparison.gapToMean))[0];

  const meanGap = biggestGap
    ? `${biggestGap.comparison.countryName}的${biggestGap.row.label}与 V4 均值差距最大，为 ${signedResearchValue(biggestGap.row, biggestGap.comparison.gapToMean)}；高于/低于均值仅表示数值位置。`
    : "本板块最新正式值不足，暂不计算与 V4 均值差距。";

  const pending = categoryObservations.filter((observation) => observation.status === "pending" || observation.value === null).length;
  const official = categoryObservations.filter((observation) => observation.status === "official" && observation.value !== null).length;
  const computed = categoryObservations.filter((observation) => observation.value !== null && /computed|计算/i.test(observation.note ?? "")).length;
  const dataGap = pending > 0
    ? `本板块共有 ${categoryObservations.length} 条观测记录，正式值 ${official} 条，待接入 ${pending} 条，计算值 ${computed} 条；待接入值不参与最新正式值比较。`
    : `本板块共有 ${categoryObservations.length} 条观测记录，正式值 ${official} 条，计算值 ${computed} 条；当前无待接入观测值。`;

  return {
    highLow,
    change,
    meanGap,
    dataGap,
  };
}

function rankByNumericValue(items: { countrySlug: string; countryName: string; value: number | null }[]) {
  const ranked = items
    .filter((item): item is typeof item & { value: number } => item.value !== null)
    .sort((a, b) => b.value - a.value);
  const ranks = new Map<string, number>();

  ranked.forEach((item, index) => {
    const previous = ranked[index - 1];
    ranks.set(item.countrySlug, previous && previous.value === item.value ? ranks.get(previous.countrySlug) ?? index + 1 : index + 1);
  });

  return ranks;
}

function dataValueClass(value: number | null) {
  return `data-value-token${value !== null && value < 0 ? " data-value-negative" : ""}`;
}

function ObservationTable({ children, minWidth = "1180px" }: { children: ReactNode; minWidth?: string }) {
  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table observation-data-table w-full border-separate border-spacing-0 text-left text-sm" style={{ minWidth }}>
        <colgroup>
          {observationTableHeaders.map((header) => (
            <col key={header.label} className={header.className} />
          ))}
        </colgroup>
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {observationTableHeaders.map((header) => (
              <th key={header.label} className={`${header.className} border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0`}>
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function compareValueClass(value: number | null, mean: number | null) {
  const bucket = matrixMeanBucket(value, mean);

  if (bucket === "above") {
    return "comparison-above";
  }

  if (bucket === "below") {
    return "comparison-below";
  }

  if (bucket === "equal") {
    return "comparison-equal";
  }

  return "";
}

function ObservationRows({ observations }: { observations: ExtendedObservation[] }) {
  return (
    <>
      {observations.map((observation) => {
        const indicator = getExtendedIndicator(observation.indicatorId);

        return (
          <tr key={`${observation.countrySlug}-${observation.indicatorId}-${observation.date}`} className="align-top">
            <td className="data-indicator-cell border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{indicator?.labelZh.replaceAll(" / ", "/") ?? observation.indicatorId}</td>
            <td className="data-date-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="年份" />{observation.date}</td>
            <td className="data-value-cell border-b border-[var(--line)] px-3 py-3 font-mono">
              <SemanticCellPrefix label="数值" />
              <span className={dataValueClass(observation.value)}>{formatObservationValue(observation.value, observation.indicatorId)}</span>
            </td>
            <td className="data-unit-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="单位" /><UnitToken value={displayUnit(observation.value, observation.unit)} /></td>
            <td className="data-status-cell border-b border-[var(--line)] px-3 py-3">
              <SemanticCellPrefix label="状态" />
              <DataStatusBadge status={observation.status} />
            </td>
            <td className="data-source-cell border-b border-[var(--line)] px-3 py-3">
              <SemanticCellPrefix label="来源" />
              <div className="flex flex-col gap-2 text-xs leading-5 text-[var(--muted)]">
                <SourceStatusBadge status={observation.status === "official" ? "official" : observation.status === "sample" ? "sample" : observation.status === "pending" ? "pending" : "manual"} />
                <SourceNameLink href={observation.sourceUrl}>{observation.sourceName}</SourceNameLink>
              </div>
            </td>
            <td className="data-updated-cell border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]"><SemanticCellPrefix label="更新时间" />{observation.updatedAt || "待接入"}</td>
            <td className="data-note-cell border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]"><SemanticCellPrefix label="备注" />{observation.note ?? "—"}</td>
          </tr>
        );
      })}
    </>
  );
}

const standardObservationHeaders = [
  "observation_id",
  "country_id",
  "indicator_id",
  "year",
  "period_type",
  "period",
  "value",
  "unit",
  "value_status",
  "source_id",
  "source_name",
  "source_url",
  "source_reliability",
  "source_status",
  "last_updated",
  "is_official_data",
  "is_pending",
  "is_calculated",
  "is_manual",
  "is_structural_sample",
  "is_in_cross_country_comparison",
  "is_in_five_year_change",
  "is_in_mean_gap",
  "is_in_ranking_change",
  "missing_reason",
  "calculation_method",
  "notes",
] as const;

function formatStandardObservationValue(value: number | null, indicatorId: string) {
  if (value === null) {
    return "待接入";
  }

  return formatMatrixValue(indicatorId, value);
}

function StandardObservationTable({ records }: { records: StandardObservationRecord[] }) {
  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table observation-data-table w-full min-w-[5600px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {standardObservationHeaders.map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.observation_id} className="align-top">
              <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{record.observation_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{record.country_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{record.indicator_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="年份" />{record.year}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{record.period_type}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{record.period}</td>
              <td className="data-value-cell border-b border-[var(--line)] px-3 py-3 font-mono">
                <SemanticCellPrefix label="数值" />
                <span className={dataValueClass(record.value)}>{formatStandardObservationValue(record.value, record.indicator_id)}</span>
              </td>
              <td className="data-unit-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="单位" /><UnitToken value={record.unit} /></td>
              <td className="data-status-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="状态" />{record.value_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{record.source_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]"><SemanticCellPrefix label="来源" />{record.source_name}</td>
              <td className="data-source-cell border-b border-[var(--line)] px-3 py-3"><SourceNameLink href={record.source_url}>来源链接</SourceNameLink></td>
              <td className="border-b border-[var(--line)] px-3 py-3">{record.source_reliability}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{record.source_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs"><SemanticCellPrefix label="更新时间" />{record.last_updated}</td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_official_data} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_pending} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_calculated} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_manual} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_structural_sample} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_in_cross_country_comparison} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_in_five_year_change} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_in_mean_gap} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_in_ranking_change} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{record.missing_reason}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{record.calculation_method}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]"><SemanticCellPrefix label="备注" />{record.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EconomicSourceNoteCell({
  links,
  status,
  updatedAt = "待接入",
  note,
}: {
  links: EconomicSourceLink[];
  status: "official" | "pending";
  updatedAt?: string;
  note: string;
}) {
  return (
    <>
      <td className="data-source-cell border-b border-[var(--line)] px-3 py-3">
        <SemanticCellPrefix label="来源" />
        <div className="flex flex-col gap-2 text-xs leading-5 text-[var(--muted)]">
          <SourceStatusBadge status={status === "official" ? "official" : "pending"} />
          <SourceLinkList links={links} compact />
        </div>
      </td>
      <td className="data-updated-cell border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]"><SemanticCellPrefix label="更新时间" />{updatedAt}</td>
      <td className="data-note-cell border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]"><SemanticCellPrefix label="备注" />{note}</td>
    </>
  );
}

type V4MatrixCountry = {
  slug: string;
  nameZh: string;
};

function V4MatrixColGroup({ matrixCountries }: { matrixCountries: V4MatrixCountry[] }) {
  return (
    <colgroup>
      <col className="v4-matrix-indicator-col" />
      {matrixCountries.map((country) => (
        <col key={country.slug} className="v4-matrix-country-col" />
      ))}
      <col className="v4-matrix-derived-col" />
      <col className="v4-matrix-derived-col" />
      <col className="v4-matrix-derived-col" />
    </colgroup>
  );
}

function V4MatrixHeader({ matrixCountries }: { matrixCountries: V4MatrixCountry[] }) {
  return (
    <thead>
      <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
        <th className="border-b border-[var(--line)] pb-3 pr-3 font-semibold">指标</th>
        {matrixCountries.map((country) => (
          <th key={country.slug} className="border-b border-[var(--line)] px-2 pb-3 text-right font-semibold">{country.nameZh}</th>
        ))}
        <th className="border-b border-[var(--line)] px-2 pb-3 text-right font-semibold">最高值</th>
        <th className="border-b border-[var(--line)] px-2 pb-3 text-right font-semibold">最低值</th>
        <th className="border-b border-[var(--line)] px-2 pb-3 text-right font-semibold">V4 均值</th>
      </tr>
    </thead>
  );
}

function V4MatrixMeta({ indicator }: { indicator: ReturnType<typeof getExtendedIndicator> }) {
  return (
    <p className="mt-1 text-[10px] text-[var(--muted)]">
      {indicator?.unit ?? ""} / {indicator ? extendedIndicatorLabels[indicator.category] : "待接入"}
    </p>
  );
}

function V4MatrixValueCell({
  indicatorId,
  observation,
  mean,
}: {
  indicatorId: string;
  observation: ExtendedObservation | undefined;
  mean: number | null;
}) {
  const comparison = matrixMeanComparison(observation?.value ?? null, mean);

  return (
    <td className={`border-b border-[var(--line)] px-2 py-3 text-right ${compareValueClass(observation?.value ?? null, mean)}`}>
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
}

function V4MatrixDerivedCell({ indicatorId, value, label }: { indicatorId: string; value: number | null; label: string }) {
  return (
    <td className="border-b border-[var(--line)] px-2 py-3 text-right">
      <span className={dataValueClass(value)}>{formatMatrixValue(indicatorId, value)}</span>
      <p className="mt-1 whitespace-nowrap text-[10px] text-[var(--muted)]">{label || "待接入"}</p>
    </td>
  );
}

function V4CategoryResearchSummary({ summary }: { summary: CategoryResearchSummary }) {
  const items = [
    { label: "主要高低位置", body: summary.highLow },
    { label: "五年变化方向", body: summary.change },
    { label: "与 V4 均值差距", body: summary.meanGap },
    { label: "数据缺口说明", body: summary.dataGap },
  ];

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {items.map((item) => (
        <article key={item.label} className="rounded-2xl border border-[var(--line)] bg-white/75 p-4">
          <p className="text-xs font-semibold text-[var(--muted)]">{item.label}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
        </article>
      ))}
    </div>
  );
}

function V4CategoryMatrix({
  category,
  matrixCountries,
  observationMaps,
  derivedRows,
  categoryObservations,
}: {
  category: ExtendedCategory;
  matrixCountries: V4MatrixCountry[];
  observationMaps: Map<string, Map<string, ExtendedObservation>>;
  derivedRows: V4DerivedRow[];
  categoryObservations: ExtendedObservation[];
}) {
  const indicatorIds = v4TemplateIndicatorIds.filter((indicatorId) => getExtendedIndicator(indicatorId)?.category === category);
  const summary = summarizeCategoryResearch(
    derivedRows.filter((row) => getExtendedIndicator(row.indicatorId)?.category === category),
    categoryObservations,
  );

  if (indicatorIds.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/65 p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">V4 Horizontal Axis</p>
          <h3 className="mt-2 text-lg font-semibold">{extendedIndicatorLabels[category]}横向比较</h3>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">该横向轴只显示本板块指标，便于在同一数据板块内比较 V4 四国最新正式值。</p>
        </div>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">{indicatorIds.length} 指标</span>
      </div>
      <V4CategoryResearchSummary summary={summary} />
      <div className="mt-4 wide-table-scroll max-w-full">
        <table className="research-data-table v4-matrix-table w-full min-w-[960px] border-separate border-spacing-0 text-left text-sm">
          <V4MatrixColGroup matrixCountries={matrixCountries} />
          <V4MatrixHeader matrixCountries={matrixCountries} />
          <tbody>
            {indicatorIds.map((indicatorId) => {
              const indicator = getExtendedIndicator(indicatorId);
              const countryObservations = matrixCountries.map((country) => ({
                country,
                observation: observationMaps.get(country.slug)?.get(indicatorId),
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
                <tr key={`${category}-${indicatorId}`} className="align-top">
                  <td className="border-b border-[var(--line)] py-3 pl-0 pr-3">
                    <p className="font-semibold">{indicator?.labelZh ?? indicatorId}</p>
                    <V4MatrixMeta indicator={indicator} />
                  </td>
                  {countryObservations.map(({ country, observation }) => (
                    <V4MatrixValueCell key={`${country.slug}-${indicatorId}`} indicatorId={indicatorId} observation={observation} mean={mean} />
                  ))}
                  <V4MatrixDerivedCell indicatorId={indicatorId} value={highest} label={highestCountries.join(" / ")} />
                  <V4MatrixDerivedCell indicatorId={indicatorId} value={lowest} label={lowestCountries.join(" / ")} />
                  <V4MatrixDerivedCell indicatorId={indicatorId} value={mean} label="算术平均" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function V4DerivedComparisonTable({ rows }: { rows: V4DerivedTableRow[] }) {
  const countryOrder = [
    { slug: "poland", label: "波兰数值" },
    { slug: "hungary", label: "匈牙利数值" },
    { slug: "czechia", label: "捷克数值" },
    { slug: "slovakia", label: "斯洛伐克数值" },
  ];

  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table derived-comparison-table w-full min-w-[2860px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {[
              "板块",
              "指标",
              "最新可比年份",
              ...countryOrder.map((country) => country.label),
              "最高值",
              "最高国家",
              "最低值",
              "最低国家",
              "V4 均值",
              "与均值差距最大的国家",
              "最大均值差距",
              "五年变化最大的国家",
              "五年变化数值",
              "待接入观测值数量",
              "计算值数量",
              "解释边界",
              "备注",
            ].map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={`${item.category}-${item.row.indicatorId}-derived-table`} className="align-top">
              <td className="border-b border-[var(--line)] py-3 pl-0 pr-3"><DictionaryToken>{item.categoryLabel}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3">
                <p className="font-semibold">{item.row.label}</p>
                <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">{item.row.indicatorId}</p>
              </td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{item.latestComparableYear}</td>
              {countryOrder.map((country) => (
                <td key={`${item.row.indicatorId}-${country.slug}`} className="border-b border-[var(--line)] px-3 py-3 font-mono">
                  <span className={dataValueClass(item.valuesByCountry[country.slug])}>{compactResearchValue(item.row, item.valuesByCountry[country.slug])}</span>
                </td>
              ))}
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono">{compactResearchValue(item.row, item.row.highest)}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{item.highestCountry}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono">{compactResearchValue(item.row, item.row.lowest)}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{item.lowestCountry}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono">{compactResearchValue(item.row, item.row.mean)}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{item.biggestMeanGapCountry}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono">{compactSignedResearchValue(item.row, item.biggestMeanGapValue)}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{item.biggestChangeCountry}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono">{compactSignedResearchValue(item.row, item.biggestChangeValue)}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-center font-mono">{item.pendingObservationCount}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-center font-mono">{item.computedObservationCount}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">仅表示事实位置，不代表风险、预测或政策优劣。</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">派生自 2021-2025 V4 扩展观测值；待接入值不参与最高、最低和均值计算。</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CountryMetadataTable() {
  const headers = [
    "country_id",
    "中文名",
    "英文名",
    "本地名",
    "ISO2",
    "ISO3",
    "V4",
    "EU",
    "Eurozone",
    "Schengen",
    "区域分组",
    "首都",
    "货币",
    "国家基础档案状态",
    "基础宏观数据状态",
    "V4 扩展数据状态",
    "对华项目数据状态",
    "新闻事件数据状态",
    "地图与区域层状态",
    "政府首脑",
    "政府首脑来源状态",
    "国家元首",
    "国家元首来源状态",
    "政治样本状态",
    "V4 横向比较",
    "基础宏观十国比较",
    "对华项目核验",
    "未来模型候选",
    "最后更新日期",
    "备注",
  ];

  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table country-metadata-table w-full min-w-[4200px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {headers.map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {countryMetadataRecords.map((country) => (
            <tr key={country.country_id} className="align-top">
              <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{country.country_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{country.name_zh}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.name_en}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.local_name}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{country.iso2}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{country.iso3}</td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={country.is_v4} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={country.is_eu_member} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={country.is_eurozone_member} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={country.is_schengen_member} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{country.regional_group}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.capital}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.currency}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.country_profile_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.basic_macro_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.v4_extended_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.china_project_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.news_event_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.map_region_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.head_of_government}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.head_of_government_source_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.head_of_state}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.head_of_state_source_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{country.political_sample_status}</td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={country.included_in_v4_comparison} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={country.included_in_macro_ten_country_comparison} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={country.included_in_china_project_verification} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={country.future_model_candidate} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{country.last_updated_at}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{country.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResearchDataExportLinks() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {researchDataLayerFiles.map((layer) => (
        <article key={layer.id} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
          <p className="font-mono text-xs font-semibold text-[var(--accent)]">{layer.label}</p>
          <p className="mt-2 min-h-[3rem] text-xs leading-5 text-[var(--muted)]">{layer.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`${basePath}/research-data/${layer.id}.json`} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]">
              JSON
            </a>
            <a href={`${basePath}/research-data/${layer.id}.csv`} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]">
              CSV
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

function IndicatorDictionaryTable({ rows }: { rows: IndicatorDictionaryRecord[] }) {
  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table indicator-dictionary-table w-full min-w-[3800px] border-separate border-spacing-0 text-left text-sm">
        <colgroup>
          <col className="indicator-id-col" />
          <col className="indicator-name-col" />
          <col className="indicator-name-en-col" />
          <col className="indicator-category-col" />
          <col className="indicator-section-col" />
          <col className="indicator-unit-col" />
          <col className="indicator-frequency-col" />
        </colgroup>
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {["indicator_id", "中文名", "英文名", "指标类别", "所属板块", "单位", "频率", "国家覆盖范围", "年份覆盖范围", "主来源", "备用来源", "来源等级", "原始值", "计算值", "派生值", "进入横向比较", "进入五年变化", "进入均值差距", "进入排名变化", "未来模型候选变量", "数值上升含义", "缺失值处理规则", "待接入处理规则", "更新时间", "备注"].map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((indicator) => {
            const isComputed = computedIndicatorIds.has(indicator.indicatorId) || indicator.transform.includes("-");
            const isV4Indicator = v4TemplateIndicatorIds.includes(indicator.indicatorId as typeof v4TemplateIndicatorIds[number]);
            const sourceLevel = indicator.sourcePriority.some((source) => /Eurostat|统计|央行|IMF|OECD|UNCTAD|World Bank/i.test(source)) ? "A" : "B";

            return (
              <tr key={indicator.indicatorId} className="align-top">
                <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{indicator.indicatorId}</td>
                <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{indicator.nameZh}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{indicator.nameEn}</td>
                <td className="dictionary-section-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="指标类别" /><DictionaryToken>{indicatorCategoryLabel(indicator.category)}</DictionaryToken></td>
                <td className="dictionary-section-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="所属板块" /><DictionaryToken>{indicatorCategoryLabel(indicator.category)}</DictionaryToken></td>
                <td className="dictionary-unit-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="单位" /><DictionaryToken>{indicator.unit}</DictionaryToken></td>
                <td className="dictionary-frequency-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="频率" /><DictionaryToken>{indicator.frequency}</DictionaryToken></td>
                <td className="border-b border-[var(--line)] px-3 py-3">{isV4Indicator ? "V4 四国" : "十国"}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">2021-2025</td>
                <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{indicator.sourcePriority[0] ?? "待接入"}</td>
                <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{indicator.sourcePriority.slice(1).join(" / ") || "待接入"}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{reliabilityLevelLabel(sourceLevel)}</td>
                <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={!isComputed} /></td>
                <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={isComputed} /></td>
                <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={false} /></td>
                <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={indicator.includedInDerivedComparison} /></td>
                <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={indicator.includedInDerivedComparison} /></td>
                <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={indicator.includedInDerivedComparison} /></td>
                <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={indicator.includedInDerivedComparison} /></td>
                <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={indicator.futureModelEligible} /></td>
                <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{indicator.upwardMeaning}</td>
                <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{indicator.missingValueTreatment}</td>
                <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">待接入行保留指标单位，数值显示“待接入”，状态与来源状态均显示“待接入”。</td>
                <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{indicator.updatedAt}</td>
                <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{indicator.transform}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SourceDictionaryTable({ rows }: { rows: SourceDictionaryRecord[] }) {
  return (
    <div className="mt-4 wide-table-scroll max-w-full">
      <table className="research-data-table source-dictionary-table w-full min-w-[2920px] border-separate border-spacing-0 text-left text-sm">
        <colgroup>
          <col className="source-id-col" />
          <col className="source-name-col" />
          <col className="source-name-en-col" />
          <col className="source-type-col" />
          <col className="source-coverage-col" />
          <col className="source-indicator-col" />
          <col className="source-link-col" />
          <col className="source-reliability-col" />
          <col className="source-status-col" />
          <col className="source-frequency-col" />
          <col className="boolean-col" />
          <col className="boolean-col" />
          <col className="boolean-col" />
          <col className="boolean-col" />
        </colgroup>
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {["source_id", "来源中文名", "来源英文名", "来源类型", "国家或地区覆盖", "指标覆盖范围", "链接", "可靠性等级", "来源状态", "更新频率", "是否可作为正式数据", "是否可作为事件依据", "是否仅作补充线索", "是否不进入分析", "最后检查日期", "备注"].map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((source) => (
            <tr key={source.sourceId} className="align-top">
              <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{source.sourceId}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{source.nameZh}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{source.nameEn}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{source.sourceType}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{source.coverage}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{source.indicatorCoverage}</td>
              <td className="data-source-cell border-b border-[var(--line)] px-3 py-3"><SourceNameLink href={source.url}>来源链接</SourceNameLink></td>
              <td className="border-b border-[var(--line)] px-3 py-3">{reliabilityLevelLabel(source.reliabilityLevel)}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><SourceStatusBadge status={source.sourceStatus} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3">{source.updateFrequency}</td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={source.canBeOfficialData} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={source.canBeEventBasis} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={source.supplementalOnly} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={source.excludedFromAnalysis} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{source.lastCheckedAt}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{source.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function V4QualityDetailTable({ countryNameBySlug }: { v4Quality: V4DataQualitySummary; countryNameBySlug: Map<string, string> }) {
  const records = dataQualityChecksData.records as DataQualityCheckRecord[];
  const observationById = useMemo(() => new Map(observationsData.records.map((observation) => [observation.observation_id, observation])), []);
  const [filters, setFilters] = useState<QualityFilterState>({
    country: "all",
    indicator: "all",
    year: "all",
    status: "all",
    reliability: "all",
    official: "all",
    pending: "all",
    computed: "all",
    manual: "all",
    comparison: "all",
    fiveYearChange: "all",
    meanGap: "all",
    rankChange: "all",
    qualityStatus: "all",
  });
  const filterOptions = useMemo(() => {
    const countries = Array.from(new Set(records.map((record) => record.country_id))).map((countryId) => ({
      value: countryId,
      label: countryNameBySlug.get(countryId) ?? countryId,
    }));
    const indicators = Array.from(new Set(records.map((record) => record.indicator_id))).map((indicatorId) => ({
      value: indicatorId,
      label: getExtendedIndicator(indicatorId)?.labelZh ?? indicatorId,
    }));
    const years = Array.from(new Set(records.map((record) => record.year))).sort();
    const statuses = Array.from(new Set(records.map((record) => observationById.get(record.observation_id)?.value_status ?? "待接入"))).sort();
    const qualityStatuses = Array.from(new Set(records.map((record) => record.quality_status))).sort();

    return { countries, indicators, years, statuses, qualityStatuses };
  }, [countryNameBySlug, observationById, records]);
  const qualitySummaryCards = useMemo(() => {
    const reliabilityCounts = (["A", "B", "C", "D"] as const).map((level) => ({
      label: `${level} 级来源数量`,
      value: records.filter((record) => observationById.get(record.observation_id)?.source_reliability === level).length,
    }));

    return [
      { label: "总观测位置", value: records.length },
      { label: "正式数据数量", value: records.filter((record) => record.is_official_data).length },
      { label: "待接入数量", value: records.filter((record) => record.is_pending).length },
      { label: "计算值数量", value: records.filter((record) => record.is_calculated).length },
      { label: "人工整理数量", value: records.filter((record) => record.is_manual).length },
      { label: "通过数量", value: records.filter((record) => record.quality_status === "通过").length },
      { label: "部分通过数量", value: records.filter((record) => record.quality_status === "部分通过").length },
      { label: "需复核数量", value: records.filter((record) => record.quality_status === "需复核").length },
      { label: "不进入分析数量", value: records.filter((record) => record.quality_status === "不进入分析").length },
      ...reliabilityCounts,
    ];
  }, [observationById, records]);
  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const observation = observationById.get(record.observation_id);
        const reliabilityLevel = observation?.source_reliability ?? "D";
        const valueStatus = observation?.value_status ?? "待接入";
        const derivedReady = record.is_ready_for_derived_comparison;
        const matchesCountry = filters.country === "all" || record.country_id === filters.country;
        const matchesIndicator = filters.indicator === "all" || record.indicator_id === filters.indicator;
        const matchesYear = filters.year === "all" || record.year === filters.year;
        const matchesStatus = filters.status === "all" || valueStatus === filters.status;
        const matchesReliability = filters.reliability === "all" || reliabilityLevel === filters.reliability;
        const matchesOfficial = filters.official === "all" || (filters.official === "yes" ? record.is_official_data : !record.is_official_data);
        const matchesPending = filters.pending === "all" || (filters.pending === "yes" ? record.is_pending : !record.is_pending);
        const matchesComputed = filters.computed === "all" || (filters.computed === "yes" ? record.is_calculated : !record.is_calculated);
        const matchesManual = filters.manual === "all" || (filters.manual === "yes" ? record.is_manual : !record.is_manual);
        const matchesComparison = filters.comparison === "all" || (filters.comparison === "yes" ? record.is_cross_country_comparable : !record.is_cross_country_comparable);
        const matchesFiveYearChange = filters.fiveYearChange === "all" || (filters.fiveYearChange === "yes" ? record.is_time_series_comparable : !record.is_time_series_comparable);
        const matchesMeanGap = filters.meanGap === "all" || (filters.meanGap === "yes" ? derivedReady : !derivedReady);
        const matchesRankChange = filters.rankChange === "all" || (filters.rankChange === "yes" ? derivedReady : !derivedReady);
        const matchesQualityStatus = filters.qualityStatus === "all" || record.quality_status === filters.qualityStatus;

        return matchesCountry && matchesIndicator && matchesYear && matchesStatus && matchesReliability && matchesOfficial && matchesPending && matchesComputed && matchesManual && matchesComparison && matchesFiveYearChange && matchesMeanGap && matchesRankChange && matchesQualityStatus;
      }),
    [filters, observationById, records],
  );
  const updateFilter = (key: keyof QualityFilterState, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const yesNoFilterOptions = [
    ["all", "全部"],
    ["yes", "是"],
    ["no", "否"],
  ] as const;

  return (
    <div className="mt-4">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-3">
        <div className="mb-4 grid gap-2 md:grid-cols-3 xl:grid-cols-5">
          {qualitySummaryCards.map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--line)] bg-white/75 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{item.label}</p>
              <p className="mt-1 font-mono text-lg font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            国家
            <select value={filters.country} onChange={(event) => updateFilter("country", event.target.value)} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--foreground)]">
              <option value="all">全部国家</option>
              {filterOptions.countries.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            指标
            <select value={filters.indicator} onChange={(event) => updateFilter("indicator", event.target.value)} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--foreground)]">
              <option value="all">全部指标</option>
              {filterOptions.indicators.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            年份
            <select value={filters.year} onChange={(event) => updateFilter("year", event.target.value)} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--foreground)]">
              <option value="all">全部年份</option>
              {filterOptions.years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            状态
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--foreground)]">
              <option value="all">全部状态</option>
              {filterOptions.statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            来源等级
            <select value={filters.reliability} onChange={(event) => updateFilter("reliability", event.target.value)} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--foreground)]">
              <option value="all">全部等级</option>
              <option value="A">A 级</option>
              <option value="B">B 级</option>
              <option value="C">C 级</option>
              <option value="D">D 级</option>
            </select>
          </label>
          {([
            ["official", "是否正式数据"],
            ["pending", "是否待接入"],
            ["computed", "是否计算值"],
            ["manual", "是否人工整理"],
            ["comparison", "是否进入横向比较"],
            ["fiveYearChange", "是否进入五年变化"],
            ["meanGap", "是否进入均值差距"],
            ["rankChange", "是否进入排名变化"],
          ] as const).map(([key, label]) => (
            <label key={key} className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
              {label}
              <select value={filters[key]} onChange={(event) => updateFilter(key, event.target.value)} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--foreground)]">
                {yesNoFilterOptions.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
              </select>
            </label>
          ))}
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            质量状态
            <select value={filters.qualityStatus} onChange={(event) => updateFilter("qualityStatus", event.target.value)} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--foreground)]">
              <option value="all">全部质量状态</option>
              {filterOptions.qualityStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">当前显示 {filteredRecords.length} / {records.length} 个观测位置。</p>
      </div>
      <div className="mt-4 wide-table-scroll max-w-full">
        <table className="research-data-table w-full min-w-[4300px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              {["check_id", "observation_id", "国家", "指标", "年份", "数值存在", "单位存在", "来源名称存在", "来源链接存在", "来源等级存在", "状态存在", "更新时间存在", "正式数据", "待接入", "计算值", "人工整理", "横向可比", "时间序列可比", "方法一致", "可导出", "可派生比较", "未来模型候选", "缺失原因", "质量状态", "质量备注"].map((header) => (
                <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => {
              const indicator = getExtendedIndicator(record.indicator_id);

              return (
                <tr key={record.check_id} className="align-top">
                  <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{record.check_id}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{record.observation_id}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{countryNameBySlug.get(record.country_id) ?? record.country_id}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">
                    <p className="font-semibold">{indicator?.labelZh ?? record.indicator_id}</p>
                    <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">{record.indicator_id}</p>
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="年份" />{record.year}</td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.value_present} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.unit_present} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.source_name_present} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.source_url_present} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.source_reliability_present} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.status_present} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.last_updated_present} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_official_data} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_pending} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_calculated} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_manual} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_cross_country_comparable} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_time_series_comparable} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_methodologically_consistent} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_ready_for_export} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_ready_for_derived_comparison} /></td>
                  <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={record.is_ready_for_future_model_candidate} /></td>
                  <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]"><SemanticCellPrefix label="缺失原因" />{record.missing_reason}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{record.quality_status}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]"><SemanticCellPrefix label="质量备注" />{record.quality_notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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
  const verificationResults = projects.map((project) => verifyChinaProject(project));
  const verificationCounts = {
    quantifiable: verificationResults.filter((item) => item.conclusion === "quantifiable").length,
    partiallyQuantifiable: verificationResults.filter((item) => item.conclusion === "partially_quantifiable").length,
    backgroundOnly: verificationResults.filter((item) => item.conclusion === "background_only").length,
    excluded: verificationResults.filter((item) => item.conclusion === "excluded").length,
  };

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
        <div>
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
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            当前显示 {filteredProjects.length} 条；核验规则：有金额 + 有主体 + 有年份 + 有来源 = 可量化；无金额但有明确事件和主体 = 部分可量化；只有新闻线索 = 仅作背景；无可靠来源 = 不进入分析。
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">可量化 {verificationCounts.quantifiable}</span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">部分可量化 {verificationCounts.partiallyQuantifiable}</span>
            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-slate-700">仅作背景 {verificationCounts.backgroundOnly}</span>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-800">不进入分析 {verificationCounts.excluded}</span>
          </div>
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
        <div>
          <p className="mb-2 text-[11px] text-[var(--muted)]">字段较多，请横向滚动查看完整项目表；每列已固定宽度，避免文字被挤成竖排。</p>
          <div className="wide-table-scroll max-w-full">
          <table className="research-data-table china-project-table border-separate border-spacing-0 text-left text-sm">
            <colgroup>
              {[220, 90, 170, 160, 280, 280, 140, 100, 130, 360, 260, 130, 380, 380, 110, 240, 320, 140, 280, 160, 380, 240, 380].map((width, index) => (
                <col key={index} style={{ width }} />
              ))}
            </colgroup>
            <thead>
              <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                {["项目名称", "国家", "地区/城市", "行业", "中国主体", "当地主体", "金额", "币种", "核验结论", "核验理由", "核验规则", "金额状态", "金额证据/缺失原因", "主体核验", "年份", "项目状态", "项目状态时间线", "来源", "来源等级", "是否可量化", "暴露变量适配", "标签", "备注"].map((header) => (
                  <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const verification = verifyChinaProject(project);

                return (
                <tr key={project.projectId} className="align-top">
                  <td className="text-cell border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{project.projectName}</td>
                  <td className="nowrap-cell border-b border-[var(--line)] px-3 py-3">{countryName}</td>
                  <td className="text-cell border-b border-[var(--line)] px-3 py-3">{project.regionName || "待接入"}</td>
                  <td className="text-cell border-b border-[var(--line)] px-3 py-3">{project.sector || "待接入"}</td>
                  <td className="text-cell border-b border-[var(--line)] px-3 py-3">{project.chineseActor || "待接入"}</td>
                  <td className="text-cell border-b border-[var(--line)] px-3 py-3">{project.localActor || "待接入"}</td>
                  <td className="data-value-cell border-b border-[var(--line)] px-3 py-3 font-mono">
                    <span className={dataValueClass(project.amount)}>{project.amount === null ? "—" : project.amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}</span>
                  </td>
                  <td className="data-unit-cell border-b border-[var(--line)] px-3 py-3"><UnitToken value={project.currency ?? "—"} /></td>
                  <td className="border-b border-[var(--line)] px-3 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${projectVerificationClass(verification.conclusion)}`}>
                      {chinaProjectVerificationLabel(verification.conclusion)}
                    </span>
                  </td>
                  <td className="text-cell border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">{verification.reason}</td>
                  <td className="text-cell border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">{verification.rule}</td>
                  <td className="data-status-cell border-b border-[var(--line)] px-3 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${project.amount === null ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                      {project.amount === null ? "金额缺失" : "金额已接入"}
                    </span>
                  </td>
                  <td className="text-cell border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">{project.amountEvidence}</td>
                  <td className="text-cell border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">{project.actorEvidence}</td>
                  <td className="nowrap-cell border-b border-[var(--line)] px-3 py-3">{project.year || "待接入"}</td>
                  <td className="data-status-cell border-b border-[var(--line)] px-3 py-3">
                    <div className="flex flex-col gap-2">
                      <DataStatusBadge status={project.status} />
                      <span className="text-xs text-[var(--muted)]">{project.projectStatus}</span>
                    </div>
                  </td>
                  <td className="text-cell border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">
                    <ol className="grid gap-1">
                      {project.statusTimeline.map((item, index) => (
                        <li key={`${project.projectId}-${index}`} className="project-timeline-item">{item}</li>
                      ))}
                    </ol>
                  </td>
                  <td className="data-source-cell border-b border-[var(--line)] px-3 py-3">
                    <div className="flex flex-col gap-2">
                      <SourceStatusBadge status={project.status === "official" ? "official" : project.status === "sample" ? "sample" : project.status === "pending" ? "pending" : "manual"} />
                      <SourceNameLink href={project.sourceUrl}>来源链接</SourceNameLink>
                    </div>
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-3">
                    <span className="inline-flex whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)]">{reliabilityLevelLabel(project.sourceReliabilityLevel)}</span>
                    <p className="text-cell mt-1 text-[10px] text-[var(--muted)]">{reliabilityLevelDescription(project.sourceReliabilityLevel)}</p>
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${quantificationStatusClass(project.quantificationStatus)}`}>
                      {quantificationStatusLabel(project.quantificationStatus)}
                    </span>
                    <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">当前仅标注字段质量</p>
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${exposureVariableFitClass(project.exposureVariableFit)}`}>
                      {exposureVariableFitLabel(project.exposureVariableFit)}
                    </span>
                    <p className="text-cell mt-1 text-[10px] text-[var(--muted)]">{project.exposureVariableNote}</p>
                  </td>
                  <td className="text-cell border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">{project.riskTags.length > 0 ? project.riskTags.join(" / ") : "待接入"}</td>
                  <td className="text-cell border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">{project.note || "—"}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
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
  const isV4SelectedCountry = selectedCountry ? v4CountrySlugs.includes(selectedCountry.slug) : false;
  const visibleDataModes = dataModes.filter((mode) => mode.id !== "comparison" || isV4SelectedCountry);

  useEffect(() => {
    if (!isV4SelectedCountry && activeMode === "comparison") {
      setActiveMode("economy");
    }
  }, [activeMode, isV4SelectedCountry]);

  if (!selectedCountry) {
    return null;
  }

  const economicRows = getEconomicFiveYearRows(selectedCountry.slug);
  const latestEconomicRow = getLatestEconomicRow(selectedCountry.slug);
  const economicPolicy = getEconomicSourcePolicy(selectedCountry.slug);
  const activeModeInfo = visibleDataModes.find((mode) => mode.id === activeMode) ?? visibleDataModes[0] ?? dataModes[0];
  const activeMetricInfo = economicMetricOptions.find((metric) => metric.id === activeMetric) ?? economicMetricOptions[0];
  const metricValues = economicRows.map((row) => valueFor(row, activeMetric)).filter((value): value is number => value !== null);
  const metricMax = Math.max(1, ...metricValues.map((value) => Math.abs(value)));
  const extendedObservations = getExtendedObservations(selectedCountry.slug);
  const projectRecords = getChinaProjectRecords(selectedCountry.slug);
  const countryTableRecord = getCountryTableRecord(selectedCountry.slug);
  const newsEventRecords = getNewsEventRecords(selectedCountry.slug);
  const completeIndicatorDictionaryRows = completeIndicatorDictionaryIds
    .map((indicatorId) => indicatorDictionaryRecords.find((indicator) => indicator.indicatorId === indicatorId))
    .filter((indicator): indicator is NonNullable<typeof indicator> => Boolean(indicator));
  const v4TemplateCoverage = getV4TemplateCoverage(selectedCountry.slug);
  const v4Countries = v4CountrySlugs
    .map((slug) => countries.find((country) => country.slug === slug))
    .filter((country): country is NonNullable<typeof country> => Boolean(country));
  const v4ObservationMaps = new Map(
    v4Countries.map((country) => [
      country.slug,
      new Map(v4TemplateIndicatorIds.map((indicatorId) => [indicatorId, getLatestExtendedObservation(country.slug, indicatorId)])),
    ]),
  );
  const v4SeriesMaps = new Map(v4Countries.map((country) => [country.slug, getExtendedObservations(country.slug)]));
  const v4CoverageItems = v4Countries.map((country) => {
    const coverage = getV4TemplateCoverage(country.slug);

    return {
      country,
      coverage,
    };
  });
  const v4TotalExpected = v4CoverageItems.reduce((sum, item) => sum + item.coverage.total, 0);
  const v4TotalPresent = v4CoverageItems.reduce((sum, item) => sum + item.coverage.present.length, 0);
  const v4HistoricalCells = v4Countries.flatMap((country) => {
    const rows = v4SeriesMaps.get(country.slug) ?? [];

    return v4TemplateIndicatorIds.flatMap((indicatorId) =>
      v4HistoricalYears.map((year) => rows.find((observation) => observation.indicatorId === indicatorId && observation.date === year)),
    );
  });
  const v4HistoricalExpected = v4Countries.length * v4TemplateIndicatorIds.length * v4HistoricalYears.length;
  const v4HistoricalPresent = v4HistoricalCells.filter(Boolean).length;
  const v4HistoricalOfficial = v4HistoricalCells.filter((observation) => observation?.status === "official" && observation.value !== null).length;
  const v4HistoricalPending = v4HistoricalCells.filter((observation) => observation?.status === "pending" || observation?.value === null).length;
  const v4Quality = getV4DataQualitySummary();
  const countryNameBySlug = new Map(v4Countries.map((country) => [country.slug, country.nameZh]));
  const v4DerivedRows: V4DerivedRow[] = v4TemplateIndicatorIds.map((indicatorId) => {
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
    const countryComparisons = v4Countries.map((country) => {
      const series = (v4SeriesMaps.get(country.slug) ?? [])
        .filter((observation) => observation.indicatorId === indicatorId && observation.status === "official" && observation.value !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
      const startObservation = series[0];
      const latestObservation = series[series.length - 1];
      const startValue = startObservation?.value ?? null;
      const latestValue = latestObservation?.value ?? null;

      return {
        countrySlug: country.slug,
        countryName: country.nameZh,
        startYear: startObservation?.date ?? null,
        startValue,
        latestYear: latestObservation?.date ?? null,
        latestValue,
        change: startValue !== null && latestValue !== null ? latestValue - startValue : null,
        gapToMean: latestValue !== null && mean !== null ? latestValue - mean : null,
        meanBucket: matrixMeanBucket(latestValue, mean),
      };
    });
    const startRanks = rankByNumericValue(countryComparisons.map((item) => ({ countrySlug: item.countrySlug, countryName: item.countryName, value: item.startValue })));
    const latestRanks = rankByNumericValue(countryComparisons.map((item) => ({ countrySlug: item.countrySlug, countryName: item.countryName, value: item.latestValue })));
    const rankChanges = countryComparisons.map((item) => {
      const startRank = startRanks.get(item.countrySlug) ?? null;
      const latestRank = latestRanks.get(item.countrySlug) ?? null;

      return {
        countrySlug: item.countrySlug,
        countryName: item.countryName,
        startRank,
        latestRank,
        rankDelta: startRank !== null && latestRank !== null ? startRank - latestRank : null,
      };
    });

    return {
      indicatorId,
      label: indicator?.labelZh ?? indicatorId,
      unit: indicator?.unit ?? "",
      highest,
      highestCountries: highest === null ? [] : availableObservations.filter((item) => item.observation.value === highest).map((item) => item.country.nameZh),
      lowest,
      lowestCountries: lowest === null ? [] : availableObservations.filter((item) => item.observation.value === lowest).map((item) => item.country.nameZh),
      mean,
      aboveMeanCountries: availableObservations.filter((item) => matrixMeanBucket(item.observation.value, mean) === "above").map((item) => item.country.nameZh),
      belowMeanCountries: availableObservations.filter((item) => matrixMeanBucket(item.observation.value, mean) === "below").map((item) => item.country.nameZh),
      equalMeanCountries: availableObservations.filter((item) => matrixMeanBucket(item.observation.value, mean) === "equal").map((item) => item.country.nameZh),
      countryComparisons,
      rankChanges,
    };
  });
  const v4DerivedTableRows: V4DerivedTableRow[] = v4DerivedRows.map((row) => {
    const category = getExtendedIndicator(row.indicatorId)?.category ?? "external";
    const valueComparisons = row.countryComparisons.filter((item) => item.latestValue !== null);
    const comparableYears = valueComparisons
      .map((item) => item.latestYear)
      .filter((year): year is string => Boolean(year))
      .sort();
    const latestComparableYear = comparableYears[comparableYears.length - 1] ?? "待接入";
    const biggestGap = row.countryComparisons
      .filter((item): item is V4CountryDerivedComparison & { gapToMean: number } => item.gapToMean !== null)
      .sort((a, b) => Math.abs(b.gapToMean) - Math.abs(a.gapToMean))[0];
    const biggestChange = row.countryComparisons
      .filter((item): item is V4CountryDerivedComparison & { change: number } => item.change !== null)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
    const relatedQualityCells = v4Quality.cells.filter((cell) => cell.indicatorId === row.indicatorId);

    return {
      category,
      categoryLabel: extendedIndicatorLabels[category],
      row,
      latestComparableYear,
      valuesByCountry: Object.fromEntries(row.countryComparisons.map((item) => [item.countrySlug, item.latestValue])) as Record<string, number | null>,
      highestCountry: row.highestCountries.join(" / ") || "待接入",
      lowestCountry: row.lowestCountries.join(" / ") || "待接入",
      biggestMeanGapCountry: biggestGap?.countryName ?? "待比较",
      biggestMeanGapValue: biggestGap?.gapToMean ?? null,
      biggestChangeCountry: biggestChange?.countryName ?? "待比较",
      biggestChangeValue: biggestChange?.change ?? null,
      pendingObservationCount: relatedQualityCells.filter((cell) => cell.isPending).length,
      computedObservationCount: relatedQualityCells.filter((cell) => cell.isComputed).length,
    };
  });
  const v4ComparisonSummary = v4Countries.map((country) => ({
    country,
    highestCount: v4DerivedRows.filter((row) => row.highestCountries.includes(country.nameZh)).length,
    lowestCount: v4DerivedRows.filter((row) => row.lowestCountries.includes(country.nameZh)).length,
    aboveMeanCount: v4DerivedRows.filter((row) => row.aboveMeanCountries.includes(country.nameZh)).length,
    belowMeanCount: v4DerivedRows.filter((row) => row.belowMeanCountries.includes(country.nameZh)).length,
  }));
  const v4DerivedHighlights = v4DerivedRows.flatMap((row) => {
    const biggestGap = row.countryComparisons
      .filter((item): item is V4CountryDerivedComparison & { gapToMean: number } => item.gapToMean !== null)
      .sort((a, b) => Math.abs(b.gapToMean) - Math.abs(a.gapToMean))[0];
    const biggestChange = row.countryComparisons
      .filter((item): item is V4CountryDerivedComparison & { change: number } => item.change !== null)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
    const biggestRankMove = row.rankChanges
      .filter((item): item is V4RankChange & { rankDelta: number } => item.rankDelta !== null && item.rankDelta !== 0)
      .sort((a, b) => Math.abs(b.rankDelta) - Math.abs(a.rankDelta))[0];

    return [
      row.highest !== null && row.highestCountries.length > 0
        ? `${row.highestCountries.join(" / ")}的${row.label}为当前 V4 最高值（${formatMatrixValue(row.indicatorId, row.highest)} ${row.unit}）。`
        : null,
      biggestGap
        ? `${biggestGap.countryName}的${row.label}与 V4 均值差距最大：${formatSignedMatrixValue(row.indicatorId, biggestGap.gapToMean)} ${row.unit}。`
        : null,
      biggestChange
        ? `${biggestChange.countryName}的${row.label}从 ${biggestChange.startYear} 到 ${biggestChange.latestYear} 变化最大：${formatSignedMatrixValue(row.indicatorId, biggestChange.change)} ${row.unit}。`
        : null,
      biggestRankMove
        ? `${biggestRankMove.countryName}的${row.label}数值排名${formatRankDelta(biggestRankMove.rankDelta)}（${formatRank(biggestRankMove.startRank)} → ${formatRank(biggestRankMove.latestRank)}）。`
        : null,
    ].filter((item): item is string => Boolean(item));
  }).slice(0, 16);
  const debtRow = v4DerivedRows.find((row) => row.indicatorId === "government_debt_gdp");
  const currentAccountRow = v4DerivedRows.find((row) => row.indicatorId === "current_account_gdp");
  const automotiveRow = v4DerivedRows.find((row) => row.indicatorId === "automotive_export_share");
  const energyRow = v4DerivedRows.find((row) => row.indicatorId === "energy_import_dependency");
  const hungaryDebt = comparisonFor(debtRow, "hungary");
  const slovakiaCurrentAccount = comparisonFor(currentAccountRow, "slovakia");
  const slovakiaAutomotive = comparisonFor(automotiveRow, "slovakia");
  const czechiaEnergy = comparisonFor(energyRow, "czechia");
  const v4ResearchSummaries: V4ResearchSummary[] = [
    {
      category: "财政",
      title: "匈牙利政府债务/GDP长期高于 V4 均值",
      body: `匈牙利政府债务/GDP最新正式值为 ${researchValueWithUnit(debtRow, hungaryDebt?.latestValue)}，与 V4 均值差距为 ${researchValueWithUnit(debtRow, hungaryDebt?.gapToMean)}。`,
      basis: `依据：${hungaryDebt?.startYear ?? "待接入"}-${hungaryDebt?.latestYear ?? "待接入"} 年政府债务/GDP序列、V4 均值差距和排名变化。`,
    },
    {
      category: "外部",
      title: "斯洛伐克经常账户/GDP低于 V4 均值",
      body: `斯洛伐克经常账户/GDP最新正式值为 ${researchValueWithUnit(currentAccountRow, slovakiaCurrentAccount?.latestValue)}，与 V4 均值差距为 ${researchValueWithUnit(currentAccountRow, slovakiaCurrentAccount?.gapToMean)}。`,
      basis: `依据：${slovakiaCurrentAccount?.startYear ?? "待接入"}-${slovakiaCurrentAccount?.latestYear ?? "待接入"} 年经常账户/GDP序列和最新 V4 均值差距。`,
    },
    {
      category: "产业",
      title: "斯洛伐克汽车出口占比明显高于其他 V4 国家",
      body: `斯洛伐克汽车出口占比最新正式值为 ${researchValueWithUnit(automotiveRow, slovakiaAutomotive?.latestValue)}，当前在 V4 中处于 ${formatRank(automotiveRow?.rankChanges.find((item) => item.countrySlug === "slovakia")?.latestRank ?? null)}。`,
      basis: `依据：Eurostat ext_tec09 计算值、V4 最新横向矩阵和五年排名变化。`,
    },
    {
      category: "能源",
      title: "捷克能源进口依赖相对较低",
      body: `捷克能源进口依赖最新正式值为 ${researchValueWithUnit(energyRow, czechiaEnergy?.latestValue)}，与 V4 均值差距为 ${researchValueWithUnit(energyRow, czechiaEnergy?.gapToMean)}。`,
      basis: `依据：${czechiaEnergy?.startYear ?? "待接入"}-${czechiaEnergy?.latestYear ?? "待接入"} 年能源进口依赖序列和最新 V4 均值差距。`,
    },
  ];
  const openDataEntry = (entry: DataEntryShortcut) => {
    if (entry.requiresV4 && !isV4SelectedCountry) {
      setSelectedSlug("poland");
    }

    setActiveMode(entry.mode);
    window.setTimeout(() => {
      document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <section className="mt-8 grid min-w-0 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="card h-fit min-w-0 p-4 lg:sticky lg:top-6">
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
                onClick={() => {
                  setSelectedSlug(country.slug);
                  if (!v4CountrySlugs.includes(country.slug) && activeMode === "comparison") {
                    setActiveMode("economy");
                  }
                }}
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

      <div className="grid min-w-0 max-w-full gap-5 overflow-x-visible">
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

          <div className="mt-6 flex flex-wrap gap-2">
            {visibleDataModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveMode(mode.id)}
                className={`min-w-[180px] flex-none rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeMode === mode.id
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/60 p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow">Research Data Entries</p>
                <h3 className="mt-2 text-lg font-semibold">研究数据入口</h3>
              </div>
              <span className="text-xs text-[var(--muted)]">点击后切换到对应板块</span>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {dataEntryShortcuts.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => openDataEntry(entry)}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-3 text-left transition hover:border-[var(--accent)] hover:bg-white"
                >
                  <span className="text-sm font-semibold">{entry.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{entry.description}</span>
                  {entry.requiresV4 && !isV4SelectedCountry ? (
                    <span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)]">将切换到波兰 V4 工作台</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card overflow-visible p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">Research Registry Tables</p>
              <h2 className="mt-3 text-2xl font-semibold">研究数据结构总表</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                以下四组表体常驻在数据页，不依赖国家 tab 或视图切换。它们用于页面检索、复制、抓取和后续研究数据导出。
              </p>
            </div>
            <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs text-[var(--muted)]">完整展开</span>
          </div>

          <div className="mt-5 grid gap-5">
            <details id="countries-layer-entry" className="scroll-mt-6 rounded-2xl border border-[var(--line)] bg-white/65 p-4" open>
              <summary className="cursor-pointer text-lg font-semibold">countries：十国国家元数据表</summary>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                countries 是所有 observations、china_projects、derived_comparisons 和 china_exposure_candidates 的 country_id 关联表。政治人物字段未逐条官方核验前保留“待核验”。
              </p>
              <CountryMetadataTable />
            </details>

            <details id="indicator-dictionary-entry" className="scroll-mt-6 rounded-2xl border border-[var(--line)] bg-white/65 p-4" open>
              <summary className="cursor-pointer text-lg font-semibold">指标字典入口：18 个指标完整表体</summary>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                覆盖 6 个基础宏观指标和 12 个 V4 扩展指标；每个指标均展开为完整字段。
              </p>
              <IndicatorDictionaryTable rows={completeIndicatorDictionaryRows} />
            </details>

            <details id="source-dictionary-entry" className="scroll-mt-6 rounded-2xl border border-[var(--line)] bg-white/65 p-4" open>
              <summary className="cursor-pointer text-lg font-semibold">来源字典入口：16 类来源完整表体</summary>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                覆盖 Eurostat、各国统计局、央行、国际组织、欧盟机构、政府部门、新闻来源、企业公告、人工整理来源和结构样例来源等。
              </p>
              <SourceDictionaryTable rows={sourceDictionaryRows} />
            </details>

            <details id="v4-data-quality-entry" className="scroll-mt-6 rounded-2xl border border-[var(--line)] bg-white/65 p-4" open>
              <summary className="cursor-pointer text-lg font-semibold">数据质量验收入口：240 个 V4 观测位置验收结构</summary>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                验收范围为 V4 四国 × 12 个扩展指标 × 2021-2025 年，共 240 个观测位置；每行均分列数值、单位、状态、来源、来源等级、更新时间和派生资格。
              </p>
              <V4QualityDetailTable v4Quality={v4Quality} countryNameBySlug={countryNameBySlug} />
            </details>

            <details id="v4-derived-comparison-entry" className="scroll-mt-6 rounded-2xl border border-[var(--line)] bg-white/65 p-4" open>
              <summary className="cursor-pointer text-lg font-semibold">派生比较表入口：五个板块事实派生表</summary>
              <h3 className="mt-4 text-xl font-semibold">派生比较表</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                按财政、外部、投资、能源和产业五个板块展开。每个板块只做最高值、最低值、V4 均值、高于/低于均值和事实摘要，不输出风险判断。
              </p>
              <V4DerivedComparisonTable rows={v4DerivedTableRows} />
              <div className="grid gap-5">
                {extendedCategoryOrder.map((category) => {
                  const v4CategoryRows = v4Countries.flatMap((country) =>
                    (v4SeriesMaps.get(country.slug) ?? []).filter((observation) => getExtendedIndicator(observation.indicatorId)?.category === category),
                  );

                  return (
                    <V4CategoryMatrix
                      key={`registry-${category}`}
                      category={category}
                      matrixCountries={v4Countries}
                      observationMaps={v4ObservationMaps}
                      derivedRows={v4DerivedRows}
                      categoryObservations={v4CategoryRows}
                    />
                  );
                })}
              </div>
            </details>

            <details id="data-export-entry" className="scroll-mt-6 rounded-2xl border border-[var(--line)] bg-white/65 p-4" open>
              <summary className="cursor-pointer text-lg font-semibold">CSV / JSON 导出入口：9 个逻辑数据层</summary>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                当前导出层包括 countries、indicators、sources、observations、data_quality_checks、derived_comparisons、china_projects、china_exposure_candidates 和 methodology_rules。导出文件只提供研究数据结构，不代表模型已经启用。
              </p>
              <ResearchDataExportLinks />
            </details>
          </div>
        </section>

        {activeMode === "comparison" && isV4SelectedCountry ? (
          <section className="v4-comparison-panel card overflow-visible p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="eyebrow">V4 Cross-Country Comparison</p>
                <h2 className="mt-3 text-2xl font-semibold">V4 横向比较总览</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                  本页保留完整度验收、数据质量和派生事实摘要。具体横向轴已经拆入财政、外部、投资、能源和产业等单独数据板块；当前区块不再展示一张总矩阵，也不输出预测或风险指数。
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
              <div className="mt-4 grid gap-2 md:grid-cols-4">
                <div className="rounded-xl border border-[var(--line)] bg-white/75 px-3 py-2">
                  <p className="text-xs text-[var(--muted)]">Historical Grid</p>
                  <p className="mt-1 font-semibold">{v4HistoricalPresent} / {v4HistoricalExpected}</p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-white/75 px-3 py-2">
                  <p className="text-xs text-[var(--muted)]">正式数值</p>
                  <p className="mt-1 font-semibold text-emerald-800">{v4HistoricalOfficial}</p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-white/75 px-3 py-2">
                  <p className="text-xs text-[var(--muted)]">待接入空值</p>
                  <p className="mt-1 font-semibold text-amber-800">{v4HistoricalPending}</p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-white/75 px-3 py-2">
                  <p className="text-xs text-[var(--muted)]">时间范围</p>
                  <p className="mt-1 font-semibold">2021-2025</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
                历史序列已按 4 国 × 12 指标 × 5 年建立观测格；2025 年 FDI、能源进口依赖、汽车出口占比以及个别 Eurostat 未发布值保留为待接入，不参与最新正式值比较。
              </p>
            </div>

            <div id="v4-data-quality-panel" className="mt-5 scroll-mt-6 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="eyebrow">V4 Data Quality Acceptance</p>
                  <h3 className="mt-2 text-xl font-semibold">数据质量验收入口</h3>
                  <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">
                    验收范围仅限 V4 四国、12 个扩展指标、2021-2025 年观测格，共 240 个观测位置；检查覆盖、待接入年份、来源 URL 格式、单位一致性、更新时间、计算值和备注说明。
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${qualityStatusClass(v4Quality.summary.status)}`}>
                  {qualityStatusLabel(v4Quality.summary.status)}
                </span>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-4">
                {[
                  ["总观测格", `${v4Quality.summary.presentCells} / ${v4Quality.summary.expectedCells}`],
                  ["正式数值", `${v4Quality.summary.officialValueCells}`],
                  ["待接入值", `${v4Quality.summary.pendingValueCells}`],
                  ["问题单元", `${v4Quality.summary.issueCells}`],
                  ["来源 URL 格式有效", `${v4Quality.summary.validSourceLinkCells} / ${v4Quality.summary.expectedCells}`],
                  ["单位一致", `${v4Quality.summary.unitConsistentCells} / ${v4Quality.summary.expectedCells}`],
                  ["更新时间完整", `${v4Quality.summary.updatedAtCells} / ${v4Quality.summary.expectedCells}`],
                  ["计算值备注", `${v4Quality.summary.computedCellsWithNotes} / ${v4Quality.summary.computedCells}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[var(--line)] bg-white/75 px-3 py-2">
                    <p className="text-xs text-[var(--muted)]">{label}</p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="wide-table-scroll max-w-full">
                  <table className="research-data-table w-full min-w-[620px] border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                        {["国家", "覆盖", "正式值", "待接入", "URL", "单位", "更新时间"].map((header) => (
                          <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {v4Quality.byCountry.map((item) => (
                        <tr key={item.id} className="align-top">
                          <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{countryNameBySlug.get(item.id) ?? item.label}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{item.presentCells} / {item.expectedCells}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3 text-emerald-800">{item.officialValueCells}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3 text-amber-800">{item.pendingValueCells}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{item.validSourceLinkCells} / {item.expectedCells}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{item.unitConsistentCells} / {item.expectedCells}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{item.updatedAtCells} / {item.expectedCells}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="wide-table-scroll max-w-full">
                  <table className="research-data-table w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                        {["指标", "覆盖", "待接入", "URL", "单位", "计算值备注", "状态"].map((header) => (
                          <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {v4Quality.byIndicator.map((item) => (
                        <tr key={item.id} className="align-top">
                          <td className="border-b border-[var(--line)] py-3 pl-0 pr-3">
                            <p className="font-semibold">{item.label}</p>
                            <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">{item.id}</p>
                          </td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{item.presentCells} / {item.expectedCells}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3 text-amber-800">{item.pendingValueCells}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{item.validSourceLinkCells} / {item.expectedCells}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{item.unitConsistentCells} / {item.expectedCells}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{item.computedCellsWithNotes} / {item.computedCells}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${qualityStatusClass(item.status)}`}>{qualityStatusLabel(item.status)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {v4Quality.issueCells.length > 0 ? (
                <div className="mt-5 rounded-2xl bg-[var(--surface-muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Issue Register</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {v4Quality.issueCells.slice(0, 8).map((cell) => {
                      const indicator = getExtendedIndicator(cell.indicatorId);

                      return (
                        <div key={`${cell.countrySlug}-${cell.indicatorId}-${cell.year}`} className="rounded-xl border border-[var(--line)] bg-white/75 px-3 py-2 text-xs leading-5">
                          <p className="font-semibold">{countryNameBySlug.get(cell.countrySlug) ?? cell.countrySlug} / {indicator?.labelZh ?? cell.indicatorId} / {cell.year}</p>
                          <p className="mt-1 text-[var(--muted)]">{cell.issues.join("；")}</p>
                        </div>
                      );
                    })}
                  </div>
                  {v4Quality.issueCells.length > 8 ? (
                    <p className="mt-3 text-xs text-[var(--muted)]">另有 {v4Quality.issueCells.length - 8} 个待接入单元，完整清单保留在验收数据结构中。</p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/75 p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="eyebrow">Observation Acceptance Register</p>
                    <h4 className="mt-2 text-lg font-semibold">240 个观测位置验收明细</h4>
                    <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">
                      每个观测位置均按国家、指标、年份、数值、单位、状态、来源、可靠性等级、更新时间、计算属性和派生比较资格分列。
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">4 国 × 12 指标 × 5 年</span>
                </div>
                <div className="mt-4 wide-table-scroll max-w-full">
                  <table className="research-data-table w-full min-w-[2360px] border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                        {["国家", "指标", "年份", "数值", "单位", "状态", "来源名称", "来源链接", "来源等级", "更新时间", "正式数据", "待接入", "计算值", "人工整理", "横向比较", "五年变化", "均值差距", "排名变化", "缺失原因", "备注"].map((header) => (
                          <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {v4Quality.cells.map((cell) => {
                        const indicator = getExtendedIndicator(cell.indicatorId);
                        const reliabilityLevel = sourceReliabilityForName(cell.observation?.sourceName);
                        const entersDerived = Boolean(indicator?.includedInDerivedComparison && cell.hasValue && !cell.isPending);
                        const missingReason = cell.isPending ? cell.issues.join("；") || "数值待接入" : "—";

                        return (
                          <tr key={`${cell.countrySlug}-${cell.indicatorId}-${cell.year}-quality-detail`} className="align-top">
                            <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{countryNameBySlug.get(cell.countrySlug) ?? cell.countrySlug}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">
                              <p className="font-semibold">{indicator?.labelZh ?? cell.indicatorId}</p>
                              <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">{cell.indicatorId}</p>
                            </td>
                            <td className="border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="年份" />{cell.year}</td>
                            <td className="data-value-cell border-b border-[var(--line)] px-3 py-3 font-mono">
                              <SemanticCellPrefix label="数值" />
                              <span className={dataValueClass(cell.observation?.value ?? null)}>{formatObservationValue(cell.observation?.value ?? null, cell.indicatorId)}</span>
                            </td>
                            <td className="data-unit-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="单位" /><UnitToken value={cell.observation?.unit ?? indicator?.unit ?? "待接入"} /></td>
                            <td className="data-status-cell border-b border-[var(--line)] px-3 py-3">
                              <SemanticCellPrefix label="状态" />
                              <DataStatusBadge status={cell.isPending ? "pending" : cell.observation?.status ?? "pending"} />
                            </td>
                            <td className="border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]"><SemanticCellPrefix label="来源名称" />{cell.observation?.sourceName ?? "待接入"}</td>
                            <td className="data-source-cell border-b border-[var(--line)] px-3 py-3">
                              <SemanticCellPrefix label="来源链接" />
                              <div className="flex flex-col gap-2">
                                <SourceStatusBadge status={sourceStatusForReliability(reliabilityLevel, cell.isPending)} />
                                <SourceNameLink href={cell.observation?.sourceUrl ?? ""}>{cell.observation?.sourceName ?? "来源待接入"}</SourceNameLink>
                              </div>
                            </td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{reliabilityLevelLabel(reliabilityLevel)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs"><SemanticCellPrefix label="更新时间" />{cell.observation?.updatedAt || "待接入"}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{yesNoLabel(cell.observation?.status === "official" && cell.hasValue)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{yesNoLabel(cell.isPending)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{yesNoLabel(cell.isComputed)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{yesNoLabel(cell.observation?.status === "manual")}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{yesNoLabel(entersDerived)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{yesNoLabel(entersDerived)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{yesNoLabel(entersDerived)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{yesNoLabel(entersDerived)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]"><SemanticCellPrefix label="缺失原因" />{missingReason}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]"><SemanticCellPrefix label="备注" />{cell.observation?.note || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {v4ComparisonSummary.map((item) => (
                <article key={item.country.slug} className="comparison-summary-card rounded-2xl border border-[var(--line)] bg-white/75 p-4">
                  <p className="text-xs text-[var(--muted)]">{item.country.nameEn}</p>
                  <h3 className="mt-1 text-lg font-semibold">{item.country.nameZh}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-[var(--surface-muted)] p-2">
                      <p className="text-[var(--muted)]">高于均值</p>
                      <p className="mt-1 text-lg font-semibold text-sky-800">{item.aboveMeanCount}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--surface-muted)] p-2">
                      <p className="text-[var(--muted)]">低于均值</p>
                      <p className="mt-1 text-lg font-semibold text-amber-800">{item.belowMeanCount}</p>
                    </div>
                    <div className="rounded-xl bg-white/75 p-2">
                      <p className="text-[var(--muted)]">最高值</p>
                      <p className="mt-1 text-lg font-semibold">{item.highestCount}</p>
                    </div>
                    <div className="rounded-xl bg-white/75 p-2">
                      <p className="text-[var(--muted)]">最低值</p>
                      <p className="mt-1 text-lg font-semibold">{item.lowestCount}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="eyebrow">Research Summary Draft</p>
                  <h3 className="mt-2 text-xl font-semibold">V4 研究摘要</h3>
                  <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">
                    由五年变化、V4 均值差距和排名变化整理为简短事实摘要；当前仅作为后续模型解释层原材料，不构成预测、风险指数或政策判断。
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">事实摘要</span>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {v4ResearchSummaries.map((item) => (
                  <article key={item.title} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)]">{item.category}</span>
                    <h4 className="mt-3 font-semibold">{item.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{item.body}</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.basis}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="eyebrow">Derived Notes</p>
                  <h3 className="mt-2 text-xl font-semibold">V4 派生事实摘记</h3>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">不构成风险指数</span>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {v4DerivedHighlights.map((item) => (
                  <p key={item} className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs leading-6 text-[var(--muted)]">{item}</p>
                ))}
              </div>
            </div>

            <div id="v4-derived-comparison-panel" className="mt-5 scroll-mt-6 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="eyebrow">Derived Comparison</p>
                  <h3 className="mt-2 text-xl font-semibold">派生比较表入口</h3>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">仅为事实数据派生</span>
              </div>
              <div className="mt-4 wide-table-scroll max-w-full">
                <table className="research-data-table w-full min-w-[1180px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {["指标", "最高值", "最低值", "V4 均值", "高于均值", "低于均值", "等于均值"].map((header) => (
                        <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {v4DerivedRows.map((row) => (
                      <tr key={row.indicatorId} className="align-top">
                        <td className="border-b border-[var(--line)] py-3 pl-0 pr-3">
                          <p className="font-semibold">{row.label}</p>
                          <p className="mt-1 text-[10px] text-[var(--muted)]">{row.unit}</p>
                        </td>
                        <td className="data-value-cell border-b border-[var(--line)] px-3 py-3">
                          <span className={dataValueClass(row.highest)}>{formatMatrixValue(row.indicatorId, row.highest)}</span>
                          <p className="mt-1 text-[10px] text-[var(--muted)]">{row.highestCountries.join(" / ") || "待接入"}</p>
                        </td>
                        <td className="data-value-cell border-b border-[var(--line)] px-3 py-3">
                          <span className={dataValueClass(row.lowest)}>{formatMatrixValue(row.indicatorId, row.lowest)}</span>
                          <p className="mt-1 text-[10px] text-[var(--muted)]">{row.lowestCountries.join(" / ") || "待接入"}</p>
                        </td>
                        <td className="data-value-cell border-b border-[var(--line)] px-3 py-3">
                          <span className={dataValueClass(row.mean)}>{formatMatrixValue(row.indicatorId, row.mean)}</span>
                          <p className="mt-1 text-[10px] text-[var(--muted)]">算术平均</p>
                        </td>
                        <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{row.aboveMeanCountries.join(" / ") || "—"}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{row.belowMeanCountries.join(" / ") || "—"}</td>
                        <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{row.equalMeanCountries.join(" / ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="eyebrow">Five-Year Change And Mean Gap</p>
                  <h3 className="mt-2 text-xl font-semibold">五年变化与 V4 均值差距</h3>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">2021 → 最新正式年份</span>
              </div>
              <div className="mt-4 wide-table-scroll max-w-full">
                <table className="research-data-table w-full min-w-[1380px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {["指标", "国家", "起点", "最新", "五年变化", "V4 均值差距", "均值位置"].map((header) => (
                        <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {v4DerivedRows.flatMap((row) =>
                      row.countryComparisons.map((item) => (
                        <tr key={`${row.indicatorId}-${item.countrySlug}-change`} className="align-top">
                          <td className="border-b border-[var(--line)] py-3 pl-0 pr-3">
                            <p className="font-semibold">{row.label}</p>
                            <p className="mt-1 text-[10px] text-[var(--muted)]">{row.unit}</p>
                          </td>
                          <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{item.countryName}</td>
                          <td className="data-value-cell border-b border-[var(--line)] px-3 py-3">
                            <span className={dataValueClass(item.startValue)}>{formatMatrixValue(row.indicatorId, item.startValue)}</span>
                            <p className="mt-1 text-[10px] text-[var(--muted)]">{item.startYear ?? "待接入"}</p>
                          </td>
                          <td className="data-value-cell border-b border-[var(--line)] px-3 py-3">
                            <span className={dataValueClass(item.latestValue)}>{formatMatrixValue(row.indicatorId, item.latestValue)}</span>
                            <p className="mt-1 text-[10px] text-[var(--muted)]">{item.latestYear ?? "待接入"}</p>
                          </td>
                          <td className="data-value-cell border-b border-[var(--line)] px-3 py-3">
                            <span className={dataValueClass(item.change)}>{formatSignedMatrixValue(row.indicatorId, item.change)}</span>
                          </td>
                          <td className="data-value-cell border-b border-[var(--line)] px-3 py-3">
                            <span className={dataValueClass(item.gapToMean)}>{formatSignedMatrixValue(row.indicatorId, item.gapToMean)}</span>
                          </td>
                          <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{matrixMeanComparison(item.latestValue, row.mean)}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="eyebrow">Ranking Movement</p>
                  <h3 className="mt-2 text-xl font-semibold">指标数值排名变化</h3>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">仅表示数值排序</span>
              </div>
              <div className="mt-4 wide-table-scroll max-w-full">
                <table className="research-data-table w-full min-w-[1080px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {["指标", "国家", "起点排名", "最新排名", "排名变化", "说明"].map((header) => (
                        <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {v4DerivedRows.flatMap((row) =>
                      row.rankChanges.map((item) => (
                        <tr key={`${row.indicatorId}-${item.countrySlug}-rank`} className="align-top">
                          <td className="border-b border-[var(--line)] py-3 pl-0 pr-3">
                            <p className="font-semibold">{row.label}</p>
                            <p className="mt-1 text-[10px] text-[var(--muted)]">{row.unit}</p>
                          </td>
                          <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{item.countryName}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{formatRank(item.startRank)}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3">{formatRank(item.latestRank)}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{formatRankDelta(item.rankDelta)}</td>
                          <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">排名按该指标数值从高到低排列，不代表政策优劣、风险或预测。</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
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

            <section className="card overflow-visible p-6">
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

              <ObservationTable>
                {economicRows.flatMap((row) =>
                  tableMetricIds.map((metricId) => {
                    const metric = economicMetricOptions.find((option) => option.id === metricId) ?? economicMetricOptions[0];
                    const value = valueFor(row, metric.id);
                    const status = statusForMetric(value);

                    return (
                      <tr key={`${row.year}-${metric.id}`} className="align-top">
                        <td className="data-indicator-cell border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{metric.label}</td>
                        <td className="data-date-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="年份" />{row.year}</td>
                        <td className="data-value-cell border-b border-[var(--line)] px-3 py-3 font-mono"><SemanticCellPrefix label="数值" /><span className={dataValueClass(value)}>{formatRawMetricValue(value, metric.id)}</span></td>
                        <td className="data-unit-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="单位" /><UnitToken value={displayUnit(value, metric.unit)} /></td>
                        <td className="data-status-cell border-b border-[var(--line)] px-3 py-3">
                          <SemanticCellPrefix label="状态" />
                          <DataStatusBadge status={status} />
                        </td>
                        <EconomicSourceNoteCell
                          links={getEconomicMetricSourceLinks(selectedCountry.slug, metric.id, row.year, value)}
                          status={status}
                          note={`${metric.note} 数据来源：${row.source}`}
                        />
                      </tr>
                    );
                  }),
                )}
              </ObservationTable>
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
                  const v4CategoryRows = v4Countries.flatMap((country) =>
                    (v4SeriesMaps.get(country.slug) ?? []).filter((observation) => getExtendedIndicator(observation.indicatorId)?.category === category),
                  );

                  if (rows.length === 0) {
                    return null;
                  }

                  return (
                    <div key={category} className="card overflow-visible p-6">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <p className="eyebrow">V4 Data Extension</p>
                          <h2 className="mt-3 text-2xl font-semibold">{extendedIndicatorLabels[category]}</h2>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">2021-2025 历史序列已接入；Eurostat 尚未发布的年份保留为待接入，最新正式值用于横向比较。</p>
                        </div>
                        <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs text-[var(--muted)]">V4 first</span>
                      </div>

                      {isV4SelectedCountry ? (
                        <V4CategoryMatrix
                          category={category}
                          matrixCountries={v4Countries}
                          observationMaps={v4ObservationMaps}
                          derivedRows={v4DerivedRows}
                          categoryObservations={v4CategoryRows}
                        />
                      ) : null}

                      <ObservationTable>
                        <ObservationRows observations={rows} />
                      </ObservationTable>
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
              <ObservationTable>
                {economicRows.map((row) => {
                  const value = valueFor(row, activeMetric);
                  const status = statusForMetric(value);
                  return (
                    <tr key={row.year} className="align-top">
                      <td className="data-indicator-cell border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{activeMetricInfo.label}</td>
                      <td className="data-date-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="年份" />{row.year}</td>
                      <td className="data-value-cell border-b border-[var(--line)] px-3 py-3 font-mono"><SemanticCellPrefix label="数值" /><span className={dataValueClass(value)}>{formatRawMetricValue(value, activeMetric)}</span></td>
                      <td className="data-unit-cell border-b border-[var(--line)] px-3 py-3"><SemanticCellPrefix label="单位" /><UnitToken value={displayUnit(value, activeMetricInfo.unit)} /></td>
                      <td className="data-status-cell border-b border-[var(--line)] px-3 py-3">
                        <SemanticCellPrefix label="状态" />
                        <DataStatusBadge status={status} />
                      </td>
                      <EconomicSourceNoteCell
                        links={getEconomicMetricSourceLinks(selectedCountry.slug, activeMetric, row.year, value)}
                        status={status}
                        note={`${activeMetricInfo.note} 数据来源：${row.source}`}
                      />
                    </tr>
                  );
                })}
              </ObservationTable>
            </section>
          </>
        ) : null}

        {activeMode === "tables" ? (
          <section className="grid gap-5">
            {isV4SelectedCountry ? (
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
            ) : null}

            <div id="indicator-dictionary-panel" className="card p-6 scroll-mt-6">
              <p className="eyebrow">Country Table</p>
              <h2 className="mt-3 text-2xl font-semibold">国家表</h2>
              <div className="mt-5 wide-table-scroll max-w-full">
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
              <h2 className="mt-3 text-2xl font-semibold">指标字典入口</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                覆盖 18 个指标：6 个基础宏观指标和 12 个 V4 扩展指标。每个指标均明确来源、覆盖范围、计算属性、派生比较资格和待接入处理规则。
              </p>
              <IndicatorDictionaryTable rows={completeIndicatorDictionaryRows} />
            </div>

            <div className="card p-6">
              <p className="eyebrow">Observation Table</p>
              <h2 className="mt-3 text-2xl font-semibold">观测值表</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                标准 observations 表覆盖 10 国 × 6 个基础宏观指标 × 2021–2025，以及 V4 四国 × 12 个扩展指标 × 2021–2025，共 {observationsData.records.length} 条年度观测值。
              </p>
              <StandardObservationTable records={observationsData.records} />
            </div>

            <div className="card p-6">
              <p className="eyebrow">Sources / Projects / Events</p>
              <h2 className="mt-3 text-2xl font-semibold">来源表、对华项目表、新闻事件表</h2>
              <div className="mt-5 grid gap-4">
                <div id="source-dictionary-panel" className="scroll-mt-6 rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                  <h3 className="font-semibold">来源字典入口</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">覆盖 Eurostat、各国统计局、央行、国际组织、欧盟机构、政府部门、选举机构、新闻与项目线索等 16 类来源。</p>
                  <div className="mt-4 wide-table-scroll max-w-full">
                    <table className="research-data-table w-full min-w-[2920px] border-separate border-spacing-0 text-left text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                          {["source_id", "来源中文名", "来源英文名", "来源类型", "国家或地区覆盖", "指标覆盖范围", "链接", "可靠性等级", "来源状态", "更新频率", "正式数据", "事件依据", "补充线索", "不进入分析", "最后检查日期", "备注"].map((header) => (
                            <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sourceDictionaryRows.map((source) => (
                          <tr key={source.sourceId} className="align-top">
                            <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{source.sourceId}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{source.nameZh}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{source.nameEn}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{source.sourceType}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{source.coverage}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{source.indicatorCoverage}</td>
                            <td className="data-source-cell border-b border-[var(--line)] px-3 py-3"><SourceNameLink href={source.url}>来源链接</SourceNameLink></td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{reliabilityLevelLabel(source.reliabilityLevel)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3"><SourceStatusBadge status={source.sourceStatus} /></td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{source.updateFrequency}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{yesNoLabel(source.canBeOfficialData)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{yesNoLabel(source.canBeEventBasis)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{yesNoLabel(source.supplementalOnly)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3">{yesNoLabel(source.excludedFromAnalysis)}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{source.lastCheckedAt}</td>
                            <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{source.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
