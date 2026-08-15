import type { ModelCard, ModelConfidence, ModelId, ModelOutput } from "@/types/ModelOutput";

export type ScenarioId =
  | "inflation_resurgence"
  | "eu_funds_delay"
  | "energy_price_shock"
  | "germany_demand_slowdown";

export type ScenarioStatus = "available" | "unavailable";
export type ScenarioShockOperation = "additive" | "proportional" | "adverse_proportional";
export type TransmissionRole = "direct" | "contextual";
export type TransmissionDirection = "increase" | "decrease" | "conditional";
export type ScenarioConfidenceLevel = "high" | "medium" | "low" | "not_available";

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
  purpose: string;
  direct_variables: string[];
  contextual_variables: string[];
  assumptions: string[];
  transmission_chain: string[];
  confidence: ModelConfidence;
  calculation_status: ScenarioStatus;
  unavailable_reason: string | null;
  limitations: string[];
}

export interface TransmissionChannel {
  transmission_id: string;
  scenario_id: ScenarioId;
  shock_variable: string;
  affected_indicator: string;
  affected_model: ModelId;
  direction: TransmissionDirection;
  transmission_channel: string;
  direct_or_indirect: TransmissionRole;
  regional_context_indicator: string[];
  project_context: boolean;
  event_context: boolean;
  confidence: ScenarioConfidenceLevel;
  limitations: string;
}

export interface ScenarioConfidenceDecomposition {
  baseline_data_completeness: number;
  model_eligibility: number;
  direct_transmission_coverage: number;
  regional_context_coverage: number;
  project_event_evidence_quality: number;
  aggregate: number;
  label: ScenarioConfidenceLevel;
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
  shock_value: number;
  baseline_score: number | null;
  scenario_score: number | null;
  score_change: number | null;
  confidence: ModelConfidence;
  confidence_decomposition: ScenarioConfidenceDecomposition;
  baseline_date: string | null;
  model_version: string | null;
  formula_version: string;
  calculation_date: string;
  calculation_timestamp: string;
  adjusted_input: ScenarioAdjustedInput | null;
  input_observation_ids: string[];
  transmission_chain: string[];
  limitations: string[];
  unavailable_reason: string | null;
  interpretation_boundary: string;
}

export interface ScenarioRegionalContextValue {
  region_id: string;
  region_name: string;
  indicator_id: string;
  indicator_name: string;
  year: string;
  value: number;
  unit: string;
  source_name: string;
  source_url: string;
}

export interface ScenarioRegionalContext {
  scenario_id: ScenarioId;
  country_slug: string;
  status: "available" | "unavailable";
  context_indicator_ids: string[];
  values: ScenarioRegionalContextValue[];
  map_layer_id: string | null;
  interpretation_boundary: string;
  unavailable_reason: string | null;
}

export interface ScenarioEvidenceLink {
  evidence_link_id: string;
  scenario_id: ScenarioId;
  country_slug: string;
  evidence_type: "event" | "project";
  evidence_id: string;
  title: string;
  relation: "direct" | "contextual";
  source_name: string;
  source_url: string | null;
  source_reliability: string;
  evidence_status: string;
  enters_score: false;
}

export interface ScenarioSensitivityPoint {
  scenario_id: ScenarioId;
  country_slug: string;
  shock_value: number;
  baseline_score: number | null;
  scenario_score: number | null;
  score_change: number | null;
  status: ScenarioStatus;
}

export interface ScenarioBacktestRecord {
  scenario_id: ScenarioId;
  historical_period: string;
  baseline_date: string;
  shock_definition: string;
  observed_outcome: string;
  comparable_indicator: string;
  evaluation_status: "structure_only" | "exploratory" | "unavailable";
  notes: string;
}

export interface ScenarioCalculationContext {
  definition: ScenarioDefinition;
  countrySlug: string;
  shockValue: number;
  cards: ModelCard[];
  outputs: ModelOutput[];
  regionalContextCoverage?: number;
  evidenceQuality?: number;
}
