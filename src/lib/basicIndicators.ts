import { getCountryObservations, getResearchIndicator } from "@/lib/researchData";
import { countryObservationSummary } from "./countryObservationPresentation";
import type { DataStatus } from "@/types/DataStatus";

export type BasicIndicator = {
  id: "population" | "gdp" | "gdpPerCapita" | "growth" | "inflation" | "unemployment";
  label: string;
  value: string;
  year: string;
  source: string;
  status: DataStatus;
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
    // Latest published value (freshness layer); when none exists, keep the pending placeholder record so the card
    // still shows the expected period and status instead of an older or invented value.
    const summary = countryObservationSummary(getCountryObservations(countrySlug, indicatorId));
    const observation = summary.record;
    const indicator = getResearchIndicator(indicatorId);
    const status = observation?.status ?? "pending";

    return {
      id,
      label: indicator?.name_zh ?? indicatorId,
      value: summary.published ? formatValue(indicatorId, summary.value) : summary.unavailable === "pending" ? "待发布／待接入" : summary.unavailable === "not_applicable" ? "不适用" : "缺少已发布观测",
      year: observation ? String(observation.year) : "待接入",
      source: observation?.source_name ?? "来源待接入",
      status,
      note: observation?.notes ?? "观测值待接入。",
    };
  });
}
