import Link from "next/link";
import type {Locale} from "@/i18n/config";
import {electionDirectory} from "@/lib/politicalElectionDirectory.server";
import {electionHref, ElectionDirectoryDetails, LatestChamber, RegistryDate} from "./ElectionDirectoryDetails";

export function CountryElectionHistory({slug, locale}:{slug:string; locale:Locale}) {
  const en = locale === "en";
  const country = electionDirectory().find(row => row.slug === slug);
  if (!country) return <p>{en ? "National parliamentary results are awaiting source admission." : "全国议会选举结果尚待来源准入。"}</p>;
  const years = [...new Set(country.history.map(e => e.year))];
  const sameDay = new Set(country.history.filter((e,i,all) => all.some((other,j) => i !== j && other.date === e.date)).map(e => e.date));

  return <div className="space-y-3" data-country-election-history={slug}>
    <p>{en ? "Latest admitted election" : "最近已准入选举"}</p>
    {country.latest.map(election => <LatestChamber key={election.id} slug={slug} election={election} locale={locale}/>)}
    <p className="text-sm">{en ? "Available election years" : "已收录选举年份"} · {years.join(", ")}</p>
    <Link className="underline" href={electionHref(slug, locale)}>{en ? "Open election research" : "打开选举研究"}</Link>
    <ElectionDirectoryDetails country={country} locale={locale}/>
    <details><summary>{en ? "Election dates and original sources" : "历届选举日期与原始来源"}</summary>
      <ul className="flex flex-wrap gap-3 py-3">{country.history.toReversed().map(election =>
        <li key={election.id}><Link className="underline" href={electionHref(slug, locale, election.id)}><RegistryDate date={election.date} awaitingConfirmation={election.dateNeedsCheck} en={en}/>{sameDay.has(election.date) ? " · " + election.chamber : ""}</Link></li>)}</ul>
      <p className="text-sm">{en ? "Select a date to inspect that election’s official sources." : "选择日期可查看当届选举的官方来源。"}</p>
    </details>
  </div>;
}
