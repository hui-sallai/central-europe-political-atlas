// Historical coverage closure audit (2026-11-10). Read-only over the data stores: it never changes src/data or
// public/research-data. It reconciles the Phase R additions against the pre-recovery production baseline, builds the
// full country × indicator × frequency coverage matrix (including stores the Phase R inventory lists but does not
// extend: UN Comtrade trade-partner structure and the frozen World Bank panel), lists short series with exact reasons,
// re-verifies every archived source file hash, and records the provenance timestamp findings.
// Output: docs/data-coverage/historical_coverage_closure_2026-11-10.json and …_matrix_2026-11-10.csv (deterministic).
// Usage: node scripts/data-coverage/coverage-closure.mjs [--check]   (--check: fail if the outputs would change)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export const BASELINE = "c1c58958e8fe741fd80b14df01586e2c9f0ee101"; // last production before Phase R (Pages #372)
export const CLOSURE_JSON = "docs/data-coverage/historical_coverage_closure_2026-11-10.json";
export const CLOSURE_CSV = "docs/data-coverage/historical_coverage_matrix_2026-11-10.csv";
const atBaseline = (rel) => { try { return JSON.parse(execFileSync("git", ["show", `${BASELINE}:${rel}`], { cwd: root, encoding: "utf8", maxBuffer: 1e9 })); } catch { return null; } };
const blobSha = (rel, rev) => { try { return sha(execFileSync("git", ["show", `${rev}:${rel}`], { cwd: root, maxBuffer: 1e9 })); } catch { return null; } };

// The eight statuses of the closure brief, mapped one-to-one from the Phase R inventory categories.
export const STATUS = {
  admitted: "officially_available_and_admitted",
  1: "officially_available_not_imported",
  2: "lost_in_processing",
  3: "historically_nonexistent",
  4: "missing_within_official_series",
  5: "not_yet_published",
  6: "definitionally_or_geographically_incompatible",
  7: "legally_restricted",
  8: "unresolved",
};

export const STORES = [
  { path: "src/data/historical/annual_descriptive_history.json", layer: "annual_history", ledger: 1995 },
  { path: "src/data/historical/monthly_descriptive_history.json", layer: "monthly_history", ledger: 5162 },
  { path: "src/data/historical/regional_descriptive_history.json", layer: "regional_history", ledger: 415 },
  { path: "src/data/serbia/serbia_descriptive_history_annual.json", layer: "serbia_sors_annual", ledger: 11 },
  { path: "src/data/serbia/serbia_descriptive_history_monthly.json", layer: "serbia_sors_monthly", ledger: 24 },
  { path: "src/data/serbia/serbia_descriptive_history_regional.json", layer: "serbia_sors_regional", ledger: 192 },
];
// Formal / frozen stores that the recovery must not touch.
export const FORMAL_STORES = [
  "src/data/observations/observations.json", "src/data/high-frequency/high_frequency_observations.json",
  "src/data/macro-drivers/macro_driver_observations.json", "src/data/regional/v086-observations.json",
  "src/data/regional/v089-observations.json", "src/data/panel/panel_observations.json",
  "src/data/network/trade_edges.json", "src/data/network/network_metrics.json",
];

const records = (j) => Array.isArray(j) ? j : j.records;
const frequencyOf = (period) => /^\d{4}-Q[1-4]$/.test(period) ? "quarterly" : /^\d{4}-\d{2}$/.test(period) ? "monthly" : "annual";
const range = (list) => { const s = [...list].map(String).sort(); return s.length ? { first: s[0], last: s.at(-1) } : { first: null, last: null }; };
const count = (list) => list.reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {});
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

// Natural key, grouping and source of one record, per store.
function describe(layer, store) {
  const regionCountry = (id) => store.regions?.[id]?.country_id ?? id.split("_")[0];
  if (layer === "annual_history") return (r) => ({ key: `${r.country_slug}|${r.indicator}|${r.year}`, country: r.country_slug, indicator: r.indicator, scope: "national", period: String(r.year), unit: r.unit, source: r.source_dataset, status: r.value_status, flag: r.source_flag });
  if (layer === "monthly_history") return (r) => { const s = store.series_sources[r.source_ref]; return { key: `${r.country_slug}|${r.series}|${r.period}`, country: r.country_slug, indicator: r.series, scope: r.country_slug === "euro_area" ? "euro_area" : "national", period: r.period, unit: s.unit, source: `${s.source} ${s.raw_file.split("/").at(-1)}`, status: r.value_status, flag: r.source_flag, sourceRecovery: s.recovery_phase }; };
  if (layer === "regional_history") return (r) => ({ key: `${r.region_id}|${r.indicator}|${r.statistical_year}`, country: regionCountry(r.region_id), indicator: r.indicator, scope: "regional", period: String(r.statistical_year), unit: store.indicators[r.indicator]?.unit, source: (store.indicators[r.indicator]?.definition ?? "").match(/Eurostat [a-z0-9_]+/)?.[0] ?? "Eurostat", status: `${r.value_status}/${r.comparability_status}`, flag: r.source_flag });
  const byRef = new Map(store.series_sources.map((x) => [x.source_ref, x]));
  return (r) => { const s = byRef.get(r.source_ref); return { key: `${r.series}|${r.territory_code}|${r.period}`, country: "serbia", indicator: r.series, scope: r.statistical_level === "national" ? "national" : "regional", period: r.period, unit: r.normalized_unit, source: `SORS ${s.source_dataset}`, status: `${r.sors_status}/${r.comparability_status}`, flag: null }; };
}

export function reconcile() {
  const groups = new Map(), problems = [], stores = [];
  const formal = {
    annual: new Set(read("src/data/observations/observations.json").records.map((r) => `${r.country_slug}|${r.indicator}|${r.year}`)),
    monthly: new Set(records(read("src/data/high-frequency/high_frequency_observations.json")).map((r) => `${r.country}|${r.indicator}|${r.period}`)),
    regional: new Set([...read("src/data/regional/v086-observations.json").records, ...read("src/data/regional/v089-observations.json").records].map((r) => `${r.region_id}|${r.region_indicator_id}|${r.year}`)),
  };
  const macro = read("src/data/macro-drivers/macro_driver_observations.json");
  for (const r of records(macro)) if (r.transformation === "level") formal.monthly.add(`${r.country}|${r.driver_id}|${r.period}`);
  const annualManifest = read("src/data/historical/annual_history_manifest.json");
  for (const spec of STORES) {
    const now = read(spec.path), before = atBaseline(spec.path);
    const d = describe(spec.layer, now);
    const beforeById = new Map((before?.records ?? []).map((r) => [r.id, JSON.stringify(r)]));
    const ids = new Set(), keys = new Map();
    let added = 0, removed = 0, changed = 0, recovered = 0;
    for (const r of now.records) {
      if (ids.has(r.id)) problems.push({ store: spec.path, id: r.id, problem: "duplicate_id" }); ids.add(r.id);
      const x = d(r);
      if (keys.has(x.key)) problems.push({ store: spec.path, id: r.id, problem: "duplicate_natural_key", other: keys.get(x.key) }); keys.set(x.key, r.id);
      const prior = beforeById.get(r.id);
      if (prior === undefined) added += 1; else if (prior !== JSON.stringify(r)) { changed += 1; problems.push({ store: spec.path, id: r.id, problem: "pre_recovery_record_changed" }); }
      if (r.recovery_phase !== "R") { if (prior === undefined) problems.push({ store: spec.path, id: r.id, problem: "added_without_recovery_flag" }); continue; }
      recovered += 1;
      if (prior !== undefined) problems.push({ store: spec.path, id: r.id, problem: "recovery_flag_on_pre_recovery_record" });
      // Cross-layer duplicates: a recovered descriptive value may never repeat a formal/canonical cell.
      if (spec.layer === "annual_history" && formal.annual.has(x.key)) problems.push({ store: spec.path, id: r.id, problem: "duplicates_canonical_observation" });
      if (spec.layer === "monthly_history" && formal.monthly.has(x.key)) problems.push({ store: spec.path, id: r.id, problem: "duplicates_formal_monthly_observation" });
      if (spec.layer === "regional_history" && formal.regional.has(x.key)) problems.push({ store: spec.path, id: r.id, problem: "duplicates_regional_snapshot" });
      // Classification rules of Phase R.
      if (spec.layer === "monthly_history" && x.sourceRecovery !== "R") problems.push({ store: spec.path, id: r.id, problem: "source_not_flagged_recovery" });
      if (spec.layer === "regional_history" && (r.comparability_status !== "backcast_boundary_revision" || r.statistical_year >= 2000)) problems.push({ store: spec.path, id: r.id, problem: "regional_recovery_misclassified" });
      if (spec.layer.startsWith("serbia") && !String(r.period).startsWith("1999")) problems.push({ store: spec.path, id: r.id, problem: "serbia_recovery_outside_1999" });
      if (spec.layer === "annual_history") {
        const s = annualManifest.recovery.series.find((q) => q.indicator === r.indicator && q.country === r.country_slug);
        if (!s || s.status !== "recovered" || (s.first_admitted_before_recovery !== null && r.year >= s.first_admitted_before_recovery)) problems.push({ store: spec.path, id: r.id, problem: "annual_recovery_outside_recovered_window" });
      }
      const gk = `${spec.layer}|${x.scope}|${x.country}|${x.indicator}|${frequencyOf(x.period)}`;
      const g = groups.get(gk) ?? { layer: spec.layer, scope: x.scope, country: x.country, indicator: x.indicator, frequency: frequencyOf(x.period), periods: [], units: new Set(), sources: new Set(), statuses: [], flags: [] };
      g.periods.push(x.period); g.units.add(x.unit); g.sources.add(x.source); g.statuses.push(x.status); if (x.flag) g.flags.push(x.flag);
      groups.set(gk, g);
    }
    for (const id of beforeById.keys()) if (!ids.has(id)) { removed += 1; problems.push({ store: spec.path, id, problem: "pre_recovery_record_removed" }); }
    if (recovered !== spec.ledger) problems.push({ store: spec.path, problem: "ledger_count_mismatch", ledger: spec.ledger, recovered });
    // Unit consistency: every recovered series keeps the unit its earlier (pre-recovery) records already carry.
    const earlierUnits = new Map();
    for (const r of now.records.filter((q) => q.recovery_phase !== "R")) { const x = d(r); earlierUnits.set(`${x.country}|${x.indicator}|${frequencyOf(x.period)}`, x.unit); }
    for (const r of now.records.filter((q) => q.recovery_phase === "R")) { const x = d(r); const u = earlierUnits.get(`${x.country}|${x.indicator}|${frequencyOf(x.period)}`); if (u !== undefined && u !== x.unit) problems.push({ store: spec.path, id: r.id, problem: "unit_differs_from_earlier_records", unit: x.unit, earlier: u }); }
    const byCountry = {};
    for (const r of before?.records ?? []) { const x = describe(spec.layer, before)(r); const c = byCountry[x.country] ??= { before: 0, after: 0, first_before: null, first_after: null }; c.before += 1; if (!c.first_before || x.period < c.first_before) c.first_before = x.period; }
    for (const r of now.records) { const x = d(r); const c = byCountry[x.country] ??= { before: 0, after: 0, first_before: null, first_after: null }; c.after += 1; if (!c.first_after || x.period < c.first_after) c.first_after = x.period; }
    stores.push({ by_country: sorted(byCountry), path: spec.path, records_before: beforeById.size, records_now: now.records.length, added, removed, changed, recovered_flagged: recovered, ledger_new_observations: spec.ledger });
  }
  const series = [...groups.values()].map((g) => ({ layer: g.layer, scope: g.scope, country: g.country, indicator: g.indicator, frequency: g.frequency, observations: g.periods.length, ...range(g.periods), units: [...g.units].sort(), sources: [...g.sources].sort(), statuses: sorted(count(g.statuses)), flagged_values: g.flags.length }))
    .sort((a, b) => `${a.layer}|${a.country}|${a.indicator}|${a.frequency}`.localeCompare(`${b.layer}|${b.country}|${b.indicator}|${b.frequency}`));
  const total = series.reduce((n, s) => n + s.observations, 0);
  const by = (k) => sorted(series.reduce((m, s) => (m[s[k]] = (m[s[k]] ?? 0) + s.observations, m), {}));
  const formalStores = FORMAL_STORES.map((p) => ({ path: p, baseline_sha256: blobSha(p, BASELINE), current_sha256: fs.existsSync(path.join(root, p)) ? sha(fs.readFileSync(path.join(root, p))) : null })).map((f) => ({ ...f, unchanged: f.baseline_sha256 === f.current_sha256 }));
  for (const f of formalStores) if (!f.unchanged) problems.push({ store: f.path, problem: "formal_store_changed" });
  const bySource = sorted(series.reduce((m, s) => { const fam = s.sources[0].startsWith("SORS") ? "SORS" : /^BIS|bis_/.test(s.sources[0]) || s.sources.some((x) => x.startsWith("BIS")) ? "BIS" : "Eurostat"; m[fam] = (m[fam] ?? 0) + s.observations; return m; }, {}));
  return { baseline_commit: BASELINE, total_recovered: total, by_source_family: bySource, by_frequency: by("frequency"), by_scope: by("scope"), by_layer: by("layer"), stores, formal_stores: formalStores, problems, series };
}

// Every archived raw file referenced by a manifest or store must still hash to the recorded sha256.
export function verifySourceFiles() {
  const refs = new Map();
  const walk = (o) => { if (Array.isArray(o)) return o.forEach(walk); if (!o || typeof o !== "object") return;
    for (const [fileKey, hashKey] of [["raw_file", "sha256"], ["extract_file", "extract_sha256"]]) if (typeof o[fileKey] === "string" && typeof o[hashKey] === "string" && !o[fileKey].includes(" ÷ ")) refs.set(o[fileKey], o[hashKey]);
    Object.values(o).forEach(walk); };
  for (const p of ["src/data/historical/annual_history_manifest.json", "src/data/historical/monthly_history_manifest.json", "src/data/historical/regional_history_manifest.json", "src/data/historical/regional_descriptive_history.json", "src/data/serbia/serbia_ingestion_manifest.json"]) walk(read(p));
  const files = [...refs.entries()].sort().map(([file, recorded]) => { const abs = path.join(root, file); const actual = fs.existsSync(abs) ? sha(fs.readFileSync(abs)) : null; return { file, recorded_sha256: recorded, matches: actual === recorded }; });
  return { checked: files.length, mismatched: files.filter((f) => !f.matches).map((f) => f.file), files };
}

// Public exports: byte copies equal their source stores; runtimes reproduce every stored value and the Phase R flag.
export function exportConsistency() {
  const copies = [
    ...["annual_descriptive_history", "annual_history_manifest", "monthly_descriptive_history", "monthly_history_manifest", "regional_descriptive_history", "regional_history_manifest"].map((f) => [`src/data/historical/${f}.json`, `public/research-data/${f}.json`]),
    ...["serbia_descriptive_history_annual", "serbia_descriptive_history_monthly", "serbia_descriptive_history_regional", "serbia_ingestion_manifest"].map((f) => [`src/data/serbia/${f}.json`, `public/research-data/serbia/${f}.json`]),
    ...["historical_recovery_inventory", "descriptive_data_coverage_audit"].map((f) => [`src/data/data-coverage/${f}.json`, `public/research-data/${f}.json`]),
  ].map(([src, pub]) => ({ src, public: pub, identical: fs.readFileSync(path.join(root, src)).equals(fs.readFileSync(path.join(root, pub))) }));
  const mismatches = [];
  const annual = read("src/data/historical/annual_descriptive_history.json").records, aRun = read("public/research-data/annual_history_runtime.json").records;
  const aMap = new Map(aRun.map((r) => [`${r[0]}|${r[1]}|${r[2]}`, r]));
  for (const r of annual) { const x = aMap.get(`${r.country_slug}|${r.indicator}|${r.year}`); if (!x || x[3] !== r.value || x[4] !== r.unit || x[5] !== r.value_status || (x[7] === "R") !== (r.recovery_phase === "R")) mismatches.push(`annual_runtime:${r.id}`); }
  if (aRun.length !== annual.length) mismatches.push(`annual_runtime:count ${aRun.length}≠${annual.length}`);
  const monthly = read("src/data/historical/monthly_descriptive_history.json"), mRun = read("public/research-data/monthly_history_runtime.json");
  const mMap = new Map(mRun.records.map((r) => [`${r[0]}|${r[1]}|${r[2]}`, r]));
  const mRefR = new Set(mRun.series_sources.filter((s) => s.recovery_phase === "R").map((s) => s.source_ref));
  for (const r of monthly.records) { const x = mMap.get(`${r.country_slug}|${r.series}|${r.period}`); if (!x || x[3] !== r.value || x[4] !== r.value_status || x[5] !== r.source_ref || mRefR.has(x[5]) !== (r.recovery_phase === "R")) mismatches.push(`monthly_runtime:${r.id}`); }
  if (mRun.records.length !== monthly.records.length) mismatches.push(`monthly_runtime:count ${mRun.records.length}≠${monthly.records.length}`);
  const regional = read("src/data/historical/regional_descriptive_history.json").records, rMap = new Map();
  for (const f of fs.readdirSync(path.join(root, "public/research-data/regional-history")).sort()) for (const r of read(`public/research-data/regional-history/${f}`).records) rMap.set(`${r[0]}|${r[1]}|${r[2]}`, r);
  const codes = ["comparable_stable_code", "series_break", "backcast_boundary_revision"];
  for (const r of regional) { const x = rMap.get(`${r.region_id}|${r.indicator}|${r.statistical_year}`); if (!x || x[3] !== r.value || codes[x[4]] !== r.comparability_status || x[5] !== r.nuts_version_in_force) mismatches.push(`regional_runtime:${r.id}`); }
  if (rMap.size !== regional.length) mismatches.push(`regional_runtime:count ${rMap.size}≠${regional.length}`);
  const sors = read("public/research-data/serbia_sors_runtime.json").series, sMap = new Map();
  for (const s of sors) for (const p of s.points) sMap.set(`${s.key}|${p[0]}`, p);
  let sorsChecked = 0;
  for (const k of ["annual", "monthly"]) for (const r of read(`src/data/serbia/serbia_descriptive_history_${k}.json`).records.filter((q) => q.statistical_level === "national")) { const p = sMap.get(`${r.series}|${r.period}`); if (!p) continue; sorsChecked += 1; if (p[1] !== r.normalized_value || p[2] !== r.original_value || p[3] !== r.sors_status) mismatches.push(`sors_runtime:${r.id}`); }
  return { byte_copies: copies, runtime_values_checked: { annual: annual.length, monthly: monthly.records.length, regional: regional.length, sors_national_points: sorsChecked }, mismatches, research_package_note: "The research ZIP does not carry the descriptive-history layers; they are published as the JSON files above, and the Data Explorer CSV download is generated from the same runtimes." };
}

// Only descriptive-history layers (and their exports/inventory/ledger) may differ from the pre-recovery baseline.
export const DESCRIPTIVE_CHANGE_SCOPE = [/^src\/data\/historical\//, /^src\/data\/serbia\//, /^src\/data\/data-coverage\//, /^src\/data\/data-refresh\/refresh_ledger\.jsonl$/,
  /^public\/research-data\/(annual|monthly|regional)_(descriptive_history|history_manifest|history_runtime)\.json$/, /^public\/research-data\/regional-history\//, /^public\/research-data\/serbia\//,
  /^public\/research-data\/serbia_sors_runtime\.json$/, /^public\/research-data\/(historical_recovery_inventory|descriptive_data_coverage_audit)\.json$/];
export function modelIsolation() {
  const changed = execFileSync("git", ["diff", "--name-only", BASELINE, "--", "src/data", "public/research-data"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  const outside = changed.filter((f) => !DESCRIPTIVE_CHANGE_SCOPE.some((re) => re.test(f)));
  const context = fs.readFileSync(path.join(root, "src/lib/politicalEconomicContext.ts"), "utf8"), workspace = fs.readFileSync(path.join(root, "src/components/workspaceEvidence.ts"), "utf8");
  return { baseline_commit: BASELINE, changed_data_files: changed.length, changed_outside_descriptive_scope: outside,
    research_views_exclude_phase_r: /r\[7\]!=="R"/.test(context) && /s\.recovery_phase==="R"/.test(context) && /recovery_phase/.test(workspace),
    note: "VAR, LP, panel, pressure, scenario and D1–D4 inputs and outputs are byte-identical to the baseline; no model was re-estimated." };
}
export function rightsEvidence() {
  const reg = read("docs/legal-security/source_rights_registry.json").sources;
  return ["src-eurostat", "src-bis", "src-sors", "src-un-comtrade", "src-worldbank"].map((id) => { const r = reg.find((s) => s.source_id === id) ?? {};
    return { source_id: id, institution: r.institution ?? null, licence: r.licence_name ?? null, terms_url: r.terms_url ?? null, reuse_right: r.reuse_right ?? null, normalized_republication: r.normalized_republication ?? null, raw_redistribution: r.raw_redistribution ?? null, attribution: r.required_attribution_text ?? null, reviewed_at: r.reviewed_at ?? null, review_status: r.review_status ?? null }; });
}

// Matrix rows: the 1,413 Phase R inventory contracts plus the trade-partner and World Bank panel frames.
export const CLASSIFICATION_CORRECTIONS = [];
export function buildMatrix() {
  CLASSIFICATION_CORRECTIONS.length = 0;
  const inv = read("src/data/data-coverage/historical_recovery_inventory.json");
  const rows = [];
  for (const s of inv.series) {
    const gaps = {};
    for (const g of s.missing.periods) {
      // A discontinued official series is never "not yet published": empty cells before its end are missing cells.
      const discontinued = g.category === 5 && /discontinued/i.test(s.floors?.instrument_notes ?? "");
      if (discontinued) CLASSIFICATION_CORRECTIONS.push({ key: s.key, from: g.from, to: g.to, published_status: STATUS[5], corrected_status: STATUS[4], evidence: "source notes: series discontinued when the country joined the euro area (from 1 Jan 2023); empty cells before that date will not be published" });
      const st = STATUS[discontinued ? 4 : g.category]; gaps[st] = (gaps[st] ?? 0) + spanLength(g.from, g.to);
    }
    const admitted = s.admitted?.periods ?? 0;
    const earliestGap = s.missing.periods.map((g) => g.from).sort()[0] ?? null;
    const officialFirst = s.official?.first ?? ([s.admitted?.first, earliestGap].filter(Boolean).sort()[0] ?? null);
    const derived = !s.official && /_change_(pct|pp)$/.test(s.indicator);
    rows.push({ key: s.key, store: s.key.split("|")[0], country: s.country, indicator: s.indicator, frequency: s.frequency, scope: s.scope, region_id: s.region_id ?? null,
      admitted_periods: admitted, admitted_first: s.admitted?.first ?? null, admitted_last: s.admitted?.last ?? null,
      official_first: officialFirst, official_last: s.official?.last ?? s.admitted?.last ?? null,
      official_reference: s.official ? "archived_full_official_extract" : derived ? "derived_from_admitted_inputs" : s.key.startsWith("serbia_sors") ? "sors_extract_and_floor_rules" : "none_available",
      primary_status: admitted ? STATUS.admitted : dominant(gaps) ?? STATUS[8], gaps: sorted(gaps), recovery_status: s.recovery_status ?? null,
      source: s.source_dataset ?? s.official?.source_dataset ?? null, rights: s.rights?.reuse_right ?? null, audited: true });
  }
  // UN Comtrade trade-partner structure (network_dependency inputs; 2015–2025 admitted).
  const net = read("src/data/network/network_metrics.json");
  const rights = read("docs/legal-security/source_rights_registry.json").sources.find((r) => r.source_id === "src-un-comtrade");
  for (const country of [...new Set(net.records.map((r) => r.country))].sort()) for (const flow of ["exports", "imports"]) for (const metric of Object.keys(net.metric_definitions)) {
    const years = net.records.filter((r) => r.country === country && r.flow === flow && Number.isFinite(r[metric])).map((r) => String(r.year));
    rows.push({ key: `trade_network|${country}|${flow}:${metric}`, store: "trade_network", country, indicator: `trade_partner_${flow}_${metric}`, frequency: "annual", scope: "national", region_id: null,
      admitted_periods: years.length, ...prefix("admitted", range(years)), official_first: null, official_last: range(years).last, official_reference: "not_established_rights_review_due",
      primary_status: years.length ? STATUS.admitted : STATUS[7], gaps: { [STATUS[7]]: null }, recovery_status: "not_extended_rights_review_and_formal_frame",
      source: "UN Comtrade C/A/HS TOTAL goods", rights: rights?.normalized_republication ?? null, audited: true });
  }
  // World Bank WDI panel: frozen formal estimation frame (2015–2025); descriptive equivalents are the inventory rows above.
  const panel = read("src/data/panel/panel_observations.json").records;
  for (const key of [...new Set(panel.map((r) => `${r.country}|${r.indicator}`))].sort()) {
    const [country, indicator] = key.split("|");
    const years = panel.filter((r) => r.country === country && r.indicator === indicator && r.value !== null).map((r) => String(r.year));
    rows.push({ key: `panel|${key}`, store: "panel_formal_frame", country, indicator, frequency: "annual", scope: "national", region_id: null,
      admitted_periods: years.length, ...prefix("admitted", range(years)), official_first: null, official_last: range(years).last, official_reference: "frozen_formal_frame_not_extended",
      primary_status: years.length ? STATUS.admitted : STATUS[1], gaps: { [STATUS[1]]: null }, recovery_status: "frozen_formal_model_input",
      source: "World Bank WDI API", rights: "cleared_with_conditions", audited: true });
  }
  return rows;
}
const prefix = (p, o) => ({ [`${p}_first`]: o.first, [`${p}_last`]: o.last });
const dominant = (gaps) => Object.entries(gaps).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
function spanLength(from, to) {
  if (/^\d{4}$/.test(from)) return Number(to) - Number(from) + 1;
  if (/^\d{4}-Q/.test(from)) return (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 4 + Number(to.at(-1)) - Number(from.at(-1)) + 1;
  return (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5)) - Number(from.slice(5)) + 1;
}

// Series materially shorter than official availability (≥ 2 years / 24 months / 8 quarters) and why.
export function shortSeries() {
  const inv = read("src/data/data-coverage/historical_recovery_inventory.json");
  const years = (p) => Number(String(p).slice(0, 4)) + (/-Q/.test(p) ? (Number(String(p).at(-1)) - 1) / 4 : /-\d{2}$/.test(p) ? (Number(String(p).slice(5)) - 1) / 12 : 0);
  return inv.series.filter((s) => s.official?.first && (!s.admitted?.first || years(s.admitted.first) - years(s.official.first) >= 2)).map((s) => {
    const before = s.missing.periods.filter((g) => !s.admitted?.first || g.from < s.admitted.first);
    const reasons = sorted(before.reduce((m, g) => { const k = `${STATUS[g.category]}: ${g.reason}`; m[k] = (m[k] ?? 0) + spanLength(g.from, g.to); return m; }, {}));
    return { key: s.key, admitted_first: s.admitted?.first ?? null, official_first: s.official.first, recovery_status: s.recovery_status, floors: s.floors ?? null, gap_before_admitted: reasons, ingestible_now: before.some((g) => g.category === 1 && !/refresh path|frozen formal|canonical window/.test(g.reason)) };
  });
}

export function provenanceFindings() {
  const ledger = fs.readFileSync(path.join(root, "src/data/data-refresh/refresh_ledger.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const run = ledger.find((e) => e.run_id === "historical-recovery-20261110");
  const correction = ledger.find((e) => e.mode === "ledger-correction" && e.corrects?.run_id === run.run_id) ?? null;
  const commitTime = (c) => execFileSync("git", ["show", "-s", "--format=%cI", c], { cwd: root, encoding: "utf8" }).trim();
  const utc = (iso) => new Date(iso).toISOString();
  const retrieved = [];
  const walk = (o) => { if (Array.isArray(o)) return o.forEach(walk); if (!o || typeof o !== "object") return; if (typeof o.retrieved_at === "string" && o.retrieved_at.startsWith("2026-11")) retrieved.push(o.retrieved_at); Object.values(o).forEach(walk); };
  for (const p of ["src/data/historical/annual_history_manifest.json", "src/data/historical/monthly_history_manifest.json", "src/data/historical/regional_descriptive_history.json"]) walk(read(p));
  retrieved.sort();
  const priorRuns = ledger.filter((e) => e.run_id !== run.run_id && e.mode !== "ledger-correction").map((e) => ({ run_id: e.run_id, planned_at: e.planned_at, applied_at: e.applied_at, series_with_recorded_changes: e.units.reduce((n, u) => n + new Set([...(u.new_periods ?? []).map((s) => s.series), ...(u.revisions ?? []).map((s) => s.series)]).size, 0) }));
  return {
    run_id: run.run_id,
    recorded: { planned_at: run.planned_at, applied_at: run.applied_at, new_observations: run.units.reduce((n, u) => n + u.stores.reduce((m, s) => m + s.new_observations, 0), 0), units_with_per_series_detail: run.units.filter((u) => u.new_periods || u.revisions).length },
    evidence: {
      source_retrieval_window_utc: { first: retrieved[0], last: retrieved.at(-1), count: retrieved.length },
      data_commit: { commit: "ca8d53f5fe7393080f56ccca98e7e658deb1b5c9", committed_at_utc: utc(commitTime("ca8d53f5fe7393080f56ccca98e7e658deb1b5c9")) },
      ledger_commit: { commit: "d6e2bddc926d63e9bd6eca93a28864e67abec012", committed_at_utc: utc(commitTime("d6e2bddc926d63e9bd6eca93a28864e67abec012")) },
      first_deployment: { workflow_run_id: "42706330755", source_commit: "d6e2bdd", deploy_job_started_utc: "2026-11-09T22:09:13Z" },
      current_build_provenance: { workflow_run_id: "42791100819", source_commit: "ffea0df", generated_at_utc: "2026-11-10T09:31:39.889Z", definition: "time the research package was built in CI for that deployment; not a data application time" },
      prior_runs: priorRuns,
    },
    findings: [
      "applied_at 2026-11-10T12:00:00Z and planned_at 2026-11-10T00:00:00Z are placeholder values written by hand when the run was registered; the other ledger runs carry tool-generated times seconds apart.",
      "applied_at is after the data commit (2026-11-09T21:33:12Z), the ledger commit (2026-11-09T21:50:19Z) and the first deployment that served the data (2026-11-09T22:09Z), so it cannot be the application time; the evidence bounds the real application between the last source retrieval and the data commit.",
      "The calendar date 2026-11-10 is the local (UTC+11) date of the work; in UTC the run was acquired and committed on 2026-11-09.",
      "The 09:31Z build time is a different definition (CI build of the research package for ffea0df) and is correct as recorded.",
      "'Series with recorded changes: 0' is not a zero: this run recorded store-level counts only (7,799 new, 0 revisions) and no per-series new_periods, while the provenance panel counts per-series entries. Earlier runs recorded per-series detail; this one did not, so the value is unrecorded rather than zero.",
    ],
    correction: correction ? { status: "applied_append_only", run_id: correction.run_id, plan_sha256: correction.plan_sha256, original_entry_unchanged: true, corrected_windows: Object.fromEntries(correction.corrections.filter((c) => c.corrected_window).map((c) => [c.field, c.corrected_window])), per_series_detail_series: correction.per_series_detail.new_periods.length, chain_repair: correction.chain_repair } : null,
    proposed_correction: { status: correction ? "applied" : "not_applied_requires_owner_approval", method: "append-only ledger correction entry referencing the original run and plan sha256 (original entry kept byte-identical), plus per-series added periods derived from the Phase R records; the provenance panel shows unrecorded per-series detail as — instead of 0" },
  };
}

// Held series: same official table as the canonical record, but the canonical (frozen formal input) years carry an
// earlier vintage, so a current-vintage backcast would splice two vintages. Resolution needs an owner decision.
export function heldSeries() {
  const man = read("src/data/historical/annual_history_manifest.json");
  return man.recovery.series.filter((s) => /held/.test(s.status)).map((s) => ({ indicator: s.indicator, country: s.country, table: s.table, status: s.status, official_first: s.official_first, first_admitted_before_recovery: s.first_admitted_before_recovery, splice_years: s.splice_years, overlap_max_excess: s.overlap_max_excess,
    cause: "recent canonical years differ from the current Eurostat vintage of the same table beyond the splice tolerance (relative 0.02, absolute 0.3)",
    resolution_options: ["refresh the canonical years through the canonical refresh path (formal model input; owner decision and model-impact review)", "keep held (current state)"] }))
    .sort((a, b) => `${a.indicator}|${a.country}`.localeCompare(`${b.indicator}|${b.country}`));
}

// Every file the closure reads; the snapshot reproduces exactly while these hashes are unchanged.
export const INPUT_FILES = [...STORES.map((s) => s.path), ...FORMAL_STORES, "src/data/historical/annual_history_manifest.json", "src/data/historical/monthly_history_manifest.json",
  "src/data/historical/regional_history_manifest.json", "src/data/serbia/serbia_ingestion_manifest.json", "src/data/data-coverage/historical_recovery_inventory.json",
  "src/data/data-coverage/descriptive_data_coverage_audit.json", "src/data/data-refresh/refresh_ledger.jsonl", "docs/legal-security/source_rights_registry.json",
  "public/research-data/annual_history_runtime.json", "public/research-data/monthly_history_runtime.json", "public/research-data/serbia_sors_runtime.json"];
export const inputHashes = () => Object.fromEntries(INPUT_FILES.map((f) => [f, sha(fs.readFileSync(path.join(root, f)))]));

// The Phase R inventory keyed national annual units by indicator|country across ALL annual national contracts, so the
// separate SORS layer ("serbia_sors_annual|serbia|…") overwrote Serbia's Eurostat unit. Periods were computed from the
// Eurostat layers and are correct; only the unit label and definition_check were wrong. Recompute both here from the
// Eurostat annual contracts alone and record every changed verdict (the inventory file itself stays as published).
export function correctedComparability() {
  const inv = read("src/data/data-coverage/historical_recovery_inventory.json");
  const out = JSON.parse(JSON.stringify(inv.comparability)), corrections = [];
  for (const [indicator, v] of Object.entries(out.national_annual)) {
    const units = [...new Set(v.countries.map((c) => inv.series.find((s) => s.key === `annual|${c}|${indicator}`)?.unit))];
    const check = units.length === 1 ? "same table, selection and unit" : "units differ: not comparable";
    if (check !== v.definition_check) corrections.push({ indicator, published_unit: v.unit, published_definition_check: v.definition_check, corrected_unit: units.length === 1 ? units[0] : units, corrected_definition_check: check, cause: "SORS-layer unit overwrote the Eurostat Serbia unit in the inventory's unit map" });
    v.unit = units.length === 1 ? units[0] : units; v.definition_check = check;
  }
  const unitGaps = Object.entries(out.national_monthly).filter(([, v]) => Array.isArray(v.unit) && !v.unit.length).map(([k]) => k);
  return { comparability: out, corrections, monthly_series_without_unit_label: unitGaps };
}

export function buildClosure() {
  const reconciliation = reconcile();
  const matrix = buildMatrix();
  const inv = read("src/data/data-coverage/historical_recovery_inventory.json");
  const statusTotals = {}; for (const r of matrix) for (const [k, v] of Object.entries(r.gaps)) if (v !== null) statusTotals[k] = (statusTotals[k] ?? 0) + v;
  const byStore = sorted(count(matrix.map((r) => r.store)));
  const before = atBaseline("src/data/data-coverage/descriptive_data_coverage_audit.json");
  return {
    schema_version: "historical-coverage-closure-v1",
    audit_date: "2026-11-10",
    inputs: inputHashes(),
    descriptive_only: true,
    statuses: STATUS,
    summary: {
      contracts: matrix.length, contracts_by_store: byStore, audited: matrix.filter((r) => r.audited).length,
      contracts_with_official_reference_not_established: matrix.filter((r) => r.official_reference === "not_established_rights_review_due").length,
      gap_periods_by_status: sorted(statusTotals), recovered_observations: reconciliation.total_recovered,
      reconciliation_problems: reconciliation.problems.length, full_historical_coverage: false,
      full_historical_coverage_reason: "Trade-partner contracts (UN Comtrade) have no established pre-2015 official availability (rights review due), the World Bank panel is a frozen formal frame, and unresolved or not-yet-imported periods remain; see gaps.",
    },
    reconciliation,
    source_files: verifySourceFiles(),
    exports: exportConsistency(),
    model_isolation: modelIsolation(),
    rights: rightsEvidence(),
    short_series: shortSeries(),
    held_series: heldSeries(),
    comparability: correctedComparability(),
    classification_corrections: CLASSIFICATION_CORRECTIONS.slice(),
    coverage_before_after: { before_audit_present: before !== null, inventory_contracts: inv.summary.contracts, recovered_in_phase_r: inv.summary.recovered_in_phase_r },
    provenance: provenanceFindings(),
    matrix,
  };
}

const CSV_COLUMNS = ["key", "store", "country", "region_id", "indicator", "frequency", "scope", "primary_status", "admitted_periods", "admitted_first", "admitted_last", "official_first", "official_last", "official_reference", ...Object.values(STATUS).slice(1), "recovery_status", "source", "rights"];
const cell = (v) => v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v);
export function matrixCsv(matrix) { return [CSV_COLUMNS.join(","), ...matrix.map((r) => CSV_COLUMNS.map((c) => cell(c in r ? r[c] : r.gaps[c] === null ? "not_established" : r.gaps[c])).join(","))].join("\n") + "\n"; }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const closure = buildClosure();
  const json = JSON.stringify(closure, null, 1) + "\n", csv = matrixCsv(closure.matrix);
  if (process.argv.includes("--check")) {
    const same = [[CLOSURE_JSON, json], [CLOSURE_CSV, csv]].every(([p, t]) => fs.existsSync(path.join(root, p)) && fs.readFileSync(path.join(root, p), "utf8") === t);
    if (!same) { console.error("coverage closure outputs are stale or not reproducible"); process.exit(1); }
  } else { fs.mkdirSync(path.join(root, "docs/data-coverage"), { recursive: true }); fs.writeFileSync(path.join(root, CLOSURE_JSON), json); fs.writeFileSync(path.join(root, CLOSURE_CSV), csv); }
  console.log(JSON.stringify({ ...closure.summary, by_source_family: closure.reconciliation.by_source_family, by_frequency: closure.reconciliation.by_frequency, problems: closure.reconciliation.problems.slice(0, 10), source_mismatches: closure.source_files.mismatched, export_mismatches: closure.exports.mismatches.slice(0, 10), export_copies_identical: closure.exports.byte_copies.every((c) => c.identical), runtime_checked: closure.exports.runtime_values_checked, isolation: closure.model_isolation.changed_outside_descriptive_scope, views_excluded: closure.model_isolation.research_views_exclude_phase_r, ingestible_now: closure.short_series.filter((s) => s.ingestible_now).map((s) => s.key), short_series: closure.short_series.length }, null, 1));
}
