// Validates the staged Romania candidate stores (read-only). Exit 0 = candidate is internally consistent; this is not
// a production authorisation, and the listed blocking items remain open whatever the result.
// Usage: node scripts/political-data/romania/validate-candidate.mjs [--stage <dir>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** Returns { failures, blocking } for a candidate store set. Pure, so tests can feed fixtures. */
export function validateCandidate(stores) {
  const failures = [], check = (ok, message) => { if (!ok) failures.push(message); };
  const [election] = stores.elections, [turnout] = stores.election_turnout, [legislature] = stores.legislatures, [system] = stores.electoral_systems;
  check(stores.elections.length === 1 && /^el-ro-cd-\d{4}-\d{2}-\d{2}$/.test(election.election_id), "one Chamber election with a well-formed identifier");
  check(election.election_id.endsWith(election.date) && election.year === Number(election.date.slice(0, 4)), "election identifier, date and year agree");
  check(election.chamber === "Camera Deputaților" && !/senat/i.test(JSON.stringify(stores)), "Chamber of Deputies only; no Senate data");
  check(election.legislature_id === legislature.legislature_id && election.electoral_system_id === system.electoral_system_id, "election links to its legislature and system");
  const ids = stores.electoral_contestants.map((row) => row.contestant_id);
  check(new Set(ids).size === ids.length, "contestant identifiers are unique");
  check(stores.election_results.length === ids.length && stores.election_results.every((row) => ids.includes(row.contestant_ref) && row.election_id === election.election_id), "one result per contestant, same election");
  check(stores.electoral_contestants.every((row) => row.continuous_series_eligible === false && row.lead_party_id === null && row.registered_label_native === row.historical_display_label), "original labels kept; no party identity or continuity asserted");
  check(!/CANDIDAT INDEPENDENT -/i.test(JSON.stringify(stores)), "no individual candidate names");
  const independents = stores.aggregate_rows_not_contestants.reduce((total, row) => total + row.votes, 0);
  const listVotes = stores.election_results.reduce((total, row) => total + row.votes, 0);
  check(Number.isSafeInteger(turnout.valid_votes) && listVotes + independents === turnout.valid_votes, "list votes plus the independent aggregate equal valid votes");
  check(stores.election_results.every((row) => row.valid_votes === turnout.valid_votes && Number.isSafeInteger(row.votes) && row.votes >= 0 && row.votes <= row.valid_votes), "every result uses the national denominator");
  check(stores.election_results.every((row) => Math.abs(row.derived_vote_share - (100 * row.votes) / row.valid_votes) < 1e-9), "derived shares are computed as list votes ÷ valid list votes × 100");
  const shareSum = stores.election_results.reduce((total, row) => total + row.derived_vote_share, 0) + (100 * independents) / turnout.valid_votes;
  check(Math.abs(shareSum - 100) < 1e-6, "derived shares plus the independent aggregate sum to 100");
  const seats = stores.election_results.reduce((total, row) => total + (row.seats ?? 0), 0);
  check(seats === legislature.seats_allocated_in_constituency_file, "list seats equal the constituency allocation total");
  check(stores.election_results.every((row) => row.seats === null || (Number.isSafeInteger(row.seats) && row.seats > 0)), "a list without allocated seats is missing, not zero");
  const evidenced = (value, evidence) => value === null || value === undefined || Boolean(evidence?.document_id && evidence?.locator);
  check(evidenced(legislature.total_seats, legislature.total_seats_evidence), "a Chamber size is asserted only with an official document");
  check(legislature.total_seats === null || legislature.total_seats >= seats + (stores.minority_representation ?? []).reduce((total, row) => total + row.seats, 0), "the Chamber size covers list and minority seats");
  check(stores.election_results.every((row) => row.total_seats === null && row.derived_seat_share === null), "no seat share is derived from a partial seat total");
  check(evidenced(turnout.published_turnout, turnout.published_turnout_evidence) && turnout.derived_turnout === null && turnout.eligible_voters === null && turnout.voters === null, "turnout is published only from an official document and never derived from undocumented columns");
  check(stores.election_results.every((row) => evidenced(row.published_vote_share, row.published_vote_share_evidence)), "a published share always cites an official document");
  const minorityLabels = new Set((stores.minority_representation ?? []).map((row) => row.organisation_label_native));
  check((stores.minority_representation ?? []).every((row) => Number.isSafeInteger(row.seats) && row.seats > 0 && row.evidence?.document_id), "minority seats are integers and cite an official document");
  check(stores.election_results.every((row) => !minorityLabels.has(stores.electoral_contestants.find((c) => c.contestant_id === row.contestant_ref)?.registered_label_native) || row.seats === null || row.seats_basis?.startsWith("sum over")), "minority-organisation seats are kept out of the list results");
  check(election.date_basis !== "official_document" || Boolean(election.date_evidence?.document_id), "an official date cites its document");
  check(election.result_status === "candidate_unreconciled", "result status is candidate, not final");
  const sourceIds = new Set(stores.political_source_registry.map((row) => row.source_id));
  const provenance = [...stores.elections, ...stores.election_turnout, ...stores.electoral_contestants, ...stores.election_results, ...stores.legislatures, ...stores.electoral_systems].flatMap((row) => row.provenance);
  check(provenance.length > 0 && provenance.every((p) => sourceIds.has(p.source_id) && /^[0-9a-f]{64}$/.test(p.raw_snapshot.sha256) && /^[0-9a-f]{64}$/.test(p.parser_sha256)), "every record carries registered provenance with checksums");
  check(stores.political_source_registry.every((row) => row.licence_url && /OGL-ROU-1\.0/.test(row.attribution) && /not_production_authorised/.test(row.licence_status)), "licence recorded; not production-authorised");
  const blocking = [
    "election date not reconciled against an official act",
    "contestant kinds (party list / alliance / national-minority organisation) not classified from an official BEC list",
    "total Chamber seats and national-minority seats not established",
    "no official published national vote shares in the staged files",
    "turnout: count-column definitions unconfirmed",
    "seat-allocation rules and thresholds not verified against Law 208/2015",
    "owner authorisation for Romania as a production country not given",
  ];
  return { failures, blocking };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dir = path.join(path.resolve(root, args.includes("--stage") ? args[args.indexOf("--stage") + 1] : ".tmp-data-refresh/political-candidate-romania"), "candidate", "stores");
  if (!fs.existsSync(dir)) { console.error(`no staged candidate stores at ${path.relative(root, dir)}; run build-candidate.mjs with owner-staged files first`); process.exit(1); }
  const stores = Object.fromEntries(fs.readdirSync(dir).filter((name) => name.endsWith(".json")).map((name) => [name.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"))]));
  const { failures, blocking } = validateCandidate(stores);
  console.log(JSON.stringify({ status: failures.length ? "fail" : "internally_consistent_candidate", failures, production_ready: false, blocking_items: blocking, contestants: stores.electoral_contestants.length, valid_votes: stores.election_turnout[0].valid_votes, list_seats: stores.legislatures[0].seats_allocated_in_constituency_file }, null, 1));
  process.exit(failures.length ? 1 : 0);
}
