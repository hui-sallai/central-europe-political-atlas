import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { portfolioCases, portfolioEvidenceNote } from "@/content/portfolio";
export const metadata = { ...pageMetadata({ title: "Selected Client Portfolio", description: "Research Data | Market Intelligence | Language QA | AI Evaluation", path: "/portfolio/", locale: "en" }), alternates: { canonical: "/portfolio/" } };
export default function PortfolioPage() {
  return <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">
    <header className="mb-8 max-w-3xl">
      <p className="mb-3 text-sm font-semibold text-[var(--accent)]">Xuanhui Zhang</p>
      <h1 className="editorial-headline text-3xl font-bold tracking-tight sm:text-4xl">Selected Client Portfolio</h1>
      <p className="mt-3 text-sm font-semibold text-[var(--muted)]">Research Data | Market Intelligence | Language QA | AI Evaluation</p>
      <p className="mt-5 text-base leading-7">I turn multi-source information into structured datasets, concise research briefs and reviewed multilingual content. These four cases show the workflow, quality controls and deliverables I can bring to a clearly scoped assignment.</p>
    </header>
    <section className="grid gap-5 md:grid-cols-2" aria-label="Four portfolio cases">
      {portfolioCases.map(item => <article key={item.slug} className="flex flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Case {item.number} · {item.status}</p>
        <h2 className="editorial-headline mt-3 text-xl font-bold leading-snug">{item.title}</h2>
        <p className="mt-3 text-sm leading-6">{item.description}</p>
        <p className="mt-4 text-xs leading-6 text-[var(--muted)]"><strong>Best for:</strong> {item.bestFor.join(" | ")}</p>
        <div className="mt-auto flex flex-wrap gap-4 pt-5 text-sm font-semibold">
          <Link className="text-[var(--accent)] underline underline-offset-4" href={`/portfolio/${item.slug}/`} aria-label={`View case: ${item.title}`}>View Case</Link>
          <a className="text-[var(--accent)] underline underline-offset-4" href={`/portfolio/files/${item.pdf}`} aria-label={`View PDF: ${item.title}`}>View PDF</a>
        </div>
      </article>)}
    </section>
    <aside className="mt-8 border-t border-[var(--line)] pt-5 text-sm leading-6 text-[var(--muted)]">{portfolioEvidenceNote}</aside>
  </main>;
}
