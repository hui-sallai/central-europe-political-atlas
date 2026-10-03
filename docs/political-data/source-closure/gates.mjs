// Production 1B gate model (owner-review checkpoint). Single source for build-checkpoint.mjs, validate.mjs and the
// publisher response decision matrix. Rights and acquisition are separate gates; a gate is closed only by evidence.
// Reviewed 2026-10-03. No authority has been contacted.

export const RIGHTS_GATES = ['reuse_right', 'normalized_factual_republication_right', 'raw_redistribution_right', 'automated_acquisition_permission', 'manual_acquisition_permission', 'attribution_requirements', 'transformation_disclosure_requirements'];
export const PRODUCTION_GATES = ['source_files_complete', 'national_definition_complete', 'same_election_identity_complete', 'electoral_system_metadata_complete', 'vintage_decisions_complete'];
export const MATRIX_GATES = ['reuse_right', 'normalized_republication', 'raw_redistribution', 'automated_acquisition', 'manual_acquisition', ...PRODUCTION_GATES];
// Mandatory for normalized factual production. Raw redistribution is optional (variant 1B-B); automated acquisition is
// optional when manual acquisition is permitted (variant 1B-manual).
export const MANDATORY = ['reuse_right', 'normalized_republication', 'acquisition_route', ...PRODUCTION_GATES];
export const STATUSES = ['closed', 'partial', 'open', 'blocked'];

// value vocabularies (per gate kind)
export const VALUES = {
  reuse_right: ['supported_explicit', 'supported_pending_scope_confirmation', 'restricted_noncommercial_pending_applicability', 'unresolved', 'blocked'],
  normalized_factual_republication_right: ['cleared', 'supported_pending_scope_confirmation', 'restricted_noncommercial_pending_applicability', 'unresolved', 'blocked'],
  raw_redistribution_right: ['cleared', 'supported_pending_scope_confirmation', 'not_cleared', 'blocked'],
  automated_acquisition_permission: ['permitted_explicit', 'not_prohibited_no_explicit_permission', 'prohibited_by_publisher_terms', 'prohibited_for_ai_agents_by_robots', 'acquisition_unresolved'],
  manual_acquisition_permission: ['permitted_explicit', 'not_prohibited_public_download', 'acquisition_unresolved', 'prohibited'],
};

const ev = (path, sha256, note) => ({ path, sha256, note });

export const COUNTRY_GATES = {
  czechia: {
    publisher: 'Český statistický úřad (ČSÚ)',
    rights: {
      reuse_right: { value: 'supported_pending_scope_confirmation', status: 'open', closes_by: 'publisher_reply', basis: "ČSÚ terms: 'Statistické informace Českého statistického úřadu zveřejněné prostřednictvím internetových stránek https://csu.gov.cz jsou licencovány v souladu s CC BY 4.0'. The volby.gov.cz open-data index links these terms in its footer, but the operative sentence names csu.gov.cz, not volby.gov.cz.", evidence: [ev('local-evidence/5ddd322892a662f6d979cea4521343b4c011fe2d44dc493e78e7d4b5221d03b7.raw', '5ddd322892a662f6d979cea4521343b4c011fe2d44dc493e78e7d4b5221d03b7', 'CZSO terms page, retrieved 2026-10-03'), ev('local-evidence/157435aa7c2966f308f89601e14def573daa839647c4d122b830c940f70637a0.raw', '157435aa7c2966f308f89601e14def573daa839647c4d122b830c940f70637a0', 'volby.gov.cz/opendata/opendata.htm, footer links the CZSO terms')] },
      normalized_factual_republication_right: { value: 'supported_pending_scope_confirmation', status: 'open', closes_by: 'publisher_reply', basis: 'Would follow from CC BY 4.0 if the terms cover volby.gov.cz files.' },
      raw_redistribution_right: { value: 'supported_pending_scope_confirmation', status: 'open', closes_by: 'publisher_reply', basis: 'CC BY 4.0 permits redistribution only if it applies to these files; not inferred from factual reuse.' },
      automated_acquisition_permission: { value: 'not_prohibited_no_explicit_permission', status: 'partial', closes_by: 'publisher_reply', basis: 'volby.gov.cz robots.txt disallows only /pls/; CZSO terms contain no crawler clause. Absence of a prohibition is not a permission.' },
      manual_acquisition_permission: { value: 'not_prohibited_public_download', status: 'partial', closes_by: 'publisher_reply', basis: 'Public download pages; no restriction found.' },
      attribution_requirements: { value: 'documented_if_terms_apply', status: 'partial', basis: "Distributors must state the licence terms, preferably by linking the terms page (ČSÚ terms, 'Další podmínky')." },
      transformation_disclosure_requirements: { value: 'documented_if_terms_apply', status: 'partial', basis: "'upravené nebo odvozené údaje musí být označeny jako upravené nebo odvozené a nesmí být prezentovány jako nezměněné oficiální statistiky' (ČSÚ terms)." },
    },
    production: {
      source_files_complete: { status: 'partial', closes_by: 'documentary_work_after_acquisition_clearance', basis: 'Exact per-election package inventory complete for 2002–2025 (documentary_review.json); packages not acquired.' },
      national_definition_complete: { status: 'partial', closes_by: 'documentary_work_after_acquisition_clearance', basis: '2025 vysledky.xml observed 2026-10-02: PROC_HLASU = HLASY / PLATNE_HLASY; UCAST_PROC = VYDANE_OBALKY / ZAPSANI_VOLICI. 2002–2021 data-record definitions (PS_datovaveta) not inspected.' },
      same_election_identity_complete: { status: 'open', closes_by: 'documentary_work_after_acquisition_clearance', basis: 'Method documented (CVS.TYPVS, CVS_SLOZENI → CNS.NSTRANA); not executed. VSTRANA is described both as contestant code (CVS) and as ballot number drawn by lot (CVS_SLOZENI) — needs clarification.' },
      electoral_system_metadata_complete: { status: 'open', closes_by: 'documentary_work', basis: 'No dated review of thresholds/allocation per election; 2021 mandate-allocation description (RozdelovaniMandatuPS2021_Popis.pdf) linked but not inspected.' },
      vintage_decisions_complete: { status: 'open', closes_by: 'owner_decision', basis: '2017: original vs results recalculated under NSS resolution Vol 58/2017-173 (changes 2017-11-22). 2021: register packages 20211010 and 20211111 with NSS Vol 102/2021 linked.' },
    },
  },
  slovakia: {
    publisher: 'Štatistický úrad SR (ŠÚ SR)',
    rights: {
      reuse_right: { value: 'supported_pending_scope_confirmation', status: 'open', closes_by: 'publisher_reply', basis: "Terms page (last update 26.10.2020): information 'released by the Statistical Office of the SR through the website www.statistics.sk' may be disseminated, used and used commercially under CC BY 4.0. API help: 'All information is subject to the license terms of the Creative Commons Attribution License (cc-by) 4.0.' The election dataset list on volby.statistics.sk names all seven files under its open-government dataset statement. Remaining gap: the operative text names www.statistics.sk; the files are on volby.statistics.sk, and the election-specific open-data sentence is no longer on the live portal (portal restructured 2026-09-15).", evidence: [ev('local-evidence/e4a3ebc357fe7e117abb0957217b1307293966b0f9395b9b02dd8381b6faaed8.raw', 'e4a3ebc357fe7e117abb0957217b1307293966b0f9395b9b02dd8381b6faaed8', 'volby.statistics.sk/tree.html dataset list naming the seven files'), ev('manual-browser-review:https://slovak.statistics.sk/wps/portal/ext/aboutus/webpage/terms/', null, 'viewed 2026-10-03 by the agent in the interactive browser pane (single documentation page view, no data download); quoted, not archived — owner may re-confirm and archive manually'), ev('manual-browser-review:data.statistics.sk/api/html/help-en.html', null, 'viewed 2026-10-03 in browser; quoted, not archived')] },
      normalized_factual_republication_right: { value: 'supported_pending_scope_confirmation', status: 'open', closes_by: 'publisher_reply', basis: 'Terms permit dissemination and use under CC BY 4.0; applies if the election files are covered.' },
      raw_redistribution_right: { value: 'supported_pending_scope_confirmation', status: 'open', closes_by: 'publisher_reply', basis: "Terms explicitly allow 'copied, distributed and communicated to the public' — the same scope question applies. Third-party IP exclusion clause noted." },
      automated_acquisition_permission: { value: 'prohibited_by_publisher_terms', status: 'blocked', closes_by: 'publisher_reply', basis: "'Use of robots, spiders, crawlers and similar data gathering and extraction tools is expressly prohibited.' No further automated retrieval; the evidence script refuses statistics.sk hosts." },
      manual_acquisition_permission: { value: 'not_prohibited_public_download', status: 'partial', closes_by: 'publisher_reply', basis: 'Files are published for download; terms prohibit tools, not human download. Confirmation requested.' },
      attribution_requirements: { value: 'documented_if_terms_apply', status: 'partial', closes_by: 'publisher_reply', basis: "Terms wording (if they cover the election files): SO SR indicated as source without implying endorsement; mention CC BY 4.0 terms, preferably by direct link to www.statistics.sk." },
      transformation_disclosure_requirements: { value: 'documented_by_licence', status: 'partial', basis: 'CC BY 4.0 requires indicating changes; no publisher-specific wording found.' },
    },
    production: {
      source_files_complete: { status: 'partial', closes_by: 'owner_manual_action', basis: 'Seven national vote files archived; national summary (turnout) and seat-allocation tables are identified by name in the dataset list but not acquired.' },
      national_definition_complete: { status: 'partial', closes_by: 'owner_manual_action', basis: 'Published shares reproduce votes ÷ sum of party valid votes within 0.01 pp in all seven files; official national valid-vote total (summary table) not yet compared.' },
      same_election_identity_complete: { status: 'open', closes_by: 'owner_manual_action', basis: 'Subject lists identified (2016 tab20, 2020 tab0a, 2023 tab0a); none for 2002–2012 in the list; subject numbers are election-local.' },
      electoral_system_metadata_complete: { status: 'partial', closes_by: 'documentary_work', basis: '2016 date verified from Zbierka zákonov 307/2015 Z. z. (5 March 2016); thresholds/allocation per election not reviewed.' },
      vintage_decisions_complete: { status: 'partial', closes_by: 'documentary_work', basis: 'Final national files only; no correction notice found in reviewed material.' },
    },
  },
  poland: {
    publisher: 'Państwowa Komisja Wyborcza / Krajowe Biuro Wyborcze',
    rights: {
      reuse_right: { value: 'unresolved', status: 'open', closes_by: 'publisher_reply', basis: "DANE WYBORCZE 'Informacje prawne' page has no content ('Ta strona nie posiada jeszcze zawartości'). No operative dataset terms found; another ministry's terms are not substituted.", evidence: [ev('local-evidence/3d80457b90cf40367be2a5f865fbd5eee4b476e86b8c6cf411a7c35586b1c6fe.raw', '3d80457b90cf40367be2a5f865fbd5eee4b476e86b8c6cf411a7c35586b1c6fe', 'empty legal-information page, retrieved 2026-10-03')] },
      normalized_factual_republication_right: { value: 'unresolved', status: 'open', closes_by: 'publisher_reply', basis: 'No terms located.' },
      raw_redistribution_right: { value: 'not_cleared', status: 'open', closes_by: 'publisher_reply', basis: 'No terms located.' },
      automated_acquisition_permission: { value: 'not_prohibited_no_explicit_permission', status: 'partial', closes_by: 'publisher_reply', basis: 'danewyborcze.kbw.gov.pl has no robots.txt (HTTP 404); pkw.gov.pl robots.txt has no disallow rules. No permission statement.' },
      manual_acquisition_permission: { value: 'not_prohibited_public_download', status: 'partial', closes_by: 'publisher_reply', basis: 'Public download pages.' },
      attribution_requirements: { value: 'unknown', status: 'open', closes_by: 'publisher_reply', basis: 'No terms located.' },
      transformation_disclosure_requirements: { value: 'unknown', status: 'open', closes_by: 'publisher_reply', basis: 'No terms located; Atlas labels derived values regardless.' },
    },
    production: {
      source_files_complete: { status: 'partial', closes_by: 'documentary_work_after_acquisition_clearance', basis: 'Official list-result files located for all seven elections: district (okręg) level for 2001, 2005, 2015, 2019 and 2023; powiat level only for 2007 and 2011 (documentary_review.json). None acquired; national-total source (PKW results announcement) not located in the archive.' },
      national_definition_complete: { status: 'open', closes_by: 'documentary_work_after_acquisition_clearance', basis: 'National totals require either the official PKW announcement or a documented 41-district aggregation; neither performed.' },
      same_election_identity_complete: { status: 'open', closes_by: 'documentary_work_after_acquisition_clearance', basis: 'Committee lists located (2011 komitety.zip; 2019/2023 wykaz_list_sejm); committees ≠ parties.' },
      electoral_system_metadata_complete: { status: 'open', closes_by: 'documentary_work', basis: 'No dated threshold/minority-exemption review; 2007 date confirmed 21 October by KBW archive.' },
      vintage_decisions_complete: { status: 'open', closes_by: 'documentary_work', basis: 'Not reviewed.' },
    },
  },
  austria: {
    publisher: 'Bundesministerium für Inneres (BMI) / Bundeswahlbehörde',
    rights: {
      reuse_right: { value: 'restricted_noncommercial_pending_applicability', status: 'open', closes_by: 'publisher_reply', basis: "BMI Impressum: 'Die Übernahme von Beiträgen ist – unter Quellenangabe – gestattet (außer für kommerzielle Zwecke).' Whether 'Beiträge' covers the official result workbooks is unresolved.", evidence: [ev('local-evidence/d3f42c254b0f55302833b68754e633912ca8a0d9931097616d1aa4ed4ed4c355.raw', 'd3f42c254b0f55302833b68754e633912ca8a0d9931097616d1aa4ed4ed4c355', 'BMI Impressum, retrieved 2026-10-03')] },
      normalized_factual_republication_right: { value: 'restricted_noncommercial_pending_applicability', status: 'open', closes_by: 'publisher_reply', basis: 'Same clause; non-commercial limitation to be confirmed for data.' },
      raw_redistribution_right: { value: 'not_cleared', status: 'open', closes_by: 'publisher_reply', basis: "Not inferred from 'Übernahme von Beiträgen'." },
      automated_acquisition_permission: { value: 'prohibited_for_ai_agents_by_robots', status: 'blocked', closes_by: 'publisher_reply', basis: "bmi.gv.at robots.txt section '2. BLOCK ALL AI TRAINING SCRAPERS, LLM CRAWLERS & DISCOVERY ENGINES' disallows / for user agents including Anthropic-ai, Claude-Web and ChatGPT-User (observed 2026-10-03). Earlier AI-driven retrievals (2026-10-02 audit; 2026-10-03 checkpoint) are audit-only; no further BMI requests.", evidence: [ev('local-evidence/d262ff9a3e93789d700a40bfb3d5cc1aab6660a9f337f0a4240b763c4f231f14.raw', 'd262ff9a3e93789d700a40bfb3d5cc1aab6660a9f337f0a4240b763c4f231f14', 'bmi.gv.at/robots.txt, retrieved 2026-10-03T10:57Z')] },
      manual_acquisition_permission: { value: 'not_prohibited_public_download', status: 'partial', closes_by: 'publisher_reply', basis: 'Owner-performed browser download is not restricted by robots.txt; confirmation requested.' },
      attribution_requirements: { value: 'documented_for_beitraege', status: 'partial', basis: "'unter Quellenangabe' — source attribution; exact form for data to confirm." },
      transformation_disclosure_requirements: { value: 'unknown', status: 'open', closes_by: 'publisher_reply', basis: 'No wording found.' },
    },
    production: {
      source_files_complete: { status: 'partial', closes_by: 'owner_manual_action', basis: 'Per-election result-file links observed (2002 ZIP, 2006 XLS, 2008 zipped Excel, 2013–2024 XLSX); contents not inspected by the agent.' },
      national_definition_complete: { status: 'open', closes_by: 'owner_manual_action', basis: '2024 workbook (audit observation 2026-10-02): national row G00000 with Wahlberechtigte, Abgegebene, Ungültige, Gültige, party votes and %; seats only in the separate Mandatsspiegel. Earlier years uninspected.' },
      same_election_identity_complete: { status: 'open', closes_by: 'owner_manual_action', basis: 'Wahlwerbende Gruppe ≠ party; list abbreviations per election.' },
      electoral_system_metadata_complete: { status: 'open', closes_by: 'documentary_work', basis: 'Three-tier allocation (Regional-, Landes-, Bundeswahlkreis); dated review not done.' },
      vintage_decisions_complete: { status: 'open', closes_by: 'owner_manual_action', basis: 'Some linked seat tables are labelled provisional; final certified vintage per election to be identified.' },
    },
  },
};

const matrixFromRights = (r) => ({
  reuse_right: r.reuse_right,
  normalized_republication: r.normalized_factual_republication_right,
  raw_redistribution: r.raw_redistribution_right,
  automated_acquisition: r.automated_acquisition_permission,
  manual_acquisition: r.manual_acquisition_permission,
});

/** Gate matrix for one country with the derived overall readiness. READY only when every mandatory gate is closed. */
export function countryMatrix(country) {
  const c = COUNTRY_GATES[country];
  const gates = { ...matrixFromRights(c.rights), ...c.production };
  const acquisition = [gates.manual_acquisition, gates.automated_acquisition].some((g) => g.status === 'closed') ? 'closed' : [gates.manual_acquisition, gates.automated_acquisition].some((g) => g.status === 'partial') ? 'partial' : 'open';
  const mandatory = { reuse_right: gates.reuse_right.status, normalized_republication: gates.normalized_republication.status, acquisition_route: acquisition, ...Object.fromEntries(PRODUCTION_GATES.map((g) => [g, gates[g].status])) };
  const open = Object.entries(mandatory).filter(([, s]) => s !== 'closed').map(([g]) => g);
  return {
    country,
    publisher: c.publisher,
    gates: Object.fromEntries(Object.entries(gates).map(([k, g]) => [k, { status: g.status, value: g.value ?? null, closes_by: g.closes_by ?? null, basis: g.basis }])),
    mandatory_gate_status: mandatory,
    open_mandatory_gates: open,
    overall_readiness: open.length ? 'NOT_READY' : 'READY_FOR_OWNER_APPROVAL',
    variant_eligibility: {
      '1B-A_full_normalized': open.length === 0 && gates.raw_redistribution.status === 'closed',
      '1B-B_normalized_without_raw': open.length === 0,
      '1B-manual': open.length === 0 && gates.manual_acquisition.status === 'closed' && gates.automated_acquisition.status !== 'closed',
    },
  };
}
