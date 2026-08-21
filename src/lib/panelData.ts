import coverageJson from "@/data/panel/panel_coverage.json";
import type { PanelCoverageRecord } from "@/types/PanelAnalysis";

export const panelCoverage = coverageJson.records as PanelCoverageRecord[];
export const panelGate = coverageJson.panel_gate;

export const panelIndicatorLabels: Record<string, string> = {
  real_gdp_growth: "GDP 实际增长",
  gdp_per_capita: "人均 GDP（当年美元）",
  consumer_price_inflation: "居民消费价格通胀",
  unemployment_rate: "失业率",
  employment_rate: "就业人口比率",
  government_debt_gdp: "中央政府债务 / GDP",
  fiscal_balance_gdp: "现金财政余额 / GDP",
  current_account_gdp: "经常账户 / GDP",
  manufacturing_share_gdp: "制造业增加值 / GDP",
  energy_import_dependency: "净能源进口 / 能源使用",
  fdi_gdp: "FDI 净流入 / GDP",
  exports_gdp: "出口 / GDP",
  imports_gdp: "进口 / GDP",
};

export const panelRunnableIndicators = panelCoverage
  .filter((record) => record.gate_qualified)
  .map((record) => record.indicator);
