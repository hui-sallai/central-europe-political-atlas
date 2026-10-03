import { attributionLines } from "@/lib/sourceAttribution";
import { PLATFORM_BASE_URL, PLATFORM_NAME, PLATFORM_VERSION, platformCitation } from "./releaseMetadata";
import { englishUnit } from "@/i18n/presentation";
import type { ZipFile } from "./clientZip";
import type { Locale } from "@/i18n/config";

export type SnapshotSource = {
  institution: string; dataset: string; source_url: string; source_code?: string;
  retrieved_at?: string; updated_at?: string; unit?: string; original_unit?: string;
  definition?: string; reliability?: string; status?: string; source_layer: string;
};
export type SnapshotRow = {
  id: string; country: string; indicator: string; period: string; value: number | null;
  unit: string; layer: string; status: string; source?: SnapshotSource;
  cross_country_comparable?: boolean; [key: string]: unknown;
};
export type SnapshotInput = {
  locale?: Locale;
  title: string; view_type: "annual" | "high_frequency" | "macro_drivers" | "country_comparison" | "regional_map" | "serbia_sors";
  page_path: string; shareable_view_url: string; countries: string[]; indicators: string[];
  filters: Record<string, unknown>; comparison?: Record<string, unknown>; rows: SnapshotRow[];
  limitations?: string[]; comparability_status?: string; figure?: { name: "figure.svg" | "map.svg"; svg: string; metadata: Record<string, unknown> };
};
export const SNAPSHOT_SCHEMA = "atlas-descriptive-snapshot-v1";
export function currentSnapshotUrl(path: string, filters?: Record<string, string | number | boolean>): string {
  const url = new URL(path, PLATFORM_BASE_URL);
  if (filters) for (const [key, value] of Object.entries(filters)) url.searchParams.set(key, String(value));
  else url.search = window.location.search;
  return url.href;
}
export function sourceInstitution(label: string, url: string): string {
  if (/stat\.gov\.rs|SORS|RZS/i.test(`${label} ${url}`)) return "Statistical Office of the Republic of Serbia (SORS/RZS)";
  if (/eurostat|ec\.europa\.eu/i.test(`${label} ${url}`)) return "Eurostat";
  return label;
}
const boundary = "当前视图的描述性观测快照；正式观测标签标识数据层来源，不代表本快照发布模型结果。历史与 SORS 描述性数据不进入模型。快照不提供因果、预测或政策评价结论。";
// Spreadsheet formula-injection guard: text cells starting with = + - @ or a control character get a leading
// apostrophe. Numbers and numeric strings are left unchanged; missing values stay empty.
const numericText = /^[+-]?(\d+([.,]\d+)?|[.,]\d+)([eE][+-]?\d+)?$/;
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (typeof value === "string" && !numericText.test(value.trim()) && /^[\s]*[=+@-]|^[\t\r\n]/.test(value)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  return [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\r\n") + "\r\n";
}
export function sanitizeFilename(value: string): string {
  return value.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^[. -]+|[. -]+$/g, "").slice(0, 160) || "snapshot";
}
const sourceFields = ["source_id", "institution", "dataset", "source_url", "source_code", "retrieved_at", "updated_at", "unit", "original_unit", "definition", "reliability", "status", "source_layer"];
export function buildSnapshot(input: SnapshotInput, generatedAt = new Date().toISOString()) {
  const locale = input.locale ?? "zh-CN";
  const en = locale === "en";
  const localizedBoundary = en ? "A descriptive snapshot of the current observations. Formal-observation labels identify the source data layer, not publication of model results. Historical and SORS descriptive data are excluded from models. This snapshot provides no causal, forecasting or policy-evaluation conclusions." : boundary;
  if (!Number.isFinite(new Date(generatedAt).getTime())) throw new Error("Invalid snapshot date");
  if (input.view_type === "country_comparison" && input.rows.some((row) => row.cross_country_comparable === false)) throw new Error("Non-comparable country observations");
  const sources: Record<string, unknown>[] = [];
  const sourceIds = new Map<string, string>();
  const dataRows = input.rows.map(({ source, ...row }) => {
    let sourceId = "";
    if (source) {
      const normalized = Object.fromEntries(sourceFields.slice(1).map((key) => [key, source[key as keyof SnapshotSource] ?? ""]));
      const key = JSON.stringify(normalized);
      sourceId = sourceIds.get(key) ?? `source-${sources.length + 1}`;
      if (!sourceIds.has(key)) { sourceIds.set(key, sourceId); sources.push({ source_id: sourceId, ...normalized }); }
    }
    return { ...row, source_id: sourceId };
  });
  const baseHeaders = ["id", "country", "indicator", "period", "value", "unit", "layer", "status", "source_id", "cross_country_comparable"];
  const headers = [...baseHeaders, ...[...new Set(dataRows.flatMap((row) => Object.keys(row)))].filter((key) => !baseHeaders.includes(key)).sort()];
  const periods = input.rows.map((row) => row.period).filter(Boolean).sort();
  const units = [...new Set(input.rows.map((row) => row.unit))];
  const layers = [...new Set(input.rows.map((row) => row.layer))];
  const date = generatedAt.slice(0, 10);
  const canonicalUrl = new URL(input.page_path, PLATFORM_BASE_URL).href;
  const citation = en ? `${PLATFORM_NAME}. ${PLATFORM_VERSION}. Accessed ${date}. ${canonicalUrl}\n${input.title}, current descriptive view, ${periods[0] ?? "no period"}–${periods.at(-1) ?? "no period"}, ${input.rows.length} observations. Exported ${date}.\n${input.shareable_view_url}\n` : `${platformCitation(date)}\n${input.title}，当前描述性视图，${periods[0] ?? "无时期"}–${periods.at(-1) ?? "无时期"}，${input.rows.length} 条观测。导出日期 ${date}。\n${input.shareable_view_url}\n`;
  const limitations = [...new Set([
    en ? "Missing CSV values are blank; explicit missing status is retained. No zero-filling or interpolation." : "缺失值在 CSV 中留空；缺失状态保留，不补零、不插值。",
    en ? "The filtered view reflects the data version at access time. Subsequent official revisions may change data at the same link." : "当前筛选结果是访问时的数据版本；日后官方修订可能改变同一链接的数据。",
    ...(input.rows.some((row) => row.cross_country_comparable === false) ? [en ? "Contains records that are not cross-country comparable; describe only within their original country and definition." : "包含不可跨国比较的记录；仅在原国家与原定义内描述。"] : []),
    ...(input.limitations ?? []),
  ])];
  const inventory = ["README.md", "manifest.json", "data.csv", "sources.csv", "citation.txt", "view-url.txt", ...(input.figure ? [input.figure.name] : [])];
  const attributions = attributionLines(en ? "en" : "zh", ...sources.flatMap((source) => [String(source.institution ?? ""), String(source.dataset ?? ""), String(source.source_url ?? "")]));
  const manifest = {
    schema: SNAPSHOT_SCHEMA, locale, title: input.title, generated_at: generatedAt,
    platform_name: PLATFORM_NAME, platform_version: PLATFORM_VERSION, view_type: input.view_type,
    filters: input.filters, comparison: input.comparison ?? {}, countries: input.countries, indicators: input.indicators,
    time_range: { from: periods[0] ?? null, to: periods.at(-1) ?? null }, units,
    observation_count: input.rows.length, data_layers: layers,
    layer_status: "descriptive_export_only_no_formal_model_results",
    source_ids: sources.map((source) => source.source_id), sources,
    comparability_status: input.comparability_status ?? "within_selected_series_only",
    missing_value_policy: "blank_csv_value_with_explicit_status_never_zero_filled",
    methodology_boundary: localizedBoundary, known_limitations: limitations,
    canonical_url: canonicalUrl, shareable_view_url: input.shareable_view_url,
    source_attributions: attributions,
    citation, figure: input.figure?.metadata ?? null, files: inventory,
  };
  const readme = en ? `# ${input.title}\n\n${localizedBoundary}\n\n- Countries / scope: ${input.countries.join(", ")}\n- Indicators: ${input.indicators.join(", ")}\n- Period: ${periods[0] ?? "none"}–${periods.at(-1) ?? "none"}\n- Units (English labels): ${units.map(englishUnit).join(" / ")}\n- Observation count: ${input.rows.length}\n- Data layers: ${layers.join(" / ")}\n- Source institutions: ${[...new Set(sources.map(source => source.institution))].join(" / ")}\n- Comparability: ${manifest.comparability_status}\n- Access / export date: ${generatedAt}\n- Atlas: ${canonicalUrl}\n- Current view: ${input.shareable_view_url}\n\n## Comparison and coverage limitations\n\n${limitations.map(note => `- ${note}`).join("\n")}\n\n## Source attribution\n\n${attributions.length ? attributions.map((line) => `- ${line}`).join("\n") : "- See sources.csv."}\n\n## Files\n\n${inventory.map(name => `- ${name}`).join("\n")}\n\nFilters, sorting, data layers and figure metadata are recorded in manifest.json. The source_id in data.csv refers to sources.csv. Unknown source metadata are blank. Raw CSV and manifest units, source metadata and provenance are retained without translation; the unit labels above are presentation-only.\n` : `# ${input.title}\n\n${boundary}\n\n- 国家 / 范围：${input.countries.join("、")}\n- 指标：${input.indicators.join("、")}\n- 时期：${periods[0] ?? "无"}–${periods.at(-1) ?? "无"}\n- 单位：${units.join(" / ")}\n- 观测数：${input.rows.length}\n- 数据层：${layers.join(" / ")}\n- 来源机构：${[...new Set(sources.map((source) => source.institution))].join(" / ")}\n- 跨国可比状态：${manifest.comparability_status}\n- 访问 / 导出日期：${generatedAt}\n- Atlas：${canonicalUrl}\n- 当前视图：${input.shareable_view_url}\n\n## 比较与覆盖限制\n\n${limitations.map((note) => `- ${note}`).join("\n")}\n\n## 来源署名\n\n${attributions.length ? attributions.map((line) => `- ${line}`).join("\n") : "- 见 sources.csv。"}\n\n## 文件\n\n${inventory.map((name) => `- ${name}`).join("\n")}\n\n筛选、排序、数据层与图形元数据记录在 manifest.json；data.csv 的 source_id 对应 sources.csv。来源元数据未知时留空。\n`;
  const files: ZipFile[] = [
    { name: "README.md", content: readme }, { name: "manifest.json", content: JSON.stringify(manifest, null, 2) + "\n" },
    { name: "data.csv", content: toCsv(headers, dataRows) }, { name: "sources.csv", content: toCsv(sourceFields, sources) },
    { name: "citation.txt", content: citation }, { name: "view-url.txt", content: input.shareable_view_url + "\n" },
    ...(input.figure ? [{ name: input.figure.name, content: input.figure.svg }] : []),
  ];
  const filename = `${sanitizeFilename(`central-europe-atlas_${input.countries.join("-")}_${input.indicators.join("-")}_${periods[0] ?? "na"}-${periods.at(-1) ?? "na"}`)}_${date}.zip`;
  return { manifest, files, filename, generatedAt };
}
