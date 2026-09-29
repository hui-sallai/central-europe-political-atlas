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

// Audit only: no Serbia descriptive store yet, and no model/scenario code references the Serbia files.
check(!fs.readdirSync(dir).some((f) => /descriptive_history/.test(f)), "no Serbia descriptive store before owner approval");
const offenders = [];
const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const rel = path.join(d, e.name); if (e.isDirectory()) { if (!["node_modules", "raw", "snapshots"].includes(e.name)) walk(rel); } else if (/\.(m?js|ts|tsx|py)$/.test(e.name) && /src\/data\/serbia|serbia_indicator_mapping|serbia_data_integration_plan/.test(fs.readFileSync(path.join(root, rel), "utf8"))) offenders.push(rel); } };
walk("src"); walk("scripts");
check(offenders.every((f) => f.startsWith("scripts/serbia-sors/")), `only the Serbia audit scripts reference the Serbia audit: ${offenders.join(", ")}`);

console.log(JSON.stringify({ status: "pass", checks, datasets: audit.datasets.length, mappings: mapping.national_and_monthly.length + mapping.regional.length, nstj_units: registry.units.length }));
