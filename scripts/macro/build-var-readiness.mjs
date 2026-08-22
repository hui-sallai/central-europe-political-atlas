// Builds the per-country VAR readiness layer (v1.4): readiness is evaluated per
// country × variable set × sample window × transformation specification — a
// single missing variable in one country never blocks the others.
// Each variable follows a documented transformation fallback chain: the default
// is tried first and every ADF attempt is recorded; the first non-non_stationary
// candidate is used (borderline passes with a warning). Nothing is silent.
// Outputs (src/data/macro + public copies where the workbench needs them):
//   transformation_registry.json, stationarity_results.json,
//   lag_selection_registry.json, var_country_readiness.json, var_model_registry.json
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
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filename });
  module._compile(output.outputText, filename);
};

const { runReducedFormVar, VAR_ENGINE_VERSION, VAR_DATASET_VERSION } = require("../../src/lib/varEngine.ts");
const { kpssStatus, STATIONARITY_ENGINE_VERSION } = require("../../src/lib/stationarityTests.ts");
const { TIME_SERIES_TRANSFORMATION_REGISTRY, TRANSFORM_REGISTRY_VERSION } = require("../../src/lib/timeSeriesTransforms.ts");
const release = JSON.parse(fs.readFileSync(path.join(root, "src/data/release.json"), "utf8"));

const hf = JSON.parse(fs.readFileSync(path.join(root, "src/data/high-frequency/high_frequency_observations.json"), "utf8"));
const records = hf.records;
const COUNTRIES = [...new Set(records.map((record) => record.country))].sort();
const latestPeriodByCountry = new Map(COUNTRIES.map((country) => [
  country,
  records
    .filter((record) => record.country === country && record.value !== null)
    .map((record) => record.period)
    .sort()
    .at(-1) ?? "2015-01",
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

// Documented transformation fallback chains (v1.4 default variable set).
const VARIABLE_CHAINS = [
  {
    role: "inflation",
    chain: [
      { indicator: "hicp_monthly_index", transformation: "log_difference" },
      { indicator: "hicp_monthly_index", transformation: "log_difference_12" },
      { indicator: "hicp_annual_rate", transformation: "level" },
      { indicator: "hicp_annual_rate", transformation: "first_difference" },
    ],
  },
  {
    role: "industrial_production",
    chain: [
      { indicator: "industrial_production_index", transformation: "log_difference" },
      { indicator: "industrial_production_index", transformation: "log_difference_12" },
    ],
  },
  {
    role: "unemployment",
    chain: [
      { indicator: "unemployment_rate_monthly", transformation: "level" },
      { indicator: "unemployment_rate_monthly", transformation: "first_difference" },
    ],
  },
];
const DEFAULT_VARIABLE_SET = VARIABLE_CHAINS.map((entry) => entry.chain[0]);

const generatedAt = new Date().toISOString().slice(0, 10);
const stationarityRecords = [];
const lagSelectionRecords = [];
const readinessRecords = [];
const modelRegistryRecords = [];

for (const country of COUNTRIES) {
  // Engine-driven fallback: candidates are tried in chain order and judged by
  // the engine's own ADF on the actual estimation window (never a separate
  // standalone test that could disagree). Every attempt is recorded.
  const choices = [0, 0, 0];
  let finalOutcome = null;
  let finalVariables = null;
  let attempts = 0;
  while (attempts < 14) {
    attempts += 1;
    const variables = VARIABLE_CHAINS.map((entry, index) => entry.chain[choices[index]]);
    const outcome = runReducedFormVar({
      country,
      variables,
      start_period: "2015-01",
      end_period: latestPeriodByCountry.get(country),
      ic_criterion: "bic",
      max_lag: 12,
      deterministic_terms: "constant",
    }, seriesByIndicator);
    const detail = outcome.status === "ok" ? outcome.result.stationarity : outcome.stationarity ?? [];
    for (const entry of detail) {
      stationarityRecords.push({ country, attempt: attempts, ...entry });
    }
    if (outcome.status === "ok") {
      finalOutcome = outcome;
      finalVariables = variables;
      break;
    }
    if (outcome.reason_code === "non_stationary") {
      // Advance the chain of the first non-stationary variable, if possible.
      const badIndex = variables.findIndex((variable) => detail.some((entry) => entry.indicator === variable.indicator && entry.transformation === variable.transformation && entry.adf.status === "non_stationary"));
      if (badIndex >= 0 && choices[badIndex] < VARIABLE_CHAINS[badIndex].chain.length - 1) {
        choices[badIndex] += 1;
        continue;
      }
      finalOutcome = outcome;
      finalVariables = variables;
      break;
    }
    finalOutcome = outcome;
    finalVariables = variables;
    break;
  }

  const outcome = finalOutcome;
  const variables = finalVariables;
  const stationarityDetail = outcome.status === "ok" ? outcome.result.stationarity : outcome.stationarity ?? [];

  if (outcome.status === "ok") {
    const result = outcome.result;
    lagSelectionRecords.push({
      country,
      criterion: "bic",
      max_lag: result.lag_selection.max_lag,
      selected_lag: result.selected_lag,
      selected_ic_value: result.lag_selection.selected_ic_value,
      candidates: result.lag_selection.candidates,
    });
    const residualFailed = result.diagnostics.residual_autocorrelation.status === "failed";
    const borderlineStationarity = stationarityDetail.some((entry) => entry.adf.status === "borderline" || entry.adf.status === "not_tested");
    let readinessState = "ready";
    const blockingReasons = [];
    if (!result.diagnostics.stability.stable) {
      readinessState = "unstable";
      blockingReasons.push(`伴随矩阵最大根模 ${result.diagnostics.stability.max_root_modulus} ≥ 1`);
    } else if (residualFailed || borderlineStationarity) {
      readinessState = "ready_with_warning";
      if (residualFailed) blockingReasons.push(`残差自相关诊断未通过（p=${result.diagnostics.residual_autocorrelation.p_value}），动态响应输出被门控`);
      if (borderlineStationarity) blockingReasons.push("至少一个变换后序列 ADF 结果为 borderline / not_tested，解释时须谨慎");
    }
    readinessRecords.push({
      country,
      variables,
      start_period: result.sample.start_period,
      end_period: result.sample.end_period,
      effective_observations: result.sample.effective_observations,
      missing_ratio: Number((result.sample.dropped_periods.length / (result.sample.dropped_periods.length + result.sample.effective_observations)).toFixed(4)),
      stationarity_status: stationarityDetail.every((entry) => entry.adf.status === "stationary") ? "stationary" : stationarityDetail.some((entry) => entry.adf.status === "non_stationary") ? "non_stationary" : "borderline",
      stationarity_detail: stationarityDetail,
      lag_selection_status: "completed",
      selected_lag: result.selected_lag,
      stability_status: result.diagnostics.stability.stable ? "stable" : "unstable",
      residual_status: result.diagnostics.residual_autocorrelation.status,
      irf_available: result.irf !== null,
      readiness_state: readinessState,
      blocking_reasons: blockingReasons,
    });
    modelRegistryRecords.push({
      platform_version: release.version,
      engine_version: VAR_ENGINE_VERSION,
      dataset_version: VAR_DATASET_VERSION,
      stationarity_engine_version: STATIONARITY_ENGINE_VERSION,
      result,
    });
  } else {
    const stateByReason = {
      insufficient_observations: "insufficient_observations",
      missing_data: "missing_data",
      non_stationary: "non_stationary",
      unstable: "unstable",
      diagnostics_failed: "diagnostics_failed",
      unsupported_specification: "unsupported_specification",
      singular: "unsupported_specification",
    };
    readinessRecords.push({
      country,
      variables,
      start_period: null,
      end_period: null,
      effective_observations: 0,
      missing_ratio: null,
      stationarity_status: stationarityDetail.some((entry) => entry.adf.status === "non_stationary") ? "non_stationary" : stationarityDetail.length ? "stationary" : "not_tested",
      stationarity_detail: stationarityDetail,
      lag_selection_status: "not_run",
      selected_lag: null,
      stability_status: "not_run",
      residual_status: "not_run",
      irf_available: false,
      readiness_state: stateByReason[outcome.reason_code] ?? "unsupported_specification",
      blocking_reasons: outcome.reasons,
    });
  }
}

const outDir = path.join(root, "src", "data", "macro");
fs.mkdirSync(outDir, { recursive: true });
const publicDir = path.join(root, "public", "research-data");
fs.mkdirSync(publicDir, { recursive: true });

const write = (name, payload, toPublic) => {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(payload, null, 2));
  if (toPublic) fs.writeFileSync(path.join(publicDir, name), JSON.stringify(payload));
};

write("transformation_registry.json", {
  schema_version: TRANSFORM_REGISTRY_VERSION,
  generated_at: generatedAt,
  records: TIME_SERIES_TRANSFORMATION_REGISTRY,
  fallback_chains: VARIABLE_CHAINS,
  boundary: "Index levels never enter a stationary VAR as raw levels; rate series enter in level only after an explicit stationarity test. The applied transformation is always displayed.",
}, false);

write("stationarity_results.json", {
  schema_version: "stationarity-results-v1.4",
  engine_version: STATIONARITY_ENGINE_VERSION,
  generated_at: generatedAt,
  tests: { adf: "augmented Dickey-Fuller with constant, autolag AIC (statsmodels-faithful port)", kpss: kpssStatus() },
  record_count: stationarityRecords.length,
  records: stationarityRecords,
}, false);

write("lag_selection_registry.json", {
  schema_version: "lag-selection-registry-v1.4",
  generated_at: generatedAt,
  default_criterion: "bic",
  note: "Common effective sample per candidate lag; AIC / BIC / HQIC reported for every candidate; BIC is the default for the current sample sizes.",
  record_count: lagSelectionRecords.length,
  records: lagSelectionRecords,
}, false);

write("var_country_readiness.json", {
  schema_version: "var-country-readiness-v1.4",
  generated_at: generatedAt,
  readiness_unit: "country × variable set × sample window × transformation specification",
  default_variable_set: DEFAULT_VARIABLE_SET,
  fallback_chains: VARIABLE_CHAINS,
  ready_countries: readinessRecords.filter((record) => record.readiness_state === "ready" || record.readiness_state === "ready_with_warning").map((record) => record.country),
  irf_ready_countries: readinessRecords.filter((record) => record.irf_available).map((record) => record.country),
  record_count: readinessRecords.length,
  records: readinessRecords,
}, true);

write("var_model_registry.json", {
  schema_version: "var-model-registry-v1.4",
  generated_at: generatedAt,
  note: "Canonical default-specification results for countries passing the full pipeline. IRF is the orthogonalized reduced-form (Cholesky) response; it depends on variable ordering and carries no structural interpretation.",
  record_count: modelRegistryRecords.length,
  records: modelRegistryRecords,
}, false);

console.log(`countries: ${COUNTRIES.length}; ready: ${readinessRecords.filter((record) => record.readiness_state === "ready").length}; ready_with_warning: ${readinessRecords.filter((record) => record.readiness_state === "ready_with_warning").length}; blocked: ${readinessRecords.filter((record) => !["ready", "ready_with_warning"].includes(record.readiness_state)).length}`);
for (const record of readinessRecords) {
  console.log(`  ${record.country}: ${record.readiness_state}${record.selected_lag !== null ? ` (lag ${record.selected_lag}, irf=${record.irf_available})` : ""} ${record.blocking_reasons[0] ?? ""}`);
}
