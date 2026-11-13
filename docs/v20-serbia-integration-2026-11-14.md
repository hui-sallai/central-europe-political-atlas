# Serbia integration — 2026-11-14

Central Europe Political Atlas v2.0 (no version change, no rebranding, no redesign). Baseline: `main` = production = `d8a42af` (Pages run 43484667674).

**Outcome:** no Serbian module changed in production in this pass. Every substantive step that remains needs an owner decision: a rights extension, a frozen-file amendment, a gate change, a new network host, or a governed data-refresh run. A decision request was offered and declined, so this pass treats none of those as approved.

The pass delivers four things:
- a verified module-by-module inventory;
- production checks in a real browser;
- reproducible evidence that Serbia's regional map can be built from the official geometry the Atlas already uses for eight countries;
- the exact list of decisions that would unlock each module.

**Serbian integration is not complete.**

## 1. Module status (before = after; nothing was admitted)

| # | Module | Status | Exact dependency |
|---|---|---|---|
| 1 | Homepage country map | **Fully implemented** (production verified) | — |
| 2 | Country profile | **Partially implemented** (verified) | Loads with 4 of 6 key indicators. HICP is pending (definition differs) and government debt has no admitted source. Election and region sections state their restrictions. |
| 3 | Data Explorer | **Fully implemented** for admitted series | 32 SORS series (`sors:*`) plus the canonical and Eurostat monthly series are selectable. |
| 4 | National 2–10-country comparison | **Fully implemented** (verified) | Uses the shared interface with no default reference country. |
| 5 | Annual / quarterly / monthly indicators | **Partially implemented** | Annual canonical set: 98 records for 2021–2025, of which 14 indicators are official or calculated and 8 pending (§2). The SORS stores are current to Jul–Oct 2026 except CPI. 7 newer SORS observations await a governed refresh run. |
| 6 | Regional map and statistics | **Data available but not connected**; **requires explicit owner approval** | Official geometry matches 25/25 (§4). Remaining: licence-record extension, frozen-file amendment, display gate. |
| 7 | Political institutions | **Official source missing (host not registered)**; **requires owner approval** | The profile shows only "Parliamentary republic · Unicameral: National Assembly". No Serbian legal or parliamentary host is registered. |
| 8 | Parliamentary election results | **Legal permission unresolved**; **requires owner approval** | RIK (`www.rik.parlament.gov.rs`) is unknown to the network registry, so it is blocked. Its licence is recorded as `license_review_required`. Serbia is outside the admission pipeline. |
| 9 | Party / electoral-list identities | **Requires explicit owner approval** | Depends on 8. Many lists are named after a person, which conflicts with the "no candidate names" rule, so a list-name rule is needed. |
| 10 | Research workspaces | **Partially implemented** | The `serbia_nstj_archive` regional layer is shown as an archive card, not a map. |
| 11 | Model eligibility | **Fully implemented as registered** (restrictions retained) | See §10. |
| 12 | Event and news archive | **Fully implemented** | Serbian events are live through 2026-11-10, including the 25 October snap election as news. |
| 13 | Exports and source registries | **Fully implemented** for admitted data | SORS sources keep their original codes and URLs; the SORS rights record is `cleared_with_conditions` (a8d10a6). |

## 2. Official statistical sources examined

- **SORS open data** (`opendata.stat.gov.rs`, registered host, automation allowed): a read-only refresh plan (`serbia-plan-20261114`, staged in `.tmp-data-refresh/`, nothing written) over all 32 SORS series.

  **Annual store** (15 series): 1999–2025 for national accounts, trade, earnings and the population estimate. 2010/2011–2025 for LFS rates, population on 1 January and R&D.

  **Monthly / quarterly store** (10 series):

  | Series | Coverage |
  |---|---|
  | Earnings | 1999-01 to 2026-07 |
  | Goods trade (EUR) | 2004-01 to 2026-08 |
  | Industrial production | 2000-01 to 2026-08 |
  | Retail trade volume | 2000-01 to 2026-08 |
  | Producer prices | 2011-01 to 2026-09 |
  | LFS quarterly unemployment | 2011-Q1 to 2026-Q2 |
  | CPI (2006 base and annual index) | 2007-01 to 2025-12 |

  **Source now has** one more period for each of these 7 series:
  - earnings, both series (2026-08);
  - exports and imports (2026-09);
  - industrial production (2026-09);
  - retail trade (2026-09);
  - producer prices (2026-10).

  There are also **65 official revisions**: 51 retail trade, 8 exports, 6 imports. The plan stopped for owner review because the revisions fall inside audited windows and the monthly store is pinned by the recovery inventory.

  **CPI:** the CPI datasets returned no observation after 2025-12.

  **Regional store:** NSTJ1/2/3 and municipality levels.
  - Population: 1999–2025 and 2011–2025.
  - Employment and unemployment rates: 2014–2020 down to NSTJ3; 2021–2025 at NSTJ1/NSTJ2 only, after the LFS break flag B.
- **Eurostat:**
  - monthly HICP for Serbia is live and comparable: verified Serbia + Romania + Hungary, 141 common months, 2015-01 to 2026-09.
  - The annual canonical `hicp_inflation` stays pending ("definition differs"). The live profile shows this.
- **National Bank of Serbia** (`www.nbs.rs`) and **Ministry of Finance** (`www.mfin.gov.rs`) are listed only as reference hosts that are never fetched. Government revenue, expenditure, balance and debt, plus the current account, therefore stay pending. Recovering them needs those hosts registered (owner decision).
- **Unchanged rules:** monthly unemployment has no Serbian source. Quarterly LFS is not substituted; production shows "no frequency or indicator substitution".

## 3. New observations admitted

**None.** The 7 new SORS values and 65 revisions are documented above and await approval of a registered run.

## 4. Regional geometry and licence findings

Evidence: `docs/serbia-integration/regional_geometry_evidence_2026-11-14.json`, produced by `scripts/serbia-integration/regional-geometry-evidence.mjs`.

**Geometry:**
- The Eurostat GISCO NUTS 2024 1:1M EPSG:4326 file (level 3, SHA-256 `2f298a65…dcba1a1c`) contains exactly 25 Serbian units, RS110 to RS229.
- Their codes are identical to the 25 NSTJ3 codes in the stored SORS regional data: 25 matched, 0 unmatched in either direction.
- NSTJ1 (RS1, RS2) and NSTJ2 (RS11, RS12, RS21, RS22) also match one to one.
- The SORS names agree, for example RS127 Sremska oblast and RS229 Toplička oblast.

**Licence:**
- The GISCO terms page grants a non-exclusive, non-transferable right to use and process the data. It requires no commercial use and visible acknowledgement ("© EuroGeographics for the administrative boundaries"), and states no country carve-out.
- The Atlas already displays this dataset for eight countries under licence record `gisco_nuts_2024_public_research`. Serbia is not in that record's `covered_countries`, and the rule is that rights decisions are not extended automatically.

**Current state:**
- The existing Serbian geometry is OpenStreetMap-derived geoBoundaries ADM1 (25 districts, ODbL), held at `not_ready_for_public_display`.
- Its blocker is `official_boundary_correspondence_and_regional_comparability_pending`.
- The GISCO units remove the correspondence part of that blocker: the codes are the statistical units themselves, not an administrative-to-statistical crosswalk.

**Classification and scope:**
- Units would be labelled NSTJ3 areas (oblasti), not EU NUTS regions.
- Geographic scope follows the sources: SORS publishes NSTJ3 data for these 25 areas and GISCO's RS geometry contains the same 25. No position on territorial status is taken, and nothing is drawn or imputed beyond that.

**Comparability:** SORS regional series carry `cross_country_comparable: false`. Serbian regional values would therefore be comparable within Serbia only, and cross-country regional comparison would stay off.

## 5. Map integration result

**Not integrated.** Production `/map/` and `/en/map/` show "9 / 10 countries" and "Serbia · Not connected" (verified).

Integration needs the three owner decisions in §14.A. The work after approval is mechanical:
1. Add Serbia to the GISCO branch of `scripts/build-spatial-data-v086.mjs`.
2. Build the v0.89 map observations from the SORS NSTJ3 store.
3. Update the frozen regional modules under a recorded amendment.
4. Set the display decision for the approved layers.
5. Record new Linux baselines.

## 6. Electoral source verification

**Not performed.** RIK is the competent authority, but its host is not registered: unknown host means it is blocked before any request. No Serbian election page was opened.

`docs/political-data/national_election_source_registry.json` already records the background facts:
- 250 seats;
- elections since 2000;
- HTML/PDF Cyrillic reports with no bulk export;
- lists are not parties;
- minority lists are exempt from the threshold;
- no ParlGov fallback;
- `licence_gate: license_review_required`.

## 7. Elections admitted

**None.** Serbia stays outside the admission pipeline. Production `/politics/` states this as a source-admission limit, not an absence of elections (verified in both languages).

## 8. Political institutions

**Not changed.** A verified profile needs one official legal or parliamentary source read by hand, for example the National Assembly (`www.parlament.gov.rs`) or the official legal information system. Neither host is registered (§14.C).

## 9. Cross-country comparison results (production, real browser, 2026-11-14)

| Selection | Indicator | Result |
|---|---|---|
| Serbia, Slovenia, Croatia, Austria | Real GDP growth (annual) | 5 common periods, 2021–2025; Serbia 2025 = 2 % (Eurostat nama_10_gdp / SORS); 92 detailed records |
| Serbia, Romania, Hungary | HICP annual rate (monthly) | 141 common months, 2015-01 to 2026-09; Serbia 2026-09 = 4.2 % (Eurostat) |
| All 10 | Monthly unemployment | No common period, because Serbia has no monthly series. No substitution; the side-by-side mode remains available. |

**Other checks:**
- The interface reports "No additional country or reference country is selected automatically".
- The homepage map selects Serbia (选择塞尔维亚) and shows its links.
- `/countries/serbia/` and `/en/countries/serbia/` both load.

**Issue found:** the English trend-chart title reads "Real GDP, current prices growth". This is a label bug shared by all country profiles and was raised as a separate task.

## 10. Model eligibility

No change; frozen inputs are untouched.

| Method | Serbia status |
|---|---|
| Descriptive exploration and country comparison | Active (§9) |
| Trade network | Included. Serbian reporter-years pass the ≥ 0.95 eligible-partner gate (e.g. 2015 exports 0.9999). |
| Panel econometrics | Included in the 10-country panel (143 Serbian panel rows). |
| Single-country local projections | 15 registry rows. HICP price level and industrial production are ready; unemployment and the long-term yield lack outcome data. The ECB shock applies only as `external_ecb_spillover`. |
| Panel local projections | Fixed balanced eight-country design; Serbia is not part of it. |
| Event-window analysis | Requires ≥ 12 pre and ≥ 6 post monthly observations per registered outcome; unchanged. |
| VAR / LP publication | VAR/IRF publication gates remain closed as registered. No new model enabled. |

## 11. Changed files

- `scripts/serbia-integration/regional-geometry-evidence.mjs` (new, read-only evidence generator)
- `docs/serbia-integration/regional_geometry_evidence_2026-11-14.json` (new)
- `docs/v20-serbia-integration-2026-11-14.md` (this report)

No `src/`, `public/`, gate, rights or frozen file was changed.

## 12. Tests executed

- **Read-only SORS refresh plan:** 1/1 sources reached; 7 new, 65 revised. Stage validators: `serbia-audit`, `historical-*`, `var:readiness` and `baseline-definition` pass; `data-coverage:validate` fails as expected on the in-window revisions.
- **Geometry evidence join:** 25/25 at NSTJ3, 4/4 at NSTJ2, 2/2 at NSTJ1.
- **Production browser checks:** §9, homepage, profile, map and politics pages.
- **Repository checks after the change:** source-closure `--checkpoint`, `legal-security:validate`, public-secret scan and the tooling suite (results in the commit message).

## 13. Git and deployment

- Branch `serbia/integration-2026-11-14`, local commit (see `git log`). Not pushed.
- The commit contains documentation and a read-only script only, so pushing it would not change any page.
- Production remains `d8a42af`.

## 14. Remaining blockers and required approvals

**Implemented and production verified:** homepage selection, profile, Data Explorer, 2–10-country comparison, events, exports (pre-existing; re-verified today).

**Implemented locally, not deployed:** the regional geometry evidence and this report.

**Evidence available, awaiting approval:**
- **A. Regional map:**
  - (1) extend `gisco_nuts_2024_public_research` to Serbia;
  - (2) approve a governance amendment for the frozen regional modules (`src/lib/regions.ts`, `regionBoundaries.ts`, `regionObservations.ts`, `spatialDataV086.ts`, `boundaryMap.ts`, `regionSources.ts`, `platformStatus.ts`) and the v0.89 map-observation store;
  - (3) approve Serbia's display decision for named layers: boundary, population and, optionally, 2014–2020 employment and unemployment rates, all within Serbia only.
- **B. SORS refresh:** register and apply run `serbia-20261114` (7 new observations, 65 revisions, coverage re-audit).

**Blocked by legal or source restrictions:**
- **C. Elections and institutions:**
  - register `www.rik.parlament.gov.rs` (and `www.parlament.gov.rs` for institutional facts) as manual-read hosts;
  - record a rights route for RIK publications (for example the Serbian Copyright Law's exclusion of official materials of state bodies, to be checked against the published text);
  - decide a list-name rule compatible with "no candidate names stored";
  - then admit elections one by one under the existing contracts.
- **D. Government finance and current account:** register a Ministry of Finance or NBS host, with rights review, before recovery.

**Methodologically restricted (unchanged):**
- no Serbian monthly unemployment;
- the CPI is not HICP for the annual canonical indicator;
- SORS regional series are not cross-country comparable;
- the Panel LP design is fixed;
- the VAR/IRF publication gates stay closed.

**Not yet researched:**
- why the SORS CPI datasets stop at 2025-12 (a possible rebasing);
- NSTJ2 employment and unemployment 2021+ on the map;
- Serbian regional GDP (SORS regional accounts).
