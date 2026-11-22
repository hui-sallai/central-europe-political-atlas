"use client";

import {useEffect, useState, useSyncExternalStore} from "react";
import Link from "next/link";
import {localizedRoute, type Locale} from "@/i18n/config";
import {politicalAdmissions} from "@/lib/politicalAdmission";
import type {BallotElection} from "@/lib/politicalBallots";
import type {PoliticalCountryView, PoliticalElectionView} from "@/lib/politicalExplorer";
import {comparisonSourceIndex, nationalComparisonView, scopedComparisonView, type ComparisonElection, type ComparisonBallot, type ComparisonIndex} from "@/lib/politicalComparisonBallots";
import {loadElectionHistoryIndex} from "@/lib/electionHistoryComparison";
import {PoliticalCountryComparison} from "./PoliticalCountryComparison";

type Props = { locale:Locale } & (
  { election:PoliticalElectionView; countries:PoliticalCountryView[]; ballotElection?:never; geography?:never } |
  { ballotElection:BallotElection; localElections?:BallotElection[]; geography?:string; election?:never; countries?:never }
);
const fields=["compare_country","compare_election","compare_ballot"] as const;
const snapshot=()=>location.search;
const serverSnapshot=()=>"";
function subscribe(fn:()=>void) {
  window.addEventListener("popstate",fn);
  window.addEventListener("electioncomparison",fn);
  return ()=>{window.removeEventListener("popstate",fn);window.removeEventListener("electioncomparison",fn);};
}
function choose(country:string, election="", ballot="") {
  const url=new URL(location.href);
  [country,election,ballot].forEach((value,i)=>{if(value) url.searchParams.set(fields[i],value); else url.searchParams.delete(fields[i]);});
  history.pushState(null,"",url);
  window.dispatchEvent(new Event("electioncomparison"));
}
export function ScopedDistribution({country,election,ballot,locale,compactRules=false}:{country:string;election:ComparisonElection;ballot?:ComparisonBallot;locale:Locale;compactRules?:boolean}) {
  const en=locale==="en", title=politicalAdmissions.find(a=>a.slug===country)?.name[locale];
  const format=(n:number|null|undefined,dp=2)=>n==null?"—":n.toLocaleString(locale,{maximumFractionDigits:dp});
  const query=new URLSearchParams({election:election.id});
  if (ballot) query.set(ballot.geographyKey??"ballot",ballot.id);
  return <article className="min-w-0" data-comparison-column={country}>
    {!compactRules && <><h4 className="font-semibold">{title} · {election.date}</h4>
    <p>{election.chamber} · {format(election.seats)} {en?"assigned seats":"已分配席位"}{election.slots!==null&&election.slots!==election.seats&&
      <> / {format(election.slots)} {en?"seat slots":"法定席位"}</>}</p>
    <p className="my-2 text-sm">{election.rules[locale]}</p></>}
    <Link className="text-sm underline" href={localizedRoute('/politics/'+country+'/',locale)+'?'+query}>{en?"Election results, sources and rules":"选举结果、来源与当届规则"}</Link>
    {ballot ? <>
      <p className="mt-3 font-semibold">{ballot.label[locale]}</p>
      {ballot.roundScope === "valid_round_composite" && <p className="text-sm" data-comparison-composite>{en ? "Territorial-list results from each district’s valid round" : "地区名单票按各地区有效轮次汇总"} · {ballot.dateStart} – {ballot.dateEnd}</p>}
      {ballot.attributionBasis === "source_apportioned_party_total" && <p className="text-sm">{en ? "The election office apportioned joint candidates’ votes among their parties. Independents are grouped separately." : "选举办公室将联合候选人的选票分摊至各提名政党，独立候选人单独汇总。"}</p>}
      {ballot.round!=null && <p className="text-sm">{en?"Voting round":"投票轮次"} {ballot.round} · {ballot.date??election.date}</p>}
      <p className="text-sm">{ballot.basis[locale]}{!ballot.pointsBallot && ballot.voteDenominator!=null && <> · {en?"Denominator":"分母"} {format(ballot.voteDenominator)}</>} · {en?"Recorded contestants":"已收录参选项"} {ballot.rows.length}{ballot.seatWinnersOnly && (en?" (seat-winning lists only)":"（仅收录赢得席位的名单）")}</p>
      <p className="text-sm">{ballot.turnoutScope?.[locale]??(en?"Turnout":"投票率")} · {ballot.turnout===null?(en?"No recorded turnout rate":"未收录投票率"):`${format(ballot.turnout)}% (${ballot.turnoutPublished?(en?"published":"官方公布"):(en?"from official counts":"按官方人数计算")})`}</p>
      <p className="text-sm">{ballot.seatScopeLabel?.[locale]??(en?"Seat-share denominator":"席位占比分母")} · {format(ballot.seatScope)} {en?"seats":"席"}</p>
      <details className="mt-3"><summary>{en?"Vote and seat distribution":"得票与席位分布"}</summary>
      <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={title+' '+election.chamber}>
        <table className="w-full text-left text-sm"><thead><tr><th scope="col">{en?"Recorded label":"收录名称"}</th>
          {!ballot.pointsBallot && <th scope="col">{en?"Votes":"票数"}</th>}
          <th scope="col">{ballot.pointsBallot?(en?"Points":"积分"):(en?"Vote share (%)":"得票率（%）")}</th>
          <th scope="col">{en?"Seats":"席位"}</th><th scope="col">{en?"Seat share (%)":"席位占比（%）"}</th></tr></thead>
          <tbody>{ballot.rows.map(row=><tr key={row.id} className="border-t border-[var(--line)]">
            <th scope="row" className="break-words py-1 font-normal">{row.name}</th>
            {!ballot.pointsBallot && <td>{format(row.votes)}</td>}
            <td>{ballot.pointsBallot?format(row.points):<>{row.published && row.share != null && ballot.roundScope === "valid_round_composite" ? row.share.toLocaleString(locale,{minimumFractionDigits:2,maximumFractionDigits:2}) : format(row.share)}{row.share!==null&&<small className="block">{row.published?(en?"published":"公布"):(en?"derived":"计算")}</small>}</>}</td>
            <td>{format(row.seats)}</td><td>{format(row.seats!==null&&ballot.seatScope?100*row.seats/ballot.seatScope:null)}</td>
          </tr>)}</tbody></table>
      </div>
      {ballot.sourceUrl&&<a className="mt-1 block break-words text-xs underline" href={ballot.sourceUrl}>{en?"Official ballot totals":"官方选票汇总"}</a>}
      {comparisonSourceIndex(election).filter(s=>ballot.sourceIds?.includes(s.id)).map(s=><a key={s.id} className="mt-1 block break-words text-xs underline" href={s.url}>{s.title}</a>)}
      </details>
    </>:<p className="mt-3 text-sm">{en?"Select a ballot to inspect its turnout and distribution.":"选择选票范围以查看其投票率与分布。"}</p>}
  </article>;
}

export function PoliticalComparisonPicker(props:Props) {
  const {locale}=props,en=locale==="en";
  const query=new URLSearchParams(useSyncExternalStore(subscribe,snapshot,serverSnapshot));
  const primary=props.ballotElection?.country??props.election?.country??"germany";
  const countries=politicalAdmissions.filter(a=>a.state==="admitted"&&a.politicsRoute!==false&&(a.slug!==primary||props.ballotElection));
  const other=query.get(fields[0])??props.countries?.[0]?.slug??"";
  const explicitYear=query.get(fields[1]),explicitScope=query.get(fields[2]);
  const legacy=props.countries?.find(c=>c.slug===other);
  const [index,setIndex]=useState<ComparisonIndex|null>(null);
  const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
  const sameCountry=Boolean(props.ballotElection && primary===other);
  const needsIndex=Boolean(other&&!legacy&&!sameCountry&&countries.some(c=>c.slug===other));
  useEffect(()=>{
    if(!needsIndex||index)return;
    let active=true;
    loadElectionHistoryIndex().then(data=>{if(active)setIndex(data);},()=>{if(active)setFailed(true);});
    return ()=>{active=false;};
  },[needsIndex,index,attempt]);
  const local = sameCountry && props.ballotElection
    ? props.localElections?.filter(item=>item.id!==props.ballotElection?.id)??[] : [];
  const compact = sameCountry ? local.map(scopedComparisonView) : index?.[other]??[];
  const options=legacy?legacy.elections.map(e=>({id:e.electionId,date:e.date,chamber:e.chamber??""})):compact;
  const latestDate=options.map(e=>e.date).sort().at(-1);
  const latest=options.filter(e=>e.date===latestDate);
  const electionId=explicitYear??(!sameCountry&&latest.length===1?latest[0].id:"");
  const b=compact.find(e=>e.id===electionId);
  const legacyElection=legacy?.elections.find(e=>e.electionId===electionId);
  const matchingScope = sameCountry ? b?.ballots.find(v=>v.id===props.geography)?.id : undefined;
  const selectedBallot=explicitScope??matchingScope??(b?.ballots.find(v=>v.id==="national")?.id??(b?.ballots.length===1?b.ballots[0].id:""));
  const peer=b?.ballots.find(v=>v.id===selectedBallot);
  const a=b?(props.election?nationalComparisonView(props.election):scopedComparisonView(props.ballotElection)):null;
  const current=a?.ballots.find(v=>v.id===props.geography)??(props.geography?undefined:a?.ballots.find(v=>v.id==="national")??(a?.ballots.length===1?a.ballots[0]:undefined));
  const original = props.ballotElection?.ballots.find(v => v.geography === current?.id);
  const peerElection = local.find(e => e.id === b?.id);
  const peerBallot = peerElection?.ballots.find(v => v.geography === peer?.id);
  const sameDefinition = original && peerBallot && props.ballotElection?.chamber === peerElection?.chamber
    && original.geography === peerBallot.geography && original.voteType === peerBallot.voteType
    && original.turnoutDefinition && original.turnoutDefinition === peerBallot.turnoutDefinition;
  const turnoutDifference = sameDefinition && original.turnout !== null && peerBallot.turnout !== null
    ? peerBallot.turnout - original.turnout : null;
  return <div className="my-4" data-comparison-picker>
    {props.ballotElection&&<h2 className="mb-2 text-xl font-semibold">{en?"Compare parliamentary elections":"比较各国议会选举"}</h2>}
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">{en?"Compare with country":"比较的国家"}<select className="field-control block" value={other} onChange={e=>choose(e.target.value)}>
        {!props.countries&&<option value="">{en?"Choose a country":"选择国家"}</option>}
        {countries.map(c=><option key={c.slug} value={c.slug}>{c.name[locale]}</option>)}
      </select></label>
      {options.length>0&&<label className="text-sm">{en?"Election":"选举"}<select className="field-control block" value={electionId} onChange={e=>choose(other,e.target.value)}>
        {!electionId&&<option value="">{en?"Choose an election and chamber":"选择选举与议院"}</option>}
        {options.map(e=><option key={e.id} value={e.id}>{legacy?e.date.slice(0,4):e.date+" · "+e.chamber}</option>)}
      </select></label>}
      {b&&b.ballots.length>1&&<label className="text-sm">{en?"Comparison ballot":"比较选票范围"}<select className="field-control block max-w-full" value={selectedBallot} onChange={e=>choose(other,electionId,e.target.value)}>
        <option value="">{en?"Choose a ballot":"选择选票"}</option>{b.ballots.map(v=><option key={v.id} value={v.id}>{v.label[locale]}</option>)}
      </select></label>}
    </div>
    {needsIndex&&!index&&(failed?<button type="button" className="underline" onClick={()=>{setFailed(false);setAttempt(x=>x+1);}}>{en?"Try loading the comparison again":"重新加载选举比较"}</button>:<p role="status">{en?"Loading election records…":"正在加载选举记录…"}</p>)}
    {((other&&!countries.some(c=>c.slug===other))||(options.length>0&&explicitYear&&!options.some(e=>e.id===explicitYear))||(b&&explicitScope&&!peer))&&
      <p role="status">{en?"The linked selection has no matching admitted record. Choose another option.":"收录记录中没有此链接指定的选项，请重新选择。"}</p>}
    {props.election&&legacyElection&&<PoliticalCountryComparison a={props.election} b={legacyElection} locale={locale}/>}
    {sameCountry && b && <p className="mt-3 text-sm" data-same-country-turnout>{turnoutDifference === null
      ? (en ? "A turnout difference requires the same chamber, ballot population and documented turnout definition." : "投票率差值要求议院、选票人群和已记载的投票率定义一致。")
      : (en ? "Turnout difference" : "投票率差值") + " (" + b.date + " − " + props.ballotElection?.date + ") · " + turnoutDifference.toLocaleString(locale,{maximumFractionDigits:2,signDisplay:"exceptZero"}) + (en ? " pp" : " 个百分点")}</p>}
    {a&&b&&<div className="mt-4 grid gap-5 lg:grid-cols-2" data-scoped-comparison>
      <ScopedDistribution country={primary} election={a} ballot={current} locale={locale}/>
      <ScopedDistribution country={other} election={b} ballot={peer} locale={locale}/>
    </div>}
  </div>;
}
