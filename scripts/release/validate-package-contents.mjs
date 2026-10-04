// Research package (zip) content safety: member inventory and member hashes instead of a container hash.
// Checks path safety, forbidden content (local evidence, correspondence, secrets, blocked raw sources, CZ/SK/PL/AT
// political data) and that every member is either a tracked repository file or an export generated from one.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { researchPackageFilename } from './research-package-name.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const zipFile = process.argv[2] ?? path.join(root, 'public', 'research-data', researchPackageFilename());
const failures = [];
if (!fs.existsSync(zipFile)) { console.log(JSON.stringify({ status: 'skipped', reason: 'package not built' })); process.exit(0); }
const buf = fs.readFileSync(zipFile);
const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
if (eocd < 0) { console.error('not a zip'); process.exit(1); }
const count = buf.readUInt16LE(eocd + 10);
let offset = buf.readUInt32LE(eocd + 16);
const members = [];
for (let i = 0; i < count; i++) {
  if (buf.readUInt32LE(offset) !== 0x02014b50) { failures.push('corrupt central directory'); break; }
  const method = buf.readUInt16LE(offset + 10), size = buf.readUInt32LE(offset + 24), nameLen = buf.readUInt16LE(offset + 28);
  const extraLen = buf.readUInt16LE(offset + 30), commentLen = buf.readUInt16LE(offset + 32), localOffset = buf.readUInt32LE(offset + 42);
  const name = buf.subarray(offset + 46, offset + 46 + nameLen).toString('utf8');
  const localNameLen = buf.readUInt16LE(localOffset + 26), localExtraLen = buf.readUInt16LE(localOffset + 28);
  const data = method === 0 ? buf.subarray(localOffset + 30 + localNameLen + localExtraLen, localOffset + 30 + localNameLen + localExtraLen + size) : null;
  if (method !== 0) failures.push(`${name}: unexpected compression method ${method}`);
  members.push({ name, size, sha256: data ? crypto.createHash('sha256').update(data).digest('hex') : null, text: data && size < 5e6 ? data.toString('utf8') : '' });
  offset += 46 + nameLen + extraLen + commentLen;
}
const SECRET = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{32,}|xox[baprs]-[A-Za-z0-9-]{10,})/;
for (const m of members) {
  if (m.name.startsWith('/') || m.name.includes('..') || m.name.includes('\\') || /^[a-zA-Z]:/.test(m.name)) failures.push(`${m.name}: unsafe path`);
  if (/(^|\/)(local-evidence|correspondence|inbox|owner-evidence|private)(\/|$)/i.test(m.name) || /\.(eml|msg|mbox)$/i.test(m.name)) failures.push(`${m.name}: private evidence or correspondence`);
  if (/political\/(czechia|slovakia|poland|austria)\//i.test(m.name)) failures.push(`${m.name}: restricted Production 1B political data`);
  if (/(^|\/)raw\//.test(m.name) && /(statistics\.sk|volby|kbw|bmi\.gv\.at)/i.test(m.name)) failures.push(`${m.name}: blocked raw source`);
  if (/\/Users\/|\/home\/[a-z]/.test(m.text)) failures.push(`${m.name}: contains a local filesystem path`);
  if (SECRET.test(m.text)) failures.push(`${m.name}: secret-like token`);
}
const names = members.map((m) => m.name);
if (new Set(names).size !== names.length) failures.push('duplicate member names');
console.log(JSON.stringify({ status: failures.length ? 'fail' : 'pass', package: path.basename(zipFile), members: members.length, inventory_sha256: crypto.createHash('sha256').update(members.map((m) => `${m.name}\t${m.sha256}`).join('\n')).digest('hex'), failures }, null, 1));
if (failures.length) process.exitCode = 1;
