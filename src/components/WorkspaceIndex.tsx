import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localizedRoute } from "@/i18n/config";
import { workspaceMessages } from "@/content/workspaceMessages";
import { workspaceSummaries } from "@/components/workspaceEvidence";
export function WorkspaceEntrySection({ locale }: { locale: Locale }) {
  const m = workspaceMessages[locale];
  return <section className="editorial-section mt-10" aria-labelledby="question-first-title"><p className="editorial-kicker">{m.questionFirst}</p><h2 id="question-first-title" className="mt-3 text-3xl font-semibold"><Link href={localizedRoute("/workspaces/", locale)}>{m.title}</Link></h2><p className="mt-3 max-w-4xl leading-7 text-[var(--muted)]">{m.intro}</p><div className="mt-5 grid gap-4 md:grid-cols-2">{workspaceSummaries(locale).map(workspace => <article key={workspace.id} className="card p-5"><h3 className="text-xl font-semibold"><Link className="text-[var(--accent)]" href={localizedRoute(`/workspaces/${workspace.id}/`, locale)}>{workspace.title}</Link></h3><p className="mt-3 text-sm leading-7">{workspace.introduction}</p><p className="mt-3 text-xs leading-6 text-[var(--muted)]">{m.countries}: {workspace.countries.join(", ")}</p><p className="mt-2 text-xs leading-6">{m.coverage}: <span className="metric-number">{workspace.from}–{workspace.to}</span>. {m.titleCoverage}</p><p className="mt-2 text-xs leading-6 text-[var(--muted)]">{m.evidence}</p><p className="mt-3 text-xs leading-6 text-[var(--muted)]">{workspace.warnings.at(-1)}</p></article>)}</div></section>;
}
export function WorkspaceIndex({ locale }: { locale: Locale }) {
  const m = workspaceMessages[locale];
  return <main className="page-shell"><h1 className="text-4xl font-semibold sm:text-5xl">{m.title}</h1><p className="mt-5 max-w-4xl leading-8 text-[var(--muted)]">{m.intro}</p><nav className="mt-7 grid gap-3 md:grid-cols-3" aria-label={m.select}><Link className="card p-5 text-[var(--accent)]" href={localizedRoute("/data/", locale)}>{m.dataFirst}</Link><Link className="card p-5 text-[var(--accent)]" href={localizedRoute("/models/", locale)}>{m.methodFirst}</Link><p className="card p-5">{m.questionFirst}</p></nav><WorkspaceEntrySection locale={locale} /></main>;
}
