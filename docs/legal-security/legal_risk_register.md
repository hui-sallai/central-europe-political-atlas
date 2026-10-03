# Legal risk register

Machine-readable copy: `legal_risk_register.json`. Residual levels are engineering judgements, not legal advice.

| ID | Area | Risk | Basis tag | Control | Doc | Residual |
|---|---|---|---|---|---|---|
| L1 | privacy | GDPR transparency: notice must reflect actual processing | LAW / EXTERNAL LICENCE | privacy pages describe hosting, e-mail, localStorage keys, no cookies/analytics/profiling | privacy_data_inventory.md | medium |
| L2 | privacy | Controller identity / legal basis unconfirmed | OWNER DECISION | no guessed controller; owner_confirmations.json | owner_compliance_checklist.md | medium |
| L3 | political-data | Special-category inference of individual political opinions (GDPR Art. 9) | LAW / EXTERNAL LICENCE | P0–P5 classes; no-person-inference validator; public no-profiling statement | political_person_data_policy.md | low |
| L4 | political-data | Forecasting / voter modelling / microtargeting | ATLAS POLICY | blocked fields and result-status enum without prediction values | political_analysis_boundary.md | low |
| L5 | licence | Reuse without a licence (election portals) | LAW / EXTERNAL LICENCE | rights registry fail-closed canExport; only germany political store | source_licence_policy.md | low |
| L6 | licence | Missing attribution (GISCO, Bundeswahlleiterin, Eurostat, BIS) | LAW / EXTERNAL LICENCE | built-output attribution checks | source_licence_policy.md | low |
| L7 | database-right | Substantial extraction from protected databases | LAW / EXTERNAL LICENCE | series-level storage; blocked sources | database_right_policy.md | low |
| L8 | network | Automated access against terms/robots | LAW / EXTERNAL LICENCE | network registry; unknown host = block | network_access_policy.md | low |
| L9 | copyright | Copied news text or images in Event Library | LAW / EXTERNAL LICENCE | own-words summaries, links only | copyright_content_policy.md | low |
| L10 | defamation | Factual claims about named people/organisations | LAW / EXTERNAL LICENCE | attribution, boundary paragraph, takedown route | correction_takedown_policy.md | low-medium |
| L11 | security | Front-end injection / CSV formula injection | ENGINEERING CONTROL | sink scan, jsonLdHtml escaping, csvCell guard | security_policy.md | low |
| L12 | security | Build-time dependency advisories | ENGINEERING CONTROL | static export; upgrade pending owner approval | third_party_dependency_licences.md | medium |
| L13 | commercial | Commercial use breaking non-commercial licences | OWNER DECISION | operating-mode kill switch | commercialisation_gate.md | low |
| L14 | media-law | Hungarian media registration | LAW / EXTERNAL LICENCE | watch only, no conclusion | media_registration_watch.md | unknown |
| L15 | incident | Personal-data breach notification duties | LAW / EXTERNAL LICENCE | incident plan; owner decides | incident_response_plan.md | low |
