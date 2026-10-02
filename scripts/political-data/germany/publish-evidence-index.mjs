import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,sha256} from './acquire.mjs';
const base=path.join(root,'docs/political-data/raw/germany');
const sources=[];
for(const dir of fs.readdirSync(base)){
  const meta=path.join(base,dir,'metadata.json');if(!fs.existsSync(meta))continue;
  const source=JSON.parse(fs.readFileSync(meta));if(!source.source_id||!source.raw_path)continue;
  assert.equal(sha256(fs.readFileSync(path.join(root,source.raw_path))),source.sha256);
  const entry={source_id:source.source_id,source_url:source.source_url,raw_sha256:source.sha256,raw_path:source.raw_path,retrieved_at:source.retrieved_at,raw_redistribution:/\.(csv|zip|tab)$/.test(source.raw_path)?'verified_open_licence':'not_reviewed_local_archive_only'};
  if(dir.startsWith('production_election-')){
    const text=fs.readFileSync(path.join(root,source.raw_path),'utf8'),term=text.match(/(?:zum|des)\s*(\d+)\.\s*Deutschen Bundestag/);
    assert.ok(term);entry.official_term=Number(term[1]);
    const heading=text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]*>/g,' ').replaceAll('&nbsp;',' ');
    const date=heading?.match(/am\s+(\d+)\.\s+(September|Februar)\s+(\d{4})/);assert.ok(date);
    entry.official_election_date=`${date[3]}-${date[2]==='September'?'09':'02'}-${date[1].padStart(2,'0')}`;
    entry.fact_basis='Official main heading: Wahl zum [term]. Deutschen Bundestag; factual term number only, not page text reproduction';
  }
  sources.push(entry);
}
const output={schema_version:'germany-public-evidence-index-v1',scope:'Metadata, hashes and independently reviewed factual records; non-cleared full HTML/PDF retained locally, not publicly redistributed',sources};
const file=path.join(root,'docs/political-data/germany_public_evidence_index.json');
if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(fs.readFileSync(file)),output);else fs.writeFileSync(file,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({status:'pass',sources:sources.length}));
