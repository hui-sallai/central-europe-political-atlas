# v2.0 finalization — Round 1, 2026-11-08

## Verified public baseline

Remote main, local HEAD and the public deployment manifest agree on `eb5f759b6d285cae0549ac2a02be3b6cb09440db`.
Pages #362 / workflow run 42390779879 succeeded, including its build and 618 browser tests.
The live manifest identifies research package checksum `987f9cef2f69dab25e758d729253e74128c2b30fa40725f2377ceafe469e62e1`.
This round independently checked the manifest, CI result and real production journeys; it did not newly download or hash the entire ZIP.

## Acceptance and one verified defect

Both homepages preserve research-first navigation, the three case entries, four question-first workspaces and the interactive country map.
Coverage remains 10 national profiles, 9 connected regional maps and 5 admitted parliamentary-election countries, with separate model eligibility.
The dated news archive and unavailable formal VAR/IRF publication remain explicit in both languages.

Production testing identified one export defect: D4's 40 aggregate CSV rows used `derived from indicator_change and turnout_change rows` as `source_refs`, rather than resolvable source IDs. The existing tooling test explicitly allowed this narrative exception. The strengthened production suite therefore reported 10 passes and 2 failures (the same D4 issue at both viewport sizes).

The candidate fix moves that derivation description to `note` and fills `source_refs` from the existing shared source index. Country summaries reference that country's turnout and primary/sensitivity indicator sources. Exclusion summaries reference the full-sample inputs as their notes also report the full-sample comparison. References are sorted and deduplicated. No observations, calculations, findings, protocol, JSON schema or method version changed. The tooling test now requires every nonempty CSV source reference to resolve; the narrative exception was removed.

## Three journeys

Each journey starts at the English homepage, enters the existing case, switches English → Chinese → English, reloads each locale, verifies the restored query and panel, uses keyboard-accessible downloads and checks narrow-screen tables/charts.

- **D4:** the fixed protocol opens automatically. All 12 election pairs, descriptive findings, sensitivity tables, model context, missing-data and electoral-comparability explanations remain visible. Every displayed turnout change and available primary/sensitivity indicator change matches JSON at the displayed precision; CSV values, differences, units and method versions match JSON exactly. All CSV source references resolve to the retained 110-entry source index.
- **Hungary CATL:** the selected country/event and E1/E2/E2.1 panel restore correctly. Company statements remain distinguished from official documents; permitted capacity is not presented as realised production. All four E2.1 additions remain visible, along with unresolved evidence and the explanation for no monthly window. JSON/CSV download controls work.
- **Czech REPowerEU:** selection and E1/E2/E2.1 panel restore correctly, with the eligible descriptive monthly window and all four E2.1 additions. Preliminary payment assessment remains preliminary; connection capacity is not generation. JSON/CSV controls work, and charts stay within the mobile viewport.

Existing [E2.1 documentary/export acceptance](e21-production-acceptance-2026-11-07.md) was reused. Its evidence libraries and case component are unchanged from that accepted implementation; original source PDFs were not re-downloaded or rehashed. The new checks concern integration, language restoration and export consistency.

| Evidence | SHA-256 over `JSON.stringify(evidence)` |
|---|---|
| D4, before and after CSV-only correction | `9726ff0011832f6ff6d032448f192c5f186e82147d97d060d0c8b899157f3213` |
| CATL | `de202d67e499b5268fe005644b263938397ab9d8bd6760255f8f2ce0062b489d` |
| REPowerEU | `6d96f417767001434df2f3645203df1ee20f1482d4418ce8cc323b784dcf3f57` |

The same digests were observed in English and Chinese and at desktop-1440/mobile-390. The CSV byte content changes intentionally for D4's provenance correction; its JSON evidence digest does not.

## Consolidated candidate validation

- 12 focused browser tests passed against the final static candidate, reusing the existing homepage suite.
- 25 D4 and exact-hash-governance tooling tests passed.
- TypeScript and ESLint passed (zero errors; one pre-existing unused-variable warning in the Slovak acquisition script).
- Static build and 145 release checks passed: 174 exports and 3,013 internal links checked, zero blocking failures.
- Bilingual validation (1,729 checks), UI regression (228 checks), SEO (427 checks), UI language QA, source-closure checkpoint and built-output legal/security validation passed.
- Public-secret scan and whitespace checks passed. Temporary generated research copies were restored; no canonical data or public research files remain modified.

Files changed: `src/lib/comparativeResearchCase.ts`, `docs/legal-security/ui_governance_amendments.json`, `tests/tooling/comparative-research-case.test.mjs`, `tests/ui/v20-finalization.spec.ts`, `playwright.finalization-acceptance.config.ts`, and this report.

## Publication and limitations

The candidate is ready for release verification. It has not been committed, pushed or deployed in this round; the production D4 CSV provenance defect remains until this fix is published. No remaining critical usability defect was found within these scoped journeys.
Previously documented research limitations remain: descriptive associations do not establish causes, CATL measured outcomes and missing authorisations remain unresolved, the Czech seventh-request evidence is preliminary as recorded, and formal VAR/IRF publication remains blocked. This is focused integration acceptance, not a new review of all research evidence or model methods.
