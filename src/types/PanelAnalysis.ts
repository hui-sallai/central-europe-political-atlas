export type PanelComparability = "comparable" | "partial_comparability" | "definition_mismatch";

export interface PanelObservation {
  observation_id: string;
  country: string;
  year: number;
  indicator: string;
  value: number | null;
  unit: string;
  source: string;
  source_url: string;
  source_reliability: "A" | "B" | "C" | "D";
  definition_version: string;
  comparability_status: PanelComparability;
  data_status: "official" | "verified" | "pending";
  updated_at: string;
  source_indicator: string;
  definition_note: string;
}

export interface PanelCoverageRecord {
  indicator: string;
  expected_observations: number;
  available_observations: number;
  comparable_available_observations: number;
  coverage_ratio: number;
  comparable_coverage_ratio: number;
  country_count: number;
  year_count: number;
  key_variable: boolean;
  gate_qualified: boolean;
  comparability_status: PanelComparability;
}

export type PanelRuntimeObservation = Pick<PanelObservation, "observation_id" | "country" | "year" | "indicator" | "value" | "comparability_status" | "data_status">;

export interface PanelSpecification {
  outcome: string;
  explanatory_variables: string[];
  countries: string[];
  start_year: number;
  end_year: number;
  fixed_effects: "none" | "country" | "country_year";
  standard_errors: "robust" | "cluster_country";
}

export interface PanelCoefficient {
  variable: string;
  coefficient: number;
  standard_error: number;
  t_stat: number;
  p_value: number;
  ci_95_low: number;
  ci_95_high: number;
}

export interface PanelAnalysisOutput {
  model: "pooled_ols" | "country_fixed_effects" | "country_and_year_fixed_effects";
  specification: PanelSpecification;
  coefficients: PanelCoefficient[];
  diagnostics: {
    observations: number;
    countries: number;
    years: number;
    r_squared: number;
    within_r_squared: number;
    missing_rows: number;
    standard_error_method: string;
    multicollinearity_warning: string | null;
    sample_coverage: number;
    year_coverage: string;
  };
  data_trace: string[];
  calculation_date: string;
  platform_version: string;
  interpretation_boundary: string;
}
