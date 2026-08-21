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
  data_schema_versions: ["data-foundation-v0.76", "regional-data-v0.89", "model-scenario-validation-v0.91", "panel-observations-v1.2", "trade-network-v1.2"],
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
] as const;

export function platformCitation(accessed = "YYYY-MM-DD") {
  return `${PLATFORM_NAME}, version ${PLATFORM_VERSION}, accessed ${accessed}. ${PLATFORM_BASE_URL}`;
}

export function platformApaCitation(accessed = "YYYY-MM-DD") {
  return `${PLATFORM_NAME}. (${PLATFORM_RELEASE_DATE.slice(0, 4)}). ${PLATFORM_NAME} (${PLATFORM_VERSION}). Retrieved ${accessed}, from ${PLATFORM_BASE_URL}`;
}

export function platformBibtexCitation(accessed = "YYYY-MM-DD") {
  return `@misc{${releaseConfig.citation_key},\n  title = {${PLATFORM_NAME}},\n  author = {{Central Europe Political Atlas}},\n  year = {${PLATFORM_RELEASE_DATE.slice(0, 4)}},\n  version = {${PLATFORM_VERSION}},\n  url = {${PLATFORM_BASE_URL}},\n  note = {Accessed ${accessed}}\n}`;
}
