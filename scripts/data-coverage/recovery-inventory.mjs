// Historical recovery inventory and comparability (v2.0 Phase R, 2026-11-10).
// Enumerates every existing country × indicator × frequency contract from the actual data stores, joins all admitted
// layers (formal stores, descriptive histories, Serbia SORS stores), checks every expected year / quarter / month
// against the official availability recorded in the archived extracts, and classifies each missing period:
//   1 available_officially_not_admitted   (official value exists; the reason it is not admitted is stated)
//   2 lost_in_ingestion_or_processing      (official value exists in an archived extract but was dropped; must be 0)
//   3 outside_official_series_existence    (before the first or after the last official period of the series)
//   4 officially_missing_or_suppressed     (inside the official span, the official cell is empty or a missing status)
//   5 not_yet_published                    (after the latest official period)
//   6 definitionally_incompatible          (before a break / definition / territorial / regime floor)
//   7 restricted_by_reuse_or_access        (source not cleared or host not registered for automated acquisition)
//   8 unresolved                           (held: overlap/splice mismatch, review queue, or not investigated)
// Comparable periods are the intersection of actually observed periods of definition-compatible series, never a
// min/max intersection. Deterministic: no clock is read; output depends only on committed files.
// Usage: node scripts/data-coverage/recovery-inventory.mjs   (writes src/data/data-coverage/historical_recovery_inventory.json)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SAFE, DERIVED, RECOVERED_INDICATORS, RECOVERY_GEOS, TERRITORIAL_FLOORS, REVIEW_QUEUE_AFTER_RECOVERY } from "../historical-annual/acquire.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
export const INVENTORY_PATH = "src/data/data-coverage/historical_recovery_inventory.json";
export const CATEGORIES = {
  1: "available_officially_not_admitted", 2: "lost_in_ingestion_or_processing", 3: "outside_official_series_existence", 4: "officially_missing_or_suppressed",
  5: "not_yet_published", 6: "definitionally_incompatible", 7: "restricted_by_reuse_or_access", 8: "unresolved",
};
const SLUGS = Object.fromEntries(Object.entries(RECOVERY_GEOS).map(([code, [, slug]]) => [slug, code]));

// --- Period helpers ---------------------------------------------------------------------------------------------
const nextPeriod = (p) => {
  if (/^\d{4}$/.test(p)) return String(Number(p) + 1);
  if (/^\d{4}-Q\d$/.test(p)) { const y = Number(p.slice(0, 4)), q = Number(p.slice(6)); return q === 4 ? `${y + 1}-Q1` : `${y}-Q${q + 1}`; }
  const y = Number(p.slice(0, 4)), m = Number(p.slice(5, 7)); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};
const span = (a, b) => { const out = []; for (let p = a; p <= b; p = nextPeriod(p)) out.push(p); return out; };
// Compress a sorted period list into [first, last] runs of consecutive periods.
export const runs = (periods) => { const out = []; for (const p of [...periods].sort()) { const last = out.at(-1); if (last && nextPeriod(last[1]) === p) last[1] = p; else out.push([p, p]); } return out; };

// --- Official availability readers --------------------------------------------------------------------------------
function jsonStat(file) {
  const json = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
  const ordered = Object.fromEntries(json.id.map((id) => [id, Object.entries(json.dimension[id].category.index).sort((a, b) => a[1] - b[1]).map(([k]) => k)]));
  const stride = json.size.map((_, i) => json.size.slice(i + 1).reduce((a, b) => a * b, 1));
  const cell = (coords) => { const pos = json.id.map((id) => ordered[id].indexOf(coords[id] ?? (ordered[id].length === 1 ? ordered[id][0] : undefined))); if (pos.some((p) => p < 0)) return null; const i = pos.reduce((n, p, k) => n + p * stride[k], 0); const v = json.value?.[i]; return v === undefined || v === null ? null : { value: v, flag: String(json.status?.[i] ?? "").trim() }; };
  return { ordered, cell };
}
function bisCsv(file) {
  const [header, ...lines] = fs.readFileSync(path.join(root, file), "utf8").trim().split(/\r?\n/);
  const cols = header.split(",");
  const split = (line) => { const out = []; let cur = "", q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
  return new Map(lines.map(split).map((c) => Object.fromEntries(cols.map((k, i) => [k, c[i]]))).filter((r) => r.OBS_VALUE !== "" && r.OBS_VALUE !== "NaN").map((r) => [r.TIME_PERIOD, Number(r.OBS_VALUE)]));
}

// --- Rights (source_rights_registry.json) -------------------------------------------------------------------------
const rightsRegistry = read("docs/legal-security/source_rights_registry.json").sources;
const rightsOf = (id) => { const r = rightsRegistry.find((s) => s.source_id === id); return r ? { source_id: id, licence: r.licence_name, reuse_right: r.reuse_right, normalized_republication: r.normalized_republication, raw_redistribution: r.raw_redistribution, attribution: r.required_attribution_text, review_status: r.review_status } : { source_id: id, reuse_right: "unknown" }; };
const sourceIdFor = (text) => /comtrade/i.test(text) ? "src-un-comtrade" : /world bank|worldbank|WDI|^[A-Z]{2}\.[A-Z]/i.test(text) ? "src-worldbank" : /BIS/.test(text) ? "src-bis" : /SORS|RZS|stat\.gov\.rs/i.test(text) ? "src-sors" : "src-eurostat";

export function buildInventory() {
  const observations = read("src/data/observations/observations.json").records;
  const annualHistory = read("src/data/historical/annual_descriptive_history.json").records;
  const annualManifest = read("src/data/historical/annual_history_manifest.json");
  const monthlyHistory = read("src/data/historical/monthly_descriptive_history.json");
  const monthlyManifest = read("src/data/historical/monthly_history_manifest.json");
  const regionalHistory = read("src/data/historical/regional_descriptive_history.json").records;
  const regionalManifest = read("src/data/historical/regional_history_manifest.json");
  const hf = read("src/data/high-frequency/high_frequency_observations.json").records;
  const md = read("src/data/macro-drivers/macro_driver_observations.json").records;
  const regionalStored = [...read("src/data/regional/v086-observations.json").records, ...read("src/data/regional/v089-observations.json").records];
  const panel = read("src/data/panel/panel_observations.json").records;
  const serbia = Object.fromEntries(["annual", "monthly", "regional"].map((k) => [k, read(`src/data/serbia/serbia_descriptive_history_${k}.json`)]));
  const serbiaManifest = read("src/data/serbia/serbia_ingestion_manifest.json");
  const series = [];

  // ===== A. National annual (observations.json + annual descriptive history) =====================================
  const fullTables = Object.fromEntries((annualManifest.recovery.tables ?? []).map((t) => [t.table, { ...t, data: jsonStat(t.raw_file) }]));
  const annualSpecs = [...SAFE.map((s) => ({ ...s, kind: "direct" })), ...RECOVERED_INDICATORS.map((s) => ({ kind: "direct", ...s }))];
  const officialYears = (spec, code) => {
    const t = fullTables[spec.table]; if (!t) return null;
    const base = { ...spec.select, geo: code };
    const out = new Map();
    const years = [...new Set(t.data.ordered.time.map((p) => Number(p.slice(0, 4))))];
    for (const year of years) {
      let v = null;
      if (spec.kind === "semester_mean") { const a = t.data.cell({ ...base, freq: "S", time: `${year}-S1` }), b = t.data.cell({ ...base, freq: "S", time: `${year}-S2` }); v = a && b ? { flag: a.flag + b.flag } : null; }
      else if (spec.kind === "ratio") { const n = t.data.cell({ ...base, ...spec.numerator, freq: "A", time: String(year) }), d = t.data.cell({ ...base, ...spec.denominator, freq: "A", time: String(year) }); v = n && d && d.value ? { flag: n.flag + d.flag } : null; }
      else v = t.data.cell({ ...base, freq: "A", time: String(year) });
      if (v) out.set(year, v.flag);
    }
    return out;
  };
  const annualIndicators = [...new Set([...observations.map((r) => r.indicator), ...annualHistory.map((r) => r.indicator)])].sort();
  for (const indicator of annualIndicators) {
    for (const [slug, code] of Object.entries(SLUGS)) {
      const canonical = observations.filter((r) => r.indicator === indicator && r.country_slug === slug);
      const history = annualHistory.filter((r) => r.indicator === indicator && r.country_slug === slug);
      if (!canonical.length && !history.length) continue;
      const admitted = new Map([...canonical.filter((r) => r.value !== null).map((r) => [r.year, "observations.json"]), ...history.map((r) => [r.year, r.recovery_phase === "R" ? "annual_history_phase_r" : "annual_history_phase_g"])]);
      const spec = annualSpecs.find((s) => s.id === indicator);
      const derived = DERIVED.find((d) => d.id === indicator);
      const inputs = derived ? derived.inputs.map((i) => officialYears(annualSpecs.find((s) => s.id === i), code)) : null;
      const official = spec ? officialYears(spec, code) : inputs && inputs.every(Boolean) ? new Map([...inputs[0].keys()].filter((y) => inputs.every((m) => m.has(y))).map((y) => [y, ""])) : null;
      const rec = annualManifest.recovery.series.find((s) => s.indicator === indicator && s.country === slug);
      const phaseG = annualManifest.series.find((s) => s.indicator === indicator && s.country === slug);
      const canonicalYears = canonical.map((r) => r.year);
      const canonicalFirst = canonicalYears.length ? Math.min(...canonicalYears) : null, canonicalLast = canonicalYears.length ? Math.max(...canonicalYears) : null;
      const officialList = official ? [...official.keys()].sort((a, b) => a - b) : [];
      const all = [...admitted.keys(), ...officialList];
      const first = Math.min(...all), last = Math.max(...all);
      const floor = rec?.kind === "derived" ? (rec.input_floors?.some((f) => f === null) ? null : Math.max(...(rec.input_floors ?? []))) : rec?.definition_compatible_floor ?? null;
      const missing = [];
      const restricted = /comtrade/i.test(canonical[0]?.source_dataset ?? canonical[0]?.source_url ?? "");
      for (let y = first; y <= last; y += 1) {
        if (admitted.has(y)) continue;
        let category, reason;
        const off = official?.has(y);
        if (restricted) { category = 7; reason = "UN Comtrade: licence review due and raw redistribution not cleared; no automated recovery"; }
        else if (!official) { category = 8; reason = "no official full-history extract registered for this contract"; }
        else if (!off && officialList.length && y < officialList[0]) { category = 3; reason = "before the first official value"; }
        else if (!off && officialList.length && y > officialList.at(-1)) { category = 5; reason = "after the latest official value in the archived extract"; }
        else if (!off) { category = 4; reason = canonical.some((r) => r.year === y && r.value === null) ? "official cell empty; the canonical record is null" : "official cell empty inside the official span"; }
        else if (canonicalFirst !== null && y >= canonicalFirst && y <= canonicalLast) { category = 1; reason = "inside the canonical window, where observations.json (a frozen formal model input) holds a null; descriptive history only adds years before the canonical window"; }
        else if (canonicalLast !== null && y > canonicalLast) { category = 1; reason = "after the last canonical year: published officially, but new years belong to the canonical refresh path (formal model input), not to descriptive history"; }
        else if (TERRITORIAL_FLOORS[code] && y < TERRITORIAL_FLOORS[code].year) { category = 6; reason = TERRITORIAL_FLOORS[code].note; }
        else if (floor !== null && y < floor) { category = 6; reason = rec.kind === "derived" ? `before the latest input floor ${floor} (inputs ${rec.inputs.join(", ")}; floors ${rec.input_floors.join(", ")})` : `before the definition-compatible floor ${floor} (official break or definition flags: ${(rec.break_flags ?? []).join(", ") || "none"})`; }
        else if (rec && /held|phase_g_held/.test(rec.status)) { category = 8; reason = `held: ${rec.status} (splice excess ${rec.overlap_max_excess})`; }
        else if (phaseG && phaseG.status === "held_for_review") { category = 8; reason = "Phase G overlap mismatch with the canonical vintage; held"; }
        else if (REVIEW_QUEUE_AFTER_RECOVERY.some((q) => q.id === indicator)) { category = 8; reason = `review queue: ${REVIEW_QUEUE_AFTER_RECOVERY.find((q) => q.id === indicator).reason}`; }
        else { category = 2; reason = "official value present but not admitted"; }
        missing.push({ period: String(y), category, reason });
      }
      const source = canonical[0]?.source_dataset ?? history[0]?.source_dataset ?? spec?.table ?? null;
      series.push({
        key: `annual|${slug}|${indicator}`, frequency: "annual", country: slug, indicator, scope: "national",
        layers: { "observations.json": canonical.length ? { first: String(canonicalFirst), last: String(canonicalLast), records: canonical.length, nulls: canonical.filter((r) => r.value === null).length } : null, annual_history: history.length ? { first: String(Math.min(...history.map((r) => r.year))), last: String(Math.max(...history.map((r) => r.year))), records: history.length, phase_r: history.filter((r) => r.recovery_phase === "R").length } : null },
        admitted: admitted.size ? { first: String(Math.min(...admitted.keys())), last: String(Math.max(...admitted.keys())), periods: admitted.size } : null,
        official: officialList.length ? { first: String(officialList[0]), last: String(officialList.at(-1)), periods: officialList.length, source_dataset: spec ? `Eurostat ${spec.table}` : derived ? "Eurostat nama_10_gdp (derived)" : source, raw_file: spec ? fullTables[spec.table]?.raw_file ?? null : null } : null,
        unit: canonical[0]?.unit ?? history[0]?.unit ?? null, definition: spec?.definition ?? derived?.definition ?? history[0]?.definition ?? null, source_dataset: source,
        floors: { definition_compatible: floor, territorial: TERRITORIAL_FLOORS[code]?.year ?? null, break_flags: rec?.break_flags ?? [] },
        recovery_status: rec?.status ?? (restricted ? "restricted_source_not_recovered" : null), ...(canonical.length && canonical.every((r) => r.value === null && r.applicability_status && r.applicability_status !== "applicable") ? { applicability: canonical[0].applicability_status } : {}), rights: rightsOf(sourceIdFor(`${source ?? ""} ${canonical[0]?.source_url ?? ""}`)),
        missing: summarise(missing),
      });
    }
  }

  // ===== B. National monthly (frozen 2015+ stores + monthly descriptive history) ===================================
  const mSources = monthlyHistory.series_sources;
  const mRecovery = monthlyManifest.recovery.series;
  const rawRowsCache = new Map();
  const officialMonths = (rawFile, geo, select) => {
    if (!rawFile) return null;
    const key = `${rawFile}|${geo}|${JSON.stringify(select ?? {})}`;
    if (rawRowsCache.has(key)) return rawRowsCache.get(key);
    let out = null;
    if (rawFile.includes("÷")) { const [a, b] = rawFile.split(" ÷ "); const x = bisCsv(a), y = bisCsv(b); out = new Set([...x.keys()].filter((p) => y.has(p) && y.get(p))); }
    else if (rawFile.endsWith(".csv")) out = new Set(bisCsv(rawFile).keys());
    else { const t = jsonStat(rawFile); out = new Set(t.ordered.time.filter((p) => t.cell({ ...(select ?? {}), geo, time: p }) !== null)); }
    rawRowsCache.set(key, out);
    return out;
  };
  const monthlyContracts = new Map();
  const addM = (seriesKey, slug, store, period) => { const k = `${seriesKey}|${slug}`; if (!monthlyContracts.has(k)) monthlyContracts.set(k, { seriesKey, slug, stores: {} }); const c = monthlyContracts.get(k); (c.stores[store] ??= new Set()).add(period); };
  for (const r of hf) if (r.transformation === "level" || r.transformation === "yoy_rate") { if (r.value !== null) addM(r.transformation === "yoy_rate" ? "hicp_annual_rate" : r.indicator, r.country, "high_frequency (frozen 2015+)", r.period); }
  for (const r of md) if (["level", "yoy_rate"].includes(r.transformation)) { if (r.value !== null) addM(r.driver_id, r.country ?? r.scope, "macro_drivers (frozen 2015+)", r.period); }
  for (const r of monthlyHistory.records) addM(r.series, r.country_slug, r.recovery_phase === "R" ? "monthly_history_phase_r" : "monthly_history_phase_h", r.period);
  const transformationSeries = [...new Set([...hf.filter((r) => !["level", "yoy_rate"].includes(r.transformation)).map((r) => `${r.indicator}:${r.transformation}`), ...md.filter((r) => !["level", "yoy_rate"].includes(r.transformation)).map((r) => `${r.driver_id}:${r.transformation}`)])].sort();
  for (const { seriesKey, slug, stores } of [...monthlyContracts.values()].sort((a, b) => `${a.seriesKey}|${a.slug}`.localeCompare(`${b.seriesKey}|${b.slug}`))) {
    const admitted = new Set(Object.values(stores).flatMap((s) => [...s]));
    const rec = mRecovery.find((s) => s.series === seriesKey && s.country === slug);
    const geo = SLUGS[slug] ?? (slug === "euro_area" ? "XM" : null);
    const srcEntry = mSources.find((s) => s.series === seriesKey && s.country_slug === slug && s.recovery_phase === "R") ?? mSources.find((s) => s.series === seriesKey && s.country_slug === slug);
    const select = rec?.source_raw?.includes("prc_hicp_minr") ? { unit: /I15/.test(rec.source_raw) || seriesKey.endsWith("index") ? "I15" : "RCH_A", coicop18: /energy/.test(seriesKey) ? "NRG" : "TOTAL" } : rec?.source_raw?.includes("sts_inpr_m") ? { indic_bt: "PRD", nace_r2: "B-D", s_adj: "SCA", unit: "I21" } : rec?.source_raw?.includes("une_rt_m") ? { s_adj: "SA", age: "TOTAL", sex: "T", unit: "PC_ACT" } : rec?.source_raw?.includes("irt_lt_mcby_m") ? { int_rt: "MCBY" } : null;
    const official = rec ? officialMonths(rec.source_raw, geo, select) : null;
    const officialList = official ? [...official].filter((p) => /^\d{4}-\d{2}$/.test(p)).sort() : [];
    const sorted = [...admitted].sort();
    const first = [sorted[0], officialList[0]].filter(Boolean).sort()[0], last = [sorted.at(-1), officialList.at(-1)].filter(Boolean).sort().at(-1);
    const frozenFirst = Object.entries(stores).filter(([k]) => /frozen/.test(k)).flatMap(([, s]) => [...s]).sort()[0] ?? null;
    const frozenLast = Object.entries(stores).filter(([k]) => /frozen/.test(k)).flatMap(([, s]) => [...s]).sort().at(-1) ?? null;
    const missing = [];
    for (const p of span(first, last)) {
      if (admitted.has(p)) continue;
      let category, reason;
      const off = official?.has(p);
      if (!rec) { category = 8; reason = /brent|gas/.test(seriesKey) ? "World Bank Pink Sheet: raw redistribution not cleared and licence review due; pre-2015 history not recovered" : "no recovery source registered for this contract"; if (/brent|gas/.test(seriesKey)) category = 7; }
      else if (!off && officialList.length && p < officialList[0]) { category = 3; reason = "before the first official value"; }
      else if (!off && officialList.length && p > officialList.at(-1)) { category = 5; reason = "after the latest official value in the archived extract"; }
      else if (!off) { category = 4; reason = "official cell empty inside the official span"; }
      else if (frozenLast && p > frozenLast) { category = 1; reason = "after the frozen 2015+ store: new months belong to the high-frequency / macro-driver refresh path, not to descriptive history"; }
      else if (frozenFirst && p >= frozenFirst) { category = 4; reason = "inside the frozen 2015+ window, the stored month is null"; }
      else if (rec.status === "blocked_by_definition_audit") { category = 6; reason = "blocked by the v1.83 definition audit (no official comparable bridge)"; }
      else if (rec.definition_compatible_floor && p < rec.definition_compatible_floor && /÷|XM_EUR/.test(rec.source_raw) && p < "1999-01") { category = 3; reason = "before 1999-01: the euro did not exist; BIS euro-area values before 1999 are a synthetic (ECU-based) series"; }
      else if (rec.definition_compatible_floor && p < rec.definition_compatible_floor) { category = 6; reason = `before the definition-compatible floor ${rec.definition_compatible_floor} (${rec.decision})`; }
      else if (/held|splice/.test(rec.status)) { category = 8; reason = `held: ${rec.status}`; }
      else { category = 2; reason = "official value present but not admitted"; }
      missing.push({ period: p, category, reason });
    }
    series.push({
      key: `monthly|${slug}|${seriesKey}`, frequency: "monthly", country: slug, indicator: seriesKey, scope: slug === "euro_area" || slug === "global" || slug === "europe" ? slug : "national",
      layers: Object.fromEntries(Object.entries(stores).sort().map(([k, s]) => { const l = [...s].sort(); return [k, { first: l[0], last: l.at(-1), records: l.length }]; })),
      admitted: { first: sorted[0], last: sorted.at(-1), periods: sorted.length },
      official: officialList.length ? { first: officialList[0], last: officialList.at(-1), periods: officialList.length, raw_file: rec.source_raw } : null,
      unit: srcEntry?.unit ?? null, definition: srcEntry?.definition ?? null, source_dataset: srcEntry?.source ?? null,
      floors: { definition_compatible: rec?.definition_compatible_floor ?? null, decision: rec?.decision ?? null, instrument_notes: rec?.instrument_notes ?? null },
      recovery_status: rec?.status ?? (/brent|gas/.test(seriesKey) ? "restricted_source_not_recovered (World Bank Pink Sheet: raw redistribution not cleared, licence review due)" : "not_in_recovery_scope"), rights: rightsOf(/brent|gas/.test(seriesKey) ? "src-worldbank" : sourceIdFor(`${srcEntry?.source ?? ""} ${rec?.source_raw ?? ""} ${seriesKey}`)),
      missing: summarise(missing),
    });
  }

  // ===== C. Regional (v0.86/v0.89 stores + regional descriptive history) ============================================
  const regionCodes = Object.fromEntries(Object.entries(read("src/data/historical/regional_descriptive_history.json").regions).map(([id, r]) => [id, r.geo_codes]));
  const regionalOfficial = {};
  for (const s of [...regionalManifest.sources, ...(regionalManifest.recovery?.sources ?? [])]) { const t = jsonStat(s.raw_file); (regionalOfficial[s.key] ??= []).push(t); }
  const indicatorInputs = { regional_population: ["population"], regional_gdp: ["gdp"], regional_gdp_per_capita: ["gdp", "population"], regional_unemployment_rate: ["unemployment"], regional_employment_rate: ["employment"], regional_manufacturing_share: ["gva_c", "gva_total"] };
  const tableParams = { population: { sex: "T", age: "TOTAL", unit: "NR" }, gdp: { unit: "MIO_EUR" }, unemployment: { sex: "T", age: "Y15-74", isced11: "TOTAL", unit: "PC" }, employment: { sex: "T", age: "Y20-64", unit: "PC" }, gva_c: { unit: "CP_MEUR", nace_r2: "C" }, gva_total: { unit: "CP_MEUR", nace_r2: "TOTAL" } };
  const regionalOfficialYears = (codes, indicator) => {
    const inputs = indicatorInputs[indicator]; if (!inputs || !codes) return null;
    const years = new Set();
    for (let y = 1990; y <= 2025; y += 1) if (inputs.every((k) => codes.every((c) => (regionalOfficial[k] ?? []).some((t) => t.cell({ ...tableParams[k], geo: c, time: String(y) }) !== null)))) years.add(y);
    return years;
  };
  const regionalContracts = new Map();
  for (const r of regionalStored) { if (r.value === null || r.value === undefined) continue; const k = `${r.region_id}|${r.region_indicator_id}`; if (!regionalContracts.has(k)) regionalContracts.set(k, { stored: new Set(), history: new Map() }); regionalContracts.get(k).stored.add(Number(r.year)); }
  for (const r of regionalHistory) { const k = `${r.region_id}|${r.indicator}`; if (!regionalContracts.has(k)) regionalContracts.set(k, { stored: new Set(), history: new Map() }); regionalContracts.get(k).history.set(r.statistical_year, r.comparability_status); }
  for (const [k, c] of [...regionalContracts.entries()].sort()) {
    const [regionId, indicator] = k.split("|");
    const admitted = new Set([...c.stored, ...c.history.keys()]);
    const official = regionalOfficialYears(regionCodes[regionId], indicator);
    const officialList = official ? [...official].sort((a, b) => a - b) : [];
    const all = [...admitted, ...officialList];
    const first = Math.min(...all), last = Math.max(...all);
    const pair = regionalManifest.pairs.find((p) => p.region_id === regionId && p.indicator === indicator);
    const rpair = regionalManifest.recovery?.pairs.find((p) => p.region_id === regionId && p.indicator === indicator);
    const missing = [];
    for (let y = first; y <= last; y += 1) {
      if (admitted.has(y)) continue;
      let category, reason;
      if (!official) { category = 8; reason = /change/.test(indicator) ? "calculated change indicator (2024 snapshot only); no history by design" : "no official regional extract registered"; if (/change/.test(indicator)) category = 3; }
      else if (!official.has(y) && officialList.length && y < officialList[0]) { category = 3; reason = "before the first official regional value"; }
      else if (!official.has(y) && officialList.length && y > officialList.at(-1)) { category = 5; reason = "after the latest official regional value"; }
      else if (!official.has(y)) { category = 4; reason = "official regional cell empty (e.g. German population 1 January 2013)"; }
      else if (y >= Math.min(...c.stored)) { category = 1; reason = "inside or after the stored v0.86/v0.89 window: belongs to the regional snapshot refresh path"; }
      else if (regionId.startsWith("germany_") && y < 1991) { category = 6; reason = "before German unification (1991 territorial floor)"; }
      else if (pair?.status === "not_extended_rate_needs_single_code") { category = 6; reason = "rate for a multi-code region: rates cannot be summed across codes"; }
      else if (rpair && /held|no_splice/.test(rpair.status)) { category = 8; reason = `pre-2000 recovery not verifiable: ${rpair.status}`; }
      else { category = 2; reason = "official value present but not admitted"; }
      missing.push({ period: String(y), category, reason });
    }
    const statuses = {}; for (const s of c.history.values()) statuses[s] = (statuses[s] ?? 0) + 1;
    series.push({
      key: `regional|${regionId}|${indicator}`, frequency: "annual", country: regionId.split("_")[0], region_id: regionId, indicator, scope: "regional",
      geo_codes: regionCodes[regionId] ?? null,
      layers: { "regional_store (v0.86/v0.89)": c.stored.size ? { first: String(Math.min(...c.stored)), last: String(Math.max(...c.stored)), records: c.stored.size } : null, regional_history: c.history.size ? { first: String(Math.min(...c.history.keys())), last: String(Math.max(...c.history.keys())), records: c.history.size, comparability: statuses } : null },
      admitted: { first: String(Math.min(...admitted)), last: String(Math.max(...admitted)), periods: admitted.size },
      official: officialList.length ? { first: String(officialList[0]), last: String(officialList.at(-1)), periods: officialList.length } : null,
      nuts: { vintage: "NUTS2024", versions_in_force: regionalManifest.nuts_versions_in_force.map((v) => v.version), pre_2003: "no official GISCO code list; recovered years are boundary backcasts" },
      recovery_status: rpair?.status ?? null, rights: rightsOf("src-eurostat"),
      missing: summarise(missing),
    });
  }

  // ===== D. Serbia SORS (national annual, monthly and quarterly; regional aggregated per series) =====================
  for (const store of ["annual", "monthly", "regional"]) {
    const doc = serbia[store];
    for (const src of doc.series_sources) {
      if (src.source_ref === undefined) continue;
      const recs = doc.records.filter((r) => r.source_ref === src.source_ref);
      const extractFile = serbiaManifest.sources.find((s) => s.dataset_id === String(src.source_dataset).split(" ")[0])?.extract_file;
      const extract = extractFile ? read(extractFile).records : [];
      const where = src.original_code && !src.original_code.derived_from ? src.original_code : {};
      const officialRows = extract.filter((r) => Object.entries(where).every(([k, v]) => String(r[k]) === String(v)) && (store === "regional" ? r.IDTer && r.IDTer !== "RS" : (r.IDTer ?? "RS") === "RS" || r.IDTer === "6"));
      const periodOf = (r) => (r.mes === "00" ? r.god : /^K/.test(r.mes) ? `${r.god}-Q${r.mes.slice(1)}` : `${r.god}-${r.mes}`);
      const frequency = store === "annual" ? "annual" : src.series.includes("quarterly") ? "quarterly" : store === "monthly" ? "monthly" : "annual";
      const okRow = (r) => frequency === "annual" ? r.mes === "00" : frequency === "quarterly" ? /^K\d$/.test(r.mes) : /^\d\d$/.test(r.mes) && r.mes !== "00";
      const territories = store === "regional" ? [...new Set(recs.map((r) => r.territory_code))].sort() : ["RS"];
      const missingAll = [];
      for (const territory of territories) {
        const admitted = new Set(recs.filter((r) => r.territory_code === territory).map((r) => r.period));
        const rows = officialRows.filter((r) => okRow(r) && (store !== "regional" || r.IDTer === territory));
        const valued = new Set(rows.filter((r) => r.vrednost !== null && r.vrednost !== undefined).map(periodOf));
        const statusRows = new Map(rows.filter((r) => r.vrednost === null || r.vrednost === undefined).map((r) => [periodOf(r), r.IDStatusPodatka]));
        const all = [...admitted, ...valued].sort();
        if (!all.length) continue;
        for (const p of span(all[0], all.at(-1))) {
          if (admitted.has(p)) continue;
          let category, reason;
          if (Number(p.slice(0, 4)) < 1999) { category = 6; reason = "before 1999: SORS national totals exclude AP Kosovo and Metohija from 1998 (territorial coverage change)"; }
          else if (statusRows.has(p)) { category = 4; reason = `SORS missing-value status ${statusRows.get(p)}`; }
          else if (!valued.has(p)) { category = 4; reason = "no SORS value for this period"; }
          else if (src.status === "held_overlap_failed") { category = 8; reason = "held: EUR conversion overlap with Eurostat failed"; }
          else if (Number(p.slice(0, 4)) === 1999) { category = 6; reason = "1999 period separated from 2000 by a break, definition flag or level shift"; }
          else { category = 2; reason = "SORS value present but not admitted"; }
          missingAll.push({ period: store === "regional" ? `${territory}:${p}` : p, category, reason });
        }
      }
      const periods = [...new Set(recs.map((r) => r.period))].sort();
      series.push({
        key: `serbia_sors_${store}|serbia|${src.series}`, frequency, country: "serbia", indicator: src.series, scope: store === "regional" ? "regional (NSTJ / municipalities)" : "national",
        layers: { [`serbia_sors_${store}`]: periods.length ? { first: periods[0], last: periods.at(-1), records: recs.length, phase_r: recs.filter((r) => r.recovery_phase === "R").length, territorial_units: territories.length } : null },
        admitted: periods.length ? { first: periods[0], last: periods.at(-1), periods: periods.length } : null,
        official: null, unit: recs[0]?.original_unit ?? null, definition: src.label, source_dataset: `SORS ${src.source_dataset}`,
        floors: { territorial: 1999, note: "SORS national totals exclude AP Kosovo and Metohija from 1998" },
        recovery_status: src.status, rights: rightsOf("src-sors"),
        missing: summarise(missingAll),
      });
    }
  }

  // ===== E. Frozen formal estimation frame (panel; World Bank WDI) ================================================
  const panelKeys = [...new Set(panel.map((r) => `${r.country_slug ?? r.country}|${r.indicator}`))].sort();
  const panelFrame = panelKeys.map((k) => { const [country, indicator] = k.split("|"); const rs = panel.filter((r) => (r.country_slug ?? r.country) === country && r.indicator === indicator); const ys = rs.filter((r) => r.value !== null).map((r) => Number(r.year)); return { country, indicator, first: ys.length ? Math.min(...ys) : null, last: ys.length ? Math.max(...ys) : null, records: rs.length, nulls: rs.filter((r) => r.value === null).length }; });

  // ===== Comparability ==============================================================================================
  const comparability = buildComparability(series, { annualHistory, observations, monthlyHistory, hf, md, regionalHistory, regionalStored });

  // ===== Summary ===================================================================================================
  const byCat = (list) => Object.fromEntries(Object.keys(CATEGORIES).map((c) => [`${c}_${CATEGORIES[c]}`, list.reduce((n, s) => n + (s.missing.by_category[c] ?? 0), 0)]));
  const summary = {
    contracts: series.length,
    by_scope: Object.fromEntries([...new Set(series.map((s) => s.key.split("|")[0]))].sort().map((k) => [k, series.filter((s) => s.key.startsWith(`${k}|`)).length])),
    missing_periods_by_category: byCat(series),
    lost_in_processing: series.reduce((n, s) => n + (s.missing.by_category[2] ?? 0), 0),
    recovered_in_phase_r: {
      annual_history: annualManifest.recovery.summary.recovered_records, monthly_history: monthlyManifest.recovery.summary.recovered_records,
      regional_history: regionalManifest.recovery.summary.recovered_records, serbia_sors: ["annual", "monthly", "regional"].reduce((n, k) => n + serbia[k].records.filter((r) => r.recovery_phase === "R").length, 0),
    },
    transformation_series_not_separately_inventoried: transformationSeries,
    frozen_formal_frame: { file: "src/data/panel/panel_observations.json", note: "World Bank WDI panel used by frozen formal models; not extended (formal model input). Descriptive equivalents are inventoried above.", series: panelFrame.length },
  };
  summary.recovered_in_phase_r.total = Object.values(summary.recovered_in_phase_r).reduce((a, b) => a + b, 0);
  return {
    schema_version: "historical-recovery-inventory-v2.0", phase: "v2.0 Phase R — official historical recovery and comparability (2026-11-10)",
    descriptive_only: true, categories: CATEGORIES,
    policy: {
      scope: "Every country × indicator × frequency contract found in the national, monthly, regional and Serbia stores; formal estimation frames are listed but not extended.",
      expected_periods: "From the earlier of the first admitted and first official period to the later of the last admitted and last official period, at the contract's own frequency; indicators are never assumed to start in the same year.",
      no_imputation: "Nothing is interpolated, estimated or zero-filled; missing periods are classified, not filled.",
      comparability: "Common periods are the intersection of actually admitted periods of series with the same definition, unit, frequency and territorial scope (regional: comparable_stable_code years only); never a min/max intersection.",
    },
    inputs: Object.fromEntries(["src/data/observations/observations.json", "src/data/historical/annual_descriptive_history.json", "src/data/historical/monthly_descriptive_history.json", "src/data/historical/regional_descriptive_history.json", "src/data/high-frequency/high_frequency_observations.json", "src/data/macro-drivers/macro_driver_observations.json", "src/data/regional/v086-observations.json", "src/data/regional/v089-observations.json", "src/data/serbia/serbia_descriptive_history_annual.json", "src/data/serbia/serbia_descriptive_history_monthly.json", "src/data/serbia/serbia_descriptive_history_regional.json"].map((f) => [f, sha(fs.readFileSync(path.join(root, f)))])),
    summary, comparability, series, frozen_formal_frame: panelFrame,
  };
}

function summarise(missing) {
  const by_category = {};
  for (const m of missing) by_category[m.category] = (by_category[m.category] ?? 0) + 1;
  // Group consecutive periods with the same category and reason.
  const groups = [];
  for (const m of missing) {
    const last = groups.at(-1);
    const [scopeA, pA] = m.period.includes(":") ? m.period.split(":") : [null, m.period];
    if (last && last.category === m.category && last.reason === m.reason && last.territory === scopeA && nextPeriod(last.to) === pA) last.to = pA;
    else groups.push({ ...(scopeA ? { territory: scopeA } : {}), from: pA, to: pA, category: m.category, reason: m.reason });
  }
  return { count: missing.length, by_category, periods: groups };
}

function buildComparability(series, data) {
  const rangesOf = (set) => runs([...set].map(String)).map(([a, b]) => (a === b ? a : `${a}–${b}`));
  // National annual: same indicator, unit and Eurostat table/selection; admitted years only.
  const annual = {};
  const annualAdmitted = new Map();
  for (const r of data.observations) if (r.value !== null) { const k = `${r.indicator}|${r.country_slug}`; (annualAdmitted.get(k) ?? annualAdmitted.set(k, new Set()).get(k)).add(r.year); }
  for (const r of data.annualHistory) { const k = `${r.indicator}|${r.country_slug}`; (annualAdmitted.get(k) ?? annualAdmitted.set(k, new Set()).get(k)).add(r.year); }
  const unitOf = new Map(series.filter((s) => s.frequency === "annual" && s.scope === "national").map((s) => [`${s.indicator}|${s.country}`, s.unit]));
  for (const indicator of [...new Set(series.filter((s) => s.key.startsWith("annual|")).map((s) => s.indicator))].sort()) {
    const countries = [...annualAdmitted.keys()].filter((k) => k.startsWith(`${indicator}|`)).map((k) => k.split("|")[1]).filter((c) => !(indicator === "hicp_inflation" && c === "serbia")).sort();
    const units = new Set(countries.map((c) => unitOf.get(`${indicator}|${c}`)));
    const sets = countries.map((c) => annualAdmitted.get(`${indicator}|${c}`));
    const common = sets.length ? new Set([...sets[0]].filter((y) => sets.every((s) => s.has(y)))) : new Set();
    const pairwise = {};
    for (let i = 0; i < countries.length; i += 1) for (let j = i + 1; j < countries.length; j += 1) { const c = new Set([...sets[i]].filter((y) => sets[j].has(y))); pairwise[`${countries[i]}|${countries[j]}`] = { periods: c.size, ranges: rangesOf(c) }; }
    annual[indicator] = { frequency: "annual", unit: units.size === 1 ? [...units][0] : [...units], definition_check: units.size === 1 ? "same table, selection and unit" : "units differ: not comparable", countries, all_country_common_periods: { count: common.size, ranges: rangesOf(common) }, pairwise };
  }
  // National monthly levels: same series and unit (FX units differ by currency, so FX is compared per country only).
  const monthly = {};
  for (const key of [...new Set(series.filter((s) => s.key.startsWith("monthly|")).map((s) => s.indicator))].sort()) {
    const list = series.filter((s) => s.key.startsWith("monthly|") && s.indicator === key && s.scope === "national");
    if (!list.length) continue;
    const units = new Set(list.map((s) => s.unit).filter(Boolean));
    const periodsOf = (s) => { const out = new Set(); for (const r of data.monthlyHistory.records) if (r.series === key && r.country_slug === s.country) out.add(r.period); for (const r of data.hf) if ((r.transformation === "level" ? r.indicator : r.transformation === "yoy_rate" ? "hicp_annual_rate" : null) === key && r.country === s.country && r.value !== null) out.add(r.period); for (const r of data.md) if (r.driver_id === key && (r.country ?? r.scope) === s.country && ["level", "yoy_rate"].includes(r.transformation) && r.value !== null) out.add(r.period); return out; };
    const sets = list.map(periodsOf);
    const comparable = key !== "bilateral_fx_local_per_eur" && units.size <= 1;
    const common = comparable && sets.length ? new Set([...sets[0]].filter((p) => sets.every((s) => s.has(p)))) : new Set();
    const pairwise = {};
    if (comparable) for (let i = 0; i < list.length; i += 1) for (let j = i + 1; j < list.length; j += 1) { const c = new Set([...sets[i]].filter((p) => sets[j].has(p))); pairwise[`${list[i].country}|${list[j].country}`] = { periods: c.size, ranges: rangesOf(c) }; }
    monthly[key] = { frequency: "monthly", unit: units.size === 1 ? [...units][0] : [...units].sort(), countries: list.map((s) => s.country), pairwise: comparable ? pairwise : null, definition_check: key === "bilateral_fx_local_per_eur" ? "different currencies: levels are not comparable across countries" : key === "policy_rate" ? "official policy rates; instruments differ by central bank (see floors.instrument_notes)" : units.size <= 1 ? "same table, selection and unit" : "units differ", all_country_common_periods: comparable ? { count: common.size, ranges: rangesOf(common) } : null };
  }
  // Regional: per indicator and country, years in which every admitted region has a comparable value
  // (comparable_stable_code history years or the stored v0.86/v0.89 snapshot years).
  const regional = {};
  const byPair = new Map();
  for (const r of data.regionalHistory) if (r.comparability_status === "comparable_stable_code") { const k = `${r.indicator}|${r.region_id}`; (byPair.get(k) ?? byPair.set(k, new Set()).get(k)).add(r.statistical_year); }
  for (const r of data.regionalStored) if (r.value !== null && r.value !== undefined) { const k = `${r.region_indicator_id}|${r.region_id}`; (byPair.get(k) ?? byPair.set(k, new Set()).get(k)).add(Number(r.year)); }
  for (const indicator of [...new Set([...byPair.keys()].map((k) => k.split("|")[0]))].sort()) {
    const perCountry = {};
    for (const country of [...new Set([...byPair.keys()].filter((k) => k.startsWith(`${indicator}|`)).map((k) => k.split("|")[1].split("_")[0]))].sort()) {
      const regions = [...byPair.keys()].filter((k) => k.startsWith(`${indicator}|${country}_`));
      const sets = regions.map((k) => byPair.get(k));
      const common = new Set([...sets[0]].filter((y) => sets.every((s) => s.has(y))));
      perCountry[country] = { regions: regions.length, common_comparable_years: { count: common.size, ranges: rangesOf(common) } };
    }
    regional[indicator] = { rule: "comparable_stable_code years and stored snapshot years only; backcasts and pre-break years excluded; NUTS levels differ between countries, so cross-country region comparisons need matching levels", by_country: perCountry };
  }
  return { national_annual: annual, national_monthly: monthly, regional };
}

export function writeInventory(inventory) {
  const { series, frozen_formal_frame, ...head } = inventory;
  const header = JSON.stringify(head, null, 1).replace(/\n}$/, "");
  fs.writeFileSync(path.join(root, INVENTORY_PATH), `${header},\n "series": [\n${series.map((s) => `  ${JSON.stringify(s)}`).join(",\n")}\n ],\n "frozen_formal_frame": [\n${frozen_formal_frame.map((s) => `  ${JSON.stringify(s)}`).join(",\n")}\n ]\n}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const inventory = buildInventory();
  writeInventory(inventory);
  console.log(JSON.stringify(inventory.summary, null, 1));
}
