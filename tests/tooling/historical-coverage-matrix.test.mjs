// Historical coverage iteration (2026-11-16): coverage matrix A–G, persistent backlog, comparability contract,
// source verification and the single-vintage reference layer.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { outputs, inputHashes, categorise, CATEGORY, MATRIX_JSON, BACKLOG_JSON, CONTRACT_JSON } from "../../scripts/data-coverage/historical-coverage-matrix.mjs";
import { buildVerification, VERIFICATION_JSON } from "../../scripts/data-coverage/source-verification.mjs";
import { build as buildReference, STORE_PATH, PUBLIC_PATH, INDICATORS } from "../../scripts/historical-annual/build-single-vintage-reference.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const sha = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, rel))).digest("hex");
const matrix = read(MATRIX_JSON), backlog = read(BACKLOG_JSON), contract = read(CONTRACT_JSON);
const reference = read(STORE_PATH);
const inputsUnchanged = JSON.stringify(inputHashes()) === JSON.stringify(matrix.inputs);

test("matrix, backlog and contract reproduce byte-for-byte while their recorded inputs are unchanged", { skip: !inputsUnchanged && "data inputs changed after the dated matrix; regenerate deliberately" }, () => {
  for (const [p, text] of outputs()) assert.equal(text, fs.readFileSync(path.join(root, p), "utf8"), p);
});

test("every gap period is classified A–G and every contract's periods add up", () => {
  assert.deepEqual(Object.keys(CATEGORY), ["A", "B", "C", "D", "E", "F", "G"]);
  assert.deepEqual(matrix.summary.contracts_with_unclassified_gaps, []);
  for (const r of matrix.rows) {
    for (const g of r.gap_spans) assert.ok(CATEGORY[g.category], `${r.key} ${g.category}`);
    if (r.expected_observations === null) continue;
    assert.equal(r.recorded_observations + r.verified_missing_observations, r.expected_observations, r.key);
    assert.equal(r.unclassified_missing_observations, 0, r.key);
    assert.equal(Object.values(r.gaps).reduce((a, b) => a + (b ?? 0), 0), r.verified_missing_observations, r.key);
  }
  assert.equal(matrix.summary.full_historical_coverage, false, "full coverage is never claimed while A/B gaps remain");
  assert.ok(matrix.summary.national.gap_periods.A > 0);
});

test("the A–G mapping keeps territorial and institutional causes apart from definition breaks", () => {
  assert.equal(categorise("x", { category: 6, reason: "before 1999: SORS national totals exclude AP Kosovo and Metohija from 1998 (territorial coverage change)" }).category, "G");
  assert.equal(categorise("x", { category: 6, reason: "before the definition-compatible floor 2009-01 (documented_regime_floor)" }).category, "G");
  assert.equal(categorise("x", { category: 6, reason: "before the definition-compatible floor 2021 (official break or definition flags: 2021:b)" }).category, "D");
  assert.equal(categorise("x", { category: 3, reason: "before 1999-01: the euro did not exist" }).category, "G");
  assert.equal(categorise("x", { category: 4, reason: "official cell empty before the source series was discontinued (source notes)" }).category, "G");
  assert.equal(categorise("x", { category: 8, reason: "held: held_overlap_mismatch (splice excess 1)" }).category, "A");
  assert.equal(categorise("annual|serbia|hicp_inflation", { category: 1, reason: "after the last canonical year" }).category, "D", "recorded decision 2026-11-11");
});

test("Serbia's harmonised gaps point to the separate national-definition series, never merged", () => {
  for (const ind of ["fiscal_balance_gdp", "government_debt_gdp", "government_revenue_gdp", "government_expenditure_gdp", "current_account_gdp"]) {
    const r = matrix.rows.find((x) => x.key === `annual|serbia|${ind}`);
    assert.equal(r.primary_category, "C", ind);
    assert.match(r.secondary_source, /Ministry of Finance/, ind);
    assert.equal(r.recorded_observations, 0, ind);
  }
  assert.equal(matrix.rows.filter((r) => r.store === "serbia_mfin").length, 11);
  assert.ok(matrix.rows.filter((r) => r.store === "serbia_mfin").every((r) => /not comparable/.test(r.comparability_status)));
});

test("backlog: every actionable span is an open item with a stable unique id", () => {
  const ids = backlog.items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of matrix.rows) for (const g of r.gap_spans) if (["A", "B", "E", "F"].includes(g.category)) assert.ok(backlog.items.some((i) => i.key === r.key && i.category === g.category && i.status === "open" && i.first_period === g.from), `${r.key} ${g.category} ${g.from}`);
  assert.ok(backlog.items.filter((i) => i.category === "B").length >= 140, "UN Comtrade pre-2015 and unchecked Serbian years stay open");
  assert.match(backlog.rule, /never deleted/);
});

test("comparability contract covers every national indicator and states the null and break rules", () => {
  const ids = new Set(matrix.rows.filter((r) => r.scope === "national" && (r.store === "annual" || r.store === "monthly")).map((r) => `${r.frequency}|${r.indicator_id}`));
  assert.deepEqual(new Set(contract.indicators.map((i) => `${i.frequency}|${i.indicator_id}`)), ids);
  assert.ok(contract.rules.some((r) => /never zero/.test(r)));
  assert.ok(contract.rules.some((r) => /never extended across an official break/.test(r)));
  const gdp = contract.indicators.find((i) => i.indicator_id === "real_gdp_growth");
  assert.match(gdp.price_basis, /chain-linked/);
  assert.match(contract.indicators.find((i) => i.indicator_id === "hicp_inflation").restriction, /never merged/);
  assert.match(contract.indicators.find((i) => i.indicator_id === "unemployment_rate").restriction, /registered unemployment is never used/);
});

test("source verification reproduces offline from the archived probe and lists unchecked families as unchecked", () => {
  assert.equal(JSON.stringify(buildVerification(), null, 1) + "\n", fs.readFileSync(path.join(root, VERIFICATION_JSON), "utf8"));
  const v = read(VERIFICATION_JSON);
  assert.ok(v.tables.every((t) => t.publisher && t.dataset_id && t.unit && t.required_citation && t.reuse));
  assert.ok(v.unchecked_source_families.some((u) => u.family === "IMF" && u.host_status.length === 0));
  assert.deepEqual(v.summary.probe_failed, []);
});

test("single-vintage reference: reproducible, unspliced, floored, flagged, and restricted to its descriptive view", () => {
  const text = buildReference();
  assert.equal(text, fs.readFileSync(path.join(root, STORE_PATH), "utf8"));
  assert.equal(sha(STORE_PATH), sha(PUBLIC_PATH));
  assert.equal(reference.record_count, reference.records.length);
  assert.deepEqual(reference.indicators.map((i) => i.indicator), INDICATORS);
  const manifest = read("src/data/historical/annual_history_manifest.json");
  for (const s of reference.series) {
    const phaseR = manifest.recovery.series.find((x) => x.indicator === s.indicator && x.country === s.country);
    assert.equal(s.definition_compatible_floor, phaseR.definition_compatible_floor, `${s.indicator} ${s.country}: same floor as Phase R`);
  }
  const ids = new Set();
  for (const r of reference.records) {
    assert.ok(!ids.has(r.id)); ids.add(r.id);
    assert.ok(Number.isFinite(r.value), r.id);
    assert.equal(r.spliced, false); assert.equal(r.layer, "single_vintage_reference"); assert.equal(r.descriptive_only, true);
    const s = reference.series.find((x) => x.indicator === r.indicator && x.country === r.country_slug);
    assert.ok(r.year >= s.definition_compatible_floor, r.id);
    // Phase R records came from the same archived extract, so they must agree exactly.
    if (r.admitted_same_year?.layer === "annual_history") {
      const h = read("src/data/historical/annual_descriptive_history.json").records.find((x) => x.country_slug === r.country_slug && x.indicator === r.indicator && x.year === r.year);
      if (h.recovery_phase === "R") assert.equal(r.admitted_same_year.difference_reference_minus_admitted, 0, r.id);
    }
  }
  // Every vintage-held period of the spliced series is now published, and the spliced stores are untouched.
  assert.equal(matrix.summary.single_vintage_reference.held_A_periods, 301);
  assert.equal(matrix.summary.single_vintage_reference.held_A_periods_published_in_reference, 301);
  const inv = read("src/data/data-coverage/historical_recovery_inventory.json");
  for (const p of ["src/data/observations/observations.json", "src/data/historical/annual_descriptive_history.json"]) assert.equal(sha(p), inv.inputs[p], p);
  let users = [];
  try { users = execFileSync("git", ["grep", "--untracked", "-l", "annual_single_vintage_reference", "--", "src/app", "src/components", "src/lib"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean); } catch (e) { if (e.status !== 1) throw e; } // git grep exits 1 when nothing matches
  assert.deepEqual(users, ["src/components/AnnualReferenceDetails.tsx"], "only the isolated descriptive display reads the reference");
});
