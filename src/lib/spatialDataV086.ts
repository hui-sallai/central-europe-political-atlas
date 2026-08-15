import boundaryManifest from "../../public/data/boundaries/v086/spatial-boundary-manifest.json";
import { countries } from "./data";
import { projectLocationRecords } from "./projectLocations";
import { regionMetadataRecords } from "./regions";
import { regionObservationRecords } from "./regionObservations";

export type SpatialBoundaryManifestRecord = (typeof boundaryManifest.records)[number];

const p0Indicators = ["regional_population", "regional_gdp", "regional_gdp_per_capita"];
const p1Indicators = ["regional_unemployment_rate", "regional_manufacturing_share"];
const factualObservations = regionObservationRecords.filter((record) => record.value !== null && !record.is_pending);

export const spatialBoundaryManifestRecords = boundaryManifest.records;

export const regionalObservationQa = (() => {
  const ids = new Set<string>();
  let duplicateObservationCount = 0;
  let countryMismatchCount = 0;
  let impossibleValueCount = 0;
  let missingSourceCount = 0;

  for (const observation of factualObservations) {
    if (ids.has(observation.region_observation_id)) duplicateObservationCount += 1;
    ids.add(observation.region_observation_id);
    const region = regionMetadataRecords.find((item) => item.region_id === observation.region_id);
    if (!region || region.country_id !== observation.country_id) countryMismatchCount += 1;
    if (typeof observation.value === "number" && observation.value <= 0) impossibleValueCount += 1;
    if (!observation.source_name || !observation.source_url) missingSourceCount += 1;
  }

  return {
    observation_count: regionObservationRecords.length,
    factual_observation_count: factualObservations.length,
    pending_observation_count: regionObservationRecords.length - factualObservations.length,
    duplicate_observation_count: duplicateObservationCount,
    country_mismatch_count: countryMismatchCount,
    impossible_value_count: impossibleValueCount,
    missing_source_count: missingSourceCount,
    review_required: duplicateObservationCount + countryMismatchCount + impossibleValueCount + missingSourceCount > 0,
    notes: "QA 只标记异常，不自动修改数值。国家值不会下推到区域层。",
  };
})();

export type MapLayerReadinessRecord = {
  country_id: string;
  layer_id: string;
  layer_type: "boundary" | "choropleth" | "project_reference";
  data_ready: boolean;
  boundary_ready: boolean;
  project_trace_ready: boolean;
  quality_passed: boolean;
  latest_year: string;
  source_reliability: string;
  is_ready_for_display: boolean;
  unavailable_reason: string;
};

export const mapLayerReadiness: MapLayerReadinessRecord[] = countries.flatMap((country) => {
  const boundary = boundaryManifest.records.find((record) => record.country_id === country.slug);
  const observations = factualObservations.filter((record) => record.country_id === country.slug);
  const latestYear = observations.map((record) => record.year).sort().at(-1) ?? "unavailable";
  const projectTraces = projectLocationRecords.filter((record) => record.country_id === country.slug && record.is_mapped_to_region && record.location_source_url);
  const boundaryReady = Boolean(boundary?.is_ready_for_display);
  const countryQualityPassed = Boolean(boundary && boundary.missing_region_count === 0 && boundary.invalid_geometry_count === 0);
  const layer = (layerId: string, layerType: MapLayerReadinessRecord["layer_type"], indicatorId?: string): MapLayerReadinessRecord => {
    const dataReady = indicatorId
      ? observations.some((record) => record.region_indicator_id === indicatorId)
      : layerType === "boundary" ? Boolean(boundary?.actual_feature_count) : projectTraces.length > 0;
    const projectTraceReady = projectTraces.length > 0;
    const ready = layerType === "boundary"
      ? boundaryReady && countryQualityPassed
      : layerType === "choropleth"
        ? boundaryReady && dataReady && countryQualityPassed
        : boundaryReady && projectTraceReady && projectTraces.some((record) =>
            record.is_ready_for_map_layer && record.latitude !== null && record.longitude !== null,
          );
    return {
      country_id: country.slug,
      layer_id: layerId,
      layer_type: layerType,
      data_ready: dataReady,
      boundary_ready: boundaryReady,
      project_trace_ready: projectTraceReady,
      quality_passed: countryQualityPassed,
      latest_year: latestYear,
      source_reliability: layerType === "project_reference" ? "A/B record-level source" : boundary?.source_name.includes("GISCO") ? "A" : "B / licence pending",
      is_ready_for_display: ready,
      unavailable_reason: ready ? "" : !boundaryReady
        ? "边界公开展示闸门尚未通过。"
        : !dataReady ? "该图层没有合格区域观测值。" : "项目定位或质量验收尚未通过。",
    };
  };

  return [
    layer("regional_boundary", "boundary"),
    layer("regional_population", "choropleth", "regional_population"),
    layer("regional_gdp", "choropleth", "regional_gdp"),
    layer("regional_gdp_per_capita", "choropleth", "regional_gdp_per_capita"),
    layer("regional_unemployment_rate", "choropleth", "regional_unemployment_rate"),
    layer("regional_manufacturing_share", "choropleth", "regional_manufacturing_share"),
    layer("china_project_locations", "project_reference"),
  ];
});

export type RegionalCoverageV086Record = {
  country_id: string;
  country_name_zh: string;
  classification_system: string;
  admin_level: string;
  region_count: number;
  geometry_count: number;
  geometry_match_status: string;
  p0_indicator_count: number;
  p1_indicator_count: number;
  factual_observation_count: number;
  pending_observation_count: number;
  latest_year: string;
  project_mapped_count: number;
  project_display_eligible_count: number;
  boundary_ready: boolean;
  regional_data_ready: boolean;
  project_ready: boolean;
  public_layer_count: number;
  priority_gaps: string[];
};

export const regionalCoverageMatrixV086: RegionalCoverageV086Record[] = countries.map((country) => {
  const boundary = boundaryManifest.records.find((record) => record.country_id === country.slug);
  const countryObservations = regionObservationRecords.filter((record) => record.country_id === country.slug);
  const facts = countryObservations.filter((record) => record.value !== null && !record.is_pending);
  const p0 = new Set(facts.filter((record) => p0Indicators.includes(record.region_indicator_id)).map((record) => record.region_indicator_id));
  const p1 = new Set(facts.filter((record) => p1Indicators.includes(record.region_indicator_id)).map((record) => record.region_indicator_id));
  const projects = projectLocationRecords.filter((record) => record.country_id === country.slug && record.is_mapped_to_region);
  const readiness = mapLayerReadiness.filter((record) => record.country_id === country.slug);
  const boundaryReady = readiness.find((record) => record.layer_id === "regional_boundary")?.is_ready_for_display ?? false;
  const regionalDataReady = p0.size > 0;
  const projectReady = projects.some((record) => record.is_ready_for_map_layer);
  return {
    country_id: country.slug,
    country_name_zh: country.nameZh,
    classification_system: boundary?.classification_system ?? "pending",
    admin_level: boundary?.admin_level ?? "pending",
    region_count: regionMetadataRecords.filter((region) => region.country_id === country.slug).length,
    geometry_count: boundary?.actual_feature_count ?? 0,
    geometry_match_status: boundary?.region_id_one_to_one_match ? "one_to_one_matched" : "review_required",
    p0_indicator_count: p0.size,
    p1_indicator_count: p1.size,
    factual_observation_count: facts.length,
    pending_observation_count: countryObservations.length - facts.length,
    latest_year: facts.map((record) => record.year).sort().at(-1) ?? "unavailable",
    project_mapped_count: projects.length,
    project_display_eligible_count: projects.filter((record) => record.is_ready_for_map_layer).length,
    boundary_ready: boundaryReady,
    regional_data_ready: regionalDataReady,
    project_ready: projectReady,
    public_layer_count: readiness.filter((record) => record.is_ready_for_display).length,
    priority_gaps: [
      !boundaryReady ? "公开边界闸门" : null,
      p0.size < 3 ? "P0 区域统计" : null,
      p1.size < 2 ? "失业率与制造业比重" : null,
      !projectReady ? "可显示项目定位" : null,
      country.slug === "serbia" ? "国家行政区与 EU NUTS 可比性" : null,
    ].filter((item): item is string => Boolean(item)),
  };
});

export const spatialV086Summary = {
  country_count: countries.length,
  region_count: regionMetadataRecords.length,
  geometry_mapped_country_count: boundaryManifest.records.filter((record) => record.region_id_one_to_one_match).length,
  boundary_display_ready_country_count: regionalCoverageMatrixV086.filter((record) => record.boundary_ready).length,
  p0_data_country_count: regionalCoverageMatrixV086.filter((record) => record.p0_indicator_count === 3).length,
  mapped_project_count: projectLocationRecords.filter((record) => record.is_mapped_to_region).length,
  display_eligible_project_count: projectLocationRecords.filter((record) => record.is_ready_for_map_layer).length,
  factual_observation_count: factualObservations.length,
  pending_observation_count: regionObservationRecords.length - factualObservations.length,
};

export function getRegionProfile(regionId: string) {
  const region = regionMetadataRecords.find((record) => record.region_id === regionId);
  if (!region) return null;
  const latest = factualObservations.filter((record) => record.region_id === regionId).sort((a, b) => b.year.localeCompare(a.year));
  return { region, observations: latest };
}
