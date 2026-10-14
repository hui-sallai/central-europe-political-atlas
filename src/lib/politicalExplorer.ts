/** Descriptive election views only. Identity continuity is not inferred here. */
export type PoliticalMeasure = "votes" | "vote_share" | "seats" | "seat_share";
export type PoliticalSource = { id: string; title: string; url: string; sha256?: string; retrievedAt?: string; licenceUrl?: string };
export type PoliticalResult = {
  contestantId: string;
  nativeLabel: string;
  secondVotes: number | null;
  publishedVoteShare: number | null;
  seats: number | null;
  sourceId: string;
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
};

export function descriptiveShare(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null) return null;
  if (!Number.isSafeInteger(numerator) || numerator < 0 || !Number.isSafeInteger(denominator) || denominator <= 0 || numerator > denominator) {
    throw new RangeError("Invalid descriptive-share inputs");
  }
  return 100 * numerator / denominator;
}

export function measureValue(result: PoliticalResult, election: PoliticalElectionView, measure: PoliticalMeasure): number | null {
  switch (measure) {
    case "votes": return result.secondVotes;
    case "vote_share": return descriptiveShare(result.secondVotes, election.validSecondVotes);
    case "seats": return result.seats;
    case "seat_share": return descriptiveShare(result.seats, election.totalSeats);
  }
}

/** Lists shown in the charts: every list that won seats, plus lists at or above one percent of published second votes. */
export function chartResults(election: PoliticalElectionView): PoliticalResult[] {
  return election.results.filter((result) => (result.seats ?? 0) > 0 || (result.publishedVoteShare ?? 0) >= 1).sort((a, b) => (b.secondVotes ?? 0) - (a.secondVotes ?? 0));
}

export type ElectionAggregate = { key: "turnout" | "eligible" | "voters" | "valid" | "seats" | "lists" | "seat_lists"; a: number | null; b: number | null; difference: number | null };

/** Election-level differences only. Verified party-level differences live in politicalSeriesComparison. */
export function compareElections(a: PoliticalElectionView, b: PoliticalElectionView): ElectionAggregate[] {
  const row = (key: ElectionAggregate["key"], x: number | null, y: number | null): ElectionAggregate => ({ key, a: x, b: y, difference: x === null || y === null ? null : y - x });
  const seatLists = (election: PoliticalElectionView) => election.results.filter((result) => (result.seats ?? 0) > 0).length;
  return [
    row("turnout", a.publishedTurnout, b.publishedTurnout), row("eligible", a.eligibleVoters, b.eligibleVoters), row("voters", a.voters, b.voters),
    row("valid", a.validSecondVotes, b.validSecondVotes), row("seats", a.totalSeats, b.totalSeats), row("lists", a.results.length, b.results.length), row("seat_lists", seatLists(a), seatLists(b)),
  ];
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
  const seatLists = (election: PoliticalElectionView) => election.results.filter((result) => (result.seats ?? 0) > 0).length;
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
