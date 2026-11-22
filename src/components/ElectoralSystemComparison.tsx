import Link from "next/link";
import {localeNumber, localizedRoute, type Locale} from "@/i18n/config";
import {nationalHistoryObservation} from "@/lib/electionHistoryObservations";
import {electionInstitutionalContext, institutionalPeriods} from "@/lib/institutionalRegistry";
import {roundElectorateLabel} from "@/lib/politicalNational";
import {nationalComparisonView} from "@/lib/politicalComparisonBallots";
import {type PoliticalElectionView} from "@/lib/politicalExplorer";
import {ScopedDistribution} from "./PoliticalComparisonPicker";

function SystemRules({election,locale}: {election:PoliticalElectionView; locale:Locale}) {
  const national=election.national;
  if (!national) return null;
  const l=(english:string,chinese:string)=>locale==="en"?english:chinese;
  const historical=national.historicalAllocation;
  const observation=nationalHistoryObservation(election,locale);
  const institutional=electionInstitutionalContext(election.electionId);
  const period=institutional ? institutionalPeriods(institutional.country).find(p=>p.period_id===institutional.institutional_period_id) : undefined;
  return <details data-comparison-rules={election.electionId}><summary>{election.year} · {l("Allocation, thresholds and legal sources","席位分配、门槛与法律来源")}</summary>
      <p className="text-sm">{national.rules.totalSeatsDefinition?.[locale]}</p>
      <p className="text-sm">{historical?l("The national compensation allocation uses fragment votes under the D’Hondt method. These votes do not form a separate popular ballot.","全国补偿席位以未用于取得席位的选票按顿特法分配，没有独立的全国补偿投票。"):l("District seats use plurality. National-list seats use highest averages over qualifying list votes and surplus votes.","选区按相对多数分席，全国名单席位按合格名单票和剩余票以最高平均数法分配。")}</p>
      <ul className="my-2 list-disc pl-4 text-sm">{national.rules.thresholds?.map(t=><li key={t.appliesTo}>{t.description[locale]}</li>)}</ul>
      {historical && national.rules.thresholds?.length && !national.rules.thresholds.some(t=>t.appliesTo==="joint list of more than two parties") ? <p className="text-sm" data-threshold-coverage>{l("This election’s rule record omits the larger joint-list threshold. The documented amendment remained in force on polling day.","本届规则记录缺少三个或以上政党联合名单的门槛。已登记的修正法在投票日仍然有效。")}</p> : null}
      {national.rules.minorityRepresentation&&<p className="text-sm">{national.rules.minorityRepresentation[locale]}</p>}
      <p className="text-sm">{l("Constitutional period on election day","选举日所属宪制时期")} · {period ? period.from+" "+(period.to_exclusive ? l("until (exclusive)","至（不含）")+" "+period.to_exclusive : l("onward","起")) : l("No verified period boundary in the register.","登记表尚无已核实的时期边界。")}</p>
      {institutional?.electoral_system_id&&<p className="text-sm">{l("Election-specific rule","当届选制规则")} · {institutional.electoral_system_id}</p>}
      {election.sources.filter(s=>national.rules.sourceIds.includes(s.id)||observation.turnoutSources.some(t=>s.id===t.id)).map(s=><a href={s.url} key={s.id} className="block break-words text-xs underline" data-comparison-source={s.id}>{s.title}</a>)}
    </details>;
}

function SystemPanel({election,locale}: {election:PoliticalElectionView; locale:Locale}) {
  const national=election.national;
  if (!national) return null;
  const en=locale==="en", l=(english:string,chinese:string)=>en?english:chinese;
  const observation=nationalHistoryObservation(election,locale);
  const localView=nationalComparisonView(election);
  const selected=localView.ballots.find(b=>b.id===national.activeVote.id);
  const historical=national.historicalAllocation;
  const rounds=national.rounds;
  const tiers=national.seatTiers;
  const repeatedTerritorial = national.ballots.find(b=>b.definition.roundScope === "valid_round_composite")
    ?.turnoutRecord?.round_composition?.find(part=>part.round === 2);
  const amount=(v:number|null)=>localeNumber(v,locale,{maximumFractionDigits:2});
  return <section className="min-w-0 space-y-2 border-t border-[var(--line)] pt-3" data-comparison-system={election.electionId}>
    <h4 className="font-semibold">{election.year} · {election.chamber} · {amount(election.totalSeats)} {l("seats","席")}</h4>
    <p className="text-sm">{repeatedTerritorial ? l(`Second-round voting took place in the remaining single-member constituencies and ${repeatedTerritorial.territorial_districts} territorial districts repeated their list ballot.`,`尚待确定席位的单一选区举行第二轮投票，另有 ${repeatedTerritorial.territorial_districts} 个地区选区重投名单票。`) : historical?l("Two rounds; the second was confined to undecided constituencies.","两轮投票，第二轮仅在第一轮未决选区举行。"):l("One round in the single-member constituencies; separate national party and nationality lists.","单一议席选区一轮投票，另设全国政党名单和民族名单。")}</p>
    {tiers&&<p className="text-sm" data-comparison-tiers>
      {l("Final allocation","最终分配")} · {l("Single-member constituencies","单一议席选区")} {amount(tiers.constituency)}
      {historical?<> · {l("Territorial lists","地区名单")} {amount(historical.territorialSeats)} · {l("National compensation","全国补偿名单")} {amount(historical.compensationSeats)}</>:<> · {l("National lists","全国名单")} {amount(tiers.nationalList)}</>}
    </p>}
    <div className="text-sm" data-comparison-turnout>
      {rounds?.length ? <ul>{rounds.map(r=><li key={r.round}>
        {r.date} · {roundElectorateLabel(r,locale)} · {amount(r.turnout)}{r.turnout!==null?"%":""}
        {" · "}{amount(r.voters)} / {amount(r.eligible)} · {l("published turnout","公布投票率")}
        {r.sourceUrl&&<a href={r.sourceUrl} className="ml-1 underline">{l("Round summary","本轮官方汇总")}</a>}
      </li>)}</ul>:<p>{election.date} · {l("National turnout","全国投票率")} {amount(observation.turnout)}{observation.turnout!==null?"%":""}
        {" · "}{amount(observation.numerator)} / {amount(observation.denominator)} · {observation.published?l("published","公布值"):l("calculated from official counts","按官方人数计算")}</p>}
    </div>
    <details data-comparison-chamber><summary>{l("Final parliamentary composition","最终议会席位构成")}</summary>
      {observation.attribution?<ul className="my-2 text-sm">{observation.attribution.map((part,i)=><li key={part.contestantId??i} className="break-words">{part.label} · {amount(part.seats)} / {amount(election.totalSeats)} {l("seats","席")}</li>)}</ul>:<p>{l("The recorded seats do not provide a complete allocation by contestant.","按参选方分列的席位记录尚不完整。")}</p>}
    </details>
    <SystemRules election={election} locale={locale}/>
    <ScopedDistribution country={election.country!} election={localView} ballot={selected} locale={locale} compactRules/>
  </section>;
}

export function HistoricalAllocationComparison({a,b,locale}: {a:PoliticalElectionView; b:PoliticalElectionView; locale:Locale}) {
  const first=a.national?.historicalAllocation, second=b.national?.historicalAllocation;
  if (!first || !second) return null;
  const l=(english:string,chinese:string)=>locale==="en"?english:chinese;
  const rows: [string, number|null|undefined, number|null|undefined][] = [
    [l("Statutory single-member seats","法定单一议席选区席位"),first.statutory.single_member,second.statutory.single_member],
    [l("Statutory territorial-list maximum","法定地区名单席位上限"),first.statutory.territorial_lists,second.statutory.territorial_lists],
    [l("Statutory compensation minimum","法定全国补偿席位下限"),first.statutory.national_compensation_minimum,second.statutory.national_compensation_minimum],
    [l("Final single-member seats","最终单一议席选区席位"),a.national?.seatTiers?.constituency,b.national?.seatTiers?.constituency],
    [l("Final territorial-list seats","最终地区名单席位"),first.territorialSeats,second.territorialSeats],
    [l("Final national compensation seats","最终全国补偿席位"),first.compensationSeats,second.compensationSeats],
    [l("Territorial seats transferred to compensation","转入全国补偿的地区名单席位"),first.transferred,second.transferred],
    [l("Whole chamber","全院席位"),a.totalSeats,b.totalSeats],
  ];
  return <section className="my-3 min-w-0 space-y-2" data-historical-allocation-comparison>
    <table className="w-full text-sm">
      <caption className="mb-2 text-left font-semibold">{l("Statutory limits and final seat allocation","法定席位与最终分配")}</caption>
      <thead><tr><th scope="col" className="text-left">{l("Seat allocation","席位分配")}</th>{[a,b].map(e=><th key={e.electionId} scope="col" className="px-2 text-right">{e.year}</th>)}</tr></thead>
      <tbody>{rows.map(([label,left,right])=><tr key={label} className="border-t border-[var(--line)]">
        <th scope="row" className="py-1 text-left font-normal">{label}</th>
        <td className="px-2 text-right tabular-nums">{localeNumber(left,locale)}</td><td className="px-2 text-right tabular-nums">{localeNumber(right,locale)}</td>
      </tr>)}</tbody>
    </table>
    <p className="text-sm">{l("The allocation rule transfers unfilled territorial seats to national compensation. Different transfer counts can arise under the same rule.","按席位分配规则，未分出的地区名单席位转入全国补偿。相同规则下，各届转入的席位数可有差异。")}</p>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">{[a,b].map(e=>{
      const url=e.national?.historicalAllocation?.compositionUrl;
      return url && <a key={e.electionId} className="underline" href={url}>{l("Official seat allocation","官方席位分配")} · {e.year}</a>;
    })}</div>
    {[a,b].map(e=><SystemRules election={e} locale={locale} key={e.electionId}/>)}
  </section>;
}

export function ElectoralSystemComparison({a,b,locale}:{a:PoliticalElectionView;b:PoliticalElectionView;locale:Locale}) {
  const en=locale==="en";
  return <div className="my-3 space-y-3" data-system-break-comparison>
    <h4 className="font-semibold">{en?"Comparison across electoral systems":"跨选制的两届比较"}</h4>
    <p className="text-sm">{en?"The chamber size, ballot definitions and electoral rules changed. Read each vote distribution within its own ballot and each seat count against that election’s full chamber. The earlier figures use separate rolls for each round. The later figure counts participation across all registers. The register provides no verified party or alliance continuity across these elections.":"两届的议院规模、选票定义和分配规则不同。得票率以各自选票为分母，席位数以当届全院席次为参照。前一届两轮投票各有相应选民名册，后一届投票率按全部登记选民计算。目前登记表尚无这两届之间经核实的政党或联盟身份关联。"}</p>
    <Link className="underline" href={localizedRoute("/countries/hungary/",locale)+"#hungary-electoral-system-transition"}>{en?"Electoral reform, legal dates and sources":"选制改革、法律日期与来源"}</Link>
    <div className="grid min-w-0 gap-5 lg:grid-cols-2" data-paired-system-elections>{[a,b].map(e=><SystemPanel election={e} locale={locale} key={e.electionId}/>)}</div>
  </div>;
}
