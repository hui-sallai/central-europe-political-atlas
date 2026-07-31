"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { DataStatusBadge, SourceStatusBadge } from "@/components/DataStatusBadge";
import { countries } from "@/lib/data";
import { countryMetadataRecords, researchDataLayerFiles } from "@/lib/countryMetadata";
import { regionMetadataRecords } from "@/lib/regions";
import { regionBoundaryRecords } from "@/lib/regionBoundaries";
import { regionIndicatorRecords } from "@/lib/regionIndicators";
import { regionObservationRecords } from "@/lib/regionObservations";
import {
  hungaryNuts3SandboxQaSummary,
  hungaryNuts3VisualQaSummary,
  regionQualityCheckRecords,
  regionQualitySummary,
  type HungaryNuts3SandboxQaSummary,
  type HungaryNuts3VisualQaSummary,
  type RegionQualityCheckRecord,
  type RegionQualitySummary,
} from "@/lib/regionQualityChecks";
import { regionSourceRecords } from "@/lib/regionSources";
import { projectLocationRecords, type ProjectLocationRecord } from "@/lib/projectLocations";
import { mapLayerRecords, type MapLayerRecord } from "@/lib/mapLayers";
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
import derivedComparisonsData from "../../public/research-data/derived_comparisons.json";

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
type DeferredDetailsProps = {
  id: string;
  title: string;
  children: ReactNode;
  initiallyOpen?: boolean;
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
type RegionMetadataRecord = (typeof regionMetadataRecords)[number];
type RegionBoundaryRecord = (typeof regionBoundaryRecords)[number];
type RegionIndicatorRecord = (typeof regionIndicatorRecords)[number];
type RegionObservationRecord = (typeof regionObservationRecords)[number];
type RegionSourceRecord = (typeof regionSourceRecords)[number];
type IndicatorDictionaryRecord = (typeof indicatorDictionaryRecords)[number];
type V4DataQualitySummary = ReturnType<typeof getV4DataQualitySummary>;
type DerivedComparisonRecord = (typeof derivedComparisonsData.records)[number];
type ResearchDataResponse<T> = {
  record_count?: number;
  records: T[];
};
type StandardObservationRecord = {
  observation_id: string;
  country_id: string;
  indicator_id: string;
  year: string;
  period_type: string;
  period: string;
  value: number | null;
  unit: string;
  value_status: string;
  source_id: string;
  source_name: string;
  source_url: string;
  source_reliability: string;
  source_status: string;
  last_updated: string;
  is_official_data: boolean;
  is_pending: boolean;
  is_calculated: boolean;
  is_manual: boolean;
  is_structural_sample: boolean;
  is_in_cross_country_comparison: boolean;
  is_in_five_year_change: boolean;
  is_in_mean_gap: boolean;
  is_in_ranking_change: boolean;
  missing_reason: string;
  calculation_method: string;
  notes: string;
};
type DataQualityCheckRecord = {
  check_id: string;
  observation_id: string;
  country_id: string;
  indicator_id: string;
  year: string;
  value_present: boolean;
  unit_present: boolean;
  source_name_present: boolean;
  source_url_present: boolean;
  source_reliability_present: boolean;
  status_present: boolean;
  last_updated_present: boolean;
  is_official_data: boolean;
  is_pending: boolean;
  is_calculated: boolean;
  is_manual: boolean;
  is_cross_country_comparable: boolean;
  is_time_series_comparable: boolean;
  is_methodologically_consistent: boolean;
  is_ready_for_export: boolean;
  is_ready_for_derived_comparison: boolean;
  is_ready_for_future_model_candidate: boolean;
  missing_reason: string;
  quality_status: string;
  quality_notes: string;
};

function useResearchDataRecords<T>(fileName: string) {
  const [records, setRecords] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    setRecords(null);
    setError(null);
    fetch(`${basePath}/research-data/${fileName}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<ResearchDataResponse<T>>;
      })
      .then((payload) => {
        if (!cancelled) {
          setRecords(payload.records);
        }
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileName]);

  return { records, error, isLoading: records === null && error === null };
}

function DeferredTableState({ label }: { label: string }) {
  return (
    <p className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
      {label}
    </p>
  );
}

function DeferredDetails({ id, title, children, initiallyOpen = false }: DeferredDetailsProps) {
  const [hasOpened, setHasOpened] = useState(initiallyOpen);
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <details
      id={id}
      className="scroll-mt-6 rounded-2xl border border-[var(--line)] bg-white/65 p-4"
      open={isOpen}
      onToggle={(event) => {
        const nextOpen = event.currentTarget.open;
        setIsOpen(nextOpen);
        if (nextOpen) {
          setHasOpened(true);
        }
      }}
    >
      <summary className="cursor-pointer text-lg font-semibold">{title}</summary>
      {hasOpened ? (
        children
      ) : (
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          该表体已保留为研究数据入口；点击展开后加载完整字段，减少数据页初始渲染负担。
        </p>
      )}
    </details>
  );
}

const dataModes: { id: DataMode; label: string; description: string }[] = [
  { id: "economy", label: "经济数据", description: "近五年宏观经济表、官方统计主源与对华经贸样本。" },
  { id: "charts", label: "图表层", description: "只显示经济数据，可切换 GDP、CPI/通胀、失业率等指标。" },
  { id: "comparison", label: "V4 横向比较", description: "保留 V4 完整度、数据质量与派生事实摘要；具体横向轴已拆入各个数据板块。" },
  { id: "tables", label: "数据表格", description: "按六张核心表检查当前国家的数据完整性。" },
];
const dataEntryShortcuts: DataEntryShortcut[] = [
  { id: "countries-layer-entry", label: "国家元数据表", mode: "tables", description: "十国 countries 逻辑层，作为 country_id 关联表。" },
  { id: "regions-layer-entry", label: "区域元数据表", mode: "tables", description: "v0.11 regions 保留匈牙利 NUTS3 的 20 个预匹配位置；非 V4 国家级待接入。" },
  { id: "region-boundaries-layer-entry", label: "区域边界来源表", mode: "tables", description: "v0.12 region_boundaries 登记匈牙利沙盒过滤、基础拓扑 QA 和不可展示状态。" },
  { id: "region-indicators-layer-entry", label: "区域指标字典", mode: "tables", description: "v0.11 region_indicators 继续保留独立区域指标字典，第一批 10 项。" },
  { id: "region-observations-layer-entry", label: "区域观测值表", mode: "tables", description: "v0.11 region_observations 继续保留区域经济数据主表和待接入观测位置。" },
  { id: "region-quality-checks-layer-entry", label: "区域质量验收表", mode: "tables", description: "v0.14 region_quality_checks 记录 Hungary NUTS3 readiness gate，并继续区分预匹配、视觉 QA 与最终主键核验。" },
  { id: "region-sources-layer-entry", label: "区域来源字典", mode: "tables", description: "v0.11 region_sources 锁定 GISCO Level 3 GeoJSON 并保留待确认许可状态。" },
  { id: "project-locations-layer-entry", label: "项目地区定位表", mode: "tables", description: "v0.11 project_locations 继续保留项目地区定位结构，不启用真实项目点位图层。" },
  { id: "map-layers-layer-entry", label: "地图图层注册表", mode: "tables", description: "v0.14 map_layers 记录展示准入闸门，并保持 hu_nuts3_boundary_pilot.is_ready_for_display=false。" },
  { id: "indicator-dictionary-entry", label: "指标字典入口", mode: "tables", description: "18 个指标的口径、单位、来源优先级和比较资格。" },
  { id: "source-dictionary-entry", label: "来源字典入口", mode: "tables", description: "16 类来源的链接、可靠性等级和使用边界。" },
  { id: "v4-data-quality-entry", label: "数据质量验收入口", mode: "comparison", description: "V4 四国 240 个观测位置的验收清单。", requiresV4: true },
  { id: "v4-derived-comparison-entry", label: "派生比较表入口", mode: "comparison", description: "最高值、最低值、V4 均值和事实派生比较。", requiresV4: true },
  { id: "data-export-entry", label: "数据导出与接口准备", mode: "tables", description: "17 个逻辑数据层的 CSV / JSON 结构预留；当前不提供模型 API。" },
];
const regionMapDataStructureEntryIds = [
  "regions-layer-entry",
  "region-boundaries-layer-entry",
  "region-indicators-layer-entry",
  "region-observations-layer-entry",
  "region-sources-layer-entry",
  "region-quality-checks-layer-entry",
  "project-locations-layer-entry",
  "map-layers-layer-entry",
];
const regionMapDataStructureEntries = regionMapDataStructureEntryIds
  .map((entryId) => dataEntryShortcuts.find((entry) => entry.id === entryId))
  .filter((entry): entry is DataEntryShortcut => Boolean(entry));
const regionalSchemaChecks = [
  {
    table: "regions",
    priority: "最高优先级",
    why: "没有 regions，地图没有稳定区域主键。",
    fields: "region_id, country_id, region_name_zh, region_name_en, region_name_local, admin_level, admin_code, parent_region_id, capital_or_main_city, region_type, is_v4_region, is_boundary_available, is_statistical_data_available, is_election_data_available, is_china_project_mapped, data_status, source_status, last_updated, notes",
    enums: "admin_level: ADM1 / ADM2 / NUTS1 / NUTS2 / NUTS3；data_status: 正式数据 / 待核验 / 待接入 / 结构样例；source_status: 官方来源 / 人工整理 / 待接入 / 结构样例。",
    status: "V4 四国建立 ADM1 区域主键；非 V4 六国只保留国家级待接入占位。",
  },
  {
    table: "region_boundaries",
    priority: "最高优先级",
    why: "没有 region_boundaries，真实边界来源、许可和几何状态无法核验。",
    fields: "boundary_id, region_id, country_id, admin_level, nuts_version, boundary_source_name, boundary_source_url, boundary_source_type, boundary_license, boundary_format, geometry_format, file_selected, file_url, file_status, filter_status, display_status, geometry_available, geometry_simplified, topology_checked, coordinate_system, file_path_or_url, region_code_match_status, source_reliability, source_status, last_checked, notes",
    enums: "boundary_format: GeoJSON / TopoJSON / Shapefile / PMTiles / Vector Tiles / Not available；file_status: sandbox_downloaded / not_downloaded / not_applicable；filter_status: sandbox_filtered / not_filtered / not_applicable；display_status: not_ready_for_display。",
    status: "v0.12 只允许匈牙利文件进入沙盒验证与拓扑 QA；基础检查通过不等于可以进入真实地图展示。",
  },
  {
    table: "region_indicators",
    priority: "标准表体",
    why: "区域指标独立于国家级 indicators，避免把国家级指标直接下放。",
    fields: "region_indicator_id, 中文名, 英文名, 指标类别, 所属板块, 单位, 频率, 适用国家, 适用行政层级, 主来源, 备用来源, 来源等级, 是否为官方区域数据, 是否为人工整理, 是否为计算值, 是否进入地图图层, 是否进入区域比较, 是否进入未来模型候选, 缺失值处理规则, 待接入处理规则, last_updated, notes",
    enums: "频率: annual / not_applicable；来源等级: A / B / C / D；地图图层、区域比较和模型候选均为布尔字段。",
    status: "第一批只覆盖区域人口、GDP、人均 GDP、失业率、产业结构、制造业比重、首府/主要城市、项目数量、项目状态和边界状态。",
  },
  {
    table: "region_observations",
    priority: "标准表体",
    why: "区域经济数据主表，后续地图图层和区域比较都从这里读取。",
    fields: "region_observation_id, region_id, country_id, region_indicator_id, year, period_type, value, unit, value_status, source_id, source_name, source_url, source_reliability, source_status, is_official_data, is_pending, is_calculated, is_manual, is_structural_sample, is_in_map_layer, is_in_region_comparison, is_in_future_model_candidate, missing_reason, calculation_method, last_updated, notes",
    enums: "period_type: annual / quarterly / monthly / event_date / not_applicable；value_status: 正式数据 / 待接入 / 计算值 / 人工整理 / 结构样例 / 不进入分析。",
    status: "v0.11 继续保留 V4 区域待接入观测位置；不硬填数值，不进入正式地图图层。",
  },
  {
    table: "region_sources",
    priority: "标准表体",
    why: "区域统计、边界和项目定位来源需要单独管理许可状态。",
    fields: "region_source_id, source_name_zh, source_name_en, source_type, country_coverage, admin_level_coverage, indicator_coverage, boundary_coverage, source_url, source_reliability, source_status, update_frequency, license_status, can_be_used_for_boundary, can_be_used_for_regional_statistics, can_be_used_for_election_data, can_be_used_for_project_location, is_supplementary_only, is_excluded_from_analysis, last_checked, notes",
    enums: "source_type: Eurostat regional statistics / 各国统计局区域数据 / 欧盟 GIS / 官方开放数据门户 / 地方政府官网 / 人工整理来源 / 待接入来源 / 结构样例来源；source_reliability: A / B / C / D。",
    status: "license_status 必须保留；未检查许可的边界来源不能公开展示或复用。",
  },
  {
    table: "region_quality_checks",
    priority: "标准表体",
    why: "区域数据比国家数据更乱，必须提前验收边界、许可、来源和区域代码。",
    fields: "region_check_id, region_id, country_id, admin_level, region_indicator_id, year, boundary_available, boundary_source_available, boundary_license_checked, source_available, license_checked, authoritative_topology_checked, region_id_final_matched, visual_qa_passed, file_selected, file_downloaded, hungary_filtered, geometry_filtered, crs_confirmed, topology_checked, region_id_matched, ready_for_display, visual_qa_started, feature_rendered_count, fit_bounds_checked, tooltip_checked, visual_overlap_checked, missing_geometry_checked, public_display_ready, is_ready_for_display, readiness_gate_status, value_present, unit_present, source_name_present, source_url_present, source_reliability_present, region_code_present, is_official_data, is_pending, is_calculated, is_manual, is_structural_sample, is_map_ready, is_region_comparable, is_export_ready, quality_status, missing_reason, quality_notes, last_updated",
    enums: "quality_status: 通过 / 部分通过 / 待接入 / 需复核 / 不进入分析。",
    status: "当前待接入项保留缺失原因；is_map_ready=false 的区域不进入地图图层。",
  },
  {
    table: "project_locations",
    priority: "最高优先级",
    why: "没有 project_locations，对华项目无法从国家级进入区域级。",
    fields: "project_location_id, project_id, project_name, country_id, region_id, region_name, city_or_locality, latitude, longitude, location_precision, location_source_name, location_source_url, location_source_reliability, is_exact_location, is_city_level, is_region_level, is_country_level_only, is_mapped_to_region, is_ready_for_map_layer, location_status, missing_location_reason, last_updated, notes",
    enums: "location_precision: exact_site / city_level / region_level / country_level_only / unknown；location_status: 已定位 / 部分定位 / 仅国家级 / 待核验 / 待接入 / 不进入地图。",
    status: "当前只做区域级或城市级定位结构；缺少可核验位置来源时不进入正式地图图层。",
  },
  {
    table: "map_layers",
    priority: "最高优先级",
    why: "没有 map_layers，地图页无法管理哪些图层只是注册、哪些可以显示。",
    fields: "layer_id, layer_name_zh, layer_name_en, layer_type, data_source_table, geometry_source_table, admin_level, country_coverage, indicator_or_variable, is_active, license_checked, authoritative_topology_checked, region_id_final_matched, visual_qa_passed, public_display_ready, is_ready_for_display, readiness_gate_status, visual_qa_started, feature_rendered_count, fit_bounds_checked, tooltip_checked, visual_overlap_checked, missing_geometry_checked, is_structural_sample, is_official_data, is_manual, is_pending, legend_type, legend_unit, color_scale, interaction_type, tooltip_fields, allowed_filters, source_requirement, quality_requirement, model_boundary, last_updated, notes",
    enums: "layer_type: boundary / choropleth / point / symbol / label / table_only / structural_sample；is_ready_for_display=false 的图层不得作为真实图层展示。",
    status: "v0.11 只登记匈牙利边界文件沙盒和既有图层；不启用风险图层、预测图层、真实党派支持率图层或中国经济暴露指数。",
  },
];

function splitRegionalSchemaFields(fields: string) {
  return fields.split(",").map((field) => field.trim()).filter(Boolean);
}

function regionalFieldMeaning(field: string) {
  const meanings: Record<string, string> = {
    region_id: "区域唯一主键，地图、观测值、边界和项目定位都通过它关联。",
    country_id: "国家唯一主键，必须关联 countries 表。",
    admin_level: "行政或统计层级，用于区分 ADM1、ADM2、NUTS2 等层级。",
    admin_code: "官方行政区或统计区代码，用于和边界、统计来源对齐。",
    parent_region_id: "上级区域主键；二级区域接入后必须回溯到一级区域。",
    boundary_id: "边界记录唯一主键。",
    boundary_source_url: "边界来源链接，用于核验公开展示、许可和复用条件。",
    boundary_license: "边界数据许可状态，决定是否可以公开展示和简化。",
    boundary_format: "边界文件格式或待接入状态。",
    file_url: "已选定的具体几何文件地址；文件尚未选择时必须留空。",
    file_status: "候选文件的沙盒下载状态。",
    filter_status: "候选文件是否已筛选为目标国家和行政层级。",
    display_status: "真实地图展示状态；沙盒阶段必须为 not_ready_for_display。",
    geometry_available: "几何文件是否已经可用。",
    geometry_simplified: "几何是否已完成前端加载所需简化。",
    topology_checked: "拓扑关系是否完成检查。",
    file_path_or_url: "边界文件路径或来源 URL。",
    region_indicator_id: "区域指标唯一主键，不与国家级 indicators 混用。",
    year: "观测年份或验收年份。",
    period_type: "时间频率。",
    value: "观测值；待接入时必须保留为空值或明确待接入。",
    unit: "单位，必须与指标字典一致。",
    value_status: "数值状态，用于区分正式数据、待接入、计算值、人工整理和结构样例。",
    source_id: "来源主键，用于关联来源字典。",
    source_name: "来源名称。",
    source_url: "来源链接。",
    source_reliability: "来源可靠性等级。",
    source_status: "来源接入状态。",
    source_type: "来源类型。",
    license_status: "来源许可状态，区域边界和公开展示必须核验。",
    quality_status: "质量验收结论。",
    project_location_id: "项目地区定位记录唯一主键。",
    project_id: "对华项目主键，关联 china_projects。",
    latitude: "纬度；缺少可核验点位时保留为空。",
    longitude: "经度；缺少可核验点位时保留为空。",
    location_precision: "定位精度。",
    location_status: "项目定位状态。",
    layer_id: "地图图层唯一主键。",
    layer_type: "图层类型。",
    data_source_table: "图层读取的数据表。",
    geometry_source_table: "图层读取的几何来源表。",
    is_ready_for_display: "图层是否具备真实展示条件。",
    authoritative_topology_checked: "是否已经通过权威拓扑验收；基础沙盒 QA 不能替代该字段。",
    region_id_final_matched: "region_id 与 NUTS / ADM 代码是否完成最终匹配核验。",
    visual_qa_passed: "内部视觉 QA 是否通过；它只是展示准入的必要条件。",
    public_display_ready: "边界或图层是否具备公开展示资格。",
    readiness_gate_status: "真实地图展示准入闸门的综合状态。",
    model_boundary: "模型、预测和指数边界说明。",
  };

  if (meanings[field]) {
    return meanings[field];
  }
  if (field.startsWith("is_") || field.startsWith("can_be_")) {
    return "布尔状态字段，用于控制接入、展示、验收或候选资格。";
  }
  if (field.endsWith("_name") || field.includes("name_")) {
    return "名称字段，用于页面展示、检索和导出。";
  }
  if (field.endsWith("_notes") || field === "notes" || field.includes("note")) {
    return "备注字段，用于说明口径、缺失原因或边界条件。";
  }
  if (field.includes("status")) {
    return "状态字段，用于区分正式数据、待接入、待核验或不进入分析。";
  }
  if (field.includes("source")) {
    return "来源字段，用于保存来源名称、链接、等级或使用边界。";
  }
  return "标准字段，用于表内记录、关联、展示或导出。";
}

function regionalFieldAllowedStatus(table: string, field: string) {
  if (table === "map_layers" && field === "is_ready_for_display") return "v0.14 必须保持 false";
  if (field === "readiness_gate_status") return "not_ready_for_public_display / ready_for_public_display";
  if (field === "file_status") return "sandbox_downloaded / not_downloaded / not_applicable";
  if (field === "filter_status") return "sandbox_filtered / not_filtered / not_applicable";
  if (field === "display_status") return "not_ready_for_display";
  if (field === "admin_level") return "ADM1 / ADM2 / NUTS1 / NUTS2 / NUTS3";
  if (field === "boundary_format") return "GeoJSON / TopoJSON / Shapefile / PMTiles / Vector Tiles / Not available";
  if (field === "layer_type") return "boundary / choropleth / point / symbol / label / table_only / structural_sample";
  if (field === "location_precision") return "exact_site / city_level / region_level / country_level_only / unknown";
  if (field === "location_status") return "已定位 / 部分定位 / 仅国家级 / 待核验 / 待接入 / 不进入地图";
  if (field === "quality_status") return "通过 / 部分通过 / 待接入 / 需复核 / 不进入分析";
  if (field === "period_type") return "annual / quarterly / monthly / event_date / not_applicable";
  if (field === "value_status") return "正式数据 / 待接入 / 计算值 / 人工整理 / 结构样例 / 不进入分析";
  if (field.includes("reliability")) return "A / B / C / D";
  if (field.includes("status")) return "正式数据 / 待核验 / 待接入 / 结构样例 / 不进入分析";
  if (field.startsWith("is_") || field.startsWith("can_be_") || field.endsWith("_present") || field.endsWith("_checked") || field.endsWith("_available") || field === "file_downloaded" || field === "hungary_filtered" || field === "ready_for_display") return "true / false";
  if (field === "value" || field === "latitude" || field === "longitude") return "数值 / null / 待接入";
  if (field === "year") return "YYYY";
  return "文本 / ID / URL / 待接入";
}

function regionalFieldSourceRequirement(table: string, field: string) {
  if (field.includes("source") || field.includes("license") || field.includes("url")) return "必须保留可核验来源、链接、来源等级或许可说明。";
  if (table === "region_boundaries") return "边界相关字段必须等待官方或可信 GIS 来源核验。";
  if (table === "project_locations") return "项目定位字段需要项目来源和位置来源双重核验。";
  if (table === "region_observations") return "正式数值必须有来源名称、来源链接、来源等级和更新时间。";
  if (table === "map_layers") return "真实展示前必须满足 source_requirement 和 quality_requirement。";
  return "通过对应表的来源字段或待接入状态追溯。";
}

function regionalFieldMapDisplayRule(table: string, field: string) {
  if (table === "map_layers") {
    return field === "is_ready_for_display" ? "决定是否可真实展示；当前 false。" : "图层注册字段；不等于真实展示。";
  }
  if (field === "is_in_map_layer" || field === "is_map_ready" || field === "is_ready_for_map_layer") return "控制是否可进入地图展示；当前未通过项为 false。";
  if (table === "region_boundaries" && ["geometry_available", "geometry_simplified", "topology_checked"].includes(field)) return "真实地图展示前置条件。";
  if (table === "project_locations" && ["latitude", "longitude", "location_precision", "location_status"].includes(field)) return "未来点位图层前置字段；当前不进入正式图层。";
  return "不直接展示；作为地图关联、说明或导出字段。";
}

function regionalFieldModelRule(field: string) {
  if (field.includes("future_model_candidate")) return "候选资格字段；不代表模型已启用。";
  if (field === "model_boundary") return "明确不输出模型、预测、风险指数或中国经济暴露指数。";
  if (field.includes("structural_sample")) return "结构样例为 true 时不进入未来模型候选。";
  return "不直接进入模型；仅作为未来候选前置元数据。";
}

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

function SemanticField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="semantic-field">
      <span className="semantic-field-label">{label}：</span>
      <span className="semantic-field-value">{children}</span>
    </span>
  );
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

function StandardObservationTableLoader() {
  const { records, isLoading, error } = useResearchDataRecords<StandardObservationRecord>("observations.json");

  if (isLoading) {
    return <DeferredTableState label="正在加载 observations.json；该重表不再进入数据页首屏渲染。" />;
  }

  if (error || !records) {
    return <DeferredTableState label={`observations.json 加载失败：${error ?? "未知错误"}`} />;
  }

  return (
    <>
      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">已加载 {records.length} 条 observations 观测值。</p>
      <StandardObservationTable records={records} />
    </>
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

function formatDerivedComparisonValue(value: number | null, unit: string) {
  if (value === null) {
    return "待接入";
  }

  const formatted = Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 3 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatDerivedComparisonSignedValue(value: number | null, unit: string) {
  if (value === null) {
    return "待接入";
  }

  const formatted = Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 3 });
  const signed = value > 0 ? `+${formatted}` : formatted;
  return unit ? `${signed} ${unit}` : signed;
}

function V4DerivedComparisonTable({ records }: { records: DerivedComparisonRecord[] }) {
  const countryLabelById = new Map([
    ["poland", "波兰"],
    ["hungary", "匈牙利"],
    ["czechia", "捷克"],
    ["slovakia", "斯洛伐克"],
  ]);
  const displayCountry = (value: string) =>
    value
      .split(" / ")
      .map((countryId) => countryLabelById.get(countryId) ?? countryId)
      .join(" / ");

  const fieldRowsFor = (record: DerivedComparisonRecord) => [
    ["comparison_id", <span key="comparison_id" className="font-mono text-xs">{record.comparison_id}</span>],
    ["板块", <DictionaryToken key="section">{record.section}</DictionaryToken>],
    ["指标", (
      <span key="indicator" className="grid gap-1">
        <span className="font-semibold">{record.indicator_name}</span>
        <span className="font-mono text-[10px] text-[var(--muted)]">{record.indicator_id}</span>
      </span>
    )],
    ["latest_comparable_year", record.latest_comparable_year],
    ["poland_value", formatDerivedComparisonValue(record.poland_value, record.unit)],
    ["hungary_value", formatDerivedComparisonValue(record.hungary_value, record.unit)],
    ["czechia_value", formatDerivedComparisonValue(record.czechia_value, record.unit)],
    ["slovakia_value", formatDerivedComparisonValue(record.slovakia_value, record.unit)],
    ["unit", record.unit],
    ["highest_value", formatDerivedComparisonValue(record.highest_value, record.unit)],
    ["highest_country", displayCountry(record.highest_country)],
    ["lowest_value", formatDerivedComparisonValue(record.lowest_value, record.unit)],
    ["lowest_country", displayCountry(record.lowest_country)],
    ["v4_average", formatDerivedComparisonValue(record.v4_average, record.unit)],
    ["poland_gap_from_v4_average", formatDerivedComparisonSignedValue(record.poland_gap_from_v4_average, record.unit)],
    ["hungary_gap_from_v4_average", formatDerivedComparisonSignedValue(record.hungary_gap_from_v4_average, record.unit)],
    ["czechia_gap_from_v4_average", formatDerivedComparisonSignedValue(record.czechia_gap_from_v4_average, record.unit)],
    ["slovakia_gap_from_v4_average", formatDerivedComparisonSignedValue(record.slovakia_gap_from_v4_average, record.unit)],
    ["largest_gap_country", displayCountry(record.largest_gap_country)],
    ["largest_gap_value", formatDerivedComparisonSignedValue(record.largest_gap_value, record.unit)],
    ["poland_five_year_change", formatDerivedComparisonSignedValue(record.poland_five_year_change, record.unit)],
    ["hungary_five_year_change", formatDerivedComparisonSignedValue(record.hungary_five_year_change, record.unit)],
    ["czechia_five_year_change", formatDerivedComparisonSignedValue(record.czechia_five_year_change, record.unit)],
    ["slovakia_five_year_change", formatDerivedComparisonSignedValue(record.slovakia_five_year_change, record.unit)],
    ["largest_five_year_change_country", displayCountry(record.largest_five_year_change_country)],
    ["largest_five_year_change_value", formatDerivedComparisonSignedValue(record.largest_five_year_change_value, record.unit)],
    ["poland_rank", record.poland_rank ?? "待接入"],
    ["hungary_rank", record.hungary_rank ?? "待接入"],
    ["czechia_rank", record.czechia_rank ?? "待接入"],
    ["slovakia_rank", record.slovakia_rank ?? "待接入"],
    ["missing_observation_count", record.missing_observation_count],
    ["calculated_value_count", record.calculated_value_count],
    ["comparison_status", record.comparison_status],
    ["interpretation_boundary", record.interpretation_boundary],
    ["notes", record.notes],
  ] as const;

  return (
    <div className="mt-5 grid gap-4">
      {records.map((record) => (
        <article key={record.comparison_id} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
          <div className="flex flex-col gap-2 border-b border-[var(--line)] pb-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{record.comparison_id}</p>
              <h4 className="mt-2 text-lg font-semibold">{record.indicator_name}</h4>
            </div>
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
              derived_comparisons
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-white/75">
            <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  <th className="w-[260px] border-b border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2 font-semibold">field</th>
                  <th className="border-b border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2 font-semibold">value</th>
                </tr>
              </thead>
              <tbody>
                {fieldRowsFor(record).map(([label, value]) => (
                  <tr key={`${record.comparison_id}-${label}`} className="align-top">
                    <th scope="row" className="border-b border-[var(--line)] px-3 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      {label}
                    </th>
                    <td className="border-b border-[var(--line)] px-3 py-3 text-sm leading-6 text-[var(--foreground)]">
                      <span className="block whitespace-normal break-words">{value}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
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

function RegionMetadataTable({ rows }: { rows: RegionMetadataRecord[] }) {
  const headers = [
    "region_id",
    "country_id",
    "region_name_zh",
    "region_name_en",
    "region_name_local",
    "admin_level",
    "admin_code",
    "parent_region_id",
    "capital_or_main_city",
    "region_type",
    "is_v4_region",
    "is_boundary_available",
    "is_statistical_data_available",
    "is_election_data_available",
    "is_china_project_mapped",
    "data_status",
    "source_status",
    "last_updated",
    "notes",
  ];

  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table region-metadata-table w-full min-w-[3200px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {headers.map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((region) => (
            <tr key={region.region_id} className="align-top">
              <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{region.region_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{region.country_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{region.region_name_zh}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{region.region_name_en}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{region.region_name_local}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{region.admin_level}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{region.admin_code}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{region.parent_region_id || "—"}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{region.capital_or_main_city}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{region.region_type}</td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={region.is_v4_region} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={region.is_boundary_available} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={region.is_statistical_data_available} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={region.is_election_data_available} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={region.is_china_project_mapped} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3">{region.data_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{region.source_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{region.last_updated}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{region.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegionBoundaryTable({ rows }: { rows: RegionBoundaryRecord[] }) {
  const headers = [
    "boundary_id",
    "region_id",
    "country_id",
    "admin_level",
    "boundary_source_name",
    "boundary_source_url",
    "boundary_source_type",
    "boundary_license",
    "boundary_format",
    "nuts_version",
    "geometry_format",
    "file_selected",
    "file_url",
    "file_status",
    "filter_status",
    "display_status",
    "geometry_available",
    "geometry_simplified",
    "topology_checked",
    "coordinate_system",
    "region_code_match_status",
    "file_path_or_url",
    "source_reliability",
    "source_status",
    "last_checked",
    "notes",
  ];

  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table region-boundary-table w-full min-w-[4300px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {headers.map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((boundary) => (
            <tr key={boundary.boundary_id} className="align-top">
              <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{boundary.boundary_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{boundary.region_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{boundary.country_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{boundary.admin_level}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{boundary.boundary_source_name}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">
                {boundary.boundary_source_url ? (
                  <a href={boundary.boundary_source_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                    source
                  </a>
                ) : "—"}
              </td>
              <td className="border-b border-[var(--line)] px-3 py-3">{boundary.boundary_source_type}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{boundary.boundary_license}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{boundary.boundary_format}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{boundary.nuts_version}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{boundary.geometry_format}</DictionaryToken></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={boundary.file_selected} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3">
                {boundary.file_url ? (
                  <a href={boundary.file_url.startsWith("/") ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${boundary.file_url}` : boundary.file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                    geometry file
                  </a>
                ) : "—"}
              </td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{boundary.file_status}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{boundary.filter_status}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{boundary.display_status}</DictionaryToken></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={boundary.geometry_available} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={boundary.geometry_simplified} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={boundary.topology_checked} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3">{boundary.coordinate_system}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{boundary.region_code_match_status}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3">
                {boundary.file_path_or_url ? (
                  <a href={boundary.file_path_or_url.startsWith("/") ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${boundary.file_path_or_url}` : boundary.file_path_or_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                    file/source
                  </a>
                ) : "—"}
              </td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{boundary.source_reliability}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3">{boundary.source_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{boundary.last_checked}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{boundary.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegionIndicatorDictionaryTable({ rows }: { rows: RegionIndicatorRecord[] }) {
  const headers = [
    "region_indicator_id",
    "中文名",
    "英文名",
    "指标类别",
    "所属板块",
    "单位",
    "频率",
    "适用国家",
    "适用行政层级",
    "主来源",
    "备用来源",
    "来源等级",
    "官方区域数据",
    "人工整理",
    "计算值",
    "进入地图图层",
    "进入区域比较",
    "未来模型候选",
    "缺失值处理规则",
    "待接入处理规则",
    "last_updated",
    "notes",
  ];

  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table region-indicator-table w-full min-w-[4200px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {headers.map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((indicator) => (
            <tr key={indicator.region_indicator_id} className="align-top">
              <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{indicator.region_indicator_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{indicator.name_zh}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{indicator.name_en}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{indicator.indicator_category}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{indicator.section}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{indicator.unit}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{indicator.frequency}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{indicator.applicable_countries}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{indicator.applicable_admin_levels}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{indicator.primary_source}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{indicator.fallback_source}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{indicator.source_reliability}</DictionaryToken></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={indicator.is_official_regional_data} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={indicator.is_manual} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={indicator.is_calculated} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={indicator.is_in_map_layer} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={indicator.is_in_regional_comparison} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={indicator.is_future_model_candidate} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{indicator.missing_value_rule}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{indicator.pending_value_rule}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{indicator.last_updated}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{indicator.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegionObservationTable({ rows }: { rows: RegionObservationRecord[] }) {
  const headers = [
    "region_observation_id",
    "region_id",
    "country_id",
    "region_indicator_id",
    "year",
    "period_type",
    "value",
    "unit",
    "value_status",
    "source_id",
    "source_name",
    "source_url",
    "source_reliability",
    "source_status",
    "is_official_data",
    "is_pending",
    "is_calculated",
    "is_manual",
    "is_structural_sample",
    "is_in_map_layer",
    "is_in_region_comparison",
    "is_in_future_model_candidate",
    "missing_reason",
    "calculation_method",
    "last_updated",
    "notes",
  ];

  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table region-observation-table w-full min-w-[5200px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {headers.map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((observation) => (
            <tr key={observation.region_observation_id} className="align-top">
              <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{observation.region_observation_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{observation.region_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{observation.country_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{observation.region_indicator_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{observation.year}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{observation.period_type}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono">{observation.value ?? "待接入"}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{observation.unit}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3">{observation.value_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{observation.source_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{observation.source_name}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">
                {observation.source_url ? (
                  <a href={observation.source_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                    source
                  </a>
                ) : "—"}
              </td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{observation.source_reliability}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3">{observation.source_status}</td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={observation.is_official_data} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={observation.is_pending} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={observation.is_calculated} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={observation.is_manual} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={observation.is_structural_sample} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={observation.is_in_map_layer} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={observation.is_in_region_comparison} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={observation.is_in_future_model_candidate} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{observation.missing_reason}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{observation.calculation_method}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{observation.last_updated}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{observation.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegionQualitySummaryCards({ summary }: { summary: RegionQualitySummary }) {
  const cards = [
    ["区域总数", summary.total_region_count],
    ["边界已接入区域数", summary.boundary_available_region_count],
    ["边界待接入区域数", summary.boundary_pending_region_count],
    ["区域统计数据已接入数", summary.regional_statistical_data_available_count],
    ["区域统计数据待接入数", summary.regional_statistical_data_pending_count],
    ["可进入地图图层区域数", summary.map_layer_ready_region_count],
    ["不可进入地图图层区域数", summary.map_layer_not_ready_region_count],
    ["来源 A 级数量", summary.source_a_count],
    ["来源 B 级数量", summary.source_b_count],
    ["来源 C 级数量", summary.source_c_count],
    ["来源 D 级数量", summary.source_d_count],
  ];

  return (
    <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
      {cards.map(([label, value]) => (
        <article key={label} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">{value}</p>
        </article>
      ))}
    </div>
  );
}

function HungarySandboxQaSummaryCards({ summary }: { summary: HungaryNuts3SandboxQaSummary }) {
  const fields = [
    ["source_file", summary.source_file],
    ["filtered_file", summary.filtered_file],
    ["validation_file", summary.validation_file],
    ["feature_count", String(summary.feature_count)],
    ["expected_feature_count", String(summary.expected_feature_count)],
    ["nuts_code_count", String(summary.nuts_code_count)],
    ["geometry_present_count", String(summary.geometry_present_count)],
    ["crs_confirmed", summary.crs_confirmed ? "true / EPSG:4326" : "false / 待确认"],
    ["topology_checked", summary.topology_checked ? "basic_qa_done" : "not_checked"],
    ["topology_status", summary.topology_status],
    ["region_id_matched", String(summary.region_id_matched)],
    ["ready_for_display", String(summary.ready_for_display)],
  ] as const;

  return (
    <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
      <p className="eyebrow">Hungary NUTS3 sandbox QA summary</p>
      <h3 className="mt-2 text-lg font-semibold">Hungary NUTS3 sandbox QA summary</h3>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--muted)]">
        基础拓扑 QA 只检查坐标、环闭合、退化环、自相交和区域间异常穿越；它不替代权威拓扑验收，也不把 20 / 20 预匹配视为最终主键匹配。
      </p>
      <dl className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {fields.map(([field, value]) => (
          <div key={field} className="rounded-xl bg-[var(--surface-muted)] p-3">
            <dt className="font-mono text-[10px] font-semibold text-[var(--muted)]">{field}</dt>
            <dd className="mt-2 break-words text-sm font-semibold leading-5 text-[var(--foreground)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function HungaryVisualQaSummaryCards({ summary }: { summary: HungaryNuts3VisualQaSummary }) {
  const fields = [
    ["visual_qa_started", String(summary.visual_qa_started)],
    ["feature_rendered_count", String(summary.feature_rendered_count)],
    ["fit_bounds_checked", String(summary.fit_bounds_checked)],
    ["tooltip_checked", String(summary.tooltip_checked)],
    ["visual_overlap_checked", String(summary.visual_overlap_checked)],
    ["missing_geometry_checked", String(summary.missing_geometry_checked)],
    ["public_display_ready", String(summary.public_display_ready)],
    ["is_ready_for_display", String(summary.is_ready_for_display)],
  ] as const;

  return (
    <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
      <p className="eyebrow">v0.13.1 Visual QA Result Fields</p>
      <h3 className="mt-2 text-lg font-semibold">Hungary NUTS3 visual QA summary</h3>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--muted)]">
        该摘要属于既有 region_quality_checks，不新增第 18 张表。渲染成功不代表拓扑、主键或公开展示资格已通过。
      </p>
      <p className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
        <span className="font-mono text-xs font-semibold text-[var(--accent)]">visual QA summary</span>
        <span className="mt-1 block">
          visual_qa_started=true；feature_rendered_count=20；fit_bounds_checked=true；tooltip_checked=true；visual_overlap_checked=true；missing_geometry_checked=true；public_display_ready=false；is_ready_for_display=false。权威拓扑、许可和最终主键仍需复核。
        </span>
      </p>
      <dl className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {fields.map(([field, value]) => (
          <div key={field} className="rounded-xl bg-[var(--surface-muted)] p-3">
            <dt className="font-mono text-[10px] font-semibold text-[var(--muted)]">{field}</dt>
            <dd className="mt-2 text-sm font-semibold text-[var(--foreground)]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RegionQualityCheckTable({ rows }: { rows: RegionQualityCheckRecord[] }) {
  const headers = [
    "region_check_id",
    "region_id",
    "country_id",
    "admin_level",
    "region_indicator_id",
    "year",
    "boundary_available",
    "boundary_source_available",
    "boundary_license_checked",
    "source_available",
    "license_checked",
    "authoritative_topology_checked",
    "region_id_final_matched",
    "visual_qa_passed",
    "file_selected",
    "file_downloaded",
    "hungary_filtered",
    "geometry_filtered",
    "crs_confirmed",
    "topology_checked",
    "region_id_matched",
    "ready_for_display",
    "visual_qa_started",
    "feature_rendered_count",
    "fit_bounds_checked",
    "tooltip_checked",
    "visual_overlap_checked",
    "missing_geometry_checked",
    "public_display_ready",
    "is_ready_for_display",
    "readiness_gate_status",
    "value_present",
    "unit_present",
    "source_name_present",
    "source_url_present",
    "source_reliability_present",
    "region_code_present",
    "is_official_data",
    "is_pending",
    "is_calculated",
    "is_manual",
    "is_structural_sample",
    "is_map_ready",
    "is_region_comparable",
    "is_export_ready",
    "quality_status",
    "missing_reason",
    "quality_notes",
    "last_updated",
  ];

  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table region-quality-table w-full min-w-[5500px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {headers.map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((check) => (
            <tr key={check.region_check_id} className="align-top">
              <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{check.region_check_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{check.region_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{check.country_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{check.admin_level}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{check.region_indicator_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{check.year}</td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.boundary_available} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.boundary_source_available} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.boundary_license_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.source_available} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.license_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.authoritative_topology_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.region_id_final_matched} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.visual_qa_passed} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.file_selected} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.file_downloaded} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.hungary_filtered} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.geometry_filtered} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.crs_confirmed} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.topology_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.region_id_matched} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.ready_for_display} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.visual_qa_started} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono">{check.feature_rendered_count}</td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.fit_bounds_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.tooltip_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.visual_overlap_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.missing_geometry_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.public_display_ready} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.is_ready_for_display} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{check.readiness_gate_status}</DictionaryToken></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.value_present} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.unit_present} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.source_name_present} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.source_url_present} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.source_reliability_present} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.region_code_present} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.is_official_data} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.is_pending} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.is_calculated} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.is_manual} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.is_structural_sample} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.is_map_ready} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.is_region_comparable} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={check.is_export_ready} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{check.quality_status}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{check.missing_reason}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{check.quality_notes}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{check.last_updated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegionSourceTable({ rows }: { rows: RegionSourceRecord[] }) {
  const headers = [
    "region_source_id",
    "source_name_zh",
    "source_name_en",
    "source_type",
    "country_coverage",
    "admin_level_coverage",
    "indicator_coverage",
    "boundary_coverage",
    "source_url",
    "source_reliability",
    "source_status",
    "update_frequency",
    "license_status",
    "license_url",
    "usage_note",
    "can_be_used_for_boundary",
    "can_be_used_for_regional_statistics",
    "can_be_used_for_election_data",
    "can_be_used_for_project_location",
    "is_supplementary_only",
    "is_excluded_from_analysis",
    "last_checked",
    "notes",
  ];

  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table region-source-table w-full min-w-[4600px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {headers.map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((source) => (
            <tr key={source.region_source_id} className="align-top">
              <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{source.region_source_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{source.source_name_zh}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{source.source_name_en}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{source.source_type}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{source.country_coverage}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{source.admin_level_coverage}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{source.indicator_coverage}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{source.boundary_coverage}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">
                {source.source_url ? (
                  <a href={source.source_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                    source
                  </a>
                ) : "—"}
              </td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{source.source_reliability}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3">{source.source_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{source.update_frequency}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{source.license_status}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">
                {source.license_url ? (
                  <a href={source.license_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                    license
                  </a>
                ) : "—"}
              </td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{source.usage_note ?? "—"}</td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={source.can_be_used_for_boundary} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={source.can_be_used_for_regional_statistics} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={source.can_be_used_for_election_data} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={source.can_be_used_for_project_location} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={source.is_supplementary_only} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={source.is_excluded_from_analysis} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{source.last_checked}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{source.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectLocationTable({ rows }: { rows: ProjectLocationRecord[] }) {
  const headers = [
    "project_location_id",
    "project_id",
    "project_name",
    "country_id",
    "region_id",
    "region_name",
    "city_or_locality",
    "latitude",
    "longitude",
    "location_precision",
    "location_source_name",
    "location_source_url",
    "location_source_reliability",
    "is_exact_location",
    "is_city_level",
    "is_region_level",
    "is_country_level_only",
    "is_mapped_to_region",
    "is_ready_for_map_layer",
    "location_status",
    "missing_location_reason",
    "last_updated",
    "notes",
  ];

  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table project-location-table w-full min-w-[5000px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {headers.map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((location) => (
            <tr key={location.project_location_id} className="align-top">
              <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{location.project_location_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{location.project_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{location.project_name}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{location.country_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{location.region_id || "待接入"}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{location.region_name}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{location.city_or_locality}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{location.latitude ?? "待接入"}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{location.longitude ?? "待接入"}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{location.location_precision}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3">{location.location_source_name}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">
                {location.location_source_url ? (
                  <a href={location.location_source_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                    source
                  </a>
                ) : "待接入"}
              </td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{location.location_source_reliability}</DictionaryToken></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={location.is_exact_location} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={location.is_city_level} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={location.is_region_level} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={location.is_country_level_only} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={location.is_mapped_to_region} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={location.is_ready_for_map_layer} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{location.location_status}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{location.missing_location_reason}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{location.last_updated}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{location.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MapLayerRegistryTable({ rows }: { rows: MapLayerRecord[] }) {
  const headers = [
    "layer_id",
    "layer_name_zh",
    "layer_name_en",
    "layer_type",
    "data_source_table",
    "geometry_source_table",
    "admin_level",
    "country_coverage",
    "indicator_or_variable",
    "is_active",
    "license_checked",
    "authoritative_topology_checked",
    "region_id_final_matched",
    "visual_qa_passed",
    "public_display_ready",
    "is_ready_for_display",
    "readiness_gate_status",
    "visual_qa_started",
    "feature_rendered_count",
    "fit_bounds_checked",
    "tooltip_checked",
    "visual_overlap_checked",
    "missing_geometry_checked",
    "is_structural_sample",
    "is_official_data",
    "is_manual",
    "is_pending",
    "legend_type",
    "legend_unit",
    "color_scale",
    "interaction_type",
    "tooltip_fields",
    "allowed_filters",
    "source_requirement",
    "quality_requirement",
    "model_boundary",
    "last_updated",
    "notes",
  ];

  return (
    <div className="mt-5 wide-table-scroll max-w-full">
      <table className="research-data-table map-layer-table w-full min-w-[5600px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {headers.map((header) => (
              <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((layer) => (
            <tr key={layer.layer_id} className="align-top">
              <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono text-xs">{layer.layer_id}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{layer.layer_name_zh}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{layer.layer_name_en}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{layer.layer_type}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{layer.data_source_table}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{layer.geometry_source_table}</td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{layer.admin_level}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{layer.country_coverage}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{layer.indicator_or_variable}</td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.is_active} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.license_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.authoritative_topology_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.region_id_final_matched} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.visual_qa_passed} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.public_display_ready} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.is_ready_for_display} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{layer.readiness_gate_status}</DictionaryToken></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.visual_qa_started} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono">{layer.feature_rendered_count}</td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.fit_bounds_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.tooltip_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.visual_overlap_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.missing_geometry_checked} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.is_structural_sample} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.is_official_data} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.is_manual} /></td>
              <td className="boolean-column border-b border-[var(--line)] px-3 py-3"><BooleanCell value={layer.is_pending} /></td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{layer.legend_type}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3"><DictionaryToken>{layer.legend_unit}</DictionaryToken></td>
              <td className="border-b border-[var(--line)] px-3 py-3">{layer.color_scale}</td>
              <td className="border-b border-[var(--line)] px-3 py-3">{layer.interaction_type}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{layer.tooltip_fields.join(", ")}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{layer.allowed_filters.join(", ")}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{layer.source_requirement}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{layer.quality_requirement}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{layer.model_boundary}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 font-mono text-xs">{layer.last_updated}</td>
              <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{layer.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResearchDataExportLinks() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const exportStatusCards = [
    { label: "CSV 导出结构", value: "已预留", note: "17 个逻辑数据层均生成 .csv 文件。" },
    { label: "JSON 导出结构", value: "已预留", note: "17 个逻辑数据层均生成 .json 文件。" },
    { label: "当前阶段", value: "v0.14 Hungary boundary readiness gate", note: "匈牙利 NUTS3 展示准入核验中；正式真实地图、模型、预测、指数和风险分数仍未启用。" },
  ];

  return (
    <>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {exportStatusCards.map((item) => (
          <article key={item.label} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-[var(--accent)]">{item.value}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.note}</p>
          </article>
        ))}
      </div>
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
    </>
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
                <td className="dictionary-section-cell border-b border-[var(--line)] px-3 py-3"><SemanticField label="指标类别"><DictionaryToken>{indicatorCategoryLabel(indicator.category)}</DictionaryToken></SemanticField></td>
                <td className="dictionary-section-cell border-b border-[var(--line)] px-3 py-3"><SemanticField label="所属板块"><DictionaryToken>{indicatorCategoryLabel(indicator.category)}</DictionaryToken></SemanticField></td>
                <td className="dictionary-unit-cell border-b border-[var(--line)] px-3 py-3"><SemanticField label="单位"><DictionaryToken>{indicator.unit}</DictionaryToken></SemanticField></td>
                <td className="dictionary-frequency-cell border-b border-[var(--line)] px-3 py-3"><SemanticField label="频率"><DictionaryToken>{indicator.frequency}</DictionaryToken></SemanticField></td>
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
  const qualityQuery = useResearchDataRecords<DataQualityCheckRecord>("data_quality_checks.json");
  const observationQuery = useResearchDataRecords<StandardObservationRecord>("observations.json");
  const records = qualityQuery.records ?? [];
  const observationRecords = observationQuery.records ?? [];
  const observationById = useMemo(() => new Map(observationRecords.map((observation) => [observation.observation_id, observation])), [observationRecords]);
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

  if (qualityQuery.isLoading || observationQuery.isLoading) {
    return <DeferredTableState label="正在加载 data_quality_checks.json 和 observations.json；质量验收表不再进入数据页首屏渲染。" />;
  }

  if (qualityQuery.error || observationQuery.error) {
    return <DeferredTableState label={`数据质量验收加载失败：${qualityQuery.error ?? observationQuery.error ?? "未知错误"}`} />;
  }

  return (
    <div className="mt-4">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-3">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h4 className="text-base font-semibold">数据质量验收汇总</h4>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              汇总 240 个 V4 扩展观测位置的正式数据、待接入、计算值、人工整理和 A/B/C/D 来源数量。
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              汇总字段：总观测位置、正式数据数量、待接入数量、计算值数量、人工整理数量、通过数量、部分通过数量、需复核数量、不进入分析数量、A 级来源数量、B 级来源数量、C 级来源数量、D 级来源数量。
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">data_quality_checks</span>
        </div>
        <div className="mb-4 grid gap-2 md:grid-cols-3 xl:grid-cols-5">
          {qualitySummaryCards.map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--line)] bg-white/75 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{item.label}</p>
              <p className="mt-1 font-mono text-lg font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
        <h4 className="mb-2 text-base font-semibold">筛选</h4>
        <p className="mb-3 text-xs leading-5 text-[var(--muted)]">
          筛选字段：国家、指标、年份、状态、来源等级、是否正式数据、是否待接入、是否计算值、是否人工整理、是否进入横向比较、是否进入五年变化、是否进入均值差距、是否进入排名变化、质量状态。
        </p>
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
                <p className="eyebrow">Regional Map Data Structure</p>
                <h3 className="mt-2 text-lg font-semibold">区域地图数据结构</h3>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--muted)]">
                  v0.12 匈牙利 NUTS3 沙盒验证与拓扑 QA 状态集中在这里；完整表体仍在下方研究数据结构总表按需展开。v0.8 的九个逻辑数据层继续保留，不删除、不合并。
                </p>
              </div>
              <span className="text-xs text-[var(--muted)]">8 个区域地图数据表</span>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {regionMapDataStructureEntries.map((entry) => (
                <button
                  key={`region-map-${entry.id}`}
                  type="button"
                  onClick={() => openDataEntry(entry)}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-3 text-left transition hover:border-[var(--accent)] hover:bg-white"
                >
                  <span className="font-mono text-xs font-semibold text-[var(--accent)]">
                    {entry.id.replace("-layer-entry", "").replace(/-/g, "_").replace("_entry", "")}
                  </span>
                  <span className="mt-1 block text-sm font-semibold">{entry.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{entry.description}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="eyebrow">v0.14 Hungary Boundary Readiness Gate</p>
                  <h4 className="mt-2 text-base font-semibold">区域表字段级验收</h4>
                  <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--muted)]">
                    八个区域表继续保留完整字段、枚举/状态和用途说明；v0.14 只在既有 region_quality_checks 与 map_layers 中记录展示准入闸门，不新增第 18 张表。
                  </p>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">8 / 8 表体已实化</span>
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {regionalSchemaChecks.map((schema) => (
                  <article key={schema.table} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="font-mono text-sm font-semibold text-[var(--accent)]">{schema.table}</h5>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-[var(--muted)]">{schema.priority}</span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                      <span className="font-semibold text-[var(--foreground)]">原因：</span>{schema.why}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                      <span className="font-semibold text-[var(--foreground)]">完整字段：</span>{schema.fields}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                      <span className="font-semibold text-[var(--foreground)]">枚举 / 状态：</span>{schema.enums}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                      <span className="font-semibold text-[var(--foreground)]">当前说明：</span>{schema.status}
                    </p>
                    <details className="mt-3 rounded-xl border border-[var(--line)] bg-white/75 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-[var(--foreground)]">字段级表体矩阵</summary>
                      <div className="mt-3 wide-table-scroll max-w-full">
                        <table className="research-data-table w-full min-w-[1600px] border-separate border-spacing-0 text-left text-xs">
                          <thead>
                            <tr className="uppercase tracking-[0.14em] text-[var(--muted)]">
                              {["字段名", "字段含义", "允许状态", "来源要求", "是否进入地图展示", "是否进入未来模型候选", "备注"].map((header) => (
                                <th key={header} className="border-b border-[var(--line)] px-3 pb-2 font-semibold first:pl-0">{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {splitRegionalSchemaFields(schema.fields).map((field) => (
                              <tr key={`${schema.table}-${field}`} className="align-top">
                                <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-mono font-semibold text-[var(--accent)]">{field}</td>
                                <td className="border-b border-[var(--line)] px-3 py-3 leading-5 text-[var(--muted)]">{regionalFieldMeaning(field)}</td>
                                <td className="border-b border-[var(--line)] px-3 py-3 leading-5 text-[var(--muted)]">{regionalFieldAllowedStatus(schema.table, field)}</td>
                                <td className="border-b border-[var(--line)] px-3 py-3 leading-5 text-[var(--muted)]">{regionalFieldSourceRequirement(schema.table, field)}</td>
                                <td className="border-b border-[var(--line)] px-3 py-3 leading-5 text-[var(--muted)]">{regionalFieldMapDisplayRule(schema.table, field)}</td>
                                <td className="border-b border-[var(--line)] px-3 py-3 leading-5 text-[var(--muted)]">{regionalFieldModelRule(field)}</td>
                                <td className="border-b border-[var(--line)] px-3 py-3 leading-5 text-[var(--muted)]">v0.14 readiness gate 字段口径；不新增模型、预测、风险指数或中国经济暴露指数。</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            </div>
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
                以下十七个逻辑数据层常驻在数据页；v0.8 的九个逻辑数据层继续保留，v0.14 只在既有区域地图数据结构上增加匈牙利 NUTS3 展示准入闸门。它们用于页面检索、复制、抓取、质量验收和后续 CSV / JSON 导出。其中 regions 是区域主键层，region_boundaries 是边界来源、沙盒文件和展示状态登记层，region_indicators 是独立于国家级 indicators 的区域指标字典，region_observations 是区域经济数据主表，region_quality_checks 是区域质量验收层，region_sources 是区域来源字典，project_locations 是对华项目地区定位桥表，map_layers 是地图图层注册表。
              </p>
            </div>
            <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs text-[var(--muted)]">按需展开</span>
          </div>

          <div className="mt-5 grid gap-5">
            <DeferredDetails id="countries-layer-entry" title="countries：十国国家元数据表">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                countries 是所有 regions、observations、china_projects、derived_comparisons 和 china_exposure_candidates 的 country_id 关联表。政治人物字段未逐条官方核验前保留“待核验”。
              </p>
              <CountryMetadataTable />
            </DeferredDetails>

            <DeferredDetails id="regions-layer-entry" title="regions：v0.11 区域元数据表">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                regions 是地图层的稳定区域主键表。v0.11 已将匈牙利 20 个 NUTS3 code 与 region_id 做离线预匹配；最终核验前仍保持 pilot_pending_region_code_match。非 V4 六国继续保留国家级待接入占位。
              </p>
              <RegionMetadataTable rows={regionMetadataRecords} />
            </DeferredDetails>

            <DeferredDetails id="region-boundaries-layer-entry" title="region_boundaries：v0.12 区域边界沙盒登记表">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                region_boundaries 已将 hu_nuts3_gisco_2024 标记为 sandbox_downloaded / sandbox_filtered / not_ready_for_display。v0.12 只执行沙盒验证与基础拓扑 QA，不直接渲染真实边界。
              </p>
              <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--line)] bg-white/65 p-4 text-xs leading-6 text-[var(--muted)]">
                <p>
                  <span className="font-semibold text-[var(--foreground)]">GeoJSON 沙盒路径：</span>{" "}
                  <code>/data/boundaries/sandbox/hu_nuts3_gisco_2024.geojson</code>
                </p>
                <p>
                  <span className="font-semibold text-[var(--foreground)]">校验记录路径：</span>{" "}
                  <code>/data/boundaries/sandbox/hu_nuts3_gisco_2024.validation.json</code>
                </p>
                <p>
                  <span className="font-semibold text-[var(--foreground)]">validation.json 字段：</span>{" "}
                  source_file、filtered_country、admin_level、coordinate_system、feature_count、expected_feature_count、nuts_codes_count、geometry_present、topology_checked、region_id_match_status、ready_for_display、notes。
                </p>
                <p>当前边界：基础拓扑 QA 已执行；权威拓扑验收与最终主键核验尚未完成，ready_for_display 必须保持 false。</p>
              </div>
              <RegionBoundaryTable rows={regionBoundaryRecords} />
            </DeferredDetails>

            <DeferredDetails id="region-indicators-layer-entry" title="region_indicators：v0.9 区域指标字典">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                region_indicators 是区域级独立指标字典，不复用国家级 indicators。v0.9 第一批只覆盖区域人口、区域 GDP、区域人均 GDP、区域失业率、区域产业结构、区域制造业比重、区域首府/主要城市、区域对华项目数量、区域对华项目状态和区域边界状态。
              </p>
              <RegionIndicatorDictionaryTable rows={regionIndicatorRecords} />
            </DeferredDetails>

            <DeferredDetails id="region-observations-layer-entry" title="region_observations：v0.9 区域观测值表">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                region_observations 是区域经济数据主表。v0.9 第一版只为 V4 四国 ADM1 区域建立区域人口、区域 GDP、区域人均 GDP、区域失业率和区域制造业比重的 2025 待接入观测位置；当前不硬填数值，不进入地图图层、区域比较或未来模型候选。
              </p>
              <RegionObservationTable rows={regionObservationRecords} />
            </DeferredDetails>

            <DeferredDetails id="region-quality-checks-layer-entry" title="region_quality_checks：v0.14 展示准入质量验收">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                region_quality_checks 用于提前验收区域数据是否具备边界、许可、来源、区域代码、数值、单位和地图图层准备条件。v0.12 在同一逻辑层内增加 Hungary NUTS3 sandbox QA 摘要；不展开新的逻辑表。
              </p>
              <HungarySandboxQaSummaryCards summary={hungaryNuts3SandboxQaSummary} />
              <HungaryVisualQaSummaryCards summary={hungaryNuts3VisualQaSummary} />
              <RegionQualitySummaryCards summary={regionQualitySummary} />
              <RegionQualityCheckTable rows={regionQualityCheckRecords} />
            </DeferredDetails>

            <DeferredDetails id="region-sources-layer-entry" title="region_sources：v0.11 区域来源字典">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                region_sources 独立于国家级 sources。v0.11 已锁定 GISCO NUTS 2024 Level 3 GeoJSON，但 license_status 继续保持待确认，沙盒下载不代表已获得公开展示资格。
              </p>
              <RegionSourceTable rows={regionSourceRecords} />
            </DeferredDetails>

            <DeferredDetails id="project-locations-layer-entry" title="project_locations：v0.9 对华项目地区定位表">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                project_locations 把 china_projects 映射到 regions。当前只做区域级或城市级定位结构，未接入可核验地理编码来源前不填经纬度，不进入正式地图图层，也不生成中国经济暴露指数。
              </p>
              <ProjectLocationTable rows={projectLocationRecords} />
            </DeferredDetails>

            <DeferredDetails id="map-layers-layer-entry" title="map_layers：v0.14 展示准入图层注册表">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                map_layers 只注册未来地图工作台的可控图层。v0.14 的 hu_nuts3_boundary_pilot 已通过内部视觉 QA，但 license、authoritative topology 与 final region_id match 尚未完成，因此 public_display_ready=false、is_ready_for_display=false、readiness_gate_status=not_ready_for_public_display。
              </p>
              <MapLayerRegistryTable rows={mapLayerRecords} />
            </DeferredDetails>

            <DeferredDetails id="indicator-dictionary-entry" title="指标字典入口：18 个指标完整表体">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                覆盖 6 个基础宏观指标和 12 个 V4 扩展指标；每个指标均展开为完整字段。
              </p>
              <IndicatorDictionaryTable rows={completeIndicatorDictionaryRows} />
            </DeferredDetails>

            <DeferredDetails id="source-dictionary-entry" title="来源字典入口：16 类来源完整表体">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                覆盖 Eurostat、各国统计局、央行、国际组织、欧盟机构、政府部门、新闻来源、企业公告、人工整理来源和结构样例来源等。
              </p>
              <SourceDictionaryTable rows={sourceDictionaryRows} />
            </DeferredDetails>

            <DeferredDetails id="v4-data-quality-entry" title="数据质量验收入口：240 个 V4 观测位置验收结构">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                验收范围为 V4 四国 × 12 个扩展指标 × 2021-2025 年，共 240 个观测位置；每行均分列数值、单位、状态、来源、来源等级、更新时间和派生资格。
              </p>
              <V4QualityDetailTable v4Quality={v4Quality} countryNameBySlug={countryNameBySlug} />
            </DeferredDetails>

            <DeferredDetails id="v4-derived-comparison-entry" title="派生比较表入口：五个板块事实派生表">
              <h3 className="mt-4 text-xl font-semibold">派生比较表</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                按财政、外部经济、投资、能源和产业五个板块展开。每行固定展示最高值、最低值、V4 均值、均值差距、五年变化和排名变化；只做事实位置比较，不输出风险判断。
              </p>
              <V4DerivedComparisonTable records={derivedComparisonsData.records as DerivedComparisonRecord[]} />
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
            </DeferredDetails>

            <DeferredDetails id="data-export-entry" title="数据导出与接口准备">
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                CSV 导出结构：已预留。JSON 导出结构：已预留。当前阶段：v0.14 Hungary boundary readiness gate；既有 17 个逻辑层同步展示准入状态，不提供模型 API。
                当前导出对象包括 countries、regions、region_boundaries、region_indicators、region_observations、region_quality_checks、region_sources、project_locations、map_layers、indicators、sources、observations、data_quality_checks、derived_comparisons、china_projects、china_exposure_candidates 和 methodology_rules。
              </p>
              <ResearchDataExportLinks />
            </DeferredDetails>
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
                标准 observations 表覆盖 10 国 × 6 个基础宏观指标 × 2021–2025，以及 V4 四国 × 12 个扩展指标 × 2021–2025，共 540 条年度观测值。完整表体按需从导出文件加载。
              </p>
              <StandardObservationTableLoader />
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
