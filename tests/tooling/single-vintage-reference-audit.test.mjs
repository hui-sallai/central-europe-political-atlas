// Single-vintage reference audit (2026-11-16): the ten regression checks of the audit brief, one test each.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build, STORE_PATH, PUBLIC_PATH, INDICATORS } from "../../scripts/historical-annual/build-single-vintage-reference.mjs";
import { DATA_REFRESH_RUNS, newPathAllowed } from "../../docs/political-data/source-closure/data-refresh-amendments.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const sha = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, rel))).digest("hex");
const doc = read(STORE_PATH);
const RECON = "docs/data-coverage/single_vintage_reference_reconciliation_2026-11-16.json";

test("1 schema integrity: header and every record carry the documented fields and types", () => {
  assert.equal(doc.schema_version, "annual-single-vintage-reference-v1");
  for (const k of ["owner_decision", "model_boundary", "layer_policy", "floor_rule", "missing_value_policy", "attribution", "vintages", "indicators", "all_country_common_years", "series", "record_count", "records"]) assert.ok(k in doc, k);
  assert.equal(doc.record_count, doc.records.length);
  for (const r of doc.records) {
    assert.match(r.id, /^vintage:annual:[a-z]+:[a-z_]+:\d{4}$/);
    assert.equal(typeof r.value, "number"); assert.equal(Number.isInteger(r.year), true);
    assert.ok(["official", "provisional", "estimated", "low_reliability"].includes(r.value_status), r.id);
    assert.ok(r.provenance?.raw_file && /^[0-9a-f]{64}$/.test(r.provenance.raw_sha256), r.id);
  }
});

test("2 deterministic generation: two builds are identical and equal the committed and public files", () => {
  const a = build(), b = build();
  assert.equal(a, b);
  assert.equal(a, fs.readFileSync(path.join(root, STORE_PATH), "utf8"));
  assert.equal(sha(STORE_PATH), sha(PUBLIC_PATH));
});

test("3 numeric reconciliation: the independent Python audit passes and reproduces its committed report", () => {
  const run = spawnSync("python3", ["-I", "scripts/data-coverage/audit-single-vintage-reference.py", "--check"], { cwd: root, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const report = read(RECON);
  assert.equal(report.result, "pass");
  assert.deepEqual(report.defects, []);
  assert.equal(report.artifact_sha256, sha(STORE_PATH));
  assert.equal(report.counts.overlap_exact + report.counts.vintage_revisions, report.counts.overlap_with_admitted);
  // Every non-zero difference is an explained vintage revision of the same table and selection.
  for (const v of report.vintage_revisions) assert.match(v.root_cause, /^vintage revision/);
});

test("4 source-vintage consistency: one retrieval per table, shared by all its records, matching the archive", () => {
  const manifest = read("src/data/historical/annual_history_manifest.json");
  for (const v of doc.vintages) {
    const a = manifest.recovery.tables.find((t) => t.table === v.table);
    assert.deepEqual([v.retrieved_at, v.dataset_updated_at, v.sha256], [a.retrieved_at, a.dataset_updated_at, a.sha256], v.table);
    assert.equal(sha(v.raw_file), v.sha256, v.table);
    const recs = doc.records.filter((r) => r.source_dataset === `Eurostat ${v.table}`);
    assert.ok(recs.every((r) => r.vintage === v.retrieved_at && r.dataset_updated_at === v.dataset_updated_at), v.table);
  }
  // Each indicator reads exactly one table.
  for (const i of doc.indicators) assert.equal(new Set(doc.records.filter((r) => r.indicator === i.indicator).map((r) => r.source_dataset)).size, 1, i.indicator);
});

test("5 registry consistency: countries and indicators are the canonical ones", () => {
  const obs = read("src/data/observations/observations.json").records;
  const pairs = new Set(obs.map((r) => `${r.country}|${r.country_slug}`));
  assert.ok(doc.records.every((r) => pairs.has(`${r.country}|${r.country_slug}`)));
  const indicators = new Set(obs.map((r) => r.indicator));
  assert.deepEqual(doc.indicators.map((i) => i.indicator), INDICATORS);
  assert.ok(INDICATORS.every((i) => indicators.has(i)));
  assert.equal(new Set(doc.records.map((r) => r.country_slug)).size, 10);
});

test("6 missing values: absent, never null or zero-filled; empty official cells stay gaps", () => {
  assert.ok(doc.records.every((r) => r.value !== null && Number.isFinite(r.value)));
  const recon = read(RECON);
  for (const s of recon.series) { assert.deepEqual(s.omitted, [], `${s.indicator} ${s.country}`); assert.deepEqual(s.extra, [], `${s.indicator} ${s.country}`); }
  // Serbia has no tipsbp20 data: no record exists, rather than a zero.
  assert.equal(doc.records.filter((r) => r.country_slug === "serbia" && r.indicator === "current_account_gdp").length, 0);
});

test("7 comparability eligibility: common years are intersections of actual years, internal gaps not bridged", () => {
  for (const [indicator, c] of Object.entries(doc.all_country_common_years)) {
    const sets = c.countries.map((country) => new Set(doc.records.filter((r) => r.indicator === indicator && r.country_slug === country).map((r) => r.year)));
    const years = [...sets[0]].filter((y) => sets.every((s) => s.has(y))).sort((a, b) => a - b);
    assert.equal(c.count, years.length, indicator);
    assert.equal(c.contiguous, years.length ? years.at(-1) - years[0] + 1 === years.length : null, indicator);
  }
  assert.equal(doc.all_country_common_years.fdi_inflow.contiguous, false, "FDI common years have internal gaps and are flagged");
  assert.ok(doc.records.every((r) => r.spliced === false && r.layer === "single_vintage_reference"));
});

test("8 coverage matrix completeness: every reference series is a matrix row with classified gaps", () => {
  const m = read("docs/data-coverage/historical_coverage_matrix_2026-11-16.json");
  const rows = m.rows.filter((r) => r.store === "single_vintage_reference");
  assert.equal(rows.length, doc.series.filter((s) => s.official_first !== null).length);
  for (const r of rows) assert.equal(r.recorded_observations + r.verified_missing_observations, r.expected_observations, r.key);
  assert.ok(m.summary.by_country && m.summary.by_indicator);
});

test("9 export and manifest alignment: public copy, registered run, ledger; outside the research ZIP by policy", () => {
  const run = DATA_REFRESH_RUNS["single-vintage-reference-20261116"];
  assert.deepEqual(run.paths.filter((p) => newPathAllowed("single-vintage-reference-20261116", p)), [PUBLIC_PATH, STORE_PATH]);
  const record = read("docs/legal-security/data_refresh_amendments.json").refreshes.find((r) => r.run_id === "single-vintage-reference-20261116");
  for (const f of record.files.filter((x) => x.path !== "src/data/data-refresh/refresh_ledger.jsonl")) assert.equal(sha(f.path), f.sha256, f.path);
  const ledger = fs.readFileSync(path.join(root, "src/data/data-refresh/refresh_ledger.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(ledger.find((e) => e.run_id === "single-vintage-reference-20261116").units[0].files[0].new_sha256, sha(STORE_PATH));
  // Descriptive layers are published as JSON, not in the research ZIP or its layer registry (unchanged policy).
  assert.ok(!JSON.stringify(read("public/research-data/research_data_layers.json")).includes("single_vintage"));
});

test("10 formal model gates preserved: model inputs unchanged and only the separate descriptive display reads the reference", () => {
  // Model inputs and frozen research outputs are byte-identical to the pre-iteration production baseline 8544b82.
  const MODEL_INPUTS = ["src/data/observations/observations.json", "src/data/high-frequency/snapshots", "src/data/macro-drivers", "src/data/panel", "src/data/network", "src/data/local-projections", "src/data/panel-local-projections", "src/data/macro", "src/data/models", "src/data/identified-shocks"];
  const changed = execFileSync("git", ["diff", "--name-only", "8544b82902c388cc2474d71b3766ffa1d7b7ccbd", "--", ...MODEL_INPUTS], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(changed, "", `model inputs changed since the baseline: ${changed}`);
  let users = [];
  try { users = execFileSync("git", ["grep", "--untracked", "-l", "annual_single_vintage_reference", "--", "src/app", "src/components", "src/lib", "scripts/acquisition", "scripts/validation"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean); } catch (e) { if (e.status !== 1) throw e; }
  assert.deepEqual(users, ["src/components/AnnualReferenceDetails.tsx"]);
  assert.match(doc.model_boundary, /Not read by composite indices, scenarios, panel, VAR, LP/);
});
