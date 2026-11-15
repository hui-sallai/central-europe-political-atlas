import Link from "next/link";
import {politicalComparisonCountries, politicalElectionViews} from "@/lib/politicalData";
import {turnoutForDisplay} from "@/lib/politicalExplorer";
import type {Locale} from "@/i18n/config";

export function CountryElectionHistory({slug, locale}:{slug:string;locale:Locale}) {
  const en = locale==="en";
  const elections = slug==="germany" ? politicalElectionViews() : politicalComparisonCountries().find(row=>row.slug===slug)?.elections ?? [];
  const sorted = elections.toSorted((a,b)=>b.date.localeCompare(a.date));
  const latest = sorted[0];
  if (!latest) return <p>{en?"National parliamentary results are awaiting source admission.":"全国议会选举结果尚待来源准入。"}</p>;
  const turnout = turnoutForDisplay(latest);
  const route = (en?"/en":"")+"/politics/"+slug+"/";
  return <div className="space-y-3">
    <p>{en?"Latest admitted election":"最近已准入选举"} · <time>{latest.date}</time></p>
    <dl className="grid grid-cols-2 gap-3">
      <div><dt>{en?"Turnout":"投票率"}</dt><dd>{turnout.value===null?"—":turnout.value.toLocaleString(locale,{maximumFractionDigits:2})+"%"} {turnout.value!==null && (turnout.computed?(en?"(from official counts)":"（按官方人数计算）"):(en?"(published)":"（来源公布）"))}</dd></div>
      <div><dt>{en?"Full chamber":"全议院席数"}</dt><dd>{latest.totalSeats??"—"}</dd></div>
    </dl>
    <Link className="underline" href={route}>{en?"Open election research":"打开选举研究"}</Link>
    {latest.national?.rules.totalSeatsDefinition && <p>{latest.national.rules.totalSeatsDefinition[locale]}</p>}
    <details><summary>{en?"Election dates and original sources":"历届选举日期与原始来源"}</summary>
      <ul className="flex flex-wrap gap-3 py-3">{sorted.map(e=><li key={e.electionId}><Link className="underline" href={route+"?"+new URLSearchParams({election:e.electionId})}>{e.date}</Link></li>)}</ul>
      {latest.sources.map(s=><a key={s.id} className="block break-words underline" href={s.url}>{s.title}</a>)}
    </details>
  </div>;
}
