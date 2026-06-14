import type { Country, Region } from "@/lib/data";

export type MapLayer = "party" | "economy" | "baseline";

export type LayerOption = {
  id: MapLayer;
  label: string;
  description: string;
  legend: string;
  dataStatus: string;
};

export type RegionLayerDatum = {
  region: Region;
  value?: number;
  displayValue: string;
  rank?: number;
};

export const mapLayerOptions: LayerOption[] = [
  {
    id: "party",
    label: "党派支持率",
    description: "模拟展示执政阵营在各一级行政区的相对支持强度。正式版将接入选举结果和可信民调。",
    legend: "颜色越深，执政阵营支持强度越高",
    dataStatus: "占位数据，等待正式选举与民调数据源",
  },
  {
    id: "economy",
    label: "经济强度",
    description: "模拟展示各地经济活跃度。正式版将使用 GDP、就业、产业结构等区域经济数据。",
    legend: "颜色越深，经济指标越强",
    dataStatus: "占位数据，等待区域经济统计数据源",
  },
  {
    id: "baseline",
    label: "基础底图",
    description: "只显示一级行政区边界和当前选择，不叠加分析强度。",
    legend: "用于阅读行政区结构",
    dataStatus: "真实 ADM1 边界，来自 geoBoundaries；部分地区仍需核验",
  },
];

export function getLayerOption(layer: MapLayer) {
  return mapLayerOptions.find((option) => option.id === layer) ?? mapLayerOptions[0];
}

export function getRegionLayerValue(countrySlug: string, regionSlug: string, layer: MapLayer, index: number) {
  if (layer === "baseline") {
    return undefined;
  }

  const seedSource = `${countrySlug}-${regionSlug}`;
  const seed = Array.from(seedSource).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const layerOffset = layer === "party" ? 17 : 43;
  const raw = (seed + index * 29 + layerOffset) % 100;
  return Math.max(0.12, Math.min(0.95, raw / 100));
}

export function getCountryLayerData(country: Country, layer: MapLayer): RegionLayerDatum[] {
  const values = country.regions.map((region, index) => {
    const value = getRegionLayerValue(country.slug, region.slug, layer, index);
    return {
      region,
      value,
      displayValue: typeof value === "number" ? `${Math.round(value * 100)}%` : "边界",
    };
  });

  const ranked = values
    .filter((item): item is RegionLayerDatum & { value: number } => typeof item.value === "number")
    .sort((a, b) => b.value - a.value)
    .map((item, index) => [item.region.slug, index + 1] as const);
  const rankBySlug = new Map(ranked);

  return values.map((item) => ({
    ...item,
    rank: rankBySlug.get(item.region.slug),
  }));
}

export function getRegionMetricMap(country: Country, layer: MapLayer) {
  return Object.fromEntries(
    getCountryLayerData(country, layer)
      .filter((item): item is RegionLayerDatum & { value: number } => typeof item.value === "number")
      .map((item) => [item.region.slug, item.value]),
  );
}
