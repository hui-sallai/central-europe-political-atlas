// Reproducible descriptive research over admitted national elections. Four questions:
// A how conditions differed across elections, B how they changed between successive elections in one country,
// C which descriptive associations appear with turnout and verified list changes, D what changes when retrospective
// figures are replaced by figures released before polling day. Nothing here estimates an effect, attributes an economic
// change to a party, orders parties or predicts a result. Missing evidence stays missing.
import { electionMacroRows, ELECTION_MACRO_INDICATORS, electionPeriods, type ElectionMacroIndicator, type ElectionMacroRow } from "./electionMacroLinkage";
import { contextPublished, type ContextPoint } from "./politicalEconomicContext";
import { linkedUnitComparison, rulesChanged } from "./politicalContinuity";
import type { PoliticalElectionView } from "./politicalExplorer";
import type { PoliticalIdentityLink } from "./politicalIdentity";
import { compareVerifiedSeries } from "./politicalSeriesComparison";

export const RESEARCH_METHOD_VERSION = "atlas-comparative-election-research-v1";
export const RESEARCH_VIEWS = ["last_complete_year", "election_calendar_year", "last_complete_month", "released_before_election"] as const;
export type ResearchView = typeof RESEARCH_VIEWS[number];
export type ResearchFrequency = "annual" | "monthly" | "quarterly";
export const RESEARCH_QUESTIONS = ["A", "B", "C", "D"] as const;
export type ResearchQuestion = typeof RESEARCH_QUESTIONS[number];
/** Fewer pairs than this show direction counts only. Coefficients on so few pairs are unstable even as description. */
export const MIN_PAIRS_FOR_COEFFICIENT = 5;

export type ResearchSelection = { countries: string[]; electionIds: string[]; indicators: ElectionMacroIndicator[]; view: ResearchView };
export type ObservationStatus = "observed" | "missing" | "pending" | "no_series_at_frequency" | "not_established";
export type ResearchObservation = {
  country: string; electionId: string; electionDate: string; indicator: ElectionMacroIndicator; view: ResearchView; frequency: ResearchFrequency | null;
  period: string | null; value: number | null; unit: string | null; status: ObservationStatus; reason: string | null; measureKey: string | null; dataset: string | null;
  vintage: "current_published" | "dated_release" | null; layer: string | null; source: string | null; sourceUrl: string | null; includesPostElectionMonths: boolean;
  publishedOn: string | null; releaseSha256: string | null; flashEstimate: boolean | null;
};

const r6 = (v: number) => Number(v.toFixed(6));
const r3 = (v: number) => Number(v.toFixed(3));
const countryOf = (e: PoliticalElectionView) => e.country ?? "germany";
const MONTHLY_SERIES: Partial<Record<ElectionMacroIndicator, string>> = { hicp_inflation: "hicp_annual_rate", unemployment_rate: "unemployment_rate_monthly" };
const DATASET = /\b(prc_hicp_aind|prc_hicp_minr|nama_10_gdp|une_rt_a|une_rt_m|gov_10dd_edpt1)\b/;
const RELEASE_DATASET = "eurostat_euro_indicators_release";

export function datasetOf(point: Pick<ContextPoint, "definition" | "sourceUrl">) { return `${point.definition} ${point.sourceUrl}`.match(DATASET)?.[1] ?? null; }
/** Two values are directly comparable only with one indicator, frequency, Eurostat dataset and unit. A national label never joins them. */
export function measureKey(point: ContextPoint, indicator: string = point.indicator) {
  const dataset = datasetOf(point);
  return dataset && point.comparable ? `${indicator}|${point.frequency}|${dataset}|${point.unit}` : null;
}
export function lastCompleteMonth(date: string) {
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}
export const monthsBetween = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));

function observationFromPoint(row: ElectionMacroRow, view: ResearchView, seriesId: string, frequency: "annual" | "monthly", period: string, points: ContextPoint[]): ResearchObservation {
  const point = points.find((p) => p.country === row.country && p.indicator === seriesId && p.frequency === frequency && p.period === period);
  const published = Boolean(point && contextPublished(point) && point.value !== null);
  const key = published ? measureKey(point!, row.indicator) : null;
  const usable = published && key !== null;
  return {
    country: row.country, electionId: row.electionId, electionDate: row.electionDate, indicator: row.indicator, view, frequency, period,
    value: usable ? point!.value : null, unit: point?.unit ?? null, status: usable ? "observed" : point?.status === "pending" ? "pending" : "missing",
    reason: usable ? null : point?.status === "pending" ? "publication_pending" : published ? "dataset_not_identified" : "no_published_observation",
    measureKey: key, dataset: point ? datasetOf(point) : null, vintage: usable ? "current_published" : null, layer: point?.layer ?? null, source: point?.source ?? null, sourceUrl: point?.sourceUrl ?? null,
    includesPostElectionMonths: view === "election_calendar_year", publishedOn: null, releaseSha256: null, flashEstimate: null,
  };
}

function observationAsOf(row: ElectionMacroRow): ResearchObservation {
  const a = row.publishedBeforeElection;
  const base = { country: row.country, electionId: row.electionId, electionDate: row.electionDate, indicator: row.indicator, view: "released_before_election" as const, includesPostElectionMonths: false };
  if (a.status !== "documented") return { ...base, frequency: null, period: null, value: null, unit: null, status: "not_established", reason: a.reason, measureKey: null, dataset: null, vintage: null, layer: null, source: null, sourceUrl: null, publishedOn: null, releaseSha256: null, flashEstimate: null };
  const frequency = a.frequency as ResearchFrequency;
  return { ...base, frequency, period: a.period, value: a.value, unit: a.unit, status: "observed", reason: null, measureKey: `${row.indicator}|${frequency}|${RELEASE_DATASET}|${a.unit}`, dataset: RELEASE_DATASET, vintage: "dated_release", layer: "dated Eurostat release", source: `Eurostat release: ${a.releaseTopic}`, sourceUrl: a.sourceUrl, publishedOn: a.publishedOn, releaseSha256: a.releaseSha256, flashEstimate: a.flashEstimate };
}

/** Every election, indicator and view, including explicit gaps. Views are never substituted for one another. */
export function researchObservations(elections: PoliticalElectionView[], points: ContextPoint[]): ResearchObservation[] {
  return electionMacroRows(elections, points).flatMap((row) => {
    const periods = electionPeriods(row.electionDate);
    const monthly = MONTHLY_SERIES[row.indicator];
    return [
      observationFromPoint(row, "last_complete_year", row.indicator, "annual", periods.lastComplete, points),
      observationFromPoint(row, "election_calendar_year", row.indicator, "annual", periods.retrospective, points),
      monthly ? observationFromPoint(row, "last_complete_month", monthly, "monthly", lastCompleteMonth(row.electionDate), points)
        : { country: row.country, electionId: row.electionId, electionDate: row.electionDate, indicator: row.indicator, view: "last_complete_month" as const, frequency: null, period: null, value: null, unit: null, status: "no_series_at_frequency" as const, reason: "no_monthly_series_for_this_indicator", measureKey: null, dataset: null, vintage: null, layer: null, source: null, sourceUrl: null, includesPostElectionMonths: false, publishedOn: null, releaseSha256: null, flashEstimate: null },
      observationAsOf(row),
    ];
  });
}

/** Drops anything outside the admitted data, and elections of unselected countries. An empty result stays empty. */
export function normalizeSelection(raw: Partial<ResearchSelection>, elections: PoliticalElectionView[]): ResearchSelection {
  const admitted = [...new Set(elections.map(countryOf))].sort();
  const countries = raw.countries ? admitted.filter((c) => raw.countries!.includes(c)) : admitted;
  const eligible = elections.filter((e) => countries.includes(countryOf(e))).map((e) => e.electionId);
  return {
    countries, electionIds: raw.electionIds ? eligible.filter((id) => raw.electionIds!.includes(id)) : eligible,
    indicators: raw.indicators ? ELECTION_MACRO_INDICATORS.filter((i) => raw.indicators!.includes(i)) : [...ELECTION_MACRO_INDICATORS],
    view: raw.view && RESEARCH_VIEWS.includes(raw.view) ? raw.view : "last_complete_year",
  };
}
const inSelection = (o: ResearchObservation, s: ResearchSelection) => s.electionIds.includes(o.electionId) && s.indicators.includes(o.indicator);

const median = (values: number[]) => { const v = [...values].sort((a, b) => a - b), m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };

// A ---------------------------------------------------------------------------------------------------------------------
export type MeasureComparison = {
  indicator: ElectionMacroIndicator; view: ResearchView; measureKey: string; frequency: ResearchFrequency; unit: string; dataset: string; n: number; countries: string[];
  min: { value: number; electionIds: string[] }; max: { value: number; electionIds: string[] }; range: number; median: number;
  rows: { electionId: string; country: string; electionDate: string; period: string; value: number; differenceFromMedian: number; layer: string; flashEstimate: boolean | null; publishedOn: string | null }[];
  flags: { differentCalendarPeriods: boolean; mixedDataLayers: boolean; mixedReleaseMaturity: boolean; includesPostElectionMonths: boolean };
};
/** One group per identical measure, so a difference never crosses a definition. Rows stay in date order, not value order. */
export function compareAcrossElections(observations: ResearchObservation[], selection: ResearchSelection, view: ResearchView = selection.view) {
  const scoped = observations.filter((o) => o.view === view && inSelection(o, selection));
  const groups = new Map<string, ResearchObservation[]>();
  for (const o of scoped) if (o.status === "observed" && o.measureKey) groups.set(o.measureKey, [...(groups.get(o.measureKey) ?? []), o]);
  const measures: MeasureComparison[] = [...groups.entries()].map(([key, rows]) => {
    const values = rows.map((o) => o.value!), mid = median(values), lo = Math.min(...values), hi = Math.max(...values), first = rows[0];
    const ordered = [...rows].sort((a, b) => a.country.localeCompare(b.country) || a.electionDate.localeCompare(b.electionDate));
    return {
      indicator: first.indicator, view, measureKey: key, frequency: first.frequency!, unit: first.unit!, dataset: first.dataset!, n: rows.length, countries: [...new Set(rows.map((o) => o.country))],
      min: { value: lo, electionIds: rows.filter((o) => o.value === lo).map((o) => o.electionId) }, max: { value: hi, electionIds: rows.filter((o) => o.value === hi).map((o) => o.electionId) }, range: r6(hi - lo), median: r6(mid),
      rows: ordered.map((o) => ({ electionId: o.electionId, country: o.country, electionDate: o.electionDate, period: o.period!, value: o.value!, differenceFromMedian: r6(o.value! - mid), layer: o.layer ?? "", flashEstimate: o.flashEstimate, publishedOn: o.publishedOn })),
      flags: { differentCalendarPeriods: new Set(rows.map((o) => o.period)).size > 1, mixedDataLayers: new Set(rows.map((o) => o.layer)).size > 1, mixedReleaseMaturity: new Set(rows.map((o) => o.flashEstimate)).size > 1, includesPostElectionMonths: view === "election_calendar_year" },
    };
  }).sort((a, b) => ELECTION_MACRO_INDICATORS.indexOf(a.indicator) - ELECTION_MACRO_INDICATORS.indexOf(b.indicator));
  return { measures, gaps: scoped.filter((o) => o.status !== "observed").map((o) => ({ electionId: o.electionId, indicator: o.indicator, status: o.status, reason: o.reason })) };
}

// B ---------------------------------------------------------------------------------------------------------------------
export type ElectionPair = { country: string; from: PoliticalElectionView; to: PoliticalElectionView; monthsBetween: number };
/** Neighbouring admitted elections in one country. Unselecting a middle election removes its pairs and never joins its neighbours. */
export function successiveElectionPairs(elections: PoliticalElectionView[], selection: ResearchSelection): ElectionPair[] {
  return selection.countries.flatMap((country) => {
    const ordered = elections.filter((e) => countryOf(e) === country).sort((a, b) => a.date.localeCompare(b.date));
    return ordered.slice(1).flatMap((to, i) => { const from = ordered[i]; return selection.electionIds.includes(from.electionId) && selection.electionIds.includes(to.electionId) ? [{ country, from, to, monthsBetween: monthsBetween(from.date, to.date) }] : []; });
  });
}

export type InterElectionPath = { firstPeriod: string; lastPeriod: string; expected: number; observed: number; mean: number | null; min: number | null; max: number | null };
export type SuccessiveChange = {
  country: string; fromElection: string; toElection: string; fromDate: string; toDate: string; monthsBetween: number; indicator: ElectionMacroIndicator; view: ResearchView; frequency: ResearchFrequency | null;
  fromPeriod: string | null; toPeriod: string | null; fromValue: number | null; toValue: number | null; change: number | null; unit: string | null; measureKey: string | null;
  status: "calculated" | "withheld"; reason: string | null; crossesDataLayer: boolean; fromLayer: string | null; toLayer: string | null; path: InterElectionPath | null;
};

function periodsBetween(from: string, to: string) {
  if (from.length === 4) return Array.from({ length: Number(to) - Number(from) + 1 }, (_, i) => String(Number(from) + i));
  return Array.from({ length: monthsBetween(from, to) + 1 }, (_, i) => { const t = Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7)) - 1 + i; return `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, "0")}`; });
}
function pathBetween(a: ResearchObservation, b: ResearchObservation, points: ContextPoint[]): InterElectionPath | null {
  if (a.view === "released_before_election" || !a.period || !b.period || a.frequency !== b.frequency) return null;
  const series = a.frequency === "monthly" ? MONTHLY_SERIES[a.indicator]! : a.indicator;
  const periods = periodsBetween(a.period, b.period);
  const values = periods.flatMap((period) => { const p = points.find((x) => x.country === a.country && x.indicator === series && x.frequency === a.frequency && x.period === period); return p && contextPublished(p) && measureKey(p, a.indicator) === a.measureKey && p.value !== null ? [p.value] : []; });
  return { firstPeriod: a.period, lastPeriod: b.period, expected: periods.length, observed: values.length, mean: values.length ? r6(values.reduce((s, v) => s + v, 0) / values.length) : null, min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null };
}

export function successiveElectionChanges(pairs: ElectionPair[], observations: ResearchObservation[], points: ContextPoint[], selection: ResearchSelection, view: ResearchView = selection.view): SuccessiveChange[] {
  const find = (electionId: string, indicator: ElectionMacroIndicator) => observations.find((o) => o.electionId === electionId && o.indicator === indicator && o.view === view)!;
  return pairs.flatMap((pair) => selection.indicators.map((indicator): SuccessiveChange => {
    const a = find(pair.from.electionId, indicator), b = find(pair.to.electionId, indicator);
    const base = { country: pair.country, fromElection: pair.from.electionId, toElection: pair.to.electionId, fromDate: pair.from.date, toDate: pair.to.date, monthsBetween: pair.monthsBetween, indicator, view, frequency: b.frequency ?? a.frequency, fromPeriod: a.period, toPeriod: b.period, fromValue: a.value, toValue: b.value, unit: b.unit ?? a.unit, fromLayer: a.layer, toLayer: b.layer };
    const withheld = (reason: string): SuccessiveChange => ({ ...base, change: null, measureKey: null, status: "withheld", reason, crossesDataLayer: false, path: null });
    if (view === "released_before_election" && (a.status !== "observed" || b.status !== "observed")) return withheld("released_figure_not_documented_for_both_elections");
    if (a.status === "no_series_at_frequency") return withheld(a.reason!);
    if (a.status !== "observed" || b.status !== "observed") return withheld("observation_missing_for_one_election");
    if (a.measureKey !== b.measureKey) return withheld("definition_differs");
    return { ...base, change: r6(b.value! - a.value!), measureKey: a.measureKey, status: "calculated", reason: null, crossesDataLayer: a.layer !== b.layer, path: pathBetween(a, b, points) };
  }));
}

// Verified list changes and turnout --------------------------------------------------------------------------------------
export type VerifiedUnitChange = { id: string; label: string; kind: "authority_series" | "party" | "coalition"; fromShare: number; toShare: number; shareChange: number; fromSeats: number | null; toSeats: number | null };
export type VerifiedListChange = {
  country: string; fromElection: string; toElection: string; identityBasis: "authority_series" | "register_links" | "none";
  units: VerifiedUnitChange[];
  /** Half the sum of absolute share changes among verified units only: not whole-party-system volatility. Null without a verified unit. */
  verifiedShareMovement: number | null; coveredShareFrom: number | null; coveredShareTo: number | null; unresolvedLinks: number; rulesChanged: boolean;
};
/** Units come only from verified links. Coalition totals stay whole, members get nothing, and rows are in label order. */
export function verifiedListChanges(pair: ElectionPair, links: PoliticalIdentityLink[], elections: PoliticalElectionView[]): VerifiedListChange {
  const { from, to } = pair;
  let units: VerifiedUnitChange[];
  let identityBasis: VerifiedListChange["identityBasis"];
  if (pair.country === "germany") {
    identityBasis = "authority_series";
    units = compareVerifiedSeries(from, to).flatMap((row) => row.a && row.b && row.a.publishedVoteShare !== null && row.b.publishedVoteShare !== null && row.shareChange !== null ? [{ id: row.series.id, label: row.series.label, kind: "authority_series" as const, fromShare: row.a.publishedVoteShare, toShare: row.b.publishedVoteShare, shareChange: r6(row.shareChange), fromSeats: row.a.seats, toSeats: row.b.seats }] : []);
  } else {
    const country = elections.filter((e) => countryOf(e) === pair.country), own = links.filter((l) => l.country === pair.country);
    const rows = own.length ? linkedUnitComparison(country, own, from, to).rows : [];
    identityBasis = own.length ? "register_links" : "none";
    units = rows.flatMap((row) => row.shareChange !== null && row.a.publishedVoteShare !== null && row.b.publishedVoteShare !== null ? [{ id: row.id, label: row.label, kind: row.kind, fromShare: row.a.publishedVoteShare, toShare: row.b.publishedVoteShare, shareChange: r6(row.shareChange), fromSeats: row.a.seats, toSeats: row.b.seats }] : []);
  }
  units.sort((a, b) => a.label.localeCompare(b.label));
  const sum = (f: (u: VerifiedUnitChange) => number) => r6(units.reduce((s, u) => s + f(u), 0));
  return {
    country: pair.country, fromElection: from.electionId, toElection: to.electionId, identityBasis, units,
    verifiedShareMovement: units.length ? r6(sum((u) => Math.abs(u.shareChange)) / 2) : null, coveredShareFrom: units.length ? sum((u) => u.fromShare) : null, coveredShareTo: units.length ? sum((u) => u.toShare) : null,
    unresolvedLinks: links.filter((l) => l.status === "unresolved" && l.country === pair.country && l.fromElection === from.electionId && l.toElection === to.electionId).length, rulesChanged: rulesChanged(from, to),
  };
}

export type TurnoutChange = { fromTurnout: number | null; toTurnout: number | null; change: number | null; basis: string | null; status: "calculated" | "withheld"; reason: string | null; fromVintage: string; toVintage: string };
/** Only within one country and only on one published basis. */
export function turnoutChange({ from, to }: ElectionPair): TurnoutChange {
  const x = from.national?.turnout, y = to.national?.turnout;
  const base = { fromTurnout: from.publishedTurnout, toTurnout: to.publishedTurnout, fromVintage: from.resultVintage, toVintage: to.resultVintage };
  if (from.publishedTurnout === null || to.publishedTurnout === null) return { ...base, change: null, basis: null, status: "withheld", reason: "turnout_not_published" };
  if (!x || !y || x.numerator !== y.numerator || x.denominator !== y.denominator) return { ...base, change: null, basis: null, status: "withheld", reason: "turnout_basis_differs" };
  return { ...base, change: r6(to.publishedTurnout - from.publishedTurnout), basis: `${x.numerator} / ${x.denominator}`, status: "calculated", reason: null };
}

// C ---------------------------------------------------------------------------------------------------------------------
export function pearson(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  const mx = x.reduce((s, v) => s + v, 0) / x.length, my = y.reduce((s, v) => s + v, 0) / y.length;
  let xy = 0, xx = 0, yy = 0;
  x.forEach((v, i) => { xy += (v - mx) * (y[i] - my); xx += (v - mx) ** 2; yy += (y[i] - my) ** 2; });
  return xx > 1e-12 && yy > 1e-12 ? xy / Math.sqrt(xx * yy) : null;
}
const ranks = (v: number[]) => v.map((a) => { const less = v.filter((b) => b < a).length, same = v.filter((b) => b === a).length; return less + (same + 1) / 2; });
export const spearman = (x: number[], y: number[]) => pearson(ranks(x), ranks(y));

export type ResearchOutcome = "turnout_change" | "verified_share_movement";
export type Association = {
  country: string; indicator: ElectionMacroIndicator; view: ResearchView; outcome: ResearchOutcome; n: number; pairsAcrossDataLayers: number;
  pearson: number | null; spearman: number | null; leaveOneOutPearson: { min: number; max: number } | null; sameDataLayerPairs: number; sameDataLayerPearson: number | null;
  sameDirection: number | null; oppositeDirection: number | null; status: "coefficient" | "direction_only" | "no_pairs";
};
export type RelationshipPair = { pair: ElectionPair; turnout: TurnoutChange; lists: VerifiedListChange; macro: SuccessiveChange[] };

export function relationshipPairs(pairs: ElectionPair[], changes: SuccessiveChange[], links: PoliticalIdentityLink[], elections: PoliticalElectionView[]): RelationshipPair[] {
  return pairs.map((pair) => ({ pair, turnout: turnoutChange(pair), lists: verifiedListChanges(pair, links, elections), macro: changes.filter((c) => c.fromElection === pair.from.electionId && c.toElection === pair.to.electionId) }));
}

function association(country: string, indicator: ElectionMacroIndicator, view: ResearchView, outcome: ResearchOutcome, pairs: RelationshipPair[]): Association {
  const rows = pairs.flatMap((p) => { const c = p.macro.find((m) => m.indicator === indicator); const y = outcome === "turnout_change" ? p.turnout.change : p.lists.verifiedShareMovement; return c && c.change !== null && y !== null ? [{ x: c.change, y, across: c.crossesDataLayer }] : []; });
  const x = rows.map((r) => r.x), y = rows.map((r) => r.y), same = rows.filter((r) => !r.across);
  const direction = outcome === "turnout_change" ? { sameDirection: rows.filter((r) => r.x * r.y > 0).length, oppositeDirection: rows.filter((r) => r.x * r.y < 0).length } : { sameDirection: null, oppositeDirection: null };
  const base = { country, indicator, view, outcome, n: rows.length, pairsAcrossDataLayers: rows.filter((r) => r.across).length, sameDataLayerPairs: same.length, ...direction };
  if (rows.length < MIN_PAIRS_FOR_COEFFICIENT) return { ...base, pearson: null, spearman: null, leaveOneOutPearson: null, sameDataLayerPearson: null, status: rows.length ? "direction_only" : "no_pairs" };
  const leaveOneOut = rows.flatMap((_, i) => { const v = pearson(x.filter((__, k) => k !== i), y.filter((__, k) => k !== i)); return v === null ? [] : [v]; });
  const coefficient = (v: number | null) => (v === null ? null : r3(v));
  return { ...base, pearson: coefficient(pearson(x, y)), spearman: coefficient(spearman(x, y)), leaveOneOutPearson: leaveOneOut.length ? { min: r3(Math.min(...leaveOneOut)), max: r3(Math.max(...leaveOneOut)) } : null, sameDataLayerPearson: same.length >= MIN_PAIRS_FOR_COEFFICIENT ? coefficient(pearson(same.map((r) => r.x), same.map((r) => r.y))) : null, status: "coefficient" };
}

/** Within one country only. Turnout bases and identity evidence differ between countries, so pairs are never pooled into a coefficient. */
export function electionAssociations(rows: RelationshipPair[], selection: ResearchSelection, view: ResearchView = selection.view): Association[] {
  return selection.countries.flatMap((country) => selection.indicators.flatMap((indicator) => (["turnout_change", "verified_share_movement"] as const).map((outcome) => association(country, indicator, view, outcome, rows.filter((p) => p.pair.country === country)))));
}
/** Pair counts by direction across countries. A count, not a pooled coefficient. */
export function directionAcrossCountries(associations: Association[]) {
  return ELECTION_MACRO_INDICATORS.flatMap((indicator) => { const scoped = associations.filter((a) => a.indicator === indicator && a.outcome === "turnout_change" && a.n > 0); return scoped.length ? [{ indicator, pairs: scoped.reduce((s, a) => s + a.n, 0), sameDirection: scoped.reduce((s, a) => s + (a.sameDirection ?? 0), 0), oppositeDirection: scoped.reduce((s, a) => s + (a.oppositeDirection ?? 0), 0), byCountry: scoped.map((a) => ({ country: a.country, n: a.n, sameDirection: a.sameDirection, oppositeDirection: a.oppositeDirection })) }] : []; });
}

// D ---------------------------------------------------------------------------------------------------------------------
export type ViewRelation = "same_period_revision" | "different_period" | "different_frequency" | "no_observation";
export type ReleasedVersusView = { view: Exclude<ResearchView, "released_before_election">; period: string | null; frequency: ResearchFrequency | null; value: number | null; relation: ViewRelation; difference: number | null };
export type ReleasedComparison = {
  country: string; electionId: string; electionDate: string; indicator: ElectionMacroIndicator; status: "documented" | "not_established"; reason: string | null;
  frequency: ResearchFrequency | null; period: string | null; value: number | null; unit: string | null; flashEstimate: boolean | null; publishedOn: string | null; daysBeforeElection: number | null; monthsFromPeriodEndToElection: number | null;
  sourceUrl: string | null; releaseSha256: string | null; currentValue: number | null; revisionSinceRelease: number | null; versus: ReleasedVersusView[];
};
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
function periodEndMonth(period: string) {
  if (period.length === 4) return `${period}-12`;
  const quarter = period.match(/^(\d{4})Q([1-4])$/);
  return quarter ? `${quarter[1]}-${String(Number(quarter[2]) * 3).padStart(2, "0")}` : period;
}

export function releasedVersusRetrospective(rows: ElectionMacroRow[], observations: ResearchObservation[], selection: ResearchSelection): ReleasedComparison[] {
  const documentedElections = new Set(rows.filter((r) => r.publishedBeforeElection.status === "documented").map((r) => r.electionId));
  return rows.filter((r) => documentedElections.has(r.electionId) && selection.electionIds.includes(r.electionId) && selection.indicators.includes(r.indicator)).map((r) => {
    const released = r.publishedBeforeElection;
    const own = observations.find((o) => o.electionId === r.electionId && o.indicator === r.indicator && o.view === "released_before_election")!;
    const versus = (["last_complete_year", "election_calendar_year", "last_complete_month"] as const).map((view): ReleasedVersusView => {
      const o = observations.find((x) => x.electionId === r.electionId && x.indicator === r.indicator && x.view === view)!;
      if (o.status !== "observed" || own.value === null) return { view, period: o.period, frequency: o.frequency, value: null, relation: "no_observation", difference: null };
      const relation: ViewRelation = o.frequency !== own.frequency ? "different_frequency" : o.period === own.period ? "same_period_revision" : "different_period";
      return { view, period: o.period, frequency: o.frequency, value: o.value, relation, difference: r6(o.value! - own.value) };
    });
    if (released.status !== "documented") return { country: r.country, electionId: r.electionId, electionDate: r.electionDate, indicator: r.indicator, status: "not_established" as const, reason: released.reason, frequency: null, period: null, value: null, unit: null, flashEstimate: null, publishedOn: null, daysBeforeElection: null, monthsFromPeriodEndToElection: null, sourceUrl: null, releaseSha256: null, currentValue: null, revisionSinceRelease: null, versus };
    return { country: r.country, electionId: r.electionId, electionDate: r.electionDate, indicator: r.indicator, status: "documented" as const, reason: null, frequency: own.frequency, period: released.period, value: released.value, unit: released.unit, flashEstimate: released.flashEstimate, publishedOn: released.publishedOn, daysBeforeElection: days(released.publishedOn, r.electionDate), monthsFromPeriodEndToElection: monthsBetween(periodEndMonth(released.period), r.electionDate), sourceUrl: released.sourceUrl, releaseSha256: released.releaseSha256, currentValue: released.current.value, revisionSinceRelease: released.revisionSinceRelease, versus };
  });
}

export type DirectionCheck = { indicator: ElectionMacroIndicator; electionA: string; electionB: string; releasedDifference: number; views: { view: ResearchView; difference: number | null; directionChanged: boolean | null; sameFrequencyAsReleased: boolean | null }[] };
export type SpreadCheck = { indicator: ElectionMacroIndicator; elections: number; released: number; views: { view: ResearchView; elections: number; range: number | null; sameElectionSet: boolean }[] };
/** For two elections, does the sign of the gap survive the switch of view? Later minus earlier. This asks about evidence, not which is better. */
export function directionChecks(released: ReleasedComparison[], selection: ResearchSelection) {
  const views = ["last_complete_year", "election_calendar_year", "last_complete_month"] as const;
  const checks: DirectionCheck[] = [], spreads: SpreadCheck[] = [];
  for (const indicator of selection.indicators) {
    const rows = released.filter((r) => r.indicator === indicator && r.status === "documented").sort((a, b) => a.electionDate.localeCompare(b.electionDate));
    if (rows.length < 2) continue;
    rows.forEach((a, i) => rows.slice(i + 1).forEach((b) => checks.push({
      indicator, electionA: a.electionId, electionB: b.electionId, releasedDifference: r6(b.value! - a.value!),
      views: views.map((view) => { const x = a.versus.find((v) => v.view === view)!, y = b.versus.find((v) => v.view === view)!; if (x.value === null || y.value === null || x.frequency !== y.frequency) return { view, difference: null, directionChanged: null, sameFrequencyAsReleased: null }; const difference = r6(y.value - x.value); return { view, difference, directionChanged: Math.sign(difference) !== Math.sign(b.value! - a.value!), sameFrequencyAsReleased: x.frequency === a.frequency && y.frequency === b.frequency }; }),
    })));
    const range = (values: number[]) => r6(Math.max(...values) - Math.min(...values));
    spreads.push({ indicator, elections: rows.length, released: range(rows.map((r) => r.value!)), views: views.map((view) => { const values = rows.flatMap((r) => { const v = r.versus.find((x) => x.view === view)!; return v.value === null ? [] : [v.value]; }); return { view, elections: values.length, range: values.length >= 2 ? range(values) : null, sameElectionSet: values.length === rows.length }; }) });
  }
  return { checks, spreads };
}

// Findings ---------------------------------------------------------------------------------------------------------------
type Text = { en: string; zh: string };
export type ResearchResults = ReturnType<typeof runComparativeResearch>;
const year = (id: string) => id.match(/(\d{4})-\d{2}-\d{2}$/)?.[1] ?? id;
const COUNTRY: Record<string, Text> = { germany: { en: "Germany", zh: "德国" }, czechia: { en: "Czechia", zh: "捷克" }, poland: { en: "Poland", zh: "波兰" }, slovakia: { en: "Slovakia", zh: "斯洛伐克" } };
const INDICATOR: Record<ElectionMacroIndicator, Text> = { hicp_inflation: { en: "HICP inflation", zh: "HICP 通胀" }, real_gdp_growth: { en: "real GDP growth", zh: "实际 GDP 增长" }, unemployment_rate: { en: "unemployment", zh: "失业率" }, fiscal_balance_gdp: { en: "government balance", zh: "政府收支差额" }, government_debt_gdp: { en: "government debt", zh: "政府债务" } };
const electionLabel = (id: string, elections: PoliticalElectionView[], l: keyof Text) => { const e = elections.find((x) => x.electionId === id); return `${e ? COUNTRY[countryOf(e)]?.[l] ?? countryOf(e) : id} ${year(id)}`; };
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}`;
const plain = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)}`;

/** Sentences computed from the results above. They report a pattern and its size, and never a cause. */
export function researchFindings(results: ResearchResults, elections: PoliticalElectionView[]): Record<ResearchQuestion, Text[]> {
  const label = (id: string) => ({ en: electionLabel(id, elections, "en"), zh: electionLabel(id, elections, "zh") });
  const a = results.a.measures.filter((m) => m.n >= 2).map((m): Text => { const lo = label(m.min.electionIds[0]), hi = label(m.max.electionIds[0]); const periods = m.flags.differentCalendarPeriods ? { en: " The figures refer to different calendar periods.", zh: " 这些数字对应不同的日历期间。" } : { en: "", zh: "" }; const maturity = m.flags.mixedReleaseMaturity ? { en: " Flash and later estimates are mixed.", zh: " 其中混有快速估算和后续估算。" } : { en: "", zh: "" }; return { en: `${INDICATOR[m.indicator].en}: ${m.n} elections, from ${plain(m.min.value)} (${lo.en}) to ${plain(m.max.value)} (${hi.en}); median ${plain(m.median)}.${periods.en}${maturity.en}`, zh: `${INDICATOR[m.indicator].zh}：${m.n} 届选举，从 ${plain(m.min.value)}（${lo.zh}）到 ${plain(m.max.value)}（${hi.zh}），中位数 ${plain(m.median)}。${periods.zh}${maturity.zh}` }; });
  const calculated = results.b.filter((c) => c.status === "calculated");
  const b = results.selection.indicators.flatMap((indicator): Text[] => {
    const rows = calculated.filter((c) => c.indicator === indicator);
    if (!rows.length) return [];
    const up = rows.filter((c) => c.change! > 0).length, down = rows.filter((c) => c.change! < 0).length, biggest = rows.reduce((p, c) => (Math.abs(c.change!) > Math.abs(p.change!) ? c : p));
    const span = { en: `${label(biggest.fromElection).en} to ${year(biggest.toElection)}`, zh: `${label(biggest.fromElection).zh} 至 ${year(biggest.toElection)}` };
    return [{ en: `${INDICATOR[indicator].en}: ${rows.length} successive pairs, ${up} up and ${down} down; largest absolute change ${signed(biggest.change!)} (${span.en}).`, zh: `${INDICATOR[indicator].zh}：${rows.length} 组相邻选举，${up} 组上升、${down} 组下降；绝对变化最大为 ${signed(biggest.change!)}（${span.zh}）。` }];
  });
  const c = results.c.associations.filter((x) => x.status === "coefficient" && x.pearson !== null).map((x): Text => {
    const name = x.outcome === "turnout_change" ? { en: "turnout change", zh: "投票率变化" } : { en: "verified list movement", zh: "已核实名单变动" };
    const range = x.leaveOneOutPearson ? { en: ` Dropping any one pair gives ${plain(x.leaveOneOutPearson.min)} to ${plain(x.leaveOneOutPearson.max)}.`, zh: ` 去掉任意一组后为 ${plain(x.leaveOneOutPearson.min)} 至 ${plain(x.leaveOneOutPearson.max)}。` } : { en: "", zh: "" };
    return { en: `${COUNTRY[x.country].en}, ${INDICATOR[x.indicator].en} and ${name.en}: Pearson ${plain(x.pearson!)}, Spearman ${x.spearman === null ? "not defined" : plain(x.spearman)} on ${x.n} pairs.${range.en}`, zh: `${COUNTRY[x.country].zh}，${INDICATOR[x.indicator].zh}与${name.zh}：Pearson ${plain(x.pearson!)}，Spearman ${x.spearman === null ? "无定义" : plain(x.spearman)}，共 ${x.n} 组。${range.zh}` };
  });
  const doc = results.d.released.filter((r) => r.status === "documented");
  const revised = doc.filter((r) => r.revisionSinceRelease !== null), moved = revised.filter((r) => r.revisionSinceRelease !== 0);
  const annual = doc.filter((r) => r.frequency === "annual"), samePeriod = annual.filter((r) => r.versus.find((v) => v.view === "last_complete_year")?.relation === "same_period_revision");
  const flipped = results.d.checks.flatMap((x) => x.views.filter((v) => v.view === "last_complete_year" && v.directionChanged === true));
  const flippedOtherFrequency = flipped.filter((v) => v.sameFrequencyAsReleased === false).length;
  const compared = results.d.checks.flatMap((x) => x.views.filter((v) => v.view === "last_complete_year" && v.directionChanged !== null));
  const d: Text[] = doc.length ? [
    { en: `${doc.length} figures have a dated release before polling day. ${revised.length} also have a current value for the same period, and ${moved.length} of those differ.`, zh: `${doc.length} 个数字有投票日前注明日期的发布记录。其中 ${revised.length} 个还有同一期间的当前数值，其中 ${moved.length} 个不同。` },
    ...(annual.length ? [{ en: `For ${samePeriod.length} of ${annual.length} annual figures, the year in the last-complete-year view had been published before polling day. For the others, the latest published year was older.`, zh: `${annual.length} 个年度数字中，有 ${samePeriod.length} 个的“最后完整年度”在投票日前已公布；其余数字当时已公布的最新年度更早。` }] : []),
    ...(compared.length ? [{ en: `Between pairs of elections, the sign of the gap differs from the last-complete-year view in ${flipped.length} of ${compared.length} comparisons. ${flippedOtherFrequency} of those ${flipped.length} set a monthly or quarterly release against an annual figure, which is a different measure and not a revision.`, zh: `在选举两两比较中，差距方向与“最后完整年度”视图不同的有 ${flipped.length} 组，共 ${compared.length} 组。这 ${flipped.length} 组中有 ${flippedOtherFrequency} 组是月度或季度发布与年度数字相比，属于不同度量，并非修订。` }] : []),
  ] : [];
  return { A: a, B: b, C: c, D: d };
}

// Run and export ---------------------------------------------------------------------------------------------------------
export function runComparativeResearch(rawSelection: Partial<ResearchSelection>, elections: PoliticalElectionView[], points: ContextPoint[], links: PoliticalIdentityLink[]) {
  const selection = normalizeSelection(rawSelection, elections);
  const rows = electionMacroRows(elections, points);
  const observations = researchObservations(elections, points);
  const pairs = successiveElectionPairs(elections, selection);
  const b = successiveElectionChanges(pairs, observations, points, selection);
  const relationship = relationshipPairs(pairs, b, links, elections);
  const associations = electionAssociations(relationship, selection);
  const released = releasedVersusRetrospective(rows, observations, selection);
  return {
    selection, observations: observations.filter((o) => o.view === selection.view && inSelection(o, selection)), allViewObservations: observations.filter((o) => inSelection(o, selection)),
    a: compareAcrossElections(observations, selection), b, c: { pairs: relationship, associations, direction: directionAcrossCountries(associations) }, d: { released, ...directionChecks(released, selection) },
  };
}

export const RESEARCH_RULES = [
  "A direct comparison needs one indicator, frequency, Eurostat dataset and unit. Annual, monthly and quarterly figures are never differenced as the same measure.",
  "Successive changes join neighbouring admitted elections in one country. An unselected election is not bridged.",
  "Values from the 2000-2020 history and the 2021+ snapshot use the same Eurostat dataset and query, and a change between them is flagged as crossing data layers.",
  "Released figures come only from dated Eurostat releases issued before polling day. A missing release stays not established and is never filled from current data.",
  "A revision is reported only for the same frequency and period. Other gaps between views show a different period or frequency.",
  "Turnout changes need one country and one published basis. List changes use verified links only; coalition totals are not assigned to members and members have no figure.",
  `Coefficients are within one country, on at least ${MIN_PAIRS_FOR_COEFFICIENT} pairs, and are shown with a leave-one-out range. Below that, only direction counts appear. Pairs are not pooled across countries because turnout bases differ.`,
  "Verified list movement is half the sum of absolute share changes among verified units. It is not party-system volatility, and its coverage is reported.",
  "No figure shows that economic conditions caused a result, or that any party caused an economic change. Parties are listed by label, and no result is predicted.",
] as const;
export const RESEARCH_LIMITS = [
  "Figures in the current-data views may include revisions made after the election.",
  "Released figures cover only the latest election in each country, so changes between elections cannot yet use them.",
  "Czech unemployment for August 2025: the release was not located, so the figure is not established.",
  "The Atlas holds no quarterly GDP series, so released GDP figures have no current value.",
  "Annual unemployment starts in 2021, and annual German GDP starts in 2021. Monthly unemployment starts in 2009 for Germany and 2015 for Poland and Slovakia.",
  "The Atlas records no governing-party data, so no figure relates a party's position to economic conditions.",
  "Several indicators are shown against two outcomes on few pairs, so some sizeable coefficients are expected by chance.",
  "A release date is the earliest located, not proven first publication, and publication does not show that voters saw a figure.",
] as const;

export function researchEvidencePackage(results: ResearchResults, elections: PoliticalElectionView[]) {
  const selected = elections.filter((e) => results.selection.electionIds.includes(e.electionId));
  const macroRows = results.allViewObservations.filter((o) => o.view === "released_before_election" && o.status === "observed");
  return {
    schema_version: RESEARCH_METHOD_VERSION, descriptive_only: true, selection: results.selection,
    method: { rules: RESEARCH_RULES, limits: RESEARCH_LIMITS, min_pairs_for_coefficient: MIN_PAIRS_FOR_COEFFICIENT },
    elections: selected.map((e) => ({ election_id: e.electionId, country: countryOf(e), date: e.date, chamber: e.chamber ?? null, published_turnout: e.publishedTurnout, turnout_numerator: e.national?.turnout.numerator ?? null, turnout_denominator: e.national?.turnout.denominator ?? null, result_vintage: e.resultVintage, sources: e.sources.map((s) => ({ id: s.id, institution: s.institution ?? null, url: s.url, sha256: s.sha256, retrieved_at: s.retrievedAt })) })),
    observations: results.allViewObservations,
    releases_used: [...new Map(macroRows.map((o) => [o.releaseSha256, { published_on: o.publishedOn, url: o.sourceUrl, sha256: o.releaseSha256 }])).values()].sort((a, b) => String(a.published_on).localeCompare(String(b.published_on))),
    question_a: results.a,
    question_b: results.b,
    question_c: { pairs: results.c.pairs.map((p) => ({ country: p.pair.country, from_election: p.pair.from.electionId, to_election: p.pair.to.electionId, months_between: p.pair.monthsBetween, turnout: p.turnout, verified_lists: p.lists })), associations: results.c.associations, direction_across_countries: results.c.direction },
    question_d: results.d,
    findings: researchFindings(results, elections),
  };
}
/** Hash of the evidence and results only, so the same data and selection always give the same digest. */
export async function researchDigest(evidence: ReturnType<typeof researchEvidencePackage>) {
  const bytes = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(evidence)));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const CSV_HEADER = ["record_type", "country", "election_id", "comparison_election_id", "indicator", "view", "frequency", "observation_period", "comparison_period", "value", "comparison_value", "difference", "unit", "status", "reason", "measure_key", "vintage", "data_layer", "published_on", "release_sha256", "source_url", "note"];
export function researchCsv(results: ResearchResults): string {
  const cell = (v: unknown) => { const s = String(v ?? ""); return `"${(typeof v === "string" && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replaceAll('"', '""')}"`; };
  const lines: unknown[][] = [];
  for (const o of results.allViewObservations) lines.push(["observation", o.country, o.electionId, "", o.indicator, o.view, o.frequency, o.period, "", o.value, "", "", o.unit, o.status, o.reason, o.measureKey, o.vintage, o.layer, o.publishedOn, o.releaseSha256, o.sourceUrl, o.flashEstimate ? "flash estimate" : o.includesPostElectionMonths ? "includes months after polling day" : ""]);
  for (const m of results.a.measures) lines.push(["across_elections", m.countries.join(" | "), m.min.electionIds.join(" | "), m.max.electionIds.join(" | "), m.indicator, m.view, m.frequency, "", "", m.min.value, m.max.value, m.range, m.unit, "calculated", "", m.measureKey, "", "", "", "", "", `n=${m.n}; median=${m.median}; election_id holds the minimum and comparison_election_id the maximum`]);
  for (const c of results.b) lines.push(["successive_change", c.country, c.toElection, c.fromElection, c.indicator, c.view, c.frequency, c.toPeriod, c.fromPeriod, c.toValue, c.fromValue, c.change, c.unit, c.status, c.reason, c.measureKey, "", c.crossesDataLayer ? `${c.fromLayer} to ${c.toLayer}` : c.toLayer, "", "", "", c.path ? `path ${c.path.firstPeriod} to ${c.path.lastPeriod}: observed ${c.path.observed} of ${c.path.expected}; mean ${c.path.mean}; min ${c.path.min}; max ${c.path.max}` : ""]);
  for (const p of results.c.pairs) {
    lines.push(["turnout_change", p.pair.country, p.pair.to.electionId, p.pair.from.electionId, "", "", "", "", "", p.turnout.toTurnout, p.turnout.fromTurnout, p.turnout.change, "percentage points", p.turnout.status, p.turnout.reason, "", `${p.turnout.fromVintage} to ${p.turnout.toVintage}`, "", "", "", "", p.turnout.basis]);
    lines.push(["verified_list_movement", p.pair.country, p.pair.to.electionId, p.pair.from.electionId, "", "", "", "", "", p.lists.verifiedShareMovement, "", "", "percentage points", p.lists.units.length ? "calculated" : "withheld", p.lists.units.length ? "" : "no_verified_unit_in_both_elections", "", "", "", "", "", "", `${p.lists.identityBasis}; units ${p.lists.units.length}; covered share ${p.lists.coveredShareFrom} to ${p.lists.coveredShareTo}; unresolved links ${p.lists.unresolvedLinks}; rules changed ${p.lists.rulesChanged}`]);
    for (const u of p.lists.units) lines.push(["verified_unit_change", p.pair.country, p.pair.to.electionId, p.pair.from.electionId, "", "", "", "", "", u.toShare, u.fromShare, u.shareChange, "percentage points", "calculated", "", u.id, "", "", "", "", "", `${u.kind}: ${u.label}`]);
  }
  for (const a of results.c.associations) lines.push(["association", a.country, "", "", a.indicator, a.view, "", "", "", a.pearson, a.spearman, "", "coefficient", a.status, "", a.outcome, "", "", "", "", "", `n=${a.n}; leave-one-out ${a.leaveOneOutPearson ? `${a.leaveOneOutPearson.min} to ${a.leaveOneOutPearson.max}` : "none"}; same-layer pairs ${a.sameDataLayerPairs}, Pearson ${a.sameDataLayerPearson ?? "none"}; same direction ${a.sameDirection ?? "n/a"}, opposite ${a.oppositeDirection ?? "n/a"}; value is Pearson and comparison_value is Spearman; association only, not causation`]);
  for (const r of results.d.released) for (const v of r.versus) lines.push(["released_versus_view", r.country, r.electionId, "", r.indicator, v.view, v.frequency, r.period, v.period, r.value, v.value, v.difference, r.unit, r.status, r.reason, v.relation, "dated_release", "", r.publishedOn, r.releaseSha256, r.sourceUrl, `value is the released figure and comparison_value is the current figure for the view; current same-period value ${r.currentValue ?? "not held"}; revision ${r.revisionSinceRelease ?? "none"}`]);
  for (const x of results.d.checks) for (const v of x.views) lines.push(["direction_check", "", x.electionB, x.electionA, x.indicator, v.view, "", "", "", x.releasedDifference, v.difference, "", "", v.directionChanged === null ? "not_comparable" : v.directionChanged ? "direction_differs" : "direction_same", "", "", "", "", "", "", "", "value is the released gap and comparison_value is the gap in the view, later minus earlier election"]);
  return `﻿${[CSV_HEADER.join(","), ...lines.map((line) => line.map(cell).join(","))].join("\n")}`;
}
