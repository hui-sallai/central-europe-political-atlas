import releaseConfig from "../data/release.json";

export const PLATFORM_NAME = releaseConfig.name;
export const PLATFORM_VERSION = releaseConfig.version;
export const PLATFORM_RELEASE_DATE = releaseConfig.release_date;
export const PLATFORM_STAGE = releaseConfig.stage;
export const PLATFORM_BASE_URL = releaseConfig.canonical_url;
export const PLATFORM_CONTACT_EMAIL = releaseConfig.public_contact_email;
export const PLATFORM_LEGAL_NOTICE_UPDATED = releaseConfig.legal_notice_updated;
export const RELEASE_SCHEMA_VERSION = releaseConfig.schema_version;

export const platformRelease = {
  name: PLATFORM_NAME,
  version: PLATFORM_VERSION,
  release_date: PLATFORM_RELEASE_DATE,
  stage: PLATFORM_STAGE,
  schema_version: RELEASE_SCHEMA_VERSION,
  canonical_url: PLATFORM_BASE_URL,
  public_contact_email: PLATFORM_CONTACT_EMAIL,
  legal_notice_updated: PLATFORM_LEGAL_NOTICE_UPDATED,
  countries: 10,
  regional_factual_map_countries: 9,
  transparent_models: 4,
  scenarios: 4,
  validation_status: "active",
  data_schema_versions: ["data-foundation-v0.76", "regional-data-v0.89", "model-scenario-validation-v0.91", "panel-observations-v1.2", "trade-network-v1.3", "comparison-gates-v1.25", "panel-inference-v1.25", "high-frequency-v1.3", "event-window-v1.3", "ui-language-v1.3", "high-frequency-v1.31", "event-window-v1.31", "hicp-migration-v1.31", "transformation-registry-v1.41", "stationarity-engine-v1.4", "var-engine-v1.41", "var-country-readiness-v1.41", "var-specification-profiles-v1.41"],
  limitations: [
    "No election forecasts, investment advice, probability forecasts, or causal impact estimates.",
    "Serbia regional comparison remains pending while national data remain available.",
    "China Economic Exposure and China-linked Project Disruption remain subject to their published evidence gates.",
  ],
} as const;

export const releaseChangelog = [
  ["v0.30 Data Foundation", "Separated countries, indicators, observations and sources into canonical research records.", "Introduced stable record identifiers and source/status fields.", "No breaking public-route change."],
  ["v0.35 Event Database", "Converted the news layer into a coded political economy event library.", "Events remain explanatory records and do not directly change scores.", "UI label changed from News to Events; /news remains stable."],
  ["v0.40 China Projects", "Standardized China-related project verification and project-to-indicator links.", "Unverified amounts remain missing; evidence gates control quantification.", "No China Exposure score was enabled."],
  ["v0.50 Transparent Models", "Added rule-based household, fiscal and external model cards and observation traces.", "Published normalization, weights, completeness and confidence rules.", "Model output is analytical comparison, not prediction."],
  ["v0.60 Scenarios", "Added conditional shock analysis with baseline/scenario comparison.", "Scenario values are isolated from canonical observations.", "No probability forecast or regional scenario score."],
  ["v0.70 Industrial Transmission", "Added industrial dependency and transmission inputs.", "FDI remains context-only where direction is not methodologically stable.", "No black-box supply-chain model."],
  ["v0.75 Cross-Country Data", "Aligned ten-country indicator templates and coverage reporting.", "Comparisons require common year, unit and definition.", "Missing values were not imputed."],
  ["v0.80 China Exposure", "Added dimension-first China exposure evidence structures.", "Overall output remains gated by comparable sufficient dimensions.", "Exposure is not political influence or risk."],
  ["v0.85 Spatial Foundation", "Registered regional keys, boundaries, licenses and public-display gates.", "Map access requires geometry, topology, key and source checks.", "No regional risk layer."],
  ["v0.88 Spatial Research", "Added factual regional comparison and project geography.", "Regional facts remain separate from national model scores.", "Cross-level value duplication is prohibited."],
  ["v0.89 Regional Economy", "Harmonized regional economic and historical-change records.", "Rankings require same level, definition, unit and year.", "Serbia regional comparison remains pending."],
  ["v0.90 Transmission Scenarios", "Linked shocks, adjusted inputs, models, regional context and evidence.", "Events and projects remain explanatory context only.", "Scenario formulas did not modify baseline observations."],
  ["v0.91 Validation", "Added deterministic validation, golden cases, boundary checks and CI blocking.", "Expected unavailable outputs are validated as gates, not numeric results.", "Historical reconstruction remains exploratory without vintage data."],
  ["v0.95 Research Release Candidate", "Added citation, stable research URLs, release metadata, trace UX and release QA.", "Public pages now use one current release status and a consolidated methodology.", "No new model, scenario, index or prediction."],
  ["v1.0 Research Atlas", "Froze the public research boundary, canonical release metadata, reproducible provenance and final release gates.", "Model and scenario definitions remain unchanged; validation semantics now separate numeric checks, gates and expected-unavailable cases.", "No public route, formula, weight, shock range or canonical observation schema was broken."],
  ["v1.1 Architecture & Interface Refactor", "Reorganized public pages around research workflows and moved technical records into progressive disclosure and a versioned research package.", "Registered future analysis skills without running unsupported estimates; models and scenario formulas remain unchanged.", "No canonical observation, formula, weight, validation gate or stable public route was broken."],
  ["v1.2 Advanced Analysis Data Foundation", "Added a traceable 2015–2025 annual panel, formal coverage gates and transparent OLS/fixed-effects estimation.", "Registered bilateral-network contracts and deterministic metrics while retaining data-building status until complete partner edges exist.", "Composite formulas, scenario formulas, regional maps and event coding remain unchanged."],
  ["v1.3 High-Frequency Political Economy, Event Analysis & Product Language System", "Added a monthly high-frequency layer (Eurostat HICP index/rate, harmonised unemployment, industrial production; 2015-01 onward, no interpolation) and activated descriptive Event Window Analysis with overlap warnings and explicit non-causal language.", "Network coverage gate now uses eligible partners only (aggregates are QA-only), with a per-run acquisition manifest; the interface now uses a central Chinese-first product language registry with mapped internal statuses.", "No causal event-study estimates, no VAR/Bayesian activation, no route or formula changes."],
  ["v1.25 Econometric Reliability, Cross-Country Comparability & Trade Network Activation", "Formal cross-country comparisons now require the same model version, formula, weight and input year; matrix columns read a single common year and never fall back to older data. Panel cluster-robust inference uses Student-t with G−1 degrees of freedom and explicit small-cluster gates.", "Activated the bilateral goods trade network (2015–2025, ten reporters, complete partner edges) with coverage gates and deterministic concentration metrics.", "No canonical observation, composite formula, weight, scenario shock or stable public route was broken. The research package filename now derives from canonical release metadata."],
  ["v1.31 High-Frequency Integrity & Event Semantics", "Migrated HICP to the merged Eurostat prc_hicp_minr dataset (ECOICOP ver.2, all-items TOTAL, single 2015=100 reference) with an overlap consistency QA and a migration manifest; coverage now follows the complete monthly axis with explicit missing-month detection and publication-lag status.", "Event Window Analysis now separates pre / event / post periods strictly (the event month never enters post means or post counts) and reports changes with explicit semantics: percentage points for rate series, index points plus relative percent for index series; charts break at missing months.", "No new analysis method was added; VAR readiness was recomputed on the corrected data and VAR / Local Projections / Bayesian VAR / causal event study remain inactive."],
  ["v1.4 Macro Dynamics & Reduced-Form VAR", "Activated single-country reduced-form VAR with a documented transformation layer (no raw index levels), ADF stationarity gates, common-sample AIC/BIC/HQIC lag selection, companion-root stability checks, Portmanteau residual diagnostics and orthogonalized reduced-form IRF with explicit ordering and no structural interpretation. Readiness is evaluated per country × variable set × window × transformation — one country's missing data never blocks the others.", "The engine is validated offline against statsmodels/numpy/scipy reference cases (coefficients, information criteria, roots, IRF paths, portmanteau statistics, ADF statistics and MacKinnon p-values).", "SVAR, Local Projections, Bayesian VAR and causal event study remain inactive; composite, panel, network, event-window and scenario definitions are unchanged."],
  ["v1.41 VAR Specification & Diagnostic Reliability", "Separated the pre-specified formal baseline from documented exploratory transformation search and replaced the ambiguous ready label with estimable versus dynamic-response-ready states.", "Fixed residual Portmanteau sensitivity horizons at 12, 18 and 24 months, added lag preflight and comparability signatures, and gated IRF on stationarity, stability, residual diagnostics and orthogonalization.", "Only a constant deterministic specification is public; residual LM, bootstrap intervals, SVAR, Local Projections and Bayesian VAR remain unavailable."],
] as const;

export function getResearchPackageFilename() {
  const match = /^v[\d.]+/.exec(PLATFORM_VERSION);
  if (!match) throw new Error(`Cannot derive version token from platform version: ${PLATFORM_VERSION}`);
  return `research-data-${match[0]}.zip`;
}

export function platformCitation(accessed = "YYYY-MM-DD") {
  return `${PLATFORM_NAME}, version ${PLATFORM_VERSION}, accessed ${accessed}. ${PLATFORM_BASE_URL}`;
}

export function platformApaCitation(accessed = "YYYY-MM-DD") {
  return `${PLATFORM_NAME}. (${PLATFORM_RELEASE_DATE.slice(0, 4)}). ${PLATFORM_NAME} (${PLATFORM_VERSION}). Retrieved ${accessed}, from ${PLATFORM_BASE_URL}`;
}

export function platformBibtexCitation(accessed = "YYYY-MM-DD") {
  return `@misc{${releaseConfig.citation_key},\n  title = {${PLATFORM_NAME}},\n  author = {{Central Europe Political Atlas}},\n  year = {${PLATFORM_RELEASE_DATE.slice(0, 4)}},\n  version = {${PLATFORM_VERSION}},\n  url = {${PLATFORM_BASE_URL}},\n  note = {Accessed ${accessed}}\n}`;
}
