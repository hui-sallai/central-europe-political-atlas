// Builds src/lib/electionInformationEvidence.json from Eurostat Euro Indicators news releases held locally in
// .tmp-data-refresh/macro-vintages (gitignored). No network access. Fail-closed: each value is read from a named column of a
// printed row, and each publication date must appear in the release itself. Only the printed row is stored, with the file checksum.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(root, '.tmp-data-refresh/macro-vintages');
const fail = (m) => { throw new Error(`Macro vintage staging failed: ${m}`); };
const log = new Map(JSON.parse(fs.readFileSync(path.join(DIR, 'retrieval_log.json'))).filter((r) => r.status === 200).map((r) => [r.id, r]));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const text = (id) => fs.readFileSync(path.join(DIR, `${id}.txt`), 'utf8').replace(/[\f]/g, ' ');
const NEXT = (t) => (t.match(/Next release: (\d{1,2} [A-Z][a-z]+ \d{4})/) ?? [])[1] ?? null;
const releases = {};
function release(id, topic) {
  if (releases[id]) return id;
  const l = log.get(id) ?? fail(`${id} not retrieved`);
  const m = id.match(/^\d-(\d{2})(\d{2})(\d{4})/);
  const printed = `${Number(m[1])} ${MONTHS[Number(m[2]) - 1]} ${m[3]}`;
  const t = text(id);
  if (!t.includes(printed)) fail(`${id}: date ${printed} not in the release`);
  releases[id] = { topic, published_on: `${m[3]}-${m[2]}-${m[1]}`, url: l.final_url ?? l.url, sha256: l.sha256, retrieved_at: l.retrieved_at, next_release_stated: NEXT(t) };
  return id;
}
const rowFor = (id, country, columns) => {
  const m = text(id).match(new RegExp(`(?:^|\\s)${country} ((?:-?\\d+\\.\\d+[a-z]?\\s+){${columns - 1}}-?\\d+\\.\\d+[a-z]?)`)) ?? fail(`${id}: ${country} row not found`);
  return m[1].trim().split(/\s+/);
};
const observations = [];
function push(indicator, frequency, country, period, unit, id, topic, columns, index, printedLabel = country) {
  const cells = rowFor(id, country, columns);
  const raw = cells[index];
  observations.push({ country: country.toLowerCase(), indicator, frequency, period, unit, release: release(id, topic), value: Number(raw.replace(/[a-z]$/, '')), flash_estimate: /e$/.test(raw), printed_row: `${printedLabel} ${cells.join(' ')}`, column: index });
}
const H = 'HICP annual rate news release', G = 'GDP news release', U = 'unemployment news release', F = 'EDP deficit and debt news release';
push('hicp_inflation', 'monthly', 'Slovakia', '2023-08', '%', '2-19092023-ap', H, 8, 6);
push('hicp_inflation', 'monthly', 'Slovakia', '2023-09', '%', '2-29092023-ap', 'HICP flash estimate news release', 8, 6);
push('hicp_inflation', 'monthly', 'Poland', '2023-08', '%', '2-19092023-ap', H, 8, 6);
push('hicp_inflation', 'monthly', 'Czechia', '2025-08', '%', '2-17092025-ap', H, 8, 6);
push('hicp_inflation', 'monthly', 'Germany', '2024-12', '%', '2-17012025-ap', H, 8, 6);
push('hicp_inflation', 'monthly', 'Germany', '2025-01', '%', '2-03022025-ap', 'HICP flash estimate news release', 8, 6);
push('hicp_inflation', 'monthly', 'Germany', '2025-01', '%', '2-24022025-ap', H, 8, 6);
push('unemployment_rate', 'monthly', 'Slovakia', '2023-07', '% of active population', '3-31082023-bp', U, 5, 4);
push('unemployment_rate', 'monthly', 'Slovakia', '2023-07', '% of active population', '3-02102023-ap', U, 5, 3);
push('unemployment_rate', 'monthly', 'Slovakia', '2023-08', '% of active population', '3-02102023-ap', U, 5, 4);
push('unemployment_rate', 'monthly', 'Poland', '2023-08', '% of active population', '3-02102023-ap', U, 5, 4);
push('unemployment_rate', 'monthly', 'Germany', '2024-12', '% of active population', '3-30012025-bp', U, 5, 4);
push('real_gdp_growth', 'quarterly', 'Slovakia', '2023Q2', '% on same quarter of previous year', '2-07092023-ap', G, 8, 7);
push('real_gdp_growth', 'quarterly', 'Poland', '2023Q2', '% on same quarter of previous year', '2-07092023-ap', G, 8, 7);
push('real_gdp_growth', 'quarterly', 'Czechia', '2025Q2', '% on same quarter of previous year', '2-05092025-ap', G, 8, 7);
push('real_gdp_growth', 'quarterly', 'Germany', '2024Q4', '% on same quarter of previous year', '2-30012025-ap', 'GDP preliminary flash news release', 8, 7);
push('real_gdp_growth', 'quarterly', 'Germany', '2024Q4', '% on same quarter of previous year', '2-14022025-ap', G, 8, 7);
function fiscal(country, period, id, years) {
  const t = text(id);
  const at = t.search(new RegExp(`(?:^|\\s)${country}\\s+GDP mp`, 'm'));
  if (at < 0) fail(`${id}: ${country} block not found`);
  const block = t.slice(at).replace(/^\s*\S+\s+GDP mp/, '');
  const end = block.indexOf('GDP mp');
  const section = block.slice(0, end < 0 ? undefined : end);
  const row = (label) => { const m = section.match(new RegExp(`${label} \\(million [^)]+\\)[^(]*\\(% of GDP\\) ((?:-?\\d+\\.\\d+\\s+){3}-?\\d+\\.\\d+)`)) ?? fail(`${id}: ${country} ${label} row not found`); return m[1].trim().split(/\s+/); };
  const shares = [row('surplus \\(\\+\\)'), row('Government debt')];
  const index = years.indexOf(Number(period));
  if (index < 0) fail(`${id}: ${period} not in table`);
  [['fiscal_balance_gdp', shares[0], 'Government deficit (-) / surplus (+) (% of GDP)'], ['government_debt_gdp', shares[1], 'Government debt (% of GDP)']].forEach(([indicator, cells, label]) => observations.push({ country: country.toLowerCase(), indicator, frequency: 'annual', period, unit: '% of GDP', release: release(id, F), value: Number(cells[index]), flash_estimate: false, printed_row: `${country}, ${label} ${cells.join(' ')}`, column: index }));
}
const Y = (a) => [a, a + 1, a + 2, a + 3];
fiscal('Slovakia', '2022', '2-21042023-ap', Y(2019)); fiscal('Slovakia', '2022', '2-23102023-ap', Y(2019));
fiscal('Poland', '2022', '2-21042023-ap', Y(2019)); fiscal('Poland', '2022', '2-23102023-ap', Y(2019));
fiscal('Czechia', '2024', '2-22042025-ap', Y(2021)); fiscal('Czechia', '2024', '2-21102025-ap', Y(2021));
fiscal('Germany', '2023', '2-22102024-ap', Y(2020)); fiscal('Germany', '2023', '2-22042025-ap', Y(2021));
const evidence = {
  schema_version: 'atlas-election-information-evidence-v1',
  scope: 'Pilot: the latest admitted election in each of the four countries. Eurostat Euro Indicators news releases only.',
  limits: ['A release date shows when Eurostat published the printed value. A national statistical office may have published earlier, so this is the earliest release located, not a proven first publication anywhere.', 'Whether no newer release existed before polling day rests on the next release date printed in a release where available; 2023 PDF releases do not print one, so those rest on the releases located.', 'Monthly and quarterly releases are used because annual figures for the election year did not exist yet. They are not the same measure as the annual indicator in the Last complete year view.', 'Publication does not show that any voter saw or used a figure.'],
  pilots: [{ election_id: 'el-sk-nrsr-2023-09-30', country: 'slovakia' }, { election_id: 'el-pl-sejm-2023-10-15', country: 'poland' }, { election_id: 'el-cz-ps-2025-10-03', country: 'czechia' }, { election_id: 'el-de-bt-2025-02-23', country: 'germany' }],
  not_located: [{ country: 'czechia', indicator: 'unemployment_rate', note: 'The Eurostat release with August 2025 unemployment was not located, so the last release before polling day is unknown.' }],
  releases,
  observations,
};
fs.writeFileSync(path.join(root, 'src/lib/electionInformationEvidence.json'), `${JSON.stringify(evidence, null, 1)}\n`);
console.log(JSON.stringify({ status: 'pass', releases: Object.keys(releases).length, observations: observations.length }));
