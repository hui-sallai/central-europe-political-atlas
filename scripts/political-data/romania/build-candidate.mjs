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
  const metadata = { license_id: "OGL-ROU-1.0", license_title: registered?.licence ?? null, license_url: SOURCES.licence.url, organization: { title: "Autoritatea Electorală Permanentă" }, name: "alegeri_parlamentare_2016", basis: "Atlas national_election_source_registry.json (verified_live package metadata) and the staged licence page" };
  const main = sumStations(new TextDecoder("utf-16le").decode(fs.readFileSync(files.results)).replace(/^﻿/, ""), ",", 20, ["a", "a1", "a2", "a3", "b", "b1", "b2", "b3", "c", "d", "e", "f", "g"], 1);
  const postal = sumStations(new TextDecoder("windows-1250").decode(fs.readFileSync(files.postal)), ";", 15, ["a", "b", "b1", "b2", "c", "c1", "c2", "d", "d1", "d2"]);
  const mandates = readMandates(files.mandates);

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
    every_postal_list_matches_a_results_list: postal.lists.every((label) => matchedPostal.has(labelKey(label))),
    every_seat_winning_list_matches_a_results_list: Object.keys(mandates.seats).every((label) => matchedSeats.has(labelKey(label))),
    main_file_valid_votes_e_equals_sum_of_list_votes: main.counts.e === main.votes.reduce((a, b) => a + b, 0),
    main_file_voters_b_equals_e_plus_f_plus_g: main.counts.b === main.counts.e + main.counts.f + main.counts.g,
    postal_valid_votes_d1_equals_sum_of_list_votes: postal.counts.d1 === postal.votes.reduce((a, b) => a + b, 0),
    constituencies_in_allocation_file: mandates.constituencies,
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
    licence: { id: metadata.license_id, title: metadata.license_title, url: metadata.license_url, publisher: metadata.organization?.title ?? null, package: metadata.name, basis: metadata.basis },
    sources: Object.fromEntries(Object.entries(SOURCES).map(([key, source]) => [key, { ...source, sha256: sha(files[key]), bytes: fs.statSync(files[key]).size }])),
    national: {
      polling_stations_summed: main.stations, postal_vote_bureaus_summed: postal.stations,
      valid_votes_derived: validVotes,
      counts_main_file: main.counts, counts_postal_file: postal.counts,
      turnout: { published: null, derived: null, status: "requires_manual_review_column_definitions_unconfirmed" },
      seats_allocated_in_constituency_file: listSeats, total_chamber_seats: null, minority_organisation_seats: null,
      independent_candidates: { count: independentCount, votes: independentVotes, note: "aggregate only; names are not carried" },
    },
    lists,
    consistency_checks: checks,
    open_issues: open,
  };
  fs.mkdirSync(path.join(stage, "candidate"), { recursive: true });
  fs.writeFileSync(path.join(stage, "candidate", "romania_cd_2016_candidate.json"), `${JSON.stringify(candidate, null, 2)}\n`);
  const statusOut = option("--status-out");
  if (statusOut) {
    const status = { schema_version: "atlas-political-candidate-status-v1", country: "romania", state: candidate.state, boundary: candidate.boundary, election_id: candidate.election_id, licence: candidate.licence, sources: candidate.sources, also_verified_not_parsed: { package: "alegeri-pentru-camera-deputatilor-si-senat-2012", licence: "OGL-ROU-1.0", publisher: "Autoritatea Electorală Permanentă", note: "2012 files are XLS / station-level CSV for single-member colleges; staged but not parsed." }, summary: { lists: lists.length, seat_winning_lists_in_allocation_file: lists.filter((list) => list.seats_from_constituency_allocation_file).length, seats_allocated_in_constituency_file: listSeats, valid_votes_derived: validVotes, independent_candidates_aggregated: independentCount, polling_stations_summed: main.stations }, consistency_checks: checks, open_issues: open, builder: "scripts/political-data/romania/build-candidate.mjs", candidate_package: "staged locally under .tmp-data-refresh/political-candidate-romania/candidate/ (gitignored); rebuild from the listed official files" };
    fs.writeFileSync(path.resolve(root, statusOut), `${JSON.stringify(status, null, 2)}\n`);
  }
  console.log(JSON.stringify({ lists: lists.length, valid_votes: validVotes, list_seats: listSeats, independents: independentCount, checks }, null, 1));
  console.log(lists.slice(0, 8).map((list) => `${list.native_label}: ${list.votes} (${list.derived_vote_share.toFixed(2)}%) seats ${list.seats_from_constituency_allocation_file ?? "—"}`).join("\n"));
}
