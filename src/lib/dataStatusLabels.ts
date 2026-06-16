export type DataStatusKind = "official" | "manual" | "sample" | "pending" | "model" | "missing";

export const dataStatusMeta: Record<DataStatusKind, { label: string; description: string }> = {
  official: {
    label: "官方",
    description: "来自政府、统计部门或官方机构发布的数据。",
  },
  manual: {
    label: "人工整理",
    description: "由人工从公开来源整理，仍需保留来源和复核记录。",
  },
  sample: {
    label: "结构样例，不进入模型",
    description: "仅用于验证页面结构和交互，不作为事实数据，也不进入模型。",
  },
  pending: {
    label: "待接入",
    description: "已预留字段或页面位置，尚未接入可信来源。",
  },
  model: {
    label: "模型计算",
    description: "由模型或算法生成的指标，必须与真实数据分开呈现。",
  },
  missing: {
    label: "缺失",
    description: "当前口径下未取得可用数据。",
  },
};
