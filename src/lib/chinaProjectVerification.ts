import type { ChinaProjectRecord } from "./extendedData";

export type ChinaProjectVerificationConclusion = "quantifiable" | "partially_quantifiable" | "background_only" | "excluded";

export type ChinaProjectVerificationResult = {
  conclusion: ChinaProjectVerificationConclusion;
  reason: string;
  rule: string;
  hasAmount: boolean;
  hasActors: boolean;
  hasYear: boolean;
  hasReliableSource: boolean;
  hasClearEvent: boolean;
};

function hasMeaningfulActor(value: string) {
  return Boolean(value.trim()) && !value.includes("待接入") && !value.includes("待核验");
}

function hasReliableSource(project: ChinaProjectRecord) {
  return Boolean(project.sourceUrl) && project.sourceReliabilityLevel !== "D";
}

function hasClearEvent(project: ChinaProjectRecord) {
  return Boolean(project.projectStatus.trim()) && project.statusTimeline.length > 0;
}

export function verifyChinaProject(project: ChinaProjectRecord): ChinaProjectVerificationResult {
  const hasAmount = project.amount !== null && Boolean(project.currency);
  const hasActors = hasMeaningfulActor(project.chineseActor) && hasMeaningfulActor(project.localActor);
  const hasYear = Boolean(project.year.trim()) && !project.year.includes("待");
  const reliableSource = hasReliableSource(project);
  const clearEvent = hasClearEvent(project);

  if (!reliableSource) {
    return {
      conclusion: "excluded",
      reason: "来源缺失或可靠性为 D 级，不能进入正式分析。",
      rule: "无可靠来源 = 不进入分析",
      hasAmount,
      hasActors,
      hasYear,
      hasReliableSource: reliableSource,
      hasClearEvent: clearEvent,
    };
  }

  if (hasAmount && hasActors && hasYear) {
    return {
      conclusion: "quantifiable",
      reason: "已具备金额、主体、年份和可点击来源，可作为项目级量化候选；进入正式分析前仍需复核金额口径。",
      rule: "有金额 + 有主体 + 有年份 + 有来源 = 可量化",
      hasAmount,
      hasActors,
      hasYear,
      hasReliableSource: reliableSource,
      hasClearEvent: clearEvent,
    };
  }

  if (clearEvent && hasActors) {
    return {
      conclusion: "partially_quantifiable",
      reason: "事件、主体、年份或来源基本明确，但金额、股比、产能、TEU 或合同口径尚未补齐，只能做事件型或结构型变量候选。",
      rule: "无金额但有明确事件和主体 = 部分可量化",
      hasAmount,
      hasActors,
      hasYear,
      hasReliableSource: reliableSource,
      hasClearEvent: clearEvent,
    };
  }

  return {
    conclusion: "background_only",
    reason: "当前记录主要提供项目线索或背景信息，缺少可稳定量化的金额、主体链条或事件口径。",
    rule: "只有新闻线索 = 仅作背景",
    hasAmount,
    hasActors,
    hasYear,
    hasReliableSource: reliableSource,
    hasClearEvent: clearEvent,
  };
}

export function chinaProjectVerificationLabel(value: ChinaProjectVerificationConclusion) {
  const labels: Record<ChinaProjectVerificationConclusion, string> = {
    quantifiable: "可量化",
    partially_quantifiable: "部分可量化",
    background_only: "仅作背景",
    excluded: "不进入分析",
  };

  return labels[value];
}
