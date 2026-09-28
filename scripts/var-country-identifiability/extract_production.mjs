// v1.88 Phase A, Node stage: rebuild each preregistered unit through the production VAR pipeline and record the
// production BIC grid, estimates, stability and h=12 Portmanteau. Writes a working file outside the repository.
// Usage: node extract_production.mjs <output.json>
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { createHash } from "node:crypto";
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
const { runReducedFormVar, selectVarLagOrder, estimateVarModel, varStability, portmanteauTest, maximumAllowedVarLag } = require("../../src/lib/varEngine.ts");
const { BASELINE_VAR_PROFILE, BASELINE_VAR_PROFILE_V2 } = require("../../src/lib/varSpecifications.ts");

const read = (relative) => fs.readFileSync(path.join(root, relative));
const sha = (relative) => createHash("sha256").update(read(relative)).digest("hex");
const design = JSON.parse(read("src/data/macro/var_country_lag_identifiability_design.json"));
for (const [file, expected] of Object.entries(design.frozen_input_sha256)) if (sha(file) !== expected) throw new Error(`frozen input changed: ${file}`);

const hf = JSON.parse(read("src/data/high-frequency/high_frequency_observations.json"));
const seriesByIndicator = new Map();
for (const record of hf.records) {
  const list = seriesByIndicator.get(record.indicator) ?? [];
  list.push({ observation_id: record.observation_id, country: record.country, period: record.period, indicator: record.indicator, value: record.value, transformation: record.transformation, unit: record.unit, value_semantics: record.value_semantics });
  seriesByIndicator.set(record.indicator, list);
}
const profiles = { [BASELINE_VAR_PROFILE.profile_id]: BASELINE_VAR_PROFILE, [BASELINE_VAR_PROFILE_V2.profile_id]: BASELINE_VAR_PROFILE_V2 };

const fitRecord = (data, lag, det, periods) => {
  const estimate = estimateVarModel(data, lag, det, periods);
  const stability = varStability(estimate.coefficientMatrices);
  return { lag, params: estimate.params, resid: estimate.resid, sigma_u: estimate.sigma_u, sigma_u_mle: estimate.sigma_u_mle, nobs: estimate.nobs,
    coefficient_matrices: estimate.coefficientMatrices, stability: { stable: stability.stable, max_root_modulus: stability.max_root_modulus }, portmanteau_h12: portmanteauTest(estimate.resid, lag, 12) };
};

const units = design.units.map((unit) => {
  const profile = profiles[unit.profile_id];
  const outcome = runReducedFormVar({ country: unit.country, variables: unit.variables, start_period: profile.sample_policy.start_period, end_period: "2026-06",
    ic_criterion: profile.lag_policy.criterion, max_lag: profile.lag_policy.max_lag, deterministic_terms: profile.deterministic_terms,
    stationarity_specification_id: profile.stationarity_specification_id, profile_id: profile.profile_id, specification_kind: "baseline_prespecified" }, seriesByIndicator);
  if (outcome.status !== "ok") return { unit_id: unit.unit_id, state: "audit_unavailable", reason: outcome.reason_code, reasons: outcome.reasons };
  const r = outcome.result;
  const sample = r.sample;
  if (sample.start_period !== unit.start_period || sample.end_period !== unit.end_period || sample.effective_observations !== unit.effective_observations) {
    return { unit_id: unit.unit_id, state: "audit_unavailable", reason: "sample_mismatch_with_preregistration", production_sample: sample };
  }
  const maps = r.input_series.map((series) => new Map(series.points.map((point) => [point.period, point.value])));
  const periods = [];
  for (const point of r.input_series[0].points) if (point.period >= sample.start_period && point.period <= sample.end_period && maps.every((m) => m.get(point.period) !== undefined && m.get(point.period) !== null)) periods.push(point.period);
  const data = periods.map((period) => maps.map((m) => m.get(period)));
  const det = profile.deterministic_terms;
  const maxLag = Math.max(1, Math.min(profile.lag_policy.max_lag, maximumAllowedVarLag(data.length, data[0].length)));
  const candidates = selectVarLagOrder(data, maxLag, det, periods);
  const selected = candidates.reduce((best, c) => (c.bic < best.bic ? c : best), candidates[0]).lag;
  const productionGridBic = r.lag_diagnostic_grid.map((row) => row.bic);
  const lags = [...new Set([1, 2, selected])].sort((a, b) => a - b);
  return {
    unit_id: unit.unit_id, state: "ok", country: unit.country, profile_id: unit.profile_id, deterministic_terms: det, periods, data,
    max_lag: maxLag, bic_grid: candidates.map((c) => ({ lag: c.lag, bic: c.bic, nobs: c.nobs, free_parameters: c.free_parameters })),
    selected_lag: selected, production_run_selected_lag: r.selected_lag, production_run_bic_grid: productionGridBic,
    production_parameter_gate: r.parameter_gate,
    fits: Object.fromEntries(lags.map((lag) => [String(lag), fitRecord(data, lag, det, periods)])),
  };
});
fs.writeFileSync(process.argv[2], JSON.stringify({ schema_version: "var-country-identifiability-production-extract-v1.88", design_sha256: sha("src/data/macro/var_country_lag_identifiability_design.json"), varengine_sha256: sha("src/lib/varEngine.ts"), units }));
console.log(JSON.stringify(units.map((u) => ({ unit: u.unit_id, state: u.state, T: u.periods?.length }))));
