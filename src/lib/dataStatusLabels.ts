import type { DataStatus } from "@/types/DataStatus";

export type DataStatusKind = DataStatus;
export type DisplayDataStatus = DataStatus | "manual" | "missing";

export const dataStatusMeta: Record<DisplayDataStatus, { label: string; description: string }> = {
  official: {
    label: "正式数据",
    description: "已作为页面当前正式显示数据使用；仍需保留来源和更新时间。",
  },
  verified: {
    label: "已核验",
    description: "来源或记录已经复核，但仍需满足具体分析或模型的准入条件。",
  },
  manual: {
    label: "待核验",
    description: "兼容既有人工整理记录；进入统一数据层前必须转换为 verified 或 pending。",
  },
  sample: {
    label: "结构样例，不进入模型",
    description: "仅用于验证页面结构和交互，不作为事实数据，也不进入模型。",
  },
  pending: {
    label: "待接入",
    description: "已预留字段或页面位置，尚未接入可信来源。",
  },
  placeholder: {
    label: "占位内容",
    description: "仅说明未来承接位置，不表达事实数值，也不进入分析。",
  },
  calculated: {
    label: "计算值",
    description: "由可追溯原始值按记录的方法计算，必须保留计算说明。",
  },
  derived: {
    label: "派生值",
    description: "用于事实比较或变化描述，不代表风险判断或预测。",
  },
  missing: {
    label: "待接入",
    description: "兼容既有空值展示；统一观测值层使用 pending 和 null 表示。",
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
