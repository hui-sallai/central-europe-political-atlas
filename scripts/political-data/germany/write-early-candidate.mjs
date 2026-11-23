// Writes the canonical Germany stores and exports (2002–2025 from production.mjs + the 1990–1998 rows of
// early-elections.mjs). A separate entry point: validators import early-elections.mjs and must never import a writer.
// Usage: node scripts/political-data/germany/write-early-candidate.mjs, then re-pin docs/legal-security/germany_extension_records.json.
import fs from 'node:fs';
import path from 'node:path';
import { root, sha256 } from './acquire.mjs';
import { stores } from './production.mjs';
import { politicalExportFiles } from './export.mjs';
import { buildCanonicalGermany, germanyFiles } from './early-elections.mjs';

const data = buildCanonicalGermany({ candidate: true });
const storeDir = path.join(root, 'src/data/political/germany'), exportDir = path.join(root, 'public/research-data/political/germany');
for (const s of stores) fs.writeFileSync(path.join(storeDir, `${s}.json`), JSON.stringify(data[s], null, 2) + '\n');
for (const [name, content] of Object.entries(politicalExportFiles(data))) fs.writeFileSync(path.join(exportDir, name), content);
console.log(JSON.stringify({ status: 'written', elections: data.elections.length, files: germanyFiles().map((f) => [f, sha256(fs.readFileSync(path.join(root, f)))]) }));
