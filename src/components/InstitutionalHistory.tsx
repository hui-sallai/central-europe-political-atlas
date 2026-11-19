"use client";
import type {DirectoryDate} from "@/lib/politicalElectionDirectory.server";
import {useEffect} from "react";
import Link from "next/link";
import {RegistryDate} from "./ElectionDirectoryDetails";
import {changeDate, countryElectionLinks, countrySources, electionInstitutionalContext, institutionalCountry, institutionalPeriods, institutionalTimeline, text} from "@/lib/institutionalRegistry";

export function InstitutionalHistory({slug,en,history}:{slug:string;en:boolean;history?:DirectoryDate[]}) {
  const country = institutionalCountry(slug);
  useEffect(()=>{
    function reveal() {
      const change=country?.changes.find(c=>location.hash==='#'+c.change_id);
      if (!change) return;
      const panel=document.getElementById(change.change_id);
      if (!(panel instanceof HTMLDetailsElement)) return;
      panel.open=true;
      const timeline=panel.parentElement?.closest('details');
      if (timeline) timeline.open=true;
      panel.scrollIntoView({block:'start'});
    }
    reveal();
    window.addEventListener('hashchange',reveal);
    return ()=>window.removeEventListener('hashchange',reveal);
  },[country]);
  if (!country) return null;
  const l = (english:string,chinese:string) => en ? english : chinese;
  const changes = institutionalTimeline(slug);
  const elections = countryElectionLinks(slug);
  const entries = [
    ...changes.map(change => ({
      id:change.change_id, date:changeDate(change),
      content:<details id={change.change_id}><summary>{text(change.title,en)}</summary>
        <p>{l("Adoption","通过")} · {change.adopted ?? "—"} / {l("Promulgation","公布")} · {change.promulgated ?? "—"} / {l("Effective","生效")} · {change.effective ?? "—"}</p>
        {change.effective_note && <p>{text(change.effective_note,en)}</p>}
        <p>{change.previous && <>{text(change.previous,en)} → </>}{text(change.new,en)}</p>
        {change.note && <p>{text(change.note,en)}</p>}
        <p>{change.legal_basis}</p>
        {countrySources(slug,change.source_ids).map(s=><a key={s.source_id} className="block underline" href={s.url}>{s.title}</a>)}
      </details>,
      label:change.status==="partially_verified"?l("Partly verified","部分核实"):l("Verified change","已核实变更")
    })),
    ...elections.map(e=>({id:e.election_id,date:e.date,label:l("Election","选举"),content:<Link className="underline" href={(en?"/en":"")+"/politics/"+slug+"/?election="+encodeURIComponent(e.election_id)}>{history?.find(row=>row.id===e.election_id)?.chamber ?? e.chamber_official_name} · {e.seats ?? "—"} {l("seats","席")}</Link>}))
  ].sort((a,b)=>(a.date??"9999").localeCompare(b.date??"9999"));
  return <details className="mt-3" id={'history-'+slug}><summary>{l("Institutional timeline","制度沿革")} · {entries.length}</summary>
    <p className="my-2 text-xs">{l("Ordered by effective date where known, otherwise by promulgation or adoption. Undated records appear last.","优先按生效日期排序，其次使用公布或通过日期。无日期记录列在末尾。")}</p>
    <ol className="space-y-3 border-l border-[var(--line)] pl-4">{entries.map(item=><li key={item.id}>
      <span className="text-xs text-[var(--muted)]">{item.date ? <RegistryDate date={item.date} awaitingConfirmation={history?.find(row=>row.id===item.id)?.dateNeedsCheck} en={en}/> : l("Date unavailable","日期未核实")} · {item.label}</span>{item.content}
    </li>)}</ol></details>;
}

export function ElectionInstitutionalPeriod({id,en}:{id:string;en:boolean}) {
  const election=electionInstitutionalContext(id);
  const period=election && institutionalPeriods(election.country).find(p=>p.period_id===election.institutional_period_id);
  if (!election || !period) return <p>{en?"Historical institutional linkage unavailable.":"尚未核实当届制度关联。"}</p>;
  const changes=institutionalTimeline(election.country).filter(c=>period.opened_by.includes(c.change_id));
  return <details className="mt-2"><summary>{en?"Institutional period on election day":"选举日适用的制度时期"}</summary>
    <p>{period.from} {period.to_exclusive ? (en?"until (exclusive) ":"至（不含）")+period.to_exclusive : (en?"· no later boundary recorded":"· 未记录后续边界")}</p>
    <p>{election.chamber_official_name} · {election.seats??"—"} {en?"seats":"席"}</p>
    {election.rule_basis && <p>{election.rule_basis}</p>}
    {changes.map(c=><Link key={c.change_id} className="block underline" href={(en?"/en":"")+"/countries/"+election.country+"/#"+c.change_id}>{text(c.title,en)}</Link>)}
  </details>;
}
