"use client";
import { useEffect, useState } from "react";
import { toCsv } from "@/lib/researchSnapshot";
import { ResearchTimeSeriesChart } from "./ResearchTimeSeriesChart";

type Row = {
  id: string; country_slug: string; indicator: string; year: number; value: number; unit: string;
  value_status: string; source_flag: string | null; source_dataset: string; source_query_url: string;
  vintage: string; dataset_updated_at: string; definition: string;
  admitted_same_year: { value: number; difference_reference_minus_admitted: number } | null;
};
type Reference = {
  records: Row[];
  series: {country: string; indicator: string; break_flags: unknown[]; definition_compatible_floor: number | null}[];
  all_country_common_years: Record<string,{countries: string[]; contiguous: boolean}>;
};
const url = (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/research-data/annual_single_vintage_reference.json";
const columns = ["id","country_slug","indicator","year","value","unit","value_status","source_flag","source_dataset","source_query_url","retrieved_at","dataset_updated_at","admitted_same_year.value","admitted_same_year.difference_reference_minus_admitted"];

export function AnnualReferenceDetails({indicator, countries, from, to, en}: {
  indicator: string; countries: {slug: string; label: string}[]; from: string; to: string; en: boolean;
}) {
  const [open,setOpen] = useState(false);
  const [data,setData] = useState<Reference | null>(null);
  const [error,setError] = useState(false);
  useEffect(() => {
    if (!open || data) return;
    const controller = new AbortController();
    fetch(url,{signal:controller.signal}).then(async response => {
      if (!response.ok) throw Error("reference");
      const result = await response.json();
      if (result.schema_version !== "annual-single-vintage-reference-v1" || !Array.isArray(result.records) || !result.all_country_common_years || !Array.isArray(result.series)) throw Error("reference schema");
      if (!controller.signal.aborted) setData(result);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  },[open,data]);
  const records = data?.records.filter(r=>r.indicator===indicator) ?? [];
  const rows = records.filter(r=>countries.some(c=>c.slug===r.country_slug) && (!from || String(r.year)>=from) && (!to || String(r.year)<=to));
  const scope = data?.all_country_common_years[indicator];
  const years = scope ? [...new Set(records.map(r=>r.year))].sort((a,b)=>a-b).filter(y=>scope.countries.every(c=>records.some(r=>r.country_slug===c && r.year===y))) : [];
  function download() {
    const csv = toCsv(columns,rows.map(r=>({...r,retrieved_at:r.vintage,"admitted_same_year.value":r.admitted_same_year?.value,"admitted_same_year.difference_reference_minus_admitted":r.admitted_same_year?.difference_reference_minus_admitted})));
    const objectUrl=URL.createObjectURL(new Blob(['\uFEFF',csv,'"Source: Eurostat; descriptive reference, not a model input"\r\n'],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a"); link.href=objectUrl; link.download=indicator+"-eurostat-reference.csv"; link.click(); setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
  }
  return <details data-annual-reference className="mt-4" onToggle={e=>{setOpen(e.currentTarget.open);setError(false);}}>
    <summary className="cursor-pointer font-semibold">{en?"Separate Eurostat reference series":"欧盟统计局独立参考序列"}</summary>
    {open && (error ? <p role="alert">{en?"Reference download failed. Close and reopen to retry.":"参考文件读取失败，可收起后重新打开。"}</p> : !data ? <p role="status">{en?"Loading reference…":"正在读取参考资料…"}</p> : <>
      <p className="my-2 text-sm">{en?"Latest-revised observations at the recorded retrieval date. Earlier publication vintages cannot be reconstructed. The reference is separate from the main series and model inputs.":"本表显示获取日期当时的修订值，无法还原历史发布日期当时的数值。该参考序列独立于主序列及模型输入。"}</p>
      {scope && <p className="text-sm">{en?"Common reference years":"参考层共同年份"} ({scope.countries.length}): {scope.contiguous ? [years[0],years.at(-1)].join("–") : years.join(", ")} {!scope.contiguous && (en?"(non-contiguous)":"（不连续）")}</p>}
      {countries.map(({slug,label})=>{
        const rr=rows.filter(r=>r.country_slug===slug).sort((a,b)=>a.year-b.year);
        const series=data.series.find(s=>s.country===slug && s.indicator===indicator);
        if (!rr.length) return <p key={slug}>{label} · {en?"No reference observations in this selection":"当前选择范围内无参考观测"}</p>;
        return <section key={slug} className="mt-3"><h3>{label} · {rr[0].source_dataset}</h3>
          <p className="text-sm">{en?"Retrieved":"获取日期"} {rr[0].vintage.slice(0,10)} · {en?"Table updated":"数据表更新"} {rr[0].dataset_updated_at.slice(0,10)} · {rr[0].definition}</p>
          {!!series?.break_flags.length && <p>{en?"Definition-compatible floor after recorded breaks":"登记断点后的定义可比起始年"}: {series.definition_compatible_floor}</p>}
          <ResearchTimeSeriesChart interactive periodControls={false} detailTable={false} title={label+" · "+rr[0].source_dataset} xKind="number" xLabel={en?"Year":"年份"} yLabel={rr[0].unit} series={[{id:slug,label,color:"#246a87",markers:true,points:rr.map((r,i)=>({x:r.year,y:r.value,unit:r.unit,status:[r.value_status,r.source_flag].filter(Boolean).join(" · "),source:r.source_dataset,sourceUrl:r.source_query_url,breakBefore:i>0 && (r.year!==rr[i-1].year+1 || !!r.source_flag?.includes("b"))}))}]}/>
          <details><summary>{en?"Reference observations and revisions":"参考观测与修订"}</summary>
          <p>{en?"Differences show revisions since the admitted figure for the same table. p = provisional; b = statistical break.":"差额为同一数据表相对已准入数值的修订。p 为暂定值，b 为统计断点。"}</p>
          <div className="data-table-viewport" tabIndex={0}><table className="research-data-table"><thead><tr>{(en?["Year","Value","Unit","Status / flag","Admitted value","Revision","Source"]:["年份","数值","单位","状态／标记","已准入数值","修订差额","来源"]).map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{rr.map(r=><tr key={r.id}><td>{r.year}</td><td>{r.value}</td><td>{r.unit}</td><td>{r.value_status} {r.source_flag}</td><td>{r.admitted_same_year?.value??"—"}</td><td>{r.admitted_same_year?.difference_reference_minus_admitted??"—"}</td><td><a className="underline" href={r.source_query_url}>{r.source_dataset}</a></td></tr>)}</tbody></table></div></details>
        </section>;
      })}
      <button type="button" className="research-tab mt-2" disabled={!rows.length} onClick={download}>{en?"Download reference observations (CSV)":"下载参考观测（CSV）"}</button>
    </>)}
  </details>;
}
