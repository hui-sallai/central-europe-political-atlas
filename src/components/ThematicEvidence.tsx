"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { englishUnit } from "@/i18n/presentation";
import countryRegistry from "@/data/countries/countries.json";
import vocabulary from "@/lib/research-themes/meta.json";
import type { Bi, Coverage, EventMapping, MappingLayer, MappingRow, Theme } from "@/lib/thematicResearch";
import { PLATFORM_BASE_URL } from "@/lib/releaseMetadata";
import { NotebookCollect } from "./NotebookCollect";
import { workspaceToolLink } from "./workspaceLinks";
import { thematicIndicatorLabel, thematicSourceUrls } from "./thematicIndicatorLabel";

type CatalogueRow = Omit<MappingLayer, "coverage" | "observations_after_event" | "transformation"> & {
  indicator_id: string; registry_name: Bi | null; coverage: Record<string, Coverage>;
};
type Props = {
  theme: Theme; countries: string[]; locale: Locale; mappings: EventMapping[]; catalogue: CatalogueRow[];
  limitations: Record<string, Bi>; eventId?: string | null;
};
function countryName(slug: string, en: boolean) {
  const c = countryRegistry.records.find(item => item.slug === slug);
  return (en ? c?.name : c?.name_zh) ?? slug;
}
function explorerLink(locale: Locale, layer: Pick<MappingLayer,"explorer_key"|"frequency">, countries: string[], from?:string,to?:string) {
  return workspaceToolLink("/data/", locale, {
    compare_countries: countries.join(","), comparison_indicator: layer.explorer_key ?? undefined,
    compare_frequency: layer.frequency, comparison_mode: "side_by_side", compare_from:from, compare_to:to
  });
}
const readable = (value: Bi | undefined, en:boolean) => value?.[en?"en":"zh"];

function Indicators({theme,countries,locale,catalogue}: Pick<Props,"theme"|"countries"|"locale"|"catalogue">) {
  const en=locale==="en", lang=en?"en":"zh";
  const [selected,setSelected]=useState("");
  const refs=theme.indicators.filter(ref=>!ref.scope || ref.scope.some(country=>countries.includes(country)));
  const choices=Array.from(new Set(refs.map(ref=>ref.indicator_id)));
  const indicator=choices.includes(selected)?selected:choices[0];
  const label=(id:string)=>thematicIndicatorLabel(id,en,catalogue.find(row=>row.indicator_id===id)?.registry_name);
  return <section className="editorial-section mt-8" data-theme-indicators>
    <h2 className="text-2xl font-semibold">{en?"Historical indicators":"历史指标"}</h2>
    {choices.length>0 && <label className="mt-3 block text-sm">{en?"Indicator":"指标"} <select className="field-control" value={indicator} onChange={e=>setSelected(e.target.value)}>
      {choices.map(id=><option key={id} value={id}>{label(id)}</option>)}</select></label>}
    {refs.filter(ref=>ref.indicator_id===indicator).map(ref=><div key={ref.layers.join(",")} className="my-4 space-y-2">
      <p>{ref.role[lang]}</p>
      {catalogue.filter(row=>row.indicator_id===indicator && ref.layers.includes(row.layer)).map(row=>{
        const scope=countries.filter(c=>!ref.scope || ref.scope.includes(c));
        const applicable=scope.filter(c=>!ref.not_applicable_for?.includes(c));
        const covered=applicable.filter(c=>!!row.coverage[c]);
        const shared=row.coverage.common;
        const spans=shared ? [shared] : covered.flatMap(c=>row.coverage[c]??[]);
        const from=spans.map(s=>s.first).sort()[0], to=spans.map(s=>s.last).sort().at(-1);
        return <details key={row.layer} className="rounded border border-[var(--line)] p-3" open>
          <summary className="font-semibold">{vocabulary.layers[row.layer][lang]}</summary>
          {shared ? <p className="mt-2 text-sm">{en?"Shared external benchmark":"共同外部基准"} · {shared.first}–{shared.last} · {shared.count} {en?"periods":"期"}</p> :
          <ul className="my-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">{scope.map(c=>{
            const coverage=row.coverage[c];
            const regionEntries=!row.explorer_key?Object.entries(row.coverage).filter(([id,cov])=>id.startsWith(c+"_") && cov):[];
            return <li key={c}><strong>{countryName(c,en)}</strong> · {ref.not_applicable_for?.includes(c)?(en?"Not applicable":"不适用"):
              coverage?`${coverage.first}–${coverage.last} · ${coverage.count} ${en?"periods":"期"}`:regionEntries.length?`${regionEntries.length} ${en?"areas with observations":"个区域有观测"}`:(en?"No admitted observations":"暂无已收录观测")}</li>;
          })}</ul>}
          {row.explorer_key && (shared || covered.length>0) && <Link className="inline-block underline" data-theme-series={row.explorer_key}
            href={explorerLink(locale,row,applicable,from,to)}>{en?"Inspect observations in Data Explorer":"在数据浏览器查看观测"}</Link>}
          {row.layer==="regional_annual" && scope.filter(c=>Object.keys(row.coverage).some(id=>id.startsWith(c+"_"))).map(c=><Link key={c} className="mr-3 inline-block underline" href={workspaceToolLink("/map/",locale,{country:c,layer:indicator})}>{countryName(c,en)} · {en?"Regional map":"区域地图"}</Link>)}
          {row.dataset && <p className="mt-2 break-words text-xs text-[var(--muted)]">{en?"Dataset":"数据集"} · {row.dataset}{row.unit && row.layer!=="macro_driver_monthly" && <> · {en?englishUnit(row.unit):row.unit}</>}</p>}
          {thematicSourceUrls(row.source_url).map((url,i)=><a key={url} href={url} className="mr-2 text-xs underline">{en?"Catalogue source query":"目录来源查询"} {i+1}</a>)}
        </details>;
      })}
    </div>)}
  </section>;
}

function MappingEvidence({mapping,row,locale,limitations,name,themeId}:{
  mapping: EventMapping; row: MappingRow; locale: Locale; limitations: Record<string,Bi>; name:string;themeId:string;
}) {
  const en=locale==="en",lang=en?"en":"zh";
  const admitted=!row.pending && (["A","B","C"] as string[]).includes(row.relationship);
  const country=row.country && row.country!=="common"?row.country:mapping.country;
  const warnings=row.limitations.map(key=>readable(limitations[key],en)).filter((s):s is string=>Boolean(s));
  const url=workspaceToolLink("/news/",locale,{country:mapping.country,type:mapping.event_type,from:mapping.date,to:mapping.date})+"#"+mapping.event_id;
  return <div className="my-3 space-y-2 border-l-2 border-[var(--line)] pl-3 text-sm">
    <h4 className="font-semibold">{name} · {vocabulary.relationship_types[row.relationship].label[lang]}</h4>
    <p>{row.connection[lang]}</p>
    {admitted && row.layers.filter(l=>l.coverage).map(l=>{
      const cov=l.coverage!;
      return <div key={l.layer} className="space-y-1">
        <p>{vocabulary.layers[l.layer][lang]} · {cov.first}–{cov.last} · {cov.count} {en?"periods":"期"}</p>
        {l.explorer_key && <Link className="underline" data-event-series={l.explorer_key} href={explorerLink(locale,l,[country],cov.first,cov.last)}>{en?"Inspect series":"查看序列"}</Link>}
        {row.region_id && l.layer==="regional_annual" && <Link className="underline" href={workspaceToolLink("/map/",locale,{country,regions:row.region_id,layer:row.indicator_id,year:cov.last})}>{en?"Open recorded region":"查看记录中的区域"}</Link>}
      </div>;
    })}
    {row.pending && <p>{en?"Defined, no admitted observations.":"已定义，尚无已收录的观测。"}</p>}
    {warnings.length>0 && <ul className="list-disc pl-4">{warnings.map(w=><li key={w}>{w}</li>)}</ul>}
    <NotebookCollect label={en?"Save relationship":"保存关联记录"} create={()=>({
      type:"event",title:name+" · "+mapping.date+" · "+countryName(mapping.country,en),url:new URL(url,PLATFORM_BASE_URL).href,
      canonical_ids:[mapping.event_id,row.indicator_id],countries:[...new Set([mapping.country,country])],periods:[mapping.date],layer:"thematic_event_indicator_mapping",
      sources:[{institution:mapping.source_name,dataset:mapping.source_name,url:mapping.source_url,layer:"verified_event"},...row.layers.flatMap(l=>thematicSourceUrls(l.source_url).map(source=>({institution:l.dataset??name,dataset:l.dataset??name,url:source,layer:l.layer})))],
      comparability:"event_context_not_a_comparable_numeric_observation",warnings:[row.connection[lang],...warnings],
      metadata:{classification:row.relationship,status:mapping.evidence_status,evidence_categories:[themeId],entersModel:false}
    })}/>
  </div>;
}

export function ThematicEvidence({theme,countries,locale,mappings,catalogue,limitations,eventId}:Props) {
  const en=locale==="en", lang=en?"en":"zh";
  const [from,setFrom]=useState(""),[to,setTo]=useState(""),[type,setType]=useState(""),[limit,setLimit]=useState(8);
  const available=mappings.filter(m=>countries.includes(m.country) && m.theme_ids.includes(theme.theme_id));
  const filtered=available.filter(m=>(!type||m.event_type===type) && (!from||m.date>=from) && (!to||m.date<=to)).sort((a,b)=>b.date.localeCompare(a.date)||a.event_id.localeCompare(b.event_id));
  const pinned=filtered.find(m=>m.event_id===eventId);
  const visible=pinned?[pinned,...filtered.filter(m=>m!==pinned).slice(0,limit-1)]:filtered.slice(0,limit);
  const names:Record<string,Bi>={fiscal:{en:"Fiscal policy",zh:"财政"},EU_funds:{en:"EU funds",zh:"欧盟资金"},macro:{en:"Macroeconomy",zh:"宏观经济"},energy:{en:"Energy",zh:"能源"},industrial_policy:{en:"Industrial policy",zh:"产业政策"},FDI:{en:"Foreign direct investment",zh:"外商直接投资"},China:{en:"Relations with China",zh:"对华关系"},regional:{en:"Regional cooperation",zh:"区域合作"},election:{en:"Elections",zh:"选举"}};
  return <>
    <section className="editorial-section mt-8" data-theme-events>
      <h2 className="text-2xl font-semibold">{en?"Documented events":"有来源的事件"}</h2>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <label>{en?"From":"起始日期"} <input type="date" className="field-control" value={from} max={to||undefined} onChange={e=>{setFrom(e.target.value);setLimit(8);}}/></label>
        <label>{en?"To":"结束日期"} <input type="date" className="field-control" value={to} min={from||undefined} onChange={e=>{setTo(e.target.value);setLimit(8);}}/></label>
        <label>{en?"Event type":"事件类型"} <select className="field-control" value={type} onChange={e=>{setType(e.target.value);setLimit(8);}}><option value="">{en?"All types":"所有类型"}</option>{[...new Set(mappings.map(m=>m.event_type))].sort().map(t=><option key={t} value={t}>{readable(names[t],en)??t}</option>)}</select></label>
      </div>
      {from && to && from>to && <p role="alert">{en?"The end date precedes the start date.":"结束日期早于起始日期。"}</p>}
      {!visible.length && <p className="mt-3">{en?"No reviewed events match this selection.":"此选择没有匹配的已审阅事件。"}</p>}
      {visible.map(m=><details key={m.event_id} id={m.event_id} open={m===pinned || undefined} className="mt-3 rounded border border-[var(--line)] p-3" data-theme-event={m.event_id}>
        <summary><strong>{m.date} · {countryName(m.country,en)}</strong> · {m.summary[lang]}</summary>
        <p className="my-2 text-sm">{vocabulary.relationship_types[m.classification].label[lang]} · {readable((vocabulary.evidence_status as Record<string,Bi>)[m.evidence_status],en)??m.evidence_status}</p>
        {m.reason_code && <p>{readable((vocabulary.reason_codes as Record<string,Bi>)[m.reason_code],en)}</p>}
        <div className="flex flex-wrap gap-3 text-sm"><a className="underline" href={m.source_url}>{m.source_name}</a><Link className="underline" href={workspaceToolLink("/news/",locale,{country:m.country,type:m.event_type,from:m.date,to:m.date})+"#"+m.event_id}>{en?"Original event record":"事件原始记录"}</Link></div>
        {m.indicators.map(row=><MappingEvidence key={row.indicator_id+row.geo} mapping={m} row={row} locale={locale} limitations={limitations} themeId={theme.theme_id} name={thematicIndicatorLabel(row.indicator_id,en,catalogue.find(c=>c.indicator_id===row.indicator_id)?.registry_name)}/>)}
      </details>)}
      {visible.length<filtered.length && <button type="button" className="mt-3 underline" onClick={()=>setLimit(n=>n+8)}>{en?"Show more events":"显示更多事件"} ({visible.length}/{filtered.length})</button>}
    </section>
    <Indicators theme={theme} countries={countries} locale={locale} catalogue={catalogue}/>
  </>;
}
