import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module, {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request,...args) {
  return resolve.call(this,request.startsWith("@/")?path.join(root,"src",request.slice(2)):request,...args);
};
require.extensions[".ts"] = (m,f) => m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},
}).outputText,f);

const {GET} = require("../../src/app/politics-comparison.json/route.ts");
const {historyRows,readHistorySelection,writeHistorySelection,historyObservation,electionHistoryHref} = require("../../src/lib/electionHistoryComparison.ts");
const {historyCsv,historyEvidence} = require("../../src/lib/electionHistoryEvidence.ts");
const {emptyNotebook,addNotebookEvidence,serializeNotebook,parseNotebook} = require("../../src/lib/researchNotebook.ts");
const index = await GET().json(), countries = Object.keys(index);
const parse = raw => readHistorySelection(new URLSearchParams(raw),countries,index);

test("historical state round trips selected countries, chambers, ballots, period and unrelated query parameters",()=>{
  const raw="history_countries=hungary,romania&history_events=el-hu-ogy-2018-04-08,el-ro-s-2024-12-01&history_ballots=el-hu-ogy-2018-04-08:hu_nationality_list_vote&history_from=2014-01-01&history_to=2024-12-31&history_measure=distribution";
  const {selection,errors} = parse(raw);
  assert.deepEqual(errors,[]);
  const dest = new URLSearchParams("example=keep");
  writeHistorySelection(dest,selection);
  assert.equal(dest.get("example"),"keep");
  assert.deepEqual(parse(dest.toString()).selection,selection);
  const [hu,ro] = historyRows(selection,index);
  assert.equal(hu.ballot.rows.length,13);
  assert.equal(hu.ballot.seatScope,199);
  assert.match(hu.ballot.turnoutScope.en,/Election-wide/);
  assert.equal(hu.election.history.turnout.count,5796268);
  assert.deepEqual([ro.election.seats,ro.election.slots],[134,136]);
  assert.equal(ro.election.history.chamberId,"ro-senat");
  assert.equal(parse("history_countries=slovakia&history_events=el-hu-ogy-2014-04-06").errors[0],"events");
  assert.equal(parse("history_countries=hungary&history_ballots=el-hu-ogy-2018-04-08:invented").errors[0],"ballots");
  assert.ok(parse("history_countries=__proto__,hungary").errors.includes("countries"));
  assert.ok(parse("history_from=2024-02-30").errors.includes("period"));
  assert.ok(parse("history_from=2024-01-02&history_to=2024-01-01").errors.includes("period"));
  assert.ok(parse("history_measure=ranking").errors.includes("measure"));
});
test("chamber dates preserve independent elections, incomplete history, and actual turnout populations",()=>{
  const sel=parse("history_countries=romania,croatia,slovakia&history_from=2024-01-01&history_to=2024-12-31").selection;
  const rows=historyRows(sel,index);
  assert.equal(rows.filter(r=>r.country==="romania").length,2);
  assert.equal(new Set(rows.filter(r=>r.country==="romania").map(r=>r.election.date)).size,1);
  assert.ok(!rows.some(r=>r.country==="slovakia"));
  const hr=rows.find(r=>r.country==="croatia");
  assert.equal(hr.ballot,undefined);
  const t=hr.election.history.turnout;
  assert.equal(t.scope.en,"Territorial constituencies I–X");
  assert.equal(t.value,61.48);
  assert.ok(t.count>0 && t.electorate>=t.count && t.definition);
  assert.equal(historyObservation(hr,"contestants","en").value,null);
  const unavailable=index.romania.find(r=>r.id==="el-ro-s-2016-12-11");
  assert.equal(unavailable.history.turnout.value,null);
  const seen=new Set(hr.election.history.sources.map(s=>s.id));
  assert.ok(t.sourceIds.length && t.sourceIds.every(id=>seen.has(id)));
});
test("all ten countries serialize under the existing Notebook limits in every measure; CSV preserves scope and missing data",()=>{
  for(const measure of ["turnout","chamber_seats","contestants","distribution"]) {
    const sel=parse("history_countries="+countries.join(",")+"&history_measure="+measure).selection;
    const rows=historyRows(sel,index);
    const draft=historyEvidence(rows,sel,"en");
    const saved=addNotebookEvidence(emptyNotebook("en","v2.0"),draft,"v2.0");
    assert.equal(parseNotebook(serializeNotebook(saved)).items[0].countries.length,countries.length);
    assert.deepEqual(saved.items[0].canonical_ids,rows.map(r=>r.election.id));
    assert.ok(saved.sources.length>0 && saved.sources.every(s=>s.url.startsWith("https://")));
    assert.match(saved.items[0].url,/#historical-comparison$/);
    const csv=historyCsv(rows,sel,"en");
    assert.match(csv,/"chamber_id"/);
    assert.match(csv,/el-sk-nrsr-2023-09-30/);
    assert.match(csv,/"source_urls"/);
    if(measure==="distribution") assert.match(csv,/ballot_selection_required/);
  }
});

test("switching scope-specific distributions to turnout restores the electorate actually displayed",()=>{
  const state=parse("history_countries=croatia,slovenia,hungary&history_events=el-hr-sabor-2024-04-17,el-si-dz-2011-12-04,el-hu-ogy-2018-04-08&history_ballots=el-hr-sabor-2024-04-17:hr-ie-11,el-si-dz-2011-12-04:si-nc-madzarska,el-hu-ogy-2018-04-08:hu_nationality_list_vote&history_measure=distribution").selection;
  const distributions=historyRows(state,index);
  assert.deepEqual(distributions.map(r=>r.ballot.id),["si-nc-madzarska","hu_nationality_list_vote","hr-ie-11"]);
  const exportRows=historyCsv(distributions,state,"en");
  assert.ok(!exportRows.includes('"turnout_count"'));
  const turnout={...state,measure:"turnout"};
  const records=historyRows(turnout,index);
  for(const r of records) {
    const target=new URL(electionHistoryHref(r,"en"),"https://example.org");
    assert.equal(target.searchParams.get("ballot"),r.country==="slovenia"?"national":null);
    assert.equal(target.searchParams.get("vote_type"),null);
    const sourceIds=r.election.history.turnout.sourceIds;
    assert.ok(sourceIds.length>0);
    const evidence=historyEvidence([r],turnout,"en");
    assert.deepEqual(evidence.sources.map(s=>s.code).sort(),[...sourceIds].sort());
  }
  const csv=historyCsv(records,turnout,"en");
  assert.ok(csv.includes('"turnout_count"')&&!csv.includes('"chamber_seats_assigned"'));
  assert.ok(!csv.includes("hu_nationality_list_vote")&&!csv.includes("hr-ie-11")&&!csv.includes("si-nc-madzarska"));
});
