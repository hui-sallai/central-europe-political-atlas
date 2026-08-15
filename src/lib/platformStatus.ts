export const platformStatus = {
  version: "v0.87 Multi-Country Factual Map Activation",
  stage: "多国事实地图准入与公开展示",
  regionalData: "十国完成逐国 Display Gate Audit；欧盟九国 P0 区域统计保持可追溯，塞尔维亚继续等待官方对应与可比性验收",
  mapDisplay: "九个 EU 国家已按独立图层开放通过验收的事实边界、P0 统计与合格项目区域参考；塞尔维亚仍未启用",
  modelLayer: "国家级模型保持冻结；不生成区域风险分数或预测",
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
