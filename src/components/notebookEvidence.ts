import type { EvidenceDraft, NotebookMetadata, NotebookSource } from "@/lib/researchNotebook";
import { safeNotebookUrl } from "@/lib/researchNotebook";
import type { SnapshotInput, SnapshotRow } from "@/lib/researchSnapshot";
export const notebookBoundary = {
  "zh-CN": "仅整理描述性证据或方法参考；不生成模型结果、因果结论、预测或政策评价。实时视图不冻结后续修订。",
  en: "Descriptive evidence or method references only; no model findings, causal conclusions, forecasts or policy evaluations. Live views do not freeze later revisions.",
};
function sources(rows: SnapshotRow[]): Omit<NotebookSource,"id">[] {
  const result = new Map<string,Omit<NotebookSource,"id">>();
  for (const row of rows) if (row.source) {
    if (!safeNotebookUrl(row.source.source_url)) throw Error("Unsafe or incomplete source URL");
    const s = row.source; const value = { institution: s.institution, dataset: s.dataset, url: s.source_url, layer: s.source_layer, ...(s.source_code ? { code: s.source_code } : {}), ...(s.original_unit ? { original_unit: s.original_unit } : {}), ...(s.unit ? { normalized_unit: s.unit } : {}), ...(s.retrieved_at ? { retrieved_at: s.retrieved_at } : {}), ...(s.updated_at ? { updated_at: s.updated_at } : {}) };
    result.set(JSON.stringify(value),value);
  }
  if (result.size > 100) throw Error("Too many sources for a view; narrow filters");
  return [...result.values()];
}
export function notebookObservation(row: SnapshotRow, url: string, title: string): EvidenceDraft {
  return { type: "observation", title, url, canonical_ids: [row.indicator,row.id], countries: [row.country], periods: [row.period], value: row.value, unit: row.unit, sources: sources([row]), layer: row.layer, comparability: row.cross_country_comparable === true ? "canonical_comparable" : row.cross_country_comparable === false ? "not_cross_country_comparable" : "not_promoted_by_notebook", warnings: [notebookBoundary.en], warning_labels: { "zh-CN": [notebookBoundary["zh-CN"]], en: [notebookBoundary.en] }, metadata: { status: row.status } };
}
export function notebookSnapshotView(input: SnapshotInput): EvidenceDraft {
  const periods = [...new Set(input.rows.map(r => r.period).filter(Boolean))].sort();
  const layers = [...new Set(input.rows.map(r => r.layer))]; const isMap = input.view_type === "regional_map";
  const filters: NonNullable<NotebookMetadata["filters"]> = {};
  for (const [k,v] of Object.entries(input.filters)) if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || Array.isArray(v) && v.every(x => typeof x === "string")) filters[k] = v as string | number | boolean | string[];
  const type = isMap ? "map_view" : input.view_type === "country_comparison" ? "country_comparison" : "series_view";
  const labels = { "zh-CN": `${input.countries.join(" / ")} · ${type === "map_view" ? "地图视图" : type === "country_comparison" ? "国家对比" : "序列视图"}`, en: `${input.countries.join(" / ")} · ${type === "map_view" ? "Map view" : type === "country_comparison" ? "Country comparison" : "Series view"}` };
  return { type, title: input.title, labels, url: input.shareable_view_url, canonical_ids: input.indicators, countries: input.countries, periods: periods.length ? [periods[0], periods.at(-1)!] : [], sources: sources(input.rows), layer: layers.join("|").slice(0,100) || input.view_type, comparability: input.comparability_status ?? "separate_source_definitions_not_promoted", warnings: [notebookBoundary.en, ...(input.limitations ?? [])], warning_labels: { en: [notebookBoundary.en, ...(input.limitations ?? [])], "zh-CN": [notebookBoundary["zh-CN"], ...(input.limitations ?? [])] }, metadata: { filters, row_count: input.rows.length, coverage: periods.length ? [periods[0],periods.at(-1)!] : [], ...(isMap ? { classification: String(filters.classification ?? ""), selected_regions: Array.isArray(filters.selected_regions) ? filters.selected_regions : [], legend: input.figure?.metadata.legend ? (input.figure.metadata.legend as {label:string}[]).map(i => i.label) : [], geography: input.figure?.metadata.geographies ? (input.figure.metadata.geographies as {country:string;classification:string;level:string}[]).map(g => `${g.country}:${g.classification}:${g.level}`) : [] } : {}) } };
}
