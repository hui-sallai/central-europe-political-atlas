# v2.0 iteration: ten-country political institutions dataset (2026-11-16)

## 1. Starting commit

The work started at `46dca48f4d6b85b14b8bda983440f5d44314368b` ("Pin reviewed bilingual institution comparison layouts"). That commit was main HEAD and was live: GitHub Actions run 43780326401 ("Deploy GitHub Pages") ran on `46dca48`, and its build and deploy jobs both succeeded.

Codex had already built:
- `InstitutionComparison.tsx`: a 2–4 country comparison, with the URL parameter `institution_countries`.
- `institutionProfiles.ts`: chamber names for ten countries, and rules for four (PL, HU, DE, RS).

This iteration fills that existing contract. It does not rebuild it.

## 2. Data structures created or extended

**New registry: `src/lib/institutions/`**
- Ten country records (`countries/<slug>.json`, schema `institutional-country-v1`).
- `meta.json`: 16 comparison fields, value-code labels, status labels and chamber-role labels.
- `election_links.json`: generated.

**New files**
- `src/lib/institutionalRegistry.ts`: the typed API.
- `scripts/institutions/build-institutions.mjs`: validator and generator, with a `--check` mode.

**Extended**
- `src/lib/institutionProfiles.ts`: same exports, now derived from the registry.
- `src/components/InstitutionComparison.tsx`: minimal edits. It now shows the government system, offices, official sources and pending items from the registry.

**Placement**
- The registry sits in `src/lib`, not `src/data`. This follows the existing route for presentation evidence, such as `electionInformationEvidence.json`.
- It is registered as an exact-hash UI/governance amendment, `ten-country-political-institutions-2026-11-16`, with all five false flags.
- The election stores, economic data and public research files are unchanged; a test asserts this against `46dca48`.

## 3. Countries completed

| Status | Countries |
|---|---|
| Complete baseline | Poland, Hungary, Czechia, Slovakia, Germany, Slovenia, Serbia, Austria |
| Partial baseline | Romania (electoral law not read), Croatia (electoral act not read) |

Every country has all 16 comparison fields.

## 4. Fields by country

Counts are verified / pending / not applicable.

| Country | Fields | Chambers | Offices | Changes | Sources |
|---|---|---|---|---|---|
| PL | 16 / 0 / 0 | 2 | 2 | 1 | 3 |
| HU | 15 / 0 / 1 | 1 | 2 | 3 | 4 |
| CZ | 16 / 0 / 0 | 2 | 2 | 3 | 4 |
| SK | 15 / 0 / 1 | 1 | 2 | 3 | 4 |
| DE | 16 / 0 / 0 | 2 | 2 | 3 | 3 |
| RO | 15 / 1 / 0 | 2 | 2 | 2 | 5 |
| SI | 16 / 0 / 0 | 2 | 2 | 3 | 1 |
| RS | 15 / 0 / 1 | 1 | 2 | 2 | 2 |
| AT | 15 / 0 / 1 | 2 | 2 | 1 | 15 |
| HR | 14 / 1 / 1 | 1 | 2 | 3 | 4 |

## 5. Official sources added

There are 45 source records, all primary legal or parliamentary texts:

| Country | Sources |
|---|---|
| PL | Constitution (Sejm Chancellery unified text via eli.gov.pl); Electoral Code, Dz.U. 2022 poz. 1277 |
| HU | Fundamental Law, Hungarian consolidated text and English translation (njt.hu); sixteenth and seventeenth amendments |
| DE | Basic Law (German and English) and the Federal Electoral Act (gesetze-im-internet.de) |
| CZ | Constitution, three versions, and Act 247/1995 (e-Sbírka) |
| SK | Constitution, versions of 2025 and 1998, and constitutional acts 9/1999 and 24/2023 (Slov-Lex) |
| RS | Consolidated Constitution (Pravno-informacioni sistem) and the English text (parlament.gov.rs) |
| RO | Constitution in English and Romanian, and Law 429/2003 (cdep.ro) |
| SI | Constitution, consolidated text no. 12 (PISRS) |
| AT | 12 B-VG articles and 3 National Council Electoral Act sections (RIS) |
| HR | Consolidated Constitution NN 85/2010; Sabor institutional pages (counts only, no names) |

**Host registration.** With owner approval ("Register all"), seven hosts were registered as manual-only in `network_acquisition_registry.json`:
- gesetze-im-internet.de
- ris.bka.gv.at
- cdep.ro
- pisrs.si
- sabor.hr
- narodne-novine.nn.hr
- psp.cz (contacted, nothing used)

Robots.txt was checked first. RIS `/GeltendeFassung/` was avoided, and RIS's crawl-delay of 2 s was respected.

Three hosts were recorded as blocked and not read:
- **www.sejm.gov.pl:** robots.txt is `Disallow: /`.
- **www.dz-rs.si:** returns 403.
- **legislatie.just.ro:** unreachable.

Five existing entries record the extra readings: eli.gov.pl, njt.hu, e-sbirka.gov.cz, parlament.gov.rs and pravno-informacioni-sistem.rs. Raw files stay in scratch storage; only retrieval hashes are stored.

## 6. Confirmed institutional errors corrected

1. **Poland.** The generic "Chamber of Deputies and Senate" label is corrected in the underlying data. The chambers are now **Sejm** (official name `Sejm Rzeczypospolitej Polskiej`) and **Senate** (`Senat`). The Chinese name is 众议院（Sejm）. A test fails if any country other than CZ and RO uses "Chamber of Deputies". The live English page already showed "Sejm and Senate" through Codex's presentation string. `data.ts` still holds `parliamentZh` 两院制：众议院与参议院, but that file is frozen and the field is not displayed, so the handoff marks it as never to display.
2. **Germany.** The Bundesrat is presented as an ordinary second chamber, but it is a federal organ of the Länder, appointed by the Land governments (Arts. 50–51). It now has role `federal_council`.
3. **Austria and Germany.** The head of state was labelled "President"; it is now "Federal President".
4. **Slovenia.** The Državni svet was listed as a second chamber like any other. It is a 40-member interest council with a suspensive veto (Arts. 91, 96–98).
5. **Hungary.** The description was outdated. Codex's source was the English text of April 2025, before two 2026 amendments:
   - Sixteenth amendment, in force 2026-06-20: an eight-year cap on serving as Prime Minister.
   - Seventeenth amendment, in force 2026-07-19: the incumbent President's mandate ended, and the order is declared transitional until a new Constitution.
6. **Czechia and Slovakia.** Direct presidential election is now dated rather than treated as permanent. It applies from 2012-10-01 in Czechia (71/2012 Sb.) and from 1999-01-27 in Slovakia (9/1999 Z. z.); before those dates parliament elected the President.
7. **Slovakia.** The term-shortening resolution, which needs three fifths of deputies (24/2023), was missing and is now recorded.
8. **Slovakia.** The Chinese label mixed in English: 国民议会（National Council） becomes 国民议会（Národná rada）.
9. **Sources.** For eight countries, institutional sources were EU overview pages. They are replaced by official legal texts.
10. **Romania and Austria.** The "Semi-presidential" and "Federal parliamentary" labels are kept, with a note that they are descriptive typology and not constitutional terms.

## 7. Detailed case studies

Poland, Hungary, Germany and Serbia each have seven bilingual sections:
- A: structure
- B: formation
- C: accountability
- D: electoral mechanics
- E: constitutional limits
- F: historical changes
- G: constitutional rules versus election-specific practice

Each section cites article-level sources.

## 8. Historical institutional changes recorded

24 change records. Adoption, promulgation and effect are kept apart, and an undated change is never placed on the timeline.

**Verified (13)**

| Country | Changes |
|---|---|
| PL | Constitution of 1997 (in force 1997-10-17) |
| HU | Fundamental Law (2012-01-01); sixteenth and seventeenth amendments of 2026 |
| DE | Basic Law (1949); 2023 electoral reform (in force 2023-06-14); Constitutional Court ruling of 30 July 2024 (interim three-constituency rule) |
| CZ | Constitution of 1993; direct presidential election (2012) |
| SK | Constitution of 1992; direct presidential election (1999); term shortening (2023) |
| RS | Constitution of 2006 |

**Partly verified (11)**, with notes on what was not read:

| Country | Changes |
|---|---|
| CZ | 2021 electoral rules (placed between the 2017 and 2021 elections) |
| RS | 2022 amendments I–XXIX |
| RO | 1991 Constitution; 2003 revision |
| SI | 1991 Constitution; Art. 80 (2000); referendum reform (2013) |
| HR | 1990, 2000 and 2001 changes |
| AT | Five-year term (valid from 2008-10-28) |

## 9. Elections linked to institutional periods

All 21 admitted elections are linked: DE 7, PL 4, RS 4, CZ 3, HU 2, SK 1.

Each link holds:
- chamber
- seats, from the legislature record
- the election's own rule record: system, allocation method and thresholds. Current law is never applied backwards; for example, Czechia 2017 keeps 5/10/15/20.
- the institutional period
- changes in force, later changes and undated changes

For example:
- Hungary 2026 falls before both 2026 amendments.
- Germany 2025 falls under the 2023 reform and the 2024 ruling.

Vote and seat totals are unchanged.

## 10. Bilingual content

All texts are `{en, zh}`: overviews, labels, details, formation steps, notes, change records, case studies and pending reasons. A test requires every multi-digit figure to match across the two languages. Chinese chamber names keep the original designation in parentheses and contain no English words.

Statistical definitions are no longer in Chinese on any of the ten English hubs (static build, plus production with all details expanded). Two event titles remain in Chinese and are labelled as original titles. Suggested English titles are in handoff section K.

## 11. Files changed

**New**
- `src/lib/institutions/{meta,election_links}.json`
- `src/lib/institutions/countries/*.json` (10)
- `src/lib/institutionalRegistry.ts`
- `scripts/institutions/build-institutions.mjs`
- `tests/tooling/institutions-registry.test.mjs`
- `docs/institutional-data-handoff-2026-11-16.md`
- this report

**Modified**
- `src/lib/institutionProfiles.ts`
- `src/components/InstitutionComparison.tsx`
- `tests/ui/institution-comparison.spec.ts`
- `tests/tooling/ui-amendment.test.mjs` (approved paths 181 → 194)
- `docs/legal-security/network_acquisition_registry.json`
- `docs/legal-security/ui_governance_amendments.json`
- `docs/data-coverage/historical_coverage_matrix_2026-11-16.json` (recorded input hash of the network registry only)
- `docs/institutional-evidence-handoff.md` (superseded note)
- `CHANGELOG.md`

## 12. Tests performed

| Check | Result |
|---|---|
| `node scripts/institutions/build-institutions.mjs --check` | pass |
| `tests/tooling/institutions-registry.test.mjs` | 9/9 |
| Full tooling suite | 478 pass, 0 fail, 1 skip (the dated closure snapshot, which was already skipping) |
| Source-closure checkpoint | pass (848 frozen files; Germany unchanged) |
| `legal-security:validate` | 0 failures |
| `i18n:validate` | 1,607 checks, 0 failures |
| `tsc --noEmit` | clean |
| `build:site` | pass |
| Full Playwright UI suite (darwin) | 748 passed, 2 skipped; no screenshot baseline changed |

The registry tests cover: schema, stable IDs, duplicates, chamber naming, dates, source hosts, bilingual figures, election links, and preservation of the stores.

## 13. Commit

Implementation commit `be8268a362ce5194d768a6bd1d29d81c56e59a17` (branch `data/historical-coverage-2026-11-16`), pushed to `main` on 2026-11-16 after the owner's approval ("推送上线").

## 14. GitHub Actions and deployment

- Deploy GitHub Pages run 43847109234: build and deploy jobs succeeded.
- Live `research-data/deployment_provenance.json`: `source_commit` `be8268a362ce5194d768a6bd1d29d81c56e59a17`, `workflow_run_id` 43847109234.
- Live `research-data/research-data-v2.0.zip` sha256 `7208a7ca331bb66e0f3d50bdf5fc88da21ebe6eb5bf86b14e34b518b773a135e`, equal to the provenance record.
- Production acceptance (`playwright.production-acceptance.config.ts`): 6 of 6 passed.
- Code scanning: 0 open alerts. Dependabot: only the known minimatch alert (waiting for upstream).
- Live `/en/politics/`: "Chamber of Deputies" appears only in Czech Statistical Office source titles.

## 15. Remaining data gaps

See handoff section L. The main ones:
- **Romania:** the consolidated text of Law 208/2015 (the electoral system is partly verified from the 2015 text and the act record); the Chamber of Deputies' sitting total; dates of the 2003 revision.
- **Croatia:** exact dates of the 1990, 2000 and 2001 constitutional acts; the NN 5/2014 change.
- **Slovenia:** electoral act detail.
- **Austria:** current Bundesrat total.
- **All countries:** constitutional history before the current constitutions, and per-article version dates.

## 16. Codex integration instructions

See `docs/institutional-data-handoff-2026-11-16.md`, sections A–L. The steps:
1. Replace the five-row profile with a `compareInstitutions()` table.
2. Add the hub sections listed in H.
3. Build the timeline in J from `institutionalTimeline`, `institutionalPeriods` and `countryElectionLinks`.
4. Keep `qualified` and `pending` visible.
5. Add the two event-title translations in K after owner review.

## 17. Recommended next milestone

Close the electoral-law gaps for the four countries without admitted elections (RO Law 208/2015, HR electoral act, SI National Assembly Elections Act, AT NRWO detail). Then add verified pre-current constitutional stages, starting with Poland 1989–1997 and Hungary 1989–2011, so the timeline reaches back to 1989/90. Both need official texts on hosts already registered, or one more owner approval for legislatie.just.ro alternatives.

## Follow-up (2026-11-16): Romania and Croatia electoral laws

The owner asked to close the two electoral-law gaps. Both baselines are now complete: no comparison field is pending.

**Croatia** (`electoral_system` verified). Read on narodne-novine.nn.hr:
- the consolidated Election Act, NN 66/2015;
- Constitutional Court decision U-I-1397/2015 (NN 104/2015), which struck candidacy-signature and gender-list sanctions, not seat-allocation rules;
- the 2019 amendment, NN 98/2019, which concerns incompatibilities only;
- the Constituencies Act, NN 114/2023;
- Constitutional Court decision U-I-4116/2023 (NN 20/2024), which lists the Election Act's amendments ending at NN 98/19 and records the Constituencies Act's entry into force on 3 November 2023.

Recorded rules:
- ten territorial constituencies of 14 seats, allocated by D'Hondt;
- a 5% threshold per constituency;
- a preferential vote counted from 10% of the list's votes;
- 3 diaspora seats;
- 8 national-minority seats elected by plurality.

Two changes were added:
- the 2015 preferential vote (effective 25 February 2015, partly verified);
- the 2023 Constituencies Act (adopted 28 September, promulgated 3 October, effective 3 November 2023, verified).

**Romania** (`electoral_system` partly verified). roaep.ro was registered on the owner's approval, but it answered even robots.txt with a Google reCAPTCHA challenge, so it is recorded as blocked and was not retried. On the owner's second answer, two documents were read on www.cdep.ro:
- the Chamber of Deputies' record for Law 208/2015, including its amending acts;
- the text sent for promulgation (PL-x 445/2015).

Recorded rules:
- 43 constituencies;
- Annex 1 fixes 312 deputies and 136 senators;
- representation norms of 73,000 and 168,000 inhabitants;
- a 5% threshold, or 20% in four constituencies; alliances 5% plus 3% plus 1% per further member, up to 10%;
- allocation by constituency quotient, then national highest quotients;
- minority-organisation seats at 5% of the average votes per deputy.

The act record lists no later amendment to these articles or to Annex 1, except Emergency Ordinance 26/2020, which the Constitutional Court found unconstitutional (Decision 150/2020). The consolidated text was not read, so the field stays partly verified. The Senate's 136 seats are now recorded. The Chamber of Deputies' total varies with the minority seats and stays pending as a sitting number.

**Governance**
- Network registry: roaep.ro added as blocked; www.cdep.ro's purpose extended to Law 208/2015.
- Coverage matrix: regenerated; only its registry input hash changed.
- New exact-hash amendment `romania-croatia-electoral-law-2026-11-16` for the two country records and `election_links.json`.

**Tests**
- Tooling: 478 pass, 1 skip (the existing one).
- Checkpoint, legal-security, i18n, type check and site build: pass.
- UI suite: 748 pass, 2 skipped; no screenshot baselines changed.
