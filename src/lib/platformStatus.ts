import { PLATFORM_RELEASE_DATE, PLATFORM_STAGE, PLATFORM_VERSION } from "./releaseMetadata";

export const platformStatus = {
  version: PLATFORM_VERSION,
  stage: PLATFORM_STAGE,
  regionalData: "9-country factual regional comparison; Serbia regional pending",
  mapDisplay: "九国事实地图可用；情景影响、风险、预测与真实党派支持率色阶未启用",
  modelLayer: "4 transparent models; 4 conditional scenarios; validation active",
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
