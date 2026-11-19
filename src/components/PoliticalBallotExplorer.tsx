"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { localeNumber, localizedRoute, type Locale } from "@/i18n/config";
import { politicalAdmissions } from "@/lib/politicalAdmission";
import type { BallotCategory, BallotCountrySlug, BallotElection, ElectionBallot } from "@/lib/politicalBallots";
import { electionInstitutionalContext, institutionalPeriods, institutionalTimeline, text } from "@/lib/institutionalRegistry";
import { PoliticalComparisonPicker } from "./PoliticalComparisonPicker";
import { BallotResults } from "./PoliticalBallotResults";
import { PoliticalBallotExport } from "./PoliticalBallotExport";
import { BarMeter } from "./ResearchCharts";
import { workspaceToolLink } from "./workspaceLinks";

const selectionEvent = "politicalBallotSelection";
function subscribe(handler: () => void) {
  window.addEventListener("popstate", handler);
  window.addEventListener(selectionEvent, handler);
  return () => {
    window.removeEventListener("popstate", handler);
    window.removeEventListener(selectionEvent, handler);
  };
}
function choose(id: string, geography?: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("election", id);
  if (geography) url.searchParams.set("ballot", geography);
  else url.searchParams.delete("ballot");
  if (url.href !== window.location.href) {
    window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(selectionEvent));
  }
}
const currentQuery = () => window.location.search;
const serverQuery = () => "";

function HistoricalRules({ election, locale }: { election: BallotElection; locale: Locale }) {
  const en = locale === "en";
  const link = electionInstitutionalContext(election.id);
  const period = link && institutionalPeriods(election.country).find(p=>p.period_id===link.institutional_period_id);
  const profile = localizedRoute("/countries/"+election.country+"/",locale);
  const changes = institutionalTimeline(election.country);
  return <section className="min-w-0 space-y-2" data-ballot-rules={election.systemId}>
    <h2 className="text-xl font-semibold">{en ? "Electoral rules in this election" : "当届选举规则"}</h2>
    <p>{election.rules[locale]}</p>
    <details className="editorial-panel p-4"><summary>{en ? "Seat allocation, districts and institutional history" : "席位分配、选区及制度沿革"}</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">{election.ruleDetails.map((d,i)=><li key={i}>{d[locale]}</li>)}</ul>
      {election.districts.length > 0 && <p className="mt-2">{en ? "Constituencies in the record" : "记录中的选区"} · {election.districts.join(" · ")}</p>}
      <p className="mt-2">{en ? "Institutional period" : "适用制度时期"} · {period
        ? period.from + (period.to_exclusive ? (en ? " to " : " 至 ") + period.to_exclusive + (en ? " (exclusive)" : "（不含）") : (en ? " onwards" : " 起"))
        : (en ? "No verified period in the institutional registry for this election date." : "制度登记尚未涵盖该选举日期。")}</p>
      {link && [{heading:en?"Changes in force":"当时已生效",ids:link.changes_in_force}, {heading:en?"Subsequent changes":"之后的变更",ids:link.later_changes}].map(({heading, ids})=>{
        const items=changes.filter(c=>ids.includes(c.change_id));
        return items.length ? <p key={heading} className="mt-2">{heading} · {items.map(c=><Link className="mr-2 underline" key={c.change_id} href={profile+"#"+c.change_id}>{text(c.title,en)}</Link>)}</p> : null;
      })}
      <Link href={workspaceToolLink("/politics/",locale,{institution_countries:election.country})+"#institutions"} className="mt-2 inline-block underline">{en?"Explore this country’s institutions":"查看该国制度资料"}</Link>
    </details>
  </section>;
}

function TurnoutHistory({ elections, election, ballot, locale }: { elections: BallotElection[]; election: BallotElection; ballot: ElectionBallot; locale: Locale }) {
  const en = locale==="en";
  const rows = elections.filter(e=>e.chamber===election.chamber).map(e=>({e,b:e.ballots.find(b=>b.geography===ballot.geography && b.category===ballot.category)}));
  return <details className="editorial-panel p-4" data-ballot-turnout-history>
    <summary>{en?"Turnout history":"历届投票率"} · {ballot.label[locale]}</summary>
    <p className="mt-2 text-sm">{en?"Each bar uses the electorate defined for that election and ballot. District boundaries and electorates can change.":"各条形使用当届选举、该张选票所定义的选民范围。历届选区边界及选民范围可能不同。"}</p>
    <ul className="mt-2 max-w-2xl space-y-2">{rows.map(({e,b})=><li key={e.id} className="grid grid-cols-[5rem_1fr] gap-2 text-sm">
      {b ? <button className="text-left underline" onClick={()=>choose(e.id,b.geography)}>{e.year}</button> : <span>{e.year}</span>}
      {b?.turnout != null ? <div>{localeNumber(b.turnout,locale)}% · {b.turnoutPublished ? (en?"Published":"公布值") : (en?"Derived from counts":"按人数计算")}
        <BarMeter value={b.turnout} label={e.year+" · "+ballot.label[locale]+" (%)"}/></div> : <span>{en?"No verified rate for this scope":"此范围无已核实的比率"}</span>}
    </li>)}</ul>
  </details>;
}

export function PoliticalBallotExplorer({ country, elections, locale }: { country: BallotCountrySlug; elections: BallotElection[]; locale: Locale }) {
  const query=useSyncExternalStore(subscribe,currentQuery,serverQuery);
  const params=new URLSearchParams(query);
  const en=locale==="en", t=(english:string,chinese:string)=>en?english:chinese;
  const categoryNames: Record<BallotCategory,string> = {
    national:t("National lists","全国名单"), territorial:t("Territorial constituencies","境内选区"), county:t("County constituencies","县级选区"),
    diaspora:t("Abroad","境外选区"), minority:t("National communities and minorities","民族社群与少数民族"),
  };
  const name=politicalAdmissions.find(c=>c.slug===country)?.name[locale]??country;
  const title=name+" · "+t("Parliamentary elections","议会选举");
  const newestYear=Math.max(...elections.map(e=>e.year));
  const latest=elections.find(e=>e.year===newestYear);
  const election=params.has("election") ? elections.find(e=>e.id===params.get("election")) : latest;
  const general=election?.ballots.find(b=>b.category==="national");
  const explicitBallot=params.get("ballot");
  const ballot=explicitBallot!==null ? election?.ballots.find(b=>b.geography===explicitBallot)??null : general??null;
  const invalid=explicitBallot!==null && !ballot;
  const dateNeedsCheck=election?.dateBasis?.includes("background_to_verify");
  const allYears=[...new Set(elections.map(e=>e.year))].sort((a,b)=>b-a);
  const chambers=[...new Set(elections.map(e=>e.chamber))];
  const categories=[...new Set(election?.ballots.map(b=>b.category))];
  const available=election?.ballots.filter(b=>!ballot || b.category===ballot.category)??[];
  function changeElection(next: BallotElection | undefined) {
    if (!next) return;
    const sameBallot=next.ballots.find(b=>b.geography===ballot?.geography && b.voteType===ballot.voteType);
    choose(next.id,sameBallot?.geography);
  }
  const chamberSeats=election?.seatSlots??election?.totalSeats;
  const prefix=localizedRoute("/countries/"+country+"/",locale);
  return <main className="page-shell min-w-0 space-y-6" data-political-ballot-explorer={country}>
    <header><div className="flex flex-wrap gap-3 text-sm"><Link className="underline" href={localizedRoute("/politics/",locale)}>{t("Political Explorer","政治研究")}</Link>
      <Link className="underline" href={prefix}>{t("Country Research Hub","国家研究页")}</Link></div>
      <h1 className="my-4 text-4xl font-semibold">{title}</h1>
      {election && <p>{election.date}{dateNeedsCheck && <> ({t("registry date awaiting confirmation","登记日期待核实")})</>} · <b>{election.chamber}</b> · {t("Allocated seats","已分配席位")} {election.totalSeats}{election.seatSlots!==null && election.seatSlots!==election.totalSeats && <> / {election.seatSlots} {t("seat slots","法定席位")}</>}</p>}
    </header>
    {!election ? <p role="status">{t("The requested election is not among this country’s admitted records.","所选选举未列入该国已准入记录。")} {latest && <button className="underline" onClick={()=>choose(latest.id)}>{t("Open latest election","查看最近一届")}</button>}</p> : <>
      <div className="editorial-panel flex flex-wrap gap-4 p-4">
        <label>{t("Election year","选举年份")}<select className="field-control block" data-ballot-year value={election.year} onChange={e=>{
          const next=elections.filter(x=>x.year===Number(e.target.value));
          changeElection(next.find(x=>x.chamber===election.chamber)??next[0]);
        }}>{allYears.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
        {chambers.length>1 && <label className="min-w-0">{t("Parliamentary chamber","议院")}<select className="field-control block w-full" data-ballot-chamber value={election.chamber} onChange={e=>{
          const next=elections.filter(x=>x.chamber===e.target.value);
          changeElection(next.find(x=>x.year===election.year)??next.at(-1));
        }}>{chambers.map(c=><option key={c} value={c}>{c}</option>)}</select></label>}
        {categories.length>1 && <label>{t("Ballot category","选票类别")}<select className="field-control block max-w-full" data-ballot-category value={ballot?.category??""} onChange={e=>{
          const first=election.ballots.find(b=>b.category===e.target.value);
          if (first) choose(election.id,first.geography);
        }}>{!ballot && <option value="">{t("Select a category","选择类别")}</option>}{categories.map(c=><option key={c} value={c}>{categoryNames[c]}</option>)}</select></label>}
        {election.ballots.length>1 && <label className="min-w-0">{t("Constituency or ballot","选区或选票")}<select className="field-control block w-full" data-ballot-scope value={ballot?.geography??""} onChange={e=>choose(election.id,e.target.value)}>
          {!ballot && <option value="">{t("Choose a ballot","选择选票")}</option>}{available.map(b=><option key={b.geography} value={b.geography}>{b.label[locale]}</option>)}</select></label>}
      </div>
      {invalid && <p role="alert">{t("This ballot is not recorded for the selected election. Choose one of the available ballots.","本届选举没有此选票记录，请选择已收录的选票。")} <button className="underline" onClick={()=>choose(election.id)}>{t("Reset ballot selection","重置选票选择")}</button></p>}
      <section data-ballot-composition className="min-w-0"><h2 className="text-xl font-semibold">{t("Chamber seat distribution","全院席位分布")} · {election.year}</h2>
        <p className="mt-1 text-sm">{election.chamber} · {election.totalSeats} {t("allocated seats","个已分配席位")}{election.seatSlots!==null && election.seatSlots>election.totalSeats && <> · {election.seatSlots-election.totalSeats} {t("unfilled seats","个空缺席位")}</>}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{election.composition.map((d,i)=><li key={i} className="min-w-0 break-words text-sm" title={d.label[locale]+" · "+election.year+" · "+d.seats+" / "+chamberSeats}>
          <span>{d.label[locale]} · <strong>{d.seats}</strong> · {localeNumber(100*d.seats/chamberSeats!,locale,{maximumFractionDigits:2})}%</span>
          <BarMeter label={d.label[locale]+" · "+t("Seats","席位")} value={d.seats} max={chamberSeats}/></li>)}</ul>
        {election.repeatPollDate && <p className="mt-2 text-sm">{t("Repeat voting in the affected constituencies","相关选区的重新投票日期")} · {election.repeatPollDate}</p>}
        {election.territorialTurnout && <p className="mt-2 text-sm" data-ballot-territorial-turnout>{t("Turnout across territorial constituencies I–X","境内第 I 至 X 选区总体投票率")} · {election.territorialTurnout.value===null?"—":localeNumber(election.territorialTurnout.value,locale)+"%"}{election.territorialTurnout.value!==null && <> · {election.territorialTurnout.published?t("Published","公布值"):t("Derived from counts","按人数计算")}</>}</p>}
      </section>
      {ballot ? <>
        <div className="text-sm" data-ballot-turnout><strong>{t("Turnout","投票率")} · {ballot.turnout===null?t("No verified rate","无已核实的比率"):localeNumber(ballot.turnout,locale)+"%"}</strong>
          {ballot.turnout!==null && <> · {ballot.turnoutPublished?t("Published","公布值"):t("Derived from counts","按人数计算")}</>} · {ballot.label[locale]}
          <div>{t("Eligible voters","合格选民")} {localeNumber(ballot.eligible,locale)} · {t("Voters","投票者")} {localeNumber(ballot.turnoutVoters,locale)} · {t("Valid votes","有效票")} {localeNumber(ballot.valid,locale)}</div>
          {ballot.printedTurnoutNote!==null && <p>{t("Unreproduced turnout printed in source","原件所印、未能复算的投票率")} · {ballot.printedTurnoutNote}%</p>}
        </div>
        <BallotResults election={election} ballot={ballot} locale={locale}/>
        <TurnoutHistory election={election} elections={elections} ballot={ballot} locale={locale}/>
      </> : !invalid && <p>{t("Select a constituency or ballot to inspect its contestants, vote results and turnout.","选择选区或选票，即可查看相应的参选者、票数和投票率。")}</p>}
      <HistoricalRules election={election} locale={locale}/>
      <details className="editorial-panel p-4" data-ballot-sources><summary>{t("Official sources and observation definitions","官方来源与观测定义")} · {election.sources.length}</summary>
        <p className="mt-2 text-sm">{election.systemId} · {election.legislatureId}</p>
        {election.dateBasis && <p className="text-sm">{t("Polling date evidence","投票日期依据")} · <span lang="en">{election.dateBasis}</span></p>}
        {ballot?.turnoutDefinition && <p className="text-sm">{t("Recorded turnout definition","登记的投票率定义")} · <span lang="en">{ballot.turnoutDefinition}</span></p>}
        <ul className="mt-3 space-y-2 break-words text-sm">{election.sources.map(s=><li key={s.id}><a href={s.url} className="underline">{s.title}</a>{s.sha256 && <small className="ml-2 break-all">SHA-256 · {s.sha256}</small>}</li>)}</ul></details>
      {!invalid && <PoliticalBallotExport election={election} ballot={ballot} locale={locale}/>}
      <Link href={workspaceToolLink("/data/",locale,{tab:"compare",compare_countries:country,compare_frequency:"annual",comparison_indicator:"annual:real_gdp_growth",compare_from:election.year-3,compare_to:election.year,comparison_mode:"side_by_side"})} className="inline-block underline">{t("Explore the historical economic context","查看历史经济背景")} · {election.year-3}–{election.year}</Link>
      {!invalid && <PoliticalComparisonPicker ballotElection={election} geography={ballot?.geography} locale={locale}/>}
    </>}
  </main>;
}
