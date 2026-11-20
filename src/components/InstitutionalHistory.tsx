"use client";
import type {DirectoryDate} from "@/lib/politicalElectionDirectory.server";
import {useEffect} from "react";
import Link from "next/link";
import {RegistryDate} from "./ElectionDirectoryDetails";
import {NotebookCollect} from "./NotebookCollect";
import {PLATFORM_BASE_URL} from "@/lib/releaseMetadata";
import {changeDate, countryElectionLinks, countrySources, electionInstitutionalContext, institutionalCountry, hungarianElectionTransition, institutionalPeriods, institutionalTimeline, text, type InstitutionalChange, type ElectionInstitutionalLink} from "@/lib/institutionalRegistry";

function changeHref(slug:string,id:string,en:boolean) {
  return (en?"/en":"")+"/countries/"+slug+"/#"+encodeURIComponent(id);
}
function electionHref(row:ElectionInstitutionalLink,en:boolean) {
  return (en?"/en":"")+"/politics/"+row.country+"/?election="+encodeURIComponent(row.election_id);
}

function ChangeRecord({change,slug,en,elections,history}:{change:InstitutionalChange;slug:string;en:boolean;elections:ElectionInstitutionalLink[];history?:DirectoryDate[]}) {
  const l=(english:string,chinese:string)=>en?english:chinese;
  const sources=countrySources(slug,change.source_ids);
  const periods=institutionalPeriods(slug).filter(period=>period.opened_by.includes(change.change_id));
  const linked=elections.filter(e=>periods.some(p=>p.period_id===e.institutional_period_id));
  const permalink=changeHref(slug,change.change_id,en);
  return <details id={change.change_id}>
    <summary>{text(change.title,en)}</summary>
    <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {[[l("Adoption","通过"),change.adopted],[l("Promulgation","公布"),change.promulgated],[l("Effective date","生效日期"),change.effective]].map(([label,date])=><div key={label}><dt className="text-xs text-[var(--muted)]">{label}</dt><dd>{date??l("Unrecorded","未登记")}</dd></div>)}
    </dl>
    {change.effective_note && <p>{text(change.effective_note,en)}</p>}
    {change.previous && <p className="mt-2"><strong>{l("Previous provision","此前规定")}</strong> · {text(change.previous,en)}</p>}
    <p><strong>{l("New provision","新规定")}</strong> · {text(change.new,en)}</p>
    {change.note && <p>{text(change.note,en)}</p>}
    <p>{change.legal_basis}</p>
    {sources.map(source=><a key={source.source_id} className="block break-words underline" href={source.url}>{source.title}</a>)}
    {linked.length>0 && <div className="my-2 text-sm" data-period-elections>
      <p>{l("Elections in the institutional period opened by this change","此项变更开启的制度时期内已收录的选举")}</p>
      <ul className="ml-4 list-disc">{linked.map(e=><li key={e.election_id}><Link className="underline" href={electionHref(e,en)}>{history?.find(h=>h.id===e.election_id)?.chamber??e.chamber_official_name} · {e.date}</Link></li>)}</ul>
    </div>}
    <div className="mt-3"><NotebookCollect label={l("Save this institutional change","收藏此项制度变更")} create={()=>({
      type:"source",title:text(change.title,en)!,labels:{en:change.title.en,"zh-CN":change.title.zh},url:new URL(permalink,PLATFORM_BASE_URL).href,
      canonical_ids:[change.change_id,...periods.map(p=>p.period_id),...linked.map(e=>e.election_id)],
      countries:[slug],periods:[...new Set([change.adopted,change.promulgated,change.effective].filter((date):date is string=>date!==null))],
      sources:sources.map(s=>({code:s.source_id,institution:s.publisher,dataset:s.title,url:s.url,layer:"institutional_legal_document",retrieved_at:s.retrieved_on})),
      warnings:[change.effective_note?text(change.effective_note,en)!:l("Dates and statutory provisions follow the cited legal texts.","日期与法律条文依据所列法律来源。")],
      layer:"historical_institutional_change",metadata:{status:change.status,reference:change.legal_basis,filters:{
        adoption:change.adopted??"",promulgation:change.promulgated??"",effective:change.effective??"",dimension:change.dimension,
        chambers:[...new Set(linked.flatMap(e=>e.chamber_id?[e.chamber_id]:[]))],elections:linked.map(e=>e.election_id),
      }},
    })}/></div>
  </details>;
}

function HungarianSystemTransition({en,history}: {en:boolean; history?:DirectoryDate[]}) {
  const transition=hungarianElectionTransition();
  if (!transition) return null;
  const {before,after}=transition;
  const l=(english:string,chinese:string)=>en?english:chinese;
  const constitution=institutionalTimeline("hungary").find(c=>c.dimension==="constitutional_framework" && after.changes_in_force.includes(c.change_id));
  const ruleRecords=[before,after];
  return <details id="hungary-electoral-system-transition" className="my-3 rounded border border-[var(--line)] p-3" data-electoral-transition>
    <summary className="cursor-pointer font-semibold">{l("From two rounds to one", "从两轮投票到一轮投票")} · {before.date.slice(0,4)}–{after.date.slice(0,4)}</summary>
    <ol className="my-3 grid gap-3 sm:grid-cols-2">{ruleRecords.map((record,i)=><li key={record.election_id} className="min-w-0">
      <p className="font-semibold">{record.date.slice(0,4)} · {record.seats??"—"} {l("seats","席")}</p>
      <p>{i===0?l("Single-member constituencies, territorial lists and national compensation from unused votes. A second round was held in undecided constituencies.","单一议席选区、地区名单，以及以未用于取得席位的选票分配的全国补偿席位。未决选区举行第二轮投票。"):l("A single round in single-member constituencies, with national-list seats allocated using list votes and surplus votes.","单一议席选区实行一轮投票，全国名单席位按名单票和剩余票分配。")}</p>
      <Link href={electionHref(record,en)} className="underline">{l("Election results","当届结果")} · {record.date}</Link>
    </li>)}</ol>
    <p>{l("Act XXXIV of 1989 governed the earlier election. The later contest was the first parliamentary election under Act CCIII of 2011.","前一届选举适用 1989 年第 XXXIV 号法。后一届是首场适用 2011 年第 CCIII 号法的议会选举。")}</p>
    <Link className="mt-2 inline-block underline" href={electionHref(before,en)+"&compare="+after.election_id+"#politics-compare-title"}>{l("Compare both electoral systems and results","比较两届选制与结果")}</Link>
    <details className="mt-2"><summary>{l("Legal dates and sources","法律日期与来源")}</summary>
      {constitution&&<p>{text(constitution.title,en)} · {l("Adoption","通过")} {constitution.adopted??"—"} · {l("Effective","生效")} {constitution.effective??"—"} · <Link className="underline" href={changeHref("hungary",constitution.change_id,en)}>{l("Constitutional record","宪法记录")}</Link></p>}
      <p>{l("These constitutional dates apply to the Fundamental Law. Separate adoption and commencement dates for the electoral act’s provisions are unrecorded. The earlier rules come from the election office’s allocation guide; the text of the 1989 act was not independently verified.","上述日期对应《基本法》。现有记录未单列选举法各条款的通过和生效日期。旧制依据选举办公室的席位分配说明，尚未独立核实 1989 年法案原文。")}</p>
      {ruleRecords.map(record=><div className="mt-2" key={record.election_id}><strong>{record.date.slice(0,4)}</strong>
        {history?.find(e=>e.id===record.election_id)?.ruleSources?.map(src=><a key={src.id} className="block break-words underline" data-transition-source={src.id} href={src.url}>{src.title}</a>)}
      </div>)}
    </details>
  </details>;
}

export function InstitutionalHistory({slug,en,history}:{slug:string;en:boolean;history?:DirectoryDate[]}) {
  const country = institutionalCountry(slug);
  useEffect(()=>{
    function reveal() {
      const id=location.hash.slice(1);
      if (id!=="history-"+slug && !(slug==="hungary" && id==="hungary-electoral-system-transition") && !country?.changes.some(c=>id===c.change_id)) return;
      const panel=document.getElementById(id);
      if (!(panel instanceof HTMLDetailsElement)) return;
      panel.open=true;
      let parent=panel.parentElement?.closest("details");
      while(parent){parent.open=true;parent=parent.parentElement?.closest("details");}
      panel.scrollIntoView({block:'start'});
    }
    reveal();
    window.addEventListener('hashchange',reveal);
    return ()=>window.removeEventListener('hashchange',reveal);
  },[country,slug]);
  if (!country) return null;
  const l = (english:string,chinese:string) => en ? english : chinese;
  const elections = countryElectionLinks(slug);
  const entries = [
    ...institutionalTimeline(slug).map(change => ({
      id:change.change_id,date:changeDate(change),content:<ChangeRecord change={change} slug={slug} en={en} elections={elections} history={history}/>,
      label:change.status==="partially_verified"?l("Partly verified","部分核实"):l("Verified change","已核实变更")
    })),
    ...elections.map(e=>({id:e.election_id,date:e.date,label:l("Election","选举"),content:<Link className="underline" data-timeline-election={e.election_id} href={electionHref(e,en)}>{history?.find(row=>row.id===e.election_id)?.chamber ?? e.chamber_official_name} · {e.seats ?? "—"} {l("seats","席")}</Link>}))
  ].sort((a,b)=>(a.date??"9999").localeCompare(b.date??"9999"));
  return <details className="mt-3" id={'history-'+slug}><summary>{l("Institutional timeline","制度沿革")} · {entries.length}</summary>
    {slug==="hungary" && <HungarianSystemTransition en={en} history={history}/>}
    <p className="my-2 text-xs">{l("Ordered by effective date where known, otherwise by promulgation or adoption. Undated records appear last.","优先按生效日期排序，其次使用公布或通过日期。无日期记录列在末尾。")}</p>
    <ol className="space-y-3 border-l border-[var(--line)] pl-4">{entries.map(item=><li key={item.id}>
      <span className="text-xs text-[var(--muted)]">{item.date ? <RegistryDate date={item.date} awaitingConfirmation={history?.find(row=>row.id===item.id)?.dateNeedsCheck} en={en}/> : l("Date unavailable","日期未核实")} · {item.label}</span>{item.content}
    </li>)}</ol></details>;
}

export function ElectionInstitutionalPeriod({id,en}:{id:string;en:boolean}) {
  const election=electionInstitutionalContext(id);
  if (!election) return <p>{en?"Historical institutional linkage unavailable.":"尚未核实当届制度关联。"}</p>;
  const period=institutionalPeriods(election.country).find(p=>p.period_id===election.institutional_period_id);
  const changes=institutionalTimeline(election.country);
  const groups = [
    {heading:en?"Changes recorded by election day":"选举日之前已生效的变更",ids:election.changes_in_force},
    {heading:en?"Subsequent changes":"选举之后的变更",ids:election.later_changes},
    {heading:en?"Effective date unverified":"生效日期未核实",ids:election.undated_changes}
  ];
  return <details className="mt-2" data-election-period={id}><summary>{en?"Institutional period on election day":"选举日适用的制度时期"}</summary>
    {period?<p>{period.from} {period.to_exclusive ? (en?"until (exclusive) ":"至（不含）")+period.to_exclusive : (en?"· no later boundary recorded":"· 未记录后续边界")}</p>:<p>{en?"No verified period covers this election date.":"尚无已核实的制度时期涵盖此选举日期。"}</p>}
    <p>{election.chamber_official_name} · {election.seats??"—"} {en?"seats":"席"}</p>
    {election.rule_basis && <p>{election.rule_basis}</p>}
    {groups.map(({heading,ids})=>{
      const items=changes.filter(c=>ids.includes(c.change_id));
      return items.length>0 && <div className="mt-2" key={String(heading)}><strong>{heading}</strong>{items.map(c=><Link key={c.change_id} className="block underline" href={changeHref(election.country,c.change_id,en)}>{text(c.title,en)}</Link>)}</div>;
    })}
    {election.country==="hungary" && <Link className="mt-2 mr-4 inline-block underline" href={changeHref("hungary","hungary-electoral-system-transition",en)}>{en?"Explore the 2010–2014 electoral reform":"查看 2010 至 2014 年的选制变迁"}</Link>}
    <Link className="mt-2 inline-block underline" href={changeHref(election.country,"history-"+election.country,en)}>{en?"Explore the institutional timeline":"查看制度沿革"}</Link>
  </details>;
}
