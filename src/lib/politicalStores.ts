// Pure adapter from the political stores (the schema used by src/data/political/<country>/) to descriptive election
// views. It reads only what it is given: a country appears in the Political Explorer only when its stores are imported
// by politicalData.ts, which happens only after owner authorisation. No identity link, score or estimate is created here.
import type { PoliticalElectionView, PoliticalLocalText } from "./politicalExplorer";

type Provenance = { source_id: string };
export type PoliticalStores = {
  elections: Array<{ election_id: string; year: number; date: string; chamber: string; legislature_id: string; electoral_system_id: string; result_vintage: string }>;
  turnout: Array<{ election_id: string; eligible_voters: number | null; voters: number | null; valid_second_votes?: number | null; valid_votes?: number | null; published_turnout: number | null; turnout_definition?: string | null }>;
  results: Array<{ election_id: string; contestant_ref: string; second_votes?: number | null; votes?: number | null; published_vote_share: number | null; seats: number | null; provenance: Provenance[] }>;
  contestants: Array<{ contestant_id: string; historical_display_label: string }>;
  legislatures: Array<{ legislature_id: string; total_seats: number | null }>;
  systems: Array<{ electoral_system_id: string; system_family: string; allocation_method: string; base_seats: number | null; vote_type: string; notes: PoliticalLocalText; provenance: Provenance[] }>;
  sources: Array<{ source_id: string; dataset: string; url: string; raw_sha256?: string; retrieved_at?: string; licence_url?: string }>;
};
export type PoliticalCountryMeta = { slug: string; name: PoliticalLocalText; voteLabel: PoliticalLocalText; originalLanguage: string };

export function electionViewsFromStores(stores: PoliticalStores, country: PoliticalCountryMeta): PoliticalElectionView[] {
  return stores.elections.map((election) => {
    const counts = stores.turnout.find((row) => row.election_id === election.election_id)!;
    const legislature = stores.legislatures.find((row) => row.legislature_id === election.legislature_id)!;
    const system = stores.systems.find((row) => row.electoral_system_id === election.electoral_system_id)!;
    const rows = stores.results.filter((row) => row.election_id === election.election_id);
    const sourceIds = new Set([...rows.flatMap((row) => row.provenance.map((p) => p.source_id)), ...system.provenance.map((p) => p.source_id)]);
    return {
      electionId: election.election_id, year: election.year, date: election.date,
      resultVintage: election.result_vintage, validSecondVotes: counts.valid_second_votes ?? counts.valid_votes ?? null,
      totalSeats: legislature.total_seats, publishedTurnout: counts.published_turnout,
      eligibleVoters: counts.eligible_voters, voters: counts.voters,
      system: { family: system.system_family, allocationMethod: system.allocation_method, baseSeats: system.base_seats, voteType: system.vote_type },
      notes: system.notes,
      sources: stores.sources.filter((s) => sourceIds.has(s.source_id)).map((s) => ({ id: s.source_id, title: s.dataset, url: s.url, sha256: s.raw_sha256, retrievedAt: s.retrieved_at, licenceUrl: s.licence_url })),
      results: rows.map((row) => ({ contestantId: row.contestant_ref, nativeLabel: stores.contestants.find((c) => c.contestant_id === row.contestant_ref)!.historical_display_label, secondVotes: row.second_votes ?? row.votes ?? null, publishedVoteShare: row.published_vote_share, seats: row.seats, sourceId: row.provenance[0].source_id })),
      country: country.slug, countryName: country.name, chamber: election.chamber, voteLabel: country.voteLabel, originalLanguage: country.originalLanguage,
      turnoutDefinition: counts.turnout_definition ?? null,
    };
  });
}
