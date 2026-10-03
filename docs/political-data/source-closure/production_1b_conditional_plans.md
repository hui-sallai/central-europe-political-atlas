# Production 1B — conditional variants (architecture planning only)

Platform v2.0, unchanged. No country is selected; no ingestion is approved. Eligibility below is computed from
`gate_matrix.json` (technical/source readiness only — never from political criteria). Today **no country is eligible
for any variant**.

## Variants

| Variant | Entry condition (all mandatory gates closed, plus) | What is published | Raw originals |
|---|---|---|---|
| **1B-A** full normalized | raw redistribution cleared | elections, legislatures, national turnout, national-tier results, contestants, electoral-system disclosure, provenance | may be offered as downloads with the publisher's licence notice |
| **1B-B** normalized without raw | raw redistribution not cleared or blocked | same normalized factual tables | never published; private reproducibility archive only (hashes and source URLs published) |
| **1B-manual** | automated acquisition blocked or not permitted, manual acquisition closed | as 1B-A or 1B-B | owner downloads files in a browser, records date/URL/SHA-256, places them in the archive; scripts only read local files and never fetch |

Mandatory gates for every variant: reuse right, normalized factual republication, an acquisition route (manual or
automated closed), source files complete, national definition complete, same-election identity complete, electoral-
system metadata complete, vintage decisions complete. Raw redistribution is not mandatory.

## Current position by country (2026-10-03)

| Country | Likely variant once replies arrive | Blocking now |
|---|---|---|
| Czechia | 1B-A or 1B-B (automated route possible if CZSO permits) | CC BY scope for volby.gov.cz; 2017 and 2021 vintage decisions; identity execution (CVS/CVS_SLOZENI); VSTRANA description conflict |
| Slovakia | 1B-manual (robots/spiders prohibition) with 1B-A if CC BY covers the files | CC BY scope for volby.statistics.sk; manual download confirmation; summary/seat/subject-list tables still to be obtained manually |
| Poland | 1B-B or 1B-A depending on reply; national totals need the PKW announcement | no reuse terms; national totals; committee composition |
| Austria | 1B-manual (AI agents disallowed by robots.txt); possibly non-commercial restriction | applicability of the Impressum clause; workbook inspection by the owner; final vs provisional seat sources |

## Shared pipeline design (when a variant is approved)

1. Inputs: archived originals with `{url, retrieved_at, sha256, acquisition_mode: automated|manual_owner, licence_record_id}`.
2. Parsers per election schema (encodings and delimiters recorded; Slovak missing seats: explicit 0, `nan` and empty stay distinct).
3. National totals only from an official national row/announcement; any derived total records formula and inputs.
4. Contestants per election; coalition members only from official same-election registers; no cross-election continuity.
5. Vintage selection recorded per election (e.g. Czech 2017 recalculated vs original).
6. Validators: the Germany-style production checks plus licence-record presence on every published row and the
   1B-variant rule (no raw file under `public/` unless 1B-A).
7. Germany production stays byte-identical; new countries are additive stores under `src/data/political/<country>/` only
   after owner approval.
