# R1-C3 · Official source, publication metadata, licence and research-artifact admission

Research dossier for independent review. It proposes; it changes no runtime code, rights engine, registry, export,
Notebook schema, Composer UI or screenshot baseline. Baseline: `9cb65307a9789744580e687052504fd4d8d02d35` (production
provenance re-read with a fresh request on 2026-11-27: same commit, run 46027169165, package
`38f7da85…`). Branch: `research/claude-r1c3-source-rights-verification`.

## Result in one table

| Candidate | Exact bytes (data.csv / sources.csv) | Recommendation |
|---|---|---|
| SORS CPI, total, same month previous year = 100 (`03010601IND03`), 2007-01–2025-12, 228 obs | `760bed4e…` / `ce4cb36c…`; figure-free archive `b2acc019…` | READY FOR INDEPENDENT ADMISSION REVIEW (original archive + normalized members) |
| SORS retail trade volume, constant prices, SA, 2021=100 (`210105IND02`), 2000-01–2026-09, 321 obs | `812bc785…` / `ab130e99…`; archive `b25b710f…` | READY FOR INDEPENDENT ADMISSION REVIEW (provisional statuses retained) |
| Eurostat HICP annual rate, Hungary, 2020 (`prc_hicp_minr`), 12 obs | `633544d1…` / `1bd99034…` | READY FOR INDEPENDENT ADMISSION REVIEW (normalized members only; needs the registry upgrade and an exact pin) |
| Eurostat HICP annual, Poland, 2021–2025 (`prc_hicp_aind`), 5 obs | `e6d2a1c7…` / `b9d64f45…` | MORE EVIDENCE REQUIRED (unexplained "Statistics Poland" co-source wording) |
| Poland–Hungary real GDP comparisons (`nama_10_gdp`) | `3225ccb3…` / `5f6a7321…` | REFERENCE ONLY |
| BIS Hungarian policy rate (`WS_CBPOL M:HU`), 139 obs | `5a6c8301…` / `9c660bdc…` | MORE EVIDENCE REQUIRED (BIS terms page 403; bulk file not retained) |
| BIS bilateral FX cross rates | — | MORE EVIDENCE REQUIRED |
| Eurostat regional population, Hungary NUTS3 2024 | `563245a4…` / `6259b0e9…` | MORE EVIDENCE REQUIRED |
| GISCO boundaries, map.svg | — | BLOCKED |
| Other SORS monthly series (IPI, PPI, trade, earnings), SORS annual series | — | MORE EVIDENCE REQUIRED |
| Political and election evidence | — | BLOCKED |
| Model and method references | — | REFERENCE ONLY |
| Admitted SORS CPI 2006=100 and LFS 15–74 | pins reproduced exactly | unchanged |

Full hashes, counts, notices and pin entries: `admission_proposals.json`.

## What was established

- **Exact bytes.** All candidate digests come from the real export button of a production build of the baseline
  (`captured_snapshots.json`). For SORS, the existing fixture builder reproduces the two admitted pins exactly and gives
  the same `data.csv`/`sources.csv` digests as the production export for both new candidates.
- **Values.** Each READY candidate's values equal a retained official response held in the repository, value by value
  (SORS 228/228 and 321/321; Hungary HICP 12/12 against the 2026-09-30 response `4a2dbd26…` and against a present-day
  response `e71e0484…`). Poland HICP 2021–2025 also equals its retained response (5/5), whose data release
  (2026-02-06) is still current.
- **Publication identity.** Eurostat dataflows give the official title, ESTAT as creator, the dataset DOI
  (10.2908/PRC_HICP_AIND, PRC_HICP_MINR, NAMA_10_GDP), DOI issue date, creation date and last data update
  (`dataset_metadata.json`). Eurostat publishes no edition numbers: a data release is identified only by its update
  timestamp. SORS publishes no release identifier.
- **Rights.** Eurostat's copyright notice and Decision 2011/833/EU were read (digest `d2d5a046…`, `4589a33a…`);
  the SORS terms were re-read (`d5e3dbbe…`); GISCO clauses were read on the administrative-units page. The BIS
  terms page returned 403 and was not read (`rights_assessments.json`, `official_evidence.json`).

## Findings that need attention

1. `src-eurostat` can move from `documented` to `verified` (evidence now archived by digest). Proposal only.
2. Eurostat requires a non-responsibility disclaimer whenever data or text are modified or translated. The current
   Eurostat attribution line has none; Atlas snapshots modify layout and use Chinese titles.
3. The GISCO verification record cites the NUTS page as `license_url`, but that page carried no licence clauses on
   2026-11-27; the clauses are on the administrative-units page, which names communes, countries and postal codes.
4. Annual and comparison exports name national portals (Statistics Poland, HCSO STADAT, Destatis) as co-sources of
   Eurostat values. The Eurostat metadata lists Eurostat only. This blocks Polish HICP until explained.
5. The October 2026 Eurostat monthly refresh recorded no retrievals or response digests; current monthly values rest
   on older retained responses and present-day checks.
6. The SORS terms ask modifiers to identify themselves and describe changes; the admitted notices do.

## Files

| File | Content |
|---|---|
| `artifact_inventory.json` | Ten artifact classes: producer, sources, IDs, scope, metadata, provenance, versions, registry row, eligibility, gaps |
| `captured_snapshots.json` | Digests, scope and source rows of every captured export; SORS fixture rebuilds |
| `official_evidence.json` | Every page read: URL, host, method, status, time, digest, facts |
| `dataset_metadata.json` | Eurostat bibliographic facts per dataset |
| `rights_assessments.json` | Source-specific and dataset-specific rights, proposed registry changes, open questions |
| `provenance_records.json` | Endpoint → retained response → values → exact members, per candidate |
| `admission_proposals.json` | Classification, recommendation, exact hashes, attribution, notices, pin entries |
| `blocked_and_unresolved.md` | Every non-ready case and the exact evidence it needs |
| `citation_metadata_proposals.md` | Bibliographic fields that evidence now supports |
| `codex_handoff.md` | Implementation scope requiring separate exact-hash authorization |
| `acceptance_tests.md` | Independent acceptance tests |

## Method and limits

No publisher was contacted. ec.europa.eu was read with single automated requests (registered host). www.bis.org,
eur-lex.europa.eu and www.stat.gov.rs were read in the browser pane after the owner's answer of 2026-11-27; the BIS
denial was not retried. Publisher pages are not committed; only digests and short factual summaries are. Page digests
identify the bytes received in this review and prove nothing about earlier versions. No historical capture receipt
exists or was created.
