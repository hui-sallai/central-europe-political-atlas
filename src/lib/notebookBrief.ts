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
  templateLabel: "Report structure",
  templateStandard: "Standard evidence brief",
  templateComparative: "Comparative evidence note",
  templateAudit: "Methodological & provenance audit",
  filterType: "Filter by evidence type",
  filterCountry: "Filter by recorded country",
  filterAll: "All",
  searchLabel: "Search recorded evidence",
  searchPlaceholder: "Search title, canonical ID, country, period or source",
  clearFilters: "Clear filters",
  selectAllVisible: "Select all visible",
  visibleCount: "Visible",
  totalCount: "Project total",
  hiddenSelectedNote: "selected item(s) hidden by current filters (still included in report)",
  emptyFilterNotice: "No evidence items match the current filters (your existing selection is preserved).",
  copyMarkdown: "Copy Markdown",
  copied: "Markdown copied to clipboard.",
  copyError: "Clipboard permission unavailable; use Export Evidence Brief (Markdown) instead.",
  exportHtml: "Download print-ready HTML",
  exportCitations: "Download citations and manifest (ZIP)",
  citationDisclosure: "This ZIP is created on your device. It includes selected evidence and recorded sources, your research question, project notes and notes on selected items. Review private research material before sharing.",
  printReport: "Print report only",
  printHint: "Prints only the isolated selected report (never excluded Notebook items). You can also download the standalone HTML file and save as PDF in your browser.",
  printError: "Isolated report print could not start; download the print-ready HTML file and print it from your browser.",
  readinessLabel: "Recorded provenance summary",
  readinessNumerical: "Recorded numerical observations",
  readinessExplicitNull: "Explicit null observations",
  readinessUnrecordedObs: "Observations without recorded value",
  readinessConfigs: "Live research configurations",
  readinessLayers: "Distinct layers (kept separate)",
  readinessSources: "Referenced sources (selected)",
  readinessUnsourced: "Items without recorded source",
  readinessWarnings: "Items with methodological warnings",
  readinessBlockedMethods: "Blocked / registry-only methods",
  readinessMetadataNote: "Factual counts of stored Notebook metadata only; not a quality score and not independent source verification.",
  comparativeSection: "Coverage and comparability summary",
  auditSection: "Methodological and provenance audit",
  auditNote: "All research layers remain separate; counts below describe recorded metadata completeness without re-estimating or combining observations. Project-level notebook warnings and user notes are intentionally included and distinguished from item-level records.",
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
  templateLabel: "报告结构模板",
  templateStandard: "标准证据简报",
  templateComparative: "比较研究证据备忘",
  templateAudit: "方法限制与来源完整性审计",
  filterType: "按证据类型筛选",
  filterCountry: "按记录国家筛选",
  filterAll: "全部",
  searchLabel: "检索已记录证据",
  searchPlaceholder: "按标题、规范 ID、国家、时期或来源检索",
  clearFilters: "清除筛选",
  selectAllVisible: "全选当前可见条目",
  visibleCount: "当前可见",
  totalCount: "项目总计",
  hiddenSelectedNote: "条已选证据被当前筛选隐藏（仍保留在报告中）",
  emptyFilterNotice: "当前筛选条件下无匹配条目（您已选择的报告证据保持不变）。",
  copyMarkdown: "复制 Markdown",
  copied: "Markdown 已复制到剪贴板。",
  copyError: "剪贴板权限不可用；请改用“导出研究证据简报（Markdown）”。",
  exportHtml: "下载可打印 HTML",
  exportCitations: "下载引用和报告清单（ZIP）",
  citationDisclosure: "此 ZIP 在你的设备上生成，包含已选证据及其记录的来源、研究问题、项目笔记和已选条目的笔记。分享前请检查其中的私人研究内容。",
  printReport: "仅打印当前报告",
  printHint: "仅打印隔离的已选报告内容（不包含未选笔记条目）；也可下载独立 HTML 文件在浏览器中另存为 PDF。",
  printError: "隔离打印未能启动；请下载可打印 HTML 文件后在浏览器中打印或另存为 PDF。",
  readinessLabel: "已记录来源与元数据摘要",
  readinessNumerical: "已记录数值观测",
  readinessExplicitNull: "明确空值（null）观测",
  readinessUnrecordedObs: "未记录数值的观测条目",
  readinessConfigs: "实时研究配置",
  readinessLayers: "独立研究层（不合并）",
  readinessSources: "已选条目引用来源数",
  readinessUnsourced: "未记录来源条目",
  readinessWarnings: "含方法警告条目",
  readinessBlockedMethods: "受限／仅登记方法",
  readinessMetadataNote: "仅统计本地笔记已记录元数据，不构成质量评分，也不代表已独立复核外部来源。",
  comparativeSection: "覆盖范围与可比性摘要",
  auditSection: "方法限制与来源完整性审计",
  auditNote: "各研究数据层保持独立；以下统计仅描述已记录元数据完整性，不重新估计或合并观测值。项目级整体警告与用户备注作为项目背景有意保留，并与单条证据记录区分。",
};
export const notebookBriefMessages = { en, "zh-CN": zh };
export type BriefTemplate = "standard" | "comparative_note" | "methodological_audit";
export type BriefField = { label: string; value: string; href?: string };
export type BriefSection = { title: string; level: 2 | 3; paragraphs: string[]; fields: BriefField[] };
export type EvidenceBrief = { title: string; introduction: string[]; sections: BriefSection[] };
export type ReportStudioSummary = {
  selectedCount: number;
  totalCount: number;
  countries: string[];
  layers: string[];
  recordedNumericalCount: number;
  explicitNullCount: number;
  unrecordedObservationCount: number;
  configurationCount: number;
  sourceCount: number;
  unsourcedCount: number;
  warningItemCount: number;
  blockedOrInactiveMethodCount: number;
};

export const CONFIGURATION_TYPES: ReadonlySet<string> = new Set(["series_view", "country_comparison", "regional_view", "map_view", "workspace"]);

export function validateSelection(notebook: ResearchNotebook, ids: string[]) {
  serializeNotebook(notebook);
  if (new Set(ids).size !== ids.length || ids.some(id => !notebook.items.some(item => item.id === id))) {
    throw Error("Invalid brief selection");
  }
  return ids.map(id => notebook.items.find(item => item.id === id)!);
}

// Pure metadata summary: validates existing schema & selection IDs; never mutates notebook or invents scores.
export function buildReportStudioSummary(notebook: ResearchNotebook, ids: string[]): ReportStudioSummary {
  const items = validateSelection(notebook, ids);
  const sourceIds = new Set(items.flatMap(item => item.source_ids));
  const sources = notebook.sources.filter(source => sourceIds.has(source.id));
  return {
    selectedCount: items.length,
    totalCount: notebook.items.length,
    countries: [...new Set(items.flatMap(item => item.countries))],
    layers: [...new Set(items.map(item => item.layer).filter(Boolean))],
    recordedNumericalCount: items.filter(item => item.type === "observation" && typeof item.value === "number" && Number.isFinite(item.value)).length,
    explicitNullCount: items.filter(item => item.type === "observation" && item.value === null).length,
    unrecordedObservationCount: items.filter(item => item.type === "observation" && item.value === undefined).length,
    configurationCount: items.filter(item => CONFIGURATION_TYPES.has(item.type)).length,
    sourceCount: sources.length,
    unsourcedCount: items.filter(item => item.source_ids.length === 0).length,
    warningItemCount: items.filter(item => item.warnings.length > 0).length,
    blockedOrInactiveMethodCount: items.filter(item => item.type === "method" && typeof item.metadata.state === "string" && item.metadata.state !== "active").length,
  };
}

// Projection only: validate the existing schema and never mutate or enrich stored evidence.
export function buildEvidenceBrief(notebook: ResearchNotebook, ids: string[], locale: Locale, exportedAt: string, template: BriefTemplate = "standard"): EvidenceBrief {
  const items = validateSelection(notebook, ids);
  if (!Number.isFinite(Date.parse(exportedAt))) throw Error("Invalid brief export date");
  const m = notebookBriefMessages[locale], labels = notebookMessages[locale];
  const summary = buildReportStudioSummary(notebook, ids);
  const joined = (values: string[]) => values.length ? values.join(" · ") : m.unknown;
  const field = (label: string, value?: string): BriefField => ({ label, value: value || m.unknown });
  const link = (label: string, value: string, url: string, atlas = false): BriefField => ({ label, value, ...(atlas ? atlasItemTarget(url) ? { href: url } : {} : externalSourceLink(url) ? { href: url } : {}) });
  const sources = notebook.sources.filter(source => items.some(item => item.source_ids.includes(source.id)));
  const sections: BriefSection[] = [
    { title: m.question, level: 2, paragraphs: [notebook.research_question || m.unknown], fields: [] },
    { title: m.scope, level: 2, paragraphs: [], fields: [field(m.notebookCountries, joined(notebook.selected_countries)), field(m.includedCountries, joined([...new Set(items.flatMap(item => item.countries))])), field(m.periods, joined([...new Set(items.flatMap(item => item.periods))])), field(m.created, notebook.created_at), field(m.updated, notebook.updated_at), field(m.exported, exportedAt), field(m.version, notebook.platform_version)] },
  ];
  if (template === "comparative_note") {
    const comparabilities = [...new Set(items.map(item => item.comparability).filter((c): c is string => Boolean(c)))];
    sections.push({
      title: m.comparativeSection,
      level: 2,
      paragraphs: [m.auditNote],
      fields: [
        field(m.selected, `${summary.selectedCount} / ${summary.totalCount}`),
        field(m.includedCountries, joined(summary.countries)),
        field(m.readinessLayers, joined(summary.layers)),
        field(m.readinessNumerical, String(summary.recordedNumericalCount)),
        field(m.readinessExplicitNull, String(summary.explicitNullCount)),
        field(m.readinessConfigs, String(summary.configurationCount)),
        field(m.comparability, joined(comparabilities)),
        field(m.readinessSources, String(summary.sourceCount)),
      ],
    });
  } else if (template === "methodological_audit") {
    sections.push({
      title: m.auditSection,
      level: 2,
      paragraphs: [m.auditNote],
      fields: [
        field(m.readinessLayers, `${summary.layers.length} (${joined(summary.layers)})`),
        field(m.readinessNumerical, String(summary.recordedNumericalCount)),
        field(m.readinessExplicitNull, String(summary.explicitNullCount)),
        field(m.readinessUnrecordedObs, String(summary.unrecordedObservationCount)),
        field(m.readinessConfigs, String(summary.configurationCount)),
        field(m.readinessWarnings, String(summary.warningItemCount)),
        field(m.readinessBlockedMethods, String(summary.blockedOrInactiveMethodCount)),
        field(m.readinessUnsourced, String(summary.unsourcedCount)),
        field(m.readinessSources, String(summary.sourceCount)),
      ],
    });
    sections.push({ title: m.notebookWarnings, level: 2, paragraphs: notebook.methodology_warnings.length ? notebook.methodology_warnings : [m.unknown], fields: [] });
  }
  sections.push({ title: m.evidence, level: 2, paragraphs: items.length ? [] : [m.empty], fields: [] });
  items.forEach((item, index) => {
    const configuration = CONFIGURATION_TYPES.has(item.type);
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
  if (template !== "methodological_audit") {
    sections.push({ title: m.notebookWarnings, level: 2, paragraphs: notebook.methodology_warnings.length ? notebook.methodology_warnings : [m.unknown], fields: [] });
  }
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Standalone presentation serializer derived strictly from EvidenceBrief; zero remote resources or executable HTML.
export function serializeBriefHtml(brief: EvidenceBrief, locale: Locale): string {
  const lang = locale === "en" ? "en" : "zh-CN";
  const introHtml = brief.introduction.map(p => `<p class="notice">${escapeHtml(p)}</p>`).join("\n");
  const sectionsHtml = brief.sections.map(section => {
    const tag = section.level === 2 ? "h2" : "h3";
    const paras = section.paragraphs.map(p => `<p class="prose">${escapeHtml(p)}</p>`).join("\n");
    const fields = section.fields.length
      ? `<dl>${section.fields.map(f => `<div class="field"><dt>${escapeHtml(f.label)}</dt><dd>${f.href ? `<a href="${escapeHtml(f.href)}" rel="noopener noreferrer">${escapeHtml(f.value)}</a>` : escapeHtml(f.value)}</dd></div>`).join("")}</dl>`
      : "";
    return `<section><${tag}>${escapeHtml(section.title)}</${tag}>${paras}${fields}</section>`;
  }).join("\n");
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(brief.title)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Georgia, "Times New Roman", "Songti SC", "Noto Serif CJK SC", "PingFang SC", serif; color: #1a1a1a; background: #fff; max-width: 780px; margin: 2rem auto; padding: 0 1.25rem; line-height: 1.65; font-size: 10.5pt; }
  h1 { font-size: 1.75rem; border-bottom: 2px solid #1a1a1a; padding-bottom: 0.45rem; overflow-wrap: anywhere; }
  h2 { font-size: 1.2rem; margin-top: 1.8rem; border-bottom: 1px solid #d4d4d4; padding-bottom: 0.25rem; break-after: avoid; page-break-after: avoid; }
  h3 { font-size: 1.02rem; margin-top: 1.35rem; break-after: avoid; page-break-after: avoid; overflow-wrap: anywhere; }
  .notice { font-size: 0.9rem; background: #f5f5f4; border-left: 3px solid #525252; padding: 0.6rem 0.85rem; margin: 0.7rem 0; }
  .prose { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0.65rem 0; }
  dl { display: grid; gap: 0.4rem; margin: 0.7rem 0 1.15rem; font-size: 0.92rem; }
  .field { break-inside: avoid; page-break-inside: avoid; }
  dt { font-weight: 700; color: #262626; }
  dd { margin: 0.1rem 0 0.35rem 0; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
  a { color: #1d4ed8; overflow-wrap: anywhere; }
  @media print { body { margin: 0; padding: 0; max-width: none; } a { color: #1a1a1a; text-decoration: underline; } }
</style>
</head>
<body>
<main>
<h1>${escapeHtml(brief.title)}</h1>
${introHtml}
${sectionsHtml}
</main>
</body>
</html>
`;
}
