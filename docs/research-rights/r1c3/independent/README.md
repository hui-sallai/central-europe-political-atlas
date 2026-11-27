# R1-C3 independent acceptance

Candidate branch `research/codex-r1c3-exact-artifact-admission` descends from the two original research commits ending at `f46e03500987aff2a073027f6624c0f6599e71b5`. Their complete diff against `9cb65307a9789744580e687052504fd4d8d02d35` adds twelve documents. That baseline contains the accepted C2 commit `6fda69a2411314d37637b0a770a1558ee9bc1240`. A fresh production manifest and remote Git references both identified the baseline, Pages run 46027169165 and public research ZIP SHA-256 `38f7da8513d3dcee205f382ddf28c86180c9681ba4eb6b8ff98082a7e6dd5a70`. On 2026-11-28 the owner approved the two exact candidate hashes for draft PR review.

| Producer and decision | Exact observation scope | Package disposition with a native Notebook selection |
| --- | --- | --- |
| SORS 03010601IND03 · ready | 228 national CPI index observations, January 2007 through December 2025, same month of previous year = 100 | Both pinned CSVs. Original ZIP only for the separately pinned figure-free fixture. |
| SORS 210105IND02 · ready | 321 national retail turnover volume observations, January 2000 through September 2026, constant prices, calendar and seasonally adjusted, 2021 = 100 | Same finite admission rule. The July, August and September 2026 values retain their provisional status. |
| Eurostat PRC_HICP_MINR · reference only | 12 Hungarian monthly HICP annual rates in 2020, RCH_A, coicop18=TOTAL | Both CSVs reproduce. The real Notebook selection omits the snapshot's statistical definition. Partial correspondence leaves seven report files and no snapshot payload. |

The [pre-implementation decisions](admission-decisions.json) record the candidate digests, access dates, attribution and conditions. The [artifact receipt](row-verification.json) distinguishes hashes of retained files from SORS whole-response checksums recorded by the acquisition process. All 839 SORS rows across the four fixtures and all 12 Hungarian observations matched. The JSON-stat decoder resolves dimension positions before comparing values and checks presence and status separately. Dates in the Eurostat source CSV are blank. The retained September response has a documented access time. The October canonical update has no corresponding capture receipt.

The [source review](source-review.md) records the publisher notices, individual catalogue entries, official legal instruments, source exceptions and review limits. The SORS registry update changes four evidence fields. The 19 registry rows yield identical general export-policy decisions for all 57 source/kind combinations. The package keeps each admitted pair's notices in `package_manifest.json → artifacts[].rights`, referenced by its root README. The six existing report/citation files retain their R1-A/B semantics. The two previously admitted series and their deterministic reference package retain their original bytes.

## Reproduction and evidence

Run at the repository root with the locked Node dependencies and Python 3.

- `python3 docs/research-rights/r1c3/independent/verify_artifact_rows.py` reproduces the [row receipt](row-verification.json) offline. The four figure-free ZIPs have the fixed fixture time 2026-11-26T12:00:00.000Z.
- [Production downloads](production-snapshots.json) inventory ten real EN/ZH downloads from the accepted website. Each full archive includes its own timestamp and figures. Only the reviewed CSV pair can be copied from a matching figure-bearing source.
- `node docs/research-rights/r1c3/independent/verify_prior_exports.mjs DIRECTORY` checks the original dossier browser ZIPs held by the reviewer. The [historical replay](prior-snapshots.json) records all ten inspected archives. The older Hungary file retained its original archive SHA-256 `d1ac906ee775e40cbe5175e000f045ac831f5ca49fa8f715272e493f91e37985` and its figure remained quarantined.
- `node --test tests/tooling/r1c3-exact-artifacts.test.mjs` exercises the exact permits, valid near misses, required notices and correspondence decisions.
- On a freshly built candidate, run `pnpm exec playwright test tests/ui/r1c3-exact-artifact-admission.spec.ts`. An optional directory named by `R1C3_BASELINE_SNAPSHOTS` makes desktop tests import the pre-change bilingual downloads; mobile tests collect and attach a fresh download. The test performs independent ZIP CRC, member and SHA-256 checks plus the browser's own package verification. Reports and personal notes use isolated browser storage.
- [Candidate package inventories](browser-downloads.json) list the exact digests of the downloaded package and its individual members. Recompute the digest on the retained download. Different independently timed browser exports may have different whole-file digests.

## Deferred decisions

A separate Eurostat proposal would need to preserve the official statistical definition in both native collection and snapshot filter contracts, demonstrate compatibility for each source without granting missing fields retroactively, and replay older projects. For the exact Hungarian extract only, a future package could then supply the DOI, datacode URL, documented retained-response date, Atlas modification and translation notice, and Eurostat non-responsibility notice. All three tests, structural integrity, correspondence and rights, would still precede assembly.

A wider change to global attribution requires a separately reviewed versioned snapshot producer and reader. Pin the complete existing v1 attribution rules for v1 replay; select any new rules from an explicit future schema/version. Verify the archived files under their original rules. An imported attribution string cannot select its own validation rules. No global attribution or snapshot validator changed here.

Polish annual HICP still has unresolved co-source wording. BIS policy rates and derived FX, other SORS extracts and regional population lack sufficient source-specific evidence. GDP comparisons and model references remain references. GISCO boundaries, figures and political attachments remain outside admission. Details and evidence needed are in the [original unresolved register](../blocked_and_unresolved.md).

The [owner approval record](governance-proposal.json) lists both approved hashes. The UI governance register pins the presentation helper; the source-rights registry retains its separate approval. Frozen research exports, source data, the Composer, Notebook schemas and screenshots have no candidate diff.

## Validation for owner review

| Check | Result |
| --- | --- |
| Canonical export regeneration | 1,009 tracked research files compared. Zero differences. |
| Tooling suite after site build | 637 passed, 4 skipped. Eight new tests account for the increase from 629 passing. Existing dated-input and local-evidence conditions account for the four skips. |
| Production builds | The repository's default Turbopack build produced all 93 static pages in an isolated build directory with identical runtime and registry hashes. The worktree also produced all 93 with Webpack. |
| Existing browser regressions | 169 passed, 11 existing conditional skips across R1-A/B/C1/C2, Notebook, Research Snapshot and Workspaces on desktop/mobile. Ran against a private preview port serving this candidate's Webpack production output. No baseline recording. |
| New C3 browser suite | All 20 passed on default production-build output. Ten old downloads and ten newly generated snapshots attached in EN/ZH; 16 normalized-member packages and 4 reference-only packages. Independent ZIP inspection verified 172 members and the browser verifier matched all 20 package digests. |
| Lint / typecheck / bilingual copy | Passed. Lint reports three existing warnings in the Hungary and Slovakia election generator scripts. |
| i18n / SEO / UI regression | 2,898, 547 and 289 checks respectively. |
| Legal/security / political-person safety | Full legal/security validation and political-person safety passed. |
| Release QA | 88 routes, 174 exports, 5,102 internal links, 6 stable research URLs and 145 validation tests; zero golden or blocking failures. |
| Source-closure checkpoint | Accepted input passed with 715 approved exact paths and 848 frozen files checked. The owner-approved candidate passed the same checkpoint with 715 approved paths, 848 frozen files and 48 gate checks. The checkpoint reported 10 absent private evidence files. |
| Old snapshot and source compatibility | All ten original dossier exports were structurally accepted. The earlier fixed SORS package digest remains `e60ea7d4532b911164c0c6e4674a4778b8b608605954ccfced233a51a06a9463`. |

The repository secret scanner passed on all 2,405 tracked and publish-candidate files with this change staged. The candidate branch preserves the dossier commits and the two reviewed source changes; no raw publisher page, snapshot archive, unapproved payload or private notes belong in Git.

### File scope relative to the dossier

- Governance registration: `docs/legal-security/ui_governance_amendments.json`.
- Runtime and registry: `src/lib/researchPackageRights.ts`; `docs/legal-security/source_rights_registry.json`.
- Automated regressions: `tests/tooling/r1c3-exact-artifacts.test.mjs`; `tests/ui/r1c3-exact-artifact-admission.spec.ts`.
- Independent evidence under this directory: `README.md`, `admission-decisions.json`, `source-review.md`, `row-verification.json`, `verify_artifact_rows.py`, `prior-snapshots.json`, `verify_prior_exports.mjs`, `production-snapshots.json`, `browser-downloads.json`, `governance-proposal.json`.

**Owner decision (2026-11-28)**. The two SORS admissions are approved at the recorded hashes for draft PR review. The Hungarian HICP example remains reference-only. Merge and deployment require separate authorization.
