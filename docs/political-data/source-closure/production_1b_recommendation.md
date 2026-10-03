# Production 1B — blocked owner-review checkpoint

Platform: v2.0, unchanged. This checkpoint is **not a completed source-closure audit** and approves no ingestion or deployment. Four countries and all 28 requested elections are registered. Seven actual small Slovak national-result CSVs and official country/year directories were acquired. No other-country production store exists.

## Licence decisions

| Country | Decision | Exact blocker |
|---|---|---|
| Czechia | written_confirmation_required | Election download pages link CZSO terms, but the operative text explicitly names csu.gov.cz. A link is retained as evidence, not treated as proof of extension to every volby.gov.cz file. |
| Slovakia | written_confirmation_required | Publisher principles state CC BY 4.0, exclude third-party rights, and prohibit robots/spiders and similar downloading tools. Automated collection has stopped. Exact election-file applicability and a permitted acquisition route require confirmation. |
| Poland | written_confirmation_required | KBW legal-information page provides no operative dataset licence. A different ministry's public-information terms cannot close this gate. |
| Austria | written_confirmation_required | BMI permits attributed reuse of contributions except commercial use. Application to the actual result workbooks, factual extracts and unrestricted redistribution remains unresolved. |

Original pages/files are local-only, excluded from Git. Public accessibility is not a redistribution licence. Retrieval timestamps and SHA-256 are recorded. No authority has been contacted on the owner's behalf.

## Coverage and formats

- Czechia, seven elections: exact year-specific official directories retrieved. Older directories link retrospective XML/CSVW/Excel packages; recent elections also link national XML. 2017 expressly separates original and court-recalculated vintages. Actual packages and national totals are not yet certified by this checkpoint.
- Slovakia, seven elections: actual small national-vote CSVs retrieved. 2002 uses Windows-1250 and semicolons; later files use UTF-8 and commas. 2006/2010/2012 lack explicit subject-code columns. 2016 seats use `nan`; 2020/2023 missing seats are empty. Missing seats have not been converted to zero. Turnout and national-denominator reconciliation remain pending.
- Poland, seven elections: KBW archive indices retrieved. 2011 links XLS; 2019/2023 link district CSV/XLSX. Some older landing pages require further navigation. Unlocated national vote files remain null rather than fabricated. The official archive confirms the 2007 date as 21 October, not ParlGov's historical 19 October.
- Austria, seven elections: official directories retrieved with 2002 ZIP, 2006 XLS, 2008 zipped Excel, and later XLSX links. The actual contents are not inspected. Some linked mandate tables say provisional; final-seat status needs document-level verification.

## Identity and electoral definitions

All 28 rows remain `identity_evidence_incomplete`. This means same-election documentary evidence is unfinished, not that unresolved longitudinal identity must block a future contestant-only table.

ČSÚ's CVS definition covers parties, movements, coalitions and associations. VSTRANA therefore identifies electoral contestants, not exclusively registered legal parties. CNS.NSTRANA, CPP.PSTRANA, CVS.VSTRANA and ballot numbers must not be conflated. Historical ČSSD/SOCDEM and the similarly named 2025 contestant remain separate pending legal registry evidence. Coalition votes stay attached to joint lists.

Slovak subject numbers remain election-local. Polish committees remain committees, not automatically parties. BMI expressly notes that a ballot group need not be a party under the Parteiengesetz. National denominators and final mandates cannot be inferred by adding every geographical row.

Dated threshold, allocation, district/tier, coalition and minority-exemption evidence remains unclosed for every election. No current electoral rule has been backfilled onto older elections. The Slovakia 2016 date conflict still needs a specifically archived Tier-1 date document. *(Superseded 2026-10-03: verified from Zbierka zákonov 307/2015 Z. z.; see update below.)* Czechia's 2017 corrected/original result-vintage decision must be explicit before future production.

## Readiness and proposed slice

All four countries: `BLOCKED_BY_MULTIPLE_GATES` (licence plus unfinished file/definition/identity evidence). Approved future Production 1B election list: empty. Expected new election/turnout/result/contestant records: **not estimated** before actual-file inspection. Current canonical additions: **zero**.

The smallest next action is owner review of the four exact-file licence questions. If the owner wishes to obtain written clarification, authorize contacting the publishers separately. Do not interpret approval of this audit checkpoint as ingestion approval. Manual permitted acquisition, file inspection and documentary review can resume after the conditions are clarified.

## Integrity checks

The baseline pins every existing canonical data file, public research export, app/component/library file and dependency lock. The only package change is the requested audit validation command. Germany reproduction and exports pass; seven existing numeric/production tests pass. All 12 German stores and 26 public exports must remain byte-identical.

`pnpm political-source-closure:validate --checkpoint` checks checkpoint integrity. The default command deliberately fails while closure gates remain open. A successful checkpoint check must never be reported as licence closure, completed audit or production readiness.

No UI, country option, economic/model/Event Library, version, push or deployment changes are authorized or performed. Spreadsheet skill was used for read-only source/schema inspection and missing-versus-zero handling; no workbook was edited or exported.

## Update 2026-10-03 — publisher clarification and non-licence closure

Still **blocked**; no ingestion, UI, version, push or contact. New files: `gates.mjs` (single gate model), `gate_matrix.json`,
`publisher_response_decision_matrix.json`, `documentary_review.json` (+ `documentary-review.mjs`), `contact-packets/`
(four unsent packets), `production_1b_conditional_plans.md`.

- **Gate model:** reuse, normalized republication, raw redistribution, automated acquisition, manual acquisition,
  attribution and transformation disclosure are separate gates; readiness is derived (`NOT_READY` for all four).
- **Slovakia:** CC BY 4.0 is documented on the publisher's terms page (scope text: “through the website
  www.statistics.sk”) and API help; the official election dataset list names all seven files. Reuse, normalized and raw
  gates stay open only for the domain/product-scope confirmation; automated collection is **blocked** by the terms'
  robots/spiders clause; manual download pending confirmation. 2016 date verified: Zbierka zákonov 307/2015 Z. z.
  (5 March 2016). Seven-file matrix: 2002 has no seat column (0/1 threshold flag); seats are explicit 0 (2006–2012),
  `nan` (2016) or empty (2020/2023), kept distinct.
- **Austria:** bmi.gv.at robots.txt disallows AI agents (Anthropic-ai, Claude-Web, ChatGPT-User); automated acquisition
  **blocked**, agent requests stopped; production would be owner-manual only. Final vs provisional seat documents
  classified per election.
- **Poland:** the DANE WYBORCZE legal page has no content. Archive navigation completed: district-level list results for
  2001, 2005, 2015, 2019, 2023; powiat level only for 2007, 2011; committee/list registries located; no national-total
  file (PKW announcement to locate).
- **Czechia:** CZSO terms name csu.gov.cz; transformation disclosure wording documented. Package inventory for all
  seven elections; 2017 original (20171021) vs recalculated (20171122, NSS Vol 58/2017-173); **2021 has two register
  vintages** (20211010, 20211111) with NSS Vol 102/2021; CVS/TYPVS/CVS_SLOZENI semantics documented; VSTRANA is described
  inconsistently (contestant code vs ballot number) — to clarify.
