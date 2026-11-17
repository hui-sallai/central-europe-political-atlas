# Thematic research layer: Codex frontend handoff (2026-11-17)

This handoff covers the data for thematic Research Workspaces. Claude delivered the data, schemas and validation; the
frontend is yours. Do not build a second Data Explorer, and do not recompute anything in this layer: every
number is already in a validated file.

## 1. Files

| File | Role | Read where |
|---|---|---|
| `src/lib/research-themes/meta.json` | Vocabularies: relationship classes A–E, reason codes, investment and funding stages, evidence statuses, layer labels, boundaries | anywhere (small) |
| `src/lib/research-themes/themes.json` | 4 themes with indicators, pending indicators, concepts not held, questions, limitations | anywhere |
| `src/lib/research-themes/event_mappings.json` | 89 reviewed events (authored) | via the API below |
| `src/lib/research-themes/investment_records.json` | 7 investment/policy records with stage-by-stage evidence | anywhere |
| `src/lib/research-themes/eu_funding.json` | 27 stage-specific EU-funding records and the programme list | anywhere |
| `src/lib/research-themes/cases.json` | 4 published research cases | anywhere |
| `src/lib/research-themes/thematic_index.json` | **Generated** (384 KB, includes copied observations): catalogue, enriched mappings, coverage matrix, funding applicability, chronologies, evidence windows | **build time / server components only** |
| `src/lib/thematicResearch.ts` | Typed API over all of the above | — |
| `docs/research-themes/*.csv` | Reproducible exports (mappings, coverage, funding, windows) | for download links |

Never edit `thematic_index.json` or the CSVs by hand. Regenerate them with
`node scripts/research-themes/build-research-themes.mjs`; `--check` fails if they are stale.
`tests/tooling/research-themes.test.mjs` covers validation.
All eight `src/lib` files are hash-listed in the UI amendment `thematic-research-layer-2026-11-17`. Any edit to them
needs a new amendment.

## 2. IDs

- **Themes**: `industrial_policy_strategic_investment`, `fdi_production_networks`, `energy_dependency_transition`, `eu_funding_development`.
- **Cases**: `hu-battery-strategic-investment`, `rs-mining-foreign-investment`, `cz-repowereu-energy-transition`, `eu-rrf-funding-stages`.
- **Countries**: the existing slugs. **Events**: existing event-library ids. **Indicators**: existing ids, each paired with a `layer`.
- **Projects**: `projects.json` ids. **Implementation milestones**: ids from `eventImplementationEvidence.ts`.
- **Regions**: the existing `region_id`, with `admin_code` (NUTS 2024 or SORS NSTJ).
- `explorer_key` on each catalogue/mapping layer is the value for the existing `comparison_indicator` URL parameter:
  `annual:<id>`, `monthly:<id>`, `macro:<driver>:<transformation>` or `sors:<series>`. It is `null` for regional layers; use the map route for those.

## 3. API (`@/lib/thematicResearch`)

`researchThemes`, `theme(id)`, `researchCases`, `researchCase(id)`, `mappingForEvent(eventId)`, `mappingsFor(themeId?, country?)`,
`investmentsFor(country?, themeId?)`, `fundingFor(country?)`, `coverageFor(country, themeId)`, `coverageMatrix`,
`fundingApplicability`, `caseChronology(caseId)`, `caseWindows(caseId)`, `indicatorCatalogue`, `relationshipLabel(code, en)`,
`bi(value, en)`, `limitationLibrary`, `thematicMeta`, and `mappingNotebookDraft(eventId, indicatorId, en, siteBase)`.
That last helper returns an `EvidenceDraft` for the existing Notebook (type `event`, layer
`thematic_event_indicator_mapping`).

## 4. Suggested journey and routes

Research topic → country → policies and events → indicators → Data Explorer → regional context → Notebook.

1. **Theme entry**: extend `/workspaces/` with four thematic cards, either as new `researchWorkspaces` entries or as a
   theme section on the existing workspace page. Suggested route: `/workspaces/<theme_id>/` (and `/en/…`). Show
   `title`, `description`, `research_questions`, `limitations`, `not_held` and `pending_indicators`.
2. **Country filter**: use `coverageFor(country, theme)` per country, which gives the six statuses in `thematicMeta.coverage_statuses`.
   Show `theme_applicable=false` with its `note`, never as zero.
3. **Events and policies timeline**: show `mappingsFor(theme, country)`, sorted by date, with the class label
   (`relationshipLabel`), `summary`, evidence status, and per-indicator `connection` and limitations. Add
   `investmentsFor(country, theme)` stages and, for theme D, `fundingFor(country)` grouped by `stage`. Never sum amounts.
4. **Indicator history**: each mapping layer and catalogue entry has `explorer_key`. Link to
   `/data/?compare_countries=<country>&comparison_indicator=<explorer_key>`.
5. **Country profile**: `/countries/<slug>/`.
6. **Regional context**: records with `location` and the case `regional` entries. Link to
   `/map/?country=<c>&layer=<regional indicator>&year=<y>&regions=<region_id>`, labelled "project location". It
   must not be labelled as an effect.
7. **Notebook**: add a collect button on each mapping row using `mappingNotebookDraft`. For case evidence use the existing
   `observation`/`series_view` drafts with the window's `observation_id`s.
8. **Cases**: suggested route `/workspaces/<theme_id>/?case=<case_id>`. Render the research question, chronology
   (`caseChronology` dated + undated), institutional context, findings, interpretation, limitations, windows, regional
   records and `links`. Two cases have `extends` set: link them to the published event case study at
   `/models/?tab=run&skill=event_window_analysis&country=<c>&event=<event_id>&section=case`.
   The routes in `cases.json` `links` are suggestions, so check that each one resolves before you show it.

## 5. Missing-data behaviour

- **Event not in `eventMappings`**: show "Not yet reviewed" (未审核). Never show "no relationship", and do not keep
  showing "Pending coding" for a reviewed event.
- **Class D/E with no rows**: show the `reason_code` label from `thematicMeta.reason_codes`.
- **Pending indicators** (`battery_investment`, `gas_import_dependency`, `eu_funds_received`): label them "defined, no
  observations". Never plot them.
- **Window `status`**:
  - `none` → hide the series;
  - `pre_event_only` → show "no observations after the anchor yet";
  - `asymmetric` → list `missing_periods`.
  Never interpolate a missing period.
- **Funding records**: when `amount` is null, show "amount not stated". Show `amount_precision`
  (`rounded_as_published`, `lower_bound`) next to the value.
- **Coverage**: show `data_admitted` as "n of m indicators", and list `evidence_missing`.

## 6. Visual rules

- Numerical charts only from `caseWindows` series with a status other than `none`, and one chart per layer: canonical and
  history layers are not spliced. Do not chart funding amounts across countries; the case explains why.
- The case `eu-rrf-funding-stages` has `window_blocker`: render it as a documentary case, with no chart.
- Keep stable IDs, dataset codes, URLs and legal identifiers untranslated. All prose fields are `{ en, zh }`.

## 7. Reusable components

`NotebookCollect` (Notebook), `EventCaseStudy` (for the two `extends` cases), the existing workspace evidence cards,
and the Data Explorer and map deep links. No new data component is needed.

## 8. Open items for Codex (inherited)

- **E. Bilingual metadata leakage**: keep checking that zh pages show only the `zh` fields of this layer.
- **F. Stale Serbia regional-coverage wording in Research Workspaces**: unchanged here. The Serbia case uses NSTJ3
  data for RS221/RS126, with labour data to 2020 and population to 2025.

## 2026-11-18 · Frontend delivery and remaining data requests for Claude Code

The portals now consume the delivered records in four workspaces. The following are specific additions that would change what a researcher can inspect. Admit new evidence through the existing registry and leave fields unresolved if the supporting document cannot be verified.

| Theme, country and record | Evidence already available | Missing field, period and use after verification |
|---|---|---|
| Industrial policy · Hungary · `hu-catl-debrecen-battery-plant` | Announcement, amended permits, occupancy decisions and scoped company reports in the CATL implementation file. `hu-e2-09-capital-unavailable` records the spending gap. | From the 2022 announcement onward, seek dated **realised project-specific expenditure** tied to the Debrecen legal entity and facility. Record currency, reporting period and definition from an audited filing or competent authority. Keep this separate from announced investment, grid support and national balance-of-payments FDI. The timeline can then display a documented expenditure stage. |
| FDI and production networks · Serbia · `rs-majdanpek-west-exploration` | The 2026-11-10 transaction record identifies an exploration project. Bor location supplies descriptive NSTJ context. | For the November 2026 transaction and later revisions, verify the licence holder, licence number, geographic extent, effective date and exploration/operating status against the mining authority. Any production field needs independent site-level operational evidence, a period and unit. Country or Bor district industrial output cannot supply it. |
| Energy transition · Czechia · `cz-repowereu-energy-transition` | Commission and Council records and the staged payments record include the preliminary final-request assessment (`cz-e21-17-final-request-assessed`). | For the seventh request, register an official final implementing decision or dated payment evidence, with grant/loan split, when available. For outcomes, separately identify actual generation or network use, geography, period and unit. Additional connection capacity is a different measure. |
| EU funding · Romania · `ro-rrf-2026-final-request` | October 2026 request in event `ro-2026-10-01-final-payment-request-under-nrrp-id1065838`; amount missing. | Obtain the authority's dated request or Commission assessment specifying the instalment and amounts by instrument. A later authorisation or payment requires its own dated row. The country comparison must continue to show an unstated amount until then. |

The inherited historical coverage, statistical comparability, regional gaps, remaining event reviews, bilingual consistency, institutional history and workflow obligations remain tracked in the existing backlogs. Prioritise the four requests above for the case timelines. No new model inputs are requested.
