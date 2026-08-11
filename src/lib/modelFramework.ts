import countriesJson from "../data/countries/countries.json";
import eventsJson from "../data/events/events.json";
import indicatorsJson from "../data/indicators/indicators.json";
import observationsJson from "../data/observations/observations.json";
import type { Country, DataEnvelope, Event, Indicator, Observation } from "../types/researchData";
import type {
  ModelCard,
  ModelAvailability,
  ModelId,
  ModelInputDefinition,
  ModelInputTrace,
  ModelOutput,
  ModelTrend,
} from "../types/ModelOutput";
import { transmissionIndicators, transmissionObservations } from "./transmissionData";

const CALCULATION_DATE = "2026-08-11";
const MODEL_VERSION = "v0.50.0";
const INDUSTRIAL_MODEL_VERSION = "v0.70.0";
const PARTIAL_SCORE_THRESHOLD = 0.75;
const SCORE_BOUNDARY = "分数是基于公开输入和固定规则的比较工具，不是客观风险真值、预测或政策评价。";
const CALCULATED_MODEL_INPUTS = new Set([
  "automotive_export_share",
  "germany_export_dependence",
  "industrial_electricity_price",
]);

function records<T>(value: unknown) {
  return (value as DataEnvelope<T>).records;
}

const countries = records<Country>(countriesJson);
const transmissionIndicatorIds = new Set(transmissionIndicators.map((indicator) => indicator.id));
const transmissionObservationIds = new Set(transmissionObservations.map((observation) => observation.id));
const indicators = [
  ...records<Indicator>(indicatorsJson).filter((indicator) => !transmissionIndicatorIds.has(indicator.id)),
  ...transmissionIndicators,
];
const observations = [
  ...records<Observation>(observationsJson).filter((observation) => !transmissionObservationIds.has(observation.id)),
  ...transmissionObservations,
];
const events = records<Event>(eventsJson);

export const modelCards: ModelCard[] = [
  {
    model_id: "household_economic_pressure",
    model_version: MODEL_VERSION,
    name: "Household Economic Pressure Index",
    name_zh: "居民经济压力指数",
    purpose: "用已经通过质量验收的价格与就业数据，形成可追溯的居民经济压力比较值。",
    inputs: [
      {
        indicator_id: "hicp_inflation",
        label: "CPI / HICP 通胀率",
        weight: 0.5,
        normalization: { method: "linear_clamp", lower: 0, upper: 10 },
        rationale: "0% 映射为 0，10% 及以上映射为 100，中间线性换算。",
      },
      {
        indicator_id: "unemployment_rate",
        label: "失业率",
        weight: 0.5,
        normalization: { method: "linear_clamp", lower: 2, upper: 12 },
        rationale: "2% 及以下映射为 0，12% 及以上映射为 100，中间线性换算。",
      },
    ],
    reserved_inputs: ["real_wage_growth", "household_electricity_price", "energy_inflation"],
    calculation_logic: "各输入按固定上下界线性标准化到 0–100，再乘以集中维护的权重求和。",
    weight_note: "v0.50 中通胀和失业率各占 50%；工资和居民能源成本因缺少合格观测值暂不计权。",
    output_meaning: "分数越高，表示当前价格和就业两个维度的观测组合对应更高的居民经济压力。",
    completeness_rule: "启用权重覆盖 100% 时为 sufficient；达到 75% 可标记 partial 并按可用权重重标，低于 75% 为 insufficient 且不输出精确分数。当前两个输入各占 50%，缺少任一项即低于 partial 门槛。",
    limitations: [
      "尚未纳入实际工资、住房成本、居民能源账单和收入分布。",
      "固定标准化边界是公开的分析设定，不是自然阈值。",
      "不用于预测家庭行为、选举结果或个体生活状况。",
    ],
    event_policy: "事件只用于解释近期方向，不进入 v0.50 基础分数。",
    weight_history: [{ version: MODEL_VERSION, effective_date: CALCULATION_DATE, note: "首版：通胀率 50%，失业率 50%。" }],
    calculation_date: CALCULATION_DATE,
  },
  {
    model_id: "fiscal_pressure",
    model_version: MODEL_VERSION,
    name: "Fiscal Pressure Index",
    name_zh: "财政压力指数",
    purpose: "用财政余额和政府债务的可核验观测，形成第一版财政结构压力比较值。",
    inputs: [
      {
        indicator_id: "fiscal_balance_gdp",
        label: "财政赤字/GDP",
        weight: 0.5,
        normalization: { method: "linear_clamp", lower: -10, upper: 0, invert: true },
        rationale: "财政余额 0% GDP 映射为 0，-10% GDP 及以下映射为 100，中间线性换算。",
      },
      {
        indicator_id: "government_debt_gdp",
        label: "政府债务/GDP",
        weight: 0.5,
        normalization: { method: "linear_clamp", lower: 20, upper: 100 },
        rationale: "20% GDP 及以下映射为 0，100% GDP 及以上映射为 100，中间线性换算。",
      },
    ],
    reserved_inputs: ["interest_expenditure_gdp", "government_bond_yield", "eu_funds_received"],
    calculation_logic: "财政余额和债务率按固定边界标准化到 0–100，各占 50% 后求和。",
    weight_note: "v0.50 只启用赤字和债务两个 A 级来源输入；融资成本和欧盟资金尚未接入，不参与计算。",
    output_meaning: "分数越高，表示当前赤字和债务两个维度的观测组合对应更高的财政压力。",
    completeness_rule: "启用权重覆盖 100% 时为 sufficient；达到 75% 可标记 partial 并按可用权重重标，低于 75% 为 insufficient 且不输出精确分数。当前两个输入各占 50%，缺少任一项即低于 partial 门槛。",
    limitations: [
      "尚未纳入利息支出、债券收益率、债务期限结构和欧盟资金实际支付。",
      "不衡量政府偿债违约概率，也不构成主权信用评级。",
      "当前只有 V4 四国具备完整的启用输入。",
    ],
    event_policy: "财政和欧盟资金事件作为解释记录展示，不改变 v0.50 基础分数。",
    weight_history: [{ version: MODEL_VERSION, effective_date: CALCULATION_DATE, note: "首版：财政赤字/GDP 50%，政府债务/GDP 50%。" }],
    calculation_date: CALCULATION_DATE,
  },
  {
    model_id: "external_vulnerability",
    model_version: MODEL_VERSION,
    name: "External Vulnerability Index",
    name_zh: "外部脆弱性指数",
    purpose: "用经常账户与能源进口依赖的可核验观测，形成第一版外部收支和能源依赖比较值。",
    inputs: [
      {
        indicator_id: "current_account_gdp",
        label: "经常账户/GDP",
        weight: 0.5,
        normalization: { method: "linear_clamp", lower: -10, upper: 5, invert: true },
        rationale: "经常账户 5% GDP 及以上映射为 0，-10% GDP 及以下映射为 100，中间线性换算。",
      },
      {
        indicator_id: "energy_import_dependency",
        label: "能源进口依赖",
        weight: 0.5,
        normalization: { method: "linear_clamp", lower: 20, upper: 80 },
        rationale: "能源进口依赖 20% 及以下映射为 0，80% 及以上映射为 100，中间线性换算。",
      },
    ],
    reserved_inputs: ["external_debt_gdp", "exports_gdp", "imports_gdp", "exchange_rate_eur_lcu", "germany_export_dependence"],
    calculation_logic: "经常账户和能源进口依赖按固定边界标准化到 0–100，各占 50% 后求和；使用满足完整度门槛的最新共同年份。",
    weight_note: "v0.50 只启用经常账户/GDP 和能源进口依赖两个 A 级来源输入，各占 50%；名义贸易额不直接跨国评分。",
    output_meaning: "分数越高，表示当前外部收支与能源进口依赖两个维度的观测组合对应更高的外部脆弱性。",
    completeness_rule: "启用权重覆盖 100% 时为 sufficient；达到 75% 可标记 partial 并按可用权重重标，低于 75% 为 insufficient 且不输出精确分数。2025 年能源依赖待接入，因此当前 V4 使用最新完整可比年 2024。",
    limitations: [
      "尚未纳入外债、短期融资、汇率波动、国际储备和贸易伙伴集中度。",
      "名义出口、进口和贸易差额未按 GDP 标准化，不直接进入当前跨国分数。",
      "当前只有 V4 四国具备完整的启用输入，不构成危机概率或主权风险预测。",
    ],
    event_policy: "外部、能源和 FDI 事件只用于解释近期方向，不改变 v0.50 基础分数。",
    weight_history: [{ version: MODEL_VERSION, effective_date: CALCULATION_DATE, note: "首版：经常账户/GDP 50%，能源进口依赖 50%。" }],
    calculation_date: CALCULATION_DATE,
  },
  {
    model_id: "industrial_dependency",
    model_version: INDUSTRIAL_MODEL_VERSION,
    name: "Industrial Dependency Index",
    name_zh: "产业依赖指数",
    purpose: "用制造业体量、汽车出口集中、对德国出口依赖和统一口径工业电价，形成 V4 第一版可追溯产业结构暴露比较值。",
    inputs: [
      {
        indicator_id: "manufacturing_share_gdp",
        label: "制造业占 GDP 比重",
        weight: 0.25,
        normalization: { method: "linear_clamp", lower: 10, upper: 25 },
        rationale: "10% 映射为 0，25% 及以上映射为 100；表示经济活动对制造业的结构集中程度。",
      },
      {
        indicator_id: "automotive_export_share",
        label: "汽车产业出口占比",
        weight: 0.3,
        normalization: { method: "linear_clamp", lower: 5, upper: 45 },
        rationale: "5% 映射为 0，45% 及以上映射为 100；仅接纳有明确 Eurostat 计算口径的计算值。",
      },
      {
        indicator_id: "germany_export_dependence",
        label: "对德国出口依赖",
        weight: 0.3,
        normalization: { method: "linear_clamp", lower: 10, upper: 40 },
        rationale: "10% 映射为 0，40% 及以上映射为 100；使用对德国货物出口占对世界货物出口比重，不用总出口规模替代。",
      },
      {
        indicator_id: "industrial_electricity_price",
        label: "工业电价",
        weight: 0.15,
        normalization: { method: "linear_clamp", lower: 0.1, upper: 0.4 },
        rationale: "0.10 欧元/kWh 映射为 0，0.40 欧元/kWh 及以上映射为 100；统一采用 Eurostat 非居民 IC 档含税口径。",
      },
    ],
    reserved_inputs: ["fdi_inflow", "manufacturing_concentration", "supply_chain_concentration_proxy"],
    calculation_logic: "四项输入按公开边界标准化到 0–100，再按 25% / 30% / 30% / 15% 加权。FDI 年流量不计正式权重。",
    weight_note: "制造业占比 25%，汽车出口占比 30%，对德国出口依赖 30%，工业电价 15%；权重集中维护于 Model Card。",
    output_meaning: "分数越高，表示已纳入维度中的制造业、汽车出口、德国市场与工业能源成本暴露组合更集中；不代表产业政策优劣或危机概率。",
    completeness_rule: "启用权重覆盖 100% 为 sufficient；达到 75% 为 partial 并按可用权重重标；低于 75% 不输出精确分数。当前第一版仅对 V4 接入统一输入。",
    limitations: [
      "指数不是完整供应链网络模型，尚未纳入企业级投入产出关系和关键零部件来源集中度。",
      "工业电价反映成本环境，不等同于能源依赖；对德国出口依赖只覆盖货物贸易。",
      "FDI 流量因负值、重组和年度波动难以解释为依赖方向，本版只作背景，不计权。",
    ],
    event_policy: "产业、FDI、能源和区域事件只用于解释方向，不进入 v0.70 基础分数。",
    weight_history: [{ version: INDUSTRIAL_MODEL_VERSION, effective_date: CALCULATION_DATE, note: "首版：制造业 25%，汽车出口 30%，对德出口依赖 30%，工业电价 15%；FDI 权重为 0。" }],
    calculation_date: CALCULATION_DATE,
  },
];

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalize(value: number, input: ModelInputDefinition) {
  const { lower, upper, invert } = input.normalization;
  const linear = ((value - lower) / (upper - lower)) * 100;
  return clamp(invert ? 100 - linear : linear);
}

function eligibleObservation(observation: Observation | undefined) {
  const indicator = observation ? indicators.find((candidate) => candidate.id === observation.indicator) : undefined;
  const statusEligible = observation?.status === "official"
    || observation?.status === "verified"
    || (observation?.status === "calculated" && CALCULATED_MODEL_INPUTS.has(observation.indicator));
  return Boolean(
    observation
    && observation.value !== null
    && Number.isFinite(observation.value)
    && Number.isInteger(observation.year)
    && observation.unit
    && indicator?.status === "verified"
    && observation.unit === indicator.unit
    && statusEligible
    && (observation.source_reliability === "A" || observation.source_reliability === "B")
    && observation.source_name
    && observation.source_url
    && observation.updated_at,
  );
}

function latestCandidateYear(countrySlug: string, inputs: ModelInputDefinition[]) {
  const inputIds = new Set(inputs.map((input) => input.indicator_id));
  const candidateYears = observations
    .filter((observation) => observation.country_slug === countrySlug && inputIds.has(observation.indicator) && eligibleObservation(observation))
    .map((observation) => observation.year)
    .filter((year, index, years) => years.indexOf(year) === index)
    .sort((a, b) => b - a);

  return candidateYears.find((year) => {
    const availableWeight = inputs.reduce((total, input) => total + (inputTrace(countrySlug, year, input)?.weight ?? 0), 0);
    return availableWeight >= PARTIAL_SCORE_THRESHOLD;
  }) ?? candidateYears[0] ?? null;
}

function inputTrace(countrySlug: string, year: number, input: ModelInputDefinition): ModelInputTrace | null {
  const observation = observations.find(
    (candidate) => candidate.country_slug === countrySlug && candidate.indicator === input.indicator_id && candidate.year === year,
  );
  if (!eligibleObservation(observation) || observation?.value === null || observation?.value === undefined) return null;
  const normalizedScore = normalize(observation.value, input);
  return {
    indicator_id: input.indicator_id,
    indicator_name: indicators.find((indicator) => indicator.id === input.indicator_id)?.name_zh ?? input.label,
    observation_id: observation.id,
    year: observation.year,
    raw_value: observation.value,
    unit: observation.unit,
    normalized_score: Number(normalizedScore.toFixed(1)),
    weight: input.weight,
    weighted_contribution: Number((normalizedScore * input.weight).toFixed(1)),
    source_name: observation.source_name,
    source_url: observation.source_url,
    source_reliability: observation.source_reliability,
  };
}

function scoreForYear(countrySlug: string, card: ModelCard, year: number | null) {
  if (year === null) return null;
  const traces = card.inputs.map((input) => inputTrace(countrySlug, year, input)).filter((trace): trace is ModelInputTrace => trace !== null);
  const availableWeight = traces.reduce((total, trace) => total + trace.weight, 0);
  if (availableWeight < PARTIAL_SCORE_THRESHOLD) return null;
  return Number((traces.reduce((total, trace) => total + trace.weighted_contribution, 0) / availableWeight).toFixed(1));
}

function trend(current: number | null, previous: number | null): { direction: ModelTrend; change: number | null } {
  if (current === null || previous === null) return { direction: "not_available", change: null };
  const change = Number((current - previous).toFixed(1));
  if (change >= 2) return { direction: "rising", change };
  if (change <= -2) return { direction: "falling", change };
  return { direction: "stable", change };
}

function relatedEventIds(countrySlug: string, card: ModelCard) {
  const inputIds = new Set(card.inputs.map((input) => input.indicator_id));
  const modelLabelById: Record<ModelId, string> = {
    household_economic_pressure: "Household Economic Pressure",
    fiscal_pressure: "Fiscal Pressure",
    external_vulnerability: "External Vulnerability",
    industrial_dependency: "Industrial Dependency",
  };
  const modelLabel = modelLabelById[card.model_id];
  return events
    .filter((event) => event.country_slug === countrySlug && event.data_status === "verified" && (
      event.affected_model.includes(modelLabel) || event.affected_indicator.some((indicatorId) => inputIds.has(indicatorId))
    ))
    .map((event) => event.event_id);
}

function calculate(country: Country, card: ModelCard): ModelOutput {
  const year = latestCandidateYear(country.slug, card.inputs);
  const traces = year === null
    ? []
    : card.inputs.map((input) => inputTrace(country.slug, year, input)).filter((trace): trace is ModelInputTrace => trace !== null);
  const availableWeight = traces.reduce((total, trace) => total + trace.weight, 0);
  const completeness = Math.round(availableWeight * 100);
  const score = availableWeight >= PARTIAL_SCORE_THRESHOLD
    ? Number((traces.reduce((total, trace) => total + trace.weighted_contribution, 0) / availableWeight).toFixed(1))
    : null;
  const availability: ModelAvailability = availableWeight === 1 ? "sufficient" : availableWeight >= PARTIAL_SCORE_THRESHOLD ? "partial" : "insufficient";
  const previousScore = year === null ? null : scoreForYear(country.slug, card, year - 1);
  const scoreTrend = trend(score, previousScore);
  const drivers = [...traces]
    .sort((a, b) => b.weighted_contribution - a.weighted_contribution)
    .slice(0, 2)
    .map((trace) => `${trace.indicator_name}：贡献 ${trace.weighted_contribution.toFixed(1)} 分`);

  return {
    model_id: card.model_id,
    model_version: card.model_version,
    country: country.name_zh,
    country_slug: country.slug,
    score,
    direction: scoreTrend.direction,
    trend_change: scoreTrend.change,
    main_drivers: drivers,
    data_completeness: completeness,
    availability,
    confidence: availability === "sufficient" ? "medium" : availability === "partial" ? "low" : "not_available",
    calculation_date: CALCULATION_DATE,
    input_year: year,
    input_observation_ids: traces.map((trace) => trace.observation_id),
    missing_indicator_ids: card.inputs.filter((input) => !traces.some((trace) => trace.indicator_id === input.indicator_id)).map((input) => input.indicator_id),
    inputs: traces,
    related_event_ids: relatedEventIds(country.slug, card),
    interpretation_boundary: SCORE_BOUNDARY,
  };
}

export const modelOutputs: ModelOutput[] = countries.flatMap((country) => modelCards.map((card) => calculate(country, card)));

export function getModelCard(modelId: ModelId) {
  return modelCards.find((card) => card.model_id === modelId);
}

export function getModelOutputsForCountry(countrySlug: string) {
  return modelOutputs.filter((output) => output.country_slug === countrySlug);
}

export function getModelOutput(countrySlug: string, modelId: ModelId) {
  return modelOutputs.find((output) => output.country_slug === countrySlug && output.model_id === modelId);
}

export const modelAvailabilitySummary = modelCards.map((card) => ({
  model_id: card.model_id,
  sufficient: modelOutputs.filter((output) => output.model_id === card.model_id && output.availability === "sufficient").length,
  partial: modelOutputs.filter((output) => output.model_id === card.model_id && output.availability === "partial").length,
  insufficient: modelOutputs.filter((output) => output.model_id === card.model_id && output.availability === "insufficient").length,
}));
