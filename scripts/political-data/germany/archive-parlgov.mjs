import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {root,sha256} from './acquire.mjs';
const dir=path.join(root,'docs/political-data/raw/germany/parlgov-2024'),file=path.join(dir,'view_election.tab'),meta=path.join(dir,'metadata.json');
const url='https://dataverse.harvard.edu/api/access/datafile/10437092?format=original';
if(!fs.existsSync(file)){
  assert.ok(process.argv.includes('--acquire'));assert.ok(!fs.existsSync(meta));
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.ok(response.ok);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(crypto.createHash('md5').update(bytes).digest('hex'),'ee737ba6b7e0afa3d16c872f4d7253db','Pinned Dataverse 2024 file checksum');
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx'});
  fs.writeFileSync(meta,JSON.stringify({source_id:'src-parlgov-2024-election',source_url:url,dataset_doi:'https://doi.org/10.7910/DVN/2VZ5ZC',file_id:10437092,raw_path:path.relative(root,file),sha256:sha256(bytes),retrieved_at:new Date().toISOString(),licence:'CC0 1.0',licence_status:'verified_open_licence',tier:'tier2_harmonized_academic',official_status:'NOT official',purpose:'Reconciliation only; never canonical official results'},null,2)+'\n',{flag:'wx'});
}
assert.equal(sha256(fs.readFileSync(file)),JSON.parse(fs.readFileSync(meta)).sha256);
console.log(JSON.stringify({status:'pass',canonical_writes:0}));
