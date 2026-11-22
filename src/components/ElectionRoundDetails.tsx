import { localeNumber, type Locale } from "@/i18n/config";
import type { PoliticalElectionView } from "@/lib/politicalExplorer";

import { outsideListKindLabel, roundElectorateLabel } from "@/lib/politicalNational";

export function HistoricalChamberReconciliation({election, locale}: {election:PoliticalElectionView; locale:Locale}) {
  const national = election.national;
  const allocation = national?.historicalAllocation;
  if (!allocation || !national?.seatTiers || national.chamberAttribution !== "complete" || election.totalSeats === null) return null;
  const en = locale === "en";
  const outside = national.seatTiers.outsideListConstituency ?? [];
  const linked = national.ballots.flatMap(ballot => ballot.results)
    .flatMap(row => row.chamberSeats == null ? [] : [row.chamberSeats]).reduce((sum, seats) => sum + seats, 0);
  // Complete attribution is validated by the store adapter before this view is available.
  return <div className="mt-2 space-y-1 text-sm" data-chamber-reconciliation={election.electionId}>
    <p>{en ? "Whole chamber" : "全议院"} · {election.totalSeats} {en ? "seats" : "席"} · {en ? "Attributable to territorial-list organisations" : "可归属地区名单组织"} {linked}</p>
    <ul>{outside.map(holder => <li key={holder.label} data-outside-list-kind={holder.kind}>
      <span lang="hu">{holder.label}</span> · {outsideListKindLabel(holder.kind, locale)} · {holder.seats} {en ? (holder.seats === 1 ? "seat" : "seats") : "席"}
      {holder.components?.length ? <ul className="ml-4 text-xs" aria-label={en ? "Included joint nominations" : "其中的联合提名席位"}>
        {holder.components.map(part => <li key={part.label}><span lang="hu">{part.label}</span> · {localeNumber(part.seats,locale)} {en ? "seats" : "席"}</li>)}
      </ul> : null}
    </li>)}</ul>
    {allocation.unmatchedLists.map(row => <p key={row.label} data-unmatched-compensation>
      <span lang="hu">{row.label}</span> · {en ? "Unmatched compensation list" : "未匹配到地区名单的补偿名单"} · {row.compensation_votes} {en ? "fragment votes" : "张余票"} · {row.seats} {en ? "seats" : "席"}
    </p>)}
    {allocation.compositionUrl && <a className="mr-2 underline" href={allocation.compositionUrl}>{en ? "Official chamber composition" : "官方全院席位构成"}</a>}
    {allocation.compensationUrl && <a className="underline" href={allocation.compensationUrl}>{en ? "Official compensation lists" : "官方补偿名单"}</a>}
  </div>;
}

export function ElectionRoundDetails({election,locale}:{election:PoliticalElectionView;locale:Locale}){
  const n=election.national;
  if(!n?.rounds?.length)return null;
  const en=locale==="en";
  const allocation=n.historicalAllocation;
  return <section className="my-4 space-y-3 border-y border-[var(--line)] py-3 text-sm" data-election-round-details>
    <h4 className="font-semibold">{en?"Polling rounds and electorates":"各轮投票日期与选民范围"}</h4>
    <ul className="space-y-2">{n.rounds.map(r=><li key={r.round} data-election-round={r.round}>
      <strong>{r.date} · {roundElectorateLabel(r,locale)}</strong>
      {" · "}{localeNumber(r.turnout,locale)}{r.turnout!==null?"%":""}
      {" · "}{localeNumber(r.voters,locale)} / {localeNumber(r.eligible,locale)} {en?"registered voters":"名登记选民"}
      {r.sourceHeading && <span className="ml-1">{en ? "The election office labels this summary informational." : "选举办公室将这份汇总标为参考数据。"} <span lang="hu">{r.sourceHeading}</span></span>}
      {r.sourceUrl&&<a className="ml-2 underline" href={r.sourceUrl}>{en?"Official turnout":"官方投票率"}</a>}
    </li>)}</ul>
    {allocation&&n.seatTiers&&<div data-historical-seat-tiers>
      <h4 className="font-semibold">{en?"Final seat allocation":"最终席位分配"} · {election.totalSeats}</h4>
      <p>{en?"Single-member districts":"单一选区"} {n.seatTiers.constituency} · {en?"Territorial lists":"地区名单"} {allocation.territorialSeats} · {en?"National compensation":"全国补偿"} {allocation.compensationSeats}
        {allocation.compositionUrl&&<a className="ml-2 underline" href={allocation.compositionUrl}>{en?"Official composition":"官方席位构成"}</a>}
      </p>
      <p>{en?`The rules provided for ${allocation.statutory.single_member} district seats, up to ${allocation.statutory.territorial_lists} territorial seats and at least ${allocation.statutory.national_compensation_minimum} compensation seats.`:`选举规则设有 ${allocation.statutory.single_member} 个单一选区席位、最多 ${allocation.statutory.territorial_lists} 个地区名单席位，以及至少 ${allocation.statutory.national_compensation_minimum} 个全国补偿席位。`}
        {allocation.transferred!==null&&(en?` The ${allocation.transferred} unallocated territorial seats went to the compensation tier.`:`地区层未分出的 ${allocation.transferred} 席转入全国补偿层。`)}
        {" "}{n.rules.sourceIds.map(id=>{const source=election.sources.find(s=>s.id===id);return source?<a className="mr-2 underline" key={id} href={source.url}>{source.title}</a>:null;})}
      </p>
      <p>{en?"National compensation mandates were allocated from unused constituency and territorial-list votes. Voters did not cast a separate compensation ballot.":"全国补偿席位依据选区与地区名单未用于分配席位的余票分配。选民没有单独投出补偿选票。"}
        {allocation.compensationUrl&&<a className="ml-2 underline" href={allocation.compensationUrl}>{en?"Compensation record":"补偿分配记录"}</a>}
      </p>
      <HistoricalChamberReconciliation election={election} locale={locale}/>
    </div>}
  </section>;
}
