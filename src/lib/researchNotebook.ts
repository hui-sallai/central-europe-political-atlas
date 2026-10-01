import type { Locale } from "@/i18n/config";
export const NOTEBOOK_SCHEMA = "atlas-research-notebook-v1";
export const NOTEBOOK_STORAGE_KEY = "central-europe-atlas:research-notebook:v1";
export const notebookTypes = ["observation", "series_view", "country_comparison", "event", "regional_view", "map_view", "method", "source", "workspace"] as const;
export type EvidenceType = typeof notebookTypes[number];
export const notebookLimits = { items: 100, note: 2000, totalNotes: 25000, bytes: 750000, sources: 400 };
export type NotebookSource = { id: string; institution: string; dataset: string; url: string; layer: string; code?: string; original_unit?: string; normalized_unit?: string; retrieved_at?: string; updated_at?: string };
export type NotebookMetadata = { filters?: Record<string, string | number | boolean | string[]>; row_count?: number; coverage?: string[]; status?: string; event_type?: string; topic?: string; original_language?: string; entersModel?: boolean; state?: "active" | "registry_only" | "blocked"; purpose?: string; supported_data?: string[]; readiness?: string; classification?: string; legend?: string[]; geography?: string[]; selected_regions?: string[]; evidence_categories?: string[]; reference?: string };
export type NotebookItem = { id: string; identity: string; type: EvidenceType; title: string; labels?: Partial<Record<Locale, string>>; url: string; collected_at: string; canonical_ids: string[]; countries: string[]; periods: string[]; unit?: string; value?: number | null; source_ids: string[]; layer: string; comparability?: string; warnings: string[]; warning_labels?: Partial<Record<Locale, string[]>>; note: string; platform_version: string; metadata: NotebookMetadata };
export type EvidenceDraft = Omit<NotebookItem, "id" | "identity" | "collected_at" | "note" | "platform_version" | "source_ids"> & { sources: Omit<NotebookSource, "id">[] };
export type ResearchNotebook = { schema: typeof NOTEBOOK_SCHEMA; notebook_id: string; title: string; created_at: string; updated_at: string; locale: Locale; workspace_context?: string; selected_countries: string[]; research_question: string; items: NotebookItem[]; user_notes: string; sources: NotebookSource[]; methodology_warnings: string[]; platform_version: string };
const atlasOrigin = "https://hy-central-europe-analysis.org";
const countries = new Set(["hungary", "poland", "czechia", "slovakia", "germany", "austria", "romania", "slovenia", "croatia", "serbia"]);
const metadataKeys = new Set(["filters", "row_count", "coverage", "status", "event_type", "topic", "original_language", "entersModel", "state", "purpose", "supported_data", "readiness", "classification", "legend", "geography", "selected_regions", "evidence_categories", "reference"]);
export function safeNotebookUrl(value: string, atlas = false): boolean {
  try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password && value.length <= 4096 && (!atlas || (u.origin === atlasOrigin && /^\/(?:en\/)?(?:data|countries|news|models|methodology|map|workspaces|notebook)(?:\/|$)/.test(u.pathname))) && ![...u.searchParams.keys()].some(k => /^(api[_-]?key|token|secret|password)$/i.test(k)); } catch { return false; }
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
function hash(value: string): string { let h = 2166136261; for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619); return (h >>> 0).toString(16); }
export function canonicalNotebookUrl(url: string): string { const u = new URL(url); u.pathname = u.pathname.replace(/^\/en(?=\/|$)/, ""); u.searchParams.sort(); return u.href; }
export function evidenceIdentity(item: Pick<NotebookItem, "type" | "url" | "canonical_ids" | "countries" | "periods" | "layer" | "metadata">): string {
  const basic = { ids: [...item.canonical_ids].sort(), countries: [...item.countries].sort(), periods: item.periods, layer: item.layer };
  return `${item.type}:${stable(item.type === "method" || item.type === "event" ? { ids: basic.ids } : item.type === "observation" ? basic : { ...basic, url: canonicalNotebookUrl(item.url), filters: item.metadata.filters ?? {}, classification: item.metadata.classification ?? "" })}`;
}
export function sourceIdentity(source: Omit<NotebookSource, "id">): string { return stable({ url: source.url, dataset: source.dataset, code: source.code ?? "", layer: source.layer, original_unit: source.original_unit ?? "", normalized_unit: source.normalized_unit ?? "", retrieved_at: source.retrieved_at ?? "", updated_at: source.updated_at ?? "" }); }
export function emptyNotebook(locale: Locale, version: string, time = new Date().toISOString()): ResearchNotebook {
  return { schema: NOTEBOOK_SCHEMA, notebook_id: `notebook-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`, title: "", created_at: time, updated_at: time, locale, selected_countries: [], research_question: "", items: [], user_notes: "", sources: [], methodology_warnings: [], platform_version: version };
}
function record(v: unknown): v is Record<string, unknown> { return !!v && typeof v === "object" && !Array.isArray(v); }
function text(v: unknown, max = 2000): v is string { return typeof v === "string" && v.length <= max; }
function strings(v: unknown, max = 100, length = 2000): v is string[] { return Array.isArray(v) && v.length <= max && v.every(x => text(x, length)); }
function date(v: unknown): boolean { return text(v, 40) && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)); }
function keys(v: Record<string, unknown>, allowed: string[]): boolean { return Object.keys(v).every(k => allowed.includes(k)); }
export function validateNotebook(value: unknown): value is ResearchNotebook {
  try {
    if (!record(value) || !keys(value, ["schema", "notebook_id", "title", "created_at", "updated_at", "locale", "workspace_context", "selected_countries", "research_question", "items", "user_notes", "sources", "methodology_warnings", "platform_version"]) || value.schema !== NOTEBOOK_SCHEMA || !text(value.notebook_id, 100) || !value.notebook_id || !text(value.title, 200) || !date(value.created_at) || !date(value.updated_at) || !["zh-CN", "en"].includes(String(value.locale)) || !text(value.research_question, 4000) || !text(value.user_notes, 10000) || !text(value.platform_version, 200) || !strings(value.selected_countries, 10, 30) || value.selected_countries.some(c => !countries.has(c)) || !strings(value.methodology_warnings, 100, 2000) || (value.workspace_context !== undefined && !text(value.workspace_context, 100))) return false;
    if (!Array.isArray(value.sources) || value.sources.length > notebookLimits.sources || !Array.isArray(value.items) || value.items.length > notebookLimits.items) return false;
    const sourceIds = new Set<string>(), sourceIdentities = new Set<string>();
    for (const s of value.sources) {
      if (!record(s) || !keys(s, ["id", "institution", "dataset", "url", "layer", "code", "original_unit", "normalized_unit", "retrieved_at", "updated_at"]) || !text(s.id, 100) || !s.id || sourceIds.has(s.id) || !text(s.institution, 1000) || !text(s.dataset, 1000) || !text(s.layer, 100) || !text(s.url, 4096) || !safeNotebookUrl(s.url) || ["code", "original_unit", "normalized_unit", "retrieved_at", "updated_at"].some(k => s[k] !== undefined && !text(s[k], 300))) return false;
      const identity = sourceIdentity(s as unknown as NotebookSource); if (sourceIdentities.has(identity)) return false; sourceIdentities.add(identity); sourceIds.add(s.id);
    }
    const ids = new Set<string>(), identities = new Set<string>(); let notes = value.user_notes.length + value.research_question.length;
    for (const item of value.items) {
      if (!record(item) || !keys(item, ["id", "identity", "type", "title", "labels", "url", "collected_at", "canonical_ids", "countries", "periods", "unit", "value", "source_ids", "layer", "comparability", "warnings", "warning_labels", "note", "platform_version", "metadata"]) || !text(item.id, 100) || !item.id || ids.has(item.id) || !notebookTypes.includes(item.type as EvidenceType) || !text(item.title, 1000) || !text(item.url, 4096) || !safeNotebookUrl(item.url, true) || !date(item.collected_at) || !strings(item.canonical_ids, 100, 200) || !strings(item.countries, 10, 30) || item.countries.some(c => !countries.has(c)) || !strings(item.periods, 100, 50) || !strings(item.source_ids, 100, 100) || item.source_ids.some(id => !sourceIds.has(id)) || !text(item.layer, 100) || !strings(item.warnings, 30, 2000) || !text(item.note, notebookLimits.note) || !text(item.platform_version, 200) || !record(item.metadata) || Object.keys(item.metadata).some(k => !metadataKeys.has(k)) || JSON.stringify(item.metadata).length > 12000) return false;
      if (item.value !== undefined && item.value !== null && (typeof item.value !== "number" || !Number.isFinite(item.value))) return false;
      if ((item.unit !== undefined && !text(item.unit, 300)) || (item.comparability !== undefined && !text(item.comparability, 300))) return false;
      for (const [k, v] of Object.entries(item.metadata)) {
        if (k === "filters") { if (!record(v) || Object.keys(v).length > 40 || Object.entries(v).some(([key,x]) => !text(key,100) || !(text(x,1000) || typeof x === "boolean" || (typeof x === "number" && Number.isFinite(x)) || strings(x,100,200)))) return false; }
        else if (k === "row_count") { if (typeof v !== "number" || !Number.isInteger(v) || v < 0) return false; }
        else if (k === "entersModel") { if (typeof v !== "boolean") return false; }
        else if (k === "state") { if (!["active", "registry_only", "blocked"].includes(String(v))) return false; }
        else if (["coverage", "supported_data", "legend", "geography", "selected_regions", "evidence_categories"].includes(k)) { if (!strings(v,100,1000)) return false; }
        else if (!text(v,2000)) return false;
      }
      if (item.type === "method" && !item.metadata.state) return false;
      for (const field of ["labels", "warning_labels"]) if (item[field] !== undefined) { if (!record(item[field]) || Object.entries(item[field]).some(([k,v]) => !["zh-CN", "en"].includes(k) || (field === "labels" ? !text(v,1000) : !strings(v,30,2000)))) return false; }
      const identity = evidenceIdentity(item as unknown as NotebookItem); if (item.identity !== identity || identities.has(identity)) return false;
      ids.add(item.id); identities.add(identity); notes += item.note.length;
    }
    return notes <= notebookLimits.totalNotes && new TextEncoder().encode(JSON.stringify(value)).length <= notebookLimits.bytes;
  } catch { return false; }
}
export function parseNotebook(raw: string): ResearchNotebook { if (new TextEncoder().encode(raw).length > notebookLimits.bytes) throw Error("Notebook too large"); const value: unknown = JSON.parse(raw); if (!validateNotebook(value)) throw Error("Invalid notebook"); return value; }
export function serializeNotebook(value: ResearchNotebook): string { if (!validateNotebook(value)) throw Error("Invalid notebook"); return JSON.stringify(value); }
export function addNotebookEvidence(current: ResearchNotebook, draft: EvidenceDraft, version: string, time = new Date().toISOString()): ResearchNotebook {
  const identity = evidenceIdentity(draft); if (current.items.some(item => item.identity === identity)) return current;
  const sources = [...current.sources]; const source_ids = draft.sources.map(s => { const existing = sources.find(row => sourceIdentity(row) === sourceIdentity(s)); if (existing) return existing.id; const id = `source-${hash(sourceIdentity(s))}-${sources.length}`; sources.push({ ...s, id }); return id; });
  const { sources: omitted, ...fields } = draft; void omitted;
  const item: NotebookItem = { ...fields, identity, id: `item-${hash(identity)}-${current.items.length}`, collected_at: time, note: "", platform_version: version, source_ids: [...new Set(source_ids)] };
  const next = { ...current, updated_at: time, items: [...current.items, item], sources, selected_countries: [...new Set([...current.selected_countries, ...item.countries])], methodology_warnings: [...new Set([...current.methodology_warnings, ...item.warnings])], ...(item.type === "workspace" ? { workspace_context: item.canonical_ids[0] } : {}) };
  serializeNotebook(next); return next;
}
export function pruneNotebook(current: ResearchNotebook): ResearchNotebook { const used = new Set(current.items.flatMap(i => i.source_ids)); return { ...current, sources: current.sources.filter(s => used.has(s.id)), selected_countries: [...new Set(current.items.flatMap(i => i.countries))], methodology_warnings: [...new Set(current.items.flatMap(i => i.warnings))] }; }
