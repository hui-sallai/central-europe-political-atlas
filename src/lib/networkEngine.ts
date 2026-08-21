import type { NetworkCoverageRecord, NetworkMetric, TradeEdge } from "@/types/NetworkAnalysis";

export const NETWORK_COVERAGE_THRESHOLD = 0.95;

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
 * Formal network coverage gate (v1.3 definition):
 *   eligible_coverage_ratio = sum(network_eligible partner values) / world_total >= 0.95
 * raw_coverage_ratio (all non-World partners, including aggregate records) is QA-only and
 * must never promote a group into the formal network. Aggregate partners must not help
 * the gate pass.
 */
export function computeCoverageGate(edges: TradeEdge[], threshold = NETWORK_COVERAGE_THRESHOLD): NetworkCoverageRecord[] {
  const groups = new Map<string, TradeEdge[]>();
  for (const edge of edges) {
    const key = `${edge.reporter_country}:${edge.year}:${edge.flow}`;
    groups.set(key, [...(groups.get(key) ?? []), edge]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, group]) => {
      const [reporter, year, flow] = key.split(":");
      const world = group.find((edge) => edge.partner_country === "world");
      const rawPartnerSum = group.filter((edge) => edge.partner_country !== "world").reduce((sum, edge) => sum + edge.trade_value, 0);
      const eligiblePartnerSum = group.filter((edge) => edge.network_eligible).reduce((sum, edge) => sum + edge.trade_value, 0);
      const worldTotal = world && world.trade_value > 0 ? world.trade_value : null;
      const rawRatio = worldTotal ? rawPartnerSum / worldTotal : null;
      const eligibleRatio = worldTotal ? eligiblePartnerSum / worldTotal : null;
      return {
        reporter_country: reporter,
        year: Number(year),
        flow: flow as "exports" | "imports",
        world_total: worldTotal,
        raw_partner_sum: rawPartnerSum,
        eligible_partner_sum: eligiblePartnerSum,
        raw_coverage_ratio: rawRatio === null ? null : Number(rawRatio.toFixed(6)),
        eligible_coverage_ratio: eligibleRatio === null ? null : Number(eligibleRatio.toFixed(6)),
        threshold,
        gate_passed: eligibleRatio !== null && eligibleRatio >= threshold,
      };
    });
}

/**
 * Deterministic descriptive trade-network metrics. Only network-eligible partner edges
 * enter the metrics: aggregate records (World, "Other Asia/Europe/Africa nes",
 * "Areas nes") stay in the canonical edge file but never become network nodes.
 *
 * Metrics are descriptive only: partner_count is a plain count, and no field in this
 * output is a general centrality measure. betweenness / eigenvector / PageRank remain
 * deferred until a complete regional graph is formally defined.
 */
export function calculateNetworkMetrics(edges: TradeEdge[]): NetworkMetric[] {
  const aggregated = aggregateTradeEdges(edges).filter((edge) => edge.network_eligible !== false);
  const groups = new Map<string, TradeEdge[]>();
  for (const edge of aggregated) {
    const key = [edge.reporter_country, edge.year, edge.sector, edge.flow].join(":");
    groups.set(key, [...(groups.get(key) ?? []), edge]);
  }
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
