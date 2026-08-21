import type { Country } from "@/types/Country";
import type { ModelCard, ModelOutput } from "@/types/ModelOutput";
import { calculateModelOutputForYear, eligibleModelYears } from "@/lib/modelFramework";
import { RELEASE_SCHEMA_VERSION } from "@/lib/releaseMetadata";

export type ModelComparisonExclusionReason = "insufficient_inputs" | "unavailable";

export interface ModelComparisonExcludedCountry {
  country: string;
  country_slug: string;
  reason: ModelComparisonExclusionReason;
  own_latest_input_year: number | null;
  detail: string;
}

export interface ModelComparisonGate {
  model_id: string;
  model_name_zh: string;
  same_model_version: string;
  same_formula_version: string;
  same_weight_version: string;
  comparison_year: number | null;
  eligible_country_count: number;
  total_countries: number;
  all_countries_eligible: boolean;
  definition_version: string;
}

export interface ModelComparisonResult {
  gate: ModelComparisonGate;
  eligible: ModelOutput[];
  excluded: ModelComparisonExcludedCountry[];
}

/**
 * Builds a formal cross-country comparison for one model. A country only enters the
 * eligible ranking when it has a valid model score at the shared comparison year under
 * the identical model / formula / weight version. Countries without valid inputs at the
 * common year are listed explicitly with an exclusion reason instead of being dropped
 * silently. No country is ever compared using a different input year.
 */
export function buildModelComparison(card: ModelCard, countries: Country[]): ModelComparisonResult {
  const yearsByCountry = new Map(countries.map((country) => [country.slug, eligibleModelYears(country.slug, card.inputs)]));

  const yearSupport = new Map<number, number>();
  for (const years of yearsByCountry.values()) {
    for (const year of years) yearSupport.set(year, (yearSupport.get(year) ?? 0) + 1);
  }

  let comparisonYear: number | null = null;
  let bestSupport = 0;
  for (const [year, support] of yearSupport) {
    if (support > bestSupport || (support === bestSupport && comparisonYear !== null && year > comparisonYear)) {
      bestSupport = support;
      comparisonYear = year;
    }
  }
  if (bestSupport < 2) comparisonYear = null;

  const eligible: ModelOutput[] = [];
  const excluded: ModelComparisonExcludedCountry[] = [];

  if (comparisonYear !== null) {
    for (const country of countries) {
      const years = yearsByCountry.get(country.slug) ?? [];
      if (!years.includes(comparisonYear)) {
        const anyObservationYear = years[0] ?? null;
        excluded.push({
          country: country.name_zh,
          country_slug: country.slug,
          reason: anyObservationYear === null ? "unavailable" : "insufficient_inputs",
          own_latest_input_year: anyObservationYear,
          detail: anyObservationYear === null
            ? "该模型没有任何通过准入的输入观测。"
            : `该模型在共同年份 ${comparisonYear} 的输入不足（自身最新可用输入年份：${anyObservationYear}）。`,
        });
        continue;
      }
      const output = calculateModelOutputForYear(country, card, comparisonYear);
      if (output.score === null || output.availability === "insufficient") {
        excluded.push({
          country: country.name_zh,
          country_slug: country.slug,
          reason: "insufficient_inputs",
          own_latest_input_year: years[0] ?? null,
          detail: `共同年份 ${comparisonYear} 下输入权重不足，不输出分数。`,
        });
        continue;
      }
      eligible.push(output);
    }
  } else {
    for (const country of countries) {
      excluded.push({
        country: country.name_zh,
        country_slug: country.slug,
        reason: "unavailable",
        own_latest_input_year: null,
        detail: "没有可用的共同比较年份。",
      });
    }
  }

  return {
    gate: {
      model_id: card.model_id,
      model_name_zh: card.name_zh,
      same_model_version: card.model_version,
      same_formula_version: card.formula_version,
      same_weight_version: card.weight_version,
      comparison_year: comparisonYear,
      eligible_country_count: eligible.length,
      total_countries: countries.length,
      all_countries_eligible: eligible.length === countries.length && comparisonYear !== null,
      definition_version: RELEASE_SCHEMA_VERSION,
    },
    eligible,
    excluded,
  };
}
