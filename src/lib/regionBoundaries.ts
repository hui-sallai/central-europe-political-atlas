import { regionMetadataRecords } from "./regions";

export type BoundaryFormat = "GeoJSON" | "TopoJSON" | "Shapefile" | "PMTiles" | "Vector Tiles" | "Not available";
export type BoundarySourceStatus = "官方来源" | "人工整理" | "待接入" | "结构样例";

export type RegionBoundaryRecord = {
  boundary_id: string;
  region_id: string;
  country_id: string;
  admin_level: string;
  boundary_source_name: string;
  boundary_source_url: string;
  boundary_source_type: string;
  boundary_license: string;
  boundary_format: BoundaryFormat;
  geometry_available: boolean;
  geometry_simplified: boolean;
  topology_checked: boolean;
  coordinate_system: string;
  file_path_or_url: string;
  source_reliability: "A" | "B" | "C" | "D";
  source_status: BoundarySourceStatus;
  last_checked: string;
  notes: string;
};

const lastChecked = "2026-07-25";
const giscoSourceUrl = "https://gisco-services.ec.europa.eu/distribution/v2/nuts/nuts-2024-files.html";
const giscoLicense =
  "非商业使用；必须标注 © EuroGeographics for the administrative boundaries；商业使用需联系 EuroGeographics。";

const v4BoundaryNotes =
  "来源可信度已确认：Eurostat/GISCO NUTS 2024 由欧盟统计地理服务发布，提供 GeoJSON、TopoJSON、PBF、CSV、SHP、SVG 和多坐标系版本。v0.9 尚未接入几何文件；仍需完成 ADM1 与 NUTS/行政代码映射、历史边界变动检查、前端简化比例选择、拓扑检查和 region_id 对齐。";

function v4Boundary(region: (typeof regionMetadataRecords)[number]): RegionBoundaryRecord {
  return {
    boundary_id: `${region.region_id}_boundary_candidate`,
    region_id: region.region_id,
    country_id: region.country_id,
    admin_level: region.admin_level,
    boundary_source_name: "Eurostat GISCO NUTS 2024",
    boundary_source_url: giscoSourceUrl,
    boundary_source_type: "EU official statistical geodata",
    boundary_license: giscoLicense,
    boundary_format: "GeoJSON",
    geometry_available: false,
    geometry_simplified: false,
    topology_checked: false,
    coordinate_system: "EPSG:4326 候选；源数据也提供 EPSG:3035 和 EPSG:3857。",
    file_path_or_url: giscoSourceUrl,
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
    boundary_source_name: "待接入",
    boundary_source_url: "",
    boundary_source_type: "Not available",
    boundary_license: "待接入",
    boundary_format: "Not available",
    geometry_available: false,
    geometry_simplified: false,
    topology_checked: false,
    coordinate_system: "待接入",
    file_path_or_url: "",
    source_reliability: "D",
    source_status: "待接入",
    last_checked: lastChecked,
    notes: "非 V4 国家在 v0.9 第一版只保留国家级待接入占位；尚未选择边界来源，不进入真实地图渲染。",
  };
}

export const regionBoundaryRecords: RegionBoundaryRecord[] = regionMetadataRecords.map((region) =>
  region.is_v4_region ? v4Boundary(region) : pendingBoundary(region),
);
