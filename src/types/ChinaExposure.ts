import type { ModelAvailability, ModelConfidence } from "@/types/ModelOutput";

export type ChinaExposureDimension = "project" | "trade" | "investment" | "industrial";
export type ChinaExposureCoverageStatus = "sufficient" | "partial" | "insufficient" | "unavailable" | "not_applicable";
export type ProjectDatabaseCoverage = "representative" | "partial" | "sparse" | "insufficient";
export type ChinaSectorLinkageStatus = "verified_active" | "verified_historical" | "announced" | "cancelled" | "no_verified_evidence" | "insufficient_coverage";

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
  definition_comparable?: boolean;
  source_method?: string;
  source_tier?: 1 | 2 | 3 | null;
  comparison_status?: "comparable" | "partial" | "unavailable";
  denominator_definition?: string | null;
  coverage_note?: string;
  qa_status?: "passed" | "partial" | "review_required" | "unavailable";
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
  project_database_coverage: ProjectDatabaseCoverage;
  china_fdi_availability: ChinaExposureCoverageStatus;
  trade_latest_year: number | null;
  evidence_confidence_factors: {
    dimension_completeness: number;
    source_reliability: string;
    year_alignment: string;
    project_database_coverage: ProjectDatabaseCoverage;
    definition_comparability: string;
  };
  priority_gaps: string[];
}

export interface ChinaEvidenceCoverageMatrixRecord {
  country: string;
  country_slug: string;
  project: ChinaExposureCoverageStatus;
  trade: ChinaExposureCoverageStatus;
  investment: ChinaExposureCoverageStatus;
  industrial: ChinaExposureCoverageStatus;
  sufficient_dimensions: number;
  partial_dimensions: number;
  unavailable_dimensions: number;
  project_database_coverage: ProjectDatabaseCoverage;
  recorded_project_count: number;
  reliable_project_count: number;
  trade_latest_year: number | null;
  china_fdi_source_tier: 1 | 2 | 3 | null;
  china_fdi_comparison_status: "comparable" | "partial" | "unavailable";
  overall_gate_status: "available" | "unavailable";
  priority_gaps: string[];
}

export interface ChinaTradeHistoricalRecord {
  country: string;
  country_slug: string;
  year: number;
  china_export_share: number | null;
  china_import_share: number | null;
  china_trade_share: number | null;
  source: string;
  source_url: string | null;
  source_reliability: "A";
  qa_status: "passed" | "review_required";
  use: "trend_context_only";
}

export interface ChinaSectorLinkageRecord {
  country: string;
  country_slug: string;
  sector: "battery" | "automotive" | "electronics" | "logistics" | "infrastructure" | "energy";
  status: ChinaSectorLinkageStatus;
  project_ids: string[];
  current_project_count: number;
  historical_project_count: number;
  source_reliability: Array<"A" | "B" | "C" | "D">;
  model_eligible: boolean;
  double_counting_rule: string;
}

export interface ChinaExposureCoverageAuditRecord {
  country: string;
  country_slug: string;
  dimension: ChinaExposureDimension;
  status: ChinaExposureCoverageStatus;
  data_completeness: number;
  available_variables: string[];
  missing_variables: string[];
  related_project_ids: string[];
  source_urls: string[];
  source_reliability: Array<"A" | "B" | "C" | "D">;
  definition_comparable: boolean;
  source_trace_available: boolean;
  project_database_coverage: ProjectDatabaseCoverage | null;
  qa_status: "passed" | "partial" | "review_required" | "unavailable";
  coverage_note: string;
}

export interface ChinaTradeQaRecord {
  country_slug: string;
  year: number | null;
  reporter_code: number | null;
  partner_code: number | null;
  numerator_complete: boolean;
  denominator_complete: boolean;
  duplicate_record_count: number;
  denominator_valid: boolean;
  qa_status: "passed" | "review_required";
  notes: string;
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
