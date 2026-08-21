export interface TradeEdge {
  edge_id: string;
  reporter_country: string;
  partner_country: string;
  partner_iso3: string | null;
  year: number;
  sector: string;
  flow: "exports" | "imports";
  trade_value: number;
  currency: string;
  source: string;
  source_url: string;
  source_reliability: "A" | "B" | "C" | "D";
  data_status: "official" | "verified" | "pending";
  network_eligible: boolean;
}

export interface NetworkMetric {
  country: string;
  year: number;
  flow: "exports" | "imports";
  sector: string;
  partner_count: number;
  total_eligible_partners: number;
  partner_degree_ratio: number;
  partner_hhi: number;
  top_partner: string | null;
  top_partner_share: number;
  china_share: number | null;
  germany_share: number | null;
  diversification: number;
  weighted_trade_volume: number;
}
