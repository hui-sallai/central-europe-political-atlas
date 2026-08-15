import { notFound } from "next/navigation";
import { CountryDetailModeTabs } from "@/components/CountryDetailModeTabs";
import { getCountry } from "@/lib/data";
import { getResearchCountryBySlug, researchCountries } from "@/lib/researchData";
import { regionalCoverageMatrixV087 } from "@/lib/spatialDataV087";

type CountryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return researchCountries.map((country) => ({ slug: country.slug }));
}

export default async function CountryPage({ params }: CountryPageProps) {
  const { slug } = await params;
  const countryRecord = getResearchCountryBySlug(slug);
  const country = getCountry(slug);
  const regionalCoverage = regionalCoverageMatrixV087.find((record) => record.country_id === slug);

  if (!country || !countryRecord) {
    notFound();
  }

  return (
    <main className="page-shell">
      <p className="eyebrow">Country Dashboard</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">{countryRecord.name_zh}</h1>
      <p className="mt-3 text-lg text-[var(--muted)]">{countryRecord.name}</p>

      <CountryDetailModeTabs country={country} regionalCoverage={regionalCoverage} />
    </main>
  );
}
