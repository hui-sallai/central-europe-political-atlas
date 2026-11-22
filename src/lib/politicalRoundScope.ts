/**
 * Data contract for ballots whose round or attribution differs from one polling round of original nominations
 * (first used for Hungary 1998). Canonical fields only; presentation adapters read these and must not infer them.
 *
 * - A `valid_round_composite` ballot combines, per district, the round that was valid (Hungary 1998: round 1 in
 *   18 territorial districts, round 2 in 2). It has no single date, turnout, electorate or invalid-ballot count.
 * - `source_apportioned_party_total` rows are party totals in which the office divided joint candidates' votes
 *   among the nominating parties; their `first_named_party_*` seats are not original-group seats.
 * Records without these fields keep their existing meaning (`single_round`, original nominations).
 */
export type RoundScope = "single_round" | "valid_round_composite";
export type AttributionBasis = "original_list" | "source_apportioned_party_total" | "independent_candidates_aggregate";
export type ValueBasis = "published" | "derived_difference_of_published_totals" | "derived_difference_of_published_counts";

/** Optional keys of `electoral_systems[].vote_definitions[]`. */
export type ScopedVoteDefinition = {
  roundScope?: RoundScope;
  /** Rounds whose votes the ballot contains. */
  rounds?: number[];
  attributionBasis?: AttributionBasis;
  /** Geography of the ballot, e.g. { single_member_constituencies: 175 } or { territorial_districts: 20, round1_districts: 18, round2_districts: 2 }. */
  geographicScope?: Record<string, number>;
};

export type RoundCompositionPart = {
  round: number; date: string; territorial_districts: number; votes: number; votes_basis: ValueBasis; source_record_id?: string;
  districts?: Array<{ label: string; eligible_voters: number; published_turnout: number; published_valid_percent_of_voters: number; published_invalid_percent_of_voters: number }>;
  participants?: null; participants_note?: string;
};

/** Optional keys of `election_turnout[]`. A composite row has no `round`, and its count fields stay null. */
export type ScopedTurnout = {
  round?: number;
  round_scope?: RoundScope;
  round_composition?: RoundCompositionPart[];
  geographic_scope?: Record<string, number>;
  /** The real round-1 ballot of the same tier (all districts), kept apart from the composite total. */
  actual_round1_ballot?: {
    round: 1; date: string; geography: string; eligible_voters: number; voters: number; published_turnout: number;
    ballots_in_urn: number; ballots_missing_from_urn: number; invalid_ballots: number; valid_ballots: number;
    published_invalid_percent_of_voters: number; published_valid_percent_of_voters: number;
    valid_round_districts: number; invalid_round_districts: Array<{ label: string; published_turnout: number }>; list_breakdown: string;
  };
};

/** Optional keys of `election_results[]`. */
export type ScopedResult = {
  round_scope?: RoundScope;
  attribution_basis?: AttributionBasis;
  vote_components?: Array<{ round: number; territorial_districts: number; votes: number; basis: ValueBasis }>;
  first_named_party_seats_final?: number;
  first_named_party_round1_seats?: number;
  nomination_group_components?: Array<{ label: string; nomination: "separate" | "joint"; candidates: number; votes: number; seats: number; basis: "published" }>;
  nomination_group_basis?: string;
  round1_table_votes?: number;
  round1_table_note?: string;
};

export const roundScopeOf = (definition: ScopedVoteDefinition | undefined): RoundScope => definition?.roundScope ?? "single_round";
export const attributionOf = (definition: ScopedVoteDefinition | undefined): AttributionBasis => definition?.attributionBasis ?? "original_list";

/** A ballot's turnout may be shown as one polling round only if it is single-round and its row names that round. */
export function singleRoundTurnout(definition: ScopedVoteDefinition | undefined, row: ScopedTurnout & { published_turnout?: number | null; eligible_voters?: number | null; voters?: number | null } | undefined) {
  if (!row || roundScopeOf(definition) !== "single_round" || row.round_scope === "valid_round_composite" || row.round === undefined) return null;
  return { round: row.round, publishedTurnout: row.published_turnout ?? null, eligibleVoters: row.eligible_voters ?? null, voters: row.voters ?? null, geographicScope: row.geographic_scope ?? null };
}

/** Problems that would make a composite ballot misread; empty when the record is internally consistent. */
export function roundScopeProblems(definition: ScopedVoteDefinition | undefined, row: ScopedTurnout & {
  valid_votes?: number | null; published_turnout?: number | null; eligible_voters?: number | null;
  voters?: number | null; invalid_votes?: number | null; ballots_cast?: number | null; derived_turnout?: number | null;
  turnout_basis?: {numerator: string; denominator: string};
} | undefined): string[] {
  const problems: string[] = [];
  const scope = roundScopeOf(definition);
  if (row?.round_scope && row.round_scope !== scope) problems.push("turnout row and vote definition disagree on round scope");
  if (scope !== "valid_round_composite") {
    if (row?.round_composition || row?.actual_round1_ballot) problems.push("single-round ballot carries composite observations");
    if (definition?.rounds && (row?.round == null || !definition.rounds.includes(row.round))) problems.push("ballot round differs from its definition");
    const districts = definition?.geographicScope?.single_member_constituencies;
    if (districts != null && row?.geographic_scope?.single_member_constituencies !== districts) problems.push("ballot constituency count differs from its definition");
    return problems;
  }
  if (!row) return ["composite ballot without its turnout row"];
  if (row.round !== undefined) problems.push("a composite ballot names a single round");
  for (const [k, v] of [["published_turnout", row.published_turnout], ["eligible_voters", row.eligible_voters], ["voters", row.voters], ["invalid_votes", row.invalid_votes], ["ballots_cast", row.ballots_cast], ["derived_turnout", row.derived_turnout]] as const) if (v !== null && v !== undefined) problems.push(`a composite ballot carries ${k}`);
  if (row.turnout_basis && (row.turnout_basis.numerator !== "unknown" || row.turnout_basis.denominator !== "unknown")) {
    problems.push("a composite ballot has a single turnout basis");
  }
  const parts = row.round_composition ?? [];
  if (parts.length < 2 || new Set(parts.map((p) => p.round)).size !== parts.length) problems.push("a composite ballot needs one part per round");
  const districts = definition?.geographicScope?.territorial_districts;
  if (parts.some(p => !Number.isSafeInteger(p.votes) || p.votes < 0 || !Number.isSafeInteger(p.territorial_districts) || p.territorial_districts <= 0)) {
    problems.push("invalid component votes or district count");
  }
  if (parts.some(p => {
    const n = definition?.geographicScope?.[`round${p.round}_districts`];
    return n != null && p.territorial_districts !== n;
  })) problems.push("a composite round differs from its registered district count");
  if (districts != null && parts.reduce((n, part) => n + part.territorial_districts, 0) !== districts) {
    problems.push("composite parts do not cover the defined territorial districts");
  }
  if (row.valid_votes !== null && row.valid_votes !== undefined && parts.reduce((n, p) => n + p.votes, 0) !== row.valid_votes) problems.push("composite parts do not add up to the ballot total");
  if (definition?.rounds && JSON.stringify([...definition.rounds].sort()) !== JSON.stringify(parts.map((p) => p.round).sort())) problems.push("composite parts differ from the definition's rounds");
  return problems;
}
