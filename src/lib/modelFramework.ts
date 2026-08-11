import countriesJson from "../data/countries/countries.json";
import eventsJson from "../data/events/events.json";
import indicatorsJson from "../data/indicators/indicators.json";
import observationsJson from "../data/observations/observations.json";
import type { Country, DataEnvelope, Event, Indicator, Observation } from "../types/researchData";
import type {
  ModelCard,
  ModelId,
  ModelInputDefinition,
  ModelInputTrace,
  ModelOutput,
  ModelTrend,
} from "../types/ModelOutput";

const CALCULATION_DATE = "2026-08-11";
const SCORE_BOUNDARY = "分数是基于公开输入和固定规则的比较工具，不是客观风险真值、预测或政策评价。";

function records<T>(value: unknown) {
  return (value as DataEnvelope<T>).records;
}

const countries = records<Country>(countriesJson);
const indicators = records<Indicator>(indicatorsJson);
const observations = records<Observation>(observationsJson);
const events = records<Event>(eventsJson);

export const modelCards: ModelCard[] = [
  {
    model_id: "household_economic_pressure",
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
    completeness_rule: "两个启用输入均存在正式或已核验观测值时输出分数；否则不输出精确分数。",
    limitations: [
      "尚未纳入实际工资、住房成本、居民能源账单和收入分布。",
      "固定标准化边界是公开的分析设定，不是自然阈值。",
      "不用于预测家庭行为、选举结果或个体生活状况。",
    ],
    event_policy: "事件只用于解释近期方向，不进入 v0.50 基础分数。",
    calculation_date: CALCULATION_DATE,
  },
  {
    model_id: "fiscal_pressure",
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
    completeness_rule: "两个启用输入均存在正式或已核验观测值时输出分数；否则不输出精确分数。",
    limitations: [
      "尚未纳入利息支出、债券收益率、债务期限结构和欧盟资金实际支付。",
      "不衡量政府偿债违约概率，也不构成主权信用评级。",
      "当前只有 V4 四国具备完整的启用输入。",
    ],
    event_policy: "财政和欧盟资金事件作为解释记录展示，不改变 v0.50 基础分数。",
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
  return Boolean(
    observation
    && observation.value !== null
    && (observation.status === "official" || observation.status === "verified")
    && (observation.source_reliability === "A" || observation.source_reliability === "B")
    && observation.source_url,
  );
}

function latestCommonYear(countrySlug: string, inputs: ModelInputDefinition[]) {
  const yearSets = inputs.map((input) => new Set(
    observations
      .filter((observation) => observation.country_slug === countrySlug && observation.indicator === input.indicator_id && eligibleObservation(observation))
      .map((observation) => observation.year),
  ));
  const commonYears = [...(yearSets[0] ?? new Set<number>())].filter((year) => yearSets.every((set) => set.has(year)));
  return commonYears.sort((a, b) => b - a)[0] ?? null;
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
  if (traces.length !== card.inputs.length) return null;
  return Number(traces.reduce((total, trace) => total + trace.weighted_contribution, 0).toFixed(1));
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
  const modelLabel = card.model_id === "fiscal_pressure" ? "Fiscal Pressure" : "Household Economic Pressure";
  return events
    .filter((event) => event.country_slug === countrySlug && event.data_status === "verified" && (
      event.affected_model.includes(modelLabel) || event.affected_indicator.some((indicatorId) => inputIds.has(indicatorId))
    ))
    .map((event) => event.event_id);
}

function calculate(country: Country, card: ModelCard): ModelOutput {
  const year = latestCommonYear(country.slug, card.inputs);
  const traces = year === null
    ? []
    : card.inputs.map((input) => inputTrace(country.slug, year, input)).filter((trace): trace is ModelInputTrace => trace !== null);
  const completeness = Math.round((traces.length / card.inputs.length) * 100);
  const score = traces.length === card.inputs.length ? Number(traces.reduce((total, trace) => total + trace.weighted_contribution, 0).toFixed(1)) : null;
  const previousScore = year === null ? null : scoreForYear(country.slug, card, year - 1);
  const scoreTrend = trend(score, previousScore);
  const drivers = [...traces]
    .sort((a, b) => b.weighted_contribution - a.weighted_contribution)
    .slice(0, 2)
    .map((trace) => `${trace.indicator_name}：贡献 ${trace.weighted_contribution.toFixed(1)} 分`);

  return {
    model_id: card.model_id,
    country: country.name_zh,
    country_slug: country.slug,
    score,
    direction: scoreTrend.direction,
    trend_change: scoreTrend.change,
    main_drivers: drivers,
    data_completeness: completeness,
    availability: score === null ? "insufficient" : "sufficient",
    confidence: score === null ? "not_available" : "medium",
    calculation_date: CALCULATION_DATE,
    input_year: year,
    input_observation_ids: traces.map((trace) => trace.observation_id),
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
