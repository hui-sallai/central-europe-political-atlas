---
name: official-data-refresh
description: Routine maintenance of the Atlas's official DESCRIPTIVE data (Eurostat, ECB/BIS via the macro-driver pipeline, Serbia SORS/RZS). Use when the owner asks to refresh, update or check official data, new months/years, or source revisions. Modes monthly | annual | regional | serbia | all-descriptive. Stages every acquisition in a scratch copy, writes data_refresh_plan.json + an owner report, stops on any definition/unit/territory/comparability/formal-model change, applies only after confirmation, and never changes the platform version or releases.
argument-hint: <monthly|annual|regional|serbia|all-descriptive> [--offline]
---

# Official data refresh

Routine descriptive-data maintenance under the **current platform version**. It is not a research method, not a release
and not a re-estimation. Tooling: `scripts/data-refresh/` (`plan.mjs`, `apply.mjs`, `units.mjs`, `lib.mjs`).

## Never
- change the platform version: do **not** invoke the release skill; do not edit `src/data/release.json`, `package.json`
  "version" or a `CHANGELOG.md` release heading;
- modify formal model samples, model readiness, inference, scenario formulas, or re-run the frozen VAR/LP/panel-LP
  programmes (`var:*`, `lp:*`, `panel-lp:*` build/simulate/reference scripts);
- reinterpret historical observations, merge incompatible geography vintages (NUTS/NSTJ), or promote a Serbian
  descriptive-only series to cross-country comparison (`cross_country_comparable` comes only from
  `src/data/serbia/serbia_indicator_mapping.json`, which the owner maintains);
- replace a missing value with zero, interpolate, or delete an observation without owner review;
- hand-edit a canonical store — all writes go through `apply.mjs` so the ledger records them.

## Modes and units (`scripts/data-refresh/units.mjs`)
| Mode | Units | Notes |
|---|---|---|
| `monthly` | eurostat-high-frequency, macro-drivers (blocked), serbia-sors | live series only; historical descriptive stores are preserved |
| `annual` | annual-history (+ source-ahead check of `observations.json`; run `node scripts/data-refresh/canonical-check.mjs` for the full candidate report) | backfill store refreshed; `observations.json` is a formal model input — newer years/revisions are **reported only** |
| `regional` | regional-history | NUTS 2024 dissemination; GISCO code lists decide comparability per year; v0.86/v0.89 map files untouched |
| `serbia` | serbia-sors | annual + monthly/quarterly + regional stores, applied as one unit (offline-rebuild validator) |
| `all-descriptive` | all of the above + monthly-history (revision audit) | |

### Canonical annual source check (candidate report only)
`observations.json` is a protected formal model input with no refresh writer. `node scripts/data-refresh/canonical-check.mjs`
(no package script: package metadata is frozen by the source-closure checkpoint) re-runs **every record's own registered source query** and writes
`.tmp-data-refresh/<run>/canonical_candidate_report.{json,md}` plus the raw responses (`canonical-raw/`). It covers all
indicators in the file (the annual-history source-ahead check only sees the 17 backfilled ones) and reports:
new years at source · pending periods now published · revisions beyond / within the existing overlap tolerance ·
stored values missing at source · definition/break flags · derived values via their numerator/denominator queries ·
a reason for every pending period (`not_yet_published_at_source`, `missing_at_source`,
`not_available_for_country_at_source`, `published_at_source_not_imported`,
`published_at_source_with_definition_flag`, `source_acquisition_failure`, `no_registered_api_query`,
`not_applicable_by_research_rule`) · per-retrieval provenance (endpoint, HTTP status, retrieval time, the dataset's own
update time, response SHA-256). The release date of an individual observation is not exposed by the API and is recorded
as unavailable — never substitute a build or retrieval date.
- It **never writes** `src/data/**` or `public/research-data/**`. Do not turn a candidate into a data edit: updating
  `observations.json` needs a separate owner-approved procedure (and a new research baseline where a formal sample changes).
- A value flagged `definition_differs` / `break_in_series`, or found only by a sibling probe (another country's query
  with the country code swapped, e.g. Serbia HICP), is evidence about the source — not a comparable observation.
  Comparability flags stay the owner's decision.
- `--from-run <id>` replays archived responses without network. `--write-summary` (only when the owner wants the
  interface updated) rewrites `docs/data-refresh/canonical_source_check.json` and the generated
  `src/lib/canonicalSourceCheck.ts`; the latter is a UI file and needs an exact-hash UI amendment. The summary is pinned
  to the SHA-256 of the `observations.json` it checked — a tooling test fails if they diverge.
- UN Comtrade-derived series are not checked (no registered keyless API query).

Expected findings you must not "fix":
- `macro-drivers` is **blocked** (owner decision 2026-09-30) and reported as `blocked_by_owner_decision`: its only
  acquisition script is the v1.51 builder, which would roll `lp_readiness_registry`, `shock_identification_registry` and
  `v16_identification_readiness` back to v1.51, and the observations are hash-pinned by frozen LP/panel-LP outputs with no
  research snapshot. Refreshing macro drivers requires a deliberate release, never this workflow.
- The high-frequency live file is refreshable because published uses are frozen to `src/data/high-frequency/snapshots/`;
  `acquire-eurostat-monthly.mjs` also rewrites the legacy `src/data/analysis/var_readiness.json` — a timestamp-only
  rewrite is left untouched, a substantive change is a readiness change → STOP.
- Revisions of the high-frequency file interact with other stores: `monthly-history` re-derives its overlap gate from it
  (apply both together; a series' admission can flip), and any revision inside the audited window requires the coverage
  re-audit. The stage validators catch both automatically.

## Steps
1. **Plan (read-only).** `pnpm data-refresh:plan -- --mode <mode>` (add `--offline` to replay archived raw responses;
   `DATA_REFRESH_VENV=<venv>` if the Python venv is not at `./.venv`). It clones data + scripts into
   `.tmp-data-refresh/<run>/stage`, runs the registered acquisitions there, and writes
   `.tmp-data-refresh/<run>/data_refresh_plan.json` and `data_refresh_report.md`. Exit 3 = STOP.
   The macro-driver acquisition needs `openpyxl` (`scripts/acquisition/requirements-macro-drivers.txt`); if Python
   reports `CERTIFICATE_VERIFY_FAILED` (python.org builds on macOS), set `SSL_CERT_FILE` to certifi's bundle.
   `--from-stage <run>` re-evaluates an earlier staged run without fetching again (e.g. to review one mode).
   The plan also runs **every** descriptive validator inside the stage (not only the mode's units — stores are coupled)
   and reports them under "Validators in the stage"; a failure there is a STOP that apply never overrides. When
   revisions touch audited windows it re-tests `data-coverage:validate` after a trial re-audit and reports
   `coverage_reaudit: required_passes_after_reaudit` — apply then regenerates the audit itself once the owner accepts.
2. **Read the report and plan.** Per series: source, dataset, country, indicator, current vs source latest period,
   new / revised (within and beyond the registered overlap tolerance) / removed counts, definition/break changes,
   proposed action; per unit: provenance (endpoint, HTTP status, retrieval time, dataset update time, checksum,
   parser = acquisition script SHA-256), overwritten raw archives, Serbia preservation checks; formal-input exposure.
3. **STOP for owner review** (report the reasons in Chinese and English, do not apply) if the plan has any of:
   definition change · unit change · territorial classification change · an observation disappears · a revision
   beyond tolerance · cross-country comparability status change · comparability/break-status change · a missing value
   became 0 · a series' admission decision changed (e.g. held → ingested in a history manifest) · unregistered side
   effect · acquisition failure · formal model impact ≠ none. `monthly-history` is planned against the staged
   high-frequency data (its overlap gate reads it), so it can only be applied together with `eurostat-high-frequency`.
   `apply.mjs` refuses formal model impact, side effects and release files outright; other held units need
   `--accept-stop "<owner decision + date>"`, which is recorded in the ledger — only after the owner explicitly accepts.
4. **Confirm routine additions** with the owner (new periods, revisions within tolerance), then
   `pnpm data-refresh:apply -- --run <run-id>` (the research-data guard asks before it runs). It re-checks that nothing
   changed since planning, requires every changed unit of the plan to be applied together (that is the state the stage
   validators checked), copies the unit write-sets, runs the coverage re-audit if required, runs all stage validators on
   the real tree, and appends a hash-chained entry to
   `src/data/data-refresh/refresh_ledger.jsonl` (previous SHA-256 + git blob of every overwritten file, revised values,
   provenance). Provenance is never overwritten silently: raw archives replaced by the apply are listed with their
   previous blob (`git cat-file -p <blob>` restores them).
5. **Validate.** Apply already ran the store validators on the real tree (it exits 1 if any failed); then:
   `pnpm data-coverage:validate && pnpm ui-language:qa && pnpm lint && pnpm typecheck && pnpm build:site && pnpm test:ui`.
   Run the full `pnpm build` only after the owner accepts the refresh; then restore incidental export changes
   (`git checkout -- public/research-data src/data/analysis/advanced_analysis_validation_summary.json`).
6. **Review.** Run the `research-boundary-reviewer` agent on the final diff (data diffs are expected only inside the
   applied write-sets and the ledger).
7. **Owner report** (concise): sources checked · sources changed · new observations · revised observations · held
   observations · definition warnings · coverage gaps · Serbia-specific issues · formal model impact (expected: **none**;
   if not none, STOP). Commit as `data: official descriptive refresh (<mode>, <run-id>)`. Do not push without "推送上线".
