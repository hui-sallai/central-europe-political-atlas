import { regionMetadataRecords } from "./regions";
import hungaryBoundaryValidation from "../../public/data/boundaries/sandbox/hu_nuts3_gisco_2024.validation.json";

export type BoundaryFormat = "GeoJSON" | "TopoJSON" | "Shapefile" | "PMTiles" | "Vector Tiles" | "Not available";
export type BoundarySourceStatus = "官方来源" | "人工整理" | "待接入" | "结构样例";
export type BoundaryFileStatus = "sandbox_downloaded" | "not_downloaded" | "not_applicable";
export type BoundaryFilterStatus = "sandbox_filtered" | "not_filtered" | "not_applicable";
export type BoundaryDisplayStatus = "not_ready_for_display";

export type RegionBoundaryRecord = {
  boundary_id: string;
  region_id: string;
  country_id: string;
  admin_level: string;
  nuts_version: string;
  boundary_source_name: string;
  boundary_source_url: string;
  boundary_source_type: string;
  boundary_license: string;
  license_source: string;
  license_url: string;
  attribution_required: boolean;
  attribution_text: string;
  license_checked: boolean;
  boundary_format: BoundaryFormat;
  geometry_format: string;
  file_selected: boolean;
  file_url: string;
  file_status: BoundaryFileStatus;
  filter_status: BoundaryFilterStatus;
  display_status: BoundaryDisplayStatus;
  geometry_available: boolean;
  geometry_simplified: boolean;
  topology_checked: boolean;
  authoritative_topology_method: string;
  authoritative_topology_checked: boolean;
  topology_evidence_status: string;
  coordinate_system: string;
  file_path_or_url: string;
  region_code_match_status: string;
  validation_manifest_file: string;
  manifest_status: string;
  expected_region_count: number;
  feature_count: number;
  nuts_code_count: number;
  region_id_candidate_count: number;
  detail_record_count: number;
  matched_region_count: number;
  unmatched_region_count: number;
  duplicate_region_id_count: number;
  duplicate_nuts_code_count: number;
  missing_geometry_count: number;
  manifest_detail_validation_status: string;
  region_id_final_matched: boolean;
  region_id_match_evidence_status: string;
  public_display_ready: boolean;
  is_ready_for_display: boolean;
  source_reliability: "A" | "B" | "C" | "D";
  source_status: BoundarySourceStatus;
  last_checked: string;
  notes: string;
};

const lastChecked = "2026-07-27";
const giscoSourceUrl = "https://gisco-services.ec.europa.eu/distribution/v2/nuts/nuts-2024-files.html";
const giscoHungarySandboxSourceUrl =
  "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_01M_2024_4326_LEVL_3.geojson";
const hungarySandboxFileUrl = "/data/boundaries/sandbox/hu_nuts3_gisco_2024.geojson";
const giscoLicense =
  "非商业使用；必须标注 © EuroGeographics for the administrative boundaries；商业使用需联系 EuroGeographics。";
const giscoLicenseSource = "European Commission / Eurostat GISCO geodata and NUTS usage conditions";
const giscoLicenseUrl = "https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics";
const giscoAttribution = "Source: European Commission – Eurostat/GISCO; administrative boundaries: © EuroGeographics.";
const pendingAuthoritativeTopologyMethod =
  "待确认：拟以 GISCO NUTS 2024 官方几何与元数据为基准，复核要素数、NUTS code、几何有效性、共享边界、重叠与缝隙。";

const v4BoundaryNotes =
  "来源可信度已确认：Eurostat/GISCO NUTS 2024 由欧盟统计地理服务发布，提供 GeoJSON、TopoJSON、PBF、CSV、SHP、SVG 和多坐标系版本。v0.9 尚未接入几何文件；仍需完成 ADM1 与 NUTS/行政代码映射、历史边界变动检查、前端简化比例选择、拓扑检查和 region_id 对齐。";

const hungaryPilotBoundary: RegionBoundaryRecord = {
  boundary_id: "hu_nuts3_gisco_2024",
  region_id: "hungary_nuts3_pilot",
  country_id: "hungary",
  admin_level: "NUTS3",
  nuts_version: "NUTS 2024",
  boundary_source_name: "Eurostat GISCO NUTS 2024",
  boundary_source_url: giscoHungarySandboxSourceUrl,
  boundary_source_type: "EU official statistical geodata",
  boundary_license: "许可来源与署名要求已记录；适用范围、条款接受和公开展示资格仍待最终核验。",
  license_source: giscoLicenseSource,
  license_url: giscoLicenseUrl,
  attribution_required: true,
  attribution_text: giscoAttribution,
  license_checked: false,
  boundary_format: "GeoJSON",
  geometry_format: "GeoJSON",
  file_selected: true,
  file_url: hungarySandboxFileUrl,
  file_status: "sandbox_downloaded",
  filter_status: "sandbox_filtered",
  display_status: "not_ready_for_display",
  geometry_available: true,
  geometry_simplified: false,
  topology_checked: true,
  authoritative_topology_method: pendingAuthoritativeTopologyMethod,
  authoritative_topology_checked: false,
  topology_evidence_status: "sandbox_basic_topology_passed_pending_authoritative_validation",
  coordinate_system: "EPSG:4326",
  file_path_or_url: hungarySandboxFileUrl,
  region_code_match_status: "sandbox_pre_matched_20_of_20_pending_verification",
  validation_manifest_file: hungaryBoundaryValidation.validation_file,
  manifest_status: hungaryBoundaryValidation.manifest_status,
  expected_region_count: hungaryBoundaryValidation.expected_region_count,
  feature_count: hungaryBoundaryValidation.feature_count,
  nuts_code_count: hungaryBoundaryValidation.nuts_code_count,
  region_id_candidate_count: hungaryBoundaryValidation.region_id_candidate_count,
  detail_record_count: hungaryBoundaryValidation.detail_record_count,
  matched_region_count: hungaryBoundaryValidation.matched_region_count,
  unmatched_region_count: hungaryBoundaryValidation.unmatched_region_count,
  duplicate_region_id_count: hungaryBoundaryValidation.duplicate_region_id_count,
  duplicate_nuts_code_count: hungaryBoundaryValidation.duplicate_nuts_code_count,
  missing_geometry_count: hungaryBoundaryValidation.missing_geometry_count,
  manifest_detail_validation_status: hungaryBoundaryValidation.manifest_detail_validation_status,
  region_id_final_matched: false,
  region_id_match_evidence_status: "precheck_zero_exceptions_pending_final_review",
  public_display_ready: false,
  is_ready_for_display: false,
  source_reliability: "A",
  source_status: "官方来源",
  last_checked: "2026-08-02",
  notes:
    "v0.18 validation manifest 的 20 条明细核验结果已记录；许可、权威拓扑与最终主键匹配仍未完成，公开展示资格未通过。",
};

function v4Boundary(region: (typeof regionMetadataRecords)[number]): RegionBoundaryRecord {
  return {
    boundary_id: `${region.region_id}_boundary_candidate`,
    region_id: region.region_id,
    country_id: region.country_id,
    admin_level: region.admin_level,
    nuts_version: "NUTS 2024",
    boundary_source_name: "Eurostat GISCO NUTS 2024",
    boundary_source_url: giscoSourceUrl,
    boundary_source_type: "EU official statistical geodata",
    boundary_license: giscoLicense,
    license_source: giscoLicenseSource,
    license_url: giscoLicenseUrl,
    attribution_required: true,
    attribution_text: giscoAttribution,
    license_checked: false,
    boundary_format: "GeoJSON",
    geometry_format: "GeoJSON",
    file_selected: false,
    file_url: "",
    file_status: "not_downloaded",
    filter_status: "not_filtered",
    display_status: "not_ready_for_display",
    geometry_available: false,
    geometry_simplified: false,
    topology_checked: false,
    authoritative_topology_method: pendingAuthoritativeTopologyMethod,
    authoritative_topology_checked: false,
    topology_evidence_status: "not_started",
    coordinate_system: "EPSG:4326 候选；源数据也提供 EPSG:3035 和 EPSG:3857。",
    file_path_or_url: giscoSourceUrl,
    region_code_match_status: region.country_id === "hungary" ? "pilot_pending_region_code_match" : "pending_region_code_match",
    validation_manifest_file: region.validation_manifest_file,
    manifest_status: region.manifest_status,
    expected_region_count: region.expected_region_count,
    feature_count: region.feature_count,
    nuts_code_count: region.nuts_code_count,
    region_id_candidate_count: region.region_id_candidate_count,
    detail_record_count: region.detail_record_count,
    matched_region_count: region.matched_region_count,
    unmatched_region_count: 0,
    duplicate_region_id_count: 0,
    duplicate_nuts_code_count: 0,
    missing_geometry_count: region.missing_geometry_count,
    manifest_detail_validation_status: region.manifest_detail_validation_status,
    region_id_final_matched: false,
    region_id_match_evidence_status: region.country_id === "hungary"
      ? "precheck_zero_exceptions_pending_final_review"
      : "not_started",
    public_display_ready: false,
    is_ready_for_display: false,
    source_reliability: "A",
    source_status: "官方来源",
    last_checked: lastChecked,
    notes: v4BoundaryNotes,
  };
}

function pendingBoundary(region: (typeof regionMetadataRecords)[number]): RegionBoundaryRecord {
  return {
    boundary_id: `${region.region_id}_boundary_pending`,
    region_id: region.region_id,
    country_id: region.country_id,
    admin_level: region.admin_level,
    nuts_version: "Not available",
    boundary_source_name: "待接入",
    boundary_source_url: "",
    boundary_source_type: "Not available",
    boundary_license: "待接入",
    license_source: "待接入",
    license_url: "",
    attribution_required: false,
    attribution_text: "待接入",
    license_checked: false,
    boundary_format: "Not available",
    geometry_format: "Not available",
    file_selected: false,
    file_url: "",
    file_status: "not_applicable",
    filter_status: "not_applicable",
    display_status: "not_ready_for_display",
    geometry_available: false,
    geometry_simplified: false,
    topology_checked: false,
    authoritative_topology_method: "待确认",
    authoritative_topology_checked: false,
    topology_evidence_status: "待接入",
    coordinate_system: "待接入",
    file_path_or_url: "",
    region_code_match_status: "待接入",
    validation_manifest_file: "",
    manifest_status: "not_applicable",
    expected_region_count: 0,
    feature_count: 0,
    nuts_code_count: 0,
    region_id_candidate_count: 0,
    detail_record_count: 0,
    matched_region_count: 0,
    unmatched_region_count: 0,
    duplicate_region_id_count: 0,
    duplicate_nuts_code_count: 0,
    missing_geometry_count: 0,
    manifest_detail_validation_status: "not_applicable",
    region_id_final_matched: false,
    region_id_match_evidence_status: "not_applicable",
    public_display_ready: false,
    is_ready_for_display: false,
    source_reliability: "D",
    source_status: "待接入",
    last_checked: lastChecked,
    notes: "非 V4 国家在 v0.9 第一版只保留国家级待接入占位；尚未选择边界来源，不进入真实地图渲染。",
  };
}

export const regionBoundaryRecords: RegionBoundaryRecord[] = [
  hungaryPilotBoundary,
  ...regionMetadataRecords.map((region) => (region.is_v4_region ? v4Boundary(region) : pendingBoundary(region))),
];
