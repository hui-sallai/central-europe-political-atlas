"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {localizedRoute,type Locale} from "@/i18n/config";
import type {Bi,CoverageRow,EventMapping,FundingRecord,InvestmentRecord,Theme,indicatorCatalogue} from "@/lib/thematicResearch";
import {ThematicCase,type ThematicCaseData} from "./ThematicCase";
import {ThematicEvidence} from "./ThematicEvidence";

import {ThematicInvestments,type ProjectCitation} from "./ThematicInvestments";

type Props={
  citations:ProjectCitation[];
  theme:Theme;locale:Locale;cases:ThematicCaseData[];countries:{id:string;name:string}[];coverage:CoverageRow[];
  mappings:EventMapping[];catalogue:typeof indicatorCatalogue;limitations:Record<string,Bi>;
  investments:InvestmentRecord[];funding:(FundingRecord&{sourceUrl?:string;sourceTitle?:string;programmeTitle:string})[];
  applicability:{country:string;programmes:Record<string,string>}[];programmes:Record<string,string>;
  themeNav:{id:string;title:string}[];stages:Record<string,string>;
};
export function ThematicWorkspace({theme,locale,cases,countries,coverage,mappings,catalogue,limitations,investments,citations,funding,applicability,programmes,themeNav,stages}:Props) {
  const en=locale==="en", lang=en?"en":"zh", t=(a:string,b:string)=>en?a:b;
  const [selection,setSelection]=useState<string[]>([]),[caseId,setCaseId]=useState(""),[eventId,setEventId]=useState(""),[warning,setWarning]=useState(false);
  useEffect(()=>{
    function restore(){
      const params=new URLSearchParams(location.search), raw=params.get("countries")??params.get("country");
      const ids=raw?raw.split(","):[];
      const valid=ids.every(id=>countries.some(c=>c.id===id)) && new Set(ids).size===ids.length;
      setWarning(!valid); setSelection(valid?ids:[]);setCaseId(params.get("case")??"");setEventId(params.get("event")??"");
    }
    restore();window.addEventListener("popstate",restore);return ()=>window.removeEventListener("popstate",restore);
  },[countries]);
  const active=selection.length?selection:countries.map(c=>c.id);
  const name=(id:string)=>countries.find(c=>c.id===id)?.name??id;
  function change(ids:string[],nextCase:string,nextEvent=""){
    const url=new URL(location.href);
    for(const key of ["country","countries","case","case_window","case_series","event"])url.searchParams.delete(key);
    if(ids.length)url.searchParams.set(ids.length===1?"country":"countries",ids.join(","));
    if(nextCase)url.searchParams.set("case",nextCase);if(nextEvent)url.searchParams.set("event",nextEvent);
    history.pushState(null,"",url);setSelection(ids);setCaseId(nextCase);setEventId(nextEvent);setWarning(false);
  }
  const visibleCases=cases.filter(c=>[...c.record.countries,...c.record.context_countries].some(id=>active.includes(id)));
  const selectedCase=visibleCases.find(c=>c.record.case_id===caseId);
  const filteredFunding=funding.filter(f=>active.includes(f.country));
  const filteredProjects=investments.filter(i=>active.includes(i.country));
  return <main className="page-shell space-y-6" data-thematic-workspace={theme.theme_id}>
    <header className="max-w-4xl"><Link className="text-sm underline" href={localizedRoute("/workspaces/",locale)}>{t("Research Workspaces","研究工作区")}</Link>
    <h1 className="my-4 text-4xl font-semibold">{theme.title[lang]}</h1><p>{theme.description[lang]}</p>
    <details className="mt-3"><summary>{t("Research questions and limitations","研究问题与限制")}</summary><ul className="list-disc pl-5">{[...theme.research_questions,...theme.limitations,...theme.not_held].map(v=><li key={v.en}>{v[lang]}</li>)}</ul></details></header>
    <nav aria-label={t("Research themes","研究主题")} className="flex flex-wrap gap-3">{themeNav.filter(n=>n.id!==theme.theme_id).map(n=><Link className="text-sm underline" key={n.id} href={localizedRoute('/workspaces/'+n.id+'/',locale)+(selection.length?'?'+new URLSearchParams({countries:selection.join(',')}):'')}>{n.title}</Link>)}</nav>
    <fieldset className="editorial-panel p-4"><legend className="font-semibold">{t("Filter by country","按国家筛选")}</legend>
    <div className="flex flex-wrap gap-x-4 gap-y-2">{countries.map(c=><label key={c.id}><input type="checkbox" checked={selection.includes(c.id)} onChange={()=>change(selection.includes(c.id)?selection.filter(id=>id!==c.id):[...selection,c.id],"")}/> {c.name}</label>)}</div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
      <p aria-live="polite" data-thematic-scope-summary>{selection.length?selection.map(name).join(" · "):t("Showing all countries.","显示全部国家。")} · {t(`${visibleCases.length} ${visibleCases.length===1?"case":"cases"}`,`${visibleCases.length} 个案例`)}{investments.length>0?` · ${t(`${filteredProjects.length} project records`,`${filteredProjects.length} 条项目记录`)}`:""}{theme.theme_id==="eu_funding_development"?` · ${t(`${filteredFunding.length} financing records`,`${filteredFunding.length} 条融资记录`)}`:""}</p>
      {selection.length>0?<button type="button" data-clear-thematic-countries className="text-xs font-semibold underline" onClick={()=>change([],caseId,eventId)}>{t("Clear country filter","清除国家筛选")}</button>:null}
    </div></fieldset>
    {warning&&<p role="alert">{t("Unrecognised country selection. Showing all countries.","无法识别国家选择，现显示全部国家。")}</p>}
    <section><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-2xl font-semibold">{t("Research cases","研究案例")}</h2>{selectedCase?<button type="button" data-clear-thematic-case className="text-xs font-semibold underline" onClick={()=>change(selection,"",eventId)}>{t("Clear selected case","关闭当前案例")}</button>:null}</div>
    <div className="my-3 grid gap-3 sm:grid-cols-2">{visibleCases.map(c=><button className="card p-4 text-left" aria-pressed={caseId===c.record.case_id} key={c.record.case_id} onClick={()=>change(selection,c.record.case_id,eventId)}>
    <strong>{c.record.title[lang]}</strong><span className="mt-2 block text-sm">{c.record.research_question[lang]}</span></button>)}</div>
    {!visibleCases.length&&<p>{t("No published case for this selection.","所选范围暂无已发布案例。")}</p>}
    {selectedCase?<ThematicCase key={selectedCase.record.case_id} data={selectedCase} locale={locale}/>:caseId?<p role="status">{t("This case is unavailable for the selected theme and countries.","所选主题与国家下无此案例。")}</p>:null}</section>
    <details className="editorial-panel p-4"><summary className="font-semibold">{t("Compare evidence coverage by country","比较各国证据覆盖")}</summary>
    <ul className="mt-3 grid gap-3 sm:grid-cols-2">{coverage.filter(c=>active.includes(c.country)).map(c=><li key={c.country}><Link className="underline" href={localizedRoute('/countries/'+c.country+'/',locale)}>{name(c.country)}</Link> · {c.theme_applicable?
      t(`${c.data_admitted.admitted}/${c.data_admitted.defined} indicators with observations · ${c.investment_records} investment records · ${c.funding_records} financing records`,`${c.data_admitted.admitted}/${c.data_admitted.defined} 项指标有观测 · ${c.investment_records} 条投资记录 · ${c.funding_records} 条融资记录`):c.note?.[lang]}</li>)}</ul></details>
    {investments.length>0&&<ThematicInvestments locale={locale} themeId={theme.theme_id} records={filteredProjects} terms={stages} citations={citations} countryNames={Object.fromEntries(countries.map(c=>[c.id,c.name]))}/>}
    {theme.theme_id==="eu_funding_development"&&<section><h2 className="text-2xl font-semibold">{t("Programme financing by stage","按阶段查看项目资金")}</h2>
    <details className="my-3"><summary>{t("Programme applicability","计划适用范围")}</summary>{applicability.filter(a=>active.includes(a.country)).map(a=><p key={a.country}>{name(a.country)} · {Object.entries(a.programmes).map(([id,status])=>programmes[id]+" ("+(status==="not_applicable"?t("not applicable","不适用"):status.startsWith("admitted:")?t("records available","有记录"):t("no admitted record","无准入记录"))+")").join(" · ")}</p>)}</details>
    {filteredFunding.length===0&&<p>{t("No financing records for this selection.","所选范围无已收录的融资记录。")}</p>}
    {filteredFunding.map(f=><details key={f.record_id} className="my-2 border-b pb-2"><summary>{name(f.country)} · {f.status_date} · {f.programmeTitle} · {stages[f.stage]} · {f.amount===null?t("Amount not stated","金额未说明"):f.amount.toLocaleString(en?"en":"zh-CN")+" "+f.currency}</summary>
    <p>{f.note[lang]}</p><p>{f.funding_period==="not_stated"?t("Funding period not stated","资助期间未说明"):f.funding_period} · {f.category==="grants"?t("Grant","赠款"):f.category==="loans"?t("Loan","贷款"):f.category==="mixed"?t("Mixed instruments","混合工具"):t("Instrument not stated","工具未说明")}{f.amount_precision==="rounded_as_published"?t(" · rounded as published"," · 按公布精度取整"):""}</p>
    <p>{stages[f.evidence_status]}{f.price_basis==="nominal"?t(" · Nominal amount"," · 名义金额"):""}</p>
    {f.sourceUrl&&<a className="underline" href={f.sourceUrl}>{f.sourceTitle??t("Source","来源")}</a>}</details>)}</section>}
    <ThematicEvidence theme={theme} countries={active} locale={locale} catalogue={catalogue} mappings={mappings} limitations={limitations} eventId={eventId||undefined}/>
    <details className="text-sm"><summary>{t("Download the verified research tables (CSV)","下载已核实的研究表格（CSV）")}</summary>
    <p>{t("Complete tables for all themes and countries, from the source-data revision used here.","以下为本页使用的数据版本，含所有主题和国家。")}</p>
    <ul>{[["coverage_matrix",t("Country and theme coverage","国家与主题覆盖")],["event_indicator_mappings",t("Reviewed event relationships","已审阅的事件关联")],["eu_funding_records",t("Financing stages","资金阶段")],["evidence_windows",t("Descriptive observation windows","描述性观测窗口")]].map(([file,title])=><li key={file}><a className="underline" href={"https://raw.githubusercontent.com/hui-sallai/central-europe-political-atlas/e6e21af43e02dca08842b248fd98c823f7a6b760/docs/research-themes/"+file+".csv"}>{title}</a></li>)}</ul></details>
  </main>;
}
