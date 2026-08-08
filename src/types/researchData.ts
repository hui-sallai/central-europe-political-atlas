export type DataStatus =
  | "official"
  | "verified"
  | "pending"
  | "sample"
  | "placeholder"
  | "calculated"
  | "derived";

export type SourceReliability = "A" | "B" | "C" | "D";
export type DataFrequency = "annual" | "quarterly" | "monthly" | "event";

export interface Country {
  id: string;
  slug: string;
  iso2: string;
  iso3: string;
  name: string;
  name_zh: string;
  local_name: string;
  region: string;
  group: string;
  capital: string;
  currency: string;
  status: DataStatus;
  macro_status: DataStatus;
  project_status: DataStatus;
  region_status: DataStatus;
  event_status: DataStatus;
  last_updated: string;
}

export interface Indicator {
  id: string;
  name: string;
  name_zh: string;
  category: string;
  unit: string;
  frequency: DataFrequency;
  source_type: string;
  status: DataStatus;
  future_model_candidate: boolean;
  description: string;
  last_updated: string;
}

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

export interface Source {
  id: string;
  name: string;
  name_zh: string;
  type: string;
  url: string;
  reliability: SourceReliability;
  status: DataStatus;
  update_frequency: string;
  usage_note: string;
}

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
  affected_model: string;
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

// Contract only. v0.30 does not create or publish ModelOutput records.
export interface ModelOutput {
  country: string;
  model: string;
  score: number;
  confidence: string;
  drivers: string[];
}

export interface DataEnvelope<T> {
  schema_version: string;
  generated_at: string;
  data_type: string;
  record_count: number;
  records: T[];
}
