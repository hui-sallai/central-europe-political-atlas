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

const purposes:Record<string,string>={
 "用已经通过质量验收的价格与就业数据，形成可追溯的居民经济压力比较值。":"Use quality-validated price and employment data to construct a traceable household economic pressure comparison.",
 "用财政余额和政府债务的可核验观测，形成第一版财政结构压力比较值。":"Use verifiable fiscal-balance and government-debt observations to construct the first fiscal-structure pressure comparison.",
 "用经常账户与能源进口依赖的可核验观测，形成第一版外部收支和能源依赖比较值。":"Use verifiable current-account and energy-import-dependence observations to compare external balances and energy dependence.",
 "用制造业体量、汽车出口集中、对德国出口依赖和统一口径工业电价，形成可追溯产业结构暴露比较值。":"Use manufacturing scale, automotive-export concentration, dependence on German export markets and consistently defined industrial electricity prices to compare recorded industrial-structure exposure."
};
export function countryModelPurpose(card:ModelCard,locale:"zh-CN"|"en"){return locale==='zh-CN'?card.purpose:purposes[card.purpose]??"Consult the model card for its documented purpose.";}
