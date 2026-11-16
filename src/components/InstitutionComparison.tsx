"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useLocale} from "@/i18n/LocaleProvider";
import {countries,type Country} from "@/lib/data";
import {chambers,constitutionalRules,institutionalSources} from "@/lib/institutionProfiles";
import {admittedCountrySlugs} from "@/lib/politicalAdmission";
import type {PoliticalCountryView} from "@/lib/politicalExplorer";

const queryKey='institution_countries';
const systemNames:Record<string,string>={'议会共和制':'Parliamentary republic','半总统制共和制':'Semi-presidential republic','联邦议会共和制':'Federal parliamentary republic'};
export function InstitutionalProfile({country,election}:{country:Country;election?:PoliticalCountryView['elections'][number]}) {
 const en=useLocale()==='en',i=en?0:1,slug=country.slug,prefix=en?'/en':'';
 const rule=constitutionalRules[slug],sources=institutionalSources(slug);
 const office=['austria','germany'].includes(slug)?(en?'Federal Chancellor':'联邦总理'):(en?'Prime Minister':'总理');
 const facts=[
  [en?'Government system':'政府制度',en?systemNames[country.polityZh]:country.polityZh],
  [en?'Legislature':'立法机关',chambers[slug]?.[i]],
  [en?'Head of state · head of government':'国家元首 · 政府首脑',(en?'President':'总统')+' · '+office],
  [en?'Selection of head of state':'元首产生方式',rule?.selection[i]],
  [en?'Legislative term':'议会任期',rule?.term[i]]
 ];
 return <div className="min-w-0 space-y-3 text-sm" data-institution-profile={slug}>
   <dl>{facts.filter(([,v])=>v).map(([label,value])=><div className="border-b border-[var(--line)] py-2" key={label}><dt className="text-xs text-[var(--muted)]">{label}</dt><dd>{value}</dd></div>)}</dl>
   {rule ? <details><summary>{en?'Government formation and confidence':'政府形成与议会信任'}</summary>
    <ol className="my-2 flex flex-wrap items-center gap-2">{rule.formation[i].split(' → ').map((step,n)=><li key={step} className="rounded border border-[var(--line)] px-2 py-1">{n+1}. {step}</li>)}</ol><p>{rule.confidence[i]}</p></details> :
    <p>{en?'Selection, term and confidence rules await article-level verification.':'元首产生方式、任期和信任程序尚待法条核实。'}</p>}
   {election && <details><summary>{en?'Electoral rules and seats':'选举规则与席位'} · {election.date}</summary>
    <p>{election.chamber} · {election.totalSeats??'—'} {en?'seats':'席'} · {election.system.allocationMethod.replaceAll('_',' ')}</p>
    <Link className="underline" href={prefix+'/politics/'+slug+'/?election='+encodeURIComponent(election.electionId)}>{en?'Results, ballot definitions and election sources':'结果、选票定义与当届来源'}</Link></details>}
   <details><summary>{en?'Institutional sources and scope':'制度来源与适用范围'}</summary>
    <p>{en?'Institutional overview checked 16 November 2026. Historical applicability requires the version in force at the time.':'制度概览核查日期为2026年11月16日。历史分析须查阅当时有效文本。'}</p>
    {sources.map((url,n)=><a key={url} className="block underline" href={url}>{slug==='serbia'?'Narodna skupština':n===0?(en?'European Union country profile':'欧盟国别资料'):(en?'European Parliament chamber directory':'欧洲议会各国议院名录')}</a>)}
    {rule&&<a className="block underline" href={rule.source}>{rule.basis}</a>}
   </details>
 </div>;
}

export function InstitutionComparison({political}:{political:PoliticalCountryView[]}) {
 const en=useLocale()==='en',prefix=en?'/en':'';
 const [ids,setIds]=useState<string[]>([]),[invalid,setInvalid]=useState(false);
 useEffect(()=>{
  function restore(){
   const raw=new URLSearchParams(location.search).get(queryKey);
   const list=raw?raw.split(','):[];
   const valid=list.length<=4 && new Set(list).size===list.length && list.every(id=>countries.some(c=>c.slug===id));
   setIds(valid?list:[]);setInvalid(!valid);
  }
  restore();window.addEventListener('popstate',restore);return ()=>window.removeEventListener('popstate',restore);
 },[]);
 function toggle(slug:string){
  const next=ids.includes(slug)?ids.filter(id=>id!==slug):[...ids,slug];
  if(next.length>4)return;
  setIds(next);setInvalid(false);
  const url=new URL(location.href);if(next.length)url.searchParams.set(queryKey,next.join(','));else url.searchParams.delete(queryKey);
  url.hash='institutions';history.replaceState(null,'',url);
 }
 return <section id="institutions" className="editorial-panel mt-6 p-4 sm:p-6">
  <h2 className="text-2xl font-semibold">{en?'Compare political institutions':'比较政治制度'}</h2>
  <fieldset className="mt-3 flex flex-wrap gap-x-4 gap-y-2"><legend>{en?'Choose two to four countries':'选择两至四个国家'} · {ids.length}/4</legend>
  {countries.map(c=><label key={c.slug}><input type="checkbox" checked={ids.includes(c.slug)} disabled={ids.length===4&&!ids.includes(c.slug)} onChange={()=>toggle(c.slug)}/> {en?c.nameEn:c.nameZh}</label>)}</fieldset>
  {invalid&&<p role="alert">{en?'Invalid country selection. Choose countries again.':'链接中的国家组合无效，请重新选择。'}</p>}
  {ids.length<2?<p className="mt-3">{en?'Select another country to compare legislatures and executive offices.':'请选择国家以比较立法与行政机构。'}</p>:
   <><div className="my-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{ids.map(id=>{
    const country=countries.find(c=>c.slug===id)!;
    const latest=political.find(c=>c.slug===id)?.elections.toSorted((a,b)=>b.date.localeCompare(a.date))[0];
    return <article key={id}><h3 className="mb-2 text-lg font-semibold"><Link className="underline" href={prefix+'/countries/'+id+'/#institutions'}>{en?country.nameEn:country.nameZh}</Link></h3>
     <InstitutionalProfile country={country} election={latest}/>
     {admittedCountrySlugs.includes(id)?<Link className="underline" href={prefix+'/politics/'+id+'/'}>{en?'Election history':'选举历史'}</Link>:<p>{en?'Parliamentary results await admission.':'议会选举结果尚待准入。'}</p>}</article>;
   })}</div>
   <nav className="flex flex-wrap gap-4">{[['real_gdp_growth',en?'Compare real GDP growth':'比较实际 GDP 增长'],['hicp_inflation',en?'Compare inflation':'比较通胀']].map(([metric,label])=><Link key={metric} className="underline" href={prefix+'/data/?'+new URLSearchParams({compare_countries:ids.join(','),comparison_indicator:'annual:'+metric})}>{label}</Link>)}</nav></>}
 </section>;
}
