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
  source_name: string;
  source_url: string;
  source_reliability: SourceReliability;
  verified: boolean;
  verification_status: "可量化" | "部分可量化" | "仅作背景" | "不进入分析";
  verification_note: string;
  quantification_status: "可量化" | "部分可量化" | "暂不可量化" | "不适合量化";
  amount_status: string;
  amount_evidence: string;
  actor_verification: string;
  status_timeline: string[];
  related_indicator_ids: string[];
  related_event_ids: string[];
  exposure_dimensions: string[];
  model_boundary: string;
}
