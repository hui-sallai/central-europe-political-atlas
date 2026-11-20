"use client";
import Link from "next/link";
import {useEffect, type ReactNode} from "react";
import type {Locale} from "@/i18n/config";
import {useLocale} from "@/i18n/LocaleProvider";
import type {ElectionDirectoryCountry} from "@/lib/politicalElectionDirectory.server";
import PoliticalHistoryComparison from "./PoliticalHistoryComparison";
import {InstitutionComparison} from "./InstitutionComparison";
import {ElectionDirectoryDetails, electionHref, LatestChamber} from "./ElectionDirectoryDetails";

const legacyGermanParams = ["measure","compare","comparison_mode","series","series_measure","context","research_q","research_study"];

function ElectionYearLinks({country, locale}: {country:ElectionDirectoryCountry; locale:Locale}) {
  const en = locale === "en";
  const byChamber = new Map<string, typeof country.history>();
  for (const election of country.history) {
    const chamber = byChamber.get(election.chamber);
    if (chamber) chamber.push(election);
    else byChamber.set(election.chamber, [election]);
  }
  return <div data-election-year-links className="space-y-2">
    {Array.from(byChamber, ([chamber, elections]) => <div key={chamber}>
      <h3 className="text-sm font-semibold">{chamber || (en ? "Parliament" : "议会")}</h3>
      <ul className="mt-1 flex flex-wrap gap-1.5">{elections.map(election => <li key={election.id}>
        <Link prefetch={false} href={electionHref(country.slug, locale, election.id)} data-history-election={election.id}
          aria-label={country.name[locale]+" · "+chamber+" · "+election.date}
          className="inline-block rounded border border-[var(--line)] px-2 py-1 text-sm tabular-nums text-[var(--accent)] hover:underline">
          <time dateTime={election.date}>{election.year}</time>
        </Link>
      </li>)}</ul>
    </div>)}
  </div>;
}

export function PoliticalLanding({countries, children}: {countries:ElectionDirectoryCountry[]; children?: ReactNode}) {
  const locale = useLocale(), en = locale === "en";
  const electionCount = countries.reduce((sum, country) => sum + country.history.length, 0);
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
      <p className="text-sm text-[var(--muted)]">{en
        ? `Admitted parliamentary election records are available for ${countries.length} countries. Select a year to explore the ${electionCount} chamber-election records. Links mark elections with published results in this archive.`
        : `已有 ${countries.length} 个国家的议会选举记录获准发布。选择年份可查看 ${electionCount} 条按议院收录的记录。仅已收录的选举年份提供结果链接。`}</p>
      <nav aria-label={en ? "Historical research" : "历史选举研究"} className="my-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
        <a className="underline" href="#historical-comparison">{en ? "Compare election histories" : "比较各国选举历史"}</a>
        <a className="underline" href="#institutions">{en ? "Compare political institutions" : "比较政治制度"}</a>
      </nav>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{countries.map(country =>
        <article key={country.slug} className="editorial-panel min-w-0 space-y-3 p-4" data-political-country={country.slug}>
          <h2 className="text-xl font-semibold"><Link className="underline text-[var(--accent)]" href={electionHref(country.slug, locale)}>{country.name[locale]}</Link></h2>
          <p className="text-sm text-[var(--muted)]">{country.history.length === 1 ? country.history[0].year : country.history[0].year+"–"+country.history.at(-1)!.year}
            {" · "}{en ? `${country.history.length} chamber-election record${country.history.length===1?"":"s"}` : `${country.history.length} 条院别选举记录`}</p>
          <ElectionYearLinks country={country} locale={locale}/>
          <p className="text-xs font-semibold">{en ? "Latest in the archive" : "最近收录的选举"}</p>
          {country.latest.map(election => <LatestChamber key={election.id} slug={country.slug} election={election} locale={locale}/>)}
          <ElectionDirectoryDetails country={country} locale={locale}/>
        </article>)}</div>
    </section>
    <div id="historical-comparison" className="scroll-mt-20"><PoliticalHistoryComparison locale={locale}/></div>
    {children}
    <InstitutionComparison political={countries}/>
  </>;
}
