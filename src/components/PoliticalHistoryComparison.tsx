"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { localeNumber, type Locale } from "@/i18n/config";
import { admittedCountrySlugs, politicalAdmissions } from "@/lib/politicalAdmission";
import { electionHistoryHref, historyMeasures, historyObservation, historyRows, loadElectionHistoryIndex, readHistorySelection, writeHistorySelection,
  type ArchiveElection, type ElectionHistoryIndex, type HistoryMeasure, type HistoryRow, type HistorySelection } from "@/lib/electionHistoryComparison";
import { historicalComparisonUrl, historyCsv, historyEvidence, observationSources } from "@/lib/electionHistoryEvidence";
import { NotebookCollect } from "./NotebookCollect";
import { ResearchTimeSeriesChart, type ChartSeries } from "./ResearchTimeSeriesChart";
import { ScopedDistribution } from "./PoliticalComparisonPicker";

const names = new Map(politicalAdmissions.map(c => [c.slug,c.name]));
const measureLabels = {
  turnout:{en:"Turnout (%)","zh-CN":"投票率（%）"},
  chamber_seats:{en:"Chamber seats","zh-CN":"议院席位数"},
  contestants:{en:"Contestants recorded on a ballot","zh-CN":"选票收录参选项数"},
  distribution:{en:"Vote and seat distributions","zh-CN":"得票与席位分布"},
};
const snapshot = () => window.location.search;
const serverSnapshot = () => "";
function subscribe(update: () => void) {
  window.addEventListener("popstate",update);
  window.addEventListener("electionhistorychange",update);
  return () => {
    window.removeEventListener("popstate",update);
    window.removeEventListener("electionhistorychange",update);
  };
}
function navigate(next: HistorySelection) {
  const url = new URL(window.location.href);
  writeHistorySelection(url.searchParams,next);
  window.history.pushState(null,"",url);
  window.dispatchEvent(new Event("electionhistorychange"));
}
const colors = ["#226b87","#a34b35","#387552","#875b92","#805c28","#4b67ab","#655d5b","#92733f","#386b6d","#8e526c"];
const toDay = (date: string) => Date.parse(date+"T00:00:00Z") / 86400000;
const showDay = (day: number) => new Date(day * 86400000).toISOString().slice(0,10);

function HistoryPlot({rows,state,locale}:{rows:HistoryRow[];state:HistorySelection;locale:Locale}) {
  const series = new Map<string, ChartSeries>();
  for (const row of rows) {
    const e = row.election, id = row.country + "-" + e.chamber;
    if (!series.has(id)) series.set(id,{id,label:names.get(row.country)![locale]+" · "+e.chamber,
      color:colors[state.countries.indexOf(row.country)%colors.length],markers:true,width:0,points:[]});
    const observation = historyObservation(row,state.measure,locale);
    series.get(id)!.points.push({x:toDay(e.date),y:observation.value,unit:observation.unit,
      detail:e.date+" · "+observation.scope+" · "+observation.basis});
  }
  const dates = [...new Set(rows.map(r=>toDay(r.election.date)))].sort((a,b)=>a-b);
  const indices = new Set([0,Math.round((dates.length-1)/2),dates.length-1]);
  return <ResearchTimeSeriesChart title={measureLabels[state.measure][locale]}
    series={[...series.values()]} xKind="number" xLabel={locale==="en"?"Election date":"选举日期"}
    xTickValues={dates.filter((_,i)=>indices.has(i))} formatX={showDay}
    yLabel={measureLabels[state.measure][locale]} includeZero latestMarker={false}/>;
}

function EventChoices({records,country,state,locale}:{records:ArchiveElection[];country:string;state:HistorySelection;locale:Locale}) {
  const available = records.map(e=>e.id);
  const chosen = state.events.filter(id=>available.includes(id));
  const active = chosen.length ? chosen : available;
  const others = state.events.filter(id=>!available.includes(id));
  const en = locale === "en";
  function toggle(id: string) {
    const updated = active.includes(id) ? active.filter(s=>s!==id) : [...active,id];
    navigate({...state,events:[...others,...(updated.length===available.length?[]:updated)]});
  }
  return <details className="min-w-0 rounded border border-[var(--line)] p-2" data-history-events={country}>
    <summary className="cursor-pointer font-semibold">{names.get(country)![locale]} · {active.length}/{records.length}</summary>
    <fieldset className="space-y-1 pt-2"><legend className="sr-only">{en?"Elections in ":"选举记录 · "}{names.get(country)![locale]}</legend>
      {records.map(e=><label key={e.id} className="flex items-baseline gap-2"><input type="checkbox"
        checked={active.includes(e.id)} disabled={active.length===1&&active[0]===e.id} onChange={()=>toggle(e.id)}/>
        <span>{e.date} · {e.chamber}</span></label>)}
    </fieldset>
  </details>;
}

function DistributionDisclosure({row,locale}:{row:HistoryRow;locale:Locale}) {
  const [open,setOpen] = useState(false);
  return <details onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer">{locale==="en"?"Inspect distribution":"查看分布"}</summary>
    {open&&<ScopedDistribution election={row.election} country={row.country} ballot={row.ballot} locale={locale}/>}
  </details>;
}

function saveCsv(rows:HistoryRow[], state:HistorySelection, locale:Locale) {
  const href = URL.createObjectURL(new Blob(["\uFEFF",historyCsv(rows,state,locale)],{type:"text/csv;charset=utf-8"}));
  const a = document.createElement("a");
  a.href=href;
  a.download="atlas-parliamentary-election-history-"+state.measure+".csv";
  a.click();
  window.setTimeout(()=>URL.revokeObjectURL(href),1000);
}

export default function PoliticalHistoryComparison({locale}:{locale:Locale}) {
  const en = locale==="en";
  const query = useSyncExternalStore(subscribe,snapshot,serverSnapshot);
  const [index,setIndex] = useState<ElectionHistoryIndex|null>(null);
  const [failed,setFailed] = useState(false);
  const [attempt,setAttempt] = useState(0);
  const {selection:state,errors} = readHistorySelection(new URLSearchParams(query),admittedCountrySlugs,index);
  const requested = state.countries.length>0 && !errors.includes("countries");
  useEffect(()=>{
    if (!requested || index) return;
    let current = true;
    loadElectionHistoryIndex().then(data=>{if(current)setIndex(data);},()=>{if(current)setFailed(true);});
    return ()=>{current=false;};
  },[requested,index,attempt]);
  function toggleCountry(country:string) {
    if (!state.countries.includes(country)) return navigate({...state,countries:[...state.countries,country]});
    const removed = new Set(index?.[country]?.map(e=>e.id));
    navigate({...state,countries:state.countries.filter(c=>c!==country),events:state.events.filter(id=>!removed.has(id)),
      ballots:new Map([...state.ballots].filter(([id])=>!removed.has(id)))});
  }
  function chooseBallot(election:string, ballot:string) {
    const ballots = new Map(state.ballots);
    if (ballot) ballots.set(election,ballot); else ballots.delete(election);
    navigate({...state,ballots});
  }
  const rows = index && !errors.length && state.countries.length>=2 ? historyRows(state,index) : [];
  const noEvents = state.countries.filter(c=>!rows.some(row=>row.country===c));
  const viewBallots = state.measure==="contestants" || state.measure==="distribution";
  const reset = ()=>navigate({countries:[],events:[],ballots:new Map(),from:"",to:"",measure:"turnout"});
  return <section className="editorial-panel my-6 min-w-0 p-4 md:p-6" data-history-comparison aria-labelledby="election-history-comparison-title">
    <h2 id="election-history-comparison-title" className="text-xl font-semibold">{en?"Compare parliamentary election histories":"比较各国历届议会选举"}</h2>
    <fieldset className="my-3"><legend className="text-sm">{en?"Select two to ten countries":"选择二至十个国家"}</legend>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{admittedCountrySlugs.map(c=><label key={c} className="flex items-center gap-1.5">
        <input type="checkbox" checked={state.countries.includes(c)} onChange={()=>toggleCountry(c)}/>{names.get(c)![locale]}</label>)}</div>
    </fieldset>
    {errors.length>0&&<p role="status">{en?"This link includes an unrecognized selection or invalid date window.":"此链接包含未收录的选项或无效的日期范围。"}{" "}
      <button className="underline" onClick={reset}>{en?"Clear comparison filters":"清除比较筛选"}</button></p>}
    {requested&&!index&&(failed?<button className="underline" onClick={()=>{setFailed(false);setAttempt(n=>n+1);}}>{en?"Reload election records":"重新加载选举记录"}</button>:
      <p role="status">{en?"Loading admitted elections…":"正在读取已收录选举…"}</p>)}
    {index&&state.countries.length>0&&!errors.includes("countries")&&<>
      <div className="my-3 flex flex-wrap items-end gap-3 text-sm">
        <label>{en?"Measure":"比较指标"}<select className="field-control block max-w-full" value={state.measure} onChange={e=>navigate({...state,measure:e.target.value as HistoryMeasure})}>
          {historyMeasures.map(m=><option key={m} value={m}>{measureLabels[m][locale]}</option>)}</select></label>
        <label>{en?"From date":"开始日期"}<input className="field-control block" type="date" value={state.from} onChange={e=>navigate({...state,from:e.target.value})}/></label>
        <label>{en?"Through date":"结束日期"}<input className="field-control block" type="date" value={state.to} onChange={e=>navigate({...state,to:e.target.value})}/></label>
      </div>
      <details className="my-3"><summary className="cursor-pointer">{en?"Choose individual chamber elections":"按议院选择具体选举"}</summary>
        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{state.countries.map(c=><EventChoices key={c} country={c} records={index[c]} state={state} locale={locale}/>)}</div>
      </details>
      {state.countries.length<2&&<p role="status">{en?"Select one more country to compare its election history.":"请再选择一个国家以比较选举历史。"}</p>}
      {state.countries.length>=2&&!errors.length&&<>
        <p className="my-2 text-sm" data-history-count>{en?"Recorded polling dates / chamber elections":"收录的投票日期数／议院选举记录数"} · {state.countries.map(c=>{
          const selected=rows.filter(r=>r.country===c);
          return names.get(c)![locale]+" "+new Set(selected.map(r=>r.election.date)).size+"/"+selected.length;
        }).join(" · ")}</p>
        {noEvents.length>0&&<p role="status">{en?"No selected election in this window":"此日期范围内无所选选举"} · {noEvents.map(c=>names.get(c)![locale]).join(", ")}</p>}
        {rows.length>0&&<>
          {state.measure!=="distribution"&&<HistoryPlot rows={rows} state={state} locale={locale}/>}
          <div className="data-table-viewport my-3" tabIndex={0} role="region" aria-label={en?"Election comparison observations":"选举比较观测"}>
            <table className="w-full text-left text-sm"><thead><tr><th scope="col">{en?"Country and chamber":"国家与议院"}</th>
              <th scope="col">{en?"Election date":"选举日期"}</th><th scope="col">{measureLabels[state.measure][locale]}</th>
              <th scope="col">{en?"Scope and sources":"口径与来源"}</th></tr></thead>
              <tbody>{rows.map(row=>{
                const {country,election:e,ballot:b}=row, observation=historyObservation(row,state.measure,locale), references=observationSources(row,state);
                return <tr key={e.id} className="align-top border-t border-[var(--line)]" data-history-record={e.id}>
                  <th scope="row" className="p-2 font-normal">{names.get(country)![locale]}<br/>{e.chamber}</th>
                  <td className="p-2"><Link className="underline" href={electionHistoryHref(row,locale)}>{e.date}</Link>
                    {e.history.endDate&&e.history.endDate!==e.date&&<> – {e.history.endDate}</>}
                    {e.history.dateBasis?.includes("background_to_verify")&&<small className="block">{en?"Registry date awaiting confirmation":"登记日期待核实"}</small>}</td>
                  <td className="p-2">{viewBallots&&e.ballots.length>1&&<label className="mb-1 block"><span className="sr-only">{en?"Ballot scope":"选票范围"} · {e.id}</span><select className="field-control max-w-48" value={b?.id??""} onChange={ev=>chooseBallot(e.id,ev.target.value)}>
                    {!e.history.primaryBallot&&<option value="">{en?"Choose a ballot":"请选择选票"}</option>}
                    {e.ballots.map(ballot=><option key={ballot.id} value={ballot.id}>{ballot.label[locale]}</option>)}</select></label>}
                    {state.measure==="distribution"? (b?<DistributionDisclosure row={row} locale={locale}/> : "—") :
                      <><strong>{localeNumber(observation.value,locale)}{observation.value!==null&&state.measure==="turnout"?"%":""}</strong>
                      <small className="block">{observation.basis}</small></>}
                  </td><td className="p-2">{observation.scope}
                    {state.measure==="chamber_seats"&&e.slots!=null&&e.seats!==e.slots&&<small className="block">{en?"Assigned seats":"已分配席位"} · {e.seats}</small>}
                    <details><summary className="cursor-pointer">{en?"Evidence":"证据"}</summary>
                      {state.measure==="turnout"&&<><p>{e.history.turnout.definition}</p>
                        <p>{en?"Recorded numerator / electorate":"收录的分子人数／选民人数"} · {localeNumber(e.history.turnout.count,locale)} / {localeNumber(e.history.turnout.electorate,locale)}</p></>}
                      <ul>{references.map(s=><li key={s.id}><a className="underline" href={s.url}>{s.title}</a></li>)}</ul>
                    </details></td>
                </tr>;
              })}</tbody></table>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm"><NotebookCollect create={()=>historyEvidence(rows,state,locale)}
            label={en?"Save historical comparison":"保存历届选举比较"}/>
            <button className="underline" onClick={()=>saveCsv(rows,state,locale)}>{en?"Export selected evidence (CSV)":"导出所选证据（CSV）"}</button>
            <a className="underline" href={historicalComparisonUrl(state,locale)}>{en?"Research link":"研究链接"}</a>
          </div>
        </>}
      </>}
    </>}
  </section>;

}
