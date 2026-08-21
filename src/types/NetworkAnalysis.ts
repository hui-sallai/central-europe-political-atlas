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
  partner_hhi: number;
  top_partner: string | null;
  top_partner_share: number;
  china_share: number | null;
  germany_share: number | null;
  diversification: number;
  weighted_trade_volume: number;
}

export interface NetworkCoverageRecord {
  reporter_country: string;
  year: number;
  flow: "exports" | "imports";
  world_total: number | null;
  raw_partner_sum: number;
  eligible_partner_sum: number;
  raw_coverage_ratio: number | null;
  eligible_coverage_ratio: number | null;
  threshold: number;
  gate_passed: boolean;
}
