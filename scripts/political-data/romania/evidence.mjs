// Romania candidate — official evidence intake and publication readiness (pure functions + one file reader).
//
// Blocking facts (official election date, meaning of the count columns, turnout definition, Chamber size, national-
// minority seats, published vote shares, corrections) can only be resolved from official documents that the owner
// stages under <stage>/evidence/ together with evidence.json. A fact is accepted only if it cites a staged document whose
// SHA-256 matches; anything else is reported as rejected and the field stays unresolved. Arithmetic identities in the data
// never resolve a definition. Nothing here fetches from the network.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DOCUMENT_KINDS = ["election_date_act", "minutes_form_definition", "final_results", "minority_seat_allocation", "chamber_composition", "electoral_law", "correction"];
export const MAIN_COLUMNS = ["a", "a1", "a2", "a3", "b", "b1", "b2", "b3", "c", "d", "e", "f", "g"];
export const POSTAL_COLUMNS = ["a", "b", "b1", "b2", "c", "c1", "c2", "d", "d1", "d2"];
// Roles a column may be documented to carry; only these are used for national reconciliation.
export const COLUMN_ROLES = ["eligible_voters", "voters", "valid_votes", "invalid_votes", "blank_votes", "other"];

const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

/** Reads <stage>/evidence/evidence.json and verifies each cited document against the staged file. */
export function loadEvidence(stage) {
  const dir = path.join(stage, "evidence"), file = path.join(dir, "evidence.json");
  if (!fs.existsSync(file)) return { present: false, documents: {}, facts: {}, rejected: [] };
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const documents = {}, rejected = [];
  for (const doc of manifest.documents ?? []) {
    const staged = doc.file ? path.join(dir, path.basename(doc.file)) : null;
    const problem = !DOCUMENT_KINDS.includes(doc.kind) ? `unknown document kind ${doc.kind}`
      : !doc.issuer || !doc.title ? "issuer and title are required"
      : !staged || !fs.existsSync(staged) ? "document file is not staged"
      : sha(staged) !== doc.sha256 ? "sha256 does not match the staged file"
      : !doc.reuse_basis ? "reuse basis is required" : null;
    if (problem) rejected.push({ document: doc.id ?? null, reason: problem });
    else documents[doc.id] = { ...doc, sha256: doc.sha256 };
  }
  return { present: true, documents, facts: manifest.facts ?? {}, rejected };
}

/** A fact is usable only when it cites an accepted document and a locator (page, table, article). */
export function cited(evidence, fact) {
  return Boolean(fact && fact.document_id && evidence.documents[fact.document_id] && fact.locator);
}

/**
 * Applies accepted facts to the candidate stores (returns new stores and a log). Unaccepted facts are logged and ignored.
 * Minority-organisation seats go to their own store and never into the party-list results.
 */
export function applyEvidence(stores, evidence) {
  const out = structuredClone(stores), log = [];
  const accept = (name, fact, apply) => { if (!fact) return; if (cited(evidence, fact)) { apply(fact); log.push({ fact: name, status: "applied", document_id: fact.document_id, locator: fact.locator }); } else log.push({ fact: name, status: "rejected_uncited_or_unverified" }); };
  const facts = evidence.facts ?? {};
  const [election] = out.elections, [turnout] = out.election_turnout, [legislature] = out.legislatures;
  accept("election_date", facts.election_date, (fact) => {
    if (fact.value !== election.date) log.push({ fact: "election_date", status: "conflict", registry: election.date, official: fact.value });
    else { election.date_basis = "official_document"; election.date_evidence = { document_id: fact.document_id, locator: fact.locator }; }
  });
  const definitions = { main: {}, postal: {} };
  for (const file of ["main", "postal"]) for (const [column, fact] of Object.entries(facts.column_definitions?.[file] ?? {})) {
    accept(`column_definition:${file}:${column}`, fact, () => { if (COLUMN_ROLES.includes(fact.role)) definitions[file][column] = { role: fact.role, meaning: fact.meaning, document_id: fact.document_id, locator: fact.locator }; });
  }
  turnout.column_definitions = definitions;
  accept("turnout_definition", facts.turnout_definition, (fact) => { turnout.turnout_definition = fact.text; turnout.turnout_definition_evidence = { document_id: fact.document_id, locator: fact.locator }; });
  accept("published_turnout", facts.published_turnout, (fact) => { turnout.published_turnout = fact.value; turnout.published_turnout_evidence = { document_id: fact.document_id, locator: fact.locator }; });
  accept("total_chamber_seats", facts.total_chamber_seats, (fact) => { legislature.total_seats = fact.value; legislature.total_seats_evidence = { document_id: fact.document_id, locator: fact.locator }; });
  out.minority_representation = [];
  for (const [index, fact] of (facts.minority_seats ?? []).entries()) accept(`minority_seat:${index}`, fact, () => out.minority_representation.push({ election_id: election.election_id, organisation_label_native: fact.organisation_label_native, seats: fact.seats, allocation_basis: fact.allocation_basis ?? null, evidence: { document_id: fact.document_id, locator: fact.locator } }));
  for (const [index, fact] of (facts.published_vote_shares ?? []).entries()) accept(`published_vote_share:${index}`, fact, () => {
    const row = out.election_results.find((result) => out.electoral_contestants.find((c) => c.contestant_id === result.contestant_ref)?.registered_label_native === fact.list_label_native);
    if (row) { row.published_vote_share = fact.value; row.published_vote_share_evidence = { document_id: fact.document_id, locator: fact.locator }; } else log.push({ fact: `published_vote_share:${index}`, status: "no_matching_list_label" });
  });
  out.corrections = (facts.corrections ?? []).filter((fact) => cited(evidence, fact)).map((fact) => ({ description: fact.description, evidence: { document_id: fact.document_id, locator: fact.locator } }));
  // Turnout may be derived only when both columns are documented and a turnout definition is documented.
  const role = (r) => Object.entries(definitions.main).find(([, d]) => d.role === r)?.[0];
  if (role("eligible_voters") && role("voters") && turnout.turnout_definition_evidence) turnout.derived_turnout_inputs = { eligible_column: role("eligible_voters"), voters_column: role("voters") };
  return { stores: out, log };
}

/** Field-level readiness. "publishable" means technically supported by official evidence; it is not authorisation. */
export function readiness({ stores, evidence, log, checks }) {
  const [election] = stores.elections, [turnout] = stores.election_turnout, [legislature] = stores.legislatures;
  const field = (name, resolved, basis, blocker) => ({ field: name, status: resolved ? "publishable_pending_authorisation" : "blocked", basis: resolved ? basis : null, blocker: resolved ? null : blocker });
  const sharesPublished = stores.election_results.filter((row) => row.published_vote_share !== null).length;
  const fields = [
    field("list_labels_native", true, "official station-level results file (column headers)", null),
    field("list_votes_national", checks.main_file_column_e_equals_sum_of_list_votes && checks.postal_bureau_not_in_station_file, "sum of all station rows plus the separate postal-vote bureau; no bureau counted twice", "vote totals do not reconcile"),
    field("derived_vote_share", true, "Atlas-derived: list votes ÷ valid list votes (lists + independent aggregate) × 100", null),
    field("published_vote_share", sharesPublished === stores.election_results.length, "official final results document", `${sharesPublished}/${stores.election_results.length} lists have a published share from an accepted official document`),
    field("list_seats_from_constituency_allocation", checks.every_seat_winning_list_matches_a_results_list, "official constituency allocation file", "seat-winning lists do not match result lists"),
    field("election_date", election.date_basis === "official_document", "accepted official document", "date comes from the Atlas registry (harmonised secondary source); needs an official act"),
    field("total_chamber_seats", legislature.total_seats !== null, "accepted official document", "complete Chamber size is not established; 312 is only the constituency-file total"),
    field("minority_representation", (stores.minority_representation ?? []).length > 0, "accepted official document", "national-minority organisation seats are not in the staged files"),
    field("count_column_definitions", ["valid_votes", "voters", "eligible_voters"].every((r) => Object.values(turnout.column_definitions?.main ?? {}).some((d) => d.role === r)), "accepted official definition of the minutes form", "meaning of a/b/e/f/g (and postal a/b/d1) not documented by an accepted official source"),
    field("published_turnout", turnout.published_turnout !== null, "accepted official document", "no official national turnout figure staged"),
    field("turnout_definition", Boolean(turnout.turnout_definition_evidence), "accepted official document", "no official turnout definition staged"),
    field("result_vintage_and_corrections", (stores.corrections ?? []).length > 0 || Boolean(evidence.documents && Object.values(evidence.documents).some((doc) => doc.kind === "final_results")), "accepted final-results document", "no official final-results document staged, so later corrections cannot be ruled out"),
    field("contestant_kind", false, null, "party list / alliance / national-minority organisation not classified from an official competitor list"),
  ];
  return {
    schema_version: "atlas-political-publication-readiness-v1",
    country: "romania", election_id: election.election_id, chamber: election.chamber,
    authorisation: { production_authorised: false, registry_authorises: ["germany"], note: "Readiness is technical only. Romania becomes a production country only by an explicit owner decision recorded in the political source registry; this file never grants it." },
    evidence: { manifest_present: evidence.present, accepted_documents: Object.keys(evidence.documents ?? {}).length, rejected_documents: evidence.rejected ?? [], fact_log: log },
    fields,
    summary: { publishable_pending_authorisation: fields.filter((f) => f.status !== "blocked").map((f) => f.field), blocked: fields.filter((f) => f.status === "blocked").map((f) => f.field) },
    technically_ready_for_activation: fields.every((f) => f.status !== "blocked"),
    activation_steps_after_owner_decision: [
      "record the owner's authorisation and Romania's source rows in the political source registry (separate, owner-approved change)",
      "copy the validated candidate stores to src/data/political/romania/ and generate public/research-data/political/romania/ exports under an exact-hash governance record",
      "add Romania to politicalComparisonCountries() in src/lib/politicalData.ts under a UI amendment",
      "re-run the political validators, the candidate validator and the politics UI tests; record Linux baselines",
    ],
  };
}
