import type { DataStatus, SourceReliability } from "@/types/DataStatus";

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
