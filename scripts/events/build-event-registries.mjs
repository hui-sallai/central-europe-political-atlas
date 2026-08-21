// Generates event-analysis registry exports: per-event window eligibility, the
// event-window registry entry and the overlap registry (verified events sharing a
// ±12 month window within the same country).
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, parent, isMain, options) {
  if (request.startsWith("@/")) request = path.join(root, "src", request.slice(2));
  return originalResolve.call(this, request, parent, isMain, options);
};
require.extensions[".ts"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filename });
  module._compile(output.outputText, filename);
};

const { eventWindowEligibility, suggestedOutcomes } = require("../../src/lib/eventWindowEngine.ts");
const events = JSON.parse(fs.readFileSync(path.join(root, "src/data/events/events.json"), "utf8"));
const records = events.records ?? events;
const generatedAt = new Date().toISOString().slice(0, 10);

const eligibility = records.map((event) => {
  const result = eventWindowEligibility(event);
  return {
    event_id: event.event_id,
    country_slug: event.country_slug,
    date: event.date,
    data_status: event.data_status,
    date_precision_ok: /^\d{4}-\d{2}/.test(event.date),
    eligible: result.eligible,
    reason: result.reason,
    suggested_outcomes: result.eligible ? suggestedOutcomes(event.event_type) : [],
  };
}).sort((a, b) => a.event_id.localeCompare(b.event_id));

const overlap = [];
const verified = records.filter((event) => event.data_status === "verified" && /^\d{4}-\d{2}/.test(event.date));
for (const event of verified) {
  const [year, month] = event.date.slice(0, 7).split("-").map(Number);
  const center = year * 12 + month;
  const partners = verified.filter((candidate) => {
    if (candidate.event_id === event.event_id || candidate.country_slug !== event.country_slug) return false;
    const [cy, cm] = candidate.date.slice(0, 7).split("-").map(Number);
    return Math.abs(cy * 12 + cm - center) <= 12;
  });
  if (partners.length) {
    overlap.push({
      event_id: event.event_id,
      country_slug: event.country_slug,
      date: event.date,
      overlapping_events: partners.map((candidate) => candidate.event_id).sort(),
    });
  }
}
overlap.sort((a, b) => a.event_id.localeCompare(b.event_id));

const outDir = path.join(root, "src", "data", "events");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "event_analysis_eligibility.json"), JSON.stringify({
  schema_version: "event-analysis-eligibility-v1.3",
  generated_at: generatedAt,
  record_count: eligibility.length,
  eligible_count: eligibility.filter((entry) => entry.eligible).length,
  records: eligibility,
}, null, 2));
fs.writeFileSync(path.join(outDir, "event_overlap_registry.json"), JSON.stringify({
  schema_version: "event-overlap-registry-v1.3",
  generated_at: generatedAt,
  window_months: 12,
  record_count: overlap.length,
  records: overlap,
}, null, 2));
fs.writeFileSync(path.join(outDir, "event_window_registry.json"), JSON.stringify({
  schema_version: "event-window-registry-v1.3",
  generated_at: generatedAt,
  level_1: { name: "Event Window Analysis", status: "active", causal: false },
  level_2: { name: "Formal Event Study", status: "registry_only", note: "Requires comparison-group design and identification strategy; not estimated." },
  default_window: { pre_months: 12, post_months: 12 },
  full_gate: { min_pre_observations: 12, min_post_observations: 6 },
  exploratory_gate: { min_pre_observations: 6, min_post_observations: 3 },
  language_boundary: "No effect/impact/causal wording; descriptive change only.",
}, null, 2));

console.log(`eligibility: ${eligibility.length} events (${eligibility.filter((entry) => entry.eligible).length} eligible); overlap groups: ${overlap.length}`);
