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
  { id: "indicators", label: "indicators", description: "18 个指标的口径、单位、频率、来源优先级和派生资格。" },
  { id: "sources", label: "sources", description: "来源字典与 A/B/C/D 可靠性等级。" },
  { id: "observations", label: "observations", description: "十国基础宏观观测值和 V4 扩展观测值。" },
  { id: "data_quality_checks", label: "data_quality_checks", description: "V4 四国 240 个观测位置的质量验收表。" },
  { id: "derived_comparisons", label: "derived_comparisons", description: "V4 事实型派生比较，不输出风险分数。" },
  { id: "china_projects", label: "china_projects", description: "对华项目核验表。" },
  { id: "china_exposure_candidates", label: "china_exposure_candidates", description: "china_exposure_candidates（暴露变量候选库）：不等于指数。" },
  { id: "methodology_rules", label: "methodology_rules", description: "方法论边界、数据状态、来源等级和分析准入规则。" },
];
