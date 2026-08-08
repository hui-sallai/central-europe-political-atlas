import { getLatestObservation, getResearchIndicator } from "@/lib/researchData";

export type BasicIndicator = {
  id: "population" | "gdp" | "gdpPerCapita" | "growth" | "inflation" | "unemployment";
  label: string;
  value: string;
  year: string;
  source: string;
  status: "official" | "manual" | "pending";
  note?: string;
};

const indicatorIds: Array<{ id: BasicIndicator["id"]; indicatorId: string }> = [
  { id: "population", indicatorId: "population" },
  { id: "gdp", indicatorId: "gdp_current_eur" },
  { id: "gdpPerCapita", indicatorId: "gdp_per_capita_eur" },
  { id: "growth", indicatorId: "real_gdp_growth" },
  { id: "inflation", indicatorId: "hicp_inflation" },
  { id: "unemployment", indicatorId: "unemployment_rate" },
];

function formatValue(indicatorId: string, value: number | null) {
  if (value === null) return "待接入";
  if (indicatorId === "population") return `约 ${(value / 10_000).toLocaleString("zh-CN", { maximumFractionDigits: 0 })} 万`;
  if (indicatorId === "gdp_current_eur") return `${(value / 100).toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 亿欧元`;
  if (indicatorId === "gdp_per_capita_eur") return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 0 })} 欧元`;
  return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}%`;
}

export function getBasicIndicators(countrySlug: string): BasicIndicator[] {
  return indicatorIds.map(({ id, indicatorId }) => {
    const observation = getLatestObservation(countrySlug, indicatorId);
    const indicator = getResearchIndicator(indicatorId);
    const status = observation?.status === "official" ? "official" : observation?.status === "pending" ? "pending" : "manual";

    return {
      id,
      label: indicator?.name_zh ?? indicatorId,
      value: formatValue(indicatorId, observation?.value ?? null),
      year: observation ? String(observation.year) : "待接入",
      source: observation?.source_name ?? "来源待接入",
      status,
      note: observation?.notes ?? "观测值待接入。",
    };
  });
}
