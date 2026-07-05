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
};

export const mapLayerOptions: LayerOption[] = [
  {
    id: "party",
    label: "政治样本色阶",
    description: "真实行政边界待接入；当前仅保留地图工作台入口和结构样例。该层不是选举结果、不是民调数据，也不是模型评分。",
    legend: "颜色深浅仅表示结构样例，不代表真实支持率",
    dataStatus: "结构样例，不进入模型",
    statusKind: "sample",
    statusNote: "暂不提供真实党派支持率图层；正式版需先接入区域选举或可信民调数据。",
  },
  {
    id: "economy",
    label: "区域经济样例色阶",
    description: "真实行政边界待接入；当前仅保留地图工作台入口和结构样例。该层不是区域 GDP、就业或产业结构数据。",
    legend: "颜色深浅仅表示结构样例，不代表真实区域经济指标",
    dataStatus: "结构样例，不进入模型",
    statusKind: "sample",
    statusNote: "正式版需接入各国统计部门区域经济数据后，才能展示区域经济差异。",
  },
  {
    id: "baseline",
    label: "基础工作台",
    description: "真实行政边界待接入；当前仅保留地图工作台入口和结构样例，不叠加分析评分。",
    legend: "用于保留地图工作台入口",
    dataStatus: "待接入",
    statusKind: "pending",
    statusNote: "ADM1/ADM2 边界、区域经济、区域选举和区域对华项目数据尚未形成正式口径。",
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
  return country.regions.map((region, index) => {
    const value = getRegionLayerValue(country.slug, region.slug, layer, index);
    return {
      region,
      value,
      displayValue: typeof value === "number" ? "占位色阶" : "边界",
    };
  });
}

export function getRegionMetricMap(country: Country, layer: MapLayer) {
  return Object.fromEntries(
    getCountryLayerData(country, layer)
      .filter((item): item is RegionLayerDatum & { value: number } => typeof item.value === "number")
      .map((item) => [item.region.slug, item.value]),
  );
}
