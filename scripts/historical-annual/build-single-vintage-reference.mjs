// Single-vintage reference layer (owner decision 2026-11-16: "Single-vintage layer"). Offline only: never fetches.
// For the four indicators whose earlier years are held by the vintage splice check (current account % GDP, real GDP
// growth, GDP per capita EUR, FDI inflows), it publishes for every country the whole official series from ONE archived
// Eurostat retrieval of ONE table and selection (the Phase R full-history extracts, hash-checked against the annual
// manifest). The layer is never spliced into observations.json or the annual history: those keep their own vintages
// and the hold stays in force. Each record states the admitted value of the same year (if any) and the difference, so
// vintage revisions are visible instead of hidden. Not a model input.
// Floors follow Phase R exactly: max(first official year, territorial floor, last 'b' flag year, year after last 'd').
// Usage: node scripts/historical-annual/build-single-vintage-reference.mjs [--offline]  (write store + public copy; always offline)
//        node scripts/historical-annual/build-single-vintage-reference.mjs --check     (fail if outputs would change)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SAFE, RECOVERED_INDICATORS, RECOVERY_GEOS, TERRITORIAL_FLOORS, TERRITORIAL_NOTES } from "./acquire.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export const STORE_PATH = "src/data/historical/annual_single_vintage_reference.json";
export const PUBLIC_PATH = "public/research-data/annual_single_vintage_reference.json";
export const INDICATORS = ["current_account_gdp", "real_gdp_growth", "gdp_per_capita_eur", "fdi_inflow"];
const SPECS = Object.fromEntries([...SAFE, ...RECOVERED_INDICATORS].filter((s) => INDICATORS.includes(s.id)).map((s) => [s.id, s]));
const flagText = (flag) => String(flag ?? "").trim();
const statusOf = (flag) => /p/.test(flag) ? "provisional" : /e/.test(flag) ? "estimated" : /u/.test(flag) ? "low_reliability" : "official";

// Archived full-history extract, verified against the hash the annual manifest recorded for it.
function extract(table) {
  const entry = read("src/data/historical/annual_history_manifest.json").recovery.tables.find((t) => t.table === table);
  if (!entry) throw new Error(`${table}: no Phase R archive entry in the annual manifest`);
  const bytes = fs.readFileSync(path.join(root, entry.raw_file));
  if (sha(bytes) !== entry.sha256) throw new Error(`${table}: archived extract does not match its recorded sha256`);
  const json = JSON.parse(bytes.toString("utf8"));
  const ordered = Object.fromEntries(json.id.map((id) => [id, Object.entries(json.dimension[id].category.index).sort((a, b) => a[1] - b[1]).map(([k]) => k)]));
  const stride = json.size.map((_, i) => json.size.slice(i + 1).reduce((a, b) => a * b, 1));
  const cell = (coords) => { const pos = json.id.map((id) => ordered[id].indexOf(coords[id] ?? (ordered[id].length === 1 ? ordered[id][0] : undefined))); if (pos.some((p) => p < 0)) return { value: null, flag: null }; const index = pos.reduce((n, p, i) => n + p * stride[i], 0); return { value: json.value?.[index] ?? null, flag: json.status?.[index] ?? null }; };
  return { entry, ordered, cell };
}

// Values already admitted for the same country, indicator and year (canonical observations.json first, then history).
function admittedValues() {
  const map = new Map();
  for (const r of read("src/data/historical/annual_descriptive_history.json").records) if (INDICATORS.includes(r.indicator) && r.value !== null) map.set(`${r.country_slug}|${r.indicator}|${r.year}`, { layer: "annual_history", value: r.value });
  const obs = read("src/data/observations/observations.json");
  for (const r of obs.observations ?? obs.records ?? obs) if (INDICATORS.includes(r.indicator) && r.value !== null && r.value !== undefined) map.set(`${r.country_slug}|${r.indicator}|${r.year}`, { layer: "observations.json", value: r.value });
  return map;
}

export function build() {
  const admitted = admittedValues();
  const tables = {}; for (const id of INDICATORS) tables[SPECS[id].table] ??= extract(SPECS[id].table);
  const records = [], series = [];
  for (const id of INDICATORS) {
    const spec = SPECS[id], t = tables[spec.table];
    for (const [code, [iso3, slug]] of Object.entries(RECOVERY_GEOS)) {
      const base = { ...spec.select, geo: code, freq: "A" };
      const rows = t.ordered.time.map((time) => ({ year: Number(time), ...t.cell({ ...base, time }) })).filter((r) => r.value !== null).map((r) => ({ ...r, flag: flagText(r.flag) }));
      const breaks = rows.filter((r) => /[bd]/.test(r.flag));
      const lastBreak = breaks.length ? Math.max(...breaks.map((r) => (/b/.test(r.flag) ? r.year : r.year + 1))) : null;
      const territorial = TERRITORIAL_FLOORS[code]?.year ?? null;
      const floor = rows.length ? Math.max(rows[0].year, territorial ?? rows[0].year, lastBreak ?? rows[0].year) : null;
      const kept = floor === null ? [] : rows.filter((r) => r.year >= floor);
      const diffs = [];
      for (const r of kept) {
        const a = admitted.get(`${slug}|${id}|${r.year}`) ?? null;
        const difference = a ? Number((r.value - a.value).toFixed(6)) : null;
        if (a) diffs.push(Math.abs(difference));
        records.push({
          id: `vintage:annual:${slug}:${id}:${r.year}`, country: iso3, country_slug: slug, indicator: id, year: r.year, value: r.value, unit: spec.unit,
          value_status: statusOf(r.flag), source_flag: r.flag || null, source: "eurostat", source_dataset: `Eurostat ${spec.table}`, source_query_url: t.entry.url, source_reliability: "A",
          definition: spec.definition, vintage: t.entry.retrieved_at, dataset_updated_at: t.entry.dataset_updated_at, comparability_status: "definition_compatible_from_floor",
          admitted_same_year: a ? { layer: a.layer, value: a.value, difference_reference_minus_admitted: difference } : null,
          provenance: { raw_file: t.entry.raw_file, raw_sha256: t.entry.sha256, selection: { ...spec.select, geo: code, time: String(r.year) } },
          ...(TERRITORIAL_NOTES[code] && r.year < TERRITORIAL_NOTES[code].before ? { territorial_note: TERRITORIAL_NOTES[code].note } : {}),
          layer: "single_vintage_reference", spliced: false, descriptive_only: true,
        });
      }
      series.push({ indicator: id, country: slug, table: spec.table, official_first: rows[0]?.year ?? null, official_last: rows.at(-1)?.year ?? null,
        break_flags: breaks.map((r) => `${r.year}:${r.flag}`), territorial_floor: territorial, definition_compatible_floor: floor,
        first: kept[0]?.year ?? null, last: kept.at(-1)?.year ?? null, count: kept.length,
        years_also_admitted: diffs.length, max_abs_difference_vs_admitted: diffs.length ? Number(Math.max(...diffs).toFixed(6)) : null,
        status: !rows.length ? "no_official_data_in_table" : kept.length ? "published" : "no_years_after_floor" });
    }
  }
  records.sort((a, b) => a.indicator.localeCompare(b.indicator) || a.country_slug.localeCompare(b.country_slug) || a.year - b.year);
  // All-country common years of this single vintage, per indicator (true intersections, not min/max overlaps).
  const common = Object.fromEntries(INDICATORS.map((id) => {
    const per = series.filter((s) => s.indicator === id && s.count);
    const sets = per.map((s) => new Set(records.filter((r) => r.indicator === id && r.country_slug === s.country).map((r) => r.year)));
    const years = sets.length ? [...sets[0]].filter((y) => sets.every((s) => s.has(y))).sort((a, b) => a - b) : [];
    return [id, { countries: per.map((s) => s.country), years: years.length ? `${years[0]}–${years.at(-1)}` : null, count: years.length, contiguous: years.length ? years.at(-1) - years[0] + 1 === years.length : null }];
  }));
  const header = {
    schema_version: "annual-single-vintage-reference-v1", data_type: "annual_single_vintage_reference", descriptive_only: true,
    owner_decision: "Owner decision 2026-11-16 (historical coverage iteration): publish the vintage-held indicators as an unspliced single-vintage reference layer for all countries; the vintage hold of 2026-11-11 stays in force.",
    model_boundary: "Descriptive reference only. Not read by composite indices, scenarios, panel, VAR, LP, event-window, D1–D4 or E1 views; observations.json remains the only national model input.",
    layer_policy: "One archived retrieval of one Eurostat table and selection per indicator, for every country. Never merged with or spliced into observations.json or the annual descriptive history; years that also exist there carry both values in their own layers, with the difference recorded (admitted_same_year).",
    floor_rule: "floor = max(first official year, territorial floor, year of the last 'b' flag, year after the last 'd' flag) over the whole official series, as in Phase R",
    missing_value_policy: "Years without an official value are absent; nothing is interpolated or encoded as zero.",
    attribution: "Source: Eurostat (tipsbp20, nama_10_gdp, nama_10_pc, bop_fdi6_flow)",
    vintages: Object.values(tables).map((t) => ({ table: t.entry.table, retrieved_at: t.entry.retrieved_at, dataset_updated_at: t.entry.dataset_updated_at, raw_file: t.entry.raw_file, sha256: t.entry.sha256, url: t.entry.url, metadata_url: t.entry.metadata_url })),
    indicators: INDICATORS.map((id) => ({ indicator: id, table: SPECS[id].table, selection: SPECS[id].select, unit: SPECS[id].unit, definition: SPECS[id].definition })),
    all_country_common_years: common, series, record_count: records.length,
  };
  const head = JSON.stringify(header, null, 2).replace(/\n}$/, "");
  return `${head},\n  "records": [\n${records.map((r) => `    ${JSON.stringify(r)}`).join(",\n")}\n  ]\n}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = build();
  if (process.argv.includes("--check")) {
    const stale = [STORE_PATH, PUBLIC_PATH].filter((p) => !fs.existsSync(path.join(root, p)) || fs.readFileSync(path.join(root, p), "utf8") !== text);
    if (stale.length) { console.error(`single-vintage reference is stale or not reproducible: ${stale.join(", ")}`); process.exit(1); }
  } else {
    // Never fetches: it always reads the archived extracts (also when a live data-refresh run calls it without --offline,
    // after annual-history has archived a newer retrieval in the same stage).
    for (const p of [STORE_PATH, PUBLIC_PATH]) fs.writeFileSync(path.join(root, p), text);
  }
  const doc = JSON.parse(text);
  console.log(JSON.stringify({ records: doc.record_count, common: doc.all_country_common_years, series: doc.series.map((s) => `${s.indicator}:${s.country}:${s.first}-${s.last}:${s.count}:${s.max_abs_difference_vs_admitted}`) }, null, 1));
}
