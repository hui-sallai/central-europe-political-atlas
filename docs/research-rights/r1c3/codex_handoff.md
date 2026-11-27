# Codex implementation handoff (R1-C3 admissions)

Nothing below is authorised by this dossier. Every item touches a protected file and needs its own scope and
exact-hash approval. The five R1-C1 core modules are protected by `codex-r1c1-snapshot-binding-2026-11-26`.

## 1. Rights-engine pins (`src/lib/researchPackageRights.ts`, protected)

Add the following entries only after independent review accepts them. Values are copied from
`admission_proposals.json` (`proposed_pin_entry`).

**SORS (existing branch; same checks as today):**

| dataset | count | upstreamCount | data | sources | archive | upstreamDigest |
|---|---|---|---|---|---|---|
| 03010601IND03 | 228 | 29978 | 760bed4e9e0b894627ea0997792b3296864af8895d105a2795887e218db873d1 | ce4cb36c5597a1ae84f0c2fa6be42c02057347e1e372e72888aaa205151d91b0 | b2acc019dd340413c90af17b905256cc4ae4f7c2606e883a8d886449bc4ea302 | a0fb04c3037df9f4fdcda34836db48bee22c69e3eb78c4db0e32f767887c5f93 |
| 210105IND02 | 321 | 4815 | 812bc785be91e07cb20f18d308e11dcbded3d0261586bffab975c850eaf72fe3 | ab130e992879869a0ad9b27262e668d19e8a554bae9d740452e61be186f89dba | b25b710f03e53b907b7098560183a99f2fe3deadf3245f26ee7f9749e6d5bae6 | 5495f234b4850f640f09c4719076a89af7b4118ae66d62f6735f3b4cd4b0ba1d |

Subset strings and modification notices: use `subset` and `proposed_modification_notice` from the proposals file
verbatim. The retail notice should also state that provisional records are included.

**Eurostat (new branch; normalized members only):**

- Conditions: registry row `src-eurostat` must first read `review_status: verified` (proposal in
  `rights_assessments.json`); `snapshot.manifest.view_type === "high_frequency"`; exactly one source row with dataset
  `prc_hicp_minr`; `data.csv` = `633544d1d1d3d772667d5ff695b4c80c251b1c49783cfa43e853f3cda3b9a463`, `sources.csv` = `1bd9903472df2dd79f8e3dfa3a1a5cd4a08f445c13184dc0957f663c1f892285`. Never `original_archive` (the export always includes the Atlas figure).
- Matching cannot rely on `usesRegistryEndpoint`: the source row cites
  `https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_minr/default/table`, which is not under the registry's API
  prefix. Bind by the exact CSV digests and dataset code, as the SORS branch does.
- Attribution and notice: from the proposal, including the Eurostat non-responsibility sentence.
- Do not generalise: no prefix rule for ec.europa.eu, no institution-wide rule, no other years or countries.

## 2. Registry updates (`docs/legal-security/source_rights_registry.json`)

- `src-eurostat`: `review_status` documented → verified; `evidence_sha256` d2d5a046ca07f042895fda7c7bb42b548ce63b2221d8aaaff00ae2c61bbcc4ec; `reviewed_at` 2026-11-27;
  `evidence_reference` naming the copyright notice and Decision 2011/833/EU; `terms_notes` listing the exceptions and
  the non-responsibility disclaimer.
- `src-sors`: `evidence_sha256` d5e3dbbe97990f950e0d0c17cc42766dfc3780ed73de11bf0253d0f2d742c89d; `reviewed_at` 2026-11-27.
- `src-bis`, `src-gisco`: no change (evidence incomplete).

## 3. Attribution text (`src/content/sourceAttributions.json`)

Add to the Eurostat line, in both languages, a statement that changes and translations are the Atlas's and that
Eurostat bears no responsibility for them. Check against `pnpm ui-language:qa`.

## 4. Tests to add

- Rebuild each SORS candidate with `buildSorsSnapshotExample(key)` and assert the three digests.
- For the Eurostat candidate, a Playwright download of
  `/data/?tab=high_frequency&country=hungary&indicator=hicp_annual_rate&from=2020&to=2020&history=0` must give the two
  CSV digests and `disposition: normalized_members`; any other year, country or a changed byte must stay
  `reference_only`.
- Negative cases: the Polish HICP pair, the comparison pair, the policy-rate pair and the regional pair stay
  `reference_only`; a figure-carrying archive never reaches `original_archive`.
- Existing R1-C1/R1-C2 tests unchanged.

## 5. Out of scope

No change to canonical data, exports, Notebook schema, Composer UI, screenshots, political stores or model outputs.
The co-source label correction and the high-frequency source-row change (`citation_metadata_proposals.md`, items 2–3)
are canonical/export changes for a separate decision.
