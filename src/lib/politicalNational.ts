import type { PoliticalElectionView, PoliticalLocalText, PoliticalResult, PoliticalSource } from "./politicalExplorer";

export type VoteKind = "list" | "constituency" | "minority" | "other";
export type VoteDefinition = { id: string; kind: VoteKind; label: PoliticalLocalText; denominator: "valid_votes" | "ballots_cast" | "unknown"; seatScope: "whole_chamber" | "tier_only" | "unavailable"; sourceIds: string[]; /** Seats of the tier a tier-only ballot fills (Hungary: 93 national list seats). */ tierSeats?: number };
export type NationalRules = {
  nationalAllocation: string | null; districtAllocation: string | null;
  thresholds: Array<{ appliesTo: string; percent: number | null; description: PoliticalLocalText; sourceIds: string[] }> | null;
  minorityRepresentation: PoliticalLocalText | null; totalSeatsDefinition: PoliticalLocalText | null;
  sourceIds: string[];
};
export type TurnoutBasis = { numerator: "voters" | "envelopes_issued" | "ballots_cast" | "valid_ballots" | "unknown"; denominator: "registered_electorate" | "eligible_population" | "unknown"; definition: string | null; sourceIds: string[] };
export type ElectionRound = { round: number; date: string; constituencies: number | null; eligible: number | null; voters: number | null; turnout: number | null; sourceIds: string[]; sourceUrl?: string; definition: string | null };
export function roundElectorateLabel(r:ElectionRound,locale:keyof PoliticalLocalText) {
  if (locale==="en") return `Round ${r.round} · ${r.constituencies===null?"national electorate":r.constituencies+" runoff constituencies"}`;
  return `第 ${r.round} 轮 · ${r.constituencies===null?"全国选民":r.constituencies+" 个复选选区"}`;
}
export type HistoricalAllocation = {
  territorialSeats: number; compensationSeats: number;
  statutory: { single_member: number; territorial_lists: number; national_compensation_minimum: number; total: number };
  transferred: number | null; compositionUrl?:string; compensationUrl?: string; sourceIds: string[]; unmatchedLists: {label: string; seats: number; compensation_votes: number}[];
};
export type NationalBallotView = { round?: number; sourceUrl?:string; definition: VoteDefinition; validVotes: number | null; invalidVotes: number | null; ballotsCast: number | null; results: PoliticalResult[] };
export type NationalContext = { systemId?: string; legislatureId?: string; rounds?: ElectionRound[]; historicalAllocation?: HistoricalAllocation; chamber: string; dateEnd: string | null; vintage: string; turnout: TurnoutBasis; rules: NationalRules; activeVote: VoteDefinition; ballots: NationalBallotView[]; /** "complete" only when every seat of the chamber is attributed to a ballot entity in the stores. */ chamberAttribution?: "complete" | "none"; seatTiers?: { nationalList: number; constituency: number; /** Constituency seats won by independent candidates (included in constituency, attributed to no row). */ independentConstituency?: number; /** Constituency seats won outside any list row, by kind and printed label (Hungary 2010); included in constituency, attributed to no row. */ outsideListConstituency?: { label: string; kind: string; seats: number }[] } | null };
export {voteDenominator,compatibleTurnout,compatibleVoteBasis} from "./politicalExplorer";

/** Existing legacy secondVotes fields remain aliases of the actively selected ballot, not a German assumption. */
export function selectNationalBallot(e: PoliticalElectionView, id: string): PoliticalElectionView | null {
  const ballot=e.national?.ballots.find(b=>b.definition.id===id);
  if(!ballot||!e.national)return null;
  const round = e.national.rounds?.find(r => r.round === ballot.round);
  return {...e, validSecondVotes:ballot.validVotes, results:ballot.results, voteLabel:ballot.definition.label,
    ...(round ? {publishedTurnout:round.turnout, eligibleVoters:round.eligible, voters:round.voters, turnoutDefinition:round.definition} : {}),
    system:{...e.system,voteType:id}, national:{...e.national,activeVote:ballot.definition,
      ...(round ? {turnout:{...e.national.turnout, definition:round.definition, sourceIds:round.sourceIds}} : {})}};

}
export function voteSeatDifference(e:PoliticalElectionView,r:PoliticalResult):number|null {
  if(!e.national||e.national.activeVote.kind!=="list"||e.national.activeVote.seatScope!=="whole_chamber"||r.publishedVoteShare===null||r.seats===null||e.totalSeats===null||e.totalSeats<=0)return null;
  return 100*r.seats/e.totalSeats-r.publishedVoteShare;
}
export function politicalPublicationProblems(country:string,sources:PoliticalSource[],authorisedCountries:readonly string[]) {
  const problems:string[]=[];
  if(!authorisedCountries.includes(country))problems.push("country_not_owner_authorised");
  if(!sources.length||sources.some(s=>!s.id||!s.sha256||!s.retrievedAt||!s.licenceUrl))problems.push("incomplete_source_evidence");
  return problems;
}
