import type { ModelAvailability, ModelConfidence } from "@/types/ModelOutput";

export type ChinaExposureDimension = "project" | "trade" | "investment" | "industrial";

export interface ChinaExposureCalculationTrace {
  numerator: number | null;
  denominator: number | null;
  numerator_source_url: string | null;
  denominator_source_url: string | null;
  formula: string;
}

export interface ChinaExposureVariable {
  variable_id: string;
  country: string;
  country_slug: string;
  dimension: ChinaExposureDimension;
  raw_value: number | null;
  unit: string;
  year: number | null;
  source: string;
  source_url: string | null;
  source_reliability: "A" | "B" | "C" | "D";
  calculation_method: string;
  data_completeness: number;
  model_eligible: boolean;
  limitation_note: string;
  normalized_score: number | null;
  weight: number;
  calculation_trace: ChinaExposureCalculationTrace | null;
  related_observation_ids: string[];
  related_project_ids: string[];
}

export interface ChinaExposureDimensionOutput {
  dimension: ChinaExposureDimension;
  name_zh: string;
  score: number | null;
  availability: ModelAvailability;
  confidence: ModelConfidence;
  data_completeness: number;
  main_drivers: string[];
  missing_variables: string[];
  variables: ChinaExposureVariable[];
  limitation_note: string;
}

export interface ChinaExposureOutput {
  model_id: "china_economic_exposure";
  model_version: string;
  country: string;
  country_slug: string;
  dimensions: ChinaExposureDimensionOutput[];
  overall_score: number | null;
  overall_availability: ModelAvailability;
  overall_decision: "available" | "unavailable";
  sufficient_dimension_count: number;
  calculation_date: string;
  related_event_ids: string[];
  related_project_ids: string[];
  interpretation_boundary: string;
}

export interface ChinaExposureModelCard {
  model_id: "china_economic_exposure";
  model_version: string;
  name: string;
  name_zh: string;
  purpose: string;
  dimensions: Array<{
    id: ChinaExposureDimension;
    name_zh: string;
    variables: Array<{
      variable_id: string;
      weight: number;
      normalization: { method: "linear_clamp"; lower: number; upper: number } | null;
      use: "score" | "context";
    }>;
  }>;
  overall_rule: string;
  event_policy: string;
  limitations: string[];
  calculation_date: string;
}
