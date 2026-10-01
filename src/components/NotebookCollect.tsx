"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/LocaleProvider";
import { localizedRoute } from "@/i18n/config";
import { notebookMessages } from "@/content/notebookMessages";
import { evidenceIdentity, type EvidenceDraft } from "@/lib/researchNotebook";
import { useResearchNotebook } from "./ResearchNotebookProvider";
export function NotebookEntry() {
  const locale = useLocale(), m = notebookMessages[locale]; const { notebook } = useResearchNotebook();
  return <Link href={localizedRoute("/notebook/", locale)} className="rounded-full border border-[var(--line)] px-2 py-1 text-xs font-semibold whitespace-nowrap">{m.entry} · {notebook?.items.length ?? 0}</Link>;
}
export function NotebookCollect({ create, disabled = false, label }: { create: () => EvidenceDraft | Promise<EvidenceDraft>; disabled?: boolean; label?: string }) {
  const locale = useLocale(), m = notebookMessages[locale]; const { notebook, add, state, error } = useResearchNotebook();
  const [identity, setIdentity] = useState(""); const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setIdentity(""), 0); return () => window.clearTimeout(timer); }, [create]);
  const added = Boolean(identity && notebook?.items.some(item => item.identity === identity));
  async function collect() { setBusy(true); setFailed(false); try { const draft = await create(); setIdentity(evidenceIdentity(draft)); add(draft); } catch { setFailed(true); } finally { setBusy(false); } }
  return <span className="inline-flex flex-wrap items-center gap-2"><button type="button" data-notebook-add onClick={() => void collect()} disabled={disabled || busy || state === "loading" || state === "corrupt"} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-[var(--accent)] disabled:opacity-50">{added ? m.added : label ?? m.add}</button>{failed || (identity && error) ? <span role="status" className="text-xs">{m.error}</span> : null}</span>;
}
