import fs from "node:fs";
import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { emptyNotebook, NOTEBOOK_STORAGE_KEY, parseNotebook, addNotebookEvidence, serializeNotebook, type EvidenceDraft } from "../../src/lib/researchNotebook";
const version = "v2.0 VAR Dynamic-Response Publication-Gate Consolidation";
const workspace = "/en/workspaces/inflation_monetary_policy/?countries=hungary&from=2021&to=2026";
const draft: EvidenceDraft = { type:"workspace",title:"Example setup",labels:{en:"Example setup","zh-CN":"示例设置"},url:"https://hy-central-europe-analysis.org/en/workspaces/inflation_monetary_policy/?countries=hungary&from=2021&to=2026",canonical_ids:["inflation_monetary_policy"],countries:["hungary"],periods:["2021","2026"],sources:[],layer:"workspace_setup",warnings:["Descriptive setup only"],metadata:{filters:{countries:["hungary"],from:2021,to:2026}} };
async function count(page: Page,n: number) { await expect(page.locator("header").getByRole("link",{name:new RegExp(`Notebook · ${n}$`)})).toBeVisible(); }
async function stored(page: Page) { return parseNotebook((await page.evaluate(key=>localStorage.getItem(key),NOTEBOOK_STORAGE_KEY))!); }
function unzip(bytes: Buffer): Record<string,string> { return JSON.parse(execFileSync("python3",["-c","import sys,io,zipfile,json; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; print(json.dumps({n:z.read(n).decode('utf-8') for n in z.namelist()}))"],{input:bytes}).toString()); }
test("collect six surfaces, notes survive locale switch, seven-file export, clear and import",async({page})=>{
  const writes:string[]=[];page.on("request",r=>{if(!["GET","HEAD"].includes(r.method()))writes.push(r.url());});
  await page.goto("/en/data/?tab=annual&country=hungary&indicator=gdp_per_capita_eur&from=2025&to=2025",{waitUntil:"networkidle"});
  await page.locator('[data-snapshot-scope="annual"]').getByRole("button",{name:"Add to notebook",exact:true}).filter({visible:true}).first().click();await count(page,1);
  await page.locator('[data-snapshot-scope="annual"]').getByRole("button",{name:"Add current view to notebook",exact:true}).click();await count(page,2);
  await page.getByRole("button",{name:"Added",exact:true}).first().click();await count(page,2);
  await page.goto("/en/countries/hungary/?compare=poland",{waitUntil:"networkidle"});
  await page.locator("[data-country-compare]").getByRole("button",{name:"Add current view to notebook",exact:true}).click();await count(page,3);
  await page.goto("/en/news/?country=hungary",{waitUntil:"networkidle"});await page.getByRole("button",{name:"Add to notebook",exact:true}).first().click();await count(page,4);
  await page.goto("/en/map/?countries=hungary&layer=regional_gdp_per_capita&year=2024&classification=equal_interval",{waitUntil:"networkidle"});await page.getByRole("button",{name:"Add current view to notebook",exact:true}).click();await count(page,5);
  await page.goto("/en/models/?tab=run&skill=reduced_form_var",{waitUntil:"networkidle"});await page.getByRole("button",{name:"Add to notebook",exact:true}).click();await count(page,6);
  await page.goto(workspace,{waitUntil:"networkidle"});await page.getByRole("button",{name:"Add workspace setup to notebook",exact:true}).click();await count(page,7);
  await page.locator("header").getByRole("link",{name:"Notebook · 7",exact:true}).click();
  for(const type of ["observation","series_view","country_comparison","event","map_view","method","workspace"])await expect(page.locator(`[data-notebook-item="${type}"]`)).toHaveCount(1);
  const note="我的原始笔记 — no automatic translation <script>not executed</script>";
  await page.getByLabel("Notebook title",{exact:true}).fill("My evidence session");await page.getByRole("textbox",{name:"Research question",exact:true}).fill("What can these descriptive sources show?");
  await page.locator("[data-user-note]").first().fill(note);await page.getByLabel("User note",{exact:true}).last().fill("个人笔记，仅由用户撰写。");
  await page.getByRole("link",{name:"中文",exact:true}).click();await expect(page.locator("[data-user-note]").first()).toHaveValue(note);
  await page.getByRole("link",{name:"English",exact:true}).click();await expect(page.locator("[data-user-note]").first()).toHaveValue(note);await count(page,7);
  const state=await stored(page);expect(state.items.find(i=>i.type==="map_view")?.metadata.classification).toBe("equal_interval");expect(state.items.find(i=>i.type==="event")?.metadata.status).toBe("verified");expect(state.items.find(i=>i.type==="method")?.warnings.length).toBeGreaterThan(0);expect(state.items.find(i=>i.type==="series_view")?.metadata).not.toHaveProperty("rows");
  const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Export research notebook",exact:true}).click();const download=await downloadPromise;const files=unzip(fs.readFileSync((await download.path())!));
  expect(Object.keys(files)).toEqual(["README.md","notebook.json","evidence.csv","sources.csv","citations.md","links.json","notes.md"]);expect(parseNotebook(files["notebook.json"]).items[0].note).toBe(note);expect(files["notes.md"]).toContain(note);expect(files["notes.md"]).not.toContain("Eurostat");
  page.once("dialog",d=>d.dismiss());await page.getByRole("button",{name:"Clear research notebook",exact:true}).click();await count(page,7);
  page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"Clear research notebook",exact:true}).click();await count(page,0);
  await page.getByLabel("Import notebook JSON",{exact:true}).setInputFiles({name:"notebook.json",mimeType:"application/json",buffer:Buffer.from(files["notebook.json"])});await count(page,7);await expect(page.locator("[data-user-note]").first()).toHaveValue(note);
  expect(writes).toEqual([]);
  expect(state.items.find(i=>i.type==="method")?.canonical_ids).toEqual(["reduced_form_var"]);
  expect(state.items.find(i=>i.type==="method")?.warning_labels?.en).toContain("Coefficient estimation is available; formal dynamic responses and formal IRFs are unavailable for publication.");
});
for(const locale of ["zh-CN","en"] as const)test(`empty notebook, light/dark accessibility and mobile: ${locale}`,async({page})=>{
  await page.goto(locale==="en"?"/en/notebook/":"/notebook/",{waitUntil:"networkidle"});await expect(page.locator("[data-notebook-page] h1")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText(locale==="en"?"Saved locally":"已保存到本地");
  expect(await page.evaluate(key=>localStorage.getItem(key),NOTEBOOK_STORAGE_KEY)).toBeNull();
  for(const scheme of ["light","dark"] as const){await page.emulateMedia({colorScheme:scheme});expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);expect(await page.locator("body").evaluate(el=>el.scrollWidth<=innerWidth+2)).toBe(true);}
});
for(const raw of ["{broken",JSON.stringify({...emptyNotebook("en",version),schema:"atlas-research-notebook-v99"})])test(`corrupt/future storage is protected: ${raw.slice(0,12)}`,async({page})=>{
  await page.addInitScript(({key,raw})=>localStorage.setItem(key,raw),{key:NOTEBOOK_STORAGE_KEY,raw});await page.goto("/en/notebook/",{waitUntil:"networkidle"});
  await expect(page.getByRole("status")).toContainText("has not been overwritten");expect(await page.evaluate(key=>localStorage.getItem(key),NOTEBOOK_STORAGE_KEY)).toBe(raw);
  await expect(page.getByLabel("Notebook title",{exact:true})).toBeDisabled();
  const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Download stored text for recovery",exact:true}).click();const download=await downloadPromise;expect(fs.readFileSync((await download.path())!,"utf8")).toBe(raw);
  page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"Clear research notebook",exact:true}).click();await expect(page.getByRole("status")).toContainText("Saved locally");
});
test("storage unavailable keeps memory edits and permits export",async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(Storage.prototype,"getItem",{value(){throw new DOMException("Denied","SecurityError")}});Object.defineProperty(Storage.prototype,"setItem",{value(){throw new DOMException("Denied","SecurityError")}});});
  await page.goto("/en/notebook/",{waitUntil:"networkidle"});await expect(page.getByRole("status")).toContainText("memory only");await page.getByLabel("Notebook title",{exact:true}).fill("Memory-only title");await expect(page.getByLabel("Notebook title",{exact:true})).toHaveValue("Memory-only title");
  const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Export research notebook",exact:true}).click();const download=await downloadPromise;expect(parseNotebook(unzip(fs.readFileSync((await download.path())!))["notebook.json"]).title).toBe("Memory-only title");
});
test("quota failure preserves stored evidence; malformed import cannot overwrite notes",async({page})=>{
  const state=addNotebookEvidence(emptyNotebook("en",version),draft,version);state.items[0].note="Keep me";const raw=serializeNotebook(state);
  await page.addInitScript(({key,raw})=>{localStorage.setItem(key,raw);Object.defineProperty(Storage.prototype,"setItem",{value(){throw new DOMException("Full","QuotaExceededError")}});},{key:NOTEBOOK_STORAGE_KEY,raw});
  await page.goto("/en/notebook/",{waitUntil:"networkidle"});await page.locator("[data-user-note]").fill("Memory edit");await expect(page.getByRole("status")).toContainText("memory only");expect(await page.evaluate(key=>localStorage.getItem(key),NOTEBOOK_STORAGE_KEY)).toBe(raw);
  await page.getByLabel("Import notebook JSON",{exact:true}).setInputFiles({name:"bad.json",mimeType:"application/json",buffer:Buffer.from('{"schema":"unsupported"}')});await expect(page.getByRole("status")).toContainText("Action rejected");await expect(page.locator("[data-user-note]")).toHaveValue("Memory edit");
  page.once("dialog", async dialog => { expect(dialog.message()).toContain("only in memory"); await dialog.dismiss(); });
  await page.getByRole("link", { name:"中文", exact:true }).click();
  await expect(page.locator("[data-user-note]")).toHaveValue("Memory edit");expect(await page.evaluate(key=>localStorage.getItem(key),NOTEBOOK_STORAGE_KEY)).toBe(raw);
});
test("import replacement requires confirmation; unsafe URLs rejected; strings remain plain text",async({page})=>{
  const state=addNotebookEvidence(emptyNotebook("en",version),draft,version);await page.goto("/en/notebook/",{waitUntil:"networkidle"});const file=(v:unknown)=>({name:"notebook.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(v))});
  await page.getByLabel("Import notebook JSON",{exact:true}).setInputFiles(file(state));await count(page,1);await page.locator("[data-user-note]").fill("Existing note");
  page.once("dialog",d=>d.dismiss());await page.getByLabel("Import notebook JSON",{exact:true}).setInputFiles(file(state));await expect(page.locator("[data-user-note]")).toHaveValue("Existing note");
  const unsafe=structuredClone(state);unsafe.items[0].url="javascript:alert(1)";await page.getByLabel("Import notebook JSON",{exact:true}).setInputFiles(file(unsafe));await expect(page.getByRole("status")).toContainText("Action rejected");
  state.title='<img src="x" onerror="window.notebookAttack=true">';page.once("dialog",d=>d.accept());await page.getByLabel("Import notebook JSON",{exact:true}).setInputFiles(file(state));await expect(page.getByLabel("Notebook title",{exact:true})).toHaveValue(state.title);expect(await page.evaluate(()=>"notebookAttack" in window)).toBe(false);await expect(page.locator('[data-notebook-page] img')).toHaveCount(0);
});
test("filter, reorder, remove and inactive method reference retain boundary",async({page})=>{
  let state=addNotebookEvidence(emptyNotebook("en",version),draft,version);state=addNotebookEvidence(state,{...draft,type:"method",title:"Blocked reference",canonical_ids:["blocked_reference"],countries:[],periods:[],metadata:{state:"blocked"}},version);
  await page.addInitScript(({key,raw})=>localStorage.setItem(key,raw),{key:NOTEBOOK_STORAGE_KEY,raw:serializeNotebook(state)});await page.goto("/en/notebook/",{waitUntil:"networkidle"});
  const method=page.locator('[data-notebook-item="method"]');await expect(method).toContainText("Not currently runnable");await expect(method.getByRole("button",{name:/Run/})).toHaveCount(0);
  await method.getByRole("button",{name:"Move up",exact:true}).click();expect((await stored(page)).items[0].type).toBe("method");
  await page.getByLabel("Evidence type",{exact:true}).selectOption("workspace");await expect(method).toHaveCount(0);await page.getByLabel("Evidence type",{exact:true}).selectOption("all");await page.getByLabel("Country",{exact:true}).selectOption("hungary");await expect(method).toHaveCount(0);await page.getByLabel("Country",{exact:true}).selectOption("all");
  await method.getByRole("button",{name:"Remove item",exact:true}).click();await count(page,1);
});
test("capacity warning and rejected collection preserve a full notebook",async({page})=>{
  let state=emptyNotebook("en",version);for(let i=0;i<100;i++)state=addNotebookEvidence(state,{...draft,periods:[String(1900+i)]},version);
  const raw=serializeNotebook(state);await page.addInitScript(({key,raw})=>localStorage.setItem(key,raw),{key:NOTEBOOK_STORAGE_KEY,raw});
  await page.goto("/en/notebook/",{waitUntil:"networkidle"});await expect(page.locator("[data-notebook-capacity]")).toContainText("Approaching the notebook limit");
  await page.goto("/en/data/?tab=annual&country=hungary&indicator=gdp_per_capita_eur&from=2025&to=2025",{waitUntil:"networkidle"});
  await page.locator('[data-snapshot-scope="annual"]').getByRole("button",{name:"Add to notebook",exact:true}).filter({visible:true}).first().click();
  await expect(page.getByText(/Action rejected: invalid content or size limit/).filter({visible:true}).first()).toBeVisible();await count(page,100);
  expect(await page.evaluate(key=>localStorage.getItem(key),NOTEBOOK_STORAGE_KEY)).toBe(raw);
});
