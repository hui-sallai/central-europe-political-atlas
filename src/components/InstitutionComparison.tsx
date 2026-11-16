"use client";
import {NotebookCollect} from "./NotebookCollect";
import {PLATFORM_BASE_URL} from "@/lib/releaseMetadata";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useLocale} from "@/i18n/LocaleProvider";
import {countries,type Country} from "@/lib/data";
import {chambers,constitutionalRules,executiveOffices,governmentSystem,institutionalCheckedOn,institutionalSourceLinks,pendingInstitutionalFields} from "@/lib/institutionProfiles";
import {admittedCountrySlugs} from "@/lib/politicalAdmission";
import type {PoliticalCountryView} from "@/lib/politicalExplorer";

import {compareInstitutions, institutionMeta, institutionalCountry, text} from "@/lib/institutionalRegistry";
import {InstitutionalHistory} from "./InstitutionalHistory";

const queryKey='institution_countries';
export function InstitutionalProfile({country,election}:{country:Country;election?:PoliticalCountryView['elections'][number]}) {
 const en=useLocale()==='en',i=en?0:1,slug=country.slug,prefix=en?'/en':'';
 const rule=constitutionalRules[slug],sources=institutionalSourceLinks(slug),pending=pendingInstitutionalFields(slug);
 const facts=[
  [en?'Government system':'政府制度',governmentSystem(slug)[i]],
  [en?'Legislature':'立法机关',chambers[slug]?.[i]],
  [en?'Head of state · head of government':'国家元首 · 政府首脑',executiveOffices(slug)[i]],
  [en?'Selection of head of state':'元首产生方式',rule?.selection[i]],
  [en?'Legislative term':'议会任期',rule?.term[i]]
 ];
 return <div className="min-w-0 space-y-3 text-sm" data-institution-profile={slug}>
   <p>{text(institutionalCountry(slug)?.overview,en)}</p>
   <dl>{facts.filter(([,v])=>v).map(([label,value])=><div className="border-b border-[var(--line)] py-2" key={label}><dt className="text-xs text-[var(--muted)]">{label}</dt><dd>{value}</dd></div>)}</dl>
   {rule ? <details><summary>{en?'Government formation and confidence':'政府形成与议会信任'}</summary>
    <ol className="my-2 flex flex-wrap items-center gap-2">{rule.formation[i].split(' → ').map((step,n)=><li key={step} className="rounded border border-[var(--line)] px-2 py-1">{n+1}. {step}</li>)}</ol><p>{rule.confidence[i]}</p></details> :
    <p>{en?'Selection, term and confidence rules await article-level verification.':'元首产生方式、任期和信任程序尚待法条核实。'}</p>}
   {election && <details><summary>{en?'Electoral rules and seats':'选举规则与席位'} · {election.date}</summary>
    <p>{election.chamber} · {election.totalSeats??'—'} {en?'seats':'席'} · {election.system.allocationMethod.replaceAll('_',' ')}</p>
    <Link className="underline" href={prefix+'/politics/'+slug+'/?election='+encodeURIComponent(election.electionId)}>{en?'Results, ballot definitions and election sources':'结果、选票定义与当届来源'}</Link></details>}
   <details><summary>{en?'Chambers and electoral system':'议院与选举制度'}</summary>
    {institutionalCountry(slug)?.chambers.map(ch=><p key={ch.chamber_id} className="my-2"><strong>{ch.official_name}</strong> · {text(ch.selection.label,en)} · {text(ch.powers,en)}</p>)}
    {institutionalCountry(slug)?.electoral_systems.map(r=><p key={r.rule_id}>{text(r.summary,en)} · {text(institutionMeta.status_labels[r.status],en)}</p>)}
   </details>
   <InstitutionalHistory slug={slug} en={en}/>
   <details><summary>{en?'Institutional sources and scope':'制度来源与适用范围'}</summary>
    <p>{en?`Official texts checked ${institutionalCheckedOn(slug)}. Historical applicability requires the version in force at the time.`:`官方文本核查日期为 ${institutionalCheckedOn(slug)}。历史分析须查阅当时有效文本。`}</p>
    {rule&&<p>{rule.basis}</p>}
    {sources.map(s=><a key={s.url} className="block underline" href={s.url}>{s.label[i]}</a>)}
    {pending.length>0&&<><p className="mt-2">{en?'Not yet verified in this record:':'本记录尚未核实：'}</p><ul className="list-disc pl-5">{pending.map(p=><li key={p[0]}>{p[i]}</li>)}</ul></>}
   </details>
 </div>;
}

export function InstitutionComparison({political}:{political:PoliticalCountryView[]}) {
 const en=useLocale()==='en',prefix=en?'/en':'';
 const [group,setGroup]=useState('');
 const [ids,setIds]=useState<string[]>([]),[invalid,setInvalid]=useState(false);
 useEffect(()=>{
  function restore(){
   const raw=new URLSearchParams(location.search).get(queryKey);
   const list=raw?raw.split(','):[];
   const valid=list.length<=4 && new Set(list).size===list.length && list.every(id=>countries.some(c=>c.slug===id));
   const requested=new URLSearchParams(location.search).get('institution_dimension')??'';
   setGroup(Object.hasOwn(institutionMeta.groups,requested)?requested:'');
   setIds(valid?list:[]);setInvalid(!valid);
  }
  restore();window.addEventListener('popstate',restore);return ()=>window.removeEventListener('popstate',restore);
 },[]);
 function update(next:string[],dimension=group){
  if(next.length>4)return;
  setIds(next);setInvalid(false);
  const url=new URL(location.href);if(next.length)url.searchParams.set(queryKey,next.join(','));else url.searchParams.delete(queryKey);
  setGroup(dimension);if(dimension)url.searchParams.set('institution_dimension',dimension);else url.searchParams.delete('institution_dimension');
  url.hash='institutions';history.pushState(null,'',url);
 }
 return <section id="institutions" className="editorial-panel mt-6 p-4 sm:p-6">
  <h2 className="text-2xl font-semibold">{en?'Compare political institutions':'比较政治制度'}</h2>
  <p className="mt-2 text-sm">{en?'Explore institutions in ten countries. Election results are available separately for six.':'查看十国政治制度。另有六国的历届议会选举资料。'}</p>
  <fieldset className="mt-3 flex flex-wrap gap-x-4 gap-y-2"><legend>{en?'Choose two to four countries':'选择两至四个国家'} · {ids.length}/4</legend>
  {countries.map(c=><label key={c.slug}><input type="checkbox" checked={ids.includes(c.slug)} disabled={ids.length===4&&!ids.includes(c.slug)} onChange={()=>update(ids.includes(c.slug)?ids.filter(id=>id!==c.slug):[...ids,c.slug])}/> {en?c.nameEn:c.nameZh}</label>)}</fieldset>
  {invalid&&<p role="alert">{en?'Invalid country selection. Choose countries again.':'链接中的国家组合无效，请重新选择。'}</p>}
  {ids.length===1&&<Link className="mt-3 block underline" href={prefix+'/countries/'+ids[0]+'/#institutions'}>{en?'Open the selected country’s institutional profile':'查看所选国家的制度资料'}</Link>}
  {ids.length<2?<p className="mt-3">{en?'Select another country to compare legislatures and executive offices.':'请选择国家以比较立法与行政机构。'}</p>:
   <><label className="mt-4 block">{en?'Comparison dimension':'比较维度'} <select className="field-control" value={group} onChange={e=>update(ids,e.target.value)}><option value="">{en?'All dimensions':'所有维度'}</option>{Object.entries(institutionMeta.groups).map(([key,label])=><option key={key} value={key}>{text(label,en)}</option>)}</select></label>
   {compareInstitutions(ids,en)?.filter(row=>!group||row.group===group).map(row=><section key={row.field} className="my-3 border-b border-[var(--line)] pb-3" data-comparison-field={row.field}>
    <h3 className="font-semibold">{row.label}</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{row.cells.map(cell=>{
      const country=countries.find(c=>c.slug===cell.slug)!;
      return <div className="min-w-0 break-words text-sm" key={cell.slug}><strong>{en?country.nameEn:country.nameZh}</strong><p>{cell.label}</p>
       <details><summary>{text(institutionMeta.status_labels[cell.status],en)} · {en?'Evidence':'依据'}</summary>
        {cell.comparability!=='direct'&&<p>{cell.comparability==='qualified'?(en?'Compare with qualifications.':'比较时须考虑制度差异。'):(en?'No direct comparison.':'无法直接比较。')}</p>}
        <p>{cell.detail}</p><p>{cell.articles}</p>{institutionalCountry(cell.slug)?.fields[row.field]?.effective_from}
        {cell.sources.map(s=><a className="block underline" href={s.url} key={s.url}>{s.title}</a>)}</details></div>;
    })}</div></section>)}
   <div className="my-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{ids.map(id=>{
    const country=countries.find(c=>c.slug===id)!;
    const latest=political.find(c=>c.slug===id)?.elections.toSorted((a,b)=>b.date.localeCompare(a.date))[0];
    return <article key={id}><h3 className="mb-2 text-lg font-semibold"><Link className="underline" href={prefix+'/countries/'+id+'/#institutions'}>{en?country.nameEn:country.nameZh}</Link></h3>
     <label className="block text-sm">{en?'Replace country':'替换国家'} <select className="field-control" value={id} onChange={e=>update(ids.map(v=>v===id?e.target.value:v))}>{countries.filter(c=>c.slug===id||!ids.includes(c.slug)).map(c=><option key={c.slug} value={c.slug}>{en?c.nameEn:c.nameZh}</option>)}</select></label>
     <InstitutionalProfile country={country} election={latest}/>
     {admittedCountrySlugs.includes(id)?<Link className="underline" href={prefix+'/politics/'+id+'/'}>{en?'Election history':'选举历史'}</Link>:<p>{en?'Parliamentary results await admission.':'议会选举结果尚待准入。'}</p>}</article>;
   })}</div>
   <NotebookCollect create={()=>{
    const rows=compareInstitutions(ids,en)!.filter(row=>!group||row.group===group);
    const sources=new Map(rows.flatMap(row=>row.cells.flatMap(cell=>cell.sources.map(source=>[source.url,source] as const))));
    return {type:"country_comparison",title:(en?"Political institutions":"政治制度")+" · "+ids.join(" / "),url:new URL(location.pathname+location.search+location.hash,PLATFORM_BASE_URL).href,countries:ids,canonical_ids:rows.map(row=>row.field),periods:[],layer:"institutional_comparison",warnings:[en?"Live comparison of institutional records. Historical applicability depends on the legal version.":"此链接显示当前制度记录，历史适用性取决于当时的法律版本。"],sources:Array.from(sources.values(),s=>({institution:s.publisher,dataset:s.title,url:s.url,layer:"institutional_source"})),metadata:{filters:{dimension:group||"all"}}};
   }}/>
   <nav className="flex flex-wrap gap-4">{[['real_gdp_growth',en?'Compare real GDP growth':'比较实际 GDP 增长'],['hicp_inflation',en?'Compare inflation':'比较通胀']].map(([metric,label])=><Link key={metric} className="underline" href={prefix+'/data/?'+new URLSearchParams({compare_countries:ids.join(','),comparison_indicator:'annual:'+metric})}>{label}</Link>)}</nav></>}
 </section>;
}
