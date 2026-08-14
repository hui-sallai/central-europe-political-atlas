export const platformStatus = {
  version: "v0.85 Regional & Map Foundation",
  stage: "十国区域空间数据基础与公开展示闸门",
  regionalData: "十国区域主键已统一；边界、拓扑与区域统计按国家逐项核验",
  mapDisplay: "未启用",
  modelLayer: "国家级模型保持冻结；不生成区域风险分数",
  lastUpdated: "2026-08-14",
} as const;

export const platformStatusItems = [
  { label: "当前阶段", value: platformStatus.stage },
  { label: "区域地图数据", value: platformStatus.regionalData },
  { label: "真实地图展示", value: platformStatus.mapDisplay },
  { label: "模型层", value: platformStatus.modelLayer },
] as const;

export const mapDisplayBoundary =
  "真实区域边界尚未进入公开地图；模型与情景仅在 Models、Scenarios 与 Country 页面验证，风险图层、情景图层、预测图层和真实党派支持率图层均未启用。";
