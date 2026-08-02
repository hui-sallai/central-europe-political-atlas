import { giscoLicenseVerificationDecision, pendingGiscoLicenseReview } from "./giscoLicenseVerification";
import hungaryBoundaryValidation from "../../public/data/boundaries/sandbox/hu_nuts3_gisco_2024.validation.json";

export type MapLayerType = "boundary" | "choropleth" | "point" | "symbol" | "label" | "table_only" | "structural_sample";

export type MapLayerRecord = {
  layer_id: string;
  layer_name_zh: string;
  layer_name_en: string;
  layer_type: MapLayerType;
  data_source_table: string;
  geometry_source_table: string;
  admin_level: string;
  country_coverage: string;
  indicator_or_variable: string;
  is_active: boolean;
  license_source: string;
  license_url: string;
  attribution_required: boolean;
  attribution_text: string;
  license_checked: boolean;
  license_review_status: string;
  license_review_date: string;
  license_decision_note: string;
  authoritative_topology_method: string;
  authoritative_topology_checked: boolean;
  topology_evidence_status: string;
  topology_validation_method: string;
  topology_validation_status: string;
  topology_validation_date: string;
  topology_decision_note: string;
  geometry_valid_count: number;
  invalid_geometry_count: number;
  duplicate_geometry_count: number;
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
  region_id_match_decision_status: string;
  region_id_match_evidence_status: string;
  visual_qa_passed: boolean;
  public_display_ready: boolean;
  is_ready_for_display: boolean;
  readiness_gate_status: string;
  visual_qa_started: boolean;
  feature_rendered_count: number;
  fit_bounds_checked: boolean;
  tooltip_checked: boolean;
  visual_overlap_checked: boolean;
  missing_geometry_checked: boolean;
  is_structural_sample: boolean;
  is_official_data: boolean;
  is_manual: boolean;
  is_pending: boolean;
  legend_type: string;
  legend_unit: string;
  color_scale: string;
  interaction_type: string;
  tooltip_fields: string[];
  allowed_filters: string[];
  source_requirement: string;
  quality_requirement: string;
  model_boundary: string;
  last_updated: string;
  notes: string;
};

const updatedAt = "2026-08-02";
const v4Adm1Coverage = "V4 四国 ADM1：poland, hungary, czechia, slovakia";
const noDisplayBoundary = "正式展示仍需单独通过 public display readiness gate；public_display_ready=false 且 is_ready_for_display=false 时不得在地图工作台显示为真实图层。";
const noModelBoundary = "地图图层注册表不生成风险图层、预测图层、党派支持率图层、选举预测或中国经济暴露指数。";
const giscoLicenseSource = giscoLicenseVerificationDecision.license_source;
const giscoLicenseUrl = giscoLicenseVerificationDecision.license_url;
const giscoAttribution = giscoLicenseVerificationDecision.attribution_text;
const pendingTopologyMethod = "待确认：以 GISCO NUTS 2024 官方几何与元数据复核 NUTS code、几何有效性、共享边界、重叠与缝隙。";
const boundaryQuality = "region_boundaries.geometry_available=true、geometry_simplified=true、topology_checked=true、boundary_license_checked=true，且 region_quality_checks 中对应区域 is_map_ready=true。";
const choroplethQuality = "需要 region_observations 有正式数值、来源链接、单位、来源等级，并通过 region_quality_checks；当前待接入观测值不得进入地图显示。";
const projectQuality = "需要 project_locations 有可核验位置来源、region_id 映射、经纬度或明确区域级定位，并通过后续项目位置质量验收；当前不进入正式地图图层。";
const noValidationManifest = {
  validation_manifest_file: "",
  manifest_status: "not_started",
  feature_count: 0,
  detail_record_count: 0,
  matched_region_count: 0,
  missing_geometry_count: 0,
  manifest_detail_validation_status: "not_started",
};

function boundaryLayer(): MapLayerRecord {
  return {
    layer_id: "v4_adm1_boundary",
    layer_name_zh: "V4 ADM1 边界图层",
    layer_name_en: "V4 ADM1 boundary layer",
    layer_type: "boundary",
    data_source_table: "regions",
    geometry_source_table: "region_boundaries",
    admin_level: "ADM1",
    country_coverage: v4Adm1Coverage,
    indicator_or_variable: "regional_boundary_status",
    is_active: false,
    license_source: giscoLicenseSource,
    license_url: giscoLicenseUrl,
    attribution_required: true,
    attribution_text: giscoAttribution,
    license_checked: false,
    license_review_status: pendingGiscoLicenseReview.license_review_status,
    license_review_date: pendingGiscoLicenseReview.license_review_date,
    license_decision_note: pendingGiscoLicenseReview.license_decision_note,
    authoritative_topology_method: pendingTopologyMethod,
    authoritative_topology_checked: false,
    topology_evidence_status: "not_started",
    topology_validation_method: "pending_authoritative_topology_review",
    topology_validation_status: "pending_authoritative_topology_review",
    topology_validation_date: "pending",
    topology_decision_note: "V4 其余边界文件尚未进入权威拓扑验收。",
    geometry_valid_count: 0,
    invalid_geometry_count: 0,
    duplicate_geometry_count: 0,
    ...noValidationManifest,
    expected_region_count: 0,
    nuts_code_count: 0,
    region_id_candidate_count: 0,
    unmatched_region_count: 0,
    duplicate_region_id_count: 0,
    duplicate_nuts_code_count: 0,
    region_id_final_matched: false,
    region_id_match_decision_status: "not_started",
    region_id_match_evidence_status: "not_started",
    visual_qa_passed: false,
    public_display_ready: false,
    is_ready_for_display: false,
    readiness_gate_status: "not_ready_for_public_display",
    visual_qa_started: false,
    feature_rendered_count: 0,
    fit_bounds_checked: false,
    tooltip_checked: false,
    visual_overlap_checked: false,
    missing_geometry_checked: false,
    is_structural_sample: false,
    is_official_data: false,
    is_manual: true,
    is_pending: true,
    legend_type: "none",
    legend_unit: "not_applicable",
    color_scale: "not_applicable",
    interaction_type: "hover_tooltip_only_after_boundary_ready",
    tooltip_fields: ["region_id", "region_name_zh", "country_id", "admin_code", "boundary_source_name", "boundary_license"],
    allowed_filters: ["country_id", "admin_level", "boundary_format", "source_reliability", "source_status"],
    source_requirement: "region_boundaries 必须提供可信边界来源、可公开展示许可、文件格式、坐标系和 region_id 对齐说明。",
    quality_requirement: boundaryQuality,
    model_boundary: noModelBoundary,
    last_updated: updatedAt,
    notes: noDisplayBoundary,
  };
}

function hungaryNuts3PilotLayer(): MapLayerRecord {
  return {
    layer_id: "hu_nuts3_boundary_pilot",
    layer_name_zh: "匈牙利 NUTS3 边界试点图层",
    layer_name_en: "Hungary NUTS3 boundary pilot layer",
    layer_type: "boundary",
    data_source_table: "regions",
    geometry_source_table: "region_boundaries",
    admin_level: "NUTS3",
    country_coverage: "hungary",
    indicator_or_variable: "hu_nuts3_gisco_2024",
    is_active: false,
    license_source: giscoLicenseSource,
    license_url: giscoLicenseUrl,
    attribution_required: true,
    attribution_text: giscoAttribution,
    license_checked: giscoLicenseVerificationDecision.license_checked,
    license_review_status: giscoLicenseVerificationDecision.license_review_status,
    license_review_date: giscoLicenseVerificationDecision.license_review_date,
    license_decision_note: giscoLicenseVerificationDecision.license_decision_note,
    authoritative_topology_method: hungaryBoundaryValidation.topology_validation_method,
    authoritative_topology_checked: hungaryBoundaryValidation.authoritative_topology_checked,
    topology_evidence_status: hungaryBoundaryValidation.topology_validation_status,
    topology_validation_method: hungaryBoundaryValidation.topology_validation_method,
    topology_validation_status: hungaryBoundaryValidation.topology_validation_status,
    topology_validation_date: hungaryBoundaryValidation.topology_validation_date,
    topology_decision_note: hungaryBoundaryValidation.topology_decision_note,
    geometry_valid_count: hungaryBoundaryValidation.geometry_valid_count,
    invalid_geometry_count: hungaryBoundaryValidation.invalid_geometry_count,
    duplicate_geometry_count: hungaryBoundaryValidation.duplicate_geometry_count,
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
    region_id_final_matched: hungaryBoundaryValidation.region_id_final_matched,
    region_id_match_decision_status: hungaryBoundaryValidation.region_id_match_decision_status,
    region_id_match_evidence_status: hungaryBoundaryValidation.region_id_match_decision_status,
    visual_qa_passed: true,
    public_display_ready: false,
    is_ready_for_display: false,
    readiness_gate_status: "not_ready_for_public_display",
    visual_qa_started: true,
    feature_rendered_count: 20,
    fit_bounds_checked: true,
    tooltip_checked: true,
    visual_overlap_checked: true,
    missing_geometry_checked: true,
    is_structural_sample: false,
    is_official_data: false,
    is_manual: false,
    is_pending: true,
    legend_type: "none",
    legend_unit: "not_applicable",
    color_scale: "not_applicable",
    interaction_type: "sandbox_visual_qa_hover_only",
    tooltip_fields: ["NUTS_ID", "NAME_LATN", "region_id_candidate"],
    allowed_filters: ["country_id", "admin_level", "source_reliability", "source_status", "is_ready_for_display"],
    source_requirement: "Eurostat GISCO NUTS 2024 来源、许可、格式、坐标系、几何状态、拓扑检查状态和 NUTS 主键匹配必须完成核验。",
    quality_requirement: "许可确认、几何下载与过滤、拓扑检查、NUTS / region_id 主键匹配均通过前，is_ready_for_display 必须保持 false。",
    model_boundary: noModelBoundary,
    last_updated: updatedAt,
    notes:
      "v0.21 authoritative topology validation decision 已记录；license_checked=true、region_id_final_matched=true、authoritative_topology_checked=true。正式地图仍未启用，public_display_ready=false、is_ready_for_display=false。",
  };
}

function choroplethLayer(layer: {
  layer_id: string;
  layer_name_zh: string;
  layer_name_en: string;
  indicator: string;
  legend_unit: string;
  color_scale: string;
}): MapLayerRecord {
  return {
    layer_id: layer.layer_id,
    layer_name_zh: layer.layer_name_zh,
    layer_name_en: layer.layer_name_en,
    layer_type: "choropleth",
    data_source_table: "region_observations",
    geometry_source_table: "region_boundaries",
    admin_level: "ADM1",
    country_coverage: v4Adm1Coverage,
    indicator_or_variable: layer.indicator,
    is_active: false,
    license_source: giscoLicenseSource,
    license_url: giscoLicenseUrl,
    attribution_required: true,
    attribution_text: giscoAttribution,
    license_checked: false,
    license_review_status: pendingGiscoLicenseReview.license_review_status,
    license_review_date: pendingGiscoLicenseReview.license_review_date,
    license_decision_note: pendingGiscoLicenseReview.license_decision_note,
    authoritative_topology_method: pendingTopologyMethod,
    authoritative_topology_checked: false,
    topology_evidence_status: "not_started",
    topology_validation_method: "pending_authoritative_topology_review",
    topology_validation_status: "pending_authoritative_topology_review",
    topology_validation_date: "pending",
    topology_decision_note: "区域统计值和真实边界尚未通过展示前验收。",
    geometry_valid_count: 0,
    invalid_geometry_count: 0,
    duplicate_geometry_count: 0,
    ...noValidationManifest,
    expected_region_count: 0,
    nuts_code_count: 0,
    region_id_candidate_count: 0,
    unmatched_region_count: 0,
    duplicate_region_id_count: 0,
    duplicate_nuts_code_count: 0,
    region_id_final_matched: false,
    region_id_match_decision_status: "not_started",
    region_id_match_evidence_status: "not_started",
    visual_qa_passed: false,
    public_display_ready: false,
    is_ready_for_display: false,
    readiness_gate_status: "not_ready_for_public_display",
    visual_qa_started: false,
    feature_rendered_count: 0,
    fit_bounds_checked: false,
    tooltip_checked: false,
    visual_overlap_checked: false,
    missing_geometry_checked: false,
    is_structural_sample: false,
    is_official_data: false,
    is_manual: false,
    is_pending: true,
    legend_type: "sequential",
    legend_unit: layer.legend_unit,
    color_scale: layer.color_scale,
    interaction_type: "hover_tooltip_and_filter_after_quality_pass",
    tooltip_fields: ["region_id", "region_name_zh", "country_id", "year", "value", "unit", "source_name", "source_url", "value_status"],
    allowed_filters: ["country_id", "year", "value_status", "source_reliability", "quality_status"],
    source_requirement: "region_observations 必须关联 region_indicators 和 region_sources，并保留数值、单位、来源名称、来源链接、来源等级和更新时间。",
    quality_requirement: choroplethQuality,
    model_boundary: noModelBoundary,
    last_updated: updatedAt,
    notes: noDisplayBoundary,
  };
}

function projectLocationLayer(): MapLayerRecord {
  return {
    layer_id: "china_project_locations",
    layer_name_zh: "对华项目地区定位图层",
    layer_name_en: "China-related project location layer",
    layer_type: "point",
    data_source_table: "project_locations",
    geometry_source_table: "region_boundaries",
    admin_level: "ADM1 / city_level / region_level",
    country_coverage: v4Adm1Coverage,
    indicator_or_variable: "project_locations.location_status",
    is_active: false,
    license_source: giscoLicenseSource,
    license_url: giscoLicenseUrl,
    attribution_required: true,
    attribution_text: giscoAttribution,
    license_checked: false,
    license_review_status: pendingGiscoLicenseReview.license_review_status,
    license_review_date: pendingGiscoLicenseReview.license_review_date,
    license_decision_note: pendingGiscoLicenseReview.license_decision_note,
    authoritative_topology_method: pendingTopologyMethod,
    authoritative_topology_checked: false,
    topology_evidence_status: "not_started",
    topology_validation_method: "pending_authoritative_topology_review",
    topology_validation_status: "pending_authoritative_topology_review",
    topology_validation_date: "pending",
    topology_decision_note: "项目定位图层尚未进入边界权威拓扑验收。",
    geometry_valid_count: 0,
    invalid_geometry_count: 0,
    duplicate_geometry_count: 0,
    ...noValidationManifest,
    expected_region_count: 0,
    nuts_code_count: 0,
    region_id_candidate_count: 0,
    unmatched_region_count: 0,
    duplicate_region_id_count: 0,
    duplicate_nuts_code_count: 0,
    region_id_final_matched: false,
    region_id_match_decision_status: "not_started",
    region_id_match_evidence_status: "not_started",
    visual_qa_passed: false,
    public_display_ready: false,
    is_ready_for_display: false,
    readiness_gate_status: "not_ready_for_public_display",
    visual_qa_started: false,
    feature_rendered_count: 0,
    fit_bounds_checked: false,
    tooltip_checked: false,
    visual_overlap_checked: false,
    missing_geometry_checked: false,
    is_structural_sample: false,
    is_official_data: false,
    is_manual: true,
    is_pending: true,
    legend_type: "categorical",
    legend_unit: "location_status",
    color_scale: "neutral categorical; no risk colors",
    interaction_type: "click_project_summary_after_location_quality_pass",
    tooltip_fields: ["project_id", "project_name", "country_id", "region_id", "city_or_locality", "location_precision", "location_status", "source_url"],
    allowed_filters: ["country_id", "region_id", "location_precision", "location_status", "location_source_reliability", "is_ready_for_map_layer"],
    source_requirement: "project_locations 必须保留位置来源、来源链接、可靠性等级、定位精度和缺失原因；精确点位需要单独可核验地理编码来源。",
    quality_requirement: projectQuality,
    model_boundary: noModelBoundary,
    last_updated: updatedAt,
    notes: "当前 11 条项目已有 region_id 映射，但经纬度未核验，is_ready_for_map_layer=false；不得展示为正式项目点位图。",
  };
}

export const mapLayerRecords: MapLayerRecord[] = [
  hungaryNuts3PilotLayer(),
  boundaryLayer(),
  choroplethLayer({
    layer_id: "regional_population_choropleth",
    layer_name_zh: "区域人口图层",
    layer_name_en: "Regional population choropleth",
    indicator: "regional_population",
    legend_unit: "人",
    color_scale: "sequential blue-gray",
  }),
  choroplethLayer({
    layer_id: "regional_gdp_choropleth",
    layer_name_zh: "区域 GDP 图层",
    layer_name_en: "Regional GDP choropleth",
    indicator: "regional_gdp",
    legend_unit: "百万欧元",
    color_scale: "sequential green-gray",
  }),
  choroplethLayer({
    layer_id: "regional_gdp_per_capita_choropleth",
    layer_name_zh: "区域人均 GDP 图层",
    layer_name_en: "Regional GDP per capita choropleth",
    indicator: "regional_gdp_per_capita",
    legend_unit: "欧元",
    color_scale: "sequential teal-gray",
  }),
  choroplethLayer({
    layer_id: "regional_unemployment_rate_choropleth",
    layer_name_zh: "区域失业率图层",
    layer_name_en: "Regional unemployment rate choropleth",
    indicator: "regional_unemployment_rate",
    legend_unit: "%",
    color_scale: "sequential amber-gray",
  }),
  choroplethLayer({
    layer_id: "regional_manufacturing_share_choropleth",
    layer_name_zh: "区域制造业比重图层",
    layer_name_en: "Regional manufacturing share choropleth",
    indicator: "regional_manufacturing_share",
    legend_unit: "%",
    color_scale: "sequential indigo-gray",
  }),
  projectLocationLayer(),
];
