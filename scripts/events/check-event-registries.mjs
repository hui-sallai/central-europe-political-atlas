// Consistency check for the generated event registries (event_analysis_eligibility.json, event_overlap_registry.json):
// recomputes them in memory with the same rules as build-event-registries.mjs and compares event ids and outcomes.
// Read-only. Exits 1 when the committed registries no longer match src/data/events/events.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, "src/data/events", name), "utf8"));
const events = read("events.json").records;
const eligibility = read("event_analysis_eligibility.json");
const overlap = read("event_overlap_registry.json");
const monthPrecision = (event) => /^\d{4}-\d{2}/.test(event.date);
const eligible = (event) => event.data_status === "verified" && monthPrecision(event);
const problems = [];

const recorded = new Map(eligibility.records.map((row) => [row.event_id, row]));
const missing = events.filter((event) => !recorded.has(event.event_id));
const stale = eligibility.records.filter((row) => !events.some((event) => event.event_id === row.event_id));
const changed = events.filter((event) => recorded.has(event.event_id) && recorded.get(event.event_id).eligible !== eligible(event));
if (missing.length) problems.push(`eligibility: ${missing.length} event(s) missing (e.g. ${missing[0].event_id})`);
if (stale.length) problems.push(`eligibility: ${stale.length} record(s) for events that no longer exist`);
if (changed.length) problems.push(`eligibility: ${changed.length} outcome(s) differ from the engine rule`);
if (eligibility.record_count !== eligibility.records.length || eligibility.eligible_count !== eligibility.records.filter((row) => row.eligible).length) problems.push("eligibility: header counts do not match records");

const verified = events.filter(eligible);
const month = (event) => { const [year, m] = event.date.slice(0, 7).split("-").map(Number); return year * 12 + m; };
const expectedOverlap = new Map(verified.map((event) => [event.event_id, verified.filter((other) => other.event_id !== event.event_id && other.country_slug === event.country_slug && Math.abs(month(other) - month(event)) <= overlap.window_months).map((other) => other.event_id).sort()]).filter(([, partners]) => partners.length));
const recordedOverlap = new Map(overlap.records.map((row) => [row.event_id, row.overlapping_events]));
const overlapDiff = [...expectedOverlap].filter(([id, partners]) => JSON.stringify(recordedOverlap.get(id) ?? []) !== JSON.stringify(partners)).length + [...recordedOverlap.keys()].filter((id) => !expectedOverlap.has(id)).length;
if (overlapDiff) problems.push(`overlap: ${overlapDiff} event(s) differ from the recomputed ±${overlap.window_months}-month overlap`);

console.log(`events.json: ${events.length} events, ${verified.length} eligible · eligibility registry: ${eligibility.records.length} records (generated ${eligibility.generated_at}) · overlap registry: ${overlap.records.length} records (generated ${overlap.generated_at})`);
if (problems.length) { console.error(`Event registries are out of date:\n- ${problems.join("\n- ")}\nRegenerate with: pnpm events:build (changes frozen src/data files; needs an owner-approved governance record).`); process.exit(1); }
console.log("Event registries match events.json.");
