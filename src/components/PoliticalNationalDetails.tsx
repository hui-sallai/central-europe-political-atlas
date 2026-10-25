"use client";
import { localeNumber, type Locale } from "@/i18n/config";
import type { PoliticalElectionView } from "@/lib/politicalExplorer";
import { compatibleTurnout, voteSeatDifference } from "@/lib/politicalNational";

export function PoliticalNationalDetails({election,comparison,locale}:{election:PoliticalElectionView;comparison:PoliticalElectionView|null;locale:Locale}){
 const en=locale==="en",n=election.national;
 if(!n)return null;
 const description=election.notes?.[locale]?.trim()?election.notes[locale]:null;
 // A structured rule field that is absent is "not recorded as a structured field", not "unknown", when the sourced system description covers it.
 const unknown=description?(en?"Not recorded as a separate structured field; see the sourced system description below":"未作为单独的结构字段记录；请参阅下方有来源的选举制度说明"):(en?"Not established in the authorised structured records; consult the source notes":"授权结构记录中尚未确立；请参阅来源说明");
 const descriptionSources=election.sources.filter(source=>n.rules.sourceIds.includes(source.id));
 const ballot=n.ballots.find(b=>b.definition.id===n.activeVote.id)!;
 return <details className="card p-5" data-national-research><summary className="cursor-pointer font-semibold">{en?"National parliamentary research: definitions and representation":"国家议会研究：定义与代表席位"}</summary>
  <p className="mt-3 text-sm">{en?"National results only. An electoral district is an allocation context, not a statistical region or a new subnational module. Election seats are not later parliamentary composition.":"仅提供全国结果。选区是席位分配背景，不是统计区域或新的次国家模块。选举席位不等于其后的议会组成。"}</p>
  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{[
   [en?"Chamber / result vintage":"议院／结果版本",`${n.chamber} · ${n.vintage}`],
   [en?"Election date interval":"选举日期区间",`${election.date}${n.dateEnd?` – ${n.dateEnd}`:""}`],
   [en?"Active vote / share denominator":"所示选票／得票率分母",`${n.activeVote.label[locale]} · ${n.activeVote.denominator}`],
   [en?"Valid / invalid ballots for this vote":"该选票的有效票／无效票",`${localeNumber(ballot.validVotes,locale)} / ${localeNumber(ballot.invalidVotes,locale)}`],
   [en?"Turnout numerator / denominator":"投票率分子／分母",`${n.turnout.numerator} / ${n.turnout.denominator}`],
   [en?"Turnout definition":"投票率定义",n.turnout.definition??unknown],
   [en?"National / district allocation":"全国／选区分配",`${n.rules.nationalAllocation??unknown} / ${n.rules.districtAllocation??unknown}`],
   [en?"Minority representation":"少数群体代表规则",n.rules.minorityRepresentation?.[locale]??unknown],
   [en?"Total-seat definition":"总席位定义",n.rules.totalSeatsDefinition?.[locale]??unknown],
  ].map(([k,v])=><div key={k}><dt className="font-semibold">{k}</dt><dd className="break-words">{v}</dd></div>)}</dl>
  <p className="mt-3 text-sm">{en?"Legal thresholds":"法定门槛"}: {n.rules.thresholds?.map(t=>`${t.appliesTo}: ${t.percent===null?"—":`${t.percent}%`} · ${t.description[locale]}`).join("; ")??unknown}</p>
  {description?<div className="mt-3 border-l-2 border-[var(--line)] pl-3 text-sm" data-system-description><p className="font-semibold">{en?"Sourced system description (published text, not parsed into structured fields)":"有来源的选举制度说明（已发布文本，未解析为结构字段）"}</p><p className="mt-1">{description}</p>{descriptionSources.length?<p className="mt-1 text-xs">{en?"Sources":"来源"}: {descriptionSources.map(source=><a key={source.id} href={source.url} className="mr-3 underline" data-system-description-source={source.id}>{source.title}</a>)}</p>:null}</div>:null}
  {comparison&&!compatibleTurnout(election,comparison)?<p role="note" className="mt-3 text-sm" data-turnout-blocked>{en?"Turnout change is unavailable: the numerator, denominator or documented definition differs or is not established. Published levels remain visible; they are not treated as one comparable series.":"投票率差值不可用：分子、分母或已记载定义不同或尚未确立。官方原值仍可查看，但不视为同一可比序列。"}</p>:null}
  <div className="mt-4 overflow-x-auto" role="region" tabIndex={0} aria-label={en?"Vote and seat representation (scrollable)":"得票与席位代表性（可横向滚动）"}><table className="w-full min-w-[640px] text-left text-sm" data-vote-seat-table><caption>{en?"Seat share minus published vote share (percentage points); a descriptive difference, not a fairness score":"席位占比减官方得票率（百分点）；描述性差值，不是公平性分数"}</caption><thead><tr>{[en?"Original ballot contestant":"原始参选名单",en?"Entity context":"实体背景",en?"Published vote share":"官方得票率",en?"Difference (pp)":"差值（百分点）",en?"Source":"来源"].map(s=><th scope="col" key={s}>{s}</th>)}</tr></thead><tbody>{election.results.map(r=>{const gap=voteSeatDifference(election,r),source=election.sources.find(s=>s.id===r.sourceId);return <tr key={r.contestantId} className="border-t border-[var(--line)]"><th scope="row" className="py-2"><span data-original-language={election.originalLanguage} lang={election.originalLanguage}>{r.nativeLabel}</span></th><td>{r.contestantKind??unknown}<span className="block text-xs">{en?"Election-specific party ID":"当届政党 ID"}: {r.partyId??"—"}</span></td><td>{localeNumber(r.publishedVoteShare,locale)}{r.publishedVoteShare===null?"":"%"}</td><td className="metric-number">{localeNumber(gap,locale,{maximumFractionDigits:2})}{gap!==null?<span className="ml-2 inline-block h-2 bg-[var(--accent)]" style={{width:`${Math.min(80,Math.abs(gap)*4)}px`}} aria-hidden/>:null}</td><td>{source?<a className="underline" href={source.url}>{source.title}</a>:"—"}</td></tr>;})}</tbody></table></div>
  <p className="mt-3 text-sm">{en?"Vote-to-seat differences require a list-vote basis and a verified whole-chamber seat denominator. A tier subtotal, missing seat count or missing published share produces no difference. Thresholds and minority rules are not reconstructed from party totals.":"票席差要求名单票口径和已核实的全议院席位分母。分层小计、缺失席位或缺失官方得票率不计算差值；不从政党总数反推门槛或少数群体规则。"}</p>
  <p className="mt-3 text-sm">{en?"Ballot contestants, parties and alliances remain different entities. Election-specific party membership does not establish historical legal continuity. Existing official history links are statistical authority-series evidence; mergers, splits and coalition membership do not automatically continue a party's vote series.":"参选名单、政党和联盟是不同实体。当届政党归属不证明跨届法律主体连续性。现有官方历史关联是选举机构的统计序列证据；合并、分裂和联盟成员关系不自动延续政党得票序列。"}</p>
 </details>;
}
