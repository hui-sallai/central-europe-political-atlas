"use client";
import { useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { notebookProjectMessages } from "@/lib/notebookProjectMessages";
import { projectLimits, type CollectionPreview, type CollectionRestoreMode } from "@/lib/notebookProjects";
import { useResearchNotebook } from "./ResearchNotebookProvider";
export function NotebookProjectManager() {
  const locale = useLocale(), m = notebookProjectMessages[locale];
  const { notebook, projects, activeId, state, issue, busy, persisted, legacyPresent, createProject, switchProject, deleteProject, retrySave, recoverCopy } = useResearchNotebook();
  const [title, setTitle] = useState("");
  const blocked = state !== "ready" || busy;
  return <section className="mt-6 rounded-xl border border-[var(--line)] p-4" aria-labelledby="notebook-projects-title" data-notebook-projects>
    <h2 id="notebook-projects-title" className="text-xl font-semibold">{m.projects}</h2>
    <p className="mt-3 text-sm break-words" data-active-project>{m.active}: <strong>{notebook?.title || m.unnamed}</strong></p>
    <label className="mt-3 block text-sm">{m.choose}<select aria-label={m.choose} className="field-control mt-2" disabled={blocked} value={activeId} onChange={e => void switchProject(e.target.value)}>{projects.map((project, index) => <option key={project.id} value={project.id}>{index + 1}. {project.notebook.title || m.unnamed} · {project.notebook.items.length} {m.items} · {persisted && state !== "corrupt" ? project.notebook.updated_at : "—"}</option>)}</select></label>
    <p className="mt-2 text-xs metric-number">{m.edited}: {persisted && state !== "corrupt" ? notebook?.updated_at : "—"} · {notebook?.items.length ?? 0} {m.items}</p>
    <div className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm">{m.name}<input className="field-control mt-2" value={title} maxLength={200} disabled={blocked} onChange={e => setTitle(e.target.value)} /></label><button type="button" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" disabled={blocked} onClick={() => void createProject(title).then(ok => { if (ok) setTitle(""); })}>{m.create}</button></div>
    <div className="mt-3 flex flex-wrap gap-4 text-sm"><button type="button" disabled={blocked} onClick={() => document.getElementById("notebook-title-input")?.focus()}>{m.rename}</button><button type="button" disabled={blocked} onClick={() => { if (window.confirm(`${m.confirmDelete}\n${notebook?.title || m.unnamed}`)) void deleteProject(); }}>{m.remove}</button></div>
    <NotebookCollectionBackup />
    <p className="mt-4 text-xs leading-6 text-[var(--muted)]">{m.privacy}</p>
    {activeId === "legacy" && legacyPresent && state !== "corrupt" ? <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{m.legacy}</p> : null}
    {busy ? <p className="mt-3 text-sm" aria-live="polite">{m.saving}</p> : null}
    {issue ? <p className="mt-3 text-sm leading-7" role="alert">{m[issue === "storage" ? "memory" : issue]}</p> : null}
    {state === "memory" ? <div className="mt-3 flex flex-wrap gap-4 text-sm"><button type="button" disabled={busy || issue !== "storage"} onClick={() => void retrySave()}>{m.retry}</button><button type="button" disabled={busy} onClick={() => void recoverCopy()}>{m.recover}</button></div> : null}
  </section>;
}

function NotebookCollectionBackup() {
  const locale = useLocale(), m = notebookProjectMessages[locale];
  const { state, busy, backupCollection, previewCollection, restoreCollection } = useResearchNotebook();
  const [preview, setPreview] = useState<(CollectionPreview & { raw: string }) | null>(null);
  const [mode, setMode] = useState<CollectionRestoreMode>("merge");
  const [status, setStatus] = useState<"" | "error" | "done" | "backup">("");
  const [reading, setReading] = useState(false);
  const blocked = state !== "ready" || busy || reading;
  async function read(file?: File) {
    setPreview(null); setStatus(""); setMode("merge"); if (!file) return;
    setReading(true);
    try {
      if (file.size > projectLimits.bytes) throw Error("Collection too large");
      const raw = await file.text(); setPreview({ ...previewCollection(raw), raw });
    } catch { setStatus("error"); }
    finally { setReading(false); }
  }
  function backup() {
    try {
      const raw = backupCollection(); const url = URL.createObjectURL(new Blob([raw], { type: "application/json;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `research-projects-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus("backup");
    } catch { setStatus("error"); }
  }
  async function apply() {
    if (!preview || blocked || mode === "merge" && !preview.mergeAvailable) return;
    if (!window.confirm(mode === "merge" ? m.collectionConfirmMerge : m.collectionConfirmReplace)) return;
    const accepted = await restoreCollection(preview.raw, mode, preview.revision);
    setStatus(accepted ? "done" : "error"); if (accepted) setPreview(null);
  }
  return <div className="mt-4 text-sm" data-notebook-collection>
    <button type="button" className="rounded-full border border-[var(--line)] px-3 py-2" disabled={busy || reading || state === "loading" || state === "corrupt"} onClick={backup}>{m.collectionBackup}</button>
    <details className="mt-3 rounded-xl border border-[var(--line)] p-3"><summary className="cursor-pointer font-semibold">{m.collectionRestore}</summary>
      <p className="mt-3 text-xs leading-6">{m.collectionPrivacy}</p>
      <label className="mt-3 block">{m.collectionFile}<input type="file" accept=".json,application/json" disabled={blocked} className="mt-2 block max-w-full text-xs" onChange={event => { void read(event.target.files?.[0]); event.target.value = ""; }} /></label>
      {preview ? <section className="mt-4 min-w-0 break-words" aria-label={m.collectionPreview} data-collection-preview>
        <h3 className="font-semibold">{m.collectionPreview} · {preview.incoming.projects.length}</h3>
        <p className="mt-2 text-xs">{m.collectionSchema}: {preview.incoming.schema}</p>
        <ul className="mt-3 space-y-3 text-xs">{preview.incoming.projects.map(project => <li key={project.id}><strong>{project.notebook.title || m.unnamed}</strong> · {project.notebook.items.length} {m.items}<br />ID: {project.id}<br />{m.collectionDates}: <time>{project.notebook.created_at}</time> / <time>{project.notebook.updated_at}</time></li>)}</ul>
        {preview.collisions > 0 ? <p className="mt-3 text-xs leading-6">{m.collectionCollisions}</p> : null}
        {!preview.mergeAvailable ? <p className="mt-3 text-xs leading-6" role="status">{m.collectionLimits}</p> : null}
        <label className="mt-3 block">{m.collectionMode}<select aria-label={m.collectionMode} className="field-control mt-2" disabled={blocked} value={mode} onChange={event => setMode(event.target.value as CollectionRestoreMode)}><option value="merge" disabled={!preview.mergeAvailable}>{m.collectionMerge}</option><option value="replace">{m.collectionReplace}</option></select></label>
        <div className="mt-3 flex flex-wrap gap-3"><button type="button" className="rounded-full border border-[var(--line)] px-3 py-2" disabled={blocked || mode === "merge" && !preview.mergeAvailable} onClick={() => void apply()}>{m.collectionApply}</button><button type="button" disabled={busy} onClick={() => { setPreview(null); setStatus(""); }}>{m.collectionCancel}</button></div>
      </section> : null}
    </details>
    {status ? <p className="mt-3 text-xs leading-6" role={status === "error" ? "alert" : "status"}>{status === "error" ? m.collectionError : status === "done" ? m.collectionDone : m.collectionBackupDone}</p> : null}
  </div>;
}
