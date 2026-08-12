import parityJson from "../data/observations/v075-cross-country-parity.json";
import type { Observation } from "../types/Observation";
import type { DataStatus, SourceReliability } from "../types/DataStatus";

export const crossCountryParityCountrySlugs = [
  "germany",
  "austria",
  "romania",
  "slovenia",
  "croatia",
  "serbia",
] as const;

export const coreExtendedIndicatorIds = [
  "fiscal_balance_gdp",
  "government_debt_gdp",
  "government_revenue_gdp",
  "government_expenditure_gdp",
  "exports_goods_services",
  "imports_goods_services",
  "trade_balance",
  "current_account_gdp",
  "fdi_inflow",
  "energy_import_dependency",
  "manufacturing_share_gdp",
  "automotive_export_share",
] as const;

export const coreTransmissionIndicatorIds = [
  "germany_export_dependence",
  "industrial_electricity_price",
  "household_electricity_price",
  "energy_inflation",
] as const;

type ParityRecord = {
  country_slug: string;
  country_iso3: string;
  indicator_id: string;
  year: number;
  value: number | null;
  unit: string;
  status: DataStatus;
  source_id: string;
  source_name: string;
  source_url: string;
  source_reliability: SourceReliability;
  updated_at: string;
  notes: string;
};

export type CrossCountryExtendedObservation = {
  countrySlug: string;
  indicatorId: string;
  date: string;
  value: number | null;
  unit: string;
  sourceName: string;
  sourceUrl: string;
  status: "official" | "pending";
  updatedAt: string;
  note: string;
};

const records = parityJson.records as ParityRecord[];
const extendedIdSet = new Set<string>(coreExtendedIndicatorIds);
const transmissionIdSet = new Set<string>(coreTransmissionIndicatorIds);

export const crossCountryExtendedObservations: CrossCountryExtendedObservation[] = records
  .filter((record) => extendedIdSet.has(record.indicator_id))
  .map((record) => ({
    countrySlug: record.country_slug,
    indicatorId: record.indicator_id,
    date: String(record.year),
    value: record.value,
    unit: record.unit,
    sourceName: record.source_name,
    sourceUrl: record.source_url,
    status: record.value === null ? "pending" : "official",
    updatedAt: record.updated_at,
    note: record.notes,
  }));

export const crossCountryTransmissionObservations: Observation[] = records
  .filter((record) => transmissionIdSet.has(record.indicator_id))
  .map((record) => ({
    id: `transmission:${record.country_slug}:${record.indicator_id}:${record.year}`,
    country: record.country_iso3,
    country_slug: record.country_slug,
    indicator: record.indicator_id,
    year: record.year,
    value: record.value,
    unit: record.unit,
    status: record.status,
    source: record.source_id,
    source_name: record.source_name,
    source_url: record.source_url,
    source_reliability: record.source_reliability,
    updated_at: record.updated_at,
    notes: record.notes,
  }));

const calculatedExtendedIds = new Set(["trade_balance", "automotive_export_share"]);

export const crossCountryExtendedCanonicalObservations: Observation[] = records
  .filter((record) => extendedIdSet.has(record.indicator_id))
  .map((record) => ({
    id: `parity:${record.country_slug}:${record.indicator_id}:${record.year}`,
    country: record.country_iso3,
    country_slug: record.country_slug,
    indicator: record.indicator_id,
    year: record.year,
    value: record.value,
    unit: record.unit,
    status: record.value === null ? "pending" : calculatedExtendedIds.has(record.indicator_id) ? "calculated" : "official",
    source: record.source_id,
    source_name: record.source_name,
    source_url: record.source_url,
    source_reliability: record.value === null ? "D" : "A",
    updated_at: record.updated_at,
    notes: record.notes,
  }));

export const crossCountryParitySummary = {
  version: parityJson.schema_version,
  generatedAt: parityJson.generated_at,
  countries: crossCountryParityCountrySlugs,
  expectedExtendedCells: crossCountryParityCountrySlugs.length * coreExtendedIndicatorIds.length * 5,
  expectedTransmissionCells: crossCountryParityCountrySlugs.length * coreTransmissionIndicatorIds.length * 2,
  presentExtendedCells: crossCountryExtendedObservations.filter((record) => record.value !== null).length,
  pendingExtendedCells: crossCountryExtendedObservations.filter((record) => record.value === null).length,
  presentTransmissionCells: crossCountryTransmissionObservations.filter((record) => record.value !== null).length,
  pendingTransmissionCells: crossCountryTransmissionObservations.filter((record) => record.value === null).length,
  sourcePolicy: parityJson.source_policy,
};

export function getCrossCountryParitySummary(countrySlug: string) {
  const extended = crossCountryExtendedObservations.filter((record) => record.countrySlug === countrySlug);
  const transmission = crossCountryTransmissionObservations.filter((record) => record.country_slug === countrySlug);
  return {
    extendedExpected: coreExtendedIndicatorIds.length * 5,
    extendedPresent: extended.filter((record) => record.value !== null).length,
    extendedPending: extended.filter((record) => record.value === null).length,
    transmissionExpected: coreTransmissionIndicatorIds.length * 2,
    transmissionPresent: transmission.filter((record) => record.value !== null).length,
    transmissionPending: transmission.filter((record) => record.value === null).length,
  };
}
