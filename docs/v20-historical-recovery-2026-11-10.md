# v2.0 official historical data recovery and comparability — 2026-11-10

**Status:** local branch `data/historical-recovery-2026-11`, based on production `c1c5895` (Pages #372).

The data work and the validation are complete. Two governance records still need owner approval before the closure checkpoint passes in CI (see §11). Nothing has been pushed.

**Unchanged:**
- brand and version (Central Europe Political Atlas v2.0);
- canonical model inputs, frozen 2015+ stores, models and publication gates;
- D1–D4, E1–E2.1;
- the map-first homepage and the political landing.

All new observations are descriptive only and enter no model.

## 1. Complete coverage inventory

`src/data/data-coverage/historical_recovery_inventory.json` is also published as `/research-data/historical_recovery_inventory.json`. It covers **1,413 contracts**, built from the actual stores:

| Scope | Contracts |
|---|---|
| National annual (observations.json + annual history) | 260 |
| National monthly (frozen 2015+ HF / macro-driver stores + monthly history) | 106 |
| Regional (v0.86/v0.89 stores + regional history; region × indicator) | 1,015 |
| Serbia SORS annual / monthly and quarterly / regional | 16 / 10 / 6 |

The World Bank panel is a frozen formal estimation frame (130 series). It is listed but not extended. Transformation series, such as log changes and basis-point changes, are listed and evaluated through their level series.

For each contract the inventory records:
- the first, last and count of periods in every admitted layer;
- the official first, last and count of periods from the archived extract;
- the source dataset, the raw file and the unit;
- the definition, floors (definition, break, territorial and regime) and break flags;
- the recovery status;
- the rights entry from `source_rights_registry.json`.

**Expected periods** run from the earlier of the first admitted and first official period to the later of the last admitted and last official period. They are counted in the contract's own frequency, and indicators are not assumed to start together.

**Missing periods** are grouped into runs with a cause:

| Cause | Periods |
|---|---|
| 1 available officially but not admitted | 189 |
| 2 lost in ingestion or processing | **0** |
| 3 outside the official series' existence | 1,311 |
| 4 officially missing or suppressed | 187 |
| 5 not yet published | 5 |
| 6 definitionally incompatible | 14,755 |
| 7 restricted by reuse or access | 0 periods; 11 contracts flagged as restricted sources |
| 8 unresolved | 328 |

What the causes cover:
- **Cause 1:** periods after or inside a frozen formal model input window. They belong to the canonical or HF/macro refresh path, not to descriptive history.
- **Cause 3:** mostly EUR periods before 1999. The BIS euro-area series before 1999 is a synthetic, ECU-based construct.
- **Cause 6:** mostly periods before official `b` or `d` flags, the v1.83 audit floors, documented policy regimes, the ECOICOP-2 energy aggregate (2017+) and territorial floors.
- **Cause 7:** UN Comtrade and the World Bank Pink Sheet are flagged as restricted. Their official spans are not queried, so no periods are counted.

## 2. Historical periods before and after recovery

The earliest admitted year below is the minimum across countries; per-country values are in the inventory.

**Annual (national)**

| Indicator | Before | After | New obs. | Countries |
|---|---|---|---|---|
| GDP, exports, manufacturing share, compensation | 2000 | 1991 (DE) / 1995 | 61–71 each | 7–10 |
| Imports, trade balance, trade openness | 2000 | 1991 (DE) / 1995 | 66 / 66 / 71 | 9 |
| Real GDP growth, labour productivity | 2000 | 1996 / 1992 | 50 / 55 | 8 / 7 |
| Fiscal balance, debt, revenue, expenditure (EDP / ESA) | 2000 | 1995 | 45 each | 9 |
| HICP inflation | 2000 | 1996 | 22 | 7 |
| Population | 2000 | 1960 (AT, SK, RO) | 120 | 3 |
| GDP per capita EUR / PPS | 2000 | 1995 | 32 / 46 | 3 / 5 |
| Unemployment rate (une_rt_a, 15–74) | 2021 | 2009 | 85 | 10 |
| Current account (% GDP) | 2021 | 1995 | 69 | 3 |
| FDI inflow | 2021 | 2013 | 21 | 3 |
| Energy import dependency | 2021 | 1990 | 300 | 10 |
| Energy HICP CP045 | 2023 | 1996 | 213 | 9 |
| Household / industrial electricity price (mean of S1 and S2) | 2023 | 2007 | 133 / 132 | 9 |
| Automotive export share (C29 / total) | 2021 | 2012 | 60 | 10 |

**Monthly**

| Series | Before | After | New obs. | Countries |
|---|---|---|---|---|
| HICP index / annual rate | 2000-01 | 1996-01 / 1997-01 | 398 / 290 | 9 |
| Industrial production | 2000-01 | 1991-01 (DE); HR 1998-01 | 312 | DE, HR |
| Unemployment (SA) | 2000-01 | 1993-01 (CZ); HR 2006-10 | 183 | CZ, HR |
| Maastricht bond yield | 2000-01 | 1980-01 (DE) / 1985-01 (AT) | 420 | AT, DE |
| Policy rate | 2000-01 (AT, DE only) | all 10 countries; earliest 1987-01 (HU) | 1,327 | 10 |
| Local currency per EUR | 2000-01 (CZ, HU, PL) | 1999-01; RO and RS added | 420 | 5 |
| USD per EUR | 2000-01 | 1999-01 | 12 | euro area |
| BIS nominal / real effective exchange rate | 2000-01 | 1994-01; RS added | 900 / 900 | 10 |

**Regional:** 415 new region-years:
- population back to 1990, with Germany from 1991;
- 1999 LFS employment and unemployment rates.

All are marked `backcast_boundary_revision`, so they are shown but excluded from trends and differences.

**Serbia SORS:** 227 new 1999 records (11 annual, 24 monthly, 192 regional).

## 3. New official observations admitted

| Store | New records | Total after recovery |
|---|---|---|
| Annual descriptive history | 1,995 | 4,996 |
| Monthly descriptive history | 5,162 | 15,674 |
| Regional descriptive history | 415 | 13,868 |
| Serbia SORS stores | 227 | 11,852 |
| **Total** | **7,799** | |

Every earlier record (Phase G, H, I and the approved SORS ingestion) is **byte-identical**. Recovered records carry `recovery_phase: "R"`, and new series sources carry the same flag.

## 4. Countries and indicators improved

| Country | Annual | Monthly | Regional |
|---|---|---|---|
| Austria | 209 | 420 | 18 |
| Croatia | 155 | 633 | – |
| Czechia | 200 | 600 | 28 |
| Germany | 224 | 588 | 32 |
| Hungary | 149 | 871 | – |
| Poland | 164 | 738 | 129 |
| Romania | 183 | 859 | 208 |
| Serbia | 326 | 855 | – |
| Slovakia | 207 | 278 | – |
| Slovenia | 173 | 324 | – |

The euro area gains 307 monthly records. Serbia's SORS stores gain 227 more records (§3).

Every existing national annual indicator gained history except one: the Comtrade-based Germany export dependence, which is a restricted source.

Serbia is now covered from Eurostat for national accounts, population, fiscal debt and revenue from 1999. The SORS data include 1999, and the BIS national policy rate, FX and EER series are also added.

Seven review-queue indicators were cleared under the same table, selection and floor rules, and their clearances are recorded in the manifest:
- unemployment;
- current account;
- FDI;
- energy dependency;
- energy HICP;
- both electricity prices;
- automotive share.

## 5. Missing data still unresolved (cause 8)

| Indicator | Countries | Reason |
|---|---|---|
| Current account % GDP | AT, SK, SI, HU, RO, HR | The current Eurostat vintage differs from the canonical 2021–2025 records by more than the tolerance at the splice (0.2–1.0 pp). |
| FDI inflow | AT, DE, SK, CZ, HU, PL, HR | Large revisions to the canonical 2021–2024 records (hundreds to thousands of million EUR). |
| GDP per capita EUR | DE, CZ | Phase G overlap mismatch with the canonical vintage (DE 111 EUR, CZ 72 EUR over tolerance). Still held. |
| Real GDP growth | DE, SI | Phase G overlap mismatch with the canonical vintage. Still held. |
| GDP per capita EUR (SORS) | RS | SORS-to-EUR conversion overlap with Eurostat failed. Still held. |

Resolving these needs a coordinated vintage refresh of the canonical records. Those records are formal model inputs, so that refresh is outside descriptive recovery.

The six annual indicators left in the review queue have no recovery path; their reasons are listed in the manifest:
- German export dependence (Comtrade);
- employment rate (not an existing national annual contract);
- R&D;
- real wages;
- FDI outflows;
- Serbia's national-definition series.

## 6. Precise reasons for remaining gaps (main causes)

- **Official breaks (cause 6).** The rule takes the latest official `b` flag, or the year after a `d` flag, across the whole series. Notable cases:
  - population breaks: DE 2023, CZ and PL 2021, HU 2012, HR 2001, SI 2008, RS 2023;
  - GDP per capita: SK 2021 and PL 2022;
  - LFS unemployment: DE 2020, SK and CZ 2011, HU 2018, PL 2019;
  - Austria's imports: a new 2022 `b` flag, which also blocks Austria's derived trade balance and openness before 2000.
- **v1.83 audit floors (cause 6).**
  - Monthly IPI for PL and RO and unemployment for PL and SK stay blocked: there is no official comparable bridge.
  - Other floors include AT IPI from 2000, AT unemployment from 2004 and DE unemployment from 2009.
- **Documented policy regimes (cause 6), from BIS metadata:**
  - CZ policy rate from 1998-01, PL from 1998-02, HR from 2002-09, RS from 2006-09;
  - SI and SK use the euro-area rate from their euro adoption (2007-01 and 2009-01).
- **ECOICOP-2 energy aggregate (cause 6).** The monthly energy HICP begins in 2017-01 (index) and 2018-01 (rate). Earlier values follow the legacy classification.
- **Euro (cause 3).** No EUR exchange rate exists before 1999-01.
- **Territorial floors (cause 6).**
  - Germany from 1991 (unification).
  - Serbia from 1999: national totals exclude AP Kosovo and Metohija from 1998.
  - Values before 1993 for CZ and SK, and before 1991 for SI and HR, refer to the present-day territory and carry a `territorial_note`.
- **Regional (causes 3, 4 and 6).**
  - Eurostat regional GDP and GVA tables start in 2000.
  - No GISCO NUTS code list exists before NUTS 2003, so pre-2000 years are backcasts only.
  - German regional population for 1 January 2013 is officially missing, in both the archive and the current vintage.
  - The current vintage was checked against the archive for 2000–2024: no official regional cell had been dropped.
- **Cause 1:** periods inside or after the canonical 2021+ window and the frozen 2015+ HF / macro windows, such as 2025 energy dependency and FDI, and HF months after the frozen store. These are admitted only through the formal refresh paths.
- **Cause 7:** UN Comtrade (licence review due; raw redistribution not cleared) and the World Bank Pink Sheet (Brent and European gas; raw redistribution not cleared).
  - The ECB data API host is not registered, so no ECB-only data were used. Euro-area rates come from BIS.
  - OECD, IMF and World Bank WDI were not used: their raw redistribution is not cleared, and Eurostat and BIS provided the same official series.

## 7. Comparable periods

In the inventory's `comparability` section, common periods are always intersections of admitted periods, never min/max overlaps:
- **National annual:** each indicator gives the countries, the all-country common periods and all pairwise common periods, under the same table, selection and unit.
- **National monthly:** the same, with all pairs. FX levels are not compared across currencies.
- **Regional:** each indicator and country gives the years in which every region has a comparable value (stable-code history years or stored snapshot years). Backcasts and pre-break years are excluded.

All-country examples:
- debt, revenue, expenditure and fiscal balance: 1995–2025 (9 EU countries);
- GDP and exports: 1999–2025 (10 countries);
- energy dependency: 1999–2024;
- HICP: 2002–2025 (9; Serbia's CPI is not HICP);
- unemployment: 2020–2025;
- real GDP growth: 2021–2025, limited by the held DE and SI histories.

Pairwise examples:
- AT–DE HICP monthly index: 1996-01–2026-09;
- CZ–HU policy rate: 1998-01–2026-07.

Regional examples:
- Austria population: 2000–2024 for all 9 regions;
- Germany: 2011–2012 and 2014–2024 (2013 is officially missing).

Each country's full national history stays available on its own.

## 8. Sources and reuse rights

| Source | Reuse | Raw redistribution | Use in this round |
|---|---|---|---|
| Eurostat dissemination API (Commission Decision 2011/833/EU) | cleared with conditions; attribution "Source: Eurostat" | cleared with conditions | all annual, monthly and regional extracts |
| BIS statistics (BIS terms) | cleared with conditions; attribution "Source: BIS" | cleared with conditions | policy rates, FX and EER |
| SORS open data | cleared with conditions; attribution SORS | not cleared | existing extracts only, no new fetch |

The archived raw files are new Eurostat and BIS extracts under `src/data/historical/raw/{annual,monthly,regional}/full/`, about 2.9 MB, each hash-pinned in a manifest.

No blocked or unregistered host was contacted:
- statistics.sk, bmi.gv.at and the ECB data API were not used;
- no user-agent spoofing.

## 9. Updated data and manifests

**Pipelines:**
- `scripts/historical-annual/acquire.mjs`, `scripts/historical-monthly-descriptive/acquire.mjs`, `scripts/historical-regional/acquire.mjs`: Phase R passes with a `--recover` mode, which rebuilds earlier phases offline and fetches only the full-history extracts. A splice check compares the first 5 years, 12 months or 5 regional years, within the existing tolerances.
- `scripts/serbia-sors/ingest.mjs`: 1999, only when no break, `D` flag or level shift separates it from the 2000 segment.

**Generated outputs:**
- The stores, manifests (each with a `recovery` section) and public runtimes. Annual runtime rows carry an optional trailing `"R"`; monthly series sources carry `recovery_phase`.
- The re-audited `descriptive_data_coverage_audit.json`: 932 series, 88 new. Formal-sample registries and formal samples are unchanged.
- The new inventory.

**Presentation:**
- The Data Explorer and macro chart labels no longer say the history starts in 2000.
- D1–D4, E1, the political context panel and the Workspaces exclude Phase R records, so their published results stay unchanged. The data explorers, annual comparison, country charts and region trends show the recovered history.

## 10. Tests and reproducibility

- **Store validators:**
  - annual: 54,882 checks;
  - monthly: 164,105;
  - regional: 94,296;
  - Serbia: 104,047, with a new period-floor check;
  - data coverage: 21,852, with the inventory's reproduction, completeness, cause and count checks.
  - Every store rebuilds exactly offline from its hash-checked extracts.
- **Tooling tests:**
  - 401 pass, including 8 new recovery tests.
  - 4 governance tests fail until the run is registered: the exact-hash refresh runs, mirror-sync and batch-exception pins.
  - 1 hook test reports the uncommitted research files and passes after commit.
  - The D1, D2, D3, D4 and E1 tests pass with their original expectations.
- **D4:** the locally regenerated D4 CSV equals the production EN and ZH CSVs, with evidence sha `9726ff00…`.
- **Build:** the research export check passes (822 checked, none differing). Typecheck, lint (0 errors) and the build (72 pages) pass. Legal and security, i18n, SEO, UI regression and release validation all pass.
- **Browser:** the full local suite passed 645 of 650 tests. The 5 failures were Workspaces screenshots, resolved by keeping the Workspaces on their published basis. The workspace suites then passed 36 of 36.
- **Research package:** the members are unchanged. The descriptive histories are served separately and are not in the ZIP.

## 11. Remaining limitations and items for owner decision

1. **Governance approval needed (blocking for CI):**
   - Register the exact-hash data run `historical-recovery-20261110` (90 data paths). It needs an entry in `docs/political-data/source-closure/data-refresh-amendments.mjs` with its own verification statement, plus a record in `docs/legal-security/data_refresh_amendments.json`.
   - Add an exact-hash UI amendment for 6 presentation files: `DataExplorerV11.tsx`, `MacroDriverWorkbench.tsx`, `useMonthlyHistory.ts`, `workspaceEvidence.ts`, `annualComparison.ts`, `politicalEconomicContext.ts`.
   - The auto-mode safety check stopped the gate change, so it waits for the owner's decision.
2. **Canonical vintage:** current account, FDI, DE and SI real growth, and DE and CZ GDP per capita stay held. Recent canonical values differ from today's Eurostat vintage, and fixing that means a deliberate canonical (model-input) refresh.
3. **Recent periods (cause 1):** published periods after the canonical or frozen windows, such as 2025 annual values and recent HF months, need the existing refresh workflow.
4. **Research views:** D1–D4, E1 and the Workspaces deliberately keep their published basis. Extending them to the recovered history would change published research results and would need its own decision.
5. **Restricted sources:** Comtrade and the World Bank Pink Sheet were not recovered.
6. **No quarterly contracts:** the only quarterly series is Serbia's LFS.
7. **No interpolation:** nothing is interpolated, estimated or concatenated across definitions. Backcasts, breaks and territorial notes stay explicit.
