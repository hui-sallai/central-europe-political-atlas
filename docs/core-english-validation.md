# Core English Edition — local acceptance and handoff

Platform: v2.0 (`package.json` 2.0.0). Branch: `feature/core-english`. Baseline: `da0457d61ba61e561bedb29be116d58d1ae1231e`. No commit, push, deployment or next product phase is authorized by this implementation request.

Deployment follow-up: the owner subsequently authorized push and deployment. The complete release build, using frozen-output reuse and the existing export/package workflow, passed all release assertions (41 routes, 174 exports, 1,144 internal links). Generated research files are restored before commits; CI regenerates them with the final commit SHA. The earlier 17 stale-export failures below describe the site-only implementation checkpoint, not the validated full release build. Linux baseline recording and actual deployment verification are separate pending release steps.

## Scope and presentation architecture

There are 20 Chinese/English route pairs: home, countries index, ten country profiles, data, map, models, scenarios, methodology, events (`news`), legal and privacy. Chinese paths remain unchanged; English paths add `/en/`. Separate root layouts generate the correct initial HTML language. The shared static bilingual 404 is noindex. See [architecture](i18n-architecture.md).

Typed shell dictionaries, reviewed first-party JSX text dictionaries, and stable-ID country/indicator/analysis-skill overlays translate presentation only. Shared calculations, filtering, classifications, numeric data and original provenance are not copied into locale-specific datasets. Original event/project prose and source titles are explicitly language-marked and not automatically translated. Structural sample events are excluded from English public country reporting. Current methodological boundaries are complete in English; long v1.85–v1.90 archival prose is summarized with links to canonical Chinese detail and shared artifacts.

Both variants have canonical URLs, zh-CN/en/x-default alternates, locale-specific OpenGraph metadata and localized Dataset JSON-LD. The sitemap includes both variants; research downloads remain shared.

## Snapshot and browser acceptance

English snapshots localize README, citation, presentation fields and figures; locale is recorded without changing the snapshot schema. Raw CSV unit codes, stable IDs, numbers, missing values, original source metadata and URLs are unchanged. Actual bilingual browser downloads are compared for annual control sequences, high-frequency history, macro drivers, Serbia SORS quarterly records, country comparisons and both map classifications. Language switches round-trip current queries and hashes for data, map and country comparisons.

Final full browser rerun: **130 passed (1.5 minutes)**. The suite contains 130 tests: 48 original regressions, 42 bilingual route/SEO/accessibility/format/snapshot/switch tests, 28 method-overlay and dynamic diagnostics tests, and 12 English visual tests. Desktop 1440 and mobile 390, both themes, axe, actual downloads and opened diagnostics are covered. English method audit checks visible text and accessibility attributes; original language-marked records are excluded narrowly.

Twenty-four Darwin English screenshot baselines were deliberately recorded using `pnpm test:ui:update tests/ui/i18n-visual.spec.ts --update-snapshots=all`; normal tests never create missing baselines. Representative screenshots from every core page and both viewport categories were visually reviewed. Existing Chinese baselines were not edited. Linux English baselines remain missing and require a separate explicitly authorized no-deploy recording run and review; CI has not been claimed as passing.

## Validation evidence

- `pnpm lint`, `pnpm typecheck`, `pnpm build:site`: pass; 45 generated static entries.
- `pnpm i18n:validate`: 795 checks, 20 route pairs, pass.
- `pnpm seo:validate`: 265 checks / 42 core pages, pass.
- `pnpm ui-language:qa`: pass.
- `pnpm security:scan`: 1,112 candidate files checked, pass.
- UI regression validator: 169 checks, pass.
- Analysis registry: 202 checks, pass; VAR publication boundary: 41 checks, pass; frozen research-program closure: 120 checks, pass; Panel LP closure: pass.
- Independent read-only research-boundary review: PASS, including final route-validator and static-404 changes.
- Protected canonical data trees, engine files, output formulas, readiness, formal estimates/inference and dependency lockfile: no changes. Version remains v2.0.

## Bundle cost

Reproducible comparison of baseline and current `out/_next/static/chunks/*.js`, gzip each file using Node's gzip defaults, unique initial script URLs per HTML route. This is a transfer-size estimate, not a timing benchmark.

| Scope | Baseline gzip bytes | Current gzip bytes |
| --- | ---: | ---: |
| All JavaScript chunks | 1,235,857 | 1,311,284 |
| Chinese home initial scripts | 191,661 | 193,923 |
| Data initial scripts | 213,638 | 259,430 |
| Models initial scripts | 376,274 | 422,365 |

Total chunk gzip growth: 75,427 bytes (6.10%). English home: 191,974 bytes. Chinese/English data pages load exactly the same 12 script URLs; models have the same 422,365-byte script total. Large research data remain shared. The reviewed legacy-text adapter imports presentation dictionaries on shared interactive pages, adding approximately 45 KiB to data/model initial scripts; splitting these dictionaries by workbench is a future performance optimization, not a reason to duplicate numeric data.

## Release limitations — do not bypass

`pnpm release:validate` is not passing: 17 unchanged export/package failures remain. The checked-in public metadata and manifest are still v1.91, while canonical platform configuration is v2.0; the v2.0 research ZIP and current manifest/hash/provenance have not been regenerated in this presentation-only phase. Byte comparisons confirm that these public artifacts match the baseline checkout. English route/link/language checks and static 404 issues were fixed; statistical release assertions were not weakened.

Do not deploy this local `build:site` output. A separately authorized release must generate the current canonical export/package using the existing release workflow, verify all frozen outputs and package provenance, review Linux English screenshots, run full release/CI checks, then verify the actual deployed SHA and files. That release-generation step is deliberately not performed here because this phase prohibits edits to frozen public research outputs and does not authorize deployment.

Other intentional limitations: political/source prose remains in the original language; archival methodology is summarized; one static bilingual 404 cannot select locale from an unknown request path; `globalNotFound` remains an experimental Next.js flag. No translation API, server runtime, new dependency, method activation or Question-first Research Workspaces was introduced.
