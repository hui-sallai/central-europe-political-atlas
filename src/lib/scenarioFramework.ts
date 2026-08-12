import type { ModelInputDefinition } from "@/types/ModelOutput";
import type {
  ScenarioCalculationContext,
  ScenarioDefinition,
  ScenarioResult,
} from "@/types/Scenario";

const SCENARIO_CALCULATION_DATE = "2026-08-11";
const V4_COUNTRIES = ["poland", "hungary", "czechia", "slovakia"];

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
    affected_country_slugs: V4_COUNTRIES,
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
    affected_country_slugs: V4_COUNTRIES,
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
    description: "以对德国货物出口依赖为暴露基线，把用户设定的德国需求降幅转换为压力暴露增量，再重算产业依赖指数。",
    affected_country_slugs: V4_COUNTRIES,
    affected_indicators: ["germany_export_dependence", "automotive_export_share", "manufacturing_share_gdp"],
    affected_models: ["Industrial Dependency Index"],
    reference_model_id: "industrial_dependency",
    adjusted_indicator_id: "germany_export_dependence",
    shock_label: "德国进口需求变化",
    shock_unit: "%",
    shock_min: -15,
    shock_max: 0,
    shock_step: 1,
    default_shock_value: -5,
    shock_multiplier: 1,
    shock_operation: "adverse_proportional",
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

export const industrialDependencyReadiness = {
  status: "ready" as const,
  eligible_countries: V4_COUNTRIES,
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

function normalize(value: number, input: ModelInputDefinition) {
  const { lower, upper, invert } = input.normalization;
  const linear = ((value - lower) / (upper - lower)) * 100;
  return clamp(invert ? 100 - linear : linear);
}

export function calculateScenario({ definition, countrySlug, shockValue, cards, outputs }: ScenarioCalculationContext): ScenarioResult {
  const card = cards.find((candidate) => candidate.model_id === definition.reference_model_id);
  const baseline = outputs.find((candidate) => candidate.country_slug === countrySlug && candidate.model_id === definition.reference_model_id);
  const common = {
    scenario_id: definition.scenario_id,
    country_slug: countrySlug,
    model_id: definition.reference_model_id,
    model_name: card?.name_zh ?? definition.reference_model_id,
    baseline_score: baseline?.score ?? null,
    calculation_date: SCENARIO_CALCULATION_DATE,
    input_observation_ids: baseline?.input_observation_ids ?? [],
    transmission_chain: definition.transmission_chain,
    limitations: definition.limitations,
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

  const boundedShock = Math.min(definition.shock_max, Math.max(definition.shock_min, shockValue));
  const signedShock = boundedShock * definition.shock_multiplier;
  const adjustedValue = Number((definition.shock_operation === "proportional"
    ? baselineInput.raw_value * (1 + signedShock / 100)
    : definition.shock_operation === "adverse_proportional"
      ? baselineInput.raw_value * (1 + Math.abs(signedShock) / 100)
      : baselineInput.raw_value + signedShock).toFixed(3));
  const adjustedNormalized = normalize(adjustedValue, inputDefinition);
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
    confidence: definition.confidence,
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
  };
}
