import type { ValueSemantics } from "./EventWindow";

/** Supported time-series transformations (v1.41). */
export type TransformationId = "level" | "first_difference" | "log_difference" | "log_difference_12";

export interface TimeSeriesTransformationSpec {
  indicator: string;
  input_semantics: ValueSemantics;
  allowed_transformations: TransformationId[];
  default_transformation: TransformationId;
  output_semantics: ValueSemantics;
  output_unit: string;
  stationarity_note: string;
}

/** One transformed observation with full raw-to-transformed trace. */
export interface TransformedPoint {
  period: string;
  value: number | null;
  transformation: TransformationId;
  /** Raw observation ids feeding this point (current + lagged raw values). */
  source_observation_ids: string[];
  raw_values: Array<number | null>;
}

export type StationarityStatus = "stationary" | "non_stationary" | "borderline" | "not_tested";

export interface AdfTestResult {
  test: "adf";
  regression: "c";
  series_length: number;
  used_lag: number;
  max_lag: number;
  autolag_criterion: "aic" | "bic" | null;
  nobs: number;
  statistic: number;
  p_value: number;
  critical_values: { "1%": number; "5%": number; "10%": number };
  status: StationarityStatus;
}

export interface KpssStatus {
  test: "kpss";
  status: "not_available";
  note: string;
}

export type InformationCriterion = "aic" | "bic" | "hqic";

export interface LagCandidateResult {
  lag: number;
  aic: number;
  bic: number;
  hqic: number;
  nobs: number;
  free_parameters: number;
}

export interface LagSelectionResult {
  criterion: InformationCriterion;
  max_lag: number;
  candidates: LagCandidateResult[];
  selected_lag: number;
  selected_ic_value: number;
}

export interface VarDiagnostics {
  stability: {
    stable: boolean;
    max_root_modulus: number;
    roots_moduli: number[];
  };
  residual_autocorrelation: {
    test: "portmanteau_adjusted";
    lags: number;
    statistic: number;
    degrees_of_freedom: number;
    p_value: number;
    status: "passed" | "failed" | "not_tested";
  };
  residual_autocorrelation_sensitivity: Array<{
    test: "portmanteau_adjusted";
    lags: number;
    statistic: number;
    degrees_of_freedom: number;
    p_value: number;
    status: "passed" | "failed" | "not_tested";
  }>;
  residual_lm: {
    status: "unavailable";
    note: string;
  };
}

export type VarSpecificationKind = "baseline_prespecified" | "exploratory_fallback" | "custom";

export interface VarComparabilitySignature {
  variables: string[];
  transformations: TransformationId[];
  frequency: "monthly";
  deterministic_terms: "constant";
  lag_policy: string;
  sample_policy: string;
  signature_id: string;
}

export interface VarSpecificationProfile {
  profile_id: string;
  profile_kind: "baseline_prespecified" | "exploratory_search_policy";
  name: string;
  variables: Array<{ role: string; indicator: string; transformation: TransformationId }>;
  deterministic_terms: "constant";
  sample_policy: { frequency: "monthly"; start_period: string; end_policy: "latest_country_observation"; minimum_effective_observations: number; contiguous_months_required: true };
  lag_policy: { criterion: InformationCriterion; max_lag: number; parameter_ratio_minimum: number; common_sample: true };
  fallback_policy: "none" | "documented_exploratory_chain";
  interpretation_boundary: string;
}

export interface IrfPath {
  shock_variable: string;
  response_variable: string;
  horizon: number[];
  response: number[];
}

export interface VarModelResult {
  engine_version: string;
  dataset_version: string;
  country: string;
  profile_id: string | null;
  specification_kind: VarSpecificationKind;
  comparability_signature: VarComparabilitySignature;
  variables: Array<{ indicator: string; transformation: TransformationId }>;
  variable_order: string[];
  sample: { start_period: string; end_period: string; effective_observations: number; dropped_periods: string[] };
  deterministic_terms: "constant";
  stationarity: Array<{ indicator: string; transformation: TransformationId; adf: AdfTestResult }>;
  lag_selection: LagSelectionResult;
  selected_lag: number;
  /** Coefficient matrices per lag, row = lagged variable, column = equation. */
  coefficient_matrices: number[][][];
  intercepts: number[];
  trend_coefficients: number[] | null;
  residual_covariance: number[][];
  diagnostics: VarDiagnostics;
  parameter_gate: { effective_observations: number; parameters_per_equation: number; ratio: number; passed: boolean };
  lag_preflight: { requested_max_lag: number; maximum_allowed_lag: number; applied_max_lag: number };
  irf: {
    method: "orthogonalized_reduced_form_cholesky";
    ordering: string[];
    ordering_dependency_note: string;
    uncertainty_status: "unavailable";
    uncertainty_note: string;
    horizons: number[];
    paths: IrfPath[];
  } | null;
  irf_blocked_reason: string | null;
  /** Transformed input series with raw-to-transformed trace (Input Data tab). */
  input_series: Array<{ indicator: string; transformation: TransformationId; points: TransformedPoint[] }>;
  data_trace: string[];
}

export type VarReadinessState =
  | "estimable"
  | "estimable_with_warning"
  | "dynamic_response_ready"
  | "insufficient_observations"
  | "missing_data"
  | "non_stationary"
  | "unstable"
  | "residual_diagnostics_failed"
  | "unsupported_specification";

export interface VarCountryReadiness {
  country: string;
  profile_id: string;
  profile_kind: "baseline_prespecified" | "exploratory_fallback";
  variables: Array<{ indicator: string; transformation: TransformationId }>;
  comparability_signature: VarComparabilitySignature;
  start_period: string | null;
  end_period: string | null;
  effective_observations: number;
  missing_ratio: number | null;
  stationarity_status: StationarityStatus;
  stationarity_detail: Array<{ indicator: string; transformation: TransformationId; adf: AdfTestResult }>;
  lag_selection_status: "completed" | "not_run";
  selected_lag: number | null;
  stability_status: "stable" | "unstable" | "not_run";
  residual_status: "passed" | "failed" | "not_run";
  estimable: boolean;
  dynamic_response_ready: boolean;
  irf_available: boolean;
  readiness_state: VarReadinessState;
  blocking_reasons: string[];
  fallback_attempts: Array<{
    attempt: number;
    variables: Array<{ indicator: string; transformation: TransformationId }>;
    outcome: string;
    reason: string | null;
  }>;
  selected_fallback: Array<{ indicator: string; transformation: TransformationId }> | null;
  selection_reason: string;
}

export interface VarReadinessPayload {
  schema_version: string;
  generated_at: string;
  estimable_countries: string[];
  dynamic_response_ready_countries: string[];
  baseline_profile_readiness: { profile_id: string; estimable_countries: string[]; dynamic_response_ready_countries: string[]; records: VarCountryReadiness[] };
  exploratory_profile_readiness: { profile_id: string; estimable_countries: string[]; dynamic_response_ready_countries: string[]; records: VarCountryReadiness[] };
  records: VarCountryReadiness[];
}
