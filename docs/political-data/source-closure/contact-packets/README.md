# Production 1B — publisher clarification packets

**Prepared, not sent.** These packets convert the open reuse/acquisition questions into narrow, owner-sendable enquiries. The owner decides whether, when and how to send them; no authority has been contacted and no e-mail has been sent.

| Country | Institution | Packet | Unresolved gates addressed |
|---|---|---|---|
| Czechia | Český statistický úřad | [czechia_contact_packet.md](czechia_contact_packet.md) | reuse scope (csu.gov.cz terms vs volby.gov.cz files), normalized republication, raw redistribution, manual/automated acquisition, attribution/transformation wording |
| Slovakia | Štatistický úrad SR | [slovakia_contact_packet.md](slovakia_contact_packet.md) | CC BY scope for volby.statistics.sk election CSVs, manual download, robots prohibition vs scripted retrieval/API, attribution/changes |
| Poland | PKW / Krajowe Biuro Wyborcze | [poland_contact_packet.md](poland_contact_packet.md) | reuse conditions (legal page empty), normalized republication, raw redistribution, acquisition conditions, attribution/transformation |
| Austria | BMI / Bundeswahlbehörde | [austria_contact_packet.md](austria_contact_packet.md) | applicability of the Impressum clause to result files, non-commercial scope, normalized republication, raw redistribution, manual download (AI agents disallowed by robots.txt), attribution |

Each packet lists the institution, official contact page/address, the exact files, the exact ambiguity, short English and local-language drafts (machine-assisted; native-speaker review recommended), source and terms URLs, evidence hashes, and which answers close which gate. Deterministic handling of replies: [`../publisher_response_decision_matrix.json`](../publisher_response_decision_matrix.json).

## Before sending (owner checklist)

1. Replace placeholders `[Name]`, `[affiliation]`, `[contact e-mail]`, `[project URL]`; choose one example URL per packet.
2. Confirm the description “non-commercial public research website” is accurate (no paid access, advertising or commercial licensing); the Austrian packet marks this as an owner confirmation.
3. Verify the contact address on the official page (the Austrian address came from search results).
4. Optionally have the local-language draft reviewed by a native speaker; send one language version per institution (or both, local language first).
5. Archive every reply (full text, date, sender role/department) under `local-evidence/` and record it in the decision matrix before any gate changes.

## Rules that do not depend on replies

- Public accessibility is not reuse permission; a vague “public data” reply does not close a gate.
- Raw redistribution is never inferred from permission for factual extracts.
- No automated collection from statistics.sk or bmi.gv.at; Austria and (pending reply) Slovakia are manual-only.
- No canonical store is written for these countries until every mandatory gate in `../gate_matrix.json` is closed and the owner approves ingestion separately.
