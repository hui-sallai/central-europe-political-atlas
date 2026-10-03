// Legal / privacy / security governance — machine-checkable policy (ATLAS POLICY + ENGINEERING CONTROL, not law).
// Used by validate.mjs (pnpm legal-security:validate), person-safety.mjs (pnpm political-person-safety:validate) and
// tests/tooling/legal-security.test.mjs. Owner policy decision 2026-10-03: no political inference about identifiable
// natural persons; no Atlas-owned political forecasting.

// ---- Personal-data classes (P) and election-data classes (E) ----
export const PERSON_DATA_CLASSES = {
  P0: { label: 'no natural-person data', default: 'allowed' },
  P1: { label: 'minimal public-role factual data', default: 'allowed_if_necessary_sourced_minimal' },
  P2: { label: 'political affiliation / behaviour', default: 'not_admitted_into_person_profiles_separate_review' },
  P3: { label: 'explicit personal political opinion', default: 'blocked_from_analytical_dataset' },
  P4: { label: 'inferred / scored political opinion', default: 'prohibited_no_review_path' },
  P5: { label: 'ordinary voter / private-person political data', default: 'prohibited' },
};
export const ELECTION_DATA_CLASSES = {
  E0: { maps_to: 'P0', label: 'aggregate official election result', default: 'allowed' },
  E1: { maps_to: 'P0', label: 'partial / provisional official result', default: 'allowed_with_status_metadata', required: ['status', 'status_timestamp', 'coverage', 'source', 'retrieved_at'] },
  E2: { maps_to: 'P1', label: 'candidate public-result record', default: 'allowed_if_necessary_sourced_minimal' },
  E3: { maps_to: 'P2', label: 'person political behaviour', default: 'not_admitted_into_person_profiles_separate_review' },
  E4: { maps_to: 'P3', label: 'person political opinion', default: 'blocked_from_analytical_dataset' },
  E5: { maps_to: 'P4', label: 'inferred political opinion', default: 'prohibited_no_review_path' },
};

// ---- Result-status enum (no prediction values) ----
export const RESULT_STATUSES = ['official_final', 'official_corrected_final', 'official_provisional', 'official_partial', 'recount_in_progress', 'repeat_election_pending', 'court_adjusted', 'unknown'];
export const PROHIBITED_STATUS_VALUES = ['likely_winner', 'projected_winner', 'forecast_winner', 'expected_result', 'projected', 'forecast', 'predicted'];

/** E1 provisional/partial results must carry status metadata and never present as final. */
export function checkResultRecord(record) {
  const errors = [];
  const status = record.result_status ?? record.status;
  if (status !== undefined && !RESULT_STATUSES.includes(status)) errors.push(`result status '${status}' not in the permitted enum`);
  if (['official_provisional', 'official_partial', 'recount_in_progress'].includes(status)) {
    for (const field of ['status_timestamp', 'coverage', 'source', 'retrieved_at']) if (record[field] === undefined || record[field] === null || record[field] === '') errors.push(`${status} record missing ${field}`);
    if (record.is_final === true) errors.push(`${status} record presented as final`);
  }
  return errors;
}

// ---- Person-inference / prediction / profiling field patterns (compound, not single generic words) ----
const SEP = '[_\\-.\\s]?';
const t = (...words) => `(?:${words.join('|')})`;
export const BLOCKED_FIELD_PATTERNS = [
  ['ideology', new RegExp(`ideolog`, 'i')],
  ['person political attribute', new RegExp(`${t('political', 'politician', 'person', 'personal', 'voter', 'candidate', 'mp', 'mep', 'member', 'speaker', 'individual')}${SEP}${t('stance', 'orientation', 'profile', 'score', 'leaning', 'lean', 'opinion', 'belief', 'preference', 'sentiment', 'segment', 'cluster', 'position', 'attitude')}`, 'i')],
  ['scale score', new RegExp(`${t('left' + SEP + 'right', 'lrgen', 'lrecon', 'galtan', 'populis(?:m|t)', 'nationalis(?:m|t)', 'euroscep\\w*', 'extremis(?:m|t)', 'pro' + SEP + 'eu', 'anti' + SEP + 'eu', 'pro' + SEP + t('china', 'russia', 'kremlin'), 'liberal' + SEP + 'score', 'conservative' + SEP + 'score')}`, 'i')],
  ['orientation toward', new RegExp(`${t('eu', 'china', 'russia', 'nato', 'us', 'west', 'foreign' + SEP + 'policy', 'ideological', 'political')}${SEP}orientation`, 'i')],
  ['inferred or predicted', new RegExp(`${t('inferred', 'predicted', 'estimated', 'imputed', 'modelled', 'modeled')}${SEP}${t('stance', 'vote', 'support', 'ideology', 'opinion', 'orientation', 'preference', 'winner', 'seats?', 'turnout', 'result')}`, 'i')],
  ['vote intention', new RegExp(`${t('vote', 'voting', 'voter')}${SEP}${t('intention', 'intent', 'choice', 'propensity', 'likelihood')}`, 'i')],
  ['probability', new RegExp(`${t('win', 'winning', 'support', 'victory', 'seat', 'majority', 'coalition', 'candidate', 'government' + SEP + 'formation')}${SEP}${t('probability', 'prob', 'chance', 'odds')}`, 'i')],
  ['projection', new RegExp(`${t('likely', 'projected', 'forecast', 'expected', 'predicted')}${SEP}${t('winner', 'result', 'seats?', 'vote', 'outcome', 'share')}`, 'i')],
  ['election forecast', new RegExp(`${t('election', 'vote', 'seat', 'poll', 'party' + SEP + 'support', 'approval')}${SEP}${t('forecast', 'projection', 'prediction', 'nowcast', 'model')}`, 'i')],
  ['profiling', new RegExp(`${t('psychograph\\w*', 'micro' + SEP + 'target\\w*', 'political' + SEP + 'target\\w*', 'voter' + SEP + 'profil\\w*', 'politician' + SEP + 'profil\\w*', 'stance' + SEP + 'extract\\w*', 'speech' + SEP + t('class\\w*', 'sentiment'), 'behaviou?ral' + SEP + 'cluster\\w*')}`, 'i')],
  ['stance', new RegExp(`(?:^|[_\\-.])(?:stance|stances)(?:$|[_\\-.])`, 'i')],
];
export function blockedFieldReason(name) {
  const normal = String(name).replace(/([a-z])([A-Z])/g, '$1_$2');
  for (const [reason, re] of BLOCKED_FIELD_PATTERNS) if (re.test(normal)) return reason;
  return null;
}

// Person-like records: every key must be an allowlisted public-role field (P1/E2).
export const PERSON_MARKER_KEYS = ['person_id', 'politician_id', 'mp_id', 'mep_id', 'first_name', 'last_name', 'given_name', 'family_name', 'full_name', 'birth_date', 'date_of_birth'];
export const ALLOWED_PERSON_FIELDS = ['person_id', 'candidate_id', 'name', 'name_native', 'name_latin', 'given_name', 'family_name', 'office', 'office_id', 'role', 'official_role', 'term_start', 'term_end', 'valid_from', 'valid_to', 'constituency', 'constituency_id', 'candidacy', 'candidate_status', 'list_position', 'official_vote_count', 'preferential_votes', 'elected', 'election_id', 'contestant_id', 'cabinet_id', 'legislature_id', 'source_id', 'source_url', 'source_record_id', 'retrieved_at', 'provenance', 'notes'];
export function personRecordProblems(record) {
  const keys = Object.keys(record);
  if (!keys.some((k) => PERSON_MARKER_KEYS.includes(k))) return [];
  return keys.filter((k) => !ALLOWED_PERSON_FIELDS.includes(k)).map((k) => `person-like record field '${k}' is not an allowlisted public-role field`);
}

// Atlas-generated person characterisations (natural language). Attributed quotations need an explicit reviewed record.
export const PERSON_LABEL_TERMS = /(极右|极左|民粹主义者|民粹|疑欧|亲俄|亲华|亲中|民族主义者|极端主义者|极端分子|far[- ]right|far[- ]left|populist|eurosceptic|euroskeptic|pro-russian|pro-chinese|pro-kremlin|nationalist|extremist|anti-immigration|economically liberal|socially conservative)/i;

// ---- Source rights (fail closed) ----
export const RIGHTS_FIELDS = ['source_id', 'institution', 'dataset', 'exact_source_url', 'terms_url', 'licence_name', 'licence_version', 'reuse_right', 'normalized_republication', 'derived_values', 'raw_redistribution', 'commercial_use', 'noncommercial_only', 'manual_acquisition', 'automated_acquisition', 'third_party_rights_possible', 'attribution_required', 'required_attribution_text', 'modification_disclosure_required', 'database_right_status', 'publisher_confirmation_required', 'evidence_reference', 'evidence_sha256', 'reviewed_at', 'review_status'];
const CLEARED = new Set(['cleared', 'cleared_noncommercial', 'cleared_with_conditions']);
export function canExport(source, kind) {
  if (!source) return { ok: false, reason: 'unknown source — fail closed' };
  if (source.review_status === 'blocked') return { ok: false, reason: 'blocked source' };
  if (kind === 'normalized') return CLEARED.has(source.normalized_republication) ? { ok: true } : { ok: false, reason: `normalized republication ${source.normalized_republication}` };
  if (kind === 'derived') return CLEARED.has(source.derived_values) ? { ok: true } : { ok: false, reason: `derived values ${source.derived_values}` };
  if (kind === 'raw') return CLEARED.has(source.raw_redistribution) ? { ok: true } : { ok: false, reason: `raw redistribution ${source.raw_redistribution}` };
  return { ok: false, reason: `unknown export kind ${kind}` };
}

// ---- Network acquisition (unknown host = block) ----
export function canAcquire(registry, url, mode) {
  let host;
  try { host = new URL(url).hostname; } catch { return { ok: false, reason: 'invalid URL' }; }
  const entry = registry.hosts.find((h) => h.host === host || (h.include_subdomains && host.endsWith(`.${h.host}`)));
  if (!entry) return { ok: false, reason: `unknown host ${host} — blocked` };
  if (entry.status === 'blocked') return { ok: false, reason: `host ${host} blocked: ${entry.reason ?? ''}`.trim() };
  if (mode === 'automated' && entry.automation_allowed !== true) return { ok: false, reason: `automated acquisition not allowed for ${host}` };
  if (mode === 'manual' && entry.manual_allowed !== true) return { ok: false, reason: `manual acquisition not allowed for ${host}` };
  return { ok: true, entry };
}

// ---- Client storage and third-party runtime ----
export const CLIENT_STORAGE_ALLOWLIST = [
  { key: 'central-europe-atlas:research-notebook:v1', api: 'localStorage', purpose: 'Research Notebook (user-created notes and collected evidence; stays in the browser)', class: 'functional_user_requested' },
  { key: 'atlas-theme', api: 'localStorage', purpose: 'light/dark appearance preference', class: 'functional_preference' },
];
export const TRACKER_PATTERNS = /(google-analytics\.com|googletagmanager\.com|gtag\(|\bga\(\s*['"](?:create|send|set)|analytics\.js|doubleclick\.net|googlesyndication|adservice|facebook\.net|connect\.facebook|fbq\(\s*['"]|hotjar|clarity\.ms|plausible\.io|matomo|piwik|segment\.(?:io|com)|mixpanel|amplitude|newrelic|sentry\.io|cloudflareinsights|static\.addtoany|platform\.twitter\.com|widgets\.js|linkedin\.com\/insight|tiktok\.com\/i18n\/pixel|yandex\.ru\/metrika|pixel\.gif)/i;
export function externalScriptSources(html, siteHost) {
  return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]).filter((src) => /^(?:https?:)?\/\//i.test(src) && !src.includes(siteHost));
}

// ---- URL safety ----
export function isUnsafeUrl(value) {
  const v = String(value).trim().toLowerCase().replace(/[\u0000-\u001f\s]/g, '');
  return /^(javascript|vbscript|file):/.test(v) || (/^data:/.test(v) && !/^data:image\/(png|jpeg|gif|webp);base64,/.test(v));
}

// ---- CSV formula injection ----
export function csvFormulaSafe(value) {
  if (typeof value !== 'string') return value;
  if (/^[+-]?(\d+([.,]\d+)?|[.,]\d+)([eE][+-]?\d+)?$/.test(value.trim())) return value;
  return /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
}

// ---- Site operating mode (owner-governed) ----
export const SITE_OPERATING_MODES = ['noncommercial_research', 'COMMERCIAL_MODE_REVIEW_REQUIRED'];

// Public no-profiling statements (exact text required on the zh/en Privacy and Legal pages).
export const NO_PROFILING_ZH = '平台不建立个人政治观点画像，不根据个人言论、投票行为、社交媒体、党派关系或其他信息推断自然人的政治观点、意识形态、投票意向或未来政治行为。';
export const NO_PROFILING_EN = "The Atlas does not build personal political-opinion profiles and does not infer an identifiable person's political opinions, ideology, voting intentions or future political behaviour from speech, voting records, social media, party affiliation or other information.";
