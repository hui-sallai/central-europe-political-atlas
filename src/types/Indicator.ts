import type { DataFrequency, DataStatus } from "@/types/DataStatus";

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
