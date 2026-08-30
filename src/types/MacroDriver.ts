export type MacroDriverRole =
  | "domestic_policy_driver"
  | "domestic_financial_condition"
  | "domestic_price_outcome"
  | "external_common_driver"
  | "regional_common_driver";

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
  derivationStatus: "valid" | "warmup" | "gap_blocked" | "regime_blocked" | "definition_blocked" | null,
  availabilityReason: string | null,
  temporalAlignmentStatus: "aligned" | "warmup" | "source_gap" | "regime_break" | "definition_break" | null,
  seriesInstanceId: string,
  applicabilityScope: string,
  applicableCountryIds: string[],
  sharedSeries: boolean,
  independentCrossSectionUnit: boolean,
  policyRegimeId: string | null,
  policyInstrumentId: string | null,
];

export interface MacroDriverDefinition {
  driver_id: string;
  name_zh: string;
  name_en: string;
  role: MacroDriverRole;
  economic_role: MacroDriverRole;
  frequency: "monthly";
  scope: string;
  unit: string;
  source: string;
  transformation_options: string[];
  economic_interpretation: string;
  identification_status: IdentificationStatus;
  identification_default: IdentificationStatus;
  series_scope_type: string;
  shared_series: boolean;
  timing_convention: string;
  regime_sensitive: boolean;
  limitations: string;
}
