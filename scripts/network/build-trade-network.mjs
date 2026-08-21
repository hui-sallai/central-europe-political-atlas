// Builds the canonical bilateral trade network dataset from cached UN Comtrade
// preview-API responses (.tmp-comtrade/raw/, see acquire-comtrade-bilateral.mjs).
//
// Outputs (all deterministic):
//   src/data/network/trade_edges.json      canonical edge records (schema trade-network-v1.25)
//   src/data/network/network_metrics.json  deterministic per reporter-year-flow metrics
//   src/data/network/network_nodes.json    reporter + eligible partner nodes
//   src/data/network/network_ui_pack.json  compact per reporter-year-flow partner packs for the UI
//
// Aggregate partners (World, "Other Asia, nes", "Other Europe, nes", "Other Africa, nes",
// "Areas, nes") are retained in the edge records with network_eligible = false and never
// enter nodes or metrics. Coverage gate: eligible partner sum / World total >= 0.95.
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
const { calculateNetworkMetrics, computeCoverageGate } = require("../../src/lib/networkEngine.ts");
const rawDir = path.join(root, ".tmp-comtrade", "raw");
const outDir = path.join(root, "src", "data", "network");

const AGGREGATE_PARTNER_CODES = new Set([0, 490, 568, 577, 899]);
const COVERAGE_THRESHOLD = 0.95;
const SOURCE = "UN Comtrade";
const SOURCE_URL = "https://comtradeplus.un.org/";

function partnerSlug(desc) {
  return desc.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const files = fs.readdirSync(rawDir).filter((name) => name.endsWith(".json"));
const edges = [];
const skipped = [];

for (const file of files) {
  const payload = JSON.parse(fs.readFileSync(path.join(rawDir, file), "utf8"));
  if (!Array.isArray(payload.data)) { skipped.push(file); continue; }
  for (const record of payload.data) {
    const reporter = record.reporterDesc.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const partner = partnerSlug(record.partnerDesc);
    const aggregate = AGGREGATE_PARTNER_CODES.has(record.partnerCode);
    edges.push({
      edge_id: `${reporter}:${partner}:${record.refYear}:${record.flowCode === "X" ? "exports" : "imports"}`,
      reporter_country: reporter,
      partner_country: partner,
      partner_iso3: record.partnerISO ?? null,
      year: record.refYear,
      sector: "TOTAL",
      flow: record.flowCode === "X" ? "exports" : "imports",
      trade_value: record.primaryValue,
      currency: "current USD",
      source: SOURCE,
      source_url: SOURCE_URL,
      source_reliability: "A",
      data_status: "official",
      network_eligible: !aggregate,
    });
  }
}

edges.sort((a, b) => a.edge_id.localeCompare(b.edge_id));

// Coverage gate per reporter × year × flow: sum of all non-World partner rows vs the World total.
const groups = new Map();
for (const edge of edges) {
  const key = `${edge.reporter_country}:${edge.year}:${edge.flow}`;
  groups.set(key, [...(groups.get(key) ?? []), edge]);
}
// Formal coverage gate via the canonical engine (v1.3): eligible partner sum / world
// total >= threshold. Raw coverage (including aggregates) is QA-only.
const coverage = computeCoverageGate(edges, COVERAGE_THRESHOLD);

const failed = coverage.filter((entry) => !entry.gate_passed);
const generatedAt = new Date().toISOString().slice(0, 10);

const edgesFile = {
  schema_version: "trade-network-v1.3",
  generated_at: generatedAt,
  record_count: edges.length,
  coverage_gate: {
    definition: "eligible_coverage_ratio = sum(network_eligible partner values) / world_total; raw coverage is QA-only",
    status: failed.length ? "partial" : "active",
    threshold: COVERAGE_THRESHOLD,
    failed_groups: failed.length,
    total_groups: coverage.length,
    reason: failed.length
      ? `${failed.length} reporter-year-flow groups below eligible coverage threshold ${COVERAGE_THRESHOLD}; those combinations are unavailable for formal network metrics (see network_coverage.json).`
      : "All reporter-year-flow groups pass the eligible coverage threshold.",
    is_active: coverage.length > 0,
  },
  aggregate_partner_codes: [...AGGREGATE_PARTNER_CODES],
  records: edges,
};

const nodes = new Map();
for (const edge of edges) {
  if (!edge.network_eligible) continue;
  if (!nodes.has(edge.reporter_country)) nodes.set(edge.reporter_country, { node_id: edge.reporter_country, node_type: "reporter", label: edge.reporter_country });
  if (!nodes.has(edge.partner_country)) nodes.set(edge.partner_country, { node_id: edge.partner_country, node_type: "partner", label: edge.partner_country, iso3: edge.partner_iso3 });
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "trade_edges.json"), JSON.stringify(edgesFile));
fs.writeFileSync(path.join(outDir, "network_coverage.json"), JSON.stringify({ schema_version: "trade-network-coverage-v1.3", generated_at: generatedAt, threshold: COVERAGE_THRESHOLD, gate_definition: "eligible_coverage_ratio >= threshold; raw_coverage_ratio is QA-only", record_count: coverage.length, records: coverage }, null, 2));
fs.writeFileSync(path.join(outDir, "network_nodes.json"), JSON.stringify({
  schema_version: "trade-network-nodes-v1.3",
  generated_at: generatedAt,
  record_count: nodes.size,
  records: [...nodes.values()].sort((a, b) => a.node_id.localeCompare(b.node_id)),
}, null, 2));

// Deterministic metrics via the canonical TypeScript engine (single source of truth).
const metrics = calculateNetworkMetrics(edges);
fs.writeFileSync(path.join(outDir, "network_metrics.json"), JSON.stringify({
  schema_version: "trade-network-metrics-v1.3",
  generated_at: generatedAt,
  record_count: metrics.length,
  status: "active",
  metric_definitions: {
    partner_hhi: "Herfindahl-Hirschman index over eligible partner shares (0-1).",
    top_partner_share: "Largest single partner share of the reporter flow.",
    china_share: "China share of the reporter flow (null when absent).",
    germany_share: "Germany share of the reporter flow (null for Germany itself or when absent).",
    diversification: "1 - partner_hhi.",
    weighted_trade_volume: "Nominal trade value of the reporter-year-flow group (current USD, not a real/growth measure).",
    partner_count: "Plain count of distinct eligible partners. No centrality measure is published.",
  },
  interpretation_boundary: "Trade concentration is not economic risk; China share is not political dependence; network position is not political influence.",
  records: metrics,
}, null, 2));

// Compact UI pack: per reporter-year-flow top partners + metrics + coverage.
const coverageByKey = new Map(coverage.map((entry) => [`${entry.reporter_country}:${entry.year}:${entry.flow}`, entry]));
const metricsByKey = new Map(metrics.map((entry) => [`${entry.country}:${entry.year}:${entry.flow}`, entry]));
const uiGroups = [];
for (const [key, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const eligible = group.filter((edge) => edge.network_eligible);
  const total = eligible.reduce((sum, edge) => sum + edge.trade_value, 0);
  const topPartners = eligible
    .map((edge) => ({ partner: edge.partner_country, iso3: edge.partner_iso3, value: edge.trade_value, share: total ? edge.trade_value / total : 0 }))
    .sort((a, b) => b.share - a.share || a.partner.localeCompare(b.partner))
    .slice(0, 15)
    .map((entry) => ({ ...entry, share: Number(entry.share.toFixed(6)) }));
  const [reporter, year, flow] = key.split(":");
  uiGroups.push({
    reporter,
    year: Number(year),
    flow,
    partner_count: eligible.length,
    metrics: metricsByKey.get(key) ?? null,
    coverage: coverageByKey.get(key) ?? null,
    top_partners: topPartners,
  });
}
fs.writeFileSync(path.join(outDir, "network_ui_pack.json"), JSON.stringify({
  schema_version: "trade-network-ui-pack-v1.3",
  generated_at: generatedAt,
  record_count: uiGroups.length,
  interpretation_boundary: "Trade concentration is not economic risk; China share is not political dependence; network position is not political influence.",
  records: uiGroups,
}, null, 2));

// Public copies consumed by the client workbench (fetched at runtime, not bundled).
const publicDir = path.join(root, "public", "research-data");
fs.mkdirSync(publicDir, { recursive: true });
for (const name of ["network_ui_pack.json", "network_coverage.json", "network_metrics.json"]) {
  fs.copyFileSync(path.join(outDir, name), path.join(publicDir, name));
}

// Acquisition manifest: one record per raw Comtrade response, with content hash,
// so any release can answer "which acquisition run produced this dataset?".
const crypto = await import("node:crypto");
const manifestRecords = files.map((file) => {
  const absolute = path.join(rawDir, file);
  const content = fs.readFileSync(absolute);
  const payload = JSON.parse(content.toString("utf8"));
  const [slug, year, flow] = file.replace(".json", "").split("-");
  const reporterCode = { germany: 276, poland: 616, hungary: 348, romania: 642, czechia: 203, slovakia: 703, slovenia: 705, serbia: 688, austria: 40, croatia: 191 }[slug];
  return {
    reporter: slug,
    reporter_code: reporterCode,
    year: Number(year),
    flow: flow === "X" ? "exports" : "imports",
    api_endpoint: "https://comtradeapi.un.org/public/v1/preview/C/A/HS",
    query_parameters: { reporterCode, period: Number(year), flowCode: flow, cmdCode: "TOTAL", motCode: 0, customsCode: "C00", partner2Code: 0, includeDesc: true },
    api_type: "public preview (no key)",
    response_count: Array.isArray(payload.data) ? payload.data.length : 0,
    unavailable_reason: payload.error ?? null,
    acquisition_date: fs.statSync(absolute).mtime.toISOString().slice(0, 10),
    source: SOURCE,
    source_dataset: "UN Comtrade C/A/HS TOTAL goods",
    content_hash_sha256: crypto.createHash("sha256").update(content).digest("hex"),
  };
});
manifestRecords.sort((a, b) => `${a.reporter}:${a.year}:${a.flow}`.localeCompare(`${b.reporter}:${b.year}:${b.flow}`));
fs.writeFileSync(path.join(outDir, "network_acquisition_manifest.json"), JSON.stringify({
  schema_version: "network-acquisition-manifest-v1.3",
  generated_at: generatedAt,
  record_count: manifestRecords.length,
  records: manifestRecords,
}, null, 2));
fs.copyFileSync(path.join(outDir, "network_acquisition_manifest.json"), path.join(publicDir, "network_acquisition_manifest.json"));

console.log(`edges: ${edges.length}; nodes: ${nodes.size}; coverage groups: ${coverage.length}; failed groups: ${failed.length}; metrics: ${metrics.length}; ui groups: ${uiGroups.length}`);
if (failed.length) console.log(`failed: ${failed.map((entry) => `${entry.reporter_country} ${entry.year} ${entry.flow} (eligible ${entry.eligible_coverage_ratio})`).join("; ")}`);
if (skipped.length) console.log(`skipped payloads: ${skipped.join(", ")}`);
