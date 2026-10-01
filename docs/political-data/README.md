# Political Institutions & Elections Data Foundation — Audit and Schema Phase

Status: **audit and design only — stopped at the owner review gate.** Audit date 2026-10-02. Platform remains
**v2.0**. No canonical political dataset was written; `src/data/**`, `public/research-data/**`, release metadata,
models, readiness registries, events and estimates are unchanged.

## Files

| File | Content |
|---|---|
| `national_election_source_registry.json` | Per-country matrix (10 countries): authority, elections 2000–latest with verification labels, result files/formats/levels/fields, thresholds, licence, definition issues, recommended and fallback sources, risks, readiness |
| `political_data_source_audit.json` | Cross-country sources (EP Open Data, EP election datasheets, ParlGov, CHES, Manifesto), parliament/government candidates, country summary, constituency-geography audit, coverage and licensing summaries |
| `political_schema_proposal.json` | 24 normalized stores, ID conventions, field-level provenance, temporal rules, prohibited fields/scores, readiness classes |
| `party_identity_model.json` | Party / contestant / group / EP entities, relation types, never-infer rules, vote attribution, crosswalk match bases, worked cases |
| `political_source_policy.md` | Source hierarchy, provenance, archiving, licensing, privacy, neutrality |
| `political_comparability_policy.md` | What may be compared, tier rules, results vs composition, EP, measurements, geography |
| `political_ingestion_plan.md` | Gates, first slice, later slices, record counts, events/profiles/workspaces/notebook plans, validators |

Validate with `pnpm political-audit:validate` (also enforces the stop gate: no canonical political store may exist).

Verification labels: `verified_live` (fetched today), `verified_harmonized` (ParlGov, to reconcile), `verified_secondary`
(press/encyclopaedia), `background_to_verify` (structural knowledge to confirm), `not_located`.

## Owner review report

**1. Proposed schemas.** Separate stores for sources, parties, time-valid names, electoral contestants (joint lists,
alliances, committees), contestant members, party relations, identity crosswalk, electoral systems, elections,
turnout, results, legislatures, parliamentary groups, composition, persons (public-office identity only), cabinets,
cabinet parties, EP groups, EP national-party results, dated party–EP-group affiliation, and three isolated
measurement stores (positions, classifications, cabinet attributes), plus a reconciliation log.

**2. Official source matrix.** Machine-readable official results inspected for **Czechia** (XML 2002–2025),
**Germany** (CSV 1949–2025), **Poland** (CSV/XLSX 2023), **Austria** (XLSX 2024), **Croatia** (CSV 2000–2020);
files located but not yet parsed for **Slovakia** (CSV ZIPs 2020/2023) and **Romania** (CSV/XLS 2012/2016 on data.gov.ro). Partial or missing: Croatia 2024 (PDF), Slovenia
(2026 files linked, archive unverified; results host blocks scripts), Hungary (results app, bulk export not located),
Romania 2020/2024 (portal blocks automated access), **Serbia** (HTML/PDF only).

**3. Party identity strategy.** Opaque name-independent IDs; contestants ≠ parties ≠ parliamentary groups; explicit
dated relations (renamed, legal successor, merged, split, dissolved, alliance/group member, disputed continuity);
crosswalk confirmed only by official codes or registry numbers (e.g. ČSÚ VSTRANA) — never by name similarity.

**4. Election coverage.** Expected 75 national lower-house elections 2000–latest (AT 7, HR 8, CZ 7, DE 7, HU 7,
PL 7, RO 7, RS 10, SK 7, SI 8) and 44 EP elections (9 member states).

**5. Cabinet/parliament strategy.** Official parliament and government sources (all reachable; content still to be
reviewed per country), ParlGov cross-check for 2000–2023; composition kept separate from election results;
majority/minority and similar attributes only as source-defined measurements.

**6. European Parliament strategy.** EP Open Data supplies dated national-party and EP-group memberships per MEP;
EP datasheets supply national-party vote shares (2009–2024; 2004 blank) and seats with the group at the constitutive
session. Party–group affiliation is a dated relation, never a permanent attribute.

**7. ParlGov role.** CC0 stable 2024 release, harmonized reconciliation only; not official; no Serbia; coverage ends
2023 and the project is retired (2024-10-01). Date conflicts found for Slovenia 2022, Poland 2007, Slovakia 2016.

**8. CHES/Manifesto role.** Separate measurement layer with source-native variables, wave/version, uncertainty and
citation; never factual party attributes, never pooled or turned into Atlas scores. CHES covers Serbia only in 2007
and 2019 candidate surveys.

**9. Licensing.** Verified open: Germany (dl-de/by-2-0), Romania 2012/2016 (OGL-ROU-1.0), ParlGov (CC0). Review
required: all other national authorities, EP sources, CHES (no licence stated). Manifesto forbids redistribution
without written authorisation.

**10. Unresolved identity ambiguities.** Czech 2025 list "ČSSD – Česká suverenita sociální demokracie" vs historical
ČSSD/SOCDEM; EP 2024 joint lists (Fidesz–KDNP) and the "Die Linke" coalition coding; CDU/CSU; Polish committees;
Serbian leader-named lists; per-term EP party IDs.

**11. Expected record counts.** ≈75 national elections, 44 EP elections, ≈1,000–1,400 national result rows,
≈330–400 EP result rows, ≈280–320 parties, ≈140 cabinets, ≈350 cabinet-party rows.

**12. Recommended first production slice.** Germany and Czechia national lower-house elections 2002–latest
(elections, legislatures, national turnout, national-tier results, contestants/parties, crosswalk, electoral-system
disclosure), then Poland, Slovakia and Austria after licence confirmation.

**Decision requested:** approve (or amend) the schemas, identity model and first slice; authorise licence review
contacts. Nothing is ingested until then.
