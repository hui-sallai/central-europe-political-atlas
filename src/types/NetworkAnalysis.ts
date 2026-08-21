export interface TradeEdge {
  edge_id: string;
  reporter_country: string;
  partner_country: string;
  year: number;
  sector: string;
  flow: "exports" | "imports";
  trade_value: number;
  currency: string;
  source: string;
  source_url: string;
  source_reliability: "A" | "B" | "C" | "D";
}

export interface NetworkMetric {
  country: string;
  year: number;
  flow: "exports" | "imports";
  sector: string;
  partner_hhi: number;
  top_partner_share: number;
  china_share: number | null;
  germany_share: number | null;
  diversification: number;
  weighted_degree: number;
  centrality: number;
}
