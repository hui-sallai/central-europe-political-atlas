import { regionBoundaryRecords } from "./regionBoundaries";
import { regionObservationRecords } from "./regionObservations";
import { regionMetadataRecords } from "./regions";
import hungaryBoundaryValidation from "../../public/data/boundaries/sandbox/hu_nuts3_gisco_2024.validation.json";

export type RegionQualityStatus = "通过" | "部分通过" | "待接入" | "需复核" | "不进入分析";

export type RegionQualityCheckRecord = {
  region_check_id: string;
  region_id: string;
  country_id: string;
  admin_level: string;
  region_indicator_id: string;
  year: string;
  boundary_available: boolean;
  boundary_source_available: boolean;
  boundary_license_checked: boolean;
  source_available: boolean;
  license_source: string;
  license_url: string;
  attribution_required: boolean;
  attribution_text: string;
  license_checked: boolean;
  authoritative_topology_method: string;
  authoritative_topology_checked: boolean;
  topology_evidence_status: string;
  region_id_final_matched: boolean;
  visual_qa_passed: boolean;
  file_selected: boolean;
  file_downloaded: boolean;
  hungary_filtered: boolean;
  geometry_filtered: boolean;
  crs_confirmed: boolean;
  topology_checked: boolean;
  region_id_matched: boolean;
  ready_for_display: boolean;
  visual_qa_started: boolean;
  feature_rendered_count: number;
  fit_bounds_checked: boolean;
  tooltip_checked: boolean;
  visual_overlap_checked: boolean;
  missing_geometry_checked: boolean;
  public_display_ready: boolean;
  is_ready_for_display: boolean;
  readiness_gate_status: string;
  value_present: boolean;
  unit_present: boolean;
  source_name_present: boolean;
  source_url_present: boolean;
  source_reliability_present: boolean;
  region_code_present: boolean;
  is_official_data: boolean;
  is_pending: boolean;
  is_calculated: boolean;
  is_manual: boolean;
  is_structural_sample: boolean;
  is_map_ready: boolean;
  is_region_comparable: boolean;
  is_export_ready: boolean;
  quality_status: RegionQualityStatus;
  missing_reason: string;
  quality_notes: string;
  last_updated: string;
};

export type RegionQualitySummary = {
  total_region_count: number;
  boundary_available_region_count: number;
  boundary_pending_region_count: number;
  regional_statistical_data_available_count: number;
  regional_statistical_data_pending_count: number;
  map_layer_ready_region_count: number;
  map_layer_not_ready_region_count: number;
  source_a_count: number;
  source_b_count: number;
  source_c_count: number;
  source_d_count: number;
};

export type HungaryNuts3SandboxQaSummary = {
  source_file: string;
  filtered_file: string;
  validation_file: string;
  feature_count: number;
  expected_feature_count: number;
  nuts_code_count: number;
  geometry_present_count: number;
  crs_confirmed: boolean;
  topology_checked: boolean;
  topology_status: string;
  region_id_matched: boolean;
  ready_for_display: boolean;
};

export type HungaryNuts3VisualQaSummary = {
  visual_qa_started: boolean;
  feature_rendered_count: number;
  fit_bounds_checked: boolean;
  tooltip_checked: boolean;
  visual_overlap_checked: boolean;
  missing_geometry_checked: boolean;
  public_display_ready: boolean;
  is_ready_for_display: boolean;
};

export type HungaryNuts3ReadinessGateSummary = {
  license_source: string;
  license_url: string;
  attribution_required: boolean;
  attribution_text: string;
  license_checked: boolean;
  authoritative_topology_method: string;
  authoritative_topology_checked: boolean;
  topology_evidence_status: string;
  region_id_final_matched: boolean;
  visual_qa_passed: boolean;
  public_display_ready: boolean;
  is_ready_for_display: boolean;
  readiness_gate_status: "not_ready_for_public_display";
};

const updatedAt = "2026-07-27";
const pendingText = "待接入";
const noBoundaryText = "区域边界尚未接入几何文件；当前仅完成来源或占位登记。";
const pendingObservationText = "区域统计观测值尚未接入；保留结构化待接入状态，不填 0，不进入地图图层或区域比较。";

const boundaryByRegion = new Map(regionBoundaryRecords.map((boundary) => [boundary.region_id, boundary]));
const regionById = new Map(regionMetadataRecords.map((region) => [region.region_id, region]));

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim() && value !== pendingText);
}

type RegionQualityCheckBase = Omit<
  RegionQualityCheckRecord,
  "region_check_id" | "quality_status" | "missing_reason" | "quality_notes" | "last_updated"
>;

function qualityStatusFor(check: RegionQualityCheckBase): RegionQualityStatus {
  if (check.is_structural_sample) {
    return "不进入分析";
  }
  if (check.is_pending) {
    return "待接入";
  }
  if (!check.region_code_present || !check.source_reliability_present) {
    return "需复核";
  }
  if (!check.boundary_available || !check.source_url_present || !check.value_present) {
    return "部分通过";
  }
  return "通过";
}

function qualityNotesFor(check: RegionQualityCheckBase) {
  const notes = [];
  if (!check.boundary_available) {
    notes.push(noBoundaryText);
  }
  if (check.is_pending || !check.value_present) {
    notes.push(pendingObservationText);
  }
  if (!check.source_url_present) {
    notes.push("尚未接入可点击的区域统计来源链接。");
  }
  if (!check.region_code_present) {
    notes.push("区域代码缺失或仍为占位，需复核后才能关联边界和统计表。");
  }
  return notes.join(" ");
}

function buildRegionQualityCheck(observation: (typeof regionObservationRecords)[number]): RegionQualityCheckRecord {
  const region = regionById.get(observation.region_id);
  const boundary = boundaryByRegion.get(observation.region_id);
  const boundaryLicenseChecked = Boolean(boundary?.license_checked);
  const regionCodePresent = Boolean(region && hasText(region.admin_code) && region.admin_code !== "PENDING");
  const valuePresent = observation.value !== null && observation.value !== "";
  const unitPresent = hasText(observation.unit);
  const sourceNamePresent = hasText(observation.source_name);
  const sourceUrlPresent = hasText(observation.source_url);
  const sourceReliabilityPresent = hasText(observation.source_reliability);
  const boundaryAvailable = Boolean(boundary?.geometry_available);
  const boundarySourceAvailable = hasText(boundary?.boundary_source_name) && hasText(boundary?.boundary_source_url);
  const fileSelected = Boolean(boundary?.file_selected);
  const fileDownloaded = boundary?.file_status === "sandbox_downloaded";
  const hungaryFiltered = observation.country_id === "hungary" && boundary?.filter_status === "sandbox_filtered";
  const geometryFiltered = Boolean(boundary?.geometry_simplified) || boundary?.filter_status === "sandbox_filtered";
  const crsConfirmed = Boolean(
    boundary &&
      hasText(boundary.coordinate_system) &&
      !boundary.coordinate_system.includes("候选") &&
      boundary.coordinate_system !== pendingText,
  );
  const topologyChecked = Boolean(boundary?.topology_checked);
  const regionIdMatched = Boolean(boundary && boundary.region_code_match_status === "matched");
  const isMapReady =
    boundaryAvailable &&
    boundarySourceAvailable &&
    boundaryLicenseChecked &&
    fileSelected &&
    geometryFiltered &&
    crsConfirmed &&
    topologyChecked &&
    regionIdMatched &&
    valuePresent &&
    unitPresent &&
    sourceNamePresent &&
    sourceUrlPresent &&
    !observation.is_pending &&
    !observation.is_structural_sample;
  const isRegionComparable =
    valuePresent &&
    unitPresent &&
    sourceNamePresent &&
    sourceUrlPresent &&
    sourceReliabilityPresent &&
    !observation.is_pending &&
    !observation.is_structural_sample;
  const isExportReady =
    Boolean(region) &&
    regionCodePresent &&
    unitPresent &&
    sourceNamePresent &&
    sourceReliabilityPresent &&
    Boolean(observation.value_status) &&
    Boolean(observation.missing_reason || valuePresent);

  const baseCheck: RegionQualityCheckBase = {
    region_id: observation.region_id,
    country_id: observation.country_id,
    admin_level: region?.admin_level ?? pendingText,
    region_indicator_id: observation.region_indicator_id,
    year: observation.year,
    boundary_available: boundaryAvailable,
    boundary_source_available: boundarySourceAvailable,
    boundary_license_checked: boundaryLicenseChecked,
    source_available: boundarySourceAvailable,
    license_source: boundary?.license_source ?? pendingText,
    license_url: boundary?.license_url ?? "",
    attribution_required: Boolean(boundary?.attribution_required),
    attribution_text: boundary?.attribution_text ?? pendingText,
    license_checked: boundaryLicenseChecked,
    authoritative_topology_method: boundary?.authoritative_topology_method ?? "待确认",
    authoritative_topology_checked: Boolean(boundary?.authoritative_topology_checked),
    topology_evidence_status: boundary?.topology_evidence_status ?? pendingText,
    region_id_final_matched: Boolean(boundary?.region_id_final_matched),
    visual_qa_passed: false,
    file_selected: fileSelected,
    file_downloaded: fileDownloaded,
    hungary_filtered: hungaryFiltered,
    geometry_filtered: geometryFiltered,
    crs_confirmed: crsConfirmed,
    topology_checked: topologyChecked,
    region_id_matched: regionIdMatched,
    ready_for_display: isMapReady,
    visual_qa_started: false,
    feature_rendered_count: 0,
    fit_bounds_checked: false,
    tooltip_checked: false,
    visual_overlap_checked: false,
    missing_geometry_checked: false,
    public_display_ready: false,
    is_ready_for_display: false,
    readiness_gate_status: "not_ready_for_public_display",
    value_present: valuePresent,
    unit_present: unitPresent,
    source_name_present: sourceNamePresent,
    source_url_present: sourceUrlPresent,
    source_reliability_present: sourceReliabilityPresent,
    region_code_present: regionCodePresent,
    is_official_data: observation.is_official_data,
    is_pending: observation.is_pending,
    is_calculated: observation.is_calculated,
    is_manual: observation.is_manual,
    is_structural_sample: observation.is_structural_sample,
    is_map_ready: isMapReady,
    is_region_comparable: isRegionComparable,
    is_export_ready: isExportReady,
  };

  return {
    region_check_id: `${observation.region_observation_id}_quality_check`,
    ...baseCheck,
    quality_status: qualityStatusFor(baseCheck),
    missing_reason: observation.missing_reason || pendingObservationText,
    quality_notes: qualityNotesFor(baseCheck),
    last_updated: updatedAt,
  };
}

const hungaryPilotBoundary = regionBoundaryRecords.find((boundary) => boundary.boundary_id === "hu_nuts3_gisco_2024");

export const hungaryNuts3SandboxQaSummary: HungaryNuts3SandboxQaSummary = {
  source_file: hungaryBoundaryValidation.source_file,
  filtered_file: hungaryBoundaryValidation.filtered_file,
  validation_file: hungaryBoundaryValidation.validation_file,
  feature_count: hungaryBoundaryValidation.feature_count,
  expected_feature_count: hungaryBoundaryValidation.expected_feature_count,
  nuts_code_count: hungaryBoundaryValidation.nuts_codes_count,
  geometry_present_count: hungaryBoundaryValidation.geometry_present_count,
  crs_confirmed: hungaryBoundaryValidation.crs_confirmed,
  topology_checked: hungaryBoundaryValidation.topology_checked,
  topology_status: hungaryBoundaryValidation.topology_status,
  region_id_matched: false,
  ready_for_display: false,
};

export const hungaryNuts3VisualQaSummary: HungaryNuts3VisualQaSummary = {
  visual_qa_started: true,
  feature_rendered_count: 20,
  fit_bounds_checked: true,
  tooltip_checked: true,
  visual_overlap_checked: true,
  missing_geometry_checked: true,
  public_display_ready: false,
  is_ready_for_display: false,
};

export const hungaryNuts3ReadinessGateSummary: HungaryNuts3ReadinessGateSummary = {
  license_source: hungaryPilotBoundary?.license_source ?? "待核验",
  license_url: hungaryPilotBoundary?.license_url ?? "",
  attribution_required: Boolean(hungaryPilotBoundary?.attribution_required),
  attribution_text: hungaryPilotBoundary?.attribution_text ?? "待核验",
  license_checked: false,
  authoritative_topology_method: hungaryPilotBoundary?.authoritative_topology_method ?? "待确认",
  authoritative_topology_checked: false,
  topology_evidence_status: hungaryPilotBoundary?.topology_evidence_status ?? "待接入",
  region_id_final_matched: false,
  visual_qa_passed: true,
  public_display_ready: false,
  is_ready_for_display: false,
  readiness_gate_status: "not_ready_for_public_display",
};

const hungaryBoundaryPilotQualityCheck: RegionQualityCheckRecord = {
  region_check_id: "hungary_nuts3_boundary_pilot_quality_check",
  region_id: "hungary_nuts3_pilot",
  country_id: "hungary",
  admin_level: "NUTS3",
  region_indicator_id: "regional_boundary_status",
  year: updatedAt,
  boundary_available: Boolean(hungaryPilotBoundary?.geometry_available),
  boundary_source_available: hasText(hungaryPilotBoundary?.boundary_source_name) && hasText(hungaryPilotBoundary?.boundary_source_url),
  boundary_license_checked: false,
  source_available: hasText(hungaryPilotBoundary?.boundary_source_name) && hasText(hungaryPilotBoundary?.boundary_source_url),
  license_source: hungaryNuts3ReadinessGateSummary.license_source,
  license_url: hungaryNuts3ReadinessGateSummary.license_url,
  attribution_required: hungaryNuts3ReadinessGateSummary.attribution_required,
  attribution_text: hungaryNuts3ReadinessGateSummary.attribution_text,
  license_checked: hungaryNuts3ReadinessGateSummary.license_checked,
  authoritative_topology_method: hungaryNuts3ReadinessGateSummary.authoritative_topology_method,
  authoritative_topology_checked: hungaryNuts3ReadinessGateSummary.authoritative_topology_checked,
  topology_evidence_status: hungaryNuts3ReadinessGateSummary.topology_evidence_status,
  region_id_final_matched: hungaryNuts3ReadinessGateSummary.region_id_final_matched,
  visual_qa_passed: hungaryNuts3ReadinessGateSummary.visual_qa_passed,
  file_selected: Boolean(hungaryPilotBoundary?.file_selected),
  file_downloaded: hungaryPilotBoundary?.file_status === "sandbox_downloaded",
  hungary_filtered: hungaryPilotBoundary?.filter_status === "sandbox_filtered",
  geometry_filtered: hungaryPilotBoundary?.filter_status === "sandbox_filtered",
  crs_confirmed: hungaryNuts3SandboxQaSummary.crs_confirmed,
  topology_checked: hungaryNuts3SandboxQaSummary.topology_checked,
  region_id_matched: false,
  ready_for_display: false,
  visual_qa_started: hungaryNuts3VisualQaSummary.visual_qa_started,
  feature_rendered_count: hungaryNuts3VisualQaSummary.feature_rendered_count,
  fit_bounds_checked: hungaryNuts3VisualQaSummary.fit_bounds_checked,
  tooltip_checked: hungaryNuts3VisualQaSummary.tooltip_checked,
  visual_overlap_checked: hungaryNuts3VisualQaSummary.visual_overlap_checked,
  missing_geometry_checked: hungaryNuts3VisualQaSummary.missing_geometry_checked,
  public_display_ready: hungaryNuts3ReadinessGateSummary.public_display_ready,
  is_ready_for_display: hungaryNuts3ReadinessGateSummary.is_ready_for_display,
  readiness_gate_status: hungaryNuts3ReadinessGateSummary.readiness_gate_status,
  value_present: false,
  unit_present: true,
  source_name_present: hasText(hungaryPilotBoundary?.boundary_source_name),
  source_url_present: hasText(hungaryPilotBoundary?.boundary_source_url),
  source_reliability_present: hasText(hungaryPilotBoundary?.source_reliability),
  region_code_present: false,
  is_official_data: false,
  is_pending: true,
  is_calculated: false,
  is_manual: false,
  is_structural_sample: false,
  is_map_ready: false,
  is_region_comparable: false,
  is_export_ready: true,
  quality_status: "需复核",
  missing_reason: "许可确认、权威拓扑验收和 region_id / NUTS code 最终核验尚未完成。",
  quality_notes:
    "v0.15 license and authoritative topology evidence record；许可来源与署名要求已记录，但 license_checked=false；权威拓扑方法、最终 region_id 匹配和公开展示资格仍未通过。",
  last_updated: "2026-07-31",
};

export const regionQualityCheckRecords: RegionQualityCheckRecord[] = [
  hungaryBoundaryPilotQualityCheck,
  ...regionObservationRecords.map(buildRegionQualityCheck),
];

const boundaryAvailableRegionIds = new Set(regionBoundaryRecords.filter((boundary) => boundary.geometry_available).map((boundary) => boundary.region_id));
const statisticalDataAvailableRegionIds = new Set(
  regionQualityCheckRecords
    .filter((check) => check.value_present && !check.is_pending && !check.is_structural_sample)
    .map((check) => check.region_id),
);
const statisticalDataPendingRegionIds = new Set(regionQualityCheckRecords.filter((check) => check.is_pending).map((check) => check.region_id));
const mapReadyRegionIds = new Set(regionQualityCheckRecords.filter((check) => check.is_map_ready).map((check) => check.region_id));
const sourceReliabilityEvidence = [
  ...regionBoundaryRecords.map((boundary) => boundary.source_reliability),
  ...regionObservationRecords.map((observation) => observation.source_reliability),
];

function reliabilityCount(level: "A" | "B" | "C" | "D") {
  return sourceReliabilityEvidence.filter((sourceLevel) => sourceLevel === level).length;
}

export const regionQualitySummary: RegionQualitySummary = {
  total_region_count: regionMetadataRecords.length,
  boundary_available_region_count: boundaryAvailableRegionIds.size,
  boundary_pending_region_count: regionMetadataRecords.length - boundaryAvailableRegionIds.size,
  regional_statistical_data_available_count: statisticalDataAvailableRegionIds.size,
  regional_statistical_data_pending_count: statisticalDataPendingRegionIds.size,
  map_layer_ready_region_count: mapReadyRegionIds.size,
  map_layer_not_ready_region_count: regionMetadataRecords.length - mapReadyRegionIds.size,
  source_a_count: reliabilityCount("A"),
  source_b_count: reliabilityCount("B"),
  source_c_count: reliabilityCount("C"),
  source_d_count: reliabilityCount("D"),
};
