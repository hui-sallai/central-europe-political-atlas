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
| `monthly` | eurostat-high-frequency, macro-drivers, serbia-sors | live series only; historical descriptive stores are preserved |
| `annual` | annual-history (+ source-ahead check of `observations.json`) | backfill store refreshed; `observations.json` is a formal model input — newer years/revisions are **reported only** |
| `regional` | regional-history | NUTS 2024 dissemination; GISCO code lists decide comparability per year; v0.86/v0.89 map files untouched |
| `serbia` | serbia-sors | annual + monthly/quarterly + regional stores, applied as one unit (offline-rebuild validator) |
| `all-descriptive` | all of the above + monthly-history (revision audit) | |

Expected findings you must not "fix": `macro_driver_observations.json` is hash-pinned by frozen LP/panel-LP outputs and
has no research snapshot → any change is a **formal model impact → STOP**. The high-frequency live file is refreshable
because published uses are frozen to `src/data/high-frequency/snapshots/`; but `acquire-eurostat-monthly.mjs` also
rewrites the legacy `src/data/analysis/var_readiness.json` — a substantive change there is a readiness change → STOP.

## Steps
1. **Plan (read-only).** `pnpm data-refresh:plan -- --mode <mode>` (add `--offline` to replay archived raw responses;
   `DATA_REFRESH_VENV=<venv>` if the Python venv is not at `./.venv`). It clones data + scripts into
   `.tmp-data-refresh/<run>/stage`, runs the registered acquisitions there, and writes
   `.tmp-data-refresh/<run>/data_refresh_plan.json` and `data_refresh_report.md`. Exit 3 = STOP.
   The macro-driver acquisition needs `openpyxl` (`scripts/acquisition/requirements-macro-drivers.txt`); if Python
   reports `CERTIFICATE_VERIFY_FAILED` (python.org builds on macOS), set `SSL_CERT_FILE` to certifi's bundle.
   `--from-stage <run>` re-evaluates an earlier staged run without fetching again (e.g. to review one mode).
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
   changed since planning, copies the unit write-sets, and appends a hash-chained entry to
   `src/data/data-refresh/refresh_ledger.jsonl` (previous SHA-256 + git blob of every overwritten file, revised values,
   provenance). Provenance is never overwritten silently: raw archives replaced by the apply are listed with their
   previous blob (`git cat-file -p <blob>` restores them).
5. **Validate.** First the unit validators the apply prints (e.g. `pnpm serbia-audit:validate`,
   `pnpm historical-annual:validate`), then:
   `pnpm data-coverage:validate && pnpm ui-language:qa && pnpm lint && pnpm typecheck && pnpm build:site && pnpm test:ui`.
   A `data-coverage:validate` fingerprint failure means an audited observation changed — that is a stop condition.
   Run the full `pnpm build` only after the owner accepts the refresh; then restore incidental export changes
   (`git checkout -- public/research-data src/data/analysis/advanced_analysis_validation_summary.json`).
6. **Review.** Run the `research-boundary-reviewer` agent on the final diff (data diffs are expected only inside the
   applied write-sets and the ledger).
7. **Owner report** (concise): sources checked · sources changed · new observations · revised observations · held
   observations · definition warnings · coverage gaps · Serbia-specific issues · formal model impact (expected: **none**;
   if not none, STOP). Commit as `data: official descriptive refresh (<mode>, <run-id>)`. Do not push without "推送上线".
