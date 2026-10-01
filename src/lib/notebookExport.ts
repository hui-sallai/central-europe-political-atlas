import { serializeNotebook, type ResearchNotebook } from "./researchNotebook";
import { toCsv } from "./researchSnapshot";
import type { ZipFile } from "./clientZip";
const safe = (value: string) => /^[\s]*[=+@\-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
export function notebookExportFiles(notebook: ResearchNotebook, exportedAt = new Date().toISOString()): ZipFile[] {
  const state = serializeNotebook(notebook); const en = notebook.locale === "en";
  const records = notebook.items.map(item => ({ id: item.id, type: item.type, title: safe(item.title), url: item.url, collected_at: item.collected_at, canonical_ids: item.canonical_ids.join(" | "), countries: item.countries.join(" | "), periods: item.periods.join(" | "), value: item.value, unit: item.unit, layer: item.layer, comparability: item.comparability, state: item.metadata.state, source_ids: item.source_ids.join(" | "), warnings: safe(item.warnings.join(" | ")), user_note: safe(item.note), platform_version: item.platform_version }));
  const sourceRows = notebook.sources.map(source => Object.fromEntries(Object.entries(source).map(([k,v]) => [k,typeof v === "string" ? safe(v) : v])));
  return [
    { name: "README.md", content: `${en ? "Research Notebook" : "研究笔记"}\n\n${en ? "Local evidence metadata and user-authored notes. Not model findings. Live links do not freeze official revisions; no complete datasets or images are included. Import notebook.json explicitly to restore. No cryptographic protection is claimed." : "本地证据元数据和用户自写笔记，不是模型结论。实时链接不能冻结官方修订；不包含完整数据集或图片。明确导入 notebook.json 可恢复。不声称加密保护。"}\n\nCollected platform: ${notebook.platform_version}\nExported at: ${exportedAt}\n` },
    { name: "notebook.json", content: state + "\n" },
    { name: "evidence.csv", content: toCsv(["id", "type", "title", "url", "collected_at", "canonical_ids", "countries", "periods", "value", "unit", "layer", "comparability", "state", "source_ids", "warnings", "user_note", "platform_version"], records.map(row => Object.fromEntries(Object.entries(row).map(([key,value]) => [key,typeof value === "string" ? safe(value) : value])))) },
    { name: "sources.csv", content: toCsv(["id", "institution", "dataset", "code", "url", "original_unit", "normalized_unit", "retrieved_at", "updated_at", "layer"], sourceRows) },
    { name: "citations.md", content: ["# Collected citations / 已收集引用", ...notebook.items.map(item => `${item.title}\nAtlas: ${item.url}\nCollected: ${item.collected_at} · ${item.platform_version}\n${item.metadata.reference ?? ""}`), ...notebook.sources.map(s => `${s.institution} · ${s.dataset}${s.code ? ` · ${s.code}` : ""}\n${s.url}`)].join("\n\n") + "\n" },
    { name: "links.json", content: JSON.stringify({ exported_at: exportedAt, live_links_not_frozen_snapshots: true, evidence: notebook.items.map(i => ({ id: i.id, url: i.url })), sources: notebook.sources.map(s => ({ id: s.id, url: s.url })) }, null, 2) + "\n" },
    { name: "notes.md", content: ["# User-authored material / 用户自写内容", `Title / 标题:\n${notebook.title}`, `Research question / 研究问题:\n${notebook.research_question}`, `Personal notes / 个人笔记:\n${notebook.user_notes}`, ...notebook.items.filter(i => i.note).map(i => `User note for item ${i.id}:\n${i.note}`)].join("\n\n") + "\n" },
  ];
}
