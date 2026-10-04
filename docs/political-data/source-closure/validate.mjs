import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {COUNTRY_GATES,RIGHTS_GATES,PRODUCTION_GATES,MATRIX_GATES,VALUES,STATUSES,countryMatrix} from './gates.mjs';
import {matchDependencyException,DEPENDENCY_EXCEPTIONS_FILE} from '../../../scripts/political-data/germany/frozen-boundary.mjs';
import {checkFrozenFiles,UI_AMENDMENTS_FILE,MIRROR_SYNC_FILE} from './ui-amendments.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../../..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const baseline=read('frozen-baseline.json');
const currentFiles=[];
function walk(rel){for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true})){const p=`${rel}/${e.name}`;if(e.isDirectory())walk(p);else if(e.isFile())currentFiles.push(p);}}
for(const rel of ['src/data','public/research-data','src/app','src/components','src/lib'])walk(rel);
currentFiles.push('package.json','pnpm-lock.yaml');
// The lockfile may differ from this checkpoint's baseline (commit d68d0e1) only under the shared exact-hash
// owner-approved dependency exception (scripts/political-data/germany/frozen-boundary.mjs); listed UI/governance
// presentation files only under an exact-hash amendment (ui-amendments.mjs). Data, model and release files: never.
const lockfileUnderException=()=>matchDependencyException({
 exceptions:JSON.parse(fs.readFileSync(path.join(root,DEPENDENCY_EXCEPTIONS_FILE),'utf8')).exceptions,
 lockHash:sha(fs.readFileSync(path.join(root,'pnpm-lock.yaml'))),
 pkgBefore:JSON.parse(execFileSync('git',['show','d68d0e10fa0c83b57e044af02e352379aa9e9d2d:package.json'],{cwd:root,encoding:'utf8'})),
 pkgAfter:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')),
}).ok;
const uiAmendments=fs.existsSync(path.join(root,UI_AMENDMENTS_FILE))?JSON.parse(fs.readFileSync(path.join(root,UI_AMENDMENTS_FILE),'utf8')).amendments:[];
const frozenCheck=checkFrozenFiles({baselineFiles:baseline.files,currentFiles:currentFiles.sort(),hashOf:name=>sha(fs.readFileSync(path.join(root,name))),amendments:uiAmendments,mirrorSyncs:fs.existsSync(path.join(root,MIRROR_SYNC_FILE))?JSON.parse(fs.readFileSync(path.join(root,MIRROR_SYNC_FILE),'utf8')).syncs:[],lockfileApproved:lockfileUnderException,isUntrackedIgnored:p=>spawnSync('git',['ls-files','--error-unmatch','--',p],{cwd:root}).status!==0&&spawnSync('git',['check-ignore','-q','--no-index','--',p],{cwd:root}).status===0});
assert.deepEqual(frozenCheck.failures,[],'No new production, public, UI, model or economic files permitted');
if(frozenCheck.amended.length)process.stderr.write(`Approved UI governance amendment applied to ${frozenCheck.amended.length} exact-hash file(s): ${frozenCheck.amended.join(', ')}\n`);
const before=JSON.parse(execFileSync('git',['show','HEAD:package.json'],{cwd:root,encoding:'utf8'}));
const after=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
assert.equal(after.scripts['political-source-closure:validate'],'node docs/political-data/source-closure/validate.mjs');
delete after.scripts['political-source-closure:validate'];delete before.scripts['political-source-closure:validate'];
assert.deepEqual(after,before,'Only the audit validation command may change package metadata');
const summary=read('source_closure_summary.json'), registry=read('candidate_production_files.json');
assert.equal(summary.platform_version,'v2.0');
assert.equal(summary.canonical_writes,0);assert.equal(summary.ui_changes,0);assert.equal(summary.deployments,0);
assert.deepEqual([...summary.scope].sort(),['austria','czechia','poland','slovakia']);
assert.equal(registry.elections.length,28);
assert.equal(new Set(registry.elections.map(f=>f.election_id_proposal)).size,28);
const years={czechia:[2002,2006,2010,2013,2017,2021,2025],slovakia:[2002,2006,2010,2012,2016,2020,2023],poland:[2001,2005,2007,2011,2015,2019,2023],austria:[2002,2006,2008,2013,2017,2019,2024]};
const licences=read('licence_evidence_registry.json').records;
const permitted=['verified_open_licence','verified_reuse_with_conditions','raw_redistribution_restricted_but_factual_extracts_allowed','written_confirmation_required','not_verified'];
const unresolved=[];
for(const country of summary.scope){
 const countryRows=registry.elections.filter(f=>f.country===country);
 assert.deepEqual(countryRows.map(f=>f.year),years[country]);
 const closure=read(`${country}_source_closure.json`);
 assert.deepEqual(closure.elections,countryRows);
 assert.equal(closure.canonical_write_authorized,false);
 const licence=licences.find(l=>l.country===country);assert.ok(licence);
 assert.ok(permitted.includes(licence.status));
 if(!licence.applicability_verified)assert.ok(['written_confirmation_required','not_verified'].includes(licence.status));
 if(licence.archived_terms){const m=licence.archived_terms;assert.equal(sha(fs.readFileSync(path.join(dir,m.archive_path))),m.sha256);}
 for(const f of countryRows){
  assert.equal(f.ingestion_ready,false,'No unsupported production promotion');
  assert.ok(['identity_ready','identity_ready_with_manual_crosswalk','contestant_only_safe','identity_evidence_incomplete','not_ready'].includes(f.identity_status));
  if(f.file_url)assert.match(f.file_url,/^https:\/\//);
  if(f.retrieval){assert.equal(f.retrieval.status,200);assert.equal(f.file_url,f.retrieval.url);assert.equal(sha(fs.readFileSync(path.join(dir,f.retrieval.archive_path))),f.retrieval.sha256);}
  if(!f.file_url||!f.retrieval||f.result_status==='not_certified_by_this_audit'||!f.valid_vote_denominator||f.identity_status==='identity_evidence_incomplete'||f.electoral_system_evidence_status!=='reviewed'||!licence.applicability_verified)unresolved.push(f.election_id_proposal);
 }
 assert.ok(!closure.recommendation.startsWith('READY'),'Blocked checkpoint cannot approve production');
 assert.deepEqual(closure.future_production_elections,[]);
}
assert.deepEqual(fs.readdirSync(path.join(root,'src/data/political')).filter(f=>fs.statSync(path.join(root,'src/data/political',f)).isDirectory()),['germany']);
for(const name of ['candidate_production_files.json','identity_feasibility_matrix.json'])assert.ok(!/"(?:atlas_.*score|polling|prediction|ideology|left_right|win_probability)"\s*:/.test(JSON.stringify(read(name))));
const existingPolitical=Object.keys(baseline.files).filter(f=>f.startsWith('src/data/political/germany/')||f.startsWith('public/research-data/political/germany/'));
assert.equal(existingPolitical.length,38,'12 German stores plus 26 public exports must remain unchanged');
assert.equal(summary.audit_complete,unresolved.length===0);

// ---- Refined gate model (Production 1B publisher clarification) ----
const release=JSON.parse(fs.readFileSync(path.join(root,'src/data/release.json'),'utf8'));
assert.ok(String(release.version).startsWith('v2.0'),'Platform version must remain v2.0');
assert.equal(after.version??before.version,'2.0.0','package.json version must remain 2.0.0');
const gateMatrix=read('gate_matrix.json'), decisions=read('publisher_response_decision_matrix.json');
let gateChecks=0;
const evidenceMeta=fs.existsSync(path.join(dir,'local-evidence'))?fs.readdirSync(path.join(dir,'local-evidence')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,'local-evidence',f),'utf8'))):[];
for(const country of summary.scope){
 const c=COUNTRY_GATES[country]; assert.ok(c,`gate model for ${country}`);
 // Rights and acquisition are independent gates with disjoint vocabularies.
 for(const g of RIGHTS_GATES){assert.ok(c.rights[g],`${country}: missing gate ${g}`);assert.ok(STATUSES.includes(c.rights[g].status),`${country}: ${g} status`);if(VALUES[g])assert.ok(VALUES[g].includes(c.rights[g].value),`${country}: ${g} value ${c.rights[g].value}`);gateChecks++;}
 for(const a of VALUES.automated_acquisition_permission)assert.ok(!VALUES.reuse_right.includes(a),'reuse and acquisition vocabularies must be disjoint');
 for(const g of PRODUCTION_GATES){assert.ok(STATUSES.includes(c.production[g].status),`${country}: ${g}`);gateChecks++;}
 // Raw redistribution is never inferred from factual reuse: closing it needs its own publisher evidence.
 const raw=c.rights.raw_redistribution_right;
 if(raw.status==='closed')assert.ok((raw.evidence??[]).some(e=>e.kind==='publisher_reply'),`${country}: raw redistribution closed without a publisher reply`);
 for(const g of RIGHTS_GATES)if(c.rights[g].status==='closed'&&['reuse_right','normalized_factual_republication_right','raw_redistribution_right'].includes(g))assert.ok((c.rights[g].evidence??[]).some(e=>e.kind==='publisher_reply')||c.rights[g].value==='supported_explicit',`${country}: ${g} closed without explicit evidence`);
 // Gate matrix and readiness are derived, never hand-set; nothing READY while a mandatory gate is open.
 const derived=countryMatrix(country), stored=gateMatrix.countries.find(x=>x.country===country);
 assert.deepEqual(stored,derived,`${country}: gate_matrix.json out of date (rebuild)`);
 assert.deepEqual(Object.keys(stored.gates).sort(),[...MATRIX_GATES].sort());
 if(stored.open_mandatory_gates.length)assert.equal(stored.overall_readiness,'NOT_READY',`${country}: READY while gates open`);
 const closure=read(`${country}_source_closure.json`);
 assert.deepEqual(closure.gate_matrix,derived,`${country}: closure gate matrix out of date`);
 assert.equal(summary.countries.find(x=>x.country===country).overall_readiness,derived.overall_readiness);
 // Every enquiry maps to precise unresolved gates; every reply-dependent open gate has a question.
 const d=decisions.countries[country]; assert.ok(d&&d.questions.length,`${country}: decision matrix`);
 const asked=new Set();
 for(const q of d.questions){assert.ok(q.gates.length,`${country} ${q.id}: no gate`);for(const g of q.gates){assert.ok(RIGHTS_GATES.includes(g),`${country} ${q.id}: unknown gate ${g}`);assert.notEqual(c.rights[g].status,'closed',`${country} ${q.id}: asks about closed gate ${g}`);asked.add(g);}}
 for(const g of RIGHTS_GATES)if(c.rights[g].status!=='closed'&&c.rights[g].closes_by==='publisher_reply'&&!(country==='austria'&&g==='automated_acquisition_permission'))assert.ok(asked.has(g),`${country}: open gate ${g} has no enquiry`);
 // Contact packet exists, is unsent and cites only archived evidence hashes.
 const packet=fs.readFileSync(path.join(dir,'contact-packets',`${country}_contact_packet.md`),'utf8');
 for(const h of ['prepared, not sent','## Institution and contact','English enquiry','## What closes which gate','Not sufficient'])assert.ok(packet.includes(h),`${country} packet: ${h}`);
 if(evidenceMeta.length)for(const h of packet.match(/`([0-9a-f]{64})`/g)??[])assert.ok(evidenceMeta.some(e=>e.sha256===h.slice(1,-1)),`${country} packet cites unknown hash ${h}`);
}
// Robots/terms prohibitions are not bypassed.
const acquire=fs.readFileSync(path.join(dir,'acquire-evidence.mjs'),'utf8');
assert.match(acquire,/statistics\\\.sk\$\/\.test\(new URL\(url\)\.hostname\)\)throw/,'acquire-evidence must refuse statistics.sk');
assert.match(acquire,/hostname==='www\.bmi\.gv\.at'\)throw/,'acquire-evidence must refuse bmi.gv.at');
assert.equal(COUNTRY_GATES.slovakia.rights.automated_acquisition_permission.status,'blocked');
assert.equal(COUNTRY_GATES.austria.rights.automated_acquisition_permission.status,'blocked');
const skStop=Date.parse('2026-10-03T10:06:07Z'), atStop=Date.parse('2026-10-03T10:57:24Z');
for(const e of evidenceMeta){
 const host=new URL(e.url).hostname;
 if(/(^|\.)statistics\.sk$/.test(host))assert.ok(Date.parse(e.retrieved_at)<skStop,`statistics.sk retrieved after prohibition: ${e.url}`);
 if(host==='www.bmi.gv.at'&&!e.url.endsWith('/robots.txt'))assert.ok(Date.parse(e.retrieved_at)<atStop,`bmi.gv.at retrieved after robots finding: ${e.url}`);
}
// No sending capability in this audit package.
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.mjs')&&f!=='validate.mjs'))assert.ok(!/smtp|sendmail|nodemailer/i.test(fs.readFileSync(path.join(dir,f),'utf8')),`${f} must not send mail`);
// Documentary review keeps missing seats distinct and records the Tier-1 2016 date.
const review=read('documentary_review.json');
assert.equal(review.slovakia.election_date_2016.status,'verified_tier1_legal_document');
for(const r of review.slovakia.elections)if(typeof r.seat_representation==='object')assert.ok('nan_marker' in r.seat_representation&&'empty_cell' in r.seat_representation&&'explicit_zero' in r.seat_representation);
for(const p of review.poland.elections)assert.equal(p.national_total_file,null,'no fabricated Polish national totals');

console.log(JSON.stringify({checkpoint_integrity:'pass',gate_checks:gateChecks,countries_ready:gateMatrix.countries.filter(c=>c.overall_readiness!=='NOT_READY').length,contact_packets:summary.scope.length,frozen_files_checked:Object.keys(baseline.files).length,germany_files_unchanged:38,elections_registered:28,elections_with_open_gates:unresolved.length,audit_complete:summary.audit_complete,production_ready:0}));
if(!process.argv.includes('--checkpoint')&&unresolved.length){console.error('CLOSURE BLOCKED: exact-file licence/acquisition, file, identity, totals and dated electoral-rule gates remain open. --checkpoint checks evidence integrity only, not closure.');process.exitCode=1;}
