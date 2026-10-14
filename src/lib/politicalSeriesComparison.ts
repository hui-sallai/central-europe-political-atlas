import { descriptiveShare, type PoliticalElectionView, type PoliticalResult } from "./politicalExplorer";
import { germanOfficialSeries, type OfficialSeries } from "./politicalSeries";

export type VerifiedComparisonRow = { series: OfficialSeries; a: PoliticalResult | null; b: PoliticalResult | null; shareChange: number | null; votesChange: number | null; seatsChange: number | null; seatShareA: number | null; seatShareB: number | null; seatShareChange: number | null };
const difference = (a: number | null, b: number | null) => a === null || b === null ? null : b - a;

/** Registry IDs only: no name matching, aggregation, missing-to-zero conversion or inferred legal continuity. */
export function compareVerifiedSeries(a: PoliticalElectionView, b: PoliticalElectionView): VerifiedComparisonRow[] {
  if (a.electionId === b.electionId) return [];
  return germanOfficialSeries.flatMap(series => {
    const find = (e: PoliticalElectionView) => {
      const link = series.links.find(l => l.electionId === e.electionId);
      return link ? e.results.find(r => r.contestantId === link.contestantId) ?? null : null;
    };
    const x = find(a), y = find(b);
    if (!x && !y) return [];
    const seatShareA = x ? descriptiveShare(x.seats, a.totalSeats) : null;
    const seatShareB = y ? descriptiveShare(y.seats, b.totalSeats) : null;
    // Published vote shares have one decimal place. Round the subtraction at that precision, not at count-derived precision.
    const share = difference(x?.publishedVoteShare ?? null, y?.publishedVoteShare ?? null);
    return [{ series, a: x, b: y, shareChange: share === null ? null : Math.round(share * 10) / 10,
      votesChange: difference(x?.secondVotes ?? null, y?.secondVotes ?? null), seatsChange: difference(x?.seats ?? null, y?.seats ?? null),
      seatShareA, seatShareB, seatShareChange: difference(seatShareA, seatShareB) }];
  });
}

const csvCell = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
export function verifiedComparisonCsv(a: PoliticalElectionView, b: PoliticalElectionView, evidenceUrl: string, evidenceHash: string): string {
  const header = ["election_a", "date_a", "election_b", "date_b", "series_id", "series_label", "contestant_a", "label_a", "contestant_b", "label_b", "published_share_a_percent", "published_share_b_percent", "share_change_pp_b_minus_a", "votes_a", "votes_b", "votes_change_b_minus_a", "seats_a", "seats_b", "seats_change_b_minus_a", "seat_share_a_derived_percent", "seat_share_b_derived_percent", "seat_share_change_pp_b_minus_a", "vintage_a", "vintage_b", "identity_status", "relationship", "identity_source", "identity_sha256", "result_source_a", "result_source_b"];
  const published = (v: number | null | undefined) => v == null ? null : v.toFixed(1);
  return "\uFEFF" + [header.join(","), ...compareVerifiedSeries(a, b).map(r => [a.electionId,a.date,b.electionId,b.date,r.series.id,r.series.label,r.a?.contestantId,r.a?.nativeLabel,r.b?.contestantId,r.b?.nativeLabel,published(r.a?.publishedVoteShare),published(r.b?.publishedVoteShare),published(r.shareChange),r.a?.secondVotes,r.b?.secondVotes,r.votesChange,r.a?.seats,r.b?.seats,r.seatsChange,r.seatShareA,r.seatShareB,r.seatShareChange,a.resultVintage,b.resultVintage,"verified_official_longitudinal_series",r.series.relationship,evidenceUrl,evidenceHash,a.sources.find(s=>s.id===r.a?.sourceId)?.url,b.sources.find(s=>s.id===r.b?.sourceId)?.url].map(csvCell).join(","))].join("\n");
}
