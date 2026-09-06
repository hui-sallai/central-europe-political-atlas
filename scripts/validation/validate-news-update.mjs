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
const verification = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/data/events/news_source_verification_2026-09-05.json"), "utf8"));
const screening = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/data/events/news_candidate_screening_2026-09-05.json"), "utf8"));
const datePatterns = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/data/events/news_source_date_pattern_registry.json"), "utf8"));
const allowedCountries = new Set(["hungary", "poland", "czechia", "slovakia", "germany", "romania", "slovenia", "serbia", "austria", "croatia"]);
const allowedTopics = new Set(["政治", "经济", "欧盟", "能源", "区域", "对华经贸"]);
const allowedEventTypes = new Set(["fiscal", "EU_funds", "macro", "energy", "industrial_policy", "FDI", "China", "election", "regional"]);
const ids = new Set();
const individualUrls = new Set();
const sourceItems = new Set();
const failures = [];
const counts = {};
const verificationById = new Map(verification.records.map((item) => [item.news_id, item]));
const verifiedStatuses = new Set(["verified_exact", "verified_source_archive", "verified_url_pattern", "verified_bulletin_item"]);
const allowedPageTypes = new Set(["individual_article", "daily_bulletin", "agency_roundup", "government_briefing", "official_archive_item"]);
const sharedPageTypes = new Set(["daily_bulletin", "agency_roundup", "government_briefing"]);
const normalizeSourceItem = (value) => value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();

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
  const evidence = verificationById.get(item.id);
  if (!evidence) failures.push(`${item.id}: missing source verification record`);
  else {
    if (!verifiedStatuses.has(evidence.verification_status)) failures.push(`${item.id}: source verification is ${evidence.verification_status}`);
    if (evidence.record_date !== item.weekOf || evidence.source_publication_date !== item.weekOf) failures.push(`${item.id}: record/source date mismatch`);
    if (!allowedPageTypes.has(evidence.source_page_type)) failures.push(`${item.id}: invalid source page type`);
    if (sharedPageTypes.has(evidence.source_page_type)) {
      if (!evidence.source_item_title) failures.push(`${item.id}: shared source page requires source_item_title`);
      if (!evidence.source_item_position && !evidence.source_item_anchor) failures.push(`${item.id}: shared source page requires item position or anchor`);
      const key = `${item.sourceUrl}::${normalizeSourceItem(evidence.source_item_title ?? "")}`;
      if (sourceItems.has(key)) failures.push(`${item.id}: duplicate source item`);
      sourceItems.add(key);
    } else {
      if (individualUrls.has(item.sourceUrl)) failures.push(`${item.id}: duplicate individual source URL`);
      individualUrls.add(item.sourceUrl);
    }
  }
  const url = new URL(item.sourceUrl);
  const pattern = datePatterns.patterns.find((entry) => entry.host === url.host && new RegExp(entry.path_regex).test(url.pathname));
  if (pattern) {
    const match = new RegExp(pattern.path_regex).exec(url.pathname);
    const urlDate = `${match[1]}-${match[2]}-${match[3]}`;
    if (urlDate !== item.weekOf) failures.push(`${item.id}: URL date ${urlDate} != ${item.weekOf}`);
  }
  ids.add(item.id);
  counts[item.countrySlug] = (counts[item.countrySlug] ?? 0) + 1;
}

if (items.length !== audit.accepted_count) failures.push(`accepted count: ${items.length} != ${audit.accepted_count}`);
if (verification.record_count !== items.length || verification.records.length !== items.length) failures.push("source verification coverage is incomplete");
if (screening.record_count !== audit.screened_candidate_count || screening.records.length !== audit.screened_candidate_count) failures.push("candidate screening count does not match audit");
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
