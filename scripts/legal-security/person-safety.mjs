// pnpm political-person-safety:validate — fails closed on person-level political inference, profiling or prediction
// structures in canonical data, public exports, schemas/proposals, TypeScript sources and Atlas-generated copy.
// Owner policy (2026-10-03): no political inference about identifiable natural persons; no Atlas political forecasting.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockedFieldReason, personRecordProblems, PERSON_LABEL_TERMS, RESULT_STATUSES, PROHIBITED_STATUS_VALUES } from './policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Legacy value in the accepted Germany Slice 1A store (byte-frozen); new stores must use RESULT_STATUSES.
export const RESULT_STATUS_ALIASES = { final: 'official_final' };
const SKIP_DIRS = new Set(['raw', 'local-evidence', 'snapshots', 'node_modules', '.next', 'out']);
const rel = (p) => path.relative(root, p).split(path.sep).join('/');

function* files(dir, test) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) yield* files(p, test); } else if (test(p)) yield p;
  }
}

/** Scan a parsed JSON value. Returns findings [{file, path, problem}]. */
export function scanJson(value, file, findings = [], at = '$') {
  if (Array.isArray(value)) { value.forEach((v, i) => scanJson(v, file, findings, `${at}[${i}]`)); return findings; }
  if (value && typeof value === 'object') {
    for (const p of personRecordProblems(value)) findings.push({ file, path: at, problem: p });
    for (const [k, v] of Object.entries(value)) {
      const reason = blockedFieldReason(k);
      if (reason) findings.push({ file, path: `${at}.${k}`, problem: `blocked field (${reason})` });
      if (k === 'result_status' && typeof v === 'string' && /^(src\/data\/political|public\/research-data\/political)\//.test(file) && !RESULT_STATUSES.includes(RESULT_STATUS_ALIASES[v] ?? v)) findings.push({ file, path: `${at}.${k}`, problem: `result status '${v}' not permitted` });
      if (typeof v === 'string' && PROHIBITED_STATUS_VALUES.includes(v) && /status/i.test(k)) findings.push({ file, path: `${at}.${k}`, problem: `prediction status value '${v}'` });
      scanJson(v, file, findings, `${at}.${k}`);
    }
  }
  return findings;
}

/** Atlas-generated copy containing person-level political labels (reviewed attributed quotations are allowlisted). */
export function scanCopy(text, file, allow = []) {
  const out = [];
  const re = new RegExp(PERSON_LABEL_TERMS.source, 'gi');
  for (const m of text.matchAll(re)) {
    const context = text.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, ' ');
    if (allow.some((a) => a.file === file && context.includes(a.context))) continue;
    out.push({ file, problem: `person-level political label '${m[0]}' in Atlas copy`, context });
  }
  return out;
}

export function runPersonSafety() {
  const findings = [];
  const allowFile = path.join(root, 'docs/legal-security/person_label_review_allowlist.json');
  const allow = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, 'utf8')).entries : [];
  let jsonFiles = 0, csvFiles = 0, tsFiles = 0;
  for (const base of ['src/data', 'public/research-data', 'docs', 'src/content']) {
    for (const f of files(path.join(root, base), (p) => p.endsWith('.json') && fs.statSync(p).size < 60e6)) {
      jsonFiles++;
      let value; try { value = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
      // Governance documents list prohibited names as values only; keys are still scanned.
      scanJson(value, rel(f), findings);
    }
  }
  for (const f of files(path.join(root, 'public/research-data'), (p) => p.endsWith('.csv'))) {
    csvFiles++;
    const header = fs.readFileSync(f, 'utf8').split(/\r?\n/, 1)[0].replace(/^﻿/, '');
    for (const col of header.split(/[,;]/).map((c) => c.replace(/^"|"$/g, '').trim())) { const r = blockedFieldReason(col); if (r) findings.push({ file: rel(f), path: col, problem: `blocked CSV column (${r})` }); }
  }
  for (const f of files(path.join(root, 'src'), (p) => /\.(ts|tsx|mjs)$/.test(p))) {
    tsFiles++;
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\??\s*:/g)) { const r = blockedFieldReason(m[1]); if (r) findings.push({ file: rel(f), path: m[1], problem: `blocked property/type field (${r})` }); }
    if (/^src\/(app|components|content|i18n|lib\/weeklyNews)\//.test(rel(f))) findings.push(...scanCopy(text, rel(f), allow));
  }
  const events = JSON.parse(fs.readFileSync(path.join(root, 'src/data/events/events.json'), 'utf8')).records;
  for (const e of events) findings.push(...scanCopy(`${e.title ?? ''}\n${e.summary ?? ''}`, `src/data/events/events.json#${e.id}`, allow));
  return { findings, scanned: { json_files: jsonFiles, csv_files: csvFiles, source_files: tsFiles, events: events.length } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { findings, scanned } = runPersonSafety();
  console.log(JSON.stringify({ status: findings.length ? 'fail' : 'pass', scanned, findings: findings.slice(0, 50), total_findings: findings.length }, null, 1));
  if (findings.length) process.exitCode = 1;
}
