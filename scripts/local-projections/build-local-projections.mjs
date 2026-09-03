import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LP_ENGINE_VERSION, buildCommonHorizonRows, estimateLocalProjectionPath, selectLagAic } from "../../src/lib/localProjectionEngine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(root, "src/data/local-projections"); fs.mkdirSync(dir, { recursive: true });
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`);
const generatedAt = "2026-09-03"; const shockEnd = "2025-10"; const minimumN = 96;
const countries = ["austria", "germany", "slovakia", "slovenia", "croatia", "czechia", "hungary", "poland", "romania", "serbia"];
const nonEuro = new Set(["czechia", "hungary", "poland", "romania", "serbia"]);
const hf = read("src/data/high-frequency/high_frequency_observations.json").records;
const macro = read("src/data/macro-drivers/macro_driver_observations.json").records;
const mpRows = read("src/data/identified-shocks/ecb_pure_monetary_policy_shock_monthly.json").records;
const cbiRows = read("src/data/identified-shocks/ecb_central_bank_information_shock_monthly.json").records;
const shock = new Map(mpRows.map((row, i) => [row.period, { mp: row.value, cbi: cbiRows[i].value }]));

const outcomes = [
  { id: "hicp_price_level", source: "high_frequency", field: "hicp_monthly_index", response: "100 * [log(P[t+h]) - log(P[t-1])]", unit: "cumulative_percent", adjustment: "NSA", monthDummies: true, transform: (a, b) => 100 * Math.log(a / b) },
  { id: "industrial_production", source: "high_frequency", field: "industrial_production_index", response: "100 * [log(IPI[t+h]) - log(IPI[t-1])]", unit: "cumulative_percent", adjustment: "SCA", monthDummies: false, transform: (a, b) => 100 * Math.log(a / b) },
  { id: "unemployment", source: "high_frequency", field: "unemployment_rate_monthly", response: "U[t+h] - U[t-1]", unit: "percentage_points", adjustment: "SA", monthDummies: false, transform: (a, b) => a - b },
  { id: "long_term_yield", source: "macro_driver", field: "long_term_government_yield", response: "Yield[t+h] - Yield[t-1]", unit: "percentage_points", adjustment: "source_monthly", monthDummies: false, transform: (a, b) => a - b },
  { id: "bilateral_fx", source: "macro_driver", field: "bilateral_fx_local_per_eur", response: "100 * [log(FX[t+h]) - log(FX[t-1])]", unit: "percent; positive=local_currency_depreciation", adjustment: "monthly_average", monthDummies: false, nonEuroOnly: true, transform: (a, b) => 100 * Math.log(a / b) },
  { id: "domestic_policy_rate", source: "macro_driver", field: "policy_rate", response: "PolicyRate[t+h] - PolicyRate[t-1]", unit: "percentage_points", adjustment: "monthly_observation", monthDummies: false, nonEuroOnly: true, transform: (a, b) => a - b },
];
function sourceSeries(country, spec) {
  const rows = spec.source === "high_frequency" ? hf.filter((row) => row.country === country && row.indicator === spec.field) : macro.filter((row) => row.country === country && row.driver_id === spec.field && row.transformation === "level");
  return new Map(rows.map((row) => [row.period, row.value]));
}
function addMonth(period, amount) { const [y, m] = period.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + amount, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; }
function calendar(series) {
  const periods = [...series.keys()].sort(); if (!periods.length) return [];
  const rows = []; for (let p = periods[0]; p <= periods.at(-1); p = addMonth(p, 1)) rows.push({ period: p, outcome: series.get(p) ?? null, mp: shock.get(p)?.mp ?? null, cbi: shock.get(p)?.cbi ?? null }); return rows;
}
function interpretation(country, regime = null) { if (country === "croatia") return regime === "pre_2023" ? "external ECB monetary-policy spillover" : "common euro-area ECB monetary-policy shock"; return nonEuro.has(country) ? "external ECB monetary-policy shock / spillover" : "common euro-area ECB monetary-policy shock"; }

const readiness = []; const models = []; const results = []; const lagSelections = [];
for (const country of countries) for (const spec of outcomes) {
  if (spec.nonEuroOnly && !nonEuro.has(country)) continue;
  const series = sourceSeries(country, spec); const baseCalendar = calendar(series);
  const regimes = country === "croatia" ? [{ id: "pre_2023", start: "2015-01", end: "2022-12" }, { id: "post_2023", start: "2023-01", end: shockEnd }] : [{ id: "full", start: "2015-01", end: shockEnd }];
  for (const regime of regimes) {
    const seriesReady = baseCalendar.length > 0;
    let lag = null; let maximumHorizon = null; let common = null;
    if (seriesReady) {
      const lagData = baseCalendar.filter((row) => row.period >= regime.start && row.period <= regime.end);
      try { lag = selectLagAic(lagData, { maxLag: 6, monthDummies: spec.monthDummies }); lagSelections.push({ country, outcome: spec.id, regime: regime.id, criterion: "AIC", common_pre_estimation_sample: true, ...lag }); } catch { lag = null; }
      if (lag) for (const horizon of [24, 18, 12, 6]) {
        const candidate = buildCommonHorizonRows(baseCalendar, { horizon, lagOrder: lag.selectedLag, transform: spec.transform });
        candidate.commonIndices = candidate.commonIndices.filter((i) => candidate.values[i].period >= regime.start && candidate.values[i].period <= regime.end && candidate.values[i].period <= shockEnd);
        if (candidate.commonIndices.length >= minimumN) { maximumHorizon = horizon; common = candidate; break; }
      }
    }
    const ready = Boolean(lag && common && maximumHorizon !== null);
    const id = `lp:${country}:${spec.id}:${regime.id}:jk_joint:h${maximumHorizon ?? "unavailable"}`;
    const sampleStart = ready ? common.values[common.commonIndices[0]].period : null; const sampleEnd = ready ? common.values[common.commonIndices.at(-1)].period : null;
    readiness.push({ readiness_id: id, shocks: ["ecb_pure_monetary_policy_shock_jk_median_v1", "ecb_central_bank_information_shock_jk_median_v1"], identification_status: "identified_shock", shock_scope: interpretation(country, regime.id), country, outcome: spec.id, regime: regime.id, requested_horizon: 24, maximum_eligible_horizon: maximumHorizon, control_profile: "formal_baseline", shock_identification_ready: true, shock_applicability_ready: country !== "croatia" || regime.id !== "full", outcome_definition_ready: true, outcome_data_ready: seriesReady, sample_ready: ready, lag_policy_ready: Boolean(lag), estimator_ready: ready, estimator_validated: true, inference_validated: true, baseline_estimation_ready: ready, pointwise_inference_ready: ready, path_inference_ready: ready, robustness_diagnostics_ready: ready, causal_lp_ready: ready, effective_n: ready ? common.commonIndices.length : 0, sample_start: sampleStart, sample_end: sampleEnd, blockers: ready ? [] : [country === "croatia" ? "monetary-regime-specific sample does not meet minimum observation gate" : !seriesReady ? "official outcome coverage unavailable" : "fewer than 96 usable observations after horizon/lag/missing trimming"] });
    if (!ready) continue;
    const pathEstimate = estimateLocalProjectionPath(common, { maximumHorizon, lagOrder: lag.selectedLag, monthDummies: spec.monthDummies, drawCount: 5000, seed: 1710 + models.length * 2 });
    if (pathEstimate.design.numerically_singular) throw new Error(`${id}: numerically singular design matrix`);
    const horizons = pathEstimate.horizons;
    const trace = { engine_version: LP_ENGINE_VERSION, shock_ids: ["ecb_pure_monetary_policy_shock_jk_median_v1", "ecb_central_bank_information_shock_jk_median_v1"], shock_version: "v1.62 frozen author-reference median decomposition", country, outcome_id: spec.id, outcome_transformation: spec.response, response_unit: spec.unit, country_shock_interpretation: interpretation(country, regime.id), sample_policy: "common_horizon_sample", lag_policy: "AIC once on common pre-estimation sample; candidate 1..6; production LP uses p actual lag blocks", control_profile: "constant + contemporaneous MP/CBI + p lags of outcome/MP/CBI" + (spec.monthDummies ? " + 11 month dummies" : ""), inference_method: "EHW HC1 pointwise plus plug-in Gaussian sup-t simultaneous path band; no HAC", shock_normalization: 0.25, author_commit: "f7ffc821b0ade71dd38539e4044e25368dfb4dc1", lp_reference_repository: "jm4474/Lag-augmented_LocalProjections", lp_reference_commit: "02e8e65396f2c06d2c87879bbc5c2162863b907f", simultaneous_reference_repository: "jm4474/Confidence_Bands", simultaneous_reference_commit: "6cf28bbd63313ead3c06904649dbb0766e51028a", shock_end: shockEnd };
    const lagMetadata = { selected_base_lag_order: lag.selectedLag, lp_lag_count: lag.selectedLag, augmentation_relative_to_nonaugmented_lp: 1 };
    const supT = { method: "plug-in Gaussian sup-t using cross-horizon joint HC1 covariance", draw_count: 5000, mp_seed: pathEstimate.joint.mp.seed, cbi_seed: pathEstimate.joint.cbi.seed, mp_critical_value_95: pathEstimate.joint.mp.criticalValue95, cbi_critical_value_95: pathEstimate.joint.cbi.criticalValue95 };
    models.push({ model_id: id, ...trace, maximum_horizon: maximumHorizon, ...lagMetadata, effective_n: common.commonIndices.length, sample_start: sampleStart, sample_end: sampleEnd, confidence_intervals: "90% and 95% pointwise; 95% simultaneous sup-t", simultaneous_inference: supT, design_diagnostics: pathEstimate.design });
    results.push({ model_id: id, ...trace, maximum_horizon: maximumHorizon, ...lagMetadata, effective_n: common.commonIndices.length, sample_start: sampleStart, sample_end: sampleEnd, simultaneous_inference: supT, horizons });
  }
}

const legacy = read("src/data/macro-drivers/lp_readiness_registry.json").records.filter((row) => !String(row.readiness_id).includes(":jk_joint:"));
const legacyNormalized = legacy.map((row) => ({ ...row, estimator_ready: false, estimator_validated: false, inference_validated: false, baseline_estimation_ready: false, pointwise_inference_ready: false, path_inference_ready: false, robustness_diagnostics_ready: false, causal_lp_ready: false, blockers: [...new Set((row.blockers ?? []).map((value) => value.replace("Local Projections estimator is not activated in v1.51", "not an identified JK shock under the v1.71 formal LP profile")))] }));
const readinessPayload = { schema_version: "lp-readiness-registry-v1.71", generated_at: generatedAt, method_state: readiness.some((row) => row.causal_lp_ready) ? "active" : "registry_only", readiness_unit: "joint JK shock pair × outcome × country × regime × control profile × maximum horizon", minimum_usable_observations: minimumN, formal_record_count: readiness.length, legacy_record_count: legacyNormalized.length, shock_identification_ready_count: readiness.filter((row) => row.shock_identification_ready).length, sample_ready_count: readiness.filter((row) => row.sample_ready).length, estimator_ready_count: readiness.filter((row) => row.estimator_ready).length, causal_lp_ready_count: readiness.filter((row) => row.causal_lp_ready).length, path_inference_ready_count: readiness.filter((row) => row.path_inference_ready).length, robustness_diagnostics_ready_count: readiness.filter((row) => row.robustness_diagnostics_ready).length, records: [...readiness, ...legacyNormalized] };
write("lp_reference_manifest.json", { schema_version: "lp-reference-manifest-v1.71", generated_at: generatedAt, repository: "jm4474/Lag-augmented_LocalProjections", repository_url: "https://github.com/jm4474/Lag-augmented_LocalProjections", pinned_commit: "02e8e65396f2c06d2c87879bbc5c2162863b907f", commit_date: "2022-12-21T00:46:04Z", latest_commit_at_retrieval: "02e8e65396f2c06d2c87879bbc5c2162863b907f", newer_commit_detected: false, license: "MIT", files_sha256: { "README.md": "86b6fc57233d1c79a626b99af3dc369d2bb75e50ffcfbc8df74df56e77987abe", "LICENSE": "fa13b6927d93a253b28506e0692e17dad33c3f3035ef2fea9a6f04a45ed0b6b5", "functions/ir_estim.m": "50235300c3b84ad39d6577900eae39be52498d3daeed3ab92490fa6bbd3bf753", "functions/lp.m": "e4afccf8dd5949a6e22224291ffec85c73fdb46e9abe0481b6da9546d923509a", "functions/linreg.m": "870b3322efc5858491af3ba7e9752d7218009242cccc9178be3ebc74b93dba32", "functions/ewc.m": "c9608921da0ea8a32565230dc2762bfb2ad27a1b7abb774044b3fce162ce4da7" }, implementation_audit: "ir_estim.m passes p-1+lag_aug lags into lp.m; with lag_aug=true, the base order p therefore yields contemporaneous regressors plus p full lags. Primary delta-method inference uses EHW with HC1 finite-sample adjustment and normal critical values; no HAC required." });
write("lp_specification_registry.json", { schema_version: "lp-specification-registry-v1.71", generated_at: generatedAt, engine_version: LP_ENGINE_VERSION, estimation_unit: "single country × outcome × joint JK shock pair × specification", joint_shocks: true, panel_lp: false, pooled_lp: false, state_dependent_lp: false, baseline_equation: "cumulative/level response at h on contemporaneous MP_t and CBI_t, p actual lags of outcome/MP/CBI, deterministics", frozen_shock_construction: true });
write("lp_outcome_specification_registry.json", { schema_version: "lp-outcome-specification-registry-v1.71", generated_at: generatedAt, records: outcomes.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "transform"))) });
write("lp_sample_policy_registry.json", { schema_version: "lp-sample-policy-registry-v1.71", generated_at: generatedAt, shock_end: shockEnd, candidate_horizons: [24, 18, 12, 6], common_horizon_sample: true, sensitivity_comparison_common_sample: true, minimum_usable_observations: minimumN, no_event_shock_value: 0, meeting_month_selection: false, horizon_fallback_must_be_reported: true });
write("lp_lag_policy_registry.json", { schema_version: "lp-lag-policy-registry-v1.71", generated_at: generatedAt, baseline: { candidate_lags: [1,2,3,4,5,6], criterion: "AIC", selection_frequency: "once per country × outcome × regime on a common pre-estimation sample", horizon_specific_selection: false, selected_base_lag_order_definition: "VAR base order p before LP augmentation", lp_lag_count_definition: "actual lag blocks used by the production LP", nonaugmented_lp_lag_count: "p-1", lag_augmented_lp_lag_count: "p", augmentation_relative_to_nonaugmented_lp: 1, removed_misleading_field: "lag_augmented_order=p+1" }, sensitivity: [{ profile: "fixed_p2", lag: 2, state: "active_sensitivity_only" }, { profile: "fixed_p6", lag: 6, state: "active_sensitivity_only" }] , selections: lagSelections.map((row) => ({ ...row, selected_base_lag_order: row.selectedLag, lp_lag_count: row.selectedLag, augmentation_relative_to_nonaugmented_lp: 1 })) });
write("lp_control_profile_registry.json", { schema_version: "lp-control-profile-registry-v1.71", generated_at: generatedAt, records: [{ profile_id: "formal_baseline", state: "active", controls: ["constant", "MP_t", "CBI_t", "p lags of outcome, MP and CBI"], hicp_addition: "11 month-of-year dummies", contemporaneous_mediators_excluded: ["domestic policy rate", "FX", "bond yield", "energy price"] }, { profile_id: "predetermined_external_controls_v1", state: "active_sensitivity_only", control_lag_count: "selected base p", lagged_controls: ["Brent", "European gas", "domestic policy rate for non-euro countries"], contemporaneous_controls: [], baseline_replacement_allowed: false }] });
write("lp_readiness_registry.json", readinessPayload); write("lp_model_registry.json", { schema_version: "lp-model-registry-v1.71", generated_at: generatedAt, record_count: models.length, records: models }); write("lp_results.json", { schema_version: "lp-results-v1.71", generated_at: generatedAt, model_count: results.length, horizon_record_count: results.reduce((s, row) => s + row.horizons.length, 0), records: results });
fs.writeFileSync(path.join(root, "src/data/macro-drivers/lp_readiness_registry.json"), `${JSON.stringify(readinessPayload, null, 2)}\n`);
const skillsPath = path.join(root, "src/data/analysis/analysis_skill_registry.json");
const skills = read("src/data/analysis/analysis_skill_registry.json");
skills.schema_version = "analysis-skill-registry-v1.71"; skills.generated_at = generatedAt;
skills.records = skills.records.map((row) => row.skill_id === "local_projections" ? { ...row, state: "active", gate: "identified joint JK shocks + applicable country/outcome + common-horizon N >= 96 + validated lag-augmented estimator and path inference", readiness_reference: "local-projections/lp_readiness_registry.json", note: "Single-country baseline active; pointwise HC1 and validated 95% plug-in sup-t path uncertainty active; sensitivities are not replacement baselines; no panel LP or state dependence." } : row.skill_id === "monetary_policy_identification" ? { ...row, note: "Median decomposition remains author-reference validated; v1.71 does not re-estimate the frozen JK shocks." } : row);
fs.writeFileSync(skillsPath, `${JSON.stringify(skills, null, 2)}\n`);
console.log(`v1.71 LP build: formal=${readiness.length}; causal_ready=${readinessPayload.causal_lp_ready_count}; path_ready=${readinessPayload.path_inference_ready_count}; models=${models.length}; horizons=${results.reduce((s,r)=>s+r.horizons.length,0)}.`);
