import type { PoliticalElectionView, PoliticalLocalText, PoliticalResult, PoliticalSource } from "./politicalExplorer";

export type VoteKind = "list" | "constituency" | "minority" | "other";
export type VoteDefinition = { id: string; kind: VoteKind; label: PoliticalLocalText; denominator: "valid_votes" | "ballots_cast" | "unknown"; seatScope: "whole_chamber" | "tier_only" | "unavailable"; sourceIds: string[] };
export type NationalRules = {
  nationalAllocation: string | null; districtAllocation: string | null;
  thresholds: Array<{ appliesTo: string; percent: number | null; description: PoliticalLocalText; sourceIds: string[] }> | null;
  minorityRepresentation: PoliticalLocalText | null; totalSeatsDefinition: PoliticalLocalText | null;
  sourceIds: string[];
};
export type TurnoutBasis = { numerator: "voters" | "envelopes_issued" | "ballots_cast" | "unknown"; denominator: "registered_electorate" | "eligible_population" | "unknown"; definition: string | null; sourceIds: string[] };
export type NationalBallotView = { definition: VoteDefinition; validVotes: number | null; invalidVotes: number | null; ballotsCast: number | null; results: PoliticalResult[] };
export type NationalContext = { chamber: string; dateEnd: string | null; vintage: string; turnout: TurnoutBasis; rules: NationalRules; activeVote: VoteDefinition; ballots: NationalBallotView[] };
export {voteDenominator,compatibleTurnout,compatibleVoteBasis} from "./politicalExplorer";

/** Existing legacy secondVotes fields remain aliases of the actively selected ballot, not a German assumption. */
export function selectNationalBallot(e: PoliticalElectionView, id: string): PoliticalElectionView | null {
  const ballot=e.national?.ballots.find(b=>b.definition.id===id);
  if(!ballot||!e.national)return null;
  return {...e,validSecondVotes:ballot.validVotes,results:ballot.results,voteLabel:ballot.definition.label,system:{...e.system,voteType:id},national:{...e.national,activeVote:ballot.definition}};
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
