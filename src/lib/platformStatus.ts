export const platformStatus = {
  version: "v0.35 Event Database / 事件数据库",
  stage: "V4 政治经济事件编码与指标关联",
  regionalData: "匈牙利 NUTS3 边界证据已记录；正式展示仍未启用",
  mapDisplay: "未启用",
  modelLayer: "未启用",
  lastUpdated: "2026-08-09",
} as const;

export const platformStatusItems = [
  { label: "当前阶段", value: platformStatus.stage },
  { label: "区域地图数据", value: platformStatus.regionalData },
  { label: "真实地图展示", value: platformStatus.mapDisplay },
  { label: "模型层", value: platformStatus.modelLayer },
] as const;

export const mapDisplayBoundary =
  "真实区域边界尚未进入公开地图；风险图层、预测图层和真实党派支持率图层均未启用。";
