import type { DataStatus, Indicator } from "@/types/researchData";

type PendingIndicator = Omit<Indicator, "status" | "last_updated"> & {
  status: Extract<DataStatus, "pending">;
  last_updated: string;
};

const updatedAt = "2026-08-08";

export const v4PendingModelInputIndicators: PendingIndicator[] = [
  { id: "interest_expenditure_gdp", name: "Interest expenditure", name_zh: "利息支出", category: "fiscal", unit: "% GDP", frequency: "annual", source_type: "Eurostat / national finance ministry", status: "pending", future_model_candidate: true, description: "政府利息支出占 GDP；口径和来源待接入。", last_updated: updatedAt },
  { id: "government_bond_yield", name: "Government bond yield", name_zh: "政府债券收益率", category: "fiscal", unit: "%", frequency: "annual", source_type: "national central bank / ECB", status: "pending", future_model_candidate: true, description: "统一期限的政府债券收益率；期限口径待定义。", last_updated: updatedAt },
  { id: "eu_funds_received", name: "EU funds received", name_zh: "欧盟资金", category: "fiscal", unit: "百万欧元", frequency: "annual", source_type: "European Commission / national government", status: "pending", future_model_candidate: true, description: "年度实际收到的欧盟资金；承诺额与支付额需分开。", last_updated: updatedAt },
  { id: "exports_gdp", name: "Exports to GDP", name_zh: "出口/GDP", category: "external", unit: "% GDP", frequency: "annual", source_type: "Eurostat / national statistics", status: "pending", future_model_candidate: true, description: "出口占 GDP 比重；待统一国民账户口径。", last_updated: updatedAt },
  { id: "imports_gdp", name: "Imports to GDP", name_zh: "进口/GDP", category: "external", unit: "% GDP", frequency: "annual", source_type: "Eurostat / national statistics", status: "pending", future_model_candidate: true, description: "进口占 GDP 比重；待统一国民账户口径。", last_updated: updatedAt },
  { id: "external_debt_gdp", name: "External debt to GDP", name_zh: "外债/GDP", category: "external", unit: "% GDP", frequency: "annual", source_type: "national central bank / Eurostat", status: "pending", future_model_candidate: true, description: "外债占 GDP 比重；部门和总额口径待定义。", last_updated: updatedAt },
  { id: "exchange_rate_eur_lcu", name: "Exchange rate against EUR", name_zh: "兑欧元汇率", category: "external", unit: "本币/欧元", frequency: "annual", source_type: "ECB / national central bank", status: "pending", future_model_candidate: true, description: "年度平均本币兑欧元汇率；欧元区国家不适用。", last_updated: updatedAt },
  { id: "gas_import_dependency", name: "Gas import dependency", name_zh: "天然气进口依赖", category: "energy", unit: "%", frequency: "annual", source_type: "Eurostat energy statistics", status: "pending", future_model_candidate: true, description: "天然气进口依赖度；供应来源拆分待接入。", last_updated: updatedAt },
  { id: "battery_investment", name: "Battery investment", name_zh: "电池产业投资", category: "industry", unit: "百万欧元", frequency: "annual", source_type: "official announcements / company reports", status: "pending", future_model_candidate: true, description: "电池产业项目投资额；只接入可核验金额与年份。", last_updated: updatedAt },
];
