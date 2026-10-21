"use client";
import { useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { notebookProjectMessages } from "@/lib/notebookProjectMessages";
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
    <p className="mt-4 text-xs leading-6 text-[var(--muted)]">{m.privacy}</p>
    {activeId === "legacy" && legacyPresent && state !== "corrupt" ? <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{m.legacy}</p> : null}
    {busy ? <p className="mt-3 text-sm" aria-live="polite">{m.saving}</p> : null}
    {issue ? <p className="mt-3 text-sm leading-7" role="alert">{m[issue === "storage" ? "memory" : issue]}</p> : null}
    {state === "memory" ? <div className="mt-3 flex flex-wrap gap-4 text-sm"><button type="button" disabled={busy || issue !== "storage"} onClick={() => void retrySave()}>{m.retry}</button><button type="button" disabled={busy} onClick={() => void recoverCopy()}>{m.recover}</button></div> : null}
  </section>;
}
