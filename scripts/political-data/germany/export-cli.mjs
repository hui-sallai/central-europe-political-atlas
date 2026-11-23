import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root} from './acquire.mjs';
import {stores} from './production.mjs';
import {validateCanonicalGermany} from './validate.mjs';
import {buildCanonicalGermany} from './early-elections.mjs';
import {politicalExportFiles} from './export.mjs';

const data=buildCanonicalGermany();validateCanonicalGermany(data,data);
for(const store of stores)assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'src/data/political/germany',`${store}.json`))),data[store]);
const dir=path.join(root,'public/research-data/political/germany');
if(!process.argv.includes('--check'))fs.mkdirSync(dir,{recursive:true});
for(const [name,content] of Object.entries(politicalExportFiles(data)))if(process.argv.includes('--check'))assert.equal(fs.readFileSync(path.join(dir,name),'utf8'),content);else fs.writeFileSync(path.join(dir,name),content);
console.log(JSON.stringify({status:'pass',exported_files:Object.keys(politicalExportFiles(data)).length,elections:data.elections.length}));
