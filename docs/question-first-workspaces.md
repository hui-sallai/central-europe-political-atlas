# Question-first Research Workspaces — Phase 1

Platform remains **v2.0 / 2.0.0**. Implementation baseline: `0ba4462f88a94cbd56b85bd8879939ab151c55f3`, the deployed Core English Edition. This phase is local presentation/orchestration work, not a release. No commit, push, deployment, acquisition, frozen research rerun or next product phase is performed.

## 1. Architecture

`src/content/researchWorkspaces.ts` is a typed first-party presentation registry, outside canonical `src/data`. It holds stable IDs, bilingual questions and warnings, indicator/series/method/layer references, country-comparison dimensions, suggested horizons and the setup-only export mode. `workspaceMessages.ts` holds bilingual interface wording.

`src/components/workspaceEvidence.ts` reads existing records at build time and supplies small presentation summaries. Annual observations, annual history, monthly observations/history, macro drivers, SORS, current regional facts and historical regional archives remain distinct cards. It does not supply observations or estimates to a new estimator. Coverage uses non-missing records; actual zero observations remain present. Source summaries retain canonical source names and links.

One shared `ResearchWorkspace` client shell handles country/date controls and the nine ordered research sections. Index and homepage cards are server-rendered. Export code and the existing ZIP implementation are dynamically imported only on download. No runtime dependency was added.

## 2. Four workspaces

| Stable ID | Chinese | English |
| --- | --- | --- |
| `inflation_monetary_policy` | 通胀与货币政策 | Inflation & Monetary Policy |
| `trade_external_exposure` | 贸易结构与外部暴露 | Trade Structure & External Exposure |
| `fiscal_macro_conditions` | 财政与宏观状况 | Fiscal & Macroeconomic Conditions |
| `regional_development` | 区域发展与差异 | Regional Development & Divergence |

Each has an index card, neutral question template, actual coverage, source-linked evidence, existing method states, explicit limitations and reproducible continuation links. No question is automatically answered.

## 3. Routes and deep links

There are ten new fully static pages: `/workspaces/`, four `/workspaces/[id]/` pages, and their `/en/` equivalents. Existing URLs are unchanged. The sitemap, bilingual route matcher, canonical/hreflang checks and browser coverage include all new pages. Workspaces are not labelled as Dataset in structured data.

The URL records up to two distinct valid countries and a bounded year range. Selection updates visible evidence and links. Language switching preserves query/hash; reload restores selection. An invalid reversed date range is disclosed and export is disabled. No ranking, pooled sample or new combined observation table is constructed.

- Data links select the existing annual/high-frequency tab, indicator, country, dates and relevant history layer.
- Macro-driver links select driver, country/scope and transformation; its existing tool does not accept the workspace date range.
- SORS links select the original `cpi_annual_index` series in the existing separate SORS panel; its own period controls remain authoritative.
- Map links select a supported current country/layer/available year. Historical regional records open the existing archive rather than inventing an unsupported historical map period.
- Models links select existing active skills and supported country state. Fixed multi-country samples are never filtered or re-estimated by workspace controls. Final specification/readiness gates stay in the existing tools.
- Events links select existing country/type/date filters and, for an individual card, its event anchor.

The comparison notice is conservative: matching canonical annual definitions, units and common periods are required; review-required/partially comparable observations, historical layers and Serbian non-comparable records are not promoted. Separate country links remain available for within-country inspection, not a cross-country numerical claim.

## 4. Existing evidence and methods

The workspace builders reuse canonical indicators/observations/events, audited descriptive history, high-frequency and macro-driver dictionaries, the SORS source registry, regional display eligibility, verified project-location records and the existing analysis-skill registry. Original event titles and source names are not machine translated; language/provenance markers remain explicit.

Method descriptions and exact limitations reuse existing Chinese canonical presentation and reviewed English overlays. `registry_only` and `blocked` cards have no runnable link and are absent from exported linked methods. Reduced-form VAR availability does not imply formal dynamic-response/IRF availability. Frozen LP and Panel LP inference boundaries are unchanged. Trade concentration is not interpreted as political dependency; composites are not objective national-performance rankings.

Serbia regional cards are archive-only and preserve original series, NSTJ/statistical level and classification vintage separately. They are never relabelled as EU NUTS or linked into an unavailable Serbia regional comparison.

The Chinese homepage keeps its interactive map and verified events before the new workspaces. The English homepage now uses the same interactive map with bilingual first-party labels and original-language event records. A prominent homepage Workspaces / 研究问题 entry retains the compact existing global data/method navigation.

## 5. Workspace Snapshot

Reuses the existing `clientZip` and Research Snapshot CSV utilities without changing the descriptive-snapshot schema. The separate setup schema is `atlas-workspace-setup-v1`.

Exactly five files are generated locally: `README.md`, `workspace.json`, `links.json`, `sources-summary.csv`, `citation.txt`. They record workspace ID, locale, selected countries/dates, visible indicator references, active evidence panels, active linked methods, methodological warnings, generated time and v2.0. Links are absolute and source summaries preserve provenance. Verified event sources visible in the selection are included.

No underlying observation dataset, formal estimates, model conclusions or source full text are packaged. Links reproduce settings, not future official revisions. Browser download status indicates download initiation, not confirmation of a saved file. Invalid selections fail closed.

## 6. Bilingual and visual acceptance

All four workspaces are bilingual from day one, share the same evidence builder and use locale-specific static HTML. No canonical record is translated or duplicated into a locale dataset.

Sixteen new Darwin screenshots deliberately cover index and representative regional detail in both languages, two viewports and both themes. Four English-home Darwin screenshots were deliberately refreshed for the restored interactive map. Representative full-page/viewport screenshots were reviewed. Chinese screenshot baselines and unrelated English screenshots remain unchanged. Ordinary tests never create or update baselines.

Linux workspace baselines and updated Linux English-home baselines still require an explicitly authorized no-deploy recording run, review and commit before any future deployment. This implementation does not push merely to obtain those artifacts and does not claim deployment CI has passed.

## 7. Validation

Local acceptance: workspace validation passed 657 checks (built and source-only modes), bilingual validation passed 1,060 checks across 25 route pairs, SEO passed 325 checks, and all 166 browser tests passed. UI-language QA, lint, typecheck and static build passed. Public-secret scanning passed across 2,067 publish-candidate files. Independent research-boundary review returned PASS after correcting original regional dataset/URL provenance, project location-source names and selected-period source visibility. No release CI or deployment claim is made.

The workspace validator checks registry references/parity, coverage periods, inactive actions, setup file inventory, URL resolution, neutral question wording and frozen-data/engine/lockfile invariance. CI runs its source-only variant before generated research exports, validating real source routes without confusing approved release regeneration with a presentation edit. Built static routes are subsequently covered by i18n, SEO and browser tests.

Browser cases cover all ten routes and two themes, real country selection and comparison warnings, stateful Data/Models/Map links, query/hash language round-trips, independent Python ZIP/CRC/UTF-8 reading, actual downloads, invalid settings, blocked-method fixtures, mobile overflow and source-native Serbia NSTJ archives.

## 8. Performance

`node scripts/validation/workspace-bundle-size.mjs` compares unique JS chunks gzipped independently against the saved deployed English-edition baseline. This is a transfer estimate, not a timing benchmark. Final total is 1,324,920 bytes versus 1,311,284 (+13,636, approximately 1.04%). Chinese-home initial JS increases by 431 bytes; English-home by 2,380 bytes for the restored map; Data by 37 bytes and Models by 18 bytes. English workspace index initial JS is 191,994 bytes; each detail route is 199,113 bytes. All four detail routes share one shell, not the whole canonical dataset. Export code is lazy loaded.

## 9. Known coverage gaps

- Observed endpoints are not continuous coverage or coverage of every indicator; each card shows available periods and countries with incomplete selected-range coverage.
- Macro-driver shared euro-area rates are not separate national policy decisions. Non-euro ECB shocks remain external exposure/spillover settings.
- Serbia CPI remains source-defined SORS CPI, not HICP and not a promoted cross-country series.
- Serbia's current regional map comparison remains unavailable. Source-native NSTJ archives are separate from EU NUTS and from incompatible historical boundaries.
- Some regional labour indicators are unavailable for the chosen country/layer; empty cards disclose absence rather than filling a value or silently switching layers.
- Current map and historical archive years differ. Historical records can have definition/boundary breaks and are not joined into a continuous map series.
- Verified event coverage is sparse and may lie outside the selected evidence period. No matched event is an explicit gap, not an invented event.
- Trade-network and model sample years are those of the existing tools, not this workspace's suggested horizon. Macro/SORS links do not silently pretend to apply an unsupported date filter.

## 10. Research boundaries and stop

`src/data/**`, `public/research-data/**`, registered engines, dependency lockfile, platform/release version, formal samples, readiness and frozen conclusions are unchanged from the English-edition baseline. No VAR/LP/Panel LP programme was rerun. No new estimator, forecast, risk score, ranking, causal claim or AI assistant was created. Stop after these four workspaces; publishing requires separate owner authorization and the full release workflow.
