import type { DataStatus } from "@/types/DataStatus";

export interface Event {
  id: string;
  date: string;
  country: string;
  country_slug: string;
  country_name: string;
  region_code: string | null;
  actor: string;
  event_type: string;
  direction: string;
  intensity: number | null;
  affected_model: string[];
  duration: string;
  confidence: string;
  source_status: string;
  enters_model: boolean;
  coding_status: "pending" | "verified";
  data_status: DataStatus;
  model_note: string;
  title: string;
  topic: string;
  summary: string;
  source_name: string;
  source_url: string | null;
  language: string;
}
