import type { Country, Region } from "@/lib/data";
import type { DataStatusKind } from "@/lib/dataStatusLabels";

export type MapLayer = "party" | "economy" | "baseline";

export type LayerOption = {
  id: MapLayer;
  label: string;
  description: string;
  legend: string;
  dataStatus: string;
  statusKind: DataStatusKind;
  statusNote: string;
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
    description: "当前仅用占位色阶验证地图交互。不是选举结果、不是民调数据，也不是模型评分。",
    legend: "颜色深浅仅表示占位色阶，不代表真实支持率",
    dataStatus: "结构样例，不进入模型",
    statusKind: "sample",
    statusNote: "正式版需接入选举结果或可信民调后，才能展示党派支持率。",
  },
  {
    id: "economy",
    label: "经济强度",
    description: "当前仅用占位色阶验证地图交互。不是区域 GDP、就业或产业结构数据。",
    legend: "颜色深浅仅表示占位色阶，不代表真实经济强度",
    dataStatus: "结构样例，不进入模型",
    statusKind: "sample",
    statusNote: "正式版需接入各国统计部门区域经济数据后，才能展示经济强度。",
  },
  {
    id: "baseline",
    label: "基础底图",
    description: "只显示一级行政区边界和当前选择，不叠加分析强度。",
    legend: "用于阅读行政区结构",
    dataStatus: "真实 ADM1 边界，来自 geoBoundaries；部分地区仍需核验",
    statusKind: "manual",
    statusNote: "边界数据来自公开边界源，仍需与各国官方边界口径复核。",
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
      displayValue: typeof value === "number" ? "占位色阶" : "边界",
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
