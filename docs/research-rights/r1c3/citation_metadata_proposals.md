# Bibliographic metadata improvement proposals

These proposals keep the accepted R1-B citation semantics: a retrieval date never stands in for a publication date, an
update date is revision metadata, and missing fields stay open. The v1 source schema has no field for DOI, issuing
body role, document type, edition or release timestamp, so every item below needs the separate versioned-field
proposal described in `docs/r1b-report-citations.md`. Nothing here is implemented.

## Fields that evidence now supports

| Dataset | Field | Value | Meaning and evidence |
|---|---|---|---|
| prc_hicp_aind | DOI | 10.2908/PRC_HICP_AIND | Dataset identifier from the SDMX dataflow annotation `DISSEMINATION_DOI_XML` (evidence `r1c3-df_prc_hicp_aind`) |
| prc_hicp_aind | DOI issue date | 2023-01-23 | Date the DOI was issued; not the dataset's first publication and not a data-release date |
| prc_hicp_aind | Created | 2015-11-16T10:20:47+01:00 | Dataset creation (`CREATED`) |
| prc_hicp_aind | Data release | 2026-02-06T23:00:00+01:00 | Last data update (`UPDATE_DATA`); the retained Atlas response is of this release |
| prc_hicp_aind | Official title | HICP - annual data (average index and rate of change) (1996-2025) | Dataflow name (en) |
| prc_hicp_minr | DOI / issued / created | 10.2908/PRC_HICP_MINR / 2026-01-27 / 2026-01-27T09:31:20+01:00 | As above |
| prc_hicp_minr | Data release at review | 2026-11-18T11:00:00+01:00 | Revision metadata; later than the retained 2026-09-17 release |
| prc_hicp_minr | Official title | Harmonised index of consumer prices (HICP) - ECOICOP ver.2 - indices and rates of change, monthly data | Dataflow name (en) |
| nama_10_gdp | DOI / issued / created | 10.2908/NAMA_10_GDP / 2023-01-19 / 2014-09-04T14:58:03+02:00 | As above |
| nama_10_gdp | Data release at review | 2026-11-24T23:00:00+01:00 | Later than the retained 2026-09-29 response |
| all three | Responsible institution, role | Eurostat (ESTAT), creator per the DOI record; SOURCE_INSTITUTIONS: Eurostat | Distinct from the national co-source wording in Atlas labels |
| all three | Bibliographic type | dataset (`DISSEMINATION_OBJECT_TYPE = DATASET`) | Supports CSL `dataset` instead of `document` once a typed field exists |
| SORS datasets | Release identifier | none published; `dataset_updated_at` null | Keep open; the response digest and retrieval time identify the bytes, not a release |

## Citation forms required by the publishers

- Eurostat datasets: "Source: [DOI of the Eurostat dataset], [access date]"; customised versions: "Source: [Eurostat
  dataset datacode link], [access date]" (copyright notice, evidence `r1c3-copyright-notice`).
- SORS: "Source: Statistical Office of the Republic of Serbia (SORS)"; modified data also need "Calculated / Modified
  by" and a "Note on modification" (evidence `r1c3-sors-terms`).

## Proposed changes (each needs separate authorization)

1. Add an optional, versioned `doi` and `release_timestamp` to the source record schema. Populate them only from a
   dataflow annotation read for the exact dataset code. Keep `updated_at` as revision metadata.
2. For snapshots, the high-frequency producer could emit the record's `updated_at` (today blank in `sources.csv`) and
   the API query instead of the Data Browser view URL. This changes export bytes and would void the proposed Hungary
   HICP pin, so it should be decided before that pin is accepted, not after.
3. Separate the national co-source wording ("/ Statistics Poland Data Portal", "/ HCSO STADAT", "/ Destatis
   GENESIS-Online") from the Eurostat dataset title, recording any national cross-check as its own source with its
   own rights row. This is a canonical data change.
4. Add the Eurostat non-responsibility disclaimer to the Eurostat attribution where data are modified or translated.
