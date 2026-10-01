"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { localizedRoute } from "@/i18n/config";
import { workspaceMessages } from "@/content/workspaceMessages";
import type { WorkspacePayload, WorkspaceEvidenceCard } from "@/components/workspaceEvidence";
import { comparisonAllowed, evidenceLink, periodsInRange, workspaceLinks, workspaceToolLink, type WorkspaceSelection } from "@/components/workspaceLinks";
import { NotebookCollect } from "./NotebookCollect";
import { notebookMessages } from "@/content/notebookMessages";
import { PLATFORM_BASE_URL } from "@/lib/releaseMetadata";

export function ResearchWorkspace({ payload, locale }: { payload: WorkspacePayload; locale: Locale }) {
  const m = workspaceMessages[locale];
  const [primary, setPrimary] = useState("hungary");
  const [secondary, setSecondary] = useState("");
  const [from, setFrom] = useState(payload.horizon.from);
  const [to, setTo] = useState(payload.horizon.to);
  const [ready, setReady] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "preparing" | "done" | "error">("idle");
  const selection: WorkspaceSelection = { countries: [primary, ...(secondary && secondary !== primary ? [secondary] : [])], from, to };
  const years = payload.cards.flatMap(card => card.coverage.flatMap(row => row.periods)).map(period => Number(period.slice(0, 4))).filter(Number.isFinite);
  const minYear = Math.min(...years, payload.horizon.from);
  const maxYear = Math.max(...years, ...payload.events.map(event => Number(event.date.slice(0, 4))), payload.horizon.to);
  const options = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      const requested = [...new Set((params.get("countries") ?? params.get("country") ?? "hungary").split(","))].filter(id => payload.countries.some(country => country.id === id)).slice(0, 2);
      setPrimary(requested[0] ?? "hungary"); setSecondary(requested[1] ?? "");
      const year = (key: string, fallback: number) => /^\d{4}$/.test(params.get(key) ?? "") && Number(params.get(key)) >= minYear && Number(params.get(key)) <= maxYear ? Number(params.get(key)) : fallback;
      setFrom(year("from", payload.horizon.from)); setTo(year("to", payload.horizon.to)); setReady(true);
    };
    const timer = window.setTimeout(read, 0); window.addEventListener("popstate", read);
    return () => { window.clearTimeout(timer); window.removeEventListener("popstate", read); };
  }, [payload, minYear, maxYear]);
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ countries: [primary, ...(secondary && secondary !== primary ? [secondary] : [])].join(","), from: String(from), to: String(to) }).toString();
    window.history.replaceState(null, "", url);
  }, [ready, primary, secondary, from, to]);
  const validRange = from <= to;
  const links = workspaceLinks(payload, selection, locale);
  const visibleEvents = payload.events.filter(event => selection.countries.includes(event.country) && Number(event.date.slice(0, 4)) >= from && Number(event.date.slice(0, 4)) <= to);
  const countryName = (id: string) => payload.countries.find(country => country.id === id)?.name ?? id;
  const periodLabel = (periods: string[]) => periods.length ? `${periods[0]}–${periods.at(-1)}` : "—";
  const labelForCard = (card: WorkspaceEvidenceCard) => card.layer === "regional_history" || card.layer === "serbia_nstj_archive" ? m.historicalLink : card.kind === "map" ? m.mapLink : m.dataLink;
  function evidenceCards(kind: "data" | "map") {
    return payload.cards.filter(card => (kind === "map" ? card.kind === "map" : card.kind !== "map") && (card.layer !== "serbia_nstj_archive" || selection.countries.includes("serbia"))).map(card => {
      const rows = card.coverage.filter(row => selection.countries.includes(row.country));
      const hasEvidence = rows.some(row => periodsInRange(row.periods, selection).length);
      const incomplete = card.coverage.filter(row => {
        const periods = periodsInRange(row.periods, selection);
        const expected = card.kind === "high_frequency" || card.kind === "macro_drivers" || card.kind === "sors" ? (to - from + 1) * 12 : to - from + 1;
        return periods.length < expected;
      }).map(row => countryName(row.country));
      return <article key={card.id} className="card p-5" data-workspace-evidence={card.id}>
        <h3 className="text-lg font-semibold">{card.title}</h3><p className="mt-2 font-mono text-xs text-[var(--muted)]">{card.targetId} · {card.layer}</p>
        {!hasEvidence ? <p className="mt-3 text-sm">{m.empty}</p> : null}
        {rows.map(row => {
          const periods = periodsInRange(row.periods, selection);
          return <div key={row.country} className="mt-3 border-t border-[var(--line)] pt-3 text-sm leading-6">
            <p><strong>{countryName(row.country)}</strong> · {m.coverage}: <span className="metric-number">{periodLabel(row.periods)}</span></p>
            <p>{m.latest}: <span className="metric-number">{row.periods.at(-1) ?? "—"}</span> · {m.periodCount}: <span className="metric-number">{periods.length}</span></p>
            <p>{m.from} / {m.to}: <span className="metric-number">{periodLabel(periods)}</span></p>
            {periods.length ? <><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{row.sources.filter(s => periodsInRange(s.periods ?? row.periods, selection).length).map(s => <a key={s.url + s.layer + s.name} href={s.url} className="text-[var(--accent)]"><span data-original-language="zh-CN" lang="zh-CN">{s.name}</span></a>)}</div><Link className="mt-3 inline-flex font-semibold text-[var(--accent)]" href={evidenceLink(card, row.country, selection, locale)}>{labelForCard(card)} · {countryName(row.country)}</Link></> : null}
          </div>;
        })}
        {secondary && !comparisonAllowed(card, selection) ? <p className="mt-3 text-sm" data-comparison-unavailable>{m.comparisonUnavailable}</p> : null}
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{m.gaps}: {incomplete.join(", ") || "—"}</p>
      </article>;
    });
  }
  async function download() {
    setExportStatus("preparing");
    try {
      const [{ buildWorkspaceSnapshot }, { buildZip }] = await Promise.all([import("@/lib/workspaceSnapshot"), import("@/lib/clientZip")]);
      const snapshot = buildWorkspaceSnapshot(payload, selection, locale);
      const url = URL.createObjectURL(new Blob([buildZip(snapshot.files, snapshot.generatedAt)], { type: "application/zip" }));
      const a = document.createElement("a"); a.href = url; a.download = snapshot.filename; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); setExportStatus("done");
    } catch { setExportStatus("error"); }
  }
  return <main className="page-shell" data-research-workspace={payload.id}>
    <div className="mb-4"><NotebookCollect disabled={!ready || !validRange} label={notebookMessages[locale].addWorkspace} create={async () => {
      const { researchWorkspaces } = await import("@/content/researchWorkspaces"); const definition = researchWorkspaces.find(w => w.id === payload.id)!;
      const visible = payload.cards.filter(card => card.coverage.some(row => selection.countries.includes(row.country) && periodsInRange(row.periods,selection).length));
      const sources = visible.flatMap(card => card.coverage.filter(row => selection.countries.includes(row.country)).flatMap(row => row.sources.filter(s => periodsInRange(s.periods ?? row.periods,selection).length).map(s => ({ institution: "", dataset: s.name, url: s.url, layer: s.layer }))));
      return { type: "workspace", title: payload.title, labels: definition.title, url: new URL(window.location.pathname + window.location.search + window.location.hash, PLATFORM_BASE_URL).href, canonical_ids: [payload.id, ...new Set(visible.map(c => c.targetId))], countries: selection.countries, periods: [String(from),String(to)], sources: [...new Map(sources.map(s => [JSON.stringify(s),s])).values()], layer: "workspace_setup", comparability: "setup_only_no_combined_dataset", warnings: definition.warnings.map(w => w["zh-CN"]), warning_labels: { "zh-CN": definition.warnings.map(w => w["zh-CN"]), en: definition.warnings.map(w => w.en) }, metadata: { filters: { countries: selection.countries, from, to }, evidence_categories: [...new Set(visible.map(c => c.layer))] } };
    }} /></div>
    <Link href={localizedRoute("/workspaces/", locale)} className="text-sm text-[var(--accent)]">← {m.all}</Link>
    <header className="mt-5 max-w-4xl border-b border-[var(--line)] pb-7"><p className="editorial-kicker">{m.title}</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{payload.title}</h1><p className="mt-5 leading-8 text-[var(--muted)]">{payload.introduction}</p></header>
    <section className="card mt-7 p-5" aria-labelledby="workspace-controls"><h2 id="workspace-controls" className="text-xl font-semibold">{m.select}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-semibold">{m.countries}<select className="field-control mt-2 w-full" value={primary} onChange={e => { setPrimary(e.target.value); if (e.target.value === secondary) setSecondary(""); }}>{payload.countries.map(country => <option key={country.id} value={country.id}>{country.name}</option>)}</select></label>
      <label className="text-sm font-semibold">{m.secondary}<select className="field-control mt-2 w-full" value={secondary} onChange={e => setSecondary(e.target.value)}><option value="">{m.none}</option>{payload.countries.filter(country => country.id !== primary).map(country => <option key={country.id} value={country.id}>{country.name}</option>)}</select></label>
      <label className="text-sm font-semibold">{m.from}<select className="field-control mt-2 w-full" value={from} onChange={e => setFrom(Number(e.target.value))}>{options.map(year => <option key={year}>{year}</option>)}</select></label>
      <label className="text-sm font-semibold">{m.to}<select className="field-control mt-2 w-full" value={to} onChange={e => setTo(Number(e.target.value))}>{options.map(year => <option key={year}>{year}</option>)}</select></label>
    </div><p className="mt-4 text-sm leading-6 text-[var(--muted)]">{m.periodNote}</p>{!validRange ? <p role="alert" className="mt-3">{m.rangeError}</p> : null}</section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.questions}</h2><p className="mt-3 leading-7">{payload.introduction}</p><ul className="mt-3 list-disc space-y-2 pl-5">{payload.questions.map(q => <li key={q}>{q}</li>)}</ul></section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.data}</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{payload.coverageNote}</p><div className="mt-5 grid gap-4 md:grid-cols-2">{validRange ? evidenceCards("data") : null}</div></section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.patterns}</h2><p className="mt-3 leading-7">{payload.comparisonDimensions}</p><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{m.comparisonNote}</p></section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.events}</h2><p className="mt-3 text-xs text-[var(--muted)]">{m.original}</p><div className="mt-4 grid gap-4 md:grid-cols-2">{visibleEvents.slice(0, 8).map(event => <article key={event.id} className="card p-4"><p className="text-xs">{event.date} · {countryName(event.country)} · {event.type} · {event.language}</p><div lang="zh-CN" data-original-language="zh-CN" className="mt-3"><h3 className="font-semibold">{event.title}</h3></div><a className="mt-3 inline-flex text-sm text-[var(--accent)]" href={event.source.url}>{m.source}: <span lang="zh-CN" data-original-language="zh-CN">{event.source.name}</span></a><Link className="mt-3 block text-sm font-semibold text-[var(--accent)]" href={workspaceToolLink("/news/", locale, { country: event.country, type: event.type, from: `${from}-01-01`, to: `${to}-12-31` }) + `#${event.id}`}>{m.eventLink}</Link></article>)}</div>{!visibleEvents.length ? <p className="mt-3 text-sm">{m.empty}</p> : null}</section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.regions}</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{m.history} {m.projectNote}</p><div className="mt-5 grid gap-4 md:grid-cols-2">{validRange ? evidenceCards("map") : null}</div></section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.methods}</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{payload.methods.map(method => <article key={method.id} className="card p-5" data-workspace-method={method.id} data-method-state={method.state}><h3 className="text-lg font-semibold">{method.name}</h3><p className="mt-2 font-mono text-xs">{m[method.state]}</p><p className="mt-3 text-sm leading-7">{method.reason}</p><h4 className="mt-3 text-sm font-semibold">{m.limitation}</h4><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">{method.limitations.map(note => <li key={note}>{note}</li>)}</ul>{method.state === "active" ? <Link href={links.models.find(link => link.skill === method.id)!.url} className="mt-4 inline-flex font-semibold text-[var(--accent)]">{m.modelLink}</Link> : null}</article>)}</div>{!payload.methods.length ? <p className="mt-3 text-sm">{m.noMethod}</p> : null}</section>
    <section className="card mt-8 p-6"><h2 className="text-2xl font-semibold">{m.boundaries}</h2><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7">{payload.warnings.map(w => <li key={w}>{w}</li>)}</ul></section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.continue}</h2><div className="mt-4 flex flex-wrap gap-4">{[["/data/", m.dataLink], ["/map/", m.mapLink], ["/models/", m.modelLink], ["/news/", m.eventLink]].map(([path, text]) => <Link key={path} className="text-[var(--accent)]" href={path === "/data/" ? links.data[0]?.url ?? localizedRoute(path, locale) : path === "/map/" ? links.map.find(link => !link.url.startsWith("/research-data/"))?.url ?? localizedRoute(path, locale) : path === "/models/" ? links.models[0]?.url ?? localizedRoute(path, locale) : links.events[0]?.url ?? localizedRoute(path, locale)}>{text}</Link>)}</div></section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.export}</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted)]">{m.exportNote}</p><button type="button" onClick={() => void download()} disabled={!ready || !validRange || exportStatus === "preparing"} className="mt-4 rounded-full border border-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--accent)] disabled:opacity-50">{m.snapshot}</button><span role="status" className="ml-3 text-sm">{exportStatus === "idle" ? "" : m[exportStatus]}</span></section>
  </main>;
}
