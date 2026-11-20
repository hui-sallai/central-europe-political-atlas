import Link from "next/link";
import {localeNumber, localizedRoute, type Locale} from "@/i18n/config";
import {nationalHistoryObservation} from "@/lib/electionHistoryObservations";
import {electionInstitutionalContext, institutionalPeriods} from "@/lib/institutionalRegistry";
import {nationalComparisonView} from "@/lib/politicalComparisonBallots";
import {type PoliticalElectionView} from "@/lib/politicalExplorer";
import {ScopedDistribution} from "./PoliticalComparisonPicker";

function SystemPanel({election,locale}: {election:PoliticalElectionView; locale:Locale}) {
  const national=election.national;
  if (!national) return null;
  const en=locale==="en", l=(english:string,chinese:string)=>en?english:chinese;
  const observation=nationalHistoryObservation(election,locale);
  const localView=nationalComparisonView(election);
  const selected=localView.ballots.find(b=>b.id===national.activeVote.id);
  const institutional=electionInstitutionalContext(election.electionId);
  const period=institutional ? institutionalPeriods(institutional.country).find(p=>p.period_id===institutional.institutional_period_id) : undefined;
  const historical=national.historicalAllocation;
  const rounds=national.rounds;
  const tiers=national.seatTiers;
  const amount=(v:number|null)=>localeNumber(v,locale,{maximumFractionDigits:2});
  return <section className="min-w-0 space-y-2 border-t border-[var(--line)] pt-3" data-comparison-system={election.electionId}>
    <h4 className="font-semibold">{election.year} · {election.chamber} · {amount(election.totalSeats)} {l("seats","席")}</h4>
    <p className="text-sm">{historical?l("Two rounds; the second was confined to undecided constituencies.","两轮投票，第二轮仅在第一轮未决选区举行。"):l("One round in the single-member constituencies; separate national party and nationality lists.","单一议席选区一轮投票，另设全国政党名单和民族名单。")}</p>
    {tiers&&<p className="text-sm" data-comparison-tiers>
      {l("Final allocation","最终分配")} · {l("Single-member constituencies","单一议席选区")} {amount(tiers.constituency)}
      {historical?<> · {l("Territorial lists","地区名单")} {amount(historical.territorialSeats)} · {l("National compensation","全国补偿名单")} {amount(historical.compensationSeats)}</>:<> · {l("National lists","全国名单")} {amount(tiers.nationalList)}</>}
    </p>}
    <div className="text-sm" data-comparison-turnout>
      {rounds?.length ? <ul>{rounds.map(r=><li key={r.round}>
        {l("Round","第")}{en?" ":""}{r.round}{en?"":"轮"} · {r.date} · {r.constituencies!=null?amount(r.constituencies)+" "+l("constituencies","个选区"):l("national electorate","全国选民")} · {amount(r.turnout)}{r.turnout!==null?"%":""}
        {" · "}{amount(r.voters)} / {amount(r.eligible)} · {l("published turnout","公布投票率")}
        {r.sourceUrl&&<a href={r.sourceUrl} className="ml-1 underline">{l("Round summary","本轮官方汇总")}</a>}
      </li>)}</ul>:<p>{election.date} · {l("National turnout","全国投票率")} {amount(observation.turnout)}{observation.turnout!==null?"%":""}
        {" · "}{amount(observation.numerator)} / {amount(observation.denominator)} · {observation.published?l("published","公布值"):l("calculated from official counts","按官方人数计算")}</p>}
    </div>
    <details data-comparison-chamber><summary>{l("Final parliamentary composition","最终议会席位构成")}</summary>
      {observation.attribution?<ul className="my-2 text-sm">{observation.attribution.map((part,i)=><li key={part.contestantId??i} className="break-words">{part.label} · {amount(part.seats)} / {amount(election.totalSeats)} {l("seats","席")}</li>)}</ul>:<p>{l("The recorded seats do not provide a complete allocation by contestant.","按参选方分列的席位记录尚不完整。")}</p>}
    </details>
    <details data-comparison-rules><summary>{l("Allocation, thresholds and legal sources","席位分配、门槛与法律来源")}</summary>
      <p className="text-sm">{national.rules.totalSeatsDefinition?.[locale]}</p>
      <p className="text-sm">{historical?l("The national compensation allocation uses fragment votes under the D’Hondt method. These votes do not form a separate popular ballot.","全国补偿席位以未用于取得席位的选票按顿特法分配，没有独立的全国补偿投票。"):l("District seats use plurality. National-list seats use highest averages over qualifying list votes and surplus votes.","选区按相对多数分席，全国名单席位按合格名单票和剩余票以最高平均数法分配。")}</p>
      <ul className="my-2 list-disc pl-4 text-sm">{national.rules.thresholds?.map(t=><li key={t.appliesTo}>{t.description[locale]}</li>)}</ul>
      {historical&&<p className="text-sm">{l("The 2010 allocation guide documents the single-party and two-party list thresholds. A threshold for larger joint lists is unverified here.","2010 年分配说明记载了单一政党名单和两党联合名单的门槛。更大联合名单的门槛尚未核实。")}</p>}
      {national.rules.minorityRepresentation&&<p className="text-sm">{national.rules.minorityRepresentation[locale]}</p>}
      <p className="text-sm">{l("Constitutional period on election day","选举日所属宪制时期")} · {period ? period.from+" "+(period.to_exclusive ? l("until (exclusive)","至（不含）")+" "+period.to_exclusive : l("onward","起")) : l("No verified period boundary in the register.","登记表尚无已核实的时期边界。")}</p>
      {institutional?.electoral_system_id&&<p className="text-sm">{l("Election-specific rule","当届选制规则")} · {institutional.electoral_system_id}</p>}
      {election.sources.filter(s=>national.rules.sourceIds.includes(s.id)||observation.turnoutSources.some(t=>s.id===t.id)).map(s=><a href={s.url} key={s.id} className="block break-words text-xs underline" data-comparison-source={s.id}>{s.title}</a>)}
    </details>
    <ScopedDistribution country={election.country!} election={localView} ballot={selected} locale={locale} compactRules/>
  </section>;
}

export function ElectoralSystemComparison({a,b,locale}:{a:PoliticalElectionView;b:PoliticalElectionView;locale:Locale}) {
  const en=locale==="en";
  return <div className="my-3 space-y-3" data-system-break-comparison>
    <h4 className="font-semibold">{en?"Comparison across electoral systems":"跨选制的两届比较"}</h4>
    <p className="text-sm">{en?"The chamber size, ballot definitions and electoral rules changed. Read each vote distribution within its own ballot and each seat count against that election’s full chamber. The earlier figures use separate rolls for each round. The later figure counts participation across all registers. No party or alliance in 2010 has a verified identity link to a later election.":"两届的议院规模、选票定义和分配规则不同。得票率以各自选票为分母，席位数以当届全院席次为参照。前一届两轮投票各有相应选民名册，后一届投票率按全部登记选民计算。2010 年的政党或联盟均无通往后续选举的已核实身份关联。"}</p>
    <Link className="underline" href={localizedRoute("/countries/hungary/",locale)+"#hungary-electoral-system-transition"}>{en?"Electoral reform, legal dates and sources":"选制改革、法律日期与来源"}</Link>
    <div className="grid min-w-0 gap-5 lg:grid-cols-2" data-paired-system-elections>{[a,b].map(e=><SystemPanel election={e} locale={locale} key={e.electionId}/>)}</div>
  </div>;
}
