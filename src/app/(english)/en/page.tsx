import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { FeaturedResearchSection, HomeCoverageSection, HomeMethodologySection } from "@/components/HomeResearchDiscovery";
import { WorkspaceEntrySection } from "@/components/WorkspaceIndex";
import { HomeResearchMap, type HomeMapCountry } from "@/components/HomeResearchMap";
import { getEventsForCountry, researchCountries, researchEvents } from "@/lib/researchData";
import { getBasicIndicators } from "@/lib/basicIndicators";
import { newsLibraryMetadata } from "@/lib/newsLibraryMetadata";
import { englishText } from "@/i18n/reviewedText";
import { workspaceMessages } from "@/content/workspaceMessages";
import { eventPresentation } from "@/lib/eventPresentation";
import { PLATFORM_VERSION } from "@/lib/releaseMetadata";
export const metadata = pageMetadata({ locale: "en", path: "/en/", title: "Central European political economy", description: "Traceable data, regional comparisons and transparent research boundaries across ten Central European countries." });
function metricPresentation(value: string) {
  const unavailable: Record<string, string> = { "待发布／待接入": "Pending publication / connection", "不适用": "Not applicable", "缺少已发布观测": "Missing published observation" };
  return unavailable[value] ?? englishText(value);
}
export default function EnglishHome() {
  const mapCountries: HomeMapCountry[] = researchCountries.map(country => {
    const event = getEventsForCountry(country.slug).find(event => event.data_status === "verified");
    const title = event ? eventPresentation(event, "en").title : null;
    return { slug: country.slug, nameZh: country.name_zh, nameEn: country.name, iso2: country.iso2, indicators: getBasicIndicators(country.slug).filter(row => ["growth", "inflation", "unemployment", "gdpPerCapita"].includes(row.id)).map(row => ({ id: row.id, label: englishText(row.label), value: metricPresentation(row.value), year: englishText(row.year) })), latestEvent: event && title ? { id: event.id, date: event.date, title: title.text, titleLanguage: title.lang, originalLanguageLabel: title.originalLabel } : null };
  });
  const latestEvents = researchEvents.filter(event => event.data_status === "verified").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  return <main className="page-shell">
    <header className="max-w-4xl border-b border-[var(--line)] pb-8">
      <p className="editorial-kicker">Central Europe Political Atlas · {PLATFORM_VERSION.split(" ")[0]}</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">A research atlas of Central European political economy</h1>
      <p className="mt-5 text-base leading-8 text-[var(--muted)]">Investigate how economic conditions differ across countries, compare elections in their historical context, and trace policy and investment implementation through source documents. Start with an existing case or configure a question-first workspace, then inspect the evidence and export reproducible research.</p>
      <nav className="mt-5 flex flex-wrap gap-4 text-sm font-semibold" aria-label="Start your research"><a className="text-[var(--accent)] underline" href="#featured-research-title">Explore research cases</a><a className="text-[var(--accent)] underline" href="#question-first-title">Choose a research question</a><Link className="text-[var(--accent)] underline" href="/en/politics/">Politics and Elections</Link></nav>
    </header>
    <FeaturedResearchSection locale="en" />
    <WorkspaceEntrySection locale="en" />
    <HomeCoverageSection locale="en" />
    <HomeResearchMap countries={mapCountries} locale="en" />
    <section className="editorial-section mt-10" aria-labelledby="english-verified-events">
      <h2 id="english-verified-events" className="text-3xl font-semibold">{workspaceMessages.en.latestEvents}</h2>
      <p className="mt-3 text-sm text-[var(--muted)]" data-home-news-check>Dated archive, not a live news feed. Latest batch source check (recorded retrieval): <time dateTime={newsLibraryMetadata.latestBatchSourceCheckedAt}>{newsLibraryMetadata.latestBatchSourceCheckedAt}</time>. Approved English titles are shown where available; otherwise the original text is retained and labelled. Events do not enter model estimates.</p>
      <p className="mt-2 text-xs text-[var(--muted)]" data-latest-signals-meta>Latest event: <time dateTime={newsLibraryMetadata.latestEventDate}>{newsLibraryMetadata.latestEventDate}</time> · News batch through: <time dateTime={newsLibraryMetadata.latestNewsBatch}>{newsLibraryMetadata.latestNewsBatch}</time> · Historical store record updated: <time dateTime={newsLibraryMetadata.historicalStoreUpdatedAt}>{newsLibraryMetadata.historicalStoreUpdatedAt}</time></p>
      <div className="latest-signals-grid mt-5">{latestEvents.map(event => { const title = eventPresentation(event, "en").title; return <article key={event.id}><p>{event.date} · {researchCountries.find(country => country.slug === event.country_slug)?.name}</p>{title.originalLabel ? <p className="text-xs text-[var(--muted)]">{title.originalLabel}</p> : null}<div lang={title.lang} data-original-language={title.originalLabel ? title.lang : undefined}><h3><Link href={`/en/news/?country=${event.country_slug}#${event.id}`}>{title.text}</Link></h3></div></article>; })}</div>
    </section>
    <section className="mt-8 flex flex-wrap gap-4 text-sm" aria-label="Supporting evidence"><Link className="text-[var(--accent)] underline" href="/en/news/">Browse the verified Event Library</Link><Link className="text-[var(--accent)] underline" href="/en/data/">Inspect observations, provenance and research exports</Link><Link className="text-[var(--accent)] underline" href="/en/countries/">All national profiles</Link></section>
    <HomeMethodologySection locale="en" />
  </main>;
}
