import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { CountryResearchProfile } from "@/components/CountryResearchProfile";
import { CountryComparePanel } from "@/components/CountryComparePanel";
import { getCountry } from "@/lib/data";
import { getCountryObservations, getEventsForCountry, getProjectsForCountry, getResearchCountryBySlug, researchCountries } from "@/lib/researchData";
import { regionalCoverageMatrixV087 } from "@/lib/spatialDataV087";
import { getModelOutputsForCountry } from "@/lib/modelFramework";

const COMPARE_INDICATORS = new Set(["gdp_current_eur", "gdp_per_capita_eur", "real_gdp_growth", "hicp_inflation", "unemployment_rate", "government_debt_gdp"]);

type CountryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return researchCountries.map((country) => ({ slug: country.slug }));
}

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const country = getResearchCountryBySlug(slug);
  return country
    ? pageMetadata({ title: `${country.name_zh}国家研究档案`, description: `${country.name_zh}宏观数据、透明模型、区域事实、对华项目与事件研究入口。`, path: `/countries/${country.slug}/`, image: `/og/countries/${country.slug}.png`, imageAlt: `${country.name} — country research profile` })
    : { title: "国家档案" };
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
      <p className="editorial-kicker">Country Research Profile</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">{countryRecord.name_zh}</h1>
      <p className="mt-3 text-lg text-[var(--muted)]">{countryRecord.name} · {country.capitalZh} · {country.currency}</p>
      <p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--muted)]">{countryRecord.summary_zh}</p>

      <CountryResearchProfile
        country={country}
        observations={getCountryObservations(slug)}
        events={getEventsForCountry(slug)}
        projects={getProjectsForCountry(slug)}
        modelOutputs={getModelOutputsForCountry(slug)}
        regionalMapAvailable={Boolean(regionalCoverage?.public_layer_count)}
      />

      <CountryComparePanel
        current={slug}
        countries={researchCountries.map((c) => ({ slug: c.slug, name_zh: c.name_zh }))}
        mapCountries={regionalCoverageMatrixV087.filter((record) => record.public_layer_count).map((record) => record.country_id)}
        points={researchCountries.flatMap((c) => getCountryObservations(c.slug).filter((o) => COMPARE_INDICATORS.has(o.indicator)).map((o) => ({ country: c.slug, indicator: o.indicator, year: o.year, value: o.value, unit: o.unit })))}
      />
    </main>
  );
}
