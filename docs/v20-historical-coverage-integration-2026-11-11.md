# Historical coverage and comparability integration — 2026-11-11

Status: implemented and validated. Final complete browser run: 680 passed, two existing mobile-only skips, zero failures. Owner authorised push and deployment on 2026-11-11 ("推送部署"). Production acceptance PASS: Pages #378 deployed `24c3793`; 52 live browser checks, six live mirrors and the downloaded research package verified.

Baseline: actual HEAD and fetched `origin/main` both `a8d10a6112c89eef628334b468db032cef1664a6`. The existing coverage-closure branch was clean and its newer Phase R data, ledger correction, owner decisions and SORS rights evidence were preserved. Implementation branch: `feature/historical-coverage-integration`. Brand and platform version remain v2.0.

## Implemented workflow

- Data Explorer uses the existing public `historical_recovery_inventory.json` to show actual loaded periods alongside periods within the registered statistical frame. Explanations distinguish definition floors/breaks, territorial/NUTS restrictions, officially empty cells, vintage holds and regular refresh requirements. Original values, Pending records and source references remain available. SORS observations remain a separately defined layer rather than inheriting Eurostat comparability.
- Annual comparison keeps its existing 2–5-country controls, freshness selectors, charts, CSV, Notebook and research URLs. The historical-year selector lists actual common eligible observations, including checks against the inventory's pairwise periods; it does not fill the interval between minimum and maximum years. Each country retains its own longer observation history. Requested unavailable years are preserved. Comparable observations form lines; other same-unit descriptive values remain isolated points, with a direct Data Explorer link for original history. Existing CSV continues to export actual observations, not a claim that every row is comparison eligible.
- Regional comparison reuses the existing table, region selection and compact country history runtimes. A separate comparison-year selector intersects actual finite observations, source units, registered definitions, geographic levels, geographic versions, `comparable_stable_code` status and inventory-admitted years. It is conservative: the inventory's country-wide common regional periods must also admit the year. Historical selection is restored through `comparison_year`; it does not change the map's snapshot `year` or map export. The comparison header explicitly distinguishes its observation year from the map snapshot year. Statistical NUTS version comes from the approved inventory, separately from the map classification. Poland keeps the existing ADM1 units and their recorded NUTS2-source-code aggregation; it is not relabelled as NUTS2 geometry. Backcasts and pre-break values remain in the existing regional history view, as unconnected points.
- Regional history charts and exact-value tables now expose source links, statistical definitions and actual, possibly disjoint comparable periods. Empty official years are not hidden inside a continuous min/max coverage claim.
- Monthly comparison retains its existing actual-month intersection and eligibility engine; an expandable coverage explanation links it to the approved inventory. Earlier descriptive monthly records remain in Data Explorer rather than bypassing the workbench's existing monthly gates.

## Evidence and preserved boundaries

The runtime reads the approved 1,413-contract descriptive inventory; tests cross-check its contracts against the dated 1,683-contract closure matrix. The additional trade-network and frozen-panel contracts are not admitted into these comparisons. No replacement registry, collection pipeline or estimation framework was created.

The 328 vintage-held periods remain excluded. No pre-2015 Comtrade extension, population/national-accounts floor relaxation, canonical refresh or frozen-model input change was made. No observations were invented, interpolated or zero-filled. D1–D4, E1–E2.1, existing publication gates and the map-first homepage remain intact.

Coverage evidence is a dated snapshot, not a claim that a source remains unpublished indefinitely. The existing machine-readable inventory remains accessible behind the concise data explanation.

## Verified period examples

- Industrial electricity prices: Germany and Croatia **2007–2024**; Austria, Czechia, Hungary, Poland, Slovakia and Slovenia **2008–2024**; Serbia **2013–2024**; Romania **2023–2024**. These are admitted Atlas periods, not a claim that official sources stop there. Recorded 2025 cells use the regular-refresh explanation rather than being filled from another layer.
- Regional GDP per capita, inventory-wide common comparable periods: Hungary **2018–2024**, Poland **2021–2024**, Romania **2012–2024**, Slovakia **2002–2024**. Germany remains **2011–2012 and 2014–2024**, preserving the empty official 2013 cell.
- Austria/Slovakia automotive export-share comparison keeps **2014 and 2018–2024**; 2015–2017 do not appear as common eligible years.

## Files

Presentation and pure adapters:

- `src/components/HistoricalCoverage.tsx` — shared read-only inventory loading and coverage explanation.
- `src/lib/historicalCoverage.ts` — contract lookup, explicit gap/floor checks, true observation intersections and range labels.
- `src/components/DataExplorerV11.tsx` — annual/monthly evidence panels and SORS separation.
- `src/components/AnnualComparisonWorkbench.tsx` — common eligible year selection, original-history access, source-linked chart points and eligibility-aware status handling.
- `src/components/ComparativeSpatialWorkbench.tsx` — separate historical table selection, matching frames, URL restoration and source links.
- `src/lib/regionalComparison.ts` — projection of existing regional runtime points; original difference calculation unchanged.
- `src/components/RegionHistoryTrend.tsx` — exact periods, definitions and source references.
- `src/components/MonthlyComparisonWorkbench.tsx` — secondary historical-coverage explanation; existing monthly engine unchanged.

Validation/governance:

- `tests/tooling/historical-coverage-integration.test.mjs`
- `tests/ui/historical-coverage-integration.spec.ts`
- `tests/tooling/ui-amendment.test.mjs` — exact approved path count, 147 → 149.
- `scripts/validation/validate-ui-regressions.mjs` — the former blanket ban on regional-history reads is replaced with explicit separation of snapshot-only choropleths/exports and stable-code, inventory-gated historical table comparisons. Formal publication gates are unchanged.
- `docs/legal-security/ui_governance_amendments.json` — exact hashes for eight presentation files, no data/model/release permission.
- `tests/ui/notebook-projects.spec.ts` — await each existing confirmation dialog decision before starting the next action; no Notebook product code changed.
- This consolidated report.

## Validation

- Final complete browser suite: **680 passed, two skipped, zero failed**, in 4.5 minutes. The two skips are the existing annual **desktop** row-limit tests on mobile; no new tests were skipped, no retry policy or timeout was relaxed, and no screenshot baseline was updated. Desktop/mobile and both languages passed, including D1–D4, E1–E2.1, pressure models, Notebook, annual/monthly exports, sharing, workspaces, map navigation and original event routes.
- New coverage browser checks: **28/28 passed**, also included in the final complete suite. They cover real exclusions, differing country-pair history, internal official gaps, source links, requested-year restoration, four regional country histories, Poland's existing ADM1 source correspondence, unavailable inventory and failed regional-history loading.
- Complete tooling suite: **430/430 passed**, zero skipped. Final focused coverage and exact-hash governance checks: **20/20 passed**.
- Final static build, TypeScript and lint passed. Lint retains one pre-existing unused `EVIDENCE` warning in the Slovakia ingestion script; zero errors.
- Release QA: **145 checks, zero blockers**, 68 routes, 174 exports, 3,029 internal links and six stable research URLs. UI regression: **233 checks**, including snapshot-only choropleths/exports and independently gated historical tables. Language QA and i18n: **1,737 checks, 27 route pairs**, no failures. Legal/security and exact-hash source closure passed.
- Coverage/history validators passed: descriptive coverage **21,852** checks, annual **54,882**, monthly **164,105**, regional **94,296**, SORS **104,047**. The existing closure snapshot reproduces unchanged. Research export check: **882 mirrors checked, no differences**.
- Source/static privacy scans passed. Final protected-tree comparison shows no changes to `src/data`, `public/research-data`, dependencies, release metadata or model engines. No unrelated simulation or acquisition was run.
- The desktop and mobile regional comparison were visually inspected. The comparison year, map snapshot year, units, source links and horizontal table scrolling remain explicit and contained.

The focused data checks reproduce all industrial-electricity country pairs across ten countries, all 328 held periods, actual gaps and the inventory's regional GDP-per-capita common periods for Hungary, Poland, Romania and Slovakia (plus Germany's empty 2013 period). They also reject incompatible units, NUTS versions, levels, non-finite values and empty series.

The first complete run recorded 677 passes, two existing skips and three failures. Two failures exposed an eligibility-message bug: Pending rows had been reported as definition mismatches after the inventory filter was applied. The implementation now keeps original publication status, original definition/applicability status and coverage exclusion distinct; no values were changed. The third failure exposed an existing test-dialog race, fixed by awaiting the decision without changing Notebook functionality or assertions. Focused geography checks also caught a display-label/version mismatch; the final implementation uses the recorded inventory statistical version and retains the original map geography separately. All these cases pass in the final complete run.

## Remaining limitations

- The dated inventory requires the existing authorised refresh/closure workflow when source coverage changes. A failed inventory request withholds historical quantitative comparisons rather than assuming eligibility; original Data Explorer observations remain accessible.
- Regional table history uses the inventory's country-wide common-year restriction. It can conservatively exclude a year usable for a smaller region subset; no broader eligibility is inferred.
- Monthly comparison still obeys its original monthly publication gates; showing older descriptive coverage does not admit it to that workbench or a formal model.
- Map exports retain their selected snapshot year. The historical comparison selector does not relabel a map export as a historical comparison package.
- Existing annual CSV, Notebook and JSON schemas are preserved. A descriptive observation export is not a frozen comparison dataset or a research conclusion.

## Production acceptance — 2026-11-11

- Actual remote main and deployed source: `24c3793b3020da15a94b3c4ca6ea390f9a125f03`. [Pages #378 / workflow run 42908041114](https://github.com/hui-sallai/central-europe-political-atlas/actions/runs/42908041114) completed successfully, including build and deploy. The public deployment manifest independently matches both identifiers. Its generation time is `2026-11-10T21:47:26.734Z` (UTC; 11 November in Melbourne).
- Main CI tooling: **427 passed, zero failed, three existing conditional skips**. CI browser suite: **679 passed without retry, one passed on the existing configured retry, two existing mobile-only skips**. The retried case is Chinese mobile Data Explorer back/forward restoration; its first attempt showed Hungary while Austria was expected. This is recorded as a flaky CI result, not a clean 680 first-attempt pass. Assertions, timeouts, retry settings and screenshot baseline policy were not relaxed; no baselines were written.
- Actual production: **40/40** focused historical-coverage/homepage/D4/CATL/REPowerEU browser checks passed, followed by **12/12** unchanged Data Explorer deep-link, refresh, locale and back/forward checks. Both desktop/mobile and Chinese/English passed without retries. Negative tests use isolated browser interception to verify unavailable-source handling; they do not modify the site or establish coverage for a missing source. The intermittent CI restoration failure is retained as a testing limitation; its independent production follow-up passed, and no general race-condition fix is claimed.
- Six actual production files are byte-identical to the approved repository files: the recovery inventory, annual history runtime, and Hungary/Poland/Romania/Slovakia regional history runtimes. The existing closure and source definitions remain intact.
- Actual downloaded `research-data-v2.0.zip`: SHA-256 `8b734c01784b2722c1d3efa5225ebe150fa415ce8af8a4e2d0675a866dd4127a`, matching the live manifest. Package-content validation and ZIP CRC passed. All 466 member names and order match the predeployment package; 465 member contents are identical. Only `release/deployment_provenance.json` differs. Descriptive history JSON remains published separately; the ZIP is not presented as a new complete descriptive-history archive.
- Privacy checks passed before push, across 15 outgoing changed blobs, after push and in CI. CI scanned 1,937 source/publish candidates and 2,837 generated-site candidates without detected secrets or personal local paths. One existing moderate dependency alert remains; dependencies were not changed by this deployment.
- Version remains v2.0; no tag was created. This final record is saved on a documentation-only evidence branch so recording the actual production identity does not trigger another site deployment.
