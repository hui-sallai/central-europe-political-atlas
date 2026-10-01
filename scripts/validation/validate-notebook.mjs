import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const root = process.cwd(), nativeRequire = createRequire(import.meta.url), cache = new Map();
function load(request, parent = root) {
  if (!request.startsWith(".") && !request.startsWith("@/")) return nativeRequire(request);
  const base = request.startsWith("@/") ? path.join(root,"src",request.slice(2)) : path.resolve(parent,request);
  const file = [base,`${base}.ts`,`${base}.tsx`,`${base}.json`].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) throw Error(`Missing ${request}`); if (cache.has(file)) return cache.get(file).exports;
  const loadedModule = { exports: {} }; cache.set(file,loadedModule); const source = fs.readFileSync(file,"utf8");
  if (file.endsWith(".json")) loadedModule.exports = JSON.parse(source);
  else new Function("require","module","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText)(r=>load(r,path.dirname(file)),loadedModule,loadedModule.exports);
  return loadedModule.exports;
}
let checks = 0; const failures = []; const check = (value,message) => { checks++; if (!value) failures.push(message); };
const n = load("@/lib/researchNotebook"), { notebookMessages } = load("@/content/notebookMessages"), { notebookExportFiles } = load("@/lib/notebookExport"), { notebookObservation,notebookSnapshotView } = load("@/components/notebookEvidence");
const version = JSON.parse(fs.readFileSync("src/data/release.json","utf8")).version, time = "2026-10-01T12:00:00.000Z";
let state = n.emptyNotebook("en",version,time);
const source = { institution: "Statistical Office of the Republic of Serbia (SORS/RZS)", dataset: "CPI", url: "https://data.stat.gov.rs/Home/Result/030101", layer: "serbia_sors_descriptive", code: "030101", original_unit: "index", normalized_unit: "index" };
const draft = { type: "observation", title: "CPI", url: "https://hy-central-europe-analysis.org/en/data/?country=serbia&indicator=cpi_annual_index", canonical_ids: ["cpi_annual_index","serbia:cpi:2024"], countries: ["serbia"], periods: ["2024"], value: null, unit: "index", sources: [source], layer: "serbia_sors_descriptive", comparability: "not_cross_country_comparable", warnings: ["Source-defined CPI, not HICP"], metadata: { status: "missing" } };
check(n.validateNotebook(state),"First-use valid empty notebook");
state = n.addNotebookEvidence(state,draft,version,time);
check(n.validateNotebook(state),"Collected evidence validates");
check(state.items[0].value === null,"Missing stays null, not zero");
check(n.serializeNotebook(n.parseNotebook(n.serializeNotebook(state))) === n.serializeNotebook(state),"Serialization round trip");
check(n.addNotebookEvidence(state,draft,version,time) === state,"Duplicate canonical evidence does not mutate");
state.items[0].note = "保留原文 <script>alert(1)</script> =SUM(1,2)";
const same = { ...draft, title: "价格", url: draft.url.replace("/en/","/") };
check(n.addNotebookEvidence(state,same,version,time).items.length === 1,"Language switching does not duplicate identity");
check(n.addNotebookEvidence(state,same,version,time).items[0].note === state.items[0].note,"Dedup preserves user notes exactly");
check(state.sources[0].institution === source.institution && state.sources[0].code === "030101","SORS provenance and code retained");
for (const type of n.notebookTypes) {
  const d = { ...draft,type,canonical_ids:[`${type}_stable_id`],metadata: type === "method" ? { state:"blocked",readiness:"unchanged" } : {} };
  const next = n.addNotebookEvidence(state,d,version,time); check(n.validateNotebook(next),`Supported type ${type}`);
}
for (const status of ["registry_only","blocked","active"]) { const next = n.addNotebookEvidence(state,{...draft,type:"method",canonical_ids:[status],metadata:{state:status}},version,time); check(next.items.at(-1).metadata.state === status,`Method ${status} preserved`); }
const second = n.addNotebookEvidence(state,{...draft,periods:["2025"]},version,time); check(second.sources.length === 1,"Exact source identity deduplicated");
const zero = n.addNotebookEvidence(state,{...draft,periods:["2025"],value:0},version,time); check(zero.items.at(-1).value === 0,"Real zero is retained");
for (const unsafe of ["javascript:alert(1)","data:text/html,hello","https://user:password@example.com/a","https://hy-central-europe-analysis.org/data/?token=private"]) check(!n.safeNotebookUrl(unsafe),`Unsafe URL rejected ${unsafe.split(":")[0]}`);
check(!n.safeNotebookUrl("https://example.com/data/",true),"Atlas item URL limited to canonical host");
for (const raw of ["{", "null", "[]", JSON.stringify({...state,schema:"atlas-research-notebook-v99"})]) { let rejected=false;try{n.parseNotebook(raw)}catch{rejected=true}check(rejected,"Malformed / future-schema import rejected"); }
const mutate = (fn) => { const v=structuredClone(state);fn(v);return v; };
for (const [label,fn] of [
  ["malformed one item",v=>delete v.items[0].note], ["unknown evidence type",v=>v.items[0].type="estimate"], ["duplicate item ID",v=>v.items.push({...v.items[0]})], ["missing source ref",v=>v.items[0].source_ids=["unknown"]], ["raw series payload",v=>v.items[0].metadata.rows=[{value:1}]], ["SVG payload",v=>v.items[0].metadata.svg="<svg/>"], ["long note",v=>v.items[0].note="a".repeat(2001)], ["non-finite value",v=>v.items[0].value=NaN], ["unsafe imported URL",v=>v.items[0].url="javascript:alert(1)"], ["unsupported method state",v=>{v.items[0].type="method";v.items[0].metadata.state="unvalidated"}], ["invalid label",v=>v.items[0].labels={fr:"invented"}],
]) check(!n.validateNotebook(mutate(fn)),label);
let maximum = n.emptyNotebook("en",version,time); for(let i=0;i<100;i++)maximum=n.addNotebookEvidence(maximum,{...draft,periods:[String(1900+i)]},version,time);
check(maximum.items.length===100,"Maximum item count accepted"); let fullRejected=false;try{n.addNotebookEvidence(maximum,{...draft,periods:["2100"]},version,time)}catch{fullRejected=true}check(fullRejected,"Maximum item count enforced");
check(!n.validateNotebook({...maximum,items:maximum.items.map(i=>({...i,note:"a".repeat(2000)}))}),"Total note limit enforced");
const files=notebookExportFiles(state,time); check(files.map(f=>f.name).join(",")==="README.md,notebook.json,evidence.csv,sources.csv,citations.md,links.json,notes.md","Seven-file export inventory");
const formula = structuredClone(state);formula.items[0].unit="=SUM(1,2)";formula.items[0].layer="@unsafe";formula.items[0].periods=["+unsafe"];formula.items[0].identity=n.evidenceIdentity(formula.items[0]);
const formulaFiles=notebookExportFiles(formula,time);check(formulaFiles.find(f=>f.name==="evidence.csv").content.includes("'=SUM(1,2)") && formulaFiles.find(f=>f.name==="evidence.csv").content.includes("'@unsafe") && formulaFiles.find(f=>f.name==="evidence.csv").content.includes("'+unsafe"),"Every CSV string column is formula-safe");
check(n.parseNotebook(formulaFiles.find(f=>f.name==="notebook.json").content).items[0].unit==="=SUM(1,2)","CSV protection does not change original JSON text");
check(n.parseNotebook(files.find(f=>f.name==="notebook.json").content).items[0].note===state.items[0].note,"Export/import retains literal user note");
check(!files.find(f=>f.name==="notes.md").content.includes(source.institution),"Notes file contains no generated source prose");
check(files.find(f=>f.name==="evidence.csv").content.includes('"",'),"CSV missing numeric value stays empty");
check(n.notebookLimits.bytes===750000 && n.NOTEBOOK_STORAGE_KEY==="central-europe-atlas:research-notebook:v1","Documented storage and byte limit");
check(JSON.stringify(Object.keys(notebookMessages.en).sort())===JSON.stringify(Object.keys(notebookMessages["zh-CN"]).sort()),"Bilingual key parity");
for(const type of n.notebookTypes)for(const locale of ["en","zh-CN"])check(Boolean(notebookMessages[locale][type]),`Type label ${type}/${locale}`);
const obs=notebookObservation({id:"missing",country:"serbia",indicator:"cpi",period:"2024",value:null,unit:"index",layer:"serbia_sors_descriptive",status:"missing",source:{institution:source.institution,dataset:source.dataset,source_url:source.url,source_layer:source.layer}},draft.url,"CPI");check(obs.value===null && obs.sources[0].institution===source.institution,"Observation adapter preserves missing and SORS");
const view=notebookSnapshotView({title:"Series",view_type:"annual",page_path:"/data/",shareable_view_url:draft.url,countries:["serbia"],indicators:["cpi"],filters:{country:"serbia"},rows:[{id:"x",country:"serbia",indicator:"cpi",period:"2024",value:5,unit:"index",layer:"serbia_sors_descriptive",status:"verified"}]});check(!("rows" in view.metadata) && view.metadata.row_count===1,"Series view stores metadata, not full rows");
const notebookFiles=["src/lib/researchNotebook.ts","src/lib/notebookExport.ts","src/components/ResearchNotebookProvider.tsx","src/components/ResearchNotebookPage.tsx","src/components/NotebookCollect.tsx","src/components/NotebookSnapshotCollect.tsx","src/components/notebookEvidence.ts"];
for(const file of notebookFiles){const code=fs.readFileSync(file,"utf8");check(!/dangerouslySetInnerHTML|sendBeacon|fetch\s*\(|XMLHttpRequest|\.post\s*\(|axios|document\.cookie|navigator\.serviceWorker/.test(code),`${file}: no network write, tracking, HTML execution or cookies`);check(!/@\/data\/|src\/data\//.test(code),`${file}: no canonical-data imports`);}
check(!fs.existsSync("src/app/api"),"No server API endpoint");
check(fs.readFileSync("src/components/ResearchNotebookProvider.tsx","utf8").includes('["loading", "corrupt"]'),"Malformed stored state cannot be silently overwritten");
for(const route of ["src/app/(zh)/notebook/page.tsx","src/app/(english)/en/notebook/page.tsx"])check(fs.existsSync(route),`${route}: static page`);
const frozen=execFileSync("git",["diff","d83a6166072c0c295e7d385d25378cb710053a54","--name-only","--","src/data","public/research-data","pnpm-lock.yaml","src/lib/varEngine.ts","src/lib/panelEngine.ts","src/lib/localProjectionEngine.ts","src/lib/networkEngine.ts","src/lib/timeSeriesTransforms.ts"],{encoding:"utf8"});check(!frozen.trim(),"Canonical data / formal engines / dependencies unchanged");check(version.startsWith("v2.0 ") && JSON.parse(fs.readFileSync("package.json","utf8")).version==="2.0.0","Platform remains v2.0");
console.log(JSON.stringify({status:failures.length?"fail":"pass",checks,typical_serialized_bytes:Buffer.byteLength(n.serializeNotebook(state)),maximum_fixture_bytes:Buffer.byteLength(n.serializeNotebook(maximum)),failures},null,2));if(failures.length)process.exitCode=1;
