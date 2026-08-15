import geometryQaFile from "../../public/data/boundaries/v087/regional-geometry-qa.json";
import licenseFile from "../../public/data/boundaries/v087/shared-license-records.json";
import displayDecisionFile from "../../public/data/boundaries/v087/public-display-decisions.json";
import { countries } from "./data";
import { projectLocationRecords } from "./projectLocations";
import { regionMetadataRecords } from "./regions";
import { regionObservationRecords } from "./regionObservations";
import { regionalCoverageMatrixV086, regionalObservationQa } from "./spatialDataV086";

export const sharedSpatialLicenseRecords = licenseFile.records;
export const regionalGeometryQa = geometryQaFile.records;
const baseDisplayDecisions = displayDecisionFile.records;

export const factualLayerDefinitions = [
  { layer_id: "regional_boundary", label_zh: "行政边界", layer_type: "boundary", indicator_id: null },
  { layer_id: "regional_population", label_zh: "区域人口", layer_type: "choropleth", indicator_id: "regional_population" },
  { layer_id: "regional_gdp", label_zh: "区域 GDP", layer_type: "choropleth", indicator_id: "regional_gdp" },
  { layer_id: "regional_gdp_per_capita", label_zh: "区域人均 GDP", layer_type: "choropleth", indicator_id: "regional_gdp_per_capita" },
  { layer_id: "regional_unemployment_rate", label_zh: "区域失业率", layer_type: "choropleth", indicator_id: "regional_unemployment_rate" },
  { layer_id: "regional_employment_rate", label_zh: "区域就业率", layer_type: "choropleth", indicator_id: "regional_employment_rate" },
  { layer_id: "regional_manufacturing_share", label_zh: "区域制造业 GVA 比重", layer_type: "choropleth", indicator_id: "regional_manufacturing_share" },
  { layer_id: "regional_population_change_pct", label_zh: "区域人口变化（2021–2024）", layer_type: "choropleth", indicator_id: "regional_population_change_pct" },
  { layer_id: "regional_gdp_per_capita_change_pct", label_zh: "区域人均 GDP 变化（2021–2024）", layer_type: "choropleth", indicator_id: "regional_gdp_per_capita_change_pct" },
  { layer_id: "regional_unemployment_change_pp", label_zh: "区域失业率变化（2021–2024）", layer_type: "choropleth", indicator_id: "regional_unemployment_change_pp" },
  { layer_id: "china_project_locations", label_zh: "对华项目区域参考", layer_type: "project_reference", indicator_id: null },
] as const;

type FactualLayerId = (typeof factualLayerDefinitions)[number]["layer_id"];

const factualObservations = regionObservationRecords.filter(
  (record) => record.value !== null && !record.is_pending && !record.is_structural_sample,
);

export type ProjectLocationReadinessRecord = {
  project_location_id: string;
  project_id: string;
  project_name: string;
  country_id: string;
  region_id: string;
  region_name: string;
  city_or_locality: string;
  location_role: string;
  location_precision: string;
  marker_type: "exact_point" | "regional_reference" | "not_mapped";
  confidence: string;
  source_reliability: string;
  source_url: string;
  default_display: boolean;
  optional_display: boolean;
  map_eligible: boolean;
  readiness_status: string;
  notes: string;
};

export const projectLocationReadiness: ProjectLocationReadinessRecord[] = projectLocationRecords.map((record) => {
  const hasExactCoordinates = record.latitude !== null && record.longitude !== null;
  const hasRegionReference = record.is_mapped_to_region && Boolean(record.region_id);
  const evidenceReady = Boolean(record.location_source_url) && record.location_source_reliability !== "D";
  const defaultDisplay = hasRegionReference && evidenceReady && ["high", "medium"].includes(record.confidence);
  const optionalDisplay = hasRegionReference && evidenceReady && record.confidence === "low";
  return {
    project_location_id: record.project_location_id,
    project_id: record.project_id,
    project_name: record.project_name,
    country_id: record.country_id,
    region_id: record.region_id,
    region_name: record.region_name,
    city_or_locality: record.city_or_locality,
    location_role: record.location_role,
    location_precision: record.location_precision,
    marker_type: hasExactCoordinates ? "exact_point" : hasRegionReference ? "regional_reference" : "not_mapped",
    confidence: record.confidence,
    source_reliability: record.location_source_reliability,
    source_url: record.location_source_url,
    default_display: defaultDisplay,
    optional_display: optionalDisplay,
    map_eligible: defaultDisplay || optionalDisplay,
    readiness_status: defaultDisplay
      ? "ready_as_regional_reference"
      : optionalDisplay
        ? "optional_low_confidence_reference"
        : "not_ready_for_map",
    notes: hasExactCoordinates
      ? "精确坐标记录；仍需在 tooltip 显示位置来源和置信度。"
      : hasRegionReference
        ? "区域级参考位置，并非项目精确坐标；marker_type=regional_reference。"
        : "没有可核验区域映射，不进入地图。",
  };
});

export type MapLayerReadinessV087Record = {
  country_id: string;
  country_name_zh: string;
  layer_id: FactualLayerId;
  layer_name_zh: string;
  layer_type: string;
  geometry_ready: boolean;
  data_ready: boolean;
  source_ready: boolean;
  quality_passed: boolean;
  latest_available_year: string;
  latest_common_year: string;
  unit: string;
  classification_method: string;
  is_ready_for_display: boolean;
  blocker: string;
};

function yearsFor(countryId: string, indicatorId: string) {
  return [...new Set(factualObservations
    .filter((record) => record.country_id === countryId && record.region_indicator_id === indicatorId)
    .map((record) => record.year))].sort();
}

function latestCommonYear(indicatorId: string) {
  const approvedCountries = baseDisplayDecisions.filter((record) => record.boundary_ready).map((record) => record.country_id);
  const yearSets = approvedCountries.map((countryId) => new Set(yearsFor(countryId, indicatorId)));
  const candidateYears = [...new Set(yearSets.flatMap((set) => [...set]))].sort().reverse();
  return candidateYears.find((year) => yearSets.every((set) => set.has(year))) ?? "unavailable";
}

export const mapLayerReadinessV087: MapLayerReadinessV087Record[] = countries.flatMap((country) => {
  const displayDecision = baseDisplayDecisions.find((record) => record.country_id === country.slug);
  const regionCount = regionMetadataRecords.filter((region) => region.country_id === country.slug).length;
  const projectReferences = projectLocationReadiness.filter((record) => record.country_id === country.slug && record.default_display);
  return factualLayerDefinitions.map((layer) => {
    const indicatorRecords = layer.indicator_id
      ? factualObservations.filter((record) => record.country_id === country.slug && record.region_indicator_id === layer.indicator_id)
      : [];
    const years = [...new Set(indicatorRecords.map((record) => record.year))].sort();
    const latestYear = years.at(-1) ?? "unavailable";
    const latestRecords = indicatorRecords.filter((record) => record.year === latestYear);
    const dataReady = layer.layer_type === "boundary"
      ? Boolean(displayDecision?.boundary_ready)
      : layer.layer_type === "project_reference"
        ? projectReferences.length > 0
        : latestYear !== "unavailable" && new Set(latestRecords.map((record) => record.region_id)).size === regionCount;
    const geometryReady = Boolean(displayDecision?.boundary_ready);
    const sourceReady = layer.layer_type === "project_reference"
      ? projectReferences.every((record) => ["A", "B", "C"].includes(record.source_reliability) && Boolean(record.source_url))
      : Boolean(displayDecision?.license_ready && displayDecision.attribution_ready);
    const qualityPassed = geometryReady && dataReady && sourceReady;
    const ready = qualityPassed;
    const blocker = ready
      ? ""
      : !geometryReady
        ? displayDecision?.blockers.join(" / ") || "boundary_display_gate_pending"
        : !dataReady
          ? layer.layer_type === "project_reference" ? "no_high_or_medium_confidence_project_reference" : "complete_regional_observations_unavailable"
          : "source_or_quality_gate_pending";
    return {
      country_id: country.slug,
      country_name_zh: country.nameZh,
      layer_id: layer.layer_id,
      layer_name_zh: layer.label_zh,
      layer_type: layer.layer_type,
      geometry_ready: geometryReady,
      data_ready: dataReady,
      source_ready: sourceReady,
      quality_passed: qualityPassed,
      latest_available_year: layer.layer_type === "choropleth" ? latestYear : "not_applicable",
      latest_common_year: layer.indicator_id ? latestCommonYear(layer.indicator_id) : "not_applicable",
      unit: latestRecords[0]?.unit ?? "not_applicable",
      classification_method: layer.layer_type === "choropleth" ? "country_specific_quantiles_up_to_5_bins" : "not_applicable",
      is_ready_for_display: ready,
      blocker,
    };
  });
});

export const publicDisplayDecisionsV087 = baseDisplayDecisions.map((decision) => {
  const layers = mapLayerReadinessV087.filter((record) => record.country_id === decision.country_id);
  return {
    ...decision,
    approved_layers: layers.filter((record) => record.is_ready_for_display).map((record) => record.layer_id),
    rejected_layers: layers.filter((record) => !record.is_ready_for_display).map((record) => record.layer_id),
    blockers: [...new Set([
      ...decision.blockers,
      ...layers.filter((record) => !record.is_ready_for_display).map((record) => `${record.layer_id}:${record.blocker}`),
    ])],
  };
});

export const spatialDisplayGateAudit = countries.map((country) => {
  const decision = publicDisplayDecisionsV087.find((record) => record.country_id === country.slug);
  const qa = regionalGeometryQa.find((record) => record.country_id === country.slug);
  const layers = mapLayerReadinessV087.filter((record) => record.country_id === country.slug);
  const layerReady = (layerId: FactualLayerId) => layers.find((record) => record.layer_id === layerId)?.is_ready_for_display ?? false;
  return {
    country_id: country.slug,
    country_name_zh: country.nameZh,
    geometry_ready: Boolean(qa?.geometry_ready),
    region_ids_matched: Boolean(qa?.region_id_ready),
    license_checked: Boolean(decision?.license_ready),
    attribution_ready: Boolean(decision?.attribution_ready),
    topology_checked: Boolean(qa?.topology_ready),
    regional_data_ready: layerReady("regional_population") || layerReady("regional_gdp") || layerReady("regional_gdp_per_capita"),
    boundary_layer_ready: layerReady("regional_boundary"),
    population_layer_ready: layerReady("regional_population"),
    gdp_layer_ready: layerReady("regional_gdp"),
    gdp_per_capita_layer_ready: layerReady("regional_gdp_per_capita"),
    unemployment_layer_ready: layerReady("regional_unemployment_rate"),
    employment_layer_ready: layerReady("regional_employment_rate"),
    manufacturing_layer_ready: layerReady("regional_manufacturing_share"),
    population_change_layer_ready: layerReady("regional_population_change_pct"),
    gdp_per_capita_change_layer_ready: layerReady("regional_gdp_per_capita_change_pct"),
    unemployment_change_layer_ready: layerReady("regional_unemployment_change_pp"),
    project_layer_ready: layerReady("china_project_locations"),
    approved_layer_count: layers.filter((record) => record.is_ready_for_display).length,
    public_display_blocker: decision?.boundary_ready
      ? layers.filter((record) => !record.is_ready_for_display).map((record) => `${record.layer_name_zh}: ${record.blocker}`).join("；")
      : decision?.blockers.join("；") || "display_decision_unavailable",
  };
});

export const regionalCoverageMatrixV087 = regionalCoverageMatrixV086.map((record) => {
  const layers = mapLayerReadinessV087.filter((layer) => layer.country_id === record.country_id);
  const approved = layers.filter((layer) => layer.is_ready_for_display);
  const rejected = layers.filter((layer) => !layer.is_ready_for_display);
  const commonYears = approved.map((layer) => layer.latest_common_year).filter((year) => year !== "not_applicable" && year !== "unavailable");
  return {
    ...record,
    boundary_ready: approved.some((layer) => layer.layer_id === "regional_boundary"),
    public_layer_count: approved.length,
    approved_layers: approved.map((layer) => layer.layer_id),
    rejected_layers: rejected.map((layer) => layer.layer_id),
    blocker: rejected.map((layer) => `${layer.layer_name_zh}: ${layer.blocker}`).join("；"),
    latest_common_year: commonYears.sort().at(-1) ?? "unavailable",
    project_display_eligible_count: projectLocationReadiness.filter((item) => item.country_id === record.country_id && item.default_display).length,
    project_ready: approved.some((layer) => layer.layer_id === "china_project_locations"),
    priority_gaps: rejected.map((layer) => layer.layer_name_zh),
  };
});

export type RegionalCoverageV087Record = (typeof regionalCoverageMatrixV087)[number];

export const factualMapObservations = factualObservations.filter((record) => {
  const readiness = mapLayerReadinessV087.find(
    (layer) => layer.country_id === record.country_id && layer.layer_id === record.region_indicator_id,
  );
  return readiness?.is_ready_for_display && record.year === readiness.latest_available_year;
});

export const factualMapCountries = countries.map((country) => {
  const boundary = regionalCoverageMatrixV087.find((record) => record.country_id === country.slug);
  const manifestRecord = geometryQaFile.records.find((record) => record.country_id === country.slug);
  const sourceManifest = displayDecisionFile.records.find((record) => record.country_id === country.slug);
  const sourceLicense = sharedSpatialLicenseRecords.find((record) => record.license_record_id === sourceManifest?.license_record_id);
  const projectReferences = projectLocationReadiness.filter((record) => record.country_id === country.slug && record.map_eligible);
  return {
    country_id: country.slug,
    country_name_zh: country.nameZh,
    country_name_en: country.nameEn,
    geometry_url: manifestRecord?.geometry_file.replace(/^public[\\/]/, "/").replaceAll("\\", "/") ?? "",
    region_count: boundary?.region_count ?? 0,
    approved_layers: boundary?.approved_layers ?? [],
    rejected_layers: boundary?.rejected_layers ?? [],
    latest_common_year: boundary?.latest_common_year ?? "unavailable",
    source_name: sourceLicense?.provider ?? manifestRecord?.source_name ?? "unavailable",
    source_url: sourceLicense?.source_url ?? "",
    attribution: sourceLicense?.attribution ?? "",
    blocker: boundary?.blocker ?? "display_decision_unavailable",
    project_references: projectReferences,
  };
});

export const spatialV087Summary = {
  country_count: countries.length,
  region_count: regionMetadataRecords.length,
  geometry_qa_passed_country_count: regionalGeometryQa.filter((record) => record.topology_ready && record.region_id_ready).length,
  public_boundary_country_count: spatialDisplayGateAudit.filter((record) => record.boundary_layer_ready).length,
  public_layer_count: mapLayerReadinessV087.filter((record) => record.is_ready_for_display).length,
  project_reference_count: projectLocationReadiness.filter((record) => record.map_eligible).length,
  factual_observation_count: regionalObservationQa.factual_observation_count,
  reviewed_at: "2026-08-15",
};
