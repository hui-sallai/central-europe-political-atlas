import type { DataStatus } from "@/types/DataStatus";

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
