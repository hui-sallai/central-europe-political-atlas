import { chinaProjectRecords } from "./extendedData";
import { projectLocationReadiness, factualMapCountries, mapLayerReadinessV087 } from "./spatialDataV087";
import { regionIndicatorRecords } from "./regionIndicators";
import { regionMetadataRecords } from "./regions";
import { regionObservationRecords } from "./regionObservations";

export const spatialResearchLayerIds = [
  "regional_boundary",
  "regional_population",
  "regional_gdp",
  "regional_gdp_per_capita",
  "regional_unemployment_rate",
  "regional_manufacturing_share",
  "china_project_locations",
] as const;

export type SpatialResearchLayerId = (typeof spatialResearchLayerIds)[number];

const indicatorById = new Map(regionIndicatorRecords.map((indicator) => [indicator.region_indicator_id, indicator]));
const projectById = new Map(chinaProjectRecords.map((project) => [project.projectId, project]));

export const spatialResearchLayersV088 = spatialResearchLayerIds.map((layerId) => {
  const indicator = indicatorById.get(layerId);
  return {
    layer_id: layerId,
    name_zh: layerId === "regional_boundary"
      ? "行政边界"
      : layerId === "china_project_locations"
        ? "对华项目位置"
        : indicator?.name_zh ?? layerId,
    unit: indicator?.unit ?? "不适用",
    layer_type: layerId === "regional_boundary" ? "boundary" : layerId === "china_project_locations" ? "point" : "choropleth",
    comparison_allowed: !["regional_boundary", "china_project_locations"].includes(layerId),
    definition: indicator?.notes ?? (layerId === "china_project_locations" ? "经来源核验的城市或区域参考位置；不代表项目影响。" : "已核验行政边界。"),
  };
});

export const spatialResearchCountriesV088 = factualMapCountries.map((country) => {
  const region = regionMetadataRecords.find((item) => item.country_id === country.country_id);
  return {
    ...country,
    admin_level: region?.admin_level ?? "unavailable",
    classification_system: region?.nuts_adm_classification ?? region?.admin_level ?? "unavailable",
    comparison_group: region ? `${region.admin_level}` : "unavailable",
  };
});

export const spatialResearchRegionsV088 = regionMetadataRecords.map((region) => ({
  region_id: region.region_id,
  country_id: region.country_id,
  region_name_zh: region.region_name_zh,
  region_name_en: region.region_name_en,
  region_name_local: region.region_name_local,
  admin_level: region.admin_level,
  admin_code: region.admin_code,
  capital_or_main_city: region.capital_or_main_city,
}));

export const spatialResearchObservationsV088 = regionObservationRecords
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

export const spatialResearchProjectsV088 = projectLocationReadiness
  .filter((location) => location.map_eligible)
  .map((location) => {
    const project = projectById.get(location.project_id);
    return {
      ...location,
      chinese_actor: project?.chineseActor ?? "待核验",
      local_actor: project?.localActor ?? "待核验",
      sector: project?.sector ?? "待核验",
      project_status: project?.projectStatus ?? "待核验",
      project_status_code: project?.projectStatusCode ?? "announced",
      amount: project?.amount ?? null,
      currency: project?.currency ?? null,
      year: project?.year ?? "待核验",
      quantification_status: project?.quantificationStatus ?? "not_quantifiable",
      verification_status: project?.status ?? "pending",
      risk_tags: project?.riskTags ?? [],
      note: project?.note ?? location.notes,
    };
  });

export const spatialComparisonEligibilityV088 = mapLayerReadinessV087.map((record) => {
  const country = spatialResearchCountriesV088.find((item) => item.country_id === record.country_id);
  const years = [...new Set(spatialResearchObservationsV088
    .filter((observation) => observation.country_id === record.country_id && observation.region_indicator_id === record.layer_id)
    .map((observation) => observation.year))].sort();
  const comparable = record.is_ready_for_display && record.layer_type === "choropleth" && years.length > 0;
  return {
    country_id: record.country_id,
    layer_id: record.layer_id,
    admin_level: country?.admin_level ?? "unavailable",
    definition: spatialResearchLayersV088.find((layer) => layer.layer_id === record.layer_id)?.definition ?? "",
    unit: record.unit,
    available_years: years,
    latest_available_year: years.at(-1) ?? "unavailable",
    comparison_eligible: comparable,
    blocker: comparable ? "" : record.blocker || "该图层不参与跨国数值比较。",
  };
});

export const regionalRankingsV088 = spatialResearchObservationsV088.flatMap((observation) => {
  const peers = spatialResearchObservationsV088
    .filter((item) => item.country_id === observation.country_id && item.region_indicator_id === observation.region_indicator_id && item.year === observation.year)
    .sort((a, b) => b.value - a.value);
  return [{
    ranking_id: `${observation.country_id}_${observation.region_indicator_id}_${observation.year}_${observation.region_id}`,
    country_id: observation.country_id,
    region_id: observation.region_id,
    indicator_id: observation.region_indicator_id,
    year: observation.year,
    value: observation.value,
    unit: observation.unit,
    within_country_rank: peers.findIndex((item) => item.region_id === observation.region_id) + 1,
    within_country_count: peers.length,
    ranking_type: "factual_indicator_ranking",
    interpretation_boundary: "仅表示同国同年同指标的事实位置，不代表风险或政策优劣。",
  }];
});

export const spatialV088Summary = {
  country_count: spatialResearchCountriesV088.length,
  public_country_count: spatialResearchCountriesV088.filter((country) => country.approved_layers.includes("regional_boundary")).length,
  observation_count: spatialResearchObservationsV088.length,
  ranking_count: regionalRankingsV088.length,
  comparison_eligible_count: spatialComparisonEligibilityV088.filter((record) => record.comparison_eligible).length,
  project_location_count: spatialResearchProjectsV088.length,
  reviewed_at: "2026-08-15",
};
