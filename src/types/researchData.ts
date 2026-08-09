export type { DataFrequency, DataStatus, SourceReliability } from "@/types/DataStatus";
export type { Country } from "@/types/Country";
export type { Event } from "@/types/Event";
export type { Indicator } from "@/types/Indicator";
export type { ModelOutput } from "@/types/ModelOutput";
export type { Observation } from "@/types/Observation";
export type { Project } from "@/types/Project";
export type { Source } from "@/types/Source";

export interface DataEnvelope<T> {
  schema_version: string;
  generated_at: string;
  data_type: string;
  record_count: number;
  records: T[];
}
