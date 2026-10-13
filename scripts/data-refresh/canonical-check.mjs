// Canonical annual source check — CANDIDATE REPORT ONLY. Never writes src/data/** or public/research-data/**.
//
// observations.json is a protected formal model input with no refresh writer. This tool re-runs every record's own
// registered source query (Eurostat dissemination API), and reports, per indicator and country: newer official years,
// revisions of stored values (existing tolerance rule), values missing at source, why pending periods are unavailable,
// definition/break flags, and the provenance of each retrieval (endpoint, HTTP status, retrieval time, the dataset's
// own update time, response checksum). The publication date of an individual observation is not exposed by the API and
// is recorded as unavailable.
//
// Usage: node scripts/data-refresh/canonical-check.mjs [--run <id>] [--from-run <id>] [--write-summary] [--concurrency 6]
//   --from-run       replay the archived raw responses of an earlier run (no network)
//   --write-summary  also write docs/data-refresh/canonical_source_check.json and src/lib/canonicalSourceCheck.ts
// Output: .tmp-data-refresh/<run>/canonical_candidate_report.{json,md} and raw responses under canonical-raw/.
// Exit code 0 = report written; 1 = tool error. Any update of observations.json needs a separate owner-approved procedure.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_TOLERANCE, readJson, sha256 } from "./lib.mjs";
import { CHECK_VERSION, compareSeries, parseSeries, seriesQuery, seriesRequest, swapGeo, availabilityReason, flagMeanings } from "./canonical-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const run = option("--run") ?? `canonical-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
const fromRun = option("--from-run");
const concurrency = Number(option("--concurrency") ?? 6);
if (!/^[A-Za-z0-9._-]+$/.test(run) || (fromRun && !/^[A-Za-z0-9._-]+$/.test(fromRun))) { console.error("invalid run id"); process.exit(1); }
const runDir = path.join(root, ".tmp-data-refresh", run);
const rawDir = path.join(root, ".tmp-data-refresh", fromRun ?? run, "canonical-raw");
fs.mkdirSync(path.join(runDir, "canonical-raw"), { recursive: true });

const observationsFile = path.join(root, "src/data/observations/observations.json");
const observationsSha = sha256(fs.readFileSync(observationsFile));
const records = readJson(observationsFile).records;
const manifest = readJson(path.join(root, "src/data/historical/annual_history_manifest.json"));
const tolerance = manifest.overlap_tolerance?.relative !== undefined ? { relative: manifest.overlap_tolerance.relative, absolute: manifest.overlap_tolerance.absolute ?? DEFAULT_TOLERANCE.absolute } : DEFAULT_TOLERANCE;

// 1. Every distinct series endpoint referenced by a stored record, with the earliest period it is asked for.
const endpoints = new Map();
const register = (url) => { const query = seriesQuery(url); if (!query) return; const since = endpoints.get(query.endpoint); if (!since || query.period < since) endpoints.set(query.endpoint, query.period); };
for (const record of records) for (const url of [record.source_query_url, record.numerator_source_url, record.denominator_source_url]) register(url);

// 2. Sibling probes: a series whose records carry no API query is probed with another country's query for the same
//    indicator, geo swapped. Reported separately and labelled; it never becomes a candidate value.
const geoOf = new Map();
for (const record of records) { const query = seriesQuery(record.source_query_url); if (query?.geo && !geoOf.has(record.country_slug)) geoOf.set(record.country_slug, query.geo); }
const groups = new Map();
for (const record of records) { const key = `${record.indicator}|${record.country_slug}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(record); }
const probes = new Map();
for (const [key, rows] of groups) {
  if (rows.some((row) => seriesQuery(row.source_query_url))) continue;
  const [indicator, slug] = key.split("|");
  const sibling = records.find((row) => row.indicator === indicator && row.status !== "calculated" && seriesQuery(row.source_query_url));
  if (!sibling || !geoOf.has(slug)) continue;
  const endpoint = swapGeo(seriesQuery(sibling.source_query_url).endpoint, geoOf.get(slug));
  probes.set(key, endpoint);
  const since = String(Math.min(...rows.map((row) => row.year)));
  if (!endpoints.has(endpoint) || since < endpoints.get(endpoint)) endpoints.set(endpoint, since);
}

// 3. Retrieve (or replay) each series once.
const fetched = new Map();
async function retrieve(endpoint, since) {
  const file = path.join(rawDir, `${sha256(Buffer.from(endpoint))}.json`);
  const target = path.join(runDir, "canonical-raw", path.basename(file));
  if (fromRun) {
    if (!fs.existsSync(file)) return { error: "no archived response in the replayed run" };
    const archived = readJson(file);
    if (file !== target) fs.copyFileSync(file, target);
    return archived.error ? { error: archived.error, http_status: archived.http_status, retrieved_at: archived.retrieved_at } : { ...parseSeries(archived.body), http_status: archived.http_status, retrieved_at: archived.retrieved_at, sha256: archived.body_sha256, bytes: archived.body_bytes };
  }
  const url = seriesRequest(endpoint, since);
  const retrievedAt = new Date().toISOString();
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000), headers: { accept: "application/json" } });
      const text = await response.text();
      let body = null;
      try { body = JSON.parse(text); } catch { /* not JSON */ }
      // The API answers a query with no matching rows with an error payload; that is evidence, not a failure.
      const empty = body?.error && /no (data|results)|not found|empty/i.test(JSON.stringify(body.error));
      if (!response.ok && !empty) { if (attempt < 3 && response.status >= 500) continue; const failure = { error: `HTTP ${response.status}`, http_status: response.status, retrieved_at: retrievedAt, request: url }; fs.writeFileSync(target, JSON.stringify(failure)); return failure; }
      const series = empty ? { updated: null, points: {} } : parseSeries(body);
      const archive = { request: url, http_status: response.status, retrieved_at: retrievedAt, body_sha256: sha256(Buffer.from(text)), body_bytes: Buffer.byteLength(text), body: empty ? { dimension: { time: { category: { index: {} } } }, size: [0], value: {}, updated: null } : body };
      fs.writeFileSync(target, JSON.stringify(archive));
      return { ...series, http_status: response.status, retrieved_at: retrievedAt, sha256: archive.body_sha256, bytes: archive.body_bytes };
    } catch (error) {
      if (attempt === 3) { const failure = { error: String(error.message ?? error), http_status: null, retrieved_at: retrievedAt, request: url }; fs.writeFileSync(target, JSON.stringify(failure)); return failure; }
    }
  }
  return { error: "unreachable" };
}
const queue = [...endpoints];
await Promise.all(Array.from({ length: Math.max(1, concurrency) }, async () => { while (queue.length) { const [endpoint, since] = queue.shift(); fetched.set(endpoint, await retrieve(endpoint, since)); } }));

// 4. Compare series by series.
const lookup = (url) => { const query = seriesQuery(url); return query ? { query, fetch: fetched.get(query.endpoint) } : { query: null }; };
const series = [];
for (const [key, rows] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
  const [indicator, country] = key.split("|");
  const result = compareSeries(rows, lookup, tolerance);
  const published = rows.filter((row) => row.value !== null && row.status !== "pending");
  const entry = { indicator, country, source: rows[0].source, stored_source_dataset: rows[0].source_dataset ?? null, stored_latest_published_year: published.length ? Math.max(...published.map((row) => row.year)) : null, stored_record_modified: [...new Set(rows.map((row) => row.updated_at))].sort().at(-1) ?? null, comparability_statuses: [...new Set(rows.map((row) => row.comparability_status))], ...result };
  const probe = probes.get(key);
  if (probe) {
    const fetch = fetched.get(probe);
    entry.sibling_probe = { note: "The stored records have no API query. This probes another country's query for the same indicator with the country code swapped; it is evidence about the source only and never a candidate value.", endpoint: probe, http_status: fetch?.http_status ?? null, retrieved_at: fetch?.retrieved_at ?? null, dataset_updated_at: fetch?.updated ?? null, error: fetch?.error ?? null,
      periods: fetch?.points ? Object.entries(fetch.points).map(([period, cell]) => ({ period, has_value: cell.value !== null, source_flags: flagMeanings(cell.flag) })) : [],
      pending_reasons: rows.filter((row) => row.status === "pending").map((row) => ({ year: row.year, reason: availabilityReason({ query: { period: String(row.year) }, fetch, period: String(row.year) }) })) };
  }
  entry.source_latest_period = entry.provenance.length ? Object.keys(lookup(rows.find((row) => seriesQuery(row.source_query_url))?.source_query_url ?? "").fetch?.points ?? {}).filter((period) => lookup(rows.find((row) => seriesQuery(row.source_query_url)).source_query_url).fetch.points[period].value !== null).sort().at(-1) ?? null : null;
  series.push(entry);
}

const count = (pick) => series.reduce((total, entry) => total + pick(entry).length, 0);
const reasons = {};
for (const entry of series) for (const item of entry.pending) reasons[item.reason] = (reasons[item.reason] ?? 0) + 1;
const failures = [...fetched].filter(([, value]) => value.error).map(([endpoint, value]) => ({ endpoint, error: value.error }));
const datasets = {};
for (const [endpoint, value] of fetched) { const dataset = new URL(endpoint).pathname.split("/").pop(); datasets[dataset] ??= { series_endpoints: 0, failures: 0, dataset_updated_at: null }; datasets[dataset].series_endpoints += 1; if (value.error) datasets[dataset].failures += 1; if (value.updated && (!datasets[dataset].dataset_updated_at || value.updated > datasets[dataset].dataset_updated_at)) datasets[dataset].dataset_updated_at = value.updated; }
const retrievals = [...fetched.values()].map((value) => value.retrieved_at).filter(Boolean).sort();
const report = {
  schema_version: CHECK_VERSION,
  kind: "candidate_report_only",
  boundary: "observations.json is a protected formal model input. Nothing in this report has been written to it; any update requires a separate owner-approved procedure and, where a formal sample changes, a new research baseline.",
  run_id: run,
  replayed_from_run: fromRun ?? null,
  checked_file: "src/data/observations/observations.json",
  checked_file_sha256: observationsSha,
  retrieval_window: { first: retrievals[0] ?? null, last: retrievals.at(-1) ?? null },
  revision_tolerance: { ...tolerance, rule: "existing annual-history overlap tolerance; differences inside it are listed separately" },
  date_semantics: { observation_period: "year (or semester) of the statistic", dataset_updated_at: "the source dataset's own last-update time as reported by the API", official_release_date_of_observation: "unavailable: not exposed by the source API", retrieved_at: "when this tool fetched the response", stored_record_modified: "observations.json updated_at — an edit date, not a release or retrieval date" },
  totals: { series: series.length, records: records.length, series_endpoints_queried: fetched.size, acquisition_failures: failures.length, new_observations: count((e) => e.new_observations), pending_periods_published_at_source: series.reduce((total, entry) => total + entry.pending.filter((item) => item.reason.startsWith("published_at_source")).length, 0), revisions_beyond_tolerance: count((e) => e.revisions), differences_within_tolerance: count((e) => e.within_tolerance), stored_values_missing_at_source: count((e) => e.missing_at_source), stored_years_with_definition_flag_at_source: count((e) => e.definition_flags), records_not_checked: count((e) => e.not_checked), pending_periods: count((e) => e.pending), pending_reasons: reasons },
  datasets,
  acquisition_failures: failures,
  series,
};
fs.writeFileSync(path.join(runDir, "canonical_candidate_report.json"), `${JSON.stringify(report, null, 2)}\n`);

const table = (header, rows) => (rows.length ? [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.join(" | ")} |`)] : ["None."]);
const md = [
  `# Canonical annual source check — candidate report (${run})`, "",
  `**Nothing was written to \`observations.json\`.** ${report.boundary}`, "",
  `Retrieved ${report.retrieval_window.first ?? "—"} → ${report.retrieval_window.last ?? "—"}${fromRun ? ` (replayed from ${fromRun})` : ""}; ${fetched.size} series endpoints, ${failures.length} acquisition failures.`, "",
  "## Totals", "", ...Object.entries(report.totals).filter(([, value]) => typeof value !== "object").map(([key, value]) => `- ${key}: ${value}`), `- pending_reasons: ${JSON.stringify(reasons)}`, "",
  "## A. New observations at source", "", ...table(["Indicator", "Country", "Year", "Source value", "Flags", "Comparability"], series.flatMap((e) => e.new_observations.map((n) => [e.indicator, e.country, n.year, n.source_value, n.source_flags.join(", ") || "—", n.comparability]))), "",
  "## A2. Pending periods now published at source", "", ...table(["Indicator", "Country", "Year", "Source value", "Reason", "Flags"], series.flatMap((e) => e.pending.filter((p) => p.reason.startsWith("published_at_source")).map((p) => [e.indicator, e.country, p.year, p.derived ? "derived — recompute needed" : p.source_value, p.reason, p.source_flags.join(", ") || "—"]))), "",
  "## B. Revisions beyond tolerance", "", ...table(["Indicator", "Country", "Year", "Stored", "Proposed", "Derived", "Flags"], series.flatMap((e) => e.revisions.map((r) => [e.indicator, e.country, r.year, r.stored_value, r.proposed_value ?? "components changed", r.derived ? "yes" : "no", (r.source_flags ?? []).join(", ") || "—"]))), "",
  "## B2. Differences within tolerance", "", ...table(["Indicator", "Country", "Year", "Stored", "Source"], series.flatMap((e) => e.within_tolerance.map((r) => [e.indicator, e.country, r.year, r.stored_value, r.proposed_value ?? "components changed"]))), "",
  "## C. Stored values missing at source", "", ...table(["Indicator", "Country", "Year"], series.flatMap((e) => e.missing_at_source.map((m) => [e.indicator, e.country, m.year]))), "",
  "## D. Pending periods still unavailable", "", ...table(["Indicator", "Country", "Year", "Reason"], series.flatMap((e) => e.pending.filter((p) => !p.reason.startsWith("published_at_source")).map((p) => [e.indicator, e.country, p.year, p.reason]))), "",
  "## E/F. Definition or break flags at source on stored years", "", ...table(["Indicator", "Country", "Year", "Flags"], series.flatMap((e) => e.definition_flags.map((d) => [e.indicator, e.country, d.year, d.source_flags.join(", ")]))), "",
  "## Sibling probes (series without an API query)", "", ...table(["Indicator", "Country", "Periods with a value at source", "Flags"], series.filter((e) => e.sibling_probe).map((e) => [e.indicator, e.country, e.sibling_probe.periods.filter((p) => p.has_value).map((p) => p.period).join(", ") || "none", [...new Set(e.sibling_probe.periods.flatMap((p) => p.source_flags))].join(", ") || "—"])), "",
  "## Not checked", "", ...table(["Indicator", "Country", "Years", "Reason"], series.filter((e) => e.not_checked.length).map((e) => [e.indicator, e.country, e.not_checked.map((n) => n.year).join(", "), [...new Set(e.not_checked.map((n) => n.reason))].join(", ")])), "",
  "## Datasets", "", ...table(["Dataset", "Series endpoints", "Failures", "Dataset updated at source"], Object.entries(datasets).sort().map(([name, d]) => [name, d.series_endpoints, d.failures, d.dataset_updated_at ?? "—"])), "",
].join("\n");
fs.writeFileSync(path.join(runDir, "canonical_candidate_report.md"), md);

if (args.includes("--write-summary")) {
  // Committed, reviewable record of the check (docs/) and a compact per-series summary for the interface (src/lib).
  fs.mkdirSync(path.join(root, "docs/data-refresh"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs/data-refresh/canonical_source_check.json"), `${JSON.stringify(report, null, 1)}\n`);
  const day = (value) => (value ? value.slice(0, 10) : null);
  const summary = {};
  for (const entry of series) {
    const primary = entry.provenance[0];
    const latestPending = entry.pending.filter((item) => entry.stored_latest_published_year === null || item.year > entry.stored_latest_published_year).sort((a, b) => b.year - a.year)[0];
    summary[`${entry.country}|${entry.indicator}`] = {
      checked: primary?.retrieved_at ? day(primary.retrieved_at) : null,
      source_updated: primary?.dataset_updated_at ? day(primary.dataset_updated_at) : null,
      source_latest: entry.source_latest_period,
      availability: latestPending ? (entry.sibling_probe?.pending_reasons.find((item) => item.year === latestPending.year)?.reason ?? latestPending.reason) : null,
      availability_year: latestPending?.year ?? null,
      newer_at_source: [...entry.new_observations.map((item) => item.year), ...entry.pending.filter((item) => item.reason.startsWith("published_at_source")).map((item) => item.year)].sort(),
      revised_years: entry.revisions.map((item) => item.year),
      definition_flag: entry.definition_flags.length > 0 || Boolean(entry.sibling_probe?.periods.some((period) => period.source_flags.some((flag) => flag === "definition_differs" || flag === "break_in_series"))),
    };
  }
  const ts = `// GENERATED by scripts/data-refresh/canonical-check.mjs --write-summary (run ${run}). Do not edit by hand.\n// Result of re-running each stored observation's own registered source query. Presentation metadata only: it does\n// not change any observation. Full report: docs/data-refresh/canonical_source_check.json.\nexport type CanonicalSourceCheck = { checked: string | null; source_updated: string | null; source_latest: string | null; availability: string | null; availability_year: number | null; newer_at_source: number[]; revised_years: number[]; definition_flag: boolean };\nexport const CANONICAL_SOURCE_CHECK_RUN = ${JSON.stringify({ run_id: run, checked_file_sha256: observationsSha, retrieved: day(report.retrieval_window.last) })} as const;\nexport const canonicalSourceCheck: Record<string, CanonicalSourceCheck> = ${JSON.stringify(summary, null, 1)};\nexport function getCanonicalSourceCheck(country: string, indicator: string): CanonicalSourceCheck | undefined {\n  return canonicalSourceCheck[\`\${country}|\${indicator}\`];\n}\n`;
  fs.writeFileSync(path.join(root, "src/lib/canonicalSourceCheck.ts"), ts);
}

console.log(`canonical source check ${run}: ${series.length} series, ${fetched.size} endpoints, ${failures.length} failures`);
console.log(`new ${report.totals.new_observations} · pending now published ${report.totals.pending_periods_published_at_source} · revisions ${report.totals.revisions_beyond_tolerance} · within tolerance ${report.totals.differences_within_tolerance} · missing at source ${report.totals.stored_values_missing_at_source}`);
console.log(`report: ${path.relative(root, path.join(runDir, "canonical_candidate_report.md"))}`);
