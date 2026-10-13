import type { ModelCard } from "@/types/ModelOutput";

// Faithful presentation translations of the existing Model Card interpretations; not new conclusions.
const meanings: Record<string, string> = {
  "分数越高，表示当前价格和就业两个维度的观测组合对应更高的居民经济压力。": "A higher score represents greater household economic pressure in the observed price and employment dimensions.",
  "分数越高，表示当前赤字和债务两个维度的观测组合对应更高的财政压力。": "A higher score represents greater fiscal pressure in the observed deficit and debt dimensions.",
  "分数越高，表示当前外部收支与能源进口依赖两个维度的观测组合对应更高的外部脆弱性。": "A higher score represents greater external vulnerability in the observed external-balance and energy-import-dependence dimensions.",
  "分数越高，表示已纳入维度中的制造业、汽车出口、德国市场与工业能源成本暴露组合更集中；不代表产业政策优劣或危机概率。": "A higher score represents more concentrated exposure across the included manufacturing, automotive-export, German-market and industrial-energy-cost dimensions; it does not indicate industrial-policy quality or crisis probability.",
};

export function countryModelMeaning(card: ModelCard, locale: "zh-CN" | "en") {
  return locale === "zh-CN" ? card.output_meaning : meanings[card.output_meaning] ?? "The model's interpretation is not translated here; consult its methodological details.";
}

export function countryModelRange(card: ModelCard): string | null {
  return card.calculation_logic.includes("0–100") ? "0–100" : null;
}
