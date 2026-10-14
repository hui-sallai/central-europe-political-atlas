"use client";
import { localeDate, localeNumber, localizedRoute, type Locale } from "@/i18n/config";
import type { PoliticalElectionView } from "@/lib/politicalExplorer";
import { compareVerifiedSeries, verifiedComparisonCsv } from "@/lib/politicalSeriesComparison";
import { OFFICIAL_SERIES_SOURCE } from "@/lib/politicalSeries";
import { NotebookCollect } from "./NotebookCollect";
import type { EvidenceDraft } from "@/lib/researchNotebook";

export function PoliticalVerifiedComparison({ a, b, locale, onHistory }: { a: PoliticalElectionView; b: PoliticalElectionView; locale: Locale; onHistory: (id: string) => void }) {
  const en = locale === "en", rows = compareVerifiedSeries(a,b);
  const n = (v: number | null | undefined, digits = 0) => localeNumber(v ?? null,locale,{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const delta = (v: number | null, digits = 0) => v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${n(Math.abs(v),digits)}`;
  const warning = en ? "Statistical attribution in the authority's series, not proof of legal continuity. Gaps are not zero. Seat changes reflect electoral rules as well as election results, not automatically voter support." : "这是官方序列的统计归属，不是法律主体连续性的证明。缺失不等于零。席位变化同时涉及选举规则与结果，不能直接视为选民支持变化。";
  function draft(): EvidenceDraft {
    const url = new URL(localizedRoute("/politics/",locale),"https://hy-central-europe-analysis.org");
    url.searchParams.set("election",a.electionId); url.searchParams.set("compare",b.electionId); url.searchParams.set("comparison_mode","verified");
    const sources = [...a.sources,...b.sources].filter((s,i,all)=>all.findIndex(x=>x.id===s.id)===i);
    return { type:"series_view",title:`Germany ${a.year}–${b.year} verified comparison`,labels:{en:`Germany ${a.year}–${b.year} verified comparison`,"zh-CN":`德国 ${a.year}—${b.year} 已核实序列比较`},url:url.href,canonical_ids:[a.electionId,b.electionId,...rows.map(r=>r.series.id)],countries:["germany"],periods:[a.date,b.date],layer:"national_election_second_votes",sources:[...sources.map(s=>({institution:"Die Bundeswahlleiterin, Wiesbaden",dataset:s.title,url:s.url,code:s.id,layer:"tier1_official"})),{institution:"Die Bundeswahlleiterin, Wiesbaden",dataset:"Official longitudinal results",url:OFFICIAL_SERIES_SOURCE.url,code:OFFICIAL_SERIES_SOURCE.source_id,layer:"tier1_official"}],warnings:[warning],warning_labels:{[locale]:[warning]},comparability:"verified_official_series_not_legal_continuity",metadata:{filters:{election:a.electionId,compare:b.electionId,comparison_mode:"verified"},row_count:rows.length,reference:`B − A; ${a.resultVintage}; ${b.resultVintage}; ${OFFICIAL_SERIES_SOURCE.sha256}`} };
  }
  function download() {
    const url=URL.createObjectURL(new Blob([verifiedComparisonCsv(a,b,OFFICIAL_SERIES_SOURCE.url,OFFICIAL_SERIES_SOURCE.sha256)],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;link.download=`germany-verified-comparison-${a.year}-${b.year}.csv`;link.click();URL.revokeObjectURL(url);
  }
  return <div className="mt-4 space-y-4" data-verified-comparison>
    <p className="text-sm">{en ? "Verified official series use existing registry links, never similar names. All changes below are B − A; published shares and their differences use one decimal place. A series absent in an election has no comparable value. Single-election records without valid series links remain in the ballot-label view." : "已核实官方序列仅使用现有登记关联，不按相似名称匹配。下方差值均为 B − A；官方得票率及其差值保留一位小数。序列在某届缺失时没有可比值。没有有效序列关联的当届记录仍保留在选票名称视图中。"}</p>
    <div className="grid gap-3 sm:grid-cols-2">{[a,b].map((e,i)=><div key={e.electionId} className="rounded border border-[var(--line)] p-3 text-sm" data-comparison-election={i===0?"a":"b"}>
      <h4 className="font-semibold">{i===0?"A":"B"}: {localeDate(e.date,locale)}</h4><p>{e.notes[locale]}</p>
      <p>{en?"Seat allocation":"席位分配"}: {e.system.allocationMethod} · {en?"Base seats":"基础席位"}: {n(e.system.baseSeats)} · {en?"Total seats":"总席位"}: {n(e.totalSeats)}</p>
      <p>{en?"Result vintage":"结果版本"}: {e.year===2021?(en?"Corrected final after the 2024 Berlin repeat":"2024年柏林部分重选后的更正最终结果"):e.resultVintage}</p>
    </div>)}</div>
    <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={en?"Verified party comparison (scrollable)":"已核实政党比较（可横向滚动）"}>
      <table className="w-full min-w-[900px] text-left text-sm" data-verified-table>
        <caption className="mb-2 text-left font-semibold">{en?"Published second-vote shares and parliamentary representation":"官方第二票得票率与议会代表席位"} · {a.year} → {b.year}</caption>
        <thead><tr>{[en?"Official series / ballot labels":"官方序列／选票名称","A (%)","B (%)",en?"Change (pp)":"变化（百分点）",en?"A seats":"A 席位",en?"B seats":"B 席位",en?"Seat change":"席位变化",en?"History":"历史"].map(t=><th scope="col" key={t} className="p-2">{t}</th>)}</tr></thead>
        <tbody>{rows.map(r=><tr key={r.series.id} className="border-t border-[var(--line)]" data-verified-series={r.series.id}>
          <th scope="row" className="p-2 font-normal"><span lang="de" data-original-language="de" className="font-semibold">{r.series.label}</span><span className="block text-xs">A: <span lang="de" data-original-language="de">{r.a?.nativeLabel??"—"}</span> · B: <span lang="de" data-original-language="de">{r.b?.nativeLabel??"—"}</span>{!r.a||!r.b?<span className="block">{en?"Missing observation; no difference calculated":"观测缺失；不计算差值"}</span>:null}</span></th>
          <td className="metric-number p-2">{n(r.a?.publishedVoteShare,1)}</td><td className="metric-number p-2">{n(r.b?.publishedVoteShare,1)}</td><td className="metric-number p-2" data-share-change>{delta(r.shareChange,1)}</td><td className="metric-number p-2">{n(r.a?.seats)}</td><td className="metric-number p-2">{n(r.b?.seats)}</td><td className="metric-number p-2">{delta(r.seatsChange)}</td>
          <td className="p-2"><button type="button" className="underline" onClick={()=>onHistory(r.series.id)}>{en?"Open history":"打开历史序列"}</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="text-sm" role="note">{warning}</p>
    <details className="rounded border border-[var(--line)] p-3"><summary className="cursor-pointer font-semibold">{en?"Advanced: exact counts, identities and evidence":"高级：精确计数、身份与证据"}</summary>
      <p className="mt-3 text-sm">{en?"Vote-count and seat differences = B − A. Derived seat share = seats / election total × 100; share changes are percentage points, not percent growth. Missing counts or denominators remain missing. Identity links were verified by unique exact official second-vote counts against the authority's longitudinal table; no mergers, splits or legal succession are inferred." : "票数与席位差值＝B − A。计算席位占比＝席位数／当届总席位×100；占比变化单位为百分点，不是百分比增长。缺失计数或分母保持缺失。身份关联依据与官方历史表唯一且完全相等的第二票计数核实，不推断合并、分裂或法律继承。"}</p>
      <ul className="mt-3 space-y-4">{rows.map(r=><li key={r.series.id} className="break-words border-t border-[var(--line)] pt-2 text-sm" data-verified-detail={r.series.id}>
        <strong lang="de" data-original-language="de">{r.series.label}</strong><p>{en?"Verified series ID":"已核实序列 ID"}: {r.series.id} · {r.series.relationship}</p>
        <p>{en?"Contestant IDs (A / B)":"参选名单 ID（A／B）"}: {r.a?.contestantId??"—"} / {r.b?.contestantId??"—"}</p>
        <p>{en?"Official second votes (A / B / difference)":"官方第二票数（A／B／差值）"}: {n(r.a?.secondVotes)} / {n(r.b?.secondVotes)} / {delta(r.votesChange)}</p>
        <p>{en?"Derived seat shares (A / B / change in pp)":"计算席位占比（A／B／百分点差值）"}: {n(r.seatShareA,2)}% / {n(r.seatShareB,2)}% / {delta(r.seatShareChange,2)}</p>
        {[a,b].map((e,i)=>{const result=i===0?r.a:r.b,source=e.sources.find(s=>s.id===result?.sourceId),note=r.series.links.find(l=>l.electionId===e.electionId)?.note;return <p key={e.electionId}>{i===0?"A":"B"}: {source?<a href={source.url} className="underline">{source.title}</a>:"—"}{note?<span lang="de" data-original-language="de"> · {note}</span>:null}</p>})}
      </li>)}</ul>
      <p className="mt-3 break-words text-xs"><a href={OFFICIAL_SERIES_SOURCE.url} className="underline">{en?"Identity evidence: official longitudinal table":"身份依据：官方历史结果表"}</a> · Die Bundeswahlleiterin, Wiesbaden · {OFFICIAL_SERIES_SOURCE.licence} · SHA-256: {OFFICIAL_SERIES_SOURCE.sha256}</p>
    </details>
    <div className="flex flex-wrap items-center gap-4"><button type="button" className="underline" onClick={download}>{en?"Export selected comparison CSV":"导出所选比较 CSV"}</button><NotebookCollect create={draft} label={en?"Collect verified comparison":"收藏已核实比较"}/></div>
  </div>;
}
