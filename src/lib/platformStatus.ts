export const platformStatus = {
  version: "v0.21 页面收口版",
  stage: "数据基础与方法论整理",
  regionalData: "匈牙利 NUTS3 边界证据已记录；正式展示仍未启用",
  mapDisplay: "未启用",
  modelLayer: "未启用",
  lastUpdated: "2026-08-02",
} as const;

export const platformStatusItems = [
  { label: "当前阶段", value: platformStatus.stage },
  { label: "区域地图数据", value: platformStatus.regionalData },
  { label: "真实地图展示", value: platformStatus.mapDisplay },
  { label: "模型层", value: platformStatus.modelLayer },
] as const;

export const mapDisplayBoundary =
  "真实区域边界尚未进入公开地图；风险图层、预测图层和真实党派支持率图层均未启用。";
