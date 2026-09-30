// Official descriptive-data refresh — PLAN (mandatory pre-write audit). Never writes the canonical trees.
//
// 1. Clones the repository's data and scripts into .tmp-data-refresh/<run>/stage (copy-on-write where the filesystem allows).
// 2. Runs the registered acquisition script of every unit in the requested mode inside that stage.
// 3. Diffs the staged stores against the canonical ones record by record (new / revised / removed observations, unit,
//    definition, territorial, comparability and cross-country-status changes), checks side effects outside each unit's
//    write-set, provenance, formal-model-input exposure and Serbia-specific preservation rules.
// 4. Runs every descriptive validator inside the stage (cross-store couplings) and classifies coverage-audit failures.
// 5. Writes .tmp-data-refresh/<run>/data_refresh_plan.json and data_refresh_report.md, and prints the report path.
//
// Usage: node scripts/data-refresh/plan.mjs --mode monthly|annual|regional|serbia|all-descriptive [--offline] [--units a,b]
//        [--run <id>] [--timeout-min 30] [--from-stage <earlier-run-id>]
// --from-stage re-evaluates an earlier run's staged acquisitions without fetching again (e.g. after a tooling change).
// Exit code 0 = plan written with no stop condition; 3 = plan written and STOP for owner review; 1 = tool error.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compareFiles, DECLARED_FORMAL_INPUTS, seriesFlags, DEFAULT_TOLERANCE, diffStore, fileSha, findHashPins, gitBlobId, jsonStatSeries, listFiles, readJson, snapshotCoverage, TOOL_VERSION } from "./lib.mjs";
import { FORBIDDEN_TARGETS, inWriteSet, MODES, STAGE_VALIDATORS, UNITS } from "./units.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const arg = (name, fallback = null) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
const mode = arg("mode");
if (!MODES[mode]) { console.error(`--mode must be one of: ${Object.keys(MODES).join(", ")}`); process.exit(1); }
const offline = args.includes("--offline");
const unitIds = arg("units") ? arg("units").split(",").filter((u) => MODES[mode].includes(u)) : MODES[mode];
const runId = arg("run") ?? `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}-${mode}${offline ? "-offline" : ""}`;
const timeoutMs = Number(arg("timeout-min", "30")) * 60_000;
const runDir = path.join(root, ".tmp-data-refresh", runId);
const fromStage = arg("from-stage");
const previousPlan = fromStage ? readJson(path.join(root, ".tmp-data-refresh", fromStage, "data_refresh_plan.json")) : null;
const stage = fromStage ? path.join(root, ".tmp-data-refresh", fromStage, "stage") : path.join(runDir, "stage");
const rel = (file) => path.relative(root, file).split(path.sep).join("/");
const PROTECTED = ["src/data", "public/research-data"];

// ---------------------------------------------------------------------------------------------------------------
// 1. Stage
// ---------------------------------------------------------------------------------------------------------------
if (fs.existsSync(runDir)) { console.error(`Run directory exists: ${rel(runDir)} — pass a new --run id.`); process.exit(1); }
fs.mkdirSync(path.join(runDir, "logs"), { recursive: true });
const clone = (from, to) => fromStage ? undefined : fs.cpSync(path.join(root, from), path.join(stage, to ?? from), { recursive: true, preserveTimestamps: true, mode: fs.constants.COPYFILE_FICLONE });
// All of src/ and docs/ are staged because the validators also read UI and engine sources; public/data (boundaries,
// region code maps) is read by the regional acquisition. Only src/data and public/research-data are diffed.
for (const dir of ["scripts", "src", "docs", "public/research-data", "public/data"]) if (fs.existsSync(path.join(root, dir))) clone(dir);
const venv = [path.join(root, ".venv"), process.env.DATA_REFRESH_VENV].find((p) => p && fs.existsSync(path.join(p, "bin/python")));
if (!fromStage) {
  fs.copyFileSync(path.join(root, "package.json"), path.join(stage, "package.json"));
  fs.symlinkSync(path.join(root, "node_modules"), path.join(stage, "node_modules"));
  if (venv) fs.symlinkSync(venv, path.join(stage, ".venv"));
}
const canonicalSnapshot = Object.fromEntries(PROTECTED.flatMap((d) => listFiles(path.join(root, d)).map((f) => {
  const s = fs.statSync(path.join(root, d, f));
  return [`${d}/${f}`, `${s.size}:${Math.round(s.mtimeMs)}`];
})));

// ---------------------------------------------------------------------------------------------------------------
// 2. Run the registered acquisitions inside the stage
// ---------------------------------------------------------------------------------------------------------------
const runs = {};
for (const id of unitIds) {
  const unit = UNITS[id];
  if (unit.blocked) { runs[id] = { status: "blocked", reason: unit.blocked }; continue; }
  if (previousPlan) { runs[id] = previousPlan.units.find((u) => u.unit === id)?.run ?? { status: "skipped", reason: `not in run ${fromStage}` }; continue; }
  let [cmd, ...cmdArgs] = unit.command;
  if (cmd === "python") cmd = venv ? path.join(stage, ".venv/bin/python") : "python3";
  if (offline) {
    if (!unit.offline) { runs[id] = { status: "skipped", reason: "source has no offline replay; run without --offline to fetch" }; continue; }
    if (unit.offline.flag) cmdArgs.push(unit.offline.flag);
    if (unit.offline.cacheDir) {
      if (!fs.existsSync(path.join(root, unit.offline.cacheDir))) { runs[id] = { status: "skipped", reason: `no local response cache (${unit.offline.cacheDir})` }; continue; }
      clone(unit.offline.cacheDir);
    }
  }
  const started = new Date();
  const result = spawnSync(cmd, cmdArgs, { cwd: stage, encoding: "utf8", timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024, env: { ...process.env, NODE_OPTIONS: "" } });
  const log = `$ ${[cmd, ...cmdArgs].join(" ")}\nexit=${result.status} signal=${result.signal ?? ""}\n--- stdout ---\n${result.stdout ?? ""}\n--- stderr ---\n${result.stderr ?? ""}${result.error ? `\n--- error ---\n${result.error.message}` : ""}\n`;
  fs.writeFileSync(path.join(runDir, "logs", `${id}.log`), log);
  runs[id] = { status: result.status === 0 ? "ok" : "failed", command: [unit.command[0], ...cmdArgs].join(" "), started_at: started.toISOString(), duration_seconds: Math.round((Date.now() - started.getTime()) / 1000), exit_code: result.status, log: rel(path.join(runDir, "logs", `${id}.log`)), stderr_tail: (result.stderr || result.error?.message || "").trim().split("\n").slice(-5).join("\n") };
}

// ---------------------------------------------------------------------------------------------------------------
// 3. Changed files (stage vs canonical), assigned to units or flagged as unregistered side effects
// ---------------------------------------------------------------------------------------------------------------
const stagedFiles = new Set(PROTECTED.flatMap((d) => listFiles(path.join(stage, d)).map((f) => `${d}/${f}`)));
const changed = [];
for (const file of new Set([...Object.keys(canonicalSnapshot), ...stagedFiles])) {
  const staged = path.join(stage, file);
  if (stagedFiles.has(file)) {
    const s = fs.statSync(staged);
    if (canonicalSnapshot[file] === `${s.size}:${Math.round(s.mtimeMs)}`) continue;
  }
  const kind = compareFiles(path.join(root, file), staged);
  if (kind !== "identical") changed.push({ file, change: kind });
}
// Gitignored build artifacts under the protected trees (e.g. the research-package zip) are not canonical data.
const ignored = new Set(spawnSync("git", ["ls-files", "--others", "--ignored", "--exclude-standard", "--", ...PROTECTED], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stdout.split("\n").filter(Boolean));
changed.splice(0, changed.length, ...changed.filter((c) => !ignored.has(c.file)));
const ownerOf = (file) => unitIds.find((id) => inWriteSet(UNITS[id], file) || UNITS[id].modelLinked.includes(file));
// With --from-stage and a narrower mode, files owned by the earlier run's other units are out of scope, not side effects.
const outOfScope = (file) => previousPlan && previousPlan.units.some((u) => !unitIds.includes(u.unit) && (inWriteSet(UNITS[u.unit], file) || UNITS[u.unit].modelLinked.includes(file)));
if (previousPlan) changed.splice(0, changed.length, ...changed.filter((c) => ownerOf(c.file) || !outOfScope(c.file)));
const unregistered = changed.filter((c) => !ownerOf(c.file) && c.change !== "timestamp_only");

// ---------------------------------------------------------------------------------------------------------------
// 4. Formal-model-input exposure (hash pins outside the unit, declared inputs, research snapshots)
// ---------------------------------------------------------------------------------------------------------------
const substantive = changed.filter((c) => c.change !== "timestamp_only");
const pinTargets = Object.fromEntries(substantive.filter((c) => !/\/raw\//.test(c.file)).map((c) => [c.file, fileSha(path.join(root, c.file))]));
const pins = findHashPins(root, pinTargets);
const snapshots = snapshotCoverage(root);
const formalExposure = [];
for (const c of substantive) {
  const unit = UNITS[ownerOf(c.file)];
  const external = (pins[c.file] ?? []).filter((p) => !(unit && inWriteSet(unit, p)));
  const declared = DECLARED_FORMAL_INPUTS[c.file];
  const modelLinked = unit?.modelLinked.includes(c.file);
  if (!external.length && !declared && !modelLinked) continue;
  const covered = snapshots[c.file];
  formalExposure.push({
    file: c.file, change: c.change, declared_formal_input: declared ?? null, model_linked_file: Boolean(modelLinked), pinned_by: external,
    covered_by_research_snapshot: covered ? covered.snapshot_path : null,
    impact: covered && !modelLinked ? "none (published research uses the frozen snapshot)" : "formal model input or readiness would change",
  });
}
const formalImpact = formalExposure.filter((f) => f.impact !== "none (published research uses the frozen snapshot)");

// ---------------------------------------------------------------------------------------------------------------
// 5. Per-unit record diffs, provenance and stop conditions
// ---------------------------------------------------------------------------------------------------------------
const toleranceFor = (unit) => {
  const manifest = unit.manifest && fs.existsSync(path.join(root, unit.manifest)) ? readJson(path.join(root, unit.manifest)) : null;
  return manifest?.overlap_tolerance ?? DEFAULT_TOLERANCE;
};
const provenanceEntries = (doc) => (doc?.sources ?? doc?.tables ?? doc?.datasets ?? []).map((s) => ({
  source: s.dataset_id ?? s.dataset ?? s.table ?? s.key ?? null, endpoint: s.source_url ?? s.url ?? s.download_url ?? null, http_status: s.http_status ?? null,
  retrieved_at: s.retrieved_at ?? doc.retrieval_date ?? null, dataset_updated_at: s.dataset_updated_at ?? s.updated ?? null,
  checksum: s.sha256 ?? s.response_sha256 ?? s.file_sha256 ?? s.extract_sha256 ?? null, raw_file: s.raw_file ?? s.extract_file ?? null,
}));
const manifestOf = (unit, base) => {
  const candidates = [unit.manifest, ...unit.writeSet.filter((p) => /manifest\.json$/.test(p))].filter(Boolean);
  const file = candidates.map((c) => path.join(base, c)).find((f) => fs.existsSync(f));
  return file ? readJson(file) : null;
};

const units = [];
const rows = [];
for (const id of unitIds) {
  const unit = UNITS[id];
  const run = runs[id];
  const entry = { unit: id, label: unit.label, family: unit.family, run, stores: [], files: [], provenance: null, stops: [], warnings: [], validators: unit.validators, note: unit.note ?? null };
  units.push(entry);
  if (run.status !== "ok") { entry.proposed_action = run.status === "skipped" ? "not_checked" : run.status === "blocked" ? "blocked_by_owner_decision" : "hold_acquisition_failed"; if (run.status === "failed") entry.stops.push(`acquisition failed (exit ${run.exit_code}); see ${run.log}`); continue; }
  const tolerance = toleranceFor(unit);
  entry.files = changed.filter((c) => ownerOf(c.file) === id).map((c) => ({ ...c, canonical_sha256: fileSha(path.join(root, c.file)), staged_sha256: fileSha(path.join(stage, c.file)), canonical_git_blob: gitBlobId(path.join(root, c.file)) }));
  for (const store of unit.stores) {
    const canonicalDoc = readJson(path.join(root, store.path));
    const stagedDoc = readJson(path.join(stage, store.path));
    const series = diffStore(store.kind, canonicalDoc, stagedDoc, tolerance);
    const storeSummary = { path: store.path, kind: store.kind, tolerance, series: series.length, new_observations: 0, revisions: 0, revisions_beyond_tolerance: 0, deletions: 0 };
    for (const s of series) {
      const flags = seriesFlags(s);
      const changedAtAll = s.new_observations.length || s.revisions.length || flags.length;
      const proposed = flags.length ? "hold_for_owner_review" : s.revisions.length ? "apply_revisions_within_tolerance_and_new_periods" : s.new_observations.length ? "append_new_periods" : "no_change";
      storeSummary.new_observations += s.new_observations.length;
      storeSummary.revisions += s.revisions.length;
      storeSummary.revisions_beyond_tolerance += s.revisions.filter((r) => r.beyond_tolerance).length;
      storeSummary.deletions += s.deletions.length;
      if (!changedAtAll) continue;
      rows.push({
        unit: id, store: store.path, source: s.source ?? unit.family, dataset: s.dataset, country: s.country, indicator: s.indicator, series: s.series,
        current_latest_period: s.current_latest_period, source_latest_period: s.source_latest_period,
        new_observation_count: s.new_observations.length, revision_count: s.revisions.length, revisions_beyond_tolerance: s.revisions.filter((r) => r.beyond_tolerance).length, deletion_count: s.deletions.length,
        definition_or_break_changes: [...s.definition_changes, ...s.unit_changes, ...s.territorial_changes, ...s.comparability_changes, ...s.cross_country_changes, ...s.new_record_mismatches].slice(0, 10),
        stop_flags: flags, proposed_action: proposed,
        detail: { new_periods: s.new_observations.map((o) => o.period), revisions: s.revisions.slice(0, 200), deletions: s.deletions.slice(0, 200), null_to_zero: s.null_to_zero.slice(0, 50), gap_filled: s.gap_filled.slice(0, 50), new_record_mismatches: s.new_record_mismatches.slice(0, 50) },
      });
      for (const flag of flags) entry.stops.push(`${store.path} ${s.series}: ${flag}`);
    }
    entry.stores.push(storeSummary);
  }
  // Provenance: every retrieval must carry endpoint, status, time and checksum; changes vs the canonical manifest are listed.
  const before = provenanceEntries(manifestOf(unit, root));
  const after = provenanceEntries(manifestOf(unit, stage));
  entry.provenance = {
    retrievals: after,
    missing_fields: after.filter((p) => !p.endpoint || !p.retrieved_at || !p.checksum).map((p) => p.source),
    source_metadata_changes: after.map((a) => {
      const b = before.find((x) => x.source === a.source && x.endpoint === a.endpoint) ?? (before.filter((x) => x.source === a.source).length === 1 ? before.find((x) => x.source === a.source) : null);
      return b && (b.dataset_updated_at !== a.dataset_updated_at || b.endpoint !== a.endpoint) ? { source: a.source, dataset_updated_at: [b.dataset_updated_at, a.dataset_updated_at], endpoint_changed: b.endpoint !== a.endpoint } : null;
    }).filter(Boolean),
    new_sources: after.filter((a) => !before.some((b) => b.source === a.source)).map((a) => a.source),
    dropped_sources: before.filter((b) => !after.some((a) => a.source === b.source)).map((b) => b.source),
    overwritten_raw_archives: entry.files.filter((f) => /\/raw\//.test(f.file) && f.change !== "added").map((f) => ({ file: f.file, previous_sha256: f.canonical_sha256, previous_git_blob: f.canonical_git_blob })),
    parser: { tool: TOOL_VERSION, acquisition_script: unit.command.at(-1), acquisition_script_sha256: fileSha(path.join(root, unit.command.at(-1))) },
  };
  // Admission-gate outcomes recorded in the unit manifest (series status / overlap check) must not change silently:
  // a held series becoming ingested (or the reverse) is a methodology decision for the owner.
  const seriesKey = (s) => [s.series ?? s.indicator, s.country ?? s.country_slug ?? s.region_id ?? ""].filter(Boolean).join(":");
  const beforeSeries = new Map((manifestOf(unit, root)?.series ?? manifestOf(unit, root)?.pairs ?? []).map((s) => [seriesKey(s), s]));
  const afterSeries = manifestOf(unit, stage)?.series ?? manifestOf(unit, stage)?.pairs ?? [];
  const gate = (s) => `${s.status ?? "—"} / ${typeof s.overlap_check === "object" && s.overlap_check !== null ? s.overlap_check.result ?? "—" : s.overlap_check ?? "—"}`;
  entry.admission_changes = afterSeries.map((a) => {
    const b = beforeSeries.get(seriesKey(a));
    if (!b) return { series: seriesKey(a), previous: null, staged: a.status ?? null };
    return gate(b) !== gate(a) ? { series: seriesKey(a), previous: gate(b), staged: gate(a) } : null;
  }).filter(Boolean);
  const afterKeys = new Set(afterSeries.map(seriesKey));
  for (const key of beforeSeries.keys()) if (!afterKeys.has(key)) entry.admission_changes.push({ series: key, previous: gate(beforeSeries.get(key)), staged: "dropped from manifest" });
  for (const c of entry.admission_changes) entry.stops.push(`admission decision changed for ${c.series}: ${c.previous ?? "new"} → ${c.staged}`);
  for (const dep of unit.dependsOn ?? []) if (unitIds.includes(dep)) entry.warnings.push(`depends on ${dep} in this run (staged ${dep} data was used); apply both together or neither`);
  if (entry.provenance.missing_fields.length) entry.warnings.push(`retrievals without endpoint/time/checksum: ${entry.provenance.missing_fields.join(", ")}`);
  if (entry.provenance.dropped_sources.length) entry.stops.push(`source dropped from manifest: ${entry.provenance.dropped_sources.join(", ")}`);
  // Serbia: preservation of original codes/units/URLs and of the mapping registry's comparability decision.
  if (id === "serbia-sors") {
    const mapping = readJson(path.join(root, "src/data/serbia/serbia_indicator_mapping.json"));
    const mappings = Object.values(mapping).filter(Array.isArray).flat().filter((m) => m && m.atlas_indicator);
    const issues = [];
    for (const store of unit.stores) {
      const doc = readJson(path.join(stage, store.path));
      for (const s of doc.series_sources ?? []) {
        if (!s.original_code || !s.source_url) issues.push(`${s.series}: original SORS code or source URL missing`);
        const m = mappings.find((x) => x.atlas_indicator === s.mapping);
        if (m && typeof m.cross_country_comparable === "boolean" && m.cross_country_comparable !== s.cross_country_comparable) issues.push(`${s.series}: cross_country_comparable ${s.cross_country_comparable} differs from mapping registry (${m.cross_country_comparable})`);
      }
      const missing = doc.records.filter((r) => r.original_value === undefined || !r.original_unit || !r.normalized_unit || typeof r.cross_country_comparable !== "boolean").length;
      if (missing) issues.push(`${store.path}: ${missing} records lack original value/unit, normalised unit or cross_country_comparable`);
      const transformations = (doc.series_sources ?? []).filter((s) => s.mapping_status === "requires_transformation" && !s.transformation && !doc.transformation && !s.overlap_check).length;
      if (transformations) entry.warnings.push(`${store.path}: ${transformations} transformed series without an inline transformation record (see serbia_ingestion_manifest.json)`);
    }
    for (const reg of unit.registries) if (changed.some((c) => c.file === reg)) issues.push(`${reg} changed during ingestion (registries are owner-maintained)`);
    entry.serbia_checks = { issues, non_overridable: issues.length > 0 };
    entry.stops.push(...issues.map((i) => `Serbia: ${i}`));
  }
  const unitChanges = entry.stores.reduce((n, s) => n + s.new_observations + s.revisions + s.deletions, 0);
  entry.proposed_action = entry.stops.length ? "hold_for_owner_review" : unitChanges ? "apply_after_confirmation" : "no_change";
}

// Annual source-ahead check: official periods newer than observations.json and revisions of its stored values.
const sourceAhead = [];
if (unitIds.includes("annual-history") && runs["annual-history"]?.status === "ok") {
  const history = readJson(path.join(stage, "src/data/historical/annual_descriptive_history.json"));
  const observations = readJson(path.join(root, "src/data/observations/observations.json")).records;
  const tolerance = toleranceFor(UNITS["annual-history"]);
  const specs = new Map();
  for (const r of history.records) if (r.provenance?.selection && !specs.has(`${r.indicator}|${r.country_slug}`)) specs.set(`${r.indicator}|${r.country_slug}`, r);
  const rawCache = new Map();
  for (const [key, spec] of specs) {
    const [indicator, slug] = key.split("|");
    const rawFile = path.join(stage, spec.provenance.raw_file);
    if (!rawCache.has(rawFile)) rawCache.set(rawFile, fs.existsSync(rawFile) ? readJson(rawFile) : null);
    const raw = rawCache.get(rawFile);
    if (!raw) continue;
    const selection = Object.fromEntries(Object.entries(spec.provenance.selection).filter(([dim]) => dim !== "time"));
    const sourceSeries = jsonStatSeries(raw, { freq: "A", ...selection });
    const stored = observations.filter((o) => o.indicator === indicator && o.country_slug === slug && o.value !== null);
    if (!stored.length) continue;
    const storedLatest = Math.max(...stored.map((o) => o.year));
    const newer = sourceSeries.filter((p) => Number(p.period) > storedLatest);
    const revised = stored.map((o) => ({ year: o.year, stored: o.value, source: sourceSeries.find((p) => Number(p.period) === o.year)?.value ?? null })).filter((o) => o.source !== null && Math.abs(o.source - o.stored) > Math.max(tolerance.absolute, tolerance.relative * Math.abs(o.stored)));
    const absent = stored.filter((o) => o.year >= Number(sourceSeries[0]?.period ?? 0) && !sourceSeries.some((p) => Number(p.period) === o.year)).map((o) => o.year);
    if (newer.length || revised.length || absent.length) sourceAhead.push({ indicator, country: slug, dataset: spec.source_dataset, stored_latest_year: storedLatest, source_latest_year: sourceSeries.at(-1)?.period ?? null, newly_published_years: newer.map((p) => p.period), revisions_beyond_tolerance: revised, stored_years_absent_at_source: absent });
  }
}

// ---------------------------------------------------------------------------------------------------------------
// 5b. Validators inside the stage. Every descriptive validator runs (not only the mode's units): stores are coupled —
//     e.g. monthly-history re-derives its overlap gate from the high-frequency file, and the coverage audit
//     fingerprints every audited window — so a routine-looking unit can break another store's validator.
// ---------------------------------------------------------------------------------------------------------------
const anyAcquired = Object.values(runs).some((r) => r.status === "ok");
const stageValidators = anyAcquired ? STAGE_VALIDATORS.map((command) => {
  const [bin, ...rest] = command.split(" ");
  const result = spawnSync(bin === "pnpm" ? "pnpm" : bin, bin === "pnpm" ? ["-s", ...rest] : rest, { cwd: stage, encoding: "utf8", timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return { command, status: result.status === 0 ? "pass" : "fail", message: result.status === 0 ? null : (output.match(/AssertionError[^\n]*|Error:[^\n]*/)?.[0] ?? output.trim().split("\n").slice(-3).join(" ")).slice(0, 400) };
}) : [];
// A coverage-audit failure is re-tested after regenerating the audit in the stage (then restored), so the plan can say
// whether an owner-approved re-audit resolves it.
let coverageReaudit = "not_needed";
if (stageValidators.find((v) => v.command === "pnpm data-coverage:validate")?.status === "fail") {
  const auditFile = path.join(stage, "src/data/data-coverage/descriptive_data_coverage_audit.json");
  const saved = fs.readFileSync(auditFile);
  const audit = spawnSync("node", ["scripts/data-coverage/audit.mjs"], { cwd: stage, encoding: "utf8", timeout: timeoutMs });
  const recheck = audit.status === 0 ? spawnSync("node", ["scripts/data-coverage/validate.mjs"], { cwd: stage, encoding: "utf8", timeout: timeoutMs }) : null;
  const before = readJson(path.join(root, "src/data/data-coverage/descriptive_data_coverage_audit.json"));
  const after = audit.status === 0 ? JSON.parse(fs.readFileSync(auditFile, "utf8")) : null;
  const formalBefore = before.summary?.formal_model_input_series ?? before.summary?.formal_input_series;
  const formalAfter = after?.summary?.formal_model_input_series ?? after?.summary?.formal_input_series;
  coverageReaudit = recheck?.status === 0 ? (formalBefore === formalAfter ? "required_passes_after_reaudit" : "reaudit_changes_formal_input_series") : "fails_even_after_reaudit";
  fs.writeFileSync(auditFile, saved);
}

// ---------------------------------------------------------------------------------------------------------------
// 6. Plan + report
// ---------------------------------------------------------------------------------------------------------------
const forbidden = changed.filter((c) => FORBIDDEN_TARGETS.includes(c.file));
const globalStops = [
  ...unregistered.map((c) => `unregistered side effect: ${c.file} (${c.change})`),
  ...formalImpact.map((f) => `formal model impact: ${f.file} — ${f.declared_formal_input ?? (f.model_linked_file ? "model readiness/registry file" : `pinned by ${f.pinned_by.slice(0, 3).join(", ")}`)}`),
  ...forbidden.map((c) => `release file touched: ${c.file}`),
  ...stageValidators.filter((v) => v.status === "fail" && !(v.command === "pnpm data-coverage:validate" && coverageReaudit === "required_passes_after_reaudit")).map((v) => `validator fails in the stage: ${v.command} — ${v.message}`),
  ...(coverageReaudit === "required_passes_after_reaudit" ? ["coverage re-audit required: revisions inside audited windows; data-coverage:validate passes after `data-coverage:audit` (apply runs it when the owner accepts)"] : []),
  ...(coverageReaudit === "reaudit_changes_formal_input_series" ? ["coverage re-audit would change the formal-input series count (not overridable)"] : []),
];
const stop = globalStops.length > 0 || units.some((u) => u.stops.length);
const plan = {
  schema_version: "data-refresh-plan-v1",
  tool_version: TOOL_VERSION,
  run_id: runId,
  mode,
  offline: previousPlan ? previousPlan.offline : offline,
  staged_by_run: fromStage ?? runId,
  created_at: new Date().toISOString(),
  repository_head: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(),
  stage: rel(stage),
  platform_version_unchanged: true,
  stop_for_owner_review: stop,
  stop_reasons: [...globalStops, ...units.flatMap((u) => u.stops.map((s) => `${u.unit}: ${s}`))],
  formal_model_impact: formalImpact.length ? formalImpact : "none",
  formal_input_exposure: formalExposure,
  units,
  rows,
  annual_source_ahead_of_observations_json: { note: "observations.json is a formal national model input with no registered refresh writer; newer official years and revisions are reported for owner decision and never written by this workflow.", records: sourceAhead },
  stage_validators: stageValidators,
  coverage_reaudit: coverageReaudit,
  unregistered_side_effects: unregistered,
  changed_files: changed,
};
fs.writeFileSync(path.join(runDir, "data_refresh_plan.json"), `${JSON.stringify(plan, null, 2)}\n`);

const sum = (key) => rows.reduce((n, r) => n + r[key], 0);
const lines = [
  `# Official data refresh report — ${mode}${offline ? " (offline replay)" : ""}`,
  "",
  `Run \`${runId}\` · ${plan.created_at} · HEAD ${plan.repository_head.slice(0, 7)} · platform version unchanged`,
  "",
  `**Decision: ${stop ? "STOP — owner review required before any write" : units.some((u) => u.proposed_action === "apply_after_confirmation") ? "routine — may be applied after confirmation" : "no changes to apply"}${units.some((u) => u.run.status === "skipped") ? ` (${units.filter((u) => u.run.status === "skipped").length} source(s) not checked — see coverage gaps)` : ""}**`,
  `**Formal model impact: ${formalImpact.length ? formalImpact.map((f) => f.file).join(", ") : "none"}**`,
  "",
  "## Sources",
  "| Unit | Family | Run | Action | New obs | Revised | Beyond tol. | Removed |",
  "|---|---|---|---|---:|---:|---:|---:|",
  ...units.map((u) => `| ${u.unit} | ${u.family} | ${u.run.status}${u.run.reason ? ` (${u.run.reason})` : ""} | ${u.proposed_action} | ${u.stores.reduce((n, s) => n + s.new_observations, 0)} | ${u.stores.reduce((n, s) => n + s.revisions, 0)} | ${u.stores.reduce((n, s) => n + s.revisions_beyond_tolerance, 0)} | ${u.stores.reduce((n, s) => n + s.deletions, 0)} |`),
  "",
  `Sources checked: ${units.filter((u) => u.run.status === "ok").length}/${units.length} · sources changed: ${units.filter((u) => u.stores.some((s) => s.new_observations + s.revisions + s.deletions)).length} · new observations: ${sum("new_observation_count")} · revised: ${sum("revision_count")} · held series: ${rows.filter((r) => r.proposed_action === "hold_for_owner_review").length}`,
  "",
  "## Stop conditions",
  ...(plan.stop_reasons.length ? plan.stop_reasons.slice(0, 60).map((s) => `- ${s}`) : ["- none"]),
  ...(plan.stop_reasons.length > 60 ? [`- … ${plan.stop_reasons.length - 60} more in data_refresh_plan.json`] : []),
  "",
  "## Held / changed series (first 40)",
  "| Unit | Series | Latest (current → source) | New | Revised | Removed | Flags |",
  "|---|---|---|---:|---:|---:|---|",
  ...rows.slice(0, 40).map((r) => `| ${r.unit} | ${r.series} | ${r.current_latest_period ?? "—"} → ${r.source_latest_period ?? "—"} | ${r.new_observation_count} | ${r.revision_count} | ${r.deletion_count} | ${r.stop_flags.join(", ") || "—"} |`),
  "",
  "## Definition warnings and source metadata",
  ...units.flatMap((u) => [...u.warnings.map((w) => `- ${u.unit}: ${w}`), ...(u.provenance?.source_metadata_changes ?? []).map((m) => `- ${u.unit}: ${m.source} dataset update ${m.dataset_updated_at[0] ?? "—"} → ${m.dataset_updated_at[1] ?? "—"}${m.endpoint_changed ? " (endpoint changed)" : ""}`)]),
  "",
  "## Coverage gaps",
  ...units.filter((u) => u.run.status !== "ok").map((u) => `- ${u.unit}: ${u.run.status} — ${u.run.reason ?? u.run.stderr_tail}`),
  ...(sourceAhead.length ? [`- observations.json (annual model input): ${sourceAhead.filter((s) => s.newly_published_years.length).length} series have newer official years at source; ${sourceAhead.filter((s) => s.revisions_beyond_tolerance.length).length} have stored values revised beyond tolerance — reported only, never written by this workflow.`] : []),
  "",
  "## Serbia",
  ...(units.find((u) => u.unit === "serbia-sors") ? (units.find((u) => u.unit === "serbia-sors").serbia_checks?.issues.length ? units.find((u) => u.unit === "serbia-sors").serbia_checks.issues.map((i) => `- ${i}`) : ["- original SORS codes, source URLs, units and cross-country flags preserved; no series promoted to cross-country comparison"]) : ["- not in this mode"]),
  "",
  "## Validators in the stage",
  ...(stageValidators.length ? stageValidators.map((v) => `- ${v.status === "pass" ? "pass" : "FAIL"} \`${v.command}\`${v.message ? ` — ${v.message}` : ""}`) : ["- not run (no acquisition succeeded)"]),
  `- coverage re-audit: ${coverageReaudit}`,
  "",
  "## Formal model impact",
  ...(formalExposure.length ? formalExposure.map((f) => `- ${f.file}: ${f.impact}`) : ["- none"]),
  "",
  "## Next steps",
  stop ? "Owner review is required. Nothing has been written. Discuss the stop reasons above; routine refresh cannot proceed for held units."
    : !units.some((u) => u.proposed_action === "apply_after_confirmation") ? "Nothing to apply — canonical stores already match the official sources."
    : "Confirm, then apply with `node scripts/data-refresh/apply.mjs --run " + runId + "` (the research-data guard will ask), run the unit validators, then the Part G gate.",
];
fs.writeFileSync(path.join(runDir, "data_refresh_report.md"), `${lines.join("\n")}\n`);
console.log(lines.join("\n"));
console.log(`\nPlan:   ${rel(path.join(runDir, "data_refresh_plan.json"))}\nReport: ${rel(path.join(runDir, "data_refresh_report.md"))}`);
process.exit(stop ? 3 : 0);
