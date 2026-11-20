import type { Locale } from "@/i18n/config";
import { PLATFORM_BASE_URL } from "./releaseMetadata";
import type { EvidenceDraft } from "./researchNotebook";
import { toCsv } from "./researchSnapshot";
import { electionHistoryHref, historyObservation, writeHistorySelection, type HistoryRow, type HistorySelection } from "./electionHistoryComparison";

export function historicalComparisonUrl(state: HistorySelection, locale: Locale) {
  const url = new URL((locale === "en" ? "/en" : "") + "/politics/", PLATFORM_BASE_URL);
  const ballots = state.measure === "turnout" || state.measure === "chamber_seats" ? new Map<string,string>() : state.ballots;
  writeHistorySelection(url.searchParams,{...state,ballots});
  url.hash = "historical-comparison";
  return url.href;
}

export function observationSources(row: HistoryRow, state: HistorySelection) {
  const {sources,turnout} = row.election.history;
  const ids = state.measure === "turnout" ? turnout.sourceIds :
    state.measure === "distribution" || state.measure === "contestants" ? row.ballot?.sourceIds : undefined;
  return ids?.length ? sources.filter(s => ids.includes(s.id)) : sources;
}

export function historyEvidence(rows: HistoryRow[], state: HistorySelection, locale: Locale): EvidenceDraft {
  const en = locale === "en";
  const uniqueSources = new Map(rows.flatMap(row => observationSources(row,state)).map(s => [s.id,s]));
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
    url:historicalComparisonUrl(state,locale), canonical_ids:rows.map(r=>r.election.id), countries:state.countries,
    periods:distinct(rows.map(r=>r.election.date)), layer:"admitted_parliamentary_election_history", warnings, sources,
    metadata:{filters:{measure:state.measure, from:state.from, to:state.to,
      chamber:distinct(rows.map(r=>r.election.history.chamberId ?? r.election.history.legislatureId ?? r.election.chamber)),
      ballot:rows.flatMap(r=>r.ballot?[r.election.id+":"+r.ballot.id]:[])},
      coverage:rows.map(r=>r.election.id+" · "+observationSources(r,state).map(s=>s.id).join(", ")),
      row_count:rows.length, entersModel:false},
  };
}

export function historyCsv(rows: HistoryRow[], state: HistorySelection, locale: Locale) {
  const data = rows.flatMap(row => {
    const e = row.election, b = row.ballot, obs = historyObservation(row,state.measure,locale);
    const source = observationSources(row,state);
    const shared = {
      country:row.country,election_id:e.id,election_date:e.date,poll_end_date:e.history.endDate,date_basis:e.history.dateBasis,
      chamber:e.chamber,chamber_id:e.history.chamberId,legislature_id:e.history.legislatureId,rule_id:e.history.systemId,
      period_from:state.from,period_to:state.to,measure:state.measure,
      ballot_id:b?.id,ballot_scope:b?.label[locale],
      ...(state.measure === "chamber_seats" ? {chamber_seats_assigned:e.seats,chamber_seat_slots:e.slots} : {}),
      ...(state.measure === "turnout" ? {turnout_scope:e.history.turnout.scope[locale],
        turnout_definition:e.history.turnout.definition,turnout_count:e.history.turnout.count,electorate:e.history.turnout.electorate} : {}),
      source_ids:source.map(s=>s.id).join(" | "),source_urls:source.map(s=>s.url).join(" | "),
      election_url:new URL(electionHistoryHref(row,locale),PLATFORM_BASE_URL).href,comparison_url:historicalComparisonUrl(state,locale),
    };
    if (state.measure !== "distribution") return [{...shared, value:obs.value,unit:obs.unit,scope:obs.scope,value_basis:obs.basis} as Record<string,unknown>];
    const fields = {...shared,vote_share_denominator:b?.basis[locale],seat_share_denominator:b?.seatScope};
    if (!b) return [{...fields, status:"ballot_selection_required"}];
    return b.rows.map(r=>({...fields,record_id:r.id,contestant:r.name,vote_share_percent:r.share,
      vote_share_basis:r.share === null ? null : r.published ? "published" : "derived",
      ranking_points:r.points,seats:r.seats,seat_share_percent:r.seats !== null && b.seatScope ? 100*r.seats/b.seatScope : null,
      status:b.seatWinnersOnly ? "seat_winning_lists_only" : "recorded"}));
  });
  return toCsv([...new Set(data.flatMap(Object.keys))],data);
}
