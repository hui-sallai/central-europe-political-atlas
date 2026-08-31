// Builds separate formal-baseline and exploratory VAR readiness records.
// Exploratory transformation search is logged and never overwrites baseline.
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, parent, isMain, options) {
  if (request.startsWith("@/")) request = path.join(root, "src", request.slice(2));
  return originalResolve.call(this, request, parent, isMain, options);
};
require.extensions[".ts"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const { runReducedFormVar, VAR_ENGINE_VERSION, VAR_DATASET_VERSION } = require("../../src/lib/varEngine.ts");
const {
  kpssStatus,
  SEASONAL_UNIT_ROOT_REGISTRY,
  STATIONARITY_ENGINE_VERSION,
  STATIONARITY_SPECIFICATION_REGISTRY,
} = require("../../src/lib/stationarityTests.ts");
const { TIME_SERIES_TRANSFORMATION_REGISTRY, TRANSFORM_REGISTRY_VERSION } = require("../../src/lib/timeSeriesTransforms.ts");
const {
  BASELINE_VAR_PROFILE,
  BASELINE_VAR_PROFILE_V2,
  EXPLORATORY_TRANSFORMATION_CHAINS,
  EXPLORATORY_VAR_PROFILE,
  VAR_SPECIFICATION_PROFILES,
  createVarComparabilitySignature,
  profileVariables,
} = require("../../src/lib/varSpecifications.ts");
const release = JSON.parse(fs.readFileSync(path.join(root, "src/data/release.json"), "utf8"));
const hf = JSON.parse(fs.readFileSync(path.join(root, "src/data/high-frequency/high_frequency_observations.json"), "utf8"));
const hfDictionary = JSON.parse(fs.readFileSync(path.join(root, "src/data/high-frequency/series_dictionary.json"), "utf8"));
const seasonalAdfCalibration = JSON.parse(fs.readFileSync(path.join(root, "src/data/macro/seasonal_adf_critical_values.json"), "utf8"));
const records = hf.records;
const COUNTRIES = [...new Set(records.map((record) => record.country))].sort();
const latestPeriodByCountry = new Map(COUNTRIES.map((country) => [
  country,
  records.filter((record) => record.country === country && record.value !== null).map((record) => record.period).sort().at(-1) ?? "2015-01",
]));

const seriesByIndicator = new Map();
for (const record of records) {
  const list = seriesByIndicator.get(record.indicator) ?? [];
  list.push({
    observation_id: record.observation_id,
    country: record.country,
    period: record.period,
    indicator: record.indicator,
    value: record.value,
    transformation: record.transformation,
    unit: record.unit,
    value_semantics: record.value_semantics,
  });
  seriesByIndicator.set(record.indicator, list);
}

const generatedAt = new Date().toISOString().slice(0, 10);
const stationarityRecords = [];
const lagSelectionRecords = [];
const modelRegistryRecords = [];

function run(country, profile, profileKind, variables) {
  return runReducedFormVar({
    country,
    variables,
    start_period: profile.sample_policy.start_period,
    end_period: latestPeriodByCountry.get(country),
    ic_criterion: profile.lag_policy.criterion,
    max_lag: profile.lag_policy.max_lag,
    deterministic_terms: profile.deterministic_terms,
    stationarity_specification_id: profile.stationarity_specification_id,
    profile_id: profile.profile_id,
    specification_kind: profileKind,
  }, seriesByIndicator);
}

function classify(country, profile, profileKind, variables, outcome, attempts, selectionReason) {
  const detail = outcome.status === "ok" ? outcome.result.stationarity : outcome.stationarity ?? [];
  if (outcome.status === "ok") {
    const result = outcome.result;
    const stable = result.diagnostics.stability.stable;
    const residualPassed = result.diagnostics.residual_autocorrelation.status === "passed";
    const borderline = detail.some((entry) => entry.adf.status === "borderline");
    const estimable = true;
    const dynamicResponseReady = Object.values(result.dynamic_response_ready_horizons).some(Boolean);
    let readinessState = "estimable";
    const reasons = [];
    if (!stable) {
      readinessState = "unstable";
      reasons.push(`伴随矩阵最大根模 ${result.diagnostics.stability.max_root_modulus} >= 1`);
    } else if (borderline) {
      readinessState = "estimable_with_warning";
      reasons.push("至少一个变量的 ADF 结果为 borderline；可估计但不开放动态响应");
    } else if (!residualPassed) {
      readinessState = "residual_diagnostics_failed";
      reasons.push("主残差 Portmanteau 诊断 h=12 未通过；动态响应暂不可用");
    } else if (dynamicResponseReady) {
      readinessState = "dynamic_response_ready";
    }
    lagSelectionRecords.push({
      country,
      profile_id: profile.profile_id,
      profile_kind: profileKind,
      comparability_signature: result.comparability_signature,
      criterion: result.lag_selection.criterion,
      requested_max_lag: result.lag_preflight.requested_max_lag,
      maximum_allowed_lag: result.lag_preflight.maximum_allowed_lag,
      applied_max_lag: result.lag_preflight.applied_max_lag,
      selected_lag: result.selected_lag,
      selected_ic_value: result.lag_selection.selected_ic_value,
      candidates: result.lag_selection.candidates,
    });
    modelRegistryRecords.push({
      platform_version: release.version,
      engine_version: VAR_ENGINE_VERSION,
      dataset_version: VAR_DATASET_VERSION,
      stationarity_engine_version: STATIONARITY_ENGINE_VERSION,
      profile_id: profile.profile_id,
      profile_kind: profileKind,
      result,
    });
    return {
      country,
      profile_id: profile.profile_id,
      profile_kind: profileKind,
      variables,
      comparability_signature: result.comparability_signature,
      start_period: result.sample.start_period,
      end_period: result.sample.end_period,
      effective_observations: result.sample.effective_observations,
      missing_ratio: Number((result.sample.dropped_periods.length / (result.sample.dropped_periods.length + result.sample.effective_observations)).toFixed(4)),
      stationarity_status: detail.every((entry) => entry.adf.status === "stationary") ? "stationary" : "borderline",
      stationarity_detail: detail,
      lag_selection_status: "completed",
      selected_lag: result.selected_lag,
      stability_status: stable ? "stable" : "unstable",
      residual_status: residualPassed ? "passed" : "failed",
      estimable,
      dynamic_response_ready: dynamicResponseReady,
      dynamic_response_ready_horizons: result.dynamic_response_ready_horizons,
      irf_available: dynamicResponseReady,
      readiness_state: readinessState,
      blocking_reasons: reasons,
      fallback_attempts: attempts,
      selected_fallback: profileKind === "exploratory_fallback" ? variables : null,
      selection_reason: selectionReason,
    };
  }

  const stateByReason = {
    insufficient_observations: "insufficient_observations",
    missing_data: "missing_data",
    non_stationary: "non_stationary",
    unstable: "unstable",
    residual_diagnostics_failed: "residual_diagnostics_failed",
    unsupported_specification: "unsupported_specification",
    singular: "unsupported_specification",
  };
  return {
    country,
    profile_id: profile.profile_id,
    profile_kind: profileKind,
    variables,
    comparability_signature: createVarComparabilitySignature(variables, profile.deterministic_terms),
    start_period: null,
    end_period: null,
    effective_observations: 0,
    missing_ratio: null,
    stationarity_status: detail.some((entry) => entry.adf.status === "non_stationary") ? "non_stationary" : detail.length ? "stationary" : "not_tested",
    stationarity_detail: detail,
    lag_selection_status: "not_run",
    selected_lag: null,
    stability_status: "not_run",
    residual_status: "not_run",
    estimable: false,
    dynamic_response_ready: false,
    dynamic_response_ready_horizons: { 6: false, 12: false, 18: false, 24: false },
    irf_available: false,
    readiness_state: stateByReason[outcome.reason_code] ?? "unsupported_specification",
    blocking_reasons: outcome.reasons,
    fallback_attempts: attempts,
    selected_fallback: null,
    selection_reason: selectionReason,
  };
}

function recordStationarity(country, profileId, profileKind, attempt, outcome) {
  const detail = outcome.status === "ok" ? outcome.result.stationarity : outcome.stationarity ?? [];
  for (const entry of detail) stationarityRecords.push({ country, profile_id: profileId, profile_kind: profileKind, attempt, ...entry });
  return detail;
}

const baselineRecords = [];
const baselineV2Records = [];
const exploratoryRecords = [];
for (const country of COUNTRIES) {
  const baselineVariables = profileVariables(BASELINE_VAR_PROFILE);
  const baselineOutcome = run(country, BASELINE_VAR_PROFILE, "baseline_prespecified", baselineVariables);
  recordStationarity(country, BASELINE_VAR_PROFILE.profile_id, "baseline_prespecified", 1, baselineOutcome);
  baselineRecords.push(classify(
    country,
    BASELINE_VAR_PROFILE,
    "baseline_prespecified",
    baselineVariables,
    baselineOutcome,
    [{ attempt: 1, variables: baselineVariables, outcome: baselineOutcome.status, reason: baselineOutcome.status === "blocked" ? baselineOutcome.reasons[0] : null }],
    "预设 baseline；不根据单个国家结果更换 transformation。",
  ));

  const baselineV2Variables = profileVariables(BASELINE_VAR_PROFILE_V2);
  const baselineV2Outcome = run(country, BASELINE_VAR_PROFILE_V2, "baseline_prespecified", baselineV2Variables);
  recordStationarity(country, BASELINE_VAR_PROFILE_V2.profile_id, "baseline_prespecified", 1, baselineV2Outcome);
  baselineV2Records.push(classify(
    country,
    BASELINE_VAR_PROFILE_V2,
    "baseline_prespecified",
    baselineV2Variables,
    baselineV2Outcome,
    [{ attempt: 1, variables: baselineV2Variables, outcome: baselineV2Outcome.status, reason: baselineV2Outcome.status === "blocked" ? baselineV2Outcome.reasons[0] : null }],
    "预注册 seasonal-control baseline v2；与 v1 变量和变换相同，仅增加 11 个月份虚拟变量。",
  ));

  const choices = EXPLORATORY_TRANSFORMATION_CHAINS.map(() => 0);
  const attempts = [];
  let finalOutcome = null;
  let finalVariables = null;
  let selectionReason = "探索性 fallback chain 未找到可估计规格。";
  for (let attempt = 1; attempt <= 14; attempt += 1) {
    const variables = EXPLORATORY_TRANSFORMATION_CHAINS.map((entry, index) => entry.chain[choices[index]]);
    const outcome = run(country, EXPLORATORY_VAR_PROFILE, "exploratory_fallback", variables);
    const detail = recordStationarity(country, EXPLORATORY_VAR_PROFILE.profile_id, "exploratory_fallback", attempt, outcome);
    attempts.push({ attempt, variables, outcome: outcome.status, reason: outcome.status === "blocked" ? outcome.reasons[0] : null });
    finalOutcome = outcome;
    finalVariables = variables;
    if (outcome.status === "ok") {
      selectionReason = attempt === 1 ? "探索性 profile 的首选规格可估计。" : `第 ${attempt} 次登记变换尝试获得可估计规格；仅用于探索性分析。`;
      break;
    }
    if (outcome.reason_code !== "non_stationary") break;
    const badIndex = variables.findIndex((variable) => detail.some((entry) => entry.indicator === variable.indicator && entry.transformation === variable.transformation && ["non_stationary", "not_tested"].includes(entry.adf.status)));
    if (badIndex < 0 || choices[badIndex] >= EXPLORATORY_TRANSFORMATION_CHAINS[badIndex].chain.length - 1) break;
    choices[badIndex] += 1;
  }
  exploratoryRecords.push(classify(country, EXPLORATORY_VAR_PROFILE, "exploratory_fallback", finalVariables, finalOutcome, attempts, selectionReason));
}

const profilePayload = (profile, profileRecords) => ({
  schema_version: "var-profile-readiness-v1.44",
  generated_at: generatedAt,
  profile,
  estimable_countries: profileRecords.filter((record) => record.estimable).map((record) => record.country),
  dynamic_response_ready_countries: profileRecords.filter((record) => record.dynamic_response_ready).map((record) => record.country),
  dynamic_response_ready_6m_countries: profileRecords.filter((record) => record.dynamic_response_ready_horizons[6]).map((record) => record.country),
  dynamic_response_ready_12m_countries: profileRecords.filter((record) => record.dynamic_response_ready_horizons[12]).map((record) => record.country),
  dynamic_response_ready_18m_countries: profileRecords.filter((record) => record.dynamic_response_ready_horizons[18]).map((record) => record.country),
  dynamic_response_ready_24m_countries: profileRecords.filter((record) => record.dynamic_response_ready_horizons[24]).map((record) => record.country),
  record_count: profileRecords.length,
  records: profileRecords,
});
const baselinePayload = profilePayload(BASELINE_VAR_PROFILE, baselineRecords);
const baselineV2Payload = profilePayload(BASELINE_VAR_PROFILE_V2, baselineV2Records);
const exploratoryPayload = profilePayload(EXPLORATORY_VAR_PROFILE, exploratoryRecords);
const horizonSummary = (payload) => ({
  estimable_countries: payload.estimable_countries,
  dynamic_response_ready_6m_countries: payload.dynamic_response_ready_6m_countries,
  dynamic_response_ready_12m_countries: payload.dynamic_response_ready_12m_countries,
  dynamic_response_ready_18m_countries: payload.dynamic_response_ready_18m_countries,
  dynamic_response_ready_24m_countries: payload.dynamic_response_ready_24m_countries,
});
const baselineComparison = {
  schema_version: "var-baseline-profile-comparison-v1.44",
  generated_at: generatedAt,
  comparison_boundary: "v1 与 v2 均为预注册正式基线；比较用于评估月份控制对残差季节结构和诊断充分性的影响，不用于结果择优。",
  records: COUNTRIES.map((country) => {
    const v1 = baselineRecords.find((record) => record.country === country);
    const v2 = baselineV2Records.find((record) => record.country === country);
    return {
      country,
      baseline_v1: v1,
      baseline_v2: v2,
      comparison: {
        selected_lag_v1: v1?.selected_lag ?? null,
        selected_lag_v2: v2?.selected_lag ?? null,
        estimable_v1: v1?.estimable ?? false,
        estimable_v2: v2?.estimable ?? false,
        dynamic_response_ready_horizons_v1: v1?.dynamic_response_ready_horizons ?? { 6: false, 12: false, 18: false, 24: false },
        dynamic_response_ready_horizons_v2: v2?.dynamic_response_ready_horizons ?? { 6: false, 12: false, 18: false, 24: false },
      },
    };
  }),
};
const sourceSeriesByIndicator = new Map(hfDictionary.records.map((record) => [record.indicator, record]));
const seasonalityPolicy = {
  hicp_monthly_index: {
    deterministic_seasonality_risk: "material",
    month_dummy_policy: "recommended_and_justified_for_baseline_v2",
    seasonal_unit_root_test_required: true,
    notes: "NSA monthly index. Month dummies address deterministic month effects; HEGY remains unavailable, so no seasonal-unit-root conclusion is made.",
  },
  hicp_annual_rate: {
    deterministic_seasonality_risk: "mitigated_by_12_month_comparison_but_not_assumed_absent",
    month_dummy_policy: "optional_robustness_and_residual_seasonality_check",
    seasonal_unit_root_test_required: true,
    notes: "The annual-rate transformation already compares the same month one year apart. It is not mechanically assigned the monthly-index risk classification.",
  },
  industrial_production_index: {
    deterministic_seasonality_risk: "source_adjusted_residual_check_only",
    month_dummy_policy: "optional_robustness_and_residual_seasonality_check",
    seasonal_unit_root_test_required: false,
    notes: "Source series is SCA. System month dummies absorb residual calendar/month effects; they do not seasonally adjust the source again.",
  },
  unemployment_rate_monthly: {
    deterministic_seasonality_risk: "source_adjusted_residual_check_only",
    month_dummy_policy: "optional_robustness_and_residual_seasonality_check",
    seasonal_unit_root_test_required: false,
    notes: "Source series is SA. System month dummies are a residual robustness control, not a replacement seasonal adjustment.",
  },
};
const seasonalityAudit = {
  schema_version: "var-seasonality-audit-v1.44",
  generated_at: generatedAt,
  source_dictionary_schema: hfDictionary.schema_version,
  records: TIME_SERIES_TRANSFORMATION_REGISTRY.map((entry) => {
    const source = sourceSeriesByIndicator.get(entry.indicator);
    const policy = seasonalityPolicy[entry.indicator];
    if (!source || !policy) throw new Error(`missing canonical seasonality metadata for ${entry.indicator}`);
    return {
      indicator: entry.indicator,
      source_adjustment: source.seasonal_adjustment,
      frequency: source.frequency,
      transformation: entry.default_transformation,
      deterministic_seasonality_risk: policy.deterministic_seasonality_risk,
      source_already_adjusted: ["SA", "SCA"].includes(source.seasonal_adjustment),
      month_dummy_policy: policy.month_dummy_policy,
      seasonal_unit_root_test_required: policy.seasonal_unit_root_test_required,
      notes: policy.notes,
    };
  }),
};
const lagDiagnosticPayload = {
  schema_version: "var-lag-diagnostic-grid-v1.44",
  generated_at: generatedAt,
  baseline_policy: "BIC-selected lag remains the formal baseline. A higher diagnostically adequate alternative is exploratory and never replaces it silently.",
  records: modelRegistryRecords.map((entry) => ({ country: entry.result.country, profile_id: entry.profile_id, profile_kind: entry.profile_kind, rows: entry.result.lag_diagnostic_grid, diagnostic_lag_refinement: entry.result.diagnostic_lag_refinement })),
};
const combinedPayload = {
  schema_version: "var-country-readiness-v1.44",
  generated_at: generatedAt,
  readiness_unit: "country x profile x variable set x sample window x transformation specification",
  interpretation_boundary: "estimable 只表示系数可估计；动态响应按视野门控：6/12 月要求主诊断 h=12，18 月还要求 h=18，24 月还要求 h=24。探索性 fallback 不得作为 baseline 跨国比较。",
  profiles: VAR_SPECIFICATION_PROFILES,
  estimable_countries: baselinePayload.estimable_countries,
  dynamic_response_ready_countries: baselinePayload.dynamic_response_ready_countries,
  ...horizonSummary(baselinePayload),
  baseline_profile_readiness: baselinePayload,
  baseline_v2_profile_readiness: baselineV2Payload,
  exploratory_profile_readiness: exploratoryPayload,
  record_count: baselineRecords.length,
  records: baselineRecords,
};

const outDir = path.join(root, "src", "data", "macro");
const publicDir = path.join(root, "public", "research-data");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });
const write = (name, payload, toPublic = false) => {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(payload, null, 2));
  if (toPublic) fs.writeFileSync(path.join(publicDir, name), JSON.stringify(payload));
};

write("var_specification_profiles.json", { schema_version: "var-specification-profiles-v1.44", generated_at: generatedAt, profiles: VAR_SPECIFICATION_PROFILES, exploratory_transformation_chains: EXPLORATORY_TRANSFORMATION_CHAINS }, true);
write("transformation_registry.json", {
  schema_version: TRANSFORM_REGISTRY_VERSION,
  generated_at: generatedAt,
  records: TIME_SERIES_TRANSFORMATION_REGISTRY,
  exploratory_fallback_chains: EXPLORATORY_TRANSFORMATION_CHAINS,
  boundary: "正式 baseline 不做 transformation fallback。探索性 fallback 单独记录所有尝试；指数水平不能以 raw level 进入当前 VAR。",
});
write("stationarity_results.json", {
  schema_version: "stationarity-results-v1.44",
  engine_version: STATIONARITY_ENGINE_VERSION,
  generated_at: generatedAt,
  tests: {
    adf_constant: "augmented Dickey-Fuller with constant and AIC lag selection",
    adf_constant_seasonal_dummies: "zero-frequency ADF with constant, 11 monthly dummies (January reference), common-sample AIC lag selection and no pseudo-precise custom p-value",
    adf_constant_seasonal_dummies_mc: "same seasonal-dummy tau regression with validated precomputed Monte Carlo finite-sample critical values and linear sample-size interpolation",
    seasonal_unit_root: SEASONAL_UNIT_ROOT_REGISTRY,
    kpss: kpssStatus(),
  },
  multiple_search_warning: "探索性 profile 尝试多个 transformation 会增加选择后推断风险；其结果不得冒充预设 baseline。",
  record_count: stationarityRecords.length,
  records: stationarityRecords,
}, true);
write("lag_selection_registry.json", {
  schema_version: "lag-selection-registry-v1.44",
  generated_at: generatedAt,
  default_criterion: "bic",
  note: "候选滞后使用共同有效样本；最大滞后同时受请求值 12 和 (T-p)/(Kp+1)>=4 参数门约束。",
  record_count: lagSelectionRecords.length,
  records: lagSelectionRecords,
});
write("var_baseline_readiness.json", baselinePayload);
write("var_baseline_v1_readiness.json", baselinePayload, true);
write("var_baseline_v2_readiness.json", baselineV2Payload, true);
write("var_exploratory_readiness.json", exploratoryPayload, true);
write("var_baseline_profile_comparison.json", baselineComparison, true);
write("var_seasonality_audit.json", seasonalityAudit, true);
write("var_lag_diagnostic_grid.json", lagDiagnosticPayload, true);
write("stationarity_specification_registry.json", {
  schema_version: "stationarity-specification-registry-v1.44",
  generated_at: generatedAt,
  profile_mapping: VAR_SPECIFICATION_PROFILES.map((profile) => ({ profile_id: profile.profile_id, stationarity_specification_id: profile.stationarity_specification_id })),
  records: STATIONARITY_SPECIFICATION_REGISTRY,
}, true);
write("seasonal_stationarity_results.json", {
  schema_version: "seasonal-stationarity-results-v1.44",
  generated_at: generatedAt,
  interpretation_boundary: "Deterministic seasonal controls test the zero-frequency unit root under a registered deterministic specification. They do not test seasonal roots; HEGY remains unavailable.",
  records: stationarityRecords.filter((record) => record.stationarity_specification_id === "adf_constant_seasonal_dummies_mc"),
}, true);
write("seasonal_adf_critical_values.json", seasonalAdfCalibration, true);
write("seasonal_adf_decision_comparison.json", {
  schema_version: "seasonal-adf-decision-comparison-v1.44",
  generated_at: generatedAt,
  historical_reference: "v1.43 MacKinnon regression=c finite-sample critical values applied to the seasonal-dummy tau",
  formal_v2_policy: "v1.44 exact-design Monte Carlo finite-sample critical values",
  records: stationarityRecords
    .filter((record) => record.stationarity_specification_id === "adf_constant_seasonal_dummies_mc")
    .map((record) => ({
      country: record.country,
      indicator: record.indicator,
      transformation: record.transformation,
      profile: record.profile_id,
      tau: record.adf.statistic,
      mackinnon_5pct: record.legacy_seasonal_adf?.critical_values?.["5%"] ?? null,
      mc_5pct: record.adf.critical_values["5%"],
      mackinnon_decision: record.legacy_seasonal_adf?.status ?? "not_tested",
      mc_decision: record.adf.status,
      decision_changed: (record.legacy_seasonal_adf?.status ?? "not_tested") !== record.adf.status,
      calibration: record.adf.calibration,
    })),
}, true);
write("hegy_readiness_registry.json", {
  schema_version: "hegy-readiness-registry-v1.44",
  generated_at: generatedAt,
  test_id: "hegy_monthly",
  state: "not_available",
  monthly_formula_status: "not_implemented",
  critical_values_status: "not_validated",
  deterministic_terms_status: "not_registered",
  cross_language_validation_status: "not_available",
  remaining_blockers: ["monthly HEGY formula implementation", "finite-sample critical-value policy", "deterministic-term registry", "independent cross-language fixture"],
  interpretation_boundary: "ADF with deterministic month dummies tests a zero-frequency unit root under seasonal controls; it is not a seasonal-unit-root test.",
}, true);
write("structural_break_registry.json", {
  schema_version: "structural-break-registry-v1.44",
  generated_at: generatedAt,
  test_registry: [{ test_id: "zivot_andrews", state: "registry_only", reason: "The statsmodels reference exists, but a production implementation, exact specification alignment and cross-language fixture have not been integrated; it cannot override the formal ADF gate." }],
  historical_candidate_periods: [
    { period: "2020-03", label: "COVID-19 historical reference", status: "candidate_only_not_estimated" },
    { period: "2021-07", label: "2021 H2 inflation-surge historical reference", status: "candidate_only_not_estimated" },
    { period: "2022-02", label: "Ukraine-war / energy-price-shock historical reference", status: "candidate_only_not_estimated" },
  ],
  statistically_estimated_breaks: [],
  separation_rule: "Historical candidate periods and statistically estimated breaks are never merged. Temporal proximity is not causal attribution.",
  records: COUNTRIES.flatMap((country) => VAR_SPECIFICATION_PROFILES.map((profile) => ({ country, profile_id: profile.profile_id, structural_break_status: "registry_only", decision_effect: "none", note: "Candidate dates are historical markers, not estimated statistical breaks." }))),
}, true);
write("persistence_diagnostics.json", {
  schema_version: "persistence-diagnostics-v1.44",
  generated_at: generatedAt,
  interpretation_boundary: "ACF/PACF are descriptive and never select the model automatically. Lag-12 warnings do not confirm a seasonal unit root.",
  records: stationarityRecords.map((record) => ({
    country: record.country,
    profile_id: record.profile_id,
    profile_kind: record.profile_kind,
    indicator: record.indicator,
    transformation: record.transformation,
    stationarity_specification_id: record.stationarity_specification_id,
    ...record.persistence,
  })),
}, true);
write("var_country_readiness.json", combinedPayload, true);
write("var_model_registry.json", {
  schema_version: "var-model-registry-v1.44",
  generated_at: generatedAt,
  note: "Baseline 与 exploratory 结果按 profile_kind 分开。只有 dynamic_response_ready 的结果包含 IRF；IRF 为依赖排序且无置信区间的正交化简化式点响应。",
  record_count: modelRegistryRecords.length,
  records: modelRegistryRecords,
});

const skillRegistryFile = path.join(root, "src/data/analysis/analysis_skill_registry.json");
const skillRegistry = JSON.parse(fs.readFileSync(skillRegistryFile, "utf8"));
// The VAR generator updates its own skill gate but must preserve the current
// Platform-level registry schema follows the release data-contract version.
skillRegistry.schema_version = "analysis-skill-registry-v1.61";
skillRegistry.generated_at = generatedAt;
const reducedFormSkill = skillRegistry.records.find((record) => record.skill_id === "reduced_form_var");
if (reducedFormSkill) reducedFormSkill.gate = "formal baseline v1/v2 and exploratory fallback are separate; >=60 continuous monthly observations, profile-mapped ADF gate, common-sample BIC lag selection, parameter ratio >=4, companion-root stability and horizon-specific residual diagnostics";
fs.writeFileSync(skillRegistryFile, `${JSON.stringify(skillRegistry, null, 2)}\n`);

for (const [label, profile] of [["baseline_v1", baselinePayload], ["baseline_v2", baselineV2Payload], ["exploratory", exploratoryPayload]]) {
  console.log(`${label}: countries=${profile.record_count}; estimable=${profile.estimable_countries.length}; dynamic_response_ready=${profile.dynamic_response_ready_countries.length}`);
  for (const record of profile.records) console.log(`  ${record.country}: ${record.readiness_state}${record.selected_lag ? ` (lag ${record.selected_lag})` : ""}`);
}
