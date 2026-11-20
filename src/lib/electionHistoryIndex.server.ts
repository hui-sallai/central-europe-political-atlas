import { electionInstitutionalContext } from "./institutionalRegistry";
import { selectNationalBallot } from "./politicalNational";
import { nationalComparisonView, scopedComparisonView } from "./politicalComparisonBallots";
import { turnoutForDisplay, type PoliticalElectionView } from "./politicalExplorer";
import type { BallotElection } from "./politicalBallots";
import type { ArchiveElection } from "./electionHistoryComparison";

const national = {en:"Election-wide electorate", "zh-CN":"当届全体选民"};
const general = {en:"General-list electorate", "zh-CN":"普通名单选民"};
const territorial = {en:"Territorial constituencies I–X", "zh-CN":"境内第一至第十选区"};
const constituencies = {en:"Separate constituency electorates", "zh-CN":"按选区分别记录"};

export function nationalHistoryView(e: PoliticalElectionView): ArchiveElection {
  const view = nationalComparisonView(e);
  const rate = turnoutForDisplay(e);
  const rule = electionInstitutionalContext(e.electionId);
  // The country's primary ballot stays first for existing entry points.
  for (const ballot of e.national?.ballots ?? []) {
    if (ballot.definition.id === e.system.voteType) continue;
    const selected = selectNationalBallot(e,ballot.definition.id);
    if (selected) view.ballots.push(...nationalComparisonView(selected).ballots);
  }
  return {...view,history:{
    chamberId:rule?.chamber_id ?? null, legislatureId:null, systemId:rule?.electoral_system_id ?? null,
    dateBasis:null, endDate:e.national?.dateEnd ?? null, primaryBallot:e.system.voteType,
    turnout:{ballotId:null,value:rate.value, published:rate.value !== null && !rate.computed,
      scope:national, count:e.voters, electorate:e.eligibleVoters, definition:e.turnoutDefinition ?? null,
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
  return {...view,history:{
    chamberId, legislatureId:e.legislatureId, systemId:e.systemId, dateBasis:e.dateBasis,
    endDate:null, primaryBallot:b?.geography ?? (e.ballots.length === 1 ? e.ballots[0].geography : null),
    turnout:regional ? {ballotId:null,value:regional.value, published:regional.published, scope:territorial,
      count:regional.numerator, electorate:regional.denominator,definition:regional.definition,sourceIds:regional.sourceIds} :
      {ballotId:b?.geography ?? null,value:b?.turnout ?? null, published:b?.turnoutPublished ?? false,
        scope:b ? (e.country === "slovenia" ? general : national) : constituencies,
        count:b?.turnoutVoters ?? null,electorate:b?.eligible ?? null,definition:b?.turnoutDefinition ?? null,sourceIds:b?.turnoutSourceIds ?? []},
    sources:e.sources,
  }};
}
