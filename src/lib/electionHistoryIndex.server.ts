import { electionInstitutionalContext, institutionalPeriods, type ElectionInstitutionalLink } from "./institutionalRegistry";
import { selectNationalBallot, turnoutFraction } from "./politicalNational";
import { nationalComparisonView, roundScope, scopedComparisonView } from "./politicalComparisonBallots";
import { turnoutForDisplay, type PoliticalElectionView } from "./politicalExplorer";
import type { BallotElection } from "./politicalBallots";
import type { ArchiveElection, ArchiveTurnout } from "./electionHistoryComparison";

const national = {en:"Election-wide electorate", "zh-CN":"当届全体选民"};
const general = {en:"General-list electorate", "zh-CN":"普通名单选民"};
const territorial = {en:"Territorial constituencies I–X", "zh-CN":"境内第一至第十选区"};
const constituencies = {en:"Separate constituency electorates", "zh-CN":"按选区分别记录"};

function periodFor(rule:ElectionInstitutionalLink|undefined) {
  if (!rule?.institutional_period_id) return null;
  const period = institutionalPeriods(rule.country).find(p=>p.period_id===rule.institutional_period_id);
  return period ? {id:period.period_id,from:period.from,toExclusive:period.to_exclusive} : null;
}

function nationalAllocations(e: PoliticalElectionView) {
  const tiers = e.national?.seatTiers;
  if (!tiers) return [];
  const history = e.national?.historicalAllocation;
  const district = {id:"single_member",label:{en:"Single-member constituencies","zh-CN":"单一议席选区"},seats:tiers.constituency};
  return history ? [district,
    {id:"territorial_list",label:{en:"Territorial lists","zh-CN":"地区名单"},seats:history.territorialSeats},
    {id:"national_compensation",label:{en:"National compensation lists","zh-CN":"全国补偿名单"},seats:history.compensationSeats},
  ] : [district,{id:"national_list",label:{en:"National lists","zh-CN":"全国名单"},seats:tiers.nationalList}];
}

export function nationalHistoryView(e: PoliticalElectionView): ArchiveElection {
  const view = nationalComparisonView(e);
  const rate = turnoutForDisplay(e);
  const rule = electionInstitutionalContext(e.electionId);
  const basis = e.national?.turnout;
  const fractionEn = basis && turnoutFraction(basis, "en");
  const fractionZh = basis && turnoutFraction(basis, "zh-CN");
  const scope = fractionEn && fractionZh ? {
    en: national.en + " · " + fractionEn,
    "zh-CN": national["zh-CN"] + " · " + fractionZh,
  } : national;
  // The country's primary ballot stays first for existing entry points.
  for (const ballot of e.national?.ballots ?? []) {
    if (ballot.definition.id === e.system.voteType) continue;
    const selected = selectNationalBallot(e,ballot.definition.id);
    if (selected) view.ballots.push(...nationalComparisonView(selected).ballots);
  }
  const rounds:ArchiveTurnout[] | undefined = e.national?.rounds?.map(r=>({
    ballotId:r.sourceBallotId ?? (r.date===e.date ? null : view.ballots.find(b=>b.round===r.round)?.id ?? null),
    date:r.date, round:r.round, constituencies:r.constituencies, constituencyCount:r.constituencyCount, electorateScope:r.electorateScope, sourceUrl:r.sourceUrl,
    value:r.turnout, published:r.turnout!==null, scope:roundScope(r),
    count:r.voters, electorate:r.eligible, definition:r.definition, sourceIds:r.sourceIds,
  }));
  return {...view,sources:undefined,history:{
    chamberId:rule?.chamber_id ?? null, legislatureId:e.national?.legislatureId ?? null,
    systemId:e.national?.systemId ?? rule?.electoral_system_id ?? null, period:periodFor(rule),allocations:nationalAllocations(e),
    allocationUrls:e.national?.historicalAllocation ? {composition:e.national.historicalAllocation.compositionUrl,
      compensation:e.national.historicalAllocation.compensationUrl} : undefined,
    dateBasis:null, endDate:e.national?.dateEnd ?? null, primaryBallot:e.system.voteType,rounds,
    turnout:(e.national?.activeVote.roundScope === "valid_round_composite" ? undefined : rounds?.[0]) ?? {ballotId:null,value:rate.value, published:rate.value !== null && !rate.computed,
      scope, count:e.voters, electorate:e.eligibleVoters, definition:e.turnoutDefinition ?? null,
      sourceIds:e.national?.turnout.sourceIds ?? []},
    sources:e.sources,
  }};
}
export function scopedHistoryView(e: BallotElection): ArchiveElection {
  const view = scopedComparisonView(e);
  const b = e.ballots.find(ballot => ballot.geography === "national");
  const regional = e.territorialTurnout;
  const rule = electionInstitutionalContext(e.id);
  // Historical Croatian chambers have their own legislature record. The constitutional registry also includes the modern Sabor alias.
  const chamberId = e.country === "croatia" && rule?.chamber_official_name !== e.chamber ? null : rule?.chamber_id ?? null;
  const allocations = e.compositionBasis==="mechanisms" ? e.composition.flatMap(s=>s.key?[{id:s.key,label:s.label,seats:s.seats}]:[]) : [];
  // Austria records regional, Land and federal awards by list in its national results.
  // Retain the three totals only when each winning list and the chamber reconcile.
  if (!allocations.length && b && e.country==="austria") {
    const winners = b.results.filter(r=>r.seats!==null && r.seats>0);
    const stages = ["regional_seats","land_seats","federal_seats"];
    const valid = winners.length>0 && winners.every(r=>stages.every(key=>r.seatDetails.some(s=>s.key===key))
      && r.seatDetails.filter(s=>s.key&&stages.includes(s.key)).reduce((a,s)=>a+s.seats,0)===r.seats);
    if (valid && winners.reduce((n,r)=>n+r.seats!,0)===e.totalSeats) {
      for (const key of stages) {
        const values = winners.map(r=>r.seatDetails.find(s=>s.key===key)!);
        allocations.push({id:key,label:values[0].label,seats:values.reduce((n,s)=>n+s.seats,0)});
      }
    }
  }
  return {...view,sources:undefined,history:{
    period:periodFor(rule), allocations, chamberId, legislatureId:e.legislatureId, systemId:e.systemId, dateBasis:e.dateBasis,
    endDate:null, primaryBallot:b?.geography ?? (e.ballots.length === 1 ? e.ballots[0].geography : null),
    turnout:regional ? {ballotId:null,value:regional.value, published:regional.published, scope:territorial,
      count:regional.numerator, electorate:regional.denominator,definition:regional.definition,sourceIds:regional.sourceIds} :
      {ballotId:b?.geography ?? null,value:b?.turnout ?? null, published:b?.turnoutPublished ?? false,
        scope:b ? (e.country === "slovenia" ? general : national) : constituencies,
        count:b?.turnoutVoters ?? null,electorate:b?.eligible ?? null,definition:b?.turnoutDefinition ?? null,sourceIds:b?.turnoutSourceIds ?? []},
    sources:e.sources,
  }};
}
