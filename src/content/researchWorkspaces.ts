import type { Locale } from "@/i18n/config";

export type BilingualText = Record<Locale, string>;
export const bilingual = (zh: string, en: string): BilingualText => ({ "zh-CN": zh, en });
export type ResearchWorkspaceDefinition = {
  id: string; title: BilingualText; introduction: BilingualText; questions: BilingualText[];
  indicatorIds: string[]; highFrequencyIds: string[]; driverIds: string[];
  eventTopics: string[]; eventTypes: string[]; mapLayers: string[]; methodIds: string[];
  comparisonDimensions: BilingualText; defaultTimeHorizon: { from: number; to: number };
  warnings: BilingualText[]; coverageNote: BilingualText; exportModes: readonly ["workspace_setup"];
};
const common = bilingual("描述性同期变化不能识别因果关系；缺失值不补零，不连接不同定义、单位或统计总体的序列。", "Descriptive co-movement does not identify causality. Missing values are never zero-filled; different definitions, units and statistical populations are not joined.");
const coverage = bilingual("覆盖范围由现有非空记录计算；每个指标、国家和数据层可能有不同起止时期及内部缺口。历史层不进入正式模型。", "Coverage is computed from existing non-missing records. Each indicator, country and layer may have different endpoints and internal gaps. Historical layers do not enter formal models.");
export const researchWorkspaces: ResearchWorkspaceDefinition[] = [
  { id: "inflation_monetary_policy", title: bilingual("通胀与货币政策", "Inflation & Monetary Policy"),
    introduction: bilingual("并列考察通胀、利率与实体经济轨迹，区分观测利率、已识别冲击和描述性事件背景。", "Inspect inflation, interest-rate and real-economy trajectories side by side, distinguishing observed rates, identified shocks and descriptive event context."),
    questions: [bilingual("2021 年后，所选国家的通胀与政策利率轨迹如何不同？", "How did inflation and policy-rate trajectories differ across selected countries after 2021?")],
    indicatorIds: ["hicp_inflation", "unemployment_rate"], highFrequencyIds: ["hicp_annual_rate", "industrial_production_index", "unemployment_rate_monthly"], driverIds: ["policy_rate", "bilateral_fx_local_per_eur", "long_term_government_yield"],
    eventTopics: ["经济"], eventTypes: ["macro"], mapLayers: ["regional_unemployment_rate"], methodIds: ["macro_driver_explorer", "monetary_policy_identification", "local_projections", "panel_local_projections", "reduced_form_var", "svar"],
    comparisonDimensions: bilingual("同定义通胀轨迹、货币制度和共同时期；政策利率不等同于货币政策冲击。", "Inflation trajectories within matching definitions, currency regimes and common periods; policy rates are not monetary-policy shocks."), defaultTimeHorizon: { from: 2021, to: 2025 },
    warnings: [common, bilingual("国家 CPI 与 HICP 不相同；塞尔维亚 CPI 保留 SORS 来源和不可跨国比较标记。", "National CPI and HICP are distinct. Serbia CPI retains its SORS identity and non-comparable flag."), bilingual("非欧元国家的 ECB 冲击属于外部暴露 / 溢出设置；LP 与 Panel LP 的冻结样本、点态推断与限制不变。", "ECB shocks for non-euro countries represent external exposure / spillover settings. Frozen LP and Panel LP samples, pointwise inference and limitations are unchanged."), bilingual("Reduced-form VAR 仅保留现有系数估计；正式动态响应与 IRF 发布不可用。", "Reduced-form VAR retains existing coefficient estimation only; formal dynamic-response and IRF publication are unavailable.")], coverageNote: coverage, exportModes: ["workspace_setup"] },
  { id: "trade_external_exposure", title: bilingual("贸易结构与外部暴露", "Trade Structure & External Exposure"),
    introduction: bilingual("考察进出口规模、伙伴构成与集中度，并回到贸易网络与原始来源核查口径。", "Inspect exports, imports, partner composition and concentration, then check definitions in the trade network and original sources."),
    questions: [bilingual("2015–2025 年，贸易伙伴集中度如何变化？", "How did partner concentration change between 2015 and 2025?")],
    indicatorIds: ["exports_goods_services", "imports_goods_services", "trade_balance", "germany_export_dependence", "manufacturing_share_gdp", "fdi_inflow"], highFrequencyIds: [], driverIds: [], eventTopics: ["对华经贸"], eventTypes: ["China", "FDI", "industrial_policy"], mapLayers: ["china_project_locations", "regional_manufacturing_share"], methodIds: ["network_dependency", "event_window_analysis"],
    comparisonDimensions: bilingual("伙伴集中度、贸易暴露与商品构成；网络年份由现有工具自行核验。", "Partner concentration, trade exposure and composition; the existing network tool verifies its available years."), defaultTimeHorizon: { from: 2015, to: 2025 },
    warnings: [common, bilingual("集中度是描述性贸易量度，不自动推导政治依赖或地缘政治判断。项目地点不是已识别经济效应。", "Concentration is a descriptive trade measure, not an automatic inference of political dependency or geopolitical judgments. Project locations are not identified economic effects.")], coverageNote: coverage, exportModes: ["workspace_setup"] },
  { id: "fiscal_macro_conditions", title: bilingual("财政与宏观状况", "Fiscal & Macroeconomic Conditions"),
    introduction: bilingual("检查财政余额、债务、增长和就业的时期演变及可比定义，不建立国家排名。", "Inspect the time evolution and comparable definitions of balances, debt, growth and employment without ranking countries."),
    questions: [bilingual("在共同可用年份，所选国家的财政余额与就业轨迹如何不同？", "How did fiscal-balance and employment trajectories differ across selected countries in commonly available years?")],
    indicatorIds: ["real_gdp_growth", "gdp_per_capita_eur", "unemployment_rate", "fiscal_balance_gdp", "government_debt_gdp", "government_revenue_gdp", "government_expenditure_gdp", "current_account_gdp", "hicp_inflation"], highFrequencyIds: [], driverIds: [], eventTopics: ["经济", "欧盟"], eventTypes: ["fiscal", "macro", "EU_funds"], mapLayers: ["regional_gdp_per_capita", "regional_unemployment_rate"], methodIds: ["panel_econometrics", "composite_indicators", "event_study"],
    comparisonDimensions: bilingual("同指标、单位、统计总体与共同年份；先观察演变，再检查工具可比性门禁。", "Matching indicators, units, populations and common years; inspect trajectories before the tool's comparability gate."), defaultTimeHorizon: { from: 2015, to: 2025 },
    warnings: [common, bilingual("综合指标是透明规则构造的分数，不是客观国家表现排名；固定效应关联不等于因果识别。缺失或不可比年度观测仍被排除。", "Composite indicators are transparently constructed scores, not objective national-performance rankings. Fixed-effects association is not causal identification; missing or non-comparable annual observations remain excluded.")], coverageNote: coverage, exportModes: ["workspace_setup"] },
  { id: "regional_development", title: bilingual("区域发展与差异", "Regional Development & Divergence"),
    introduction: bilingual("在原行政分类与地理版本内检查区域人口、产出和劳动市场分布，连接现有区域地图。", "Inspect regional population, output and labour-market distributions within their original classifications and geography vintages using the existing regional map."),
    questions: [bilingual("匈牙利内部的区域失业分布如何随时期变化？", "How did regional unemployment patterns evolve within Hungary?")],
    indicatorIds: ["population", "gdp_per_capita_eur", "unemployment_rate", "manufacturing_share_gdp"], highFrequencyIds: [], driverIds: [], eventTopics: ["区域"], eventTypes: ["regional", "industrial_policy"], mapLayers: ["regional_population", "regional_gdp", "regional_gdp_per_capita", "regional_unemployment_rate", "regional_employment_rate", "regional_manufacturing_share", "china_project_locations"], methodIds: [],
    comparisonDimensions: bilingual("优先同国内同层级区域；地理版本、统计总体与断点必须匹配。", "Prefer regions at the same level within one country; geography vintages, populations and breaks must match."), defaultTimeHorizon: { from: 2021, to: 2024 },
    warnings: [common, bilingual("保留地理版本，不连接不兼容历史边界；塞尔维亚 NSTJ 不重标为欧盟 NUTS。地图颜色展示事实量，不是发展分数。", "Preserve geography vintages and do not join incompatible historical boundaries. Serbia NSTJ is not relabelled as EU NUTS. Choropleth colours show factual measures, not development scores.")], coverageNote: coverage, exportModes: ["workspace_setup"] },
];
export const workspaceIds = researchWorkspaces.map(workspace => workspace.id);
