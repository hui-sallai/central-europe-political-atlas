import {sha256} from './acquire.mjs';
import {stores} from './production.mjs';
const isEarlyRow=row=>/^el-de-bt-19\d\d-/.test(row.election_id??'')||/^ct-de-19\d\d-/.test(row.target_id??'')||/^src-de-(bwl-(election-19\d\d|basic-mandate|constituencies)|bundestag-dhb-1-1)$/.test(row.source_id??'');
function cell(value){if(value===null||value===undefined)return '';let text=typeof value==='object'?JSON.stringify(value):String(value);if(/^[\s]*[=+@\-]|^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function politicalExportFiles(data){
  const files={};
  for(const store of stores){
    files[`${store}.json`]=JSON.stringify(data[store],null,2)+'\n';
    // Columns of the 2002–2025 rows keep their order; columns used only by earlier-election rows (1990–1998 extension, listed
    // first in the stores) are appended, so an approved slice's CSV columns never move.
    const later=data[store].filter(row=>!isEarlyRow(row)),keys=[...new Set([...later,...data[store]].flatMap(row=>Object.keys(row)))];
    files[`${store}.csv`]=[keys.map(cell).join(','),...data[store].map(row=>keys.map(key=>cell(row[key])).join(','))].join('\r\n')+'\r\n';
  }
  const years=data.elections.map(e=>e.year),early=years.some(y=>y<2002);
  files['README.md']=(early?'# Germany National Elections 1990–2025\n\nTen national Bundestag elections. 2002–2025 (Slice 1A): second votes only. 1990, 1994 and 1998 (owner-approved additive extension, 2026-11-23): first and second votes as separate ballots (vote_type first_vote / second_vote, never added together), final seats split into constituency and Land-list seats, overhang seats, the 656 statutory seats, Hare/Niemeyer seat reproduction and the legal basis of each election (law titles, adoption and promulgation dates, Federal Law Gazette references; entry-into-force dates are not asserted). 1990: the 5% threshold applied separately to the two electoral areas (former Federal territory with West Berlin; new Länder with East Berlin); the two areas\' second votes are included. Publisher aggregates ("Sonstige") are not contestants; the first-vote aggregate of voter groups and individual candidates is one aggregate row. CDU and CSU, and in 1990 GRÜNE and B90/Gr., are separate election-specific contestants; no party continuity is asserted.\n\n':'')+'# Germany National Election Slice 1A\n\nSeven national Bundestag elections, second votes only. Source: Die Bundeswahlleiterin, Wiesbaden. Historical CSV: dl-de/by-2-0; final result archive: publisher attribution reuse terms. Derived shares are separately labelled; missing seats remain null (empty CSV cell), not zero. 2021 is corrected after the 2024 Berlin repeat, 735 seats, not the original 736. No continuous party series, current composition, forecasts or political scores. Historical party relations remain requires_manual_review. Full source HTML/PDF are not redistributed: raw hashes, official links and reviewed factual provenance remain available. CSV nested provenance is JSON-encoded; formula-like cells are escaped for spreadsheet safety.\n\nParlGov stable 2024 (DOI 10.7910/DVN/2VZ5ZC, CC0) is academic reconciliation only, never an official source. All election result values remain official.\n';
  files['manifest.json']=JSON.stringify({schema_version:'germany-political-export-v1',country:'germany',years,continuous_party_series:0,files:Object.entries(files).map(([name,content])=>({name,url:`/research-data/political/germany/${name}`,sha256:sha256(Buffer.from(content))})),original_source_files_redistributed:false},null,2)+'\n';
  return files;
}
