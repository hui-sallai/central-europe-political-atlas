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
const { kpssStatus, STATIONARITY_ENGINE_VERSION } = require("../../src/lib/stationarityTests.ts");
const { TIME_SERIES_TRANSFORMATION_REGISTRY, TRANSFORM_REGISTRY_VERSION } = require("../../src/lib/timeSeriesTransforms.ts");
const {
  BASELINE_VAR_PROFILE,
  EXPLORATORY_TRANSFORMATION_CHAINS,
  EXPLORATORY_VAR_PROFILE,
  VAR_SPECIFICATION_PROFILES,
  createVarComparabilitySignature,
  profileVariables,
} = require("../../src/lib/varSpecifications.ts");
const release = JSON.parse(fs.readFileSync(path.join(root, "src/data/release.json"), "utf8"));
const hf = JSON.parse(fs.readFileSync(path.join(root, "src/data/high-frequency/high_frequency_observations.json"), "utf8"));
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
    profile_id: profile.profile_id,
    specification_kind: profileKind,
  }, seriesByIndicator);
}

function classify(country, profile, profileKind, variables, outcome, attempts, selectionReason) {
  const detail = outcome.status === "ok" ? outcome.result.stationarity : outcome.stationarity ?? [];
  if (outcome.status === "ok") {
    const result = outcome.result;
    const stable = result.diagnostics.stability.stable;
    const residualPassed = result.diagnostics.residual_autocorrelation_sensitivity.every((entry) => entry.status === "passed");
    const borderline = detail.some((entry) => entry.adf.status === "borderline");
    const estimable = true;
    const dynamicResponseReady = result.irf !== null;
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
      reasons.push("h=12/18/24 残差 Portmanteau 敏感性诊断未全部通过；动态响应暂不可用");
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
    comparability_signature: createVarComparabilitySignature(variables),
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
  schema_version: "var-profile-readiness-v1.41",
  generated_at: generatedAt,
  profile,
  estimable_countries: profileRecords.filter((record) => record.estimable).map((record) => record.country),
  dynamic_response_ready_countries: profileRecords.filter((record) => record.dynamic_response_ready).map((record) => record.country),
  record_count: profileRecords.length,
  records: profileRecords,
});
const baselinePayload = profilePayload(BASELINE_VAR_PROFILE, baselineRecords);
const exploratoryPayload = profilePayload(EXPLORATORY_VAR_PROFILE, exploratoryRecords);
const combinedPayload = {
  schema_version: "var-country-readiness-v1.41",
  generated_at: generatedAt,
  readiness_unit: "country x profile x variable set x sample window x transformation specification",
  interpretation_boundary: "estimable 只表示系数可估计；dynamic_response_ready 还要求平稳性、稳定性、h=12/18/24 残差诊断和正交化全部通过。探索性 fallback 不得作为 baseline 跨国比较。",
  profiles: VAR_SPECIFICATION_PROFILES,
  estimable_countries: baselinePayload.estimable_countries,
  dynamic_response_ready_countries: baselinePayload.dynamic_response_ready_countries,
  baseline_profile_readiness: baselinePayload,
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

write("var_specification_profiles.json", { schema_version: "var-specification-profiles-v1.41", generated_at: generatedAt, profiles: VAR_SPECIFICATION_PROFILES, exploratory_transformation_chains: EXPLORATORY_TRANSFORMATION_CHAINS });
write("transformation_registry.json", {
  schema_version: TRANSFORM_REGISTRY_VERSION,
  generated_at: generatedAt,
  records: TIME_SERIES_TRANSFORMATION_REGISTRY,
  exploratory_fallback_chains: EXPLORATORY_TRANSFORMATION_CHAINS,
  boundary: "正式 baseline 不做 transformation fallback。探索性 fallback 单独记录所有尝试；指数水平不能以 raw level 进入当前 VAR。",
});
write("stationarity_results.json", {
  schema_version: "stationarity-results-v1.41",
  engine_version: STATIONARITY_ENGINE_VERSION,
  generated_at: generatedAt,
  tests: { adf: "augmented Dickey-Fuller with constant and AIC lag selection", kpss: kpssStatus() },
  multiple_search_warning: "探索性 profile 尝试多个 transformation 会增加选择后推断风险；其结果不得冒充预设 baseline。",
  record_count: stationarityRecords.length,
  records: stationarityRecords,
});
write("lag_selection_registry.json", {
  schema_version: "lag-selection-registry-v1.41",
  generated_at: generatedAt,
  default_criterion: "bic",
  note: "候选滞后使用共同有效样本；最大滞后同时受请求值 12 和 (T-p)/(Kp+1)>=4 参数门约束。",
  record_count: lagSelectionRecords.length,
  records: lagSelectionRecords,
});
write("var_baseline_readiness.json", baselinePayload);
write("var_exploratory_readiness.json", exploratoryPayload);
write("var_country_readiness.json", combinedPayload, true);
write("var_model_registry.json", {
  schema_version: "var-model-registry-v1.41",
  generated_at: generatedAt,
  note: "Baseline 与 exploratory 结果按 profile_kind 分开。只有 dynamic_response_ready 的结果包含 IRF；IRF 为依赖排序且无置信区间的正交化简化式点响应。",
  record_count: modelRegistryRecords.length,
  records: modelRegistryRecords,
});

for (const [label, profile] of [["baseline", baselinePayload], ["exploratory", exploratoryPayload]]) {
  console.log(`${label}: countries=${profile.record_count}; estimable=${profile.estimable_countries.length}; dynamic_response_ready=${profile.dynamic_response_ready_countries.length}`);
  for (const record of profile.records) console.log(`  ${record.country}: ${record.readiness_state}${record.selected_lag ? ` (lag ${record.selected_lag})` : ""}`);
}
