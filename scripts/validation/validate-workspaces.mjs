import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { unapprovedFrozenChanges } from "../political-data/germany/frozen-boundary.mjs";
const root = process.cwd();
const sourceOnly = process.argv.includes("--source-only");
const nodeRequire = createRequire(import.meta.url);
const cache = new Map();
function load(request, parent = root) {
  if (!request.startsWith(".") && !request.startsWith("@/")) return nodeRequire(request);
  const base = request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : path.resolve(parent, request);
  const file = [base, `${base}.ts`, `${base}.tsx`, `${base}.json`].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!file) throw new Error(`Unresolved module: ${request}`);
  if (cache.has(file)) return cache.get(file).exports;
  const loadedModule = { exports: {} }; cache.set(file, loadedModule);
  const source = fs.readFileSync(file, "utf8");
  if (file.endsWith(".json")) loadedModule.exports = JSON.parse(source);
  else new Function("require", "module", "exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText)(r => load(r, path.dirname(file)), loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const { researchWorkspaces } = load("@/content/researchWorkspaces");
const { workspaceMessages } = load("@/content/workspaceMessages");
const { buildWorkspaceEvidence } = load("@/components/workspaceEvidence");
const { workspaceLinks, comparisonAllowed } = load("@/components/workspaceLinks");
const { buildWorkspaceSnapshot } = load("@/lib/workspaceSnapshot");
const { researchIndicators } = load("@/lib/researchData");
const { runtimeAnalysisSkills } = load("@/lib/analysisSkills");
const { spatialResearchLayerIdsV089 } = load("@/lib/spatialResearchV089");
const hf = load("@/data/high-frequency/series_dictionary.json").records;
const drivers = load("@/data/macro-drivers/macro_driver_dictionary.json").records;
let checks = 0; const failures = [];
const check = (ok, message) => { checks++; if (!ok) failures.push(message); };
check(researchWorkspaces.length === 4 && new Set(researchWorkspaces.map(w => w.id)).size === 4, "Exactly four unique workspaces");
check(JSON.stringify(Object.keys(workspaceMessages.en).sort()) === JSON.stringify(Object.keys(workspaceMessages["zh-CN"]).sort()), "Bilingual UI dictionary parity");
for (const workspace of researchWorkspaces) {
  for (const id of workspace.indicatorIds) check(researchIndicators.some(row => row.id === id), `${workspace.id}: unknown indicator ${id}`);
  for (const id of workspace.highFrequencyIds) check(hf.some(row => row.indicator === id), `${workspace.id}: unknown high-frequency series ${id}`);
  for (const id of workspace.driverIds) check(drivers.some(row => row.driver_id === id), `${workspace.id}: unknown macro driver ${id}`);
  for (const id of workspace.methodIds) check(runtimeAnalysisSkills.some(row => row.skill_id === id), `${workspace.id}: unknown method ${id}`);
  for (const id of workspace.mapLayers) check(spatialResearchLayerIdsV089.includes(id), `${workspace.id}: unknown layer ${id}`);
  for (const locale of ["zh-CN", "en"]) {
    check(Boolean(workspace.title[locale] && workspace.introduction[locale] && workspace.warnings.every(w => w[locale]) && workspace.questions.every(q => q[locale])), `${workspace.id}: bilingual content`);
    const payload = buildWorkspaceEvidence(workspace, locale);
    const selection = { countries: ["hungary", "serbia"], from: 2021, to: 2026 };
    const links = workspaceLinks(payload, selection, locale);
    for (const link of links.models) check(payload.methods.some(method => method.id === link.skill && method.state === "active"), `${workspace.id}: inactive runnable method`);
    for (const card of payload.cards) {
      check(card.coverage.every(row => row.periods.every(p => /^\d{4}(?:-\d{2})?(?:-Q[1-4])?$/.test(p)) && new Set(row.periods).size === row.periods.length), `${card.id}: invalid / duplicate periods`);
      check(!comparisonAllowed(card, selection), `${card.id}: Serbia comparison must not be promoted`);
    }
    if (locale === "en") for (const method of payload.methods) check(!/[\u3400-\u9fff]/u.test(`${method.name} ${method.reason} ${method.limitations.join(" ")}`), `${method.id}: untranslated method presentation`);
    const snapshot = buildWorkspaceSnapshot(payload, selection, locale, "2026-10-01T12:00:00Z");
    check(snapshot.files.map(f => f.name).join(",") === "README.md,workspace.json,links.json,sources-summary.csv,citation.txt", "Setup-only snapshot file inventory");
    check(snapshot.setup.linked_methods.every(id => payload.methods.some(method => method.id === id && method.state === "active")), "Snapshot excludes unavailable methods");
    for (const link of Object.values(links).flat()) {
      const pathname = new URL(link.url, "https://hy-central-europe-analysis.org").pathname;
      const file = pathname.startsWith("/research-data/") ? path.join(root, "public", pathname) : sourceOnly ? path.join(root, "src/app", pathname.startsWith("/en/") ? "(english)" : "(zh)", pathname, "page.tsx") : path.join(root, "out", pathname, "index.html");
      check(fs.existsSync(file), `Unresolved deep link ${link.url}`);
    }
    const text = JSON.stringify({ title: workspace.title, intro: workspace.introduction, questions: workspace.questions });
    check(!/most vulnerable|performed best|winners\/losers|government policy cause|政府表现最好|最脆弱|政策导致/i.test(text), "Unsupported conclusive question");
  }
}
const frozen = execFileSync("git", ["diff", "--name-only", "0ba4462f88a94cbd56b85bd8879939ab151c55f3", "--", "src/data", "public/research-data", "src/lib/varEngine.ts", "src/lib/networkEngine.ts", "src/lib/timeSeriesTransforms.ts", "src/lib/localProjectionEngine.ts", "src/lib/panelEngine.ts", "pnpm-lock.yaml"], { cwd: root, encoding: "utf8" });
check(unapprovedFrozenChanges(frozen,"0ba4462f88a94cbd56b85bd8879939ab151c55f3").length === 0, "Canonical data / registered engines / lockfile changed outside approved additive Germany stores");
check(load("@/data/release.json").version.startsWith("v2.0 "), "Platform v2.0 unchanged");
console.log(JSON.stringify({ status: failures.length ? "fail" : "pass", checks, workspaces: researchWorkspaces.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
