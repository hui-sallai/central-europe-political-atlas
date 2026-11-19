"use client";
import Link from "next/link";
import {useEffect, type ReactNode} from "react";
import {useLocale} from "@/i18n/LocaleProvider";
import type {ElectionDirectoryCountry} from "@/lib/politicalElectionDirectory.server";
import {InstitutionComparison} from "./InstitutionComparison";
import {ElectionDirectoryDetails, electionHref, LatestChamber} from "./ElectionDirectoryDetails";

const legacyGermanParams = ["measure","compare","comparison_mode","series","series_measure","context","research_q","research_study"];

export function PoliticalLanding({countries, children}: {countries:ElectionDirectoryCountry[]; children?: ReactNode}) {
  const locale = useLocale(), en = locale === "en";
  useEffect(() => {
    const url = new URL(location.href);
    const params = url.searchParams;
    const country = params.get("country"), election = params.get("election");
    const owner = election ? countries.find(c => c.history.some(e => e.id === election)) : undefined;
    if (country && !countries.some(c => c.slug === country)) return;
    if (owner && country && owner.slug !== country) return;
    const target = country ?? owner?.slug ?? (election || legacyGermanParams.some(key => params.has(key)) ? "germany" : null);
    if (target) {
      url.pathname = electionHref(target, locale);
      params.delete("country");
      location.replace(url.href);
    }
  }, [countries, locale]);

  return <>
    <section className="mt-6" aria-label={en ? "Choose a political research country" : "选择政治研究国家"} data-political-landing>
      <p className="mb-4 text-sm text-[var(--muted)]">{en
        ? `Admitted parliamentary election records are available for ${countries.length} countries.`
        : `已有 ${countries.length} 个国家的议会选举记录获准发布。`}</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{countries.map(country =>
        <article key={country.slug} className="editorial-panel min-w-0 space-y-3 p-4" data-political-country={country.slug}>
          <h2 className="text-xl font-semibold"><Link className="underline text-[var(--accent)]" href={electionHref(country.slug, locale)}>{country.name[locale]}</Link></h2>
          <p className="text-sm">{en ? "Available election years" : "已收录选举年份"} · {[...new Set(country.history.map(e => e.year))].join(", ")}</p>
          {country.latest.map(election => <LatestChamber key={election.id} slug={country.slug} election={election} locale={locale}/>)}
          <ElectionDirectoryDetails country={country} locale={locale}/>
        </article>)}</div>
    </section>
    {children}
    <InstitutionComparison political={countries}/>
  </>;
}
