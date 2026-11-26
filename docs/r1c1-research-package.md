# R1-C1 · Binding selected evidence to descriptive snapshot bytes

This branch implements a browser-local core. Its inputs are a validated Notebook project, the report selection and explicit local ZIP files. The package can accompany a report even when some or all evidence has no eligible attachment. No public route, Notebook field, storage key, estimator, public data export or publication permission changes in this phase.

## Existing producers and research scope

| Inspected producer | What can be checked against the saved evidence |
| --- | --- |
| Data Explorer annual and high-frequency exports | Row and indicator identifiers, reporting country, reference period, layer, numeric value or explicit gap, unit, and recorded source fields. Annual display and internal source layer names have a small explicit alias map. |
| MacroDriverWorkbench | Series area, transformation, frequency, published versus descriptive layers and original source metadata. A monthly chart cannot establish quarterly observations. |
| NationalComparisonWorkspace | Notebook collection retains up to the first 100 row identifiers and 100 sources deduplicated by URL. Its total count is for the browsable rows. Requested endpoints, or browsable period endpoints, can differ from exported periods. Harmonized line exports use eligible common observations. Bar exports narrow the data to the reference period. Descriptive side-by-side selection preserves its own scope. The custom collector omits the chart view and actual reference period, and stores a definition in its dataset field. Both real bar modes in the browser tests produce partial correspondence. |
| SerbiaSorsMonthlyPanel and annual SORS entries | Source-native definition, source query, original unit and period label. Serbian CPI remains national CPI. Quarterly LFS retains quarters including where the chart uses quarter-end month labels. |
| ComparativeSpatialWorkbench | Region selection, geographic classification and level, year, boundaries and recorded legend when available. Map file integrity and geographic comparability are assessed separately. |
| German 1990 and Hungarian 1998 election evidence | The Notebook/report retain ballot, denominator and round-scope metadata as recorded. The supported snapshot format offers no immutable political attachment for these cases. A descriptive economic ZIP cannot bind an election ballot. |

The implementation reuses ResearchSnapshotExport, NotebookSnapshotCollect and their existing collection contracts as inputs. It calls the original snapshot builder to check derived manifest fields and companions. It uses the accepted report, citation and ZIP writers to assemble the output.

## What the checks establish

1. **Integrity.** Web Crypto SHA-256 covers the exact imported ZIP bytes and their original order, including headers and timestamps. Digests use 64 lowercase hexadecimal characters. Every included member also has its exact byte length and SHA-256. Deterministic serialization applies to the fixed input bytes, report time, locale, template, selection order and recorded metadata.
2. **Correspondence.** Each binding links a project, Notebook, selected evidence ID and content-addressed artifact. The six statuses are `exact_recorded_observation`, `compatible_live_configuration`, `partial_correspondence`, `conflicting_correspondence`, `insufficient_information` and `unsupported_artifact_type`. Match evidence, mismatches, any row IDs matched, and source relationships accompany each verdict. A current compatible configuration contains no claim that its rows existed at collection time.
3. **Historical capture.** Notebook v1 supplies a collection timestamp. Snapshot v1 supplies a declared generation timestamp. The manifest records their ordering and an unverified provenance status. A supplied expected hash is checked independently of those dates. An earlier declared date cannot establish independent historical retention. Equal dates cannot establish capture in the same operation. A later date permits a present-day correspondence assessment only. No v1 record authenticates a same-operation receipt or the historical release. A future receipt would need to bind the exact artifact digest, evidence and project identities, capture time, producer version and a verifiable recording mechanism at capture. Existing evidence has no such receipt.
4. **Attribution.** Source IDs are local to each input. Matching considers institution, dataset/code, source URL, definitions where recorded, data layer, original/normalized units and retrieval/update fields. Ambiguous many-to-one matches, divergent revisions and missing fields stay visible. The package lists observation-to-source edges, explicit null statuses and actual periods. These record what the artifact declares. Official publisher authentication requires independent evidence.
5. **Redistribution.** A separate decision controls the member bytes. A matching configuration or digest alone grants no reuse permission. Restricted or unverified items retain identifiers, source metadata, recorded limitations and digest references. Public source documents are never downloaded.

## Local ingestion and format

Only the UTF-8, single-disk ZIP32 STORE profile produced by the current Atlas writer is supported. A snapshot must contain the six standard v1 members in the declared order and may contain one supported static chart or map. The reader checks local records against the central directory, CRCs, file sizes and bounds, duplicate/conflicting paths, names and the application inventory before interpreting content. Compressed, encrypted and unsupported archives fail explicitly. Imported markup is never executed.

The inspector validates CSV syntax and column widths, row/source IDs, source edges, units, temporal frequencies, counts, geographic scope, common-period declarations and rendering metadata. It checks the generated README, citation and view locator against the manifest. Raw files are hashed in their received encoding. A string reconstructed for validation never replaces the original bytes in an attached member.

Intentional limits include 16 MiB per snapshot ZIP, 8 MiB per input member, 7 entries, 20,000 observations, 4,000 source records and 400,000 data CSV cells. The package accepts at most 16 bindings and 32 MiB of combined inputs. The assembled archive limit is 48 MiB, including a conservative header allowance. The core never inflates a member. Files outside the producer profile can be valid ZIPs and still be unsupported.

A permitted static SVG is inspected and hashed in quarantine. Its name, size, digest and recorded rendering configuration are available in the manifest. The SVG bytes are excluded. The figure-to-observations relationship remains unverified. Original boundary and map terms still apply. A valid SVG outside the supported subset can fail inspection.

## Assembly and independent verification

The seven root files are README.md, report.md, report.html, report_manifest.json, citations.bib, citations.csl.json and package_manifest.json. The R1-B manifest retains its original standalone semantics, citations and warning scopes. The new `atlas-research-package-v1` manifest refers to that manifest and contains `atlas-evidence-artifact-binding-v1` bindings. The member inventory excludes package_manifest.json itself. Retain the entire ZIP digest independently if detecting replacement of the manifest matters.

Root report files are written first, allowed artifacts follow in lexicographic SHA-256 order, and the package manifest is written last. Each artifact directory is named after the original input ZIP digest, including when only `data.csv` and `sources.csv` are included. Both are copied from the input. A complete original ZIP can be included only for an admitted byte-identical figure-free example. Individual observation matches must cover all artifact rows before the full artifact is attached. A configuration binding describes the view scope. Partial or conflicting proposals never qualify an attachment by themselves.

Rebuild the example from the repository root with an unused output path:

```sh
node tests/fixtures/research-package-example.mjs example.zip
```

The command prints the complete member inventory and package digest. It assembles two admitted Serbian series and one blocked method reference, with a fixed example time and local demonstration Notebook identifiers. One whole CPI archive contains 228 monthly records. Two quarterly LFS members contain 62 records. The selected method reference remains unbound. The package contains ten files in total. The demonstration timestamp has no historical evidentiary force.

## Antigravity handoff for R1-C2

Import the public functions and types from `src/lib/researchPackage.ts`. Keep the current Notebook project and Report Studio selection as the authority. A composer can implement the following sequence:

1. Check the user's chosen File size before reading it. Call `prepareSnapshotAttachment(project, evidenceId, new Uint8Array(await file.arrayBuffer()), optionalExpectedSha256)`. The returned `SnapshotAttachment` exposes evidence ID, digest, length, correspondence, source relationships, historical provenance, rights and figure quarantine status. The handle is transient. Keep the actual returned object in component state.
2. Show status, match reasons, differences and both recorded dates. Distinguish a live-configuration match, an individual observation match and actual permission to redistribute bytes. Display country/period/definition conflicts and missing metadata as recorded. Render text as text. No UI toggle can override a failed validation, incompatible source, pending licence or blocked model.
3. Remove an attachment by dropping the handle. Clear handles on project changes. When selected evidence or its source metadata changes, prepare it again. A detached copy or a handle from another project is rejected. Never store snapshot bytes or handles in the Notebook or browser persistence.
4. Call `buildResearchPackage({project, selectedIds, locale, template, reportTime, attachments})` using the active report timestamp. Preview `manifest.evidence`, `artifacts`, `bindings` and `byte_coverage` from the returned package. For each artifact show its scope, included member paths, rights basis, attribution and limitations. A report can have reference-only or unbound evidence. Disclose exported project notes and the existing scope-uncertain Notebook warning aggregate.
5. Download the returned `bytes` and display `sha256`. For a retained package, `verifyResearchPackageIntegrity(bytes, optionalExpectedSha256)` checks the ZIP and the inventory and returns the digest, byte length, verified-member count and expected-digest status. This verifier does not accept a package as a new source or certify imported HTML. Do not auto-open its contents.

The typed `ArchiveValidationError` reports archive limits/layout, unsupported format, path/member restrictions, UTF-8, integrity or unavailable crypto. `SnapshotValidationError` distinguishes schema/manifest/inventory, CSV/observation, source/scope, unsafe content, unsupported figure and size errors. `ResearchPackageError` distinguishes project, selection changes, attachment handles, digest mismatch, output limits and invalid package inventory. Existing report/Notebook validators can also reject invalid selection, locale, template, timestamp or Notebook structure. A structurally accepted file can still produce a limited binding or reference-only rights outcome. Handle those as review results.

## Claude Code handoff for R1-C3

| Evidence required | Currently recorded | Evidence still needed before extending admission |
| --- | --- | --- |
| Publisher, publication identity and revision | Snapshot-local source rows hold institution, dataset/code, URL, units, layer and any recorded retrieval/update dates. R1-B preserves missing bibliography fields. | Exact work, publisher role, document type, edition and genuine publication date. A retrieval date cannot substitute. |
| Retained version and retrieval | Two Serbian extracts can be reproduced from admitted runtime rows and the stored original query metadata. Upstream response digests and counts are recorded for these extracts. | Independently retained response or persistent version locator and retrieval evidence for each additional extract. A matching URL alone cannot identify a revision. |
| Licence and permitted scope | Current src-sors terms record attribution and disclosure of modifications. Two exact data/source CSV pairs are admitted, with terms, required attribution, selection counts and a modification notice. Two exact figure-free original archives are also pinned. Restricted registry sources are labeled separately; unmatched rights remain pending. | Review other extracts, revisions, third-party exceptions, use context and raw/normalized scope against authoritative terms. Keep a rights review date and durable evidence for each expansion. |
| Figure, boundary and third-party rights | SVG digest and available render settings are recorded. No imported graphic or publisher source document is redistributed by this core. | Permission for the precise geometry or figure revision, required credits, vintage, transformation and evidence linking rendered outputs to their inputs. |

The implementation reads the existing rights and attribution registers. This branch introduces no new authoritative rights ruling. Its exact-hash source-closure proposal awaits owner review. Production remains on the accepted predecessor.

## Acceptance evidence

The fixed example above yields an archive of 144,784 bytes with SHA-256 `e60ea7d4532b911164c0c6e4674a4778b8b608605954ccfced233a51a06a9463`. An isolated offline Chromium instance produced the same digest as Node. Python's independent ZIP reader verified the CRCs, file lengths and all nine inventoried SHA-256 digests. The browser's local storage remained empty during the isolated assembly test.

The example includes the figure-free CPI ZIP at `snapshots/a54adf0dc4af00c342104a863fd46e42577c6a55da3abdb7fb66c917cc15d12b/snapshot.zip`. The LFS input archive digest is `c1f0c04c57894bec60fd739a8cf846f8a47bb0a69647803705de4985d88c20a3`. The two LFS members have original digests `970a79c0a6f7693561dd05f8cba9c3a4a14eaca551983355b4f9dab8dd5bc204` (data) and `df7b9c82eefb75487a90e23b5d32fe6beff570f3eba43e9d80444c490d7267c9` (sources).

The Playwright acceptance spec collects the actual Notebook item and downloads the actual exported ZIP from seven local production-build views on both desktop and mobile. It feeds those downloaded bytes into the core and checks the resulting package. The views cover Polish annual HICP, Hungarian monthly HICP and policy rates, Polish–Hungarian harmonized and side-by-side comparisons, Serbian quarterly LFS, and the Hungarian regional population map. Native German and Hungarian ballot selections and Serbian annual data are checked separately in the binding tests. Archive corruption, unsupported input, inconsistent references, conflicting scopes and invalid permissions use intentionally modified fixtures.
