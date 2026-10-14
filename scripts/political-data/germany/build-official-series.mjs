// Germany — verified party identity layer from the Federal Returning Officer's own longitudinal table.
//
// The Bundeswahlleiterin's historical results database (btw_ab49_datenbank_ergebnisse.csv, dl-de/by-2-0, already
// archived under docs/political-data/raw/germany/ with its SHA-256) presents each party's national results across
// elections as one row label, with the authority's own notes on earlier party names. This script links each
// election-specific contestant of the canonical Germany stores to such a row only when the national second-vote count
// in the authority's table equals the contestant's official count in that election exactly (one match, no ties).
// Names are never compared. Unmatched or ambiguous contestants stay election-specific and unresolved.
//
// It writes docs/political-data/germany_official_series_links.json (evidence record) and the generated
// src/lib/politicalSeries.ts (links only; values are read from the canonical stores at render time).
// It never writes src/data/** or public/research-data/**, and changes no canonical record.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const RAW = "docs/political-data/raw/germany/2026-10-01T23-20-00-007Z_9efffc24b559679a/results.csv";
const META = "docs/political-data/raw/germany/2026-10-01T23-20-00-007Z_9efffc24b559679a/metadata.json";
const AGGREGATE_ROWS = new Set(["Wahlberechtigte", "Wählende", "ungültige Stimmen", "gültige Stimmen/Sitze insgesamt"]);

/** Semicolon CSV with quoted fields that may contain newlines. */
export function parseDelimited(text, delimiter = ";") {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false; else cell += ch; continue; }
    if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i += 1; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
/** "8.149.124 " → 8149124; "–" or empty → null. German thousands separators only. */
export const germanInteger = (cell) => { const value = (cell ?? "").trim(); if (!/^\d{1,3}(\.\d{3})*$/.test(value)) return null; return Number(value.replaceAll(".", "")); };
export const seriesId = (label) => `ser-de-bwl-${crypto.createHash("sha256").update(label).digest("hex").slice(0, 10)}`;

/** Links contestants to official series rows by exact second-vote equality within the same election year. */
export function linkSeries({ tableRows, contestants, results, elections }) {
  const byYear = new Map(elections.map((e) => [e.year, e.election_id]));
  const resultByContestant = new Map(results.map((r) => [r.contestant_ref, r]));
  const contestantsByElection = new Map();
  for (const c of contestants) { if (!contestantsByElection.has(c.election_id)) contestantsByElection.set(c.election_id, []); contestantsByElection.get(c.election_id).push(c); }
  const series = new Map(), linkedContestants = new Set(), unmatchedRows = [];
  for (const row of tableRows) {
    const electionId = byYear.get(row.year);
    if (!electionId || row.secondVotes === null) continue;
    const candidates = (contestantsByElection.get(electionId) ?? []).filter((c) => resultByContestant.get(c.contestant_id)?.second_votes === row.secondVotes);
    if (candidates.length !== 1) { unmatchedRows.push({ series_label: row.label, year: row.year, second_votes: row.secondVotes, reason: candidates.length ? "ambiguous: several contestants share this count" : "no contestant with this exact count" }); continue; }
    const [contestant] = candidates;
    linkedContestants.add(contestant.contestant_id);
    if (!series.has(row.label)) series.set(row.label, { series_id: seriesId(row.label), authority_series_label: row.label, links: [] });
    series.get(row.label).links.push({ election_id: electionId, year: row.year, contestant_id: contestant.contestant_id, original_ballot_label: contestant.historical_display_label, authority_second_votes: row.secondVotes, authority_note: row.note, authority_published_share: row.share });
  }
  for (const s of series.values()) {
    s.links.sort((a, b) => a.year - b.year);
    // A name change is recorded only where the authority's own note gives an earlier party name. A ballot label that is
    // abbreviated in one election and spelled out in another is not a name change.
    const renamed = s.links.some((link) => /Parteiname/.test(link.authority_note ?? ""));
    s.ballot_label_forms = [...new Set(s.links.map((link) => link.original_ballot_label))];
    s.relationship = s.links.length === 1 ? "single_election" : renamed ? "name_change_documented_by_authority" : "same_organisation_per_authority_series";
    s.verification_status = s.links.length === 1 ? "election_specific" : "verified_official_longitudinal_series";
  }
  const unresolved = contestants.filter((c) => !linkedContestants.has(c.contestant_id)).map((c) => ({ contestant_id: c.contestant_id, election_id: c.election_id, original_ballot_label: c.historical_display_label, reason: "not linked to a row of the authority's longitudinal table by an exact national second-vote count" }));
  return { series: [...series.values()].sort((a, b) => b.links.length - a.links.length || a.authority_series_label.localeCompare(b.authority_series_label)), unresolved, unmatchedRows };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
  const meta = read(META);
  const bytes = fs.readFileSync(path.join(root, RAW));
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");
  if (sha !== meta.sha256) { console.error(`raw table hash mismatch: ${sha} ≠ ${meta.sha256}`); process.exit(1); }
  const rows = parseDelimited(bytes.toString("utf8").replace(/^﻿/, "")).filter((row) => row.length > 6 && !row[0].startsWith("#"));
  // Three header rows: area, vote type, unit. Columns are located by all three, never by position.
  const [header, voteType, unit] = rows;
  const column = (vote, measure) => header.findIndex((name, index) => name.trim() === "Deutschland" && voteType[index].trim() === vote && unit[index].trim() === measure);
  const secondVotesCol = column("Zweitstimmen", "Anzahl"), secondShareCol = column("Zweitstimmen", "%");
  if (secondVotesCol < 0 || secondShareCol < 0) { console.error("unexpected header: Deutschland / Zweitstimmen / Anzahl and % columns not found"); process.exit(1); }
  const tableRows = rows.slice(3).filter((row) => /^\d{4}$/.test(row[1]?.trim() ?? "") && !AGGREGATE_ROWS.has(row[0].trim())).map((row) => ({ label: row[0].trim(), year: Number(row[1]), note: row[2]?.trim() && row[2].trim() !== "–" ? row[2].replace(/\s+/g, " ").trim() : null, secondVotes: germanInteger(row[secondVotesCol]), share: (row[secondShareCol] ?? "").trim() ? Number(row[secondShareCol].trim().replace(",", ".")) : null }));
  const store = (name) => read(`src/data/political/germany/${name}.json`);
  const elections = store("elections"), contestants = store("electoral_contestants"), results = store("election_results");
  // Sanity: the column chosen as second votes reproduces the canonical valid second votes for every election.
  const turnout = store("election_turnout");
  const validRow = rows.slice(3).filter((row) => row[0].trim() === "gültige Stimmen/Sitze insgesamt");
  for (const election of elections) { const row = validRow.find((r) => Number(r[1]) === election.year); const canonical = turnout.find((t) => t.election_id === election.election_id).valid_second_votes; if (germanInteger(row?.[secondVotesCol]) !== canonical) { console.error(`valid second votes ${election.year}: table ${row?.[secondVotesCol]} ≠ canonical ${canonical}`); process.exit(1); } }
  const { series, unresolved, unmatchedRows } = linkSeries({ tableRows, contestants, results, elections });
  const shareMismatch = series.flatMap((s) => s.links.filter((link) => { const r = results.find((x) => x.contestant_ref === link.contestant_id); return link.authority_published_share !== null && r.published_vote_share !== null && Math.abs(link.authority_published_share - r.published_vote_share) > 0.05; }).map((link) => `${s.authority_series_label} ${link.year}`));
  const record = {
    schema_version: "germany-official-series-links-v1",
    state: "verified_identity_layer_presentation_only",
    method: "Each election-specific contestant is linked to a row of the Federal Returning Officer's longitudinal results table only when the table's national second-vote count for that election equals the contestant's official count exactly and uniquely. Labels and names are never compared. The table's own notes on earlier party names are recorded verbatim.",
    evidence_basis: "official_code (identity model): the authority's stable longitudinal row in its own published table. This is the electoral authority's statistical attribution of results to one party across elections, not a party-register or legal-entity determination.",
    source: { source_id: meta.source_id, url: meta.source_url, raw_path: RAW, sha256: sha, retrieved_at: meta.retrieved_at, source_updated_at: meta.source_updated_at, licence: meta.licence.name, attribution: "Die Bundeswahlleiterin, Wiesbaden; dl-de/by-2-0" },
    canonical_stores_changed: false,
    relationship_categories: {
      same_organisation_per_authority_series: "A — the authority presents these elections as one party's results and records no name change",
      name_change_documented_by_authority: "B — one party series whose ballot label changed; the authority's notes record the earlier names",
      electoral_alliance_or_joint_list: "C — none: every canonical contestant 2002–2025 is recorded as a party_list; alliances would never be merged with member parties",
      merger_split_or_succession: "D — none documented in this source; not inferred",
      unresolved: "E — contestants not linked by an exact official count; they stay election-specific",
    },
    series_counts: { multi_election_series: series.filter((s) => s.links.length > 1).length, single_election_rows: series.filter((s) => s.links.length === 1).length, unresolved_contestants: unresolved.length, unmatched_table_rows: unmatchedRows.length, published_share_cross_check_mismatches: shareMismatch },
    series, unresolved, unmatched_table_rows: unmatchedRows,
  };
  fs.writeFileSync(path.join(root, "docs/political-data/germany_official_series_links.json"), `${JSON.stringify(record, null, 1)}\n`);
  const compact = series.filter((s) => s.links.length > 1).map((s) => ({ id: s.series_id, label: s.authority_series_label, relationship: s.relationship, links: s.links.map((l) => ({ electionId: l.election_id, contestantId: l.contestant_id, note: l.authority_note })) }));
  const ts = `// GENERATED by scripts/political-data/germany/build-official-series.mjs. Do not edit by hand.\n// Verified party identity layer: election-specific contestants linked to the Federal Returning Officer's longitudinal\n// results table by exact national second-vote counts (never by name). Values are read from the canonical stores.\n// Evidence: docs/political-data/germany_official_series_links.json.\nexport type OfficialSeriesRelationship = "same_organisation_per_authority_series" | "name_change_documented_by_authority";\nexport type OfficialSeries = { id: string; label: string; relationship: OfficialSeriesRelationship; links: Array<{ electionId: string; contestantId: string; note: string | null }> };\nexport const OFFICIAL_SERIES_SOURCE = ${JSON.stringify({ source_id: meta.source_id, url: meta.source_url, sha256: sha, licence: meta.licence.name })} as const;\nexport const germanOfficialSeries: OfficialSeries[] = ${JSON.stringify(compact, null, 1)};\n`;
  fs.writeFileSync(path.join(root, "src/lib/politicalSeries.ts"), ts);
  console.log(JSON.stringify(record.series_counts));
  console.log(compact.map((s) => `${s.label} [${s.relationship}] ${s.links.length}`).join("\n"));
}
