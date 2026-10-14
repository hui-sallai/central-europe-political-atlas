// Czechia — Chamber of Deputies 2025: CANDIDATE package builder (staging only).
//
// Reads ČSÚ open-data files that the owner has staged manually under .tmp-data-refresh/political-candidate-czechia/raw/
// (volby.gov.cz is registered for manual retrieval only, and the reuse scope of the ČSÚ terms for volby.gov.cz files is
// still open). Writes a national candidate package next to them in the political store schema. It never fetches, never
// writes src/data/** or public/research-data/**, never emits regional or municipal results, and never splits a coalition's
// votes among its member parties.
//
// The XML structure is not assumed: the builder runs only if the staged official XSD (ps_vysledky.xsd) declares every
// element and attribute of STRUCTURE below. Field meanings come from the 2026-10-02 source-closure audit
// (UCAST_PROC = VYDANE_OBALKY / ZAPSANI_VOLICI; PROC_HLASU = HLASY / PLATNE_HLASY; PROC_MANDATU = MANDATY / POCMANDATU)
// and are re-checked arithmetically on the staged file; a failed check stops the build.
//
// Usage: node scripts/political-data/czechia/build-candidate.mjs [--stage <dir>]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export const STRUCTURE = {
  national: "CR",
  region: "KRAJ",
  turnout: { element: "UCAST", attributes: ["ZAPSANI_VOLICI", "VYDANE_OBALKY", "UCAST_PROC", "PLATNE_HLASY"] },
  list: { element: "STRANA", attributes: ["KSTRANA", "NAZ_STR"] },
  listValues: { element: "HODNOTY_STRANA", attributes: ["HLASY", "PROC_HLASU"] },
  regionSeats: { attributes: ["MANDATY", "POCMANDATU"] },
};
export const SOURCES = {
  results: { file: "vysledky.xml", url: "https://volby.gov.cz/appdata/ps2025/odata/vysledky.xml", title: "ČSÚ: celkové výsledky za ČR a kraje (XML)" },
  schema: { file: "ps_vysledky.xsd", url: "https://volby.gov.cz/opendata/ps2025/ps_vysledky.xsd", title: "ČSÚ: XSD popis vysledky.xml" },
};

/** Names the official XSD must declare before the staged XML is read. */
export function missingFromSchema(xsd) {
  const names = [STRUCTURE.national, STRUCTURE.region, STRUCTURE.turnout.element, ...STRUCTURE.turnout.attributes, STRUCTURE.list.element, ...STRUCTURE.list.attributes, STRUCTURE.listValues.element, ...STRUCTURE.listValues.attributes, ...STRUCTURE.regionSeats.attributes];
  return names.filter((name) => !new RegExp(`name=["']${name}["']`).test(xsd));
}

/** Minimal XML scanner: elements with attributes and parent path. Text content is not needed here. */
export function scanXml(xml) {
  const out = [], stack = [];
  for (const match of xml.matchAll(/<(\/?)([A-Za-z_][\w.-]*)([^>]*?)(\/?)>/g)) {
    const [, closing, name, attrText, selfClosing] = match;
    if (name.startsWith("?") || name.startsWith("!")) continue;
    if (closing) { stack.pop(); continue; }
    const attributes = Object.fromEntries([...attrText.matchAll(/([\w.-]+)\s*=\s*"([^"]*)"/g)].map(([, key, value]) => [key, value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&apos;", "'")]));
    out.push({ name, attributes, path: [...stack] });
    if (!selfClosing) stack.push(name);
  }
  return out;
}

const int = (value, label) => { if (!/^\d+$/.test(value ?? "")) throw new Error(`${label}: expected a non-negative integer, got ${value}`); return Number(value); };
const dec = (value, label) => { const v = String(value ?? "").replace(",", "."); if (!/^\d+(\.\d+)?$/.test(v)) throw new Error(`${label}: expected a decimal, got ${value}`); return Number(v); };

/** National candidate from a scanned results file. Regional rows are used only to sum official seats. */
export function nationalCandidate(elements) {
  const S = STRUCTURE;
  const inNational = (el) => el.path.includes(S.national) && !el.path.includes(S.region);
  const turnoutRows = elements.filter((el) => el.name === S.turnout.element && inNational(el));
  if (turnoutRows.length !== 1) throw new Error(`expected one national ${S.turnout.element} element, found ${turnoutRows.length}`);
  const t = turnoutRows[0].attributes;
  const turnout = { eligible_voters: int(t.ZAPSANI_VOLICI, "ZAPSANI_VOLICI"), envelopes_issued: int(t.VYDANE_OBALKY, "VYDANE_OBALKY"), valid_votes: int(t.PLATNE_HLASY, "PLATNE_HLASY"), published_turnout: dec(t.UCAST_PROC, "UCAST_PROC") };
  const lists = [];
  for (let i = 0; i < elements.length; i += 1) {
    const el = elements[i];
    if (el.name !== S.list.element || !inNational(el)) continue;
    const values = elements.slice(i + 1).find((next) => next.name === S.listValues.element && next.path.at(-1) === S.list.element);
    if (!values) throw new Error(`list ${el.attributes.KSTRANA}: no ${S.listValues.element}`);
    lists.push({ ballot_number: el.attributes.KSTRANA, native_label: el.attributes.NAZ_STR, votes: int(values.attributes.HLASY, "HLASY"), published_vote_share: dec(values.attributes.PROC_HLASU, "PROC_HLASU") });
  }
  if (!lists.length) throw new Error("no national lists found");
  // Seats: official regional allocations summed to the national level (documented aggregation).
  const regionTotals = [], seats = new Map();
  for (let i = 0; i < elements.length; i += 1) {
    const el = elements[i];
    if (el.name === S.region && el.attributes.POCMANDATU !== undefined) regionTotals.push(int(el.attributes.POCMANDATU, "POCMANDATU"));
    if (el.name === S.listValues.element && el.path.includes(S.region) && el.attributes.MANDATY !== undefined) {
      const owner = [...elements.slice(0, i)].reverse().find((prev) => prev.name === S.list.element);
      seats.set(owner.attributes.KSTRANA, (seats.get(owner.attributes.KSTRANA) ?? 0) + int(el.attributes.MANDATY, "MANDATY"));
    }
  }
  return { turnout, lists, regionTotals, seats };
}

/** Arithmetic checks against the audited definitions; any failure stops the build. */
export function checkCandidate({ turnout, lists, regionTotals, seats }) {
  const failures = [], check = (ok, message) => { if (!ok) failures.push(message); };
  const sumVotes = lists.reduce((total, list) => total + list.votes, 0);
  check(sumVotes === turnout.valid_votes, `list votes ${sumVotes} ≠ PLATNE_HLASY ${turnout.valid_votes}`);
  check(Math.abs((100 * turnout.envelopes_issued) / turnout.eligible_voters - turnout.published_turnout) <= 0.006, "UCAST_PROC does not equal VYDANE_OBALKY / ZAPSANI_VOLICI × 100 (to two decimals)");
  for (const list of lists) check(Math.abs((100 * list.votes) / turnout.valid_votes - list.published_vote_share) <= 0.006, `PROC_HLASU of list ${list.ballot_number} does not equal HLASY / PLATNE_HLASY × 100`);
  check(new Set(lists.map((list) => list.ballot_number)).size === lists.length, "ballot numbers are not unique");
  const seatSum = [...seats.values()].reduce((a, b) => a + b, 0), totalSeats = regionTotals.reduce((a, b) => a + b, 0);
  check(regionTotals.length > 0 && seatSum === totalSeats, `list seats ${seatSum} ≠ sum of regional seat totals ${totalSeats}`);
  check([...seats.keys()].every((key) => lists.some((list) => list.ballot_number === key)), "a seat-winning list is missing from the national results");
  return { failures, sumVotes, seatSum, totalSeats };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const stage = path.resolve(root, args.includes("--stage") ? args[args.indexOf("--stage") + 1] : ".tmp-data-refresh/political-candidate-czechia");
  const raw = path.join(stage, "raw");
  const missing = Object.values(SOURCES).filter((source) => !fs.existsSync(path.join(raw, source.file)));
  if (missing.length) { console.error(`Not staged (download manually from volby.gov.cz and place in ${path.relative(root, raw)}/): ${missing.map((s) => `${s.file} ← ${s.url}`).join("; ")}`); process.exit(2); }
  const file = (key) => path.join(raw, SOURCES[key].file);
  const absent = missingFromSchema(fs.readFileSync(file("schema"), "utf8"));
  if (absent.length) { console.error(`The staged XSD does not declare: ${absent.join(", ")}. Update STRUCTURE from the official description before building.`); process.exit(1); }
  const candidate = nationalCandidate(scanXml(fs.readFileSync(file("results"), "utf8")));
  const { failures, totalSeats } = checkCandidate(candidate);
  if (failures.length) { console.error(JSON.stringify({ status: "fail", failures }, null, 1)); process.exit(1); }
  const sha = (key) => crypto.createHash("sha256").update(fs.readFileSync(file(key))).digest("hex");
  const electionId = "el-cz-ps-2025-10-03", provenance = (recordId) => [{ source_id: "src-cz-csu-ps2025-results", source_url: SOURCES.results.url, source_record_id: recordId, staged_file_mtime: fs.statSync(file("results")).mtime.toISOString(), raw_snapshot: { path: `staging:raw/${SOURCES.results.file}`, sha256: sha("results") }, parser_version: "czechia-candidate-v1", parser_sha256: crypto.createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url))).digest("hex") }];
  const lists = [...candidate.lists].sort((a, b) => b.votes - a.votes).map((list, index) => ({ ...list, contestant_id: `ct-cz-ps-2025-${String(index + 1).padStart(3, "0")}`, seats: candidate.seats.get(list.ballot_number) ?? null }));
  const stores = {
    elections: [{ election_id: electionId, country: "czechia", election_type: "national_parliament", chamber: "Poslanecká sněmovna", date: "2025-10-03", polling_end_date: "2025-10-04", date_basis: "atlas_registry_to_reconcile_against_official_announcement", year: 2025, legislature_id: "lg-cz-ps-2025", electoral_system_id: "es-cz-ps-2025", result_status: "candidate_unreconciled", result_vintage: `ČSÚ vysledky.xml staged ${fs.statSync(file("results")).mtime.toISOString().slice(0, 10)}`, provenance: provenance("national block") }],
    election_turnout: [{ election_id: electionId, country: "czechia", geography: "national", vote_type: "chamber_list_vote", eligible_voters: candidate.turnout.eligible_voters, voters: candidate.turnout.envelopes_issued, voters_definition: "VYDANE_OBALKY (envelopes issued), the numerator of the published turnout", valid_votes: candidate.turnout.valid_votes, published_turnout: candidate.turnout.published_turnout, derived_turnout: null, turnout_definition: "UCAST_PROC as published by ČSÚ; equals VYDANE_OBALKY / ZAPSANI_VOLICI × 100 (re-checked on the staged file)", provenance: provenance("national UCAST") }],
    electoral_contestants: lists.map((list) => ({ contestant_id: list.contestant_id, country: "czechia", election_id: electionId, ballot_number: list.ballot_number, contestant_kind: "not_classified", contestant_kind_note: "party, movement or coalition to be taken from the ČSÚ register (CVS.TYPVS) once the KSTRANA/VSTRANA key question is clarified; a coalition's votes are never split among members", registered_label_native: list.native_label, historical_display_label: list.native_label, lead_party_id: null, party_relation_status: "requires_manual_review", continuous_series_eligible: false, provenance: provenance(`STRANA KSTRANA=${list.ballot_number}`) })),
    election_results: lists.map((list) => ({ result_id: `er-${list.contestant_id}`, country: "czechia", geography: "national", election_id: electionId, contestant_ref: list.contestant_id, vote_type: "chamber_list_vote", valid_votes: candidate.turnout.valid_votes, total_seats: totalSeats, votes: list.votes, published_vote_share: list.published_vote_share, published_vote_share_evidence: { document_id: "src-cz-csu-ps2025-results", locator: `PROC_HLASU, KSTRANA=${list.ballot_number}` }, derived_vote_share: (100 * list.votes) / candidate.turnout.valid_votes, seats: list.seats, seats_basis: list.seats === null ? "no seats in any regional allocation" : "sum of official regional MANDATY", derived_seat_share: list.seats === null ? null : (100 * list.seats) / totalSeats, result_vintage: "staged ČSÚ file", provenance: provenance(`STRANA KSTRANA=${list.ballot_number}`) })),
    legislatures: [{ legislature_id: "lg-cz-ps-2025", country: "czechia", chamber: "Poslanecká sněmovna", election_id: electionId, total_seats: totalSeats, total_seats_basis: "sum of official regional seat totals (POCMANDATU)", total_seats_evidence: { document_id: "src-cz-csu-ps2025-results", locator: "KRAJ POCMANDATU" }, seats_allocated_in_constituency_file: totalSeats, provenance: provenance("regional POCMANDATU") }],
    electoral_systems: [{ electoral_system_id: "es-cz-ps-2025", country: "czechia", election_id: electionId, system_family: "list proportional representation in 14 regions (per Atlas registry; to verify)", vote_type: "chamber_list_vote", allocation_method: "not established from the staged files", base_seats: null, rules_status: "background_to_verify", notes: { en: "Chamber of Deputies. List proportional representation in 14 regions, with thresholds of 5% for a single party and higher thresholds for coalitions (8% for two parties, 11% for three or more), per the Atlas source registry — still to be verified against Act 247/1995 as amended in 2021. Coalitions are contestants in their own right.", "zh-CN": "众议院。根据 Atlas 来源登记，在 14 个州实行名单比例代表制：单一政党门槛 5%，联盟门槛更高（两党 8%，三党及以上 11%）——仍需依据经 2021 年修订的第 247/1995 号法律核实。联盟本身就是参选方。" }, provenance: provenance("national block") }],
    political_source_registry: [{ source_id: "src-cz-csu-ps2025-results", country: "czechia", institution: "Český statistický úřad", dataset: SOURCES.results.title, tier: "tier1_official", url: SOURCES.results.url, licence_status: "reuse_scope_unconfirmed_not_production_authorised", raw_redistribution: "not_assessed", licence_url: "https://csu.gov.cz/podminky_pro_vyuzivani_a_dalsi_zverejnovani_statistickych_udaju_csu", attribution: "Český statistický úřad (volby.gov.cz)", retrieved_at: fs.statSync(file("results")).mtime.toISOString(), raw_sha256: sha("results") }],
  };
  fs.mkdirSync(path.join(stage, "candidate", "stores"), { recursive: true });
  for (const [name, rows] of Object.entries(stores)) fs.writeFileSync(path.join(stage, "candidate", "stores", `${name}.json`), `${JSON.stringify(rows, null, 2)}\n`);
  console.log(JSON.stringify({ status: "internally_consistent_candidate", lists: lists.length, valid_votes: candidate.turnout.valid_votes, seats: totalSeats, production_ready: false }, null, 1));
}
