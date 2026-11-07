# v2.0 finalization — Round 2, 2026-11-08

Scope: research data, provenance, methodology and export consistency at the deployed baseline.
Round 1 UI and browser acceptance was not repeated; see [Round 1 production acceptance](v20-round1-production-acceptance-2026-11-08.md).

## Baseline

| Item | Value | Verified by |
|---|---|---|
| Commit | `87e2879f9c55c808d0e97217a8571ddbeb751c48` | remote `main`, local HEAD and the live `deployment_provenance.json` agree |
| Workflow | Pages #363, run `42397600046` | live provenance |
| Research package | `research-data-v2.0.zip`, SHA-256 `962d660678531b45ff30ae250f194c6787927bf01cde3df02dff31bbe4db0309` | hash of the downloaded production file (168,293,755 bytes, 466 entries) |
| Platform | v2.0 | package `platform_metadata.json` and `release_manifest.json` |

## 1. D4 CSV source-reference correction on production

The production D4 exports were downloaded once each in English and Chinese. This was a single scripted download, not the acceptance suite.

They were compared with a local build of the same commit, generated with the library functions that the tooling test uses:
- **CSV:** both production CSVs are byte-identical to the local CSV (357 lines).
- **JSON evidence:** `evidence_sha256` is `9726ff00…3213` in both languages. This is the digest recorded before and after the fix, and the embedded evidence equals the local evidence exactly.
- **Source rows:** 110 `source` rows, the same ID set as the JSON source index.
- **References:** 0 unresolved `source_refs` across all non-source rows.
- **Aggregate rows:** 40 (20 `country_direction`, 20 `direction_without_country`).
  - All 40 carry non-empty references, sorted and deduplicated.
  - None still carry the old narrative text in `source_refs`; the derivation note sits in `note`.
  - Each `country_direction` row cites only macro sources for its own country and indicator.
- **Method version:** `atlas-comparative-research-case-v1` on every row.

**Result: the correction is live and confirmed.**

## 2. Provenance

- **Package reproducibility:** `export:research-data` and `build-research-package.mjs` were rerun locally at `87e2879`.
  - All 465 data entries are byte-identical to the production ZIP.
  - The only difference is `release/deployment_provenance.json`, which is per-build by design (`scripts/release/release-provenance.mjs`). Inside the ZIP it names the same commit and run, with `research_package: null`, because a package cannot contain its own hash.
- **Served files:** all 441 tracked `public/research-data` JSON/CSV/MD files, plus `public/data/boundaries/v087/shared-license-records.json`, are byte-identical on production to the committed files.
- **Committed manifest:** `release_manifest.json` in the package equals the live file. Its `source_commit: local-working-tree` is the deterministic committed form. The deployment identity comes from `deployment_provenance.json`, merged by `readReleaseManifest()`.
- **Unchanged data:** `public/research-data` and `src/data` have not changed between `bafdc71` and `87e2879`. Germany's political data was last changed in `4348f79` (2026-10-02).

## 3. Research data and export consistency

- **JSON/CSV pairs:** all 52 pairs in the package (observations, countries, indicators, sources, events, China projects, and every political table for five countries) have equal row counts and agree cell for cell. That is 68,116 scalar cells, with 0 mismatches. Every `record_count` field matches its records.
- **Unpaired CSV:** `var-residual-diagnostics/var_residual_diagnostic_reference_inputs.csv` has no JSON pair, by design; it is a reference input.
- **Referential integrity:** all 980 observations resolve their `source_id`, `indicator_id` and `country_id`. There are no duplicate observation or event IDs, and all source URLs use https.
- **Validators:**

  | Validator | Result |
  |---|---|
  | `data-coverage:validate` | 7,688 checks |
  | `historical-regional:validate` | 76,607 checks |
  | `analysis-registry:validate` | 202 checks |
  | `lp:validate` | 663 tests |
  | `research:validate` | canonical immutability passed |
  | `analysis:validate` | passed |
  | `research-export:check` | passed |
  | `political-data:validate` | 26 files |
  | `political-source-closure:validate --checkpoint` | 848 frozen files; Germany unchanged |
  | `legal-security:validate` | 0 failures |

  All passed. The political-source closure gate without `--checkpoint` stays `CLOSURE BLOCKED` as designed (`countries_ready: 0`).
- **Tooling tests:** all 46 tooling test files ran: 378/378 pass.

## 4. Methodology

- **Model versions:** model ID, model version and formula version agree across `release_manifest.model_versions`, `models/model_cards.json` and `models/formula_versions.json`. Weight versions agree with `models/weights.json`.
- **Model outputs:** all 40 records carry the matching model, formula and weight versions (four models, 10 countries).
- **Weights:** the input weights of each model card sum to 1.
- **Unchanged since Round 1:** the D4 method (`atlas-comparative-research-case-v1`), the E1 method (`atlas-event-mechanism-research-v2`), the E2 implementation evidence, frozen registries and the formal VAR/IRF publication gate.

## 5. Verified finding (not fixed in this round)

**Three methodology-isolation guards fail, and CI does not run them.**

The guards are `historical-annual:validate`, `historical-monthly:validate` and `serbia-audit:validate`. Each stops at its "model/scenario code must not read …" assertion, naming `src/lib/refreshProvenance.server.ts`.

**Cause:**
- The file was added in `498071b` (2026-10-20).
- It is a build-time projection for the Data Explorer provenance display, imported only by `src/app/(english)/en/data/page.tsx` and `src/app/(zh)/data/page.tsx`.
- No model, scenario or index code imports it, so the boundary itself is not breached. The file falls outside the guards' path allowlist, which permits `src/app/` and `src/components/` but not this `src/lib/*.server.ts` display helper.

**Effect:**
- The assertion throws, so every later check in those validators has not run since 2026-10-20.
- `pnpm build` fails locally at its first history step.
- `deploy-pages.yml` runs none of these three validators, nor `data-coverage:validate`, so CI stayed green.

**Data check:** temporary copies with only that file allowed were run and then deleted, and all remaining checks pass:

| Validator | Checks | Records |
|---|---|---|
| annual | 26,619 | 3,001 |
| monthly | 84,167 | 10,512 |
| Serbia | 90,410 | 150 datasets |

The data behind the guards is therefore sound.

**Why not fixed here:** the fix changes gate validators, and governance requires that validators are not weakened without the owner's decision.

**Recommended fix for the final round:**
1. Allow exactly `src/lib/refreshProvenance.server.ts` in the three allowlists.
2. Add an assertion that it is imported only from `src/app/`.
3. Add the four validators to `deploy-pages.yml`.

## 6. Other open items

- A local `export:research-data` still rewrites `public/data/boundaries/v087/shared-license-records.json` and `public/research-data/spatial_display_gate.json`. The production copies equal the committed files, so this is a local generator issue only. It is being handled in a separate task and was restored here, not committed.
- The production E1 evidence digests for CATL and REPowerEU were not recomputed in this round, because they depend on windows computed in the browser. Their inputs (served research files and the committed code) are byte-identical to the deployed baseline, and Round 1 recorded the digests on production.

## Conclusion

- **Data:** the deployed research data, package, provenance, model metadata and exports are consistent and reproducible from `87e2879`.
- **D4:** the CSV source-reference correction is confirmed on production.
- **Defects:** no data or export defect was found, and nothing in the code or data was changed in this round.
- **For the final release round:** one gate defect (§5) needs the owner's decision.
