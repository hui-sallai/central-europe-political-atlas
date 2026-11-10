# v2.0 Targeted official refresh — the 189 "officially available, not admitted" periods (2026-11-11)

Central Europe Political Atlas v2.0. Platform version, release metadata and `package.json` unchanged. Descriptive data only.

Baseline: `main` at `24c3793`. Recovery inventory: 1,413 contracts; 189 category-1 periods ("officially available, not admitted"); 328 vintage-held periods (category 8).

Machine-readable output: `docs/data-coverage/targeted_refresh_reconciliation_2026-11-11.json` (all 189 cases, with official values, flags, query URLs, dataset update stamps, retrieval times and response hashes) and `…_2026-11-11.csv`.

## 1. Method

1. **Cases.** Every category-1 period in the committed inventory (`src/data/data-coverage/historical_recovery_inventory.json`): 189 periods in 110 contracts.
2. **Official verification.** `scripts/data-coverage/targeted-refresh-verify.mjs` re-downloaded the exact registered queries recorded in the history manifests. That was 43 queries: 11 to the Eurostat dissemination API (`ec.europa.eu`) and 32 to the BIS SDMX API (`stats.bis.org`). Both hosts are registered, and no query URL was constructed.
   - For each case it compared every archived cell for that country and period with the live response: value, flag and dataset update stamp.
   - It then rebuilt the inventory in a scratch copy with the live files substituted, so each case's live category comes from the same code.
   - Live responses are kept under `.tmp-data-refresh/targeted-verify-20261111/`, which is gitignored; the reconciliation records their hashes.
3. **Routine pipeline.** `scripts/data-refresh/plan.mjs --mode monthly --units eurostat-high-frequency --run targeted-hf-20261111` was run live in its stage. Nothing was written to the canonical stores.

## 2. Verification result

- All 189 periods have an official value in the live response.
- 0 cells differ from the archived extracts (2026-11-04 to 11-09), so there are no revisions and no vintage change for these periods.
- In the live rebuild all 189 remain category 1. None became officially unavailable or was already present.
- Units match the contracts: HICP `RCH_A` / `I15`; electricity `KWH`, EUR incl. taxes; FDI `MIO_EUR`; BIS `% p.a.` / index / local currency per unit.
- Two dataset stamps are newer than the archive: `sts_inpr_m` (11-10) and the extension-audit `irt_lt_mcby_m` (10-13). The case cells in both are unchanged.

Official flags on case values:
- **`d` (definition differs):** every Serbia HICP year 2007–2025; Serbia energy inflation 2025.
- **`e` (estimate):**
  - the October 2026 HICP and HICP-energy flash estimates for AT, DE, HR and SK;
  - the Austrian 2025 electricity prices;
  - Slovenia's long-term yield for 2026-08.
- **`p` (provisional):** Czech FDI 2025.

## 3. The 189 cases

| Class | Periods | Cases |
|---|---:|---|
| Admitted and published | **0** | None in this turn. The 7 eligible periods are staged; see §4. |
| Already present or no longer applicable | 0 | — |
| Officially unavailable | 0 | — |
| Definitionally incompatible | **5** | Serbia `hicp_inflation` 2021–2025. Every official value carries flag `d`, and the definition-compatible floor is 2026. The canonical store holds null records ("CPI pending RZS/NBS import"). The inventory lists them as category 1 only because its canonical-window rule is checked before the definition floor. |
| Restricted or awaiting approval | **184** | See the routes below. |
| Still unresolved | 0 | — |

The 184 restricted or awaiting-approval periods by route:

| Route | Periods | Countries / indicators / periods | Why not admitted |
|---|---:|---|---|
| High-frequency store (`eurostat-high-frequency` unit) | 7 | HICP annual rate 2026-10: AT, HR, DE, SK, SI. Croatia industrial production 2026-09. Croatia unemployment 2026-09. | Staged in `targeted-hf-20261111`; applying needs owner approval and a pipeline fix (§4). 4 of the 5 HICP values are flash estimates. |
| Macro-driver store (`macro-drivers` unit) | 139 | 2026-08 to 2026-10, nine series: policy rate, EUR bilateral FX, EUR/USD, nominal and real effective exchange rates, HICP energy rate and index, long-term yields. | `macro_driver_observations.json` is pinned by frozen LP / panel-LP outputs, and the unit is blocked by the owner decision of 2026-09-30. New months need a deliberate release. |
| Canonical annual store (`observations.json`) | 38 | Year 2025: energy inflation (10 countries), FDI inflow (8), household (10) and industrial (10) electricity prices. | `observations.json` is the canonical annual store and a frozen formal-model input, and Germany's canonical data stays byte-identical. No routine refresh unit writes it. |

The 328 vintage-held periods are unchanged. UN Comtrade coverage and the frozen formal-model inputs are untouched.

## 4. The staged high-frequency refresh (not applied)

Plan `targeted-hf-20261111` (live Eurostat, 2026-11-10T22:26Z): 20 new observations, 174 revisions within tolerance, 0 beyond tolerance, 0 removals. Formal model impact: none.

- **New observations:**
  - the 7 backlog periods;
  - 13 September 2026 values published after the archived extracts: industrial production for CZ, DE, HU, PL and RS, and unemployment for AT, CZ, DE, HU, PL, RO, SK and SI.
- **Stop.** `data-coverage:validate` fails even after the re-audit, because the recovery inventory does not reproduce from the refreshed store. The inventory is rebuilt from the high-frequency store, but it is in neither the unit's write set nor the plan/apply re-audit. This gap appeared with Phase R; the October runs predate the inventory.
  - Re-running the plan's re-audit in the stage and also regenerating the inventory makes every stage validator pass.
  - Category 1 then falls from 189 to 182, and the formal-input series count stays at 176.
- **Flash estimates.** The October HICP values for AT, DE, HR and SK carry flag `e`. The acquisition stores no source flags, so these would enter as unflagged official values (`latest_revised`). Eurostat's full October HICP release later in November replaces the flash. Re-planning after that release admits final values.

Decisions (owner delegated them to the project, 2026-11-11):
1. **Pipeline fix: done.** `plan.mjs` now regenerates the recovery inventory in the stage during the re-audit trial and restores it afterwards. `apply.mjs` regenerates it, copies it to `public/research-data/`, and records `inventory_regeneration` (previous and new hashes) in the ledger entry.
   - No gate is relaxed. Stage failures, formal-input changes and revisions without `--accept-stop` still refuse to apply.
   - Re-evaluating the same stage (`--from-stage`, run `targeted-hf-20261111-recheck`) now gives `required_passes_after_reaudit`, the routine state of the October refreshes, in which the owner accepts the official revisions at apply time.
2. **Apply timing: wait for Eurostat's full October HICP release.** Entering 4 flash estimates as unmarked official values would mislabel them. Then re-plan live, apply with the owner's acceptance of the revisions, and register that run at exact hashes.
3. **Serbia HICP: reclassify within that run's inventory regeneration.** In `recovery-inventory.mjs` the definition floor is checked before the canonical-window rule, so the 5 periods become category 6. A separate governed run is not needed. Changing the code now without regenerating would break the inventory's byte-for-byte rebuild check.

## 5. Interfaces

The annual, monthly, national and regional comparisons and the Data Explorer read coverage from the recovery inventory (`src/lib/historicalCoverage.ts`, from `24c3793`). Because no store changed in this turn, what they show is unchanged and correct. After an applied refresh they pick up the regenerated inventory with no UI change.

## 6. Changes made

- `scripts/data-coverage/targeted-refresh-verify.mjs`: new. Read-only live verification; writes only to `.tmp-data-refresh/`.
- `scripts/data-coverage/targeted-refresh-report.mjs`: new. Classification and reconciliation output.
- `docs/data-coverage/targeted_refresh_reconciliation_2026-11-11.json` and `.csv`: new.
- `tests/tooling/targeted-refresh-reconciliation.test.mjs`: new, 4 tests. They check exact coverage of the category-1 set, exclusive classes, live evidence from registered hosts, and that the Serbia HICP class and the 328 vintage holds are preserved.
- This report.

- `scripts/data-refresh/plan.mjs`, `scripts/data-refresh/apply.mjs`: the pipeline fix in §4.

No observation store, inventory, ledger, gate, model file, release file or `package.json` changed.

## 7. Validation

- Tooling suite 435/435 (incl. 5 new reconciliation and pipeline tests); `data-coverage:validate`, `legal-security:validate`, closure `--check`, source-closure `--checkpoint`, public-secret scan: pass.
- Stage validators of plan `targeted-hf-20261111`: all pass except `data-coverage:validate` (inventory reproduction, §4); pass after a trial inventory regeneration in the stage.
