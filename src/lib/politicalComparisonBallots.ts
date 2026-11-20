import type { BallotElection, ElectionBallot } from "./politicalBallots";
import { chamberSeats, seatMeasureScope, shareForDisplay, turnoutForDisplay, type PoliticalElectionView, type PoliticalLocalText } from "./politicalExplorer";

type Text = PoliticalLocalText;
const text = (en: string, zh: string): Text => ({en, "zh-CN":zh});

export type ComparisonBallot = {
  id: string; geographyKey?: "vote_type"; pointsBallot: boolean; turnoutScope?: Text; seatScopeLabel?: Text; sourceIds?: string[]; seatWinnersOnly?: boolean; label: Text; basis: Text; seatScope: number | null; turnout: number | null; turnoutPublished: boolean;
  // The comparison uses only recorded labels, shares and seats. Exact ballot totals and original sources are linked on the result page.
  rows: { id: string; name: string; share: number | null; published: boolean; seats: number | null; points: number | null }[];
};
export type ComparisonElection = {
  id: string; date: string; chamber: string; seats: number | null; slots: number | null; rules: Text; ballots: ComparisonBallot[];
};
export type ComparisonIndex = Record<string, ComparisonElection[]>;

const shareDefinitions: Record<ElectionBallot["shareBasis"], Text> = {
  valid_votes:text("Share of valid votes", "占有效票比例"),
  ballots_cast:text("Share of ballots cast (includes invalid ballots)", "占所投选票比例（含无效票）"),
  candidate_votes:text("Share of candidate votes", "占候选人票数比例"),
  points:text("Ranked-ballot points", "排序选票积分"),
  unavailable:text("Vote-share denominator unavailable", "得票率分母未收录"),
};
export function scopedComparisonView(e: BallotElection): ComparisonElection {
  return {
    id:e.id, date:e.date, chamber:e.chamber, seats:e.totalSeats, slots:e.seatSlots, rules:e.rules,
    ballots:e.ballots.map(b=>({
      id:b.geography, pointsBallot:b.shareBasis==="points", label:b.label, basis:shareDefinitions[b.shareBasis], seatScope:b.totalSeats,
      turnout:b.turnout, turnoutPublished:b.turnoutPublished, sourceIds:b.sourceIds,
      rows:b.results.map(r=>({id:r.id, name:r.name, share:r.publishedShare??r.derivedShare, published:r.publishedShare!==null,
        seats:r.seats, points:r.points})),
    })),
  };
}

export function nationalComparisonView(e: PoliticalElectionView): ComparisonElection {
  const scope=seatMeasureScope(e);
  const turnout=turnoutForDisplay(e);
  const basis=e.national ? shareDefinitions[e.national.activeVote.denominator==="unknown"?"unavailable":e.national.activeVote.denominator] : shareDefinitions.valid_votes;
  return {
    id:e.electionId, date:e.date, chamber:e.chamber??"—", seats:e.totalSeats, slots:null, rules:e.notes,
    ballots:[{
      id:e.system.voteType, geographyKey:"vote_type", pointsBallot:false, seatWinnersOnly:e.resultCoverage==="seat_winning_lists_only", label:e.voteLabel??text(e.system.voteType,e.system.voteType), basis,
      turnout:turnout.value, turnoutPublished:turnout.value !== null && !turnout.computed,
      turnoutScope:text("Election-wide turnout", "当届全体选民投票率"),
      sourceIds:[...new Set([...(e.national?.activeVote.sourceIds ?? []),
        ...e.results.flatMap(row=>row.chamberSeatSourceId?[row.sourceId,row.chamberSeatSourceId]:[row.sourceId])])],
      seatScopeLabel:scope === "whole_chamber" ? text("Whole-chamber seat-share denominator","全院席位占比分母") :
        scope === "national_list_tier" ? text("National-list seat-share denominator","全国名单层级席位占比分母") : undefined,
      seatScope:scope==="whole_chamber"?e.totalSeats:scope==="national_list_tier"?e.national?.activeVote.tierSeats??null:null,
      rows:e.results.map(r=>{
        const share=shareForDisplay(r,e);
        return {id:r.contestantId,name:r.nativeLabel,share:share.value,published:!share.computed,
          seats:scope==="whole_chamber"?chamberSeats(r,e):scope==="national_list_tier"?r.seats:null,points:null};
      }),
    }],
  };
}
