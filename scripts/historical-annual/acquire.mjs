// Phase G: annual DESCRIPTIVE history (2000–latest, or the earliest definition-compatible official year).
// Writes a separate store, src/data/historical/annual_descriptive_history.json, that no model, scenario or
// composite index reads. observations.json is never modified. Only "safe" series are ingested:
//   - official Eurostat table with the same dataset/definition as the current annual record (or an ESA 2010
//     national-accounts table for new indicators);
//   - values start at the definition-compatible floor: after the last Eurostat break ('b') or
//     definition-differs ('d') flag, and not before 2000;
//   - for existing indicators the overlap years must agree with the stored observations (revision tolerance);
//   - backfill only: years already present in observations.json are not duplicated.
// Series in methodological-review classes are retrieved for evidence only and listed in the review queue.
// Usage: node scripts/historical-annual/acquire.mjs            (fetch + write)
//        node scripts/historical-annual/acquire.mjs --offline  (rebuild from archived raw files)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(root, "src/data/historical");
const rawDir = path.join(outDir, "raw/annual");
// --recover: rebuild Phase G from its archived extracts and fetch only the Phase R full-history extracts.
let offline = process.argv.includes("--offline") || process.argv.includes("--recover");
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export const HISTORY_PATH = "src/data/historical/annual_descriptive_history.json";
export const MANIFEST_PATH = "src/data/historical/annual_history_manifest.json";
const FLOOR_YEAR = 2000;
const API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

// Serbia is excluded from safe backfill (outside the EU statistical system; partial Eurostat back-series).
const GEOS = { AT: ["AUT", "austria"], DE: ["DEU", "germany"], SK: ["SVK", "slovakia"], SI: ["SVN", "slovenia"], CZ: ["CZE", "czechia"], HU: ["HUN", "hungary"], PL: ["POL", "poland"], RO: ["ROU", "romania"], HR: ["HRV", "croatia"] };

// Tables: one Eurostat query per table; indicators select a single series from it.
const TABLES = {
  nama_10_gdp: { params: { unit: ["CP_MEUR", "CLV_PCH_PRE"], na_item: ["B1GQ", "P6", "P7"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/nama10_esms.htm" },
  nama_10_pc: { params: { unit: ["CP_EUR_HAB", "CP_PPS_EU27_2020_HAB"], na_item: ["B1GQ"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/nama10_esms.htm" },
  nama_10_a10: { params: { unit: ["PC_GDP"], na_item: ["B1G"], nace_r2: ["C"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/nama10_esms.htm" },
  nama_10_lp_ulc: { params: { unit: ["PCH_PRE", "EUR"], na_item: ["RLPR_PER", "D1_SAL_PER"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/nama10_esms.htm" },
  prc_hicp_aind: { params: { unit: ["RCH_A_AVG"], coicop: ["CP00"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/prc_hicp_esms.htm" },
  demo_pjan: { params: { unit: ["NR"], sex: ["T"], age: ["TOTAL"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/demo_pop_esms.htm" },
  gov_10dd_edpt1: { params: { unit: ["PC_GDP"], sector: ["S13"], na_item: ["B9", "GD"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/gov_10dd_edpt1_esms.htm" },
  gov_10a_main: { params: { unit: ["PC_GDP"], sector: ["S13"], na_item: ["TR", "TE"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/gov_10a_main_esms.htm" },
};

// Safe indicators. `existing` = indicator id in observations.json (overlap check + backfill-only years).
export const SAFE = [
  { id: "gdp_current_eur", existing: true, table: "nama_10_gdp", select: { unit: "CP_MEUR", na_item: "B1GQ" }, unit: "百万欧元", definition: "GDP at market prices, current prices, million EUR (ESA 2010)" },
  { id: "real_gdp_growth", existing: true, table: "nama_10_gdp", select: { unit: "CLV_PCH_PRE", na_item: "B1GQ" }, unit: "%", definition: "Real GDP, chain-linked volumes, % change on previous year (ESA 2010)" },
  { id: "gdp_per_capita_eur", existing: true, table: "nama_10_pc", select: { unit: "CP_EUR_HAB", na_item: "B1GQ" }, unit: "欧元", definition: "GDP per capita, current prices, EUR (ESA 2010)" },
  { id: "gdp_per_capita_pps", existing: false, table: "nama_10_pc", select: { unit: "CP_PPS_EU27_2020_HAB", na_item: "B1GQ" }, unit: "PPS（EU27_2020）", definition: "GDP per capita, current prices, purchasing power standards (EU27 from 2020) (ESA 2010)" },
  { id: "hicp_inflation", existing: true, table: "prc_hicp_aind", select: { unit: "RCH_A_AVG", coicop: "CP00" }, unit: "%", definition: "HICP all-items, annual average rate of change (ECOICOP-1 legacy table, same as current records)" },
  { id: "population", existing: true, table: "demo_pjan", select: { unit: "NR", sex: "T", age: "TOTAL" }, unit: "人", definition: "Population on 1 January, total" },
  { id: "fiscal_balance_gdp", existing: true, table: "gov_10dd_edpt1", select: { unit: "PC_GDP", sector: "S13", na_item: "B9" }, unit: "% GDP", definition: "General government net lending (+) / borrowing (−), % of GDP (EDP)" },
  { id: "government_debt_gdp", existing: true, table: "gov_10dd_edpt1", select: { unit: "PC_GDP", sector: "S13", na_item: "GD" }, unit: "% GDP", definition: "General government gross debt, % of GDP (EDP)" },
  { id: "government_revenue_gdp", existing: true, table: "gov_10a_main", select: { unit: "PC_GDP", sector: "S13", na_item: "TR" }, unit: "% GDP", definition: "General government total revenue, % of GDP (ESA 2010)" },
  { id: "government_expenditure_gdp", existing: true, table: "gov_10a_main", select: { unit: "PC_GDP", sector: "S13", na_item: "TE" }, unit: "% GDP", definition: "General government total expenditure, % of GDP (ESA 2010)" },
  { id: "exports_goods_services", existing: true, table: "nama_10_gdp", select: { unit: "CP_MEUR", na_item: "P6" }, unit: "百万欧元", definition: "Exports of goods and services, current prices, million EUR (ESA 2010)" },
  { id: "imports_goods_services", existing: true, table: "nama_10_gdp", select: { unit: "CP_MEUR", na_item: "P7" }, unit: "百万欧元", definition: "Imports of goods and services, current prices, million EUR (ESA 2010)" },
  { id: "manufacturing_share_gdp", existing: true, table: "nama_10_a10", select: { unit: "PC_GDP", na_item: "B1G", nace_r2: "C" }, unit: "%", definition: "Manufacturing (NACE C) gross value added, % of GDP (ESA 2010)" },
  { id: "labour_productivity_growth", existing: false, table: "nama_10_lp_ulc", select: { unit: "PCH_PRE", na_item: "RLPR_PER" }, unit: "%", definition: "Real labour productivity per person, % change on previous year (ESA 2010)" },
  { id: "compensation_per_employee_eur", existing: false, table: "nama_10_lp_ulc", select: { unit: "EUR", na_item: "D1_SAL_PER" }, unit: "欧元", definition: "Nominal compensation per employee, EUR (ESA 2010); nominal, not deflated" },
];
// Derived from the same table and year as their components; never ingested independently.
export const DERIVED = [
  { id: "trade_balance", existing: true, formula: "exports_goods_services - imports_goods_services", unit: "百万欧元", inputs: ["exports_goods_services", "imports_goods_services"], compute: (e, i) => e - i, definition: "Exports minus imports of goods and services, current prices, million EUR" },
  { id: "trade_openness", existing: false, formula: "(exports_goods_services + imports_goods_services) / gdp_current_eur * 100", unit: "% GDP", inputs: ["exports_goods_services", "imports_goods_services", "gdp_current_eur"], compute: (e, i, g) => ((e + i) / g) * 100, definition: "Exports plus imports of goods and services, % of GDP" },
];
// Phase G indicators that need methodological review before any ingestion (not fetched as values here).
export const REVIEW_QUEUE = [
  { id: "unemployment_rate", reason: "LFS series breaks 2004–2011; monthly une_rt_m audit found unexplained 'd' flags (PL, SK)", candidate: "Eurostat une_rt_a" },
  { id: "employment_rate", reason: "LFS series breaks (2021 IESS regulation, earlier national breaks); same review as unemployment", candidate: "Eurostat lfsi_emp_a" },
  { id: "current_account_gdp", reason: "BPM5 → BPM6 transition; tipsbp20 depth varies by country", candidate: "Eurostat tipsbp20 / bop_gdp6_q" },
  { id: "fdi_inflow", reason: "BPM5/BMD3 → BPM6/BMD4 break before 2013; directional vs asset/liability principle", candidate: "Eurostat bop_fdi6_flow" },
  { id: "fdi_outflow", reason: "same break as FDI inflows", candidate: "Eurostat bop_fdi6_flow (ASS)" },
  { id: "energy_import_dependency", reason: "energy balance methodology revision (2019)", candidate: "Eurostat nrg_ind_id" },
  { id: "energy_inflation", reason: "energy aggregate definition vs ECOICOP-2 migration", candidate: "Eurostat prc_hicp_aind (NRG)" },
  { id: "household_electricity_price", reason: "consumption-band and tax-level redefinition 2017", candidate: "Eurostat nrg_pc_204" },
  { id: "industrial_electricity_price", reason: "consumption-band redefinition 2017", candidate: "Eurostat nrg_pc_205" },
  { id: "automotive_export_share", reason: "calculated share; product/NACE classification revisions", candidate: "Eurostat ext_tec09" },
  { id: "germany_export_dependence", reason: "calculated share; single consistent reporter basis needed", candidate: "UN Comtrade / Eurostat Comext" },
  { id: "rd_expenditure_gdp", reason: "Frascati Manual revisions and national survey breaks flagged in rd_e_gerdtot", candidate: "Eurostat rd_e_gerdtot" },
  { id: "real_wage_indicators", reason: "deflator choice and comparability not yet specified", candidate: "Eurostat nama_10_lp_ulc / earn_nt_net" },
  { id: "serbia_all_indicators", reason: "Serbia outside the EU statistical system; Eurostat back-series partial, national sources need definition mapping", candidate: "RZS / NBS" },
];

const OVERLAP_TOLERANCE = { relative: 0.02, absolute: 0.3 }; // vintage revisions only; larger gaps = definition mismatch

// --- Phase R (2026-11-10): official historical recovery ---------------------------------------------------------
// The Phase G records above are rebuilt unchanged from their archived 1999+ extracts. Phase R adds, from separately
// archived full-history extracts of the SAME tables and selections:
//   (a) years before the earliest admitted year (Phase G history or observations.json) for every series Phase G
//       ingested, and for Serbia, which Phase G excluded;
//   (b) the review-queue indicators whose current records come from one Eurostat table and selection, once the same
//       floor and overlap rules clear them (LFS unemployment, current account, FDI, energy dependency, energy HICP,
//       electricity prices, automotive export share).
// Floor = max(first official value, territorial floor, year of the last 'b' flag, year after the last 'd' flag) over
// the whole official series. Overlap: every year present in both the extract and the admitted records must agree
// within OVERLAP_TOLERANCE, and at least one such year is required. Phase G series that were held stay held.
const SPLICE_YEARS = 5;
// Official values for years before independence refer to the present-day territory as Eurostat publishes it.
export const TERRITORIAL_NOTES = {
  CZ: { before: 1993, note: "Before 1993 (Czechoslovakia), Eurostat values refer to the present-day territory of Czechia." },
  SK: { before: 1993, note: "Before 1993 (Czechoslovakia), Eurostat values refer to the present-day territory of Slovakia." },
  SI: { before: 1991, note: "Before 1991 (SFR Yugoslavia), Eurostat values refer to the present-day territory of Slovenia." },
  HR: { before: 1991, note: "Before 1991 (SFR Yugoslavia), Eurostat values refer to the present-day territory of Croatia." },
};
export const RECOVERY_GEOS = { ...GEOS, RS: ["SRB", "serbia"] };
export const TERRITORIAL_FLOORS = {
  DE: { year: 1991, note: "German unification (3 October 1990): the extract does not establish that earlier values cover the unified territory, so recovery starts in 1991." },
  RS: { year: 1999, note: "Serbian national totals exclude AP Kosovo and Metohija from 1998 (unflagged coverage change recorded in the Atlas SORS indicator mapping); recovery starts in 1999." },
};
const FULL_TABLES = {
  nama_10_gdp: { params: TABLES.nama_10_gdp.params, metadata: TABLES.nama_10_gdp.metadata },
  nama_10_pc: { params: TABLES.nama_10_pc.params, metadata: TABLES.nama_10_pc.metadata },
  nama_10_a10: { params: TABLES.nama_10_a10.params, metadata: TABLES.nama_10_a10.metadata },
  nama_10_lp_ulc: { params: TABLES.nama_10_lp_ulc.params, metadata: TABLES.nama_10_lp_ulc.metadata },
  prc_hicp_aind: { params: { unit: ["RCH_A_AVG"], coicop: ["CP00", "CP045"] }, metadata: TABLES.prc_hicp_aind.metadata },
  demo_pjan: { params: TABLES.demo_pjan.params, metadata: TABLES.demo_pjan.metadata },
  gov_10dd_edpt1: { params: TABLES.gov_10dd_edpt1.params, metadata: TABLES.gov_10dd_edpt1.metadata },
  gov_10a_main: { params: TABLES.gov_10a_main.params, metadata: TABLES.gov_10a_main.metadata },
  une_rt_a: { params: { unit: ["PC_ACT"], sex: ["T"], age: ["Y15-74"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/une_esms.htm" },
  tipsbp20: { params: { unit: ["PC_GDP"], partner: ["WRL_REST"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/tipsbp20_esmsip2.htm" },
  bop_fdi6_flow: { params: { currency: ["MIO_EUR"], nace_r2: ["FDI"], stk_flow: ["LIAB"], entity: ["TOTAL"], fdi_item: ["DI__D__F"], partner: ["WRL_REST"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/bop_fdi6_esms.htm" },
  nrg_ind_id: { params: { unit: ["PC"], siec: ["TOTAL"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/nrg_ind_esms.htm" },
  ext_tec09: { params: { unit: ["THS_EUR"], stk_flow: ["EXP"], partner: ["WORLD"], nace_r2: ["C29", "TOTAL"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/ext_tec_esms.htm" },
  nrg_pc_204: { params: { currency: ["EUR"], nrg_cons: ["KWH2500-4999"], unit: ["KWH"], tax: ["I_TAX"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/nrg_pc_204_esmsip2.htm" },
  nrg_pc_205: { params: { currency: ["EUR"], nrg_cons: ["MWH500-1999"], unit: ["KWH"], tax: ["I_TAX"] }, metadata: "https://ec.europa.eu/eurostat/cache/metadata/en/nrg_pc_205_esmsip2.htm" },
};
// Review-queue indicators cleared by the Phase R rules. kind: direct (one cell), semester_mean (S1 and S2 both
// required, as in the current records), ratio (numerator / denominator × 100 from the same table and year).
export const RECOVERED_INDICATORS = [
  { id: "unemployment_rate", table: "une_rt_a", select: { unit: "PC_ACT", sex: "T", age: "Y15-74" }, unit: "%", definition: "LFS unemployment rate, 15–74, % of the labour force (Eurostat une_rt_a; break-corrected back data from 2009)" },
  { id: "current_account_gdp", table: "tipsbp20", select: { unit: "PC_GDP", partner: "WRL_REST" }, unit: "% GDP", definition: "Current account balance, % of GDP (BPM6, Eurostat MIP scoreboard table tipsbp20)" },
  { id: "fdi_inflow", table: "bop_fdi6_flow", select: { currency: "MIO_EUR", nace_r2: "FDI", stk_flow: "LIAB", entity: "TOTAL", fdi_item: "DI__D__F", partner: "WRL_REST" }, unit: "百万欧元", definition: "Direct investment liabilities, net incurrence, million EUR (BPM6/BMD4, Eurostat bop_fdi6_flow)" },
  { id: "energy_import_dependency", table: "nrg_ind_id", select: { unit: "PC", siec: "TOTAL" }, unit: "%", definition: "Energy import dependency, all products, % (Eurostat nrg_ind_id, current energy-balance methodology for the whole series)" },
  { id: "energy_inflation", table: "prc_hicp_aind", select: { unit: "RCH_A_AVG", coicop: "CP045" }, unit: "%", definition: "HICP CP045 electricity, gas and other fuels, annual average rate of change (Eurostat prc_hicp_aind)" },
  { id: "household_electricity_price", table: "nrg_pc_204", kind: "semester_mean", select: { currency: "EUR", nrg_cons: "KWH2500-4999", unit: "KWH", tax: "I_TAX" }, unit: "欧元/kWh", definition: "Household electricity price, band DC (2,500–4,999 kWh), all taxes, EUR/kWh; annual value = mean of the two official semesters", formula: "(semester_1 + semester_2) / 2" },
  { id: "industrial_electricity_price", table: "nrg_pc_205", kind: "semester_mean", select: { currency: "EUR", nrg_cons: "MWH500-1999", unit: "KWH", tax: "I_TAX" }, unit: "欧元/kWh", definition: "Non-household electricity price, band ID (500–1,999 MWh), all taxes, EUR/kWh; annual value = mean of the two official semesters", formula: "(semester_1 + semester_2) / 2" },
  { id: "automotive_export_share", table: "ext_tec09", kind: "ratio", select: { unit: "THS_EUR", stk_flow: "EXP", partner: "WORLD" }, numerator: { nace_r2: "C29" }, denominator: { nace_r2: "TOTAL" }, unit: "%", definition: "Exports by enterprises in NACE C29 (motor vehicles) / exports of all NACE activities × 100 (Eurostat ext_tec09)", formula: "NACE_C29_exports / total_NACE_exports * 100" },
];
const RECOVERED_IDS = new Set(RECOVERED_INDICATORS.map((s) => s.id));
// Review-queue entries that remain held after Phase R, with the reason (the cleared ones are listed in the manifest).
export const REVIEW_QUEUE_AFTER_RECOVERY = REVIEW_QUEUE.filter((q) => !RECOVERED_IDS.has(q.id));

function fullQuery(table) {
  const q = new URLSearchParams({ format: "JSON", lang: "en" });
  for (const [dim, values] of Object.entries(FULL_TABLES[table].params)) for (const v of values) q.append(dim, v);
  for (const g of Object.keys(RECOVERY_GEOS)) q.append("geo", g);
  return `${API}/${table}?${q}`;
}

function query(table) {
  const q = new URLSearchParams({ format: "JSON", lang: "en", sinceTimePeriod: String(FLOOR_YEAR - 1) });
  for (const [dim, values] of Object.entries(TABLES[table].params)) for (const v of values) q.append(dim, v);
  for (const g of Object.keys(GEOS)) q.append("geo", g);
  return `${API}/${table}?${q}`;
}

async function acquire(table) {
  const file = path.join(rawDir, `${table}.json`);
  let bytes, retrievedAt, httpStatus = null;
  if (offline) { bytes = fs.readFileSync(file); retrievedAt = null; }
  else {
    const response = await fetch(query(table), { signal: AbortSignal.timeout(90000) });
    bytes = Buffer.from(await response.arrayBuffer());
    httpStatus = response.status;
    if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
    fs.writeFileSync(file, bytes);
    retrievedAt = new Date().toISOString();
  }
  const json = JSON.parse(bytes.toString("utf8"));
  if (json.error || !json.id?.includes("geo") || !json.id?.includes("time")) throw new Error(`${table}: invalid JSON-stat`);
  const ordered = Object.fromEntries(json.id.map((id) => [id, Object.entries(json.dimension[id].category.index).sort((a, b) => a[1] - b[1]).map(([k]) => k)]));
  const stride = json.size.map((_, i) => json.size.slice(i + 1).reduce((a, b) => a * b, 1));
  const cell = (coords) => { const index = json.id.reduce((n, id, i) => n + ordered[id].indexOf(coords[id]) * stride[i], 0); return { value: json.value?.[index] ?? null, flag: json.status?.[index] ?? null }; };
  return { table, json, ordered, cell, entry: { table, url: query(table), http_status: httpStatus, retrieved_at: retrievedAt, dataset_updated_at: json.updated ?? null, raw_file: path.relative(root, file), sha256: sha(bytes), metadata_url: TABLES[table].metadata, time_axis: [ordered.time[0], ordered.time.at(-1)] } };
}

let recoveryOffline = process.argv.includes("--offline");
async function acquireFull(table) {
  const dir = path.join(rawDir, "full");
  const file = path.join(dir, `${table}.json`);
  let bytes, retrievedAt = null, httpStatus = null;
  if (recoveryOffline) bytes = fs.readFileSync(file);
  else {
    fs.mkdirSync(dir, { recursive: true });
    const response = await fetch(fullQuery(table), { signal: AbortSignal.timeout(180000) });
    bytes = Buffer.from(await response.arrayBuffer());
    httpStatus = response.status;
    if (!response.ok) throw new Error(`${table} (full history): HTTP ${response.status}`);
    fs.writeFileSync(file, bytes);
    retrievedAt = new Date().toISOString();
    await new Promise((resolve) => setTimeout(resolve, 1500)); // modest request rate
  }
  const json = JSON.parse(bytes.toString("utf8"));
  if (json.error || !json.id?.includes("geo") || !json.id?.includes("time")) throw new Error(`${table} (full history): invalid JSON-stat`);
  const ordered = Object.fromEntries(json.id.map((id) => [id, Object.entries(json.dimension[id].category.index).sort((a, b) => a[1] - b[1]).map(([k]) => k)]));
  const stride = json.size.map((_, i) => json.size.slice(i + 1).reduce((a, b) => a * b, 1));
  const cell = (coords) => { const pos = json.id.map((id) => ordered[id].indexOf(coords[id] ?? (ordered[id].length === 1 ? ordered[id][0] : undefined))); if (pos.some((p) => p < 0)) return { value: null, flag: null }; const index = pos.reduce((n, p, i) => n + p * stride[i], 0); return { value: json.value?.[index] ?? null, flag: json.status?.[index] ?? null }; };
  return { table, json, ordered, cell, entry: { table, url: fullQuery(table), http_status: httpStatus, retrieved_at: retrievedAt, dataset_updated_at: json.updated ?? null, raw_file: path.relative(root, file), sha256: sha(bytes), metadata_url: FULL_TABLES[table].metadata, time_axis: [ordered.time[0], ordered.time.at(-1)], scope: "full official history, Phase R recovery only" } };
}

const flagText = (flag) => String(flag ?? "").trim();
const statusOf = (flag) => /p/.test(flag) ? "provisional" : /e/.test(flag) ? "estimated" : /u/.test(flag) ? "low_reliability" : "official";

export async function build(options = {}) {
  if (options.offline !== undefined) { offline = options.offline; recoveryOffline = options.offline; }
  if (options.recoveryOffline !== undefined) recoveryOffline = options.recoveryOffline;
  fs.mkdirSync(rawDir, { recursive: true });
  const tables = {};
  for (const table of Object.keys(TABLES)) tables[table] = await acquire(table);
  const existing = read("src/data/observations/observations.json").records;
  const existingFor = (indicator, slug) => existing.filter((r) => r.indicator === indicator && r.country_slug === slug);
  const records = [], series = [];
  const values = {}; // `${indicator}|${geo}|${year}` -> value (for derived)
  for (const spec of SAFE) {
    const t = tables[spec.table];
    const current = Object.fromEntries(Object.entries(TABLES[spec.table].params).map(([dim]) => [dim, spec.select[dim]]));
    for (const [code, [iso3, slug]] of Object.entries(GEOS)) {
      const rows = t.ordered.time.map((time) => ({ year: Number(time), ...t.cell({ ...current, freq: "A", geo: code, time }) })).filter((r) => r.value !== null);
      const breaks = rows.filter((r) => /[bd]/.test(flagText(r.flag)));
      const lastBreak = breaks.length ? Math.max(...breaks.map((r) => (/b/.test(flagText(r.flag)) ? r.year : r.year + 1))) : null;
      const floor = Math.max(FLOOR_YEAR, lastBreak ?? FLOOR_YEAR, rows[0]?.year ?? FLOOR_YEAR);
      const stored = spec.existing ? existingFor(spec.id, slug) : [];
      const storedYears = new Set(stored.map((r) => r.year));
      const firstStored = stored.length ? Math.min(...stored.map((r) => r.year)) : null;
      // Overlap: official stored values vs this retrieval, same definition expected.
      const overlap = stored.filter((r) => r.value !== null).map((r) => ({ year: r.year, stored: r.value, retrieved: rows.find((x) => x.year === r.year)?.value ?? null })).filter((o) => o.retrieved !== null);
      const worst = overlap.reduce((m, o) => Math.max(m, Math.abs(o.stored - o.retrieved) - Math.max(OVERLAP_TOLERANCE.absolute, OVERLAP_TOLERANCE.relative * Math.abs(o.stored))), -Infinity);
      const overlapOk = !spec.existing || overlap.length === 0 || worst <= 0;
      const eligible = rows.filter((r) => r.year >= floor && !storedYears.has(r.year) && (firstStored === null || r.year < firstStored));
      for (const r of rows) values[`${spec.id}|${code}|${r.year}`] = r.year >= floor ? r.value : undefined;
      const ingest = overlapOk ? eligible : [];
      for (const r of ingest) records.push({
        id: `hist:annual:${slug}:${spec.id}:${r.year}`, country: iso3, country_slug: slug, indicator: spec.id, year: r.year, value: r.value, unit: spec.unit,
        value_status: statusOf(flagText(r.flag)), source_flag: flagText(r.flag) || null, source: "eurostat", source_dataset: `Eurostat ${spec.table}`,
        source_query_url: t.entry.url, source_reliability: "A", definition: spec.definition, updated_at: t.entry.dataset_updated_at, comparability_status: "definition_compatible_from_floor",
        provenance: { raw_file: t.entry.raw_file, selection: { ...spec.select, geo: code, time: String(r.year) } }, descriptive_only: true,
      });
      series.push({ indicator: spec.id, country: slug, kind: "official", table: spec.table, earliest_available: rows[0]?.year ?? null, break_flags: breaks.map((r) => `${r.year}:${flagText(r.flag)}`), definition_compatible_floor: rows.length ? floor : null, current_first_year: firstStored, overlap_years: overlap.length, overlap_max_excess: overlap.length ? worst : null, overlap_check: spec.existing ? (overlap.length ? (overlapOk ? "pass" : "fail_definition_or_vintage_mismatch") : "no_overlap") : "not_applicable_new_indicator", ingested_years: ingest.length ? [ingest[0].year, ingest.at(-1).year] : null, ingested_count: ingest.length, status: !rows.length ? "no_official_data" : overlapOk ? "ingested" : "held_for_review" });
    }
  }
  for (const d of DERIVED) {
    for (const [code, [iso3, slug]] of Object.entries(GEOS)) {
      const stored = d.existing ? existingFor(d.id, slug) : [];
      const firstStored = stored.length ? Math.min(...stored.map((r) => r.year)) : null;
      const inputSeries = d.inputs.map((i) => series.find((s) => s.indicator === i && s.country === slug));
      const ok = inputSeries.every((s) => s?.status === "ingested");
      const years = ok ? [...new Set(Object.keys(values).filter((k) => k.startsWith(`${d.inputs[0]}|${code}|`)).map((k) => Number(k.split("|")[2])))].sort() : [];
      const out = [];
      for (const year of years) {
        if (firstStored !== null && year >= firstStored) continue;
        const inputs = d.inputs.map((i) => values[`${i}|${code}|${year}`]);
        if (inputs.some((v) => v === undefined || v === null)) continue; // missing input stays missing; never zero
        const inputRecords = d.inputs.map((i) => records.find((r) => r.id === `hist:annual:${slug}:${i}:${year}`));
        out.push({
          id: `hist:annual:${slug}:${d.id}:${year}`, country: iso3, country_slug: slug, indicator: d.id, year, value: Number(d.compute(...inputs).toFixed(6)), unit: d.unit,
          value_status: "calculated", source_flag: null, source: "eurostat", source_dataset: "Eurostat nama_10_gdp", source_query_url: tables.nama_10_gdp.entry.url, source_reliability: "A", definition: d.definition,
          calculation_formula: d.formula, updated_at: tables.nama_10_gdp.entry.dataset_updated_at, comparability_status: "definition_compatible_from_floor",
          provenance: { raw_file: tables.nama_10_gdp.entry.raw_file, inputs: d.inputs.map((i, n) => inputRecords[n]?.id ?? `eurostat_raw:${SAFE.find((x) => x.id === i).table}:${i}:${code}:${year}`) }, descriptive_only: true,
        });
      }
      records.push(...out);
      series.push({ indicator: d.id, country: slug, kind: "derived", formula: d.formula, current_first_year: firstStored, ingested_years: out.length ? [out[0].year, out.at(-1).year] : null, ingested_count: out.length, status: ok ? "ingested" : "held_inputs_not_ingested" });
    }
  }
  // --- Phase R recovery (records above are unchanged) ----------------------------------------------------------
  const full = {};
  for (const table of Object.keys(FULL_TABLES)) full[table] = await acquireFull(table);
  const recoverySeries = [];
  const combine = (...flags) => [...new Set(flags.map(flagText).join("").split(""))].sort().join("");
  const annualRows = (spec, code) => {
    const t = full[spec.table];
    const base = { ...spec.select, geo: code };
    if (spec.kind === "semester_mean") {
      const years = [...new Set(t.ordered.time.map((p) => Number(p.slice(0, 4))))];
      return years.map((year) => { const s1 = t.cell({ ...base, freq: "S", time: `${year}-S1` }), s2 = t.cell({ ...base, freq: "S", time: `${year}-S2` }); return s1.value !== null && s2.value !== null ? { year, value: Number(((s1.value + s2.value) / 2).toFixed(6)), flag: combine(s1.flag, s2.flag), inputs: [s1.value, s2.value] } : null; }).filter(Boolean);
    }
    if (spec.kind === "ratio") {
      return t.ordered.time.map((time) => { const n = t.cell({ ...base, ...spec.numerator, freq: "A", time }), d = t.cell({ ...base, ...spec.denominator, freq: "A", time }); return n.value !== null && d.value ? { year: Number(time), value: Number(((n.value / d.value) * 100).toFixed(6)), flag: combine(n.flag, d.flag), inputs: [n.value, d.value] } : null; }).filter(Boolean);
    }
    return t.ordered.time.map((time) => ({ year: Number(time), ...t.cell({ ...base, freq: "A", time }) })).filter((r) => r.value !== null).map((r) => ({ ...r, flag: flagText(r.flag) }));
  };
  const recoverSeries = (spec, code, iso3, slug, phaseG) => {
    const rows = annualRows(spec, code);
    const canonical = existingFor(spec.id, slug);
    const admitted = new Map(canonical.filter((r) => r.value !== null).map((r) => [r.year, r.value]));
    for (const r of records) if (r.indicator === spec.id && r.country_slug === slug) admitted.set(r.year, r.value);
    const firstAdmitted = Math.min(...canonical.map((r) => r.year), ...records.filter((r) => r.indicator === spec.id && r.country_slug === slug).map((r) => r.year));
    const breaks = rows.filter((r) => /[bd]/.test(r.flag));
    const lastBreak = breaks.length ? Math.max(...breaks.map((r) => (/b/.test(r.flag) ? r.year : r.year + 1))) : null;
    const territorial = TERRITORIAL_FLOORS[code]?.year ?? null;
    const floor = rows.length ? Math.max(rows[0].year, territorial ?? rows[0].year, lastBreak ?? rows[0].year) : null;
    // Splice check: the recovered years join the earliest admitted years, so those years (SPLICE_YEARS of them) must
    // agree with the full extract. Later admitted years may carry newer revisions; their excess is reported only.
    const excessOf = (list) => list.reduce((m, o) => Math.max(m, Math.abs(o.stored - o.retrieved) - Math.max(OVERLAP_TOLERANCE.absolute, OVERLAP_TOLERANCE.relative * Math.abs(o.stored))), -Infinity);
    const allOverlap = rows.filter((r) => admitted.has(r.year)).map((r) => ({ year: r.year, stored: admitted.get(r.year), retrieved: r.value }));
    const spliceYears = [...admitted.keys()].sort((a, b) => a - b).slice(0, SPLICE_YEARS);
    const overlap = allOverlap.filter((o) => spliceYears.includes(o.year));
    const worst = excessOf(overlap), worstAll = excessOf(allOverlap);
    const overlapOk = overlap.length === 0 || worst <= 1e-9; // 1e-9 absorbs binary rounding at the tolerance boundary
    const held = phaseG && phaseG.status !== "ingested";
    const eligible = !held && floor !== null && overlapOk ? rows.filter((r) => r.year >= floor && r.year < firstAdmitted) : [];
    const t = full[spec.table];
    for (const r of eligible) records.push({
      id: `hist:annual:${slug}:${spec.id}:${r.year}`, country: iso3, country_slug: slug, indicator: spec.id, year: r.year, value: r.value, unit: spec.unit,
      value_status: spec.kind ? "calculated" : statusOf(r.flag), source_flag: r.flag || null, source: "eurostat", source_dataset: `Eurostat ${spec.table}`,
      source_query_url: t.entry.url, source_reliability: "A", definition: spec.definition, ...(spec.formula ? { calculation_formula: spec.formula } : {}), updated_at: t.entry.dataset_updated_at, comparability_status: "definition_compatible_from_floor",
      provenance: { raw_file: t.entry.raw_file, selection: spec.kind === "semester_mean" ? { ...spec.select, geo: code, time: [`${r.year}-S1`, `${r.year}-S2`] } : spec.kind === "ratio" ? { ...spec.select, geo: code, time: String(r.year), numerator: spec.numerator, denominator: spec.denominator } : { ...spec.select, geo: code, time: String(r.year) }, ...(r.inputs ? { input_values: r.inputs } : {}) },
      descriptive_only: true, recovery_phase: "R", ...(TERRITORIAL_NOTES[code] && r.year < TERRITORIAL_NOTES[code].before ? { territorial_note: TERRITORIAL_NOTES[code].note } : {}),
    });
    const status = !rows.length ? "no_official_data" : held ? `phase_g_${phaseG.status}` : !overlapOk ? "held_overlap_mismatch" : eligible.length ? "recovered" : floor >= firstAdmitted ? "no_compatible_years_before_first_admitted" : "nothing_to_recover";
    recoverySeries.push({ indicator: spec.id, country: slug, table: spec.table, kind: spec.kind ?? "direct", official_first: rows[0]?.year ?? null, official_last: rows.at(-1)?.year ?? null, break_flags: breaks.map((r) => `${r.year}:${r.flag}`), territorial_floor: territorial, definition_compatible_floor: floor, first_admitted_before_recovery: Number.isFinite(firstAdmitted) ? firstAdmitted : null, splice_years: overlap.map((o) => o.year), overlap_years: overlap.length, overlap_max_excess: overlap.length ? Number(worst.toFixed(6)) : null, overlap_check: overlap.length ? (overlapOk ? "pass" : "fail_definition_or_vintage_mismatch") : "no_overlap_same_table_and_selection", all_admitted_overlap_years: allOverlap.length, all_admitted_overlap_max_excess: allOverlap.length ? Number(worstAll.toFixed(6)) : null, recovered_years: eligible.length ? [eligible[0].year, eligible.at(-1).year] : null, recovered_count: eligible.length, status });
  };
  for (const spec of SAFE) for (const [code, [iso3, slug]] of Object.entries(RECOVERY_GEOS)) recoverSeries(spec, code, iso3, slug, code === "RS" ? null : series.find((s) => s.indicator === spec.id && s.country === slug));
  for (const spec of RECOVERED_INDICATORS) for (const [code, [iso3, slug]] of Object.entries(RECOVERY_GEOS)) recoverSeries(spec, code, iso3, slug, null);
  // Derived series. Inputs must be official values from the same full extract and year, each inside its own
  // definition-compatible floor with a passing (or same-selection) splice check. For a derived indicator that has
  // current records (trade_balance), only years before the earliest admitted year are added; for a history-only
  // indicator (trade_openness) every year Phase G does not hold is added, as Phase G did from its own extract.
  for (const d of DERIVED) {
    for (const [code, [iso3, slug]] of Object.entries(RECOVERY_GEOS)) {
      const own = records.filter((r) => r.indicator === d.id && r.country_slug === slug);
      const ownYears = new Set(own.map((r) => r.year));
      const canonical = existingFor(d.id, slug);
      const firstAdmitted = Math.min(...canonical.map((r) => r.year), ...own.map((r) => r.year));
      const inputSpecs = d.inputs.map((i) => SAFE.find((s) => s.id === i));
      const inputStatus = inputSpecs.map((spec) => recoverySeries.find((x) => x.indicator === spec.id && x.country === slug));
      const usable = inputStatus.every((x) => x && x.definition_compatible_floor !== null && ["pass", "no_overlap_same_table_and_selection"].includes(x.overlap_check) && !/^phase_g_held/.test(x.status));
      const inputRows = inputSpecs.map((spec) => new Map(annualRows(spec, code).map((r) => [r.year, r])));
      const years = usable ? [...inputRows[0].keys()].sort((a, b) => a - b) : [];
      const out = [];
      for (const year of years) {
        if (ownYears.has(year)) continue;
        if (d.existing && year >= firstAdmitted) continue;
        if (canonical.some((r) => r.year === year)) continue;
        const rows = inputRows.map((m) => m.get(year));
        if (rows.some((r) => !r) || inputStatus.some((x) => year < x.definition_compatible_floor)) continue; // missing input stays missing; never zero
        out.push({
          id: `hist:annual:${slug}:${d.id}:${year}`, country: iso3, country_slug: slug, indicator: d.id, year, value: Number(d.compute(...rows.map((r) => r.value)).toFixed(6)), unit: d.unit,
          value_status: "calculated", source_flag: null, source: "eurostat", source_dataset: "Eurostat nama_10_gdp", source_query_url: full.nama_10_gdp.entry.url, source_reliability: "A", definition: d.definition,
          calculation_formula: d.formula, updated_at: full.nama_10_gdp.entry.dataset_updated_at, comparability_status: "definition_compatible_from_floor",
          provenance: { raw_file: full.nama_10_gdp.entry.raw_file, inputs: d.inputs.map((i) => `eurostat_raw:${SAFE.find((x) => x.id === i).table}:${i}:${code}:${year}`), input_values: rows.map((r) => r.value) }, descriptive_only: true, recovery_phase: "R",
          ...(TERRITORIAL_NOTES[code] && year < TERRITORIAL_NOTES[code].before ? { territorial_note: TERRITORIAL_NOTES[code].note } : {}),
        });
      }
      records.push(...out);
      const blocking = inputStatus.filter((x) => !x || x.definition_compatible_floor === null || !["pass", "no_overlap_same_table_and_selection"].includes(x.overlap_check) || /^phase_g_held/.test(x.status)).map((x) => x ? `${x.indicator}: ${x.status}` : "input missing");
      recoverySeries.push({ indicator: d.id, country: slug, table: "nama_10_gdp", kind: "derived", formula: d.formula, inputs: d.inputs, input_floors: inputStatus.map((x) => x?.definition_compatible_floor ?? null), first_admitted_before_recovery: Number.isFinite(firstAdmitted) ? firstAdmitted : null, recovered_years: out.length ? [out[0].year, out.at(-1).year] : null, recovered_count: out.length, blocking_inputs: blocking, status: out.length ? "recovered" : blocking.length ? "held_inputs_not_cleared" : "no_recovered_inputs" });
    }
  }
  const recovered = records.filter((r) => r.recovery_phase === "R");

  records.sort((a, b) => a.indicator.localeCompare(b.indicator) || a.country_slug.localeCompare(b.country_slug) || a.year - b.year);
  const history = {
    schema_version: "annual-descriptive-history-v2.0",
    data_type: "annual_descriptive_history",
    descriptive_only: true,
    model_boundary: "Descriptive research coverage only. Not read by composite indices, scenarios, panel, VAR or LP models; observations.json remains the only national model input.",
    missing_value_policy: "Years without an official value are absent; nothing is interpolated or encoded as zero.",
    backfill_policy: "Only years before the first stored year of observations.json are added; stored observations are never duplicated or replaced.",
    recovery_policy: "Phase R (2026-11-10) adds official years before the earliest admitted year, from archived full-history extracts of the same Eurostat tables and selections, from the definition-compatible and territorial floor; records carry recovery_phase \"R\". Phase G records are unchanged.",
    record_count: records.length,
    records,
  };
  const manifest = {
    schema_version: "annual-history-manifest-v2.0",
    phase: "v2.0 Phase G — annual historical descriptive expansion",
    approval: "Owner approved safe descriptive backfills after reviewing descriptive_data_coverage_audit.json (2026-09-29).",
    target: `${FLOOR_YEAR}–latest, or the earliest definition-compatible official year`,
    countries: Object.values(GEOS).map(([, slug]) => slug),
    excluded_countries: { serbia: "requires methodological review (see review_queue)" },
    floor_rule: "floor = max(2000, first official value, year of last 'b' break flag, year after last 'd' definition flag)",
    overlap_tolerance: OVERLAP_TOLERANCE,
    tables: Object.values(tables).map((t) => t.entry),
    series,
    review_queue: REVIEW_QUEUE_AFTER_RECOVERY,
    recovery: {
      phase: "v2.0 Phase R — official historical recovery (2026-11-10)",
      approval: "Owner instruction 2026-11-10: comprehensive official historical data recovery and comparability; descriptive only, no model input changes.",
      floor_rule: "floor = max(first official value, territorial floor, year of the last 'b' flag, year after the last 'd' flag) over the whole official series; only years before the earliest admitted year are added",
      overlap_rule: "splice check: the first five admitted years (Phase G history and observations.json) must agree with the full extract within overlap_tolerance; the excess over all admitted years is reported as all_admitted_overlap_max_excess (later years can carry newer revisions); with no common year the series is accepted only because the current records use the same table and selection",
      territorial_floors: TERRITORIAL_FLOORS,
      territorial_notes: TERRITORIAL_NOTES,
      cleared_from_review_queue: REVIEW_QUEUE.filter((q) => RECOVERED_IDS.has(q.id)).map((q) => ({ ...q, resolution: RECOVERED_INDICATORS.find((s) => s.id === q.id).definition, rule: "same Eurostat table and selection as the current records; official break and definition flags set the floor; overlap with current records verified" })),
      tables: Object.values(full).map((t) => t.entry),
      series: recoverySeries,
      summary: {
        recovered_records: recovered.length,
        recovered_by_indicator: Object.fromEntries([...new Set(recovered.map((r) => r.indicator))].sort().map((i) => [i, recovered.filter((r) => r.indicator === i).length])),
        recovered_by_country: Object.fromEntries([...new Set(recovered.map((r) => r.country_slug))].sort().map((c) => [c, recovered.filter((r) => r.country_slug === c).length])),
        not_recovered: recoverySeries.filter((s) => s.status !== "recovered").map((s) => `${s.indicator}/${s.country}: ${s.status}`),
      },
    },
    summary: {
      ingested_records: records.length,
      ingested_by_indicator: Object.fromEntries([...new Set(records.map((r) => r.indicator))].map((i) => [i, records.filter((r) => r.indicator === i).length])),
      held_for_review: series.filter((s) => s.status !== "ingested" && s.status !== "no_official_data").map((s) => `${s.indicator}/${s.country}: ${s.status}${s.overlap_max_excess != null ? ` (excess ${s.overlap_max_excess.toFixed(3)})` : ""}`),
    },
  };
  return { history, manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { history, manifest } = await build();
  if (offline) { const prior = read(MANIFEST_PATH); manifest.tables = manifest.tables.map((t) => ({ ...t, retrieved_at: prior.tables.find((p) => p.table === t.table)?.retrieved_at ?? null, http_status: prior.tables.find((p) => p.table === t.table)?.http_status ?? null })); }
  if (recoveryOffline) { const prior = read(MANIFEST_PATH).recovery?.tables ?? []; manifest.recovery.tables = manifest.recovery.tables.map((t) => ({ ...t, retrieved_at: prior.find((p) => p.table === t.table)?.retrieved_at ?? null, http_status: prior.find((p) => p.table === t.table)?.http_status ?? null })); }
  // One record per line keeps the file reviewable in diffs without pretty-printing every field.
  const { records, ...header } = history;
  const head = JSON.stringify(header, null, 2).replace(/\n}$/, "");
  fs.writeFileSync(path.join(root, HISTORY_PATH), `${head},\n  "records": [\n${records.map((r) => `    ${JSON.stringify(r)}`).join(",\n")}\n  ]\n}\n`);
  fs.writeFileSync(path.join(root, MANIFEST_PATH), JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify({ records: history.record_count, ...manifest.summary }, null, 1));
}
