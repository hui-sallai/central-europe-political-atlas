# v2.0 atlas usability implementation — 2026-11-10

Status: owner-authorised release preparation, following the 2026-11-10 instruction “推送部署”. Local implementation and acceptance PASS. Consolidated browser run: 650/650 passed; final focused follow-up: 60/60 passed; tooling: 405/405 passed. The feature branch is pushed; main deployment is pending final Linux verification of the country-card correction.

Baseline: actual remote main `1b857462dc4ff10bc91a7dbd1569d65b5b24625e`. Work is on `feature/v20-atlas-usability`. The frozen production artifact and its acceptance branch are preserved. Brand and platform version remain Central Europe Political Atlas v2.0.

## User-facing changes

- Map first: the existing interactive map follows the concise introduction. Country actions lead to national data, admitted election research, regional mapping and existing models. Coverage, four Workspaces and D4/CATL/REPowerEU cases follow the map; the dated Event Library and methodology remain available.
- Availability: annual year choices follow the selected indicator rather than all indicators in the country. Explicit out-of-range requests remain selected. The summary separates published coverage, unique observed periods, internal gaps, selected periods outside coverage, Pending records and recorded restrictions. Inapplicability and definition mismatch are distinguished from Pending; missing/Pending totals are deduplicated. Recovery requires clicking “Use published coverage”. The Romania industrial electricity 2002–2010 request reports zero selected observations and nine periods outside the actual 2023–2024 coverage.
- Relevant provenance: exact country/series change evidence precedes the expandable complete refresh history. Global job counts remain labelled as run totals; absent change evidence is not treated as absence of revisions or official publication.
- Shared chart interaction: opt-in hover/focus/tap inspection, arrow-key traversal, an observation selector usable on touch devices, period filters for long series and exact-value source tables. Calendar gaps and explicit breaks interrupt lines. Stateless noninteractive model charts retain their original rendering path. Existing uncertainty information is retained; no intervals are generated. Generic controls refer to values rather than labelling model outputs as observed data, and missing status metadata is identified explicitly.
- Reused chart consumers: Data Explorer annual/monthly observations, Hungary policy-rate data, country overview histories and regional histories. Series metadata preserves units, status, original publisher and source URLs when recorded. Existing English unit names are reused for display; canonical units and exports are unchanged.
- Regional comparison: existing map selection gains a compact 2–5 region selector and a same-year indicator table. Region-minus-reference differences require matching admitted definitions, units, periods, levels and geographic versions; percentage units use percentage points, and relative percentages are omitted for percentage units, zero references and unsuitable units. Tolna/Hajdú-Bihar tests use actual 2024 GDP-per-capita snapshots. Earlier NUTS backcasts and pre-break histories stay separate and are excluded from differences. Year choices intersect actual observations for all selected regions; a missing-region-year fixture verifies explicit recovery to the latest common year. PPS remains a monetary-volume unit, not percentage points. Unsupported requested years require explicit recovery rather than replacement.
- Political landing: five admitted countries are visible before election details. Summaries reuse chamber, election-year and seat records with source links. Germany is opened only by selection or an existing research query; election, comparison, party-series and context deep links remain compatible. Existing country explorers, technical disclosures and exports are reused.
- Language: shorter bilingual introductions, availability explanations, chart instructions and policy-rate definition. Original publisher/proper names are preserved; no event translations or research findings are generated.

## Validation

- Tooling: 405/405 passed, zero skipped, including six new availability and regional-comparability regressions.
- Focused browser checks: 44/44 passed across Chinese/English and desktop/mobile. They cover requested-period recovery, map entries, exact policy-rate points, keyboard/selector inspection, country chart source tables, Tolna/Hajdú-Bihar comparisons, unsupported map years and neutral political entry/legacy links.
- All five original history/coverage validators and original frozen numerical/publication checks passed. The release pipeline initially stopped at two disallowed generic UI labels; those were corrected without changing the validator.
- The default local build encountered external-font/child-process restrictions. Next.js's existing `--webpack` build completed; no dependency, build configuration or validation rule was changed. Remaining release checks run separately against that static output.
- Bilingual static checks passed (1,737 checks, 27 route pairs). Release QA passed (68 routes, 174 exports, 3,029 internal links, 6 stable research URLs, 145 checks, zero blockers). Built legal/security and source-closure checkpoint passed.
- Final complete browser suite: 650/650 passed, zero skipped, with ordinary `updateSnapshots: none`. This includes D1–D4 and E1–E2.1 access, CSV/JSON, Notebook, sharing, language switching and existing annual/monthly comparisons. Initial regression failures exposed untranslated chart captions, over-broad legacy table selectors, a hidden default-Germany test assumption and mobile chart min-content overflow; these were fixed without weakening their data assertions.
- After that complete run, the final neutral chart wording and status fallback were checked by 60/60 chart/model/monthly browser tests and the built-output gates.
- Fourteen deliberate macOS baselines changed, only for the Chinese/English homepages and neutral political landing. Desktop/mobile and light/dark examples were visually inspected. Four political visual checks were additionally verified in ordinary mode after final baseline recording; Linux baselines were not copied from macOS or changed.
- TypeScript and lint passed (zero lint errors; one pre-existing unused-variable warning). Source exports: 822 checked, no differences. Exact-hash governance covers 20 changed presentation files; no wildcard, source-reader gate or model exception was added. Privacy scan passed.

## Files

Presentation: Chinese/English homepage and Politics routes; English country route; `globals.css` (mobile map height only), `HomeResearchMap`, `HomeResearchDiscovery`, `DataExplorerV11`, `DataRefreshTransparency`, `ResearchTimeSeriesChart`, `MacroDriverWorkbench`, `MonthlyComparisonWorkbench` (chart source metadata only), `CountryResearchProfile`, `RegionHistoryTrend`, `ComparativeSpatialWorkbench`.

New presentation helpers: `DataAvailabilitySummary`, `PoliticalLanding`, `observationAvailability`, `regionalComparison`.

Governance/testing: exact-hash UI amendment, focused tooling/browser tests, existing homepage/politics regression expectations and deliberate macOS screenshots. No canonical observations, monthly stores, political/election records, news, trade, model engine, frozen output or publication gate is changed.

## Remaining boundaries

No missing values are estimated. Coverage summaries describe admitted records, not a claim that an official source remains unpublished today. Full institutional/chamber-system coverage is not inferred from election records. Historical geographic discontinuities remain descriptive. Regional difference rows are UI calculations; existing map exports retain original observations, periods, sources and ordered selected-region identifiers. Chart-only period controls do not replace the workbench filters used by existing CSV exports. Existing source rights, legal restrictions and formal VAR/IRF publication limits remain in force.

## Release preparation

Owner approval to push/deploy: 2026-11-10, “推送部署”. The development brief alone did not authorise deployment; this later instruction does.

The existing non-deploying Linux record run #370 (`42679359443`, source `564bdcf`) succeeded: 649 browser tests passed without retry and one existing mobile English country-navigation test passed on the configured retry. Tooling: 402 passed, three existing conditional skips. The intermittent navigation timeout is retained, not counted as a first-attempt pass.

Eighteen Linux screenshots differed: fourteen home/politics views and four country views, all within the changed presentation scope. Image review identified a real clipped Chinese country-card chart: the chart extended to x=553 on a 390-pixel mobile viewport, although the old overall-page-width check passed because its parent hid overflow. A stricter chart-boundary regression reproduced the failure. Minimum-width/grid constraints were corrected; the same four bilingual desktop/mobile country tests now pass, covering Hungary and Poland. Fourteen reviewed Linux home/politics baselines were accepted; the four country baselines are being regenerated from corrected code. No screenshot or timeout threshold was relaxed.

A fresh Linux record/verification and then normal main CI/deployment are required. Version, research observations, estimators and publication gates remain unchanged.
