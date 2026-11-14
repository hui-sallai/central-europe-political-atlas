// Serbian public finance and current account from the Ministry of Finance bulletin (owner decision D, approved
// 2026-11-15: "选 b，两个都做，先 D"). Reads the committed raw transcription of Table 1 (written by
// scripts/serbia-sors/extract-mfin-bulletin.py from the PDF kept in local-evidence/) and writes the descriptive
// store src/data/serbia/serbia_public_finance_mfin.json. Offline and deterministic; nothing is fetched.
//
// Rules: values are kept as printed (only the source's mixed thousands/decimal separators are normalised).
// Ratios printed by the source are "official"; revenue and expenditure shares of GDP are "calculated" from the same
// table (mill. RSD / (bn RSD x 1000) x 100, one decimal). Missing stays missing. 2026 is excluded: partial-year
// fiscal and balance-of-payments figures, end-August debt and a footnoted (non-outturn) GDP.
// National definitions throughout (GFS-1986 consolidated balance; public debt of the central level of government
// under Serbian law; BPM6 current account compiled by the NBS): not comparable with EU EDP/ESA series.
import fs from "node:fs";
import crypto from "node:crypto";

const RAW = "src/data/serbia/raw/mfin_bilten_2026_08_table1.extract.json";
const OUT = "src/data/serbia/serbia_public_finance_mfin.json";
const EXPECTED_PDF_SHA256 = "d479abc36289b47924444f7ca04a0011c50efb0af590a52cddd1ce9dbf16e0c0";
const LAST_COMPLETE_YEAR = "2025";

const extract = JSON.parse(fs.readFileSync(RAW, "utf8"));
if (extract.file_sha256 !== EXPECTED_PDF_SHA256) throw new Error(`unexpected bulletin sha256 ${extract.file_sha256}`);

// "755.987" / "1,694,831" -> integer; "10.558.4" / "-1,233.8" / "-16,7" -> one decimal; "-" -> null.
function parse(token, kind) {
  if (token === "-" || token === undefined) return null;
  if (token.includes("¹")) return null; // footnoted, not an outturn
  const negative = token.startsWith("-");
  const body = negative ? token.slice(1) : token;
  let value;
  if (kind === "integer") value = Number(body.replace(/[.,]/g, ""));
  else {
    const m = body.match(/^(.*)[.,](\d)$/);
    if (!m) throw new Error(`cannot parse one-decimal value ${token}`);
    value = Number(`${m[1].replace(/[.,]/g, "")}.${m[2]}`);
  }
  if (!Number.isFinite(value)) throw new Error(`not a number: ${token}`);
  return negative ? -value : value;
}

const row = (key, kind) => Object.fromEntries(Object.entries(extract.rows[key]).filter(([year]) => year <= LAST_COMPLETE_YEAR).map(([year, token]) => [year, parse(token, kind)]));
const gdp = row("gdp_current_bn_rsd", "decimal");
const revenue = row("consolidated_revenue_mn_rsd", "integer");
const expenditure = row("consolidated_expenditure_mn_rsd", "integer");
const balance = row("consolidated_balance_mn_rsd", "integer");
const balancePct = row("consolidated_balance_pct_gdp", "decimal");
const debt = row("public_debt_central_mn_rsd", "integer");
const debtPct = row("public_debt_central_pct_gdp", "decimal");
const caEur = row("current_account_mn_eur", "decimal");
const caPct = row("current_account_pct_gdp", "decimal");

const share = (numeratorMn, year) => (numeratorMn[year] === null || gdp[year] === null ? null : Math.round((numeratorMn[year] / (gdp[year] * 1000)) * 1000) / 10);

const SERIES = [
  { series: "consolidated_balance_pct_gdp", label: "Consolidated general government balance (% of GDP, GFS-1986)", values: balancePct, unit: "% of GDP", status: "official", maps_to: "fiscal_balance_gdp" },
  { series: "public_debt_central_pct_gdp", label: "Public debt, central level of government, end of period (% of GDP)", values: debtPct, unit: "% of GDP", status: "official", maps_to: "government_debt_gdp" },
  { series: "current_account_pct_gdp", label: "Current account balance (% of GDP, BPM6; NBS data)", values: caPct, unit: "% of GDP", status: "official", maps_to: "current_account_gdp" },
  { series: "consolidated_revenue_pct_gdp", label: "Consolidated public revenue (% of GDP, calculated)", values: Object.fromEntries(Object.keys(gdp).map((y) => [y, share(revenue, y)])), unit: "% of GDP", status: "calculated", maps_to: "government_revenue_gdp", method: "consolidated public revenue (mill. RSD) / GDP at current prices (bn RSD x 1000) x 100, both from Table 1; rounded to one decimal" },
  { series: "consolidated_expenditure_pct_gdp", label: "Consolidated public expenditure (% of GDP, calculated)", values: Object.fromEntries(Object.keys(gdp).map((y) => [y, share(expenditure, y)])), unit: "% of GDP", status: "calculated", maps_to: "government_expenditure_gdp", method: "consolidated public expenditure (mill. RSD) / GDP at current prices (bn RSD x 1000) x 100, both from Table 1; rounded to one decimal" },
  { series: "consolidated_revenue_mn_rsd", label: "Consolidated public revenue (mill. RSD)", values: revenue, unit: "mill. RSD", status: "official" },
  { series: "consolidated_expenditure_mn_rsd", label: "Consolidated public expenditure (mill. RSD)", values: expenditure, unit: "mill. RSD", status: "official" },
  { series: "consolidated_balance_mn_rsd", label: "Consolidated deficit/surplus (mill. RSD)", values: balance, unit: "mill. RSD", status: "official" },
  { series: "public_debt_central_mn_rsd", label: "Public debt, central level of government, end of period (mill. RSD)", values: debt, unit: "mill. RSD", status: "official" },
  { series: "current_account_mn_eur", label: "Current account balance (mill. EUR, BPM6; NBS data)", values: caEur, unit: "mill. EUR", status: "official" },
  { series: "gdp_current_bn_rsd", label: "GDP at current prices (bn RSD), as printed in the bulletin", values: gdp, unit: "bn RSD", status: "official" },
];

const records = [];
for (const s of SERIES) for (const [period, value] of Object.entries(s.values)) {
  if (value === null) continue; // missing stays missing
  records.push({ id: `serbia:mfin:${s.series}:${period}`, series: s.series, territory_code: "RS", period, value, unit: s.unit, value_status: s.status, cross_country_comparable: false });
}

// Consistency checks against the printed ratios (tolerance 0.15 pp for rounding); recorded, never used to alter values.
const checks = [];
for (const year of Object.keys(gdp)) {
  if (balance[year] !== null && balancePct[year] !== null && gdp[year] !== null) checks.push({ year, check: "balance_pct", printed: balancePct[year], recomputed: share(balance, year) });
  if (debt[year] !== null && debtPct[year] !== null && gdp[year] !== null) checks.push({ year, check: "debt_pct", printed: debtPct[year], recomputed: share(debt, year) });
}
const deviations = checks.filter((c) => Math.abs(c.printed - c.recomputed) > 0.15);

const store = {
  schema_version: "serbia-public-finance-mfin-v1",
  store: "public_finance",
  country: "serbia",
  descriptive_only: true,
  model_boundary: "Descriptive national series. Not used by any model, panel, comparison ranking or forecast.",
  comparability: "National definitions: GFS-1986 consolidated balance; public debt of the central level of government under Serbian law; BPM6 current account compiled by the NBS. Not comparable with EU EDP/ESA government finance series (cross_country_comparable=false); not merged into the canonical EU observations.",
  owner_decision: "Owner approval 2026-11-15 (decision D: \"选 b，两个都做，先 D\"); www.mfin.gov.rs registered for manual reading only (\"批准登记这五个塞尔维亚站点，仅人工读取\").",
  rights_basis: "Official material of a state body: Serbian Law on Copyright and Related Rights, Art. 6(2) (read 2026-11-15 on pravno-informacioni-sistem.rs); a reading of the statute, weaker than a licence. Attribution kept.",
  attribution: "Source: Ministry of Finance of the Republic of Serbia, Public finance bulletin (Билтен јавних финансија), August 2026, Table 1; balance-of-payments rows: National Bank of Serbia.",
  source: { institution: extract.source_institution, publication: extract.publication, page_url: extract.page_url, file_url: extract.file_url, file_sha256: extract.file_sha256, table: extract.table, retrieved_on: extract.retrieved_on, raw_extract: RAW, raw_extract_sha256: crypto.createHash("sha256").update(fs.readFileSync(RAW)).digest("hex") },
  excluded: "2026: partial-year fiscal and balance-of-payments figures, end-August debt and a footnoted (non-outturn) GDP.",
  series: SERIES.map(({ values, ...meta }) => ({ ...meta, periods: Object.entries(values).filter(([, v]) => v !== null).map(([y]) => y) })),
  consistency_checks: { tolerance_pp: 0.15, checked: checks.length, deviations },
  record_count: records.length,
  records,
};
fs.writeFileSync(OUT, JSON.stringify(store, null, 2) + "\n");
// Same byte-for-byte copy scripts/export-research-data.mjs makes of every src/data/serbia/*.json store.
fs.mkdirSync("public/research-data/serbia", { recursive: true });
fs.copyFileSync(OUT, "public/research-data/serbia/serbia_public_finance_mfin.json");
console.log(JSON.stringify({ records: records.length, checks: checks.length, deviations }));
