// Romania — Chamber of Deputies 2016: CANDIDATE package builder (staging only).
//
// Reads official AEP files that the owner has staged under .tmp-data-refresh/political-candidate-romania/raw/
// (published on data.gov.ro under OGL-ROU-1.0) and writes a national-level candidate package next to them.
// It never writes src/data/political/** or public/research-data/political/**: Romania is not an authorised production
// country, and promotion needs an explicit owner decision. Senate files are never read. Polling-station rows are only
// summed to the national level; no subnational result is emitted. Independent candidates are reported as one
// aggregate row — individual names are not carried into the package.
//
// Usage: node scripts/political-data/romania/build-candidate.mjs [--stage <dir>] [--status-out <file>]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { applyEvidence, loadEvidence, readiness } from "./evidence.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const stage = path.resolve(root, option("--stage", ".tmp-data-refresh/political-candidate-romania"));
const raw = path.join(stage, "raw");
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const need = (name) => { const file = path.join(raw, name); if (!fs.existsSync(file)) { console.error(`missing staged source file: ${path.relative(root, file)}`); process.exit(1); } return file; };

export const SOURCES = {
  results: { file: "cd2016.csv", url: "https://data.gov.ro/dataset/eb0770eb-d78d-4227-9186-74a08f19d068/resource/e863c174-89ea-49be-8865-b32b3cdbc71e/download/siap2016cd2016121419150015-2.csv", title: "Centralizarea datelor pentru Camera Deputaților, cu excepția votului prin corespondență" },
  postal: { file: "cd2016_postal.csv", url: "https://data.gov.ro/dataset/eb0770eb-d78d-4227-9186-74a08f19d068/resource/a397ed83-39bf-4369-85cf-8c6b92b4d642/download/bvccd-1.csv", title: "Centralizarea datelor pentru Camera Deputaților pentru votul prin corespondență" },
  mandates: { file: "cd2016_mandates.xlsx", url: "https://data.gov.ro/dataset/eb0770eb-d78d-4227-9186-74a08f19d068/resource/cf4cb1ce-6b00-4f11-8bde-e54d506d1e1e/download/mandate-pe-competitori-pe-circumscripii-cd.xlsx", title: "Repartizarea mandatelor de deputat pe circumscripții" },
  licence: { file: "licence.html", url: "https://data.gov.ro/pages/licence", title: "data.gov.ro licence page (OGL-ROU-1.0)" },
};

// Labels are compared after normalising the two Romanian comma-below/cedilla spellings and whitespace; the label of the
// main results file is kept as the native label.
export const labelKey = (label) => label.normalize("NFC").replace(/[ŞȘ]/g, "S").replace(/[şș]/g, "s").replace(/[ŢȚ]/g, "T").replace(/[ţț]/g, "t").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim().toUpperCase();
export const isIndependent = (label) => /^CANDIDAT INDEPENDENT\b/i.test(label.trim());

export function parseCsvLine(line, delimiter) {
  const out = []; let cell = "", quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) { if (ch === '"' && line[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === delimiter) { out.push(cell); cell = ""; }
    else cell += ch;
  }
  out.push(cell);
  return out;
}
const integer = (cell) => { if (cell === undefined || cell.trim() === "") return 0; if (!/^\d+$/.test(cell.trim())) throw new Error(`non-integer count: ${cell}`); return Number(cell); };

/** Sums station rows to national totals. `fixed` names the count columns; every other column after them is a list. */
export function sumStations(text, delimiter, firstListColumn, countColumns, trailingColumns = 0) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const header = parseCsvLine(lines[0], delimiter);
  const lists = header.slice(firstListColumn, header.length - trailingColumns).map((label) => label.trim());
  const counts = Object.fromEntries(countColumns.map((name) => [name, 0]));
  const votes = lists.map(() => 0);
  let rowsWhereValidEqualsSum = 0;
  const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter));
  for (const row of rows) {
    for (const name of countColumns) counts[name] += integer(row[header.indexOf(name)]);
    let sum = 0;
    lists.forEach((_, index) => { const value = integer(row[firstListColumn + index]); votes[index] += value; sum += value; });
    rowsWhereValidEqualsSum += countColumns.some((name) => integer(row[header.indexOf(name)]) === sum) ? 1 : 0;
  }
  return { stations: rows.length, lists, votes, counts, rowsWhereValidEqualsSum };
}

/** "constituency|station" keys of a station-level file, plus the range of the last column when it is a submission stamp. */
export function stationIndex(text, delimiter, constituencyColumn, stationColumn) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const header = parseCsvLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter));
  const stamps = header.at(-1).trim() === "Data trimiterii Procesului-verbal" ? rows.map((row) => row.at(-1)).filter((value) => /^\d{8}_/.test(value)).sort() : [];
  return { keys: rows.map((row) => `${row[constituencyColumn].trim()}|${row[stationColumn].trim()}`), stamp_column: stamps.length ? header.at(-1).trim() : null, first_stamp: stamps[0] ?? null, last_stamp: stamps.at(-1) ?? null };
}

function readMandates(file) {
  const dir = fs.mkdtempSync(path.join(stage, "xlsx-"));
  try {
    execFileSync("unzip", ["-o", "-q", file, "xl/sharedStrings.xml", "xl/worksheets/sheet1.xml", "-d", dir]);
    const strings = [...fs.readFileSync(path.join(dir, "xl/sharedStrings.xml"), "utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(""));
    const rows = [...fs.readFileSync(path.join(dir, "xl/worksheets/sheet1.xml"), "utf8").matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) => Object.fromEntries([...r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map((c) => { const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] ?? ""); return [c[1], v ? (/t="s"/.test(c[2]) ? strings[Number(v[1])] : v[1]) : ""]; })));
    const header = rows[0];
    const columns = Object.keys(header).filter((column) => !["A", "B"].includes(column));
    const seats = Object.fromEntries(columns.map((column) => [header[column].trim(), 0]));
    let constituencies = 0;
    for (const row of rows.slice(1)) { if (!/^\d+$/.test(row.A ?? "")) continue; constituencies += 1; for (const column of columns) seats[header[column].trim()] += integer(row[column] ?? ""); }
    return { seats, constituencies };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = Object.fromEntries(Object.entries(SOURCES).map(([key, source]) => [key, need(source.file)]));
  // Licence basis: the Atlas election source registry (audit of the data.gov.ro package), plus the staged licence page.
  // The portal's /api/ path is disallowed by its robots.txt and is not used.
  const registry = JSON.parse(fs.readFileSync(path.join(root, "docs/political-data/national_election_source_registry.json"), "utf8")).countries.find((country) => country.country === "romania");
  const registered = registry.result_sources.find((source) => source.url === "https://data.gov.ro/dataset/alegeri_parlamentare_2016");
  const licenceOk = registered?.licence === "OGL-ROU-1.0" && registry.licensing.status.startsWith("verified_open_licence");
  // The staged licence page itself (read locally) must name the licence; this is the document-level check.
  const licenceText = fs.readFileSync(files.licence, "utf8").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const licencePage = {
    names_ogl_rou_1_0: /OGL ROU 1\.0|OGL-ROU-1\.0/.test(licenceText),
    names_issuer_general_secretariat_2014: /emis\S* \S*n 2014 de Secretariatul General al Guvernului/.test(licenceText),
    recommends_cc_by_4_0_since_2020: /Creative Commons Atribuire 4\.0/.test(licenceText),
    cites_law_179_2022_reuse: /Legii nr\.\s?179/.test(licenceText),
    note: "Read from the staged data.gov.ro licence page. The package itself is recorded under OGL-ROU-1.0; the page says the portal integrated OGL ROU 1.0, issued in 2014 by the Government's General Secretariat, and has recommended CC BY 4.0 since July 2020.",
  };
  const metadata = { license_id: "OGL-ROU-1.0", license_title: registered?.licence ?? null, license_url: SOURCES.licence.url, organization: { title: "Autoritatea Electorală Permanentă" }, name: "alegeri_parlamentare_2016", basis: "Atlas national_election_source_registry.json (verified_live package metadata) and the staged licence page" };
  const main = sumStations(new TextDecoder("utf-16le").decode(fs.readFileSync(files.results)).replace(/^﻿/, ""), ",", 20, ["a", "a1", "a2", "a3", "b", "b1", "b2", "b3", "c", "d", "e", "f", "g"], 1);
  const postal = sumStations(new TextDecoder("windows-1250").decode(fs.readFileSync(files.postal)), ";", 15, ["a", "b", "b1", "b2", "c", "c1", "c2", "d", "d1", "d2"]);
  const mandates = readMandates(files.mandates);
  const mainIndex = stationIndex(new TextDecoder("utf-16le").decode(fs.readFileSync(files.results)).replace(/^\uFEFF/, ""), ",", 2, 4);
  const postalIndex = stationIndex(new TextDecoder("windows-1250").decode(fs.readFileSync(files.postal)), ";", 1, 3);

  const postalByKey = new Map(postal.lists.map((label, index) => [labelKey(label), postal.votes[index]]));
  const seatByKey = new Map(Object.entries(mandates.seats).map(([label, count]) => [labelKey(label), count]));
  const matchedPostal = new Set(), matchedSeats = new Set();
  const lists = [];
  let independentVotes = 0, independentCount = 0;
  main.lists.forEach((label, index) => {
    const key = labelKey(label);
    const postalVotes = postalByKey.get(key) ?? 0;
    if (postalByKey.has(key)) matchedPostal.add(key);
    if (isIndependent(label)) { independentVotes += main.votes[index] + postalVotes; independentCount += 1; return; }
    if (seatByKey.has(key)) matchedSeats.add(key);
    lists.push({ native_label: label, votes_in_country_and_abroad_stations: main.votes[index], votes_postal: postalVotes, votes: main.votes[index] + postalVotes, seats_from_constituency_allocation_file: seatByKey.get(key) ?? null });
  });
  const validVotes = lists.reduce((total, list) => total + list.votes, 0) + independentVotes;
  lists.sort((a, b) => b.votes - a.votes);
  lists.forEach((list, index) => { list.contestant_id = `ct-ro-cd-2016-${String(index + 1).padStart(3, "0")}`; list.derived_vote_share = (100 * list.votes) / validVotes; list.continuous_series_eligible = false; list.party_relation_status = "requires_manual_review"; });
  const listSeats = lists.reduce((total, list) => total + (list.seats_from_constituency_allocation_file ?? 0), 0);

  const checks = {
    licence_recorded_as_ogl_rou_in_atlas_registry: licenceOk,
    licence_page_names_ogl_rou_1_0: licencePage.names_ogl_rou_1_0,
    every_postal_list_matches_a_results_list: postal.lists.every((label) => matchedPostal.has(labelKey(label))),
    every_seat_winning_list_matches_a_results_list: Object.keys(mandates.seats).every((label) => matchedSeats.has(labelKey(label))),
    main_file_column_e_equals_sum_of_list_votes: main.counts.e === main.votes.reduce((a, b) => a + b, 0),
    main_file_column_b_equals_e_plus_f_plus_g: main.counts.b === main.counts.e + main.counts.f + main.counts.g,
    postal_file_column_d1_equals_sum_of_list_votes: postal.counts.d1 === postal.votes.reduce((a, b) => a + b, 0),
    constituencies_in_allocation_file: mandates.constituencies,
    station_keys_unique_in_station_file: new Set(mainIndex.keys).size === mainIndex.keys.length,
    postal_bureau_not_in_station_file: postalIndex.keys.every((key) => !mainIndex.keys.includes(key)),
  };
  const open = [
    "Election date 2016-12-11 is taken from the Atlas registry (harmonised secondary source); it must be reconciled against an official act before production.",
    "The meaning of count columns a/b/e/f/g (main file) and a/b/d1 (postal file) is inferred from arithmetic identities in the data, not from a published codebook; turnout stays unpublished until the column definitions are confirmed from an official document.",
    "The constituency allocation file lists seats for threshold-passing lists only. Seats of national-minority organisations (allocated under special rules) and the total size of the Chamber are not in the staged files.",
    "No official published national vote shares are in the staged files; shares in this package are Atlas-derived (votes / valid votes × 100).",
    "Independent candidates are aggregated; candidate-level rows are excluded by the person-safety rules.",
    "Cross-election party identity is not established: every list is election-specific.",
    "The 2012 election used single-member colleges; its files are verified and staged (XLS) but not parsed. It must not be combined with 2016 as one series.",
  ];
  const candidate = {
    schema_version: "atlas-political-candidate-romania-v1",
    state: "candidate_not_authorised_for_production",
    boundary: "Staging artefact. Not canonical political data, not published on the site, not selectable in the Political Explorer. Promotion requires explicit owner authorisation and an updated political source registry.",
    country: "romania", chamber: "Camera Deputaților", election_id: "el-ro-cd-2016-12-11", election_date: { value: "2016-12-11", basis: "atlas_registry_harmonised_to_reconcile" },
    electoral_system_note: "2016: closed-list proportional representation in 43 constituencies (per the Atlas registry, to be verified against Law 208/2015). Not comparable as a series with the 2008/2012 single-member-college elections.",
    licence: { id: metadata.license_id, title: metadata.license_title, url: metadata.license_url, publisher: metadata.organization?.title ?? null, package: metadata.name, basis: metadata.basis, licence_page: licencePage },
    sources: Object.fromEntries(Object.entries(SOURCES).map(([key, source]) => [key, { ...source, sha256: sha(files[key]), bytes: fs.statSync(files[key]).size }])),
    national: {
      polling_stations_summed: main.stations, postal_vote_bureaus_summed: postal.stations,
      valid_votes_derived: validVotes,
      counts_main_file: main.counts, counts_postal_file: postal.counts,
      turnout: { published: null, derived: null, status: "requires_manual_review_column_definitions_unconfirmed" },
      seats_allocated_in_constituency_file: listSeats, total_chamber_seats: null, minority_organisation_seats: null,
      independent_candidates: { count: independentCount, votes: independentVotes, note: "aggregate only; names are not carried" },
      minutes_submission_stamps: { column: mainIndex.stamp_column, first: mainIndex.first_stamp, last: mainIndex.last_stamp, note: "when station minutes were transmitted, as recorded in the source file; not the election date" },
    },
    lists,
    consistency_checks: checks,
    open_issues: open,
  };
  fs.mkdirSync(path.join(stage, "candidate", "stores"), { recursive: true });
  fs.writeFileSync(path.join(stage, "candidate", "romania_cd_2016_candidate.json"), `${JSON.stringify(candidate, null, 2)}\n`);

  // The same candidate in the political store schema (as used by src/data/political/germany/), so that an authorised
  // promotion is a reviewed copy rather than a re-modelling. Still staging only. Unknown values stay null.
  const parserSha = sha(fileURLToPath(import.meta.url));
  const provenance = (key, recordId) => [{ source_id: `src-ro-aep-2016-${key}`, source_url: SOURCES[key].url, source_record_id: recordId, staged_file_mtime: fs.statSync(files[key]).mtime.toISOString(), raw_snapshot: { path: `staging:raw/${SOURCES[key].file}`, sha256: candidate.sources[key].sha256 }, parser_version: "romania-candidate-v1", parser_sha256: parserSha }];
  const electionId = candidate.election_id, systemId = "es-ro-cd-2016", legislatureId = "lg-ro-cd-2016";
  const stores = {
    elections: [{ election_id: electionId, country: "romania", election_type: "national_parliament", chamber: "Camera Deputaților", date: "2016-12-11", date_basis: "atlas_registry_harmonised_to_reconcile", year: 2016, legislature_id: legislatureId, electoral_system_id: systemId, result_status: "candidate_unreconciled", result_vintage: "AEP centralisation export (source file stamped 2016-12-14)", later_poll_date: null, repeat_poll_date: null, provenance: provenance("results", "file header") }],
    election_turnout: [{ election_id: electionId, country: "romania", geography: "national", vote_type: "chamber_list_vote", result_vintage: "AEP centralisation export (source file stamped 2016-12-14)", eligible_voters: null, voters: null, valid_votes: validVotes, invalid_votes: null, published_turnout: null, derived_turnout: null, turnout_definition: "not established: the meaning of the source count columns is unconfirmed, so no turnout is derived", valid_votes_basis: "derived: sum of list and independent-candidate votes over all polling stations plus the postal-vote bureau; equals the main file's own valid-vote column for in-person stations", provenance: [...provenance("results", `sum of ${main.stations} station rows`), ...provenance("postal", `sum of ${postal.stations} postal bureau row(s)`)] }],
    electoral_contestants: lists.map((list) => ({ contestant_id: list.contestant_id, country: "romania", election_id: electionId, contestant_kind: "not_classified", contestant_kind_note: "party list, electoral alliance or national-minority organisation not distinguished: requires the official BEC list of competitors", registered_label_native: list.native_label, historical_display_label: list.native_label, lead_party_id: null, party_relation_status: "requires_manual_review", continuous_series_eligible: false, provenance: provenance("results", `column "${list.native_label}"`) })),
    election_results: lists.map((list) => ({ result_id: `er-${list.contestant_id}`, country: "romania", geography: "national", election_id: electionId, contestant_ref: list.contestant_id, vote_type: "chamber_list_vote", valid_votes: validVotes, total_seats: null, votes: list.votes, published_vote_share: null, derived_vote_share: list.derived_vote_share, seats: list.seats_from_constituency_allocation_file, seats_basis: list.seats_from_constituency_allocation_file === null ? "not in the constituency allocation file; national-minority seats are allocated separately and are not established here" : "sum over 43 constituencies in the official allocation file", derived_seat_share: null, result_vintage: "AEP centralisation export (source file stamped 2016-12-14)", provenance: [...provenance("results", `column "${list.native_label}"`), ...(list.votes_postal ? provenance("postal", `column "${list.native_label}"`) : []), ...(list.seats_from_constituency_allocation_file === null ? [] : provenance("mandates", `column "${list.native_label}"`))] })),
    aggregate_rows_not_contestants: [{ kind: "independent_candidates_aggregate", election_id: electionId, count: independentCount, votes: independentVotes, note: "included in valid votes; individual candidates are not stored" }],
    legislatures: [{ legislature_id: legislatureId, country: "romania", chamber: "Camera Deputaților", official_term: null, election_id: electionId, total_seats: null, seats_allocated_in_constituency_file: listSeats, seat_count_basis: "total not established: constituency allocation file only; national-minority seats missing", result_vintage: "AEP centralisation export (source file stamped 2016-12-14)", start_date: null, end_date: null, date_status: "not_acquired_not_asserted", provenance: provenance("mandates", "sheet 1") }],
    electoral_systems: [{ electoral_system_id: systemId, country: "romania", election_id: electionId, valid_from: "2016-12-11", valid_to: "2016-12-11", interval_basis: "election-specific rule observation, not legal enactment dates", system_family: "list proportional representation (per Atlas registry; to verify against Law 208/2015)", vote_type: "chamber_list_vote", allocation_method: "not established from the staged files", base_seats: null, rules_status: "background_to_verify", notes: { en: "Chamber of Deputies only. List proportional representation in 43 constituencies (41 counties, Bucharest and the diaspora), per the Atlas source registry. Thresholds and the separate allocation of seats to national-minority organisations are recorded in the registry as still to be verified against Law 208/2015. Not comparable as one series with the 2008 and 2012 elections, which used single-member colleges.", "zh-CN": "仅限众议院。根据 Atlas 来源登记，采用 43 个选区（41 个县、布加勒斯特和海外选区）的名单比例代表制。门槛以及少数民族组织席位的单独分配，在登记中仍标为待依据第 208/2015 号法律核实。不能与采用单一选区制的 2008 年和 2012 年选举作为同一序列比较。" }, provenance: provenance("mandates", "sheet 1") }],
    political_source_registry: ["results", "postal", "mandates", "licence"].map((key) => ({ source_id: `src-ro-aep-2016-${key}`, country: "romania", institution: "Autoritatea Electorală Permanentă (publisher on data.gov.ro)", dataset: SOURCES[key].title, tier: "tier1_official", url: SOURCES[key].url, licence_status: "open_licence_recorded_in_atlas_registry_not_production_authorised", raw_redistribution: "not_assessed", licence_url: SOURCES.licence.url, attribution: "Autoritatea Electorală Permanentă, data.gov.ro, OGL-ROU-1.0", retrieved_at: fs.statSync(files[key]).mtime.toISOString(), raw_sha256: candidate.sources[key].sha256, raw_path: `staging:raw/${SOURCES[key].file}` })),
  };
  // Official evidence staged by the owner (if any) resolves blocking facts; without it every blocked field stays blocked.
  const evidence = loadEvidence(stage);
  const applied = applyEvidence(stores, evidence);
  Object.assign(stores, applied.stores);
  const ready = readiness({ stores, evidence, log: applied.log, checks });
  fs.writeFileSync(path.join(stage, "candidate", "publication_readiness.json"), `${JSON.stringify(ready, null, 2)}\n`);
  const readinessOut = option("--readiness-out");
  if (readinessOut) fs.writeFileSync(path.resolve(root, readinessOut), `${JSON.stringify({ ...ready, generated_from: "scripts/political-data/romania/build-candidate.mjs over owner-staged official files; source checksums in romania_candidate_status.json" }, null, 2)}\n`);
  for (const [name, rows] of Object.entries(stores)) fs.writeFileSync(path.join(stage, "candidate", "stores", `${name}.json`), `${JSON.stringify(rows, null, 2)}\n`);
  const statusOut = option("--status-out");
  if (statusOut) {
    const status = { schema_version: "atlas-political-candidate-status-v1", country: "romania", state: candidate.state, boundary: candidate.boundary, election_id: candidate.election_id, licence: candidate.licence, sources: candidate.sources, also_verified_not_parsed: { package: "alegeri-pentru-camera-deputatilor-si-senat-2012", licence: "OGL-ROU-1.0", publisher: "Autoritatea Electorală Permanentă", note: "2012 files are XLS / station-level CSV for single-member colleges; staged but not parsed." }, summary: { lists: lists.length, seat_winning_lists_in_allocation_file: lists.filter((list) => list.seats_from_constituency_allocation_file).length, seats_allocated_in_constituency_file: listSeats, valid_votes_derived: validVotes, independent_candidates_aggregated: independentCount, polling_stations_summed: main.stations }, consistency_checks: checks, open_issues: open, builder: "scripts/political-data/romania/build-candidate.mjs", candidate_package: "staged locally under .tmp-data-refresh/political-candidate-romania/candidate/ (gitignored); rebuild from the listed official files" };
    fs.writeFileSync(path.resolve(root, statusOut), `${JSON.stringify(status, null, 2)}\n`);
  }
  console.log(JSON.stringify({ lists: lists.length, valid_votes: validVotes, list_seats: listSeats, independents: independentCount, checks }, null, 1));
  console.log(lists.slice(0, 8).map((list) => `${list.native_label}: ${list.votes} (${list.derived_vote_share.toFixed(2)}%) seats ${list.seats_from_constituency_allocation_file ?? "—"}`).join("\n"));
}
