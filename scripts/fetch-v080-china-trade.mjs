import fs from "node:fs";
import path from "node:path";

const OUTPUT_PATH = path.join(process.cwd(), "src", "data", "models", "china-exposure-trade-inputs.json");
const YEARS = [2021, 2022, 2023, 2024];
const CHINA_PARTNER_CODE = 156;
const WORLD_PARTNER_CODE = 0;
const API_BASE = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";

const countries = [
  ["poland", "Poland", 616],
  ["hungary", "Hungary", 348],
  ["czechia", "Czechia", 203],
  ["slovakia", "Slovakia", 703],
  ["germany", "Germany", 276],
  ["austria", "Austria", 40],
  ["romania", "Romania", 642],
  ["slovenia", "Slovenia", 705],
  ["croatia", "Croatia", 191],
  ["serbia", "Serbia", 688],
];

function queryUrl(reporterCode, flowCode, partnerCode, year) {
  const params = new URLSearchParams({
    period: String(year),
    reporterCode: String(reporterCode),
    cmdCode: "TOTAL",
    flowCode,
    partnerCode: String(partnerCode),
    partner2Code: "0",
    customsCode: "C00",
    motCode: "0",
    maxRecords: "500",
  });
  return `${API_BASE}?${params}`;
}

async function fetchValue(url, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const payload = await response.json();
      return payload.data?.[0]?.primaryValue ?? null;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1800));
    }
  }
  throw lastError;
}

async function main() {
  const tasks = countries.flatMap(([country, countryName, reporterCode]) =>
    YEARS.map((year) => ({ country, countryName, reporterCode, year })));
  const records = [];

  async function fetchRecord({ country, countryName, reporterCode, year }) {
      const urls = {
        exports_to_china: queryUrl(reporterCode, "X", CHINA_PARTNER_CODE, year),
        exports_to_world: queryUrl(reporterCode, "X", WORLD_PARTNER_CODE, year),
        imports_from_china: queryUrl(reporterCode, "M", CHINA_PARTNER_CODE, year),
        imports_from_world: queryUrl(reporterCode, "M", WORLD_PARTNER_CODE, year),
      };
      const values = {};
      for (const [key, url] of Object.entries(urls)) {
        values[key] = await fetchValue(url);
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      return {
        country,
        country_name: countryName,
        year,
        reporter_code: reporterCode,
        partner_code: CHINA_PARTNER_CODE,
        unit: "current USD",
        source_name: "UN Comtrade",
        source_reliability: "A",
        values,
        source_urls: urls,
        data_status: Object.values(values).every((value) => typeof value === "number") ? "official_complete" : "official_partial",
        notes: "Goods trade, HS TOTAL. Ratios are calculated from the recorded bilateral and world totals; services are not included.",
      };
  }

  const concurrency = 1;
  for (let index = 0; index < tasks.length; index += concurrency) {
    const batch = tasks.slice(index, index + concurrency);
    const batchRecords = await Promise.all(batch.map(fetchRecord));
    records.push(...batchRecords);
    for (const record of batchRecords) console.log(`Fetched ${record.country} ${record.year}`);
    if (index + concurrency < tasks.length) await new Promise((resolve) => setTimeout(resolve, 1200));
    }

  records.sort((a, b) => a.country.localeCompare(b.country) || a.year - b.year);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify({
    schema_version: "china-exposure-trade-inputs-v0.82",
    generated_at: new Date().toISOString(),
    reference_year: 2024,
    historical_years: YEARS,
    source_policy: "UN Comtrade A-level official goods-trade source; missing responses remain null and are never replaced with zero.",
    records,
  }, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
