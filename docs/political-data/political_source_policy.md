# Political data — source policy

Status: design for owner review (2026-10-02). Platform remains v2.0. No canonical political data exists yet.

## 1. Source hierarchy

| Tier | Sources | Used for | Never used for |
|---|---|---|---|
| **Tier 1 — official** | National election authorities (BMI, DIP, ČSÚ/volby.cz, Bundeswahlleiterin, NVI, PKW, BEC/AEP, RIK, ŠÚ SR, DVK); national parliaments; official government cabinet records; European Parliament Open Data and EP election datasheets | Published values: dates, votes, shares, seats, turnout, legislature dates, cabinet dates and members | — |
| **Tier 2 — harmonized academic** | ParlGov (stable 2024 release, CC0) | Reconciliation, cross-checks, source-labelled ParlGov attributes (party family, cabinet attributes) | Published values where Tier 1 exists; anything after its coverage end (2023); Serbia (not covered); it is never labelled "official" |
| **Measurement layer** | CHES, Manifesto Project | Source-native measurements in a separate store, after licence review | Factual party attributes; Atlas scores; pooling across sources |
| **Not a source** | News reports, the Atlas event library, polls, encyclopaedias | Context, discovery of where to look | Election results, party identity, ideology, cabinet facts |

Wikipedia or press reports may point to a fact (marked `verified_secondary` in the audit) but a value is only ingested after confirmation against Tier 1.

## 2. Field-level provenance

Every factual field records: source institution, dataset/page, URL, retrieval timestamp, source record ID, the
fields the source covers, official/harmonized status, licence, update frequency and archive availability (in the
source registry), raw snapshot path and SHA-256, and whether the value was published or derived (with formula).
Disagreements between sources go to a reconciliation log; the official value is published and the other values stay
visible in provenance. Examples already found: ParlGov dates for Slovenia 2022, Poland 2007 and Slovakia 2016 differ
from the expected official dates.

## 3. Archiving and refresh

- Raw responses are archived with checksums (as in the existing Serbia/history pipelines); file names that publishers
  reuse across elections (e.g. DVK `mandati.csv`) are always stored with checksum and retrieval date.
- Certified results are immutable. A later official correction is a new versioned record with the correction
  documented, never a silent overwrite.
- Political stores join the official-data-refresh workflow only after they exist and only as registered units with
  their own validators; until then they are not refreshable.

## 4. Licensing

- Ingest only where reuse terms permit public republication with attribution. Verified: Germany (dl-de/by-2-0),
  Romania 2012/2016 (OGL-ROU-1.0), ParlGov 2024 (CC0 1.0).
- Everything else is `license_review_required` until terms are confirmed in writing or on the publisher's page.
- Manifesto Project data may not be redistributed without written authorisation; it stays out of public files
  until such authorisation exists. CHES states no licence; it stays out until terms are clarified.

## 5. Privacy

Parliament and EP person records expose birth dates, birthplaces, e-mails and photos. The Atlas stores only public-
office identity (name as published, source IDs, offices with dates). Party-level composition never depends on
personal data.

## 6. Neutrality

Sources are described, not evaluated. The Atlas publishes no platform-created labels for parties (good/bad,
democratic, extreme, competent, pro-/anti-European), no rankings, no predictions or win probabilities, no voter-
preference or motive inference, and no synthetic ideology scores. Contested measures appear only as named
source measurements with their methodology and uncertainty.
