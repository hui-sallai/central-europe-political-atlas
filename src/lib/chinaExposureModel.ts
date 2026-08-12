import tradeInputsJson from "../data/models/china-exposure-trade-inputs.json";
import countriesJson from "../data/countries/countries.json";
import eventsJson from "../data/events/events.json";
import observationsJson from "../data/observations/observations.json";
import projectsJson from "../data/projects/projects.json";
import { modelOutputs } from "./modelFramework";
import type { Country, DataEnvelope, Event, Observation, Project } from "../types/researchData";
import type {
  ChinaExposureDimension,
  ChinaExposureDimensionOutput,
  ChinaExposureModelCard,
  ChinaExposureOutput,
  ChinaExposureVariable,
} from "../types/ChinaExposure";

const MODEL_VERSION = "v0.80.0";
const CALCULATION_DATE = "2026-08-12";
const BOUNDARY = "该模型衡量可观测的经贸、项目与产业连接，不等于政治影响力、地缘政治风险、投资质量或政策优劣。";

const researchCountries = (countriesJson as DataEnvelope<Country>).records;
const researchEvents = (eventsJson as DataEnvelope<Event>).records;
const researchObservations = (observationsJson as DataEnvelope<Observation>).records;
const researchProjects = (projectsJson as DataEnvelope<Project>).records;

type TradeInput = (typeof tradeInputsJson.records)[number];

const tradeConfig = [
  { id: "china_export_share", label: "对华出口占比", weight: 0.35, lower: 0, upper: 10 },
  { id: "china_import_share", label: "自华进口占比", weight: 0.35, lower: 0, upper: 20 },
  { id: "china_trade_share", label: "对华货物贸易占比", weight: 0.3, lower: 0, upper: 15 },
] as const;

const industrialConfig = [
  { id: "manufacturing_share_gdp", label: "制造业占 GDP 比重", weight: 0.2, lower: 10, upper: 25 },
  { id: "automotive_export_share", label: "汽车出口占比", weight: 0.25, lower: 5, upper: 45 },
  { id: "germany_export_dependence", label: "对德国出口依赖", weight: 0.15, lower: 10, upper: 40 },
  { id: "industrial_electricity_price", label: "工业电价", weight: 0.1, lower: 0.1, upper: 0.4 },
  { id: "industrial_dependency_score", label: "既有产业依赖模型", weight: 0.15, lower: 0, upper: 100 },
  { id: "china_linked_industrial_project_presence", label: "可核验涉华产业项目存在", weight: 0.15, lower: 0, upper: 1 },
] as const;

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

function normalize(value: number, lower: number, upper: number) {
  return clamp(((value - lower) / (upper - lower)) * 100);
}

function latestEligibleObservation(countrySlug: string, indicatorId: string) {
  return researchObservations
    .filter((observation) => observation.country_slug === countrySlug
      && observation.indicator === indicatorId
      && observation.value !== null
      && (observation.status === "official" || observation.status === "verified" || observation.status === "calculated")
      && (observation.source_reliability === "A" || observation.source_reliability === "B")
      && observation.comparability_status !== "definition_mismatch"
      && observation.applicability_status !== "not_applicable")
    .sort((a, b) => b.year - a.year)[0];
}

function variable(base: Omit<ChinaExposureVariable, "normalized_score" | "weight">, normalizedScore: number | null, weight: number) {
  return { ...base, normalized_score: normalizedScore === null ? null : Number(normalizedScore.toFixed(1)), weight };
}

function tradeVariables(countrySlug: string, countryName: string): ChinaExposureVariable[] {
  const input = (tradeInputsJson.records as TradeInput[]).find((record) => record.country === countrySlug);
  const values = input?.values;
  const formulas = {
    china_export_share: [values?.exports_to_china, values?.exports_to_world, input?.source_urls.exports_to_china, input?.source_urls.exports_to_world, "exports_to_China / exports_to_world * 100"],
    china_import_share: [values?.imports_from_china, values?.imports_from_world, input?.source_urls.imports_from_china, input?.source_urls.imports_from_world, "imports_from_China / imports_from_world * 100"],
    china_trade_share: [
      values ? values.exports_to_china + values.imports_from_china : null,
      values ? values.exports_to_world + values.imports_from_world : null,
      input?.source_urls.exports_to_china,
      input?.source_urls.exports_to_world,
      "(exports_to_China + imports_from_China) / (exports_to_world + imports_from_world) * 100",
    ],
  } as const;

  return tradeConfig.map((config) => {
    const [numerator, denominator, numeratorUrl, denominatorUrl, formula] = formulas[config.id];
    const rawValue = typeof numerator === "number" && typeof denominator === "number" && denominator > 0
      ? Number(((numerator / denominator) * 100).toFixed(3))
      : null;
    return variable({
      variable_id: config.id,
      country: countryName,
      country_slug: countrySlug,
      dimension: "trade",
      raw_value: rawValue,
      unit: "% goods trade",
      year: input?.year ?? null,
      source: input?.source_name ?? "UN Comtrade",
      source_url: numeratorUrl ?? null,
      source_reliability: "A",
      calculation_method: formula,
      data_completeness: rawValue === null ? 0 : 100,
      model_eligible: rawValue !== null,
      limitation_note: "只覆盖货物贸易，不覆盖服务贸易；2024 年横截面不说明长期依赖趋势。",
      calculation_trace: {
        numerator: typeof numerator === "number" ? numerator : null,
        denominator: typeof denominator === "number" ? denominator : null,
        numerator_source_url: numeratorUrl ?? null,
        denominator_source_url: denominatorUrl ?? null,
        formula,
      },
      related_observation_ids: [],
      related_project_ids: [],
    }, rawValue === null ? null : normalize(rawValue, config.lower, config.upper), config.weight);
  });
}

function eligibleProjects(countrySlug: string) {
  return researchProjects.filter((project) => project.country_slug === countrySlug
    && project.verified
    && project.verification_status === "可量化"
    && project.quantification_status === "可量化"
    && (project.source_reliability === "A" || project.source_reliability === "B"));
}

function projectVariables(countrySlug: string, countryName: string): ChinaExposureVariable[] {
  const allProjects = researchProjects.filter((project) => project.country_slug === countrySlug);
  const projects = eligibleProjects(countrySlug);
  const sourceReliability = projects.some((project) => project.source_reliability === "A") ? "A" : projects.length ? "B" : "D";
  const projectIds = projects.map((project) => project.id);
  const active = projects.filter((project) => /运营|在建|建设|股权|启动/.test(project.status));
  const sectorCounts = new Map<string, number>();
  projects.forEach((project) => sectorCounts.set(project.sector, (sectorCounts.get(project.sector) ?? 0) + 1));
  const sectorConcentration = projects.length >= 2 ? Math.max(...sectorCounts.values()) / projects.length * 100 : null;
  const activeShare = projects.length >= 2 ? active.length / projects.length * 100 : null;
  const countValue = allProjects.length ? projects.length : null;
  const common = {
    country: countryName,
    country_slug: countrySlug,
    dimension: "project" as const,
    year: null,
    source: projects.length ? "China Project Database" : "待接入",
    source_url: projects[0]?.source_url ?? null,
    source_reliability: sourceReliability as "A" | "B" | "D",
    related_observation_ids: [] as string[],
    related_project_ids: projectIds,
  };

  return [
    variable({ ...common, variable_id: "eligible_project_count", raw_value: countValue, unit: "projects", calculation_method: "count verified, quantifiable A/B-source projects", data_completeness: projects.length >= 2 ? 100 : projects.length ? 50 : 0, model_eligible: projects.length >= 2, limitation_note: allProjects.length ? "只接纳已核验、可量化且为 A/B 级来源的项目；项目库不是企业总体普查，少于两项时不形成可比项目分数。" : "该国项目记录尚未系统接入；空值不表示不存在项目。", calculation_trace: null }, countValue === null ? null : normalize(countValue, 0, 4), 0.45),
    variable({ ...common, variable_id: "active_project_share", raw_value: activeShare, unit: "% eligible projects", calculation_method: "active eligible projects / eligible projects * 100", data_completeness: activeShare === null ? 0 : 100, model_eligible: activeShare !== null, limitation_note: "项目状态来自核验记录，不能替代官方投资存量。", calculation_trace: activeShare === null ? null : { numerator: active.length, denominator: projects.length, numerator_source_url: projects[0]?.source_url ?? null, denominator_source_url: projects[0]?.source_url ?? null, formula: "active_eligible_projects / eligible_projects * 100" } }, activeShare, 0.3),
    variable({ ...common, variable_id: "project_sector_concentration", raw_value: sectorConcentration, unit: "% eligible projects", calculation_method: "largest eligible project sector count / eligible projects * 100", data_completeness: sectorConcentration === null ? 0 : 100, model_eligible: sectorConcentration !== null, limitation_note: "小样本集中度容易受单个项目影响，只作为项目维度内部描述。", calculation_trace: sectorConcentration === null ? null : { numerator: Math.max(...sectorCounts.values()), denominator: projects.length, numerator_source_url: projects[0]?.source_url ?? null, denominator_source_url: projects[0]?.source_url ?? null, formula: "largest_sector_count / eligible_projects * 100" } }, sectorConcentration, 0.25),
  ];
}

function investmentVariables(countrySlug: string, countryName: string): ChinaExposureVariable[] {
  const projects = eligibleProjects(countrySlug).filter((project) => project.investment !== null);
  return [variable({
    variable_id: "china_origin_fdi_stock_or_flow",
    country: countryName,
    country_slug: countrySlug,
    dimension: "investment",
    raw_value: null,
    unit: "million EUR",
    year: null,
    source: "待接入统一 China-origin FDI source",
    source_url: null,
    source_reliability: "D",
    calculation_method: "not calculated",
    data_completeness: 0,
    model_eligible: false,
    limitation_note: `普通 FDI 流量不等于中国来源 FDI；${projects.length} 项项目金额记录因币种、状态与概念不同，仅保留在项目库，不合并。`,
    calculation_trace: null,
    related_observation_ids: [],
    related_project_ids: projects.map((project) => project.id),
  }, null, 1)];
}

function industrialVariables(countrySlug: string, countryName: string): ChinaExposureVariable[] {
  const industrialProjects = eligibleProjects(countrySlug).filter((project) => /制造|汽车|电池|工业/.test(project.sector));
  const existingOutput = modelOutputs.find((output) => output.country_slug === countrySlug && output.model_id === "industrial_dependency");

  return industrialConfig.map((config) => {
    if (config.id === "china_linked_industrial_project_presence") {
      const rawValue = industrialProjects.length ? 1 : null;
      return variable({
        variable_id: config.id, country: countryName, country_slug: countrySlug, dimension: "industrial", raw_value: rawValue, unit: "binary verified presence", year: null,
        source: industrialProjects.length ? "China Project Database" : "待接入", source_url: industrialProjects[0]?.source_url ?? null,
        source_reliability: industrialProjects[0]?.source_reliability ?? "D", calculation_method: "1 only when an A/B-source industrial project exists; missing coverage remains null",
        data_completeness: rawValue === null ? 0 : 100, model_eligible: rawValue !== null, limitation_note: "存在变量不表示投资规模、产能或供应链控制程度。", calculation_trace: null,
        related_observation_ids: [], related_project_ids: industrialProjects.map((project) => project.id),
      }, rawValue === null ? null : 100, config.weight);
    }
    if (config.id === "industrial_dependency_score") {
      const rawValue = existingOutput?.score ?? null;
      return variable({
        variable_id: config.id, country: countryName, country_slug: countrySlug, dimension: "industrial", raw_value: rawValue, unit: "0-100 comparative score", year: existingOutput?.input_year ?? null,
        source: "Transparent Models / Industrial Dependency", source_url: null, source_reliability: "A", calculation_method: "reuse published v0.70 transparent output without changing its formula",
        data_completeness: existingOutput?.data_completeness ?? 0, model_eligible: rawValue !== null, limitation_note: "该输入描述一般产业结构，只在存在可核验涉华产业项目时用于对华产业维度。", calculation_trace: null,
        related_observation_ids: existingOutput?.input_observation_ids ?? [], related_project_ids: industrialProjects.map((project) => project.id),
      }, rawValue, config.weight);
    }
    const observation = latestEligibleObservation(countrySlug, config.id);
    const rawValue = observation?.value ?? null;
    return variable({
      variable_id: config.id, country: countryName, country_slug: countrySlug, dimension: "industrial", raw_value: rawValue, unit: observation?.unit ?? "pending", year: observation?.year ?? null,
      source: observation?.source_name ?? "待接入", source_url: observation?.source_url ?? null, source_reliability: observation?.source_reliability ?? "D",
      calculation_method: observation?.calculation_formula ?? "official observation", data_completeness: rawValue === null ? 0 : 100,
      model_eligible: rawValue !== null, limitation_note: "一般产业结构变量不单独证明对华暴露，必须与可核验涉华产业项目共同解释。",
      calculation_trace: observation?.numerator != null || observation?.denominator != null ? { numerator: observation.numerator ?? null, denominator: observation.denominator ?? null, numerator_source_url: observation.numerator_source_url ?? null, denominator_source_url: observation.denominator_source_url ?? null, formula: observation.calculation_formula ?? "official observation" } : null,
      related_observation_ids: observation ? [observation.id] : [], related_project_ids: industrialProjects.map((project) => project.id),
    }, rawValue === null ? null : normalize(rawValue, config.lower, config.upper), config.weight);
  });
}

function dimensionOutput(dimension: ChinaExposureDimension, variables: ChinaExposureVariable[]): ChinaExposureDimensionOutput {
  const labels: Record<ChinaExposureDimension, string> = { project: "项目暴露", trade: "贸易暴露", investment: "投资暴露", industrial: "产业暴露" };
  const eligible = variables.filter((item) => item.model_eligible && item.normalized_score !== null);
  const eligibleWeight = eligible.reduce((sum, item) => sum + item.weight, 0);
  const completeness = Math.round(variables.reduce((sum, item) => sum + item.data_completeness, 0) / variables.length);
  let availability: ChinaExposureDimensionOutput["availability"] = "insufficient";
  if (dimension === "trade" && eligible.length === variables.length) availability = "sufficient";
  if (dimension === "project" && eligible.length === variables.length) availability = "partial";
  if (dimension === "industrial" && eligible.some((item) => item.variable_id === "china_linked_industrial_project_presence") && eligible.length >= 4) availability = "partial";
  const score = availability === "insufficient" || eligibleWeight === 0 ? null : Number((eligible.reduce((sum, item) => sum + (item.normalized_score ?? 0) * item.weight, 0) / eligibleWeight).toFixed(1));
  const mainDrivers = [...eligible].sort((a, b) => ((b.normalized_score ?? 0) * b.weight) - ((a.normalized_score ?? 0) * a.weight)).slice(0, 2).map((item) => `${item.variable_id}: ${item.raw_value} ${item.unit}`);
  return {
    dimension, name_zh: labels[dimension], score, availability,
    confidence: availability === "sufficient" ? "medium" : availability === "partial" ? "low" : "not_available",
    data_completeness: completeness, main_drivers: mainDrivers,
    missing_variables: variables.filter((item) => !item.model_eligible).map((item) => item.variable_id), variables,
    limitation_note: dimension === "trade" ? "货物贸易维度可比较，但不覆盖服务贸易。" : dimension === "investment" ? "缺少统一中国来源 FDI 存量或流量，当前不输出分数。" : "项目库尚非完整普查，因此只允许部分结果，不进入国家总分。",
  };
}

function relatedEventIds(countrySlug: string) {
  const projectIds = new Set(researchProjects.filter((project) => project.country_slug === countrySlug).map((project) => project.id));
  return researchEvents.filter((event) => event.country_slug === countrySlug && (event.event_type === "China" || event.related_project_ids.some((id) => projectIds.has(id)))).map((event) => event.event_id);
}

export const chinaExposureModelCard: ChinaExposureModelCard = {
  model_id: "china_economic_exposure", model_version: MODEL_VERSION,
  name: "China Economic Exposure Model", name_zh: "中国经济暴露模型",
  purpose: "分维度衡量十国与中国之间可观测的项目、货物贸易、投资和产业连接。",
  dimensions: [
    { id: "project", name_zh: "项目暴露", variables: [{ variable_id: "eligible_project_count", weight: 0.45, normalization: { method: "linear_clamp", lower: 0, upper: 4 }, use: "score" }, { variable_id: "active_project_share", weight: 0.3, normalization: { method: "linear_clamp", lower: 0, upper: 100 }, use: "score" }, { variable_id: "project_sector_concentration", weight: 0.25, normalization: { method: "linear_clamp", lower: 0, upper: 100 }, use: "score" }] },
    { id: "trade", name_zh: "贸易暴露", variables: tradeConfig.map((item) => ({ variable_id: item.id, weight: item.weight, normalization: { method: "linear_clamp" as const, lower: item.lower, upper: item.upper }, use: "score" as const })) },
    { id: "investment", name_zh: "投资暴露", variables: [{ variable_id: "china_origin_fdi_stock_or_flow", weight: 1, normalization: null, use: "context" }] },
    { id: "industrial", name_zh: "产业暴露", variables: industrialConfig.map((item) => ({ variable_id: item.id, weight: item.weight, normalization: { method: "linear_clamp" as const, lower: item.lower, upper: item.upper }, use: "score" as const })) },
  ],
  overall_rule: "只有至少三个核心维度达到 sufficient 且可比时才计算总分；partial 维度不能凑足门槛。当前十国均不满足，因此总分 unavailable。",
  event_policy: "事件只解释项目和政策背景，不直接改变维度或总分。",
  limitations: [BOUNDARY, "项目库只覆盖已核验样本，不代表中国企业活动总体。", "投资维度缺少统一中国来源 FDI，普通 FDI 不作替代。", "贸易维度只使用 2024 年货物贸易。"],
  calculation_date: CALCULATION_DATE,
};

export const chinaExposureOutputs: ChinaExposureOutput[] = researchCountries.map((country) => {
  const dimensions = [
    dimensionOutput("project", projectVariables(country.slug, country.name_zh)),
    dimensionOutput("trade", tradeVariables(country.slug, country.name_zh)),
    dimensionOutput("investment", investmentVariables(country.slug, country.name_zh)),
    dimensionOutput("industrial", industrialVariables(country.slug, country.name_zh)),
  ];
  const sufficient = dimensions.filter((item) => item.availability === "sufficient");
  const overallAvailable = sufficient.length >= 3;
  return {
    model_id: "china_economic_exposure", model_version: MODEL_VERSION, country: country.name_zh, country_slug: country.slug,
    dimensions, overall_score: overallAvailable ? Number((sufficient.reduce((sum, item) => sum + (item.score ?? 0), 0) / sufficient.length).toFixed(1)) : null,
    overall_availability: overallAvailable ? "sufficient" : "insufficient", overall_decision: overallAvailable ? "available" : "unavailable",
    sufficient_dimension_count: sufficient.length, calculation_date: CALCULATION_DATE, related_event_ids: relatedEventIds(country.slug),
    related_project_ids: researchProjects.filter((project) => project.country_slug === country.slug).map((project) => project.id), interpretation_boundary: BOUNDARY,
  };
});

export const chinaExposureVariables = chinaExposureOutputs.flatMap((output) => output.dimensions.flatMap((dimension) => dimension.variables));

export function getChinaExposureOutput(countrySlug: string) {
  return chinaExposureOutputs.find((output) => output.country_slug === countrySlug);
}
