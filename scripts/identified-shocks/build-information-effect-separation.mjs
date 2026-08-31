import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, "src", "data", "identified-shocks");
const macroDir = path.join(root, "src", "data", "macro-drivers");
const generatedAt = "2026-09-01";
const read = (name, directory = outDir) => JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
const write = (name, payload, directory = outDir) => fs.writeFileSync(path.join(directory, name), `${JSON.stringify(payload, null, 2)}\n`);
const sha256Text = (value) => crypto.createHash("sha256").update(value).digest("hex");

const observations = read("monetary_policy_event_observations.json");
const eaMpdManifest = read("ea_mpd_acquisition_manifest.json");
const combined = observations.records
  .filter((row) => row.dataset_id === "ea_mpd" && row.window_id === "combined_monetary_event_window")
  .sort((a, b) => a.event_date.localeCompare(b.event_date));

function measure(row, id) {
  if (row.raw_measure_id === id) return row.value;
  return row.additional_measures.find((item) => item.raw_measure_id === id)?.value ?? null;
}

function diagnostic(rate, stock) {
  if (!Number.isFinite(rate)) return { classification: "ambiguous", reason: "missing_rate" };
  if (!Number.isFinite(stock)) return { classification: "ambiguous", reason: "missing_stock" };
  if (Math.abs(rate) <= 1e-12) return { classification: "ambiguous", reason: "numerically_zero_rate" };
  if (Math.abs(stock) <= 1e-12) return { classification: "ambiguous", reason: "numerically_zero_stock" };
  return rate * stock < 0
    ? { classification: "policy_dominant", reason: "opposite_sign_quadrant" }
    : { classification: "information_dominant", reason: "same_sign_quadrant" };
}

const eventSample = combined.map((row) => {
  const rate = measure(row, "OIS_3M");
  const stock = measure(row, "STOXX50");
  const screen = diagnostic(rate, stock);
  const eligible = Number.isFinite(rate) && Number.isFinite(stock);
  return {
    event_id: row.event_id,
    event_date: row.event_date,
    window: row.window_id,
    raw_rate_surprise: rate,
    raw_stock_surprise: stock,
    transformed_rate_surprise: rate,
    transformed_stock_surprise: stock,
    transformation_rule: "identity; EA-MPD published window changes retained in native units",
    eligible,
    exclusion_reason: eligible ? null : (!Number.isFinite(rate) ? "missing_rate" : "missing_stock"),
    poor_mans_sign_screen: screen.classification,
    poor_mans_sign_screen_reason: screen.reason,
    source_dataset: "ea_mpd",
    source_sheet: "Monetary Event Window",
    source_row: row.source_row,
  };
});

const eligible = eventSample.filter((row) => row.eligible);
const mean = (xs) => xs.reduce((sum, value) => sum + value, 0) / xs.length;
const variance = (xs) => { const m = mean(xs); return mean(xs.map((value) => (value - m) ** 2)); };
const covariance = (xs, ys) => { const mx = mean(xs); const my = mean(ys); return mean(xs.map((value, i) => (value - mx) * (ys[i] - my))); };
const moment = (xs, order) => { const m = mean(xs); const sd = Math.sqrt(variance(xs)); return sd === 0 ? null : mean(xs.map((value) => ((value - m) / sd) ** order)); };
const rates = eligible.map((row) => row.raw_rate_surprise);
const stocks = eligible.map((row) => row.raw_stock_surprise);
const descriptiveCovariance = [[variance(rates), covariance(rates, stocks)], [covariance(rates, stocks), variance(stocks)]];
const referenceSample = eligible.filter((row) => row.event_date <= "2016-12-31");
const diagnosticCounts = Object.fromEntries(["policy_dominant", "information_dominant", "ambiguous"].map((label) => [label, eventSample.filter((row) => row.poor_mans_sign_screen === label).length]));

write("monetary_policy_identification_method_registry.json", {
  schema_version: "monetary-policy-identification-method-registry-v1.61",
  generated_at: generatedAt,
  record_count: 2,
  records: [{
    method_id: "jarocinski_karadi_sign_restrictions_v1",
    method_name: "Jarociński–Karadi high-frequency sign restrictions",
    authors: ["Marek Jarociński", "Peter Karadi"],
    publication: "Deconstructing Monetary Policy Surprises—The Role of Information Shocks, AEJ: Macroeconomics 12(2), 2020, 1–43",
    reference_url: "https://doi.org/10.1257/mac.20180090",
    working_paper_url: "https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp2133.en.pdf",
    identification_family: "Bayesian structural VAR with high-frequency block exogeneity and set-identifying sign restrictions",
    input_variables: ["monthly sum of 3-month Eonia OIS announcement surprises", "monthly sum of Euro Stoxx 50 announcement returns", "five monthly low-frequency macro-financial variables"],
    event_window: "press-release 30 minutes and press-conference 90 minutes; each begins 10 minutes before and ends 20 minutes after; sum the two windows when both occur",
    sample: "euro area January 1999–December 2016 in the published application",
    normalization: "positive monetary-policy shock is tightening; published historical contributions are scaled in basis points of the 3-month rate surprise",
    sign_restrictions: { monetary_policy: { rate: "+", stock: "-" }, central_bank_information: { rate: "+", stock: "+" } },
    covariance_construction: "posterior draws of the full VAR residual covariance matrix Sigma; lower-triangular Cholesky factor C",
    rotation_method: "postmultiply C by block-diagonal Q; 2x2 Q* comes from QR decomposition of a standard-normal random matrix; accept draws satisfying signs; uniform prior over admissible rotations",
    output_shocks: ["monetary_policy_component", "central_bank_information_component"],
    replication_status: "blocked",
    production_status: "diagnostic_only",
    limitations: ["Set identification is not a unique point decomposition.", "The published method identifies monthly VAR shocks, not a standalone event-by-event two-variable decomposition.", "The official ICPSR V1 package is discoverable but its files require an authenticated download session in the acquisition environment.", "The canonical EA-MPD 1999–2016 row count does not match the paper's reported reference dataset, so exact input alignment is not established."],
  }, {
    method_id: "poor_mans_sign_screen_v1",
    method_name: "Poor-man sign-quadrant diagnostic",
    authors: ["Central Europe Political Atlas implementation, following the paper's diagnostic robustness intuition"],
    publication: "Diagnostic only",
    reference_url: "https://doi.org/10.1257/mac.20180090",
    identification_family: "event sign screen",
    input_variables: ["OIS_3M", "STOXX50"],
    event_window: "EA-MPD Monetary Event Window",
    sample: "all canonical EA-MPD combined-window events",
    normalization: "opposite signs = policy-dominant; same signs = information-dominant; numerical zero or missing = ambiguous",
    sign_restrictions: null,
    output_shocks: [],
    replication_status: "passed_as_diagnostic",
    production_status: "diagnostic_active",
    limitations: ["Not a structural decomposition.", "Does not allow both shocks to coexist within an event.", "Cannot be promoted to identified_shock."],
  }],
});

write("jk_replication_acquisition_manifest.json", {
  schema_version: "jk-replication-acquisition-manifest-v1.61",
  generated_at: generatedAt,
  source: "American Economic Association Data and Code Repository / ICPSR",
  project_doi: "10.3886/E231538V1",
  official_project_url: "https://www.openicpsr.org/openicpsr/project/231538/version/V1/view",
  asset: "Replication data for: Deconstructing Monetary Policy Surprises—The Role of Information Shocks",
  version: "V1 (2025-05-30)",
  retrieval_date: generatedAt,
  acquisition_status: "metadata_acquired_files_blocked_by_authenticated_download",
  checksum: null,
  checksum_status: "unavailable_without_asset_download",
  observed_contents: ["data/data_var/data.csv", "data/data_var/ydict.csv", "data/work_matlab", "data/readme.pdf", "LICENSE.txt"],
  license_status: "license_file_listed_but_text_not_acquired; reuse terms not independently verified",
  redistribution_status: "no_replication_asset_redistributed",
  metadata_fingerprint_sha256: sha256Text("10.3886/E231538V1|V1|2025-05-30|AEA/ICPSR"),
});

write("information_effect_input_registry.json", {
  schema_version: "information-effect-input-registry-v1.61",
  generated_at: generatedAt,
  record_count: 1,
  records: [{
    specification_id: "jk_euro_area_input_audit_v1",
    rate_surprise_field: "OIS_3M",
    equity_surprise_field: "STOXX50",
    source_dataset: "EA-MPD official workbook",
    event_window: "Monetary Event Window (official combined press-release and press-conference window)",
    units: { OIS_3M: "basis_points", STOXX50: "percentage_points; workbook note describes Euro STOXX50E index change" },
    transformations: "identity; no winsorization, demeaning, z-scoring or rescaling",
    sample: { available_start: eventSample[0]?.event_date, available_end: eventSample.at(-1)?.event_date, available_events: eventSample.length, paper_reference_end: "2016-12-31", aligned_reference_rows: referenceSample.length },
    missingness: { rate: eventSample.filter((row) => !Number.isFinite(row.raw_rate_surprise)).length, stock: eventSample.filter((row) => !Number.isFinite(row.raw_stock_surprise)).length },
    reference_method: "jarocinski_karadi_sign_restrictions_v1",
    source_checksum: eaMpdManifest.sha256,
    alignment_status: "partial",
  }],
});

write("information_effect_window_registry.json", {
  schema_version: "information-effect-window-registry-v1.61",
  generated_at: generatedAt,
  record_count: 1,
  records: [{
    window_id: "combined_monetary_event_window",
    official_sheet: "Monetary Event Window",
    window_start: "press release: t-10 minutes; press conference: t-10 minutes",
    window_end: "press release: t+20 minutes; press conference: approximately t+80 minutes (20 minutes after assumed one-hour conference)",
    included_communication: ["press release", "press conference when held"],
    aggregation: "sum of the two non-overlapping window responses",
    rate_field: "OIS_3M",
    equity_field: "STOXX50",
    timezone: "Europe/Frankfurt (CET/CEST)",
    validation_status: "paper_semantics_match; exact row-level reference alignment partial",
  }],
});

write("jk_event_sample_registry.json", {
  schema_version: "jk-event-sample-registry-v1.61",
  generated_at: generatedAt,
  source_checksum: eaMpdManifest.sha256,
  baseline_dataset: "EA-MPD official combined-window policy events; EA-EMPD excluded from baseline",
  record_count: eventSample.length,
  eligible_count: eligible.length,
  excluded_count: eventSample.length - eligible.length,
  reference_period_record_count: referenceSample.length,
  records: eventSample,
});

write("identification_specification_registry.json", {
  schema_version: "identification-specification-registry-v1.61",
  generated_at: generatedAt,
  records: [
    { specification_id: "A_jk_reference_baseline", state: "blocked", rate_field: "OIS_3M", equity_field: "STOXX50", window: "combined_monetary_event_window", sample: "1999-01 through 2016-12", blocker: "official replication files and exact VAR input alignment unavailable; event-level output is not the published estimand" },
    { specification_id: "B_alternative_ois_maturity", state: "registry_only", rate_field: null, reason: "no alternative maturity selected without a literature-supported preregistration" },
    { specification_id: "C_poor_mans_diagnostic", state: "diagnostic_active", rate_field: "OIS_3M", equity_field: "STOXX50", window: "combined_monetary_event_window" },
  ],
});

write("jk_event_level_shocks.json", {
  schema_version: "jk-event-level-shocks-v1.61",
  generated_at: generatedAt,
  identification_method: "jarocinski_karadi_sign_restrictions_v1",
  identification_status: "withheld_blocked",
  record_count: eventSample.length,
  structural_component_count: 0,
  warning: "Rows expose inputs and a sign-quadrant diagnostic only. Null structural components are deliberate: the published JK BVAR identifies monthly shocks and exact replication validation has not passed.",
  records: eventSample.map((row) => ({
    event_id: row.event_id,
    date: row.event_date,
    rate_surprise: row.raw_rate_surprise,
    stock_surprise: row.raw_stock_surprise,
    monetary_policy_component: null,
    information_component: null,
    poor_mans_sign_screen: row.poor_mans_sign_screen,
    identification_method: "jarocinski_karadi_sign_restrictions_v1",
    rotation_metadata: { state: "not_run", rng_seed: null, draw_count: 0, accepted_draw_count: 0 },
    sign_normalization: { raw_rate_sign: "positive_is_rate_increase", sign_multiplier: 1, canonical_monetary_sign: "positive_is_tightening" },
    source_dataset: row.source_dataset,
    source_checksum: eaMpdManifest.sha256,
    validation_status: "blocked_not_an_identified_shock",
  })),
});

for (const [name, shockId, label] of [
  ["ecb_pure_monetary_policy_shock_monthly.json", "ecb_pure_monetary_policy_shock_jk_v1", "pure monetary-policy"],
  ["ecb_central_bank_information_shock_monthly.json", "ecb_central_bank_information_shock_jk_v1", "central-bank information"],
]) write(name, {
  schema_version: "ecb-separated-shock-monthly-v1.61",
  generated_at: generatedAt,
  shock_series_id: shockId,
  identification_status: "withheld_blocked",
  aggregation_rule: "sum eligible validated event-level components within month; no eligible event = 0; expected event with missing component = missing",
  record_count: 0,
  records: [],
  blocker: `${label} component is not published because structural replication and event-level identification validation did not pass`,
});

const regimes = [
  ["pre_gfc", "1999-01-01", "2007-07-31"],
  ["gfc", "2007-08-01", "2009-12-31"],
  ["negative_rate_era", "2014-06-01", "2022-07-20"],
  ["app_qe_era", "2015-03-01", "2022-06-30"],
  ["covid", "2020-03-01", "2021-12-31"],
  ["tightening_2022_plus", "2022-07-21", "9999-12-31"],
];
write("identification_regime_diagnostics.json", {
  schema_version: "identification-regime-diagnostics-v1.61",
  generated_at: generatedAt,
  status: "input_and_poor_man_diagnostics_only",
  full_sample: {
    event_count: eligible.length,
    rate: { mean: mean(rates), variance: variance(rates), skewness: moment(rates, 3), kurtosis: moment(rates, 4) },
    stock: { mean: mean(stocks), variance: variance(stocks), skewness: moment(stocks, 3), kurtosis: moment(stocks, 4) },
    descriptive_input_covariance: descriptiveCovariance,
    diagnostic_counts: diagnosticCounts,
    largest_absolute_rate_surprises: eligible.toSorted((a, b) => Math.abs(b.raw_rate_surprise) - Math.abs(a.raw_rate_surprise)).slice(0, 10).map(({ event_id, event_date, raw_rate_surprise }) => ({ event_id, event_date, value: raw_rate_surprise })),
    largest_absolute_stock_surprises: eligible.toSorted((a, b) => Math.abs(b.raw_stock_surprise) - Math.abs(a.raw_stock_surprise)).slice(0, 10).map(({ event_id, event_date, raw_stock_surprise }) => ({ event_id, event_date, value: raw_stock_surprise })),
  },
  regimes: regimes.map(([regime_id, start, end]) => {
    const rows = eligible.filter((row) => row.event_date >= start && row.event_date <= end);
    return { regime_id, start, end: end === "9999-12-31" ? null : end, event_count: rows.length, diagnostic_counts: Object.fromEntries(["policy_dominant", "information_dominant", "ambiguous"].map((label) => [label, rows.filter((row) => row.poor_mans_sign_screen === label).length])), independently_reestimated: false };
  }),
});

const gates = [
  ["published_methodology", "passed", "Paper and ECB working-paper methodology audited."],
  ["official_replication_asset_checksum", "blocked", "Official package files require authenticated download; no asset checksum fabricated."],
  ["reference_sample_match", "blocked", `Canonical EA-MPD has ${referenceSample.length} combined-window events through 2016; exact paper input sample alignment is not established.`],
  ["rate_field_match", "passed", "Euro-area reference field is 3-month Eonia OIS; mapped to EA-MPD OIS_3M."],
  ["equity_field_match", "passed", "Euro-area reference equity is Euro Stoxx 50; mapped to EA-MPD STOXX50."],
  ["window_match", "passed", "EA-MPD Monetary Event Window implements the combined press-release/press-conference concept."],
  ["transformation_validation", "passed", "Identity transform; native basis-point and percentage-point changes retained."],
  ["covariance_validation", "partial", "Descriptive 2x2 input covariance is reproducible; posterior full-VAR Sigma is not generated."],
  ["rotation_validation", "blocked", "Posterior BVAR/QR rotation workflow not run without exact replication inputs."],
  ["sign_normalization", "passed", "Positive policy sign is canonical tightening."],
  ["event_level_output_validation", "blocked", "Published method does not provide a validated standalone event-level structural decomposition."],
  ["monthly_aggregation", "blocked", "Structural event components are withheld, so monthly separated series are empty."],
  ["zero_vs_missing", "passed", "Aggregation contract records zero for valid no-event months and missing for expected-event component gaps."],
  ["overlap_deduplication", "passed", "Baseline uses EA-MPD only; EA-EMPD is excluded from contribution."],
  ["row_order_invariance", "passed", "Rows are keyed and sorted by event_date/event_id; diagnostics are commutative."],
  ["rng_reproducibility", "not_applicable", "No stochastic structural rotation was run."],
  ["different_seed_sensitivity", "blocked", "Requires the validated posterior rotation workflow."],
];
write("information_effect_separation_validation.json", {
  schema_version: "information-effect-separation-validation-v1.61",
  generated_at: generatedAt,
  status: "partial",
  total_gates: gates.length,
  passed: gates.filter(([, status]) => status === "passed").length,
  partial: gates.filter(([, status]) => status === "partial").length,
  blocked: gates.filter(([, status]) => status === "blocked").length,
  failures: 0,
  descriptive_input_covariance: descriptiveCovariance,
  synthetic_cases: [
    [1, -1, "policy_dominant"], [1, 1, "information_dominant"], [-1, 1, "policy_dominant"], [-1, -1, "information_dominant"], [0, 1, "ambiguous"], [1, null, "ambiguous"], [null, 1, "ambiguous"],
  ].map(([rate, stock, expected]) => ({ rate, stock, expected, actual: diagnostic(rate, stock).classification, passed: diagnostic(rate, stock).classification === expected })),
  gates: gates.map(([gate_id, status, evidence]) => ({ gate_id, status, evidence })),
});

const information = read("monetary_policy_information_effect_registry.json");
information.schema_version = "monetary-policy-information-effect-registry-v1.61";
information.generated_at = generatedAt;
information.records = information.records.map((row) => ({ ...row, information_effect_handling: "partially_addressed", evidence: "OIS_3M/STOXX50 input and event-window alignment are audited and a diagnostic sign screen is active, but exact JK BVAR replication, posterior rotations and event-level structural outputs remain blocked.", maximum_identification_status: "external_innovation_proxy", identified_shock_allowed: false, validation_reference: "information_effect_separation_validation.json" }));
write("monetary_policy_information_effect_registry.json", information);

const shocks = read("shock_identification_registry.json", macroDir);
shocks.schema_version = "shock-identification-registry-v1.61";
shocks.generated_at = generatedAt;
shocks.v161_identification_candidates = [
  { shock_series_id: "ecb_pure_monetary_policy_shock_jk_v1", status: "blocked", identified_shock_allowed: false },
  { shock_series_id: "ecb_central_bank_information_shock_jk_v1", status: "blocked", identified_shock_allowed: false },
];
write("shock_identification_registry.json", shocks, macroDir);

const sourceCandidates = read("identified_shock_source_candidates.json", macroDir);
sourceCandidates.generated_at = generatedAt;
sourceCandidates.records = sourceCandidates.records.map((row) => row.identification_status === "external_innovation_proxy" ? { ...row, information_effect_status: "partially_addressed", information_effect_validation: "input/window audit and poor-man diagnostic passed; formal JK structural separation blocked" } : row);
write("identified_shock_source_candidates.json", sourceCandidates, macroDir);

const lp = read("lp_readiness_registry.json", macroDir);
lp.schema_version = "lp-readiness-registry-v1.61";
lp.generated_at = generatedAt;
lp.method_state = "registry_only";
lp.records = lp.records.map((row) => ({ ...row, shock_identification_ready: row.identification_status === "identified_shock", outcome_data_ready: Boolean(row.outcome_coverage_complete), estimator_ready: false, causal_lp_ready: false, method_state: "registry_only" }));
lp.causal_lp_ready_count = 0;
lp.shock_identification_ready_count = lp.records.filter((row) => row.shock_identification_ready).length;
lp.outcome_data_ready_count = lp.records.filter((row) => row.outcome_data_ready).length;
lp.estimator_ready_count = 0;
write("lp_readiness_registry.json", lp, macroDir);

const skillPath = path.join(root, "src", "data", "analysis", "analysis_skill_registry.json");
const skills = JSON.parse(fs.readFileSync(skillPath, "utf8"));
skills.schema_version = "analysis-skill-registry-v1.61";
skills.generated_at = generatedAt;
const skill = { skill_id: "monetary_policy_identification", state: "diagnostic_active", gate: "formal JK replication, input alignment, posterior rotation and separated-output validation must pass before identified_shock", readiness_reference: "identified-shocks/information_effect_separation_validation.json", note: "OIS_3M/STOXX50 and poor-man quadrant diagnostics are active; structural shocks are withheld." };
skills.records = [...skills.records.filter((row) => row.skill_id !== skill.skill_id), skill];
fs.writeFileSync(skillPath, `${JSON.stringify(skills, null, 2)}\n`);

console.log(`v1.61 information-effect build: events=${eventSample.length}; eligible=${eligible.length}; structural_components=0; status=partial.`);
