import type { DataStatus, SourceReliability } from "@/types/DataStatus";

export interface Observation {
  id: string;
  country: string;
  country_slug: string;
  indicator: string;
  year: number;
  value: number | null;
  unit: string;
  status: DataStatus;
  source: string;
  source_name: string;
  source_url: string;
  source_reliability: SourceReliability;
  updated_at: string;
  notes: string;
  applicability_status?: "applicable" | "not_applicable";
  comparability_status?: "comparable" | "partial_comparability" | "definition_mismatch" | "not_applicable" | "pending";
  source_dataset?: string;
  source_query_url?: string;
  numerator?: number | null;
  denominator?: number | null;
  numerator_source_url?: string;
  denominator_source_url?: string;
  calculation_formula?: string;
  calculation_year?: number;
  review_required?: boolean;
  review_reasons?: string[];
}
