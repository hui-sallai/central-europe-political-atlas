import type { ModelCard, ModelConfidence, ModelId, ModelOutput } from "@/types/ModelOutput";

export type ScenarioId =
  | "inflation_resurgence"
  | "eu_funds_delay"
  | "energy_price_shock"
  | "germany_demand_slowdown";

export type ScenarioStatus = "available" | "unavailable";
export type ScenarioShockOperation = "additive" | "proportional" | "adverse_proportional";

export interface ScenarioDefinition {
  scenario_id: ScenarioId;
  name: string;
  name_zh: string;
  description: string;
  affected_country_slugs: "all" | string[];
  affected_indicators: string[];
  affected_models: string[];
  reference_model_id: ModelId;
  adjusted_indicator_id: string | null;
  shock_label: string;
  shock_unit: string;
  shock_min: number;
  shock_max: number;
  shock_step: number;
  default_shock_value: number;
  shock_multiplier: 1 | -1;
  shock_operation: ScenarioShockOperation;
  transmission_chain: string[];
  confidence: ModelConfidence;
  calculation_status: ScenarioStatus;
  unavailable_reason: string | null;
  limitations: string[];
}

export interface ScenarioAdjustedInput {
  indicator_id: string;
  indicator_name: string;
  observation_id: string;
  year: number;
  baseline_value: number;
  shock_value: number;
  adjusted_value: number;
  unit: string;
  normalized_baseline: number;
  normalized_adjusted: number;
  weight: number;
  source_name: string;
  source_url: string;
  source_reliability: string;
}

export interface ScenarioResult {
  scenario_id: ScenarioId;
  country_slug: string;
  model_id: ModelId;
  model_name: string;
  status: ScenarioStatus;
  baseline_score: number | null;
  scenario_score: number | null;
  score_change: number | null;
  confidence: ModelConfidence;
  calculation_date: string;
  adjusted_input: ScenarioAdjustedInput | null;
  input_observation_ids: string[];
  transmission_chain: string[];
  limitations: string[];
  unavailable_reason: string | null;
  interpretation_boundary: string;
}

export interface ScenarioCalculationContext {
  definition: ScenarioDefinition;
  countrySlug: string;
  shockValue: number;
  cards: ModelCard[];
  outputs: ModelOutput[];
}
