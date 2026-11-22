import type { BallotElection, ElectionBallot } from "./politicalBallots";
import { chamberSeats, seatMeasureScope, shareForDisplay, turnoutForDisplay, voteDenominator, type PoliticalElectionView, type PoliticalLocalText, type PoliticalSource } from "./politicalExplorer";

import { roundElectorateLabel, type ElectionRound } from "./politicalNational";
import type { ScopedVoteDefinition, AttributionBasis } from "./politicalRoundScope";

type Text = PoliticalLocalText;
const text = (en: string, zh: string): Text => ({en, "zh-CN":zh});

export type ComparisonBallot = ScopedVoteDefinition & {
  id: string; geographyKey?: "vote_type"; pointsBallot: boolean; turnoutScope?: Text; seatScopeLabel?: Text; sourceIds?: string[]; seatWinnersOnly?: boolean; label: Text; basis: Text; seatScope: number | null; turnout: number | null; turnoutPublished: boolean;
  voteType: string; voteLabel: Text; voteDenominator: number | null; round?: number; date?: string; dateStart?: string; dateEnd?: string; sourceUrl?:string;
  rows: { id: string; contestantId: string; name: string; votes: number | null; share: number | null; published: boolean; seats: number | null; points: number | null;
    attributionBasis?: AttributionBasis; districtSeats?:number|null; territorialSeats?:number|null; compensationSeats?:number|null; fragmentVotes?:number|null; districtSeatsThisRound?:number|null; districtSeatsBasis?:"published"|"derived"; sourceIds:string[] }[];
};
export type ComparisonElection = {
  id: string; date: string; chamber: string; seats: number | null; slots: number | null; rules: Text; ballots: ComparisonBallot[];
  sources?: PoliticalSource[]; history?: {sources:PoliticalSource[]};
};
export type ComparisonIndex = Record<string, ComparisonElection[]>;
export function comparisonSourceIndex(election: ComparisonElection) {
  return election.sources ?? election.history?.sources ?? [];
}

const shareDefinitions: Record<ElectionBallot["shareBasis"], Text> = {
  valid_votes:text("Share of valid votes", "占有效票比例"),
  ballots_cast:text("Share of ballots cast (includes invalid ballots)", "占所投选票比例（含无效票）"),
  candidate_votes:text("Share of candidate votes", "占候选人票数比例"),
  points:text("Ranked-ballot points", "排序选票积分"),
  unavailable:text("Vote-share denominator unavailable", "得票率分母未收录"),
};
export function scopedComparisonView(e: BallotElection): ComparisonElection {
  return {
    id:e.id, date:e.date, chamber:e.chamber, seats:e.totalSeats, slots:e.seatSlots, rules:e.rules, sources:e.sources,
    ballots:e.ballots.map(b=>({
      id:b.geography, pointsBallot:b.shareBasis==="points", label:b.label, basis:shareDefinitions[b.shareBasis], seatScope:b.totalSeats,
      voteType:b.voteType, voteLabel:b.voteLabel, voteDenominator:b.shareBasis==="valid_votes"?b.valid:b.shareBasis==="ballots_cast"?b.cast:null,
      turnout:b.turnout, turnoutPublished:b.turnoutPublished, sourceIds:b.sourceIds,
      rows:b.results.map(r=>({id:r.id, contestantId:r.contestantId, name:r.name, votes:r.votes,
        share:r.publishedShare??r.derivedShare, published:r.publishedShare!==null,
        seats:r.seats, points:r.points,sourceIds:r.sourceIds})),
    })),
  };
}

export function roundScope(round: ElectionRound): Text {
  if (round.constituencyCount != null && round.electorateScope === "national")
    return text(roundElectorateLabel(round, "en"), roundElectorateLabel(round, "zh-CN"));
  return round.constituencies === null
    ? text(`Round ${round.round} · registered electorate`,`第 ${round.round} 轮 · 登记选民`)
    : text(`Round ${round.round} · ${round.constituencies} constituencies`,`第 ${round.round} 轮 · ${round.constituencies} 个选区`);
}

export function nationalComparisonView(e: PoliticalElectionView): ComparisonElection {
  const scope=seatMeasureScope(e);
  const definition=e.national?.activeVote;
  const active=e.national?.ballots.find(b=>b.definition.id===e.system.voteType);
  const round=e.national?.rounds?.find(r=>r.round===active?.round);
  const turnout=turnoutForDisplay(e);
  const rate=round ? round.turnout : turnout.value;
  const basis=definition ? shareDefinitions[definition.denominator==="unknown"?"unavailable":definition.denominator] : shareDefinitions.valid_votes;
  return {
    id:e.electionId, date:e.date, chamber:e.chamber??"—", seats:e.totalSeats, slots:null, rules:e.notes,sources:e.sources,
    ballots:[{
      id:e.system.voteType, voteType:e.system.voteType, voteLabel:definition?.label??e.voteLabel??text(e.system.voteType,e.system.voteType), geographyKey:"vote_type", pointsBallot:false,
      seatWinnersOnly:e.resultCoverage==="seat_winning_lists_only", label:definition?.label??e.voteLabel??text(e.system.voteType,e.system.voteType),basis,
      round:active?.round,date:active?.date ?? round?.date, dateStart:active?.dateStart,dateEnd:active?.dateEnd,
      roundScope:definition?.roundScope, rounds:definition?.rounds, geographicScope:definition?.geographicScope,
      attributionBasis:definition?.attributionBasis,sourceUrl:active?.sourceUrl,voteDenominator:voteDenominator(e),
      turnout:rate,turnoutPublished:rate!==null && (round ? true : !turnout.computed),
      turnoutScope:definition?.roundScope === "valid_round_composite"
        ? text("District results from different polling rounds have no single electorate or turnout rate", "各地区取自不同有效轮次，没有单一选民范围和投票率")
        : round ? roundScope(round) : text("Election-wide turnout", "当届全体选民投票率"),
      sourceIds:[...new Set([...(definition?.sourceIds ?? []),
        ...e.results.flatMap(row=>row.chamberSeatSourceId?[row.sourceId,row.chamberSeatSourceId]:[row.sourceId])])],
      seatScopeLabel:scope === "whole_chamber" ? text("Whole-chamber seat-share denominator","全院席位占比分母") :
        scope === "national_list_tier" ? text("List-tier seat-share denominator","名单层级席位占比分母") : undefined,
      seatScope:scope==="whole_chamber"?e.totalSeats:scope==="national_list_tier"?definition?.tierSeats??null:null,
      rows:e.results.map(r=>{
        const share=shareForDisplay(r,e);
        return {id:r.contestantId,contestantId:r.contestantId,name:r.nativeLabel,votes:r.secondVotes,
          share:share.value,published:!share.computed,seats:scope==="whole_chamber"?chamberSeats(r,e):scope==="national_list_tier"?r.seats:null,
          attributionBasis:r.attribution_basis,points:null,districtSeats:r.constituencySeats,territorialSeats:r.territorialSeats,
          compensationSeats:r.compensationSeats,fragmentVotes:r.fragmentVotes,
          districtSeatsThisRound:r.districtSeatsThisRound,districtSeatsBasis:r.districtSeatsBasis,
          sourceIds:[...new Set([r.sourceId,...(r.chamberSeatSourceId?[r.chamberSeatSourceId]:[])])]};
      }),
    }],
  };
}
