export type ModelId =
  | "household_economic_pressure"
  | "fiscal_pressure"
  | "external_vulnerability"
  | "industrial_dependency";

export type ModelAvailability = "sufficient" | "partial" | "insufficient";
export type ModelConfidence = "high" | "medium" | "low" | "not_available";
export type ModelTrend = "rising" | "falling" | "stable" | "not_available";

export interface ModelInputDefinition {
  indicator_id: string;
  label: string;
  weight: number;
  normalization: {
    method: "linear_clamp";
    lower: number;
    upper: number;
    invert?: boolean;
  };
  rationale: string;
}

export interface ModelCard {
  model_id: ModelId;
  model_version: string;
  name: string;
  name_zh: string;
  purpose: string;
  inputs: ModelInputDefinition[];
  reserved_inputs: string[];
  calculation_logic: string;
  weight_note: string;
  output_meaning: string;
  completeness_rule: string;
  limitations: string[];
  event_policy: string;
  weight_history: Array<{
    version: string;
    effective_date: string;
    note: string;
  }>;
  calculation_date: string;
}

export interface ModelInputTrace {
  indicator_id: string;
  indicator_name: string;
  observation_id: string;
  year: number;
  raw_value: number;
  unit: string;
  normalized_score: number;
  weight: number;
  weighted_contribution: number;
  source_name: string;
  source_url: string;
  source_reliability: string;
}

export interface ModelOutput {
  model_id: ModelId;
  model_version: string;
  country: string;
  country_slug: string;
  score: number | null;
  direction: ModelTrend;
  trend_change: number | null;
  main_drivers: string[];
  data_completeness: number;
  availability: ModelAvailability;
  confidence: ModelConfidence;
  calculation_date: string;
  input_year: number | null;
  input_observation_ids: string[];
  missing_indicator_ids: string[];
  inputs: ModelInputTrace[];
  related_event_ids: string[];
  interpretation_boundary: string;
}
