"use client";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { ResearchNotebook } from "@/lib/researchNotebook";
import { notebookMessages } from "@/content/notebookMessages";
import { buildEvidenceBrief, notebookBriefMessages, serializeEvidenceBrief } from "@/lib/notebookBrief";
import { EXTERNAL_SOURCE_REL } from "@/lib/safeNavigation";

export function NotebookEvidenceBrief({ notebook, locale, disabled }: { notebook: ResearchNotebook; locale: Locale; disabled: boolean }) {
  const m = notebookBriefMessages[locale], labels = notebookMessages[locale];
  const [excluded, setExcluded] = useState<string[]>([]), [order, setOrder] = useState<string[]>([]);
  const [exportedAt, setExportedAt] = useState(""), [status, setStatus] = useState<"idle" | "done" | "error">("idle");
  const ids = [...order.filter(id => notebook.items.some(item => item.id === id)), ...notebook.items.filter(item => !order.includes(item.id)).map(item => item.id)];
  const selected = ids.filter(id => !excluded.includes(id));
  const brief = exportedAt && selected.length ? buildEvidenceBrief(notebook, selected, locale, exportedAt) : null;
  const move = (id: string, step: number) => {
    const next = [...ids], index = next.indexOf(id), target = index + step;
    if (index >= 0 && target >= 0 && target < next.length) { [next[index], next[target]] = [next[target], next[index]]; setOrder(next); }
  };
  const download = () => {
    try {
      const time = new Date().toISOString();
      const content = serializeEvidenceBrief(buildEvidenceBrief(notebook, selected, locale, time));
      const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `atlas-evidence-brief-${locale}-${time.slice(0, 10)}.md`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000); setExportedAt(time); setStatus("done");
    } catch { setStatus("error"); }
  };
  return <details className="mt-6 rounded-xl border border-[var(--line)] p-4" data-notebook-brief onToggle={event => { if (event.currentTarget.open) setExportedAt(new Date().toISOString()); }}>
    <summary className="cursor-pointer text-sm font-semibold">{m.open}</summary>
    <p className="mt-4 text-sm leading-7">{m.selectionNote}</p>
    <fieldset disabled={disabled} className="mt-4 min-w-0">
      <legend className="font-semibold">{m.select}</legend>
      <div className="mt-3 flex flex-wrap gap-4 text-sm"><button type="button" onClick={() => setExcluded([])}>{m.all}</button><button type="button" onClick={() => setExcluded(ids)}>{m.none}</button><span aria-live="polite">{m.selected}: {selected.length} / {ids.length}</span></div>
      <ol className="mt-4 space-y-3">{ids.map((id, index) => {
        const item = notebook.items.find(item => item.id === id)!, title = item.labels?.[locale] || item.title;
        return <li key={id} className="flex min-w-0 flex-wrap items-start gap-3 rounded-lg border border-[var(--line)] p-3" data-brief-choice={id}>
          <label className="flex min-w-0 flex-1 items-start gap-2 break-words text-sm"><input type="checkbox" className="mt-1 shrink-0" checked={!excluded.includes(id)} onChange={e => { setExcluded(current => e.target.checked ? current.filter(value => value !== id) : [...current, id]); setStatus("idle"); }} /><span className="min-w-0 break-words">{title}</span></label>
          <div className="flex gap-3 text-xs"><button type="button" aria-label={`${labels.up}: ${title}`} disabled={index === 0} onClick={() => move(id, -1)}>{labels.up}</button><button type="button" aria-label={`${labels.down}: ${title}`} disabled={index === ids.length - 1} onClick={() => move(id, 1)}>{labels.down}</button></div>
        </li>;
      })}</ol>
    </fieldset>
    <button type="button" className="mt-5 rounded-full border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)]" disabled={disabled || !selected.length} onClick={download}>{m.export}</button>
    <p className="mt-3 text-sm" role="status">{status === "done" ? labels.done : status === "error" ? labels.error : !selected.length ? m.empty : ""}</p>
    {brief ? <section className="mt-6 min-w-0 border-t border-[var(--line)] pt-5" aria-label={m.preview} data-brief-preview>
      <h2 className="text-2xl font-semibold break-words">{brief.title}</h2>
      {brief.introduction.map((text, i) => <p key={i} className="mt-3 text-sm leading-7">{text}</p>)}
      {brief.sections.map((section, index) => <section key={index} className="mt-6 min-w-0">
        {section.level === 2 ? <h3 className="text-xl font-semibold break-words">{section.title}</h3> : <h4 className="text-lg font-semibold break-words">{section.title}</h4>}
        {section.paragraphs.map((text, i) => <p key={i} className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{text}</p>)}
        {section.fields.length ? <dl className="mt-3 grid min-w-0 gap-3 text-sm">{section.fields.map((field, i) => <div key={i} className="min-w-0"><dt className="font-semibold">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{field.href ? <a href={field.href} rel={EXTERNAL_SOURCE_REL} className="text-[var(--accent)] underline">{field.value}</a> : field.value}</dd></div>)}</dl> : null}
      </section>)}
    </section> : null}
  </details>;
}
