// Data Freshness core: the single definition of "latest" for descriptive observations.
// Pure functions over plain records (no data imports), so client components can use them without bundling datasets.
//
// Rules
// - published      = non-null finite value whose status is not "pending" (missing is never 0);
// - latest available = the published observation with the highest year in one country's series;
// - latest common  = the highest year in which EVERY listed series has a published, comparable observation with the
//                    same unit; null when no such year exists (no fallback to older or partial years);
// - a comparison never mixes reference periods silently: `periods_differ` is always reported.

export type FreshnessPoint = { year: number; value: number | null; unit: string; status?: string; comparable?: boolean };
export type CompareMode = "latest_available" | "latest_common";
export const COMPARE_MODES: readonly CompareMode[] = ["latest_common", "latest_available"];

export type CompareCell<T extends FreshnessPoint> = { value: number | null; unit: string | null; year: number | null; point: T | null };
export type CompareResult<T extends FreshnessPoint> = {
  mode: CompareMode;
  cells: Record<string, CompareCell<T>>;
  /** true when the non-missing cells refer to different years (only possible in latest_available mode) */
  periods_differ: boolean;
  /** latest year shared by all listed series, independent of the mode; null when none exists */
  common_year: number | null;
  /** true when the latest available values use different units; such values are not placed side by side */
  units_differ: boolean;
};

export function isPublished(point: FreshnessPoint): boolean {
  return point.value !== null && Number.isFinite(point.value) && point.status !== "pending";
}

const comparable = (point: FreshnessPoint) => isPublished(point) && point.comparable !== false;
const emptyCell = <T extends FreshnessPoint>(): CompareCell<T> => ({ value: null, unit: null, year: null, point: null });
const cellOf = <T extends FreshnessPoint>(point: T | undefined): CompareCell<T> => (point ? { value: point.value, unit: point.unit, year: point.year, point } : emptyCell<T>());

/** Latest published observation of one series (any order), or undefined. */
export function latestPublished<T extends FreshnessPoint>(series: readonly T[], requireComparable = false): T | undefined {
  let latest: T | undefined;
  for (const point of series) if ((requireComparable ? comparable(point) : isPublished(point)) && (!latest || point.year > latest.year)) latest = point;
  return latest;
}

/** Latest year in which every series has a published, comparable observation with one shared unit; else null. */
export function latestCommonYear(seriesList: readonly (readonly FreshnessPoint[])[]): number | null {
  if (!seriesList.length || seriesList.some((series) => !series.length)) return null;
  const years = [...new Set(seriesList[0].filter(comparable).map((point) => point.year))].sort((a, b) => b - a);
  for (const year of years) {
    const atYear = seriesList.map((series) => series.find((point) => point.year === year && comparable(point)));
    if (atYear.every(Boolean) && new Set(atYear.map((point) => point!.unit)).size === 1) return year;
  }
  return null;
}

/** Side-by-side comparison of one indicator across countries under an explicit reference-period mode. */
export function compareSeries<T extends FreshnessPoint>(byCountry: Record<string, readonly T[]>, mode: CompareMode): CompareResult<T> {
  const countries = Object.keys(byCountry);
  const common_year = latestCommonYear(countries.map((country) => byCountry[country]));
  const cells: Record<string, CompareCell<T>> = {};
  if (mode === "latest_common") {
    for (const country of countries) cells[country] = cellOf(common_year === null ? undefined : byCountry[country].find((point) => point.year === common_year && comparable(point)));
    return { mode, cells, periods_differ: false, common_year, units_differ: false };
  }
  for (const country of countries) cells[country] = cellOf(latestPublished(byCountry[country], true));
  const present = countries.map((country) => cells[country]).filter((cell) => cell.value !== null);
  const units_differ = new Set(present.map((cell) => cell.unit)).size > 1;
  if (units_differ) for (const country of countries) cells[country] = emptyCell<T>();
  const periods_differ = !units_differ && new Set(present.map((cell) => cell.year)).size > 1;
  return { mode, cells, periods_differ, common_year, units_differ };
}
