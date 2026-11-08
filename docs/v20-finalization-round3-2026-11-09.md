# v2.0 finalization — Round 3/3, 2026-11-09

## Release decision

**PASS — approved v2.0 scope frozen at `1b857462dc4ff10bc91a7dbd1569d65b5b24625e`.** Pages #369 deployed successfully; the public identity, downloaded research package and production browser recheck agree with the approved release. The precise display-reader exception and publication/freeze have explicit owner approval. No release tag has been created. PASS does not clear the retained research, legal or development-dependency limitations below.

This is the finalization record for the existing v2.0 scope, not a new research release. Earlier evidence is retained in [Round 1](v20-finalization-round1-2026-11-08.md), [Round 2](v20-finalization-round2-2026-11-08.md) and the [previous final security round](v20-finalization-final-round-2026-11-08.md).

## 1. Actual baseline and release identity

The owner brief's `87e2879` / Pages #363 baseline is superseded. At reconciliation, HEAD, remote main and the live provenance agree on:

- Commit: `72830a1f6ad0797d28c677327a46a81a8876a067`.
- Successful Pages workflow: #368, run `42482778425`.
- Research ZIP SHA-256: `656dd2ee80fda0fe2eb70f2f167e59d343c1e870462cbeaba4d8593c7b1f4e0f`.

The baseline production ZIP was downloaded and independently hashed; its 466 members passed package validation. These are comparison identifiers, **not the final frozen identity**.

### Approved release deployed and independently checked

- Source commit: `1b857462dc4ff10bc91a7dbd1569d65b5b24625e` (implementation `e525ee3`, followed by the recorded owner decision).
- [Pages #369, run 42512384715](https://github.com/hui-sallai/central-europe-political-atlas/actions/runs/42512384715): completed successfully, build and deploy both successful.
- [Actual public deployment identity](https://hy-central-europe-analysis.org/research-data/deployment_provenance.json): the same full source commit and workflow run, retrieved after deployment.
- [Downloaded production research package](https://hy-central-europe-analysis.org/research-data/research-data-v2.0.zip) SHA-256: `5f92c519f7674a163de851667e719b7445cea6ba2cb1189d2b0e73a0b104164d`, independently computed and matching both public checksum fields.
- Package validation: 466 members, no failures; ZIP CRC validation passed. Inventory digest: `eb02b671bdda2458bd87c8ddd22c556d94ae32048271098fde16ba974e079998`.
- Comparing the two actual downloaded production ZIPs: identical member names/order; all 465 non-provenance members byte-identical. Only `release/deployment_provenance.json` changed. This establishes research-content continuity, not a claim that per-build ZIP bytes are identical.

Acceptance date is 2026-11-09 in Australia/Melbourne; GitHub's UTC build timestamps fall on 2026-11-08. A documentation-only evidence branch records post-deployment results without moving the approved production source commit or triggering another main deployment.

## 2. Existing versus newly corrected validation

Already implemented, committed and deployed in `76db04c`:

- The exact `refreshProvenance.server.ts` display exception in the annual, monthly and Serbia guards.
- All five descriptive coverage/history commands in `deploy-pages.yml`, before export.
- The legal/security assertion requiring those CI commands.

The latest successful baseline CI log confirms those commands executed. No duplicate workflow step was added in this round.

Missing from that implementation, and added here:

- Pin the helper's approved content to SHA-256 `e7d36d44285c26d44925553de09038e7cf3a838bfe23582244748c194b203bae`.
- Admit only `src/app/(zh)/data/page.tsx` and `src/app/(english)/en/data/page.tsx`; other app routes, components, models, scenarios, scripts and barrels are rejected.
- Resolve literal module imports/re-exports/require/dynamic imports using the existing TypeScript tooling; handle relative paths, dot segments and JavaScript extension aliases.
- Fail closed on deletion, movement, changed helper bytes, no remaining admitted importer, unresolved helper references or unauthorised consumers.
- Add 17 focused positive/negative tests, including a renamed alias in the actual TypeScript path configuration. No general `src/lib` allowlist was introduced; the original store-isolation restrictions are unchanged.

## 3. Governance basis and approval status

The helper's current content already has owner-approved presentation authority in `docs/legal-security/ui_governance_amendments.json`, amendment `annual-pending-source-availability-2026-10-20`, at the exact hash above. It is a read-only build-time projection for Data Explorer, not an estimator or model input loader.

The commit message and successful CI for `76db04c` are evidence of implementation/testing, not independent proof of owner approval of a gate exception. No separate earlier gate-exception decision was located in the supplied records. That historical absence was not retroactively relabelled as approval.

**Explicit owner decision, 2026-11-09:** in response to the precise approval question, the owner answered: “批准精确例外，并推送部署冻结 v2.0”. The approved scope is only the hash-pinned helper and its two existing Data Explorer consumers, conditional on final required CI and production acceptance passing. It does not authorise any model, scenario, index, new country, data change or legal permission. No tag is authorised or proposed.

## 4. Annual, monthly, regional and Serbia guards

All commands ran normally, without copied validators or temporary allowlist bypasses:

| Validator | Checks | Result |
|---|---:|---|
| data-coverage | 7,688 | PASS |
| historical-annual | 26,619 | PASS |
| historical-monthly | 84,167 | PASS |
| historical-regional | 76,607 | PASS |
| serbia-audit | 90,410 | PASS |

Each result was emitted after the complete validator finished. The annual 3,001 records, monthly 10,512 records and Serbia 150 datasets remain unchanged.

## 5. Generator determinism

The default spatial generator still carried an older, incomplete ODbL note and different property order/newline compared with the already approved committed licence file. Running the generator therefore rewrote that file, and the research export propagated its stale metadata to `spatial_display_gate.json`. This was deterministic stale generation, not random changes to research values.

The generator now emits the existing approved note, property order and newline exactly. No licence, permission, geography decision, value or display-readiness flag was changed.

Evidence:

- An isolated regression test runs the generator twice and compares all three generated v0.87 files byte for byte with the committed files.
- A real default export, followed by the export inside a full `pnpm build`, produced **zero byte differences** across all tracked canonical/research/v0.87 files.
- The local research ZIP has the same 466-member inventory as production. All 465 data members are byte-identical; only `release/deployment_provenance.json` differs.
- Per-build provenance (commit/run/time) and its resulting ZIP checksum remain intentionally variable. The committed research manifest stays deterministic; the ZIP cannot contain its own final checksum.

## 6. Candidate validation

- Full `pnpm build` passed, using the existing Python reference environment. Its canonical, frozen-output, VAR/LP publication, research, UI, SEO and release checks completed; 145 release checks, zero blocking failures.
- All 399 local tooling tests passed, zero skipped, including 18 newly added isolation/generator tests. The final helper resolves the actual TypeScript path configuration rather than matching only the visible import spelling.
- TypeScript, ESLint, source-closure checkpoint, political data, research-export check, package validation and built-output legal/security checks passed. One pre-existing unused-variable lint warning remains.
- Full existing browser suite: 626/626 passed, with no screenshot updates or skipped browser tests.
- The older baseline CI ran 381 tooling tests: 378 passed and 3 were conditionally skipped (two unpublished Romania staging fixtures absent, plus exported HTML not yet built). This is recorded accurately, not described as 381 passes. No skip, fallback or suppression was added by this round; all five mandatory history gates and the new negative tests execute.

Final release CI #369 independently confirms:

- All five history/coverage validators completed with the same counts in section 4, before export.
- Tooling: 399 tests, 396 passed, 0 failed, 3 existing conditional skips (the two absent unpublished Romania staging fixtures and pre-build exported HTML). All 18 new isolation/determinism tests executed and passed; the optional skips are not counted as passes.
- Browser tests: 626 passed, no skipped or failed browser tests, no baseline updates.
- Release QA: 68 routes, 174 exports, 3,013 internal links, 6 stable research URLs and 145 validation tests; zero golden or blocking failures.
- Built legal/security gate: zero failures. Secret scans passed on 1,854 tracked/candidate files and 2,752 generated-site/candidate files, including the post-push generated output.

### Real production browser acceptance

The existing finalization suite ran against the public site, not the local static server. The completed recheck passed **12/12 tests**, zero skips, in both desktop/mobile viewports, with unchanged assertions and timeout settings. It checked the bilingual homepage, ten-country map selection, four Workspace entries, navigation and language switching, plus these three research journeys:

- [D4 comparative election-economic case](https://hy-central-europe-analysis.org/en/politics/poland/?research_study=d4).
- [Hungary CATL implementation case](https://hy-central-europe-analysis.org/en/models/?tab=run&skill=event_window_analysis&country=hungary&event=hu-2022-08-12-catl-debrecen&section=case).
- [Czech REPowerEU implementation case](https://hy-central-europe-analysis.org/en/models/?tab=run&skill=event_window_analysis&country=czechia&event=cz-2023-10-16-repowereu-plan&section=case).

Locale round-trips and refresh preserved each case. Actual CSV and JSON downloads were inspected by the existing assertions: evidence SHA-256 recomputation, language-invariant evidence digests, D4 source-index resolution and displayed/CSV numerical agreement. Hungary retained its unavailable monthly window; Czechia retained its available descriptive window. Both displayed the four existing E2.1 additions and unresolved-evidence disclosures. No new outcome or causal estimate was introduced.

The first production run, while the 160 MB package download was also active, had 9 passes and 3 five-second navigation/lazy-panel assertion timeouts (English Workspace navigation, desktop D4 and desktop Hungary). Captured pages included a loading state. After the download completed, one full diagnostic recheck with browser traces passed all 12 tests without changing code, assertions or timeouts. The initial failures are retained; download contention is a possible explanation, not a demonstrated cause. Intermittent cold-load latency remains a limitation rather than being erased from the acceptance history. Logs, downloaded exports and traces are preserved with the local freeze evidence.

Round 1/2's research evidence and numerical/export comparisons are reused. No new econometric simulation, source-evidence audit, country import or research case was performed.

## 7. Security and known limitations

Current `pnpm audit --prod` reports zero advisories. The full audit reports one moderate `minimatch` advisory in development lint tooling (patched range `>=11.0.1`); it returns a nonzero status and is not represented as a clean full audit. The previously documented dependency boundary prevents an unapproved major override. No new dependency or override was introduced.

Existing source/legal permission limits, controller-establishment uncertainty, noncommercial operating scope and hosting-header limitations are not newly cleared by this round. Formal VAR dynamic responses, IRFs and structural identification stay unavailable. Missing observations, unverified party/source relationships, CATL outcome gaps and the recorded preliminary Czech payment assessment remain explicit.

## 8. Changelog, metadata and freeze

`CHANGELOG.md` now summarises the delivered national/regional data, five-country parliamentary research, D1–D4, E1–E2.1, four Workspaces, bilingual homepage and reproducible provenance/exports, distinguishing all retained limitations. It records the gate and deterministic-generator corrections.

`src/data/release.json`, `package.json`, method versions, canonical research data and formal publication flags are unchanged. Platform version remains v2.0. No tag has been created.

The final release commit, workflow and independently verified checksum are recorded in section 1. Owner approval is recorded above; the older baseline identifiers are retained only for comparison. All required release gates and the production recheck passed. Remote main was checked again and remains the approved source commit.

This post-deployment acceptance record is committed on `docs/v20-freeze-2026-11-09`, a documentation-only branch. It does not alter the frozen source commit, research package or live deployment. No new deployment framework, main push, version bump or tag is required to record results that can only exist after deployment.
