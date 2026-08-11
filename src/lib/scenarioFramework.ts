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
    description: "登记能源价格上涨假设，但当前模型只有能源进口依赖，没有居民或工业能源价格这一直接输入。",
    affected_country_slugs: "all",
    affected_indicators: ["energy_inflation", "household_electricity_price", "industrial_electricity_price"],
    affected_models: ["Household Economic Pressure Index", "External Vulnerability Index"],
    reference_model_id: "external_vulnerability",
    adjusted_indicator_id: null,
    shock_label: "能源价格上涨幅度",
    shock_unit: "%",
    shock_min: 0,
    shock_max: 50,
    shock_step: 5,
    default_shock_value: 20,
    shock_multiplier: 1,
    transmission_chain: ["能源价格冲击假设", "直接能源价格输入缺失", "暂不调整现有模型", "等待合格观测值"],
    confidence: "not_available",
    calculation_status: "unavailable",
    unavailable_reason: "当前模型缺少能源通胀、居民电价或工业电价的合格直接输入，暂不计算该传导。",
    limitations: ["能源进口依赖是结构指标，不能被能源价格上涨幅度直接替代。"],
  },
  {
    scenario_id: "germany_demand_slowdown",
    name: "Germany Demand Slowdown",
    name_zh: "德国需求放缓",
    description: "登记德国需求下降假设，但当前数据层尚无对德国出口依赖或德国需求弹性这一直接输入。",
    affected_country_slugs: V4_COUNTRIES,
    affected_indicators: ["germany_export_dependence", "automotive_export_share", "manufacturing_share_gdp"],
    affected_models: ["External Vulnerability Index", "Future Industrial Dependency Index"],
    reference_model_id: "external_vulnerability",
    adjusted_indicator_id: null,
    shock_label: "德国进口需求变化",
    shock_unit: "%",
    shock_min: -15,
    shock_max: 0,
    shock_step: 1,
    default_shock_value: -5,
    shock_multiplier: 1,
    transmission_chain: ["德国需求放缓假设", "双边出口依赖输入缺失", "暂不调整外部或产业模型", "等待贸易伙伴暴露数据"],
    confidence: "not_available",
    calculation_status: "unavailable",
    unavailable_reason: "当前模型缺少对德国出口依赖和需求弹性，不能用总出口或制造业占比代替该传导。",
    limitations: ["名义出口规模不能直接表示对德国市场的依赖程度。"],
  },
];

export const industrialDependencyReadiness = {
  status: "not_ready" as const,
  eligible_countries: V4_COUNTRIES,
  available_inputs: ["manufacturing_share_gdp", "automotive_export_share", "fdi_inflow"],
  blockers: [
    "汽车产业出口占比 2025 仍待接入，当前最新共同年份为 2024。",
    "汽车产业出口占比属于计算值，需要在 Model Card 中单独定义计算值准入规则。",
    "FDI 流入波动和负值不能直接解释为产业依赖，需要先定义方向与归一化边界。",
    "供应链集中度、对德国出口依赖和工业能源成本尚未接入。",
  ],
  decision: "v0.60 不启用 Industrial Dependency Index，只保留后续模型接口。",
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
  const adjustedValue = Number((baselineInput.raw_value + boundedShock * definition.shock_multiplier).toFixed(3));
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
      shock_value: boundedShock * definition.shock_multiplier,
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
