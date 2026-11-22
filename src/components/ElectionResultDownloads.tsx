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
  const ballots = (national?.ballots ?? []).map(ballot => {
    const definition = ballot.definition;
    return {
      vote_type: definition.id,
      ballot_round: ballot.round ?? null,
      ballot_date: ballot.date ?? (definition.roundScope === "valid_round_composite" ? null : election.date),
      ballot_date_start: ballot.dateStart,
      ballot_date_end: ballot.dateEnd,
      ballot_source_url: ballot.sourceUrl,
      round_scope: definition.roundScope,
      rounds_in_ballot: definition.rounds,
      published_share_decimal_places: definition.roundScope === "valid_round_composite" ? 2 : undefined,
      geographic_scope: definition.geographicScope,
      attribution_basis: definition.attributionBasis,
      turnout_record: ballot.turnoutRecord,
    };
  });
  const ballotById = new Map(ballots.map(ballot => [ballot.vote_type, ballot]));
  const results = rows.map(row => {
    const entry = expected.get(row.vote_type + "/" + row.contestant_ref);
    if (!entry) throw new Error("Unregistered ballot or contestant");
    if (!history) return row;
    const { ballot, result } = entry;
    const context = ballotById.get(ballot.definition.id)!;
    return { ...row, contestant_label: result.nativeLabel, electoral_system_id: national?.systemId,
      election_date: election.date, election_end_date: national?.dateEnd,
      ballot_source_url: ballot.sourceUrl,
      ballot_round: context.ballot_round, ballot_date: context.ballot_date,
      ballot_date_start: context.ballot_date_start, ballot_date_end: context.ballot_date_end,
      vote_denominator_basis: ballot.definition.denominator, vote_denominator:
        ballot.definition.denominator === "valid_votes" ? ballot.validVotes :
        ballot.definition.denominator === "ballots_cast" ? ballot.ballotsCast : null,
      list_tier_seat_denominator: ballot.definition.tierSeats ?? null,
    };
  });
  if (format === "json") return JSON.stringify(composition ? {
    election_id: election.electionId, date: election.date, chamber: election.chamber,
    ...(history ? { date_end: national?.dateEnd, electoral_system_id: national?.systemId, ballots, rounds: national?.rounds } : {}),
    composition, results, sources: election.sources,
  } : results, null, 2);
  const csvRows = results.map(row => {
    const context = ballotById.get(row.vote_type);
    const turnout = context?.turnout_record;
    const fields: Record<string, unknown> = { ...row,
      ...(context?.round_scope ? {
        published_share_decimal_places:context.published_share_decimal_places,
        ...(context.published_share_decimal_places && typeof row.published_vote_share === "number" ? {published_vote_share:row.published_vote_share.toFixed(context.published_share_decimal_places)} : {}),
        ballot_attribution_basis: context.attribution_basis, geographic_scope: context.geographic_scope,
        turnout_basis: turnout?.turnout_basis, round_composition: turnout?.round_composition,
        actual_round1_ballot: turnout?.actual_round1_ballot, turnout_record: turnout,
      } : {}), ...(composition ? {
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
