"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { EvidenceType, ResearchNotebook } from "@/lib/researchNotebook";
import { notebookMessages } from "@/content/notebookMessages";
import {
  buildEvidenceBrief,
  buildReportStudioSummary,
  notebookBriefMessages,
  serializeBriefHtml,
  serializeEvidenceBrief,
  type BriefTemplate,
} from "@/lib/notebookBrief";
import { buildReportCitationBundle } from "@/lib/notebookCitations";
import { buildZip } from "@/lib/clientZip";
import { EXTERNAL_SOURCE_REL } from "@/lib/safeNavigation";
import { ResearchPackageComposer } from "./ResearchPackageComposer";

function triggerDownload(content: BlobPart, mime: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function NotebookEvidenceBrief({ projectId, notebook, locale, disabled }: { projectId: string; notebook: ResearchNotebook; locale: Locale; disabled: boolean }) {
  const m = notebookBriefMessages[locale], labels = notebookMessages[locale];
  const [excluded, setExcluded] = useState<string[]>([]), [order, setOrder] = useState<string[]>([]);
  const [deselectGen, setDeselectGen] = useState<Record<string, number>>({});
  const [template, setTemplate] = useState<BriefTemplate>("standard");
  const [typeFilter, setTypeFilter] = useState<"all" | EvidenceType>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reportTime, setReportTime] = useState("");
  const [status, setStatus] = useState<"idle" | "done" | "copied" | "copy_error" | "print_error" | "error">("idle");
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => () => {
    printFrameRef.current?.remove();
    printFrameRef.current = null;
  }, []);

  const ids = [
    ...order.filter(id => notebook.items.some(item => item.id === id)),
    ...notebook.items.filter(item => !order.includes(item.id)).map(item => item.id),
  ];
  const availableTypes = [...new Set(notebook.items.map(item => item.type))];
  const availableCountries = [...new Set(notebook.items.flatMap(item => item.countries))].sort();
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasFilter = typeFilter !== "all" || countryFilter !== "all" || normalizedQuery.length > 0;

  const visibleIds = ids.filter(id => {
    const item = notebook.items.find(entry => entry.id === id)!;
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (countryFilter !== "all" && !item.countries.includes(countryFilter)) return false;
    if (normalizedQuery) {
      const sourceText = item.source_ids
        .map(sid => notebook.sources.find(s => s.id === sid))
        .filter(Boolean)
        .map(s => `${s!.institution} ${s!.dataset} ${s!.code ?? ""}`)
        .join(" ");
      const haystack = [
        item.id,
        item.title,
        item.labels?.[locale] ?? "",
        item.layer,
        item.countries.join(" "),
        item.periods.join(" "),
        item.canonical_ids.join(" "),
        item.note,
        sourceText,
      ].join(" ").toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });

  const selected = ids.filter(id => !excluded.includes(id));
  const visibleSet = new Set(visibleIds);
  const hiddenSelectedCount = selected.filter(id => !visibleSet.has(id)).length;
  const summary = buildReportStudioSummary(notebook, selected);
  const activeTimestamp = reportTime || "";
  const brief = activeTimestamp && selected.length ? buildEvidenceBrief(notebook, selected, locale, activeTimestamp, template) : null;

  const move = (id: string, step: -1 | 1) => {
    const visibleIndex = visibleIds.indexOf(id);
    const targetVisibleIndex = visibleIndex + step;
    if (visibleIndex < 0 || targetVisibleIndex < 0 || targetVisibleIndex >= visibleIds.length) return;
    const neighborId = visibleIds[targetVisibleIndex];
    const next = [...ids];
    const i = next.indexOf(id), j = next.indexOf(neighborId);
    if (i >= 0 && j >= 0) {
      [next[i], next[j]] = [next[j], next[i]];
      setOrder(next);
      setStatus("idle");
    }
  };

  const clearFilters = () => {
    setTypeFilter("all");
    setCountryFilter("all");
    setSearchQuery("");
  };

  const selectAllVisible = () => {
    setExcluded(current => current.filter(id => !visibleSet.has(id)));
    setStatus("idle");
  };

  const ensureTimestamp = () => {
    if (reportTime) return reportTime;
    const now = new Date().toISOString();
    setReportTime(now);
    return now;
  };

  const downloadMarkdown = () => {
    try {
      const time = ensureTimestamp();
      const content = serializeEvidenceBrief(buildEvidenceBrief(notebook, selected, locale, time, template));
      triggerDownload(content, "text/markdown;charset=utf-8", `atlas-evidence-brief-${locale}-${time.slice(0, 10)}.md`);
      setStatus("done");
    } catch { setStatus("error"); }
  };

  const copyMarkdown = async () => {
    try {
      const time = ensureTimestamp();
      const content = serializeEvidenceBrief(buildEvidenceBrief(notebook, selected, locale, time, template));
      if (!navigator.clipboard?.writeText) throw Error("Clipboard unavailable");
      await navigator.clipboard.writeText(content);
      setStatus("copied");
    } catch { setStatus("copy_error"); }
  };

  const downloadHtml = () => {
    try {
      const time = ensureTimestamp();
      const content = serializeBriefHtml(buildEvidenceBrief(notebook, selected, locale, time, template), locale);
      triggerDownload(content, "text/html;charset=utf-8", `atlas-research-report-${locale}-${time.slice(0, 10)}.html`);
      setStatus("done");
    } catch { setStatus("error"); }
  };

  const downloadCitations = () => {
    try {
      const time = ensureTimestamp();
      const bundle = buildReportCitationBundle(notebook, selected, locale, time, template, projectId);
      const archive = buildZip([
        { name: "citations.bib", content: bundle.bibtex },
        { name: "citations.csl.json", content: bundle.cslJson },
        { name: "report_manifest.json", content: bundle.manifestJson },
      ], time);
      triggerDownload(archive, "application/zip", `atlas-report-citations-${locale}-${time.slice(0, 10)}.zip`);
      setStatus("done");
    } catch { setStatus("error"); }
  };

  const printIsolatedReport = () => {
    try {
      const time = ensureTimestamp();
      const html = serializeBriefHtml(buildEvidenceBrief(notebook, selected, locale, time, template), locale);
      printFrameRef.current?.remove();
      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.setAttribute("data-isolated-report-print-frame", "true");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      const cleanup = () => {
        if (printFrameRef.current === iframe) printFrameRef.current = null;
        iframe.remove();
      };
      iframe.onload = () => {
        try {
          const win = iframe.contentWindow;
          if (!win || typeof win.print !== "function") throw Error("Print unavailable");
          win.addEventListener("afterprint", cleanup, { once: true });
          win.focus();
          win.print();
          setStatus("done");
        } catch {
          cleanup();
          setStatus("print_error");
        }
      };
      iframe.srcdoc = html;
      printFrameRef.current = iframe;
      document.body.appendChild(iframe);
    } catch {
      setStatus("print_error");
    }
  };

  return <><details className="mt-6 rounded-xl border border-[var(--line)] p-4" data-notebook-brief onToggle={event => { if (event.currentTarget.open) setReportTime(new Date().toISOString()); }}>
    <summary className="cursor-pointer text-sm font-semibold">{m.open}</summary>
    <p className="mt-4 text-sm leading-7">{m.selectionNote}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-report-studio-controls>
      <label className="text-sm">{m.templateLabel}
        <select aria-label={m.templateLabel} data-report-template className="field-control mt-2" disabled={disabled} value={template} onChange={e => { setTemplate(e.target.value as BriefTemplate); setStatus("idle"); }}>
          <option value="standard">{m.templateStandard}</option>
          <option value="comparative_note">{m.templateComparative}</option>
          <option value="methodological_audit">{m.templateAudit}</option>
        </select>
      </label>
      <label className="text-sm">{m.searchLabel}
        <input type="search" aria-label={m.searchLabel} data-report-search className="field-control mt-2" disabled={disabled} placeholder={m.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </label>
      <label className="text-sm">{m.filterType}
        <select aria-label={m.filterType} data-report-type-filter className="field-control mt-2" disabled={disabled} value={typeFilter} onChange={e => setTypeFilter(e.target.value as "all" | EvidenceType)}>
          <option value="all">{m.filterAll}</option>
          {availableTypes.map(type => <option key={type} value={type}>{labels[type]}</option>)}
        </select>
      </label>
      <label className="text-sm">{m.filterCountry}
        <select aria-label={m.filterCountry} data-report-country-filter className="field-control mt-2" disabled={disabled} value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
          <option value="all">{m.filterAll}</option>
          {availableCountries.map(country => <option key={country} value={country}>{country}</option>)}
        </select>
      </label>
    </div>
    {hasFilter ? <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
      <button type="button" data-report-clear-filters className="underline text-[var(--accent)]" onClick={clearFilters}>{m.clearFilters}</button>
      {visibleIds.length > 0 ? <button type="button" data-select-all-visible className="underline" disabled={disabled} onClick={selectAllVisible}>{m.selectAllVisible} ({visibleIds.length})</button> : null}
    </div> : null}
    <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-3" data-report-readiness>
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5" aria-label={m.readinessLabel}>
        <div><dt className="text-[var(--muted)]">{m.selected}</dt><dd className="mt-0.5 font-semibold">{summary.selectedCount} / {summary.totalCount}</dd></div>
        <div><dt className="text-[var(--muted)]">{m.readinessNumerical}</dt><dd className="mt-0.5 font-semibold">{summary.recordedNumericalCount}</dd></div>
        <div><dt className="text-[var(--muted)]">{m.readinessExplicitNull}</dt><dd className="mt-0.5 font-semibold">{summary.explicitNullCount}</dd></div>
        <div><dt className="text-[var(--muted)]">{m.readinessUnrecordedObs}</dt><dd className="mt-0.5 font-semibold">{summary.unrecordedObservationCount}</dd></div>
        <div><dt className="text-[var(--muted)]">{m.readinessConfigs}</dt><dd className="mt-0.5 font-semibold">{summary.configurationCount}</dd></div>
        <div><dt className="text-[var(--muted)]">{m.readinessSources}</dt><dd className="mt-0.5 font-semibold">{summary.sourceCount}</dd></div>
        <div><dt className="text-[var(--muted)]">{m.readinessUnsourced}</dt><dd className="mt-0.5 font-semibold">{summary.unsourcedCount}</dd></div>
        <div><dt className="text-[var(--muted)]">{m.readinessWarnings}</dt><dd className="mt-0.5 font-semibold">{summary.warningItemCount}</dd></div>
        <div><dt className="text-[var(--muted)]">{m.readinessBlockedMethods}</dt><dd className="mt-0.5 font-semibold">{summary.blockedOrInactiveMethodCount}</dd></div>
        <div><dt className="text-[var(--muted)]">{m.readinessLayers}</dt><dd className="mt-0.5 font-semibold">{summary.layers.length}{summary.layers.length ? ` (${summary.layers.join(" · ")})` : ""}</dd></div>
      </dl>
      <p className="mt-2 text-xs text-[var(--muted)]">{m.includedCountries}: {summary.countries.length ? summary.countries.join(" · ") : m.unknown} · {m.readinessMetadataNote}</p>
    </div>
    <fieldset disabled={disabled} className="mt-4 min-w-0">
      <legend className="font-semibold">{m.select}</legend>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm" data-report-selection-counts>
        <button type="button" onClick={() => { setExcluded([]); setStatus("idle"); }}>{m.all}</button>
        <button type="button" onClick={() => { setExcluded(ids); setDeselectGen(prev => { const next = { ...prev }; for (const id of ids) next[id] = (next[id] ?? 0) + 1; return next; }); setStatus("idle"); }}>{m.none}</button>
        <span aria-live="polite">{m.selected}: {selected.length} / {ids.length} · {m.visibleCount}: {visibleIds.length} / {ids.length}</span>
      </div>
      {hiddenSelectedCount > 0 ? <p className="mt-2 text-xs text-[var(--muted)]" role="status" data-hidden-selected-count>{hiddenSelectedCount} {m.hiddenSelectedNote}</p> : null}
      {visibleIds.length === 0 ? <p className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-3 text-sm" role="status" data-report-empty-filter>{m.emptyFilterNotice} <button type="button" className="underline text-[var(--accent)]" onClick={clearFilters}>{m.clearFilters}</button></p> : null}
      <ol className="mt-4 space-y-3">{visibleIds.map((id, visibleIndex) => {
        const item = notebook.items.find(entry => entry.id === id)!, title = item.labels?.[locale] || item.title;
        return <li key={id} className="flex min-w-0 flex-wrap items-start gap-3 rounded-lg border border-[var(--line)] p-3" data-brief-choice={id}>
          <label className="flex min-w-0 flex-1 items-start gap-2 break-words text-sm"><input type="checkbox" className="mt-1 shrink-0" checked={!excluded.includes(id)} onChange={e => { setExcluded(current => e.target.checked ? current.filter(value => value !== id) : [...current, id]); if (!e.target.checked) setDeselectGen(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 })); setStatus("idle"); }} /><span className="min-w-0 break-words">{title}</span></label>
          <div className="flex gap-3 text-xs"><button type="button" aria-label={`${labels.up}: ${title}`} disabled={visibleIndex === 0} onClick={() => move(id, -1)}>{labels.up}</button><button type="button" aria-label={`${labels.down}: ${title}`} disabled={visibleIndex === visibleIds.length - 1} onClick={() => move(id, 1)}>{labels.down}</button></div>
        </li>;
      })}</ol>
    </fieldset>
    <div className="mt-5 flex flex-wrap gap-3" data-report-exports>
      <button type="button" className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)]" disabled={disabled || !selected.length} onClick={downloadMarkdown}>{m.export}</button>
      <button type="button" data-copy-brief-md className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" disabled={disabled || !selected.length} onClick={() => void copyMarkdown()}>{m.copyMarkdown}</button>
      <button type="button" data-export-brief-html className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" disabled={disabled || !selected.length} onClick={downloadHtml}>{m.exportHtml}</button>
      <button type="button" data-export-citation-bundle aria-describedby="citation-export-disclosure" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" disabled={disabled || !selected.length} onClick={downloadCitations}>{m.exportCitations}</button>
      <button type="button" data-print-brief className="rounded-full border border-[var(--line)] px-4 py-2 text-sm" disabled={disabled || !selected.length} onClick={printIsolatedReport}>{m.printReport}</button>
    </div>
    <p id="citation-export-disclosure" data-citation-disclosure className="mt-2 max-w-prose text-sm text-[var(--muted)]">{m.citationDisclosure}</p>
    <p className="mt-2 text-xs text-[var(--muted)]">{m.printHint}</p>
    <p className="mt-3 text-sm" role="status" data-report-status>{status === "done" ? labels.done : status === "copied" ? m.copied : status === "copy_error" ? m.copyError : status === "print_error" ? m.printError : status === "error" ? labels.error : !selected.length ? m.empty : ""}</p>
    {brief ? <section className="mt-6 min-w-0 border-t border-[var(--line)] pt-5" aria-label={m.preview} data-brief-preview>
      <h2 className="text-2xl font-semibold break-words">{brief.title}</h2>
      {brief.introduction.map((text, i) => <p key={i} className="mt-3 text-sm leading-7">{text}</p>)}
      {brief.sections.map((section, index) => <section key={index} className="mt-6 min-w-0">
        {section.level === 2 ? <h3 className="text-xl font-semibold break-words">{section.title}</h3> : <h4 className="text-lg font-semibold break-words">{section.title}</h4>}
        {section.paragraphs.map((text, i) => <p key={i} className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{text}</p>)}
        {section.fields.length ? <dl className="mt-3 grid min-w-0 gap-3 text-sm">{section.fields.map((field, i) => <div key={i} className="min-w-0"><dt className="font-semibold">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{field.href ? <a href={field.href} rel={EXTERNAL_SOURCE_REL} className="text-[var(--accent)] underline">{field.value}</a> : field.value}</dd></div>)}</dl> : null}
      </section>)}
    </section> : null}
  </details>
  <ResearchPackageComposer
    projectId={projectId}
    notebook={notebook}
    selectedIds={selected}
    deselectGen={deselectGen}
    locale={locale}
    template={template}
    reportTime={reportTime}
    ensureTimestamp={ensureTimestamp}
    disabled={disabled}
  /></>;
}
