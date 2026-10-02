import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root,sha256} from "./acquire.mjs";
// Visually transcribed table 2, PDF page 19 / printed page 18. The party-name
// cells are raster images; text extraction must not be claimed as validation.
const entries=[
 ["SPD","Sozialdemokratische Partei Deutschlands"],["CDU","Christlich Demokratische Union Deutschlands"],["CSU","Christlich-Soziale Union in Bayern e.V."],["GRÜNE","BÜNDNIS 90/DIE GRÜNEN"],["FDP","Freie Demokratische Partei"],["Die Linke.","Die Linkspartei."],["Offensive D","Partei Rechtsstaatlicher Offensive"],["REP","DIE REPUBLIKANER"],["NPD","Nationaldemokratische Partei Deutschlands"],["Die Tierschutzpartei","Mensch Umwelt Tierschutz"],["GRAUE","DIE GRAUEN – Graue Panther"],["PBC","Partei Bibeltreuer Christen"],["DIE FRAUEN","Feministische Partei DIE FRAUEN"],["FAMILIE","FAMILIEN-PARTEI DEUTSCHLANDS"],["BüSo","Bürgerrechtsbewegung Solidarität"],["BP","Bayernpartei"],["ZENTRUM","Deutsche Zentrumspartei – Älteste Partei Deutschlands gegründet 1870"],["Deutschland",'Ab jetzt ... Bündnis für Deutschland Partei für Volksabstimmung und gegen Zuwanderung ins „Soziale Netz“'],["AGFG","Allianz für Gesundheit, Frieden und soziale Gerechtigkeit"],["APPD","Anarchistische Pogo-Partei Deutschlands"],["50Plus","50Plus-Bürger- und Wählerinitiative für Brandenburg"],["MLPD","Marxistisch-Leninistische Partei Deutschlands"],["Die PARTEI","Partei für Arbeit, Rechtsstaat, Tierschutz, Elitenförderung und basisdemokratische Initiative"],["PSG","Partei für Soziale Gleichheit, Sektion der Vierten Internationale"],["Pro DM","Pro Deutsche Mitte – Initiative Pro D-Mark"],
];
const meta=JSON.parse(fs.readFileSync(path.join(root,"docs/political-data/raw/germany/identity_results-report-2005/metadata.json"),"utf8"));
assert.equal(sha256(fs.readFileSync(path.join(root,meta.raw_path))),meta.sha256);
const queue=JSON.parse(fs.readFileSync(path.join(root,"docs/political-data/germany_identity_review_queue.json"),"utf8"));
const rows=entries.map(([abbreviation,name],i)=>{
 const c=queue.rows.find(r=>r.contestant_id===`ct-de-${String(25+i).padStart(4,"0")}`);assert.equal(c.election_year,2005);assert.equal(c.source_label,abbreviation);
 return {contestant_id:c.contestant_id,election_year:2005,source_label:c.source_label,source_published_full_name:name,contestant_kind:"party",membership_basis:"official_same_election_party_landesliste_table",atlas_party_id:null,review_status:"provisional_visual_transcription_requires_independent_review",canonical_promotion:false,continuous_series_eligible:false,evidence:[{source_record_id:c.source_record_id,sha256:c.source_member_sha256,note:"Official final national second-vote column"},{source_record_id:`${meta.source_id}:pdf-page:19:table:2:row:${i+1}`,sha256:meta.sha256,note:"Visual transcription of raster party-name cell and Landesliste participation, printed page 18; not OCR/text validation"}],review_note:"Same-election own-list membership only. Printed historical name retained, including 2005 Die Linkspartei.; no PDS/2007 merger or later identity decision. The report's six following first-vote-only party rows are excluded."};
});
const output={schema_version:"germany-election-specific-membership-review-v1",state:"staging_only",election_year:2005,canonical_promotion:false,transcription_method:"visual_manual_from_archived_official_pdf",rows};
const file=path.join(root,"docs/political-data/germany_2005_membership_review.json");
if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),output);
else {assert.ok(!fs.existsSync(file),"Preserve review evidence");fs.writeFileSync(file,JSON.stringify(output,null,2)+"\n",{flag:"wx"});}
console.log(JSON.stringify({status:"pass",provisional_bindings:25,independent_visual_review_required:true,canonical_writes:0}));
