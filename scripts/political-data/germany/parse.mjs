import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {root,sha256} from "./acquire.mjs";
import {loadArchives} from "./archive.mjs";
import {parseCsv,officialNumber} from "./csv.mjs";

export const years=[2002,2005,2009,2013,2017,2021,2025];
export function normalizeFinalMember(member,year) {
  const rows=parseCsv(member.text), h=rows.findIndex(r=>/^(Nr|Wahlkreis)/.test(r[0])&&r.some(v=>/SPD|Sozialdemokratische/.test(v)));
  assert.ok(h>=0,`Missing result header ${year}`);
  const dataIndex=rows.findIndex((r,i)=>i>h&&/^\d+$/.test(r[0]));
  assert.ok(dataIndex>h);
  const headers=rows.slice(h,dataIndex).filter(r=>r.some(Boolean));
  const national=rows.map((r,i)=>({r,i})).filter(({r})=>r[1]==="Bundesgebiet");
  assert.equal(national.length,1,`Unique national result ${year}`);
  const {r,i}=national[0], columns=[];
  let label="";
  for(let c=0;c<headers[0].length;c++){
    if(headers[0][c])label=headers[0][c];
    let tier="";for(let k=c;k>=0;k--){if(headers[1]?.[k]){tier=headers[1][k];break;}}
    const vintage=headers[2]?.[c]??"";
    if(tier!=="Zweitstimmen" || /Vorperiode/.test(vintage))continue;
    if(headers.length>2 && vintage && !/Endgültig|Vorläufig|Aktuell/.test(vintage))throw Error(`Unreviewed value vintage ${year}: ${vintage}`);
    const raw=r[c]??"", value=raw.trim()===""?null:Number(raw.trim());
    assert.ok(value===null || Number.isSafeInteger(value)&&value>=0,`Integer official votes ${year} column ${c}`);
    columns.push({label,column:c,raw,value});
  }
  const systemLabel=/^(Wahlberechtigte|Wähler|Wählende|Ungültige|Gültige)/;
  const contestants=columns.filter(c=>!systemLabel.test(c.label)&&c.value!==null);
  const valid=columns.find(c=>/^Gültige/.test(c.label));
  assert.ok(valid&&valid.value!==null);
  assert.equal(contestants.reduce((n,c)=>n+c.value,0),valid.value,`National second-vote total ${year}`);
  return {year,national_record_ordinal:i+1,valid_second_votes:valid.value,columns,contestants};
}
export function buildStaging() {
  const {historical,zip,members}=loadArchives();
  const historicalRows=parseCsv(fs.readFileSync(path.join(root,historical.raw_path),"utf8"));
  const elections=years.map(year=>{
    const filename=`btw${year===2021?"2021-w":year}_kerg.csv`, member=members[filename];assert.ok(member);
    const election=normalizeFinalMember(member,year);
    const totals=historicalRows.filter(r=>r[1]===String(year));
    assert.equal(election.valid_second_votes,officialNumber(totals.find(r=>r[0]==="gültige Stimmen/Sitze insgesamt")[4]));
    return {...election,member:filename,encoding:member.encoding,member_sha256:member.sha256,source_id:zip.source_id,raw_snapshot:{path:zip.raw_path,sha256:zip.sha256},retrieved_at:zip.retrieved_at,
      historical_snapshot:{path:historical.raw_path,sha256:historical.sha256},
      result_vintage:year===2021?"corrected_final_after_2024_02_11_repeat":"final",
      party_identity_status:"requires_manual_review",canonical_promotion:false};
  });
  // Preserve the original 2021 snapshot independently; do not mutate it into the corrected result.
  const original=normalizeFinalMember(members["btw2021_kerg.csv"],2021);
  assert.notEqual(original.valid_second_votes,elections.find(e=>e.year===2021).valid_second_votes);
  return {schema_version:"germany-national-election-staging-v1",country:"germany",scope:"national Bundestag second votes only",state:"staging_requires_crosswalk_and_licence_review",parser_version:"germany-kerg-v1",parser_sha256:sha256(fs.readFileSync(fileURLToPath(import.meta.url))),elections,original_2021_revision:{...original,member:"btw2021_kerg.csv",member_sha256:members["btw2021_kerg.csv"].sha256,status:"archived_superseded_final_not_active"}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=buildStaging(),file=path.join(root,"docs/political-data/germany_normalized_staging.json");
  if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),result);
  else fs.writeFileSync(file,JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify({status:"pass",canonical_writes:0,elections:result.elections.map(e=>({year:e.year,contestants:e.contestants.length,valid_second_votes:e.valid_second_votes,result_vintage:e.result_vintage}))}));
}
