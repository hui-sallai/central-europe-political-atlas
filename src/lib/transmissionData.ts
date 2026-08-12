import type { Indicator, Observation } from "../types/researchData";
import { crossCountryParityCountrySlugs, crossCountryTransmissionObservations } from "./crossCountryParityData";

const UPDATED_AT = "2026-08-11";

const countryMeta = {
  poland: { iso3: "POL", geo: "PL", comtrade: 616 },
  hungary: { iso3: "HUN", geo: "HU", comtrade: 348 },
  czechia: { iso3: "CZE", geo: "CZ", comtrade: 203 },
  slovakia: { iso3: "SVK", geo: "SK", comtrade: 703 },
} as const;

type V4Slug = keyof typeof countryMeta;

export const transmissionIndicators: Indicator[] = [
  {
    id: "germany_export_dependence",
    name: "Germany export dependence",
    name_zh: "对德国出口依赖",
    category: "external",
    unit: "% exports",
    frequency: "annual",
    source_type: "UN Comtrade",
    status: "verified",
    future_model_candidate: true,
    description: "对德国货物出口额占本国对世界货物出口额的比重；不以总出口规模替代双边暴露。",
    last_updated: UPDATED_AT,
  },
  {
    id: "industrial_electricity_price",
    name: "Industrial electricity price",
    name_zh: "工业电价",
    category: "industry",
    unit: "欧元/kWh",
    frequency: "annual",
    source_type: "Eurostat nrg_pc_205",
    status: "verified",
    future_model_candidate: true,
    description: "非居民 IC 档（500–1,999 MWh）含税电价；年度值为两个半年官方价格的简单平均。",
    last_updated: UPDATED_AT,
  },
  {
    id: "household_electricity_price",
    name: "Household electricity price",
    name_zh: "居民电价",
    category: "energy",
    unit: "欧元/kWh",
    frequency: "annual",
    source_type: "Eurostat nrg_pc_204",
    status: "verified",
    future_model_candidate: true,
    description: "居民 DC 档（2,500–4,999 kWh）含税电价；年度值为两个半年官方价格的简单平均。",
    last_updated: UPDATED_AT,
  },
  {
    id: "energy_inflation",
    name: "Energy inflation",
    name_zh: "能源通胀",
    category: "energy",
    unit: "%",
    frequency: "annual",
    source_type: "Eurostat prc_hicp_aind",
    status: "verified",
    future_model_candidate: true,
    description: "HICP CP045 电力、燃气及其他燃料分项的年度平均变化率。",
    last_updated: UPDATED_AT,
  },
];

const germanyExportShares: Record<number, Record<V4Slug, number>> = {
  2023: { poland: 27.936, hungary: 26.229, czechia: 32.838, slovakia: 21.006 },
  2024: { poland: 27.063, hungary: 24.6, czechia: 32.211, slovakia: 21.398 },
};

const industrialElectricityPrices: Record<number, Record<V4Slug, number>> = {
  2023: { poland: 0.2615, hungary: 0.3644, czechia: 0.22825, slovakia: 0.301 },
  2024: { poland: 0.2573, hungary: 0.28495, czechia: 0.2293, slovakia: 0.23665 },
};

const householdElectricityPrices: Record<number, Record<V4Slug, number>> = {
  2023: { poland: 0.19655, hungary: 0.11445, czechia: 0.31705, slovakia: 0.19175 },
  2024: { poland: 0.22835, hungary: 0.1063, czechia: 0.33415, slovakia: 0.1788 },
};

const energyInflationRates: Record<number, Record<V4Slug, number>> = {
  2023: { poland: 19.5, hungary: 12.1, czechia: 39.4, slovakia: 11.4 },
  2024: { poland: 3.9, hungary: -4.7, czechia: 4.2, slovakia: -0.7 },
};

function comtradeUrl(reporterCode: number, year: number, partnerCode: number) {
  return `https://comtradeapi.un.org/public/v1/preview/C/A/HS?period=${year}&reporterCode=${reporterCode}&cmdCode=TOTAL&flowCode=X&partnerCode=${partnerCode}&partner2Code=0&customsCode=C00&motCode=0&maxRecords=500`;
}

function eurostatPriceUrl(dataset: "nrg_pc_204" | "nrg_pc_205", geo: string, year: number, band: string) {
  return `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${dataset}?lang=en&geo=${geo}&nrg_cons=${band}&unit=KWH&tax=I_TAX&currency=EUR&sinceTimePeriod=${year}-S1&untilTimePeriod=${year}-S2`;
}

function energyInflationUrl(geo: string, year: number) {
  return `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_aind?lang=en&geo=${geo}&coicop=CP045&unit=RCH_A_AVG&sinceTimePeriod=${year}&untilTimePeriod=${year}`;
}

function observation(
  countrySlug: V4Slug,
  indicator: string,
  year: number,
  value: number,
  unit: string,
  status: Observation["status"],
  source: string,
  sourceName: string,
  sourceUrl: string,
  notes: string,
): Observation {
  return {
    id: `transmission:${countrySlug}:${indicator}:${year}`,
    country: countryMeta[countrySlug].iso3,
    country_slug: countrySlug,
    indicator,
    year,
    value,
    unit,
    status,
    source,
    source_name: sourceName,
    source_url: sourceUrl,
    source_reliability: "A",
    updated_at: UPDATED_AT,
    notes,
  };
}

const v4TransmissionObservations: Observation[] = (Object.keys(countryMeta) as V4Slug[]).flatMap((countrySlug) => {
  const meta = countryMeta[countrySlug];
  return [2023, 2024].flatMap((year) => [
    observation(
      countrySlug,
      "germany_export_dependence",
      year,
      germanyExportShares[year][countrySlug],
      "% exports",
      "calculated",
      "international_organizations",
      "UN Comtrade",
      comtradeUrl(meta.comtrade, year, 276),
      `对德国货物出口 / 对世界货物出口 × 100。分子伙伴代码 276；分母查询：${comtradeUrl(meta.comtrade, year, 0)}`,
    ),
    observation(
      countrySlug,
      "industrial_electricity_price",
      year,
      industrialElectricityPrices[year][countrySlug],
      "欧元/kWh",
      "calculated",
      "eurostat",
      "Eurostat nrg_pc_205",
      eurostatPriceUrl("nrg_pc_205", meta.geo, year, "MWH500-1999"),
      "非居民 IC 档、含税、欧元/kWh；年度值为 S1 与 S2 官方半年值的简单平均，未用能源进口依赖替代价格。",
    ),
    observation(
      countrySlug,
      "household_electricity_price",
      year,
      householdElectricityPrices[year][countrySlug],
      "欧元/kWh",
      "calculated",
      "eurostat",
      "Eurostat nrg_pc_204",
      eurostatPriceUrl("nrg_pc_204", meta.geo, year, "KWH2500-4999"),
      "居民 DC 档、含税、欧元/kWh；年度值为 S1 与 S2 官方半年值的简单平均。当前保留为传导数据，不改变 v0.50 居民压力基线权重。",
    ),
    observation(
      countrySlug,
      "energy_inflation",
      year,
      energyInflationRates[year][countrySlug],
      "%",
      "official",
      "eurostat",
      "Eurostat prc_hicp_aind",
      energyInflationUrl(meta.geo, year),
      "HICP CP045 电力、燃气及其他燃料分项年度平均变化率。当前作为能源传导解释输入，不改变 v0.50 居民压力基线权重。",
    ),
  ]);
});

export const transmissionObservations: Observation[] = [
  ...v4TransmissionObservations.filter((item) => !crossCountryTransmissionObservations.some((candidate) => candidate.id === item.id)),
  ...crossCountryTransmissionObservations,
];

export const transmissionDataSummary = {
  countries: [...new Set([...(Object.keys(countryMeta) as V4Slug[]), ...crossCountryParityCountrySlugs])],
  indicators: transmissionIndicators.map((indicator) => indicator.id),
  years: [2023, 2024],
  observation_count: transmissionObservations.length,
  source_reliability: "A" as const,
  fdi_policy: "FDI 年流量只作背景与驱动解释，不进入 v0.70 产业依赖正式权重。",
};

export function getTransmissionObservations(countrySlug?: string) {
  return countrySlug
    ? transmissionObservations.filter((item) => item.country_slug === countrySlug)
    : transmissionObservations;
}
