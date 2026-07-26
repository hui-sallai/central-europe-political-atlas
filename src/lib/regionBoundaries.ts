import { regionMetadataRecords } from "./regions";

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
  coordinate_system: string;
  file_path_or_url: string;
  region_code_match_status: string;
  source_reliability: "A" | "B" | "C" | "D";
  source_status: BoundarySourceStatus;
  last_checked: string;
  notes: string;
};

const lastChecked = "2026-07-26";
const giscoSourceUrl = "https://gisco-services.ec.europa.eu/distribution/v2/nuts/nuts-2024-files.html";
const giscoHungarySandboxSourceUrl =
  "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_01M_2024_4326_LEVL_3.geojson";
const hungarySandboxFileUrl = "/data/boundaries/sandbox/hu_nuts3_gisco_2024.geojson";
const giscoLicense =
  "非商业使用；必须标注 © EuroGeographics for the administrative boundaries；商业使用需联系 EuroGeographics。";

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
  boundary_license: "待确认 / 待接受使用条款",
  boundary_format: "GeoJSON",
  geometry_format: "GeoJSON",
  file_selected: true,
  file_url: hungarySandboxFileUrl,
  file_status: "sandbox_downloaded",
  filter_status: "sandbox_filtered",
  display_status: "not_ready_for_display",
  geometry_available: true,
  geometry_simplified: false,
  topology_checked: false,
  coordinate_system: "EPSG:4326",
  file_path_or_url: hungarySandboxFileUrl,
  region_code_match_status: "sandbox_pre_matched_20_of_20_pending_verification",
  source_reliability: "A",
  source_status: "官方来源",
  last_checked: lastChecked,
  notes: "v0.11 Hungary boundary file sandbox；已锁定并离线过滤 NUTS_RG_01M_2024_4326_LEVL_3.geojson，状态为 sandbox_downloaded / sandbox_filtered / not_ready_for_display。20 个 NUTS code 已预匹配，许可、拓扑和最终主键验收尚未通过。",
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
    coordinate_system: "EPSG:4326 候选；源数据也提供 EPSG:3035 和 EPSG:3857。",
    file_path_or_url: giscoSourceUrl,
    region_code_match_status: region.country_id === "hungary" ? "pilot_pending_region_code_match" : "pending_region_code_match",
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
    coordinate_system: "待接入",
    file_path_or_url: "",
    region_code_match_status: "待接入",
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
