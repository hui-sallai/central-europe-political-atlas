// Phase H: monthly DESCRIPTIVE history (2000-01 up to the first stored month) for HICP, industrial production,
// unemployment, long-term yields, policy rates and exchange rates. Writes a separate store
// (src/data/historical/monthly_descriptive_history.json) that no model reads; the frozen 2015+ high-frequency
// and macro-driver files are never modified and no model is re-run.
// Safety gate (per series × country):
//   - Eurostat HICP / IPI / unemployment / yield for the eight v1.83-audited countries use the archived v1.83
//     extracts and that audit's definition-compatible floor; blocked cells (IPI PL/RO, unemployment PL/SK) stay out;
//   - other series are retrieved now (Eurostat JSON-stat or BIS SDMX CSV, raw responses archived with sha256);
//     floor = after the last official break/definition flag, never before 2000-01;
//   - overlap months must agree with the stored 2015+ values (revision tolerance), else the series is held;
//   - backfill only: no month on or after the first stored month; missing months are absent, never zero.
// Usage: node scripts/historical-monthly-descriptive/acquire.mjs [--offline]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawDir = path.join(root, "src/data/historical/raw/monthly");
let offline = process.argv.includes("--offline");
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export const MONTHLY_HISTORY_PATH = "src/data/historical/monthly_descriptive_history.json";
export const MONTHLY_MANIFEST_PATH = "src/data/historical/monthly_history_manifest.json";
const FLOOR = "2000-01";
const OVERLAP_TOLERANCE = { relative: 0.02, absolute: 0.3 };
const EUROSTAT = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
const BIS = "https://stats.bis.org/api/v2/data/dataflow/BIS";

const SLUG = { AT: "austria", DE: "germany", SK: "slovakia", SI: "slovenia", CZ: "czechia", HU: "hungary", PL: "poland", RO: "romania", HR: "croatia" };
const V183 = ["AT", "DE", "SK", "SI", "CZ", "HU", "PL", "RO"];
const V183_AUDIT = { hicp: "historical_hicp_extension_audit.json", ipi: "historical_ipi_extension_audit.json", unemployment: "historical_unemployment_extension_audit.json", yield: "historical_yield_extension_audit.json" };
const V183_RAW = { hicp: "src/data/historical-extension-audit/raw/prc_hicp_minr.json", ipi: "src/data/historical-extension-audit/raw/sts_inpr_m.json", unemployment: "src/data/historical-extension-audit/raw/une_rt_m.json", yield: "src/data/historical-extension-audit/raw/irt_lt_mcby_m.json" };

// Target series. `store`/`id`/`transformation` identify the stored 2015+ series used for the overlap check.
const SERIES = [
  { key: "hicp_monthly_index", store: "high_frequency", id: "hicp_monthly_index", transformation: "level", unit: "I15", label: "HICP all-items index, 2015=100 (NSA)", v183: "hicp", countries: [...V183, "HR"], eurostat: { dataset: "prc_hicp_minr", params: { unit: "I15", coicop18: "TOTAL" } } },
  { key: "hicp_annual_rate", store: "high_frequency", id: "hicp_annual_rate", transformation: "yoy_rate", unit: "RCH_A", label: "HICP all-items annual rate of change (%)", countries: [...V183, "HR"], eurostat: { dataset: "prc_hicp_minr", params: { unit: "RCH_A", coicop18: "TOTAL" } } },
  { key: "industrial_production_index", store: "high_frequency", id: "industrial_production_index", transformation: "level", unit: "I21", label: "Industrial production B-D, 2021=100 (SCA)", v183: "ipi", countries: V183 },
  { key: "unemployment_rate_monthly", store: "high_frequency", id: "unemployment_rate_monthly", transformation: "level", unit: "PC_ACT", label: "Unemployment rate, % of active population (SA)", v183: "unemployment", countries: V183 },
  { key: "long_term_government_yield", store: "macro_drivers", id: "long_term_government_yield", transformation: "level", unit: "% p.a.", label: "Maastricht criterion bond yield, monthly average", v183: "yield", countries: [...V183, "HR"], eurostat: { dataset: "irt_lt_mcby_m", params: { int_rt: "MCBY" } } },
  { key: "policy_rate", store: "macro_drivers", id: "policy_rate", transformation: "level", unit: "% p.a.", label: "ECB policy rate (BIS WS_CBPOL, end of period)", countries: ["AT", "DE"], bis: { flow: "WS_CBPOL", keyOf: () => "M.XM" } },
  { key: "bilateral_fx_local_per_eur", store: "macro_drivers", id: "bilateral_fx_local_per_eur", transformation: "level", unitOf: (geo) => `${{ CZ: "CZK", HU: "HUF", PL: "PLN" }[geo]} per EUR`, label: "Local currency per EUR = (local per USD) / (EUR per USD), BIS monthly averages", countries: ["CZ", "HU", "PL"], bis: { flow: "WS_XRU", keyOf: (geo) => `M.${geo}.${{ CZ: "CZK", HU: "HUF", PL: "PLN" }[geo]}.A`, divideBy: "M.XM.EUR.A" } },
  { key: "eur_usd_common", store: "macro_drivers", id: "eur_usd_common", transformation: "level", unit: "USD per EUR", label: "USD per EUR = 1 / (EUR per USD), BIS monthly average", countries: ["XM"], country: "euro_area", bis: { flow: "WS_XRU", keyOf: () => "M.XM.EUR.A", invert: true } },
  { key: "nominal_effective_exchange_rate", store: "macro_drivers", id: "nominal_effective_exchange_rate", transformation: "level", unit: "index", label: "BIS broad-basket nominal EER, monthly average", countries: Object.keys(SLUG), bis: { flow: "WS_EER", keyOf: (geo) => `M.N.B.${geo}` } },
  { key: "real_effective_exchange_rate", store: "macro_drivers", id: "real_effective_exchange_rate", transformation: "level", unit: "index", label: "BIS broad-basket real EER, monthly average", countries: Object.keys(SLUG), bis: { flow: "WS_EER", keyOf: (geo) => `M.R.B.${geo}` } },
];
export const MONTHLY_REVIEW_QUEUE = [
  { series: "industrial_production_index", countries: ["poland", "romania", "croatia"], reason: "PL 2021 LEU→KAU transition without an official pre-2021 bridge; RO has no exact official comparable start; HR not audited" },
  { series: "unemployment_rate_monthly", countries: ["poland", "slovakia", "croatia"], reason: "PL 2009-12 and SK 2011-09 'd' flags unexplained by official documentation; HR LFS breaks not audited" },
  { series: "policy_rate", countries: ["czechia", "hungary", "poland", "romania", "serbia", "slovakia", "slovenia", "croatia"], reason: "national instrument/regime changes and pre-euro national regimes (SI < 2007, SK < 2009, HR < 2023)" },
  { series: "bilateral_fx_local_per_eur", countries: ["romania", "serbia"], reason: "RON redenomination 2005-07; RSD/YUM changes" },
  { series: "all_high_frequency_and_macro_drivers", countries: ["serbia"], reason: "outside the EU statistical system; national definitions need mapping" },
];

const monthIndex = (p) => Number(p.slice(0, 4)) * 12 + Number(p.slice(5, 7)) - 1;
const nextMonth = (p) => { const n = monthIndex(p) + 1; return `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`; };

function archive(name, fetcher) {
  const file = path.join(rawDir, name);
  return (async () => {
    if (offline) return { bytes: fs.readFileSync(file), retrieved_at: null, http_status: null, file };
    const { bytes, status } = await fetcher();
    fs.writeFileSync(file, bytes);
    return { bytes, retrieved_at: new Date().toISOString(), http_status: status, file };
  })();
}
const httpGet = async (url) => { const response = await fetch(url, { signal: AbortSignal.timeout(90000) }); const bytes = Buffer.from(await response.arrayBuffer()); if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`); return { bytes, status: response.status }; };

function parseJsonStat(bytes) {
  const json = JSON.parse(bytes.toString("utf8"));
  const ordered = Object.fromEntries(json.id.map((id) => [id, Object.entries(json.dimension[id].category.index).sort((a, b) => a[1] - b[1]).map(([k]) => k)]));
  const stride = json.size.map((_, i) => json.size.slice(i + 1).reduce((a, b) => a * b, 1));
  const at = (g, t) => json.id.reduce((n, id, i) => n + (id === "geo" ? ordered.geo.indexOf(g) : id === "time" ? ordered.time.indexOf(t) : 0) * stride[i], 0);
  const out = {};
  for (const g of ordered.geo) out[g] = ordered.time.map((t) => ({ period: t, value: json.value?.[at(g, t)] ?? null, flag: String(json.status?.[at(g, t)] ?? "").trim() })).filter((r) => r.value !== null);
  return { rows: out, updated: json.updated ?? null };
}
function parseBisCsv(bytes) {
  const [header, ...lines] = bytes.toString("utf8").trim().split(/\r?\n/);
  const cols = header.split(",");
  const split = (line) => { const out = []; let cur = "", q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
  const rows = lines.map(split).map((cells) => Object.fromEntries(cols.map((c, i) => [c, cells[i]])));
  return rows.filter((r) => r.OBS_VALUE !== "" && r.OBS_VALUE !== "NaN").map((r) => ({ period: r.TIME_PERIOD, value: Number(r.OBS_VALUE), flag: [r.OBS_STATUS !== "A" ? r.OBS_STATUS : "", r.OBS_PRE_BREAK ? "b" : ""].join("").trim(), compilation: r.COMPILATION ?? r.TITLE ?? r.TITLE_TS ?? null, breaks: r.SUPP_INFO_BREAKS ?? null }));
}

export async function build(options = {}) {
  if (options.offline !== undefined) offline = options.offline;
  fs.mkdirSync(rawDir, { recursive: true });
  const hf = read("src/data/high-frequency/high_frequency_observations.json").records;
  const md = read("src/data/macro-drivers/macro_driver_observations.json").records;
  const stored = (spec, slug) => (spec.store === "high_frequency"
    ? hf.filter((r) => r.country === slug && r.indicator === spec.id && r.transformation === spec.transformation)
    : md.filter((r) => (r.country ?? r.scope) === slug && r.driver_id === spec.id && r.transformation === spec.transformation)).map((r) => ({ period: r.period, value: r.value }));
  const sources = [], records = [], series = [], seriesSources = [];
  const eurostatCache = {}, bisCache = {};
  const eurostatRows = async (dataset, params, geos) => {
    const q = new URLSearchParams({ format: "JSON", lang: "en", sinceTimePeriod: "1999-01" });
    for (const [k, v] of Object.entries(params)) q.append(k, v);
    for (const g of geos) q.append("geo", g);
    const url = `${EUROSTAT}/${dataset}?${q}`;
    const name = `eurostat_${dataset}_${Object.values(params).join("_")}.json`;
    if (!eurostatCache[name]) {
      const got = await archive(name, () => httpGet(url));
      const parsed = parseJsonStat(got.bytes);
      sources.push({ source: "eurostat", dataset, url, raw_file: path.relative(root, got.file), sha256: sha(got.bytes), retrieved_at: got.retrieved_at, http_status: got.http_status, dataset_updated_at: parsed.updated });
      eurostatCache[name] = { ...parsed, url, raw_file: path.relative(root, got.file) };
    }
    return eurostatCache[name];
  };
  const bisRows = async (flow, key) => {
    const url = `${BIS}/${flow}/1.0/${key}?startPeriod=1999-01&format=csv`;
    const name = `bis_${flow}_${key.replaceAll(".", "_")}.csv`;
    if (!bisCache[name]) {
      const got = await archive(name, () => httpGet(url));
      sources.push({ source: "bis", dataset: `${flow} ${key}`, url, raw_file: path.relative(root, got.file), sha256: sha(got.bytes), retrieved_at: got.retrieved_at, http_status: got.http_status });
      bisCache[name] = { rows: parseBisCsv(got.bytes), url, raw_file: path.relative(root, got.file) };
    }
    return bisCache[name];
  };
  const v183Raw = {};
  for (const [id, file] of Object.entries(V183_RAW)) { const bytes = fs.readFileSync(path.join(root, file)); v183Raw[id] = { ...parseJsonStat(bytes), raw_file: file, sha256: sha(bytes) }; sources.push({ source: "eurostat", dataset: path.basename(file, ".json"), url: read("src/data/historical-extension-audit/historical_extension_source_manifest.json").sources.find((s) => s.id === id)?.url ?? null, raw_file: file, sha256: v183Raw[id].sha256, retrieved_at: read("src/data/historical-extension-audit/historical_extension_source_manifest.json").sources.find((s) => s.id === id)?.retrieved_at ?? null, http_status: 200, note: "archived v1.83 extract, reused unchanged" }); }

  for (const spec of SERIES) {
    for (const geo of spec.countries) {
      const slug = spec.country ?? SLUG[geo];
      let rows, floor, rawFile, url, decision, notes = null;
      if (spec.v183 && V183.includes(geo)) {
        const audit = read(`src/data/historical-extension-audit/${V183_AUDIT[spec.v183]}`).records.find((r) => r.country === geo);
        rows = v183Raw[spec.v183].rows[geo] ?? [];
        rawFile = v183Raw[spec.v183].raw_file; url = sources.find((s) => s.raw_file === rawFile)?.url;
        const cleared = audit?.pre2015_extension_status === "cleared" && audit.earliest_definition_compatible;
        floor = cleared ? (audit.earliest_definition_compatible > FLOOR ? audit.earliest_definition_compatible : FLOOR) : null;
        decision = cleared ? "v183_audit_cleared_floor" : `v183_audit_${audit?.pre2015_extension_status ?? "missing"}`;
      } else if (spec.eurostat) {
        const got = await eurostatRows(spec.eurostat.dataset, spec.eurostat.params, spec.countries.filter((g) => !(spec.v183 && V183.includes(g))));
        rows = got.rows[geo] ?? []; rawFile = got.raw_file; url = got.url;
        const breaks = rows.filter((r) => /[bd]/.test(r.flag));
        const lastBreak = breaks.length ? breaks.map((r) => (/b/.test(r.flag) ? r.period : nextMonth(r.period))).sort().at(-1) : null;
        floor = [FLOOR, lastBreak, rows[0]?.period].filter(Boolean).sort().at(-1);
        decision = "official_flag_floor";
      } else if (spec.bis) {
        const got = await bisRows(spec.bis.flow, spec.bis.keyOf(geo));
        rawFile = got.raw_file; url = got.url;
        let base = got.rows;
        if (spec.bis.divideBy) {
          const denom = await bisRows(spec.bis.flow, spec.bis.divideBy);
          const d = new Map(denom.rows.map((r) => [r.period, r.value]));
          rawFile = `${got.raw_file} ÷ ${denom.raw_file}`; url = `${got.url} ÷ ${denom.url}`;
          base = base.filter((r) => d.get(r.period)).map((r) => ({ ...r, value: r.value / d.get(r.period) }));
        }
        if (spec.bis.invert) base = base.filter((r) => r.value).map((r) => ({ ...r, value: 1 / r.value }));
        rows = base;
        notes = got.rows[0]?.compilation ?? null;
        const breaks = rows.filter((r) => /b/.test(r.flag));
        floor = [FLOOR, breaks.length ? breaks.map((r) => r.period).sort().at(-1) : null, rows[0]?.period].filter(Boolean).sort().at(-1);
        decision = "official_flag_floor";
      }
      const current = stored(spec, slug);
      const firstStored = current.map((r) => r.period).sort()[0] ?? null;
      const byPeriod = new Map(rows.map((r) => [r.period, r.value]));
      const overlap = current.filter((r) => r.value !== null && byPeriod.has(r.period)).map((r) => ({ stored: r.value, retrieved: byPeriod.get(r.period) }));
      const excess = overlap.reduce((m, o) => Math.max(m, Math.abs(o.stored - o.retrieved) - Math.max(OVERLAP_TOLERANCE.absolute, OVERLAP_TOLERANCE.relative * Math.abs(o.stored))), -Infinity);
      const overlapOk = overlap.length > 0 && excess <= 0;
      const eligible = floor ? rows.filter((r) => r.period >= floor && (firstStored === null || r.period < firstStored)) : [];
      const ingest = overlapOk ? eligible : [];
      const unit = spec.unitOf ? spec.unitOf(geo) : spec.unit;
      // Per-series provenance (source URL, raw file, definition, unit, floor decision) lives once in `series_sources`;
      // each record points to it with `source_ref`, keeping the store compact.
      const sourceRef = seriesSources.length;
      if (ingest.length) seriesSources.push({ source_ref: sourceRef, series: spec.key, country_slug: slug, store_counterpart: `${spec.store}:${spec.id}:${spec.transformation}`, unit, definition: spec.label, source: rawFile.includes("bis_") ? "BIS" : "Eurostat", source_url: url, raw_file: rawFile, floor_decision: decision, definition_compatible_floor: floor, comparability_status: "definition_compatible_from_floor", instrument_notes: notes });
      for (const r of ingest) records.push({ id: `hist:monthly:${slug}:${spec.key}:${r.period}`, country_slug: slug, series: spec.key, period: r.period, value: Number(r.value.toPrecision(12)), value_status: /p/.test(r.flag) ? "provisional" : /e/.test(r.flag) ? "estimated" : "official", source_flag: r.flag || null, source_ref: sourceRef });
      series.push({ series: spec.key, country: slug, source_raw: rawFile, decision, definition_compatible_floor: floor, first_stored_period: firstStored, overlap_months: overlap.length, overlap_max_excess: overlap.length ? Number(excess.toFixed(6)) : null, overlap_check: overlap.length ? (overlapOk ? "pass" : "fail_definition_or_vintage_mismatch") : "no_overlap", ingested_periods: ingest.length ? [ingest[0].period, ingest.at(-1).period] : null, ingested_count: ingest.length, instrument_notes: notes, status: !floor ? "blocked_by_definition_audit" : !overlapOk ? "held_for_review" : ingest.length ? "ingested" : "nothing_before_first_stored_month" });
    }
  }
  records.sort((a, b) => a.series.localeCompare(b.series) || a.country_slug.localeCompare(b.country_slug) || a.period.localeCompare(b.period));
  sources.sort((a, b) => a.raw_file.localeCompare(b.raw_file));
  const history = {
    schema_version: "monthly-descriptive-history-v2.0", data_type: "monthly_descriptive_history", descriptive_only: true,
    model_boundary: "Descriptive research coverage only. The frozen 2015+ high-frequency and macro-driver files remain the only model inputs; LP, Panel LP and VAR samples are unchanged and no model was re-run.",
    missing_value_policy: "Months without an official value are absent; nothing is interpolated or encoded as zero.",
    backfill_policy: "Only months before the first stored month of the counterpart series are added; stored observations are never duplicated or replaced.",
    descriptive_only_note: "Every record is descriptive only; see series_sources[source_ref] for unit, definition, source URL and raw extract.",
    series_sources: seriesSources, record_count: records.length, records,
  };
  const manifest = {
    schema_version: "monthly-history-manifest-v2.0", phase: "v2.0 Phase H — monthly descriptive history",
    approval: "Owner approved safe descriptive backfills (2026-09-29) and Phase H.",
    target: `${FLOOR} up to the first stored month (2015-01)`, floor_rule: "v1.83-audited cells use that audit's definition-compatible floor; other cells use the month of the last official break flag ('b') or the month after the last 'd' flag; never before 2000-01",
    overlap_tolerance: OVERLAP_TOLERANCE, sources, series, review_queue: MONTHLY_REVIEW_QUEUE,
    summary: { ingested_records: records.length, ingested_by_series: Object.fromEntries([...new Set(records.map((r) => r.series))].map((s) => [s, records.filter((r) => r.series === s).length])), not_ingested: series.filter((s) => s.status !== "ingested").map((s) => `${s.series}/${s.country}: ${s.status}${s.overlap_max_excess != null && s.status === "held_for_review" ? ` (excess ${s.overlap_max_excess})` : ""}`) },
  };
  return { history, manifest };
}

export function writeHistory(history, file) {
  const { records, ...header } = history;
  const head = JSON.stringify(header, null, 2).replace(/\n}$/, "");
  fs.writeFileSync(file, `${head},\n  "records": [\n${records.map((r) => `    ${JSON.stringify(r)}`).join(",\n")}\n  ]\n}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { history, manifest } = await build();
  if (offline) { const prior = read(MONTHLY_MANIFEST_PATH); manifest.sources = manifest.sources.map((s) => ({ ...s, retrieved_at: prior.sources.find((p) => p.raw_file === s.raw_file)?.retrieved_at ?? s.retrieved_at, http_status: prior.sources.find((p) => p.raw_file === s.raw_file)?.http_status ?? s.http_status })); }
  writeHistory(history, path.join(root, MONTHLY_HISTORY_PATH));
  fs.writeFileSync(path.join(root, MONTHLY_MANIFEST_PATH), JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify({ records: history.record_count, ...manifest.summary }, null, 1));
}
