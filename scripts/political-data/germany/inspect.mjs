import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import assert from "node:assert/strict";
import {root, archiveRoot, sha256} from "./acquire.mjs";
import {parseCsv, officialNumber} from "./csv.mjs";

const years=[2002,2005,2009,2013,2017,2021,2025];
const archives=fs.readdirSync(path.join(root,archiveRoot)).filter(name=>/^\d{4}-/.test(name)).sort().map(name=>JSON.parse(fs.readFileSync(path.join(root,archiveRoot,name,"metadata.json"),"utf8")));
for(const a of archives)assert.equal(sha256(fs.readFileSync(path.join(root,a.raw_path))),a.sha256,"Raw archive checksum mismatch");
assert.equal(archives.filter(a=>a.source_id==="src-de-bwl-historical-results").length,1,"Select an explicit historical snapshot when revisions are present");
assert.equal(archives.filter(a=>a.source_id==="src-de-bwl-final-archive").length,1,"Select an explicit final ZIP snapshot when revisions are present");
const historical=archives.find(a=>a.source_id==="src-de-bwl-historical-results");
const zip=archives.find(a=>a.source_id==="src-de-bwl-final-archive");
// Read ZIP members in memory. No path extraction and no silently overwritten evidence files.
const members=JSON.parse(execFileSync("python3",["-c","import zipfile,json,sys,hashlib;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;out={};\nfor n in z.namelist():\n b=z.read(n);enc='utf-8-sig'\n try:t=b.decode(enc)\n except UnicodeDecodeError:enc='cp1252';t=b.decode(enc)\n out[n]={'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'encoding':enc,'text':t}\nprint(json.dumps(out,ensure_ascii=False))",path.join(root,zip.raw_path)],{maxBuffer:30000000}).toString());
const rows=parseCsv(fs.readFileSync(path.join(root,historical.raw_path),"utf8"));
const header=rows.findIndex(r=>r[0]==="Merkmal/Partei");
assert.equal(rows[header][4],"Deutschland");assert.equal(rows[header+1][4],"Zweitstimmen");assert.equal(rows[header+2][4],"Anzahl");
assert.equal(rows[header+1][79],"Sitze einschl. Abgeordnete BE");assert.equal(rows[header+2][79],"Gesamt");
const excluded=new Set(["Wahlberechtigte","Wählende","ungültige Stimmen","gültige Stimmen/Sitze insgesamt"]);
const report={schema_version:"germany-source-inspection-v1",state:"staging_only_identity_review_pending",country:"germany",years,archives:archives.map(a=>({raw_path:a.raw_path,sha256:a.sha256,bytes:a.bytes})),zip_members:Object.entries(members).map(([name,m])=>({name,sha256:m.sha256,bytes:m.bytes,encoding:m.encoding})),elections:[]};
for(const year of years){
  const selected=rows.map((row,index)=>({row,index})).filter(({row})=>row[1]===String(year));
  const get=label=>{const item=selected.find(({row})=>row[0]===label);assert.ok(item,`${year} ${label}`);return item;};
  const electorate=officialNumber(get("Wahlberechtigte").row[4]),voters=officialNumber(get("Wählende").row[4]),valid=officialNumber(get("gültige Stimmen/Sitze insgesamt").row[4]),invalid=officialNumber(get("ungültige Stimmen").row[4]);
  assert.equal(valid+invalid,voters);
  const candidates=selected.filter(({row})=>!excluded.has(row[0])&&officialNumber(row[4])!==null).map(({row,index})=>({source_record_id:`csv-record-${index+1}`,compilation_label:row[0],source_note:row[2],votes:officialNumber(row[4]),published_vote_share:officialNumber(row[6]),seats:officialNumber(row[79]),identity_status:"requires_manual_review"}));
  assert.equal(candidates.reduce((n,r)=>n+r.votes,0),valid,`${year} second-vote sum`);
  const name=`btw${year}_kerg.csv`;assert.ok(members[name]);
  const officialRows=parseCsv(members[name].text);
  const nativeHeader=officialRows.find(r=>/^(Nr|Wahlkreis)/.test(r[0])&&r.some(v=>/SPD|Sozialdemokratische/.test(v)));
  assert.ok(nativeHeader,`Historical ballot labels ${year}`);
  report.elections.push({year,electorate,voters,valid_second_votes:valid,invalid_second_votes:invalid,published_turnout:officialNumber(get("Wählende").row[6]),total_seats:officialNumber(get("gültige Stimmen/Sitze insgesamt").row[79]),second_vote_contestants:candidates.length,rows:candidates,official_historical_header:nativeHeader,notes:year===2021?["Historical compilation uses corrected results after the partial Berlin repeat election of 11 February 2024. Both original and corrected official CSVs are preserved in the ZIP. Never label the corrected 735-seat result as the original 736-seat result."]:[]});
}
const output=path.join(root,"docs/political-data/germany_source_inspection.json");
if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(output,"utf8")),report,"Inspection not reproducible from archived inputs");
else fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({status:"pass",scope:"staging only; no canonical writes",elections:report.elections.map(e=>({year:e.year,contestants:e.second_vote_contestants,seats:e.total_seats})),raw_checksum_checks:archives.length}));
