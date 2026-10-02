import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root,sha256} from "./acquire.mjs";
// Manual visual reading of the actual 2002 report, PDF page 18 / printed page
// 18. Its OCR text has letter errors and is not the authority for these names.
const entries=[
 ["SPD","Sozialdemokratische Partei Deutschlands"],["CDU","Christlich Demokratische Union Deutschlands"],["CSU","Christlich-Soziale Union in Bayern e.V."],["GRÜNE","BÜNDNIS 90/DIE GRÜNEN"],["FDP","Freie Demokratische Partei"],["PDS","Partei des Demokratischen Sozialismus"],["REP","DIE REPUBLIKANER"],["GRAUE","DIE GRAUEN – Graue Panther"],["Tierschutz","Mensch Umwelt Tierschutz"],["NPD","Nationaldemokratische Partei Deutschlands"],["ödp","Ökologisch-Demokratische Partei"],["PBC","Partei Bibeltreuer Christen"],["DIE FRAUEN","Feministische Partei DIE FRAUEN"],["BP","Bayernpartei"],["FAMILIE","FAMILIEN-PARTEI DEUTSCHLANDS"],["CM","CHRISTLICHE MITTE – Für ein Deutschland nach GOTTES Geboten"],["BüSo","Bürgerrechtsbewegung Solidarität"],["HP","Humanistische Partei"],["Violetten","Alternative spirituelle Politik im neuen Zeitalter – Die Violetten"],["AUFBRUCH","Aufbruch für Bürgerrechte, Freiheit und Gesundheit"],["ZENTRUM","Deutsche Zentrumspartei – Älteste Partei Deutschlands gegründet 1870"],["KPD","KOMMUNISTISCHE PARTEI DEUTSCHLANDS"],["PRG","Partei für RentenGerechtigkeit und Familie"],["Schill","Partei Rechtsstaatlicher Offensive"],
];
const meta=JSON.parse(fs.readFileSync(path.join(root,"docs/political-data/raw/germany/identity_results-report-2002/metadata.json"),"utf8"));assert.equal(sha256(fs.readFileSync(path.join(root,meta.raw_path))),meta.sha256);
const queue=JSON.parse(fs.readFileSync(path.join(root,"docs/political-data/germany_identity_review_queue.json"),"utf8"));
const rows=entries.map(([abbreviation,name],i)=>{
 const c=queue.rows.find(r=>r.contestant_id===`ct-de-${String(1+i).padStart(4,"0")}`);assert.equal(c.election_year,2002);assert.equal(c.source_label,abbreviation);
 return {contestant_id:c.contestant_id,election_year:2002,source_label:c.source_label,source_published_full_name:name,contestant_kind:"party",membership_basis:"official_same_election_party_landesliste_table",atlas_party_id:null,review_status:"provisional_visual_transcription_requires_independent_review",canonical_promotion:false,continuous_series_eligible:false,evidence:[{source_record_id:c.source_record_id,sha256:c.source_member_sha256,note:"Official final national second-vote column"},{source_record_id:`${meta.source_id}:pdf-page:18:table:2:row:${i+1}`,sha256:meta.sha256,note:"Visually checked historical full name and Landesliste participation; printed page 18; OCR is not identity validation"}],review_note:"Election-specific manual membership only. PDF wraps words across lines; transcription rejoins them without changing historical wording. Result header Tierschutz corresponds to the table's Die Tierschutzpartei and Violetten to its historical full-name row; these explicit manual decisions require independent visual review. PDS is not relabelled Die Linke; no cross-year or legal continuity inference. Four following first-vote-only rows are excluded."};
});
const output={schema_version:"germany-election-specific-membership-review-v1",state:"staging_only",election_year:2002,canonical_promotion:false,transcription_method:"visual_manual_from_archived_official_pdf",rows};
const file=path.join(root,"docs/political-data/germany_2002_membership_review.json");
if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),output);
else {assert.ok(!fs.existsSync(file),"Preserve review evidence");fs.writeFileSync(file,JSON.stringify(output,null,2)+"\n",{flag:"wx"});}
console.log(JSON.stringify({status:"pass",provisional_bindings:24,independent_visual_review_required:true,canonical_writes:0}));
