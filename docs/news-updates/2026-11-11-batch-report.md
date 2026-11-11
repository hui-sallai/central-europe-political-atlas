# News batch 2026-10-19 → 2026-11-11: consolidated report

Central Europe Political Atlas v2.0. No rebranding, no version change and no UI redesign. Election-result datasets are unchanged, no models were re-estimated, and no record enters a model.

## 1. Coverage window

2026-10-19 to 2026-11-11 inclusive, by source publication date.

- The 16 items for 19–23 October were verified on 2026-10-22/23 in the staged batch `news-candidate-2026-10-23`, which this batch supersedes.
- All other items were retrieved and checked on 2026-11-11.

## 2. Previous event count

Before the batch, the public library (`public/research-data/events.json`) held 461 verified events and 471 records in total. The latest published batch ended on 2026-10-18.

## 3. New distinct events

**107 accepted.** Each was retrieved individually and its headline, publication date and body checked. A further 95 candidates were screened and rejected, each with a recorded reason.

After the batch the library holds 568 verified events (578 records), and the latest event date is 2026-11-11.

## 4. New events per country

| Country | Accepted | Target 10 |
|---|---:|---|
| Hungary | 12 | met |
| Poland | 13 | met |
| Czechia | 11 | met |
| Slovakia | 11 | met |
| Serbia | 11 | met |
| Germany | 10 | met |
| Romania | 10 | met |
| Slovenia | 10 | met |
| Croatia | 10 | met |
| Austria | **9** | **shortfall of 1** (see §15) |

## 5. Countries above 10

Poland (13), Hungary (12), Czechia (11), Slovakia (11) and Serbia (11).

## 6. Category distribution

By topic:

| Topic | Count |
|---|---:|
| Economy | 43 |
| Regional | 18 |
| Politics | 18 |
| Energy | 14 |
| EU | 11 |
| China-related trade | 3 |

By event type:

| Event type | Count |
|---|---:|
| fiscal | 21 |
| regional | 21 |
| macro | 19 |
| election | 16 |
| energy | 14 |
| EU_funds | 5 |
| industrial_policy | 5 |
| FDI | 3 |
| China | 3 |

## 7. Ten consequential developments (descriptive, unranked)

- **Serbia:** the snap parliamentary election of 25 October. The Election Commission's final results (5 November) give the Student List 140 of 250 seats; the new parliament is called for 17 November.
- **Poland:** the standoff at the Constitutional Tribunal (30 October). Separately, S&P revised Poland's outlook to negative and lowered the local-currency rating (7 November).
- **Czechia:** the Czech National Bank raised its key rate to 4% and cut its growth forecasts (5 November).
- **Hungary:** the 2027 budget bill was submitted to parliament (30–31 October), with a deficit of 4.9% of GDP and debt of 77.2% of GDP.
- **Germany:** Q3 GDP rose 0.2% q/q, October inflation was 2.8% (provisional) and registered unemployment fell to 2.955 million (all 30 October).
- **Slovakia:** in the 24 October regional elections, all eight incumbent governors were re-elected. Later, the opposition said the coalition had lost its majority after an MP switched party.
- **Austria:** the coalition agreed the social assistance reform (22 October). The parliamentary budget office projects a 2026 deficit of 4.1% of GDP.
- **Romania:** the nine-month budget deficit fell to 3.81% of GDP (Finance Ministry). The European Commission announced €50 million for a Black Sea maritime security hub.
- **Croatia:** the 2027 gross minimum wage was set at €1,130 (29 October), and household heating subsidies were extended to March 2027.
- **Regional and EU:** Slovakia and Czechia rejected Germany's EU-budget conditionality on Ukraine funding (10 November). The first Czech-Hungarian joint government meeting signed a transport memorandum (30 October).

## 8. Source institutions used

**Official publishers (22 items):**
- Croatian government (vlada.gov.hr)
- Slovenian government (GOV.SI)
- Statistical Office of Slovenia (SURS)
- Germany's Federal Statistical Office (Destatis) and Federal Employment Agency
- Austrian Parliament's budget office (Budgetdienst)

**Established outlets (85 items):**
- Telex, Notes from Poland and Radio Prague International
- TASR and Radio Slovakia International
- ZDFheute, ORF, trend. and news.at
- Radio Romania International
- N1

**Figures cited through these sources:** Eurostat, KSH, the Czech Statistical Office, RZS, Croatia's statistics office (DZS), the Romanian Finance Ministry, WIFO, Statistics Austria, the national election commissions and central banks.

## 9. Duplicate and excluded candidates

95 candidates were rejected; 19 of them are linked to the canonical record they duplicate or continue. The main reasons:
- allegations or criminal cases concerning individuals (the person-safety rule);
- continued reporting of an event already recorded;
- statements, plans or visits without a datable decision;
- opinion polls;
- subnational matters;
- agenda pages that do not show adoption;
- think-tank or interview figures where an official release would be needed.

One event affecting several countries is recorded once:
- the JANAF pipeline suspension is under Serbia;
- the Czech-Hungarian and Slovak-Czech government meetings are under Hungary and Slovakia;
- the Slovenia-Austria-Croatia foreign ministers' meeting is under Slovenia;
- Gigatron's sale to Slovenia's Big Bang group is under Slovenia.

The full list is in `src/data/events/news_candidate_screening_2026-11-11.json`.

## 10. Bilingual verification

Every record has:
- a Chinese headline and a two-paragraph summary (facts, then status and boundary);
- an English title and summary with the same content and no Chinese characters;
- source label, URL, publication date, date evidence, page type and the source's original-language title.

Proposed, announced, adopted, signed, pending and preliminary statuses are stated explicitly, and forecasts are labelled as forecasts.

One Radio Romania International page contained text aimed at automated readers. It was ignored, and only the article's facts were used.

## 11. Changed files

New files:
- `src/lib/weeklyNews/2026-11-11.ts`
- `src/data/events/news_{update_2026-11-11_audit,source_verification_2026-11-11,candidate_screening_2026-11-11}.json`
- the four corresponding `public/research-data` files (audit, source verification, candidate screening, translations)
- this report

Modified files:
- `src/lib/newsData.ts`, `src/lib/researchData.ts`, `src/lib/newsTranslations.ts`, `src/lib/newsLibraryMetadata.ts`
- `public/research-data/events.{json,csv}` and `analysis_validation_index.json`
- `scripts/export-research-data.mjs`, `scripts/release/build-research-package.mjs`
- tests: `news-refresh`, `event-presentation`, `home-event-language`, `home-research-discovery`, `news-bilingual`

Governance (owner approval "批准登记新闻批次门禁并修正闭合快照检查", 2026-11-11):
- `docs/political-data/source-closure/news-refresh-amendments.mjs` and `docs/legal-security/news_refresh_amendments.json`: batch `news-refresh-2026-11-11` registered at exact hashes, including the homepage metadata module.
- `docs/news-updates/2026-11-11-owner-authorization.json`: the authorization record.
- `scripts/data-coverage/coverage-closure.mjs`: the 2026-11-10 closure snapshot's model-isolation check is evaluated at its data commit `a8d10a6`.
- `tests/tooling/news-refresh.test.mjs`: later pins (data run, political admission) now win only when they are newer than the latest news batch.

## 12. Tests executed

- `news:validate --week 2026-11-11`: 107 accepted, 95 rejected, 10 countries.
- Research export: pass (analysis registry and deep-link validation, 202 checks).
- Source-closure `--checkpoint`, `legal-security:validate` (0 failures), coverage closure `--check`, public-secret scan: pass.
- Tooling suite: 436/436.
- Production build: pass.
- UI: 682 passed, 2 skipped (full suite). The darwin desktop news baseline was reviewed and updated; the Linux news baseline is recorded after the push through the deploy workflow's record mode, as for the previous batch.

## 13. Deployment

The owner approved both pushes ("推送上线").

- `34f4f42`: the deploy run 43025156258 failed only on the Linux desktop news screenshot, because that baseline is recorded on the runner, so nothing was deployed.
- The deploy workflow's record mode (run 43075598339, which never deploys) recorded the Linux baselines on `34f4f42`. Its first runs failed: two unrelated tests were flaky, and later the runner could not resolve the Ubuntu package mirrors. The workflow was not changed.
- Only the desktop news baseline differed. It was reviewed and committed as `5c1be3d`, together with a re-recorded darwin news baseline. The previous darwin image showed 569, from before the Hungary–Rubio item was removed.
- `5c1be3d` was deployed by run 43107041486 (build and deploy successful). The live `deployment_provenance.json` reports source commit `5c1be3d` and that run.

## 14. Final live event count

Verified in production on 2026-11-12:

- `events.json` holds 578 records: 568 verified and 10 structural samples. The latest event date is 2026-11-11.
- 107 records fall in the window 2026-10-19 to 2026-11-11: HU 12, PL 13, CZ 11, SK 11, RS 11, DE 10, RO 10, SI 10, HR 10, AT 9.
- The Chinese homepage shows "新闻批次截至 2026-11-11" and the English homepage "News batch through: 2026-11-11". `/news/` and `/en/news/` return 200, and the English page shows the English titles.
- `news_translations_2026-11-11.json` holds 107 records, and `events.csv` is served.
- The research package `research-data-v2.0.zip` matches its provenance SHA-256 (`f10ceddf…684f77f`).
- All 6 production acceptance tests pass. Open alerts: code scanning 0, secret scanning 0, Dependabot 1 (minimatch, as before).

## 15. Remaining limitations

**Austria (9 items):**
- ORF listings carry no dates.
- The council-of-ministers pages list agenda items without showing adoption, and the decision-protocol link returned 404.
- Remaining candidates were statements or continued reporting.
- No replacement entries were created.

**Unverified official decisions:** the NBP (Poland) and MNB (Hungary) rate decisions in the window could not be retrieved from a primary or established page, so they are not included.

**Removed after verification:** the Hungary–US (Rubio) cooperation documents of 29 October. The item was verified, but its source URL carries a political label that the political-person-safety validator does not allow in Atlas copy. It is recorded as rejected and not replaced.

**Source mix:** most items come from established outlets rather than primary documents. Their figures are attributed to those outlets.
