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
};

const targetYear = "2025";
const updatedAt = "2026-07-26";
const firstBatchIndicatorIds = [
  "regional_population",
  "regional_gdp",
  "regional_gdp_per_capita",
  "regional_unemployment_rate",
  "regional_manufacturing_share",
];

const firstBatchIndicators = firstBatchIndicatorIds.map((indicatorId) => {
  const indicator = regionIndicatorRecords.find((record) => record.region_indicator_id === indicatorId);
  if (!indicator) {
    throw new Error(`Missing region indicator: ${indicatorId}`);
  }
  return indicator;
});

const v4FirstBatchRegions = regionMetadataRecords.filter((region) =>
  region.is_v4_region && (region.admin_level === "ADM1" || region.admin_level === "NUTS3")
);

function buildPendingObservation(
  region: (typeof v4FirstBatchRegions)[number],
  indicator: (typeof firstBatchIndicators)[number],
): RegionObservationRecord {
  const isCalculated = indicator.region_indicator_id === "regional_gdp_per_capita" || indicator.region_indicator_id === "regional_manufacturing_share";

  return {
    region_observation_id: `${region.region_id}_${indicator.region_indicator_id}_${targetYear}`,
    region_id: region.region_id,
    country_id: region.country_id,
    region_indicator_id: indicator.region_indicator_id,
    year: targetYear,
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
    is_calculated: isCalculated,
    is_manual: false,
    is_structural_sample: false,
    is_in_map_layer: false,
    is_in_region_comparison: false,
    is_in_future_model_candidate: false,
    missing_reason: "v0.11 仅保留区域观测值结构；尚未接入具体 ADM1/NUTS3 区域统计表、来源链接和数值。",
    calculation_method: isCalculated ? "待接入原始分子和分母后再计算；当前不生成计算结果。" : "不适用。",
    last_updated: updatedAt,
    notes: "第一批区域观测位置；不得填 0，不进入地图图层、区域比较或未来模型候选输入。",
  };
}

export const regionObservationRecords: RegionObservationRecord[] = v4FirstBatchRegions.flatMap((region) =>
  firstBatchIndicators.map((indicator) => buildPendingObservation(region, indicator)),
);
