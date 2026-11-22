"use client";
import { useState } from "react";
import { toCsv } from "@/lib/researchSnapshot";
import type { PoliticalElectionView } from "@/lib/politicalExplorer";

type ResultRow = Record<string, unknown> & { vote_type: string; contestant_ref: string; election_id: string };

// Raw observations retain their own field names; chamber-level totals have a separate scope.
function exportBody(election: PoliticalElectionView, rows: ResultRow[], format: "csv" | "json") {
  const national = election.national;
  const tiers = national?.seatTiers;
  const history = national?.historicalAllocation;
  const outside = tiers?.outsideListConstituency ?? [];
  const composition = tiers ? {
    chamber_seats: election.totalSeats,
    district_seats: tiers.constituency,
    independent_district_seats: tiers.independentConstituency ?? outside.filter(item => item.kind === "independent_candidate").reduce((n, item) => n + item.seats, 0),
    ...(history ? {
      combined_list_tier_seats: tiers.nationalList,
      territorial_list_seats: history.territorialSeats,
      national_compensation_seats: history.compensationSeats,
      statutory_tiers: history.statutory,
      transferred_seats: history.transferred,
      constituency_seats_outside_lists: outside,
      unmatched_compensation_lists: history.unmatchedLists,
      composition_source_url: history.compositionUrl,
      compensation_source_url: history.compensationUrl,
      source_ids: history.sourceIds,
    } : { national_list_seats: tiers.nationalList }),
  } : null;
  // One result per registered election, ballot and contestant. Multiple rounds may reuse a contestant ID.
  const expected = new Map((national?.ballots ?? []).flatMap(ballot => ballot.results.map(result =>
    [ballot.definition.id + "/" + result.contestantId, { ballot, result }] as const)));
  if (!rows.length || rows.length !== expected.size || new Set(rows.map(row => row.vote_type + "/" + row.contestant_ref)).size !== expected.size)
    throw new Error("Incomplete results");
  const results = rows.map(row => {
    const entry = expected.get(row.vote_type + "/" + row.contestant_ref);
    if (!entry) throw new Error("Unregistered ballot or contestant");
    if (!history) return row;
    const { ballot, result } = entry;
    const round = national?.rounds?.find(item => item.round === ballot.round);
    return { ...row, contestant_label: result.nativeLabel, electoral_system_id: national?.systemId,
      election_date: election.date, election_end_date: national?.dateEnd,
      ballot_source_url: ballot.sourceUrl,
      ballot_round: ballot.round ?? null, ballot_date: round?.date ?? election.date,
      vote_denominator_basis: ballot.definition.denominator, vote_denominator:
        ballot.definition.denominator === "valid_votes" ? ballot.validVotes :
        ballot.definition.denominator === "ballots_cast" ? ballot.ballotsCast : null,
      list_tier_seat_denominator: ballot.definition.tierSeats ?? null,
    };
  });
  if (format === "json") return JSON.stringify(composition ? {
    election_id: election.electionId, date: election.date, chamber: election.chamber,
    ...(history ? { date_end: national?.dateEnd, electoral_system_id: national?.systemId, rounds: national?.rounds } : {}),
    composition, results, sources: election.sources,
  } : results, null, 2);
  const csvRows = results.map(row => {
    const fields: Record<string, unknown> = { ...row, ...(composition ? {
      chamber_seats: composition.chamber_seats, district_seats: composition.district_seats,
      independent_district_seats: composition.independent_district_seats,
      ...(history ? { final_allocation_through_poll_date: national?.dateEnd, chamber_composition_source_url: history.compositionUrl, chamber_territorial_seats: history.territorialSeats,
        chamber_compensation_seats: history.compensationSeats, chamber_combined_list_tier_seats: tiers!.nationalList,
        chamber_constituency_seats_outside_lists: outside, chamber_unmatched_compensation_lists: history.unmatchedLists }
        : { national_list_seats: tiers!.nationalList }),
    } : {}) };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== null && typeof value === "object") fields[key] = JSON.stringify(value);
    }
    return fields;
  });
  // Rows for different rounds have different official columns, including seats settled in each round.
  return toCsv([...new Set(csvRows.flatMap(row => Object.keys(row)))], csvRows);
}

export function ElectionResultDownloads({ election, en }: { election: PoliticalElectionView; en: boolean }) {
  const [failed, setFailed] = useState(false);
  async function download(format: "csv" | "json") {
    setFailed(false);
    try {
      const response = await fetch("/research-data/political/" + election.country + "/election_results.json");
      if (!response.ok) throw new Error("Results unavailable");
      const records: ResultRow[] = await response.json();
      const body = exportBody(election, records.filter(row => row.election_id === election.electionId), format);
      const url = URL.createObjectURL(new Blob([body], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = election.electionId + "." + format;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setFailed(true);
    }
  }
  const end = election.national?.dateEnd;
  return <div className="mt-3 flex flex-wrap gap-3" data-selected-election-download={election.electionId}>
    <span>{en ? "Selected election results" : "所选选举结果"} · {election.date}{end && end !== election.date ? " – " + end : ""}</span>
    {(["csv", "json"] as const).map(format => <button type="button" className="underline" key={format} onClick={() => download(format)}>{format.toUpperCase()}</button>)}
    {failed && <span role="alert">{en ? "Could not load the complete results for this election." : "未能读取该届选举的完整结果。"}</span>}
  </div>;
}
