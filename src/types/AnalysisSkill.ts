import type { PanelRuntimeObservation } from "@/types/PanelAnalysis";

export type AnalysisSkillCategory =
  | "composite_indicators"
  | "panel_econometrics"
  | "macro_time_series"
  | "event_analysis"
  | "network_analysis"
  | "bayesian_analysis";

export type AnalysisCalculationMode = "active" | "data_building" | "registry_only" | "blocked";

export interface AnalysisSkill {
  skill_id: string;
  name: string;
  category: AnalysisSkillCategory;
  description: string;
  required_data: string[];
  optional_data: string[];
  parameters: string[];
  minimum_observations: number;
  supported_spatial_level: string[];
  supported_frequency: string[];
  calculation_mode: AnalysisCalculationMode;
  output_schema: string[];
  diagnostics: string[];
  limitations: string[];
  citation: string;
}

export interface ScenarioPreset {
  scenario_id: string;
  target_skill: string;
  predefined_parameters: Record<string, number | string>;
  explanation: string;
}

export type AnalysisRunStatus = "completed" | "unavailable" | "data_building" | "registry_only" | "blocked";

export interface AnalysisDataset {
  country_slug?: string;
  model_id?: string;
  panel_observations?: PanelRuntimeObservation[];
}

export interface AnalysisRunRequest {
  skillId: string;
  dataset: AnalysisDataset;
  parameters?: Record<string, unknown>;
}

export interface AnalysisDiagnostics {
  input_completeness: number | null;
  year_alignment: string;
  validation_gate: string;
  missing_variables: string[];
}

export interface AnalysisResult<TEstimate = unknown> {
  status: AnalysisRunStatus;
  estimates: TEstimate | null;
  diagnostics: AnalysisDiagnostics;
  visualizations: Array<{ type: string; title: string; data: unknown }>;
  data_trace: string[];
  limitations: string[];
}
