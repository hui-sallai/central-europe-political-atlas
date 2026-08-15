import v086RegionalObservations from "../data/regional/v086-observations.json";
import { regionMetadataRecords } from "./regions";
import { regionIndicatorRecords } from "./regionIndicators";

export type RegionObservationRecord = {
  region_observation_id: string;
  region_id: string;
  country_id: string;
  region_indicator_id: string;
  year: string;
  period_type: "annual" | "quarterly" | "monthly" | "event_date" | "snapshot" | "not_applicable";
  value: number | string | null;
  unit: string;
  value_status: "正式数据" | "待接入" | "计算值" | "人工整理" | "结构样例" | "不进入分析";
  source_id: string;
  source_name: string;
  source_url: string;
  source_reliability: "A" | "B" | "C" | "D";
  source_status: "官方来源" | "人工整理" | "待接入" | "结构样例";
  is_official_data: boolean;
  is_pending: boolean;
  is_calculated: boolean;
  is_manual: boolean;
  is_structural_sample: boolean;
  is_in_map_layer: boolean;
  is_in_region_comparison: boolean;
  is_in_future_model_candidate: boolean;
  missing_reason: string;
  calculation_method: string;
  last_updated: string;
  notes: string;
  source: string;
  status: string;
  updated_at: string;
};

const years = ["2021", "2022", "2023", "2024"];
const updatedAt = "2026-08-14";
const firstBatchIndicatorIds = [
  "regional_population",
  "regional_gdp",
  "regional_gdp_per_capita",
  "regional_unemployment_rate",
  "regional_manufacturing_share",
] as const;

const indicatorById = new Map(regionIndicatorRecords.map((indicator) => [indicator.region_indicator_id, indicator]));
const factualRecords = v086RegionalObservations.records as RegionObservationRecord[];
const factualById = new Map(factualRecords.map((record) => [record.region_observation_id, record]));

function pendingObservation(region: (typeof regionMetadataRecords)[number], indicatorId: string, year: string): RegionObservationRecord {
  const indicator = indicatorById.get(indicatorId);
  if (!indicator) throw new Error(`Missing regional indicator ${indicatorId}`);
  const id = `${region.region_id}_${indicatorId}_${year}`;
  const mismatchReason = region.country_id === "serbia"
    ? "塞尔维亚同层级官方区域序列与欧盟 NUTS 口径尚未完成可比性验收。"
    : indicatorId === "regional_unemployment_rate"
      ? "Eurostat 区域失业率的可用层级与当前国家展示层级不完全一致；不做向下分摊。"
      : "官方区域制造业增加值与总增加值的统一分子、分母序列尚未完成接入。";

  return {
    region_observation_id: id,
    region_id: region.region_id,
    country_id: region.country_id,
    region_indicator_id: indicatorId,
    year,
    period_type: "annual",
    value: null,
    unit: indicator.unit,
    value_status: "待接入",
    source_id: "pending_region_sources",
    source_name: indicator.primary_source,
    source_url: "",
    source_reliability: "D",
    source_status: "待接入",
    is_official_data: false,
    is_pending: true,
    is_calculated: indicatorId === "regional_gdp_per_capita" || indicatorId === "regional_manufacturing_share",
    is_manual: false,
    is_structural_sample: false,
    is_in_map_layer: false,
    is_in_region_comparison: false,
    is_in_future_model_candidate: false,
    missing_reason: mismatchReason,
    calculation_method: indicatorId === "regional_manufacturing_share"
      ? "待接入区域制造业 GVA 与区域总 GVA 后计算；当前不生成结果。"
      : "不适用。",
    last_updated: updatedAt,
    notes: "明确缺失位置；不得填 0、复制国家值或进入事实图层。",
    source: indicator.primary_source,
    status: "待接入",
    updated_at: updatedAt,
  };
}

export const regionObservationRecords: RegionObservationRecord[] = regionMetadataRecords.flatMap((region) =>
  years.flatMap((year) => firstBatchIndicatorIds.map((indicatorId) => {
    const id = `${region.region_id}_${indicatorId}_${year}`;
    return factualById.get(id) ?? pendingObservation(region, indicatorId, year);
  })),
);

export const regionalObservationYears = years;
export const regionalFactualObservationCount = factualRecords.length;
