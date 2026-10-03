// pnpm legal-security:validate — fail-closed legal / privacy / security governance checks (ENGINEERING CONTROL).
// Requires a fresh static export in out/ (run `pnpm build:site` first); pass --source-only to skip built-output checks.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NO_PROFILING_EN, NO_PROFILING_ZH, CLIENT_STORAGE_ALLOWLIST, RIGHTS_FIELDS, SITE_OPERATING_MODES, TRACKER_PATTERNS, externalScriptSources, isUnsafeUrl } from './policy.mjs';
import { runPersonSafety } from './person-safety.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceOnly = process.argv.includes('--source-only');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const exists = (p) => fs.existsSync(path.join(root, p));
const failures = [];
let checks = 0;
const check = (ok, message) => { checks++; if (!ok) failures.push(message); };
const SITE_HOST = 'hy-central-europe-analysis.org';
function* walk(dir, test, skip = new Set(['node_modules', '.next', 'local-evidence', 'raw'])) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (!skip.has(e.name)) yield* walk(p, test, skip); } else if (test(p)) yield p;
  }
}

// 1. Platform version
const release = json('src/data/release.json'), pkg = json('package.json');
check(String(release.version).startsWith('v2.0'), 'platform version must remain v2.0');
check(pkg.version === '2.0.0', 'package.json version must remain 2.0.0');

// 2. Governance documents
export const GOVERNANCE_DOCS = ['README.md', 'legal_risk_register.md', 'legal_risk_register.json', 'privacy_data_inventory.md', 'data_processing_register.md', 'personal_data_policy.md', 'political_person_data_policy.md', 'political_analysis_boundary.md', 'source_licence_policy.md', 'database_right_policy.md', 'copyright_content_policy.md', 'network_access_policy.md', 'robots_and_terms_policy.md', 'security_policy.md', 'incident_response_plan.md', 'retention_policy.md', 'correction_takedown_policy.md', 'commercialisation_gate.md', 'media_registration_watch.md', 'third_party_dependency_licences.md', 'owner_compliance_checklist.md', 'residual_risk_register.md', 'publisher_contact_release_checklist.md', 'source_rights_registry.json', 'network_acquisition_registry.json', 'site_operating_mode.json', 'owner_confirmations.json', 'person_label_review_allowlist.json', 'public_asset_registry.json', 'public_asset_rights_audit.md', 'publisher_response_records.json', 'publisher_correspondence_policy.md', 'owner_domain_security_verification.md', 'owner_controller_questionnaire.md', 'dependency_maintenance_exceptions.json'];
for (const d of GOVERNANCE_DOCS) check(exists(`docs/legal-security/${d}`), `missing governance doc docs/legal-security/${d}`);
check(exists('SECURITY.md'), 'missing SECURITY.md');

// 3. Person-level inference / profiling / prediction
const ps = runPersonSafety();
check(ps.findings.length === 0, `political-person-safety findings: ${ps.findings.slice(0, 3).map((f) => `${f.file} ${f.problem}`).join('; ')}`);

// 4. Source rights registry (fail closed)
const rights = json('docs/legal-security/source_rights_registry.json');
const openRightsIssues = [];
const attributionData = json('src/content/sourceAttributions.json');
const BIS_NOTICE_ZH = attributionData.translation_notices?.bis?.zh ?? '';
const assetRegistry = json('docs/legal-security/public_asset_registry.json').assets.map((a) => ({ ...a, re: new RegExp(a.pattern) }));
const ASSET_EXT = /\.(geojson|topojson|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|pdf|zip|gz|xlsx?|mp4|webm)$/i;
for (const s of rights.sources) {
  for (const f of RIGHTS_FIELDS) check(f in s, `${s.source_id}: missing rights field ${f}`);
  check(rights.vocabulary.review_status.includes(s.review_status), `${s.source_id}: review_status`);
  if (s.review_status === 'blocked') {
    check(!['cleared', 'cleared_noncommercial', 'cleared_with_conditions'].includes(s.raw_redistribution), `${s.source_id}: blocked source cannot have raw redistribution cleared`);
    check(s.publisher_confirmation_required === true, `${s.source_id}: blocked source must require publisher confirmation`);
  }
  if (s.raw_redistribution && String(s.raw_redistribution).startsWith('cleared')) check(s.review_status === 'verified' || s.review_status === 'documented', `${s.source_id}: raw redistribution cleared without verified/documented terms`);
  if (s.review_status === 'rights_conflict_reported') {
    const issue = s.open_rights_issue;
    check(issue && ['concrete', 'probable'].includes(issue.severity) && issue.summary && /OWNER DECISION/.test(issue.action ?? '') && Array.isArray(issue.published_paths), `${s.source_id}: rights conflict needs severity, summary, published_paths and an OWNER DECISION action`);
    for (const p of issue?.published_paths ?? []) check(exists(p) || /deleted|withdrawn/.test(issue.resolution ?? ''), `${s.source_id}: conflict path ${p} missing without a recorded resolution`);
    check(!String(s.raw_redistribution).startsWith('cleared'), `${s.source_id}: conflicted source cannot have raw redistribution cleared`);
    openRightsIssues.push({ source_id: s.source_id, severity: issue?.severity, paths: issue?.published_paths?.length ?? 0 });
  }
}
// Blocked-country regression: CZ/SK/PL/AT stay publisher_confirmation_required / NOT_READY and are not offered in the explorer.
const gateMatrix = json('docs/political-data/source-closure/gate_matrix.json');
for (const c of ['czechia', 'slovakia', 'poland', 'austria']) check(gateMatrix.countries.find((x) => x.country === c)?.overall_readiness === 'NOT_READY', `${c}: political production gate must remain NOT_READY`);
const explorer = read('src/components/PoliticalExplorerAlpha.tsx');
check(!/<option[^>]*>[^<]*(Czech|Slovak|Poland|Austria|捷克|斯洛伐克|波兰|奥地利)/i.test(explorer) && /<select disabled[^>]*><option>\{en \? "Germany" : "德国"\}<\/option><\/select>/.test(explorer), 'Political Explorer must expose Germany only');
// No canonical or exported political data for non-cleared countries
for (const dir of ['src/data/political', 'public/research-data/political']) {
  const dirs = exists(dir) ? fs.readdirSync(path.join(root, dir), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
  check(JSON.stringify(dirs) === JSON.stringify(['germany']), `${dir}: only germany is permitted (found ${dirs.join(', ')})`);
}
// Private audit evidence never published
const evidenceDir = 'docs/political-data/source-closure/local-evidence';
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
check(!tracked.some((f) => f.includes('/local-evidence/')), 'local-evidence must not be tracked');
check(read('docs/political-data/source-closure/.gitignore').includes('local-evidence/'), 'local-evidence must be gitignored');
if (exists(evidenceDir)) {
  const evidenceHashes = new Set(fs.readdirSync(path.join(root, evidenceDir)).filter((f) => f.endsWith('.raw')).map((f) => f.slice(0, 64)));
  for (const f of walk('public', (p) => !p.endsWith('.json') || true)) {
    const st = fs.statSync(path.join(root, f));
    if (st.size > 50e6) continue;
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
    check(!evidenceHashes.has(h), `public file ${f} is a private audit original`);
  }
}

// 5. Private correspondence never in Git
for (const f of tracked) {
  check(!/\.(eml|msg|mbox)$/i.test(f), `tracked mail file ${f}`);
  check(!/(^|\/)(correspondence|private|inbox)(\/|$)/i.test(f), `tracked private correspondence path ${f}`);
}
const responses = json('docs/legal-security/publisher_response_records.json');
for (const r of responses.records) {
  for (const k of Object.keys(r)) check(responses.allowed_fields.includes(k), `publisher response record: field ${k} not allowed in public repo`);
  check(responses.decision_outcomes.includes(r.decision_outcome), `publisher response record ${r.institution}: decision_outcome`);
  check(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(JSON.stringify(r)), `publisher response record ${r.institution}: contains an e-mail address`);
  check(String(r.permission_wording ?? '').length <= 600, `publisher response record ${r.institution}: permission wording too long (store the original privately)`);
}
for (const pattern of ['*.eml', '*.msg', '**/correspondence/', 'owner-evidence/']) check(read('.gitignore').includes(pattern), `.gitignore must block ${pattern}`);
for (const f of tracked.filter((f) => /\.(md|txt)$/i.test(f))) {
  const t = read(f);
  check(!/^From: .+@.+\n(?:.*\n){0,3}^Subject: /m.test(t), `${f}: looks like an e-mail message`);
}

// 6. Network acquisition registry: every scripted host known; blocked hosts never fetched
const net = json('docs/legal-security/network_acquisition_registry.json');
const knownHosts = new Set([...net.hosts.map((h) => h.host), ...net.reference_hosts.hosts]);
for (const f of walk('scripts', (p) => /\.(mjs|js|py)$/.test(p))) for (const m of read(f).matchAll(/https?:\/\/([a-zA-Z0-9.-]+\.[a-z]{2,})/g)) {
  const host = m[1];
  const known = knownHosts.has(host) || net.hosts.some((h) => h.include_subdomains && host.endsWith(`.${h.host}`));
  check(known, `${f}: unknown network host ${host} (add to network_acquisition_registry.json)`);
  const blockedEntry = net.hosts.find((h) => h.status === 'blocked' && (h.host === host || (h.include_subdomains && host.endsWith(`.${h.host}`))));
  if (blockedEntry && !net.blocked_host_exception_paths.some((p) => f.startsWith(p))) check(false, `${f}: references blocked host ${host} outside the evidence tooling`);
}
const acquire = read('docs/political-data/source-closure/acquire-evidence.mjs');
check(/statistics\\\.sk\$\/\.test\(new URL\(url\)\.hostname\)\)throw/.test(acquire) && /hostname==='www\.bmi\.gv\.at'\)throw/.test(acquire), 'evidence tooling must refuse blocked hosts before any request');

// 7. Client storage allowlist; no cookies, IndexedDB or sessionStorage
const allowedKeys = new Set(CLIENT_STORAGE_ALLOWLIST.map((k) => k.key));
for (const f of walk('src', (p) => /\.(ts|tsx)$/.test(p))) {
  const t = read(f);
  check(!/document\.cookie|\bindexedDB\s*\.|\bsessionStorage\s*[.[]|window\.(indexedDB|sessionStorage)\b|\bcookieStore\b/.test(t), `${f}: cookies / IndexedDB / sessionStorage require review`);
  for (const m of t.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(\s*([^,)]+)/g)) {
    const arg = m[1].trim();
    const literal = /^["'`]([^"'`$]+)["'`]$/.exec(arg)?.[1];
    if (literal) check(allowedKeys.has(literal), `${f}: localStorage key ${literal} not allowlisted`);
    else check(['NOTEBOOK_STORAGE_KEY', 'KEY', '"${KEY}"'].includes(arg) || /\$\{KEY\}/.test(arg), `${f}: unreviewed dynamic localStorage key ${arg}`);
  }
}
check(read('src/lib/researchNotebook.ts').includes('"central-europe-atlas:research-notebook:v1"'), 'notebook storage key changed — review allowlist');
check(read('src/components/ThemeToggle.tsx').includes('"atlas-theme"'), 'theme storage key changed — review allowlist');

// 8. Front-end security in source
for (const f of walk('src', (p) => /\.(ts|tsx)$/.test(p))) {
  const t = read(f);
  check(!/\beval\s*\(|new Function\s*\(|insertAdjacentHTML|document\.write\s*\(|\.innerHTML\s*=|\.outerHTML\s*=/.test(t), `${f}: dynamic code / raw HTML sink`);
  for (const m of t.matchAll(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([A-Za-z]+)/g)) check(['jsonLdHtml', 'themeBootScript'].includes(m[1]), `${f}: dangerouslySetInnerHTML with ${m[1]} (only jsonLdHtml/themeBootScript allowed)`);
  for (const m of t.matchAll(/(?:href|src)=["']([^"']+)["']/g)) check(!isUnsafeUrl(m[1]), `${f}: unsafe URL scheme ${m[1]}`);
  for (const m of t.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/g)) check(/rel=["'][^"']*(noopener|noreferrer)/.test(m[0]), `${f}: target=_blank without rel=noopener/noreferrer`);
}
// CSV formula-injection safeguards present in every CSV writer
check(/\[=\+@-\]/.test(read('src/lib/researchSnapshot.ts')), 'Research Snapshot CSV lacks formula-injection escaping');
check(/\[=\+@\\-\]/.test(read('src/lib/notebookExport.ts')), 'Notebook CSV lacks formula-injection escaping');
check(/\[=\+@\\-\]/.test(read('scripts/political-data/germany/export.mjs')), 'Germany CSV export lacks formula-injection escaping');

// 9. Dependencies / supply chain
check(JSON.stringify(Object.keys(pkg.dependencies).sort()) === JSON.stringify(['next', 'react', 'react-dom']), 'runtime dependencies must stay next/react/react-dom');
check(exists('pnpm-lock.yaml'), 'lockfile must be committed');
check(/pnpm install --frozen-lockfile/.test(read('.github/workflows/deploy-pages.yml')), 'CI must install with --frozen-lockfile');

// 10. Operating mode / commercialisation kill switch
const mode = json('docs/legal-security/site_operating_mode.json');
check(SITE_OPERATING_MODES.includes(mode.site_operating_mode), 'site_operating_mode invalid');
check(mode.site_operating_mode === 'noncommercial_research' || (mode.commercial_review && mode.commercial_review.completed === true), 'COMMERCIAL_MODE_REVIEW_REQUIRED: commercial mode without a completed review');

// 11. security.txt (RFC 9116)
const sec = exists('public/.well-known/security.txt') ? read('public/.well-known/security.txt') : '';
check(/^Contact: (mailto:|https:)/m.test(sec), 'security.txt Contact');
const expires = /^Expires: (.+)$/m.exec(sec)?.[1];
check(expires && Date.parse(expires) > Date.now() && Date.parse(expires) - Date.now() < 366 * 864e5, 'security.txt Expires must be in the future and within a year');
// Stale-expiry gate: renew at least 30 days before Expires (RFC 9116 §2.5.5) so the file never lapses between deploys.
check(expires && Date.parse(expires) - Date.now() > 30 * 864e5, `security.txt Expires (${expires}) is within 30 days — renew it`);
check(/^Preferred-Languages: zh, en$/m.test(sec), 'security.txt Preferred-Languages');
check(/^Policy: https:\/\/github\.com\/hui-sallai\/central-europe-political-atlas\/blob\/main\/SECURITY\.md$/m.test(sec), 'security.txt Policy must point to SECURITY.md');
check([...sec.matchAll(/^Contact: mailto:(.+)$/gm)].every((m) => m[1] === release.public_contact_email), 'security.txt Contact must be the already-public contact address only');
check(/^Canonical: https:\/\/hy-central-europe-analysis\.org\/\.well-known\/security\.txt$/m.test(sec), 'security.txt Canonical');
check(!/OWNER_CONFIRMATION_REQUIRED|TODO|\[.*?\]/.test(sec), 'security.txt contains a placeholder');

// 12. Public legal/privacy statements (source) and no public placeholders
for (const [f, needle] of [['src/app/(zh)/privacy/page.tsx', NO_PROFILING_ZH], ['src/app/(english)/en/privacy/page.tsx', NO_PROFILING_EN], ['src/app/(zh)/legal/page.tsx', NO_PROFILING_ZH], ['src/app/(english)/en/legal/page.tsx', NO_PROFILING_EN]]) {
  const t = read(f);
  check(t.includes(needle), `${f}: no-profiling statement missing`);
  check(!/OWNER_CONFIRMATION_REQUIRED|\bTODO\b|\[owner/i.test(t), `${f}: unresolved placeholder in public page`);
}
check(read('src/app/(zh)/privacy/page.tsx').includes('atlas-theme') && read('src/app/(english)/en/privacy/page.tsx').includes('atlas-theme'), 'privacy notice must disclose the atlas-theme preference key');

// 13. Built output: trackers, third-party runtime scripts, attribution, statements
if (!sourceOnly) {
  check(exists('out/index.html'), 'out/ missing — run pnpm build:site or pass --source-only');
  if (exists('out/index.html')) {
    for (const f of walk('out', (p) => /\.(html|js)$/.test(p), new Set(['research-data']))) {
      const t = read(f);
      check(!TRACKER_PATTERNS.test(t), `${f}: tracker/analytics/ads pattern`);
      if (f.endsWith('.html')) {
        check(externalScriptSources(t, SITE_HOST).length === 0, `${f}: third-party runtime script ${externalScriptSources(t, SITE_HOST)[0]}`);
        check(!/<iframe\b[^>]*src=["']https?:/i.test(t), `${f}: external iframe`);
        for (const m of t.matchAll(/\b(?:href|src)="([^"]+)"/g)) check(!isUnsafeUrl(m[1].replaceAll('&amp;', '&')), `${f}: unsafe URL ${m[1].slice(0, 40)}`);
      }
    }
    for (const r of ['map', 'en/map']) check(read(`out/${r}/index.html`).includes('EuroGeographics'), `out/${r}: EuroGeographics attribution missing`);
    for (const r of ['politics', 'en/politics']) { const t = read(`out/${r}/index.html`); check(t.includes('Die Bundeswahlleiterin'), `out/${r}: Bundeswahlleiterin attribution missing`); }
    for (const [r, needle] of [['privacy', NO_PROFILING_ZH], ['en/privacy', NO_PROFILING_EN], ['legal', NO_PROFILING_ZH], ['en/legal', NO_PROFILING_EN]]) check(read(`out/${r}/index.html`).replace(/&#x27;|&#39;|&apos;/g, "'").includes(needle), `out/${r}: no-profiling statement missing`);
    check(exists('out/.well-known/security.txt'), 'out/.well-known/security.txt missing');
    for (const f of walk('out', (p) => ASSET_EXT.test(p) && !p.startsWith('out/data/') && !p.startsWith('out/geo/'))) check(assetRegistry.some((a) => a.re.test(f)), `${f}: built binary not in public_asset_registry.json`);
    check(exists('out/.well-known/security.txt') && read('out/.well-known/security.txt') === sec, 'built security.txt differs from public/.well-known/security.txt');
    check(read('out/methodology/index.html').includes(BIS_NOTICE_ZH), 'out/methodology: BIS translation notice missing');
  }
}
// Germany export attribution
const deReadme = read('public/research-data/political/germany/README.md');
check(deReadme.includes('Die Bundeswahlleiterin') && deReadme.includes('dl-de/by-2-0') && /Derived shares/i.test(deReadme), 'Germany export README must state source, licence and derived-value disclosure');
for (const s of json('src/data/political/germany/political_source_registry.json').records ?? []) check(s.attribution && s.licence_url && s.retrieved_at, `Germany source ${s.source_id}: attribution/licence/retrieval missing`);
// GISCO attribution in code paths for web, SVG/PNG and Research Snapshot
check(/EuroGeographics/.test(read('src/lib/regionSources.ts')), 'regionSources must carry EuroGeographics attribution');
// Public asset rights: every tracked binary/geometry asset is registered.
for (const f of execFileSync('git', ['ls-files', 'public'], { cwd: root, encoding: 'utf8' }).split('\n').filter((f) => ASSET_EXT.test(f))) check(assetRegistry.some((a) => a.re.test(f)), `${f}: public asset not in public_asset_registry.json`);
for (const a of assetRegistry) if (a.registry_source_id) check(rights.sources.some((s) => s.source_id === a.registry_source_id), `asset pattern ${a.pattern}: unknown registry source`);
// CI must run the political source-closure checkpoint (checkpoint mode only; the full closure is expected to fail).
const ci = read('.github/workflows/deploy-pages.yml');
check(/run: pnpm political-source-closure:validate --checkpoint\s*$/m.test(ci) && !/political-source-closure:validate\s*$/m.test(ci), 'CI must run political-source-closure:validate --checkpoint');
for (const e of json('docs/legal-security/dependency_maintenance_exceptions.json').exceptions) check(/^[0-9a-f]{64}$/.test(e.new_lockfile_sha256) && ['research_data_change_allowed', 'model_output_change_allowed', 'political_data_change_allowed', 'release_version_change_allowed'].every((k) => e[k] === false), `dependency exception ${e.exception_id}: exact hash and all research/model/political/release flags false required`);
// Shared attribution architecture: one JSON, linked to the rights registry, used by web, snapshot and package README.
check(/BIS/.test(BIS_NOTICE_ZH) && /并非 BIS 官方翻译/.test(BIS_NOTICE_ZH), 'BIS Chinese translation notice missing from sourceAttributions.json');
for (const entry of attributionData.sources) check(rights.sources.some((s) => s.source_id === entry.registry_source_id), `attribution ${entry.id}: unknown registry source ${entry.registry_source_id}`);
for (const s of rights.sources.filter((s) => s.review_status !== 'blocked' && s.source_id !== 'src-ecb-wp-annex-datasets')) check(attributionData.sources.some((e) => e.registry_source_id === s.source_id), `${s.source_id}: no entry in src/content/sourceAttributions.json`);
check(attributionData.sources.find((e) => e.id === 'bis')?.zh_translation_notice === 'bis', 'BIS attribution must carry the Chinese translation notice');
check(/attributionLines/.test(read('src/lib/researchSnapshot.ts')), 'Research Snapshot must include source attribution');
check(/sourceAttributions\.json/.test(read('scripts/release/build-research-package.mjs')), 'research package README must include source attribution');
check(/BIS_TRANSLATION_NOTICE_ZH/.test(read('src/app/(zh)/methodology/page.tsx')), 'zh methodology must show the BIS translation notice');
for (const f of ['src/components/MacroDriverWorkbench.tsx', 'src/components/DataExplorerV11.tsx']) check(read(f).includes('<SourceAttributionNote'), `${f}: source panel must render SourceAttributionNote`);
check(/exportMap|source:/.test(read('src/components/ComparativeSpatialWorkbench.tsx')) && /attribution|administrative boundaries/.test(read('src/components/ComparativeSpatialWorkbench.tsx')), 'map export must include the boundary attribution');

// 14. Secrets
const scan = spawnSync(process.execPath, [path.join(root, 'scripts/security/check-public-secrets.mjs')], { cwd: root, encoding: 'utf8' });
check(scan.status === 0, `secret scan failed: ${(scan.stdout + scan.stderr).trim().split('\n').at(-1)}`);

// 15. Publisher-contact release gate (operational readiness, not legal advice)
const ownerFile = json('docs/legal-security/owner_confirmations.json');
const owner = ownerFile.items;
// Fail closed: a confirmation counts only with an owner-supplied evidence record; values are never inferred.
for (const [k, v] of Object.entries(owner)) {
  check(v === null || v === true || v === false, `owner_confirmations.${k} must be null, true or false`);
  if (v === true) check(ownerFile.evidence?.[k]?.confirmed_on && ownerFile.evidence?.[k]?.owner_statement, `owner_confirmations.${k} is true without owner evidence {confirmed_on, owner_statement}`);
}
for (const [k, v] of Object.entries(ownerFile.answers ?? {})) if (v !== null) check(ownerFile.evidence?.[`answer:${k}`]?.owner_statement, `owner answer ${k} set without owner evidence`);
const required = ['controller_identity_confirmed', 'public_contact_email_confirmed', 'noncommercial_status_confirmed', 'no_institutional_affiliation_claimed', 'legal_notice_reviewed', 'privacy_notice_reviewed'];
const gate = required.every((k) => owner[k] === true) && failures.length === 0 ? 'READY_FOR_OWNER_TO_CONTACT_PUBLISHERS' : 'NOT_READY_FOR_OWNER_TO_CONTACT_PUBLISHERS';
const checklist = exists('docs/legal-security/publisher_contact_release_checklist.md') ? read('docs/legal-security/publisher_contact_release_checklist.md') : '';
check(checklist.includes(`Current status: ${gate}`), `publisher_contact_release_checklist.md must state the computed status ${gate}`);

console.log(JSON.stringify({ status: failures.length ? 'fail' : 'pass', checks, mode: sourceOnly ? 'source-only' : 'full', person_safety: ps.scanned, publisher_contact_gate: gate, open_rights_issues: openRightsIssues, failures: failures.slice(0, 40), total_failures: failures.length }, null, 1));
if (failures.length) process.exitCode = 1;
