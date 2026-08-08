import {
  getCountryObservations,
  getObservation,
  getResearchCountryBySlug,
  getResearchIndicator,
  getResearchSource,
  researchCountries,
} from "@/lib/researchData";

export type EconomicMetricId = "population" | "gdp" | "gdpPerCapita" | "growth" | "inflation" | "unemployment";

export type EconomicYearRow = {
  year: string;
  population: number | null;
  gdp: number | null;
  gdpPerCapita: number | null;
  growth: number | null;
  inflation: number | null;
  unemployment: number | null;
  source: string;
};

export type EconomicMetricOption = { id: EconomicMetricId; label: string; unit: string; note: string };
export type EconomicSourceLink = { label: string; url: string; note: string };

const indicatorIdByMetric: Record<EconomicMetricId, string> = {
  population: "population",
  gdp: "gdp_current_eur",
  gdpPerCapita: "gdp_per_capita_eur",
  growth: "real_gdp_growth",
  inflation: "hicp_inflation",
  unemployment: "unemployment_rate",
};

const metricNotes: Record<EconomicMetricId, string> = {
  population: "年初人口；观测值表统一存储为人。",
  gdp: "名义 GDP，当年价格。",
  gdpPerCapita: "人均 GDP，欧元口径。",
  growth: "链式体量，较上年变化率。",
  inflation: "年均消费者价格变化率；欧盟国家采用 HICP。",
  unemployment: "15-74 岁劳动力口径。",
};

export const economicMetricOptions: EconomicMetricOption[] = (Object.keys(indicatorIdByMetric) as EconomicMetricId[]).map((id) => {
  const indicator = getResearchIndicator(indicatorIdByMetric[id]);
  return { id, label: indicator?.name_zh ?? id, unit: indicator?.unit ?? "", note: metricNotes[id] };
});

function buildCountryRows(countrySlug: string): EconomicYearRow[] {
  const years = Array.from(new Set(getCountryObservations(countrySlug).map((observation) => observation.year))).sort();
  return years.map((year) => {
    const observations = (Object.keys(indicatorIdByMetric) as EconomicMetricId[]).map((metricId) =>
      getObservation(countrySlug, indicatorIdByMetric[metricId], year),
    );
    const source = Array.from(new Set(observations.map((item) => item?.source_name).filter(Boolean))).join(" / ");
    const value = (metricId: EconomicMetricId) => getObservation(countrySlug, indicatorIdByMetric[metricId], year)?.value ?? null;
    return {
      year: String(year),
      population: value("population") === null ? null : Number(value("population")) / 1_000_000,
      gdp: value("gdp"),
      gdpPerCapita: value("gdpPerCapita"),
      growth: value("growth"),
      inflation: value("inflation"),
      unemployment: value("unemployment"),
      source,
    };
  });
}

export const economicTimeSeriesByCountry: Record<string, EconomicYearRow[]> = Object.fromEntries(
  researchCountries.map((country) => [country.slug, buildCountryRows(country.slug)]),
);

export function getEconomicMetricSourceLinks(countrySlug: string, metricId: EconomicMetricId, year: string, value: number | null): EconomicSourceLink[] {
  if (value === null) return [];
  const observation = getObservation(countrySlug, indicatorIdByMetric[metricId], Number(year));
  if (!observation) return [];
  const source = getResearchSource(observation.source);
  const links: EconomicSourceLink[] = observation.source_url
    ? [{ label: observation.source_name, url: observation.source_url, note: `${year} 年 ${getResearchCountryBySlug(countrySlug)?.iso2 ?? countrySlug}；${metricNotes[metricId]}` }]
    : [];
  if (source?.url && source.url !== observation.source_url) {
    links.push({ label: source.name_zh, url: source.url, note: source.usage_note });
  }
  return links;
}

export function getEconomicRowSourceLinks(countrySlug: string, year: string): EconomicSourceLink[] {
  const links = (Object.keys(indicatorIdByMetric) as EconomicMetricId[]).flatMap((metricId) =>
    getEconomicMetricSourceLinks(countrySlug, metricId, year, getObservation(countrySlug, indicatorIdByMetric[metricId], Number(year))?.value ?? null),
  );
  return links.filter((link, index) => links.findIndex((candidate) => candidate.url === link.url) === index);
}

export function getEconomicFiveYearRows(countrySlug: string) {
  return economicTimeSeriesByCountry[countrySlug] ?? [];
}

export function getLatestEconomicRow(countrySlug: string) {
  return getEconomicFiveYearRows(countrySlug).at(-1);
}
