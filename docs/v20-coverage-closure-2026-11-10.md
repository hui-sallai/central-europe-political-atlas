# Central Europe Political Atlas v2.0: historical coverage closure audit (2026-11-10)

Scope: closing the coverage audit for the `historical-recovery-20261110` run (Phase R), which added 7,799 observations from Eurostat, BIS and SORS.

| Item | Value |
|---|---|
| Production audited | `ffea0df` (Pages run 42791100819) |
| Comparison baseline | `c1c58958` (Pages #372), the last production before Phase R |
| Mode | Audit only. No data store, export or model output changed. |
| Data refresh | None. No new ingestion run, and no model re-estimated. |

The machine-readable results reproduce exactly from the committed files with:

```
node scripts/data-coverage/coverage-closure.mjs
```

- [`docs/data-coverage/historical_coverage_closure_2026-11-10.json`](data-coverage/historical_coverage_closure_2026-11-10.json): full results, including the reconciliation, coverage matrix, short series, held series, corrected comparability verdicts, provenance, integrity checks and rights.
- [`docs/data-coverage/historical_coverage_matrix_2026-11-10.csv`](data-coverage/historical_coverage_matrix_2026-11-10.csv): one row per country × indicator × frequency (× region) contract.

**Verdict: historical coverage is not complete, and the Atlas does not claim it is.** Every one of the 1,683 supported contracts has been audited and every gap has a recorded cause. Full coverage cannot be claimed for four reasons:

- The earlier availability of the 140 UN Comtrade trade-partner contracts is not established, because a rights review is due.
- The World Bank panel is a frozen formal frame.
- 189 periods are officially published but are not in the Atlas yet. All of them belong to the regular refresh path.
- 328 periods remain unresolved. They are held by the vintage splice check.

## 1. Reconciliation of the 7,799 additions

Each data store was compared record by record with its state at `c1c58958`.

| Store | Before | Now | Added (all flagged `R`) | Removed | Changed | Ledger count |
|---|---:|---:|---:|---:|---:|---:|
| Annual history (Eurostat) | 3,001 | 4,996 | 1,995 | 0 | 0 | 1,995 |
| Monthly history (Eurostat, BIS) | 10,512 | 15,674 | 5,162 | 0 | 0 | 5,162 |
| Regional history (Eurostat NUTS) | 13,453 | 13,868 | 415 | 0 | 0 | 415 |
| SORS annual | 345 | 356 | 11 | 0 | 0 | 11 |
| SORS monthly/quarterly | 2,529 | 2,553 | 24 | 0 | 0 | 24 |
| SORS regional | 8,751 | 8,943 | 192 | 0 | 0 | 192 |
| **Total** | | | **7,799** | **0** | **0** | **7,799** |

**By source family:**
- Eurostat: 4,013
- BIS: 3,559
- SORS: 227

**By frequency:**
- Annual: 2,613
- Monthly: 5,186
- Quarterly: 0 (no quarterly period was recovered; the SORS quarterly LFS series in the store starts in 2011-Q1)

**By scope:**
- National: 7,180
- Regional: 607
- Euro area: 12

All 279 recovered country × indicator × frequency groups are in the JSON (`reconciliation.series`). Each group lists its first and last period, units, source datasets, statuses and flag counts.

**Checks with zero findings:**
- duplicate IDs;
- duplicate natural keys;
- a recovered cell repeating a canonical, formal monthly, macro-driver or regional snapshot cell;
- records added without the `R` flag;
- an `R` flag on a pre-recovery record;
- annual years outside each series' recovered window;
- regional years that are not `backcast_boundary_revision` before 2000;
- SORS periods other than 1999;
- units differing from the series' earlier records;
- per-store counts differing from the ledger.

**Formal stores** are byte-identical to the baseline:
- `observations.json`
- high-frequency observations
- macro drivers
- v0.86 and v0.89 regional observations
- World Bank panel
- trade edges and trade metrics

**Coverage before and after, earliest period:**

| Layer | Before | After |
|---|---|---|
| Annual | 2000 everywhere | AT, RO, SK 1960; CZ, HR, HU, PL, SI 1990; DE 1991; RS 1999 (new) |
| Monthly | 2000-01 | DE 1980-01, AT 1985-01, HU 1987-01, CZ 1993-01, others 1994-01, euro area 1999-01 |
| Regional | 2000 | PL 1990, CZ 1992, RO 1995, AT and DE 1999. HR, HU, SK and SI are unchanged because no official regional value before 2000 exists. |

## 2. Full coverage matrix

The matrix has 1,683 contracts, all audited:

| Store | Contracts |
|---|---:|
| Regional | 1,015 |
| Annual | 260 |
| Trade network (UN Comtrade: 10 countries × 2 flows × 7 partner-structure metrics) | 140 |
| World Bank panel (frozen formal frame) | 130 |
| Monthly | 106 |
| SORS annual | 16 |
| SORS monthly/quarterly | 10 |
| SORS regional | 6 |

The Phase R inventory covered 1,413 contracts. The trade-partner and panel frames were added here, so no supported country × indicator combination remains outside the audit. Political datasets are out of scope: they are election records, not country indicators.

**Primary status per contract:**

| Status | Contracts |
|---|---:|
| Officially available and admitted | 1,654 |
| Officially available, not imported | 19 |
| Unresolved | 7 |
| Legally restricted | 2 |
| Definitionally or geographically incompatible | 1 |

**Gap periods inside or around admitted series**, by the brief's statuses:

| Status | Periods | Main causes |
|---|---:|---|
| Definitionally or geographically incompatible | 14,755 | See below |
| Historically nonexistent | 1,311 | No euro, and no EUR cross rate, before 1999-01 |
| Unresolved | 328 | 19 series held by the vintage splice check (§3) |
| Missing within an official series | 192 | Empty official cells, e.g. German regional population on 1 January 2013, Croatian policy rate 2017–2022 |
| Officially available, not imported | 189 | Periods after the frozen stores; these belong to the regular refresh path, not to history |
| Legally restricted | not established | Pre-2015 UN Comtrade years (§3) |
| Not yet published | 0 | After the correction in §6 |
| Lost in processing | 0 | |

Main causes of the incompatible periods:
- Eurostat break flags (`b`) and definition flags (`d`);
- the v1.83 monthly definition audit;
- documented policy-rate regime changes;
- German unification;
- Serbian totals that exclude AP Kosovo and Metohija from 1998;
- LFS rates for multi-code regions;
- CPI that is not HICP.

## 3. Short series

113 series are at least two years (or 24 months) shorter in the Atlas than their official availability. The JSON gives each one's official first period, admitted first period, floors and the exact causes of the missing span.

**No short series has a period that can be ingested now under the approved rules.** Every missing span falls into one of these classes:

1. **Definitional floors.** These account for most periods.
   - Population: 346 years. Eurostat flags breaks after recent censuses, e.g. CZ 2021, PL 2021, HU 2012, SI 2008, HR 2001.
   - GDP per capita PPS: 100 years.
   - GDP per capita EUR: 103 years. SK flags breaks in 2001, 2011 and 2021; HU 2012; HR 2012; SI 2008; PL 2022.
   - Compensation per employee: 57 years.
   - Labour productivity: 50 years.
   - Monthly HICP energy: about 1,800 months each for the index and the rate, from v1.83 floors.
   - Monthly unemployment: 1,305 months.
   - Policy rates: 534 months, at regime floors.
   - Romanian household and industrial electricity prices: 15 years each, from the 2022 `d` flag.
2. **Vintage holds, 19 series (`held_series`).**
   - FDI inflows: AT, CZ, DE, HR, HU, PL, SK.
   - Current account: AT, HR, HU, RO, SI, SK.
   - GDP per capita EUR: CZ, DE, PL.
   - Real GDP growth: DE, SI.
   - Labour productivity: HR.
   - Each uses the same Eurostat table as its canonical record. The canonical years (a frozen formal model input) carry an earlier vintage. The current-vintage backcast differs beyond the splice tolerance, by up to 16,997 million EUR for German FDI. Splicing would join two vintages.
   - Resolution needs an owner decision: refresh the canonical years through the canonical refresh path, with a model-impact review, or keep the hold.
3. **Euro existence.** Bilateral EUR rates (1,016 months) and the common EUR/USD rate (295 months) cannot exist before 1999-01.
4. **Trade-partner dependence (UN Comtrade).** Coverage is 2015–2025.
   - Pre-2015 official years are not established. The rights registry says any new as-is download needs review, and the host is `allowed_licence_review_due`.
   - These series also feed the frozen network model.
   - They are classified as legally restricted pending that review. Nothing was downloaded.
5. **World Bank panel.** It is the frozen formal estimation frame, 2015–2025. The descriptive equivalents are the annual contracts above.

**Regional indicators.** A probe made for this audit (Eurostat API with `untilTimePeriod=1999`, response archived under `.tmp-data-refresh/closure-20261110/`) confirmed that regional GDP and GVA (`nama_10r_3gdp`, `nama_10r_2gdp`, `nama_10r_3gva`) have no official value before 2000. So the 2000 start of regional GDP, GDP per capita and manufacturing share is historically complete. Regional population and LFS were already recovered as far back as they exist.

## 4. Regional and high-frequency comparability

Shared periods are true intersections of admitted periods, not overlapping start and end dates (`comparability`).

**National annual:** the same table, selection and unit in every country.

| Indicators | Common period |
|---|---|
| Government debt, deficit, revenue, expenditure (9 countries; no Eurostat data for Serbia) | 1995–2025 |
| GDP, exports, manufacturing share | 1999–2025 |
| Energy import dependency | 1999–2024 |
| Imports, trade balance, trade openness | 2000–2025 |
| HICP inflation (9 countries; Serbian CPI is never compared as HICP) | 2002–2025 |
| GDP per capita EUR, population, real GDP growth, current account | 2021–2025 |
| FDI | 2022 only |
| Electricity prices, energy inflation | 2023–2024 |

**National monthly:**

| Series | All-country common period |
|---|---|
| Effective exchange rates | 1994-01 to 2026-07 |
| Long-term yields | 2006-01 to 2026-07 |
| HICP, industrial production, unemployment | from 2015-01 |
| Policy rates | 2009-01 to 2017-06, then fragmented by empty Croatian cells; instruments differ by central bank |

Bilateral FX levels are never compared across currencies.

**Regional:** only `comparable_stable_code` years and stored snapshot years count. Backcasts and pre-break years are excluded.

| Indicator | Common comparable years |
|---|---|
| Regional GDP | AT, DE, RO, SK 2000–2024; CZ 2008–; HU and PL 2018–; HR 2021– |
| Regional population, GDP per capita | DE 2011–2012 and 2014–2024 (2013 is an empty official cell); CZ, HR, PL 2021–2024 |
| LFS rates | 2021–2024 everywhere |

Historical NUTS versions are not merged. Pre-2003 years have no official GISCO code list and stay labelled backcasts.

## 5. Provenance and timestamps

The ledger entry for `historical-recovery-20261110` records:
- `planned_at` 2026-11-10T00:00:00Z
- `applied_at` 2026-11-10T12:00:00Z
- 7,799 new observations and 0 revisions, at store level only

**Evidence:**
- The 55 source retrievals took place between 2026-11-09T20:50:49Z and 21:09:28Z.
- The data commit `ca8d53f` is timed 2026-11-09T21:33:12Z.
- The ledger commit `d6e2bdd` is timed 2026-11-09T21:50:19Z.
- The first deployment that served the data started at 2026-11-09T22:09Z.
- The work happened on 10 November local time (UTC+11), which is 9 November in UTC.

**Findings:**
1. The two timestamps are hand-written placeholders. The other three runs carry tool-generated times seconds apart. `applied_at` is later than the data commit, the ledger commit and the deployment, so it cannot be the application time. The evidence bounds the real application time to between 21:09:28Z and 21:33:12Z on 2026-11-09.
2. The 09:31Z build time is a different, correct definition. It is the CI build time of the research package for `ffea0df`, not a data application time.
3. "Series with recorded changes: 0" is unrecorded, not zero. The provenance panel counts per-series `new_periods` entries. Earlier runs recorded 40, 39 and 11 such entries; this run recorded store totals only.

4. The hand-written entry also lacked `previous_entry_sha256`, so the ledger's hash chain had been broken at entry 4 since that run. No CI check reads the chain; only the data-refresh tool does, and it would have refused every later append.

**Correction applied (owner approval 2026-11-10: "批准登记台账更正和清单修复", then "批准方案 1，修改链校验"):** one append-only entry, `ledger-correction-20261110` (plan sha256 `a5d4c760…`). It:
- references the corrected run, its plan sha256 and the exact sha256 of the original line. The original four entries are byte-identical.
- records `applied_at` as placeholder, with the corrected window 2026-11-09T21:09:28.241Z to 21:33:12Z.
- records `planned_at` as placeholder, with the corrected window 21:33:12Z to 21:50:19Z (the plan was formed on head `ca8d53f` and registered in `d6e2bdd`).
- adds the per-series detail: 606 series and 7,799 added periods, derived from the `R` records and checked against the recorded total.
- attests the missing chain link (`chain_repair`). The chain verifier accepts an absent link only when a later ledger-correction entry attests both the entry's own sha256 and the expected previous sha256. A wrong link value, or an unattested gap, still fails. The ledger verifies again with 5 entries.
- records the inventory regeneration (§6).

The provenance panel applies the correction only when its own approval record matches its plan sha256. It shows the corrected window next to the recorded placeholder, publishes the per-series periods as contiguous ranges (about a tenth of the payload of full lists), and shows unrecorded per-series detail as "—" instead of 0. Recovered observations in annual history, monthly history and SORS now show which run added them.

## 6. Research integrity

**Sources and IDs**
- All 127 archived raw files referenced by the manifests still hash to their recorded sha256.
- Every recovered record resolves to its source dataset and query URL. Monthly records resolve through `series_sources`, regional records through `recovery_sources`, and SORS records through `series_sources`.

**Exports**
- The 12 public JSON copies are byte-identical to their source stores.
- The annual, monthly, regional and SORS runtimes reproduce every stored value: 4,996, 15,674 and 13,868 records, plus 2,909 SORS national points.
- The `R` flag is reproduced in the annual row tail and in the monthly `series_sources`.
- The research ZIP does not carry the descriptive layers. They are published as JSON, and the Data Explorer CSV is generated from the same runtimes.

**Determinism**
- An offline rebuild of all four acquisition scripts (`--offline`) reproduces every store byte-for-byte.
- So do the inventory rebuild and this closure (`--check`).

**Separation and model isolation**
- Since the baseline, only descriptive-layer files changed under `src/data` and `public/research-data`.
- D1–D4, E1, the political context panel and the Workspaces exclude `R` records.
- VAR, LP, panel, pressure-model and scenario inputs and outputs are unchanged.
- Nothing was re-estimated.

**Inventory corrections, applied by regenerating the inventory in run `ledger-correction-20261110`.** The current closure finds no remaining stale verdict.
1. The inventory's national annual unit map was keyed by indicator and country across all layers, so the SORS layer overwrote Serbia's Eurostat unit. `gdp_per_capita_eur` and `manufacturing_share_gdp` were published as "units differ: not comparable" next to valid common periods. Corrected, both are the same table, selection and unit. The periods were already right. No page reads this verdict; it appears only in the downloadable inventory JSON.
2. The Croatian policy rate for 2022-08 to 2022-12 was classified "not yet published". The BIS series notes say it was discontinued when Croatia joined the euro area on 1 January 2023, so these are missing official cells. They are now "missing within an official series".
3. 24 monthly contracts had no unit label: HICP energy index and rate for 10 countries, plus the v1.83-blocked PL/RO industrial production and PL/SK unemployment. They now take the unit of their official source selection: `I15`, `RCH_A`, `I21` or `PC_ACT`. No period, category or comparability verdict changed except the two items above.

**Rights (`rights`)**

| Source | Normalised republication | Raw redistribution | Attribution |
|---|---|---|---|
| Eurostat | Cleared with conditions | Cleared with conditions | Required |
| BIS | Cleared with conditions | Cleared with conditions | Required |
| SORS | Cleared with conditions | Not cleared | Required |
| World Bank | Cleared with conditions | Not cleared | Required |
| UN Comtrade | Non-commercial | Not cleared | Required |

The SORS extract files, which are record subsets of the API responses, have been in the public repository since the owner-approved SORS ingestion (`2477596`, 2026-09-30). Whether an extract counts as raw redistribution under the registry's "not cleared" is a rights question for the owner. This audit only observes it.

## 7. What still needs source work or a decision

| Item | Contracts / periods | Needed |
|---|---|---|
| Vintage holds (FDI, current account, GDP per capita, real GDP growth, productivity) | 19 series / 328 periods | Owner decision on a canonical refresh (formal input) or keeping the hold |
| UN Comtrade before 2015 | 140 contracts | Rights review (as-is download terms), then a separate decision because these series are frozen network-model inputs |
| Periods after the frozen stores | 189 periods | The regular data-refresh path |
| Population and national-accounts break floors | about 650 years | Methodological decision only: whether a census-based `b` flag should remain a hard floor. It currently is, by the Phase R rule. |
| SORS extract redistribution question | 24 SORS extract files | Owner rights review |

## 8. Changes made

- `scripts/data-coverage/coverage-closure.mjs`: new, read-only audit with a `--check` mode.
- `docs/data-coverage/historical_coverage_closure_2026-11-10.json` and `…_matrix_2026-11-10.csv`: new.
- `tests/tooling/coverage-closure.test.mjs`: new, 7 tests. They check reproducibility (skipped only if the recorded inputs change), the status mapping, the reconciliation, the audit-completeness claim, integrity, the provenance finding and the corrected comparability.
- This report.
- `scripts/data-refresh/ledger-correction-20261110.mjs`: new. It appends the correction once and reverts if the chain does not verify.
- `scripts/data-refresh/lib.mjs`: the chain verifier accepts the exactly attested missing link. New tests cover acceptance and all failure cases.
- `scripts/data-coverage/recovery-inventory.mjs`: the three inventory fixes. The inventory and its public copy were regenerated.
- `src/data/data-refresh/refresh_ledger.jsonl`: one appended line.
- `src/lib/refreshProvenance.ts`, `src/components/DataRefreshTransparency.tsx`: the correction is applied in the panel (UI amendment `v20-ledger-correction-provenance-2026-11-10`).
- Governance: run `ledger-correction-20261110` in `data-refresh-amendments.mjs` and `data_refresh_amendments.json`, at exact hashes.
- Gate (owner approval "批准方案 1，调整门禁"): the correction run may supersede the inventory that the recovery run added as a new file. The permission is still limited to the same narrow path scope. New-file hashes are now applied in run order, as hashes of existing files already were, so a later run supersedes an earlier one and file order never decides.

No observation store, model file, release file or `package.json` changed.

## 9. Validation

- `node scripts/data-coverage/coverage-closure.mjs --check`: pass.
- Closure tests: 7/7.
- Tooling suite: 424/424, including the closure, chain-attestation, provenance-correction and run-order supersession tests.
- `data-coverage:validate`, `historical-annual:validate`, `historical-monthly:validate`, `historical-regional:validate`, `serbia-audit:validate`: pass.
- `political-source-closure:validate --checkpoint`: pass. Only the registered exact-hash files differ.
- Public-secret scan: pass. No local paths or personal identifiers in the new files.
- Full build and full UI suite: see the commit message.
