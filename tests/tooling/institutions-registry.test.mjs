// Ten-country political-institutions registry (2026-11-16): schema, identifiers, naming, dates, sources, bilingual
// alignment, election links and preservation of the election and economic stores.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadRegistry, validate, storeContext, buildLinks, changeDate, ADMITTED, LINKS_PATH } from "../../scripts/institutions/build-institutions.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const records = (doc) => (Array.isArray(doc) ? doc : doc.records ?? []);
const registry = loadRegistry();
const { meta, countries } = registry;
const links = read(LINKS_PATH);
const CANONICAL = ["poland", "hungary", "czechia", "slovakia", "germany", "romania", "slovenia", "serbia", "austria", "croatia"];

test("schema: every country record passes the registry validator", () => {
  assert.deepEqual(validate(registry, storeContext()), []);
});

test("stable country identifiers: the ten canonical slugs, matching the country records and observations", () => {
  assert.deepEqual(meta.countries, CANONICAL);
  for (const slug of CANONICAL) assert.equal(countries[slug].country, slug);
  const observed = new Set(read("src/data/observations/observations.json").records.map((r) => r.country_slug));
  for (const slug of CANONICAL.filter((s) => s !== "serbia")) assert.ok(observed.has(slug), slug);
  assert.deepEqual(meta.case_study_countries, ["poland", "hungary", "germany", "serbia"]);
});

test("no duplicate institution, rule, change or source identifiers across the registry", () => {
  const ids = [];
  for (const c of Object.values(countries)) ids.push(c.constitution.id, ...c.chambers.map((x) => x.chamber_id), ...c.offices.map((x) => x.office_id), ...c.electoral_systems.map((x) => x.rule_id), ...c.changes.map((x) => x.change_id), ...c.sources.map((x) => x.source_id));
  assert.equal(new Set(ids).size, ids.length);
});

test("chamber naming: official designations, not a generic two-chamber template", () => {
  const pl = countries.poland.chambers;
  assert.deepEqual(pl.map((c) => [c.name.en, c.official_name.split(" ")[0]]), [["Sejm", "Sejm"], ["Senate", "Senat"]]);
  const usesChamberOfDeputies = Object.entries(countries).filter(([, c]) => c.chambers.some((ch) => ch.name.en === "Chamber of Deputies")).map(([s]) => s);
  assert.deepEqual(usesChamberOfDeputies.sort(), ["czechia", "romania"]);
  for (const slug of ["hungary", "slovakia", "serbia", "croatia"]) assert.deepEqual(countries[slug].chambers.map((c) => c.role), ["sole"], slug);
  assert.equal(countries.germany.chambers.find((c) => c.chamber_id === "de-bundesrat").role, "federal_council");
  assert.equal(countries.germany.chambers.find((c) => c.chamber_id === "de-bundesrat").selection.code, "appointed_by_land_governments");
  assert.equal(countries.slovenia.chambers.find((c) => c.chamber_id === "si-drzavni-svet").role, "interest_council");
  assert.equal(countries.austria.chambers.find((c) => c.chamber_id === "at-bundesrat").selection.code, "elected_by_land_parliaments");
  // A Chinese chamber name never carries an English gloss.
  for (const c of Object.values(countries)) for (const ch of c.chambers) assert.doesNotMatch(ch.name.zh, /\b(National|Council|Assembly|Chamber)\b/, ch.chamber_id);
});

test("historical effective dates: recorded changes keep their adoption, promulgation and effect dates", () => {
  const change = (slug, id) => countries[slug].changes.find((c) => c.change_id === id);
  assert.deepEqual(["adopted", "promulgated", "effective"].map((k) => change("hungary", "hu-2026-amendment-16")[k]), ["2026-06-15", "2026-06-19", "2026-06-20"]);
  assert.deepEqual(["adopted", "promulgated", "effective"].map((k) => change("hungary", "hu-2026-amendment-17")[k]), ["2026-07-13", "2026-07-18", "2026-07-19"]);
  assert.equal(change("czechia", "cz-2012-direct-president").effective, "2012-10-01");
  assert.deepEqual(["adopted", "effective"].map((k) => change("slovakia", "sk-1999-direct-president")[k]), ["1999-01-14", "1999-01-27"]);
  assert.deepEqual(["adopted", "effective"].map((k) => change("slovakia", "sk-2023-term-shortening")[k]), ["2023-01-25", "2023-01-26"]);
  assert.equal(change("germany", "de-2023-electoral-reform").effective, "2023-06-14");
  assert.equal(countries.hungary.constitution.in_force, "2012-01-01");
  assert.equal(countries.poland.constitution.in_force, "1997-10-17");
  // An undated change is never placed on the timeline by guesswork.
  assert.equal(changeDate(change("czechia", "cz-2021-chamber-electoral-rules")), null);
});

test("source references: official https hosts registered for manual reading, never a blocked host", () => {
  const net = read("docs/legal-security/network_acquisition_registry.json");
  const status = new Map(net.hosts.map((h) => [h.host, h]));
  for (const c of Object.values(countries)) for (const s of c.sources) {
    const host = new URL(s.url).hostname, entry = status.get(host);
    assert.ok(entry, `${s.source_id}: ${host} unregistered`);
    assert.notEqual(entry.status, "blocked", `${s.source_id}: ${host} is blocked`);
    assert.equal(entry.manual_allowed, true, `${s.source_id}: ${host} not cleared for manual reading`);
  }
  for (const host of ["www.sejm.gov.pl", "www.dz-rs.si", "legislatie.just.ro"]) assert.equal(status.get(host)?.status, "blocked", host);
  // Every verified field cites at least one source of its own country.
  for (const c of Object.values(countries)) for (const [id, f] of Object.entries(c.fields)) if (f.status === "verified") assert.ok(f.source_ids.length, `${c.country}.${id}`);
});

test("bilingual alignment: every text has both languages and the same multi-digit figures", () => {
  const walk = (value, where, out) => {
    if (value && typeof value === "object" && !Array.isArray(value) && "en" in value && "zh" in value) out.push([where, value]);
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, `${where}.${k}`, out);
    return out;
  };
  const nums = (s) => [...s.matchAll(/\d{3,}/g)].map((m) => m[0]).sort();
  for (const c of Object.values(countries)) for (const [where, v] of walk(c, c.country, [])) {
    assert.ok(v.en.trim() && v.zh.trim(), where);
    assert.deepEqual(nums(v.zh), nums(v.en), `${where}: figures differ between languages`);
  }
});

test("election links: reproducible, complete, and tied to each election's own rule record", () => {
  const run = spawnSync(process.execPath, ["scripts/institutions/build-institutions.mjs", "--check"], { cwd: root, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(buildLinks(registry), fs.readFileSync(path.join(root, LINKS_PATH), "utf8"));
  for (const slug of ADMITTED) {
    const elections = records(read(`src/data/political/${slug}/elections.json`));
    const systems = new Map(records(read(`src/data/political/${slug}/electoral_systems.json`)).map((s) => [s.electoral_system_id, s]));
    const legislatures = new Map(records(read(`src/data/political/${slug}/legislatures.json`)).map((l) => [l.legislature_id, l]));
    for (const e of elections) {
      const link = links.elections.find((l) => l.election_id === e.election_id);
      assert.ok(link, e.election_id);
      assert.equal(link.electoral_system_id, e.electoral_system_id);
      assert.equal(link.seats, legislatures.get(e.legislature_id).total_seats);
      // Thresholds are those of the election's own record, never the current law.
      assert.deepEqual(link.thresholds.map((t) => t.percent), (systems.get(e.electoral_system_id).national_rules?.thresholds ?? []).map((t) => t.percent));
      assert.ok(link.chamber_id, e.election_id);
      for (const id of link.changes_in_force) assert.ok(changeDate(countries[slug].changes.find((c) => c.change_id === id)) <= e.date);
      for (const id of link.later_changes) assert.ok(changeDate(countries[slug].changes.find((c) => c.change_id === id)) > e.date);
    }
  }
  assert.equal(links.elections.length, 45);
  // Croatia 2000 falls before the 2000 and 2001 constitutional changes; 2003 and 2007 after the unicameral change.
  const hr2000 = links.elections.find((l) => l.election_id === "el-hr-sabor-2000-01-03"), hr2007 = links.elections.find((l) => l.election_id === "el-hr-sabor-2007-11-25");
  assert.deepEqual([hr2000.institutional_period_id, hr2000.seats], ["croatia-period-1990-12-22", 151]);
  assert.ok(hr2000.later_changes.includes("hr-2001-unicameral") && hr2007.changes_in_force.includes("hr-2001-unicameral"));
  assert.equal(hr2007.seats, 153);
  assert.equal(links.elections.find((l) => l.election_id === "el-si-dz-2004-10-03").institutional_period_id, "slovenia-period-2000-07-25");
  assert.deepEqual(links.elections.filter((l) => l.country === "austria").map((l) => [l.chamber_id, l.seats]), [["at-nationalrat", 183], ["at-nationalrat", 183], ["at-nationalrat", 183], ["at-nationalrat", 183], ["at-nationalrat", 183]]);
  // Austria 2002 predates the earliest Austrian period the registry records (opened by the 2008 five-year term): no period is
  // attached rather than a later one, and the 2008 change is listed as later.
  const at2002 = links.elections.find((l) => l.election_id === "el-at-nr-2002-11-24");
  assert.equal(at2002.institutional_period_id, null);
  assert.ok(at2002.later_changes.includes("at-2008-five-year-term"));
  assert.ok(!links.elections.find((l) => l.election_id === "el-hr-sabor-2011-12-04").changes_in_force.includes("hr-2015-preferential-vote"));
  assert.deepEqual(links.elections.filter((l) => l.country === "slovenia").map((l) => l.date), ["2004-10-03", "2008-09-21", "2011-12-04", "2014-07-13", "2018-06-03", "2022-04-24", "2026-03-22"]);
  // Romania 2016: both chambers, each linked to the period opened by Law 208/2015.
  assert.deepEqual(links.elections.filter((l) => l.country === "romania").map((l) => [l.chamber_id, l.seats, l.institutional_period_id]), [["ro-camera-deputatilor", 329, "romania-period-2015-07-20"], ["ro-senat", 136, "romania-period-2015-07-20"], ["ro-camera-deputatilor", 331, "romania-period-2015-07-20"], ["ro-senat", 134, "romania-period-2015-07-20"]]);
  // Croatia and Slovenia (admitted 2026-11-18): elections before the 2023 Constituencies Act link to the earlier period.
  const hr2020 = links.elections.find((l) => l.election_id === "el-hr-sabor-2020-07-05"), hr2024 = links.elections.find((l) => l.election_id === "el-hr-sabor-2024-04-17");
  assert.deepEqual(hr2020.later_changes, ["hr-2023-constituencies-act"]);
  assert.ok(hr2024.changes_in_force.includes("hr-2023-constituencies-act"));
  assert.deepEqual([hr2024.chamber_id, hr2024.seats, links.elections.find((l) => l.election_id === "el-si-dz-2026-03-22").chamber_id], ["hr-sabor", 151, "si-drzavni-zbor"]);
  const hu2026 = links.elections.find((l) => l.election_id === "el-hu-ogy-2026-04-12");
  assert.deepEqual(hu2026.later_changes, ["hu-2026-amendment-16", "hu-2026-amendment-17"]);
  const cz2017 = links.elections.find((l) => l.election_id === "el-cz-ps-2017-10-20");
  assert.deepEqual(cz2017.thresholds.map((t) => t.percent), [5, 10, 15, 20]);
  assert.ok(links.elections.find((l) => l.election_id === "el-de-bt-2025-02-23").changes_in_force.includes("de-2023-electoral-reform"));
});

test("preservation: election stores and economic data are unchanged by this iteration", () => {
  const BASE = "46dca48f4d6b85b14b8bda983440f5d44314368b";
  const changed = execFileSync("git", ["diff", "--name-only", BASE, "--", "src/data", "public/research-data", "public/data"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  // Later owner-admitted countries (Croatia, Slovenia, Romania and Austria, 2026-11-18) add new political files only, each at the exact hash
  // of its admission record; every other data file stays unchanged.
  const admitted = new Map(read("docs/legal-security/political_admission_records.json").admissions.filter((a) => a.status === "owner_approved" && ["croatia", "slovenia", "romania", "austria"].includes(a.country)).flatMap((a) => a.files.map((f) => [f.path, f.sha256])));
  const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, f))).digest("hex");
  const unexplained = changed.filter((f) => !(/^(src\/data|public\/research-data)\/political\/(croatia|slovenia|romania|austria)\//.test(f) && admitted.get(f) === sha(f)));
  assert.deepEqual(unexplained, [], `data files changed since ${BASE}`);
});
