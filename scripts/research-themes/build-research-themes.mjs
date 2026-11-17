#!/usr/bin/env node
// Thematic research layer (owner brief of 2026-11-17: industrial policy, investment, energy and EU funding).
// Validates the authored records in src/lib/research-themes/ against the existing Atlas stores and derives
// thematic_index.json (indicator catalogue, enriched event-indicator mappings, country × theme coverage, dated
// chronologies and descriptive evidence windows) plus CSV exports in docs/research-themes/.
// Read-only towards every existing store: observations are copied with their ids, never edited, filled or interpolated.
//   node scripts/research-themes/build-research-themes.mjs          → validate and write
//   node scripts/research-themes/build-research-themes.mjs --check  → validate and fail if outputs are stale
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = 'src/lib/research-themes';
const DOCS = 'docs/research-themes';
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const INPUTS = ['meta.json', 'themes.json', 'event_mappings.json', 'investment_records.json', 'eu_funding.json', 'cases.json'].map((f) => `${DIR}/${f}`);
const STORES = {
  events: 'public/research-data/events.json',
  projects: 'src/data/projects/projects.json',
  indicators: 'src/data/indicators/indicators.json',
  regions: 'public/research-data/regions.json',
  canonical_annual: 'src/data/observations/observations.json',
  historical_annual: 'src/data/historical/annual_descriptive_history.json',
  high_frequency_monthly: 'src/data/high-frequency/high_frequency_observations.json',
  historical_monthly: 'src/data/historical/monthly_descriptive_history.json',
  macro_driver_monthly: 'src/data/macro-drivers/macro_driver_observations.json',
  sors_annual: 'src/data/serbia/serbia_descriptive_history_annual.json',
  sors_monthly: 'src/data/serbia/serbia_descriptive_history_monthly.json',
  sors_regional: 'src/data/serbia/serbia_descriptive_history_regional.json',
  regional_annual: 'public/research-data/region_observations.json',
  regional_history: 'src/data/historical/regional_descriptive_history.json',
  regional_history_manifest: 'src/data/historical/regional_history_manifest.json',
  implementation: 'src/lib/eventImplementationEvidence.ts',
  event_analysis: 'src/lib/eventAnalysisLinks.ts',
};

/** overrides: { 'themes.json': {...}, ... } replaces authored inputs in memory (used by the tooling tests). */
export function build(overrides = {}) {
  const errors = [];
  const fail = (m) => errors.push(m);
  const input = (i) => structuredClone(overrides[path.basename(INPUTS[i])] ?? json(INPUTS[i]));
  const meta = input(0);
  const { themes } = input(1);
  const mappingsDoc = input(2);
  const { records: investments } = input(3);
  const funding = input(4);
  const { cases } = input(5);
  const COUNTRIES = meta.countries;
  const REL = ['A', 'B', 'C', 'D', 'E'];

  // ---------------- reference stores ----------------
  const events = new Map(json(STORES.events).records.map((e) => [e.event_id, e]));
  const projects = new Map(json(STORES.projects).records.map((p) => [p.id, p]));
  const indicatorRegistry = new Map(json(STORES.indicators).records.map((i) => [i.id, i]));
  const regions = new Map(json(STORES.regions).records.map((r) => [r.region_id, r]));
  const regionByAdmin = new Map([...regions.values()].map((r) => [r.admin_code, r.region_id]));
  const series = new Map(); // key layer|indicator|geo|transformation → rows
  const sourceInfo = new Map(); // key layer|indicator → {dataset, unit, definition, url}
  const put = (layer, ind, geo, tr, row, info) => {
    const k = [layer, ind, geo, tr ?? ''].join('|');
    if (!series.has(k)) series.set(k, []);
    series.get(k).push(row);
    const ik = `${layer}|${ind}`;
    if (!sourceInfo.has(ik)) sourceInfo.set(ik, info);
  };
  const num = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
  for (const r of json(STORES.canonical_annual).records) if (num(r.value)) put('canonical_annual', r.indicator, r.country_slug, null, { period: String(r.year), value: r.value, observation_id: r.id },
    { dataset: r.source_dataset ?? r.source_name, unit: r.unit, definition: r.notes ?? indicatorRegistry.get(r.indicator)?.name ?? null, url: r.source_url });
  for (const layer of ['historical_annual']) for (const r of json(STORES[layer]).records) if (num(r.value)) put(layer, r.indicator, r.country_slug, null,
    { period: String(r.year), value: r.value, observation_id: r.id, ...(r.recovery_phase ? { recovery_phase: r.recovery_phase } : {}) },
    { dataset: r.source_dataset, unit: r.unit, definition: r.definition ?? null, url: r.source_query_url ?? r.source_url ?? null });
  for (const r of json(STORES.high_frequency_monthly).records) if (num(r.value)) put('high_frequency_monthly', r.indicator, r.country, null, { period: r.period, value: r.value, observation_id: r.observation_id },
    { dataset: r.source_dataset, unit: r.unit, definition: r.definition_version, url: r.source_url });
  {
    const doc = json(STORES.historical_monthly);
    const src = new Map(doc.series_sources.map((s) => [`${s.source_ref}`, s]));
    for (const r of doc.records) if (num(r.value)) { const s = src.get(`${r.source_ref}`) ?? {}; put('historical_monthly', r.series, r.country_slug, null, { period: r.period, value: r.value, observation_id: r.id }, { dataset: s.source_url?.match(/data\/([a-z0-9_]+)\?/)?.[1] ?? null, unit: s.unit, definition: s.definition, url: s.source_url }); }
  }
  for (const r of json(STORES.macro_driver_monthly).records) if (num(r.value)) put('macro_driver_monthly', r.driver_id, r.country ?? 'common', r.transformation, { period: r.period, value: r.value, observation_id: r.observation_id },
    { dataset: r.source_dataset, unit: r.unit, definition: r.definition_version, url: r.source_url });
  for (const layer of ['sors_annual', 'sors_monthly', 'sors_regional']) {
    const doc = json(STORES[layer]);
    const src = new Map(doc.series_sources.map((s) => [`${s.source_ref}`, s]));
    for (const r of doc.records) {
      if (!num(r.normalized_value)) continue;
      const geo = layer === 'sors_regional' ? regionByAdmin.get(r.territory_code) : 'serbia';
      if (!geo) continue; // municipality-level rows have no map region id
      const s = src.get(`${r.source_ref}`) ?? {};
      put(layer, r.series, geo, null, { period: String(r.period), value: r.normalized_value, observation_id: r.id }, { dataset: `SORS ${s.source_dataset ?? ''}`.trim(), unit: r.normalized_unit, definition: s.label ?? null, url: s.source_url ?? null });
    }
  }
  for (const r of json(STORES.regional_annual).records) if (num(r.value)) put('regional_annual', r.region_indicator_id, r.region_id, null, { period: String(r.year), value: r.value, observation_id: r.region_observation_id },
    { dataset: r.source_name, unit: r.unit, definition: r.calculation_method ?? null, url: r.source_url });
  {
    const man = json(STORES.regional_history_manifest);
    const byKey = new Map(man.sources.map((s) => [s.key, s]));
    for (const r of json(STORES.regional_history).records) if (num(r.value)) {
      const KEY = { regional_population: 'population', regional_gdp: 'gdp', regional_gdp_per_capita: 'gdp', regional_unemployment_rate: 'unemployment', regional_employment_rate: 'employment', regional_manufacturing_share: 'gva_c' };
      const s = byKey.get(KEY[r.indicator]) ?? {};
      put('regional_history', r.indicator, r.region_id, null, { period: String(r.statistical_year), value: r.value, observation_id: r.id, ...(r.recovery_phase ? { recovery_phase: r.recovery_phase } : {}) },
        { dataset: s.dataset ? `Eurostat ${s.dataset}` : null, unit: null, definition: `${r.indicator === 'regional_gdp_per_capita' ? 'Derived from regional GDP and population; ' : r.indicator === 'regional_manufacturing_share' ? 'Manufacturing (NACE C) GVA / total GVA; ' : ''}geography ${r.nuts_vintage}`, url: s.url ?? null });
    }
  }
  for (const rows of series.values()) rows.sort((a, b) => a.period.localeCompare(b.period));
  const get = (layer, ind, geo, tr) => series.get([layer, ind, geo, tr ?? ''].join('|')) ?? [];
  const DEFAULT_TR = { hicp_energy_annual_rate: 'yoy_rate', europe_natural_gas_price_usd: 'level', brent_crude_price_usd: 'level' };
  const trOf = (layer, ind, tr) => (layer === 'macro_driver_monthly' ? tr ?? DEFAULT_TR[ind] ?? 'level' : null);
  const isRegional = (layer) => ['regional_annual', 'regional_history', 'sors_regional'].includes(layer);
  const FREQ = { canonical_annual: 'annual', historical_annual: 'annual', sors_annual: 'annual', regional_annual: 'annual', regional_history: 'annual', sors_regional: 'annual',
    high_frequency_monthly: 'monthly', historical_monthly: 'monthly', macro_driver_monthly: 'monthly', sors_monthly: 'monthly' };
  const explorerKey = (layer, ind, tr) => (FREQ[layer] === 'monthly' ? (layer === 'macro_driver_monthly' ? `macro:${ind}:${tr}` : layer === 'sors_monthly' ? `sors:${ind}` : `monthly:${ind}`)
    : layer === 'sors_annual' ? `sors:${ind}` : isRegional(layer) ? null : `annual:${ind}`);
  const coverage = (rows) => (rows.length ? { first: rows[0].period, last: rows.at(-1).period, count: rows.length } : null);
  const layerExists = (layer, ind) => [...series.keys()].some((k) => k.startsWith(`${layer}|${ind}|`));
  // The single-vintage annual reference is restricted by the owner to its own isolated descriptive view; this layer never reads it.
  const used = JSON.stringify([themes, mappingsDoc.records, cases]);
  if (used.includes('single_vintage')) fail('the single-vintage reference layer may only be read by its isolated descriptive view');
  for (const layer of new Set([...used.matchAll(/"layers?":\s*(?:\[([^\]]*)\]|"([a-z_]+)")/g)].flatMap((m) => (m[1] ?? `"${m[2]}"`).match(/[a-z_]+/g) ?? []))) if (!FREQ[layer]) fail(`unknown layer ${layer}`);

  // Implementation milestones (E2) and existing event-analysis links, read as text from the TypeScript sources.
  const implText = read(STORES.implementation);
  const milestones = new Map();
  for (const m of implText.matchAll(/id: "([a-z0-9-]+)", event_id: (CZ|HU), stage: "([a-z_]+)", status: "([a-z]+)"/g)) milestones.set(m[1], { event: m[2], stage: m[3], status: m[4], at: m.index });
  const milestoneBlock = (id) => { const m = milestones.get(id); const next = [...milestones.values()].map((x) => x.at).filter((a) => a > m.at).sort((a, b) => a - b)[0] ?? implText.length; return implText.slice(m.at, next).replace(/_/g, ''); };
  const analysisText = read(STORES.event_analysis);
  const existingLinks = new Map();
  for (const block of analysisText.split(/\n  \{\n    event_id: /).slice(1)) {
    const id = block.split('"')[1];
    existingLinks.set(id, [...block.matchAll(/indicator_id: "([^"]+)", frequency: "[a-z]+", basis: "([a-z]+)"/g)].map((m) => ({ indicator: m[1].split(':')[0], basis: m[2] })));
  }

  // ---------------- themes ----------------
  const themeIds = new Set();
  const caseIds = new Set(cases.map((c) => c.case_id));
  for (const t of themes) {
    if (themeIds.has(t.theme_id)) fail(`duplicate theme ${t.theme_id}`);
    themeIds.add(t.theme_id);
    for (const k of ['en', 'zh']) if (!t.title?.[k] || !t.description?.[k]) fail(`theme ${t.theme_id}: missing ${k} text`);
    for (const c of [...t.countries, ...t.indicators.flatMap((r) => [...(r.scope ?? []), ...(r.not_applicable_for ?? [])])]) if (!COUNTRIES.includes(c)) fail(`theme ${t.theme_id}: unknown country ${c}`);
    for (const ref of t.indicators) for (const layer of ref.layers) if (!layerExists(layer, ref.indicator_id)) fail(`theme ${t.theme_id}: ${ref.indicator_id} has no observations in ${layer}`);
    for (const p of t.pending_indicators) {
      const reg = indicatorRegistry.get(p.indicator_id);
      if (!reg || reg.status !== 'pending') fail(`theme ${t.theme_id}: ${p.indicator_id} is not a pending registry indicator`);
      if (layerExists('canonical_annual', p.indicator_id)) fail(`theme ${t.theme_id}: pending ${p.indicator_id} has observations`);
    }
    for (const c of t.case_ids) if (!caseIds.has(c)) fail(`theme ${t.theme_id}: unknown case ${c}`);
    for (const q of [...t.research_questions, ...t.limitations, ...t.not_held]) if (!q.en || !q.zh) fail(`theme ${t.theme_id}: untranslated text`);
  }

  // ---------------- event-indicator mappings ----------------
  const lib = mappingsDoc.limitation_library;
  const seen = new Set();
  const enriched = [];
  for (const m of mappingsDoc.records) {
    const ev = events.get(m.event_id);
    if (!ev) { fail(`mapping: unknown event ${m.event_id}`); continue; }
    if (seen.has(m.event_id)) fail(`mapping: duplicate event ${m.event_id}`);
    seen.add(m.event_id);
    if (ev.data_status !== 'verified') fail(`mapping ${m.event_id}: event is not verified`);
    for (const t of m.theme_ids) if (!themeIds.has(t)) fail(`mapping ${m.event_id}: unknown theme ${t}`);
    if (!REL.includes(m.classification)) fail(`mapping ${m.event_id}: bad classification`);
    if (!meta.evidence_status[m.evidence_status]) fail(`mapping ${m.event_id}: bad evidence status`);
    if (!m.summary?.en || !m.summary?.zh) fail(`mapping ${m.event_id}: untranslated summary`);
    const rows = [];
    for (const r of m.indicators) {
      if (!REL.includes(r.relationship)) fail(`mapping ${m.event_id}/${r.indicator_id}: bad relationship`);
      for (const l of r.limitations) if (!lib[l]) fail(`mapping ${m.event_id}/${r.indicator_id}: unknown limitation ${l}`);
      if (!r.connection?.en || !r.connection?.zh) fail(`mapping ${m.event_id}/${r.indicator_id}: untranslated connection`);
      const geo = r.region_id ?? r.country ?? ev.country_slug;
      if (r.region_id) { const reg = regions.get(r.region_id); if (!reg) fail(`mapping ${m.event_id}: unknown region ${r.region_id}`); else if (reg.country_id !== ev.country_slug) fail(`mapping ${m.event_id}: region ${r.region_id} outside event country`); }
      if (r.country && r.country !== 'common' && !COUNTRIES.includes(r.country)) fail(`mapping ${m.event_id}: unknown country ${r.country}`);
      const layers = r.layers.map((layer) => {
        const tr = trOf(layer, r.indicator_id, r.transformation);
        const obs = get(layer, r.indicator_id, geo, tr);
        const info = sourceInfo.get(`${layer}|${r.indicator_id}`) ?? {};
        const after = obs.filter((o) => (FREQ[layer] === 'monthly' ? o.period > ev.date.slice(0, 7) : Number(o.period) > Number(ev.date.slice(0, 4))));
        return { layer, frequency: FREQ[layer], transformation: tr, dataset: info.dataset ?? null, unit: info.unit ?? null, definition: info.definition ?? null, source_url: info.url ?? null,
          coverage: coverage(obs), observations_after_event: after.length, explorer_key: explorerKey(layer, r.indicator_id, tr) };
      });
      const pending = indicatorRegistry.get(r.indicator_id)?.status === 'pending';
      const held = layers.some((l) => l.coverage);
      if (['A', 'B', 'C'].includes(r.relationship) && !held) fail(`mapping ${m.event_id}/${r.indicator_id}: ${r.relationship} link without observations for ${geo}`);
      if (pending && r.relationship !== 'E') fail(`mapping ${m.event_id}/${r.indicator_id}: pending indicator must be E`);
      rows.push({ ...r, geo, pending, layers });
    }
    const derived = rows.length ? [...rows.map((r) => r.relationship)].sort()[0] : null;
    if (rows.length && derived !== m.classification) fail(`mapping ${m.event_id}: classification ${m.classification} ≠ strongest row ${derived}`);
    if (!rows.length && !['D', 'E'].includes(m.classification)) fail(`mapping ${m.event_id}: A–C needs indicator rows`);
    if (!rows.length && !meta.reason_codes[m.reason_code]) fail(`mapping ${m.event_id}: D/E without indicator rows needs a reason code`);
    const prior = existingLinks.get(m.event_id);
    if (m.extends_event_analysis && !prior) fail(`mapping ${m.event_id}: no existing event-analysis record`);
    if (prior) {
      if (!m.extends_event_analysis) fail(`mapping ${m.event_id}: existing event-analysis record not flagged`);
      for (const p of prior) {
        const row = rows.find((r) => r.indicator_id === p.indicator);
        if (!row) { fail(`mapping ${m.event_id}: existing link ${p.indicator} missing`); continue; }
        const ok = { documented: ['A'], proposed: ['B', 'C'], unsupported: ['D', 'E'] }[p.basis];
        // A later implementation finding (E2 link specification) may revise an earlier proposed link; the cited finding must exist.
        const revised = row.revises_existing?.source === 'implementationLinkSpecs'
          && new RegExp(`indicator_id: "${p.indicator}", anchor: "[^"]+", measurement: "${row.revises_existing.measurement}"`).test(implText);
        if (row.revises_existing && !revised) fail(`mapping ${m.event_id}/${p.indicator}: cited implementation finding not found`);
        if (!ok.includes(row.relationship) && !revised) fail(`mapping ${m.event_id}/${p.indicator}: ${row.relationship} contradicts existing basis ${p.basis}`);
      }
    }
    enriched.push({ event_id: m.event_id, date: ev.date, country: ev.country_slug, event_type: ev.event_type, source_name: ev.source_name, source_url: ev.source_url,
      theme_ids: m.theme_ids, classification: m.classification, reason_code: m.reason_code ?? null, evidence_status: m.evidence_status, extends_event_analysis: Boolean(m.extends_event_analysis),
      summary: m.summary, indicators: rows.map(({ geo, ...r }) => ({ ...r, geo })) });
  }

  // ---------------- investment records ----------------
  const stageIds = new Set(meta.investment_stages.map((s) => s.id));
  const invIds = new Set();
  const STATUS_RULE = { documented: (s) => s.includes('verified'), company_stated: (s) => s.includes('announced'), reported: () => true, disputed: (s) => s.includes('disputed'), not_documented: (s) => s.every((x) => x === 'unavailable'), not_applicable: () => true };
  for (const r of investments) {
    if (invIds.has(r.record_id)) fail(`investment: duplicate ${r.record_id}`);
    invIds.add(r.record_id);
    if (!COUNTRIES.includes(r.country)) fail(`investment ${r.record_id}: unknown country`);
    for (const t of r.theme_ids) if (!themeIds.has(t)) fail(`investment ${r.record_id}: unknown theme ${t}`);
    if (r.project_id && projects.get(r.project_id)?.country_slug !== r.country) fail(`investment ${r.record_id}: project ${r.project_id} missing or in another country`);
    for (const e of r.event_ids) if (!events.has(e)) fail(`investment ${r.record_id}: unknown event ${e}`);
    if (r.location) {
      const reg = regions.get(r.location.region_id);
      if (!reg) fail(`investment ${r.record_id}: unknown region ${r.location.region_id}`);
      else { if (reg.admin_code !== r.location.admin_code) fail(`investment ${r.record_id}: admin code ${r.location.admin_code} ≠ ${reg.admin_code}`); if (reg.country_id !== r.country) fail(`investment ${r.record_id}: region outside country`); }
    }
    for (const s of r.stages) {
      if (!stageIds.has(s.stage)) fail(`investment ${r.record_id}: unknown stage ${s.stage}`);
      if (!meta.stage_status[s.status]) fail(`investment ${r.record_id}: unknown status ${s.status}`);
      const ms = s.evidence.implementation_milestones ?? [];
      for (const id of ms) if (!milestones.has(id)) fail(`investment ${r.record_id}: unknown milestone ${id}`);
      const st = ms.filter((id) => milestones.has(id)).map((id) => milestones.get(id).status);
      if (st.length && !STATUS_RULE[s.status](st)) fail(`investment ${r.record_id}/${s.stage}: status ${s.status} inconsistent with milestones ${st}`);
      for (const e of s.evidence.event_ids ?? []) if (!r.event_ids.includes(e)) fail(`investment ${r.record_id}: stage event ${e} not listed on record`);
      if (s.evidence.project_id && s.evidence.project_id !== r.project_id) fail(`investment ${r.record_id}: stage project mismatch`);
      if (s.status !== 'not_documented' && s.status !== 'not_applicable' && !ms.length && !s.evidence.event_ids?.length && !s.evidence.project_id) fail(`investment ${r.record_id}/${s.stage}: evidence missing`);
      if (s.date && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(s.date)) fail(`investment ${r.record_id}: bad date ${s.date}`);
      for (const a of s.amounts ?? []) if (ms.length && a.currency !== 'USD' && a.currency !== 'AUD' && !ms.some((id) => milestoneBlock(id).includes(String(a.value)))) fail(`investment ${r.record_id}: amount ${a.value} not in milestones ${ms}`);
    }
  }

  // ---------------- EU funding ----------------
  const fundStages = new Set(meta.funding_stages.map((s) => s.id));
  const manualHosts = new Map(json('docs/legal-security/network_acquisition_registry.json').hosts.filter((h) => h.status === 'allowed' && h.manual_allowed === true).map((h) => [h.host, h]));
  const fundIds = new Set();
  for (const f of funding.records) {
    if (fundIds.has(f.record_id)) fail(`funding: duplicate ${f.record_id}`);
    fundIds.add(f.record_id);
    const prog = funding.programmes[f.programme];
    if (!prog) fail(`funding ${f.record_id}: unknown programme`);
    if (!COUNTRIES.includes(f.country)) fail(`funding ${f.record_id}: unknown country`);
    if (prog?.eligible === 'eu_member_states' && !funding.eu_member_states.includes(f.country)) fail(`funding ${f.record_id}: programme not applicable to ${f.country}`);
    if (!fundStages.has(f.stage)) fail(`funding ${f.record_id}: unknown stage ${f.stage}`);
    if (!meta.evidence_status[f.evidence_status]) fail(`funding ${f.record_id}: bad evidence status`);
    if ((f.amount === null) !== (f.currency === null)) fail(`funding ${f.record_id}: amount and currency must both be set or null`);
    if (f.event_id && !events.has(f.event_id)) fail(`funding ${f.record_id}: unknown event`);
    if (f.event_id && events.get(f.event_id)?.country_slug !== f.country) fail(`funding ${f.record_id}: event in another country`);
    if (f.implementation_milestone) {
      if (!milestones.has(f.implementation_milestone)) fail(`funding ${f.record_id}: unknown milestone`);
      else if (f.amount !== null && !milestoneBlock(f.implementation_milestone).includes(String(f.amount))) fail(`funding ${f.record_id}: amount ${f.amount} not stated in ${f.implementation_milestone}`);
    }
    if (!f.event_id && !f.implementation_milestone) fail(`funding ${f.record_id}: no evidence reference`);
    // A document read by hand: exact registered host (manual reading allowed), exact sha256 of the copy read, read date.
    if (f.source?.kind === 'official_document') {
      const d = f.source; let host = null;
      try { host = new URL(d.url).hostname; } catch { fail(`funding ${f.record_id}: official_document url invalid`); }
      const reg = manualHosts.get(host);
      if (host && !reg) fail(`funding ${f.record_id}: ${host} is not a registered manual-reading host`);
      if (!d.ref || !/^[0-9a-f]{64}$/.test(d.sha256 ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(d.read_on ?? '')) fail(`funding ${f.record_id}: official_document needs ref, exact sha256 and read_on`);
      if (f.evidence_status !== 'official_document_verified') fail(`funding ${f.record_id}: official_document source must be official_document_verified`);
    }
    if (f.evidence_status === 'official_document_verified' && f.source?.kind !== 'official_document' && !f.implementation_milestone) fail(`funding ${f.record_id}: official_document_verified needs a read document or a verified implementation milestone`);
    if (f.case_id && !caseIds.has(f.case_id)) fail(`funding ${f.record_id}: unknown case`);
    if (f.region_id && !regions.has(f.region_id)) fail(`funding ${f.record_id}: unknown region`);
  }

  // ---------------- cases, chronologies and evidence windows ----------------
  const shift = (period, freq, k) => {
    if (freq === 'annual') return String(Number(period) + k);
    const [y, m] = period.split('-').map(Number); const t = y * 12 + (m - 1) + k; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
  };
  const windows = [];
  const chronologies = [];
  for (const c of cases) {
    for (const t of c.theme_ids) if (!themeIds.has(t)) fail(`case ${c.case_id}: unknown theme`);
    for (const e of c.event_ids) if (!events.has(e)) fail(`case ${c.case_id}: unknown event ${e}`);
    for (const r of c.investment_records) if (!invIds.has(r)) fail(`case ${c.case_id}: unknown investment record ${r}`);
    for (const r of c.funding_records) if (!fundIds.has(r)) fail(`case ${c.case_id}: unknown funding record ${r}`);
    for (const m of c.implementation_milestones ?? []) if (!milestones.has(m)) fail(`case ${c.case_id}: unknown milestone ${m}`);
    if (c.extends && !existingLinks.has(c.extends.event_id)) fail(`case ${c.case_id}: extended case has no event-analysis record`);
    for (const k of ['title', 'research_question', 'interpretation']) if (!c[k]?.en || !c[k]?.zh) fail(`case ${c.case_id}: untranslated ${k}`);
    for (const x of [...c.findings, ...c.limitations, ...c.institutional_context]) if (!x.en || !x.zh) fail(`case ${c.case_id}: untranslated text`);
    for (const r of c.regional) { const reg = regions.get(r.region_id); if (!reg || reg.admin_code !== r.admin_code) fail(`case ${c.case_id}: bad region ${r.region_id}`); }
    for (const l of c.links) if (!l.route.startsWith('/en/')) fail(`case ${c.case_id}: route must be an /en/ path`);
    const geoOf = (s) => s.region_id ?? s.country;
    for (const s of c.series) if (!get(s.layer, s.indicator_id, geoOf(s), trOf(s.layer, s.indicator_id, s.transformation)).length) fail(`case ${c.case_id}: no observations for ${s.indicator_id}/${s.layer}/${geoOf(s)}`);
    for (const k of c.checks) {
      if (k.funding_record) { const f = funding.records.find((x) => x.record_id === k.funding_record); if (!f || f.amount !== k.value) fail(`case ${c.case_id}: funding check ${k.funding_record} ≠ ${k.value}`); continue; }
      const o = get(k.layer, k.indicator_id, k.region_id ?? k.country, trOf(k.layer, k.indicator_id, k.transformation)).find((x) => x.period === k.period);
      if (!o || Math.abs(Number(o.value) - k.value) > 1e-9) fail(`case ${c.case_id}: check ${k.indicator_id} ${k.period} = ${k.value}, store has ${o?.value}`);
    }
    // Dated chronology from the referenced records; undated entries are listed separately and never given a date.
    const items = [];
    for (const id of c.investment_records) { const r = investments.find((x) => x.record_id === id); for (const s of r?.stages ?? []) items.push({ date: s.date, date_precision: s.date_precision, kind: 'investment_stage', record_id: id, stage: s.stage, status: s.status, summary: s.summary }); }
    for (const id of c.funding_records) { const f = funding.records.find((x) => x.record_id === id); if (f) items.push({ date: f.status_date, date_precision: f.date_precision, kind: 'funding_stage', record_id: id, stage: f.stage, status: f.evidence_status, amount: f.amount, currency: f.currency, category: f.category, summary: f.note }); }
    for (const id of c.event_ids) { const e = events.get(id); if (e) items.push({ date: e.date, date_precision: 'day', kind: 'event', record_id: id, stage: null, status: e.data_status, summary: null }); }
    for (const id of c.implementation_milestones ?? []) { const m = milestones.get(id); if (m) items.push({ date: null, date_precision: 'see_milestone', kind: 'implementation_milestone', record_id: id, stage: m.stage, status: m.status, summary: null }); }
    const dated = items.filter((i) => i.date).sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind) || a.record_id.localeCompare(b.record_id));
    chronologies.push({ case_id: c.case_id, dated, undated: items.filter((i) => !i.date) });
    for (const w of c.windows) {
      const anchorDate = w.anchor.event_id ? events.get(w.anchor.event_id)?.date : w.anchor.date;
      if (!anchorDate) { fail(`case ${c.case_id}/${w.window_id}: no anchor date`); continue; }
      const anchor = w.frequency === 'annual' ? anchorDate.slice(0, 4) : anchorDate.slice(0, 7);
      if (anchor.length !== (w.frequency === 'annual' ? 4 : 7)) fail(`case ${c.case_id}/${w.window_id}: anchor ${anchorDate} too coarse for ${w.frequency}`);
      const expected = []; for (let k = -w.before; k <= w.after; k++) expected.push(shift(anchor, w.frequency, k));
      const out = [];
      for (const s of w.series) {
        if (FREQ[s.layer] !== w.frequency) fail(`case ${c.case_id}/${w.window_id}: ${s.layer} is not ${w.frequency}`);
        const tr = trOf(s.layer, s.indicator_id, s.transformation);
        const obs = get(s.layer, s.indicator_id, geoOf(s), tr).filter((o) => expected.includes(o.period));
        const before = obs.filter((o) => o.period < anchor).length, after = obs.filter((o) => o.period > anchor).length;
        const status = !obs.length ? 'none' : !after ? 'pre_event_only' : before === w.before && after === w.after ? 'complete' : 'asymmetric';
        out.push({ ...s, transformation: tr, geo: geoOf(s), observations: obs, missing_periods: expected.filter((p) => !obs.some((o) => o.period === p)), before_count: before, after_count: after, anchor_observed: obs.some((o) => o.period === anchor), status });
      }
      windows.push({ case_id: c.case_id, window_id: w.window_id, anchor_date: anchorDate, anchor_period: anchor, anchor_label: w.anchor.label, frequency: w.frequency, before: w.before, after: w.after, series: out,
        note: { en: 'Descriptive only: observed values around a documented date, with missing periods listed and never filled.', zh: '仅作描述：有记录日期前后的观测值，缺失期间逐一列出，不作填补。' } });
    }
  }

  // ---------------- indicator catalogue and country × theme coverage ----------------
  const catalogue = [];
  const catKeys = new Set();
  const addCat = (ind, layer) => { const k = `${ind}|${layer}`; if (catKeys.has(k)) return; catKeys.add(k);
    const info = sourceInfo.get(`${layer}|${ind}`) ?? {}; const geos = {};
    for (const key of series.keys()) { const [l, i, g] = key.split('|'); if (l === layer && i === ind) { const tr = key.split('|')[3] || null; const cov = coverage(series.get(key)); geos[tr && tr !== DEFAULT_TR[ind] && tr !== 'level' ? `${g}:${tr}` : g] = cov; } }
    catalogue.push({ indicator_id: ind, layer, frequency: FREQ[layer], dataset: info.dataset ?? null, unit: info.unit ?? null, definition: info.definition ?? null, source_url: info.url ?? null,
      registry_name: indicatorRegistry.get(ind) ? { en: indicatorRegistry.get(ind).name, zh: indicatorRegistry.get(ind).name_zh } : null, coverage: geos, explorer_key: explorerKey(layer, ind, trOf(layer, ind)) }); };
  for (const t of themes) for (const ref of t.indicators) for (const l of ref.layers) addCat(ref.indicator_id, l);
  for (const m of enriched) for (const r of m.indicators) for (const l of r.layers) if (l.coverage) addCat(r.indicator_id, l.layer);
  for (const c of cases) for (const s of c.series) addCat(s.indicator_id, s.layer);
  catalogue.sort((a, b) => a.indicator_id.localeCompare(b.indicator_id) || a.layer.localeCompare(b.layer));

  const OFFICIAL = new Set(['official_document_verified', 'official_record_admitted']);
  const matrix = [];
  for (const country of COUNTRIES) for (const t of themes) {
    // Counted per indicator id: an indicator is admitted for a country when any of its listed national layers holds
    // observations there (a common external series counts for every country).
    const national = t.indicators.filter((r) => !r.layers.every(isRegional) && (!r.scope || r.scope.includes(country)) && !(r.not_applicable_for ?? []).includes(country));
    const obsFor = (r, l) => get(l, r.indicator_id, country, trOf(l, r.indicator_id)).length ? get(l, r.indicator_id, country, trOf(l, r.indicator_id)) : get(l, r.indicator_id, 'common', trOf(l, r.indicator_id));
    const uniq = (xs) => [...new Set(xs)];
    const definedIds = uniq(national.map((r) => r.indicator_id));
    const admittedIds = definedIds.filter((id) => national.some((r) => r.indicator_id === id && r.layers.some((l) => !isRegional(l) && obsFor(r, l).length)));
    const historical = national.some((r) => admittedIds.includes(r.indicator_id) && r.layers.some((l) => !isRegional(l) && obsFor(r, l).some((o) => o.period.slice(0, 4) < '2021')));
    const maps = enriched.filter((m) => m.country === country && m.theme_ids.includes(t.theme_id));
    const invs = investments.filter((r) => r.country === country && r.theme_ids.includes(t.theme_id));
    const funds = t.theme_id === 'eu_funding_development' ? funding.records.filter((f) => f.country === country) : [];
    const officialSource = maps.some((m) => OFFICIAL.has(m.evidence_status)) || invs.some((r) => r.stages.some((s) => s.status === 'documented')) || funds.some((f) => OFFICIAL.has(f.evidence_status));
    const applicable = !(t.theme_id === 'eu_funding_development' && !funding.eu_member_states.includes(country));
    const missing = uniq([...definedIds.filter((id) => !admittedIds.includes(id)), ...t.pending_indicators.map((p) => p.indicator_id)]);
    matrix.push({ country, theme_id: t.theme_id, theme_applicable: applicable, official_source_identified: officialSource,
      data_admitted: { admitted: admittedIds.length, defined: definedIds.length },
      historical_observations: historical, case_ids: cases.filter((c) => c.theme_ids.includes(t.theme_id) && c.countries.includes(country)).map((c) => c.case_id),
      events_mapped: Object.fromEntries(REL.map((k) => [k, maps.filter((m) => m.classification === k).length])), investment_records: invs.length, funding_records: funds.length,
      evidence_missing: missing, not_held_concepts: t.not_held.length,
      note: applicable ? null : { en: 'Serbia is not an EU member state: EU-internal programmes are not applicable (not zero); IPA funds are not held.', zh: '塞尔维亚不是欧盟成员国：欧盟内部计划不适用（不是零）；未持有 IPA 资金数据。' } });
  }
  const applicability = COUNTRIES.map((country) => ({ country, programmes: Object.fromEntries(Object.entries(funding.programmes).map(([id, p]) => {
    const n = funding.records.filter((f) => f.country === country && f.programme === id).length;
    const eligible = p.eligible !== 'eu_member_states' || funding.eu_member_states.includes(country);
    return [id, !eligible ? 'not_applicable' : n ? `admitted:${n}` : 'applicable_no_admitted_record'];
  })) }));

  const index = {
    schema_version: meta.schema_version,
    generated_by: 'scripts/research-themes/build-research-themes.mjs',
    inputs: Object.fromEntries([...INPUTS, ...Object.values(STORES)].map((p) => [p, sha(p)])),
    stats: {
      themes: themes.length, mapped_events: enriched.length, indicator_rows: enriched.reduce((n, m) => n + m.indicators.length, 0),
      by_classification: Object.fromEntries(REL.map((k) => [k, enriched.filter((m) => m.classification === k).length])),
      by_theme: Object.fromEntries(themes.map((t) => [t.theme_id, enriched.filter((m) => m.theme_ids.includes(t.theme_id)).length])),
      investment_records: investments.length, funding_records: funding.records.length, cases: cases.length, evidence_windows: windows.length,
      window_observations: windows.reduce((n, w) => n + w.series.reduce((k, s) => k + s.observations.length, 0), 0),
    },
    indicator_catalogue: catalogue, mappings: enriched, coverage_matrix: matrix, funding_applicability: applicability, chronologies, evidence_windows: windows,
  };

  // ---------------- CSV exports ----------------
  const csv = (rows) => rows.map((r) => r.map((v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n') + '\n';
  const exports = {
    'event_indicator_mappings.csv': csv([['event_id', 'date', 'country', 'event_type', 'theme_ids', 'event_classification', 'reason_code', 'evidence_status', 'indicator_id', 'relationship', 'geo', 'layer', 'frequency', 'dataset', 'coverage_first', 'coverage_last', 'observations_after_event', 'connection_en', 'connection_zh'],
      ...enriched.flatMap((m) => (m.indicators.length ? m.indicators.flatMap((r) => r.layers.map((l) => [m.event_id, m.date, m.country, m.event_type, m.theme_ids.join(' '), m.classification, m.reason_code, m.evidence_status, r.indicator_id, r.relationship, r.geo, l.layer, l.frequency, l.dataset, l.coverage?.first, l.coverage?.last, l.observations_after_event, r.connection.en, r.connection.zh]))
        : [[m.event_id, m.date, m.country, m.event_type, m.theme_ids.join(' '), m.classification, m.reason_code, m.evidence_status, '', '', '', '', '', '', '', '', '', m.summary.en, m.summary.zh]]))]),
    'coverage_matrix.csv': csv([['country', 'theme_id', 'theme_applicable', 'official_source_identified', 'indicators_admitted', 'indicators_defined', 'historical_observations', 'case_ids', 'events_A', 'events_B', 'events_C', 'events_D', 'events_E', 'investment_records', 'funding_records', 'evidence_missing'],
      ...matrix.map((r) => [r.country, r.theme_id, r.theme_applicable, r.official_source_identified, r.data_admitted.admitted, r.data_admitted.defined, r.historical_observations, r.case_ids.join(' '), ...REL.map((k) => r.events_mapped[k]), r.investment_records, r.funding_records, r.evidence_missing.join(' ')])]),
    'eu_funding_records.csv': csv([['record_id', 'country', 'programme', 'funding_period', 'category', 'stage', 'amount', 'currency', 'amount_precision', 'price_basis', 'status_date', 'evidence_status', 'event_id', 'implementation_milestone', 'case_id', 'note_en'],
      ...funding.records.map((f) => [f.record_id, f.country, f.programme, f.funding_period, f.category, f.stage, f.amount, f.currency, f.amount_precision, f.price_basis, f.status_date, f.evidence_status, f.event_id, f.implementation_milestone, f.case_id, f.note.en])]),
    'evidence_windows.csv': csv([['case_id', 'window_id', 'anchor_date', 'frequency', 'indicator_id', 'layer', 'geo', 'transformation', 'period', 'value', 'observation_id', 'window_status'],
      ...windows.flatMap((w) => w.series.flatMap((s) => s.observations.map((o) => [w.case_id, w.window_id, w.anchor_date, w.frequency, s.indicator_id, s.layer, s.geo, s.transformation, o.period, o.value, o.observation_id, s.status])))]),
  };
  return { errors, index, exports };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const check = process.argv.includes('--check');
  const { errors, index, exports } = build();
  if (errors.length) { console.error(errors.map((e) => `✗ ${e}`).join('\n')); process.exit(1); }
  const outputs = { [`${DIR}/thematic_index.json`]: JSON.stringify(index, null, 1) + '\n', ...Object.fromEntries(Object.entries(exports).map(([f, s]) => [`${DOCS}/${f}`, s])) };
  const stale = Object.entries(outputs).filter(([p, s]) => !fs.existsSync(path.join(root, p)) || read(p) !== s).map(([p]) => p);
  if (check) { if (stale.length) { console.error(`stale: ${stale.join(', ')} — run without --check`); process.exit(1); } console.log(`research themes OK (${index.stats.mapped_events} events, ${index.stats.indicator_rows} indicator rows, ${index.stats.cases} cases)`); }
  else { fs.mkdirSync(path.join(root, DOCS), { recursive: true }); for (const [p, s] of Object.entries(outputs)) fs.writeFileSync(path.join(root, p), s); console.log(`wrote ${Object.keys(outputs).length} files`, index.stats); }
}
