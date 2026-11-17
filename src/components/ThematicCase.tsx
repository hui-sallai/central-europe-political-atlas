"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { localizedRoute, type Locale } from "@/i18n/config";
import { englishUnit } from "@/i18n/presentation";
import { PLATFORM_BASE_URL, PLATFORM_VERSION } from "@/lib/releaseMetadata";
import type { ImplementationMilestone } from "@/lib/eventImplementationEvidence";
import type { EvidenceDraft } from "@/lib/researchNotebook";
import type { Bi, ChronologyItem, EventMapping, EvidenceWindow, FundingRecord, InvestmentRecord, Layer, ResearchCase } from "@/lib/thematicResearch";
import terms from "@/lib/research-themes/meta.json";
import { NotebookCollect } from "./NotebookCollect";
import { ResearchTimeSeriesChart } from "./ResearchTimeSeriesChart";
import { thematicIndicatorLabel, thematicSourceUrls } from "./thematicIndicatorLabel";

type CatalogueEntry = {
  indicator_id: string; layer: Layer; transformation?: string | null; registry_name: Bi | null;
  unit: string | null; explorer_key: string | null; source_url: string | null; dataset: string | null;
};
export type ThematicCaseData = {
  record: ResearchCase; chronology: {dated:ChronologyItem[];undated:ChronologyItem[]};
  windows: EvidenceWindow[]; investments: InvestmentRecord[]; funding: FundingRecord[];
  events: Pick<EventMapping,"event_id"|"country"|"date"|"source_name"|"source_url"|"summary">[];
  catalogue: CatalogueEntry[]; milestones: ImplementationMilestone[];
  projects: {id:string;source_name:string;source_url:string|null}[];
};

const additionalTerms: Record<string,Bi> = {
  verified:{en:"Verified",zh:"已核实"}, unavailable:{en:"No supporting evidence",zh:"暂无支持证据"},
  announced:{en:"Announced",zh:"已宣布"}, approval:{en:"Approval",zh:"批准"},
  implementation:{en:"Implementation",zh:"实施"}, realized_outcome:{en:"Measured outcome",zh:"实测结果"},
  event:{en:"Verified event",zh:"已核实事件"}, grants:{en:"Grants",zh:"赠款"}, loans:{en:"Loans",zh:"贷款"},
  mixed:{en:"Mixed instruments",zh:"多种融资工具"}, not_stated:{en:"Not stated",zh:"未说明"},
  rounded_as_published:{en:"Rounded as published",zh:"按公布精度取整"}, exact:{en:"As published",zh:"公布值"},
  lower_bound:{en:"Lower bound",zh:"下限"}, upper_bound:{en:"Upper bound",zh:"上限"},
};
const terminology:Record<string,Bi> = {
  ...additionalTerms, ...terms.stage_status, ...terms.evidence_status,
  ...Object.fromEntries([...terms.investment_stages,...terms.funding_stages].map(s=>[s.id,s.label])),
};
type Citation = {id:string;title:string;url:string};

function citationsFor(data:ThematicCaseData):Citation[] {
  const citations:Citation[] = [
    ...data.events.map(e=>({id:e.event_id,title:e.source_name,url:e.source_url})),
    ...data.milestones.filter(m=>m.url).map(m=>({id:m.id,title:m.document_ref,url:m.url!})),
    ...data.projects.filter(p=>p.source_url).map(p=>({id:p.id,title:p.source_name,url:p.source_url!})),
  ];
  for(const f of data.funding) {
    const source=f.source as FundingRecord["source"] & {url?:string};
    if(source.url) citations.push({id:f.record_id,title:source.ref??f.programme,url:source.url});
  }
  return citations;
}

function CaseChronology({data,locale,citations}:{data:ThematicCaseData;locale:Locale;citations:Citation[]}) {
  const [kind,setKind]=useState("all"), [project,setProject]=useState("");
  const [from,setFrom]=useState(""), [to,setTo]=useState("");
  const [country,setCountry]=useState("");
  const en=locale==="en",lang=en?"en":"zh",t=(e:string,z:string)=>en?e:z;
  const term=(id:string)=>terminology[id]?.[lang]??id;
  const rows=[...data.chronology.dated,...data.chronology.undated];
  const eventById=new Map(data.events.map(event=>[event.event_id,event]));
  function countryOf(row:ChronologyItem) {
    const item=data.investments.find(r=>r.record_id===row.record_id)??data.funding.find(r=>r.record_id===row.record_id)??eventById.get(row.record_id);
    const milestone=data.milestones.find(m=>m.id===row.record_id);
    return item?.country??(milestone?eventById.get(milestone.event_id)?.country:undefined);
  }
  const countryIds=[...new Set(rows.map(countryOf).filter((slug):slug is string=>!!slug))];
  const matching=rows.filter(row=>(!country||country===countryOf(row))&&(kind==="all"||row.kind===kind)&&(!project||row.record_id===project)
    &&(!from||!!row.date&&row.date.slice(0,4)>=from)&&(!to||!!row.date&&row.date.slice(0,4)<=to));
  const years=[...new Set(data.chronology.dated.flatMap(r=>r.date?[r.date.slice(0,4)]:[]))].sort();
  return <details className="my-4" data-case-chronology><summary>{t("Documentary timeline","文献时间线")} · {rows.length}</summary>
    <div className="my-3 flex flex-wrap gap-3 text-sm">
      {countryIds.length>1&&<label>{t("Country","国家")} <select className="field-control" value={country} onChange={e=>setCountry(e.target.value)}><option value="">{t("All","全部")}</option>{countryIds.map(id=><option key={id}>{id}</option>)}</select></label>}
      <label>{t("Entry type","记录类型")} <select className="field-control" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">{t("All","全部")}</option>
        {Object.entries({event:t("Event","事件"),investment_stage:t("Investment stage","投资阶段"),funding_stage:t("Funding stage","融资阶段"),implementation_milestone:t("Implementation milestone","实施里程碑")}).filter(([id])=>rows.some(r=>r.kind===id)).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      {data.investments.length>0&&<label>{t("Project or instrument","项目或政策工具")} <select className="field-control" value={project} onChange={e=>setProject(e.target.value)}><option value="">{t("All","全部")}</option>{data.investments.map(i=><option key={i.record_id} value={i.record_id}>{i.title[lang]}</option>)}</select></label>}
      <label>{t("From year","起始年份")} <select className="field-control" value={from} onChange={e=>setFrom(e.target.value)}><option value="">—</option>{years.map(y=><option key={y}>{y}</option>)}</select></label>
      <label>{t("Through year","截至年份")} <select className="field-control" value={to} onChange={e=>setTo(e.target.value)}><option value="">—</option>{years.map(y=><option key={y}>{y}</option>)}</select></label>
    </div>
    {!matching.length&&<p>{t("No records in this selection.","该筛选范围没有记录。")}</p>}
    <ol className="space-y-3 border-l border-[var(--line)] pl-4 text-sm">{matching.map((row,index)=>{
      const fund=data.funding.find(f=>f.record_id===row.record_id);
      const investment=data.investments.find(i=>i.record_id===row.record_id);
      const stage=investment?.stages.find(s=>s.stage===row.stage&&s.date===row.date&&s.status===row.status&&s.summary.en===row.summary?.en);
      const milestone=data.milestones.find(m=>m.id===row.record_id);
      const summary=row.summary??milestone?.claim??data.events.find(e=>e.event_id===row.record_id)?.summary;
      const ids=[row.record_id,...(stage?.evidence.implementation_milestones??[]),...(stage?.evidence.event_ids??[]),stage?.evidence.project_id,fund?.event_id,fund?.implementation_milestone];
      const sources=citations.filter(s=>ids.includes(s.id));
      return <li key={row.record_id+"-"+index} className="break-words">
        <p><strong>{row.date??t("Date not indexed","索引未列日期")}</strong> · {term(row.stage??"event")} · {term(row.status)}</p>
        {investment&&<p>{investment.title[lang]}</p>}
        {fund&&<p>{fund.country} · {fund.programme} · {fund.funding_period} · {term(fund.category)} · {fund.amount===null?t("Amount not stated","未列金额"):fund.amount.toLocaleString(locale)+" "+fund.currency+" ("+term(fund.amount_precision??"exact")+")"}</p>}
        {summary&&<p>{summary[lang]}</p>}
        {stage?.amounts?.map((a,n)=><p key={n}>{a.label[lang]} · {a.value.toLocaleString(locale)} {a.currency} ({term(a.precision)})</p>)}
        {stage?.quantities?.map((q,n)=><p key={n}>{q.label[lang]} · {q.value.toLocaleString(locale)} {q.unit}</p>)}
        {milestone?.publication_date&&<p>{t("Document published","文件发布日期")} · {milestone.publication_date}</p>}
        {sources.map(s=><a key={s.id+"-"+s.url} className="mr-3 inline-block underline" href={s.url}>{s.title}</a>)}
      </li>;
    })}</ol>
  </details>;
}

function subscribeToCaseSeries(callback:()=>void) {
  window.addEventListener("popstate",callback);
  window.addEventListener("caseSeriesChange",callback);
  return ()=>{
    window.removeEventListener("popstate",callback);
    window.removeEventListener("caseSeriesChange",callback);
  };
}
function readCaseSeries() {
  const params=new URLSearchParams(location.search);
  return params.has("case_window")||params.has("case_series")
    ? JSON.stringify([params.get("case_window"),params.get("case_series")]) : "";
}
function CaseHistory({data,locale}:{data:ThematicCaseData;locale:Locale}) {
  const en=locale==="en",lang=en?"en":"zh",t=(e:string,z:string)=>en?e:z;
  const selected=useSyncExternalStore(subscribeToCaseSeries,readCaseSeries,()=>"");
  const series=data.windows.flatMap(window=>window.series.filter(s=>s.status!=="none"&&s.observations.length).map(s=>{
    const entry=data.catalogue.find(r=>r.indicator_id===s.indicator_id&&r.layer===s.layer&&(r.transformation??null)===(s.transformation??null));
    const label=thematicIndicatorLabel(s.indicator_id,en,entry?.registry_name);
    const seriesId=[s.indicator_id,s.layer,s.geo,...(s.transformation?[s.transformation]:[])].join(":");
    return {window,s,entry,label,seriesId,key:JSON.stringify([window.window_id,seriesId])};
  }));
  if(!series.length) return data.record.window_blocker?<p className="my-3">{data.record.window_blocker[lang]}</p>:null;
  const current=selected?series.find(item=>item.key===selected):series[0];
  const picker=<label className="block font-semibold">{t("Historical observations","历史观测")} <select className="field-control mt-1 block w-full" value={current?.key??""} onChange={e=>{
    const item=series.find(row=>row.key===e.target.value);
    if(!item) return;
    const url=new URL(location.href);
    url.searchParams.set("case_window",item.window.window_id);
    url.searchParams.set("case_series",item.seriesId);
    history.pushState(null,"",url);
    window.dispatchEvent(new Event("caseSeriesChange"));
  }}>
    {!current&&<option value="">{t("Select an available series","请选择已收录的序列")}</option>}
    {series.map(({window,s,label,key})=><option key={key} value={key}>{window.anchor_date} · {s.geo} · {label} · {terms.layers[s.layer][lang]}</option>)}
  </select></label>;
  if(!current) return <section className="my-4" data-case-window>{picker}<p role="status">{t("The requested window and series do not match an admitted record for this case.","链接指定的窗口与序列不对应本案例已收录的记录。")}</p></section>;
  const {window:w,s,entry,label}=current;
  const sourceUrls=thematicSourceUrls(entry?.source_url??null);
  const unit=(en?englishUnit(entry?.unit??""):entry?.unit)||t("Unit unavailable","单位未登记");
  const observations=new Map(s.observations.map(o=>[o.period,o]));
  const periods=[...new Set([...observations.keys(),...s.missing_periods])].sort();
  const title=label+" · "+s.geo;
  const dataHref=entry?.explorer_key&&s.country?localizedRoute("/data/?"+new URLSearchParams({
    compare_countries:s.country, comparison_indicator:entry.explorer_key,compare_frequency:w.frequency,compare_from:periods[0],compare_to:periods[periods.length-1],comparison_mode:"side_by_side",
  }),locale):null;
  return <section className="my-4" data-case-window>
    {picker}
    <p className="mt-2 text-sm">{w.anchor_date} · {w.anchor_label[lang]}. {w.note[lang]}</p>
    <ResearchTimeSeriesChart interactive containerRole="group" title={title} xKind={w.frequency==="annual"?"number":"month"} xLabel={w.frequency==="annual"?t("Calendar year","日历年"):t("Calendar month","日历月")} yLabel={unit} legend={false}
      series={[{id:s.indicator_id,label:title,color:"var(--accent)",markers:true,points:periods.map(period=>({
        x:w.frequency==="annual"?Number(period):period,y:observations.get(period)?.value??null,unit,detail:observations.get(period)?.observation_id,
      }))}]}/>
    {s.status==="pre_event_only"&&<p>{t("No observations after the anchor date in this window.","此窗口内尚无锚点日期之后的观测。")}</p>}
    {s.missing_periods.length>0&&<p className="break-words text-sm">{t("Missing periods","缺失期间")} · {s.missing_periods.join(", ")}</p>}
    {sourceUrls.map((url,i)=><a key={url} className="mr-4 underline" href={url}>{t("Dataset reference (catalogue example)","数据集参考（目录所列示例）")}{sourceUrls.length>1?" "+(i+1):""} · {entry?.dataset??label}</a>)}
    <details className="my-2"><summary>{t("Observation records","观测记录")} · {s.observations.length}</summary>
      <ul className="my-2 space-y-1 text-sm">{s.observations.map(o=><li key={o.observation_id}><time>{o.period}</time> · {o.value} {unit} · <code>{o.observation_id}</code></li>)}</ul>
      <NotebookCollect label={t("Save selected historical series","保存所选历史序列")} create={()=>{
        const url=new URL(location.pathname+location.search,PLATFORM_BASE_URL);url.searchParams.set("case",data.record.case_id);
        url.searchParams.set("case_window",w.window_id);url.searchParams.set("case_series",current.seriesId);
        return {type:"series_view",title, url:url.href,countries:s.country?[s.country]:data.record.countries,periods:s.observations.map(o=>o.period),
          canonical_ids:[w.window_id,s.indicator_id,...s.observations.map(o=>o.observation_id)],layer:s.layer,
          sources:sourceUrls.map(url=>({institution:entry?.dataset??s.indicator_id,dataset:entry?.dataset??s.indicator_id,url,layer:s.layer})),
          warnings:[w.note[lang],...(entry?.source_url?[t("The catalogue URL identifies the dataset and can show a different reference period or geography. The listed observation IDs identify this window.","目录链接标识数据集，示例查询的时期或地区可能不同。本窗口可由所列观测 ID 核查。")]:[])],metadata:{filters:{case:data.record.case_id,window:w.window_id,indicator:s.indicator_id,geo:s.geo},row_count:s.observations.length}};
      }}/>
    </details>
    {dataHref&&<Link className="underline" data-case-history-link href={dataHref}>{t("Inspect this series in Data Explorer","在数据浏览器查看此序列")}</Link>}
  </section>;
}

export function ThematicCase({data,locale}:{data:ThematicCaseData;locale:Locale}) {
  const {record}=data,en=locale==="en",lang=en?"en":"zh",t=(e:string,z:string)=>en?e:z;
  const citations=citationsFor(data);
  const notebook=():EvidenceDraft=>{
    const url=new URL(location.pathname+location.search,PLATFORM_BASE_URL);
    url.searchParams.set("case",record.case_id);
    url.searchParams.delete("case_window");url.searchParams.delete("case_series");
    return {type:"series_view",title:record.title[lang],labels:{en:record.title.en,"zh-CN":record.title.zh},url:url.href,
      canonical_ids:[record.case_id,...record.investment_records,...record.funding_records,...record.event_ids],countries:record.countries,
      periods:[...new Set(data.chronology.dated.flatMap(r=>r.date?[r.date]:[]))],layer:"thematic_research_case",
      sources:[...new Map(citations.map(c=>[c.url,c])).values()].map(c=>({institution:c.title,dataset:c.title,url:c.url,code:c.id,layer:"case_documentation"})),
      warnings:record.limitations.map(l=>l[lang]),metadata:{evidence_categories:record.theme_ids,status:record.status,entersModel:false}};
  };
  function download() {
    const blob=new Blob([JSON.stringify({platform_version:PLATFORM_VERSION,exported_at:new Date().toISOString(),research_url:notebook().url,...data,citations},null,2)],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=record.case_id+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <article className="mt-5 min-w-0 space-y-3 break-words" data-thematic-case={record.case_id}>
    <h3 className="text-2xl font-semibold">{record.title[lang]}</h3><p>{record.research_question[lang]}</p>
    <ul className="list-disc space-y-1 pl-5">{record.findings.map(f=><li key={f.en}>{f[lang]}</li>)}</ul>
    <CaseHistory key={record.case_id} data={data} locale={locale}/>
    <CaseChronology key={"timeline-"+record.case_id} data={data} locale={locale} citations={citations}/>
    <details><summary>{t("Institutional context and research limits","制度背景与研究边界")}</summary>
      {record.institutional_context.map(p=><p className="mt-2" key={p.en}>{p[lang]}</p>)}
      <p className="mt-2">{record.interpretation[lang]}</p>
      <ul className="list-disc pl-5">{record.limitations.map(p=><li key={p.en}>{p[lang]}</li>)}</ul>
    </details>
    <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label={t("Case research links","案例研究链接")}>{record.links.map(link=><Link className="underline" href={localizedRoute(link.route,locale)} key={link.route}>{link.label[lang]}</Link>)}</nav>
    <div className="flex flex-wrap items-center gap-3" data-case-actions><NotebookCollect create={notebook} label={t("Save case to Notebook","将案例保存到研究笔记")}/><button type="button" className="underline" data-case-export onClick={download}>{t("Download case evidence (JSON)","下载案例证据（JSON）")}</button></div>
  </article>;
}
