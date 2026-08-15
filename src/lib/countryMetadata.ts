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
    v4_extended_status: "已接入",
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
    notes: "v0.75 已接入同口径财政、外部、投资、能源、产业与 transmission 数据；对德出口依赖对德国自身不适用，保留空值。",
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
    v4_extended_status: "已接入",
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
    notes: "v0.75 已接入同口径扩展与 transmission 数据；Eurostat 未发布的 FDI 年份保留待接入。",
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
    v4_extended_status: "已接入",
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
    notes: "v0.75 已接入同口径财政、外部、投资、能源、产业与 transmission 数据。",
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
    v4_extended_status: "已接入",
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
    notes: "v0.75 已接入 Eurostat/UN Comtrade 可得扩展与 transmission 数据；同口径财政和经常账户序列缺失，明确保留待接入。",
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
    v4_extended_status: "已接入",
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
    notes: "v0.75 已接入同口径扩展与 transmission 数据；未发布年份继续保留待接入。",
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
    v4_extended_status: "已接入",
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
    notes: "v0.75 已接入同口径扩展与 transmission 数据；汽车出口占比缺失年份保持待接入。",
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
  { id: "regions", label: "regions", description: "v0.86 十国 173 个区域主键；记录 NUTS/ADM 分类、官方代码匹配和层级差异。" },
  { id: "region_boundaries", label: "region_boundaries", description: "v0.86 十国边界来源与几何审计；公开展示资格按国家、按图层独立判断。" },
  { id: "region_indicators", label: "region_indicators", description: "v0.89 区域指标字典；固定劳动力、制造业 GVA 比重与历史变化口径。" },
  { id: "region_observations", label: "region_observations", description: "欧盟九国 2021–2024 区域事实；劳动力只按直接匹配层级接入，缺失位置不下推国家值。" },
  { id: "region_quality_checks", label: "region_quality_checks", description: "区域边界、观测值、来源与展示准入 QA；异常只标记 review_required。" },
  { id: "region_sources", label: "region_sources", description: "v0.21 区域来源字典；锁定 GISCO NUTS 2024 Level 3 GeoJSON，并保留许可与署名记录。" },
  { id: "project_locations", label: "project_locations", description: "v0.86 十国项目到 region_id 的证据映射；无核验坐标时不生成点位。" },
  { id: "map_layers", label: "map_layers", description: "v0.89 图层注册表；经济、劳动力、产业、变化与项目层分别通过覆盖和质量闸门。" },
  { id: "indicators", label: "indicators", description: "18 个核心指标与 4 个 transmission 指标的口径、单位、频率、来源优先级和派生资格。" },
  { id: "sources", label: "sources", description: "来源字典与 A/B/C/D 可靠性等级。" },
  { id: "observations", label: "observations", description: "十国基础宏观、核心扩展与 transmission 观测值。" },
  { id: "data_quality_checks", label: "data_quality_checks", description: "十国 600 个核心扩展观测位置的质量验收表。" },
  { id: "derived_comparisons", label: "derived_comparisons", description: "V4 事实型派生比较，不输出风险分数。" },
  { id: "china_projects", label: "china_projects", description: "对华项目核验表。" },
  { id: "china_exposure_candidates", label: "china_exposure_candidates", description: "china_exposure_candidates（暴露变量候选库）：不等于指数。" },
  { id: "methodology_rules", label: "methodology_rules", description: "方法论边界、数据状态、来源等级和分析准入规则。" },
];

export const spatialAuditExportFiles = [
  { id: "spatial_display_gate", label: "spatial_display_gate", description: "十国公开空间展示闸门审计；记录逐国通过项、阻断项和最终决定。" },
  { id: "map_layer_readiness", label: "map_layer_readiness", description: "逐国、逐图层展示资格；边界、统计与项目参考互不连带放行。" },
  { id: "regional_geometry_qa", label: "regional_geometry_qa", description: "十国通用几何 QA；记录要素、代码、空几何、坐标范围、重叠与缝隙证据。" },
  { id: "regional_coverage_matrix", label: "regional_coverage_matrix", description: "十国区域层覆盖、共同年份、数据缺口与公开图层数量。" },
  { id: "project_location_readiness", label: "project_location_readiness", description: "项目位置精度、置信度、区域参考资格与多地点记录。" },
  { id: "regional_rankings", label: "regional_rankings", description: "同国同年同指标的事实区域排名；不表示风险或政策优劣。" },
  { id: "regional_indicator_gap_audit", label: "regional_indicator_gap_audit", description: "逐国区域指标缺口、层级错配与优先补齐清单。" },
  { id: "regional_derived_comparisons", label: "regional_derived_comparisons", description: "2021–2024 人口、人均 GDP 与失业率事实变化。" },
  { id: "regional_comparison_eligibility", label: "regional_comparison_eligibility", description: "同层级、同定义、同单位、同年份的正式比较资格。" },
  { id: "regional_project_counts", label: "regional_project_counts", description: "当前数据库内已核验项目的区域记录计数，不表示影响或不存在活动。" },
  { id: "regional_boundary_continuity", label: "regional_boundary_continuity", description: "历史观测到当前区域代码的连续性记录及其限制。" },
  { id: "comparison_eligibility", label: "comparison_eligibility", description: "逐国逐指标的年份、单位、层级和跨国比较资格。" },
];
