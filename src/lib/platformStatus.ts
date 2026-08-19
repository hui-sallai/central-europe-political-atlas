import { PLATFORM_RELEASE_DATE, PLATFORM_VERSION } from "./releaseMetadata";

export const platformStatus = {
  version: PLATFORM_VERSION,
  stage: "研究产品收口、引用与发布候选验收",
  regionalData: "九国区域事实用于结构背景；塞尔维亚区域比较继续待接入，不阻断合格国家级情景",
  mapDisplay: "九国事实地图可用；情景影响、风险、预测与真实党派支持率色阶未启用",
  modelLayer: "四项透明模型与四个条件式情景保持原公式；验证、追溯与引用处于启用状态",
  lastUpdated: PLATFORM_RELEASE_DATE,
} as const;

export const platformStatusItems = [
  { label: "当前阶段", value: platformStatus.stage },
  { label: "区域地图数据", value: platformStatus.regionalData },
  { label: "真实地图展示", value: platformStatus.mapDisplay },
  { label: "模型层", value: platformStatus.modelLayer },
] as const;

export const mapDisplayBoundary =
  "事实型区域图层按国家、按图层独立验收；未通过许可、署名、拓扑、主键与数据质量闸门的图层不显示。风险、情景、预测、China Exposure 和真实党派支持率图层均未启用。";
