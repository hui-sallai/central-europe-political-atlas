import {sha256} from './acquire.mjs';
import {stores} from './production.mjs';
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
