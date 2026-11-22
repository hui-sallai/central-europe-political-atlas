import type { PoliticalElectionView, PoliticalLocalText, PoliticalResult, PoliticalSource } from "./politicalExplorer";

import { roundScopeOf, type ScopedTurnout, type ScopedVoteDefinition } from "./politicalRoundScope";

export type VoteKind = "list" | "constituency" | "minority" | "other";
export type VoteDefinition = ScopedVoteDefinition & { id: string; kind: VoteKind; label: PoliticalLocalText; denominator: "valid_votes" | "ballots_cast" | "unknown"; seatScope: "whole_chamber" | "tier_only" | "unavailable"; sourceIds: string[]; /** Seats of the tier a tier-only ballot fills (Hungary: 93 national list seats). */ tierSeats?: number };
export type NationalRules = {
  nationalAllocation: string | null; districtAllocation: string | null;
  thresholds: Array<{ appliesTo: string; percent: number | null; description: PoliticalLocalText; sourceIds: string[] }> | null;
  minorityRepresentation: PoliticalLocalText | null; totalSeatsDefinition: PoliticalLocalText | null;
  sourceIds: string[];
};
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

export type BallotProvenance = {
  source_id: string;
  source_url?: string;
  source_record_id?: string;
  fields_covered?: string[];
  retrieved_at?: string;
  raw_snapshot?: {path: string; sha256: string};
  parser_version?: string;
  parser_sha256?: string;
  published_or_derived?: string;
};
export type BallotTurnoutRecord = ScopedTurnout & {
  election_id: string;
  vote_type?: string;
  country?: string;
  geography?: string;
  result_vintage?: string;
  eligible_voters: number | null;
  voters: number | null;
  published_turnout: number | null;
  derived_turnout?: number | null;
  valid_votes?: number | null;
  invalid_votes?: number | null;
  valid_second_votes?: number | null;
  invalid_second_votes?: number | null;
  ballots_cast?: number | null;
  ballots_in_urn?: number | null;
  voters_turned_out?: number;
  published_invalid_percent_of_voters?: number;
  round_outcome?: {decided: number; valid_undecided: number; invalid_round: number};
  round_2?: {date: string; constituencies: number; eligible_voters: number; voters: number; published_turnout: number};
  turnout_definition?: string | null;
  turnout_basis?: TurnoutBasis;
  provenance?: BallotProvenance[];
};
export type OutsideListHolder = {
  label: string; kind: string; seats: number;
  components?: {label: string; seats: number}[];
};
export type ElectionRound = {
  sourceHeading?: string; sourceBallotId?: string;
  round: number; date: string;
  electorateScope: "national" | "restricted";
  constituencyCount: number | null;
  /** Legacy restricted-electorate count. Use constituencyCount to count all constituencies. */
  constituencies: number | null;
  eligible: number | null; voters: number | null; turnout: number | null;
  sourceIds: string[]; sourceUrl?: string; definition: string | null;
};
export function roundElectorateLabel(r: ElectionRound, locale: keyof PoliticalLocalText) {
  if (r.electorateScope === "national" && r.constituencyCount != null) {
    return locale === "en" ? `Round ${r.round} · national electorate, all ${r.constituencyCount} constituencies`
      : `第 ${r.round} 轮 · 全国选民，全部 ${r.constituencyCount} 个选区`;
  }
  if (locale === "en") return `Round ${r.round} · ${r.constituencies === null ? "national electorate" : r.constituencies + " runoff constituencies"}`;
  return `第 ${r.round} 轮 · ${r.constituencies === null ? "全国选民" : r.constituencies + " 个复选选区"}`;
}
export type HistoricalAllocation = {
  territorialSeats: number; compensationSeats: number;
  statutory: { single_member: number; territorial_lists: number; national_compensation_minimum: number; total: number };
  transferred: number | null; compositionUrl?:string; outsideListSourceUrl?: string; compensationUrl?: string; sourceIds: string[]; unmatchedLists: {label: string; seats: number; compensation_votes: number}[];
};
export type NationalBallotView = { turnoutRecord?: BallotTurnoutRecord; date?: string; dateStart?: string; dateEnd?: string; round?: number; sourceUrl?:string; definition: VoteDefinition; validVotes: number | null; invalidVotes: number | null; ballotsCast: number | null; results: PoliticalResult[] };
export type NationalContext = { systemId?: string; legislatureId?: string; rounds?: ElectionRound[]; historicalAllocation?: HistoricalAllocation; chamber: string; dateEnd: string | null; vintage: string; turnout: TurnoutBasis; rules: NationalRules; activeVote: VoteDefinition; ballots: NationalBallotView[]; /** "complete" only when every seat of the chamber is attributed to a ballot entity in the stores. */ chamberAttribution?: "complete" | "none"; seatTiers?: { nationalList: number; constituency: number; /** Constituency seats won by independent candidates (included in constituency, attributed to no row). */ independentConstituency?: number; /** Constituency seats won outside any list row, by kind and printed label (Hungary 2010); included in constituency, attributed to no row. */ outsideListConstituency?: OutsideListHolder[] } | null };
export {voteDenominator,compatibleTurnout,compatibleVoteBasis} from "./politicalExplorer";

/** Find a ballot actually registered in the other election. A role match selects a view;
 * compatibility of statistics is tested separately against the two observations. */
export function counterpartBallot(selected: PoliticalElectionView, peer: PoliticalElectionView): NationalBallotView | undefined {
  const ballots = peer.national?.ballots ?? [];
  const exact = ballots.find(ballot => ballot.definition.id === selected.system.voteType);
  if (exact || !selected.national?.historicalAllocation || !peer.national?.historicalAllocation) return exact;
  const source = selected.national.ballots.find(ballot => ballot.definition.id === selected.system.voteType);
  if (!source) return undefined;
  const matches = ballots.filter(ballot =>
    (source.round != null && ballot.round === source.round ||
      source.definition.kind === "list" && [source, ballot].some(b => roundScopeOf(b.definition) === "valid_round_composite")) &&
    ballot.definition.kind === source.definition.kind &&
    ballot.definition.denominator === source.definition.denominator
  );
  return matches.length === 1 ? matches[0] : undefined;
}

/** Existing legacy secondVotes fields remain aliases of the actively selected ballot, not a German assumption. */
export function selectNationalBallot(e: PoliticalElectionView, id: string): PoliticalElectionView | null {
  const ballot=e.national?.ballots.find(b=>b.definition.id===id);
  if(!ballot||!e.national)return null;
  const round = e.national.rounds?.find(r => r.round === ballot.round);
  const record = ballot.turnoutRecord;
  const basis = record?.turnout_basis;
  // In the earlier two-round returns some candidate ballots reference turnout
  // published in the separate election-round summary.
  const reported = basis != null || ballot.definition.roundScope != null;
  const selectedBasis: TurnoutBasis = basis ?? (reported ? {
    numerator: "unknown", denominator: "unknown", definition: record?.turnout_definition ?? null,
    sourceIds: [...new Set((record?.provenance ?? []).map(p => p.source_id))],
  } : round ? {...e.national.turnout, definition:round.definition, sourceIds:round.sourceIds} : e.national.turnout);
  const turnout = reported && record ? {
    publishedTurnout: record.published_turnout, eligibleVoters: record.eligible_voters, voters: record.voters,
    turnoutDefinition: record.turnout_definition ?? basis?.definition ?? null,
  } : round ? {
    publishedTurnout: round.turnout, eligibleVoters: round.eligible, voters: round.voters, turnoutDefinition: round.definition,
  } : {};
  return {...e, ...turnout, validSecondVotes:ballot.validVotes, results:ballot.results, voteLabel:ballot.definition.label,
    system:{...e.system,voteType:id}, national:{...e.national,activeVote:ballot.definition,
      turnout: selectedBasis}};
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
