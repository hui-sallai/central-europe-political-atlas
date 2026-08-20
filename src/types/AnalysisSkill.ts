export type AnalysisSkillCategory =
  | "composite_indicators"
  | "panel_econometrics"
  | "macro_time_series"
  | "event_analysis"
  | "network_analysis"
  | "bayesian_analysis";

export type AnalysisCalculationMode = "active" | "registry_only";

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
