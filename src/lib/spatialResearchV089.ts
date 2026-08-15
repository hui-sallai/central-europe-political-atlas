import continuityFile from "../data/regional/v089-continuity.json";
import gapAuditFile from "../data/regional/v089-gap-audit.json";
import { projectLocationReadiness, mapLayerReadinessV087 } from "./spatialDataV087";
import { regionIndicatorRecords } from "./regionIndicators";
import { regionMetadataRecords } from "./regions";
import { regionObservationRecords } from "./regionObservations";
import {
  regionalRankingsV088,
  spatialResearchCountriesV088,
  spatialResearchProjectsV088,
  spatialResearchRegionsV088,
} from "./spatialResearchV088";

export const spatialResearchLayerIdsV089 = [
  "regional_boundary",
  "regional_population",
  "regional_population_change_pct",
  "regional_gdp",
  "regional_gdp_per_capita",
  "regional_gdp_per_capita_change_pct",
  "regional_unemployment_rate",
  "regional_employment_rate",
  "regional_unemployment_change_pp",
  "regional_manufacturing_share",
  "china_project_locations",
] as const;

const indicatorById = new Map(regionIndicatorRecords.map((indicator) => [indicator.region_indicator_id, indicator]));
const layerGroup = (layerId: string) => {
  if (layerId === "regional_boundary") return "Boundary";
  if (layerId === "china_project_locations") return "Projects";
  if (["regional_population", "regional_population_change_pct"].includes(layerId)) return "Demography";
  if (["regional_unemployment_rate", "regional_employment_rate", "regional_unemployment_change_pp"].includes(layerId)) return "Labour";
  if (layerId === "regional_manufacturing_share") return "Industry";
  return "Economy";
};

export const spatialResearchLayersV089 = spatialResearchLayerIdsV089.map((layerId) => {
  const indicator = indicatorById.get(layerId);
  return {
    layer_id: layerId,
    name_zh: layerId === "regional_boundary" ? "行政边界" : layerId === "china_project_locations" ? "对华项目位置" : indicator?.name_zh ?? layerId,
    group: layerGroup(layerId),
    unit: indicator?.unit ?? "不适用",
    layer_type: layerId === "regional_boundary" ? "boundary" : layerId === "china_project_locations" ? "point" : "choropleth",
    comparison_allowed: !["regional_boundary", "china_project_locations"].includes(layerId),
    definition: indicator?.notes ?? (layerId === "china_project_locations" ? "已核验项目的城市或区域参考位置；不代表项目经济影响。" : "已核验行政边界。"),
    source_requirement: layerId === "china_project_locations" ? "项目级 A/B/C 来源与位置置信度" : indicator?.primary_source ?? "边界许可与质量闸门",
    interpretation_boundary: "只显示事实值与描述性比较，不生成区域评分、因果判断或预测。",
  };
});

export const spatialResearchCountriesV089 = spatialResearchCountriesV088;
export const spatialResearchRegionsV089 = spatialResearchRegionsV088;
export const spatialResearchProjectsV089 = spatialResearchProjectsV088;

export const spatialResearchObservationsV089 = regionObservationRecords
  .filter((record) => record.value !== null && !record.is_pending && !record.is_structural_sample)
  .map((record) => ({
    region_observation_id: record.region_observation_id,
    country_id: record.country_id,
    region_id: record.region_id,
    region_indicator_id: record.region_indicator_id,
    year: record.year,
    value: Number(record.value),
    unit: record.unit,
    value_status: record.value_status,
    source_name: record.source_name,
    source_url: record.source_url,
    source_reliability: record.source_reliability,
    calculation_method: record.calculation_method,
    last_updated: record.last_updated,
    notes: record.notes,
  }));

export const spatialComparisonEligibilityV089 = mapLayerReadinessV087.map((record) => {
  const country = spatialResearchCountriesV089.find((item) => item.country_id === record.country_id);
  const years = [...new Set(spatialResearchObservationsV089
    .filter((observation) => observation.country_id === record.country_id && observation.region_indicator_id === record.layer_id)
    .map((observation) => observation.year))].sort();
  const comparable = record.is_ready_for_display && record.layer_type === "choropleth" && years.length > 0;
  return {
    country_id: record.country_id,
    layer_id: record.layer_id,
    admin_level: country?.admin_level ?? "unavailable",
    definition: spatialResearchLayersV089.find((layer) => layer.layer_id === record.layer_id)?.definition ?? "",
    unit: record.unit,
    available_years: years,
    latest_available_year: years.at(-1) ?? "unavailable",
    comparison_eligible: comparable,
    blocker: comparable ? "" : record.blocker || "层级、覆盖或质量条件尚未满足。",
  };
});

export const regionalRankingsV089 = regionalRankingsV088;
export const regionalIndicatorGapAuditV089 = gapAuditFile.records;
export const regionalBoundaryContinuityV089 = continuityFile.records;

export const regionalCoverageByIndicatorV089 = regionIndicatorRecords.map((indicator) => {
  const facts = spatialResearchObservationsV089.filter((record) => record.region_indicator_id === indicator.region_indicator_id);
  const countryIds = [...new Set(facts.map((record) => record.country_id))];
  const regionIds = [...new Set(facts.map((record) => record.region_id))];
  const years = [...new Set(facts.map((record) => record.year))].sort();
  const eligible = spatialComparisonEligibilityV089.filter((record) => record.layer_id === indicator.region_indicator_id && record.comparison_eligible);
  return {
    indicator_id: indicator.region_indicator_id,
    indicator_name_zh: indicator.name_zh,
    country_count: countryIds.length,
    region_count: regionIds.length,
    available_years: years,
    latest_year: years.at(-1) ?? "unavailable",
    comparison_eligible_country_count: eligible.length,
    unit: indicator.unit,
    source_requirement: indicator.primary_source,
  };
});

export const regionalDerivedComparisonsV089 = spatialResearchObservationsV089.filter((record) =>
  ["regional_population_change_pct", "regional_gdp_per_capita_change_pct", "regional_unemployment_change_pp"].includes(record.region_indicator_id),
);

export const regionalProjectCountsV089 = regionMetadataRecords.map((region) => {
  const projects = projectLocationReadiness.filter((record) => record.region_id === region.region_id && record.map_eligible);
  return {
    country_id: region.country_id,
    region_id: region.region_id,
    region_name_zh: region.region_name_zh,
    verified_project_count: projects.length,
    high_confidence_count: projects.filter((record) => record.confidence === "high").length,
    medium_confidence_count: projects.filter((record) => record.confidence === "medium").length,
    interpretation_boundary: projects.length ? "仅统计当前数据库中已核验并完成区域映射的项目记录。" : "当前数据库无已核验项目记录；不代表该区域不存在相关活动。",
  };
});

export const spatialV089Summary = {
  country_count: spatialResearchCountriesV089.length,
  public_country_count: spatialResearchCountriesV089.filter((country) => country.approved_layers.includes("regional_boundary")).length,
  observation_count: spatialResearchObservationsV089.length,
  derived_observation_count: regionalDerivedComparisonsV089.length,
  comparison_eligible_count: spatialComparisonEligibilityV089.filter((record) => record.comparison_eligible).length,
  project_location_count: spatialResearchProjectsV089.length,
  reviewed_at: "2026-08-15",
};
