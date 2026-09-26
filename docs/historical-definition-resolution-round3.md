# Historical definition compatibility — Round 3

Research-only review, 2026-09-26. Starting formal main: `5e05e5f9ceacd5442e4d2cccd92cfe7c588d35ba`; formal release remains v1.82. No historical Panel LP estimation, bootstrap, simulation, imputation, or change to the frozen Panel result. This review concerns Eurostat's latest revised monthly histories, not real-time vintages.

The evidence registry is `src/data/historical-extension-audit/historical_definition_evidence_registry.json`. It records official URLs, retrieval times, SHA-256 checksums, claims, country-level decisions, flags and unresolved issues. The source artifacts themselves are not copied into the public repository.

| Outcome | Country | Compatible start | Decision and boundary |
|---|---|---:|---|
| IPI | PL | — | Blocked: 2000 NACE Rev.2 series exists, but the 2021 LEU-to-KAU statistical-unit change lacks an explicit B-D SCA historical bridge. |
| IPI | RO | — | Blocked: current CANE Rev.2/SCA methods documented, but no exact pre-2015 comparability floor or backcast certified. |
| Unemployment | AT | 2004-01 | Latest revised IESS-derived portion; 2004-01 remains `b`-flagged. |
| Unemployment | DE | 2009-01 | Latest revised IESS-derived portion; 2005-03 `d` is earlier and 2009-01 remains `b`-flagged. Online TREND/SA wording is noted. |
| Unemployment | SK | — | Blocked: 2011-09 `d` unexplained after 2009-01 IESS boundary. |
| Unemployment | SI | 2009-01 | Latest revised IESS-derived portion; quarterly LFS benchmark, registered counts only auxiliary; boundary `b` retained. |
| Unemployment | HU | — | Blocked: 2023 state-space revision covers 2011–2022, but 2009–2010 relation unresolved. |
| Unemployment | PL | — | Blocked: 2009-12 `d` unexplained after 2009-01 IESS boundary; registered counts only auxiliary. |
| Unemployment | RO | — | Blocked: Eurostat correction note names 2009-01, but the exact API series has no corresponding `b`; 2003-12 `d` remains. |
| Yield | AT / DE / SK / CZ / HU / PL | 1985-01 / 1980-01 / 2001-01 / 2000-04 / 2001-01 / 2001-01 | Eurostat states Maastricht criterion yield histories are comparable over time under the harmonised near-10-year secondary-market concept. Routine representative-bond replacement does not require constant ISINs. |
| Yield | SI | 2003-11 | Primary-market period ends 2003-10; later `e` quality flags retained. |
| Yield | RO | 2006-01 | Primary-market period ends 2005-12. |

The all-eight definition-compatible common starts remain HICP **1996-12**, IPI **null**, unemployment **null**, and yield **2006-01**. Consequently, the four-outcome common start and Design A candidate start remain **null** despite the fixed euro-regime floor of 2009-01. Existing 2005-04/2009/2010/2012/2015 mathematical preflights are not definition-cleared support gains. Readiness is `partial`, not `ready_for_owner_review` or active.

Key official sources: [PL IPI metadata](https://ec.europa.eu/eurostat/cache/metadata/EN/sts_ind_prod_esms_pl.htm), [RO IPI metadata](https://ec.europa.eu/eurostat/cache/metadata/EN/sts_ind_prod_esms_ro.htm), [Eurostat LFS break correction](https://ec.europa.eu/eurostat/statistics-explained/SEPDF/cache/94764.pdf), [monthly unemployment methods](https://ec.europa.eu/eurostat/cache/metadata/Annexes/une_rt_m_esms_an_Sources_and_methods_for_MUR.pdf), and [MCBY metadata](https://ec.europa.eu/eurostat/cache/metadata/en/irt_lt_mcby_esms.htm). The registry identifies the exact source checksums and limitations.

Owner options, not actions in this round: retain the four-outcome 2015 baseline; preregister a separate reduced-outcome historical study; or seek additional official harmonised source/bridge documentation. No outcome is silently dropped, no threshold is relaxed, and no publication is authorised by this audit.
