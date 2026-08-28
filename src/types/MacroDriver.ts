export type MacroDriverRole =
  | "domestic_policy_driver"
  | "domestic_financial_condition"
  | "domestic_price_outcome"
  | "external_common_driver"
  | "shock_candidate";

export type IdentificationStatus =
  | "observed_driver"
  | "shock_candidate"
  | "external_innovation_proxy"
  | "identified_shock"
  | "blocked";

export type MacroDriverRuntimeRow = [
  observationId: string,
  driverId: string,
  country: string | null,
  scope: string,
  period: string,
  value: number | null,
  unit: string,
  transformation: string,
  role: MacroDriverRole,
  source: string,
  sourceUrl: string,
  identificationStatus: IdentificationStatus,
  definitionVersion: string,
  aggregationMethod: string,
  orientation: string,
];

export interface MacroDriverDefinition {
  driver_id: string;
  name_zh: string;
  name_en: string;
  role: MacroDriverRole;
  frequency: "monthly";
  scope: string;
  unit: string;
  source: string;
  transformation_options: string[];
  economic_interpretation: string;
  identification_status: IdentificationStatus;
  limitations: string;
}
