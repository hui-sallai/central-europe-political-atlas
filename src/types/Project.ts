import type { DataStatus, SourceReliability } from "@/types/DataStatus";

export interface Project {
  id: string;
  name: string;
  country: string;
  country_slug: string;
  city: string;
  sector: string;
  company: string;
  local_actor: string;
  investment: number | null;
  currency: string | null;
  year: string;
  status: string;
  data_status: DataStatus;
  risk_tags: string[];
  source: string;
  source_url: string;
  source_reliability: SourceReliability;
  verified: boolean;
  verification_note: string;
}
