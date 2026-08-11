export const platformStatus = {
  version: "v0.60 Scenario Simulation / 情景模拟",
  stage: "透明模型上的可解释情景模拟",
  regionalData: "匈牙利 NUTS3 边界证据已记录；正式展示仍未启用",
  mapDisplay: "未启用",
  modelLayer: "v0.50 三项基础模型保持不变；v0.60 情景层启用，预测未启用",
  lastUpdated: "2026-08-11",
} as const;

export const platformStatusItems = [
  { label: "当前阶段", value: platformStatus.stage },
  { label: "区域地图数据", value: platformStatus.regionalData },
  { label: "真实地图展示", value: platformStatus.mapDisplay },
  { label: "模型层", value: platformStatus.modelLayer },
] as const;

export const mapDisplayBoundary =
  "真实区域边界尚未进入公开地图；模型与情景仅在 Models、Scenarios 与 Country 页面验证，风险图层、情景图层、预测图层和真实党派支持率图层均未启用。";
