// Reusable matching of national elections to annual macroeconomic periods. Descriptive only: nothing here attributes an
// economic change to a party, ranks countries or estimates an effect. Three views stay separate:
// A retrospective calendar year (includes months after the election), B last complete year before the election, and
// C information demonstrably published before election day, documented only where a dated official release was read.
import { contextDifference, contextPublished, type ContextPoint } from "./politicalEconomicContext";
import { turnoutForDisplay, type PoliticalElectionView } from "./politicalExplorer";
import evidence from "./electionInformationEvidence.json";

export const ELECTION_MACRO_INDICATORS = ["hicp_inflation", "real_gdp_growth", "unemployment_rate", "fiscal_balance_gdp", "government_debt_gdp"] as const;
export type ElectionMacroIndicator = typeof ELECTION_MACRO_INDICATORS[number];
export type MacroView = "last_complete_year" | "retrospective_calendar_year";
export type MacroCell = { view: MacroView; period: string; value: number | null; unit: string | null; status: "published" | "pending" | "missing"; source: string | null; sourceUrl: string | null; definition: string | null; layer: string | null; comparable: boolean; includesPostElectionMonths: boolean; changeSincePreviousElection: number | null };
export type PublishedBeforeElection =
  | { status: "not_established"; reason: "first_release_dates_not_recorded" | "last_release_not_located"; note: string | null }
  | { status: "documented"; period: string; frequency: string; unit: string; publishedOn: string; earliestLocatedRelease: string; value: number; flashEstimate: boolean; releaseTopic: string; sourceUrl: string; releaseSha256: string; printedRow: string;
      laterReleases: { publishedOn: string; value: number; url: string }[]; current: { status: "published" | "not_held"; value: number | null; period: string; source: string | null }; revisionSinceRelease: number | null };
export type ElectionMacroRow = {
  country: string; countryName: PoliticalElectionView["countryName"]; electionId: string; electionDate: string; chamber: string | null; indicator: ElectionMacroIndicator;
  lastCompleteYear: MacroCell; retrospective: MacroCell;
  /** View C. A value appears only when read from a dated release before polling day; it is never filled from current data. */
  publishedBeforeElection: PublishedBeforeElection;
  electionSources: { id: string; institution: string; url: string }[];
  turnout: { published: number | null; computed: number | null; numerator: string | null; denominator: string | null; changeSincePrevious: number | null };
  seats: number | null; allocationMethod: string | null; thresholds: number[] | null; resultVintage: string; sourceIds: string[];
};

export function electionPeriods(date: string) {
  const year = Number(date.slice(0, 4));
  return { retrospective: String(year), lastComplete: String(year - 1) };
}

const CURRENT_SERIES: Partial<Record<ElectionMacroIndicator, string>> = { hicp_inflation: "hicp_annual_rate", unemployment_rate: "unemployment_rate_monthly", fiscal_balance_gdp: "fiscal_balance_gdp", government_debt_gdp: "government_debt_gdp" };
const PILOT_ELECTIONS = new Set(evidence.pilots.map((p) => p.election_id));
type ReleaseId = keyof typeof evidence.releases;

/** The last figure a dated release shows was public strictly before polling day. Current values stay separate. */
export function publishedBeforeElection(election: Pick<PoliticalElectionView, "electionId" | "date" | "country">, indicator: ElectionMacroIndicator, points: ContextPoint[]): PublishedBeforeElection {
  if (!PILOT_ELECTIONS.has(election.electionId)) return { status: "not_established", reason: "first_release_dates_not_recorded", note: null };
  const country = election.country ?? "germany";
  const release = (id: string) => evidence.releases[id as ReleaseId];
  const series = evidence.observations.filter((o) => o.country === country && o.indicator === indicator);
  const before = series.filter((o) => release(o.release).published_on < election.date).sort((a, b) => a.period.localeCompare(b.period) || release(a.release).published_on.localeCompare(release(b.release).published_on));
  const chosen = before.at(-1);
  if (!chosen) return { status: "not_established", reason: "last_release_not_located", note: evidence.not_located.find((n) => n.country === country && n.indicator === indicator)?.note ?? null };
  const samePeriod = series.filter((o) => o.period === chosen.period);
  const chosenDate = release(chosen.release).published_on;
  const seriesId = CURRENT_SERIES[indicator];
  const point = seriesId ? points.find((p) => p.country === country && p.indicator === seriesId && p.period === chosen.period) : undefined;
  const currentValue = point && contextPublished(point) ? point.value : null;
  return {
    status: "documented", period: chosen.period, frequency: chosen.frequency, unit: chosen.unit, publishedOn: chosenDate, earliestLocatedRelease: samePeriod.map((o) => release(o.release).published_on).sort()[0], value: chosen.value, flashEstimate: chosen.flash_estimate, releaseTopic: release(chosen.release).topic, sourceUrl: release(chosen.release).url, releaseSha256: release(chosen.release).sha256, printedRow: chosen.printed_row,
    laterReleases: samePeriod.filter((o) => release(o.release).published_on > chosenDate).map((o) => ({ publishedOn: release(o.release).published_on, value: o.value, url: release(o.release).url })).sort((a, b) => a.publishedOn.localeCompare(b.publishedOn)),
    current: { status: currentValue === null ? "not_held" : "published", value: currentValue, period: chosen.period, source: currentValue === null ? null : point!.source },
    revisionSinceRelease: currentValue === null ? null : Number((currentValue - chosen.value).toFixed(6)),
  };
}

/** Each election's research record cites its own institutions; a missing institution is stated, never substituted. */
export function electionSourceCitations(elections: PoliticalElectionView[]) {
  return elections.flatMap((e) => e.sources.map((s) => ({ institution: s.institution ?? "Institution not recorded", dataset: s.title, url: s.url, code: s.id, layer: "tier1_official", retrieved_at: s.retrievedAt })));
}
export const electionCountryRoute = (country: string) => (country === "germany" ? "/politics/" : `/politics/${country}/`);

function cell(points: ContextPoint[], country: string, indicator: string, period: string, view: MacroView): MacroCell {
  const point = points.find((p) => p.country === country && p.indicator === indicator && p.frequency === "annual" && p.period === period);
  const published = Boolean(point && contextPublished(point));
  return { view, period, value: published ? point!.value : null, unit: point?.unit ?? null, status: published ? "published" : point?.status === "pending" ? "pending" : "missing", source: point?.source ?? null, sourceUrl: point?.sourceUrl ?? null, definition: point?.definition ?? null, layer: point?.layer ?? null, comparable: point?.comparable ?? false, includesPostElectionMonths: view === "retrospective_calendar_year", changeSincePreviousElection: null };
}

/** Turnout changes only within one country and only when numerator and denominator match. */
function turnoutChange(a: PoliticalElectionView, b: PoliticalElectionView): number | null {
  const x = turnoutForDisplay(a), y = turnoutForDisplay(b);
  if (x.value === null || y.value === null || x.computed !== y.computed || a.national?.turnout.numerator !== b.national?.turnout.numerator || a.national?.turnout.denominator !== b.national?.turnout.denominator) return null;
  return y.value - x.value;
}

export function electionMacroRows(elections: PoliticalElectionView[], points: ContextPoint[]): ElectionMacroRow[] {
  const sorted = [...elections].sort((a, b) => (a.country ?? "").localeCompare(b.country ?? "") || a.date.localeCompare(b.date));
  return sorted.flatMap((election) => {
    const country = election.country ?? "germany";
    const previous = sorted.filter((e) => e.country === election.country && e.date < election.date).at(-1) ?? null;
    const periods = electionPeriods(election.date);
    return ELECTION_MACRO_INDICATORS.map((indicator): ElectionMacroRow => {
      const find = (period: string) => points.find((p) => p.country === country && p.indicator === indicator && p.frequency === "annual" && p.period === period) ?? null;
      const change = (period: (date: string) => string, date: string) => previous ? contextDifference(find(period(previous.date)), find(period(date)), previous.date, date) : null;
      return {
        country, countryName: election.countryName, electionId: election.electionId, electionDate: election.date, chamber: election.chamber ?? null, indicator,
        lastCompleteYear: { ...cell(points, country, indicator, periods.lastComplete, "last_complete_year"), changeSincePreviousElection: change((d) => electionPeriods(d).lastComplete, election.date) },
        retrospective: { ...cell(points, country, indicator, periods.retrospective, "retrospective_calendar_year"), changeSincePreviousElection: change((d) => electionPeriods(d).retrospective, election.date) },
        publishedBeforeElection: publishedBeforeElection(election, indicator, points),
        electionSources: election.sources.map((s) => ({ id: s.id, institution: s.institution ?? "Institution not recorded", url: s.url })),
        turnout: { published: election.publishedTurnout, computed: turnoutForDisplay(election).computed ? turnoutForDisplay(election).value : null, numerator: election.national?.turnout.numerator ?? null, denominator: election.national?.turnout.denominator ?? null, changeSincePrevious: previous ? turnoutChange(previous, election) : null },
        seats: election.totalSeats, allocationMethod: election.system.allocationMethod, thresholds: election.national?.rules.thresholds?.map((t) => t.percent).filter((p): p is number => p !== null) ?? null, resultVintage: election.resultVintage, sourceIds: election.sources.map((s) => s.id),
      };
    });
  });
}

export function electionMacroCoverage(rows: ElectionMacroRow[]) {
  return ELECTION_MACRO_INDICATORS.map((indicator) => {
    const selected = rows.filter((r) => r.indicator === indicator);
    return { indicator, elections: selected.length, lastCompleteYear: selected.filter((r) => r.lastCompleteYear.status === "published").length, retrospective: selected.filter((r) => r.retrospective.status === "published").length, publishedBeforeElection: selected.filter((r) => r.publishedBeforeElection.status === "documented").length };
  });
}

export function electionMacroCsv(rows: ElectionMacroRow[]): string {
  const text = (v: unknown) => { const s = String(v ?? ""); return `"${(typeof v === "string" && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replaceAll('"', '""')}"`; };
  const header = ["country", "election_id", "election_date", "chamber", "indicator", "view", "observation_period", "value", "unit", "value_status", "includes_post_election_months", "published_before_election", "change_since_previous_election", "source", "source_url", "definition", "data_layer", "result_vintage", "turnout_published", "turnout_numerator", "turnout_denominator", "turnout_change_since_previous", "total_seats", "allocation_method", "thresholds_percent", "election_source_institutions", "election_source_urls", "as_of_period", "as_of_publication_date", "as_of_earliest_located_release", "as_of_value", "as_of_flash_estimate", "as_of_unit", "as_of_source_url", "as_of_release_sha256", "as_of_later_releases", "as_of_current_value", "as_of_revision_since_release", "as_of_not_established_reason", "limitation"];
  const clean = (v: number | null) => (v === null ? null : Number(v.toFixed(6))); // differences only; source values are untouched
  const limitation = "Descriptive. value is the current data vintage, not the figure available at the time; as_of fields come from dated releases where documented. No causal or party attribution.";
  const asOf = (r: ElectionMacroRow) => { const a = r.publishedBeforeElection; return a.status === "documented" ? [a.period, a.publishedOn, a.earliestLocatedRelease, a.value, a.flashEstimate, a.unit, a.sourceUrl, a.releaseSha256, a.laterReleases.map((l) => `${l.publishedOn}: ${l.value}`).join(" | "), a.current.value, a.revisionSinceRelease, ""] : ["", "", "", "", "", "", "", "", "", "", "", a.reason]; };
  const lines = rows.flatMap((r) => [r.lastCompleteYear, r.retrospective].map((c) => [r.country, r.electionId, r.electionDate, r.chamber, r.indicator, c.view, c.period, c.value, c.unit, c.status, c.includesPostElectionMonths, r.publishedBeforeElection.status, clean(c.changeSincePreviousElection), c.source, c.sourceUrl, c.definition, c.layer, r.resultVintage, r.turnout.published, r.turnout.numerator, r.turnout.denominator, clean(r.turnout.changeSincePrevious), r.seats, r.allocationMethod, r.thresholds?.join(" / "), [...new Set(r.electionSources.map((s) => s.institution))].join(" | "), [...new Set(r.electionSources.map((s) => s.url))].join(" | "), ...asOf(r), limitation].map(text).join(",")));
  return `\uFEFF${[header.join(","), ...lines].join("\n")}`;
}
