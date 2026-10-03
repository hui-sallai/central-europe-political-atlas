# Residual risk register

| ID | Risk | Current mitigation | Residual | Owner action |
|---|---|---|---|---|
| R1 | Controller identity and legal basis not confirmed | notice describes actual processing only; no guessed controller | medium | confirm identity and establishment |
| R2 | Legacy source licences not re-verified (WB, Comtrade, OECD, ECB, geoBoundaries) | registry `legacy_review_due`; attribution shown | medium | re-check at next refresh |
| R3 | BIS translation disclaimer missing in Chinese UI | registry flag `translation_disclaimer_required` | low–medium | add disclaimer in a UI change |
| R4 | Party-support polling event (hu-2026-09-03-publicus-party-support) and budget poll in the Event Library | aggregate-only wording, source and boundary paragraph; no person inference | low | review at next weekly news workflow |
| R5 | High-risk-keyword events (14) naming organisations or officials | sources, attribution, two-paragraph structure | low–medium | correction/takedown route |
| R6 | Build-time dependency advisories (next/postcss/sharp) | static export; no runtime server | low (runtime) / medium (supply chain) | approve dependency upgrade |
| R7 | Hungarian media-registration status unassessed | watch file; non-commercial | unknown | decide on legal advice |
| R8 | GitHub Pages access logs processed by GitHub | disclosed in privacy notice | low | none |
| R9 | Account or domain takeover | owner MFA checklist | depends on owner | complete checklist |
| R10 | Election portals without a reuse licence (CZ, PL, SK, AT) | blocked; evidence only; publisher gate | low | owner contacts publishers only after READY |
| R11 | Visitor stores sensitive notes in Notebook localStorage on a shared device | disclosure; local only; clear button | low | none |
