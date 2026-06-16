export type DataStatusKind = "official" | "manual" | "sample" | "pending" | "missing";

export const dataStatusMeta: Record<DataStatusKind, { label: string; description: string }> = {
  official: {
    label: "正式数据",
    description: "已作为页面当前正式显示数据使用；仍需保留来源和更新时间。",
  },
  manual: {
    label: "待核验",
    description: "已人工整理或预填，但尚未完成来源复核，不作为最终事实口径。",
  },
  sample: {
    label: "结构样例，不进入模型",
    description: "仅用于验证页面结构和交互，不作为事实数据，也不进入模型。",
  },
  pending: {
    label: "待接入",
    description: "已预留字段或页面位置，尚未接入可信来源。",
  },
  missing: {
    label: "待接入",
    description: "当前口径下未取得可用数据，后续接入来源后再显示。",
  },
};

export type SourceStatusKind = "official" | "manual" | "sample" | "pending";

export const sourceStatusMeta: Record<SourceStatusKind, { label: string; description: string }> = {
  official: {
    label: "来源状态：官方",
    description: "来源为政府、统计部门、选举机构或其他官方机构。",
  },
  manual: {
    label: "来源状态：人工整理",
    description: "来源由人工从公开材料整理，仍需保留复核记录。",
  },
  sample: {
    label: "来源状态：样例",
    description: "来源字段仅用于页面结构展示，不作为事实来源。",
  },
  pending: {
    label: "来源状态：待接入",
    description: "尚未接入明确来源链接或来源机构。",
  },
};
