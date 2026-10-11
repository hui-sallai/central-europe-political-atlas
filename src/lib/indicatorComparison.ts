import { getResearchIndicator, researchObservations } from "@/lib/researchData";
import type { Country } from "@/types/Country";
import { latestCommon } from "@/lib/freshness";

export interface IndicatorComparisonColumn {
  indicator_id: string;
  label: string;
  unit: string;
  comparison_year: number | null;
  eligible_country_count: number;
  total_countries: number;
  heat_enabled: boolean;
  unavailability_note: string | null;
  values: Record<string, { value: number | null; year: number | null; comparable: boolean }>;
}

function comparableObservation(countrySlug: string, indicatorId: string, year: number) {
  const observation = researchObservations.find(
    (candidate) => candidate.country_slug === countrySlug && candidate.indicator === indicatorId && candidate.year === year,
  );
  if (!observation) return null;
  const valid = observation.value !== null
    && Number.isFinite(observation.value)
    && (observation.status === "official" || observation.status === "verified")
    && observation.comparability_status !== "definition_mismatch"
    && observation.applicability_status !== "not_applicable";
  return valid ? observation : null;
}

/**
 * Builds one matrix column on a strict same-definition / same-unit / same-year basis.
 * The centralized selector requires a common published year across all countries;
 * there is no partial-coverage fallback.
 */
export function buildIndicatorComparisonColumn(indicatorId: string, countries: Country[]): IndicatorComparisonColumn {
  const indicator = getResearchIndicator(indicatorId);
  const unit = indicator?.unit ?? "";
  const label = indicator?.name_zh ?? indicatorId;

  const comparisonYear = countries.length >= 2 ? latestCommon(countries.map(country => country.slug), indicatorId) : null;

  const values: IndicatorComparisonColumn["values"] = {};
  let eligibleCount = 0;
  for (const country of countries) {
    const observation = comparisonYear === null ? null : comparableObservation(country.slug, indicatorId, comparisonYear);
    if (observation && observation.value !== null) {
      values[country.slug] = { value: observation.value, year: comparisonYear, comparable: true };
      eligibleCount += 1;
    } else {
      values[country.slug] = { value: null, year: comparisonYear, comparable: false };
    }
  }

  const heatEnabled = comparisonYear !== null && eligibleCount >= 2;
  return {
    indicator_id: indicatorId,
    label,
    unit,
    comparison_year: comparisonYear,
    eligible_country_count: eligibleCount,
    total_countries: countries.length,
    heat_enabled: heatEnabled,
    unavailability_note: heatEnabled
      ? null
      : comparisonYear === null
        ? "comparison unavailable：该指标没有可比的共同年份。"
        : "comparison unavailable：共同年份下可比国家不足。",
    values,
  };
}
