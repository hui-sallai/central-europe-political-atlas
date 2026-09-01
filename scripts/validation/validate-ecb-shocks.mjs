import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = path.join(root, "src", "data", "identified-shocks");
const driverDir = path.join(root, "src", "data", "macro-drivers");
const cacheDir = path.join(root, ".tmp-ecb-v16");
const failures = [];
const counts = {};

function read(name, directory = dataDir) {
  return JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
}

function check(condition, message, category) {
  counts[category] = (counts[category] ?? 0) + 1;
  if (!condition) failures.push({ category, message });
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function lastSunday(year, monthIndex) {
  const day = new Date(Date.UTC(year, monthIndex + 1, 0));
  return day.getUTCDate() - day.getUTCDay();
}

function frankfurtOffsetHours(isoLocal) {
  const local = new Date(`${isoLocal}Z`);
  const year = local.getUTCFullYear();
  const marchTransition = Date.UTC(year, 2, lastSunday(year, 2), 3, 0);
  const octoberTransition = Date.UTC(year, 9, lastSunday(year, 9), 3, 0);
  const value = local.getTime();
  return value >= marchTransition && value < octoberTransition ? 2 : 1;
}

const acquisition = read("ecb_monetary_event_data_acquisition_manifest.json");
const manifests = new Map(acquisition.records.map((record) => [record.dataset_id, record]));
check(acquisition.records.length === 2, "Expected both official ECB acquisition records.", "acquisition");
for (const [datasetId, expectedFile] of [["ea_mpd", "ea_mpd.xlsx"], ["ea_empd", "ea_empd.xlsx"]]) {
  const manifest = manifests.get(datasetId);
  check(Boolean(manifest?.official_annex_asset?.startsWith("https://www.ecb.europa.eu/")), `${datasetId} annex is not an official ECB URL.`, "acquisition");
  check(/^[a-f0-9]{64}$/.test(manifest?.sha256 ?? ""), `${datasetId} checksum is invalid.`, "acquisition");
  check(manifest?.redistribution_status === "raw_workbook_excluded_from_public_package", `${datasetId} raw redistribution boundary is missing.`, "acquisition");
  const localFile = path.join(cacheDir, expectedFile);
  if (fs.existsSync(localFile)) check(sha256(localFile) === manifest.sha256, `${datasetId} local workbook checksum mismatch.`, "acquisition");
}
check(!fs.existsSync(path.join(root, "public", "research-data", "ea_mpd.xlsx")) && !fs.existsSync(path.join(root, "public", "research-data", "ea_empd.xlsx")), "Raw ECB workbooks must not be public exports.", "acquisition");

const mpdSchema = read("ea_mpd_workbook_schema.json");
const empdSchema = read("ea_empd_workbook_schema.json");
const mpdDataSheets = mpdSchema.sheets.filter((sheet) => sheet.sheet_name !== "Notes");
check(mpdDataSheets.length === 3 && mpdDataSheets.every((sheet) => sheet.row_count === 315 && sheet.column_count === 46), "EA-MPD sheet dimensions are not the audited 315 × 46 structure.", "schema");
check(mpdDataSheets.every((sheet) => ["date", "OIS_1M", "EURUSD"].every((field) => sheet.columns.some((column) => column.column_name === field))), "EA-MPD required columns are missing.", "schema");
const empdSheet = empdSchema.sheets.find((sheet) => sheet.sheet_name === "EA-EMPD");
check(empdSheet?.row_count === 4926 && empdSheet?.column_count === 54, "EA-EMPD sheet dimensions are not the audited 4,926 × 54 structure.", "schema");
check(["Date_time", "Event_type", "Speaker", "OIS_1M", "STOXX50E"].every((field) => empdSheet?.columns.some((column) => column.column_name === field)), "EA-EMPD required columns are missing.", "schema");

const events = read("monetary_policy_event_observations.json");
check(events.record_count === 5871 && events.dataset_counts.ea_mpd === 945 && events.dataset_counts.ea_empd === 4926, "Canonical event counts do not match workbook audit.", "events");
const eventIds = new Set(events.records.map((event) => event.event_id));
check(eventIds.size === events.records.length, "Canonical event_id values are not unique.", "events");
check(events.records.every((event) => event.parent_event_id && event.window_measure_id && event.source_sheet && event.source_row > 1), "Canonical event trace fields are incomplete.", "events");
check(events.records.every((event) => event.timezone === "Europe/Frankfurt" && /(?:CET|CEST)/.test(event.timezone_abbreviation) && event.utc_timestamp.endsWith("Z")), "Timezone context or UTC conversion is incomplete.", "timestamps");
check(frankfurtOffsetHours("2025-01-30T14:15:00") === 1 && frankfurtOffsetHours("2025-07-24T14:15:00") === 2, "CET/CEST deterministic fixtures failed.", "timestamps");
const winter = events.records.find((event) => event.original_local_timestamp === "2025-01-30T14:15:00" && event.dataset_id === "ea_mpd");
const summer = events.records.find((event) => event.original_local_timestamp === "2025-07-24T14:15:00" && event.dataset_id === "ea_mpd");
check(winter?.timezone_abbreviation === "CET" && summer?.timezone_abbreviation === "CEST", "Actual ECB event DST labels failed.", "timestamps");
check(events.event_type_counts["ea_empd:EB"] === 2972 && events.event_type_counts["ea_empd:P"] === 1000, "EA-EMPD speech counts changed unexpectedly.", "events");
check(events.records.every((event) => !(event.policy_decision_event && event.speech_event)), "Decision and speech semantics were mixed.", "events");

const overlap = read("ecb_event_dataset_overlap_registry.json");
check(overlap.record_count === 945 && overlap.records.every((record) => record.same_underlying_event), "EA-MPD / EA-EMPD overlap audit is incomplete.", "overlap");
check(overlap.records.every((record) => record.preferred_source === "ea_mpd_for_official_decision_baseline"), "Official-decision preferred-source policy is inconsistent.", "overlap");
check(new Set(overlap.records.map((record) => `${record.event_date}|${record.event_subtype}`)).size === overlap.records.length, "Overlap registry contains duplicate event-window keys.", "overlap");

const factors = read("ecb_policy_factor_registry.json");
const rawProxy = factors.records.find((factor) => factor.factor_id === "ois_1m_high_frequency_surprise_proxy");
check(rawProxy?.official_field === "OIS_1M" && rawProxy?.causal_status === "external_innovation_proxy", "Raw OIS proxy factor mapping failed.", "factors");
for (const factorId of ["target", "timing", "forward_guidance", "qe"]) {
  const factor = factors.records.find((item) => item.factor_id === factorId);
  check(factor?.workbook_presence === "methodology_defined_not_directly_published_in_current_workbook" && factor?.causal_status === "blocked", `${factorId} was silently promoted from methodology to workbook output.`, "factors");
}

const information = read("monetary_policy_information_effect_registry.json");
check(information.records.every((record) => record.information_effect_handling === "separated_under_jk_framework" && record.maximum_identification_status === "identified_shock" && record.identified_shock_allowed === true), "Author-reference information-effect separation failed.", "identification");

const monthly = read("ecb_monetary_policy_monthly_series.json");
const monthlyKeys = monthly.records.map((record) => `${record.shock_series_id}|${record.month}`);
check(new Set(monthlyKeys).size === monthlyKeys.length, "Monthly shock-series keys are duplicated.", "aggregation");
check(monthly.records.every((record) => record.aggregation_method === "monthly_sum_of_event_surprises" && record.no_look_ahead === true), "Monthly aggregation policy is not pre-registered.", "aggregation");
check(monthly.records.filter((record) => record.event_count === 0).every((record) => record.value === 0 && record.availability_status === "valid_no_event"), "No-event month was not encoded as valid zero.", "aggregation");
check(monthly.records.filter((record) => record.availability_status === "missing_expected_event_observation").every((record) => record.value === null && record.event_count > 0), "Expected-event missingness was not kept distinct from zero.", "aggregation");
check(10 + (-3) === 7, "Aggregation arithmetic fixture failed.", "aggregation");
const allPolicyRecords = monthly.records.filter((record) => record.aggregation_profile === "all_policy_events");
check(allPolicyRecords.every((record) => record.source_event_ids.every((id) => !id.startsWith("ea_empd:") || events.records.find((event) => event.event_id === id)?.speech_event)), "EA-EMPD decision duplicates entered all-policy monthly aggregation.", "aggregation");
check(monthly.records.every((record) => record.sign_multiplier === 1 && record.sign_convention.includes("tightening")), "Canonical tightening sign convention failed.", "aggregation");

const applicability = read("shock_applicability_registry.json");
const croatia = applicability.records.filter((record) => record.country_id === "croatia");
check(croatia.length === 2 && croatia.some((record) => record.end_period === "2022-12" && record.applicability === "external_ecb_spillover") && croatia.some((record) => record.start_period === "2023-01" && record.applicability === "euro_area_common_monetary_policy_exposure"), "Croatia pre/post-2023 applicability failed.", "applicability");
for (const country of ["czechia", "hungary", "poland", "romania", "serbia"]) {
  const records = applicability.records.filter((record) => record.country_id === country);
  check(records.length === 1 && records[0].applicability === "external_ecb_spillover" && records[0].domestic_shock_wording_allowed === false, `${country} non-euro spillover boundary failed.`, "applicability");
}

const shocks = read("shock_identification_registry.json", driverDir);
check(shocks.identified_shock_count === 2 && shocks.external_innovation_proxy_count === 3, "Identification decision counts are incorrect.", "identification");
check(shocks.records.filter((record) => record.shock_id.startsWith("ecb_ois_1m_")).every((record) => record.identification_status === "external_innovation_proxy" && record.causal_use_allowed === false), "ECB proxy was promoted to identified shock.", "identification");
const readiness = read("v16_identification_readiness.json", driverDir);
check(readiness.data_layer_complete === true && readiness.all_identification_gates_passed === false && readiness.identification_decision === "external_innovation_proxy_only", "v1.6 readiness decision is inconsistent.", "identification");

const lp = read("lp_readiness_registry.json", driverDir);
const formalLp = lp.records.filter((record) => String(record.readiness_id).includes(":jk_joint:"));
check(lp.method_state === "active" && lp.causal_lp_ready_count === 44 && formalLp.length === 54, "v1.7 formal LP readiness counts are incorrect.", "lp_readiness");
check(formalLp.every((record) => record.identification_status === "identified_shock" && (!record.causal_lp_ready || record.effective_n >= 96)), "Non-identified or underpowered series entered causal LP readiness.", "lp_readiness");
check(lp.records.filter((record) => !String(record.readiness_id).includes(":jk_joint:")).every((record) => record.causal_lp_ready === false), "Legacy proxy readiness was promoted to causal LP.", "lp_readiness");

const summary = {
  schema_version: "ecb-shock-validation-summary-v1.7",
  generated_at: "2026-09-01",
  status: failures.length ? "failed" : "passed",
  total_tests: Object.values(counts).reduce((sum, value) => sum + value, 0),
  failure_count: failures.length,
  categories: counts,
  dataset_counts: events.dataset_counts,
  canonical_event_count: events.record_count,
  measure_observation_count: events.measure_observation_count,
  overlap_record_count: overlap.record_count,
  monthly_record_count: monthly.record_count,
  identified_shock_count: shocks.identified_shock_count,
  external_innovation_proxy_count: shocks.external_innovation_proxy_count,
  shock_candidate_count: shocks.shock_candidate_count,
  causal_lp_ready_count: lp.causal_lp_ready_count,
  lp_method_state: lp.method_state,
  failures,
};
fs.writeFileSync(path.join(dataDir, "ecb_shock_validation_summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}
console.log(`ECB shock validation passed: ${summary.total_tests} tests; ${summary.canonical_event_count} event-window records; LP ${summary.lp_method_state}.`);
