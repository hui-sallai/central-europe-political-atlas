# News batch 2026-10-19 → 2026-11-11: consolidated report

Central Europe Political Atlas v2.0. No rebranding, no version change and no UI redesign. Election-result datasets are unchanged, no models were re-estimated, and no record enters a model.

## 1. Coverage window

2026-10-19 to 2026-11-11 inclusive, by source publication date.

- The 16 items for 19–23 October were verified on 2026-10-22/23 in the staged batch `news-candidate-2026-10-23`, which this batch supersedes.
- All other items were retrieved and checked on 2026-11-11.

## 2. Previous event count

Before the batch, the public library (`public/research-data/events.json`) held 461 verified events and 471 records in total. The latest published batch ended on 2026-10-18.

## 3. New distinct events

**108 accepted.** Each was retrieved individually and its headline, publication date and body checked. A further 94 candidates were screened and rejected, each with a recorded reason.

After the batch the library holds 569 verified events (579 records), and the latest event date is 2026-11-11.

## 4. New events per country

| Country | Accepted | Target 10 |
|---|---:|---|
| Hungary | 13 | met |
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

Hungary (13), Poland (13), Czechia (11), Slovakia (11) and Serbia (11).

## 6. Category distribution

By topic:

| Topic | Count |
|---|---:|
| Economy | 43 |
| Regional | 19 |
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
| energy | 15 |
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

**Established outlets (86 items):**
- Telex, Notes from Poland and Radio Prague International
- TASR and Radio Slovakia International
- ZDFheute, ORF, trend. and news.at
- Radio Romania International
- N1

**Figures cited through these sources:** Eurostat, KSH, the Czech Statistical Office, RZS, Croatia's statistics office (DZS), the Romanian Finance Ministry, WIFO, Statistics Austria, the national election commissions and central banks.

## 9. Duplicate and excluded candidates

94 candidates were rejected; 19 of them are linked to the canonical record they duplicate or continue. The main reasons:
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

Pending owner approval (the gate registration): `docs/political-data/source-closure/news-refresh-amendments.mjs`, `docs/legal-security/news_refresh_amendments.json` and `docs/news-updates/2026-11-11-owner-authorization.json`.

## 12. Tests executed

Passing:
- `news:validate --week 2026-11-11`: 108 accepted, 94 rejected, 10 countries.
- The research export completed, including the analysis registry and deep-link validation (202 checks).
- `event-presentation`: 3/3.
- The new 2026-11-11 batch tooling test.

Failing until the gate is registered: four news-governance tests and the source-closure checkpoint. They check the exact-hash approvals of the re-pinned news files. Build and UI results: see the commit.

## 13. Deployment

Not yet deployed. This needs the gate registration and then the owner's separate "推送上线".

## 14. Final live event count

Expected after deployment: 569 verified events (579 records). Not yet verified in production.

## 15. Remaining limitations

**Austria (9 items):**
- ORF listings carry no dates.
- The council-of-ministers pages list agenda items without showing adoption, and the decision-protocol link returned 404.
- Remaining candidates were statements or continued reporting.
- No replacement entries were created.

**Unverified official decisions:** the NBP (Poland) and MNB (Hungary) rate decisions in the window could not be retrieved from a primary or established page, so they are not included.

**Source mix:** most items come from established outlets rather than primary documents. Their figures are attributed to those outlets.
