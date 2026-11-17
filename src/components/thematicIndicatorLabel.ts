import type { Bi } from "@/lib/thematicResearch";
import { indicatorNames } from "@/i18n/presentation";

const labels: Record<string, Bi> = {
  industrial_production_index: { en: "Industrial production index", zh: "工业生产指数" },
  goods_exports_eur_monthly: { en: "Monthly goods exports", zh: "月度货物出口" },
  europe_natural_gas_price_usd: { en: "European natural gas benchmark price", zh: "欧洲天然气基准价格" },
  hicp_energy_annual_rate: { en: "HICP energy inflation, year on year", zh: "HICP 能源价格同比涨幅" },
  regional_gdp_per_capita: { en: "Regional GDP per capita", zh: "区域人均 GDP" },
  regional_manufacturing_share: { en: "Regional manufacturing share of gross value added", zh: "区域制造业增加值占比" },
  regional_population_estimate_sors: { en: "SORS regional population estimate", zh: "塞尔维亚统计局区域人口估计" },
  regional_unemployment_rate_2014_2020: { en: "Regional unemployment rate, 2014–2020 definition", zh: "区域失业率（2014–2020 年口径）" },
  labour_productivity_growth: { en: "Labour productivity growth", zh: "劳动生产率增长" },
  trade_openness: { en: "Trade openness", zh: "贸易开放度" },
  battery_investment: { en: "Battery investment", zh: "电池投资" },
  eu_funds_received: { en: "EU funds received", zh: "收到的欧盟资金" },
  gas_import_dependency: { en: "Gas import dependency", zh: "天然气进口依赖度" },
};

export function thematicIndicatorLabel(id: string, en: boolean, name?: Bi | null) {
  const label = name ?? labels[id];
  return label?.[en ? "en" : "zh"] ?? (en ? indicatorNames[id] : undefined) ?? id;
}

export const thematicSourceUrls = (raw: string | null) => (raw ?? "").split(/\s+\|\s+/).filter(url=>/^https?:\/\//.test(url));
