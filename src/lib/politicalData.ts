// Imported only by the two Politics server routes, never the global data module.
import elections from "@/data/political/germany/elections.json";
import turnout from "@/data/political/germany/election_turnout.json";
import results from "@/data/political/germany/election_results.json";
import contestants from "@/data/political/germany/electoral_contestants.json";
import legislatures from "@/data/political/germany/legislatures.json";
import systems from "@/data/political/germany/electoral_systems.json";
import sources from "@/data/political/germany/political_source_registry.json";
import type { PoliticalElectionView } from "./politicalExplorer";

export function politicalElectionViews(): PoliticalElectionView[] {
  return elections.map(election => {
    const counts = turnout.find(row => row.election_id === election.election_id)!;
    const legislature = legislatures.find(row => row.legislature_id === election.legislature_id)!;
    const system = systems.find(row => row.electoral_system_id === election.electoral_system_id)!;
    const rows = results.filter(row => row.election_id === election.election_id);
    const sourceIds = new Set([...rows.flatMap(row => row.provenance.map(p => p.source_id)), ...system.provenance.map(p => p.source_id)]);
    return {
      electionId: election.election_id, year: election.year, date: election.date,
      resultVintage: election.result_vintage, validSecondVotes: counts.valid_second_votes,
      totalSeats: legislature.total_seats, publishedTurnout: counts.published_turnout,
      notes: system.notes,
      sources: sources.filter(s => sourceIds.has(s.source_id)).map(s => ({ id: s.source_id, title: s.dataset, url: s.url, sha256: s.raw_sha256, retrievedAt: s.retrieved_at, licenceUrl: s.licence_url })),
      results: rows.map(row => ({ contestantId: row.contestant_ref, nativeLabel: contestants.find(c => c.contestant_id === row.contestant_ref)!.historical_display_label, secondVotes: row.second_votes, publishedVoteShare: row.published_vote_share, seats: row.seats, sourceId: row.provenance[0].source_id })),
    };
  });
}
