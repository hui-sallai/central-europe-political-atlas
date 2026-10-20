import { monthNumber, monthlyIndicators, monthlyUrl, monthlyValid, type MonthlySession } from "./monthlyComparison";

// Build-time projection of the existing eligibility checks; periods only, never another observation store.
export type MonthlyComparisonCoverage = Record<string, Record<string, string[]>>;
export function handoffIndicator(source: string, explicit = ""): string | null {
  return Object.hasOwn(monthlyIndicators, source) ? source : Object.hasOwn(monthlyIndicators, explicit) ? explicit : null;
}
export function handoffPeriod(coverage: MonthlyComparisonCoverage, country: string, indicator: string, fromYear: string, toYear: string) {
  const periods = (coverage[country]?.[indicator] ?? []).filter(period => Number.isFinite(monthNumber(period))).sort();
  const year = (value: string) => /^\d{4}$/.test(value) && Number(value) >= 1000;
  if ((fromYear !== "all" && !year(fromYear)) || (toYear !== "all" && !year(toYear))) return null;
  const requestedFrom = fromYear === "all" ? periods[0] : `${fromYear}-01`;
  const requestedTo = toYear === "all" ? periods.at(-1) : `${toYear}-12`;
  if (!requestedFrom || !requestedTo || requestedFrom > requestedTo) return null;
  const available = periods.filter(period => period >= requestedFrom && period <= requestedTo);
  if (!available.length) return null;
  return { requestedFrom, requestedTo, from: available[0], to: available.at(-1)!, count: available.length, clipped: available[0] !== requestedFrom || available.at(-1) !== requestedTo };
}
export function handoffMonths(coverage: MonthlyComparisonCoverage, country: string, indicator: string, from: string, to: string): string[] {
  return (coverage[country]?.[indicator] ?? []).filter(period => period >= from && period <= to && Number.isFinite(monthNumber(period)));
}
export function monthlyHandoff({ country, additional, countries, sourceIndicator, explicitIndicator = "", fromYear, toYear, coverage, en }: {
  country: string; additional: string[]; countries: readonly string[]; sourceIndicator: string; explicitIndicator?: string; fromYear: string; toYear: string; coverage: MonthlyComparisonCoverage; en: boolean;
}): { session: MonthlySession; url: string } | null {
  const indicator = handoffIndicator(sourceIndicator, explicitIndicator);
  if (!indicator || !countries.includes(country) || additional.includes(country) || new Set(additional).size !== additional.length || additional.some(c => !countries.includes(c))) return null;
  const period = handoffPeriod(coverage, country, indicator, fromYear, toYear);
  if (!period) return null;
  const session: MonthlySession = { countries: [country, ...additional], indicator, from: period.from, to: period.to, mode: "common", month: "", issues: [] };
  if (!monthlyValid(session) || session.countries.some(c => !handoffMonths(coverage, c, indicator, period.from, period.to).length)) return null;
  return { session, url: monthlyUrl(session, en) };
}
