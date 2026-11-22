import type { Locale } from "@/i18n/config";
import type { PoliticalLocalText, PoliticalSource } from "./politicalExplorer";
import type { ComparisonBallot, ComparisonElection } from "./politicalComparisonBallots";

export type ArchiveTurnout = {
  ballotId: string | null;
  round?: number; date?: string; electorateScope?: "national" | "restricted"; constituencyCount?: number | null; constituencies?: number | null; sourceUrl?: string;
  value: number | null;
  published: boolean;
  scope: PoliticalLocalText;
  count: number | null;
  electorate: number | null;
  definition: string | null;
  sourceIds: string[];
};

export type ArchiveElection = ComparisonElection & {
  history: {
    chamberId: string | null;
    legislatureId: string | null;
    systemId: string | null;
    dateBasis: string | null;
    endDate: string | null;
    primaryBallot: string | null;
    turnout: ArchiveTurnout;
    rounds?: ArchiveTurnout[];
    period: {id:string; from:string; toExclusive:string|null} | null;
    allocationUrls?:{composition?:string; compensation?:string};
    allocations: {id:string; label:PoliticalLocalText; seats:number}[];
    sources: PoliticalSource[];
  };
};
export type ElectionHistoryIndex = Record<string, ArchiveElection[]>;
export const historyMeasures = ["turnout", "chamber_seats", "contestants", "distribution", "electoral_system"] as const;
export type HistoryMeasure = typeof historyMeasures[number];

let request: Promise<ElectionHistoryIndex> | undefined;
export function loadElectionHistoryIndex(): Promise<ElectionHistoryIndex> {
  request ??= fetch("/politics-comparison.json").then(response => {
    if (!response.ok) throw new Error("Election archive unavailable");
    return response.json() as Promise<ElectionHistoryIndex>;
  }).catch(error => {
    request = undefined;
    throw error;
  });
  return request;
}

export type HistorySelection = {
  countries: string[];
  events: string[];
  ballots: Map<string, string>;
  from: string;
  to: string;
  measure: HistoryMeasure;
};
const keys = ["history_countries","history_events","history_ballots","history_from","history_to","history_measure"] as const;
const list = (value: string | null) => value ? value.split(",") : [];
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const stamp = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0,10) === value;
};

export function readHistorySelection(query: URLSearchParams, allowed: string[], index: ElectionHistoryIndex | null) {
  const countries = list(query.get(keys[0]));
  const events = list(query.get(keys[1]));
  const scopes = list(query.get(keys[2])).map(pair => pair.split(":"));
  const ballots = new Map(scopes.map(([id,scope]) => [id,scope]));
  const from = query.get(keys[3]) ?? "", to = query.get(keys[4]) ?? "";
  const measure = query.get(keys[5]) ?? "turnout";
  const errors: string[] = [];
  if (keys.some(key => query.getAll(key).length > 1)) errors.push("duplicate");
  if (new Set(countries).size !== countries.length || countries.some(c => !allowed.includes(c))) errors.push("countries");
  if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) errors.push("period");
  if (!historyMeasures.includes(measure as HistoryMeasure)) errors.push("measure");
  if (index) {
    const records = countries.filter(c => allowed.includes(c)).flatMap(c => index[c] ?? []);
    if (new Set(events).size !== events.length || events.some(id => !records.some(e => e.id === id))) errors.push("events");
    if (ballots.size !== scopes.length || scopes.some(([id,scope,...extra]) =>
      extra.length > 0 || !records.find(e => e.id === id)?.ballots.some(b => b.id === scope))) errors.push("ballots");
  }
  const selection: HistorySelection = { countries, events, ballots, from, to, measure: measure as HistoryMeasure };
  return { selection, errors };
}

export function writeHistorySelection(query: URLSearchParams, state: HistorySelection) {
  const values = [state.countries.join(","), state.events.join(","),
    Array.from(state.ballots, ([id,scope]) => id + ":" + scope).join(","),
    state.from, state.to, state.measure === "turnout" ? "" : state.measure];
  keys.forEach((key,i) => { if (values[i]) query.set(key, values[i]); else query.delete(key); });
}

export function inHistoryWindow(date: string, state: HistorySelection) {
  return (!state.from || date >= state.from) && (!state.to || date <= state.to);
}
export type HistoryRow = { country:string; election:ArchiveElection; date:string; ballot?:ComparisonBallot; turnout?:ArchiveTurnout };
export function historyRows(state: HistorySelection, index: ElectionHistoryIndex): HistoryRow[] {
  return state.countries.flatMap(country => {
    const records = index[country] ?? [];
    const chosen = records.filter(e => state.events.includes(e.id));
    return (chosen.length ? chosen : records).flatMap((election):HistoryRow[] => {
      if (state.measure === "turnout") {
        return (election.history.rounds?.length ? election.history.rounds : [election.history.turnout]).map(turnout => ({
          country, election, turnout, date:turnout.date ?? election.date,
          ballot:election.ballots.find(b => b.id === turnout.ballotId),
        }));
      }
      const usesBallot = state.measure === "distribution" || state.measure === "contestants";
      const id = usesBallot ? state.ballots.get(election.id) ?? election.history.primaryBallot : null;
      const ballot = election.ballots.find(b => b.id === id);
      // Final chamber outcomes belong to the completed polling period. No declaration date is implied.
      const date = usesBallot ? ballot?.dateEnd ?? ballot?.date ?? election.date : election.history.endDate ?? election.date;
      if (ballot?.roundScope === "valid_round_composite" && ballot.dateStart && !inHistoryWindow(ballot.dateStart, state)) return [];
      return [{country,election,ballot,date}];
    }).filter(row => inHistoryWindow(row.date,state));
  }).sort((a,b) => a.date.localeCompare(b.date) || a.election.id.localeCompare(b.election.id));
}

export function historyObservation(row: HistoryRow, measure: HistoryMeasure, locale: Locale) {
  const {election,ballot} = row, en = locale === "en", t = row.turnout ?? election.history.turnout;
  if (measure === "turnout") return {value:t.value, unit:"%", scope:t.scope[locale],
    basis:t.value === null ? (en ? "No verified rate" : "缺少已核实投票率") : t.published ? (en ? "Published" : "官方公布") : (en ? "From official counts" : "按官方人数计算")};
  if (measure === "chamber_seats") return {value:election.slots ?? election.seats, unit:en ? "seats" : "席", scope:election.chamber,
    basis:election.slots != null ? (en ? "Recorded seat slots" : "收录的席位名额") : (en ? "Seats at this election" : "当届选举席位")};
  if (measure === "electoral_system") return {value:null,unit:"",scope:election.chamber,basis:election.rules[locale]};
  return {value:ballot ? ballot.rows.length : null, unit:en ? "records" : "项", scope:ballot?.label[locale] ?? (en ? "Choose a ballot" : "请选择选票范围"),
    basis:ballot?.seatWinnersOnly ? (en ? "Only seat-winning lists recorded" : "仅收录取得席位的名单") : (en ? "Recorded contestants in this ballot" : "所选选票范围内收录的参选项")};
}

export function electionHistoryHref(row: HistoryRow, locale: Locale) {
  const query = new URLSearchParams({election:row.election.id});
  if (row.ballot) query.set(row.ballot.geographyKey ?? "ballot",row.ballot.id);
  return (locale === "en" ? "/en" : "") + "/politics/" + row.country + "/?" + query;
}
