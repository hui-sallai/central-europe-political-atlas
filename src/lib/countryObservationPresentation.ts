import { latestPublished } from "./freshnessCore";
import type { Observation } from "@/types/Observation";

/** A placeholder may explain a gap, but its value must never be presented as published. */
export function countryObservationSummary(series: readonly Observation[]) {
  const published = latestPublished(series.filter(row => row.applicability_status !== "not_applicable" && row.comparability_status !== "not_applicable"));
  const record = published ?? series.reduce<Observation | undefined>((latest, row) => !latest || row.year > latest.year ? row : latest, undefined);
  const unavailable = !published ? record?.applicability_status === "not_applicable" || record?.comparability_status === "not_applicable" ? "not_applicable" : record?.status === "pending" ? "pending" : "missing" : null;
  return { published, record, value: published?.value ?? null, unavailable };
}
