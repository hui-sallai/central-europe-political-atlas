import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {root,sha256} from './acquire.mjs';
import {stores,buildApprovedProduction} from './production.mjs';
import {validatePolitical} from './validate.mjs';
function cell(value){if(value===null||value===undefined)return '';let text=typeof value==='object'?JSON.stringify(value):String(value);if(/^[\s]*[=+@\-]|^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function politicalExportFiles(data){
  const files={};
  for(const store of stores){
    files[`${store}.json`]=JSON.stringify(data[store],null,2)+'\n';
    const keys=[...new Set(data[store].flatMap(row=>Object.keys(row)))];
    files[`${store}.csv`]=[keys.map(cell).join(','),...data[store].map(row=>keys.map(key=>cell(row[key])).join(','))].join('\r\n')+'\r\n';
  }
  files['README.md']='# Germany National Election Slice 1A\n\nSeven national Bundestag elections, second votes only. Source: Die Bundeswahlleiterin, Wiesbaden. Historical CSV: dl-de/by-2-0; final result archive: publisher attribution reuse terms. Derived shares are separately labelled; missing seats remain null (empty CSV cell), not zero. 2021 is corrected after the 2024 Berlin repeat, 735 seats, not the original 736. No continuous party series, current composition, forecasts or political scores. Historical party relations remain requires_manual_review. Full source HTML/PDF are not redistributed: raw hashes, official links and reviewed factual provenance remain available. CSV nested provenance is JSON-encoded; formula-like cells are escaped for spreadsheet safety.\n\nParlGov stable 2024 (DOI 10.7910/DVN/2VZ5ZC, CC0) is academic reconciliation only, never an official source. All election result values remain official.\n';
  files['manifest.json']=JSON.stringify({schema_version:'germany-political-export-v1',country:'germany',years:[2002,2005,2009,2013,2017,2021,2025],continuous_party_series:0,files:Object.entries(files).map(([name,content])=>({name,url:`/research-data/political/germany/${name}`,sha256:sha256(Buffer.from(content))})),original_source_files_redistributed:false},null,2)+'\n';
  return files;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const data=buildApprovedProduction();validatePolitical(data,data);
  for(const store of stores)assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'src/data/political/germany',`${store}.json`))),data[store]);
  const dir=path.join(root,'public/research-data/political/germany');fs.mkdirSync(dir,{recursive:true});
  for(const [name,content] of Object.entries(politicalExportFiles(data)))if(process.argv.includes('--check'))assert.equal(fs.readFileSync(path.join(dir,name),'utf8'),content);else fs.writeFileSync(path.join(dir,name),content);
  console.log(JSON.stringify({status:'pass',exported_files:26}));
}
