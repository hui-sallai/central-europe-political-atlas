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

/**
 * Deterministic descriptive trade-network metrics. Only network-eligible partner edges
 * enter the metrics: aggregate records (World, "Other Asia/Europe/Africa nes",
 * "Areas nes") stay in the canonical edge file but never become network nodes.
 *
 * partner_degree_ratio = distinct partners of the group / total distinct eligible
 * partners in the dataset. It is a coverage-of-partners ratio, NOT a centrality measure;
 * betweenness / eigenvector / PageRank remain deferred until a complete regional graph
 * is formally defined.
 */
export function calculateNetworkMetrics(edges: TradeEdge[]): NetworkMetric[] {
  const aggregated = aggregateTradeEdges(edges).filter((edge) => edge.network_eligible !== false);
  const groups = new Map<string, TradeEdge[]>();
  for (const edge of aggregated) {
    const key = [edge.reporter_country, edge.year, edge.sector, edge.flow].join(":");
    groups.set(key, [...(groups.get(key) ?? []), edge]);
  }
  const totalEligiblePartners = new Set(aggregated.map((edge) => edge.partner_country)).size;
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, group]) => {
      const [country, year, sector, flow] = key.split(":");
      const total = group.reduce((sum, edge) => sum + edge.trade_value, 0);
      const shares = group
        .map((edge) => ({ partner: edge.partner_country, share: total ? edge.trade_value / total : 0 }))
        .sort((a, b) => b.share - a.share || a.partner.localeCompare(b.partner));
      const findShare = (partner: string) => shares.find((item) => item.partner.toLowerCase() === partner)?.share ?? null;
      const hhi = shares.reduce((sum, item) => sum + item.share ** 2, 0);
      return {
        country,
        year: Number(year),
        sector,
        flow: flow as "exports" | "imports",
        partner_count: new Set(group.map((edge) => edge.partner_country)).size,
        total_eligible_partners: totalEligiblePartners,
        partner_degree_ratio: totalEligiblePartners > 0 ? new Set(group.map((edge) => edge.partner_country)).size / totalEligiblePartners : 0,
        partner_hhi: hhi,
        top_partner: shares[0]?.partner ?? null,
        top_partner_share: shares[0]?.share ?? 0,
        china_share: findShare("china"),
        germany_share: country === "germany" ? null : findShare("germany"),
        diversification: shares.length ? 1 - hhi : 0,
        weighted_trade_volume: total,
      };
    });
}

export const networkInterpretationBoundary = "网络中心性不等于政治影响；贸易集中度不等于经济风险；中国份额不等于政治依赖。";
