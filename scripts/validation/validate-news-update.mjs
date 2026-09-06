import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const require = createRequire(import.meta.url);

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const { weeklyNews20260905: items } = require(path.join(projectRoot, "src/lib/weeklyNews/2026-09-05.ts"));
const audit = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/data/events/news_update_2026-09-05_audit.json"), "utf8"));
const allowedCountries = new Set(["hungary", "poland", "czechia", "slovakia", "germany", "romania", "slovenia", "serbia", "austria", "croatia"]);
const allowedTopics = new Set(["政治", "经济", "欧盟", "能源", "区域", "对华经贸"]);
const allowedEventTypes = new Set(["fiscal", "EU_funds", "macro", "energy", "industrial_policy", "FDI", "China", "election", "regional"]);
const ids = new Set();
const urls = new Set();
const failures = [];
const counts = {};

for (const item of items) {
  if (item.weekOf < audit.window.start || item.weekOf > audit.window.end) failures.push(`${item.id}: date outside window`);
  if (!allowedCountries.has(item.countrySlug)) failures.push(`${item.id}: unknown country`);
  if (!allowedTopics.has(item.topic)) failures.push(`${item.id}: unknown topic`);
  if (!allowedEventTypes.has(item.eventType)) failures.push(`${item.id}: unknown event type`);
  if (!/^https:\/\//.test(item.sourceUrl ?? "")) failures.push(`${item.id}: source is not HTTPS`);
  if (/[?&](q|query|search|page)=/i.test(item.sourceUrl ?? "")) failures.push(`${item.id}: source is a search or listing URL`);
  if (!/[\u3400-\u9fff]/u.test(item.title)) failures.push(`${item.id}: title is not Chinese`);
  if (!item.summary.includes("\n\n")) failures.push(`${item.id}: summary needs two paragraphs`);
  if (ids.has(item.id)) failures.push(`${item.id}: duplicate id`);
  if (urls.has(item.sourceUrl)) failures.push(`${item.id}: duplicate source URL`);
  ids.add(item.id);
  urls.add(item.sourceUrl);
  counts[item.countrySlug] = (counts[item.countrySlug] ?? 0) + 1;
}

if (items.length !== audit.accepted_count) failures.push(`accepted count: ${items.length} != ${audit.accepted_count}`);
for (const country of allowedCountries) {
  const expected = audit.country_counts[country]?.accepted;
  if ((counts[country] ?? 0) !== expected) failures.push(`${country}: ${counts[country] ?? 0} != ${expected}`);
}
if (audit.screened_candidate_count !== audit.accepted_count + audit.rejected_count) failures.push("audit totals do not reconcile");

if (failures.length) {
  console.error(`News update validation failed (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`News update validation passed: ${items.length} accepted, ${audit.rejected_count} rejected, 10 countries.`);
