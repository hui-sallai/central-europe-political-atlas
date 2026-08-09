// Contract only. v0.30 does not create or publish ModelOutput records.
export interface ModelOutput {
  country: string;
  model: string;
  score: number;
  confidence: string;
  drivers: string[];
}
