export const platformStatus = {
  version: "v0.90 Transmission & Scenario Analysis",
  stage: "政治经济冲击传导与高级情景分析",
  regionalData: "九国区域事实用于结构背景；塞尔维亚区域比较继续待接入，不阻断合格国家级情景",
  mapDisplay: "事实地图仅承接 structural context；情景影响、风险与预测色阶未启用",
  modelLayer: "四项既有模型公式保持不变；四个独立情景支持透明重算、敏感性与证据追踪",
  lastUpdated: "2026-08-15",
} as const;

export const platformStatusItems = [
  { label: "当前阶段", value: platformStatus.stage },
  { label: "区域地图数据", value: platformStatus.regionalData },
  { label: "真实地图展示", value: platformStatus.mapDisplay },
  { label: "模型层", value: platformStatus.modelLayer },
] as const;

export const mapDisplayBoundary =
  "事实型区域图层按国家、按图层独立验收；未通过许可、署名、拓扑、主键与数据质量闸门的图层不显示。风险、情景、预测、China Exposure 和真实党派支持率图层均未启用。";
