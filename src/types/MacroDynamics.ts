import type { ValueSemantics } from "./EventWindow";

/** Supported time-series transformations (v1.44). */
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

export type StationaritySpecificationId =
  | "adf_constant"
  | "adf_constant_seasonal_dummies"
  | "adf_constant_seasonal_dummies_mc"
  | "adf_constant_trend";

export type StationarityDecision =
  | "stationary"
  | "stationary_with_seasonal_controls"
  | "non_stationary"
  | "inconclusive"
  | "break_sensitive"
  | "not_tested";

export interface AdfTestResult {
  test: "adf";
  regression: "c" | "c+seasonal_dummies";
  deterministic_terms: "constant" | "constant_month_dummies";
  seasonal_dummies: number;
  reference_month: "January" | null;
  series_length: number;
  used_lag: number;
  max_lag: number;
  autolag_criterion: "aic" | "bic" | null;
  nobs: number;
  statistic: number;
  p_value: number | null;
  critical_values: { "1%": number; "5%": number; "10%": number };
  critical_value_policy: string;
  p_value_policy: string;
  lagged_level_coefficient: number | null;
  lagged_level_standard_error: number | null;
  calibration: {
    specification_id: "adf_constant_seasonal_dummies_mc";
    sample_size_basis: "input_series_length_before_adf_lag_loss";
    requested_sample_size: number;
    calibration_n_lower: number;
    calibration_n_upper: number;
    interpolation_weight: number;
    interpolation_policy: string;
    replications_lower: number;
    replications_upper: number;
    generator_version: string;
    source_commit: string;
  } | null;
  status: StationarityStatus;
}

export interface PersistenceDiagnostics {
  nobs: number;
  max_lag: number;
  acf: Array<{ lag: number; value: number }>;
  pacf: Array<{ lag: number; value: number }>;
  seasonal_lag_12_autocorrelation: number | null;
  seasonal_persistence_warning: boolean;
  approximate_significance_band_95: { lower: number; upper: number; formula: "plus_minus_1.96_over_sqrt_n" };
  interpretation_boundary: string;
}

export interface StationarityEvidence {
  indicator: string;
  transformation: TransformationId;
  stationarity_specification_id: StationaritySpecificationId;
  formal_decision: StationarityDecision;
  adf: AdfTestResult;
  constant_only_adf: AdfTestResult | null;
  legacy_seasonal_adf: AdfTestResult | null;
  seasonal_unit_root_status: "not_available";
  structural_break_status: "registry_only";
  persistence: PersistenceDiagnostics;
}

export interface KpssStatus {
  test: "kpss";
  status: "not_available";
  note: string;
}

export type InformationCriterion = "aic" | "bic" | "hqic";
export type VarDeterministicTerms = "constant" | "constant_month_dummies";
export type VarIrfHorizon = 6 | 12 | 18 | 24;

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

export interface VarLagDiagnosticRow extends LagCandidateResult {
  stable: boolean;
  max_root_modulus: number;
  portmanteau_h12_status: "passed" | "failed" | "not_tested";
  portmanteau_h18_status: "passed" | "failed" | "not_tested";
  portmanteau_h24_status: "passed" | "failed" | "not_tested";
  is_bic_baseline: boolean;
  is_diagnostically_adequate_alternative: boolean;
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
  residual_seasonality: {
    residual_month_of_year_means: Array<{ month: number; values: number[] }>;
    residual_month_of_year_variances: Array<{ month: number; values: number[] }>;
  };
}

export type VarSpecificationKind = "baseline_prespecified" | "exploratory_fallback" | "custom";

export interface VarComparabilitySignature {
  variables: string[];
  transformations: TransformationId[];
  frequency: "monthly";
  deterministic_terms: VarDeterministicTerms;
  stationarity_specification_id: StationaritySpecificationId;
  lag_policy: string;
  sample_policy: string;
  signature_id: string;
}

export interface VarSpecificationProfile {
  profile_id: string;
  profile_kind: "baseline_prespecified" | "exploratory_search_policy";
  name: string;
  variables: Array<{ role: string; indicator: string; transformation: TransformationId }>;
  deterministic_terms: VarDeterministicTerms;
  stationarity_specification_id: StationaritySpecificationId;
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
  deterministic_terms: VarDeterministicTerms;
  stationarity: StationarityEvidence[];
  lag_selection: LagSelectionResult;
  lag_diagnostic_grid: VarLagDiagnosticRow[];
  diagnostic_lag_refinement: { baseline_lag: number; alternative_lag: number | null; label: "diagnostically_adequate_alternative" | "none"; baseline_unchanged: true };
  selected_lag: number;
  /** Coefficient matrices per lag, row = lagged variable, column = equation. */
  coefficient_matrices: number[][][];
  intercepts: number[];
  deterministic_coefficients: Array<{ term: string; coefficients: number[] }>;
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
  dynamic_response_ready_horizons: Record<VarIrfHorizon, boolean>;
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
  stationarity_detail: StationarityEvidence[];
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
  baseline_v2_profile_readiness: { profile_id: string; estimable_countries: string[]; dynamic_response_ready_countries: string[]; records: VarCountryReadiness[] };
  exploratory_profile_readiness: { profile_id: string; estimable_countries: string[]; dynamic_response_ready_countries: string[]; records: VarCountryReadiness[] };
  records: VarCountryReadiness[];
}
