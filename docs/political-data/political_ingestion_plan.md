# Political data — ingestion plan (proposal, not executed)

Status: design for owner review (2026-10-02). **No canonical political dataset has been written.** Platform remains
v2.0; no release, model, readiness, event or estimate changes.

## 1. Gates before any production write

1. Owner approves the schemas (`political_schema_proposal.json`) and the identity model (`party_identity_model.json`).
2. Licence review closes for the sources of the chosen slice (only Germany, Romania 2012/2016 and ParlGov are verified today).
3. The party identity crosswalk for the slice is reviewed (no `unmatched`/`disputed` rows in published entities).
4. Store validators exist (schema, intervals, provenance completeness, prohibited fields, derived-value formulas,
   result-vs-composition separation) and pass in a staged run like the official-data-refresh workflow.
5. The research-boundary-reviewer passes the diff.

## 2. Recommended first production slice

**National lower-house elections 2002–latest for Germany and Czechia**, extended to **Poland, Slovakia and Austria**
once their licences are confirmed.

Contents of the slice:
- `elections` (official dates; two-day polls as intervals), `legislatures` (term, start date, seats),
- `election_turnout` (national totals as published),
- `election_results` (national list/second-vote tier: votes, vote share, seats, seat share; published vs derived flags),
- `electoral_contestants`, `contestant_members`, `political_parties`, `party_names` for the contestants in the slice,
- `party_identity_crosswalk` keyed on official codes (ČSÚ VSTRANA; Bundeswahlleiterin party labels + ParlGov party_id
  as cross-check), `electoral_systems` disclosure rows, `political_source_registry`, `reconciliation_log`.

Why this slice: verified machine-readable official sources covering 2002–2025, an official stable party code (Czechia)
and a verified open licence (Germany), complete ParlGov cross-checks to 2021, and well-documented tier rules.

Held for later slices: Croatia (2024 machine-readable data missing; derived national totals), Hungary (no verified
bulk format; tier choice), Romania (automated access blocked; system changes), Slovenia (2022 date conflict;
archive formats), Serbia (HTML/PDF only, no harmonized cross-check, heavy list identity ambiguity), parliamentary
composition (no uniform dated source), cabinets after 2023 and Serbia cabinets, all measurement layers.

## 3. Later slices (in order)

1. EP national-party results 2009–2024 and dated EP group affiliation (EP datasheets + EP Open Data), after EP reuse terms are confirmed.
2. Cabinets and cabinet parties 2000–2023 for the nine EU countries (official records; ParlGov cross-check), then post-2023.
3. Croatia, Slovenia, Hungary, Romania elections (manual-review queues).
4. Serbia elections and cabinets (document-level transcription with provenance).
5. Parliamentary composition snapshots where parliaments publish dated group membership.
6. Measurement layer: ParlGov family (CC0, descriptive_only); CHES and Manifesto only after written licence clearance.

## 4. Expected record counts (estimates)

| Store | Estimate | Basis |
|---|---|---|
| elections (national lower house 2000–latest) | 75 | registry dates: AT 7, HR 8, CZ 7, DE 7, HU 7, PL 7, RO 7, RS 10, SK 7, SI 8 |
| elections (EP) | 44 | EP terms × members since accession |
| legislatures | ≈75 | one per national election |
| election_results (national tier) | ≈1,000–1,400 | ParlGov has 592 rows 2000+ for 9 countries with a reporting cut-off; official sources list all contestants |
| ep_national_party_results | ≈330–400 | ParlGov 362 EP rows 2000+; EP datasheets list mainly seat winners |
| parties (2000+) | ≈280–320 | ParlGov 264 distinct parties 2000+ for 9 countries + Serbia |
| electoral_contestants | ≈1,000+ | election-specific, includes joint lists and committees |
| cabinets (2000–latest) | ≈140 | ParlGov 117 (2000–2023, 9 countries) + post-2023 + Serbia |
| cabinet_parties | ≈350 | ParlGov 302 rows (2.58 parties per cabinet) + additions |
| first slice (DE + CZ) | ≈14 elections, ≈14 legislatures, ≈350 result rows, ≈80 parties/contestants | |

## 5. Event Library relationship (proposal only)

The Event Library (`src/data/events/events.json`, 246 records, 12 typed `election`) is not modified. A future, separate
link table `event_political_links` would hold `{event_id, entity_kind (election | party | cabinet | legislature),
entity_id, link_basis: event_mentions | event_about, reviewed_at}`. Rules: links are added by review, never inferred
from text; an event summary never becomes election-result evidence; `entersModel` stays false; existing event IDs are
the join key. Example candidates: `rs-2026-08-20-snap-election-dates` (→ a scheduled Serbian election record once
officially called), `hu-2026-08-19-president-inauguration` (presidential module — out of scope),
`hu-2026-09-03-publicus-party-support` (polling — excluded; no link).

## 6. Country profiles (design only)

Sections: Political system (chamber, seats, electoral-system disclosure with legal basis) · Current legislature
(term, start date, seat total; composition only if a dated official source exists) · Election history (table of
turnout, vote and seat shares by contestant, with tier and published/derived labels) · Parliamentary composition
(dated snapshots, labelled distinct from results) · Government/cabinet history (dates, head of government, member
parties, source-defined attributes labelled with their source) · EU representation (EP results and dated group
affiliation). Every value links to its source. No scores, rankings, risk or quality measures.

## 7. Workspaces (plan only)

Future neutral question-first workspaces could reuse the stores: *Electoral change* (turnout and vote-share series
with system breaks), *Party-system change* (contestant entries/exits, documented relations), *Government formation*
(election-to-cabinet intervals, member parties), *EU representation* (EP results and dated group affiliation). Each
would follow `docs/question-first-workspaces.md`: neutral question template, actual coverage, source-linked evidence,
explicit limitations, no automatic answers. None is implemented now.

## 8. Notebook and Snapshot compatibility

- Stable canonical IDs (`el-…`, `lg-…`, `pp-…`, `ct-…`, `cb-…`, `pg-…`) fit the Notebook's `canonical_ids` and
  identity rules (IDs + countries + periods + layer), so evidence deduplicates across languages.
- Future evidence types `election`, `party`, `cabinet`, `legislature`, `parliamentary_composition` would extend
  `notebookTypes` in a later, separately approved Notebook schema version; **no Notebook schema change now**.
  `periods` would hold the election date / validity interval; `layer` = `political:<store>`; sources map to
  `political_source_registry` entries.
- Research Snapshot rows would export the selected records with provenance columns (source, URL, retrieval date,
  published/derived) under the existing `atlas-descriptive-snapshot-v1` pattern, in a later phase.

## 9. Validators to build with the first slice

Schema and enum checks; ID formats; no name-derived IDs; interval sanity and exclusivity; provenance completeness
per field; published-vs-derived consistency (recompute derived shares and compare); vote attribution only to ballot
contestants; results immutable vs composition; prohibited fields absent; measurement layer isolated (no factual store
references measurement values); licence status `verified_open_licence` for every published source; reconciliation
entries for every Tier-2 disagreement.
