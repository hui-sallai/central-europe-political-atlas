"use client";

import { useState, useSyncExternalStore } from "react";
import { localeNumber, type Locale } from "@/i18n/config";
import type { HistoryObservation } from "@/lib/electionHistoryObservations";
import type { EvidenceDraft } from "@/lib/researchNotebook";
import { toCsv } from "@/lib/researchSnapshot";
import { NotebookCollect } from "./NotebookCollect";

const selectionField = "history_events";
const queryChanged = "election-history-events";
const query = () => location.search;
const serverQuery = () => "";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(queryChanged, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(queryChanged, callback);
  };
}

function exportRows(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const url = URL.createObjectURL(new Blob(["\uFEFF", toCsv(Object.keys(rows[0]), rows)], {type:"text/csv;charset=utf-8"}));
  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".csv";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const segmentColours = ["#475569", "#0f766e", "#9c5a26", "#665578", "#637545", "#896267"];
// Colours have meaning only within the labelled bar for a single election.
function SeatBar({row, locale}: {row: HistoryObservation; locale: Locale}) {
  const en = locale === "en";
  const total = row.seats;
  const [expanded,setExpanded] = useState(false);
  const composition = row.attribution ?? row.segments;
  const sum = composition.reduce((n, part) => n + part.seats, 0);
  return <details className="min-w-0 border-t border-[var(--line)] py-2" data-history-composition={row.id} onToggle={e=>setExpanded(e.currentTarget.open)}>
    <summary className="cursor-pointer text-sm">
      {row.date} · {row.chamber} · {localeNumber(total,locale)} {en ? "seat slots" : "席"}
      {total !== null && total > 0 && sum <= total && <span className="mt-1 flex h-3 overflow-hidden rounded-sm bg-[var(--line)]" aria-hidden="true">
        {composition.map((part,i) => <span key={i} style={{width: 100 * part.seats / total + "%", backgroundColor:segmentColours[i % segmentColours.length]}}/>)}
      </span>}
    </summary>
    {expanded && <>
      {row.attribution && <p className="mt-2 text-xs font-semibold">{en ? "Whole-chamber seats by election-specific contestant" : "全院席位按当届参选方分列"}</p>}
      <ul className="mt-2 space-y-1 text-xs">{composition.map((part,i) => <li key={i} className="break-words" data-seat-contestant={row.attribution?.[i].contestantId??undefined}>
        <span className="mr-2 inline-block h-2 w-2" style={{backgroundColor:segmentColours[i % segmentColours.length]}} aria-hidden="true"/>
        {part.label} · {localeNumber(part.seats, locale)}
      </li>)}</ul>
      {row.attribution && <p className="mt-2 text-xs">{en?"Same chamber by allocation mechanism":"同一议院按席位分配机制分列"} · {row.segments.map(p=>p.label+" "+p.seats).join(" · ")}</p>}
    </>}
    {total !== null && sum < total && <p className="text-xs">{en ? "Outside the recorded breakdown" : "来源分项未涵盖的席位"} · {total-sum}</p>}
  </details>;
}

export function ElectionHistoryFigures({rows, selected, locale, select}: {
  rows: HistoryObservation[]; selected: string; locale: Locale; select: (id: string) => void;
}) {
  const en = locale === "en";
  const t = (english:string,chinese:string) => en ? english : chinese;
  const params = new URLSearchParams(useSyncExternalStore(subscribe,query,serverQuery));
  const filter = params.get(selectionField)?.split(",");
  const active = rows.filter(row => !filter || filter.includes(row.id));
  const first = rows[0], last = rows.at(-1);
  if (!first || !last) return null;
  const from = Date.parse(first.date), to = Date.parse(last.date);
  const x = (date:string) => to === from ? 238 : 43 + (Date.parse(date) - from) / (to - from) * 385;
  const y = (turnout:number) => 126 - 1.08 * turnout;
  const formatRate = (n:number) => localeNumber(n,locale,{maximumFractionDigits:2})+"%";
  function toggle(id:string) {
    const ids = rows.filter(r=>r.id===id ? !active.includes(r) : active.includes(r)).map(r=>r.id);
    const url = new URL(location.href);
    if (ids.length === rows.length) url.searchParams.delete(selectionField);
    else url.searchParams.set(selectionField, ids.join(","));
    history.pushState(null,"",url);
    window.dispatchEvent(new Event(queryChanged));
  }
  function historyUrl(kind:"turnout"|"seats") {
    const url = new URL(location.pathname+location.search, "https://hy-central-europe-analysis.org");
    url.searchParams.set("election", selected);
    url.searchParams.set("history_detail",kind);
    url.hash = "election-history-observations";
    return url.href;
  }
  function exportHistory(kind:"turnout"|"seats") {
    const records = active.flatMap((r):Record<string,unknown>[]=>{
      const sources = kind === "turnout" ? r.turnoutSources : r.sources;
      const base = {country:r.country,election_id:r.id,date:r.date,chamber:r.chamber,chamber_id:r.chamberId,date_basis:r.dateBasis??null,
        source_ids:sources.map(s=>s.id).join(" | "),source_urls:sources.map(s=>s.url).join(" | "),research_url:historyUrl(kind)};
      if (kind === "turnout") return [{...base,scope:r.scope,ballot:r.ballot,vote_type:r.voteType,turnout_percent:r.turnout,
        value_basis:r.turnout===null?"unavailable":r.published?"published":"computed_from_counts",
        numerator:r.numerator,denominator:r.denominator,definition:r.definition}];
      // These are alternative partitions of the same chamber. Each breakdown reconciles independently.
      const mechanisms = (r.segments.length?r.segments:[{label:null,seats:null}]).map(part=>({...base,
        chamber_seat_slots:r.seats, breakdown:r.attribution?"allocation_mechanism":"recorded_composition",
        contestant_id:null, vote_type:null, segment:part.label, seats:part.seats}));
      const contestants = (r.attribution??[]).map(part=>{
        const evidence = r.sources.find(s=>s.id===part.sourceId);
        return {...base, source_ids:evidence?.id??base.source_ids,source_urls:evidence?.url??base.source_urls,
          chamber_seat_slots:r.seats, breakdown:"whole_chamber_attribution", contestant_id:part.contestantId,
          vote_type:part.voteType, segment:part.label, seats:part.seats};
      });
      return [...mechanisms,...contestants];
    });
    exportRows(first.country+"-election-"+kind,records);
  }
  function draft(kind:"turnout"|"seats"): EvidenceDraft {
    const sources = [...new Map(active.flatMap(r=>kind==="turnout"?r.turnoutSources:r.sources).map(s=>[s.id,s])).values()];
    const name = kind==="turnout" ? t("Election turnout history","选举投票率历史") : t("Historical chamber composition","历届议院席位构成");
    return {type:"series_view",title:first.chamber+" · "+name,url:historyUrl(kind),layer:"election_history_"+kind,
      canonical_ids:[...new Set(active.flatMap(r=>[r.id,...(r.chamberId?[r.chamberId]:[])]))],countries:[first.country],periods:active.map(r=>r.date),
      sources:sources.map(s=>({institution:s.institution??s.title,dataset:s.title,code:s.id,url:s.url,layer:"election_document",retrieved_at:s.retrievedAt})),
      warnings:[t("Each observation describes its recorded election, chamber and electorate.","各项观测对应收录的该届选举、议院和选民范围。")],
      metadata:{filters:{measure:kind,chamber:first.chamber,elections:active.map(r=>r.id).join(",")},row_count:active.length,entersModel:false}};
  }
  return <section className="min-w-0 space-y-3" id="election-history-observations" data-history-observations>
    <figure data-politics-chart="turnout">
      <figcaption className="font-semibold">{t("Turnout by election date","按选举日期查看投票率")} · {first.chamber}</figcaption>
      <p className="mt-1 text-xs text-[var(--muted)]">{first.scope} · {t("Each point shows one election. Dates are spaced by elapsed time.","每个点代表一届选举，横轴按实际时间间隔排列。")}</p>
      <svg viewBox="0 0 456 155" role="img" aria-label={t("Election turnout (%) by polling date","以投票日期为横轴的投票率（%）")} className="mt-2 w-full max-w-2xl text-[var(--muted)]">
        {[0,50,100].map(v=><g key={v}><line x1={43} x2={428} y1={y(v)} y2={y(v)} stroke="var(--line)"/><text x={37} y={y(v)+4} textAnchor="end" fontSize={12} fill="currentColor">{v}%</text></g>)}
        <text x={from===to?238:43} y={148} textAnchor={from===to?"middle":"start"} fontSize={12} fill="currentColor">{first.date}</text>
        {to!==from&&<text x={428} y={148} textAnchor="end" fontSize={12} fill="currentColor">{last.date}</text>}
        {active.filter(r=>r.turnout!==null).map(r=><circle key={r.id} data-turnout-point={r.id} cx={x(r.date)} cy={y(r.turnout!)} r={r.id===selected?6:4.5} stroke="var(--accent)" strokeWidth={2} fill={r.id===selected?"var(--accent)":"var(--panel)"}>
          <title>{r.date+" · "+r.scope+" · "+formatRate(r.turnout!)}</title></circle>)}
      </svg>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">{active.map(r=><li key={r.id} data-turnout-year={r.date.slice(0,4)}>
        <button type="button" aria-pressed={r.id===selected} className="underline" onClick={()=>select(r.id)}>{r.date.slice(0,4)}</button>
        {" · "}{r.turnout===null?"—":formatRate(r.turnout)}
      </li>)}</ul>
    </figure>
    <details className="border-t border-[var(--line)] pt-2" open={params.has("history_detail") || undefined} data-history-details>
      <summary className="cursor-pointer font-semibold">{t("Compare historical seat compositions, inspect turnout and export","比较历届席位构成、查看投票率依据与导出")}</summary>
      <fieldset className="my-3 flex flex-wrap gap-3 text-sm"><legend>{t("Elections to include","纳入的选举")}</legend>
        {rows.map(r=><label key={r.id}><input type="checkbox" checked={active.includes(r)} onChange={()=>toggle(r.id)}/> {r.date}</label>)}
      </fieldset>
      {!active.length && <p role="status">{t("Select an election to display its history.","选择至少一届选举以查看记录。")}</p>}
      {active.map(r=><SeatBar key={r.id} row={r} locale={locale}/>)}
      <div className="mt-3 overflow-x-auto" role="region" tabIndex={0} aria-label={t("Election turnout sources and counts","历届投票率来源与计数")}>
        <table className="w-full min-w-[540px] text-left text-xs"><caption>{t("Turnout observations and source definitions","投票率观测与来源定义")}</caption>
          <thead><tr>{[t("Election date","选举日期"),t("Turnout (%)","投票率（%）"),t("Numerator / denominator","分子／分母"),t("Definition and source","定义与来源")].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{active.map(r=><tr key={r.id} className="border-t border-[var(--line)] align-top"><th scope="row" className="py-2">{r.date}{r.dateBasis?.includes("background_to_verify")&&<small className="block">{t("Registry date awaiting confirmation","登记日期待核实")}</small>}</th>
            <td>{r.turnout===null?t("No verified rate","尚无核实值"):formatRate(r.turnout)+" · "+(r.published?t("Published","公布值"):t("Computed from counts","根据人数计算"))}</td>
            <td>{localeNumber(r.numerator,locale)} / {localeNumber(r.denominator,locale)}</td>
            <td className="max-w-64 break-words">{r.definition&&<details><summary>{t("Source definition","来源定义")}</summary><span lang="en">{r.definition}</span></details>}
              {r.turnoutSources.map(s=><a className="block underline" key={s.id} href={s.url}>{s.title}</a>)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">{(["turnout","seats"] as const).map(kind=><div className="flex flex-wrap items-center gap-2" key={kind}>
        <button type="button" className="underline" disabled={!active.length} onClick={()=>exportHistory(kind)}>{kind==="turnout"?t("Turnout CSV","投票率 CSV"):t("Seat composition CSV","席位构成 CSV")}</button>
        <NotebookCollect disabled={!active.length} label={kind==="turnout"?t("Save turnout history","保存投票率历史"):t("Save seat compositions","保存席位构成")} create={()=>draft(kind)}/>
      </div>)}</div>
    </details>
  </section>;
}
