import data from "@/data/high-frequency/high_frequency_observations.json";
import registry from "@/data/high-frequency/high_frequency_definition_registry.json";
import { monthlyIndicators, type MonthlyPayload, type MonthlySource } from "./monthlyComparison";

// A compact presentation projection of canonical records, not a second registry or acquisition pipeline.
export function monthlyComparisonData(): MonthlyPayload {
  const sources: MonthlySource[] = [], keys = new Map<string, number>();
  const rows: MonthlyPayload["rows"] = [];
  for (const r of data.records) {
    if (r.frequency !== "monthly" || !(r.indicator in monthlyIndicators)) continue;
    const rule = registry.records.find(entry => entry.country === r.country && entry.indicator === r.indicator);
    const source: MonthlySource = { unit: r.unit, dataset: r.source_dataset, url: r.source_url, institution: r.source, definition: r.definition_version, semantics: r.value_semantics, adjustment: r.seasonal_adjustment, classification: r.classification_version, base: r.index_reference, vintage: r.vintage_status, updated: r.updated_at, breakStatus: rule?.series_break_status ?? r.series_break_status, eligible: rule?.analysis_eligible ?? true, warning: rule?.notes ?? "" };
    const key = JSON.stringify(source); let index = keys.get(key);
    if (index === undefined) { index = sources.length; keys.set(key, index); sources.push(source); }
    rows.push([r.observation_id, r.country, r.indicator, r.period, r.value, r.data_status, index]);
  }
  return { schema: data.schema_version, sources, rows };
}
