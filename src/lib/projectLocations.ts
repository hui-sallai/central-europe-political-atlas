import { chinaProjectRecords } from "./extendedData";
import { regionMetadataRecords } from "./regions";

export type LocationPrecision = "exact_site" | "city_level" | "region_level" | "country_level_only" | "unknown";
export type LocationStatus = "已定位" | "部分定位" | "仅国家级" | "待核验" | "待接入" | "不进入地图";

export type ProjectLocationRecord = {
  project_location_id: string;
  project_id: string;
  project_name: string;
  country_id: string;
  region_id: string;
  region_name: string;
  city_or_locality: string;
  latitude: number | null;
  longitude: number | null;
  location_precision: LocationPrecision;
  location_source_name: string;
  location_source_url: string;
  location_source_reliability: "A" | "B" | "C" | "D";
  is_exact_location: boolean;
  is_city_level: boolean;
  is_region_level: boolean;
  is_country_level_only: boolean;
  is_mapped_to_region: boolean;
  is_ready_for_map_layer: boolean;
  location_status: LocationStatus;
  missing_location_reason: string;
  last_updated: string;
  notes: string;
  location_source?: string;
  region_match_status?: "region_matched_candidate" | "country_only" | "uncertain";
};

type ProjectLocationMapping = {
  region_id: string;
  city_or_locality: string;
  location_precision: LocationPrecision;
  location_status: LocationStatus;
  mapping_note: string;
};

const updatedAt = "2026-07-26";
const manualLocationSource = "china_projects 人工整理地区字段 + regions 区域元数据";
const missingCoordinateReason = "尚未接入可核验地理编码来源；v0.9 不填充未经核验的经纬度。";
const regionById = new Map(regionMetadataRecords.map((region) => [region.region_id, region]));

const projectLocationMappings: Record<string, ProjectLocationMapping> = {
  "pl-china-europe-rail-malaszewicze": {
    region_id: "poland_lublin",
    city_or_locality: "Małaszewicze / Brest border corridor",
    location_precision: "region_level",
    location_status: "部分定位",
    mapping_note: "跨境物流通道只映射到波兰卢布林省；具体口岸、场站和跨境节点需后续拆分。",
  },
  "pl-leapmotor-tychy-assembly": {
    region_id: "poland_silesian",
    city_or_locality: "Tychy",
    location_precision: "city_level",
    location_status: "部分定位",
    mapping_note: "城市级定位明确，但尚未接入工厂精确坐标和生产实体地址。",
  },
  "pl-nuctech-kobylka": {
    region_id: "poland_masovian",
    city_or_locality: "Kobyłka / Warsaw area",
    location_precision: "city_level",
    location_status: "部分定位",
    mapping_note: "城市/华沙周边定位明确；具体厂区地址和企业登记地址待核验。",
  },
  "hu-catl-debrecen": {
    region_id: "hungary_hajdu_bihar",
    city_or_locality: "Debrecen",
    location_precision: "city_level",
    location_status: "部分定位",
    mapping_note: "城市级定位明确；精确厂区坐标、土地许可和项目公司地址待接入。",
  },
  "hu-byd-szeged": {
    region_id: "hungary_csongrad_csanad",
    city_or_locality: "Szeged",
    location_precision: "city_level",
    location_status: "部分定位",
    mapping_note: "城市级定位明确；精确厂区坐标、许可主体和产能位置待核验。",
  },
  "hu-budapest-belgrade-rail": {
    region_id: "hungary_budapest",
    city_or_locality: "Budapest-Kelebia corridor",
    location_precision: "region_level",
    location_status: "部分定位",
    mapping_note: "铁路为多区域线性项目，当前只映射起点/核心节点；后续需要 project_locations 拆成多个区段或节点。",
  },
  "cz-changhong-nymburk": {
    region_id: "czechia_central_bohemian",
    city_or_locality: "Nymburk",
    location_precision: "city_level",
    location_status: "部分定位",
    mapping_note: "城市级定位明确；工厂地址、企业登记和当前运营状态待核验。",
  },
  "cz-cefc-citic-slavia": {
    region_id: "czechia_prague",
    city_or_locality: "Prague",
    location_precision: "city_level",
    location_status: "部分定位",
    mapping_note: "资产关系位于布拉格，但足球俱乐部、场馆和相关地产需拆分为多条位置记录。",
  },
  "cz-cefc-jt-finance": {
    region_id: "czechia_prague",
    city_or_locality: "Prague / Czech-Slovak finance network",
    location_precision: "region_level",
    location_status: "待核验",
    mapping_note: "金融股权网络不能等同于单一地点；当前只保留布拉格关联入口，需核验集团注册地址和跨境主体。",
  },
  "sk-gotion-inobat-surany": {
    region_id: "slovakia_nitra",
    city_or_locality: "Šurany",
    location_precision: "city_level",
    location_status: "部分定位",
    mapping_note: "城市级定位明确；精确厂区坐标、项目公司地址、许可和补贴位置待核验。",
  },
  "sk-gotion-inobat-equity": {
    region_id: "slovakia_bratislava",
    city_or_locality: "Bratislava / Voderady / Šurany network",
    location_precision: "region_level",
    location_status: "待核验",
    mapping_note: "股权与技术合作涉及多地网络，当前只保留布拉迪斯拉发关联入口；Voderady 和 Šurany 后续应拆成多位置记录。",
  },
};

function buildProjectLocation(project: (typeof chinaProjectRecords)[number]): ProjectLocationRecord {
  const mapping = projectLocationMappings[project.projectId];
  const region = mapping ? regionById.get(mapping.region_id) : undefined;
  const isMappedToRegion = Boolean(mapping && region);
  const locationPrecision = mapping?.location_precision ?? "unknown";
  const locationStatus = mapping?.location_status ?? "待接入";
  const locationSourceReliability = isMappedToRegion ? project.sourceReliabilityLevel : "D";

  return {
    project_location_id: `${project.projectId}_location`,
    project_id: project.projectId,
    project_name: project.projectName,
    country_id: project.countrySlug,
    region_id: region?.region_id ?? "",
    region_name: region?.region_name_zh ?? project.regionName,
    city_or_locality: mapping?.city_or_locality ?? project.regionName,
    latitude: null,
    longitude: null,
    location_precision: locationPrecision,
    location_source_name: isMappedToRegion ? manualLocationSource : "待接入来源",
    location_source_url: project.sourceUrl,
    location_source_reliability: locationSourceReliability,
    is_exact_location: locationPrecision === "exact_site",
    is_city_level: locationPrecision === "city_level",
    is_region_level: locationPrecision === "region_level",
    is_country_level_only: locationPrecision === "country_level_only",
    is_mapped_to_region: isMappedToRegion,
    is_ready_for_map_layer: false,
    location_status: locationStatus,
    missing_location_reason: missingCoordinateReason,
    last_updated: updatedAt,
    notes: `${mapping?.mapping_note ?? "尚未建立项目到区域的映射。"} 当前只建立项目定位结构，不生成地图图层、风险分数或中国经济暴露指数。`,
  };
}

export const projectLocationRecords: ProjectLocationRecord[] = chinaProjectRecords.map(buildProjectLocation).map((record) => ({
  ...record,
  location_source: record.location_source_name,
  region_match_status: record.is_mapped_to_region
    ? "region_matched_candidate"
    : record.is_country_level_only
      ? "country_only"
      : "uncertain",
  is_ready_for_map_layer:
    record.is_mapped_to_region &&
    record.location_status === "已定位" &&
    record.location_source_reliability !== "D" &&
    Boolean(record.location_source_url) &&
    (record.location_precision === "exact_site" || record.location_precision === "city_level" || record.location_precision === "region_level"),
}));
