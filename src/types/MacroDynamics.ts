import type { ValueSemantics } from "./EventWindow";

/** Supported time-series transformations (v1.4). */
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
  variables: Array<{ indicator: string; transformation: TransformationId }>;
  variable_order: string[];
  sample: { start_period: string; end_period: string; effective_observations: number; dropped_periods: string[] };
  deterministic_terms: "constant" | "constant_trend";
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
  | "ready"
  | "ready_with_warning"
  | "insufficient_observations"
  | "missing_data"
  | "non_stationary"
  | "unstable"
  | "diagnostics_failed"
  | "unsupported_specification";

export interface VarCountryReadiness {
  country: string;
  variables: Array<{ indicator: string; transformation: TransformationId }>;
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
  irf_available: boolean;
  readiness_state: VarReadinessState;
  blocking_reasons: string[];
}
