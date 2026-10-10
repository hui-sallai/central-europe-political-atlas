// Data Freshness selectors bound to the annual formal observations (server-side use: pages and libraries).
// The rules live in freshnessCore.ts; this module only supplies the data and the existing comparability rule
// (same as the indicator matrix: definition mismatches and not-applicable records are not cross-country comparable).
import { getCountryObservations } from "@/lib/researchData";
import type { Observation } from "@/types/researchData";
import { compareSeries, latestCommonYear, latestPublished, type CompareMode, type CompareResult, type FreshnessPoint } from "./freshnessCore";

export type { CompareMode, CompareResult } from "./freshnessCore";

type FreshObservation = Observation & FreshnessPoint;

function series(countrySlug: string, indicatorId: string): FreshObservation[] {
  return getCountryObservations(countrySlug, indicatorId).map((observation) => ({
    ...observation,
    comparable: observation.comparability_status !== "definition_mismatch" && observation.applicability_status !== "not_applicable",
  }));
}

/** Last non-null published observation for a country and indicator (missing stays missing). */
export function latestAvailable(countrySlug: string, indicatorId: string): Observation | undefined {
  return latestPublished(series(countrySlug, indicatorId));
}

/** Latest year in which all listed countries have a published, comparable value with the same unit; else null. */
export function latestCommon(countrySlugs: readonly string[], indicatorId: string): number | null {
  return latestCommonYear(countrySlugs.map((slug) => series(slug, indicatorId)));
}

/** Per-country { value, unit, year } under an explicit mode, with periods_differ and common_year. */
export function compare(countrySlugs: readonly string[], indicatorId: string, mode: CompareMode): CompareResult<FreshObservation> {
  return compareSeries(Object.fromEntries(countrySlugs.map((slug) => [slug, series(slug, indicatorId)])), mode);
}
