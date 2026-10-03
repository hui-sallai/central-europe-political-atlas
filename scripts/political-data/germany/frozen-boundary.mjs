import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {root} from './acquire.mjs';
import {stores,buildApprovedProduction} from './production.mjs';
import {validatePolitical} from './validate.mjs';
import {politicalExportFiles} from './export.mjs';

export const DEPENDENCY_EXCEPTIONS_FILE='docs/legal-security/dependency_maintenance_exceptions.json';
// Dependency-tooling files other than package.json / pnpm-lock.yaml that no exception may touch.
const OTHER_DEPENDENCY_FILES=['pnpm-workspace.yaml','.npmrc','.pnpmfile.cjs','.nvmrc'];
const FALSE_FLAGS=['research_data_change_allowed','model_output_change_allowed','political_data_change_allowed','release_version_change_allowed'];

// Pure check: does an owner-approved dependency-maintenance exception cover exactly this lockfile and package.json?
// It never covers a different lockfile hash, a different package/version pair, a version bump or any other file.
export function matchDependencyException({exceptions,lockHash,pkgBefore,pkgAfter,otherChangedFiles=[]}){
  if(otherChangedFiles.length)return {ok:false,reason:`dependency files outside any exception changed: ${otherChangedFiles.join(', ')}`};
  const exception=(exceptions??[]).find(e=>e.status==='approved_local_maintenance'&&e.new_lockfile_sha256===lockHash);
  if(!exception)return {ok:false,reason:`no approved exception for pnpm-lock.yaml sha256 ${lockHash}`};
  if(!/^[0-9a-f]{64}$/.test(exception.new_lockfile_sha256))return {ok:false,reason:`${exception.exception_id}: lockfile hash must be an exact sha256`};
  for(const flag of FALSE_FLAGS)if(exception[flag]!==false)return {ok:false,reason:`${exception.exception_id}: ${flag} must be false`};
  const allowed=exception.approved_scope?.allowed_files??[];
  if(allowed.some(f=>!['package.json','pnpm-lock.yaml'].includes(f)))return {ok:false,reason:`${exception.exception_id}: allowed_files may only list package.json and pnpm-lock.yaml`};
  if(pkgAfter.version!==pkgBefore.version)return {ok:false,reason:'package.json version changed'};
  const changes=new Map((exception.approved_scope?.package_changes??[]).map(c=>[c.package,c]));
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
  const result=matchDependencyException({exceptions,lockHash,pkgBefore,pkgAfter,otherChangedFiles});
  if(result.ok)process.stderr.write(`Approved dependency-maintenance exception applied: ${result.exception_id} (pnpm-lock.yaml ${lockHash})\n`);
  return result.ok;
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
    if(!files.has(file)){unexpected.push(file);continue;}
    // A historical frozen file can never be silently reclassified as new politics.
    const prior=execFileSync('git',['ls-tree','--name-only',baseline,'--',file],{cwd:root,encoding:'utf8'});
    assert.equal(prior.trim(),'','Political exception must be additive');
    assert.equal(fs.readFileSync(path.join(root,file),'utf8'),files.get(file),`Approved political content: ${file}`);
  }
  return unexpected;
}
