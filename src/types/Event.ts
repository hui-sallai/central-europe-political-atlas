import type { DataStatus } from "@/types/DataStatus";

export type EventType =
  | "fiscal"
  | "EU_funds"
  | "macro"
  | "energy"
  | "industrial_policy"
  | "FDI"
  | "China"
  | "election"
  | "regional";

export type EventDirection = "positive" | "negative" | "mixed" | "neutral" | "pending";
export type EventDuration = "short_term" | "medium_term" | "long_term" | "pending";
export type EventConfidence = "high" | "medium" | "low" | "pending";
export type EventCodingStatus = "coded" | "partial" | "pending";
export type EventSourceStatus = "official" | "manual" | "sample" | "pending";

export interface Event {
  id: string;
  event_id: string;
  date: string;
  country: string;
  country_slug: string;
  country_name: string;
  region_code: string | null;
  actor: string;
  event_type: EventType;
  direction: EventDirection;
  intensity: number | null;
  affected_indicator: string[];
  affected_model: string[];
  duration: EventDuration;
  confidence: EventConfidence;
  source_status: EventSourceStatus;
  enters_model: boolean;
  coding_status: EventCodingStatus;
  data_status: DataStatus;
  model_note: string;
  title: string;
  topic: string;
  summary: string;
  source_name: string;
  source_url: string | null;
  language: string;
}
