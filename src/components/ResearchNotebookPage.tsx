"use client";
import { useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { localeNumber, localizedRoute } from "@/i18n/config";
import { notebookMessages } from "@/content/notebookMessages";
import { notebookLimits, notebookTypes, parseNotebook, type EvidenceType, type NotebookItem } from "@/lib/researchNotebook";
import { useResearchNotebook } from "./ResearchNotebookProvider";
const groups: { label: "dataGroup" | "eventGroup" | "regionGroup" | "methodGroup" | "workspaceGroup" | "sourceGroup"; types: EvidenceType[] }[] = [
  { label: "dataGroup", types: ["observation", "series_view", "country_comparison"] }, { label: "eventGroup", types: ["event"] }, { label: "regionGroup", types: ["regional_view", "map_view"] }, { label: "methodGroup", types: ["method"] }, { label: "workspaceGroup", types: ["workspace"] }, { label: "sourceGroup", types: ["source"] },
];
function downloadText(text: string, filename: string) { const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function ResearchNotebookPage() {
  const locale = useLocale(), m = notebookMessages[locale]; const { notebook, state, error, raw, update, replace, clear } = useResearchNotebook();
  const [type, setType] = useState("all"), [country, setCountry] = useState("all"), [action, setAction] = useState<"idle" | "done" | "error">("idle");
  const disabled = state === "loading" || state === "corrupt";
  const noteCharacters = notebook ? notebook.user_notes.length + notebook.research_question.length + notebook.items.reduce((total,item) => total + item.note.length,0) : 0;
  const nearLimit = notebook && (notebook.items.length >= notebookLimits.items * .8 || noteCharacters >= notebookLimits.totalNotes * .8 || new TextEncoder().encode(JSON.stringify(notebook)).length >= notebookLimits.bytes * .8);
  const editItem = (id: string, patch: Partial<NotebookItem>) => update(n => ({ ...n, items: n.items.map(i => i.id === id ? { ...i, ...patch } : i) }));
  const move = (id: string, step: number) => update(n => { const items = [...n.items], i = items.findIndex(i => i.id === id), j = i + step; if (j >= 0 && j < items.length) [items[i],items[j]] = [items[j],items[i]]; return { ...n, items }; });
  async function importFile(file?: File) { if (!file) return; setAction("idle"); try {
    if (file.size > notebookLimits.bytes) throw Error("Too large"); const value = parseNotebook(await file.text());
    if ((state === "corrupt" || notebook && (notebook.items.length || notebook.title || notebook.user_notes || notebook.research_question)) && !window.confirm(m.confirmReplace)) return;
    replace(value);
  } catch { setAction("error"); } }
  async function exportFile() { if (!notebook) return; try { const [{ notebookExportFiles }, { buildZip }] = await Promise.all([import("@/lib/notebookExport"), import("@/lib/clientZip")]); const exportedAt = new Date().toISOString(); const files = notebookExportFiles({ ...notebook, locale }, exportedAt); const bytes = buildZip(files, exportedAt); const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" })); const a = document.createElement("a"); a.href = url; a.download = `research-notebook-${exportedAt.slice(0,10)}.zip`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url),1000); setAction("done"); } catch { setAction("error"); } }
  const visible = notebook?.items.filter(i => (type === "all" || type === i.type) && (country === "all" || i.countries.includes(country))) ?? [];
  return <main className="mx-auto max-w-[1120px] px-6 py-12" data-notebook-page>
    <h1 className="editorial-headline text-4xl font-bold">{m.title}</h1><p className="mt-4 text-sm leading-7">{m.privacy}</p><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{m.boundary}</p>
    <p className="mt-4 rounded-xl border border-[var(--line)] p-3 text-sm" role="status">{m[state]}{error || action === "error" ? ` · ${m.error}` : action === "done" ? ` · ${m.done}` : ""}</p>
    {state === "corrupt" && raw !== null ? <button className="mt-3 text-sm text-[var(--accent)]" onClick={() => downloadText(raw, "notebook-recovery.txt")}>{m.recovery}</button> : null}
    {nearLimit ? <p className="mt-3 text-sm text-[var(--accent)]" data-notebook-capacity aria-live="polite">{m.capacityWarning}</p> : null}
    <section className="mt-8" aria-labelledby="notebook-question"><h2 id="notebook-question" className="text-2xl font-semibold">{m.question}</h2>
      <label className="mt-4 block text-sm">{m.notebookTitle}<input className="field-control mt-2" maxLength={200} disabled={disabled} value={notebook?.title ?? ""} onChange={e => update(n => ({ ...n, title: e.target.value }))} /></label>
      <label className="mt-4 block text-sm">{m.question}<textarea className="field-control mt-2 min-h-24" maxLength={4000} disabled={disabled} value={notebook?.research_question ?? ""} onChange={e => update(n => ({ ...n, research_question: e.target.value }))} /></label>
    </section>
    <section className="mt-10" aria-labelledby="notebook-evidence"><h2 id="notebook-evidence" className="text-2xl font-semibold">{m.evidence} · {notebook?.items.length ?? 0}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm">{m.type}<select aria-label={m.type} className="field-control mt-2" value={type} onChange={e => setType(e.target.value)}><option value="all">{m.all}</option>{notebookTypes.map(t => <option key={t} value={t}>{m[t]}</option>)}</select></label><label className="text-sm">{m.country}<select aria-label={m.country} className="field-control mt-2" value={country} onChange={e => setCountry(e.target.value)}><option value="all">{m.all}</option>{notebook?.selected_countries.map(c => <option key={c}>{c}</option>)}</select></label></div>
      {!visible.length ? <p className="mt-6 text-sm">{m.empty}</p> : null}
      {groups.map(group => { const items = visible.filter(i => group.types.includes(i.type)); return items.length ? <div key={group.label} className="mt-6"><h3 className="text-xl font-semibold">{m[group.label]}</h3>{items.map(item => {
        const original = !item.labels?.[locale]; const label = item.labels?.[locale] ?? item.title;
        return <article key={item.id} className="card mt-4 p-5" data-notebook-item={item.type}>
          <p className="text-xs text-[var(--muted)]">{m.atlas} · {m[item.type]}</p><h4 className="mt-2 text-lg font-semibold"><span {...(original && /[\u3400-\u9fff]/.test(label) ? { lang: "zh-CN", "data-original-language": "zh-CN" } : {})}>{label}</span></h4>{original ? <p className="mt-1 text-xs text-[var(--muted)]">{m.native}</p> : null}
          <p className="mt-3 text-sm metric-number">{item.countries.join(" / ")} · {item.periods.join(" → ")} · {item.unit ?? ""}{"value" in item ? ` · ${localeNumber(item.value, locale)}` : ""}</p>
          <p className="mt-2 text-xs">{m.collected}: {item.collected_at} · {item.platform_version}</p><p className="mt-2 text-sm">{m.comparable}: {item.comparability ?? "—"}</p>
          {item.metadata.state && item.metadata.state !== "active" ? <p className="mt-2 font-semibold text-sm">{m.inactive} · {item.metadata.state}</p> : null}
          <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">{(item.warning_labels?.[locale] ?? item.warnings).map((w,i) => <li key={i}><span {...(/[\u3400-\u9fff]/.test(w) ? { lang: "zh-CN", "data-original-language": "zh-CN" } : {})}>{w}</span></li>)}</ul>
          <details className="mt-3"><summary className="text-sm cursor-pointer">{m.atlas}</summary><pre className="mt-2 max-w-full whitespace-pre-wrap break-all text-xs">{JSON.stringify({ ids: item.canonical_ids, layer: item.layer, sources: item.source_ids, ...item.metadata },null,2)}</pre></details>
          <a href={localizedRoute(new URL(item.url).pathname,locale) + new URL(item.url).search + new URL(item.url).hash} className="mt-3 inline-block text-sm font-semibold text-[var(--accent)]">{m.open}</a>
          <div className="mt-4 border-t border-[var(--line)] pt-3"><label className="block text-sm">{m.itemNote}<textarea className="field-control mt-2" data-user-note maxLength={notebookLimits.note} disabled={disabled} value={item.note} onChange={e => editItem(item.id,{ note: e.target.value })} /></label></div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs"><button disabled={disabled || notebook?.items[0]?.id === item.id} onClick={() => move(item.id,-1)}>{m.up}</button><button disabled={disabled || notebook?.items.at(-1)?.id === item.id} onClick={() => move(item.id,1)}>{m.down}</button><button disabled={disabled} onClick={() => update(n => ({ ...n, items: n.items.filter(i => i.id !== item.id) }))}>{m.remove}</button></div>
        </article>;
      })}</div> : null; })}
    </section>
    <section className="mt-10" aria-labelledby="notebook-sources"><h2 id="notebook-sources" className="text-2xl font-semibold">{m.sources}</h2><ul className="mt-4 space-y-4 text-sm break-words">{notebook?.sources.map(s => <li key={s.id}><a href={s.url} className="text-[var(--accent)]"><span {...(/[\u3400-\u9fff]/.test(s.dataset+s.institution) ? { lang: "zh-CN", "data-original-language": "zh-CN" } : {})}>{s.institution} · {s.dataset}</span></a><p className="text-xs mt-1">{s.code} · {s.layer} · {s.original_unit} / {s.normalized_unit} · {s.retrieved_at} · {s.updated_at}</p></li>)}</ul></section>
    <section className="mt-10" aria-labelledby="notebook-methods"><h2 id="notebook-methods" className="text-2xl font-semibold">{m.methods}</h2><p className="mt-3 text-sm">{m.boundary}</p><ul className="mt-3 space-y-2 text-sm">{notebook?.methodology_warnings.map((w,i) => <li key={i}><span {...(/[\u3400-\u9fff]/.test(w) ? { lang: "zh-CN", "data-original-language": "zh-CN" } : {})}>{w}</span></li>)}</ul></section>
    <section className="mt-10" aria-labelledby="notebook-notes"><h2 id="notebook-notes" className="text-2xl font-semibold">{m.notes}</h2><label className="mt-3 block text-sm">{m.itemNote}<textarea className="field-control mt-2 min-h-32" disabled={disabled} maxLength={10000} value={notebook?.user_notes ?? ""} onChange={e => update(n => ({ ...n, user_notes: e.target.value }))} /></label></section>
    <section className="mt-10" aria-labelledby="notebook-export"><h2 id="notebook-export" className="text-2xl font-semibold">{m.export}</h2><p className="mt-3 text-xs leading-6 text-[var(--muted)]">{m.limits}</p><div className="mt-4 flex flex-wrap items-center gap-4"><button type="button" className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)]" disabled={disabled || !notebook} onClick={() => void exportFile()}>{m.exportButton}</button><label className="text-sm">{m.import}<input type="file" accept=".json,application/json" className="mt-2 block max-w-full text-xs" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ""; }} /></label><button type="button" className="text-sm text-[var(--accent)]" onClick={() => { if (window.confirm(m.confirmClear)) clear(); }}>{m.clear}</button></div></section>
  </main>;
}
