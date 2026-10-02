import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {root} from "./acquire.mjs";
const read=f=>JSON.parse(fs.readFileSync(path.join(root,"docs/political-data",f),"utf8"));
// Manual transcription of table 3's first 27 rows, visually checked on PDF page
// 18 (printed page 17). The final Freie Union row has no Landesliste and is excluded.
const names=["Sozialdemokratische Partei Deutschlands","Christlich Demokratische Union Deutschlands","Freie Demokratische Partei","DIE LINKE","BÜNDNIS 90/DIE GRÜNEN","Christlich-Soziale Union in Bayern e.V.","Nationaldemokratische Partei Deutschlands","DIE REPUBLIKANER","Familien-Partei Deutschlands","Mensch Umwelt Tierschutz","Partei Bibeltreuer Christen","Marxistisch-Leninistische Partei Deutschlands","Bürgerrechtsbewegung Solidarität","Bayernpartei","Partei für Soziale Gleichheit, Sektion der Vierten Internationale","Ab jetzt…Bündnis für Deutschland, für Demokratie durch Volksabstimmung","Deutsche Zentrumspartei – Älteste Partei Deutschlands gegründet 1870","Allianz der Mitte","CHRISTLICHE MITTE – Für ein Deutschland nach GOTTES Geboten","Deutsche Kommunistische Partei","DEUTSCHE VOLKSUNION","Die Violetten; für spirituelle Politik","Freie Wähler Deutschland","Ökologisch-Demokratische Partei","Piratenpartei Deutschland","Rentnerinnen und Rentner Partei","Rentner-Partei-Deutschland"];
const queue=read("germany_identity_review_queue.json"),pdf=read("germany_pdf_identity_evidence.json").records.find(r=>r.source.source_id==="src-de-bwl-results-report-2009"),page=pdf.pages.find(p=>p.pdf_page===18);
const text=page.text.replace(/\s+/g," ");assert.ok(text.includes("3 An der Bundestagswahl am 27. September 2009 beteiligte Parteien"));
const rows=names.map((name,i)=>{
  const c=queue.rows.find(r=>r.contestant_id===`ct-de-${String(50+i).padStart(4,"0")}`);assert.ok(c);assert.equal(c.election_year,2009);
  assert.ok(text.includes(`${name} (${c.source_label})`),`Official table name/abbreviation not found: ${name}`);
  return {contestant_id:c.contestant_id,election_year:2009,source_label:c.source_label,source_published_full_name:name,contestant_kind:"party",membership_basis:"official_table_of_parties_with_own_landeslisten",atlas_party_id:null,match_basis:"manual_review",review_status:"provisional_requires_independent_review_and_entity_resolution",canonical_promotion:false,continuous_series_eligible:false,evidence:[{source_record_id:c.source_record_id,sha256:c.source_member_sha256,note:"Official national second-vote result column"},{source_record_id:`${pdf.source.source_id}:pdf-page:18:table:3:row:${i+1}`,sha256:pdf.source.sha256,note:"Same-election participating-party table, printed page 17; full name, abbreviation and Landesliste column visually verified"}],review_note:"Same-election party/own-list membership only. Historical full names retained; no current-name replacement, merger or legal continuity inferred. Freie Union is absent from national second-vote bindings because its table row states no Landesliste."};
});
assert.equal(rows.length,27);
const output={schema_version:"germany-election-specific-membership-review-v1",state:"staging_only",election_year:2009,canonical_promotion:false,rows};
const file=path.join(root,"docs/political-data/germany_2009_membership_review.json");
if(process.argv.includes("--check"))assert.deepEqual(JSON.parse(fs.readFileSync(file,"utf8")),output);
else {assert.ok(!fs.existsSync(file),"Preserve review evidence");fs.writeFileSync(file,JSON.stringify(output,null,2)+"\n",{flag:"wx"});}
console.log(JSON.stringify({status:"pass",provisional_bindings:27,legal_entity_ids_assigned:0,canonical_writes:0}));
