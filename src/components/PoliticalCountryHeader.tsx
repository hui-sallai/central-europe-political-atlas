import Link from "next/link";
import { localizedRoute, type Locale } from "@/i18n/config";

// Shared top navigation and heading for national parliamentary election pages, matching PoliticalBallotExplorer.
export function PoliticalCountryHeader({ country, locale, title }: { country: string; locale: Locale; title: string }) {
  const en = locale === "en";
  return (
    <header className="mb-6" data-political-country-header={country}>
      <nav aria-label={en ? "Political research navigation" : "政治研究导航"} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Link className="underline text-[var(--accent)]" href={localizedRoute("/politics/", locale)}>
          {en ? "Politics and Elections" : "政治制度与选举"}
        </Link>
        <Link className="underline text-[var(--accent)]" href={localizedRoute(`/countries/${country}/`, locale)}>
          {en ? "Country Research Hub" : "国家研究页"}
        </Link>
      </nav>
      <p className="editorial-kicker mt-3">{en ? "Parliamentary elections" : "全国议会选举"}</p>
      <h1 className="mt-2 text-4xl font-semibold">{title}</h1>
    </header>
  );
}
