import type { ModelInputDefinition } from "@/types/ModelOutput";
import type {
  ScenarioCalculationContext,
  ScenarioBacktestRecord,
  ScenarioConfidenceDecomposition,
  ScenarioDefinition,
  ScenarioResult,
  TransmissionChannel,
} from "@/types/Scenario";

export const SCENARIO_CALCULATION_DATE = "2026-08-15";
export const SCENARIO_CALCULATION_TIMESTAMP = "2026-08-15T00:00:00Z";
export const SCENARIO_FORMULA_VERSION = "scenario_transmission_v090";
const EU_COUNTRIES = ["poland", "hungary", "czechia", "slovakia", "germany", "austria", "romania", "slovenia", "croatia"];

export const scenarioDefinitions: ScenarioDefinition[] = [
  {
    scenario_id: "inflation_resurgence",
    name: "Inflation Resurgence",
    name_zh: "通胀回升",
    description: "在不改写原始 HICP 观测值的前提下，假设通胀率上升若干个百分点，并按居民经济压力模型既有权重重算。",
    affected_country_slugs: "all",
    affected_indicators: ["hicp_inflation"],
    affected_models: ["Household Economic Pressure Index"],
    reference_model_id: "household_economic_pressure",
    adjusted_indicator_id: "hicp_inflation",
    shock_label: "HICP 上升幅度",
    shock_unit: "个百分点",
    shock_min: 0,
    shock_max: 5,
    shock_step: 0.5,
    default_shock_value: 2,
    shock_multiplier: 1,
    shock_operation: "additive",
    purpose: "检验给定 HICP 增量在既有居民经济压力模型中的确定性响应。",
    direct_variables: ["hicp_inflation"],
    contextual_variables: ["unemployment_rate", "regional_unemployment_rate", "regional_employment_rate", "regional_gdp_per_capita"],
    assumptions: ["冲击以百分点加到 HICP 基线。", "失业率与其他模型输入保持不变。", "区域指标只作结构背景。"],
    transmission_chain: ["基线 HICP", "通胀冲击假设", "调整后 HICP", "居民经济压力模型重算", "情景差值"],
    confidence: "medium",
    calculation_status: "available",
    unavailable_reason: null,
    limitations: [
      "冲击幅度由用户设定，不是平台对未来通胀的预测。",
      "模型暂未纳入实际工资、住房成本和居民能源账单。",
    ],
  },
  {
    scenario_id: "eu_funds_delay",
    name: "EU Funds Delay / Suspension",
    name_zh: "欧盟资金延迟或暂停",
    description: "把用户设定的财政余额恶化幅度作为明确假设，作用于财政余额/GDP，再按现有财政压力模型重算。",
    affected_country_slugs: EU_COUNTRIES,
    affected_indicators: ["fiscal_balance_gdp", "eu_funds_received"],
    affected_models: ["Fiscal Pressure Index"],
    reference_model_id: "fiscal_pressure",
    adjusted_indicator_id: "fiscal_balance_gdp",
    shock_label: "财政余额恶化幅度",
    shock_unit: "% GDP",
    shock_min: 0,
    shock_max: 3,
    shock_step: 0.25,
    default_shock_value: 1,
    shock_multiplier: -1,
    shock_operation: "additive",
    purpose: "检验用户给定财政余额恶化幅度对既有财政压力模型的条件式影响。",
    direct_variables: ["fiscal_balance_gdp"],
    contextual_variables: ["government_expenditure_gdp", "regional_gdp_per_capita", "regional_population"],
    assumptions: ["财政恶化幅度由用户直接设定，不估计欧盟拨款弹性。", "债务率和融资成本保持不变。", "没有统一地区凝聚资金数据时不推算区域财政影响。"],
    transmission_chain: ["基线财政余额/GDP", "欧盟资金延迟假设", "财政余额恶化幅度", "财政压力模型重算", "情景差值"],
    confidence: "low",
    calculation_status: "available",
    unavailable_reason: null,
    limitations: [
      "平台没有估计欧盟资金延迟与财政余额之间的经验系数；财政余额变化完全由用户设定。",
      "该情景不改变债务、融资成本或实际拨款观测值。",
    ],
  },
  {
    scenario_id: "energy_price_shock",
    name: "Energy Price Shock",
    name_zh: "能源价格冲击",
    description: "按用户设定的工业电价涨幅调整合格基线输入，并重算产业依赖指数；不以能源进口依赖替代价格。",
    affected_country_slugs: "all",
    affected_indicators: ["energy_inflation", "household_electricity_price", "industrial_electricity_price"],
    affected_models: ["Industrial Dependency Index"],
    reference_model_id: "industrial_dependency",
    adjusted_indicator_id: "industrial_electricity_price",
    shock_label: "能源价格上涨幅度",
    shock_unit: "%",
    shock_min: 0,
    shock_max: 50,
    shock_step: 5,
    default_shock_value: 20,
    shock_multiplier: 1,
    shock_operation: "proportional",
    purpose: "区分直接能源价格输入与制造业、进口依赖等结构背景，并仅在合法模型输入上重算。",
    direct_variables: ["industrial_electricity_price", "household_electricity_price", "energy_inflation"],
    contextual_variables: ["energy_import_dependency", "manufacturing_share_gdp", "regional_manufacturing_share"],
    assumptions: ["当前只重算产业模型中的工业电价输入。", "居民电价和能源通胀只在有对应模型输入时才能重算。", "能源进口依赖不等同于能源价格。"],
    transmission_chain: ["工业电价基线", "能源价格涨幅假设", "调整后工业电价", "产业依赖模型重算", "情景差值"],
    confidence: "low",
    calculation_status: "available",
    unavailable_reason: null,
    limitations: [
      "能源进口依赖是结构指标，未被当作能源价格输入。",
      "该情景只调整工业电价，不估计企业对冲、补贴、合同期限或向终端价格的传导。",
    ],
  },
  {
    scenario_id: "germany_demand_slowdown",
    name: "Germany Demand Slowdown",
    name_zh: "德国需求放缓",
    description: "以对德国货物出口依赖为暴露基线，把用户设定的德国需求降幅转换为 synthetic pressure adjustment，再重算产业依赖指数。该调整不是实际出口损失预测。",
    affected_country_slugs: "all",
    affected_indicators: ["germany_export_dependence", "automotive_export_share", "manufacturing_share_gdp"],
    affected_models: ["Industrial Dependency Index"],
    reference_model_id: "industrial_dependency",
    adjusted_indicator_id: "germany_export_dependence",
    shock_label: "德国进口需求变化",
    shock_unit: "%",
    shock_min: -20,
    shock_max: 0,
    shock_step: 1,
    default_shock_value: -5,
    shock_multiplier: 1,
    shock_operation: "adverse_proportional",
    purpose: "检验对德国出口依赖这一直接暴露输入在给定需求降幅下的确定性模型响应。",
    direct_variables: ["germany_export_dependence"],
    contextual_variables: ["automotive_export_share", "manufacturing_share_gdp", "regional_manufacturing_share", "regional_employment_rate", "regional_unemployment_rate"],
    assumptions: ["需求降幅只转换为对德出口暴露的算术压力增量。", "不估计贸易弹性、替代市场或 GDP 损失。", "区域制造业排序只表示结构集中度。"],
    transmission_chain: ["对德国出口依赖基线", "德国需求降幅假设", "压力调整后德国暴露", "产业依赖模型重算", "情景差值"],
    confidence: "low",
    calculation_status: "available",
    unavailable_reason: null,
    limitations: [
      "对德国出口依赖来自双边货物出口占比，不以总出口规模替代。",
      "压力暴露增量是公开的算术假设，不是估计的贸易弹性、产出损失或 GDP 预测。",
    ],
  },
];

export const transmissionChannels: TransmissionChannel[] = scenarioDefinitions.flatMap((scenario) => [
  ...scenario.direct_variables.map((indicator) => ({
    transmission_id: `${scenario.scenario_id}_${indicator}_direct`,
    scenario_id: scenario.scenario_id,
    shock_variable: scenario.shock_label,
    affected_indicator: indicator,
    affected_model: scenario.reference_model_id,
    direction: scenario.scenario_id === "germany_demand_slowdown" || scenario.scenario_id === "eu_funds_delay" ? "decrease" as const : "increase" as const,
    transmission_channel: indicator === scenario.adjusted_indicator_id ? "模型公式内直接重算" : "直接变量已登记，但当前模型没有对应合法输入时不重算",
    direct_or_indirect: "direct" as const,
    regional_context_indicator: scenario.contextual_variables.filter((item) => item.startsWith("regional_")),
    project_context: false,
    event_context: true,
    confidence: indicator === scenario.adjusted_indicator_id ? scenario.confidence : "low" as const,
    limitations: indicator === scenario.adjusted_indicator_id ? "只改变该输入，其他基线变量保持不变。" : "当前缺少可直接重算的模型输入，不生成数值影响。",
  })),
  ...scenario.contextual_variables.map((indicator) => ({
    transmission_id: `${scenario.scenario_id}_${indicator}_context`,
    scenario_id: scenario.scenario_id,
    shock_variable: scenario.shock_label,
    affected_indicator: indicator,
    affected_model: scenario.reference_model_id,
    direction: "conditional" as const,
    transmission_channel: "事实结构背景，不进入本轮情景分数",
    direct_or_indirect: "contextual" as const,
    regional_context_indicator: indicator.startsWith("regional_") ? [indicator] : [],
    project_context: scenario.scenario_id === "energy_price_shock" || scenario.scenario_id === "germany_demand_slowdown",
    event_context: true,
    confidence: "low" as const,
    limitations: "相关结构指标不等于直接冲击输入，也不证明因果影响。",
  })),
]);

export const scenarioBacktestRegistry: ScenarioBacktestRecord[] = [
  {
    scenario_id: "inflation_resurgence",
    historical_period: "2021–2024",
    baseline_date: "待选择",
    shock_definition: "历史 HICP 增量与后续居民压力输入的方向比较",
    observed_outcome: "待建立可比历史模型输出",
    comparable_indicator: "hicp_inflation / unemployment_rate",
    evaluation_status: "structure_only",
    notes: "现有国家观测可用于准备，但缺少按当时可得信息重建的历史模型输出，暂不报告准确率。",
  },
  {
    scenario_id: "energy_price_shock",
    historical_period: "2023–2024",
    baseline_date: "待选择",
    shock_definition: "工业电价变化与产业模型方向响应的探索性比较",
    observed_outcome: "待建立可比历史模型输出",
    comparable_indicator: "industrial_electricity_price",
    evaluation_status: "structure_only",
    notes: "两年电价输入不足以支持稳健回测，本轮只登记结构。",
  },
];

export const industrialDependencyReadiness = {
  status: "ready" as const,
  eligible_countries: ["poland", "hungary", "czechia", "slovakia", "austria", "romania", "slovenia", "croatia", "serbia"],
  available_inputs: ["manufacturing_share_gdp", "automotive_export_share", "germany_export_dependence", "industrial_electricity_price"],
  blockers: [
    "当前最新共同可比年份为 2024，不能将 2025 的待接入值当作零值。",
    "供应链集中度仍缺少统一可靠口径，未进入正式分数。",
    "FDI 流入波动和负值不能直接解释为产业依赖，本版权重为 0。",
  ],
  decision: "v0.75 已将 Industrial Dependency 输入结构扩展到十国；各国仍按实际完整度决定是否输出，德国自身对德依赖按不适用处理。",
};

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalize(value: number | null | undefined, input: ModelInputDefinition) {
  if (!Number.isFinite(value)) return null;
  const { lower, upper, invert } = input.normalization;
  const linear = (((value as number) - lower) / (upper - lower)) * 100;
  return clamp(invert ? 100 - linear : linear);
}

function shockBoundaryStatus(definition: ScenarioDefinition, requested: number) {
  if (requested < definition.shock_min) return "clamped_to_min" as const;
  if (requested > definition.shock_max) return "clamped_to_max" as const;
  return "within_range" as const;
}

function confidenceLabel(value: number): ScenarioConfidenceDecomposition["label"] {
  if (value >= 85) return "high";
  if (value >= 60) return "medium";
  if (value > 0) return "low";
  return "not_available";
}

function confidenceDecomposition(
  definition: ScenarioDefinition,
  baseline: ScenarioCalculationContext["outputs"][number] | undefined,
  regionalContextCoverage = 0,
  evidenceQuality = 0,
): ScenarioConfidenceDecomposition {
  const directAvailable = baseline?.inputs.filter((input) => definition.direct_variables.includes(input.indicator_id)).length ?? 0;
  const directCoverage = definition.direct_variables.length ? Math.round((directAvailable / definition.direct_variables.length) * 100) : 0;
  const modelEligibility = baseline?.availability === "sufficient" ? 100 : baseline?.availability === "partial" ? 75 : 0;
  const baselineCompleteness = baseline?.data_completeness ?? 0;
  const aggregate = Math.round(
    baselineCompleteness * 0.35
    + modelEligibility * 0.25
    + directCoverage * 0.2
    + regionalContextCoverage * 0.1
    + evidenceQuality * 0.1,
  );
  return {
    baseline_data_completeness: baselineCompleteness,
    model_eligibility: modelEligibility,
    direct_transmission_coverage: directCoverage,
    regional_context_coverage: regionalContextCoverage,
    project_event_evidence_quality: evidenceQuality,
    aggregate,
    label: confidenceLabel(aggregate),
  };
}

export function calculateScenario({ definition, countrySlug, shockValue, cards, outputs, regionalContextCoverage = 0, evidenceQuality = 0 }: ScenarioCalculationContext): ScenarioResult {
  const card = cards.find((candidate) => candidate.model_id === definition.reference_model_id);
  const baseline = outputs.find((candidate) => candidate.country_slug === countrySlug && candidate.model_id === definition.reference_model_id);
  const boundedShock = Math.min(definition.shock_max, Math.max(definition.shock_min, shockValue));
  const boundaryStatus = shockBoundaryStatus(definition, shockValue);
  const boundaryNote = boundaryStatus === "within_range"
    ? null
    : `请求值 ${shockValue} 超出公开范围，已明确截断为 ${boundedShock}；未按越界值计算。`;
  const common = {
    scenario_id: definition.scenario_id,
    country_slug: countrySlug,
    model_id: definition.reference_model_id,
    model_name: card?.name_zh ?? definition.reference_model_id,
    requested_shock_value: shockValue,
    shock_value: boundedShock,
    shock_boundary_status: boundaryStatus,
    baseline_score: baseline?.score ?? null,
    confidence_decomposition: confidenceDecomposition(definition, baseline, regionalContextCoverage, evidenceQuality),
    baseline_date: baseline?.input_year ? String(baseline.input_year) : null,
    model_version: baseline?.model_version ?? null,
    formula_version: SCENARIO_FORMULA_VERSION,
    weight_version: card?.weight_version ?? null,
    calculation_date: SCENARIO_CALCULATION_DATE,
    calculation_timestamp: SCENARIO_CALCULATION_TIMESTAMP,
    input_observation_ids: baseline?.input_observation_ids ?? [],
    baseline_input_values: baseline?.inputs.map((input) => ({
      indicator_id: input.indicator_id,
      observation_id: input.observation_id,
      year: input.year,
      value: input.raw_value,
      unit: input.unit,
      weight: input.weight,
    })) ?? [],
    transmission_chain: definition.transmission_chain,
    limitations: boundaryNote ? [...definition.limitations, boundaryNote] : definition.limitations,
    saturation_status: "not_applicable" as const,
    interpretation_boundary: "情景结果是基于用户假设的条件式比较，不是预测、风险真值或未来事实。",
  };

  const countryIncluded = definition.affected_country_slugs === "all" || definition.affected_country_slugs.includes(countrySlug);
  if (!countryIncluded) {
    return {
      ...common,
      status: "unavailable",
      scenario_score: null,
      score_change: null,
      confidence: "not_available",
      adjusted_input: null,
      unavailable_reason: "该国家不在此情景第一版的适用范围内。",
    };
  }

  if (definition.calculation_status === "unavailable" || !definition.adjusted_indicator_id) {
    return {
      ...common,
      status: "unavailable",
      scenario_score: null,
      score_change: null,
      confidence: "not_available",
      adjusted_input: null,
      unavailable_reason: definition.unavailable_reason,
    };
  }

  if (!card || !baseline || baseline.score === null) {
    return {
      ...common,
      status: "unavailable",
      scenario_score: null,
      score_change: null,
      confidence: "not_available",
      adjusted_input: null,
      unavailable_reason: "该国基线模型输入不足，不能输出情景分数。",
    };
  }

  const inputDefinition = card.inputs.find((input) => input.indicator_id === definition.adjusted_indicator_id);
  const baselineInput = baseline.inputs.find((input) => input.indicator_id === definition.adjusted_indicator_id);
  if (!inputDefinition || !baselineInput) {
    return {
      ...common,
      status: "unavailable",
      scenario_score: null,
      score_change: null,
      confidence: "not_available",
      adjusted_input: null,
      unavailable_reason: "基线输出中没有满足准入条件的直接输入，暂不计算该传导。",
    };
  }

  const signedShock = boundedShock * definition.shock_multiplier;
  const adjustedValue = Number((definition.shock_operation === "proportional"
    ? baselineInput.raw_value * (1 + signedShock / 100)
    : definition.shock_operation === "adverse_proportional"
      ? baselineInput.raw_value * (1 + Math.abs(signedShock) / 100)
      : baselineInput.raw_value + signedShock).toFixed(3));
  const adjustedNormalized = normalize(adjustedValue, inputDefinition);
  if (adjustedNormalized === null) {
    return {
      ...common,
      status: "unavailable",
      scenario_score: null,
      score_change: null,
      confidence: "not_available",
      adjusted_input: null,
      unavailable_reason: "调整后的直接输入不是有限数值，拒绝输出情景分数。",
    };
  }
  const availableWeight = baseline.inputs.reduce((total, input) => total + input.weight, 0);
  const adjustedContribution = adjustedNormalized * inputDefinition.weight;
  const unchangedContribution = baseline.inputs
    .filter((input) => input.indicator_id !== definition.adjusted_indicator_id)
    .reduce((total, input) => total + input.weighted_contribution, 0);
  const scenarioScore = Number(((unchangedContribution + adjustedContribution) / availableWeight).toFixed(1));

  return {
    ...common,
    status: "available",
    scenario_score: scenarioScore,
    score_change: Number((scenarioScore - baseline.score).toFixed(1)),
    confidence: common.confidence_decomposition.label,
    adjusted_input: {
      indicator_id: baselineInput.indicator_id,
      indicator_name: baselineInput.indicator_name,
      observation_id: baselineInput.observation_id,
      year: baselineInput.year,
      baseline_value: baselineInput.raw_value,
      shock_value: signedShock,
      adjusted_value: adjustedValue,
      unit: baselineInput.unit,
      normalized_baseline: baselineInput.normalized_score,
      normalized_adjusted: Number(adjustedNormalized.toFixed(1)),
      weight: inputDefinition.weight,
      source_name: baselineInput.source_name,
      source_url: baselineInput.source_url,
      source_reliability: baselineInput.source_reliability,
    },
    unavailable_reason: null,
    saturation_status: adjustedNormalized === 0 || adjustedNormalized === 100 ? "normalization_boundary_reached" : "not_saturated",
  };
}

export function getSensitivityShockValues(definition: ScenarioDefinition) {
  if (definition.scenario_id === "inflation_resurgence") return [1, 2, 3, 4, 5];
  if (definition.scenario_id === "energy_price_shock") return [10, 20, 30, 40, 50];
  if (definition.scenario_id === "germany_demand_slowdown") return [-2, -5, -10, -15, -20];
  return [0.5, 1, 1.5, 2, 3];
}
