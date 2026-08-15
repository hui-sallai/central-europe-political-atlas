export const platformStatus = {
  version: "v0.89 Regional Economic Depth & Harmonization",
  stage: "区域经济深度与口径统一",
  regionalData: "九个欧盟国家已接入 2021–2024 区域经济与制造业事实；劳动力指标按可直接匹配层级开放，塞尔维亚继续等待可比性验收",
  mapDisplay: "支持经济、劳动力、产业、历史变化与项目上下文；不同层级不混合排名，风险与预测图层未启用",
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
