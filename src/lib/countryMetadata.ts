import { countries } from "./data";

export type CountryDataStatus = "正式数据" | "待核验" | "待接入" | "已接入" | "非 V4 待接入" | "暂不评价" | "结构样例" | "边界待接入" | "人工整理 / 待核验 / 不进入模型";
export type PoliticalSourceStatus = "官方来源" | "人工整理" | "待核验";

export type CountryMetadataRecord = {
  country_id: string;
  name_zh: string;
  name_en: string;
  local_name: string;
  iso2: string;
  iso3: string;
  is_v4: boolean;
  is_eu_member: boolean;
  is_eurozone_member: boolean;
  is_schengen_member: boolean;
  regional_group: "V4" | "Central Europe" | "Western Balkans" | "Adjacent EU";
  capital: string;
  currency: string;
  country_profile_status: CountryDataStatus;
  basic_macro_status: CountryDataStatus;
  v4_extended_status: CountryDataStatus;
  china_project_status: CountryDataStatus;
  news_event_status: CountryDataStatus;
  map_region_status: CountryDataStatus;
  head_of_government: string;
  head_of_government_source_status: PoliticalSourceStatus;
  head_of_state: string;
  head_of_state_source_status: PoliticalSourceStatus;
  political_sample_status: CountryDataStatus;
  included_in_v4_comparison: boolean;
  included_in_macro_ten_country_comparison: boolean;
  included_in_china_project_verification: boolean;
  future_model_candidate: boolean;
  last_updated_at: string;
  notes: string;
};

const updatedAt = "2026-07-17";
const capitalEnByCountry: Record<string, string> = {
  poland: "Warsaw",
  hungary: "Budapest",
  czechia: "Prague",
  slovakia: "Bratislava",
  germany: "Berlin",
  romania: "Bucharest",
  slovenia: "Ljubljana",
  serbia: "Belgrade",
  austria: "Vienna",
  croatia: "Zagreb",
};

const metadataByCountry: Record<string, Omit<CountryMetadataRecord, "country_id" | "name_zh" | "name_en" | "iso2" | "capital" | "currency" | "is_eu_member">> = {
  poland: {
    local_name: "Polska",
    iso3: "POL",
    is_v4: true,
    is_eurozone_member: false,
    is_schengen_member: true,
    regional_group: "V4",
    country_profile_status: "待核验",
    basic_macro_status: "正式数据",
    v4_extended_status: "已接入",
    china_project_status: "已接入",
    news_event_status: "已接入",
    map_region_status: "边界待接入",
    head_of_government: "待核验",
    head_of_government_source_status: "待核验",
    head_of_state: "待核验",
    head_of_state_source_status: "待核验",
    political_sample_status: "人工整理 / 待核验 / 不进入模型",
    included_in_v4_comparison: true,
    included_in_macro_ten_country_comparison: true,
    included_in_china_project_verification: true,
    future_model_candidate: true,
    last_updated_at: updatedAt,
    notes: "V4 第一批国家；扩展指标、项目核验和新闻事件优先接入。政治人物字段需官方来源复核后再填具体姓名。",
  },
  hungary: {
    local_name: "Magyarorszag",
    iso3: "HUN",
    is_v4: true,
    is_eurozone_member: false,
    is_schengen_member: true,
    regional_group: "V4",
    country_profile_status: "待核验",
    basic_macro_status: "正式数据",
    v4_extended_status: "已接入",
    china_project_status: "已接入",
    news_event_status: "已接入",
    map_region_status: "边界待接入",
    head_of_government: "待核验",
    head_of_government_source_status: "待核验",
    head_of_state: "待核验",
    head_of_state_source_status: "待核验",
    political_sample_status: "人工整理 / 待核验 / 不进入模型",
    included_in_v4_comparison: true,
    included_in_macro_ten_country_comparison: true,
    included_in_china_project_verification: true,
    future_model_candidate: true,
    last_updated_at: updatedAt,
    notes: "V4 第一批国家；对华项目核验优先。政治人物字段需官方来源复核后再填具体姓名。",
  },
  czechia: {
    local_name: "Cesko",
    iso3: "CZE",
    is_v4: true,
    is_eurozone_member: false,
    is_schengen_member: true,
    regional_group: "V4",
    country_profile_status: "待核验",
    basic_macro_status: "正式数据",
    v4_extended_status: "已接入",
    china_project_status: "已接入",
    news_event_status: "已接入",
    map_region_status: "边界待接入",
    head_of_government: "待核验",
    head_of_government_source_status: "待核验",
    head_of_state: "待核验",
    head_of_state_source_status: "待核验",
    political_sample_status: "人工整理 / 待核验 / 不进入模型",
    included_in_v4_comparison: true,
    included_in_macro_ten_country_comparison: true,
    included_in_china_project_verification: true,
    future_model_candidate: true,
    last_updated_at: updatedAt,
    notes: "V4 第一批国家；工业、能源和外部经济指标优先。政治人物字段需官方来源复核后再填具体姓名。",
  },
  slovakia: {
    local_name: "Slovensko",
    iso3: "SVK",
    is_v4: true,
    is_eurozone_member: true,
    is_schengen_member: true,
    regional_group: "V4",
    country_profile_status: "待核验",
    basic_macro_status: "正式数据",
    v4_extended_status: "已接入",
    china_project_status: "已接入",
    news_event_status: "已接入",
    map_region_status: "边界待接入",
    head_of_government: "待核验",
    head_of_government_source_status: "待核验",
    head_of_state: "待核验",
    head_of_state_source_status: "待核验",
    political_sample_status: "人工整理 / 待核验 / 不进入模型",
    included_in_v4_comparison: true,
    included_in_macro_ten_country_comparison: true,
    included_in_china_project_verification: true,
    future_model_candidate: true,
    last_updated_at: updatedAt,
    notes: "V4 第一批国家；汽车产业、欧元区身份和外部数据优先。政治人物字段需官方来源复核后再填具体姓名。",
  },
  germany: {
    local_name: "Deutschland",
    iso3: "DEU",
    is_v4: false,
    is_eurozone_member: true,
    is_schengen_member: true,
    regional_group: "Adjacent EU",
    country_profile_status: "待核验",
    basic_macro_status: "正式数据",
    v4_extended_status: "非 V4 待接入",
    china_project_status: "待接入",
    news_event_status: "待接入",
    map_region_status: "边界待接入",
    head_of_government: "待核验",
    head_of_government_source_status: "待核验",
    head_of_state: "待核验",
    head_of_state_source_status: "待核验",
    political_sample_status: "待核验",
    included_in_v4_comparison: false,
    included_in_macro_ten_country_comparison: true,
    included_in_china_project_verification: false,
    future_model_candidate: true,
    last_updated_at: updatedAt,
    notes: "非 V4 国家；当前只进入基础宏观十国比较，扩展指标和对华项目核验后续接入。",
  },
  romania: {
    local_name: "Romania",
    iso3: "ROU",
    is_v4: false,
    is_eurozone_member: false,
    is_schengen_member: true,
    regional_group: "Central Europe",
    country_profile_status: "待核验",
    basic_macro_status: "正式数据",
    v4_extended_status: "非 V4 待接入",
    china_project_status: "待接入",
    news_event_status: "待接入",
    map_region_status: "边界待接入",
    head_of_government: "待核验",
    head_of_government_source_status: "待核验",
    head_of_state: "待核验",
    head_of_state_source_status: "待核验",
    political_sample_status: "待核验",
    included_in_v4_comparison: false,
    included_in_macro_ten_country_comparison: true,
    included_in_china_project_verification: false,
    future_model_candidate: true,
    last_updated_at: updatedAt,
    notes: "非 V4 国家；当前只进入基础宏观十国比较，扩展指标和对华项目核验后续接入。",
  },
  slovenia: {
    local_name: "Slovenija",
    iso3: "SVN",
    is_v4: false,
    is_eurozone_member: true,
    is_schengen_member: true,
    regional_group: "Central Europe",
    country_profile_status: "待核验",
    basic_macro_status: "正式数据",
    v4_extended_status: "非 V4 待接入",
    china_project_status: "待接入",
    news_event_status: "待接入",
    map_region_status: "边界待接入",
    head_of_government: "待核验",
    head_of_government_source_status: "待核验",
    head_of_state: "待核验",
    head_of_state_source_status: "待核验",
    political_sample_status: "待核验",
    included_in_v4_comparison: false,
    included_in_macro_ten_country_comparison: true,
    included_in_china_project_verification: false,
    future_model_candidate: true,
    last_updated_at: updatedAt,
    notes: "非 V4 国家；当前只进入基础宏观十国比较，扩展指标和对华项目核验后续接入。",
  },
  serbia: {
    local_name: "Srbija",
    iso3: "SRB",
    is_v4: false,
    is_eurozone_member: false,
    is_schengen_member: false,
    regional_group: "Western Balkans",
    country_profile_status: "待核验",
    basic_macro_status: "正式数据",
    v4_extended_status: "非 V4 待接入",
    china_project_status: "待接入",
    news_event_status: "待接入",
    map_region_status: "边界待接入",
    head_of_government: "待核验",
    head_of_government_source_status: "待核验",
    head_of_state: "待核验",
    head_of_state_source_status: "待核验",
    political_sample_status: "待核验",
    included_in_v4_comparison: false,
    included_in_macro_ten_country_comparison: true,
    included_in_china_project_verification: false,
    future_model_candidate: true,
    last_updated_at: updatedAt,
    notes: "非 EU、非 V4 国家；当前只进入基础宏观十国比较，扩展指标和对华项目核验后续接入。",
  },
  austria: {
    local_name: "Osterreich",
    iso3: "AUT",
    is_v4: false,
    is_eurozone_member: true,
    is_schengen_member: true,
    regional_group: "Adjacent EU",
    country_profile_status: "待核验",
    basic_macro_status: "正式数据",
    v4_extended_status: "非 V4 待接入",
    china_project_status: "待接入",
    news_event_status: "待接入",
    map_region_status: "边界待接入",
    head_of_government: "待核验",
    head_of_government_source_status: "待核验",
    head_of_state: "待核验",
    head_of_state_source_status: "待核验",
    political_sample_status: "待核验",
    included_in_v4_comparison: false,
    included_in_macro_ten_country_comparison: true,
    included_in_china_project_verification: false,
    future_model_candidate: true,
    last_updated_at: updatedAt,
    notes: "非 V4 国家；当前只进入基础宏观十国比较，扩展指标和对华项目核验后续接入。",
  },
  croatia: {
    local_name: "Hrvatska",
    iso3: "HRV",
    is_v4: false,
    is_eurozone_member: true,
    is_schengen_member: true,
    regional_group: "Central Europe",
    country_profile_status: "待核验",
    basic_macro_status: "正式数据",
    v4_extended_status: "非 V4 待接入",
    china_project_status: "待接入",
    news_event_status: "待接入",
    map_region_status: "边界待接入",
    head_of_government: "待核验",
    head_of_government_source_status: "待核验",
    head_of_state: "待核验",
    head_of_state_source_status: "待核验",
    political_sample_status: "待核验",
    included_in_v4_comparison: false,
    included_in_macro_ten_country_comparison: true,
    included_in_china_project_verification: false,
    future_model_candidate: true,
    last_updated_at: updatedAt,
    notes: "非 V4 国家；当前只进入基础宏观十国比较，扩展指标和对华项目核验后续接入。",
  },
};

export const countryMetadataRecords: CountryMetadataRecord[] = countries.map((country) => {
  const meta = metadataByCountry[country.slug];

  if (!meta) {
    throw new Error(`Missing country metadata for ${country.slug}`);
  }

  return {
    country_id: country.slug,
    name_zh: country.nameZh,
    name_en: country.nameEn,
    iso2: country.iso2,
    capital: `${country.capitalZh} / ${capitalEnByCountry[country.slug] ?? country.capitalZh}`,
    currency: country.currency,
    is_eu_member: country.euMember,
    ...meta,
  };
});

export function getCountryMetadata(countryId: string) {
  return countryMetadataRecords.find((country) => country.country_id === countryId);
}

export const researchDataLayerFiles = [
  { id: "countries", label: "countries", description: "十国国家元数据表，作为所有观测值、项目和派生比较的 country_id 关联表。" },
  { id: "regions", label: "regions", description: "v0.10.1 区域元数据表；匈牙利 NUTS3 预留 20 个 region_id 与 NUTS code 匹配位置，未核验前保持 pilot_pending_region_code_match。" },
  { id: "region_boundaries", label: "region_boundaries", description: "v0.10.1 区域边界来源表；细化 hu_nuts3_gisco_2024 的版本、格式、文件选择、file_url、坐标系、拓扑和主键匹配状态，暂不渲染真实边界。" },
  { id: "region_indicators", label: "region_indicators", description: "v0.10 继续保留区域指标字典；独立于国家级 indicators，第一批只覆盖 10 个区域指标。" },
  { id: "region_observations", label: "region_observations", description: "v0.10 继续保留区域观测值表；第一批区域指标仍保留待接入观测位置。" },
  { id: "region_quality_checks", label: "region_quality_checks", description: "v0.10.1 区域数据质量验收表；增加 Hungary NUTS3 boundary pilot 的来源、许可、文件、几何、CRS、拓扑、主键匹配和展示准备核验项。" },
  { id: "region_sources", label: "region_sources", description: "v0.10.1 区域来源字典；登记 eurostat_gisco_nuts_2024，并补充 license_status、license_url、usage_note 与 last_checked。" },
  { id: "project_locations", label: "project_locations", description: "v0.10 继续保留对华项目地区定位表；不启用真实项目点位图层。" },
  { id: "map_layers", label: "map_layers", description: "v0.10 地图图层注册表；登记 hu_nuts3_boundary_pilot，is_ready_for_display=false。" },
  { id: "indicators", label: "indicators", description: "18 个指标的口径、单位、频率、来源优先级和派生资格。" },
  { id: "sources", label: "sources", description: "来源字典与 A/B/C/D 可靠性等级。" },
  { id: "observations", label: "observations", description: "十国基础宏观观测值和 V4 扩展观测值。" },
  { id: "data_quality_checks", label: "data_quality_checks", description: "V4 四国 240 个观测位置的质量验收表。" },
  { id: "derived_comparisons", label: "derived_comparisons", description: "V4 事实型派生比较，不输出风险分数。" },
  { id: "china_projects", label: "china_projects", description: "对华项目核验表。" },
  { id: "china_exposure_candidates", label: "china_exposure_candidates", description: "china_exposure_candidates（暴露变量候选库）：不等于指数。" },
  { id: "methodology_rules", label: "methodology_rules", description: "方法论边界、数据状态、来源等级和分析准入规则。" },
];
