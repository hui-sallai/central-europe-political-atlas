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
export type PoliticalElectionView = {
  electionId: string;
  year: number;
  date: string;
  resultVintage: string;
  validSecondVotes: number;
  totalSeats: number;
  publishedTurnout: number | null;
  notes: { en: string; "zh-CN": string };
  sources: PoliticalSource[];
  results: PoliticalResult[];
};

export function descriptiveShare(numerator: number | null, denominator: number): number | null {
  if (numerator === null) return null;
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
