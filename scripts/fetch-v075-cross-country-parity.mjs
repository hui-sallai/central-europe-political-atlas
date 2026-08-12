import fs from "node:fs";
import path from "node:path";

const UPDATED_AT = "2026-08-11";
const OUTPUT_PATH = path.join(process.cwd(), "src", "data", "observations", "v075-cross-country-parity.json");
const YEARS = [2021, 2022, 2023, 2024, 2025];
const TRANSMISSION_YEARS = [2023, 2024];

const countries = {
  germany: { iso3: "DEU", geo: "DE", comtrade: 276 },
  austria: { iso3: "AUT", geo: "AT", comtrade: 40 },
  romania: { iso3: "ROU", geo: "RO", comtrade: 642 },
  slovenia: { iso3: "SVN", geo: "SI", comtrade: 705 },
  croatia: { iso3: "HRV", geo: "HR", comtrade: 191 },
  serbia: { iso3: "SRB", geo: "RS", comtrade: 688 },
};

const eurostatBase = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
const comtradeBase = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";

async function fetchJson(url, attempts = 6) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) {
        const error = new Error(`${response.status} ${response.statusText}`);
        error.retryAfter = Number(response.headers.get("retry-after") ?? 0);
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const delay = error.retryAfter > 0 ? error.retryAfter * 1000 : attempt * 2500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError}`);
}

function buildEurostatUrl(dataset, filters, geos, since, until) {
  const params = new URLSearchParams({ lang: "en" });
  for (const [key, value] of Object.entries(filters)) {
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
  }
  for (const geo of geos) params.append("geo", geo);
  params.set("sinceTimePeriod", String(since));
  params.set("untilTimePeriod", String(until));
  return `${eurostatBase}/${dataset}?${params}`;
}

function categoryPosition(dimension, key) {
  const index = dimension?.category?.index;
  if (Array.isArray(index)) return index.indexOf(key);
  return index?.[key] ?? -1;
}

function jsonStatValue(payload, selections) {
  let flatIndex = 0;
  for (let dimensionIndex = 0; dimensionIndex < payload.id.length; dimensionIndex += 1) {
    const dimensionId = payload.id[dimensionIndex];
    const size = payload.size[dimensionIndex];
    const requested = selections[dimensionId];
    let position;
    if (requested !== undefined) {
      position = categoryPosition(payload.dimension[dimensionId], String(requested));
    } else if (size === 1) {
      position = 0;
    } else {
      const available = payload.dimension?.[dimensionId]?.category?.index;
      throw new Error(`Dimension ${dimensionId} is not fixed and has ${size} values: ${JSON.stringify(available)}`);
    }
    if (position < 0) return null;
    flatIndex = flatIndex * size + position;
  }
  return payload.value?.[String(flatIndex)] ?? payload.value?.[flatIndex] ?? null;
}

async function eurostatSeries(dataset, filters, periods) {
  const geos = Object.values(countries).map((country) => country.geo);
  const url = buildEurostatUrl(dataset, filters, geos, periods[0], periods.at(-1));
  const payload = await fetchJson(url);
  return {
    url,
    values: Object.fromEntries(Object.entries(countries).map(([slug, country]) => [
      slug,
      Object.fromEntries(periods.map((period) => [period, jsonStatValue(payload, {
        ...Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])),
        geo: country.geo,
        time: period,
      })])),
    ])),
  };
}

function exactEurostatUrl(dataset, filters, geo, period) {
  return buildEurostatUrl(dataset, filters, [geo], period, period);
}

function extendedRecord(countrySlug, indicatorId, year, value, unit, dataset, filters, note = "") {
  const country = countries[countrySlug];
  return {
    country_slug: countrySlug,
    country_iso3: country.iso3,
    indicator_id: indicatorId,
    year,
    value,
    unit,
    status: value === null ? "pending" : "official",
    source_id: "eurostat",
    source_name: "Eurostat",
    source_url: exactEurostatUrl(dataset, filters, country.geo, year),
    source_reliability: "A",
    updated_at: UPDATED_AT,
    notes: value === null ? `Eurostat 当前未返回 ${year} 年可用值；保留为空，不插值。${note}` : note,
  };
}

function transmissionRecord(countrySlug, indicatorId, year, value, unit, status, sourceId, sourceName, sourceUrl, notes) {
  const country = countries[countrySlug];
  return {
    country_slug: countrySlug,
    country_iso3: country.iso3,
    indicator_id: indicatorId,
    year,
    value,
    unit,
    status: value === null ? "pending" : status,
    source_id: sourceId,
    source_name: sourceName,
    source_url: sourceUrl,
    source_reliability: value === null ? "D" : "A",
    updated_at: UPDATED_AT,
    notes,
  };
}

async function comtradeValue(reporterCode, year, partnerCode) {
  const params = new URLSearchParams({
    period: String(year),
    reporterCode: String(reporterCode),
    cmdCode: "TOTAL",
    flowCode: "X",
    partnerCode: String(partnerCode),
    partner2Code: "0",
    customsCode: "C00",
    motCode: "0",
    maxRecords: "500",
  });
  const url = `${comtradeBase}?${params}`;
  const payload = await fetchJson(url);
  return { url, value: payload.data?.[0]?.primaryValue ?? null };
}

const datasetDefinitions = {
  fiscal_balance_gdp: { dataset: "gov_10dd_edpt1", filters: { freq: "A", unit: "PC_GDP", sector: "S13", na_item: "B9" }, unit: "% GDP" },
  government_debt_gdp: { dataset: "gov_10dd_edpt1", filters: { freq: "A", unit: "PC_GDP", sector: "S13", na_item: "GD" }, unit: "% GDP" },
  government_revenue_gdp: { dataset: "gov_10a_main", filters: { freq: "A", unit: "PC_GDP", sector: "S13", na_item: "TR" }, unit: "% GDP" },
  government_expenditure_gdp: { dataset: "gov_10a_main", filters: { freq: "A", unit: "PC_GDP", sector: "S13", na_item: "TE" }, unit: "% GDP" },
  exports_goods_services: { dataset: "nama_10_gdp", filters: { freq: "A", unit: "CP_MEUR", na_item: "P6" }, unit: "百万欧元" },
  imports_goods_services: { dataset: "nama_10_gdp", filters: { freq: "A", unit: "CP_MEUR", na_item: "P7" }, unit: "百万欧元" },
  current_account_gdp: { dataset: "tipsbp20", filters: { freq: "A", unit: "PC_GDP", partner: "WRL_REST" }, unit: "% GDP" },
  fdi_inflow: { dataset: "bop_fdi6_flow", filters: { freq: "A", currency: "MIO_EUR", nace_r2: "FDI", stk_flow: "LIAB", entity: "TOTAL", fdi_item: "DI__D__F", partner: "WRL_REST" }, unit: "百万欧元" },
  energy_import_dependency: { dataset: "nrg_ind_id", filters: { freq: "A", unit: "PC", siec: "TOTAL" }, unit: "%" },
  manufacturing_share_gdp: { dataset: "nama_10_a10", filters: { freq: "A", unit: "PC_GDP", na_item: "B1G", nace_r2: "C" }, unit: "%" },
};

async function main() {
  const loaded = {};
  for (const [indicatorId, definition] of Object.entries(datasetDefinitions)) {
    console.log(`Fetching ${indicatorId} from ${definition.dataset}`);
    loaded[indicatorId] = await eurostatSeries(definition.dataset, definition.filters, YEARS);
  }

  const automotiveC29 = await eurostatSeries("ext_tec09", { freq: "A", unit: "THS_EUR", stk_flow: "EXP", partner: "WORLD", nace_r2: "C29" }, YEARS);
  const automotiveTotal = await eurostatSeries("ext_tec09", { freq: "A", unit: "THS_EUR", stk_flow: "EXP", partner: "WORLD", nace_r2: "TOTAL" }, YEARS);

  const extended = [];
  for (const countrySlug of Object.keys(countries)) {
    for (const year of YEARS) {
      for (const [indicatorId, definition] of Object.entries(datasetDefinitions)) {
        extended.push(extendedRecord(
          countrySlug,
          indicatorId,
          year,
          loaded[indicatorId].values[countrySlug][year],
          definition.unit,
          definition.dataset,
          definition.filters,
          indicatorId === "fdi_inflow" ? "BPM6 直接投资负债流入；负值表示净减少，不直接解释为依赖高低。" : "",
        ));
      }

      const exports = loaded.exports_goods_services.values[countrySlug][year];
      const imports = loaded.imports_goods_services.values[countrySlug][year];
      extended.push(extendedRecord(
        countrySlug,
        "trade_balance",
        year,
        exports === null || imports === null ? null : Number((exports - imports).toFixed(3)),
        "百万欧元",
        "nama_10_gdp",
        { freq: "A", unit: "CP_MEUR", na_item: "P6" },
        "由同年 Eurostat P6 出口减 P7 进口计算。",
      ));

      const c29 = automotiveC29.values[countrySlug][year];
      const total = automotiveTotal.values[countrySlug][year];
      extended.push(extendedRecord(
        countrySlug,
        "automotive_export_share",
        year,
        c29 === null || total === null || total === 0 ? null : Number(((c29 / total) * 100).toFixed(3)),
        "%",
        "ext_tec09",
        { freq: "A", unit: "THS_EUR", stk_flow: "EXP", partner: "WORLD", nace_r2: "C29" },
        "由 Eurostat ext_tec09 计算：NACE C29 出口 / 全部 NACE 出口。",
      ));
    }
  }

  const industrialPricePeriods = TRANSMISSION_YEARS.flatMap((year) => [`${year}-S1`, `${year}-S2`]);
  const industrialPrices = await eurostatSeries("nrg_pc_205", { freq: "S", currency: "EUR", nrg_cons: "MWH500-1999", unit: "KWH", tax: "I_TAX" }, industrialPricePeriods);
  const householdPrices = await eurostatSeries("nrg_pc_204", { freq: "S", currency: "EUR", nrg_cons: "KWH2500-4999", unit: "KWH", tax: "I_TAX" }, industrialPricePeriods);
  const energyInflation = await eurostatSeries("prc_hicp_aind", { freq: "A", unit: "RCH_A_AVG", coicop: "CP045" }, TRANSMISSION_YEARS);

  const transmission = [];
  for (const [countrySlug, country] of Object.entries(countries)) {
    for (const year of TRANSMISSION_YEARS) {
      if (countrySlug === "germany") {
        transmission.push(transmissionRecord(
          countrySlug,
          "germany_export_dependence",
          year,
          null,
          "% exports",
          "calculated",
          "international_organizations",
          "UN Comtrade",
          "https://comtradeplus.un.org/",
          "德国作为目的国基准不适用“对德国出口依赖”指标；保留空值，不以国内贸易或总出口替代。",
        ));
      } else {
        const germanyExports = await comtradeValue(country.comtrade, year, 276);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const worldExports = await comtradeValue(country.comtrade, year, 0);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const share = germanyExports.value === null || worldExports.value === null || worldExports.value === 0
          ? null
          : Number(((germanyExports.value / worldExports.value) * 100).toFixed(3));
        transmission.push(transmissionRecord(
          countrySlug,
          "germany_export_dependence",
          year,
          share,
          "% exports",
          "calculated",
          "international_organizations",
          "UN Comtrade",
          germanyExports.url,
          `对德国货物出口 / 对世界货物出口 × 100；分母查询：${worldExports.url}`,
        ));
      }

      for (const [indicatorId, series, dataset, unit, notes] of [
        ["industrial_electricity_price", industrialPrices, "nrg_pc_205", "欧元/kWh", "非居民 IC 档、含税；年度值为 S1 与 S2 官方半年值的简单平均。"],
        ["household_electricity_price", householdPrices, "nrg_pc_204", "欧元/kWh", "居民 DC 档、含税；年度值为 S1 与 S2 官方半年值的简单平均。"],
      ]) {
        const first = series.values[countrySlug][`${year}-S1`];
        const second = series.values[countrySlug][`${year}-S2`];
        const value = first === null || second === null ? null : Number(((first + second) / 2).toFixed(6));
        transmission.push(transmissionRecord(
          countrySlug,
          indicatorId,
          year,
          value,
          unit,
          "calculated",
          "eurostat",
          `Eurostat ${dataset}`,
          exactEurostatUrl(dataset, dataset === "nrg_pc_205"
            ? { freq: "S", currency: "EUR", nrg_cons: "MWH500-1999", unit: "KWH", tax: "I_TAX" }
            : { freq: "S", currency: "EUR", nrg_cons: "KWH2500-4999", unit: "KWH", tax: "I_TAX" }, country.geo, `${year}-S1`),
          notes,
        ));
      }

      transmission.push(transmissionRecord(
        countrySlug,
        "energy_inflation",
        year,
        energyInflation.values[countrySlug][year],
        "%",
        "official",
        "eurostat",
        "Eurostat prc_hicp_aind",
        exactEurostatUrl("prc_hicp_aind", { freq: "A", unit: "RCH_A_AVG", coicop: "CP045" }, country.geo, year),
        "HICP CP045 电力、燃气及其他燃料分项年度平均变化率。",
      ));
    }
  }

  const payload = {
    schema_version: "cross-country-parity-v0.75",
    generated_at: UPDATED_AT,
    data_type: "v075_cross_country_parity",
    countries: Object.keys(countries),
    extended_indicator_count: 12,
    extended_year_coverage: "2021-2025",
    transmission_indicator_count: 4,
    transmission_year_coverage: "2023-2024",
    record_count: extended.length + transmission.length,
    source_policy: "Eurostat and UN Comtrade A-level official sources; unavailable values remain null/pending.",
    records: [...extended, ...transmission],
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${payload.record_count} records to ${OUTPUT_PATH}`);
  console.log(`Extended: ${extended.length}; transmission: ${transmission.length}`);
  console.log(`Pending: ${payload.records.filter((record) => record.value === null).length}`);
}

await main();
