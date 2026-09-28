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
  data_schema_versions: ["data-foundation-v0.76", "regional-data-v0.89", "model-scenario-validation-v0.91", "panel-observations-v1.2", "trade-network-v1.3", "comparison-gates-v1.25", "panel-inference-v1.25", "high-frequency-v1.31", "high-frequency-definition-registry-v1.83", "historical-extension-research-conclusion-v1.83", "event-window-v1.31", "transformation-registry-v1.41", "seasonal-adf-critical-values-v1.44", "var-engine-v1.44", "var-capability-status-v1.88", "var-country-lag-identifiability-results-v1.88", "var-phase-b-bootstrap-results-v1.88", "var-country-matched-bootstrap-research-conclusion-v1.89", "var-residual-attribution-research-conclusion-v1.90", "var-dynamic-response-publication-boundary-v2.0", "var-diagnostic-research-program-closure-v2.0", "var-lag-characterization-research-conclusion-v1.87", "var-selection-bootstrap-research-conclusion-v1.86", "var-residual-diagnostic-research-conclusion-v1.85", "var-residual-diagnostic-layerB-selection-decomposition-v1.851", "macro-driver-observations-v1.51", "monetary-policy-event-observations-v1.6", "shock-identification-registry-v1.62", "information-effect-separation-validation-v1.62", "lp-readiness-registry-v1.72", "lp-results-v1.71", "lp-validation-summary-v1.71", "lp-inference-registry-v1.71", "lp-model-diagnostic-summary-v1.71", "analysis-skill-registry-v2.0", "panel-lp-model-comparison-v1", "panel-lp-path-inference-registry-v1.82", "panel-lp-joint-inference-research-conclusion-v1.82"],
  limitations: [
    "No election forecasts, investment advice, probability forecasts, or causal claims outside the preregistered identified-shock Local Projection profile.",
    "Serbia regional comparison remains pending while national data remain available.",
    "China Economic Exposure and China-linked Project Disruption remain subject to their published evidence gates.",
    "Fixed-eight-country Panel LP publishes pointwise inference only; whole-path simultaneous inference was studied and remains blocked after the current program did not confirm 95% joint coverage.",
    "The fixed-eight-country four-outcome historical extension is closed and blocked under current official definition evidence; the 2015 baseline is retained.",
    "Reduced-form VAR coefficient estimation is active, but the current formal baselines have zero dynamic-response-ready countries; no formal orthogonalized IRF is currently publishable.",
    "The VAR dynamic-response residual publication gate is unresolved (no validated finite-sample diagnostic after v1.85-v1.90); historical asymptotic Portmanteau results are retained as evidence, not as proof of misspecification, and the research program is frozen.",
    "The v1.85 residual-diagnostic calibration research is closed with no eligible replacement: the h=12 adjusted Portmanteau gate is retained, the current lag-selection + residual-diagnostic procedure failed the preregistered joint gate (Layer-B rejection rates are procedure rates, not pure diagnostic size), and Edgerton–Shukur is not an authorized gate.",
    "The v1.86 selection-aware bootstrap calibration passed a preregistered synthetic gate only; it is research-only, has not been evaluated on real-country data, and does not change the production diagnostic or IRF availability.",
    "The v1.88 country lag-identifiability audit and Phase-B bootstrap results are research evidence for the five formal estimable country models; they do not change readiness, the production diagnostic or IRF availability.",
    "The v1.89 country-matched calibration found the research bootstrap diagnostic materially conservative with weak power in the intermediate lag-2 region; it does not support production adoption, and no production change is authorized.",
    "The v1.90 residual attribution study is descriptive: residual dependence in the five formal country VARs is weak and diffuse, and its diagnostic-only probes are not specifications; no production change is authorized.",
  ],
} as const;

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
