// Targeted official-source verification of the inventory's "officially available, not admitted" (category 1) periods.
// Read-only for the repository: re-downloads the exact registered official queries recorded in the history manifests
// (Eurostat dissemination API, BIS SDMX API — both registered hosts), compares every archived cell for each case's
// country and period with the live response (value, flag, dataset update stamp), and rebuilds the recovery inventory
// in a scratch copy with the live files substituted, so the live category of every case is computed by the same code.
// Writes only to .tmp-data-refresh/<run>/ (gitignored). Live responses are not committed.
// Usage: node scripts/data-coverage/targeted-refresh-verify.mjs [--run targeted-verify-YYYYMMDD] [--offline]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const arg = (n, d = null) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const runDir = path.join(root, ".tmp-data-refresh", arg("run", "targeted-verify-20261111"));
const offline = args.includes("--offline");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const ALLOWED = new Set(["ec.europa.eu", "stats.bis.org"]);
const GEO = { austria: "AT", germany: "DE", slovakia: "SK", slovenia: "SI", czechia: "CZ", hungary: "HU", poland: "PL", romania: "RO", croatia: "HR", serbia: "RS", euro_area: "XM" };

// 1. Cases: every category-1 period in the committed inventory.
const inventory = read("src/data/data-coverage/historical_recovery_inventory.json");
export const cases = inventory.series.flatMap((s) => (s.missing?.periods ?? []).filter((p) => p.category === 1).flatMap((p) => {
  const out = []; for (let x = p.from; x <= p.to; x = s.frequency === "annual" ? String(Number(x) + 1) : next(x)) out.push(x);
  return out.map((period) => ({ key: s.key, country: s.country, indicator: s.indicator, frequency: s.frequency, period, reason: p.reason, raw_file: s.official?.raw_file ?? null, unit: s.unit ?? null, admitted_last: s.admitted?.last ?? null, layers: Object.keys(s.layers ?? {}).filter((l) => s.layers[l]) }));
}));
function next(p) { const [y, m] = p.split("-").map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`; }

// 2. Raw file → registered query URL (history manifests only; no URL is constructed).
const urlOf = new Map();
const walk = (o) => { if (Array.isArray(o)) return o.forEach(walk); if (!o || typeof o !== "object") return; if (typeof o.url === "string" && typeof o.raw_file === "string") urlOf.set(o.raw_file, o.url); Object.values(o).forEach(walk); };
for (const m of ["src/data/historical/annual_history_manifest.json", "src/data/historical/monthly_history_manifest.json"]) walk(read(m));
const rawFiles = [...new Set(cases.flatMap((c) => (c.raw_file ?? "").split(" ÷ ").map((f) => f.trim()).filter(Boolean)))].sort();

function jsonStatCells(text, geo, times) {
  const j = JSON.parse(text);
  const ordered = j.id.map((id) => Object.entries(j.dimension[id].category.index).sort((a, b) => a[1] - b[1]).map(([k]) => k));
  const stride = j.size.map((_, i) => j.size.slice(i + 1).reduce((a, b) => a * b, 1));
  const gi = j.id.indexOf("geo"), ti = j.id.indexOf("time"), out = {};
  const total = j.size.reduce((a, b) => a * b, 1);
  for (let i = 0; i < total; i++) {
    const pos = stride.map((s, k) => Math.floor(i / s) % j.size[k]);
    if (ordered[gi][pos[gi]] !== geo || !times.includes(ordered[ti][pos[ti]])) continue;
    const coord = j.id.map((id, k) => `${id}=${ordered[k][pos[k]]}`).filter((c) => !c.startsWith("geo=")).join(",");
    out[coord] = { value: j.value?.[i] ?? null, flag: String(j.status?.[i] ?? "").trim() };
  }
  const latest = ordered[ti].filter((t) => Object.keys(j.value ?? {}).some((i) => { const p = stride.map((s, k) => Math.floor(Number(i) / s) % j.size[k]); return ordered[gi][p[gi]] === geo && ordered[ti][p[ti]] === t; })).sort().at(-1) ?? null;
  return { updated: j.updated ?? null, cells: out, latest };
}
function bisCells(text, times) {
  const [h, ...lines] = text.trim().split(/\r?\n/); const cols = h.split(",");
  const split = (line) => { const o = []; let c = "", q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { o.push(c); c = ""; } else c += ch; } o.push(c); return o; };
  const rows = lines.map(split).map((c) => Object.fromEntries(cols.map((k, i) => [k, c[i]])));
  const cells = {}; for (const r of rows) if (times.includes(r.TIME_PERIOD)) cells[`time=${r.TIME_PERIOD}`] = { value: r.OBS_VALUE === "" || r.OBS_VALUE === "NaN" ? null : Number(r.OBS_VALUE), flag: r.OBS_STATUS ?? "" };
  const latest = rows.filter((r) => r.OBS_VALUE !== "" && r.OBS_VALUE !== "NaN").map((r) => r.TIME_PERIOD).sort().at(-1) ?? null;
  return { updated: null, cells, latest, unit: rows[0]?.UNIT_MEASURE ?? null, title: rows[0]?.TITLE ?? null };
}
const timesFor = (c, file) => c.frequency === "annual" && /nrg_pc_20[45]/.test(file) ? [`${c.period}-S1`, `${c.period}-S2`] : [c.period];
const cellsOf = (file, text, c) => file.endsWith(".csv") ? bisCells(text, timesFor(c, file)) : jsonStatCells(text, GEO[c.country], timesFor(c, file));

async function main() {
  fs.mkdirSync(path.join(runDir, "responses"), { recursive: true });
  const fetched = {};
  for (const file of rawFiles) {
    const url = urlOf.get(file);
    if (!url) { fetched[file] = { status: "no_registered_url" }; continue; }
    const host = new URL(url).host;
    if (!ALLOWED.has(host)) { fetched[file] = { status: "host_not_allowed", host }; continue; }
    const cache = path.join(runDir, "responses", path.basename(file));
    if (!(offline && fs.existsSync(cache))) {
      if (offline) { fetched[file] = { status: "offline_no_cache", url }; continue; }
      const res = await fetch(url, { headers: { "user-agent": "central-europe-atlas-data-refresh (registered official query)" } });
      const body = Buffer.from(await res.arrayBuffer());
      if (!res.ok) { fetched[file] = { status: `http_${res.status}`, url }; continue; }
      fs.writeFileSync(cache, body);
      await new Promise((r) => setTimeout(r, 1500));
    }
    const body = fs.readFileSync(cache);
    fetched[file] = { status: "ok", url, host, retrieved_at: fs.statSync(cache).mtime.toISOString(), live_sha256: sha(body), archived_sha256: sha(fs.readFileSync(path.join(root, file))) };
  }

  // 3. Live inventory in a scratch copy: same builder, live official files substituted.
  const scratch = path.join(runDir, "scratch");
  fs.rmSync(scratch, { recursive: true, force: true });
  for (const d of ["src/data", "scripts", "docs/legal-security"]) fs.cpSync(path.join(root, d), path.join(scratch, d), { recursive: true });
  for (const [file, f] of Object.entries(fetched)) if (f.status === "ok") fs.copyFileSync(path.join(runDir, "responses", path.basename(file)), path.join(scratch, file));
  const build = spawnSync("node", ["-e", "import('./scripts/data-coverage/recovery-inventory.mjs').then(m=>process.stdout.write(JSON.stringify(m.buildInventory())))"], { cwd: scratch, encoding: "utf8", maxBuffer: 1e9 });
  if (build.status !== 0) throw new Error(`live inventory build failed: ${build.stderr}`);
  const live = JSON.parse(build.stdout);
  const liveCat = new Map();
  for (const s of live.series) for (const p of s.missing?.periods ?? []) for (let x = p.from; x <= p.to; x = s.frequency === "annual" ? String(Number(x) + 1) : next(x)) liveCat.set(`${s.key}|${x}`, { category: p.category, reason: p.reason });

  // 4. Per case: archived vs live cells.
  const results = cases.map((c) => {
    const files = (c.raw_file ?? "").split(" ÷ ").map((f) => f.trim()).filter(Boolean);
    const per = files.map((file) => {
      const f = fetched[file];
      const a = cellsOf(file, fs.readFileSync(path.join(root, file), "utf8"), c);
      const l = f?.status === "ok" ? cellsOf(file, fs.readFileSync(path.join(runDir, "responses", path.basename(file)), "utf8"), c) : null;
      const keys = [...new Set([...Object.keys(a.cells), ...Object.keys(l?.cells ?? {})])].sort();
      const changed = l ? keys.filter((k) => JSON.stringify(a.cells[k] ?? null) !== JSON.stringify(l.cells[k] ?? null)) : null;
      return { file, url: f?.url ?? null, fetch: f?.status ?? "not_fetched", dataset_updated: { archived: a.updated, live: l?.updated ?? null }, latest_period: { archived: a.latest, live: l?.latest ?? null },
        archived_cells: a.cells, live_cells: l?.cells ?? null, cells_changed: changed, ...(a.unit || l?.unit ? { unit: l?.unit ?? a.unit } : {}) };
    });
    const lc = liveCat.get(`${c.key}|${c.period}`) ?? { category: "admitted_or_absent", reason: null };
    return { ...c, sources: per, live_category: lc.category, live_reason: lc.reason };
  });
  const out = { schema_version: "targeted-refresh-verification-v1", generated_at: new Date().toISOString(), repository_head: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(), cases: results.length, fetched, results };
  fs.writeFileSync(path.join(runDir, "verification.json"), JSON.stringify(out, null, 1));
  const by = {}; for (const r of results) { const k = `${r.live_category}`; by[k] = (by[k] ?? 0) + 1; }
  console.log(JSON.stringify({ cases: results.length, files: rawFiles.length, fetch: Object.values(fetched).reduce((m, f) => ({ ...m, [f.status]: (m[f.status] ?? 0) + 1 }), {}), live_category: by, cells_changed: results.filter((r) => r.sources.some((s) => s.cells_changed?.length)).length, out: path.relative(root, path.join(runDir, "verification.json")) }, null, 1));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
