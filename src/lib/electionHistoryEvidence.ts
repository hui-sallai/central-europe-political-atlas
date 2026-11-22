import type { Locale } from "@/i18n/config";
import { PLATFORM_BASE_URL } from "./releaseMetadata";
import type { EvidenceDraft } from "./researchNotebook";
import { toCsv } from "./researchSnapshot";
import { electionHistoryHref, historyObservation, writeHistorySelection, type HistoryRow, type HistorySelection } from "./electionHistoryComparison";

export function historicalComparisonUrl(state: HistorySelection, locale: Locale) {
  const url = new URL((locale === "en" ? "/en" : "") + "/politics/", PLATFORM_BASE_URL);
  const ballots = state.measure === "distribution" || state.measure === "contestants" ? state.ballots : new Map<string,string>();
  writeHistorySelection(url.searchParams,{...state,ballots});
  url.hash = "historical-comparison";
  return url.href;
}

export function observationSources(row: HistoryRow, state: HistorySelection) {
  const {sources} = row.election.history;
  const turnout = row.turnout ?? row.election.history.turnout;
  const ids = state.measure === "turnout" ? turnout.sourceIds :
    state.measure === "distribution" || state.measure === "contestants" ? row.ballot?.sourceIds : undefined;
  const selected = ids?.length ? sources.filter(s => ids.includes(s.id)) : sources;
  if (state.measure==="turnout" && turnout.sourceUrl && ids?.length===1) {
    return selected.map(s=>({...s,url:turnout.sourceUrl!}));
  }
  if ((state.measure==="distribution" || state.measure==="contestants") && row.ballot?.sourceUrl) {
    // The register may cite both the electoral archive and the legal rules under distinct IDs.
    // The archive's deep link is the source of the numeric results for this ballot.
    const ballot = row.ballot;
    const resultSource = new Set(ballot.rows.flatMap(r=>r.sourceIds));
    if (resultSource.size===1) return selected.map(s=>resultSource.has(s.id)?{...s,url:ballot.sourceUrl!}:s);
  }
  return selected;
}

export function historyEvidence(rows: HistoryRow[], state: HistorySelection, locale: Locale): EvidenceDraft {
  const en = locale === "en";
  const uniqueSources = new Map(rows.flatMap(row => observationSources(row,state)).map(s => [s.id+"|"+s.url,s]));
  const indexOnly = uniqueSources.size > 100;
  const sources = indexOnly ? [{
    institution:"Central Europe Political Atlas",dataset:"Parliamentary elections and official source index",
    url:new URL("/politics-comparison.json",PLATFORM_BASE_URL).href,layer:"election_source_index",
  }] : [...uniqueSources.values()].map(s => ({
    institution:s.institution ?? s.title, dataset:s.title, code:s.id, url:s.url, layer:"election_document", retrieved_at:s.retrievedAt,
  }));
  const scope = en ? "Each election retains its recorded chamber, ballot and electorate." : "各届选举分别保留其议院、选票和选民范围。";
  const warnings = [scope];
  if (indexOnly) warnings.push(en ? "This selection exceeds 100 source documents. The source index lists each election’s original documents." : "所选记录涉及超过 100 份来源文书，可在来源索引中按选举查阅原件。");
  const distinct = (ids: string[]) => [...new Set(ids)];
  return {
    type:"country_comparison", title:en ? "Parliamentary election history comparison" : "议会选举历史比较",
    url:historicalComparisonUrl(state,locale), canonical_ids:distinct(rows.map(r=>r.election.id)), countries:state.countries,
    periods:distinct(rows.map(r=>r.ballot?.roundScope==="valid_round_composite" ? r.ballot.dateStart+" – "+r.ballot.dateEnd : r.date)), layer:"admitted_parliamentary_election_history", warnings, sources,
    metadata:{filters:{measure:state.measure, from:state.from, to:state.to,
      chamber:distinct(rows.map(r=>r.election.history.chamberId ?? r.election.history.legislatureId ?? r.election.chamber)),
      rule:distinct(rows.flatMap(r=>r.election.history.systemId?[r.election.history.systemId]:[])),
      round:rows.flatMap(r=>r.turnout?.round || r.ballot?.round ? [r.election.id+":"+(r.turnout?.round??r.ballot?.round)]:[]),
      tier:state.measure==="electoral_system" ? distinct(rows.flatMap(r=>r.election.history.allocations.map(t=>t.id))) : [],
      ballot:rows.flatMap(r=>r.ballot?[r.election.id+":"+r.ballot.id]:[])},
      coverage:rows.map(r=>r.election.id+" · "+observationSources(r,state).map(s=>s.id).join(", ")),
      row_count:rows.length, entersModel:false},
  };
}

export function historyCsv(rows: HistoryRow[], state: HistorySelection, locale: Locale) {
  const data = rows.flatMap((row):Record<string,unknown>[] => {
    const e = row.election, b = row.ballot, obs = historyObservation(row,state.measure,locale);
    const source = observationSources(row,state), turnout=row.turnout, history=e.history;
    const shared = {
      country:row.country,election_id:e.id,election_date:e.date,poll_end_date:e.history.endDate,date_basis:e.history.dateBasis,
      chamber:e.chamber,chamber_id:e.history.chamberId,legislature_id:e.history.legislatureId,rule_id:e.history.systemId,
      observation_date:b?.roundScope==="valid_round_composite" ? null : row.date,
      observation_from:b?.dateStart, observation_to:b?.dateEnd, round_scope:b?.roundScope,
      geographic_scope:b?.geographicScope ? JSON.stringify(b.geographicScope) : undefined, ballot_attribution_basis:b?.attributionBasis,
      electorate_scope:turnout?.electorateScope, constituency_count:turnout?.constituencyCount,
      observation_date_basis:state.measure==="electoral_system" || state.measure==="chamber_seats" ? "last_recorded_poll_not_declaration_date" : b?.roundScope==="valid_round_composite" ? "valid_rounds_by_district" : "ballot_or_election_polling_date",
      round:turnout?.round ?? b?.round,
      institutional_period_id:history.period?.id, institutional_from:history.period?.from, institutional_to_exclusive:history.period?.toExclusive,
      period_from:state.from,period_to:state.to,measure:state.measure,
      ballot_id:b?.id,ballot_scope:b?.label[locale],vote_type:b?.voteType,
      ...(state.measure === "chamber_seats" ? {chamber_seats_assigned:e.seats,chamber_seat_slots:e.slots} : {}),
      ...(turnout ? {turnout_scope:turnout.scope[locale],constituencies:turnout.constituencies,
        turnout_definition:turnout.definition,turnout_count:turnout.count,electorate:turnout.electorate} : {}),
      source_ids:source.map(s=>s.id).join(" | "),source_urls:source.map(s=>s.url).join(" | "),
      election_url:new URL(electionHistoryHref(row,locale),PLATFORM_BASE_URL).href,comparison_url:historicalComparisonUrl(state,locale),
    };
    if (state.measure === "electoral_system") {
      const systems = {...shared,final_composition_source_url:history.allocationUrls?.composition,chamber_seats_assigned:e.seats,chamber_seat_slots:e.slots,
        rule_summary:e.rules[locale], vote_types:[...new Set(e.ballots.map(b=>b.voteType))].join(" | "),
        round_dates:history.rounds?.map(r=>r.round+"="+r.date).join(" | ")};
      if (!history.allocations.length) return [{...systems,allocation_status:"tier_counts_not_held"}];
      return history.allocations.map(t=>({...systems,allocation_id:t.id,allocation_label:t.label[locale],seats:t.seats}));
    }
    if (state.measure !== "distribution") return [{...shared, value:obs.value,unit:obs.unit,scope:obs.scope,value_basis:obs.basis} as Record<string,unknown>];
    const holdsFinalSeats=b?.rows.some(r=>r.seats!==null);
    const fields = {...shared,final_chamber_poll_end:holdsFinalSeats ? history.endDate ?? e.date : undefined,
      final_composition_source_url:holdsFinalSeats ? history.allocationUrls?.composition : undefined,
      compensation_source_url:b?.rows.some(r=>r.fragmentVotes!=null) ? history.allocationUrls?.compensation : undefined,
      ballot_source_url:b?.sourceUrl,chamber_size:e.slots??e.seats,vote_share_denominator:b?.basis[locale],vote_denominator_count:b?.voteDenominator,seat_share_denominator:b?.seatScope,seat_share_scope:b?.seatScopeLabel?.[locale]};
    if (!b) return [{...fields, status:"ballot_selection_required"}];
    return b.rows.map(r=>({...fields,record_id:r.id,contestant_id:r.contestantId,contestant:r.name,votes:r.votes,vote_share_percent:b.roundScope==="valid_round_composite" && r.published ? r.share?.toFixed(2) : r.share, attribution_basis:r.attributionBasis,
      district_seats:r.districtSeats,territorial_seats:r.territorialSeats,compensation_seats:r.compensationSeats,
      compensation_fragment_votes:r.fragmentVotes,district_seats_awarded_this_round:r.districtSeatsThisRound,
      district_seats_this_round_basis:r.districtSeatsBasis,result_source_ids:r.sourceIds.join(" | "),
      vote_share_basis:r.share === null ? null : r.published ? "published" : "derived",
      ranking_points:r.points,seats:r.seats,seat_share_percent:r.seats !== null && b.seatScope ? 100*r.seats/b.seatScope : null,
      status:b.seatWinnersOnly ? "seat_winning_lists_only" : "recorded"}));
  });
  return toCsv([...new Set(data.flatMap(Object.keys))],data);
}
