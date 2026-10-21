import type { Locale } from "@/i18n/config";
import { emptyNotebook, NOTEBOOK_STORAGE_KEY, parseNotebook, serializeNotebook, validateNotebook, type ResearchNotebook, type EvidenceDraft, addNotebookEvidence } from "./researchNotebook";

export const NOTEBOOK_PROJECTS_KEY = "central-europe-atlas:notebook-projects:v1";
export const PROJECT_SCHEMA = "atlas-notebook-projects-v1";
export const projectLimits = { projects: 10, bytes: 3000000 };
export type NotebookProject = { id: string; notebook: ResearchNotebook };
export type ProjectRegistry = { schema: typeof PROJECT_SCHEMA; revision: string; active_id: string; projects: NotebookProject[] };
export type ProjectIssue = "storage" | "conflict" | "registry_corrupt" | "legacy_corrupt" | "target_changed" | null;
export type ProjectState = "loading" | "ready" | "memory" | "corrupt";
export type ProjectView = { notebook: ResearchNotebook | null; projects: NotebookProject[]; activeId: string; state: ProjectState; issue: ProjectIssue; error: boolean; raw: string | null; busy: boolean; switching: boolean; persisted: boolean; legacyPresent: boolean };
export type ProjectIO = { get: (key: string) => string | null; set: (key: string, value: string) => void; lock: <T>(operation: () => T) => Promise<T> };
const uuid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
export function parseProjectRegistry(raw: string): ProjectRegistry {
  if (new TextEncoder().encode(raw).length > projectLimits.bytes) throw Error("Project capacity exceeded");
  const value: unknown = JSON.parse(raw);
  if (!object(value) || Object.keys(value).some(k => !["schema", "revision", "active_id", "projects"].includes(k)) || value.schema !== PROJECT_SCHEMA || typeof value.revision !== "string" || !value.revision || value.revision.length > 100 || typeof value.active_id !== "string" || !Array.isArray(value.projects) || !value.projects.length || value.projects.length > projectLimits.projects) throw Error("Invalid project registry");
  const ids = new Set<string>();
  for (const project of value.projects) {
    if (!object(project) || Object.keys(project).some(k => !["id", "notebook"].includes(k)) || typeof project.id !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(project.id) || ids.has(project.id) || !validateNotebook(project.notebook)) throw Error("Invalid project registry");
    ids.add(project.id);
  }
  if (!ids.has(value.active_id)) throw Error("Invalid active project");
  return value as ProjectRegistry;
}
export function serializeProjectRegistry(registry: ProjectRegistry): string {
  const raw = JSON.stringify(registry); parseProjectRegistry(raw); return raw;
}
export function singleNotebookProject(notebook: ResearchNotebook): ProjectRegistry {
  serializeNotebook(notebook);
  return { schema: PROJECT_SCHEMA, revision: uuid(), active_id: "legacy", projects: [{ id: "legacy", notebook }] };
}

// One atomic container write; individual Notebook JSON schemas, identities and ZIP files are unchanged.
// The legacy key is a read-only compatibility copy. Web Locks serialize cooperating browser tabs.
export class NotebookProjectStore {
  private data: ProjectRegistry | null = null;
  private base: string | null = null;
  private legacyBase: string | null = null;
  private listeners = new Set<(view: ProjectView) => void>();
  private pending = 0;
  private transitioning = false;
  private tail: Promise<unknown> = Promise.resolve();
  private state: ProjectState = "loading";
  private issue: ProjectIssue = null;
  private error = false;
  private raw: string | null = null;
  constructor(private locale: Locale, private version: string, private io: ProjectIO) {}
  view(): ProjectView { return { notebook: this.data?.projects.find(p => p.id === this.data?.active_id)?.notebook ?? null, projects: this.data?.projects ?? [], activeId: this.data?.active_id ?? "", state: this.state, issue: this.issue, error: this.error, raw: this.raw, busy: this.pending > 0, switching: this.transitioning, persisted: this.base !== null || this.legacyBase !== null, legacyPresent: this.legacyBase !== null }; }
  subscribe(listener: (view: ProjectView) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private emit() { const view = this.view(); for (const listener of this.listeners) listener(view); }
  private fresh() { return singleNotebookProject(emptyNotebook(this.locale, this.version)); }
  load() {
    if (this.state === "memory" || this.pending) return;
    try {
      const registry = this.io.get(NOTEBOOK_PROJECTS_KEY); this.base = registry;
      if (registry !== null) {
        this.raw = registry;
        try { this.data = parseProjectRegistry(registry); this.state = "ready"; this.issue = null; this.raw = null; }
        catch { this.data = this.fresh(); this.state = "corrupt"; this.issue = "registry_corrupt"; }
      } else {
        const legacy = this.io.get(NOTEBOOK_STORAGE_KEY); this.legacyBase = legacy; this.raw = legacy;
        try { this.data = legacy === null ? this.fresh() : singleNotebookProject(parseNotebook(legacy)); this.state = "ready"; this.issue = null; this.raw = null; }
        catch { this.data = this.fresh(); this.state = "corrupt"; this.issue = "legacy_corrupt"; }
      }
    } catch { this.data ??= this.fresh(); this.state = "memory"; this.issue = "storage"; }
    this.emit();
  }
  private rejected(issue?: ProjectIssue) { this.error = true; if (issue) this.issue = issue; this.emit(); return false; }
  private async write(snapshot: ProjectRegistry): Promise<boolean> {
    try {
      const encoded = serializeProjectRegistry(snapshot);
      await this.io.lock(() => {
        if (this.issue === "conflict" || this.issue === "registry_corrupt") throw Error("conflict");
        if (this.io.get(NOTEBOOK_PROJECTS_KEY) !== this.base || (this.base === null && this.io.get(NOTEBOOK_STORAGE_KEY) !== this.legacyBase)) throw Error("conflict");
        this.io.set(NOTEBOOK_PROJECTS_KEY, encoded);
        this.base = encoded; this.raw = null;
      });
      if (this.issue === "conflict") throw Error("conflict");
      this.error = false; this.state = "ready"; this.issue = null; return true;
    } catch (error) { this.state = "memory"; this.issue = error instanceof Error && error.message === "conflict" ? "conflict" : "storage"; this.error = true; return false; }
  }
  private enqueue(operation: () => Promise<boolean>) {
    this.pending++; this.emit();
    const next = this.tail.then(operation).finally(() => { this.pending--; this.emit(); });
    this.tail = next.catch(() => false); return next;
  }
  update(target: string, transform: (notebook: ResearchNotebook) => ResearchNotebook) {
    if (!this.data || this.state === "loading" || this.state === "corrupt" || this.transitioning) return this.rejected();
    if (target !== this.data.active_id) return this.rejected("target_changed");
    try {
      const previous = this.view().notebook!;
      const notebook = { ...transform(previous), updated_at: new Date().toISOString() };
      serializeNotebook(notebook);
      const snapshot = { ...this.data, revision: uuid(), projects: this.data.projects.map(p => p.id === target ? { ...p, notebook } : p) };
      serializeProjectRegistry(snapshot); this.data = snapshot; this.error = false; this.emit();
      if (this.state !== "memory") void this.enqueue(async () => this.state === "memory" ? false : this.write(snapshot));
      return true;
    } catch { return this.rejected(); }
  }
  add(target: string, draft: EvidenceDraft) { return this.update(target, n => addNotebookEvidence(n, draft, this.version)); }
  private structural(snapshot: ProjectRegistry, recovery = false): Promise<boolean> {
    if (!this.data || this.pending || this.transitioning || (this.state !== "ready" && !(recovery && this.issue === "legacy_corrupt"))) return Promise.resolve(this.rejected());
    try { serializeProjectRegistry(snapshot); } catch { return Promise.resolve(this.rejected()); }
    this.transitioning = true;
    return this.enqueue(async () => {
      const saved = await this.write(snapshot);
      if (saved) this.data = snapshot;
      this.transitioning = false; return saved;
    });
  }
  create(title: string, imported?: ResearchNotebook) {
    if (!this.data || title.length > 200) return Promise.resolve(this.rejected());
    const notebook = imported ?? { ...emptyNotebook(this.locale, this.version), title };
    try { serializeNotebook(notebook); } catch { return Promise.resolve(this.rejected()); }
    const project = { id: uuid(), notebook };
    return this.structural({ ...this.data, revision: uuid(), active_id: project.id, projects: this.issue === "legacy_corrupt" ? [project] : [...this.data.projects, project] }, true);
  }
  switchTo(id: string) {
    if (!this.data?.projects.some(p => p.id === id)) return Promise.resolve(this.rejected());
    if (id === this.data.active_id) return Promise.resolve(true);
    return this.structural({ ...this.data, revision: uuid(), active_id: id });
  }
  replace(target: string, notebook: ResearchNotebook) {
    if (!this.data || target !== this.data.active_id) return Promise.resolve(this.rejected("target_changed"));
    return this.structural({ ...this.data, revision: uuid(), projects: this.data.projects.map(p => p.id === target ? { ...p, notebook } : p) }, true);
  }
  clear(target: string) {
    const previous = this.view().notebook;
    return previous ? this.replace(target, { ...emptyNotebook(this.locale, this.version), notebook_id: previous.notebook_id, created_at: previous.created_at, title: previous.title }) : Promise.resolve(false);
  }
  delete(target: string) {
    if (!this.data || target !== this.data.active_id) return Promise.resolve(this.rejected("target_changed"));
    const remaining = this.data.projects.filter(p => p.id !== target);
    const projects = remaining.length ? remaining : [{ id: uuid(), notebook: emptyNotebook(this.locale, this.version) }];
    return this.structural({ ...this.data, revision: uuid(), active_id: projects[0].id, projects });
  }
  retry() {
    if (!this.data || this.pending || this.state !== "memory" || this.issue !== "storage") return Promise.resolve(this.rejected());
    return this.enqueue(() => this.write(this.data!));
  }
  recoverCopy() {
    if (!this.data || this.pending || this.state !== "memory") return Promise.resolve(this.rejected());
    const notebook = this.view().notebook!;
    this.transitioning = true;
    return this.enqueue(async () => {
      try {
        const recovered = await this.io.lock(() => {
          const raw = this.io.get(NOTEBOOK_PROJECTS_KEY), legacy = raw === null ? this.io.get(NOTEBOOK_STORAGE_KEY) : null;
          const latest = raw !== null ? parseProjectRegistry(raw) : legacy !== null ? singleNotebookProject(parseNotebook(legacy)) : this.fresh();
          const project = { id: uuid(), notebook };
          const next = { ...latest, revision: uuid(), active_id: project.id, projects: [...latest.projects, project] };
          const encoded = serializeProjectRegistry(next); this.io.set(NOTEBOOK_PROJECTS_KEY, encoded); this.base = encoded; return next;
        });
        this.data = recovered; this.state = "ready"; this.issue = null; this.error = false; this.raw = null; return true;
      } catch { this.error = true; return false; }
      finally { this.transitioning = false; }
    });
  }
  storageChanged(key: string | null, value: string | null) {
    if (key !== null && key !== NOTEBOOK_PROJECTS_KEY && key !== NOTEBOOK_STORAGE_KEY) return;
    if (key === NOTEBOOK_STORAGE_KEY && this.base !== null) return;
    if (key === NOTEBOOK_PROJECTS_KEY && value === this.base) return;
    if (this.pending || this.state === "memory") { this.issue = "conflict"; this.error = true; this.emit(); return; }
    if (this.state === "corrupt" || !this.data) { this.load(); return; }
    try {
      const raw = this.io.get(NOTEBOOK_PROJECTS_KEY);
      if (raw === null && this.base === null) { this.load(); return; }
      if (raw === null) throw Error("conflict");
      const latest = parseProjectRegistry(raw);
      if (!latest.projects.some(p => p.id === this.data!.active_id)) throw Error("conflict");
      // A remote tab may select another project; this tab keeps its explicit research target.
      this.data = { ...latest, active_id: this.data.active_id }; this.base = raw; this.error = false; this.issue = null;
    } catch (error) { this.state = "memory"; this.issue = error instanceof Error && error.message === "conflict" ? "conflict" : "registry_corrupt"; this.error = true; this.raw = value; }
    this.emit();
  }
}
