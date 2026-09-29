"use client";

import { useEffect, useState } from "react";

// Phase H monthly descriptive history (monthly_history_runtime.json). Descriptive only: never merged into the
// frozen 2015+ model inputs, only displayed beside them with an explicit layer label.
export type MonthlyHistorySource = { source_ref: number; series: string; country_slug: string; unit: string; definition: string; source: string; source_url: string; definition_compatible_floor: string };
export type MonthlyHistoryRuntime = { series_sources: MonthlyHistorySource[]; records: [string, string, string, number, string, number][] };
export type MonthlyHistoryPoint = { period: string; value: number; status: string; source: MonthlyHistorySource };

export function useMonthlyHistory(basePath: string) {
  const [data, setData] = useState<MonthlyHistoryRuntime | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${basePath}/research-data/monthly_history_runtime.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then((payload: MonthlyHistoryRuntime) => { setData(payload); setState("ready"); })
      .catch((error) => { if (!(error instanceof DOMException && error.name === "AbortError")) setState("error"); });
    return () => controller.abort();
  }, [basePath]);
  return { data, state };
}

/** History points for one series × country (or common scope such as "euro_area"), oldest first. */
export function monthlyHistoryFor(data: MonthlyHistoryRuntime | null, series: string, country: string): MonthlyHistoryPoint[] {
  if (!data) return [];
  return data.records
    .filter((row) => row[1] === series && row[0] === country)
    .map((row) => ({ period: row[2], value: row[3], status: row[4], source: data.series_sources[row[5]] }))
    .sort((a, b) => a.period.localeCompare(b.period));
}
