# Germany Production Slice 1A — source gate and implementation register

Owner authorization: 2026-10-02. Germany national Bundestag elections only: 2002, 2005, 2009, 2013, 2017, 2021, 2025. Platform remains v2.0. Czechia and every other country remain unapproved for canonical political ingestion. Owner subsequently authorized deployment after development and all release gates are complete, not premature production or deployment.

## Completed source work

- Read all thirteen owner-required architecture/boundary files before editing.
- Retrieved the actual official historical CSV and verified its embedded dl-de/by-2-0 statement. The publisher's [download-product reuse terms](https://www.bundeswahlleiterin.de/info/impressum.html) explicitly permit data republication with attribution, subject to product-specific exceptions. The [licence](https://www.govdata.de/dl-de/by-2-0) requires provider, licence URI, dataset URI and disclosure of transformations.
- Attribution: “Die Bundeswahlleiterin, Wiesbaden”; retain dataset URI and licence URI. National extraction, normalization, derived shares and presentation modifications must be separately disclosed.
- Archived the official final-result ZIP linked from the publisher's results page. It includes original 2021 and corrected 2021-w files. ZIP integrity and member checksums have been checked; older files use cp1252, not UTF-8. Its acquisition metadata intentionally retains the original pending review state. The subsequent `germany_source_licence_review.json` closes the seven actual member-file reuse reviews without rewriting that immutable acquisition record.
- `germany_source_inspection.json` is staging evidence, not canonical data. It contains exact source-record ordinals, native historical header labels, published percentages, source notes and null seats. No missing dash has been converted to zero.
- All seven national second-vote sums reconcile with the published valid-second-vote totals; valid plus invalid votes reconcile with voters. Raw object SHA-256 and ZIP member checksums are retained.

## Raw inventory

| Object | SHA-256 | Bytes |
|---|---|---|
| Historical CSV | `9efffc24b559679ade291d8da63462e5523b43ac62064e759737c3ae01418484` | 382,969 |
| Final-result ZIP | `02e7077f9358c9ef408741ee5d17123a43c28ea766b26a7ab338c08fcaeb7512` | 2,035,332 |

Paths and retrieval timestamps are in immutable metadata under `raw/germany/`. The raw downloads contain older elections and regional/first-vote columns as source context only; none may enter the approved national production slice.

## Confirmed owner definition choice

The official historical compilation now uses the corrected 2021 results following the partial Berlin repeat election of 2024-02-11: 735 seats. The original final 2021 results used 736 seats and the publisher now labels those archived results no longer valid. The two result versions must not be mixed. See [current results](https://www.bundeswahlleiterin.de/bundestagswahlen/2021/ergebnisse.html) and [original archive](https://www.bundeswahlleiterin.de/bundestagswahlen/2021/archiv/ergebnisse.html).

Owner confirmed on 2026-10-02: use the current corrected final result, explicitly labelled with the repeat-election date and source update; preserve original results as an immutable archived revision. Do not describe 735 seats as the initial seat count of the 2021 constituent sitting. The election-result vintage and legislature-seat vintage must be disclosed together.

The historical compilation uses some modernized party labels with historical-name footnotes (e.g. PDS under Die Linke, NPD under HEIMAT). Production labels must come from the election-specific files; a current label is not a ballot identity. Source grouping/ranking numbers are not durable party IDs. Identity crosswalk entries currently remain `requires_manual_review`; staging inspection does not authorize continuous party series.

## Remaining implementation

1. Implement the confirmed 2021 result-vintage presentation; the seven actual member-file reuse reviews are complete.
2. The deterministic election-specific parser and staging output are complete. Finish reviewed historical labels and party/contestant identity crosswalk before any canonical write.
3. Create only the twelve approved minimum stores in `src/data/political/`; add dated electoral-system and legislature evidence. Preserve original/corrected source revisions.
4. Deliberately transition the audit stop gate to an explicit Germany-only production-state validator. Do not delete the audit gate or approve other countries.
5. JSON/CSV public exports, bilingual route-scoped Political Explorer alpha, Germany profile link/navigation/SEO; no economic/model/event edits.
6. Notebook generic-view integration only if current schema admits it. Snapshot integration only if existing schema can describe the selection faithfully; otherwise document and defer.
7. Data/unit/UI/accessibility/mobile/theme/parity tests, reviewed screenshots, bundle measurements, complete independent research-boundary review and owner report.

## Commands

- Acquire a new immutable historical input: `node scripts/political-data/germany/acquire.mjs`.
- Acquire a new immutable final ZIP: append `--final-archive`.
- Reproduce current staging inspection: `node scripts/political-data/germany/inspect.mjs --check`.
- Reproduce normalized election-specific staging: `node scripts/political-data/germany/parse.mjs --check`.
- Verify the persisted source-keyed contestant ID ledger: `node scripts/political-data/germany/identity-queue.mjs --check`. The queue contains 209 unique `ct-de-*` IDs. All party mappings and historical display-label transformations remain unreviewed; none enters a continuous party series.
- Test actual parsing, encodings, checksum integrity, null/zero, totals, historical labels and 2021 revision preservation: `node --test scripts/political-data/germany/parser.test.mjs` (8 tests passed).
- Actual-file licence evidence: `germany_source_licence_review.json`; its archived publisher HTML has its own acquisition metadata and checksum.
- The inspector refuses to choose silently between multiple snapshots. A future revision requires explicit snapshot selection, not deleting evidence.

No canonical production store, public political export, Political Explorer route, platform-version change or deployment has been made at this checkpoint.

## Identity-review persistence gate

Historical-label evidence now lives separately in `germany_historical_label_review.json`: 206 labels remain verbatim; three corrected-2021 headers explicitly identify their 2021 names and match the archived original headers. The selected names are Nationaldemokratische Partei Deutschlands, Partei für Gesundheitsforschung and Liberal-Konservative Reformer. Both member hashes and column/record references are retained. These three display decisions are provisional pending independent second review; no legal-party identity or continuity is assigned. Reproduce with `node scripts/political-data/germany/historical-labels.mjs --check`. All Germany parser/review tests now pass 13/13; political audit still passes 1,050 checks with no canonical stores.

The queue checker now preserves reviewer annotations instead of comparing reviewed rows to an all-unmatched template. It verifies every immutable source field and contestant ID, rejects duplicate IDs, and accepts only evidence-backed `provisional` manual reviews. Required review evidence includes a source-record reference, SHA-256 and written rationale. This is evidence bookkeeping, not proof that a proposed party identity is correct; independent second review and a separate production gate remain necessary.

Canonical promotion and continuous-series eligibility remain false for every queue row. Unsupported confirmation, undocumented decisions, changes to source labels/hashes/vintages, unexpected fields and premature second-review acceptance fail closed. Current state is 29 provisional 2025 manual bindings and 180 unmatched earlier-election records; no cross-election identity is confirmed.

Validation: `node --test scripts/political-data/germany/*.test.mjs` passes 15/15 tests. Recognition evidence, manual bindings, historical labels and the identity queue reproduce offline. Next substantive task remains earlier-election entity evidence and independent review before canonical production.

## 2025 election-specific recognition evidence

Archived the actual Federal Electoral Committee [2025 recognition announcement](https://www.bundeswahlleiterin.de/info/presse/mitteilungen/bundestagswahl-2025/06_25_ergebnisse_1bwa.html), dated 2025-01-14, with acquisition time and SHA-256. Its 41 eligible parties are not equated with the 29 actual national second-vote contestants. `germany_2025_recognition_evidence.json` retains each table and row locator and the separately published additional names.

`review-2025.mjs` records 29 explicit manual document-row decisions; it is not a fuzzy matcher. Three additional-name cases (ÖDP, PdH and MENSCHLICHE WELT) retain their published suffixes. CDU and CSU have different reserved opaque party IDs. All bindings remain provisional with two evidence references, no cross-year continuity and no canonical promotion. Independent review has been requested. Historical display-name review separately passed independent read-only verification for all 209 source references and the three corrected-2021 names; that limited pass does not approve party identity, production or UI.

The recognition HTML is an evidence archive; its redistribution licence is not asserted by this parser. Canonical promotion must separately review any recognition-source metadata or excerpt that is to be published. Immutable raw acquisition records are not rewritten.

Independent read-only 2025 evidence review: PASS, no blocking findings. All 29 final-result columns and recognition rows were independently checked, including the three additional-name cases and distinct CDU/CSU IDs. The evidence supports election-specific party/own-list bindings only; it does not establish 2002–2021 identity or cross-year continuity. The queue deliberately stays provisional until a separately implemented production gate records second-review acceptance. Privacy scan: 1,241 publish-candidate files passed. No push, canonical write or deployment occurred.

## 2021 election-specific membership evidence

Archived the official [2021 recognition announcement after constitutional-court decisions](https://www.bundeswahlleiterin.de/info/presse/mitteilungen/bundestagswahl-2021/17_21_beschluss-bverfg.html), dated 2021-07-30. It includes DKP and 54 eligible parties, not the earlier 53-party recognition result and not the 40 actual national second-vote contestants. Archive hashes and table/row references are retained.

`germany_2021_membership_review.json` records 40 explicit manual same-election bindings using corrected result headers, original 2021 headers and recognition rows. The three modernised headers use the reviewed historical names. LfK whitespace is normalised solely for typography in the comparison; verbatim source and historical display labels remain unchanged. These findings support party/own-list membership evidence for that election only. No new party IDs are assigned, avoiding an unsupported decision that a 2021 party is either identical to or distinct from a 2025 entity. The identity queue remains unmatched for these 40 legal-entity decisions. Independent evidence review requested; no production approval.

Reproduce: `node scripts/political-data/germany/recognition-2021.mjs --check` and `node scripts/political-data/germany/review-2021.mjs --check`. Earlier 2002–2017 membership evidence (140 records), legal-entity continuity and the production gate remain unfinished.

Independent 2021 read-only evidence review: PASS, no blocking findings. All 40 manual table/row bindings and both result-member hashes/columns were checked, including DKP and LfK typography. Active corrected valid second votes remain 46,298,387; archived original 46,442,023 remains separate. Scope is same-election membership evidence only. Current Germany tests: 17/17 PASS; political audit: 1,050 checks PASS; privacy: 1,248 files PASS. No production write, push or deployment.

## 2013 and 2017 membership evidence checkpoint

Archived official recognition declarations for [2017](https://www.bundeswahlleiterin.de/info/presse/mitteilungen/bundestagswahl-2017/05_17_parteien_teilnahme.html) and [2013](https://www.bundeswahlleiterin.de/info/presse/mitteilungen/bundestagswahl-2013/2013-07-05-38-parteien-koennen-an-der-bundestagswahl-2013-teilnehmen.html). The archived lists contain 48 and 38 eligible parties, respectively; these are distinct from the 34 and 30 national second-vote contestants. The different ordered-list source format retains list/item locations and verbatim full names, abbreviations and additional names.

64 explicit manual document-location proposals are recorded: 28 provisional and 6 unresolved for 2017; 29 provisional and 1 unresolved for 2013. Exact same-election full-name or officially supplied abbreviation agreement corroborates the provisional decisions, never cross-year identity. No party IDs are assigned here. The six 2017 name/suffix differences and the 2013 Nichtwähler versus Partei der Nichtwähler difference remain unresolved; no fuzzy match or silent suffix removal is used. These records need independent evidence review and seven additional name resolutions before promotion. 2002, 2005 and 2009 (76 contestants) still need same-election membership evidence. All legal-entity continuity and production gates remain open.

Offline reproduction: `node scripts/political-data/germany/recognition-historical.mjs YEAR --check` and `node scripts/political-data/germany/review-historical.mjs YEAR --check`, YEAR 2013 or 2017. No canonical store, export, UI or release change at this checkpoint.

## Primary-report completion and supplementary name decisions

Located and immutably archived the original 2002 and 2005 Federal Returning Officer reports from the official statistical library, and the 2009 report from the publisher. Same-election party/Landesliste tables cover 24, 25 and 27 second-vote contestants. First-vote-only rows are expressly excluded (four in 2002, six in 2005, Freie Union in 2009). The actual 2002 OCR contains letter errors; the 2005 party cells are raster content. Both years therefore use explicitly labelled manual visual transcription, not falsely claimed text validation. Page and row locators, original hashes and historical full names are retained.

The seven prior 2013/2017 name differences now have separate supplemental decisions in `germany_name_difference_resolution.json`. The 2017 actual-participation table separates full and additional names; the 2013 official abbreviation explanation explicitly links Nichtwähler to Partei der Nichtwähler for 2013. The three-full-stops/ellipsis change is an explicit single-record typographical decision. Earlier unresolved ledgers are preserved unchanged.

All seven election years now have same-election membership proposals covering 209 contestants. This is NOT completion of legal-entity resolution or cross-election continuity. Earlier-year party IDs remain null; 2025 IDs remain provisional. No canonical production, UI or release gate is approved. Independent primary-report review passed for the 52 records in 2005/2009 and supplemental name decisions, limited to staging; 2002 and independent visual review of the 2013 appendix have been requested.

Reproduce with `review-2002.mjs --check`, `review-2005.mjs --check`, `review-2009.mjs --check` and `resolve-name-differences.mjs --check` under `scripts/political-data/germany/`. Selected PDF excerpts are evidence only; use `ATLAS_EVIDENCE_PYTHON` to supply a Python runtime with pdfplumber for `pdf-evidence.mjs --check`. No new runtime dependency was added to the website.

Independent follow-up review: PASS for all 24 2002 source records and the 2013 abbreviation appendix's actual visual row. The 2002 PDF SHA-256 is `052f83393c0c197a26c1ee7a6a60693558fb759edb89f92ff5e95ba7fc8d1d73`; all four first-vote-only rows were independently confirmed excluded. No visual transcription errors were found. The appendix footnote may use current names, so its 2013 abbreviation decision retains same-election participation-page corroboration and cannot establish continuity. Current tests: 22/22 PASS; political audit: 1,050 checks PASS. Source/membership evidence is independently reviewed; legal-entity resolution, canonical data, UI and release work remain unfinished.

## Source-stage independent review

Read-only research-boundary pre-review on 2026-10-02: PASS, limited to source and staging work, not final production/UI acceptance. Parser reproduction, inspection reproduction and UI-language QA passed. Two documentary follow-ups were addressed: the 2021-w header is not claimed to contain a copyright line, and completed acquisition/parsing tasks are distinguished from pending identity/presentation work. Corrected CSV labels can themselves be modernized (e.g. Die Heimat with a 2021 NPD parenthesis); original source labels must be retained alongside a separately reviewed historical display label.

Current checkpoint validation: parser 8/8 tests PASS; normalized staging and source inspection reproduce exactly; 209-ID queue uniqueness/reproduction PASS; political audit 1,050 checks PASS with the canonical stop gate still active. No production-readiness claim is made by these staging checks.

## Route-unwired presentation implementation

Implemented `PoliticalExplorerAlpha` as a bilingual, props-only descriptive election browser. It contains election and measure controls, native German contestant labels, published turnout, result-vintage notes and per-row source links. No dataset is imported into the global application and no public route is enabled. Continuous party series are expressly not inferred. `politicalExplorer.ts` derives shares from integer counts and the corresponding election denominator; missing seats remain null, real zero stays zero and rounded published percentages are not used for qualification decisions.

The three new numeric tests pass together with all source tests (25/25); TypeScript checking passes. Component interaction, visual accessibility and production-data integration remain unverified. Legal-entity resolution, canonical stores, public exports, route integration, independent full-diff review and release gates still require completion. This checkpoint does not authorize deployment.

ESLint passes. Site compilation and all 57 static pages pass after retrying the existing Google Fonts download with network access; the first restricted-network build failed fetching Geist Mono. This is a site-build check, not the full release pipeline or a visual acceptance test.

## Scoped production and integration checkpoint — 2026-10-02

This later checkpoint supersedes the earlier pending-status descriptions without erasing their evidence. Independent review clarified owner specification Phases 10/14/18/19: unresolved cross-year party relations block continuous party series, not sourced election-specific contestant tables. Twelve Germany-only stores are now generated and validated. 209 ballot contestants have reviewed own-list classification; only the 29 parties actually contesting in 2025 receive source-supported party-entity/member records. Their observation dates are not founding or dissolution dates. The historical 180 party relations remain null/requires_manual_review, and every continuity flag remains false. Separate `germany_production_acceptance.json` records the independent scope acceptance and frozen evidence hashes; original staging provisional records remain unchanged.

Official date/term headings and dated electoral rules are archived, including Dresden I's delayed 2005 poll and the national-minority-party threshold exemption. Fixed ParlGov 2024 original file 10437092 supplies reconciliation only: five national seat totals match, 2021 retains the 735/736 revised/original definition difference, 2025 is a source gap. No academic party IDs or values replace official results.

Original HTML/PDF are retained in local immutable evidence archives but excluded from Git/public exports until product-specific redistribution is cleared. Published source metadata, original hashes and reviewed factual extracts support the identity/rule decisions. Public/CI numeric reproduction always checks and reads the licensed original CSV/ZIP and fixed ParlGov file. This differs from rerunning the original webpage/PDF parsers; local source-stage checks still require their complete archives. Privacy scanning permits only the exact reviewed official ZIP path and SHA, decompresses every CSV member for secret/private-path scanning, and applies the same checks to outgoing history.

Chinese and English Politics routes, Germany profile entry and navigation are implemented. Data is loaded only by Politics server routes. Election history, one-election measures, published versus derived shares, vote versus seat shares, result vintage, rule notes, source hashes and 26 JSON/CSV/README/manifest exports are present. Notebook uses existing `series_view` and `source` types and preserves election/measure filters; no Notebook schema bump. Research Snapshot is explicitly deferred: its existing `view_type` union and annual/regional snapshot row model cannot faithfully encode political contestant identity, second-vote denominator and revised-election vintage. No political view is relabelled annual and no unapproved Snapshot schema migration is performed.

### Local release validation, 2026-10-02

Full frozen-output production build and Release QA passed: 55 required routes, 174 existing exports plus independent exact 26-file political publication checks, 1,796 internal links and no blocking failures. Political ZIP entries are checked against canonical exports byte-for-byte, with CRC and duplicate-entry checks. A temporary public-checkout simulation omitting all private HTML/PDF originals reproduced and validated seven elections and 209 contestants; reviewed factual ledgers and numeric originals remain required. Six political data/unit tests passed, including null versus zero and CSV formula escaping. Twelve new desktop/mobile bilingual browser tests passed; full 202-test regression is a separate final gate, not implied by these twelve tests.

Before/after per-chunk gzip measurement uses the documented Notebook release baseline at 8b32cac: total JS 1,346,987 to 1,351,110 bytes (+4,123); homepage 201,014 to 201,124 (+110); Data 266,292 to 266,402 (+110); models 428,819 to 428,929 (+110); workspace index 198,654 to 198,764 (+110); workspace detail 206,211 to 206,321 (+110). Initial English Politics JS is 202,777 bytes. No runtime dependency was added; this is bundle size, not a load-time benchmark. Script: `scripts/validation/political-bundle-size.mjs`.

Full local browser regression passed 202/202 without updating existing screenshot baselines or weakening thresholds. New Politics screenshots were independently inspected across both locales, desktop/mobile and light/dark. Final independent research-boundary incremental review returned PASS with no blockers. Incidental generated changes to existing economic public exports and the protected analysis validation timestamp were mechanically reverted before commit; frozen source outputs remain unchanged. Linux screenshot recording/review, remote CI and actual deployment verification remain required before calling the release live.

The first non-deploying Linux preflight (36999195700) failed at the pre-existing broad Workspace frozen-path comparison because the owner-approved new German stores were additive. This failure is retained. Workspace/Notebook now allow only the exact 12 new approved German stores and 26 reproducible exports, requiring their absence at the original baseline and exact approved contents; all pre-existing economics, engines, dependency locks and other paths remain frozen. Seven unit tests pass, including rejection of unknown political paths, economic paths and any allegedly additive file already present at the baseline. Workspace 657 and Notebook 93 checks pass. Raw numeric evidence and export CSV bytes are protected against newline normalization using narrowly scoped attributes; 15 staged numeric/archive files matched their original bytes exactly.

Second Linux preflight 36999546429 passed data and type checks but stopped at the existing read-only tooling guard: Release QA transitively imported a file containing the export writer CLI. The pure export serializer and writer entry point are now separated (`export.mjs` / `export-cli.mjs`) without changing generated data, bypassing guards or weakening tests. All 21 tooling tests, political exports and Release QA pass locally. The failed run is retained; a fresh full Linux run remains mandatory.

### Release candidate accepted, 2026-10-03

Non-deploying Linux preflight 37111147093 passed every build/research/data/guard/privacy/release step and 202/202 browser tests. Eight new Linux Politics baselines were downloaded and visually reviewed across desktop/mobile, both locales and both themes. Every existing Linux screenshot remained byte-identical; only the eight new route baselines are added. Independent reviews also accepted the strict additive freeze exception and the pure/export-writer split. This is acceptance of the release candidate, not proof of live deployment. Main-branch verifying CI and live SHA/routes/files/interface checks follow before reporting completion. Historical failures above remain visible.

Initial Politics interaction/accessibility tests pass 8/8 across both locales and desktop/mobile, light/dark. The initial functional run exposed an ambiguous test header locator, corrected to the unique banner without weakening the assertion. Production tests explicitly distinguish 180 unresolved identity relations from seven academic reconciliation records. Full regression, deliberate screenshot review, full research-package/release validation, CI and deployment remain separate pending gates at this checkpoint. Platform remains v2.0; all frozen economic, model and research-program outputs remain unchanged.
