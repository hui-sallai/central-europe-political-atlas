// Official descriptive-data refresh — shared helpers (record adapters, diffing, provenance, formal-input detection).
// Used by plan.mjs (stages a refresh and writes data_refresh_plan.json) and apply.mjs (applies an accepted plan).
// Nothing here writes to src/data/** or public/research-data/**.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const TOOL_VERSION = "data-refresh-v1";
export const DEFAULT_TOLERANCE = { relative: 0.02, absolute: 0.3 };
// Keys that change on every retrieval; ignored when deciding whether a companion file changed in substance.
export const VOLATILE_KEYS = new Set(["generated_at", "retrieved_at", "retrieval_date", "retrieval_timestamp", "fetched_at", "run_at", "created_at", "response_bytes", "response_sha256", "sha256", "file_sha256", "extract_sha256", "updated_at"]);

export const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
export const fileSha = (file) => (fs.existsSync(file) ? sha256(fs.readFileSync(file)) : null);
export const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
export const gitBlobId = (file) => {
  if (!fs.existsSync(file)) return null;
  const body = fs.readFileSync(file);
  return crypto.createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${body.length}\0`), body])).digest("hex");
};

export function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else if (entry.isFile()) out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

export function stripVolatile(value) {
  if (Array.isArray(value)) return value.map(stripVolatile);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([k]) => !VOLATILE_KEYS.has(k)).map(([k, v]) => [k, stripVolatile(v)]));
  return value;
}

/** "identical" | "timestamp_only" | "substantive" for two versions of a file (JSON compared without volatile keys). */
export function compareFiles(canonical, staged) {
  const a = fs.existsSync(canonical) ? fs.readFileSync(canonical) : null;
  const b = fs.existsSync(staged) ? fs.readFileSync(staged) : null;
  if (a === null && b === null) return "identical";
  if (a === null) return "added";
  if (b === null) return "removed";
  if (a.equals(b)) return "identical";
  if (/\.json$/.test(canonical)) {
    try { if (JSON.stringify(stripVolatile(JSON.parse(a))) === JSON.stringify(stripVolatile(JSON.parse(b)))) return "timestamp_only"; } catch { /* not JSON */ }
  }
  return "substantive";
}

// ---------------------------------------------------------------------------------------------------------------
// Record adapters: normalise every store to { key, series, country, indicator, dataset, period, value, definition,
// unit, territory, comparability, cross_country, preserved } so one diff routine serves all stores.
// ---------------------------------------------------------------------------------------------------------------
const sourceRef = (doc, record) => (doc.series_sources ?? doc.sources ?? []).find((s) => s.source_ref === record.source_ref) ?? {};

export const ADAPTERS = {
  hf: (doc) => doc.records.map((r) => ({
    key: r.observation_id, series: `${r.country}:${r.indicator}`, country: r.country, indicator: r.indicator, dataset: r.source_dataset, source: r.source,
    period: r.period, value: r.value, unit: r.unit, definition: [r.definition_version, r.classification_version, r.index_reference, r.seasonal_adjustment, r.transformation].join("|"),
    territory: r.country, comparability: r.series_break_status ?? null, cross_country: null,
  })),
  md: (doc) => doc.records.map((r) => ({
    key: r.observation_id, series: `${r.country}:${r.driver_id}:${r.transformation}`, country: r.country, indicator: `${r.driver_id}:${r.transformation}`, dataset: r.source_dataset, source: r.source,
    period: r.period, value: r.value, unit: r.unit, definition: [r.definition_version, r.calculation_method, r.orientation].join("|"), territory: r.country, comparability: r.identification_status ?? null, cross_country: null,
  })),
  annual: (doc) => doc.records.map((r) => ({
    key: r.id, series: `${r.country_slug}:${r.indicator}`, country: r.country_slug, indicator: r.indicator, dataset: r.source_dataset, source: r.source,
    period: String(r.year), value: r.value, unit: r.unit, definition: r.definition ?? r.calculation_formula ?? "", territory: r.country_slug, comparability: r.comparability_status, cross_country: null,
  })),
  monthly_history: (doc) => doc.records.map((r) => {
    const s = sourceRef(doc, r);
    return {
      key: r.id, series: `${r.country_slug}:${r.series}`, country: r.country_slug, indicator: r.series, dataset: s.source_url?.match(/data\/([\w-]+)\?/)?.[1] ?? s.source ?? null, source: s.source ?? null,
      period: r.period, value: r.value, unit: s.unit ?? null, definition: s.definition ?? "", territory: r.country_slug, comparability: s.comparability_status ?? null, cross_country: null,
    };
  }),
  regional: (doc) => doc.records.map((r) => ({
    key: r.id, series: `${r.region_id}:${r.indicator}`, country: doc.regions?.[r.region_id]?.country_id ?? r.region_id.split("_")[0], indicator: r.indicator, dataset: "Eurostat regional", source: "eurostat",
    period: String(r.statistical_year), value: r.value, unit: doc.indicators?.[r.indicator]?.unit ?? null, definition: doc.indicators?.[r.indicator]?.definition ?? "",
    territory: `${(r.geo_codes ?? []).join("+")}@${r.nuts_vintage}`, comparability: r.comparability_status, cross_country: null, source_year: r.source_year,
  })),
  serbia: (doc) => doc.records.map((r) => {
    const s = sourceRef(doc, r);
    return {
      key: r.id, series: `serbia:${r.series}:${r.territory_code}`, country: "serbia", indicator: r.series, dataset: s.source_dataset ?? null, source: "SORS",
      period: r.period, value: r.normalized_value, original_value: r.original_value, unit: `${r.original_unit} → ${r.normalized_unit}`,
      definition: JSON.stringify([s.original_code ?? null, s.mapping ?? null, s.mapping_status ?? null, r.segment_start ?? null]),
      territory: `${r.territory_code}@${r.statistical_level}@${r.classification_version ?? ""}`, comparability: r.comparability_status, cross_country: r.cross_country_comparable,
      preserved: { original_code: s.original_code ?? null, source_url: s.source_url ?? null, original_unit: r.original_unit ?? null, normalized_unit: r.normalized_unit ?? null, cross_country_comparable: r.cross_country_comparable, source_ref: r.source_ref },
    };
  }),
};

/** Stop flags for one diffed series. `NON_OVERRIDABLE` flags can never be accepted by apply --accept-stop. */
export const NON_OVERRIDABLE = new Set(["missing_value_became_zero", "cross_country_comparability_change"]);
export function seriesFlags(s) {
  const flags = [];
  if (s.definition_changes.length || s.new_record_mismatches.some((m) => m.field === "definition")) flags.push("definition_change");
  if (s.unit_changes.length || s.new_record_mismatches.some((m) => m.field === "unit")) flags.push("unit_change");
  if (s.territorial_changes.length || s.new_record_mismatches.some((m) => m.field === "territory")) flags.push("territorial_classification_change");
  if (s.deletions.length || s.series_dropped) flags.push("observation_disappeared");
  if (s.revisions.some((r) => r.beyond_tolerance)) flags.push("revision_beyond_tolerance");
  if (s.cross_country_changes.length || s.new_record_mismatches.some((m) => m.field === "cross_country")) flags.push("cross_country_comparability_change");
  if (s.comparability_changes.length) flags.push("comparability_or_break_status_change");
  if (s.null_to_zero.length) flags.push("missing_value_became_zero");
  if (s.gap_filled.length) flags.push("previously_missing_period_now_reported");
  if (s.new_series) flags.push("new_series");
  return flags;
}

const latest = (periods) => (periods.length ? periods.sort().at(-1) : null);

/** Record-level diff of one store, grouped by series. Values are compared numerically; null stays null (never 0). */
export function diffStore(kind, canonicalDoc, stagedDoc, tolerance = DEFAULT_TOLERANCE) {
  const adapter = ADAPTERS[kind];
  const before = new Map(adapter(canonicalDoc).map((r) => [r.key, r]));
  const after = new Map(adapter(stagedDoc).map((r) => [r.key, r]));
  const series = new Map();
  const bucket = (r) => {
    if (!series.has(r.series)) series.set(r.series, { series: r.series, source: r.source, dataset: r.dataset, country: r.country, indicator: r.indicator, current_periods: [], source_periods: [], new_observations: [], revisions: [], deletions: [], definition_changes: [], unit_changes: [], territorial_changes: [], comparability_changes: [], cross_country_changes: [], null_to_zero: [], gap_filled: [], new_record_mismatches: [], new_series: false, series_dropped: false });
    return series.get(r.series);
  };
  for (const r of before.values()) if (r.value !== null && r.value !== undefined) bucket(r).current_periods.push(r.period);
  for (const r of after.values()) if (r.value !== null && r.value !== undefined) bucket(r).source_periods.push(r.period);
  // Latest period with a value per series: an empty placeholder after it that gets a value is a new period (routine);
  // a gap at or before it that gets a value is a revision of history (owner review).
  const lastReported = new Map();
  for (const r of before.values()) if (r.value !== null && r.value !== undefined && (!lastReported.has(r.series) || r.period > lastReported.get(r.series))) lastReported.set(r.series, r.period);
  for (const [key, b] of before) {
    const a = after.get(key);
    const s = bucket(b);
    if (!a || ((a.value === null || a.value === undefined) && b.value !== null && b.value !== undefined)) { s.deletions.push({ key, period: b.period, value: b.value }); continue; }
    if (b.value !== null && b.value !== undefined && a.value !== null && a.value !== undefined && Math.abs(a.value - b.value) > 1e-9) {
      const allowed = Math.max(tolerance.absolute, tolerance.relative * Math.abs(b.value));
      s.revisions.push({ key, period: b.period, previous: b.value, revised: a.value, beyond_tolerance: Math.abs(a.value - b.value) > allowed });
    }
    if ((b.value === null || b.value === undefined) && a.value === 0) s.null_to_zero.push({ key, period: b.period });
    else if ((b.value === null || b.value === undefined) && a.value !== null && a.value !== undefined) {
      if (!lastReported.has(b.series) || b.period > lastReported.get(b.series)) s.new_observations.push({ key, period: b.period, value: a.value });
      else s.gap_filled.push({ key, period: b.period, value: a.value });
    }
    if (a.unit !== b.unit) s.unit_changes.push({ key, period: b.period, previous: b.unit, staged: a.unit });
    if (a.definition !== b.definition) s.definition_changes.push({ key, period: b.period, previous: b.definition, staged: a.definition });
    if (a.territory !== b.territory) s.territorial_changes.push({ key, period: b.period, previous: b.territory, staged: a.territory });
    if (a.comparability !== b.comparability) s.comparability_changes.push({ key, period: b.period, previous: b.comparability, staged: a.comparability });
    if (a.cross_country !== b.cross_country) s.cross_country_changes.push({ key, period: b.period, previous: b.cross_country, staged: a.cross_country });
  }
  // New records must carry the same unit, definition, territory and cross-country status as the series' latest
  // existing record; a series with no existing record is a new series (owner decision, never routine).
  const latestBefore = new Map();
  for (const r of before.values()) { const cur = latestBefore.get(r.series); if (!cur || r.period > cur.period) latestBefore.set(r.series, r); }
  const seriesAfter = new Set([...after.values()].map((r) => r.series));
  for (const [key, a] of after) {
    if (before.has(key)) continue;
    const s = bucket(a);
    if (a.value !== null && a.value !== undefined) s.new_observations.push({ key, period: a.period, value: a.value });
    const ref = latestBefore.get(a.series);
    if (!ref) { s.new_series = true; continue; }
    for (const field of ["unit", "definition", "territory", "cross_country"]) if (a[field] !== ref[field]) s.new_record_mismatches.push({ key, period: a.period, field, series_latest: ref[field], staged: a[field] });
  }
  for (const [name, s] of series) if (latestBefore.has(name) && !seriesAfter.has(name)) s.series_dropped = true;
  return [...series.values()].map((s) => ({ ...s, current_latest_period: latest(s.current_periods), source_latest_period: latest(s.source_periods), current_periods: undefined, source_periods: undefined }));
}

// ---------------------------------------------------------------------------------------------------------------
// Formal-model-input detection (content based, not filename based): a canonical file is a formal input when its
// current SHA-256 is pinned by another research registry/output/validator, or it is declared below — unless a verified
// research snapshot (src/data/high-frequency/snapshots/snapshot_manifest.json) freezes the published uses.
// ---------------------------------------------------------------------------------------------------------------
export const DECLARED_FORMAL_INPUTS = {
  "src/data/observations/observations.json": "national annual model input (composite indices, scenarios, panel)",
  "src/data/panel/panel_observations.json": "panel model input",
  "src/data/macro-drivers/macro_driver_observations.json": "Local Projection / panel LP driver input",
  "src/data/high-frequency/high_frequency_observations.json": "VAR / LP high-frequency input",
};

export function findHashPins(root, hashes, exclude = new Set()) {
  const wanted = new Map(Object.entries(hashes).filter(([, h]) => h).map(([file, h]) => [h, file]));
  const pins = Object.fromEntries(Object.keys(hashes).map((f) => [f, []]));
  const scan = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) { if (!["raw", "node_modules", "__pycache__"].includes(entry.name)) scan(rel); continue; }
      if (!/\.(json|jsonl|mjs|js|py|ts)$/.test(entry.name) || exclude.has(rel)) continue;
      if (fs.statSync(path.join(root, rel)).size > 40_000_000) continue;
      const text = fs.readFileSync(path.join(root, rel), "utf8");
      for (const m of text.matchAll(/[0-9a-f]{64}/g)) { const file = wanted.get(m[0]); if (file && file !== rel) pins[file].push(rel); }
    }
  };
  for (const dir of ["src/data", "src/lib", "scripts"]) if (fs.existsSync(path.join(root, dir))) scan(dir);
  for (const f of Object.keys(pins)) pins[f] = [...new Set(pins[f])].sort();
  return pins;
}

export function snapshotCoverage(root) {
  const manifestPath = path.join(root, "src/data/high-frequency/snapshots/snapshot_manifest.json");
  if (!fs.existsSync(manifestPath)) return {};
  const manifest = readJson(manifestPath);
  return Object.fromEntries(manifest.snapshots.filter((s) => s.immutable && fileSha(path.join(root, s.snapshot_path)) === s.sha256).map((s) => [s.live_path, s]));
}

// ---------------------------------------------------------------------------------------------------------------
// Minimal JSON-stat 2.0 reader (Eurostat), used for the annual source-ahead check against observations.json.
// ---------------------------------------------------------------------------------------------------------------
export function jsonStatSeries(json, selection) {
  const ids = json.id;
  const index = Object.fromEntries(ids.map((id) => [id, json.dimension[id].category.index]));
  const stride = json.size.map((_, i) => json.size.slice(i + 1).reduce((a, b) => a * b, 1));
  const times = Object.entries(index.time).sort((a, b) => a[1] - b[1]).map(([k]) => k);
  const out = [];
  for (const time of times) {
    let offset = 0;
    let ok = true;
    ids.forEach((id, i) => {
      const categories = index[id];
      const code = id === "time" ? time : selection[id] ?? (Object.keys(categories).length === 1 ? Object.keys(categories)[0] : undefined);
      if (code === undefined || categories[code] === undefined) { ok = false; return; }
      offset += categories[code] * stride[i];
    });
    if (!ok) continue;
    const value = Array.isArray(json.value) ? json.value[offset] : json.value?.[offset];
    if (value !== null && value !== undefined) out.push({ period: time, value, flag: json.status?.[offset] ?? null });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Append-only provenance ledger with a hash chain (each entry records the SHA-256 of the previous line).
// ---------------------------------------------------------------------------------------------------------------
export const LEDGER_PATH = "src/data/data-refresh/refresh_ledger.jsonl";

export function verifyLedger(file) {
  if (!fs.existsSync(file)) return { ok: true, entries: 0, last: null };
  const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
  let previous = null;
  for (const [i, line] of lines.entries()) {
    const entry = JSON.parse(line);
    if (entry.previous_entry_sha256 !== previous) return { ok: false, entries: lines.length, error: `ledger chain broken at entry ${i + 1}` };
    previous = sha256(line);
  }
  return { ok: true, entries: lines.length, last: previous };
}
