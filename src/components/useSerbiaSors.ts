"use client";

import { useEffect, useState } from "react";

// Serbia official statistics (SORS) runtime (serbia_sors_runtime.json). Serbia-only descriptive series, shown as their
// own labelled layer; `cross_country_comparable` comes from the audited mapping and gates any cross-country use.
export type SorsPoint = [period: string, normalized: number | null, original: number, status: string, comparable: 0 | 1, crossCountry: 0 | 1];
export type SorsSeries = { key: string; store: "annual" | "monthly"; display_indicator: string; label: string; dataset: string; source_url: string; mapping_status: string; cross_country_comparable: boolean; model_role: string; unit: string | null; original_unit: string | null; status_legend: Record<string, string>; points: SorsPoint[] };

export const sorsSeriesLabels: Record<string, string> = {
  population_estimate_sors: "人口估计（SORS 长序列）",
  average_net_earnings: "平均月净工资（年均）",
  average_gross_earnings: "平均月总工资（年均）",
  goods_exports_usd: "货物出口（海关口径，美元）",
  goods_imports_usd: "货物进口（海关口径，美元）",
  rd_expenditure_gdp: "研发支出占 GDP",
  employment_rate: "就业率（20–64，LFS）",
  industrial_production_index: "工业生产指数（未季调，2021=100）",
  cpi_index_2006: "消费者价格指数 CPI（2006=100，非 HICP）",
  cpi_annual_index: "CPI 同比指数（上年同月=100，非 HICP）",
  lfs_unemployment_quarterly: "LFS 失业率（季度，15–74）",
  average_net_earnings_monthly: "平均净工资（月度）",
  average_gross_earnings_monthly: "平均总工资（月度）",
  retail_trade_volume_sa: "零售贸易量（季调，2021=100）",
  industrial_producer_prices_yoy: "工业生产者价格（上年同月=100）",
  goods_exports_eur_monthly: "货物出口（月度，百万欧元）",
  goods_imports_eur_monthly: "货物进口（月度，百万欧元）",
};

export function useSerbiaSors(basePath: string, enabled: boolean) {
  const [series, setSeries] = useState<SorsSeries[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled || series) return;
    const controller = new AbortController();
    fetch(`${basePath}/research-data/serbia_sors_runtime.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then((payload: { series: SorsSeries[] }) => setSeries(payload.series))
      .catch((error) => { if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true); });
    return () => controller.abort();
  }, [basePath, enabled, series]);
  return { series, state: failed ? "error" : series ? "ready" : enabled ? "loading" : "idle" } as const;
}
