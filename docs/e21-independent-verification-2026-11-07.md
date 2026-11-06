# E2.1 — independent verification of the E2 implementation evidence (2026-11-07)

## Step 1 — production check

Production at `bafdc71` (GitHub Pages #357) was checked on both E2 deep links in English and Chinese:
- **Restoration:** each link returns HTTP 200, restores its event and country, focuses the case study and shows section 10 with the E2 block.
- **Exports:** the downloaded JSON and CSV exports have a correct evidence digest, and their `implementation` objects are byte-identical to the records built locally from `bafdc71`.
- **Source references:** every implementation reference resolves in the source index, and every milestone URL matches its `document:` entry.

No substantive defect was found in production.

One wording defect was found in the records themselves. `hu-e2-04` described the 2023 environmental permit as "valid until 18 February 2028", in the present tense. The permit has since been amended three more times, and no primary source establishes its current legal status. The claim now reports the 2023 status and the validity term that the 2023 decision states.

## Primary documents read (retrieved 2026-11-07)

| Case | Document | SHA-256 |
|---|---|---|
| CZ | Commission press release IP/26/2294 (29 Oct 2026), read in the browser pane | — |
| CZ | Commission, Preliminary assessment of the seventh payment request of Czechia (29 Oct 2026) | `a53b0eb9…` |
| CZ | ERÚ, Monitoring připojování výroben elektřiny, update to 31 Dec 2025 (issued 15 Jul 2026) | `b879666d…` |
| HU | Hajdú-Bihar County Government Office decision HB/17-IKV/01298-104/2025 (signature timestamp 17 Nov 2025) | `0664bdde…` |
| HU | Hajdú-Bihar County Government Office news item, 25 Aug 2026 | — |
| HU | Debrecen Regional Court notice, case K.700130/2026 (read by hand in the browser pane) | — |
| HU | Commission competition case register: searches for "Contemporary Amperex" and "Debrecen battery" (read by hand) | — |

Raw files stay in session scratch space and are not committed.

Network conduct:
- `birosag.hu` refused a command-line request, so it was read only by hand in the visible pane.
- `robots.txt` was checked for `kormanyhivatalok.hu`, `eru.gov.cz` and `planobnovy.gov.cz`.
- One early `robots.txt` request was sent with a browser-like user agent. That breaches the repository rule; no data from that request was used, and all later requests used the default client.

## New independently verified facts

**Czechia, REPowerEU**

The Commission made a positive preliminary assessment of the seventh and final payment request (€951 million, 13 milestones and 25 targets), which Czechia submitted on 31 August 2026.
- It is a whole-plan request.
- The Economic and Financial Committee opinion and the payment decision were still pending, so nothing in it is recorded as paid.

The same assessment covers three REPowerEU-chapter measures:
- **Target 299 (investment C7.1.I1):** 29 distribution-network projects were completed and are in operation, with 2 133.9 MW of cumulative added connection capacity against a 1 989 MW target. The evidence is activation protocols and independent engineers' reports, and the Commission made on-the-spot checks on 5 and 24 August 2026. This is capacity to connect to the grid, not installed generation or energy supplied.
- **Milestone 311 (reform C7.2.R3):** the Electricity Data Centre's technical-flexibility functions are in operation. The evidence is a Ministry of Industry and Trade licensing certificate of 20 August 2026 and ERÚ decision 05124-21/2026-ERU, effective 11 August 2026.
- **Target 346 (reform C7.7.R2):** 61 renewables acceleration areas were designated, with an estimated capacity of 1 254.4 MW solar and 2 733.5 MW wind across 13 regions. These are estimates for the designated areas, not built capacity.

The ERÚ connection monitoring counts applications, rejections and completed connections (27 439 in 2025), with their capacities. It reports no connection processing times. It covers all generators nationwide and runs only to 2025, so it has no full year after the grid reform. It is recorded as context in the unavailable-outcome record, not as an outcome.

**Hungary, CATL**

The fourth amendment of the unified environmental permit (HB/17-IKV/01298-104/2025) lists the earlier decisions it amends: the 2023 base permit, then 01008-46/2023, 00955-62/2024 and 00392-12/2025. Under the amendment:
- cell capacity is 40.7 GWh a year;
- module and pack assembly capacity is 18.9 GWh a year;
- total production capacity is 59.6 GWh a year;
- LFP cells are added;
- up to 2 750 people are expected on site at the same time, which is a planning figure, not employment.

The decision could be appealed within 15 days, and the document does not record when it became final. It also records that, at that time, the company did not hold a final industrial-safety permit.

The county government office states that it granted the occupancy permit for the first phase of the cell-manufacturing building on 25 August 2026. It also states that:
- it refused the second phase on 19 August 2026, because the site plan did not show the building as built;
- it prohibited work in three areas of the building after nine workers showed raised nickel exposure.

The Debrecen Regional Court listed a decision announcement for 29 October 2026 in administrative case K.700130/2026 on the environmental permit. The court has published no judgment or press release.

## Company and press claims that remain unverified

- **CATL's own claims stay "announced":**
  - the 100 GWh plan and the €7.34 billion investment;
  - "all relevant permits";
  - 537 000 modules produced;
  - cell trial production from 22 September 2026.
- **Press-only claims:**
  - the court outcome of 29 October 2026 (claims rejected, latest amendment treated as operative) and whether it is final;
  - the Kúria's 2023 annulment of the industrial-safety permit, and whether a new industrial-safety permit was issued;
  - the second-phase occupancy permit of 23 September 2026;
  - the HUF 129 billion support contract, obtained through a freedom-of-information request with amounts redacted.

No EU State aid case was found in the Commission register.

## Stage status after E2.1

| Case | Announcement | Approval | Implementation | Realised outcome |
|---|---|---|---|---|
| CZ | verified | verified | verified | unavailable |
| HU | announced | verified (1 disputed) | **verified** (was announced) | announced |

Hungary's implementation stage is now verified by the official occupancy-permit record. The Hungarian dossier therefore lists `implementation` as documented and keeps `observed_outcome` undocumented. Neither case has an official record of a realised outcome.

## Unresolved

**Czechia:**
- The REPowerEU share of the payments is not separated, and payments to final recipients are unknown.
- Only C7.1.I1 is documented as completed among the investments.
- The seventh request has a preliminary assessment only.
- Target 299 states two time ranges: completion dates of 31 January to 31 March 2026 in the project list, against activation protocols covering projects implemented from February 2022 to March 2026.
- No official measure of connection processing times was located.

**Hungary:**
- The 100 GWh, 40 GWh and 40.7 + 18.9 GWh capacities may refer to different project phases; no document says.
- The court outcome and its finality are press-only.
- The current industrial-safety permit status is unknown.
- Support has no official source.
- The second-phase permit was not located.
- Capital spending, employment and series production have no official record.

## Changes to evidence and exports

- **`src/lib/eventImplementationEvidence.ts`:**
  - 8 new records: CZ 17–20 and HU 13–16;
  - rewritten records: `hu-e2-04`, `hu-e2-06`, `hu-e2-07`, `hu-e2-08` (note), `hu-e2-12` and `cz-e2-16`;
  - unresolved claims rise from 4 + 4 to 7 + 5;
  - new document kinds `national_authority_publication` and `court_notice` (both official);
  - new units `MW` and `areas`, and new quantity kinds `assessed_connection_capacity_added` and `designated_estimated_capacity`, with a validator rule that keeps them out of the realised-outcome stage.
- **Exports:** the JSON and CSV schema is unchanged (`atlas-event-mechanism-research-v2`). The exports now carry 36 implementation milestones (previously 28) and 12 unresolved claims.
- **`src/lib/eventCaseStudies.ts`:** Hungarian stages, one dated milestone, the uncertainty text and the source list.
- **`src/components/EventCaseStudy.tsx`:** labels for the new units and kinds.

E1 windows, D1–D4 outputs, models, country and election records, and the frozen event registry and window engine are unchanged.
