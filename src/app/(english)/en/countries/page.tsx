import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { getLatestObservation, researchCountries } from "@/lib/researchData";
import { localeNumber } from "@/i18n/config";
import { countryDescriptions, englishUnit, indicatorNames } from "@/i18n/presentation";
export const metadata = pageMetadata({ locale: "en", path: "/en/countries/", title: "Countries", description: "Explore official observations and research profiles for ten Central European countries." });
const indicators = ["real_gdp_growth", "hicp_inflation", "unemployment_rate", "gdp_per_capita_eur"];
export default function EnglishCountries() {
  return <main className="page-shell"><header className="max-w-4xl border-b border-[var(--line)] pb-8"><p className="editorial-kicker">Countries</p><h1 className="mt-4 text-5xl font-semibold">Ten country profiles</h1><p className="mt-5 leading-8 text-[var(--muted)]">Explore economic observations, structured events and research tools. Each value retains its official source, unit and status.</p></header>
    <section className="mt-8 grid gap-px border border-[var(--line)] bg-[var(--line)] md:grid-cols-2">{researchCountries.map(country => <article key={country.slug} className="bg-[var(--surface)] p-6"><p className="text-xs text-[var(--muted)]">{country.iso2}</p><h2 className="mt-2 text-3xl font-semibold">{country.name}</h2><Link href={`/en/countries/${country.slug}/`} className="mt-3 inline-flex text-[var(--accent)]">Open profile</Link><dl className="mt-6 grid grid-cols-2 gap-5">{indicators.map(id => { const observation = getLatestObservation(country.slug, id); return <div key={id}><dt className="text-xs text-[var(--muted)]">{indicatorNames[id]}</dt><dd className="mt-1 font-semibold">{observation ? `${localeNumber(observation.value, "en", { maximumFractionDigits: observation.unit === "欧元" ? 0 : 1 })} ${englishUnit(observation.unit)}` : "Not connected"}</dd><dd className="text-xs text-[var(--muted)]">{observation?.year ?? "—"}</dd></div>; })}</dl><p className="mt-5 leading-7 text-[var(--muted)]">{countryDescriptions[country.slug]}</p></article>)}</section>
  </main>;
}
