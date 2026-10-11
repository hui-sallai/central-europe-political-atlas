import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { portfolioCases, portfolioEvidenceNote, portfolioEvidenceUrl } from "@/content/portfolio";
export function portfolioCaseMetadata(slug: string) {
  const item = portfolioCases.find(item => item.slug === slug);
  if (!item) return {};
  const path = `/portfolio/${slug}/`;
  return { ...pageMetadata({ title: item.title, description: item.description, path, locale: "en" }), alternates: { canonical: path } };
}
export default function PortfolioCase({ slug }: { slug: string }) {
  const item = portfolioCases.find(item => item.slug === slug);
  if (!item) notFound();
  return <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
    <Link href="/portfolio/" className="text-sm text-[var(--accent)] underline underline-offset-4">All portfolio cases</Link>
    <header className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Case {item.number} · {item.status}</p>
      <h1 className="editorial-headline mt-3 text-3xl font-bold leading-tight sm:text-4xl">{item.title}</h1>
      <p className="mt-4 text-base leading-7">{item.description}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]"><strong>Best for:</strong> {item.bestFor.join(" | ")}</p>
      <a href={`/portfolio/files/${item.pdf}`} className="mt-5 inline-block rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--on-accent)]">View PDF — Case {item.number}</a>
    </header>
    <section className="mt-8 border-t border-[var(--line)] pt-6"><h2 className="editorial-headline text-xl font-bold">What the work demonstrates</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">{item.demonstrates.map(text => <li key={text}>{text}</li>)}</ul></section>
    <section className="mt-7"><h2 className="editorial-headline text-xl font-bold">Main deliverables</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">{item.deliverables.map(text => <li key={text}>{text}</li>)}</ul></section>
    <section className="mt-7"><h2 className="editorial-headline text-xl font-bold">Atlas evidence</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Repository links use the verified snapshot underlying the case PDFs. They support the research or QA context; they do not establish paid-client outcomes.</p><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{item.evidence.map(link => <li key={link.path}><a href={portfolioEvidenceUrl(link.path)} className="text-[var(--accent)] underline underline-offset-4">{link.label}</a></li>)}</ul></section>
    <aside className="mt-8 border-t border-[var(--line)] pt-5 text-sm leading-6 text-[var(--muted)]">{portfolioEvidenceNote}</aside>
  </main>;
}
