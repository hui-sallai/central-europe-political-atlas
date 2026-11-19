import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : request, ...args);
};
require.extensions[".ts"] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, file);
const {politicalBallotElections, isBallotCountry} = require("../../src/lib/politicalBallots.ts");
const read = (country, name) => require(path.join(root, "src", "data", "political", country, name + ".json"));

for (const country of ["austria", "croatia", "romania", "slovenia"]) {
  test(country + ": every registered election, constituency and contestant survives the gated projection", () => {
    const views = politicalBallotElections(country);
    const elections = read(country, "elections");
    const results = read(country, "election_results");
    const contestants = new Map(read(country, "electoral_contestants").map(c => [c.contestant_id, c]));
    assert.equal(isBallotCountry(country), true);
    assert.equal(isBallotCountry("constructor"), false);
    assert.deepEqual(views.map(v => v.id).sort(), elections.map(e => e.election_id).sort());
    for (const election of views) {
      if (election.seatSlots != null) {
        assert.ok(election.totalSeats <= election.seatSlots);
        assert.equal(election.composition.reduce((sum, part) => sum + part.seats, 0), election.seatSlots);
      }
      const official = results.filter(r => r.election_id === election.id);
      const rows = election.ballots.flatMap(b => b.results);
      assert.deepEqual(rows.map(r=>r.id).sort(), official.map(r=>r.result_id).sort());
      const byId = new Map(official.map(r => [r.result_id, r]));
      for (const ballot of election.ballots) {
        const citations = new Set(election.sources.map(s=>s.id));
        for (const row of ballot.results) {
          const source = byId.get(row.id);
          assert.equal(source.geography, ballot.geography);
          assert.equal(source.total_seats, ballot.totalSeats);
          assert.equal(row.name, contestants.get(row.contestantId).historical_display_label);
          assert.deepEqual([row.votes, row.seats, row.points], [source.votes, source.seats, source.points ?? null]);
          assert.equal(row.derivedShare, source.derived_vote_share);
          assert.equal(row.publishedShare, source.published_vote_share ?? source.printed_share_of_all_candidate_votes ?? null);
          assert.ok(row.sourceIds.every(id=>citations.has(id)));
          assert.ok(source.provenance.every(p => row.sourceIds.includes(p.source_id)));
        }
      }
    }
  });
}

test("Romanian chambers remain separate, including unfilled seats, published 2012 mandates and unavailable 2016 turnout", () => {
  const es = politicalBallotElections("romania");
  assert.equal(es.length, 8);
  assert.equal(es.filter(e=>e.year===2024).length, 2);
  const senate = es.find(e=>e.id==="el-ro-s-2024-12-01");
  assert.equal(senate.chamber,"Senat");
  assert.deepEqual([senate.totalSeats,senate.seatSlots],[134,136]);
  assert.equal(senate.ballots[0].results.reduce((a,r)=>a+r.seats,0),134);
  const deputies = es.filter(e => e.chamber === "Camera Deputaților" && e.year >= 2020);
  assert.deepEqual(deputies.map(e => [e.year, e.totalSeats, e.seatSlots]), [[2020,330,330],[2024,331,331]]);
  assert.ok(es.filter(e=>e.year===2016).every(e=>e.ballots[0].turnout===null));
  assert.ok(es.filter(e=>e.year===2012).every(e=>e.rules.en.includes("not recomputed")));
});

test("Slovenian general lists and both community elections retain independent seat and voting measures", () => {
  for (const e of politicalBallotElections("slovenia")) {
    assert.deepEqual(e.ballots.map(b=>b.totalSeats),[88,1,1]);
    assert.equal(e.totalSeats,90);
    for (const b of e.ballots.filter(b=>b.category==="minority")) {
      if (e.year<=2018) {
        assert.equal(b.shareBasis,"points");
        assert.ok(b.results.every(r=>r.points!==null && r.votes===null && r.publishedShare===null && r.derivedShare===null));
      } else {
        assert.equal(b.shareBasis,"valid_votes");
      }
    }
    if (e.year===2000) {
      const general=e.ballots.find(b=>b.geography==="national");
      assert.equal(general.printedTurnoutNote,70.37);
      assert.equal(general.turnoutPublished,false);
      assert.equal(general.results.find(r=>r.printedShareNote===8.76).publishedShare,null);
    }
  }
});

test("Croatian historical chambers, denominators and separately declared representatives are preserved", () => {
  const es=politicalBallotElections("croatia"), year=n=>es.find(e=>e.year===n);
  const national=year(1992).ballots.find(b=>b.geography==="hr-national-list");
  assert.equal(national.shareBasis,"ballots_cast");
  assert.equal(national.totalSeats,60);
  assert.equal(national.results.flatMap(r=>r.seatDetails).reduce((a,r)=>a+r.seats,0),14);
  assert.equal(year(1992).composition.reduce((a,r)=>a+r.seats,0),138);
  assert.ok(year(1993).chamber.includes("Županijski dom"));
  assert.equal(year(1993).totalSeats,63);
  assert.equal(year(1993).ballots.length,21);
  assert.equal(year(1993).repeatPollDate,"1993-02-21");
  assert.equal(year(1995).ballots.find(b=>b.geography==="hr-special-5").shareBasis,"candidate_votes");
  assert.ok(!year(2024).ballots.some(b=>b.category==="national"));
  assert.equal(year(2024).territorialTurnout.geography,"hr-territorial-i-x");
  assert.equal(year(2024).ballots.find(b=>b.geography==="hr-ie-12-srpska").shareBasis,"unavailable");
});

test("Austrian Nationalrat tiers use the recorded number of regional districts for each election", () => {
  const es=politicalBallotElections("austria");
  assert.ok(es.every(e=>e.chamber==="Nationalrat" && e.totalSeats===183));
  for(const [year,expected] of [[2006,43],[2008,43],[2019,39],[2024,39]]) {
    assert.equal(es.find(e=>e.year===year).districts.length,expected);
  }
});
