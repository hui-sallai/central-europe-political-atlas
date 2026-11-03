// Reusable matching of national elections to annual macroeconomic periods. Descriptive only: nothing here attributes an
// economic change to a party, ranks countries or estimates an effect. Three views stay separate:
// A retrospective calendar year (includes months after the election), B last complete year before the election, and
// C information demonstrably published before election day, which needs release dates the Atlas does not hold.
import { contextDifference, contextPublished, type ContextPoint } from "./politicalEconomicContext";
import type { PoliticalElectionView } from "./politicalExplorer";

export const ELECTION_MACRO_INDICATORS = ["hicp_inflation", "real_gdp_growth", "unemployment_rate", "fiscal_balance_gdp", "government_debt_gdp"] as const;
export type ElectionMacroIndicator = typeof ELECTION_MACRO_INDICATORS[number];
export type MacroView = "last_complete_year" | "retrospective_calendar_year";
export type MacroCell = { view: MacroView; period: string; value: number | null; unit: string | null; status: "published" | "pending" | "missing"; source: string | null; sourceUrl: string | null; definition: string | null; layer: string | null; comparable: boolean; includesPostElectionMonths: boolean; changeSincePreviousElection: number | null };
export type ElectionMacroRow = {
  country: string; countryName: PoliticalElectionView["countryName"]; electionId: string; electionDate: string; chamber: string | null; indicator: ElectionMacroIndicator;
  lastCompleteYear: MacroCell; retrospective: MacroCell;
  /** View C. Always not established: no dataset here records when a figure was first released. */
  publishedBeforeElection: { status: "not_established"; reason: "first_release_dates_not_recorded" };
  turnout: { published: number | null; numerator: string | null; denominator: string | null; changeSincePrevious: number | null };
  seats: number | null; allocationMethod: string | null; thresholds: number[] | null; resultVintage: string; sourceIds: string[];
};

export function electionPeriods(date: string) {
  const year = Number(date.slice(0, 4));
  return { retrospective: String(year), lastComplete: String(year - 1) };
}

function cell(points: ContextPoint[], country: string, indicator: string, period: string, view: MacroView): MacroCell {
  const point = points.find((p) => p.country === country && p.indicator === indicator && p.frequency === "annual" && p.period === period);
  const published = Boolean(point && contextPublished(point));
  return { view, period, value: published ? point!.value : null, unit: point?.unit ?? null, status: published ? "published" : point?.status === "pending" ? "pending" : "missing", source: point?.source ?? null, sourceUrl: point?.sourceUrl ?? null, definition: point?.definition ?? null, layer: point?.layer ?? null, comparable: point?.comparable ?? false, includesPostElectionMonths: view === "retrospective_calendar_year", changeSincePreviousElection: null };
}

/** Turnout changes only within one country and only when numerator and denominator match. */
function turnoutChange(a: PoliticalElectionView, b: PoliticalElectionView): number | null {
  if (a.publishedTurnout === null || b.publishedTurnout === null || a.national?.turnout.numerator !== b.national?.turnout.numerator || a.national?.turnout.denominator !== b.national?.turnout.denominator) return null;
  return b.publishedTurnout - a.publishedTurnout;
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
        publishedBeforeElection: { status: "not_established", reason: "first_release_dates_not_recorded" },
        turnout: { published: election.publishedTurnout, numerator: election.national?.turnout.numerator ?? null, denominator: election.national?.turnout.denominator ?? null, changeSincePrevious: previous ? turnoutChange(previous, election) : null },
        seats: election.totalSeats, allocationMethod: election.system.allocationMethod, thresholds: election.national?.rules.thresholds?.map((t) => t.percent).filter((p): p is number => p !== null) ?? null, resultVintage: election.resultVintage, sourceIds: election.sources.map((s) => s.id),
      };
    });
  });
}

export function electionMacroCoverage(rows: ElectionMacroRow[]) {
  return ELECTION_MACRO_INDICATORS.map((indicator) => {
    const selected = rows.filter((r) => r.indicator === indicator);
    return { indicator, elections: selected.length, lastCompleteYear: selected.filter((r) => r.lastCompleteYear.status === "published").length, retrospective: selected.filter((r) => r.retrospective.status === "published").length, publishedBeforeElection: 0 };
  });
}

export function electionMacroCsv(rows: ElectionMacroRow[]): string {
  const text = (v: unknown) => { const s = String(v ?? ""); return `"${(typeof v === "string" && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replaceAll('"', '""')}"`; };
  const header = ["country", "election_id", "election_date", "chamber", "indicator", "view", "observation_period", "value", "unit", "value_status", "includes_post_election_months", "published_before_election", "change_since_previous_election", "source", "source_url", "definition", "data_layer", "result_vintage", "turnout_published", "turnout_numerator", "turnout_denominator", "turnout_change_since_previous", "total_seats", "allocation_method", "thresholds_percent", "limitation"];
  const clean = (v: number | null) => (v === null ? null : Number(v.toFixed(6))); // differences only; source values are untouched
  const limitation = "Descriptive. Current data vintage, not the figures available at the time; no causal or party attribution.";
  const lines = rows.flatMap((r) => [r.lastCompleteYear, r.retrospective].map((c) => [r.country, r.electionId, r.electionDate, r.chamber, r.indicator, c.view, c.period, c.value, c.unit, c.status, c.includesPostElectionMonths, r.publishedBeforeElection.status, clean(c.changeSincePreviousElection), c.source, c.sourceUrl, c.definition, c.layer, r.resultVintage, r.turnout.published, r.turnout.numerator, r.turnout.denominator, clean(r.turnout.changeSincePrevious), r.seats, r.allocationMethod, r.thresholds?.join(" / "), limitation].map(text).join(",")));
  return `\uFEFF${[header.join(","), ...lines].join("\n")}`;
}
