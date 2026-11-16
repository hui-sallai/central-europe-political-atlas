# v2.0 thematic research layer: industrial policy, investment, energy and EU funding (2026-11-17)

Owner brief of 2026-11-17, "Comparative political-economic research expansion". Executor: Claude Code. Frontend
integration: Codex (handoff in `docs/thematic-research-handoff-2026-11-17.md`).

## A. Starting commit

`cd88adfa98db7e90955f1def0616247626d42cae` (Run 43922743498). This was Codex's institutional explorer and connected-research
work on top of `ef4402b`. Before writing anything, the existing registries were inspected: the event library (578
records, 568 verified), the frozen `events.json`, the projects, indicators, observation and history stores, the
event-analysis records (9), the E2 implementation evidence (36 milestones), the event case studies (CZ REPowerEU,
HU CATL), the regional stores, the Research Workspaces (4) and the Notebook contract. No existing record was
duplicated or edited.

## B. Research themes implemented

Four themes are in `src/lib/research-themes/themes.json`. Each has stable ids, en/zh text, indicator references by
layer, pending indicators, concepts not held, research questions, limitations and its cases.

| Theme | Indicators (by layer) | Pending | Not held (examples) |
|---|---|---|---|
| `industrial_policy_strategic_investment` | manufacturing share, industrial production (monthly, SORS), motor-vehicle export share, labour productivity, regional manufacturing share | battery_investment | output by NACE C27/C29, State aid by project, plant employment |
| `fdi_production_networks` | FDI inflow (canonical 2021+, history before 2021 where held), exports, imports, trade openness, Germany export dependence, SORS goods exports | — | FDI stocks, outward FDI, partner/industry FDI, FDI excluding SPEs |
| `energy_dependency_transition` | energy import dependency, household and industrial electricity prices, energy inflation, monthly HICP energy, European gas price | gas_import_dependency | generation mix, renewables share, energy intensity, gas by supplier, import values |
| `eu_funding_development` | government revenue, expenditure, balance, regional GDP per capita | eu_funds_received | cohesion allocations and payments, RRF disbursement series, project expenditure, IPA |

## C. Event-indicator relationships

`src/lib/research-themes/event_mappings.json` covers **89 reviewed events** with **73 indicator rows**. The 89 are 88
of the 146 verified energy, industrial-policy, FDI, EU-funds and China events, plus one regional-type event.

**Event classes:**

| Class | Events |
|---|---|
| A, documented statistical relationship | 2 |
| B, descriptive context | 25 |
| C, research topic | 12 |
| D, no justified relationship | 29 |
| E, insufficient evidence | 21 |

**Indicator rows:** A 2, B 29, C 22, D 9, E 11.

**Events by theme:**

| Theme | Events |
|---|---|
| Industrial policy and strategic investment | 20 |
| FDI and production networks | 17 |
| Energy dependency and transition | 42 |
| EU funding | 21 |

Every row records the indicator, layer, relationship, a bilingual explanation and shared limitations. The builder adds
the dataset code, unit, definition, coverage and the number of observations after the event.

Rules the validator enforces:
- Event class equals the strongest row.
- A–C rows need observations for that country.
- Pending indicators are always E.
- D/E events without rows need a reason code.
- The seven events that already had an event-analysis record must agree with it (documented→A, proposed→B/C,
  unsupported→D/E). One exception is allowed, and it is cited: CATL × motor-vehicle export share moves from "proposed"
  to D because the E2 permit finding classifies the plant as NACE C27, not C29.

Substantive corrections the mappings make:
- A bank loan to Transgaz, typed FDI, is not direct investment.
- The Majdanpek West sale between two foreign companies is not a Serbian balance-of-payments flow.
- Tyres (C22) fall outside the motor-vehicle export indicator.
- Fuel caps and tax cuts fall within what HICP energy measures, but monthly data end in July 2026.

Not done: 489 of the 578 event records remain unreviewed. They must be shown as "not yet reviewed", not as having no
relationship.

## D. Country and theme coverage

`coverage_matrix` in `thematic_index.json` (also `docs/research-themes/coverage_matrix.csv`) has 40 rows (10 countries × 4
themes). Each row records:
- applicability;
- whether an official theme-specific source is identified;
- admitted versus defined indicators;
- whether history before 2021 exists;
- the cases;
- the mapped events by class;
- investment and funding records;
- the missing indicators.

Findings:
- All ten countries have the national theme indicators admitted, except where a measure is not applicable. Germany's
  export dependence on Germany is not applicable, and SORS series apply to Serbia only.
- EU funding is **not applicable** to Serbia. It is recorded that way, never as zero.
- An official theme-specific source is identified in 21 of 40 cells. The other 19 have only media or company records, or
  no theme-specific record yet.

## E. Research cases (all four implemented)

| Case | Countries | Core content |
|---|---|---|
| `hu-battery-strategic-investment` (extends the published CATL case) | HU (+SK context) | 10 stage entries from the E2 milestones: priority decree 323/2022, grid budget HUF 87.7 bn (zone infrastructure), four permit decisions (40 → 59.6 GWh), litigation, first-phase occupancy permit, company-only production claims, undocumented support and capital. FDI (SPE-dominated swings), manufacturing share and Hajdú-Bihar (HU321) share. BYD Szeged, the announced export programme and Gotion Šurany for comparison. |
| `rs-mining-foreign-investment` | RS | Zijin–RTB Bor (USD 350 m paid capital, kept separate from the USD 1.26 bn commitment; an operating company, not a new production start). Majdanpek West exploration sale (licence renewal, AU$300k; no exploitation permit). Linglong Zrenjanin (production 2024; C22). FDI 1,485 → 5,226 m EUR (2013–2024). SORS manufacturing share 17.8 → 12.2%. Bor district (RS221) population and unemployment. |
| `cz-repowereu-energy-transition` (extends the published REPowerEU case) | CZ (+SK context) | 11 funding-stage records from E2 (allocation €681 m, pre-financing €147.09 m, authorisations, a €97.6 m suspension and its lifting, disbursements, the final request). Fulfilment evidence for targets 299/346. Energy import dependency, electricity prices and monthly HICP energy windows. A flagged data issue (loans €260 m vs €818 m). |
| `eu-rrf-funding-stages` | CZ, SK, PL, SI, RO, HR, HU | A documentary case on the stage at which each admitted record sits (authorisation, request, contract, disbursement, restriction), with grants, loans and SAFE defence loans kept separate. It has no quantitative window, by design. |

Each case includes:
- research question;
- chronology (generated from the referenced records);
- institutional context;
- indicator series;
- regional records;
- findings;
- interpretation;
- limitations;
- links.

Every number quoted in a finding is listed in `checks` and verified against the store by the builder.

## F. Historical observations connected

Seven evidence windows hold 159 copied observations, each with its `observation_id`; missing periods are listed and
never filled.
- **Status per series**: `complete`, `asymmetric`, `pre_event_only` or `none`.
- **Complete windows**: CZ monthly HICP energy ±12 months around October 2023 (CZ and SK), SORS manufacturing share
  2015–2021, and Bor population 2015–2021. FDI windows are asymmetric: Hungary has no FDI history before 2021, and
  Serbia's FDI is split across the historical and canonical layers, which are never spliced.
- **Pre-event only**, because the data end before the anchor: the HU trial production of September 2026 and the
  Majdanpek sale of November 2026.

The indicator catalogue has 42 indicator × layer entries, with datasets, units, definitions, coverage and Data
Explorer keys.

The single-vintage annual reference layer is not used. The owner restricted it to its own isolated descriptive view,
and the first full tooling run caught an early draft that read it (two boundary tests failed). The builder now refuses
that layer, and a test proves it.

## G. Regional records integrated

Project locations:

| Region | Code | Project |
|---|---|---|
| Hajdú-Bihar | HU321 | CATL |
| Csongrád-Csanád | HU333 | BYD |
| Nitra | SK023 | Gotion InoBat |
| Bor district | RS221 | RTB Bor, Majdanpek |
| Central Banat | RS126 | Linglong |

Each location carries its held regional series (Eurostat NUTS 2024; SORS NSTJ). The role is always
`project_location`, and no national figure is assigned to a region.

## H. Official sources used

**Eurostat:**
- bop_fdi6_flow
- sts_inpr_m
- nama_10_a10
- nama_10_gdp
- nama_10_lp_ulc
- ext_tec09
- nrg_ind_id
- nrg_pc_204, nrg_pc_205
- prc_hicp_aind, prc_hicp_minr
- gov_10a_main, gov_10dd_edpt1
- nama_10r_3gva, nama_10r_3gdp
- demo_r_pjanaggr3

**SORS:** 060001IND02, 0902010301IND01, 180304IND02, 2400020102IND04, 1702IND01.

**UN Comtrade.**

**Official documents through existing records:**
- Commission decisions C(2024) 9258, C(2024) 9246 and later decisions;
- Commission press releases (IP/23/4642, MEX notes);
- Council document ST 13383/23;
- Magyar Közlöny 2022/137;
- Hajdú-Bihar permits;
- gov.si, vlada.gov.hr, srbija.gov.rs, privreda.gov.rs and economy.gov.sk.

No new host was contacted in this iteration. Every source is an existing admitted store or record.

## I. Bilingual content

All prose is `{en, zh}`: themes, questions, descriptions, mapping summaries and connections, 14 shared limitations,
stage summaries, funding notes, case findings, interpretation and limitations. IDs, dataset codes, URLs and legal
identifiers are not translated.

## J. Changed files and schemas

**New authored files** (schema `atlas-thematic-research-v1`), in `src/lib/research-themes/`:
- `meta.json`
- `themes.json`
- `event_mappings.json`
- `investment_records.json`
- `eu_funding.json`
- `cases.json`

**Generated files:**
- `thematic_index.json`
- `docs/research-themes/{event_indicator_mappings,coverage_matrix,eu_funding_records,evidence_windows}.csv`

**New tooling and API:**
- `src/lib/thematicResearch.ts` (typed API and Notebook draft helper)
- `scripts/research-themes/build-research-themes.mjs` (validator and builder, `--check`)
- `tests/tooling/research-themes.test.mjs` (14 tests, including negative cases)

**Governance:** UI amendment `thematic-research-layer-2026-11-17` (8 exact hashes, DATA_PRESENTATION).

**Docs:** this report, the Codex handoff and `docs/research-themes/development_backlog.json`.

No existing store, event, project, case-study or frozen file was changed.

## K. Validation

| Check | Result |
|---|---|
| `node scripts/research-themes/build-research-themes.mjs --check` | OK (89 events, 73 rows, 4 cases) |
| `node --test tests/tooling/research-themes.test.mjs` | 14/14 |
| `node --test tests/tooling/*.test.mjs` | 491 passed, 0 failed (492 tests) |
| `npm run -s legal-security:validate`, `i18n:validate`, `typecheck` | pass, pass, pass |
| `node docs/political-data/source-closure/validate.mjs --checkpoint` | pass |
| `npm run -s build:site`, `npx playwright test` | build OK on second run (the first stopped at a Next.js security-advisory notice after prerendering); Playwright 758 passed, 2 skipped |
| `node scripts/security/check-public-secrets.mjs`, privacy grep | pass, clean |

## L. Final commit

Data commit `89e87d9`, guard fix `5e588fa` (live).

## M. Deployment

**First push.** `89e87d9` (on 推送上线). Deploy run 43962737014 failed at "Validate descriptive histories and model
isolation". Four guards only let publishing, refresh and display code read the descriptive stores, and the new builder
reads them. These four validators are part of the full `build` chain and were not run locally before the push. Production
stayed on `cd88adf`.

**Owner decision (2026-11-17).** Allow the one builder file. Its exact path
`scripts/research-themes/build-research-themes.mjs` was added to the reader allowlists of:
- `scripts/historical-annual/validate.mjs`
- `scripts/historical-monthly-descriptive/validate.mjs`
- `scripts/historical-regional/validate.mjs`
- `scripts/serbia-sors/validate.mjs`

The exception is one file, not a directory. A new tooling test checks that only `src/lib/thematicResearch.ts`,
`src/app/`, `src/components/` and the builder import the thematic files, and that each exception stays one exact file.

**Fix commit.** `5e588fa` (on 推送上线). Deploy run 43973595081: build and deploy succeeded. Production provenance shows
`5e588fa` (generated 2026-11-16T22:51:54Z).

**Production checks:**
- Research package: 169,434,897 bytes, sha256 `1bb0d23ec5b1cee8…`.
- Production acceptance: 6/6.

**Alerts:**
- Code scanning: 2 open (#17, #18, `js/xss-through-dom` warnings in `src/components/InstitutionComparison.tsx` lines 77 and
  92). They were first raised at 16:41 UTC on Codex's institutional-explorer commits, before this iteration's pushes, and
  are Codex-owned.
- Dependabot: `minimatch` (#24, unchanged), plus a new Next.js advisory (#25 and #26, medium, `'use cache'` information
  disclosure, affects 16.3.0–16.4.4, fixed in 16.4.5; the project pins 16.4.1). Upgrading needs an owner decision because it
  changes `package.json`.

## N. Remaining gaps

See `docs/research-themes/development_backlog.json`. The main ones:
1. 489 events unreviewed.
2. No series held for FDI stocks or outward FDI, partner or industry FDI, the energy mix, renewables, gas by supplier,
   EU funds received or cohesion payments.
3. Serbia NSTJ3 labour data end in 2020.
4. EU-funding amounts for SK, SI and HR are restated from admitted records, not re-read in Commission documents. The
   Commission document hosts are not registered.
5. The CZ case loan-figure discrepancy.
6. Inherited items A–G.

## O. Codex handoff

`docs/thematic-research-handoff-2026-11-17.md` sets out the files, IDs, API, journey, routes, missing-data behaviour,
visual rules and reusable components.

## P. Recommended next iteration

1. Codex: thematic workspace journey on the delivered API (handoff §4).
2. Claude: review the remaining 58 thematic-type events.
3. With owner approval to register `commission.europa.eu` and `reforms-investments.ec.europa.eu`: verify the SK, PL,
   SI and HR funding amounts in Commission documents and resolve the CZ loan figure.
4. Admit FDI positions and outward flows (`bop_fdi6_pos`, `bop_fdi6_flow` asset side) and energy-mix shares
   (`nrg_bal_peh`, `nrg_ind_ren`) as new data-refresh units under the existing gate.
