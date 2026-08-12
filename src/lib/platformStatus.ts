export const platformStatus = {
  version: "v0.82 China Exposure Evidence Parity",
  stage: "十国中国专项证据可比性与覆盖闸门",
  regionalData: "匈牙利 NUTS3 边界证据已记录；正式展示仍未启用",
  mapDisplay: "未启用",
  modelLayer: "v0.80 门槛冻结；v0.82 不生成新总分或不完整排名",
  lastUpdated: "2026-08-12",
} as const;

export const platformStatusItems = [
  { label: "当前阶段", value: platformStatus.stage },
  { label: "区域地图数据", value: platformStatus.regionalData },
  { label: "真实地图展示", value: platformStatus.mapDisplay },
  { label: "模型层", value: platformStatus.modelLayer },
] as const;

export const mapDisplayBoundary =
  "真实区域边界尚未进入公开地图；模型与情景仅在 Models、Scenarios 与 Country 页面验证，风险图层、情景图层、预测图层和真实党派支持率图层均未启用。";
