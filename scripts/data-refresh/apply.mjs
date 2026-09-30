// Official descriptive-data refresh — APPLY an accepted plan (writes canonical descriptive stores; the research-data
// guard asks the owner before this runs). Refuses to write when:
//   - the plan reports a formal model impact, an unregistered side effect or a release file (never overridable here —
//     those need a deliberate release);
//   - a unit is held for owner review, unless --accept-stop "<owner decision>" records the owner's explicit acceptance;
//   - any canonical file changed since planning, or a staged file changed after planning (stale plan);
//   - the provenance ledger's hash chain is broken.
// Every apply appends one entry to src/data/data-refresh/refresh_ledger.jsonl (previous SHA-256 and git blob of each
// overwritten file, revised values, retrieval provenance), so historical revisions stay traceable.
//
// Usage: node scripts/data-refresh/apply.mjs --run <run-id> [--units a,b] [--accept-stop "<owner decision, date>"]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compareFiles, DECLARED_FORMAL_INPUTS, DEFAULT_TOLERANCE, diffStore, fileSha, findHashPins, LEDGER_PATH, NON_OVERRIDABLE, readJson, seriesFlags, sha256, snapshotCoverage, TOOL_VERSION, verifyLedger } from "./lib.mjs";
import { FORBIDDEN_TARGETS, STAGE_VALIDATORS, UNITS } from "./units.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
const fail = (message) => { console.error(`REFUSED: ${message}`); process.exit(2); };

const runId = arg("run");
if (!runId) fail("--run <run-id> is required");
const runDir = path.join(root, ".tmp-data-refresh", runId);
const planFile = path.join(runDir, "data_refresh_plan.json");
if (!fs.existsSync(planFile)) fail(`no plan at ${planFile}`);
const planText = fs.readFileSync(planFile, "utf8");
const plan = JSON.parse(planText);
const stage = path.join(root, plan.stage);
if (!path.resolve(stage).startsWith(path.join(root, ".tmp-data-refresh") + path.sep)) fail("plan stage is outside .tmp-data-refresh/");
const acceptStop = arg("accept-stop");

if (plan.formal_model_impact !== "none") fail(`formal model impact is not none (${plan.formal_model_impact.map((f) => f.file).join(", ")}). Routine refresh stops here; re-estimation needs a deliberate, owner-approved release.`);
if (plan.unregistered_side_effects.length) fail(`unregistered side effects: ${plan.unregistered_side_effects.map((c) => c.file).join(", ")}`);
if (plan.changed_files.some((c) => FORBIDDEN_TARGETS.includes(c.file))) fail("the staged run touched release files");

// Validators ran in the stage on the combined result of all units; failures there are never applied.
const stageFailures = (plan.stage_validators ?? []).filter((v) => v.status === "fail" && !(v.command === "pnpm data-coverage:validate" && plan.coverage_reaudit === "required_passes_after_reaudit"));
if (stageFailures.length) fail(`validators failed in the stage: ${stageFailures.map((v) => `${v.command} (${v.message})`).join("; ")}`);
if (["fails_even_after_reaudit", "reaudit_changes_formal_input_series"].includes(plan.coverage_reaudit)) fail(`coverage audit: ${plan.coverage_reaudit}`);
if (plan.coverage_reaudit === "required_passes_after_reaudit" && !acceptStop) fail("the refresh revises audited observations: the coverage re-audit needs the owner's --accept-stop");
if (!plan.stage_validators) fail("plan predates stage validation — re-run the plan");

const requested = arg("units") ? arg("units").split(",") : plan.units.filter((u) => u.proposed_action === "apply_after_confirmation" || (acceptStop && u.proposed_action === "hold_for_owner_review")).map((u) => u.unit);
const selected = plan.units.filter((u) => requested.includes(u.unit));
if (!selected.length) { console.log("Nothing to apply (no unit with changes selected)."); process.exit(0); }
for (const u of selected) {
  if (UNITS[u.unit].blocked) fail(`${u.unit} is blocked: ${UNITS[u.unit].blocked}`);
  if (u.run.status !== "ok") fail(`${u.unit}: acquisition ${u.run.status}`);
  if (u.proposed_action === "hold_for_owner_review" && !acceptStop) fail(`${u.unit} is held for owner review:\n  ${u.stops.join("\n  ")}\nPass --accept-stop "<owner decision>" only after the owner has reviewed and accepted these points.`);
  if (u.proposed_action === "no_change") fail(`${u.unit} has no changes`);
}

// Stage validation covered the combined state of every changed unit, so all of them are applied together.
const changedUnits = plan.units.filter((u) => u.run.status === "ok" && u.proposed_action !== "no_change").map((u) => u.unit);
const missing = changedUnits.filter((id) => !selected.some((u) => u.unit === id));
if (missing.length) fail(`stage validation covered ${changedUnits.join(", ")} together; also apply ${missing.join(", ")} or re-plan with --units`);
for (const u of selected) {
  for (const dep of UNITS[u.unit].dependsOn ?? []) {
    const d = plan.units.find((x) => x.unit === dep);
    if (d && d.proposed_action !== "no_change" && d.proposed_action !== "not_checked" && !selected.some((x) => x.unit === dep)) fail(`${u.unit} was planned against staged ${dep} data; apply ${dep} in the same run or re-plan ${u.unit} alone`);
  }
}

const ledgerFile = path.join(root, LEDGER_PATH);
const ledger = verifyLedger(ledgerFile);
if (!ledger.ok) fail(ledger.error);

// Independent re-verification (the plan JSON is not trusted): record diffs, Serbia comparability flags and formal-model
// exposure are recomputed from the canonical and staged files themselves.
for (const u of selected) {
  const unit = UNITS[u.unit];
  const manifest = unit.manifest && fs.existsSync(path.join(root, unit.manifest)) ? readJson(path.join(root, unit.manifest)) : null;
  for (const store of unit.stores) {
    const series = diffStore(store.kind, readJson(path.join(root, store.path)), readJson(path.join(stage, store.path)), manifest?.overlap_tolerance ?? DEFAULT_TOLERANCE);
    for (const s of series) {
      const flags = seriesFlags(s);
      const hard = flags.filter((f) => NON_OVERRIDABLE.has(f));
      if (hard.length) fail(`${store.path} ${s.series}: ${hard.join(", ")} — never applied by a routine refresh (not overridable)`);
      if (flags.length && !acceptStop) fail(`${store.path} ${s.series}: ${flags.join(", ")} — owner review required`);
    }
  }
  if (u.unit === "serbia-sors") {
    const mapping = readJson(path.join(root, "src/data/serbia/serbia_indicator_mapping.json"));
    const mappings = Object.values(mapping).filter(Array.isArray).flat().filter((m) => m && m.atlas_indicator);
    for (const store of unit.stores) {
      for (const src of readJson(path.join(stage, store.path)).series_sources ?? []) {
        const m = mappings.find((x) => x.atlas_indicator === src.mapping);
        if (m && typeof m.cross_country_comparable === "boolean" && m.cross_country_comparable !== src.cross_country_comparable) fail(`Serbia ${src.series}: cross_country_comparable differs from the owner-maintained mapping registry (not overridable)`);
      }
    }
  }
  const substantive = u.files.filter((f) => !/\/raw\//.test(f.file) && compareFiles(path.join(root, f.file), path.join(stage, f.file)) === "substantive").map((f) => f.file);
  const pins = findHashPins(root, Object.fromEntries(substantive.map((f) => [f, fileSha(path.join(root, f))])));
  const snapshots = snapshotCoverage(root);
  for (const f of substantive) {
    const external = (pins[f] ?? []).filter((p) => !unit.writeSet.some((w) => (w.endsWith("/") ? p.startsWith(w) : p === w)));
    if (unit.modelLinked.includes(f) || ((DECLARED_FORMAL_INPUTS[f] || external.length) && !snapshots[f])) fail(`${f} is a formal model input or readiness file (${DECLARED_FORMAL_INPUTS[f] ?? (external.slice(0, 3).join(", ") || "model-linked")}) — routine refresh stops here`);
  }
}

// Stale-plan checks, then write.
const writes = [];
for (const u of selected) {
  for (const f of u.files) {
    // Model-linked files are never written; a timestamp-only rewrite of one (e.g. the legacy var_readiness.json) is left as is.
    if (UNITS[u.unit].modelLinked.includes(f.file) && f.change === "timestamp_only") continue;
    if (FORBIDDEN_TARGETS.includes(f.file) || !UNITS[u.unit].writeSet.some((p) => (p.endsWith("/") ? f.file.startsWith(p) : f.file === p))) fail(`${f.file} is outside the ${u.unit} write-set`);
    if (fileSha(path.join(root, f.file)) !== f.canonical_sha256) fail(`${f.file} changed since the plan was made — re-run the plan`);
    if (fileSha(path.join(stage, f.file)) !== f.staged_sha256) fail(`staged ${f.file} changed after planning — re-run the plan`);
    writes.push({ unit: u.unit, ...f });
  }
}
for (const w of writes) {
  const target = path.join(root, w.file);
  if (w.change === "removed") fs.rmSync(target, { force: true });
  else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(stage, w.file), target); }
}

// Owner-accepted coverage re-audit (descriptive audit only; the plan verified the formal-input series count is unchanged).
const AUDIT = "src/data/data-coverage/descriptive_data_coverage_audit.json";
let reaudit = null;
if (plan.coverage_reaudit === "required_passes_after_reaudit") {
  const previous = { sha256: fileSha(path.join(root, AUDIT)), formal: readJson(path.join(root, AUDIT)).summary.formal_model_input_series };
  const run = spawnSync("node", ["scripts/data-coverage/audit.mjs"], { cwd: root, encoding: "utf8" });
  if (run.status !== 0) console.error(`WARNING: coverage re-audit failed: ${run.stderr.trim().split("\n").at(-1)}`);
  const formal = readJson(path.join(root, AUDIT)).summary.formal_model_input_series;
  reaudit = { file: AUDIT, previous_sha256: previous.sha256, new_sha256: fileSha(path.join(root, AUDIT)), formal_model_input_series: [previous.formal, formal], status: run.status === 0 ? "regenerated" : "failed" };
  if (formal !== previous.formal) console.error(`WARNING: formal_model_input_series changed ${previous.formal} → ${formal}; restore ${AUDIT} and review`);
}

const entry = {
  schema_version: "data-refresh-ledger-entry-v1",
  tool_version: TOOL_VERSION,
  run_id: plan.run_id,
  mode: plan.mode,
  planned_at: plan.created_at,
  applied_at: new Date().toISOString(),
  plan_sha256: sha256(planText),
  repository_head_at_plan: plan.repository_head,
  owner_acceptance_of_stop_conditions: acceptStop ?? null,
  formal_model_impact: "none",
  stage_validators: plan.stage_validators,
  coverage_reaudit: reaudit,
  units: selected.map((u) => ({
    unit: u.unit,
    source_family: u.family,
    acquisition: u.run.command,
    stop_conditions_accepted: acceptStop ? u.stops : [],
    files: writes.filter((w) => w.unit === u.unit).map((w) => ({ file: w.file, change: w.change, previous_sha256: w.canonical_sha256, previous_git_blob: w.canonical_git_blob, new_sha256: w.staged_sha256 })),
    stores: u.stores,
    revisions: plan.rows.filter((r) => r.unit === u.unit && r.revision_count).map((r) => ({ series: r.series, revisions: r.detail.revisions })),
    new_periods: plan.rows.filter((r) => r.unit === u.unit && r.new_observation_count).map((r) => ({ series: r.series, periods: r.detail.new_periods })),
    deletions: plan.rows.filter((r) => r.unit === u.unit && r.deletion_count).map((r) => ({ series: r.series, deletions: r.detail.deletions })),
    provenance: u.provenance,
  })),
  previous_entry_sha256: ledger.last,
};
fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
fs.appendFileSync(ledgerFile, `${JSON.stringify(entry)}\n`);

console.log(`Applied ${writes.length} file(s) from ${selected.map((u) => u.unit).join(", ")}; ledger entry ${ledger.entries + 1} appended to ${LEDGER_PATH}.`);
if (reaudit) console.log(`Coverage audit regenerated (formal input series ${reaudit.formal_model_input_series.join(" → ")}).`);
// Validators on the real tree (they passed in the stage; this confirms the applied state).
let failed = 0;
for (const command of STAGE_VALIDATORS) {
  const [, ...rest] = command.split(" ");
  const result = spawnSync("pnpm", ["-s", ...rest], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) failed += 1;
  console.log(`${result.status === 0 ? "pass" : "FAIL"}  ${command}`);
}
if (failed) console.error(`${failed} validator(s) failed after apply — review with git diff; previous files are recorded in the ledger (git cat-file -p <previous_git_blob>).`);
console.log("Next: pnpm ui-language:qa && pnpm lint && pnpm typecheck && pnpm build:site && pnpm test:ui, then the research-boundary-reviewer.");
process.exit(failed ? 1 : 0);
