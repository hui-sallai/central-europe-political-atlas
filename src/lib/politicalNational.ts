import type { PoliticalElectionView, PoliticalLocalText, PoliticalResult, PoliticalSource } from "./politicalExplorer";

export type VoteKind = "list" | "constituency" | "minority" | "other";
export type VoteDefinition = { id: string; kind: VoteKind; label: PoliticalLocalText; denominator: "valid_votes" | "ballots_cast" | "unknown"; seatScope: "whole_chamber" | "tier_only" | "unavailable"; sourceIds: string[]; /** Seats of the tier a tier-only ballot fills (Hungary: 93 national list seats). */ tierSeats?: number };
export type NationalRules = {
  nationalAllocation: string | null; districtAllocation: string | null;
  thresholds: Array<{ appliesTo: string; percent: number | null; description: PoliticalLocalText; sourceIds: string[] }> | null;
  minorityRepresentation: PoliticalLocalText | null; totalSeatsDefinition: PoliticalLocalText | null;
  sourceIds: string[];
};
/** The registered Hungarian scope is three or more parties; Chinese “两党以上” can include two. */
export function thresholdDescription(country: string | undefined, threshold: NonNullable<NationalRules["thresholds"]>[number], locale: keyof PoliticalLocalText) {
  const description = threshold.description[locale];
  const largerJointList = threshold.appliesTo === "joint list of more than two parties" || threshold.appliesTo === "joint party list of more than two parties";
  return country === "hungary" && locale === "zh-CN" && largerJointList
    ? description.replace("两党以上联合名单", "三个或更多政党的联合名单")
    : description;
}
export type TurnoutBasis = { numerator: "voters" | "envelopes_issued" | "ballots_cast" | "valid_ballots" | "unknown"; denominator: "registered_electorate" | "eligible_population" | "unknown"; definition: string | null; sourceIds: string[] };
/** Display the recorded count definitions in the interface language. */
export function turnoutFraction(basis: TurnoutBasis, locale: keyof PoliticalLocalText): string | null {
  if (basis.numerator === "unknown" || basis.denominator === "unknown") return null;
  const counts = {
    voters: { en: "Voters", "zh-CN": "实际投票人数" },
    envelopes_issued: { en: "Issued envelopes", "zh-CN": "发出的投票信封数" },
    ballots_cast: { en: "Ballots cast", "zh-CN": "投出的选票数" },
    valid_ballots: { en: "Valid ballots", "zh-CN": "有效选票数" },
    registered_electorate: { en: "registered voters", "zh-CN": "登记选民数" },
    eligible_population: { en: "eligible population", "zh-CN": "有投票资格的人口数" },
  };
  return counts[basis.numerator][locale] + " / " + counts[basis.denominator][locale];
}
export function outsideListKindLabel(kind: string, locale: keyof PoliticalLocalText) {
  const labels: Record<string, PoliticalLocalText> = {
    joint_candidates_without_list: {en: "Joint candidates without a list", "zh-CN": "未列入名单的联合候选人"},
    organisation_candidates_without_list: {en: "Organisation candidates without a list", "zh-CN": "未列入名单的组织提名候选人"},
    independent_candidate: {en: "Independent candidate", "zh-CN": "独立候选人"},
  };
  return labels[kind]?.[locale] ?? kind;
}

export type ElectionRound = { sourceHeading?: string; round: number; date: string; constituencies: number | null; eligible: number | null; voters: number | null; turnout: number | null; sourceIds: string[]; sourceUrl?: string; definition: string | null };
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

/** Find a ballot actually registered in the other election. A role match selects a view;
 * compatibility of statistics is tested separately against the two observations. */
export function counterpartBallot(selected: PoliticalElectionView, peer: PoliticalElectionView): NationalBallotView | undefined {
  const ballots = peer.national?.ballots ?? [];
  const exact = ballots.find(ballot => ballot.definition.id === selected.system.voteType);
  if (exact || !selected.national?.historicalAllocation || !peer.national?.historicalAllocation) return exact;
  const source = selected.national.ballots.find(ballot => ballot.definition.id === selected.system.voteType);
  if (!source?.round) return undefined;
  const matches = ballots.filter(ballot =>
    ballot.round === source.round && ballot.definition.kind === source.definition.kind &&
    ballot.definition.denominator === source.definition.denominator
  );
  return matches.length === 1 ? matches[0] : undefined;
}

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
