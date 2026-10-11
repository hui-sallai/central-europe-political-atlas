import type { Observation } from "@/types/Observation";

export type AnnualHistory = { sources: { dataset: string; url: string }[]; records: [string, string, number, number, string, string, number][] };
export type AnnualPoint = Pick<Observation, "country_slug" | "indicator" | "year" | "value" | "unit" | "status" | "source_name" | "source_url"> & { comparable: boolean; layer: string; differenceComparable?: boolean };

/** Historical backfill is descriptive only. Even pending canonical rows take precedence. */
export function annualPoints(observations: Observation[], history: AnnualHistory | null): AnnualPoint[] {
  const points: AnnualPoint[] = observations.map(o => ({ ...o, comparable: o.comparability_status !== "definition_mismatch" && o.comparability_status !== "not_applicable" && o.applicability_status !== "not_applicable", differenceComparable: o.comparability_status === "comparable", layer: "published snapshot" }));
  const keys = new Set(points.map(p => `${p.country_slug}:${p.indicator}:${p.year}`));
  for (const [country_slug, indicator, year, value, unit, status, ref] of history?.records ?? []) {
    const source = history?.sources[ref];
    const key = `${country_slug}:${indicator}:${year}`;
    if (keys.has(key) || !source || !Number.isFinite(value)) continue;
    points.push({ country_slug, indicator, year, value, unit, status: status as Observation["status"], source_name: source.dataset, source_url: source.url, comparable: true, differenceComparable: true, layer: "descriptive annual history" });
    keys.add(key);
  }
  return points;
}

const relativeLevels = new Set(["gdp_current_eur", "gdp_per_capita_eur", "population", "exports_goods_services", "imports_goods_services"]);
export function annualDifference(baseline: AnnualPoint | null, point: AnnualPoint | null) {
  if (!baseline || !point || !baseline.comparable || !point.comparable || baseline.differenceComparable === false || point.differenceComparable === false || baseline.status === "pending" || point.status === "pending" || baseline.value === null || point.value === null || !Number.isFinite(baseline.value) || !Number.isFinite(point.value) || baseline.year !== point.year || baseline.unit !== point.unit || baseline.indicator !== point.indicator) return null;
  const absolute = point.value - baseline.value;
  return { absolute, relative: relativeLevels.has(point.indicator) && baseline.value > 0 && point.value >= 0 ? absolute / baseline.value * 100 : null };
}

export function annualCsv(points: AnnualPoint[]) {
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    // Treat source/label strings as text in spreadsheet applications.
    const safe = typeof value === "string" && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [["country", "indicator", "year", "value", "unit", "status", "source", "source_url", "layer"], ...points.map(p => [p.country_slug, p.indicator, p.year, p.value, p.unit, p.status, p.source_name, p.source_url, p.layer])].map(row => row.map(escape).join(",")).join("\r\n");
}
