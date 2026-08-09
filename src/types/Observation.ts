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
}
