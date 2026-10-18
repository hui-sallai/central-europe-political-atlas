import type { NetworkMetric } from "@/types/NetworkAnalysis";
import { NETWORK_COVERAGE_THRESHOLD } from "./networkEngine";

export type TradeFlow = "exports" | "imports";
export type TradePartner = { partner: string; iso3: string | null; value: number; share: number };
export type TradeGroup = {
  reporter: string; year: number; flow: TradeFlow; partner_count: number;
  metrics: NetworkMetric | null;
  coverage: { reporter_country?: string; year?: number; flow?: string; eligible_coverage_ratio?: number | null; threshold: number; gate_passed: boolean; world_total: number | null } | null;
  top_partners: TradePartner[];
};
export type TradePack = { schema_version: string; generated_at: string; interpretation_boundary: string; records: TradeGroup[] };
export const TRADE_SOURCE = "https://comtradeplus.un.org/";
export const tradeMetrics = ["partner_hhi", "china_share", "germany_share", "top_partner_share", "diversification", "weighted_trade_volume", "partner_count"] as const;
export type TradeMetric = typeof tradeMetrics[number];
export const shareMetric = (metric: TradeMetric) => ["china_share", "germany_share", "top_partner_share"].includes(metric);
export const tradeUnit = (metric: TradeMetric) => metric === "weighted_trade_volume" ? "current USD" : metric === "partner_count" ? "partners" : shareMetric(metric) ? "fraction (0–1)" : "index (0–1)";

// Read-only presentation guards. Never recompute metrics or promote raw coverage.
export function tradeUnavailable(group: TradeGroup | null | undefined, schema: string): string | null {
  if (schema !== "trade-network-ui-pack-v1.3") return "schema";
  if (!group) return "absent";
  const c = group.coverage, m = group.metrics;
  if (!c) return "coverage_missing";
  if (!Number.isFinite(c.threshold) || c.threshold < NETWORK_COVERAGE_THRESHOLD) return "definition";
  if (c.eligible_coverage_ratio == null || !Number.isFinite(c.eligible_coverage_ratio)) return "eligible_missing";
  if (!c.gate_passed || c.eligible_coverage_ratio < c.threshold) return "coverage_failed";
  if (!m) return "metrics_missing";
  if (![m.partner_hhi,m.top_partner_share,m.diversification,m.weighted_trade_volume,m.partner_count].every(v => typeof v === "number" && Number.isFinite(v))) return "metrics_missing";
  if (m.country !== group.reporter || m.year !== group.year || m.flow !== group.flow || m.sector !== "TOTAL"
    || (c.reporter_country != null && c.reporter_country !== group.reporter)
    || (c.year != null && c.year !== group.year) || (c.flow != null && c.flow !== group.flow)) return "definition";
  return null;
}
export function tradeValue(group: TradeGroup | null | undefined, metric: TradeMetric, schema: string): number | null {
  if (tradeUnavailable(group, schema)) return null;
  const value = group!.metrics![metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
export function latestTradeYear(pack: TradePack | null, reporter: string, flow: TradeFlow): number | null {
  const years = pack?.records.filter(r => r.reporter === reporter && r.flow === flow && !tradeUnavailable(r, pack.schema_version)).map(r => r.year) ?? [];
  return years.length ? Math.max(...years) : null;
}
export function tradeComparable(a: TradeGroup | null | undefined, b: TradeGroup | null | undefined, schema: string, sameYear = true): boolean {
  return !tradeUnavailable(a, schema) && !tradeUnavailable(b, schema) && a!.flow === b!.flow && a!.metrics!.sector === b!.metrics!.sector
    && a!.coverage!.threshold === b!.coverage!.threshold && (sameYear ? a!.year === b!.year : a!.reporter === b!.reporter);
}
export function tradeDifference(a: TradeGroup | null | undefined, b: TradeGroup | null | undefined, metric: TradeMetric, schema: string, sameYear = true): number | null {
  if (!tradeComparable(a, b, schema, sameYear)) return null;
  const av = tradeValue(a, metric, schema), bv = tradeValue(b, metric, schema);
  return av === null || bv === null ? null : av - bv;
}
export function tradeYears(records: TradeGroup[]): number[] {
  const years = records.map(r => r.year).filter(Number.isInteger);
  return years.length ? Array.from({ length: Math.max(...years) - Math.min(...years) + 1 }, (_, i) => Math.min(...years) + i) : [];
}
export function tradeHistory(pack: TradePack, reporter: string, flow: TradeFlow, metric: TradeMetric, years: number[]) {
  return years.map(year => ({ x: year, y: tradeValue(pack.records.find(r => r.reporter === reporter && r.flow === flow && r.year === year), metric, pack.schema_version) }));
}
const csvCell = (value: string | number | null) => `"${(typeof value === "string" ? value.replace(/^[=+@\-\t\r]/, "'$&") : String(value ?? "")).replaceAll('"', '""')}"`;
export function tradeCsv(pack: TradePack, groups: TradeGroup[], metrics: readonly TradeMetric[]) {
  const header = ["reporting_country", "reference_year", "trade_flow", "sector", "metric", "value", "unit", "value_status", "source", "source_url", "coverage_status", "eligible_coverage_ratio", "coverage_threshold", "schema_version", "pack_generated_at", "data_provenance"];
  const rows = groups.filter(g => !tradeUnavailable(g, pack.schema_version)).flatMap(g => metrics.map(metric => [g.reporter, g.year, g.flow, g.metrics!.sector, metric, tradeValue(g, metric, pack.schema_version), tradeUnit(metric), tradeValue(g, metric, pack.schema_version) === null ? "missing_not_zero" : "stored_descriptive_metric", "UN Comtrade", TRADE_SOURCE, "passed", g.coverage!.eligible_coverage_ratio!, g.coverage!.threshold, pack.schema_version, pack.generated_at, "network_ui_pack.json; canonical eligible-partner metrics; not independently reported official indicators"].map(csvCell).join(",")));
  return [header.join(","), ...rows].join("\r\n");
}
