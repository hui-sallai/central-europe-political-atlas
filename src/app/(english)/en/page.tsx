import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { PLATFORM_VERSION } from "@/lib/releaseMetadata";
import { WorkspaceEntrySection } from "@/components/WorkspaceIndex";
import { HomeResearchMap, type HomeMapCountry } from "@/components/HomeResearchMap";
import { getEventsForCountry, researchCountries, researchEvents } from "@/lib/researchData";
import { getBasicIndicators } from "@/lib/basicIndicators";
import { englishText } from "@/i18n/reviewedText";
import { workspaceMessages } from "@/content/workspaceMessages";
export const metadata = pageMetadata({ locale: "en", path: "/en/", title: "Central European political economy", description: "Traceable data, regional comparisons and transparent research boundaries across ten Central European countries." });
const entries = [
  ["workspaces", workspaceMessages.en.nav, workspaceMessages.en.questionFirst],
  ["countries", "Countries", "Ten country profiles with official observations and source links."],
  ["data", "Data Explorer", "Compare observations, inspect provenance and export descriptive research snapshots."],
  ["map", "Regional map", "Explore spatial facts without turning missing observations into zeros."],
  ["models", "Models", "Review model inputs, outputs, availability and limits."],
  ["scenarios", "Conditional scenarios", "Inspect explicit assumptions, not forecasts or causal estimates."],
  ["news", "Events", "Structured events and links to original reporting."],
  ["methodology", "Methodology", "Understand comparability, data status and the limits of formal inference."],
] as const;
export default function EnglishHome() {
  const mapCountries: HomeMapCountry[] = researchCountries.map(country => {
    const event = getEventsForCountry(country.slug).find(event => event.data_status === "verified");
    return { slug: country.slug, nameZh: country.name_zh, nameEn: country.name, iso2: country.iso2, indicators: getBasicIndicators(country.slug).filter(row => ["growth", "inflation", "unemployment", "gdpPerCapita"].includes(row.id)).map(row => ({ id: row.id, label: englishText(row.label), value: englishText(row.value), year: englishText(row.year) })), latestEvent: event ? { id: event.id, date: event.date, title: event.title } : null };
  });
  const latestEvents = researchEvents.filter(event => event.data_status === "verified").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  return <main className="page-shell">
    <header className="max-w-4xl border-b border-[var(--line)] pb-8">
      <p className="editorial-kicker">Central Europe Political Atlas · {PLATFORM_VERSION}</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">A research atlas of Central European political economy</h1>
      <p className="mt-5 text-base leading-8 text-[var(--muted)]">Traceable official data, regional facts and transparent model boundaries across Austria, Croatia, Czechia, Germany, Hungary, Poland, Romania, Serbia, Slovakia and Slovenia.</p>
    </header>
    <HomeResearchMap countries={mapCountries} locale="en" />
    <section className="editorial-section mt-10" aria-labelledby="english-verified-events"><h2 id="english-verified-events" className="text-3xl font-semibold">{workspaceMessages.en.latestEvents}</h2><p className="mt-3 text-sm text-[var(--muted)]">{workspaceMessages.en.eventBoundary}</p><div className="latest-signals-grid mt-5">{latestEvents.map(event => <article key={event.id}><p>{event.date} · {researchCountries.find(country => country.slug === event.country_slug)?.name}</p><div lang="zh-CN" data-original-language="zh-CN"><h3><Link href={`/en/news/?country=${event.country_slug}#${event.id}`}>{event.title}</Link></h3></div></article>)}</div></section>
    <WorkspaceEntrySection locale="en" />
    <section className="mt-8 grid gap-px border border-[var(--line)] bg-[var(--line)] md:grid-cols-2" aria-label="Research tools">
      {entries.map(([route, title, description]) => <article key={route} className="bg-[var(--surface)] p-6"><h2 className="text-2xl font-semibold"><Link className="text-[var(--accent)]" href={`/en/${route}/`}>{title}</Link></h2><p className="mt-3 leading-7 text-[var(--muted)]">{description}</p></article>)}
    </section>
    <section className="card mt-8 p-6"><h2 className="text-xl font-semibold">Evidence and interpretation</h2><p className="mt-3 leading-7 text-[var(--muted)]">Descriptive comparisons do not identify causal effects. Conditional scenarios are assumption-based illustrations, not predictions. VAR coefficient estimation is available, but the finite-sample residual publication gate is not validated; formal dynamic responses and impulse response functions are unavailable. LP and Panel LP remain subject to their existing inference and sample limitations.</p><Link href="/en/methodology/" className="mt-4 inline-flex text-[var(--accent)]">Read the method boundaries</Link></section>
  </main>;
}
