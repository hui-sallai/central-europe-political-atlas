/** Descriptive election views only. Identity continuity is not inferred here. */
import type { NationalContext } from "./politicalNational";
export type PoliticalMeasure = "votes" | "vote_share" | "seats" | "seat_share";
export type PoliticalSource = { id: string; title: string; url: string; sha256?: string; retrievedAt?: string; licenceUrl?: string; institution?: string };
export type PoliticalResult = {
  contestantId: string;
  nativeLabel: string;
  secondVotes: number | null;
  publishedVoteShare: number | null;
  /** Seats of this row's own tier: whole-chamber seats where the ballot's seat scope is the whole chamber, otherwise the tier's seats (Hungary: national list seats). */
  seats: number | null;
  /** Single-member constituency seats, only where every seat of the chamber is attributed. */
  constituencySeats?: number | null;
  /** Whole-chamber seats (list plus constituency), only where every seat of the chamber is attributed. */
  chamberSeats?: number | null;
  sourceId: string;
  votes?: number | null;
  voteType?: string;
  contestantKind?: string;
  partyId?: string | null;
  memberPartyIds?: string[];
};
export type PoliticalLocalText = { en: string; "zh-CN": string };
export type PoliticalCountryView = { slug: string; name: PoliticalLocalText; elections: PoliticalElectionView[] };
export type PoliticalElectionView = {
  electionId: string;
  year: number;
  date: string;
  resultVintage: string;
  /** Valid list votes of the election (Germany: valid second votes). */
  validSecondVotes: number | null;
  /** Null when the official total is not established; a missing total is never replaced by a partial sum. */
  totalSeats: number | null;
  country?: string;
  countryName?: PoliticalLocalText;
  chamber?: string;
  voteLabel?: PoliticalLocalText;
  originalLanguage?: string;
  turnoutDefinition?: string | null;
  publishedTurnout: number | null;
  eligibleVoters: number | null;
  voters: number | null;
  system: { family: string; allocationMethod: string; baseSeats: number | null; voteType: string };
  notes: { en: string; "zh-CN": string };
  sources: PoliticalSource[];
  results: PoliticalResult[];
  national?: NationalContext;
};

export function descriptiveShare(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null) return null;
  if (!Number.isSafeInteger(numerator) || numerator < 0 || !Number.isSafeInteger(denominator) || denominator <= 0 || numerator > denominator) {
    throw new RangeError("Invalid descriptive-share inputs");
  }
  return 100 * numerator / denominator;
}
export function voteDenominator(e:PoliticalElectionView):number|null {
  if(!e.national)return e.validSecondVotes;
  const b=e.national.ballots.find(b=>b.definition.id===e.national!.activeVote.id);
  return e.national.activeVote.denominator==="valid_votes"?b?.validVotes??null:e.national.activeVote.denominator==="ballots_cast"?b?.ballotsCast??null:null;
}
/** The published share, or the share computed within the active ballot where the source prints none. Never a mix of ballots. */
export function shareForDisplay(result:PoliticalResult,e:PoliticalElectionView):{value:number|null;computed:boolean} {
  if(result.publishedVoteShare!==null)return{value:result.publishedVoteShare,computed:false};
  return{value:descriptiveShare(result.secondVotes,voteDenominator(e)),computed:true};
}
/** The published turnout, or voters / registered electorate where the source prints counts but no percentage. */
export function turnoutForDisplay(e:PoliticalElectionView):{value:number|null;computed:boolean} {
  if(e.publishedTurnout!==null)return{value:e.publishedTurnout,computed:false};
  const basis=e.national?.turnout;
  if(basis?.numerator!=="voters"||basis.denominator!=="registered_electorate"||e.voters===null||!e.eligibleVoters)return{value:null,computed:false};
  return{value:100*e.voters/e.eligibleVoters,computed:true};
}
export function compatibleTurnout(a:PoliticalElectionView,b:PoliticalElectionView):boolean {
  const x=a.national?.turnout,y=b.national?.turnout;
  return Boolean(x&&y&&x.numerator!=="unknown"&&x.denominator!=="unknown"&&x.numerator===y.numerator&&x.denominator===y.denominator&&x.definition&&x.definition===y.definition);
}
export function compatibleVoteBasis(a:PoliticalElectionView,b:PoliticalElectionView):boolean {
  const x=a.national?.activeVote,y=b.national?.activeVote;
  return Boolean(x&&y&&x.denominator!=="unknown"&&x.kind===y.kind&&x.id===y.id&&x.denominator===y.denominator);
}

/**
 * What the seat figures of an election describe. "whole_chamber": every seat of the chamber is attributed to a ballot entity, so
 * seats ÷ chamber size is whole-chamber representation. "national_list_tier": only the list tier is held, so seats ÷ the tier's size is
 * a list-tier share and must never be read as representation in the chamber. "unavailable": no seat scope is established.
 */
export type SeatMeasureScope = "whole_chamber" | "national_list_tier" | "unavailable";
export function seatMeasureScope(e: PoliticalElectionView): SeatMeasureScope {
  if (!e.national || e.national.activeVote.seatScope === "whole_chamber") return "whole_chamber";
  if (e.national.activeVote.seatScope === "tier_only") return e.national.chamberAttribution === "complete" ? "whole_chamber" : "national_list_tier";
  return "unavailable";
}
/** Whole-chamber seats of a row, or null where the chamber is not fully attributed. Never list-tier seats. */
export function chamberSeats(result: PoliticalResult, e: PoliticalElectionView): number | null {
  if (!e.national || e.national.activeVote.seatScope === "whole_chamber") return result.seats;
  return e.national.activeVote.seatScope === "tier_only" && e.national.chamberAttribution === "complete" ? result.chamberSeats ?? null : null;
}
/** Whole-chamber seats ÷ chamber size × 100, or null where whole-chamber attribution is not established. */
export function chamberSeatShare(result: PoliticalResult, e: PoliticalElectionView): number | null {
  return descriptiveShare(chamberSeats(result, e), e.totalSeats);
}
/** National list seats ÷ the list tier's size × 100 (Hungary: 93), only for a tier-only ballot. */
export function listTierSeatShare(result: PoliticalResult, e: PoliticalElectionView): number | null {
  const v = e.national?.activeVote;
  return v?.seatScope === "tier_only" && v.tierSeats ? descriptiveShare(result.seats, v.tierSeats) : null;
}
export function measureValue(result: PoliticalResult, election: PoliticalElectionView, measure: PoliticalMeasure): number | null {
  const scope = seatMeasureScope(election);
  switch (measure) {
    case "votes": return result.secondVotes;
    case "vote_share": return descriptiveShare(result.secondVotes, voteDenominator(election));
    case "seats": return scope === "whole_chamber" ? chamberSeats(result, election) : scope === "national_list_tier" ? result.seats : null;
    case "seat_share": return scope === "whole_chamber" ? chamberSeatShare(result, election) : scope === "national_list_tier" ? listTierSeatShare(result, election) : null;
  }
}
/** Seats used to decide which lists "won seats": whole-chamber seats where attributed, otherwise the tier's seats. */
export function seatsWon(result: PoliticalResult, e: PoliticalElectionView): number {
  return (seatMeasureScope(e) === "whole_chamber" ? chamberSeats(result, e) : result.seats) ?? 0;
}

/** Lists shown in the charts: every list that won seats, plus lists at or above one percent of the selected ballot. */
export function chartResults(election: PoliticalElectionView): PoliticalResult[] {
  return election.results.filter((result) => seatsWon(result, election) > 0 || (shareForDisplay(result, election).value ?? 0) >= 1).sort((a, b) => (b.secondVotes ?? 0) - (a.secondVotes ?? 0));
}

export type ElectionAggregate = { key: "turnout" | "eligible" | "voters" | "valid" | "seats" | "lists" | "seat_lists"; a: number | null; b: number | null; difference: number | null };

/** Election-level differences only. Verified party-level differences live in politicalSeriesComparison. */
export function compareElections(a: PoliticalElectionView, b: PoliticalElectionView): ElectionAggregate[] {
  const row = (key: ElectionAggregate["key"], x: number | null, y: number | null): ElectionAggregate => ({ key, a: x, b: y, difference: x === null || y === null ? null : y - x });
  const seatLists = (election: PoliticalElectionView) => election.results.filter((result) => seatsWon(result, election) > 0).length;
  return [
    { ...row("turnout", a.publishedTurnout, b.publishedTurnout), difference: a.national || b.national ? compatibleTurnout(a,b) && a.publishedTurnout!==null && b.publishedTurnout!==null ? b.publishedTurnout-a.publishedTurnout : null : a.turnoutDefinition===b.turnoutDefinition ? row("turnout",a.publishedTurnout,b.publishedTurnout).difference : null }, row("eligible", a.eligibleVoters, b.eligibleVoters), row("voters", a.voters, b.voters),
    row("valid", a.validSecondVotes, b.validSecondVotes), row("seats", a.totalSeats, b.totalSeats), row("lists", a.results.length, b.results.length), row("seat_lists", seatLists(a), seatLists(b)),
  ].map(r=>a.country&&b.country&&a.country!==b.country?{...r,difference:null}:r.key==="seat_lists"&&seatMeasureScope(a)!==seatMeasureScope(b)?{...r,difference:null}:(["voters","eligible"].includes(r.key)&&(a.national||b.national)&&!compatibleTurnout(a,b))||(["valid","lists","seat_lists"].includes(r.key)&&(a.national||b.national)&&!compatibleVoteBasis(a,b))?{...r,difference:null}:r);
}

export type AlignedLabelRow = { label: string; a: PoliticalResult | null; b: PoliticalResult | null };

/**
 * Display alignment by identical official ballot label. It is not an identity link: a renamed list appears on two
 * rows, and two unrelated lists with the same label would share one. No value is computed across the two elections.
 */
export function alignByLabel(a: PoliticalElectionView, b: PoliticalElectionView): AlignedLabelRow[] {
  const rows = new Map<string, AlignedLabelRow>();
  for (const result of a.results) rows.set(result.nativeLabel, { label: result.nativeLabel, a: result, b: null });
  for (const result of b.results) { const row = rows.get(result.nativeLabel); if (row) row.b = result; else rows.set(result.nativeLabel, { label: result.nativeLabel, a: null, b: result }); }
  return [...rows.values()].sort((x, y) => Math.max(y.a?.secondVotes ?? 0, y.b?.secondVotes ?? 0) - Math.max(x.a?.secondVotes ?? 0, x.b?.secondVotes ?? 0));
}

export type CountryComparisonRow = { key: "date" | "chamber" | "vote" | "turnout" | "valid" | "seats" | "lists" | "seat_lists" | "allocation" | "base_seats"; a: string | number | null; b: string | number | null };

/**
 * Side-by-side facts for two elections in different countries. Nothing is subtracted, ranked or normalised across
 * countries: electoral systems, chambers and list definitions differ, and the elections may be years apart.
 */
export function compareCountries(a: PoliticalElectionView, b: PoliticalElectionView): { rows: CountryComparisonRow[]; yearsApart: number; sameAllocationMethod: boolean } {
  // Across countries only whole-chamber representation is set side by side; a list-tier count is "not established" here.
  const seatLists = (election: PoliticalElectionView) => seatMeasureScope(election) === "whole_chamber" ? election.results.filter((result) => seatsWon(result, election) > 0).length : null;
  const row = (key: CountryComparisonRow["key"], pick: (election: PoliticalElectionView) => string | number | null): CountryComparisonRow => ({ key, a: pick(a), b: pick(b) });
  return {
    rows: [
      row("date", (e) => e.date), row("chamber", (e) => e.chamber ?? null), row("vote", (e) => e.system.voteType), row("turnout", (e) => e.publishedTurnout),
      row("valid", (e) => e.validSecondVotes), row("seats", (e) => e.totalSeats), row("lists", (e) => e.results.length), row("seat_lists", seatLists),
      row("allocation", (e) => e.system.allocationMethod), row("base_seats", (e) => e.system.baseSeats),
    ],
    yearsApart: Math.abs(a.year - b.year),
    sameAllocationMethod: a.system.allocationMethod === b.system.allocationMethod,
  };
}
