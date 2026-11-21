// Owner-approved political country admissions (docs/legal-security/political_admission_records.json), one exact record
// per admitted election. Only NEW files under src/data/political/<country>/ and public/research-data/political/<country>/
// may be approved — never Germany, never an existing baseline file — each at its exact sha256, and only while the
// admission's gate record (every mandatory gate closed) is present at its recorded sha256.
export const POLITICAL_ADMISSION_FILE = 'docs/legal-security/political_admission_records.json';
export const MANDATORY_ADMISSION_GATES = ['reuse_right', 'normalized_republication', 'acquisition_route', 'source_files_complete', 'national_definition_complete', 'same_election_identity_complete', 'electoral_system_metadata_complete', 'vintage_decisions_complete'];
const STORES = ['elections', 'election_turnout', 'election_results', 'electoral_contestants', 'legislatures', 'electoral_systems', 'political_source_registry'];
const CZECH_PATHS = [
  ...STORES.map((s) => `src/data/political/czechia/${s}.json`),
  ...STORES.flatMap((s) => [`public/research-data/political/czechia/${s}.json`, `public/research-data/political/czechia/${s}.csv`]),
  'public/research-data/political/czechia/README.md',
  'public/research-data/political/czechia/manifest.json',
];
const CZECH_IDENTITY_STORES = ['political_parties', 'contestant_members', 'party_identity_links'];
const CZECH_IDENTITY_PATHS = [
  ...CZECH_PATHS,
  ...CZECH_IDENTITY_STORES.flatMap((s) => [`src/data/political/czechia/${s}.json`, `public/research-data/political/czechia/${s}.json`, `public/research-data/political/czechia/${s}.csv`]),
];
const POLISH_STORES = [...STORES, 'political_parties', 'contestant_members', 'party_identity_links'];
const POLISH_PATHS = [
  ...POLISH_STORES.map((s) => `src/data/political/poland/${s}.json`),
  ...POLISH_STORES.flatMap((s) => [`public/research-data/political/poland/${s}.json`, `public/research-data/political/poland/${s}.csv`]),
  'public/research-data/political/poland/README.md',
  'public/research-data/political/poland/manifest.json',
];
const SLOVAK_PATHS = [
  ...STORES.map((s) => `src/data/political/slovakia/${s}.json`),
  ...STORES.flatMap((s) => [`public/research-data/political/slovakia/${s}.json`, `public/research-data/political/slovakia/${s}.csv`]),
  'public/research-data/political/slovakia/README.md',
  'public/research-data/political/slovakia/manifest.json',
];
const HUNGARIAN_PATHS = [
  ...STORES.map((s) => `src/data/political/hungary/${s}.json`),
  ...STORES.flatMap((s) => [`public/research-data/political/hungary/${s}.json`, `public/research-data/political/hungary/${s}.csv`]),
  'public/research-data/political/hungary/README.md',
  'public/research-data/political/hungary/manifest.json',
];
const SERBIAN_PATHS = [
  ...STORES.map((s) => `src/data/political/serbia/${s}.json`),
  ...STORES.flatMap((s) => [`public/research-data/political/serbia/${s}.json`, `public/research-data/political/serbia/${s}.csv`]),
  'public/research-data/political/serbia/README.md',
  'public/research-data/political/serbia/manifest.json',
];
const CROATIAN_PATHS = [
  ...STORES.map((s) => `src/data/political/croatia/${s}.json`),
  ...STORES.flatMap((s) => [`public/research-data/political/croatia/${s}.json`, `public/research-data/political/croatia/${s}.csv`]),
  'public/research-data/political/croatia/README.md',
  'public/research-data/political/croatia/manifest.json',
];
const SLOVENIAN_PATHS = [
  ...STORES.map((s) => `src/data/political/slovenia/${s}.json`),
  ...STORES.flatMap((s) => [`public/research-data/political/slovenia/${s}.json`, `public/research-data/political/slovenia/${s}.csv`]),
  'public/research-data/political/slovenia/README.md',
  'public/research-data/political/slovenia/manifest.json',
];
const ROMANIAN_PATHS = [
  ...STORES.map((s) => `src/data/political/romania/${s}.json`),
  ...STORES.flatMap((s) => [`public/research-data/political/romania/${s}.json`, `public/research-data/political/romania/${s}.csv`]),
  'public/research-data/political/romania/README.md',
  'public/research-data/political/romania/manifest.json',
];
const AUSTRIAN_PATHS = [
  ...STORES.map((s) => `src/data/political/austria/${s}.json`),
  ...STORES.flatMap((s) => [`public/research-data/political/austria/${s}.json`, `public/research-data/political/austria/${s}.csv`]),
  'public/research-data/political/austria/README.md',
  'public/research-data/political/austria/manifest.json',
];
// Later admissions of a country share its files; each record's gate record stays required, and the last record's hashes apply.
export const POLITICAL_ADMISSIONS = {
  'czechia-ps-2025': { approved_on: '2026-10-25', country: 'czechia', gate_record: 'docs/political-data/czechia_ps2025_admission.json', paths: CZECH_PATHS },
  'czechia-ps-2017-2021': { approved_on: '2026-11-02', country: 'czechia', gate_record: 'docs/political-data/czechia_ps2017_2021_admission.json', paths: CZECH_PATHS },
  'czechia-identity': { approved_on: '2026-11-03', country: 'czechia', gate_record: 'docs/political-data/czechia_identity_admission.json', paths: CZECH_IDENTITY_PATHS },
  // Owner brief 2026-11-21 (Slovakia and Czechia historical expansion) and answer "Accept ČSÚ general terms": Czechia 2010 and 2013.
  'czechia-ps-2010-2013': { approved_on: '2026-11-21', country: 'czechia', gate_record: 'docs/political-data/czechia_ps2010_2013_admission.json', paths: CZECH_IDENTITY_PATHS },
  // Owner reply 'do it' (2026-11-21) extending the ČSÚ-terms answer: Czechia 2006 and 2002.
  'czechia-ps-2002-2006': { approved_on: '2026-11-21', country: 'czechia', gate_record: 'docs/political-data/czechia_ps2002_2006_admission.json', paths: CZECH_IDENTITY_PATHS },
  'poland-sejm-2011-2023': { approved_on: '2026-11-03', country: 'poland', gate_record: 'docs/political-data/poland_sejm_admission.json', paths: POLISH_PATHS },
  'poland-evidence-links': { approved_on: '2026-11-03', country: 'poland', gate_record: 'docs/political-data/poland_evidence_links_admission.json', paths: POLISH_PATHS },
  'slovakia-nrsr-2023': { approved_on: '2026-11-03', country: 'slovakia', gate_record: 'docs/political-data/slovakia_nrsr2023_admission.json', paths: SLOVAK_PATHS },
  'hungary-ogy-2022-2026': { approved_on: '2026-11-05', country: 'hungary', gate_record: 'docs/political-data/hungary_ogy_admission.json', paths: HUNGARIAN_PATHS },
  // Owner decision C, 2026-11-15 ("start everything"; "选 b，两个都做"): National Assembly 2020 and 2026 from RIK total-results reports.
  'serbia-nsk-2020-2026': { approved_on: '2026-11-15', country: 'serbia', gate_record: 'docs/political-data/serbia_nsk_admission.json', paths: SERBIAN_PATHS },
  // Owner reply "do it", 2026-11-15: National Assembly 2023 from the Assembly page reproducing the result (seat-winning lists only).
  'serbia-nsk-2023': { approved_on: '2026-11-15', country: 'serbia', gate_record: 'docs/political-data/serbia_nsk2023_admission.json', paths: SERBIAN_PATHS },
  // Owner brief, 2026-11-15: 2022 admitted and 2023 upgraded to the full RIK reports (sessions 79 and 51); the Assembly page stays a reference.
  'serbia-nsk-2022-2023-rik': { approved_on: '2026-11-15', country: 'serbia', gate_record: 'docs/political-data/serbia_nsk2022_2023_admission.json', paths: SERBIAN_PATHS },
  'slovakia-rights-evidence': { approved_on: '2026-11-04', country: 'slovakia', gate_record: 'docs/political-data/slovakia_rights_evidence_admission.json', paths: SLOVAK_PATHS },
  // Owner brief 2026-11-18 (ten-country parliamentary elections) with answers "Accept for all four" and "Register both":
  // Croatian Parliament 2015, 2016, 2020 and 2024 from the State Electoral Commission's final-results decisions.
  'croatia-sabor-2015-2024': { approved_on: '2026-11-18', country: 'croatia', gate_record: 'docs/political-data/croatia_sabor_admission.json', paths: CROATIAN_PATHS },
  // Same brief and answers: Slovenian National Assembly 2026 from the commission's minutes (Uradni list RS 197/2026).
  'slovenia-dz-2026': { approved_on: '2026-11-18', country: 'slovenia', gate_record: 'docs/political-data/slovenia_dz_admission.json', paths: SLOVENIAN_PATHS },
  // Owner reply "continue", 2026-11-18: Croatia 2011 (decision figures, workbook names matched by votes).
  'croatia-sabor-2011': { approved_on: '2026-11-18', country: 'croatia', gate_record: 'docs/political-data/croatia_sabor2011_admission.json', paths: CROATIAN_PATHS },
  // Owner reply "continue", 2026-11-18: Slovenia 2014, 2018 and 2022 from the commission's own result documents (2026 unchanged).
  'slovenia-dz-2014-2022': { approved_on: '2026-11-18', country: 'slovenia', gate_record: 'docs/political-data/slovenia_dz2014_2022_admission.json', paths: SLOVENIAN_PATHS },
  // Owner answers "both" and "ii then i", 2026-11-18: Romania 2016, Chamber of Deputies and Senate, from AEP files on data.gov.ro.
  'romania-parliament-2016': { approved_on: '2026-11-18', country: 'romania', gate_record: 'docs/political-data/romania_parliament2016_admission.json', paths: ROMANIAN_PATHS },
  // Owner answer "both" (owner saves the 2024 files) and the supplied RF_2.pdf / RF_3.pdf, 2026-11-18: Romania 2024 from the BEC final acts.
  'romania-parliament-2024': { approved_on: '2026-11-18', country: 'romania', gate_record: 'docs/political-data/romania_parliament2024_admission.json', paths: ROMANIAN_PATHS },
  // Owner brief and answers "Accept for all four" (UrhG § 7) and "I'll download files myself", 2026-11-18: Austria 2013–2024 from the owner-saved BMI files.
  'austria-nationalrat-2013-2024': { approved_on: '2026-11-18', country: 'austria', gate_record: 'docs/political-data/austria_nationalrat_admission.json', paths: AUSTRIAN_PATHS },
  // Owner brief "Four-country election completion", 2026-11-19: Austria 2002 (owner-saved legacy workbook) and Slovenia 2011 (commission report).
  'austria-nationalrat-2002': { approved_on: '2026-11-19', country: 'austria', gate_record: 'docs/political-data/austria_nationalrat2002_admission.json', paths: AUSTRIAN_PATHS },
  'slovenia-dz-2011': { approved_on: '2026-11-19', country: 'slovenia', gate_record: 'docs/political-data/slovenia_dz2011_admission.json', paths: SLOVENIAN_PATHS },
  // Same brief, 2026-11-19: decisions and archive pages the owner saved by hand from the exact links supplied. Croatia
  // 2000, 2003 and 2007; Slovenia 2004 and 2008 (official result pages) and the 2011 polling-station cross-check.
  'croatia-sabor-2000-2007': { approved_on: '2026-11-19', country: 'croatia', gate_record: 'docs/political-data/croatia_sabor2000_2007_admission.json', paths: CROATIAN_PATHS },
  'slovenia-dz-2004-2008': { approved_on: '2026-11-19', country: 'slovenia', gate_record: 'docs/political-data/slovenia_dz2004_2008_admission.json', paths: SLOVENIAN_PATHS },
  'slovenia-dz-2000': { approved_on: '2026-11-19', country: 'slovenia', gate_record: 'docs/political-data/slovenia_dz2000_admission.json', paths: SLOVENIAN_PATHS },
  'romania-parliament-2020': { approved_on: '2026-11-19', country: 'romania', gate_record: 'docs/political-data/romania_parliament2020_admission.json', paths: ROMANIAN_PATHS },
  'romania-parliament-2012': { approved_on: '2026-11-19', country: 'romania', gate_record: 'docs/political-data/romania_parliament2012_admission.json', paths: ROMANIAN_PATHS },
  'croatia-sabor-1995': { approved_on: '2026-11-19', country: 'croatia', gate_record: 'docs/political-data/croatia_sabor1995_admission.json', paths: CROATIAN_PATHS },
  'croatia-sabor-1992': { approved_on: '2026-11-19', country: 'croatia', gate_record: 'docs/political-data/croatia_sabor1992_admission.json', paths: CROATIAN_PATHS },
  'croatia-zupanijski-dom-1993': { approved_on: '2026-11-19', country: 'croatia', gate_record: 'docs/political-data/croatia_zupanijski_dom1993_admission.json', paths: CROATIAN_PATHS },
  // Owner brief 2026-11-20 (historical backfill) and answer "Same scope as 2022": Hungary 2014 and 2018 from the national-list minutes and composition pages.
  'hungary-ogy-2014-2018': { approved_on: '2026-11-20', country: 'hungary', gate_record: 'docs/political-data/hungary_ogy2014_2018_admission.json', paths: HUNGARIAN_PATHS },
  // Same brief, answer "Austria: read RIS notice": the 2024 polling day sourced to BGBl. II Nr. 169/2024 (metadata only).
  'austria-nationalrat-2024-polling-day': { approved_on: '2026-11-20', country: 'austria', gate_record: 'docs/political-data/austria_nationalrat2024_polling_day_admission.json', paths: AUSTRIAN_PATHS },
  // Same brief, answer "Romania: cite IPU Parline": secondary explanation of the two unfilled 2024 Senate seats (metadata only).
  // Owner brief 2026-11-20 (gap closure) and answer "National figures per tier": Hungary 2010 (386 seats, two rounds, three tiers).
  'hungary-ogy-2010': { approved_on: '2026-11-20', country: 'hungary', gate_record: 'docs/political-data/hungary_ogy2010_admission.json', paths: HUNGARIAN_PATHS },
  'romania-senate-2024-vacancy-note': { approved_on: '2026-11-20', country: 'romania', gate_record: 'docs/political-data/romania_senate2024_vacancy_note_admission.json', paths: ROMANIAN_PATHS },
  'austria-nationalrat-2006-2008': { approved_on: '2026-11-19', country: 'austria', gate_record: 'docs/political-data/austria_nationalrat2006_2008_admission.json', paths: AUSTRIAN_PATHS },
};
const flags = ['germany_change_allowed', 'canonical_data_change_allowed', 'model_change_allowed', 'research_gate_change_allowed', 'release_version_change_allowed'];
const admissiblePath = (file, country) => country !== 'germany' && /^[a-z]+$/.test(country) && (file.startsWith(`src/data/political/${country}/`) || file.startsWith(`public/research-data/political/${country}/`));

/** Returns approved {path -> sha256} for new political files, or problems (fail closed). hashOf(path) verifies gate records. */
export function approvedPoliticalAdmissionFiles(records, hashOf = () => null) {
  const approved = new Map(), problems = [];
  for (const r of records ?? []) {
    if (r.status !== 'owner_approved') continue;
    const admission = POLITICAL_ADMISSIONS[r.admission_id];
    if (!admission || r.approved_on !== admission.approved_on || r.country !== admission.country) { problems.push(`Unexpected political admission: ${r.admission_id}`); continue; }
    if (r.baseline !== 'd68d0e10fa0c83b57e044af02e352379aa9e9d2d') problems.push('Unexpected political admission baseline');
    if (!/official-total reconciliation and closed admission gate record$/.test(r.verification ?? '')) problems.push('Political admission verification required');
    for (const flag of flags) if (r[flag] !== false) problems.push(`${flag} must be false`);
    if (r.gate_record !== admission.gate_record || !/^[0-9a-f]{64}$/.test(r.gate_record_sha256 ?? '') || hashOf(r.gate_record) !== r.gate_record_sha256) problems.push(`${r.admission_id}: gate record missing or changed`);
    if (JSON.stringify([...(r.gates_closed ?? [])].sort()) !== JSON.stringify([...MANDATORY_ADMISSION_GATES].sort())) problems.push(`${r.admission_id}: every mandatory gate must be recorded closed`);
    const allowed = new Set(admission.paths), seen = new Set();
    for (const f of r.files ?? []) {
      if (!allowed.has(f.path) || seen.has(f.path) || !admissiblePath(f.path, admission.country)) problems.push(`Not an exact admissible political path: ${f.path}`);
      if (!/^[0-9a-f]{64}$/.test(f.sha256 ?? '')) problems.push(`Missing political admission hash: ${f.path}`);
      seen.add(f.path); approved.set(f.path, f.sha256);
    }
    if (seen.size !== allowed.size) problems.push('Incomplete political admission file set');
  }
  return { approved, problems };
}

/** Research package rule: a non-German country's political member must be an admitted file at its exact admitted hash. */
export function politicalPackageMemberProblem(name, sha256, approved) {
  const match = name.match(/(^|\/)political\/([a-z]+)\/(.+)$/i);
  if (!match || match[2].toLowerCase() === 'germany') return null;
  return approved.get(`public/research-data/political/${match[2]}/${match[3]}`) === sha256 ? null : `${name}: political data without an exact owner admission`;
}
