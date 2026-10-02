import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {root} from './acquire.mjs';
import {stores,buildApprovedProduction} from './production.mjs';
import {validatePolitical} from './validate.mjs';
import {politicalExportFiles} from './export.mjs';

// Explicit owner-approved additive exception, not a general src/data exemption.
export function unapprovedFrozenChanges(changed,baseline){
  const data=buildApprovedProduction();validatePolitical(data,data);
  const files=new Map(stores.map(store=>[`src/data/political/germany/${store}.json`,JSON.stringify(data[store],null,2)+'\n']));
  for(const [name,content] of Object.entries(politicalExportFiles(data)))files.set(`public/research-data/political/germany/${name}`,content);
  const unexpected=[];
  for(const file of changed.trim().split('\n').filter(Boolean)){
    if(!files.has(file)){unexpected.push(file);continue;}
    // A historical frozen file can never be silently reclassified as new politics.
    const prior=execFileSync('git',['ls-tree','--name-only',baseline,'--',file],{cwd:root,encoding:'utf8'});
    assert.equal(prior.trim(),'','Political exception must be additive');
    assert.equal(fs.readFileSync(path.join(root,file),'utf8'),files.get(file),`Approved political content: ${file}`);
  }
  return unexpected;
}
