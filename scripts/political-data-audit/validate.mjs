// Validates the political-data audit/design package in docs/political-data/ (audit phase — no ingestion).
// Checks completeness for all ten countries, verification/licence labelling, the ParlGov non-official label, readiness
// classes, prohibited scores, and the stop gate: no canonical political store may exist yet.
// Usage: node scripts/political-data-audit/validate.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stores, buildApprovedProduction } from '../political-data/germany/production.mjs';
import { validatePolitical } from '../political-data/germany/validate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(root, "docs/political-data");
let checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));

const COUNTRIES = ["austria", "croatia", "czechia", "germany", "hungary", "poland", "romania", "serbia", "slovakia", "slovenia"];
const READINESS = new Set(["safe_for_ingestion", "safe_with_crosswalk", "descriptive_only", "requires_manual_review", "license_review_required", "not_ready"]);
const LICENCE_STATUS = /^(verified_open_licence|license_review_required|partial)/;
const VERIFICATION = /^(verified_live|verified_harmonized|verified_secondary|background_to_verify|not_located|access_blocked_from_audit_environment)/;
const PROHIBITED = ["atlas_left_right_score", "atlas_populism_score", "atlas_pro_eu_score", "atlas_extremism_score"];
const FILES = ["political_data_source_audit.json", "national_election_source_registry.json", "political_schema_proposal.json", "party_identity_model.json", "political_source_policy.md", "political_comparability_policy.md", "political_ingestion_plan.md", "README.md"];

for (const f of FILES) check(fs.existsSync(path.join(dir, f)), `missing deliverable docs/political-data/${f}`);

// National election source registry: one complete entry per country.
const registry = read("national_election_source_registry.json");
check(registry.state === "audit_only_no_ingestion", "registry must be audit-only");
check(JSON.stringify(registry.countries.map((c) => c.country).sort()) === JSON.stringify([...COUNTRIES].sort()), "registry must cover exactly the ten Atlas countries");
for (const c of registry.countries) {
  const id = c.country;
  check(c.authoritative_source?.institution && /^https:\/\//.test(c.authoritative_source.url), `${id}: authoritative source institution and HTTPS URL`);
  check(Array.isArray(c.elections_2000_latest) && c.elections_2000_latest.length > 0, `${id}: elections list`);
  for (const e of c.elections_2000_latest) {
    check(/^\d{4}-\d{2}-\d{2}(\/\d{2})?$/.test(e.date), `${id}: election date format ${e.date}`);
    check(e.date >= "2000-01-01", `${id}: election before 2000 in 2000–latest list`);
    check(VERIFICATION.test(e.verification), `${id} ${e.date}: verification label`);
  }
  check(Array.isArray(c.result_sources) && c.result_sources.length > 0, `${id}: result sources`);
  for (const s of c.result_sources) check(VERIFICATION.test(s.verification) && s.url && s.format, `${id}: result source needs url, format and verification label`);
  check(LICENCE_STATUS.test(c.licensing?.status ?? ""), `${id}: licence status`);
  for (const k of ["machine_readable", "recommended_production_source", "fallback_source"]) check(typeof c[k] === "string" && c[k].length > 0, `${id}: ${k}`);
  check(Array.isArray(c.unresolved_risks) && c.unresolved_risks.length > 0, `${id}: unresolved risks listed`);
  check(Array.isArray(c.known_definition_issues), `${id}: definition issues`);
  for (const [k, v] of Object.entries(c.readiness ?? {})) if (k !== "licence_gate" && !k.endsWith("_note")) check(READINESS.has(v), `${id}: readiness ${k}=${v}`);
}

// Source audit: harmonized sources are never labelled official; every country summarized.
const audit = read("political_data_source_audit.json");
check(audit.state === "audit_only_no_ingestion", "source audit must be audit-only");
const parlgov = audit.cross_country_sources.find((s) => s.source_id === "parlgov");
check(parlgov && parlgov.tier === "tier2_harmonized_academic" && /NOT an official/.test(parlgov.official_status), "ParlGov must be labelled harmonized, not official");
for (const s of audit.cross_country_sources) {
  check(s.institution && s.url && s.tier && s.official_status, `${s.source_id}: institution/url/tier/status`);
  check(LICENCE_STATUS.test(s.licence?.status ?? ""), `${s.source_id}: licence status`);
  check(typeof s.verification === "string" && /verified_live/.test(s.verification), `${s.source_id}: live verification note`);
}
for (const m of ["ches", "manifesto_project"]) check(/^measurement_/.test(audit.cross_country_sources.find((s) => s.source_id === m)?.tier ?? ""), `${m}: measurement tier`);
check(JSON.stringify(audit.country_summary.map((c) => c.country).sort()) === JSON.stringify([...COUNTRIES].sort()), "country summary for all ten");
const SUMMARY_FIELDS = ["authoritative_source", "coverage", "machine_readable", "historical_completeness", "licence", "definition_issues", "recommended_production_source", "fallback_source", "unresolved_risks"];
for (const c of audit.country_summary) for (const f of SUMMARY_FIELDS) check(typeof c[f] === "string" && c[f].length > 0, `${c.country}: summary field ${f}`);
check(audit.constituency_geography_audit.records.length === COUNTRIES.length, "geography audit for all ten");

// Schema proposal: prohibited scores, readiness classes, measurement isolation.
const schema = read("political_schema_proposal.json");
check(schema.state === "proposal_only_no_canonical_files", "schema must be proposal-only");
for (const p of PROHIBITED) check(schema.prohibited_fields_and_scores.never_create.includes(p), `prohibited list must include ${p}`);
const storeNames = schema.stores.map((s) => s.store);
check(new Set(storeNames).size === storeNames.length, "store names unique");
check(!storeNames.some((n) => /^politics$/i.test(n)), "no generic politics store");
for (const s of schema.stores) {
  const fields = JSON.stringify(s.fields ?? []);
  for (const p of [...PROHIBITED, ...schema.prohibited_fields_and_scores.never_create]) check(!fields.includes(p), `${s.store}: prohibited field ${p}`);
  if (s.layer !== "analytical_measurement") for (const f of schema.prohibited_fields_and_scores.never_as_factual_party_attribute) check(!(s.fields ?? []).some((x) => new RegExp(`^${f}\\b`).test(x)), `${s.store}: factual store must not carry ${f}`);
}
for (const d of schema.readiness_classification.datasets) check(READINESS.has(d.class.split(" ")[0]), `readiness class ${d.class}`);

// Identity model: forbidden match bases and relation types.
const identity = read("party_identity_model.json");
const relationTypes = identity.relation_types.map((r) => r.type);
for (const t of ["renamed", "merged_into", "split_from", "alliance_member", "group_member", "disputed_continuity"]) check(relationTypes.includes(t), `identity model relation ${t}`);
check(/similarity/.test(identity.crosswalk_match_basis.forbidden), "name similarity must be a forbidden match basis");

// Explicit owner-approved Germany production exception. All other ingestion remains blocked.
const approved=fs.existsSync(path.join(dir,'germany_production_acceptance.json'));
if(approved){
  const data=Object.fromEntries(stores.map(s=>[s,JSON.parse(fs.readFileSync(path.join(root,'src/data/political/germany',`${s}.json`)))]));
  validatePolitical(data,buildApprovedProduction());
}
const offenders = [];
for (const base of ["src/data", "public/research-data"]) {
  const political = /^(politic|election|legislature|cabinet|parliament|party_|parties|ep_)/i;
  const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const rel = `${d}/${e.name}`;
    if(approved&&rel===`${base}/political`){
      check(JSON.stringify(fs.readdirSync(path.join(root,rel)).sort())===JSON.stringify(['germany']),'Only Germany production allowed');
      const allowed=base==='src/data'?stores.map(s=>`${s}.json`):[...stores.flatMap(s=>[`${s}.json`,`${s}.csv`]),'manifest.json','README.md'];
      check(JSON.stringify(fs.readdirSync(path.join(root,rel,'germany')).sort())===JSON.stringify(allowed.sort()),'Exact approved political store/export inventory');
    } else if (political.test(e.name)) offenders.push(rel); else if (e.isDirectory()) walk(rel);
  } };
  if (fs.existsSync(path.join(root, base))) walk(base);
}
check(offenders.length === 0, `audit phase: canonical political data must not exist yet: ${offenders.join(", ")}`);

console.log(JSON.stringify({ status: "pass", checks, countries: registry.countries.length, cross_country_sources: audit.cross_country_sources.length, proposed_stores: storeNames.length, stop_gate: approved?"Germany Slice 1A only; all other countries blocked":"no canonical political stores" }));
