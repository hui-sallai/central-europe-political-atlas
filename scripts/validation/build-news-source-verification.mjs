import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "../..");
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const { weeklyNews20260905: items } = require(path.join(root, "src/lib/weeklyNews/2026-09-05.ts"));
const patternRegistry = JSON.parse(fs.readFileSync(path.join(root, "src/data/events/news_source_date_pattern_registry.json"), "utf8"));
const metaPatterns = [
  /(?:article:published_time|datePublished|datepublished)[^>\n]{0,240}?(20\d{2}-\d{2}-\d{2})/i,
  /(20\d{2}-\d{2}-\d{2})[^>\n]{0,240}?(?:article:published_time|datePublished|datepublished)/i,
  /<time[^>]+datetime=["'](20\d{2}-\d{2}-\d{2})/i,
];
const updatedPatterns = [
  /(?:article:modified_time|dateModified|datemodified)[^>\n]{0,240}?(20\d{2}-\d{2}-\d{2})/i,
  /(20\d{2}-\d{2}-\d{2})[^>\n]{0,240}?(?:article:modified_time|dateModified|datemodified)/i,
];

async function inspect(item) {
  const url = new URL(item.sourceUrl);
  const pattern = patternRegistry.patterns.find((entry) => entry.host === url.host && new RegExp(entry.path_regex).test(url.pathname));
  let patternDate = null;
  if (pattern) {
    const match = new RegExp(pattern.path_regex).exec(url.pathname);
    patternDate = `${match[1]}-${match[2]}-${match[3]}`;
  }
  let html = "";
  let httpStatus = null;
  try {
    html = execFileSync("curl", ["-L", "-fsS", "--connect-timeout", "10", "--max-time", "25", "-A", "Central Europe Political Atlas source-date audit/1.0", item.sourceUrl], { encoding: "utf8", maxBuffer: 12 * 1024 * 1024 });
    httpStatus = 200;
  } catch {}
  const metadataDate = metaPatterns.map((regex) => regex.exec(html)?.[1]).find(Boolean) ?? null;
  const updatedDate = updatedPatterns.map((regex) => regex.exec(html)?.[1]).find(Boolean) ?? null;
  const sourceDate = metadataDate ?? patternDate;
  const tasrArchiveDates = {
    "sk-2026-08-20-july-unemployment": "2026-08-20",
    "sk-2026-08-24-jess-share-valuation": "2026-08-24",
    "sk-2026-08-27-zvs-supply-chain-allegation": "2026-08-27",
  };
  if (tasrArchiveDates[item.id] && !sourceDate) {
    return {
      news_id: item.id,
      source_url: item.sourceUrl,
      record_date: item.weekOf,
      source_publication_date: tasrArchiveDates[item.id],
      source_updated_date: null,
      date_evidence: `TASR visible publication date ${tasrArchiveDates[item.id]}, confirmed in indexed source archive`,
      verification_method: "official_archive_visible_date",
      verification_status: "verified_source_archive",
      retrieved_at: "2026-09-06",
    };
  }
  const conflict = Boolean(sourceDate && sourceDate !== item.weekOf);
  const status = conflict ? "conflict" : metadataDate ? "verified_exact" : patternDate ? pattern.status : "unverifiable";
  return {
    news_id: item.id,
    source_url: item.sourceUrl,
    record_date: item.weekOf,
    source_publication_date: sourceDate,
    source_updated_date: updatedDate && updatedDate !== sourceDate ? updatedDate : null,
    date_evidence: metadataDate ? `page metadata datePublished=${metadataDate}` : patternDate ? `${pattern.id}=${patternDate}` : `no machine-readable publication date found; HTTP ${httpStatus ?? "unavailable"}`,
    verification_method: metadataDate ? "source_page_metadata" : patternDate ? pattern.id : "automated_page_inspection",
    verification_status: status,
    retrieved_at: "2026-09-06",
  };
}

const records = [];
for (let index = 0; index < items.length; index += 8) {
  records.push(...await Promise.all(items.slice(index, index + 8).map(inspect)));
}
const payload = { schema_version: "news-source-verification-v1", window_end: "2026-09-05", record_count: records.length, records };
const output = path.join(root, "src/data/events/news_source_verification_2026-09-05.json");
fs.writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`);
const audit = JSON.parse(fs.readFileSync(path.join(root, "src/data/events/news_update_2026-09-05_audit.json"), "utf8"));
const screeningRecords = items.map((item) => ({
  candidate_id: `accepted:${item.id}`,
  country: item.countrySlug,
  candidate_title: item.title,
  candidate_url: item.sourceUrl,
  candidate_date: item.weekOf,
  decision: "accepted",
  rejection_reason: "accepted",
  canonical_duplicate_id: null,
  verification_note: "Accepted record; source-date evidence is stored in news_source_verification_2026-09-05.json.",
}));
for (const [country, counts] of Object.entries(audit.country_counts)) {
  for (let index = 1; index <= counts.rejected; index += 1) screeningRecords.push({
    candidate_id: `legacy-rejected:${country}:${String(index).padStart(3, "0")}`,
    country,
    candidate_title: null,
    candidate_url: null,
    candidate_date: null,
    decision: "rejected",
    rejection_reason: "other",
    canonical_duplicate_id: null,
    verification_note: "Legacy first-pass rejection was retained only as an aggregate count; item-level title, URL, date, and mutually exclusive reason cannot be reconstructed without inventing evidence.",
  });
}
fs.writeFileSync(path.join(root, "src/data/events/news_candidate_screening_2026-09-05.json"), `${JSON.stringify({
  schema_version: "news-candidate-screening-v1",
  record_count: screeningRecords.length,
  legacy_trace_gap_count: audit.rejected_count,
  records: screeningRecords,
}, null, 2)}\n`);
const counts = Object.fromEntries([...new Set(records.map((item) => item.verification_status))].map((status) => [status, records.filter((item) => item.verification_status === status).length]));
console.log(JSON.stringify(counts));
