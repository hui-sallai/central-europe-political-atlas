"use client";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { EvidenceType, ResearchNotebook } from "@/lib/researchNotebook";
import { notebookMessages } from "@/content/notebookMessages";
import {
  buildEvidenceBrief,
  buildReportStudioSummary,
  notebookBriefMessages,
  serializeBriefBibTeX,
  serializeBriefCslJson,
  serializeBriefHtml,
  serializeEvidenceBrief,
  type BriefTemplate,
} from "@/lib/notebookBrief";
import { EXTERNAL_SOURCE_REL } from "@/lib/safeNavigation";

function triggerDownload(content: string, mime: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function NotebookEvidenceBrief({ notebook, locale, disabled }: { notebook: ResearchNotebook; locale: Locale; disabled: boolean }) {
  const m = notebookBriefMessages[locale], labels = notebookMessages[locale];
  const [excluded, setExcluded] = useState<string[]>([]), [order, setOrder] = useState<string[]>([]);
  const [template, setTemplate] = useState<BriefTemplate>("standard");
  const [typeFilter, setTypeFilter] = useState<"all" | EvidenceType>("all");
  const [exportedAt, setExportedAt] = useState(""), [status, setStatus] = useState<"idle" | "done" | "copied" | "error">("idle");
  const ids = [...order.filter(id => notebook.items.some(item => item.id === id)), ...notebook.items.filter(item => !order.includes(item.id)).map(item => item.id)];
  const availableTypes = [...new Set(notebook.items.map(item => item.type))];
  const visibleIds = typeFilter === "all" ? ids : ids.filter(id => notebook.items.find(item => item.id === id)?.type === typeFilter);
  const selected = ids.filter(id => !excluded.includes(id));
  const summary = buildReportStudioSummary(notebook, selected);
  const brief = exportedAt && selected.length ? buildEvidenceBrief(notebook, selected, locale, exportedAt, template) : null;
  const move = (id: string, step: number) => {
    const next = [...ids], index = next.indexOf(id), target = index + step;
    if (index >= 0 && target >= 0 && target < next.length) { [next[index], next[target]] = [next[target], next[index]]; setOrder(next); }
  };
  const downloadMarkdown = () => {
    try {
      const time = new Date().toISOString();
      const content = serializeEvidenceBrief(buildEvidenceBrief(notebook, selected, locale, time, template));
      triggerDownload(content, "text/markdown;charset=utf-8", `atlas-evidence-brief-${locale}-${time.slice(0, 10)}.md`);
      setExportedAt(time); setStatus("done");
    } catch { setStatus("error"); }
  };
  const copyMarkdown = async () => {
    try {
      const time = new Date().toISOString();
      const content = serializeEvidenceBrief(buildEvidenceBrief(notebook, selected, locale, time, template));
      await navigator.clipboard.writeText(content);
      setExportedAt(time); setStatus("copied");
    } catch { setStatus("error"); }
  };
  const downloadHtml = () => {
    try {
      const time = new Date().toISOString();
      const content = serializeBriefHtml(buildEvidenceBrief(notebook, selected, locale, time, template), locale);
      triggerDownload(content, "text/html;charset=utf-8", `atlas-research-report-${locale}-${time.slice(0, 10)}.html`);
      setExportedAt(time); setStatus("done");
    } catch { setStatus("error"); }
  };
  const downloadBibtex = () => {
    try {
      const time = new Date().toISOString();
      const content = serializeBriefBibTeX(notebook, selected, locale, time);
      triggerDownload(content, "application/x-bibtex;charset=utf-8", `atlas-citations-${locale}-${time.slice(0, 10)}.bib`);
      setExportedAt(time); setStatus("done");
    } catch { setStatus("error"); }
  };
  const downloadCsl = () => {
    try {
      const time = new Date().toISOString();
      const content = serializeBriefCslJson(notebook, selected, locale, time);
      triggerDownload(content, "application/vnd.citationstyles.csl+json;charset=utf-8", `atlas-citations-${locale}-${time.slice(0, 10)}.csl.json`);
      setExportedAt(time); setStatus("done");
    } catch { setStatus("error"); }
  };
  return <details className="mt-6 rounded-xl border border-[var(--line)] p-4" data-notebook-brief onToggle={event => { if (event.currentTarget.open) setExportedAt(new Date().toISOString()); }}>
    <summary className="cursor-pointer text-sm font-semibold">{m.open}</summary>
    <p className="mt-4 text-sm leading-7">{m.selectionNote}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2" data-report-studio-controls>
      <label className="text-sm">{m.templateLabel}
        <select aria-label={m.templateLabel} data-report-template className="field-control mt-2" disabled={disabled} value={template} onChange={e => { setTemplate(e.target.value as BriefTemplate); setStatus("idle"); }}>
          <option value="standard">{m.templateStandard}</option>
          <option value="comparative_note">{m.templateComparative}</option>
          <option value="methodological_audit">{m.templateAudit}</option>
        </select>
      </label>
      <label className="text-sm">{m.filterType}
        <select aria-label={m.filterType} data-report-type-filter className="field-control mt-2" disabled={disabled} value={typeFilter} onChange={e => setTypeFilter(e.target.value as "all" | EvidenceType)}>
          <option value="all">{m.filterAll}</option>
          {availableTypes.map(type => <option key={type} value={type}>{labels[type]}</option>)}
        </select>
      </label>
    </div>
    <dl className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-3 text-xs sm:grid-cols-4" data-report-readiness aria-label={m.readinessLabel}>
      <div><dt className="text-[var(--muted)]">{m.selected}</dt><dd className="mt-0.5 font-semibold">{summary.selectedCount} / {summary.totalCount}</dd></div>
      <div><dt className="text-[var(--muted)]">{m.readinessLayers}</dt><dd className="mt-0.5 font-semibold">{summary.layers.length}</dd></div>
      <div><dt className="text-[var(--muted)]">{m.readinessSources}</dt><dd className="mt-0.5 font-semibold">{summary.sourceCount}</dd></div>
      <div><dt className="text-[var(--muted)]">{m.readinessWarnings}</dt><dd className="mt-0.5 font-semibold">{summary.warningItemCount}</dd></div>
      {summary.missingValueCount > 0 ? <div><dt className="text-[var(--muted)]">{m.readinessMissing}</dt><dd className="mt-0.5 font-semibold">{summary.missingValueCount}</dd></div> : null}
      {summary.configurationCount > 0 ? <div><dt className="text-[var(--muted)]">{m.readinessConfigs}</dt><dd className="mt-0.5 font-semibold">{summary.configurationCount}</dd></div> : null}
      {summary.blockedOrInactiveCount > 0 ? <div><dt className="text-[var(--muted)]">{m.readinessBlocked}</dt><dd className="mt-0.5 font-semibold">{summary.blockedOrInactiveCount}</dd></div> : null}
      {summary.unsourcedCount > 0 ? <div><dt className="text-[var(--muted)]">{m.readinessUnsourced}</dt><dd className="mt-0.5 font-semibold">{summary.unsourcedCount}</dd></div> : null}
    </dl>
    <fieldset disabled={disabled} className="mt-4 min-w-0">
      <legend className="font-semibold">{m.select}</legend>
      <div className="mt-3 flex flex-wrap gap-4 text-sm"><button type="button" onClick={() => setExcluded([])}>{m.all}</button><button type="button" onClick={() => setExcluded(ids)}>{m.none}</button><span aria-live="polite">{m.selected}: {selected.length} / {ids.length}</span></div>
      <ol className="mt-4 space-y-3">{visibleIds.map((id) => {
        const index = ids.indexOf(id);
        const item = notebook.items.find(item => item.id === id)!, title = item.labels?.[locale] || item.title;
        return <li key={id} className="flex min-w-0 flex-wrap items-start gap-3 rounded-lg border border-[var(--line)] p-3" data-brief-choice={id}>
          <label className="flex min-w-0 flex-1 items-start gap-2 break-words text-sm"><input type="checkbox" className="mt-1 shrink-0" checked={!excluded.includes(id)} onChange={e => { setExcluded(current => e.target.checked ? current.filter(value => value !== id) : [...current, id]); setStatus("idle"); }} /><span className="min-w-0 break-words">{title}</span></label>
          <div className="flex gap-3 text-xs"><button type="button" aria-label={`${labels.up}: ${title}`} disabled={index === 0} onClick={() => move(id, -1)}>{labels.up}</button><button type="button" aria-label={`${labels.down}: ${title}`} disabled={index === ids.length - 1} onClick={() => move(id, 1)}>{labels.down}</button></div>
        </li>;
      })}</ol>
    </fieldset>
    <div className="mt-5 flex flex-wrap gap-3" data-report-exports>
      <button type="button" className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)]" disabled={disabled || !selected.length} onClick={downloadMarkdown}>{m.export}</button>
      <button type="button" data-copy-brief-md className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" disabled={disabled || !selected.length} onClick={() => void copyMarkdown()}>{m.copyMarkdown}</button>
      <button type="button" data-export-brief-html className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" disabled={disabled || !selected.length} onClick={downloadHtml}>{m.exportHtml}</button>
      <button type="button" data-export-brief-bibtex className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" disabled={disabled || !selected.length} onClick={downloadBibtex}>{m.exportBibtex}</button>
      <button type="button" data-export-brief-csl className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" disabled={disabled || !selected.length} onClick={downloadCsl}>{m.exportCsl}</button>
      <button type="button" data-print-brief className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" disabled={disabled || !selected.length} onClick={() => window.print()}>{m.printReport}</button>
    </div>
    <p className="mt-3 text-sm" role="status">{status === "done" ? labels.done : status === "copied" ? m.copied : status === "error" ? labels.error : !selected.length ? m.empty : ""}</p>
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
