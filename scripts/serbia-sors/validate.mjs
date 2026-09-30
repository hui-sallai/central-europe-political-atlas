// Validate the Serbia (SORS) integration audit outputs. Audit only: no Serbia store may exist yet and no model file
// may reference the Serbia audit. Usage: node scripts/serbia-sors/validate.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(root, "src/data/serbia");
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };
const NOTE = "Regional units follow the territorial classification used by the source institution. Their inclusion or labeling in this dataset does not constitute a political or legal position on territorial status.";
const STATUSES = ["exact_match", "definition_compatible", "descriptive_only", "requires_transformation", "not_comparable", "requires_methodological_review"];

const audit = read("serbia_official_data_source_audit.json");
const mapping = read("serbia_indicator_mapping.json");
const registry = read("serbia_regional_classification_registry.json");
const plan = read("serbia_data_integration_plan.json");

check(audit.state === "audit_only_no_ingestion" && plan.state === "plan_for_owner_review", "audit and plan are pre-ingestion documents");
check(audit.datasets.length > 0 && audit.datasets.every((d) => d.dataset_id && d.endpoints?.json_en && d.attribution_requirement), "every dataset has an identifier, endpoint and attribution requirement");
for (const d of audit.datasets.filter((x) => x.inspected)) check(/^[0-9a-f]{64}$/.test(d.inspected.sha256) && d.inspected.records > 0 && d.inspected.period_first && d.inspected.period_last, `${d.dataset_id}: inspected dataset records checksum, size and period range`);

for (const m of [...mapping.national_and_monthly, ...mapping.regional]) {
  check(STATUSES.includes(m.status), `${m.atlas_indicator}: allowed mapping status`);
  check(typeof m.cross_country_comparable === "boolean" && m.gate && Object.keys(m.gate).length === 6, `${m.atlas_indicator}: cross-country gate evaluated`);
  if (m.cross_country_comparable) check(Object.entries(m.gate).every(([, v]) => v === true), `${m.atlas_indicator}: comparable only if all five gate conditions hold`);
  if (m.overlap && m.overlap.result === "fail") check(!["definition_compatible", "exact_match"].includes(m.status), `${m.atlas_indicator}: failed overlap cannot be marked compatible`);
  check(["descriptive_only", "formal_model_compatible_candidate"].includes(m.model_role), `${m.atlas_indicator}: model role is descriptive or candidate only`);
}
const hicp = mapping.national_and_monthly.find((m) => m.atlas_indicator === "hicp_inflation");
check(hicp && hicp.status === "not_comparable", "Serbian CPI is never mapped onto HICP");

check(registry.neutrality_note === NOTE && plan.neutrality_note === NOTE, "territorial-status neutrality note present verbatim");
check(registry.units.every((u) => u.source_territorial_code && u.statistical_level && u.classification_version && /not an EU NUTS unit/.test(u.nuts_status)), "NSTJ units keep source codes and are not relabelled as NUTS");
check(registry.units.filter((u) => u.statistical_level === "NSTJ3").length >= 25, "NSTJ3 level registered");

check(plan.prohibitions.some((p) => /version/.test(p)) && plan.prohibitions.some((p) => /formal model sample/.test(p)) && plan.prohibitions.some((p) => /VAR, LP/.test(p)), "plan restates the version, sample and model prohibitions");
check(plan.summary.safe_for_immediate_descriptive_integration.every((name) => { const m = mapping.national_and_monthly.find((x) => x.atlas_indicator === name); return m && (!m.overlap || m.overlap.result !== "fail"); }), "safe list only contains mappings with non-failing overlap evidence");

// --- Stores (owner-approved 2026-09-30): reproducible, faithful to SORS, no zero-fill, isolated from models ----------
const { build, STORES, MANIFEST } = await import("./ingest.mjs");
const manifest = JSON.parse(fs.readFileSync(path.join(root, MANIFEST), "utf8"));
const crypto = await import("node:crypto");
for (const src of manifest.sources) check(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, src.extract_file))).digest("hex") === src.extract_sha256 && src.retrieved_at, `${src.dataset_id}: archived extract unchanged and retrieval recorded`);
const rebuilt = await build({ offline: true });
const stores = Object.fromEntries(Object.entries(STORES).map(([k, f]) => [k, JSON.parse(fs.readFileSync(path.join(root, f), "utf8"))]));
for (const k of Object.keys(STORES)) check(JSON.stringify(rebuilt.stores[k].records) === JSON.stringify(stores[k].records), `${k} store does not reproduce exactly from the archived extracts`);
const allowedMappings = new Map([...mapping.national_and_monthly, ...mapping.regional].map((m) => [m.atlas_indicator, m]));
const levels = new Set(registry.units.map((u) => u.source_territorial_code));
for (const [k, doc] of Object.entries(stores)) {
  check(doc.descriptive_only === true && /does not change any formal sample/.test(doc.model_boundary), `${k}: descriptive-only boundary stated`);
  const ids = new Set();
  for (const r of doc.records) {
    const src = doc.series_sources.find((x) => x.source_ref === r.source_ref);
    const m = src && allowedMappings.get(src.mapping);
    check(src && m && src.source_institution && src.source_dataset && src.source_url && src.original_code !== undefined, `${r.id}: provenance resolves to an audited mapping`);
    check(!["requires_methodological_review", "not_comparable"].includes(m.status), `${r.id}: mapping status ${m.status} is not approved for ingestion`);
    const withheld = /withheld/.test(r.transformation?.method ?? "");
    check(r.cross_country_comparable === (m.cross_country_comparable && !withheld), `${r.id}: cross_country_comparable must follow the audited mapping (false where EUR conversion is withheld)`);
    check(!ids.has(r.id), `${r.id}: duplicate`); ids.add(r.id);
    check(typeof r.original_value === "number" && Number.isFinite(r.original_value), `${r.id}: original value present (SORS missing statuses stay absent)`);
    check(!["O", "M", "L"].includes(r.sors_status) && doc.sors_status_legend[String(r.sors_status).split("/")[0]], `${r.id}: SORS status kept and never a missing-value code`);
    check(r.normalized_value !== null || /withheld/.test(r.transformation?.method ?? ""), `${r.id}: normalised value only missing where EUR conversion is explicitly withheld`);
    if (r.transformation && !/withheld/.test(r.transformation.method)) check(Number.isFinite(r.transformation.rate), `${r.id}: conversion rate recorded`);
    if (k === "regional") check(r.statistical_level && r.classification_version && Number.isInteger(r.source_year) && Number.isInteger(r.observation_year) && r.comparability_status && (levels.has(r.territory_code) || r.statistical_level === "municipality_or_city") && !/NUTS/.test(r.statistical_level), `${r.id}: regional record carries territorial code, classification version, level, source and observation year, comparability`);
  }
}
check(stores.regional.neutrality_note === NOTE, "regional store carries the neutrality note verbatim");
check(![...stores.annual.records, ...stores.monthly.records].some((r) => /hicp/i.test(r.series)), "Serbian CPI is never stored as HICP");
check(manifest.fx.eur_conversion_withheld_years.every((y) => stores.annual.records.filter((r) => r.period === String(y) && r.transformation).every((r) => r.normalized_value === null)), "EUR conversion withheld in years with >50% one-month FX steps");

// No model, scenario or index code reads the Serbia stores or audit.
const offenders = [];
const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const rel = path.join(d, e.name); if (e.isDirectory()) { if (!["node_modules", "raw", "snapshots"].includes(e.name)) walk(rel); } else if (/\.(m?js|ts|tsx|py)$/.test(e.name) && /serbia_descriptive_history|src\/data\/serbia|serbia_indicator_mapping|serbia_data_integration_plan/.test(fs.readFileSync(path.join(root, rel), "utf8"))) offenders.push(rel); } };
walk("src"); walk("scripts");
const allowedReaders = [/^scripts\/serbia-sors\//, /^scripts\/data-refresh\//, /^scripts\/data-coverage\//, /^scripts\/export-research-data\.mjs$/, /^scripts\/validation\//, /^src\/components\//, /^src\/app\//];
check(offenders.every((f) => allowedReaders.some((re) => re.test(f))), `model/scenario code must not read the Serbia data: ${offenders.filter((f) => !allowedReaders.some((re) => re.test(f))).join(", ")}`);

console.log(JSON.stringify({ status: "pass", checks, datasets: audit.datasets.length, mappings: mapping.national_and_monthly.length + mapping.regional.length, nstj_units: registry.units.length, records: Object.fromEntries(Object.entries(stores).map(([k, d]) => [k, d.records.length])) }));
