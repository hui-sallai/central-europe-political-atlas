import tradeInputsJson from "../data/models/china-exposure-trade-inputs.json";
import fdiInputsJson from "../data/models/china-exposure-fdi-inputs.json";
import countriesJson from "../data/countries/countries.json";
import eventsJson from "../data/events/events.json";
import observationsJson from "../data/observations/observations.json";
import { chinaProjectRecords, type ChinaProjectRecord } from "./extendedData";
import { verifyChinaProject } from "./chinaProjectVerification";
import { modelOutputs } from "./modelFramework";
import type { Country, DataEnvelope, Event, Observation } from "../types/researchData";
import type {
  ChinaExposureCoverageAuditRecord,
  ChinaExposureCoverageStatus,
  ChinaEvidenceCoverageMatrixRecord,
  ChinaExposureDimension,
  ChinaExposureDimensionOutput,
  ChinaExposureModelCard,
  ChinaExposureOutput,
  ChinaTradeQaRecord,
  ChinaTradeHistoricalRecord,
  ChinaSectorLinkageRecord,
  ProjectDatabaseCoverage,
  ChinaExposureVariable,
} from "../types/ChinaExposure";

const MODEL_VERSION = "v0.82.0";
const CALCULATION_DATE = "2026-08-12";
const BOUNDARY = "该模型衡量可观测的经贸、项目与产业连接，不等于政治影响力、地缘政治风险、投资质量或政策优劣。";

const researchCountries = (countriesJson as DataEnvelope<Country>).records;
const researchEvents = (eventsJson as DataEnvelope<Event>).records;
const researchObservations = (observationsJson as DataEnvelope<Observation>).records;
const researchProjects = chinaProjectRecords;

type TradeInput = (typeof tradeInputsJson.records)[number];
type FdiInput = (typeof fdiInputsJson.records)[number];

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
  const input = (tradeInputsJson.records as TradeInput[])
    .filter((record) => record.country === countrySlug)
    .sort((a, b) => b.year - a.year)[0];
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
      limitation_note: "只覆盖货物贸易，不覆盖服务贸易；当前分数仍使用 2024 年，2021–2024 历史序列只用于趋势与稳定性说明。",
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
  return researchProjects.filter((project) => project.countrySlug === countrySlug
    && !["cancelled", "suspended", "completed", "transferred"].includes(project.projectStatusCode)
    && verifyChinaProject(project).conclusion === "quantifiable"
    && (project.sourceReliabilityLevel === "A" || project.sourceReliabilityLevel === "B"));
}

function projectVariables(countrySlug: string, countryName: string): ChinaExposureVariable[] {
  const allProjects = researchProjects.filter((project) => project.countrySlug === countrySlug);
  const projects = eligibleProjects(countrySlug);
  const sourceReliability = projects.some((project) => project.sourceReliabilityLevel === "A") ? "A" : projects.length ? "B" : "D";
  const projectIds = projects.map((project) => project.projectId);
  const active = projects.filter((project) => ["committed", "under_construction", "operational"].includes(project.projectStatusCode));
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
    source_url: projects[0]?.sourceUrl ?? null,
    source_reliability: sourceReliability as "A" | "B" | "D",
    related_observation_ids: [] as string[],
    related_project_ids: projectIds,
  };

  return [
    variable({ ...common, variable_id: "eligible_project_count", raw_value: countValue, unit: "projects", calculation_method: "count verified, quantifiable A/B-source projects", data_completeness: projects.length >= 2 ? 100 : projects.length ? 50 : 0, model_eligible: projects.length >= 2, limitation_note: allProjects.length ? "只接纳已核验、可量化且为 A/B 级来源的项目；项目库不是企业总体普查，少于两项时不形成可比项目分数。" : "该国项目记录尚未系统接入；空值不表示不存在项目。", calculation_trace: null }, countValue === null ? null : normalize(countValue, 0, 4), 0.45),
    variable({ ...common, variable_id: "active_project_share", raw_value: activeShare, unit: "% eligible projects", calculation_method: "active eligible projects / eligible projects * 100", data_completeness: activeShare === null ? 0 : 100, model_eligible: activeShare !== null, limitation_note: "项目状态来自核验记录，不能替代官方投资存量。", calculation_trace: activeShare === null ? null : { numerator: active.length, denominator: projects.length, numerator_source_url: projects[0]?.sourceUrl ?? null, denominator_source_url: projects[0]?.sourceUrl ?? null, formula: "active_eligible_projects / eligible_projects * 100" } }, activeShare, 0.3),
    variable({ ...common, variable_id: "project_sector_concentration", raw_value: sectorConcentration, unit: "% eligible projects", calculation_method: "largest eligible project sector count / eligible projects * 100", data_completeness: sectorConcentration === null ? 0 : 100, model_eligible: sectorConcentration !== null, limitation_note: "小样本集中度容易受单个项目影响，只作为项目维度内部描述。", calculation_trace: sectorConcentration === null ? null : { numerator: Math.max(...sectorCounts.values()), denominator: projects.length, numerator_source_url: projects[0]?.sourceUrl ?? null, denominator_source_url: projects[0]?.sourceUrl ?? null, formula: "largest_sector_count / eligible_projects * 100" } }, sectorConcentration, 0.25),
  ];
}

function investmentVariables(countrySlug: string, countryName: string): ChinaExposureVariable[] {
  const projects = eligibleProjects(countrySlug).filter((project) => project.amount !== null);
  const input = (fdiInputsJson.records as FdiInput[]).find((record) => record.country === countrySlug);
  const rawValue = input?.china_fdi_stock_share ?? null;
  const candidateSourceName = input && "candidate_source_name" in input ? input.candidate_source_name : null;
  const candidateSourceUrl = input && "candidate_source_url" in input ? input.candidate_source_url : null;
  const denominatorDefinition = input && "denominator_definition" in input ? input.denominator_definition : null;
  return [variable({
    variable_id: "china_fdi_stock_share",
    country: countryName,
    country_slug: countrySlug,
    dimension: "investment",
    raw_value: rawValue,
    unit: "% total inward FDI stock",
    year: input?.year ?? null,
    source: rawValue !== null ? fdiInputsJson.source_name : candidateSourceName ?? fdiInputsJson.source_name,
    source_url: rawValue !== null ? fdiInputsJson.source_url : candidateSourceUrl ?? fdiInputsJson.source_url,
    source_reliability: "A",
    calculation_method: rawValue !== null ? "China inward FDI position / World inward FDI position * 100; immediate counterpart; OECD BMD4" : denominatorDefinition ?? "Official candidate source pending comparable numerator and denominator",
    data_completeness: rawValue === null ? 0 : 100,
    model_eligible: false,
    limitation_note: `已保留同口径官方存量证据，但十国仅五国完整，投资维度继续 unavailable。普通 FDI、项目金额、合同额和承诺额不作替代也不相加；${projects.length} 项项目金额仅保留在项目库。`,
    calculation_trace: rawValue === null ? null : {
      numerator: input?.china_inward_fdi_stock_usd_million ?? null,
      denominator: input?.total_inward_fdi_stock_usd_million ?? null,
      numerator_source_url: fdiInputsJson.source_url,
      denominator_source_url: fdiInputsJson.source_url,
      formula: "china_inward_fdi_stock_usd_million / total_inward_fdi_stock_usd_million * 100",
    },
    related_observation_ids: [],
    related_project_ids: projects.map((project) => project.projectId),
    definition_comparable: input?.definition_comparable ?? false,
    source_method: rawValue !== null ? fdiInputsJson.source_method : denominatorDefinition ?? fdiInputsJson.source_method,
    source_tier: fdiSourceTier(countrySlug),
    comparison_status: input?.definition_comparable ? "comparable" : candidateSourceUrl ? "partial" : "unavailable",
    denominator_definition: denominatorDefinition,
    coverage_note: input?.coverage_note ?? "未形成同口径 OECD 记录。",
    qa_status: rawValue === null ? "unavailable" : "partial",
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
        source: industrialProjects.length ? "China Project Database" : "待接入", source_url: industrialProjects[0]?.sourceUrl ?? null,
        source_reliability: industrialProjects[0]?.sourceReliabilityLevel ?? "D", calculation_method: "1 only when an A/B-source industrial project exists; missing coverage remains null",
        data_completeness: rawValue === null ? 0 : 100, model_eligible: rawValue !== null, limitation_note: "存在变量不表示投资规模、产能或供应链控制程度。", calculation_trace: null,
        related_observation_ids: [], related_project_ids: industrialProjects.map((project) => project.projectId),
      }, rawValue === null ? null : 100, config.weight);
    }
    if (config.id === "industrial_dependency_score") {
      const rawValue = existingOutput?.score ?? null;
      return variable({
        variable_id: config.id, country: countryName, country_slug: countrySlug, dimension: "industrial", raw_value: rawValue, unit: "0-100 comparative score", year: existingOutput?.input_year ?? null,
        source: "Transparent Models / Industrial Dependency", source_url: null, source_reliability: "A", calculation_method: "reuse published v0.70 transparent output without changing its formula",
        data_completeness: existingOutput?.data_completeness ?? 0, model_eligible: rawValue !== null, limitation_note: "该输入描述一般产业结构，只在存在可核验涉华产业项目时用于对华产业维度。", calculation_trace: null,
        related_observation_ids: existingOutput?.input_observation_ids ?? [], related_project_ids: industrialProjects.map((project) => project.projectId),
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
      related_observation_ids: observation ? [observation.id] : [], related_project_ids: industrialProjects.map((project) => project.projectId),
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

function projectDatabaseCoverage(countrySlug: string): ProjectDatabaseCoverage {
  const records = researchProjects.filter((project) => project.countrySlug === countrySlug);
  const reliable = records.filter((project) => project.sourceReliabilityLevel === "A" || project.sourceReliabilityLevel === "B");
  const eligible = eligibleProjects(countrySlug);
  if (records.length >= 3 && reliable.length >= 2 && eligible.length >= 2) return "representative";
  if (records.length >= 2 && reliable.length >= 1) return "partial";
  if (records.length >= 1) return "sparse";
  return "insufficient";
}

function latestTradeYear(countrySlug: string) {
  return (tradeInputsJson.records as TradeInput[])
    .filter((record) => record.country === countrySlug && record.data_status === "official_complete")
    .sort((a, b) => b.year - a.year)[0]?.year ?? null;
}

function fdiSourceTier(countrySlug: string): 1 | 2 | 3 | null {
  const input = (fdiInputsJson.records as FdiInput[]).find((record) => record.country === countrySlug);
  return (input?.source_tier as 1 | 2 | 3 | null | undefined) ?? null;
}

function relatedEventIds(countrySlug: string) {
  const projectIds = new Set(researchProjects.filter((project) => project.countrySlug === countrySlug).map((project) => project.projectId));
  return researchEvents.filter((event) => event.country_slug === countrySlug && (event.event_type === "China" || event.related_project_ids.some((id) => projectIds.has(id)))).map((event) => event.event_id);
}

export const chinaExposureModelCard: ChinaExposureModelCard = {
  model_id: "china_economic_exposure", model_version: MODEL_VERSION,
  name: "China Economic Exposure Model", name_zh: "中国经济暴露模型",
  purpose: "分维度衡量十国与中国之间可观测的项目、货物贸易、投资和产业连接。",
  dimensions: [
    { id: "project", name_zh: "项目暴露", variables: [{ variable_id: "eligible_project_count", weight: 0.45, normalization: { method: "linear_clamp", lower: 0, upper: 4 }, use: "score" }, { variable_id: "active_project_share", weight: 0.3, normalization: { method: "linear_clamp", lower: 0, upper: 100 }, use: "score" }, { variable_id: "project_sector_concentration", weight: 0.25, normalization: { method: "linear_clamp", lower: 0, upper: 100 }, use: "score" }] },
    { id: "trade", name_zh: "贸易暴露", variables: tradeConfig.map((item) => ({ variable_id: item.id, weight: item.weight, normalization: { method: "linear_clamp" as const, lower: item.lower, upper: item.upper }, use: "score" as const })) },
    { id: "investment", name_zh: "投资暴露", variables: [{ variable_id: "china_fdi_stock_share", weight: 1, normalization: null, use: "context" }] },
    { id: "industrial", name_zh: "产业暴露", variables: industrialConfig.map((item) => ({ variable_id: item.id, weight: item.weight, normalization: { method: "linear_clamp" as const, lower: item.lower, upper: item.upper }, use: "score" as const })) },
  ],
  overall_rule: "只有至少三个核心维度达到 sufficient 且可比时才计算总分；partial 维度不能凑足门槛。当前十国均不满足，因此总分 unavailable。",
  event_policy: "事件只解释项目和政策背景，不直接改变维度或总分。",
  limitations: [BOUNDARY, "项目库是代表性核验库，不是中国企业活动总体普查。", "项目事实可同时支撑项目与产业解释，但同一金额不得在总分中重复加权。", "OECD 同口径 China-origin FDI 存量仅覆盖五国，Tier 2/3 候选来源在定义不同或缺少分母时不进入排名。", "贸易分数仍使用 2024 年货物贸易；2021–2024 序列只作趋势背景。"],
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
    related_project_ids: researchProjects.filter((project) => project.countrySlug === country.slug).map((project) => project.projectId), interpretation_boundary: BOUNDARY,
    project_database_coverage: projectDatabaseCoverage(country.slug),
    china_fdi_availability: dimensions.find((dimension) => dimension.dimension === "investment")?.variables.some((item) => item.raw_value !== null) ? "partial" : "unavailable",
    trade_latest_year: latestTradeYear(country.slug),
    evidence_confidence_factors: {
      dimension_completeness: Math.round(dimensions.reduce((sum, dimension) => sum + dimension.data_completeness, 0) / dimensions.length),
      source_reliability: dimensions.flatMap((dimension) => dimension.variables).every((item) => item.raw_value === null || item.source_reliability === "A" || item.source_reliability === "B") ? "A/B evidence where available" : "mixed evidence",
      year_alignment: latestTradeYear(country.slug) === 2024 ? "trade aligned to 2024; other dimensions may differ" : "review required",
      project_database_coverage: projectDatabaseCoverage(country.slug),
      definition_comparability: dimensions.find((dimension) => dimension.dimension === "investment")?.variables.some((item) => item.definition_comparable) ? "partial ten-country comparability" : "not comparable",
    },
    priority_gaps: dimensions.flatMap((dimension) => dimension.missing_variables.map((variableId) => `${dimension.dimension}:${variableId}`)).slice(0, 5),
  };
});

export const chinaExposureVariables = chinaExposureOutputs.flatMap((output) => output.dimensions.flatMap((dimension) => dimension.variables));

export const chinaTradeHistoricalSeries: ChinaTradeHistoricalRecord[] = (tradeInputsJson.records as TradeInput[]).map((input) => {
  const values = input.values;
  const exportShare = values.exports_to_world > 0 ? values.exports_to_china / values.exports_to_world * 100 : null;
  const importShare = values.imports_from_world > 0 ? values.imports_from_china / values.imports_from_world * 100 : null;
  const tradeDenominator = values.exports_to_world + values.imports_from_world;
  const tradeShare = tradeDenominator > 0 ? (values.exports_to_china + values.imports_from_china) / tradeDenominator * 100 : null;
  const complete = exportShare !== null && importShare !== null && tradeShare !== null;
  return {
    country: input.country_name,
    country_slug: input.country,
    year: input.year,
    china_export_share: exportShare === null ? null : Number(exportShare.toFixed(3)),
    china_import_share: importShare === null ? null : Number(importShare.toFixed(3)),
    china_trade_share: tradeShare === null ? null : Number(tradeShare.toFixed(3)),
    source: input.source_name,
    source_url: input.source_urls.exports_to_china,
    source_reliability: "A",
    qa_status: complete ? "passed" : "review_required",
    use: "trend_context_only",
  };
});

export const chinaExposureCoverageAudit: ChinaExposureCoverageAuditRecord[] = chinaExposureOutputs.flatMap((output) =>
  output.dimensions.map((dimension) => {
    const available = dimension.variables.filter((item) => item.raw_value !== null);
    const investmentCandidateAvailable = dimension.dimension === "investment"
      && dimension.variables.some((item) => Boolean(item.source_url) && item.source_tier !== null && item.source_tier !== undefined);
    const coverageStatus = dimension.dimension === "investment"
      ? (available.length || investmentCandidateAvailable ? "partial" : "unavailable")
      : dimension.availability;
    const evidencedVariables = dimension.variables.filter((item) => item.raw_value !== null || (investmentCandidateAvailable && Boolean(item.source_url)));
    const reliability = [...new Set(evidencedVariables.map((item) => item.source_reliability))];
    return {
      country: output.country,
      country_slug: output.country_slug,
      dimension: dimension.dimension,
      status: coverageStatus,
      data_completeness: dimension.data_completeness,
      available_variables: available.map((item) => item.variable_id),
      missing_variables: dimension.missing_variables,
      related_project_ids: [...new Set(dimension.variables.flatMap((item) => item.related_project_ids))],
      source_urls: [...new Set(dimension.variables.map((item) => item.source_url).filter((url): url is string => Boolean(url)))],
      source_reliability: reliability,
      definition_comparable: dimension.dimension !== "investment" || available.every((item) => item.definition_comparable === true),
      source_trace_available: evidencedVariables.length > 0 && evidencedVariables.every((item) => Boolean(item.source_url)),
      project_database_coverage: dimension.dimension === "project" ? output.project_database_coverage : null,
      qa_status: coverageStatus === "sufficient" ? "passed" : coverageStatus === "unavailable" ? "unavailable" : "partial",
      coverage_note: dimension.dimension === "investment"
        ? (available[0]?.coverage_note ?? "缺少同口径 China-origin FDI position。")
        : dimension.limitation_note,
    };
  }),
);

const expectedReporterCodes: Record<string, number> = {
  poland: 616, hungary: 348, czechia: 203, slovakia: 703, germany: 276,
  austria: 40, romania: 642, slovenia: 705, croatia: 191, serbia: 688,
};

export const chinaTradeQa: ChinaTradeQaRecord[] = researchCountries.flatMap((country) => [2021, 2022, 2023, 2024].map((year) => {
  const matching = (tradeInputsJson.records as TradeInput[]).filter((record) => record.country === country.slug && record.year === year);
  const input = matching[0];
  const values = input?.values;
  const numeratorComplete = Boolean(values && values.exports_to_china >= 0 && values.imports_from_china >= 0);
  const denominatorComplete = Boolean(values && values.exports_to_world > 0 && values.imports_from_world > 0);
  const codesValid = input?.reporter_code === expectedReporterCodes[country.slug] && input?.partner_code === 156;
  const yearValid = input?.year === year;
  const duplicateRecordCount = Math.max(0, matching.length - 1);
  const passed = numeratorComplete && denominatorComplete && codesValid && yearValid && duplicateRecordCount === 0;
  return {
    country_slug: country.slug,
    year: input?.year ?? null,
    reporter_code: input?.reporter_code ?? null,
    partner_code: input?.partner_code ?? null,
    numerator_complete: numeratorComplete,
    denominator_complete: denominatorComplete,
    duplicate_record_count: duplicateRecordCount,
    denominator_valid: denominatorComplete,
    qa_status: passed ? "passed" : "review_required",
    notes: passed
      ? `${year} HS TOTAL goods trade; reporter/China partner codes, bilateral numerators and world denominators passed structural QA.`
      : "Trade input requires review; no automatic correction was applied.",
  };
}));

export const chinaProjectCoverageAudit = researchCountries.map((country) => {
  const records = researchProjects.filter((project) => project.countrySlug === country.slug);
  const eligible = eligibleProjects(country.slug);
  const normalizedActors = records.map((project) => project.chineseActor.trim().toLocaleLowerCase());
  const duplicateProjectIds = records
    .filter((project, index) => records.findIndex((candidate) => candidate.projectId === project.projectId) !== index)
    .map((project) => project.projectId);
  const currencyMismatchIds = records
    .filter((project) => project.amount !== null && !project.currency)
    .map((project) => project.projectId);
  const amountConceptReviewIds = records
    .filter((project) => project.announcedAmount !== undefined && project.announcedAmount !== project.verifiedAmount)
    .map((project) => project.projectId);
  const duplicateCompanyNameReview = [...new Set(normalizedActors.filter((actor, index) => actor && normalizedActors.indexOf(actor) !== index))];
  const countryAssignmentReviewIds = records
    .filter((project) => !researchCountries.some((candidate) => candidate.slug === project.countrySlug))
    .map((project) => project.projectId);
  const sectorClassificationReviewIds = records
    .filter((project) => !project.sector.trim())
    .map((project) => project.projectId);
  const inconsistentYearReviewIds = records
    .filter((project) => !project.year.trim())
    .map((project) => project.projectId);
  const reviewRequired = records.filter((project) => {
    const verification = verifyChinaProject(project);
    return project.sourceReliabilityLevel === "D"
      || (project.amount !== null && !project.currency)
      || verification.conclusion === "excluded";
  });
  return {
    country: country.name_zh,
    country_slug: country.slug,
    project_database_coverage: projectDatabaseCoverage(country.slug),
    recorded_project_count: records.length,
    reliable_source_project_count: records.filter((project) => project.sourceReliabilityLevel === "A" || project.sourceReliabilityLevel === "B").length,
    eligible_project_count: eligible.length,
    active_project_count: records.filter((project) => ["committed", "under_construction", "operational"].includes(project.projectStatusCode)).length,
    cancelled_or_suspended_count: records.filter((project) => ["cancelled", "suspended"].includes(project.projectStatusCode)).length,
    completed_or_transferred_count: records.filter((project) => ["completed", "transferred"].includes(project.projectStatusCode)).length,
    duplicate_project_ids: duplicateProjectIds,
    duplicate_company_names_for_review: duplicateCompanyNameReview,
    currency_mismatch_project_ids: currencyMismatchIds,
    announced_vs_verified_amount_review_ids: amountConceptReviewIds,
    inconsistent_year_project_ids: inconsistentYearReviewIds,
    country_assignment_review_ids: countryAssignmentReviewIds,
    sector_classification_review_ids: sectorClassificationReviewIds,
    fdi_stock_flow_separated: true,
    project_value_fdi_double_count_prevented: true,
    review_required_project_ids: [...new Set([...reviewRequired.map((project) => project.projectId), ...duplicateProjectIds, ...currencyMismatchIds, ...amountConceptReviewIds])],
    coverage_note: records.length >= 2
      ? "代表性项目记录已接入，但项目库不是企业总体普查；未记录项目不能解释为零暴露。"
      : "仅有单项代表性记录，仍属项目覆盖不足；未记录项目不能解释为零暴露。",
  };
});

const sectorDefinitions: Array<{ id: ChinaSectorLinkageRecord["sector"]; pattern: RegExp }> = [
  { id: "battery", pattern: /电池/ },
  { id: "automotive", pattern: /汽车|轮胎|整车/ },
  { id: "electronics", pattern: /电子|家电|电器/ },
  { id: "logistics", pattern: /物流|港口|铁路|码头/ },
  { id: "infrastructure", pattern: /基础设施|桥|铁路|建设施工/ },
  { id: "energy", pattern: /能源|核能|电力/ },
];

export const chinaSectorLinkageMatrix: ChinaSectorLinkageRecord[] = researchCountries.flatMap((country) => {
  const countryProjects = researchProjects.filter((project) => project.countrySlug === country.slug);
  const coverage = projectDatabaseCoverage(country.slug);
  return sectorDefinitions.map((sector) => {
    const projects = countryProjects.filter((project) => sector.pattern.test(`${project.sector} ${project.riskTags.join(" ")}`));
    const current = projects.filter((project) => ["committed", "under_construction", "operational"].includes(project.projectStatusCode));
    const historical = projects.filter((project) => ["completed", "transferred"].includes(project.projectStatusCode));
    const cancelled = projects.filter((project) => ["cancelled", "suspended"].includes(project.projectStatusCode));
    const announced = projects.filter((project) => project.projectStatusCode === "announced");
    const reliableCurrent = current.filter((project) => project.sourceReliabilityLevel === "A" || project.sourceReliabilityLevel === "B");
    let status: ChinaSectorLinkageRecord["status"] = "no_verified_evidence";
    if (coverage === "insufficient" || coverage === "sparse") status = "insufficient_coverage";
    if (cancelled.length) status = "cancelled";
    if (announced.length) status = "announced";
    if (historical.length) status = "verified_historical";
    if (reliableCurrent.length) status = "verified_active";
    return {
      country: country.name_zh,
      country_slug: country.slug,
      sector: sector.id,
      status,
      project_ids: projects.map((project) => project.projectId),
      current_project_count: current.length,
      historical_project_count: historical.length + cancelled.length,
      source_reliability: [...new Set(projects.map((project) => project.sourceReliabilityLevel))],
      model_eligible: reliableCurrent.length > 0,
      double_counting_rule: "Project and industrial dimensions may cite the same fact for different meanings; a project amount is never added twice to an overall score.",
    };
  });
});

export const chinaEvidenceCoverageMatrix: ChinaEvidenceCoverageMatrixRecord[] = chinaExposureOutputs.map((output) => {
  const dimensions = Object.fromEntries(output.dimensions.map((dimension) => {
    const available = dimension.variables.some((item) => item.raw_value !== null);
    const fdiInput = (fdiInputsJson.records as FdiInput[]).find((record) => record.country === output.country_slug);
    const hasInvestmentCandidate = Boolean(fdiInput && "candidate_source_url" in fdiInput && fdiInput.candidate_source_url);
    const status = dimension.dimension === "investment"
      ? (available || hasInvestmentCandidate ? "partial" : "unavailable")
      : dimension.availability;
    return [dimension.dimension, status];
  })) as Record<ChinaExposureDimension, ChinaExposureCoverageStatus>;
  const projectAudit = chinaProjectCoverageAudit.find((item) => item.country_slug === output.country_slug);
  const statuses = Object.values(dimensions);
  const fdiInput = (fdiInputsJson.records as FdiInput[]).find((record) => record.country === output.country_slug);
  return {
    country: output.country,
    country_slug: output.country_slug,
    project: dimensions.project,
    trade: dimensions.trade,
    investment: dimensions.investment,
    industrial: dimensions.industrial,
    sufficient_dimensions: statuses.filter((status) => status === "sufficient").length,
    partial_dimensions: statuses.filter((status) => status === "partial").length,
    unavailable_dimensions: statuses.filter((status) => status === "unavailable" || status === "insufficient").length,
    project_database_coverage: output.project_database_coverage,
    recorded_project_count: projectAudit?.recorded_project_count ?? 0,
    reliable_project_count: projectAudit?.reliable_source_project_count ?? 0,
    trade_latest_year: output.trade_latest_year,
    china_fdi_source_tier: fdiSourceTier(output.country_slug),
    china_fdi_comparison_status: fdiInput?.definition_comparable ? "comparable" : fdiInput && "candidate_source_url" in fdiInput ? "partial" : "unavailable",
    overall_gate_status: output.overall_decision,
    priority_gaps: output.priority_gaps,
  };
});

export const chinaExposureRankingGate = {
  required_comparable_country_count: 7,
  available_overall_country_count: chinaExposureOutputs.filter((output) => output.overall_decision === "available").length,
  ranking_enabled: chinaExposureOutputs.filter((output) => output.overall_decision === "available").length >= 7,
  status: chinaExposureOutputs.filter((output) => output.overall_decision === "available").length >= 7 ? "ranking_available" : "ranking_unavailable",
  rule: "Cross-country China Exposure ranking requires at least 7 of 10 countries with comparable overall scores; country-level evidence may still be shown without ranking.",
};

export function getChinaExposureOutput(countrySlug: string) {
  return chinaExposureOutputs.find((output) => output.country_slug === countrySlug);
}
