import type { Locale } from "@/i18n/config";
import { notebookMessages } from "@/content/notebookMessages";
import { serializeNotebook, type ResearchNotebook } from "./researchNotebook";
import { atlasItemTarget, externalSourceLink } from "./safeNavigation";

const en = {
  title: "Source-linked evidence brief", open: "Preview and export an evidence brief",
  export: "Export Evidence Brief (Markdown)", select: "Evidence included in the brief",
  all: "Select all", none: "Deselect all", selected: "Selected evidence", preview: "Brief preview",
  selectionNote: "Selection and brief order apply only to this page, not to the saved notebook or JSON backup.",
  boundary: "An evidence collection with user-authored notes, not an automatically generated article or conclusion. Temporal relationships do not establish causality. Recorded research layers remain separate; values are not combined or re-estimated.",
  live: "Atlas research links are live configurations, not frozen datasets. Sources and available values may be revised after collection. This brief contains only stored notebook metadata; missing values are not retrieved or estimated.",
  empty: "Select at least one collected item to preview and export a brief.",
  question: "Research question", scope: "Scope and dates", notebookCountries: "Notebook countries (recorded)",
  includedCountries: "Countries in selected evidence", periods: "Source observation / reference periods (recorded)",
  collected: "Notebook collection date", created: "Notebook created", updated: "Notebook last edited",
  exported: "Brief export date", version: "Notebook platform version", itemVersion: "Collected item platform version",
  evidence: "Selected evidence", original: "Original recorded title", identity: "Evidence ID", ids: "Canonical IDs",
  type: "Evidence type", layer: "Research layer (recorded; not combined)",
  value: "Exact recorded value", unit: "Recorded unit", missing: "Missing / unavailable", unknown: "Not recorded",
  configuration: "Research configuration — not a frozen observation dataset; no values have been fetched for this brief.",
  reference: "Recorded reference / metadata — not an observation value.",
  atlas: "Original Atlas view (live)", sources: "Recorded sources", noSources: "No original source reference recorded for this item.",
  sourceIds: "Source IDs", comparability: "Comparability (recorded)", warnings: "Methodological warnings",
  originalWarnings: "Original recorded warnings", metadata: "Recorded research configuration and metadata",
  notes: "User-authored notes", notebookWarnings: "Notebook-wide warnings (may also concern excluded evidence)",
  sourceList: "Source list — selected evidence only", publisher: "Original publisher", dataset: "Original dataset / title",
  code: "Source code", retrieved: "Source retrieval date", sourceUpdated: "Source update date",
  originalUnit: "Original source unit", normalizedUnit: "Recorded normalized unit", sourceUrl: "Original source link",
  noConclusion: "No conclusions or interpretations have been generated.",
};
const zh: Record<keyof typeof en, string> = {
  title: "来源关联研究证据简报", open: "预览并导出研究证据简报",
  export: "导出研究证据简报（Markdown）", select: "简报所含证据", all: "全选", none: "取消全选",
  selected: "已选证据", preview: "简报预览",
  selectionNote: "证据选择和简报排序仅用于当前页面，不改变已保存笔记或 JSON 备份。",
  boundary: "这是一份证据集合和用户自写备注，不是自动生成的文章或结论。时间上的关联不能确立因果关系。各研究数据层保持独立，不合成数值，也不重新估计。",
  live: "Atlas 研究链接是实时配置，不是冻结数据集。来源和可用数值可能在收集后修订。本简报仅使用笔记中已保存的元数据，不检索或估计缺失值。",
  empty: "请至少选择一条已收集证据，以预览和导出简报。",
  question: "研究问题", scope: "范围与日期", notebookCountries: "笔记国家（原记录）",
  includedCountries: "所选证据包含的国家", periods: "来源观测／参考期间（原记录）",
  collected: "笔记证据收集日期", created: "笔记创建日期", updated: "笔记最后编辑日期",
  exported: "简报导出日期", version: "笔记平台版本", itemVersion: "条目收集时的平台版本",
  evidence: "所选证据", original: "原记录标题", identity: "证据 ID", ids: "规范数据 ID",
  type: "证据类型", layer: "研究数据层（原记录；不合并）", value: "原记录确切数值", unit: "记录单位",
  missing: "缺失／不可用", unknown: "未记录",
  configuration: "研究配置——不是冻结观测数据集；本简报未为其检索任何数值。",
  reference: "已记录的参考／元数据——不是观测数值。",
  atlas: "原始 Atlas 视图（实时）", sources: "记录来源", noSources: "该条目未记录原始来源引用。",
  sourceIds: "来源 ID", comparability: "可比性（原记录）", warnings: "方法限制与警告",
  originalWarnings: "原始记录警告", metadata: "已记录的研究配置与元数据", notes: "用户自写备注",
  notebookWarnings: "笔记整体警告（可能也涉及未选证据）", sourceList: "来源列表——仅所选证据",
  publisher: "原始发布机构", dataset: "原始数据集／标题", code: "来源代码", retrieved: "来源检索日期",
  sourceUpdated: "来源更新日期", originalUnit: "来源原始单位", normalizedUnit: "记录的标准化单位",
  sourceUrl: "原始来源链接", noConclusion: "未生成任何结论或解释。",
};
export const notebookBriefMessages = { en, "zh-CN": zh };
export type BriefField = { label: string; value: string; href?: string };
export type BriefSection = { title: string; level: 2 | 3; paragraphs: string[]; fields: BriefField[] };
export type EvidenceBrief = { title: string; introduction: string[]; sections: BriefSection[] };

// Projection only: validate the existing schema and never mutate or enrich stored evidence.
export function buildEvidenceBrief(notebook: ResearchNotebook, ids: string[], locale: Locale, exportedAt: string): EvidenceBrief {
  serializeNotebook(notebook);
  if (!Number.isFinite(Date.parse(exportedAt))) throw Error("Invalid brief export date");
  if (new Set(ids).size !== ids.length || ids.some(id => !notebook.items.some(item => item.id === id))) throw Error("Invalid brief selection");
  const m = notebookBriefMessages[locale], labels = notebookMessages[locale];
  const items = ids.map(id => notebook.items.find(item => item.id === id)!);
  const joined = (values: string[]) => values.length ? values.join(" · ") : m.unknown;
  const field = (label: string, value?: string): BriefField => ({ label, value: value || m.unknown });
  const link = (label: string, value: string, url: string, atlas = false): BriefField => ({ label, value, ...(atlas ? atlasItemTarget(url) ? { href: url } : {} : externalSourceLink(url) ? { href: url } : {}) });
  const sources = notebook.sources.filter(source => items.some(item => item.source_ids.includes(source.id)));
  const sections: BriefSection[] = [
    { title: m.question, level: 2, paragraphs: [notebook.research_question || m.unknown], fields: [] },
    { title: m.scope, level: 2, paragraphs: [], fields: [field(m.notebookCountries, joined(notebook.selected_countries)), field(m.includedCountries, joined([...new Set(items.flatMap(item => item.countries))])), field(m.periods, joined([...new Set(items.flatMap(item => item.periods))])), field(m.created, notebook.created_at), field(m.updated, notebook.updated_at), field(m.exported, exportedAt), field(m.version, notebook.platform_version)] },
    { title: m.evidence, level: 2, paragraphs: items.length ? [] : [m.empty], fields: [] },
  ];
  items.forEach((item, index) => {
    const configuration = ["series_view", "country_comparison", "regional_view", "map_view", "workspace"].includes(item.type);
    const title = item.labels?.[locale] || item.title;
    const fields: BriefField[] = [field(m.identity, item.id), field(m.ids, joined(item.canonical_ids)), field(m.type, labels[item.type]), field(m.layer, item.layer), field(m.includedCountries, joined(item.countries)), field(m.periods, joined(item.periods)), field(m.collected, item.collected_at), field(m.itemVersion, item.platform_version), link(m.atlas, item.url, item.url, true), field(m.sourceIds, joined(item.source_ids)), field(m.comparability, item.comparability)];
    if (title !== item.title) fields.unshift(field(m.original, item.title));
    if (item.value !== undefined) fields.push(field(m.value, item.value === null ? m.missing : String(item.value)), field(m.unit, item.unit));
    else if (item.type === "observation") fields.push(field(m.value, m.unknown), field(m.unit, item.unit));
    else if (item.unit !== undefined) fields.push(field(m.unit, item.unit));
    const warnings = item.warning_labels?.[locale] ?? item.warnings;
    if (warnings.length) fields.push(field(m.warnings, warnings.join("\n")));
    if (item.warning_labels?.[locale] && JSON.stringify(warnings) !== JSON.stringify(item.warnings) && item.warnings.length) fields.push(field(m.originalWarnings, item.warnings.join("\n")));
    if (Object.keys(item.metadata).length) fields.push(field(m.metadata, JSON.stringify(item.metadata, null, 2)));
    fields.push(field(m.notes, item.note));
    for (const id of item.source_ids) {
      const source = sources.find(s => s.id === id)!;
      fields.push(link(`${m.sources} · ${id}`, `${source.institution} · ${source.dataset}`, source.url));
    }
    sections.push({ title: `${index + 1}. ${title}`, level: 3, paragraphs: [...(configuration ? [m.configuration] : item.type !== "observation" ? [m.reference] : []), ...(!item.source_ids.length ? [m.noSources] : [])], fields });
  });
  sections.push({ title: m.notebookWarnings, level: 2, paragraphs: notebook.methodology_warnings.length ? notebook.methodology_warnings : [m.unknown], fields: [] });
  sections.push({ title: m.notes, level: 2, paragraphs: [notebook.user_notes || m.unknown], fields: [] });
  sections.push({ title: m.sourceList, level: 2, paragraphs: sources.length ? [] : [m.unknown], fields: [] });
  for (const source of sources) sections.push({ title: source.id, level: 3, paragraphs: [], fields: [field(m.publisher, source.institution), field(m.dataset, source.dataset), field(m.code, source.code), link(m.sourceUrl, source.url, source.url), field(m.layer, source.layer), field(m.originalUnit, source.original_unit), field(m.normalizedUnit, source.normalized_unit), field(m.retrieved, source.retrieved_at), field(m.sourceUpdated, source.updated_at)] });
  return { title: notebook.title || m.title, introduction: [m.boundary, m.live, m.noConclusion], sections };
}

// Escape stored prose rather than interpreting user notes or publisher labels as Markdown/HTML.
export function briefMarkdownText(value: string): string {
  return value.replace(/\r\n?/g, "\n")
    .replace(/[\\`*_\[\]<>|&!~]/g, "\\$&")
    .replace(/^([ \t]*)(#{1,6})(?=\s|$)/gm, "$1\\$2")
    .replace(/^([ \t]*)([-+])(?=\s)/gm, "$1\\$2")
    .replace(/^([ \t]*\d+)([.)])(?=\s)/gm, "$1\\$2")
    .replace(/^([ \t]*)([=-]+)(?=[ \t]*$)/gm, (_, indent: string, marks: string) => indent + [...marks].map(mark => `\\${mark}`).join(""));
}
function markdownField(field: BriefField): string {
  const value = field.href ? `[${briefMarkdownText(field.value)}](<${field.href.replace(/[\s<>\\\[\]()"`]/g, c => c === "(" ? "%28" : c === ")" ? "%29" : encodeURIComponent(c))}>)` : briefMarkdownText(field.value);
  return `- **${briefMarkdownText(field.label)}:** ${value.replace(/\r?\n/g, "\n  ")}`;
}
export function serializeEvidenceBrief(brief: EvidenceBrief): string {
  return [`# ${briefMarkdownText(brief.title).replace(/\r?\n/g, " ")}`, ...brief.introduction.map(briefMarkdownText), ...brief.sections.flatMap(section => [`${"#".repeat(section.level)} ${briefMarkdownText(section.title).replace(/\r?\n/g, " ")}`, ...section.paragraphs.map(briefMarkdownText), ...(section.fields.length ? [section.fields.map(markdownField).join("\n")] : [])])].join("\n\n") + "\n";
}
