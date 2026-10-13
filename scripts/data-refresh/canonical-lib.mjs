// Canonical annual source check — pure helpers (no I/O). Compares src/data/observations/observations.json, a protected
// formal model input, with what its own registered source queries return today. Nothing here proposes a write: the
// result is a candidate report for owner review.
import { DEFAULT_TOLERANCE } from "./lib.mjs";

export const CHECK_VERSION = "canonical-source-check-v1";
const EUROSTAT_API = /^https:\/\/ec\.europa\.eu\/eurostat\/api\/dissemination\/statistics\/1\.0\/data\//;

/** Splits a stored per-period query into the series endpoint (no time filter) and the period it selects. */
export function seriesQuery(url) {
  if (!url || !EUROSTAT_API.test(url)) return null;
  const parsed = new URL(url);
  // Two stored query styles select one period: sinceTimePeriod=untilTimePeriod, or time=<period>.
  const period = parsed.searchParams.get("time") ?? parsed.searchParams.get("sinceTimePeriod");
  if (!period || (!parsed.searchParams.has("time") && parsed.searchParams.get("untilTimePeriod") !== period)) return null;
  for (const name of ["time", "sinceTimePeriod", "untilTimePeriod"]) parsed.searchParams.delete(name);
  parsed.searchParams.sort();
  return { endpoint: parsed.toString(), dataset: parsed.pathname.split("/").pop(), geo: parsed.searchParams.get("geo"), period };
}

/** The same series for another country (used only as an explicit, labelled probe when a record has no API query). */
export function swapGeo(endpoint, geo) {
  const parsed = new URL(endpoint);
  parsed.searchParams.set("geo", geo);
  return parsed.toString();
}

/** Request URL for a whole series from a start period (annual "2021" or semester "2021-S1"). */
export function seriesRequest(endpoint, since) {
  const parsed = new URL(endpoint);
  parsed.searchParams.set("sinceTimePeriod", since);
  return parsed.toString();
}

/** Single-series JSON-stat response → { updated, points: { period: { value, flag } } }. Missing cells stay missing. */
export function parseSeries(json) {
  const time = json?.dimension?.time?.category?.index ?? {};
  const cells = json?.size?.reduce((a, b) => a * b, 1) ?? 0;
  // A dimension of size 0 means the dataset has no rows for the selection (e.g. a country it does not cover).
  if (cells === 0) return { updated: json?.updated ?? null, points: {} };
  if (cells !== Object.keys(time).length) throw new Error("response is not a single series");
  const points = {};
  for (const [period, index] of Object.entries(time)) {
    const value = Array.isArray(json.value) ? json.value[index] : json.value?.[index];
    const flag = (Array.isArray(json.status) ? json.status[index] : json.status?.[index]) ?? null;
    if (value !== null && value !== undefined) points[period] = { value, flag };
    else if (flag) points[period] = { value: null, flag };
  }
  return { updated: json.updated ?? null, points };
}

// Eurostat observation flags that change what a value means. Provisional/estimated values are reported, not blocked.
const FLAG_MEANING = { b: "break_in_series", d: "definition_differs", c: "confidential", u: "low_reliability", p: "provisional", e: "estimated", n: "not_significant", s: "eurostat_estimate" };
export const DEFINITION_FLAGS = new Set(["b", "d"]);
export const flagMeanings = (flag) => (flag ? [...flag].map((letter) => FLAG_MEANING[letter] ?? `flag_${letter}`) : []);
export const hasDefinitionFlag = (flag) => Boolean(flag) && [...flag].some((letter) => DEFINITION_FLAGS.has(letter));

export const beyondTolerance = (stored, source, tolerance = DEFAULT_TOLERANCE) => Math.abs(source - stored) > Math.max(tolerance.absolute, tolerance.relative * Math.abs(stored));

/** Recomputes a derived value only for the three registered formula shapes; anything else stays unproposed. */
export function recompute(formula, numerator, denominator) {
  if (numerator === null || denominator === null || !formula) return null;
  if (/\/\s*2\s*$/.test(formula)) return (numerator + denominator) / 2;
  if (/\*\s*100\s*$/.test(formula) && formula.includes("/")) return denominator === 0 ? null : (numerator / denominator) * 100;
  if (/^[a-z_]+\s*-\s*[a-z_]+$/i.test(formula.trim())) return numerator - denominator;
  return null;
}

/**
 * Why a stored period has no published value. Only evidence from the source response decides; the default is
 * "not_determined", never a publication delay.
 */
export function availabilityReason({ query, fetch, period }) {
  if (!query) return "no_registered_api_query";
  if (!fetch || fetch.error) return "source_acquisition_failure";
  const periods = Object.keys(fetch.points).filter((key) => fetch.points[key].value !== null).sort();
  const cell = fetch.points[period];
  if (cell?.value !== null && cell?.value !== undefined) return hasDefinitionFlag(cell.flag) ? "published_at_source_with_definition_flag" : "published_at_source_not_imported";
  if (cell?.flag?.includes("c")) return "confidential_at_source";
  if (!periods.length) return "not_available_for_country_at_source";
  if (period > periods.at(-1)) return "not_yet_published_at_source";
  return "missing_at_source";
}

/**
 * Compares one (indicator, country) series. `records` are the stored observations; `lookup(url)` returns the fetched
 * series for a stored per-period query: { query, fetch } or { query: null }.
 */
export function compareSeries(records, lookup, tolerance = DEFAULT_TOLERANCE) {
  const sorted = [...records].sort((a, b) => a.year - b.year);
  const out = { new_observations: [], revisions: [], within_tolerance: [], pending: [], missing_at_source: [], definition_flags: [], not_checked: [], provenance: [] };
  const seen = new Map();
  const note = (resolved) => { if (resolved.query && resolved.fetch && !seen.has(resolved.query.endpoint)) seen.set(resolved.query.endpoint, resolved); };
  const component = (url) => {
    const resolved = lookup(url);
    note(resolved);
    if (!resolved.query) return { state: "no_query" };
    if (!resolved.fetch || resolved.fetch.error) return { state: "failed" };
    const cell = resolved.fetch.points[resolved.query.period];
    return { state: "ok", value: cell?.value ?? null, flag: cell?.flag ?? null, resolved };
  };
  for (const record of sorted) {
    const derived = record.status === "calculated" || (record.status === "pending" && Boolean(record.numerator_source_url && record.denominator_source_url && record.numerator_source_url !== record.source_query_url));
    if (record.value === null || record.status === "pending") {
      const resolved = lookup(record.source_query_url);
      note(resolved);
      const reason = record.applicability_status === "not_applicable" ? "not_applicable_by_research_rule" : availabilityReason({ query: resolved.query, fetch: resolved.fetch, period: resolved.query?.period });
      const cell = resolved.fetch?.points?.[resolved.query?.period];
      const candidate = !derived && cell?.value !== null && cell?.value !== undefined ? cell.value : null;
      out.pending.push({ year: record.year, reason, source_value: candidate, source_flags: flagMeanings(cell?.flag), derived, comparability_status: record.comparability_status ?? null });
      continue;
    }
    if (derived) {
      const numerator = component(record.numerator_source_url), denominator = component(record.denominator_source_url);
      if (numerator.state !== "ok" || denominator.state !== "ok" || typeof record.numerator !== "number" || typeof record.denominator !== "number") {
        out.not_checked.push({ year: record.year, reason: numerator.state === "failed" || denominator.state === "failed" ? "source_acquisition_failure" : "derived_value_without_checkable_components" });
        continue;
      }
      if (numerator.value === null || denominator.value === null) { out.missing_at_source.push({ year: record.year, component: numerator.value === null ? "numerator" : "denominator" }); continue; }
      const changed = [["numerator", record.numerator, numerator.value], ["denominator", record.denominator, denominator.value]].filter(([, stored, source]) => stored !== source);
      if (!changed.length) continue;
      const proposed = recompute(record.calculation_formula, numerator.value, denominator.value);
      const entry = { year: record.year, stored_value: record.value, proposed_value: proposed === null ? null : Number(proposed.toFixed(6)), components: changed.map(([name, stored, source]) => ({ component: name, stored, source })), derived: true };
      (changed.some(([, stored, source]) => beyondTolerance(stored, source, tolerance)) ? out.revisions : out.within_tolerance).push(entry);
      continue;
    }
    const direct = component(record.source_query_url);
    if (direct.state !== "ok") { out.not_checked.push({ year: record.year, reason: direct.state === "failed" ? "source_acquisition_failure" : "no_registered_api_query" }); continue; }
    if (direct.value === null) { out.missing_at_source.push({ year: record.year, source_flags: flagMeanings(direct.flag) }); continue; }
    if (hasDefinitionFlag(direct.flag)) out.definition_flags.push({ year: record.year, source_flags: flagMeanings(direct.flag) });
    if (direct.value === record.value) continue;
    (beyondTolerance(record.value, direct.value, tolerance) ? out.revisions : out.within_tolerance).push({ year: record.year, stored_value: record.value, proposed_value: direct.value, source_flags: flagMeanings(direct.flag), derived: false });
  }
  // Periods at source after the last stored year (annual direct series only; derived series are reported via components).
  const direct = sorted.find((record) => record.status !== "calculated" && lookup(record.source_query_url).query);
  const resolved = direct ? lookup(direct.source_query_url) : null;
  const lastStoredYear = sorted.at(-1)?.year ?? null;
  if (resolved?.fetch && !resolved.fetch.error && lastStoredYear !== null) {
    for (const [period, cell] of Object.entries(resolved.fetch.points)) {
      if (/^\d{4}$/.test(period) && Number(period) > lastStoredYear && cell.value !== null) out.new_observations.push({ year: Number(period), source_value: cell.value, source_flags: flagMeanings(cell.flag), comparability: hasDefinitionFlag(cell.flag) ? "review_required_definition_flag" : "not_assessed_by_this_tool" });
    }
  }
  out.provenance = [...seen.values()].map(({ query, fetch }) => ({ endpoint: query.endpoint, dataset: query.dataset, http_status: fetch.http_status ?? null, retrieved_at: fetch.retrieved_at ?? null, dataset_updated_at: fetch.updated ?? null, response_sha256: fetch.sha256 ?? null, response_bytes: fetch.bytes ?? null, error: fetch.error ?? null }));
  return out;
}
