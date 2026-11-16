# Political institutions dataset: Codex integration specification (2026-11-16)

This dataset supersedes the evidence list in `docs/institutional-evidence-handoff.md`. The research is done: every field below is read from an official text, or marked pending. Do not re-research the facts. Do not copy them into components. Read them from the registry.

## A. New data files

| File | Role |
|---|---|
| `src/lib/institutions/countries/<slug>.json` (10 files) | Canonical country records, authored by hand and validated. |
| `src/lib/institutions/meta.json` | Country order, case-study list, comparison field definitions, value-code labels, status labels, chamber-role labels, method note. |
| `src/lib/institutions/election_links.json` | **Generated**; never edit by hand. Holds institutional periods per country and one link per admitted election (21). |
| `src/lib/institutionalRegistry.ts` | Typed accessors. Import only from here. |
| `src/lib/institutionProfiles.ts` | Your existing contract, now derived from the registry. Same exports; all ten countries have rules. |
| `scripts/institutions/build-institutions.mjs` | Validator and generator. `--check` fails on a stale `election_links.json` or any schema problem. |
| `tests/tooling/institutions-registry.test.mjs` | Nine tooling tests. |

Workflow for a correction:
1. Edit the country JSON.
2. Run `node scripts/institutions/build-institutions.mjs`.
3. Run the tests.

Every view then changes.

## B. Canonical schema (`institutional-country-v1`)

**Top level**
- `country`, `iso2`, `verified_on`.
- `baseline_status`: `complete` or `partial`.
- `case_study`.
- `overview {en, zh}`.

**`constitution`**
- `id`, `official_name`, `name`.
- `adopted`, `in_force`, plus `in_force_note` when the date was not read.
- `publication`.
- `current_text {as_of, note}`, `source_ids`.

**`chambers[]`**
- `chamber_id`, `official_name`, `name {en, zh}`.
- `role`: `lower` | `upper` | `sole` | `federal_council` | `interest_council`.
- `store_chamber`: the chamber name in the election store, so stores and chambers join.
- `members {value | null, basis, articles, source_ids}`.
- `term_years`.
- `selection {code, label, articles}`, `powers`, `note`.

**`offices[]`**
- One `head_of_state` and one `head_of_government`.
- Each has `official_name`, `name`, `selection`, `term_years`, `term_limit`.

**`fields{}`**: exactly the 16 comparison fields in `meta.comparison_fields`. Each field has:
- `value`: a code from `meta.value_labels`, a number, or `null`.
- `label {en, zh}`: the short display text.
- Optional `detail {en, zh}`.
- Optional `steps[]` (formation steps).
- `articles`, `source_ids`.
- `status`: `verified` | `partially_verified` | `pending` | `not_applicable`.
- `comparability`: `direct` | `qualified` | `not_comparable`. When it is absent, `verified` means direct.
- Optional `effective_from`, optional `store_rule_record`.

**`electoral_systems[]`**: the current rule per chamber.
- `thresholds_from_store: true` means: show the thresholds from the linked election rule record, not from here.

**`changes[]`**
- `adopted`, `promulgated`, `effective`: each `YYYY-MM-DD` or `null`.
- `effective_note` when a date was not read.
- `previous` / `new` (`previous` may be `null` when not read).
- `legal_basis`, `source_ids`.
- `status`: `verified` | `partially_verified`.

**`case_study_sections[]`**: seven sections in fixed order `structure, formation, accountability, electoral, limits, changes, rules_vs_practice` (brief items A–G). Only for PL, HU, DE, RS.

**`pending[]`**: `{field, reason}`. Every pending field has a reason.

**`sources[]`**
- `publisher`, `title`, `url`, `kind`, `language`, `version`, `retrieved_on`.
- `retrieval_sha256`: `null` for pages read in a browser.
- `access`.

## C. Coverage

All ten countries have all 16 fields. Field counts below are verified / partly verified / pending / not applicable.

| Country | Baseline | Fields | Case study | Elections linked |
|---|---|---|---|---|
| Poland | complete | 16 / 0 / 0 / 0 | yes | 4 |
| Hungary | complete | 15 / 0 / 0 / 1 | yes | 2 |
| Germany | complete | 16 / 0 / 0 / 0 | yes | 7 |
| Serbia | complete | 15 / 0 / 0 / 1 | yes | 4 |
| Czechia | complete | 16 / 0 / 0 / 0 | — | 3 |
| Slovakia | complete | 15 / 0 / 0 / 1 | — | 1 |
| Austria | complete | 15 / 0 / 0 / 1 (no separate confidence vote) | — | 0 |
| Slovenia | complete | 16 / 0 / 0 / 0 | — | 0 |
| Romania | complete | 15 / 1 (electoral system) / 0 / 0 | — | 0 |
| Croatia | complete | 15 / 0 / 0 / 1 | — | 0 |

"Not applicable" is the second chamber in unicameral countries, plus Austria's confidence vote.

## D. Comparison fields

The fields follow `meta.comparison_fields` order and are grouped by `meta.groups`:
- government system
- territorial organisation
- legislature
- legislative term
- second chamber or council
- head-of-state selection
- head-of-state term
- government formation
- investiture
- no-confidence
- confidence vote
- dissolution
- veto and override
- constitutional review
- electoral system
- state form

**Display rules**
- Show `label` as the cell text, `valueLabel` (from `value_labels`) as a small category line, and `detail` / `articles` / sources on expansion.
- Never colour-code or order cells by value: these are descriptions, not scores.
- When `comparability` is `qualified`, show an "Arrangements differ — read the detail" marker. This applies to Bundesrat versus Senate versus National Council, for example. The marker matters most for `legislature_structure` and `second_chamber_role`: `bicameral` covers only PL, CZ and RO; DE, AT and SI have their own codes.
- `pending` shows "Pending verification" with the reason from `pending[]`. `not_applicable` shows "Not applicable".

**API**
- `compareInstitutions(slugs, en)`: returns rows for 2–4 slugs, or `null` for an invalid selection.
- `comparisonCell(slug, fieldId, en)`: one cell.

## E. Historical effective periods

- `institutionalTimeline(slug)` returns changes ordered by effective date, then promulgation, then adoption. Undated changes come last and must be drawn without a date tick.
- Adoption, promulgation and effect are separate fields; show all that are present.
- `institutionalPeriods(slug)` returns `[{period_id, from, to_exclusive, opened_by[]}]`.
- `electionInstitutionalContext(electionId)` returns:
  - `chamber_id`
  - `seats`, from the legislature record
  - `electoral_system_id`, `system_family`, `allocation_method`
  - the election's own `thresholds`
  - `institutional_period_id`
  - `changes_in_force`, `later_changes`, `undated_changes`

  Never show current statutory thresholds for a past election. For example, Czechia 2017 shows 5/10/15/20, not 5/8/11.
- Field-level `effective_from` is set only where verified: CZ and SK presidential election, AT term. Otherwise show "current wording verified on `verified_on`".

## F. Bilingual labels

- All texts are `{en, zh}`, and the tests require the same multi-digit figures in both languages.
- Use `text(value, en)`.
- Chamber names keep the original designation in the Chinese label, for example 众议院（Sejm）. Chinese labels never carry English glosses.
- Source titles are in the original language and are shown unchanged in both locales.
- Do not translate IDs or URLs.

## G. Official source links

- `countrySources(slug, ids?)`; every field has `source_ids`.
- Hosts are registered for manual reading in `docs/legal-security/network_acquisition_registry.json`.
- Do not fetch them from the browser.
- Link text is `title — publisher`, already provided by `institutionalSourceLinks(slug)`.

## H. Country Research Hub integration points (`CountryResearchProfile.tsx`, `#institutions`)

1. Overview paragraph: `institutionalCountry(slug).overview`.
2. Chamber cards: `chambers[]`, showing name, `official_name`, members with basis, term, selection label and `chamber_roles[role]`. The Bundesrat (DE) and Državni svet (SI) must show their role labels.
3. Executive: `offices[]`, the two offices with selection and term limit. HU and DE show selection by parliament or the Federal Convention.
4. Electoral system: `electoral_systems[]`; thresholds come from the linked store record.
5. Election history: `countryElectionLinks(slug)` → `/politics/<slug>/?election=<id>`. RO, SI, AT and HR have no admitted elections; show the institutional record only.
6. Timeline: `institutionalTimeline(slug)`.
7. Case study (PL, HU, DE, RS): `caseStudy(slug)`, seven collapsible sections.
8. Comparison entry: the existing `/politics/?institution_countries=<slug>,…#institutions` link.
9. Sources and pending list.

Keep full constitutional text off the page. Link to the sources instead.

## I. Institutional Comparison workspace

`InstitutionComparison.tsx` already reads the registry for system, offices, sources and pending items; only minimal edits were made.

**Next step:** replace the five-row `dl` with a `compareInstitutions()` table. Fields are rows, countries are columns, and the table scrolls horizontally on mobile.
- Keep the 2–4 selection and the `institution_countries` URL state.
- Keep the economic comparison links.
- Add field-group toggles, with all groups open by default.

## J. Timeline visualisation

- Draw one lane per country, with dated changes as ticks at their `effective` date (fallback: promulgation, then adoption, with a hollow marker).
- Draw admitted elections as diamonds from `countryElectionLinks`. Shade institutional periods from `institutionalPeriods`.
- List undated changes below the axis.
- Hungary's two 2026 amendments, 20 June and 19 July, fall after the 12 April 2026 election. The visual must show that order.
- Use no interpolation and no continuous bands before the first recorded change.

## K. Existing UI content to replace

- `src/lib/data.ts` and `src/lib/additionalCountries.ts` `parliamentZh` / `polityZh`. These files are frozen; leave them as they are. Never display these fields again. They hold the generic 两院制：众议院与参议院 for Poland. Use `chamberNames()` and `fields.government_system.label`.
- The EU country-profile and European Parliament directory links were secondary sources. They are now replaced by official sources in `InstitutionalProfile`. `parliamentaryDirectory` remains exported but unused.
- **Event titles still shown in Chinese on English pages** (event registries are frozen; add approved English titles to the event translation table after owner review):
  - `CATL 公布德布勒森电池工厂投资计划` (Hungary hub). Suggested: "CATL announces investment plan for Debrecen battery plant".
  - `捷克修订复苏计划纳入 REPowerEU 能源改革与投资` (Czechia hub). Suggested: "Czechia's revised recovery plan adds REPowerEU energy reforms and investment".

  No statistical definitions remain in Chinese on the ten English hubs. Checked 2026-11-16 in production with all `<details>` expanded for Serbia, Romania and Hungary, and in the static build for all ten.

## L. Remaining research-data gaps

**Romania**
- Law 208/2015 was read from the 2015 text sent for promulgation and the Chamber of Deputies' act record; the consolidated text was not read. roaep.ro is CAPTCHA-protected and legislatie.just.ro unreachable; both are blocked.
- The Chamber of Deputies' sitting total (312 constituency seats plus a variable number of minority seats).
- Dates of the 2003 revision's referendum and its entry into force.

**Croatia**
- Election Act read and current through the Constitutional Court's list of 6 February 2024; amendments after that date were not checked.
- Exact dates of the 1990, 2000 and 2001 constitutional acts.
- The NN 5/2014 change was not read.

**Slovenia**
- The National Assembly Elections Act (districts, formula).
- Entry-into-force dates.

**Austria**
- The current Bundesrat total.
- Pre-2008 article versions.

**Poland**
- Constitutional history before 1997 and pre-2011 electoral laws.
- The two amending acts listed by ELI.

**Hungary**
- The 1989 constitutional amendment and the 1989–2011 period.

**Serbia**
- Electoral law before 2022.
- The date of the 2022 referendum.

**Germany**
- The current Bundesrat vote distribution.
- Electoral-law history before 2023 is taken from the election rule records, not re-read.

**All countries**
- Per-article version dates, except where listed in E.
