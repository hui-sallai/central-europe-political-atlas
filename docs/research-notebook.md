# Research Notebook / Evidence Collection — Phase 1

Presentation-only implementation on `feature/research-notebook`; baseline public commit `d83a6166072c0c295e7d385d25378cb710053a54`. This phase does not authorize a release, change the platform version, or activate statistical methods.

## 1. Architecture

Static `/notebook/` and `/en/notebook/` pages hydrate browser state through `ResearchNotebookProvider`. A compact header link displays the evidence count. `NotebookCollect` is shared by six existing research surfaces. `researchNotebook.ts` contains the typed model, strict validation and deterministic identities; `notebookEvidence.ts` is a presentation adapter, not a canonical research-data reader. Notebook ZIP generation and the export module are dynamically imported only on explicit export.

The independent schema is `atlas-research-notebook-v1`. Notebook fields include ID/title/timestamps/locale/workspace context/countries/question/items/user notes/source registry/warnings/platform version. Each item records canonical identity, source state, collection time and platform version. Neither schema version nor collection time is a platform release identifier.

## 2. Storage and privacy

One localStorage key: `central-europe-atlas:research-notebook:v1`. No server endpoint, account, cookies, network save, telemetry or background synchronization. First use does not write an empty notebook. Stored contents are never embedded into generated static HTML.

Invalid JSON, one malformed item or a future schema protects the entire existing raw value: collection/editing is blocked until explicit clear/import. Recovery downloads the original text. JSON replacement and clearing a non-empty notebook require confirmation. Import failure preserves existing evidence and notes.

Storage denial/quota failures keep edits in memory and leave previously saved storage unchanged. A warning instructs export before leaving; language switching asks before a full-document reload, and a browser unload warning protects non-empty memory state. Cancelling preserves unsaved edits. If the user explicitly proceeds, refreshes forcibly, closes the browser, clears browser data or uses another browser/origin, unsaved/local notes are not recoverable without an export. No cryptographic protection is claimed; other users of the same browser profile can read the notebook.

## 3. Supported evidence types

`observation`, `series_view`, `country_comparison`, `event`, `regional_view`, `map_view`, `method`, `source`, `workspace`.

The initial integrations expose observation/view/comparison/event/map/method/workspace collection; regional/source records are supported by the schema and explicit JSON restoration rather than additional minor-page controls. Deduplication uses stable canonical IDs, country/period/layer and normalized view state, never translated titles. Method/event identities use their canonical IDs. Duplicates preserve first collection metadata and the user's exact notes; they do not silently refresh evidence.

## 4. Completed integrations and provenance

- Data: annual observation and current filtered view; existing monthly/macro/SORS Snapshot view controls also collect compact view metadata. Observation null stays null and a genuine zero stays zero.
- Country comparison: current selected countries, filters, indicator/source summary and coverage; no complete comparison dataset is persisted.
- Events: verified source-backed records only; original Chinese presentation title, original-language marker, date/type/topic/status/entersModel and original source are retained. No translated political summary, motive or inferred impact is generated.
- Map: current URL, filters, layer/year/classification/selected regions, legend and available geography classification/level/attribution; no SVG or geometry binary is stored. Classification metadata retains an available vintage; absent independent vintage metadata is not invented.
- Methods: skill ID, registered state, supported data, purpose, limitations/readiness and registered citation. Inactive references remain labelled “Not currently runnable”; no Notebook Run button exists. VAR coefficient availability is not promoted to formal dynamic-response/IRF availability. LP and Panel LP gates are unchanged.
- Workspaces: setup only, with countries/dates/indicators/visible categories/source references/warnings. Adding setup does not automatically add its evidence.

Source identity includes URL/dataset/code/layer and unit/retrieval/update metadata, so distinct source revisions or unit definitions are not silently combined. SORS remains SORS, with original archive code and units where available. Unknown institutions/metadata remain unknown; the adapter does not fabricate bibliographic fields.

## 5. Import and export

Explicit JSON import validates the entire schema, IDs, types, source references, URL policy, counts, lengths and serialized size. Unknown fields/raw rows/SVG payloads are rejected. Only HTTPS source URLs and permitted canonical Atlas view routes are accepted; credentials, unsafe schemes and secret-bearing query parameters are rejected. Imported strings render as plain text, not executable HTML.

ZIP inventory: `README.md`, `notebook.json`, `evidence.csv`, `sources.csv`, `citations.md`, `links.json`, `notes.md`. JSON preserves the full state; export time is separate from collection time. Both CSVs protect all string cells from spreadsheet formula execution without modifying the JSON. `notes.md` contains only user-authored title/question/personal/item notes and identifying labels, not generated evidence prose. Citations reuse known Atlas/original-source/registered-method references without invented DOI/page/publication details.

## 6. Bilingual behavior

All Notebook controls have typed Chinese/English parity. Reviewed Atlas labels change with the interface; source-native event/source text stays native and marked. User-authored text is never translated. Canonical identities normalize locale routes and sorted URL query parameters, preventing duplicates caused solely by language changes. Switching language normally restores exactly the persisted notes; memory-only exceptions are explicitly protected and explained above.

## 7. Tests and validation

`pnpm notebook:validate` exercises actual model/export/adapters, nine types, strict import, language-independent deduplication, exact notes, SORS/null/zero, source identity, method states, URL safety, CSV protection, export inventory, canonical-data isolation and version/frozen-file checks. Browser tests cover all six surfaces, note editing, bilingual persistence, ZIP integrity/inventory, clear/import, corruption/future schema, storage denial/quota, malicious strings/URLs, reorder/filter/remove, no network writes, accessibility and desktop/mobile light/dark.

Screenshot baselines are deliberately reviewed platform-specific evidence; ordinary test runs must not create/update missing baselines. After the owner's publication authorization, no-deploy Linux run [36885899870](https://github.com/hui-sallai/central-europe-political-atlas/actions/runs/36885899870) passed all 190 browser tests, full research checks, Release QA and generated-public-site privacy checks. Eight new Notebook and 27 expected header/collection-control Linux images were reviewed and imported; unrelated baselines stayed unchanged. Deployment verification is a separate subsequent gate.

Final local validation on 2026-10-02: Notebook 93 checks PASS; Workspaces 657 PASS; i18n 1,119 PASS (26 route pairs); UI-language QA PASS; lint PASS; typecheck PASS; static site build PASS (57 entries); SEO 337 PASS; candidate public-secret scan 1,195 PASS; candidate plus static-output scan 2,130 PASS; diff whitespace check PASS. Independent research-boundary reviewer completed the final incremental review with PASS.

Complete browser regression: **190/190 PASS** with `pnpm test:ui --workers=2`, ordinary comparison mode, no screenshot writes. This includes 20 Notebook functional/error tests and four bilingual desktop/mobile Notebook visual tests (eight light/dark images). Earlier full runs exposed a duplicate map canonical tag caused by a high-priority provider hydration update; low-priority initialization fixed it while retaining the exactly-one-canonical assertion. A subsequent five-worker run passed 180/190 and had mobile timeout/theme-hydration failures; the final two-worker run retained every assertion, timeout and screenshot threshold. Those earlier failures are not counted as passes. No research simulation or release was run.

## 8. Performance and capacity

`node scripts/validation/notebook-bundle-size.mjs` compares per-unique-chunk gzip bytes against the pre-implementation deployed static export. It reports total JS, homepage, Data, models, workspace index/detail and initial Notebook JS; this is not a network or load-time benchmark. ZIP/export logic is absent from the global initial route payload.

Final build measurement (bytes): total JS 1,346,987 (+22,064); homepage 201,014 (+6,660); Data 266,292 (+6,825); models 428,819 (+6,436); workspace index 198,654 (+6,660); workspace detail 206,211 (+7,096). Both Notebook locales start at 201,917 bytes. The global homepage increase is about 6.5 KiB; total unique JS increases about 1.7%. No new runtime dependency was added.

Limits: 100 evidence items, 400 source records (at most 100 per collected view), 2,000 characters per item note, 4,000 per question, 10,000 personal-note characters, 25,000 combined question/personal/item-note characters, and 750,000 serialized UTF-8 bytes. A typical validation fixture is 1,519 bytes; a 100-observation fixture is 77,883 bytes. A useful warning appears at 80% of item, combined note or serialized-byte capacity; adding over the limit is rejected and preserves existing data. Browser quota availability varies and cannot be guaranteed by the size cap.

## 9. Known Phase 1 limitations

One notebook per browser origin/profile; no merge, cloud, collaboration, rich text, ZIP import, citation-manager integration or automatic paper writing. Series/map views store metadata, not frozen datasets or images. Live URLs may expose subsequent official revisions; Research Snapshot remains the archival row/image export route. Unknown historical bibliographic/geographic metadata is not inferred. Deduplication preserves collected records rather than refreshing them automatically. Simultaneous browser tabs are last-writer-wins, not a collaborative editing system; export before working across tabs.

## 10. Frozen platform and release boundary

Platform stays **v2.0**. Canonical research data, formal samples, readiness, registered engines, frozen outputs and package dependencies are unchanged relative to the deployed baseline. No frozen research program was rerun. Implementation initially stopped locally; the owner subsequently authorized commit, push and publication on 2026-10-02. The no-deploy Linux gate passed before updating main; successful recording alone is not a deployment claim.
