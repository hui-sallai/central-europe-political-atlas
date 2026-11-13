import {CountryResearchProfile} from "@/components/CountryResearchProfile";
import {getCountry} from "@/lib/data";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { getCountryObservations, getEventsForCountry, getProjectsForCountry, getResearchCountryBySlug, researchCountries } from "@/lib/researchData";
import { getModelOutputsForCountry, modelCards } from "@/lib/modelFramework";
import { regionalCoverageMatrixV087 } from "@/lib/spatialDataV087";
import { countryDescriptions, englishCapital } from "@/i18n/presentation";
type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return researchCountries.map(country => ({ slug: country.slug })); }
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const country = getResearchCountryBySlug(slug);
  return country ? pageMetadata({ locale: "en", path: `/en/countries/${slug}/`, title: `${country.name} research profile`, description: countryDescriptions[slug], image: `/og/countries/${slug}.png`, imageAlt: `${country.name} — country research profile` }) : {};
}
export default async function EnglishCountry({ params }: Props) {
  const { slug } = await params;
  const country = getResearchCountryBySlug(slug);
  if (!country) notFound();
  const observations = getCountryObservations(slug);
  const events = getEventsForCountry(slug).filter(event => event.data_status === "verified");
  const projects = getProjectsForCountry(slug);
  const modelOutputs = getModelOutputsForCountry(slug);
  const regionalMapAvailable = Boolean(regionalCoverageMatrixV087.find(row => row.country_id === slug)?.public_layer_count);
  return <main className="page-shell"><header className="max-w-4xl"><p className="editorial-kicker">Country Research Profile</p><h1 className="mt-4 text-5xl font-semibold">{country.name}</h1><p className="mt-3 text-lg text-[var(--muted)]">{englishCapital(country.capital)} · {country.currency}</p><p className="mt-5 leading-7 text-[var(--muted)]">{countryDescriptions[slug]}</p></header><CountryResearchProfile country={getCountry(slug)!} observations={observations} events={events} projects={projects} modelOutputs={modelOutputs} modelCards={modelCards} regionalMapAvailable={regionalMapAvailable}/></main>;
}
