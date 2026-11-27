# Blocked, reference-only and unresolved cases

Each entry names the exact evidence that would change its status. Unknown or conflicting rights stay fail-closed.

## MORE EVIDENCE REQUIRED

| Case | Missing evidence | Who can supply it |
|---|---|---|
| Eurostat HICP annual, Poland 2021–2025 (`prc_hicp_aind`) | An explanation of the "Statistics Poland Data Portal" co-source in the canonical label and notes, with Statistics Poland terms if GUS is a source of the values. Otherwise, an owner-approved correction of the canonical label (a canonical data change, outside R1-C3). Values and release are otherwise verified (5/5 against the retained response of the still-current 2026-02-06 release). | Owner decision; Codex/data workflow after approval |
| BIS Hungarian policy rate (`WS_CBPOL M:HU`) | Operative BIS terms (page returned 403). A retained WS_CBPOL response for the extract (only digest `c06ed898…` is recorded). A ruling on central-bank contributor terms (Hungarian National Bank as source reference). | Owner saves the BIS terms page to `local-evidence/`; a future refresh retains the bulk file or an SDMX response |
| BIS bilateral FX (computed cross rates) | BIS terms; a derived-value notice describing the cross-rate computation; retained WS_XRU responses for every currency used | As above |
| Eurostat regional population, Hungary NUTS3 2024 (`demo_r_pjanaggr3`) | Value-by-value match against the regional raw extract; a dataset-specific source row (the export carries the generic "Eurostat regional statistics" and a Chinese storage note in `definition`). The regional view always includes map.svg, which stays quarantined. | Research follow-up |
| Other SORS monthly series (IPI `060001IND02`, PPI `030201010101IND01`, exports/imports `1702IND01/02`, earnings `2403040101IND01/02`) | Published point counts differ from the retained extract record counts (321/347, 190/225, 273/295, 332/596). The transformation from extract to runtime must be documented before a modification notice can describe it. | Research follow-up |
| SORS annual series | Original query dimensions in the export; a derived-value notice for `trade_balance_rsd` | Research follow-up |
| Amendments to Decision 2011/833/EU | The consolidated text or amending acts | EUR-Lex reading (host now approved) |
| GISCO NUTS 2024 clauses | The page that carries the operative NUTS clauses today; whether they match the administrative-units clauses | ec.europa.eu reading |

## REFERENCE ONLY

| Case | Reason |
|---|---|
| Poland–Hungary harmonized and side-by-side comparisons (`nama_10_gdp`) | R1-C1 records partial correspondence for both bar modes; national co-source wording; dataset revised 2026-11-24 after the retained response |
| Model and method references | No data bytes; VAR/IRF results remain blocked |

## BLOCKED

| Case | Reason |
|---|---|
| GISCO boundary geometry, map.svg, static map figures | Non-commercial licence; raw redistribution not cleared; rendered geometry not linked to verified inputs; the cited NUTS page carries no clauses |
| Political and election evidence as package attachments | No immutable political attachment format; CZ/SK/PL/AT source-closure restrictions and the Germany baseline stay frozen |

## Unchanged

The admitted SORS CPI (2006=100) and LFS (15–74) pins were reproduced from the production build; their terms were
re-read and their modification notices meet the requirements on the current SORS page.
