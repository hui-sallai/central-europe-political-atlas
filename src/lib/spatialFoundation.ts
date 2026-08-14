import { countries } from "./data";
import { mapLayerRecords } from "./mapLayers";
import { projectLocationRecords } from "./projectLocations";
import { regionBoundaryRecords } from "./regionBoundaries";
import { regionIndicatorRecords } from "./regionIndicators";
import { regionMetadataRecords } from "./regions";
import { regionObservationRecords } from "./regionObservations";

export type RegionalCoverageRecord = {
  country_id: string;
  country_name_zh: string;
  region_count: number;
  preferred_level: string;
  classification: string;
  geometry_source: string;
  geometry_ready_count: number;
  expected_feature_count: number;
  actual_feature_count: number;
  duplicate_region_code_count: number;
  missing_region_count: number;
  invalid_geometry_count: number;
  coordinate_system: string;
  multipolygon_status: string;
  overlap_status: string;
  gap_status: string;
  containment_status: string;
  region_id_one_to_one_match: boolean;
  topology_status: string;
  license_status: string;
  public_display_ready: boolean;
  regional_indicator_count: number;
  regional_indicator_expected: number;
  mapped_project_count: number;
  verified_mapped_project_count: number;
  comparability_status: string;
  priority_gaps: string[];
};

type CountrySpatialPolicy = {
  preferredLevel: string;
  classification: string;
  source: string;
  licenseStatus: string;
  comparability: string;
};

const giscoSource = "Eurostat GISCO NUTS 2024";

const countrySpatialPolicies: Record<string, CountrySpatialPolicy> = {
  poland: {
    preferredLevel: "ADM1 voivodeship / NUTS correspondence review",
    classification: "16 voivodeship entries; NUTS mapping not assumed",
    source: giscoSource,
    licenseStatus: "GISCO terms recorded; country file and attribution gate pending",
    comparability: "partial: administrative and NUTS statistical units require correspondence review",
  },
  hungary: {
    preferredLevel: "NUTS3 / county-equivalent",
    classification: "20 NUTS3 regions",
    source: `${giscoSource} / 1:1M EPSG:4326 Level 3`,
    licenseStatus: "recorded for non-commercial research use; public display gate remains closed",
    comparability: "geometry and identifiers recorded; regional observations remain pending",
  },
  czechia: {
    preferredLevel: "ADM1 region / NUTS3 correspondence review",
    classification: "14 regional entries; official NUTS code match pending",
    source: giscoSource,
    licenseStatus: "GISCO terms recorded; country file and attribution gate pending",
    comparability: "partial pending official code and statistical-definition alignment",
  },
  slovakia: {
    preferredLevel: "ADM1 region / NUTS3 correspondence review",
    classification: "8 regional entries; official NUTS code match pending",
    source: giscoSource,
    licenseStatus: "GISCO terms recorded; country file and attribution gate pending",
    comparability: "partial pending official code and statistical-definition alignment",
  },
  germany: {
    preferredLevel: "ADM1 Land / NUTS1 candidate",
    classification: "16 Länder",
    source: giscoSource,
    licenseStatus: "GISCO candidate registered; file-level review pending",
    comparability: "NUTS1 scale candidate; indicator definitions must be checked against other country levels",
  },
  austria: {
    preferredLevel: "ADM1 Land / NUTS2 candidate",
    classification: "9 Länder",
    source: giscoSource,
    licenseStatus: "GISCO candidate registered; file-level review pending",
    comparability: "NUTS2 scale candidate; official code match pending",
  },
  romania: {
    preferredLevel: "ADM1 county / NUTS3 candidate",
    classification: "42 county and capital entries",
    source: giscoSource,
    licenseStatus: "GISCO candidate registered; file-level review pending",
    comparability: "county-level display candidate; NUTS2 comparison may require a separate aggregation policy",
  },
  slovenia: {
    preferredLevel: "NUTS2 cohesion region",
    classification: "2 statistical cohesion regions",
    source: giscoSource,
    licenseStatus: "GISCO candidate registered; file-level review pending",
    comparability: "statistical rather than administrative level; suitable only for NUTS2-comparable indicators",
  },
  croatia: {
    preferredLevel: "ADM1 county / NUTS3 candidate",
    classification: "21 county and capital entries",
    source: giscoSource,
    licenseStatus: "GISCO candidate registered; file-level review pending",
    comparability: "county-level display candidate; official NUTS code match pending",
  },
  serbia: {
    preferredLevel: "Administrative district / NSTJ3 review",
    classification: "25 district and Belgrade entries in current atlas registry",
    source: "Statistical Office of the Republic of Serbia spatial unit register and GIS",
    licenseStatus: "official register identified; geometry reuse licence and file version pending",
    comparability: "partial: Serbian NSTJ/administrative districts are not labelled as EU NUTS and require a documented correspondence policy",
  },
};

const firstBatchRegionalIndicatorIds = new Set([
  "regional_population",
  "regional_gdp",
  "regional_gdp_per_capita",
  "regional_unemployment_rate",
  "regional_manufacturing_share",
]);

export const publicDisplayGate = [
  "source_verified",
  "license_checked",
  "region_ids_matched",
  "geometry_valid",
  "topology_checked",
  "attribution_prepared",
] as const;

function countryBoundaryEvidence(countryId: string) {
  return regionBoundaryRecords.filter((record) => record.country_id === countryId);
}

export const regionalCoverageMatrix: RegionalCoverageRecord[] = countries.map((country) => {
  const policy = countrySpatialPolicies[country.slug];
  const regions = regionMetadataRecords.filter((region) => region.country_id === country.slug);
  const boundaries = countryBoundaryEvidence(country.slug);
  const observations = regionObservationRecords.filter((record) => record.country_id === country.slug);
  const availableIndicatorCount = new Set(
    observations
      .filter((record) => record.value !== null && !record.is_pending && firstBatchRegionalIndicatorIds.has(record.region_indicator_id))
      .map((record) => record.region_indicator_id),
  ).size;
  const mappedProjects = projectLocationRecords.filter((record) => record.country_id === country.slug && record.is_mapped_to_region);
  const verifiedMappedProjects = mappedProjects.filter((record) => record.is_ready_for_map_layer);
  const geometryReadyCount = Math.max(0, ...boundaries.filter((record) => record.geometry_available).map((record) => record.feature_count));
  const availableBoundary = boundaries.find((record) => record.geometry_available);
  const duplicateRegionCodeCount = boundaries.reduce((sum, record) => sum + record.duplicate_nuts_code_count, 0);
  const invalidGeometryCount = boundaries.reduce((sum, record) => sum + record.invalid_geometry_count, 0);
  const topologyPassed = boundaries.some((record) => record.authoritative_topology_checked);
  const regionIdOneToOne = boundaries.some((record) => record.region_id_final_matched);
  const publicReady = boundaries.some((record) => record.public_display_ready && record.is_ready_for_display);
  const gaps = [
    geometryReadyCount < regions.length ? "geometry file and feature-count QA" : null,
    !topologyPassed ? "authoritative topology QA" : null,
    availableIndicatorCount === 0 ? "official regional observations" : null,
    verifiedMappedProjects.length === 0 ? "verified project geolocation" : null,
    country.slug === "serbia" ? "NSTJ/ADM comparability and reuse licence" : "official region-code match",
  ].filter((value): value is string => Boolean(value));

  return {
    country_id: country.slug,
    country_name_zh: country.nameZh,
    region_count: regions.length,
    preferred_level: policy.preferredLevel,
    classification: policy.classification,
    geometry_source: policy.source,
    geometry_ready_count: geometryReadyCount,
    expected_feature_count: regions.length,
    actual_feature_count: geometryReadyCount,
    duplicate_region_code_count: duplicateRegionCodeCount,
    missing_region_count: Math.max(0, regions.length - geometryReadyCount),
    invalid_geometry_count: invalidGeometryCount,
    coordinate_system: availableBoundary?.coordinate_system ?? boundaries[0]?.coordinate_system ?? "pending",
    multipolygon_status: availableBoundary?.multipolygon_handling ?? "not_checked",
    overlap_status: topologyPassed ? "checked" : "not_checked",
    gap_status: topologyPassed ? "checked" : "not_checked",
    containment_status: topologyPassed ? "checked" : "not_checked",
    region_id_one_to_one_match: regionIdOneToOne,
    topology_status: topologyPassed ? "recorded" : "not_checked",
    license_status: policy.licenseStatus,
    public_display_ready: publicReady,
    regional_indicator_count: availableIndicatorCount,
    regional_indicator_expected: firstBatchRegionalIndicatorIds.size,
    mapped_project_count: mappedProjects.length,
    verified_mapped_project_count: verifiedMappedProjects.length,
    comparability_status: policy.comparability,
    priority_gaps: gaps.slice(0, 4),
  };
});

export const serbiaSpatialComparabilityPolicy = {
  source: countrySpatialPolicies.serbia.source,
  administrative_level: countrySpatialPolicies.serbia.preferredLevel,
  correspondence_to_eu_scale: "No synthetic NUTS code. Compare only after an explicit NSTJ/ADM-to-NUTS-scale correspondence review.",
  comparability_limitation: countrySpatialPolicies.serbia.comparability,
  public_display_ready: false,
} as const;

export const verifiedProjectLocationRecords = projectLocationRecords.filter((record) => record.is_ready_for_map_layer);

export const factualMapLayerRecords = mapLayerRecords.filter((record) =>
  [
    "v4_adm1_boundary",
    "hu_nuts3_boundary_pilot",
    "regional_population_choropleth",
    "regional_gdp_choropleth",
    "regional_gdp_per_capita_choropleth",
    "regional_unemployment_rate_choropleth",
    "china_project_locations",
  ].includes(record.layer_id),
);

export const regionalFoundationSummary = {
  country_count: countries.length,
  region_count: regionMetadataRecords.length,
  geometry_ready_country_count: regionalCoverageMatrix.filter((record) => record.geometry_ready_count > 0).length,
  public_display_ready_country_count: regionalCoverageMatrix.filter((record) => record.public_display_ready).length,
  regional_indicator_dictionary_count: regionIndicatorRecords.length,
  first_batch_indicator_count: firstBatchRegionalIndicatorIds.size,
  mapped_project_candidate_count: projectLocationRecords.filter((record) => record.is_mapped_to_region).length,
  verified_mapped_project_count: verifiedProjectLocationRecords.length,
  public_display_gate: publicDisplayGate,
} as const;

export function getCountryRegionalCoverage(countryId: string) {
  return regionalCoverageMatrix.find((record) => record.country_id === countryId);
}
