import { localeNumber, type Locale } from "@/i18n/config";
import type { PoliticalElectionView } from "@/lib/politicalExplorer";

export function ElectionRoundDetails({election,locale}:{election:PoliticalElectionView;locale:Locale}){
  const n=election.national;
  if(!n?.rounds?.length)return null;
  const en=locale==="en";
  const allocation=n.historicalAllocation;
  return <section className="my-4 space-y-3 border-y border-[var(--line)] py-3 text-sm" data-election-round-details>
    <h4 className="font-semibold">{en?"Polling rounds and electorates":"各轮投票日期与选民范围"}</h4>
    <ul className="space-y-2">{n.rounds.map(r=><li key={r.round} data-election-round={r.round}>
      <strong>{r.date} · {en?`Round ${r.round}`:`第 ${r.round} 轮`}</strong>
      {" · "}{r.constituencies===null?(en?"National electorate":"全国选民"):(en?`${r.constituencies} runoff constituencies`:`${r.constituencies} 个复选选区`)}
      {" · "}{localeNumber(r.turnout,locale)}{r.turnout!==null?"%":""}
      {" · "}{localeNumber(r.voters,locale)} / {localeNumber(r.eligible,locale)} {en?"registered voters":"名登记选民"}
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
      {allocation.unmatchedLists.map(row=><p key={row.label}>{row.label} · {en?"Compensation-only record":"仅有补偿层记录"} · {row.compensation_votes} {en?"fragment votes":"张余票"} · {row.seats} {en?"seats. The archive does not establish a corresponding territorial-list identity.":"席。档案未确定其对应的地区名单身份。"}</p>)}
    </div>}
  </section>;
}
