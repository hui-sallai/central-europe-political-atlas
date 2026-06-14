import { notFound } from "next/navigation";
import { CountryDetailModeTabs } from "@/components/CountryDetailModeTabs";
import { countries, getCountry } from "@/lib/data";

type CountryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return countries.map((country) => ({ slug: country.slug }));
}

export default async function CountryPage({ params }: CountryPageProps) {
  const { slug } = await params;
  const country = getCountry(slug);

  if (!country) {
    notFound();
  }

  return (
    <main className="page-shell">
      <p className="eyebrow">Country Dashboard</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">{country.nameZh}</h1>
      <p className="mt-3 text-lg text-[var(--muted)]">{country.nameEn}</p>

      <CountryDetailModeTabs country={country} />
    </main>
  );
}
