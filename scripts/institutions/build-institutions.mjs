// Ten-country political-institutions registry (owner brief 2026-11-16). Validates the hand-authored country records in
// src/lib/institutions/countries/*.json against the registry rules and derives src/lib/institutions/election_links.json,
// which ties every admitted parliamentary election to its stored election-specific rule record and to the dated
// institutional changes in force on polling day. Offline only: it reads repository files and never fetches.
// Usage: node scripts/institutions/build-institutions.mjs            (validate and write election_links.json)
//        node scripts/institutions/build-institutions.mjs --check    (validate; fail if election_links.json would change)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const records = (doc) => (Array.isArray(doc) ? doc : doc.records ?? []);
export const DIR = "src/lib/institutions";
export const LINKS_PATH = `${DIR}/election_links.json`;
export const ADMITTED = ["germany", "czechia", "poland", "slovakia", "hungary", "serbia", "croatia", "slovenia"];
const STATUSES = new Set(["verified", "partially_verified", "pending", "not_applicable"]);
const ROLES = new Set(["lower", "upper", "sole", "federal_council", "interest_council"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const HAN = /[㐀-鿿]/;

export function loadRegistry() {
  const meta = read(`${DIR}/meta.json`);
  const countries = Object.fromEntries(meta.countries.map((slug) => [slug, read(`${DIR}/countries/${slug}.json`)]));
  return { meta, countries };
}

function bilingual(value, where, problems, { optional = false } = {}) {
  if (value === null || value === undefined) { if (!optional) problems.push(`${where}: missing bilingual text`); return; }
  if (typeof value.en !== "string" || !value.en.trim()) problems.push(`${where}: empty English text`);
  if (typeof value.zh !== "string" || !value.zh.trim()) problems.push(`${where}: empty Chinese text`);
  if (HAN.test(value.en ?? "")) problems.push(`${where}: Chinese characters in English text`);
  if (value.zh && !HAN.test(value.zh)) problems.push(`${where}: Chinese text has no Chinese characters`);
}

// Returns a list of problems; an empty list means the registry passes.
export function validate({ meta, countries }, { storeSystems, storeChambers, knownHosts }) {
  const problems = [];
  const ids = new Map();
  const claim = (id, where) => { if (!id) problems.push(`${where}: missing id`); else if (ids.has(id)) problems.push(`${where}: duplicate id ${id} (also ${ids.get(id)})`); else ids.set(id, where); };
  const fieldIds = meta.comparison_fields.map((f) => f.id);
  for (const f of meta.comparison_fields) bilingual(f.label, `meta.comparison_fields.${f.id}`, problems);
  for (const [code, label] of Object.entries(meta.value_labels)) bilingual(label, `meta.value_labels.${code}`, problems);
  for (const [slug, c] of Object.entries(countries)) {
    const at = (p) => `${slug}.${p}`;
    if (c.country !== slug) problems.push(at(`country is ${c.country}`));
    if (c.schema_version !== "institutional-country-v1") problems.push(at("schema_version"));
    if (!DATE.test(c.verified_on ?? "")) problems.push(at("verified_on"));
    if (!["complete", "partial"].includes(c.baseline_status)) problems.push(at("baseline_status"));
    if (c.case_study !== meta.case_study_countries.includes(slug)) problems.push(at("case_study flag disagrees with meta"));
    bilingual(c.overview, at("overview"), problems);
    const sources = new Set();
    for (const s of c.sources) {
      claim(s.source_id, at(`sources.${s.source_id}`)); sources.add(s.source_id);
      let host = null; try { const u = new URL(s.url); host = u.hostname; if (u.protocol !== "https:") problems.push(at(`source ${s.source_id} is not https`)); } catch { problems.push(at(`source ${s.source_id} has an invalid url`)); }
      if (host && !knownHosts(host)) problems.push(at(`source ${s.source_id} host ${host} is not registered`));
      if (!s.publisher || !s.title || !s.kind || !s.language || !s.version) problems.push(at(`source ${s.source_id} incomplete`));
      if (!DATE.test(s.retrieved_on ?? "")) problems.push(at(`source ${s.source_id} retrieved_on`));
      if (s.retrieval_sha256 !== null && !/^[0-9a-f]{64}$/.test(s.retrieval_sha256 ?? "")) problems.push(at(`source ${s.source_id} retrieval_sha256`));
      if (!["manual_download", "browser_reading"].includes(s.access)) problems.push(at(`source ${s.source_id} access`));
    }
    const cites = (list, where) => { for (const id of list ?? []) if (!sources.has(id)) problems.push(at(`${where} cites unknown source ${id}`)); };
    const con = c.constitution;
    claim(con.id, at("constitution")); bilingual(con.name, at("constitution.name"), problems); cites(con.source_ids, "constitution");
    for (const k of ["adopted", "in_force"]) if (con[k] !== null && !DATE.test(con[k])) problems.push(at(`constitution.${k}`));
    const chamberIds = new Set();
    for (const ch of c.chambers) {
      claim(ch.chamber_id, at(`chambers.${ch.chamber_id}`)); chamberIds.add(ch.chamber_id);
      if (!ch.chamber_id.startsWith(`${c.iso2.toLowerCase()}-`)) problems.push(at(`chamber ${ch.chamber_id} prefix`));
      if (!ROLES.has(ch.role)) problems.push(at(`chamber ${ch.chamber_id} role ${ch.role}`));
      if (!ch.official_name) problems.push(at(`chamber ${ch.chamber_id} official_name`));
      bilingual(ch.name, at(`chamber ${ch.chamber_id}.name`), problems); bilingual(ch.selection?.label, at(`chamber ${ch.chamber_id}.selection`), problems);
      bilingual(ch.members?.basis, at(`chamber ${ch.chamber_id}.members.basis`), problems); bilingual(ch.powers, at(`chamber ${ch.chamber_id}.powers`), problems);
      bilingual(ch.note, at(`chamber ${ch.chamber_id}.note`), problems, { optional: true });
      cites(ch.members?.source_ids, `chamber ${ch.chamber_id}.members`); cites(ch.selection?.source_ids, `chamber ${ch.chamber_id}.selection`);
      if (ch.members?.value !== null && !Number.isInteger(ch.members?.value)) problems.push(at(`chamber ${ch.chamber_id} members.value`));
      if (ch.store_chamber && !(storeChambers[slug] ?? new Set()).has(ch.store_chamber)) problems.push(at(`chamber ${ch.chamber_id} store_chamber ${ch.store_chamber} not in the election store`));
    }
    const roles = c.chambers.map((ch) => ch.role);
    if (c.fields.legislature_structure.value === "unicameral" && !(roles.length === 1 && roles[0] === "sole")) problems.push(at("unicameral country must have exactly one sole chamber"));
    if (c.fields.legislature_structure.value !== "unicameral" && roles.includes("sole")) problems.push(at("non-unicameral country has a sole chamber"));
    for (const o of c.offices) { claim(o.office_id, at(`offices.${o.office_id}`)); bilingual(o.name, at(`office ${o.office_id}.name`), problems); bilingual(o.selection?.label, at(`office ${o.office_id}.selection`), problems); bilingual(o.term_limit, at(`office ${o.office_id}.term_limit`), problems, { optional: true }); cites(o.source_ids, `office ${o.office_id}`); }
    for (const role of ["head_of_state", "head_of_government"]) if (c.offices.filter((o) => o.role === role).length !== 1) problems.push(at(`exactly one ${role} office required`));
    const pendingFields = new Set(c.pending.map((p) => p.field));
    for (const p of c.pending) bilingual(p.reason, at(`pending.${p.field}`), problems);
    for (const id of fieldIds) {
      const f = c.fields[id];
      if (!f) { problems.push(at(`fields.${id} missing`)); continue; }
      if (!STATUSES.has(f.status)) problems.push(at(`fields.${id} status ${f.status}`));
      bilingual(f.label, at(`fields.${id}.label`), problems); bilingual(f.detail, at(`fields.${id}.detail`), problems, { optional: true });
      cites(f.source_ids, `fields.${id}`);
      if (f.status === "verified" && !(f.source_ids ?? []).length) problems.push(at(`fields.${id} verified without a source`));
      if (f.status === "pending" && !pendingFields.has(id)) problems.push(at(`fields.${id} is pending but has no pending reason`));
      if (f.value !== null && typeof f.value === "string" && !(f.value in meta.value_labels)) problems.push(at(`fields.${id} value ${f.value} has no label`));
      if (f.effective_from !== undefined && f.effective_from !== null && !DATE.test(f.effective_from)) problems.push(at(`fields.${id} effective_from`));
      for (const s of f.steps ?? []) bilingual(s, at(`fields.${id}.steps`), problems);
      if (f.store_rule_record && !storeSystems.has(f.store_rule_record)) problems.push(at(`fields.${id} store_rule_record ${f.store_rule_record} unknown`));
    }
    for (const extra of Object.keys(c.fields)) if (!fieldIds.includes(extra)) problems.push(at(`fields.${extra} is not a comparison field`));
    for (const e of c.electoral_systems) {
      claim(e.rule_id, at(`electoral_systems.${e.rule_id}`));
      if (!chamberIds.has(e.chamber_id)) problems.push(at(`electoral system ${e.rule_id} chamber ${e.chamber_id} unknown`));
      if (!STATUSES.has(e.status)) problems.push(at(`electoral system ${e.rule_id} status`));
      bilingual(e.summary, at(`electoral system ${e.rule_id}.summary`), problems);
      for (const k of ["constituencies", "allocation", "minority", "threshold_note"]) bilingual(e[k], at(`electoral system ${e.rule_id}.${k}`), problems, { optional: true });
      for (const t of e.thresholds ?? []) { bilingual(t.applies_to, at(`electoral system ${e.rule_id}.threshold`), problems); if (typeof t.percent !== "number") problems.push(at(`electoral system ${e.rule_id} threshold percent`)); }
      if (e.thresholds_from_store && !e.store_rule_record) problems.push(at(`electoral system ${e.rule_id} reads thresholds from the store without a record`));
      if (e.store_rule_record && !storeSystems.has(e.store_rule_record)) problems.push(at(`electoral system ${e.rule_id} store record ${e.store_rule_record} unknown`));
      cites(e.source_ids, `electoral system ${e.rule_id}`);
    }
    for (const ch of c.changes) {
      claim(ch.change_id, at(`changes.${ch.change_id}`));
      bilingual(ch.title, at(`change ${ch.change_id}.title`), problems); bilingual(ch.new, at(`change ${ch.change_id}.new`), problems);
      for (const k of ["previous", "note", "effective_note"]) bilingual(ch[k], at(`change ${ch.change_id}.${k}`), problems, { optional: true });
      const dates = ["adopted", "promulgated", "effective"].map((k) => ch[k]);
      for (const [k, d] of [["adopted", dates[0]], ["promulgated", dates[1]], ["effective", dates[2]]]) if (d !== null && !DATE.test(d)) problems.push(at(`change ${ch.change_id}.${k} is not YYYY-MM-DD`));
      const known = dates.filter(Boolean);
      if (known.join() !== [...known].sort().join()) problems.push(at(`change ${ch.change_id}: adoption, promulgation and effect are out of order`));
      if (!known.length && !ch.effective_note) problems.push(at(`change ${ch.change_id}: no date and no date note`));
      if (!["verified", "partially_verified"].includes(ch.status)) problems.push(at(`change ${ch.change_id} status`));
      cites(ch.source_ids, `change ${ch.change_id}`);
      if (!(ch.source_ids ?? []).length) problems.push(at(`change ${ch.change_id} has no source`));
    }
    for (const s of c.case_study_sections) { bilingual(s.title, at(`case_study.${s.id}.title`), problems); bilingual(s.text, at(`case_study.${s.id}.text`), problems); cites(s.source_ids, `case_study.${s.id}`); }
    if (c.case_study && c.case_study_sections.map((s) => s.id).join() !== "structure,formation,accountability,electoral,limits,changes,rules_vs_practice") problems.push(at("case study must have sections A–G in order"));
  }
  return problems;
}

// The date on which a change took effect, or the best documented date when the effective date was not read.
export const changeDate = (ch) => ch.effective ?? ch.promulgated ?? ch.adopted ?? null;

export function buildLinks({ countries }) {
  const out = { schema_version: "institutional-election-links-v1", generated_from: "src/lib/institutions/countries/*.json and src/data/political/<country>/{elections,legislatures,electoral_systems}.json", rule: "Each election is linked to its own stored election-specific rule record; current statutory text is never applied retroactively. Institutional changes are listed as in force on polling day only when their documented date precedes it; undated changes are listed separately.", periods: {}, elections: [] };
  for (const [slug, c] of Object.entries(countries)) {
    const dated = c.changes.filter((ch) => changeDate(ch)).sort((a, b) => changeDate(a).localeCompare(changeDate(b)) || a.change_id.localeCompare(b.change_id));
    const starts = [...new Set(dated.map(changeDate))];
    out.periods[slug] = starts.map((from, i) => ({ period_id: `${slug}-period-${from}`, from, to_exclusive: starts[i + 1] ?? null, opened_by: dated.filter((ch) => changeDate(ch) === from).map((ch) => ch.change_id) }));
    if (!ADMITTED.includes(slug)) continue;
    const elections = records(read(`src/data/political/${slug}/elections.json`));
    const legislatures = new Map(records(read(`src/data/political/${slug}/legislatures.json`)).map((l) => [l.legislature_id, l]));
    const systems = new Map(records(read(`src/data/political/${slug}/electoral_systems.json`)).map((s) => [s.electoral_system_id, s]));
    for (const e of [...elections].sort((a, b) => a.date.localeCompare(b.date))) {
      const chamber = c.chambers.find((ch) => ch.store_chamber === e.chamber);
      const leg = legislatures.get(e.legislature_id), sys = systems.get(e.electoral_system_id);
      const period = [...out.periods[slug]].reverse().find((p) => p.from <= e.date) ?? null;
      out.elections.push({
        election_id: e.election_id, country: slug, date: e.date, chamber_id: chamber?.chamber_id ?? null, chamber_official_name: chamber?.official_name ?? null,
        seats: leg?.total_seats ?? null, seat_count_basis: leg?.seat_count_basis ?? null,
        electoral_system_id: e.electoral_system_id, system_family: sys?.system_family ?? null, allocation_method: sys?.allocation_method ?? null, base_seats: sys?.base_seats ?? null,
        thresholds: (sys?.national_rules?.thresholds ?? []).map((t) => ({ applies_to: t.appliesTo, percent: t.percent, description: t.description ? { en: t.description.en, zh: t.description["zh-CN"] } : null })),
        rule_basis: sys?.interval_basis ?? null,
        constitution_id: c.constitution.id, institutional_period_id: period?.period_id ?? null,
        changes_in_force: dated.filter((ch) => changeDate(ch) <= e.date).map((ch) => ch.change_id),
        later_changes: dated.filter((ch) => changeDate(ch) > e.date).map((ch) => ch.change_id),
        undated_changes: c.changes.filter((ch) => !changeDate(ch)).map((ch) => ch.change_id),
      });
    }
  }
  return `${JSON.stringify(out, null, 1)}\n`;
}

export function storeContext() {
  const storeSystems = new Set(), storeChambers = {};
  for (const slug of ADMITTED) {
    for (const s of records(read(`src/data/political/${slug}/electoral_systems.json`))) storeSystems.add(s.electoral_system_id);
    storeChambers[slug] = new Set(records(read(`src/data/political/${slug}/elections.json`)).map((e) => e.chamber));
  }
  const net = read("docs/legal-security/network_acquisition_registry.json");
  const hosts = new Set([...net.hosts.filter((h) => h.status !== "blocked").map((h) => h.host), ...net.reference_hosts.hosts]);
  return { storeSystems, storeChambers, knownHosts: (host) => hosts.has(host) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const registry = loadRegistry();
  const problems = validate(registry, storeContext());
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  const text = buildLinks(registry);
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(path.join(root, LINKS_PATH)) || fs.readFileSync(path.join(root, LINKS_PATH), "utf8") !== text) { console.error(`${LINKS_PATH} is stale; run node scripts/institutions/build-institutions.mjs`); process.exit(1); }
  } else fs.writeFileSync(path.join(root, LINKS_PATH), text);
  const links = JSON.parse(text);
  const summary = Object.fromEntries(Object.entries(registry.countries).map(([slug, c]) => [slug, { baseline: c.baseline_status, verified_fields: Object.values(c.fields).filter((f) => f.status === "verified").length, pending_fields: Object.values(c.fields).filter((f) => f.status === "pending").length, changes: c.changes.length, sources: c.sources.length, elections: links.elections.filter((e) => e.country === slug).length }]));
  console.log(JSON.stringify(summary, null, 1));
}
