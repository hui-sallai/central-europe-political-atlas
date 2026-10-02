import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root, sha256 } from './acquire.mjs';

export const productionDocuments = [
  ...[2002,2005,2009,2013,2017,2021,2025].map(year => ({id:`election-${year}`,url:`https://www.bundeswahlleiterin.de/bundestagswahlen/${year}.html`})),
  ...[2017,2021,2025].map(year => ({id:`system-${year}`,url:`https://www.bundeswahlleiterin.de/bundestagswahlen/${year}/informationen-waehler/wahlsystem.html`})),
  {id:'hare-niemeyer',url:'https://www.bundeswahlleiterin.de/service/glossar/h/hare-niemeyer.html'},
  {id:'sainte-lague',url:'https://www.bundeswahlleiterin.de/service/glossar/s/sainte-lague-schepers.html'},
  {id:'system-size',url:'https://www.bundeswahlleiterin.de/service/glossar/w/wahlsysteme.html'},
  {id:'overhang',url:'https://www.bundeswahlleiterin.de/service/glossar/u/ueberhangmandate.html'},
  {id:'late-poll',url:'https://www.bundeswahlleiterin.de/service/glossar/n/nachwahl.html'},
  {id:'threshold',url:'https://www.bundeswahlleiterin.de/service/glossar/s/sperrklausel.html'},
];
for (const doc of productionDocuments) {
  const dir=path.join(root,'docs/political-data/raw/germany',`production_${doc.id}`),file=path.join(dir,'source.html'),meta=path.join(dir,'metadata.json');
  if (fs.existsSync(file)) { assert.equal(sha256(fs.readFileSync(file)),JSON.parse(fs.readFileSync(meta)).sha256);continue; }
  assert.ok(process.argv.includes('--acquire'),`Missing ${doc.id}`);
  assert.ok(!fs.existsSync(meta),'Never overwrite a partial snapshot');
  const response=await fetch(doc.url,{signal:AbortSignal.timeout(30000)});
  assert.ok(response.ok,`${doc.id}: ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());assert.ok(bytes.toString().includes('Bundestag'));
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx'});
  fs.writeFileSync(meta,JSON.stringify({source_id:`src-de-bwl-${doc.id}`,source_url:doc.url,retrieved_at:new Date().toISOString(),sha256:sha256(bytes),raw_path:path.relative(root,file),format:'html'},null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({status:'pass',documents:productionDocuments.length,canonical_writes:0}));
