import type { NetworkMetric, TradeEdge } from "@/types/NetworkAnalysis";

export function aggregateTradeEdges(edges: TradeEdge[]) {
  const grouped = new Map<string, TradeEdge>();
  for (const edge of edges) {
    const key = [edge.reporter_country, edge.partner_country, edge.year, edge.sector, edge.flow, edge.currency].join(":");
    const existing = grouped.get(key);
    grouped.set(key, existing ? { ...existing, trade_value: existing.trade_value + edge.trade_value } : { ...edge });
  }
  return [...grouped.values()];
}

export function calculateNetworkMetrics(edges: TradeEdge[]): NetworkMetric[] {
  const aggregated = aggregateTradeEdges(edges);
  const groups = new Map<string, TradeEdge[]>();
  for (const edge of aggregated) {
    const key = [edge.reporter_country, edge.year, edge.sector, edge.flow].join(":");
    groups.set(key, [...(groups.get(key) ?? []), edge]);
  }
  const allCountries = new Set(aggregated.flatMap((edge) => [edge.reporter_country, edge.partner_country]));
  return [...groups.entries()].map(([key, group]) => {
    const [country, year, sector, flow] = key.split(":");
    const total = group.reduce((sum, edge) => sum + edge.trade_value, 0);
    const shares = group.map((edge) => ({ partner: edge.partner_country, share: total ? edge.trade_value / total : 0 }));
    const findShare = (partner: string) => shares.find((item) => item.partner.toLowerCase() === partner)?.share ?? null;
    return {
      country,
      year: Number(year),
      sector,
      flow: flow as "exports" | "imports",
      partner_hhi: shares.reduce((sum, item) => sum + item.share ** 2, 0),
      top_partner_share: Math.max(...shares.map((item) => item.share), 0),
      china_share: findShare("china"),
      germany_share: country === "germany" ? null : findShare("germany"),
      diversification: shares.length ? 1 - shares.reduce((sum, item) => sum + item.share ** 2, 0) : 0,
      weighted_degree: total,
      centrality: allCountries.size > 1 ? new Set(group.map((edge) => edge.partner_country)).size / (allCountries.size - 1) : 0,
    };
  });
}

export const networkInterpretationBoundary = "网络中心性不等于政治影响；贸易集中度不等于经济风险；中国份额不等于政治依赖。";
