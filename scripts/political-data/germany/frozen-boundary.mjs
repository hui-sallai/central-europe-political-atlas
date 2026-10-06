import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {root} from './acquire.mjs';
import {stores,buildApprovedProduction} from './production.mjs';
import {validatePolitical} from './validate.mjs';
import {politicalExportFiles} from './export.mjs';
import {approvedMirrorFiles,mirrorSyncPath,MIRROR_SYNC_FILE} from '../../../docs/political-data/source-closure/ui-amendments.mjs';

export const DEPENDENCY_EXCEPTIONS_FILE='docs/legal-security/dependency_maintenance_exceptions.json';
// Dependency-tooling files other than package.json / pnpm-lock.yaml that no exception may touch.
const OTHER_DEPENDENCY_FILES=['pnpm-workspace.yaml','.npmrc','.pnpmfile.cjs','.nvmrc'];
const FALSE_FLAGS=['research_data_change_allowed','model_output_change_allowed','political_data_change_allowed','release_version_change_allowed'];

// Pure check: does an owner-approved dependency-maintenance exception cover exactly this lockfile and package.json?
// It never covers a different lockfile hash, a different package/version pair, a version bump or any other file.
const sha256=t=>crypto.createHash('sha256').update(t).digest('hex');
const escapeRe=t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// Lockfile text with the listed transitive packages' versions replaced by a placeholder and their integrity lines removed;
// two lockfiles that differ only by the approved transitive bumps normalise to the same text.
export function normaliseTransitive(text,changes,side){
  let out=text;
  for(const c of changes){
    const v=side==='from'?c.from:c.to,name=escapeRe(c.package),ver=escapeRe(v);
    out=out.replace(new RegExp(`(^\\s+'?${name}@)${ver}('?:\\s*\\n)\\s+resolution: \\{integrity: [^}]+\\}\\n`,'gm'),'$1<V>$2');
    out=out.replace(new RegExp(`${name}@${ver}(?=[':\\s(])`,'g'),`${c.package}@<V>`);
    out=out.replace(new RegExp(`(^\\s+'?${name}'?: )${ver}$`,'gm'),'$1<V>');
  }
  return out;
}
// Resolve the direct package/version pairs an exception carries, following builds_on to the exception it extends.
function directChanges(exception,all,seen=new Set()){
  if(seen.has(exception.exception_id))return null;seen.add(exception.exception_id);
  const own=exception.approved_scope?.package_changes??[];
  if(!exception.builds_on)return own;
  const parent=all.find(e=>e.exception_id===exception.builds_on&&e.status==='approved_local_maintenance');
  if(!parent)return null;
  const inherited=directChanges(parent,all,seen);
  return inherited&&[...inherited,...own];
}
export function matchDependencyException({exceptions,lockHash,pkgBefore,pkgAfter,otherChangedFiles=[],lockText=null,readLockAt=null}){
  if(otherChangedFiles.length)return {ok:false,reason:`dependency files outside any exception changed: ${otherChangedFiles.join(', ')}`};
  const exception=(exceptions??[]).find(e=>e.status==='approved_local_maintenance'&&e.new_lockfile_sha256===lockHash);
  if(!exception)return {ok:false,reason:`no approved exception for pnpm-lock.yaml sha256 ${lockHash}`};
  if(!/^[0-9a-f]{64}$/.test(exception.new_lockfile_sha256))return {ok:false,reason:`${exception.exception_id}: lockfile hash must be an exact sha256`};
  for(const flag of FALSE_FLAGS)if(exception[flag]!==false)return {ok:false,reason:`${exception.exception_id}: ${flag} must be false`};
  const allowed=exception.approved_scope?.allowed_files??[];
  if(allowed.some(f=>!['package.json','pnpm-lock.yaml'].includes(f)))return {ok:false,reason:`${exception.exception_id}: allowed_files may only list package.json and pnpm-lock.yaml`};
  if(pkgAfter.version!==pkgBefore.version)return {ok:false,reason:'package.json version changed'};
  if(exception.kind==='transitive_lockfile'){
    // Transitive-only security maintenance: no direct package.json change of its own, exact previous lockfile anchored in git,
    // and the new lockfile must equal the previous one except for the listed transitive version bumps.
    const t=exception.approved_scope?.transitive_changes??[];
    if(!t.length||t.some(c=>!c.package||!c.from||!c.to||c.from===c.to))return {ok:false,reason:`${exception.exception_id}: transitive_changes must list exact from/to versions`};
    if((exception.approved_scope?.package_changes??[]).length)return {ok:false,reason:`${exception.exception_id}: transitive exception may not add direct package changes`};
    if(allowed.some(f=>f!=='pnpm-lock.yaml'))return {ok:false,reason:`${exception.exception_id}: transitive exception may only change pnpm-lock.yaml`};
    const parent=(exceptions??[]).find(e=>e.exception_id===exception.builds_on&&e.status==='approved_local_maintenance');
    if(!parent)return {ok:false,reason:`${exception.exception_id}: builds_on must name an approved exception`};
    if(exception.previous_lockfile_sha256!==parent.new_lockfile_sha256)return {ok:false,reason:`${exception.exception_id}: previous lockfile must be the lockfile of ${parent.exception_id}`};
    if(typeof lockText!=='string'||typeof readLockAt!=='function')return {ok:false,reason:`${exception.exception_id}: lockfile contents unavailable — fail closed`};
    if(sha256(lockText)!==lockHash)return {ok:false,reason:`${exception.exception_id}: lockfile text does not match its hash`};
    let previous;try{previous=readLockAt(exception.previous_lockfile_commit);}catch{return {ok:false,reason:`${exception.exception_id}: previous lockfile commit not readable`};}
    if(typeof previous!=='string'||sha256(previous)!==exception.previous_lockfile_sha256)return {ok:false,reason:`${exception.exception_id}: previous lockfile at ${exception.previous_lockfile_commit} does not match previous_lockfile_sha256`};
    for(const c of t){
      if(!new RegExp(`${escapeRe(c.package)}@${escapeRe(c.from)}(?=[':\\s(])`).test(previous))return {ok:false,reason:`${c.package}@${c.from} not present in the previous lockfile`};
      if(new RegExp(`${escapeRe(c.package)}@(?!${escapeRe(c.to)}(?=[':\\s(]))[0-9]`).test(lockText))return {ok:false,reason:`${c.package}: a version other than ${c.to} is resolved`};
    }
    if(normaliseTransitive(previous,t,'from')!==normaliseTransitive(lockText,t,'to'))return {ok:false,reason:`${exception.exception_id}: lockfile differs from the previous lockfile beyond the approved transitive changes`};
  }
  const chain=directChanges(exception,exceptions??[]);
  if(!chain)return {ok:false,reason:`${exception.exception_id}: builds_on chain invalid`};
  const changes=new Map(chain.map(c=>[c.package,c]));
  if(!changes.size)return {ok:false,reason:`${exception.exception_id}: no package_changes`};
  for(const field of ['dependencies','devDependencies','optionalDependencies','peerDependencies']){
    const before=pkgBefore[field]??{},after=pkgAfter[field]??{};
    for(const name of new Set([...Object.keys(before),...Object.keys(after)])){
      const change=changes.get(name);
      if(change){
        if(name in before||name in after){
          if(before[name]!==change.from||after[name]!==change.to)return {ok:false,reason:`${name}: expected ${change.from} -> ${change.to}, found ${before[name]} -> ${after[name]}`};
          changes.delete(name);
        }
      }else if(before[name]!==after[name])return {ok:false,reason:`${field}.${name} changed outside the exception (${before[name]} -> ${after[name]})`};
    }
  }
  if(changes.size)return {ok:false,reason:`approved change not present: ${[...changes.keys()].join(', ')}`};
  for(const key of ['packageManager','pnpm','overrides','resolutions'])if(JSON.stringify(pkgBefore[key])!==JSON.stringify(pkgAfter[key]))return {ok:false,reason:`package.json ${key} changed outside the exception`};
  return {ok:true,exception_id:exception.exception_id};
}

function dependencyExceptionApplies(baseline){
  const exceptionsPath=path.join(root,DEPENDENCY_EXCEPTIONS_FILE);
  const exceptions=fs.existsSync(exceptionsPath)?JSON.parse(fs.readFileSync(exceptionsPath,'utf8')).exceptions:[];
  const lockHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'pnpm-lock.yaml'))).digest('hex');
  const pkgBefore=JSON.parse(execFileSync('git',['show',`${baseline}:package.json`],{cwd:root,encoding:'utf8'}));
  const pkgAfter=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  const otherChangedFiles=execFileSync('git',['diff','--name-only',baseline,'--',...OTHER_DEPENDENCY_FILES],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
  const lockText=fs.readFileSync(path.join(root,'pnpm-lock.yaml'),'utf8');
  const readLockAt=commit=>execFileSync('git',['show',`${commit}:pnpm-lock.yaml`],{cwd:root,encoding:'utf8',maxBuffer:1e9});
  const result=matchDependencyException({exceptions,lockHash,pkgBefore,pkgAfter,otherChangedFiles,lockText,readLockAt});
  if(result.ok)process.stderr.write(`Approved dependency-maintenance exception applied: ${result.exception_id} (pnpm-lock.yaml ${lockHash})\n`);
  return result.ok;
}

function mirrorSyncApplies(file){
  if(!mirrorSyncPath(file))return false;
  const recordPath=path.join(root,MIRROR_SYNC_FILE);
  if(!fs.existsSync(recordPath)||!fs.existsSync(path.join(root,file)))return false;
  const {approved,problems}=approvedMirrorFiles(JSON.parse(fs.readFileSync(recordPath,'utf8')).syncs);
  if(problems.length||!approved.has(file))return false;
  return approved.get(file)===crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
}

// Explicit owner-approved additive exception, not a general src/data exemption.
export function unapprovedFrozenChanges(changed,baseline){
  const data=buildApprovedProduction();validatePolitical(data,data);
  const files=new Map(stores.map(store=>[`src/data/political/germany/${store}.json`,JSON.stringify(data[store],null,2)+'\n']));
  for(const [name,content] of Object.entries(politicalExportFiles(data)))files.set(`public/research-data/political/germany/${name}`,content);
  const unexpected=[];
  for(const file of changed.trim().split('\n').filter(Boolean)){
    // The lockfile may differ from the research baseline only under an exact owner-approved dependency exception;
    // research data, engines and political stores keep the original rules below.
    if(file==='pnpm-lock.yaml'){if(!dependencyExceptionApplies(baseline))unexpected.push(file);continue;}
    // Owner-approved export mirror sync: a public mirror may differ only at its exact recorded sha256
    // (docs/legal-security/export_mirror_sync_records.json, reproduced by research-export:check); src/data never.
    if(mirrorSyncApplies(file))continue;
    if(!files.has(file)){unexpected.push(file);continue;}
    // A historical frozen file can never be silently reclassified as new politics.
    const prior=execFileSync('git',['ls-tree','--name-only',baseline,'--',file],{cwd:root,encoding:'utf8'});
    assert.equal(prior.trim(),'','Political exception must be additive');
    assert.equal(fs.readFileSync(path.join(root,file),'utf8'),files.get(file),`Approved political content: ${file}`);
  }
  return unexpected;
}
