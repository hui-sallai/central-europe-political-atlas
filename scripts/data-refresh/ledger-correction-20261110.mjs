// Owner-approved 2026-11-10 ("批准登记台账更正和清单修复"): append ONE correction entry to the refresh ledger for run
// historical-recovery-20261110. The original entry stays byte-identical; the hash chain continues.
// The correction records (1) that planned_at/applied_at were hand-written placeholders, with the evidenced time
// windows, (2) the per-series added periods the run did not record (derived from the Phase R records themselves), and
// (3) the attested missing hash-chain link of that entry, (4) the regeneration of the recovery inventory (SORS unit-map fix, discontinued-series classification, unit labels).
// Usage: node scripts/data-refresh/ledger-correction-20261110.mjs   (refuses to append twice)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { LEDGER_PATH, verifyLedger } from "./lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
export const CORRECTION_ID = "ledger-correction-20261110";
export const CORRECTED_RUN = "historical-recovery-20261110";
const INVENTORY = "src/data/data-coverage/historical_recovery_inventory.json";
const INVENTORY_BEFORE_COMMIT = "19f52f6"; // inventory as published by the recovery run (unchanged until this correction)

// Per-series added periods, keyed exactly as the provenance panel keys series, with the dataset they belong to.
export function perSeriesDetail() {
  const groups = new Map();
  const add = (dataset, series, period) => { const k = `${dataset}|${series}`; if (!groups.has(k)) groups.set(k, { dataset, series, periods: [] }); groups.get(k).periods.push(String(period)); };
  for (const r of read("src/data/historical/annual_descriptive_history.json").records) if (r.recovery_phase === "R") add("annual_history", `${r.country_slug}:${r.indicator}`, r.year);
  for (const r of read("src/data/historical/monthly_descriptive_history.json").records) if (r.recovery_phase === "R") add("monthly_history", `${r.country_slug}:${r.series}`, r.period);
  for (const r of read("src/data/historical/regional_descriptive_history.json").records) if (r.recovery_phase === "R") add("regional_history", `${r.region_id}:${r.indicator}`, r.statistical_year);
  for (const k of ["annual", "monthly", "regional"]) for (const r of read(`src/data/serbia/serbia_descriptive_history_${k}.json`).records) if (r.recovery_phase === "R") add(`serbia_sors_${k}`, `serbia:${r.series}:${r.territory_code}`, r.period);
  return [...groups.values()].map((g) => ({ ...g, periods: g.periods.sort() })).sort((a, b) => `${a.dataset}|${a.series}`.localeCompare(`${b.dataset}|${b.series}`));
}

export function buildCorrection(lines) {
  const originalLine = lines.find((l) => JSON.parse(l).run_id === CORRECTED_RUN);
  const original = JSON.parse(originalLine);
  const commitTime = (c) => new Date(execFileSync("git", ["show", "-s", "--format=%cI", c], { cwd: root, encoding: "utf8" }).trim()).toISOString();
  const retrieved = [];
  const walk = (o) => { if (Array.isArray(o)) return o.forEach(walk); if (!o || typeof o !== "object") return; if (typeof o.retrieved_at === "string" && o.retrieved_at.startsWith("2026-11")) retrieved.push(o.retrieved_at); Object.values(o).forEach(walk); };
  for (const p of ["src/data/historical/annual_history_manifest.json", "src/data/historical/monthly_history_manifest.json", "src/data/historical/regional_descriptive_history.json"]) walk(read(p));
  retrieved.sort();
  const dataCommit = original.repository_head_at_plan, ledgerCommit = "d6e2bddc926d63e9bd6eca93a28864e67abec012";
  const detail = perSeriesDetail();
  const total = detail.reduce((n, s) => n + s.periods.length, 0);
  const recorded = original.units.reduce((n, u) => n + u.stores.reduce((m, s) => m + s.new_observations, 0), 0);
  if (total !== recorded) throw new Error(`per-series detail ${total} ≠ recorded ${recorded}`);
  const inventoryBefore = execFileSync("git", ["show", `${INVENTORY_BEFORE_COMMIT}:${INVENTORY}`], { cwd: root, maxBuffer: 1e9 });
  const body = {
    corrects: { run_id: CORRECTED_RUN, plan_sha256: original.plan_sha256, entry_sha256: sha(originalLine) },
    corrections: [
      { field: "planned_at", recorded: original.planned_at, status: "placeholder", corrected_window: { not_before: commitTime(dataCommit), not_after: commitTime(ledgerCommit) },
        evidence: `the plan was formed on repository head ${dataCommit.slice(0, 7)} (repository_head_at_plan) and registered in commit ${ledgerCommit.slice(0, 7)}` },
      { field: "applied_at", recorded: original.applied_at, status: "placeholder", corrected_window: { not_before: retrieved.at(-1), not_after: commitTime(dataCommit) },
        evidence: `after the last of ${retrieved.length} recorded source retrievals and no later than the data commit ${dataCommit.slice(0, 7)}; the recorded value is later than the data commit, the ledger commit and the first deployment (workflow run 42706330755, 2026-11-09T22:09Z)` },
      { field: "per_series_detail", recorded: "not recorded (store totals only)", status: "unrecorded_not_zero", corrected: `${detail.length} series, ${total} added periods derived from the records flagged recovery_phase R` },
    ],
    // The original entry was written without previous_entry_sha256; attest the missing link instead of rewriting it.
    chain_repair: original.previous_entry_sha256 === undefined ? { entry_sha256: sha(originalLine), missing_field: "previous_entry_sha256", expected_previous_entry_sha256: sha(lines[lines.indexOf(originalLine) - 1]) } : null,
    per_series_detail: { unit: original.units[0].unit, new_periods: detail },
    inventory_regeneration: {
      file: INVENTORY, previous_sha256: sha(inventoryBefore), new_sha256: sha(fs.readFileSync(path.join(root, INVENTORY))),
      changes: [
        "national annual unit map uses the Eurostat annual contracts only, so the SORS layer no longer overwrites Serbia's unit: gdp_per_capita_eur and manufacturing_share_gdp are 'same table, selection and unit' (common periods unchanged)",
        "months after the last official value of a discontinued national series (Croatian policy rate 2022-08..2022-12; series ended at euro adoption) are 'officially missing', not 'not yet published'",
        "monthly contracts without a series-source unit take the unit of their official source selection (HICP energy I15 / RCH_A; v1.83-blocked PL/RO industrial production I21, PL/SK unemployment PC_ACT)",
      ],
    },
  };
  return {
    schema_version: "data-refresh-ledger-correction-v1", tool_version: "ledger-correction-v1", run_id: CORRECTION_ID, mode: "ledger-correction",
    recorded_at: new Date().toISOString(), plan_sha256: sha(JSON.stringify(body)), plan_basis: "sha256 of the corrects, corrections, per_series_detail and inventory_regeneration fields",
    repository_head_at_plan: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    owner_acceptance_of_stop_conditions: "Owner approved 2026-11-10 (\"批准登记台账更正和清单修复\"): append-only correction of the historical-recovery-20261110 ledger entry (placeholder timestamps, unrecorded per-series detail) and regeneration of the recovery inventory; the original entry is unchanged.",
    formal_model_impact: "none", ...body, previous_entry_sha256: sha(lines.at(-1)),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = path.join(root, LEDGER_PATH);
  const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
  if (lines.some((l) => JSON.parse(l).run_id === CORRECTION_ID)) { console.error(`${CORRECTION_ID} is already in the ledger`); process.exit(1); }
  const before = verifyLedger(file), originalIndex = lines.findIndex((l) => JSON.parse(l).run_id === CORRECTED_RUN);
  // The only tolerated break is the missing link of the entry this correction attests.
  if (!before.ok && before.error !== `ledger chain broken at entry ${originalIndex + 1}`) { console.error(`refusing to append: ${before.error}`); process.exit(1); }
  const entry = buildCorrection(lines);
  fs.appendFileSync(file, JSON.stringify(entry) + "\n");
  const check = verifyLedger(file);
  if (!check.ok) { fs.writeFileSync(file, lines.join("\n") + "\n"); console.error(`chain still broken (${check.error}); append reverted`); process.exit(1); }
  console.log(JSON.stringify({ appended: CORRECTION_ID, plan_sha256: entry.plan_sha256, series: entry.per_series_detail.new_periods.length, chain: check }, null, 1));
}
