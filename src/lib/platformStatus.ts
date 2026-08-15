export const platformStatus = {
  version: "v0.86 Spatial Data Completion",
  stage: "十国空间覆盖审计、P0 区域事实与图层独立闸门",
  regionalData: "十国边界主键已完成一对一审计；欧盟九国 P0 区域统计已接入，塞尔维亚保持可比性待验收",
  mapDisplay: "仅匈牙利通过的事实边界与 P0 图层可用；其余国家按图层显示未通过原因",
  modelLayer: "国家级模型保持冻结；不生成区域风险分数或预测",
  lastUpdated: "2026-08-14",
} as const;

export const platformStatusItems = [
  { label: "当前阶段", value: platformStatus.stage },
  { label: "区域地图数据", value: platformStatus.regionalData },
  { label: "真实地图展示", value: platformStatus.mapDisplay },
  { label: "模型层", value: platformStatus.modelLayer },
] as const;

export const mapDisplayBoundary =
  "事实型区域图层按国家、按图层独立验收；未通过许可、拓扑、主键与数据质量闸门的图层不显示。风险图层、情景图层、预测图层和真实党派支持率图层均未启用。";
