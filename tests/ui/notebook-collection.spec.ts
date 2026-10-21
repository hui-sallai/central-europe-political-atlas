import fs from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptyNotebook, addNotebookEvidence, NOTEBOOK_STORAGE_KEY } from "../../src/lib/researchNotebook";
import { PROJECT_SCHEMA, NOTEBOOK_PROJECTS_KEY, parseProjectRegistry } from "../../src/lib/notebookProjects";
const book = () => ({ ...addNotebookEvidence(emptyNotebook("en", "v2.0"), { type: "workspace", title: "Literal <script> & 原文", url: "https://hy-central-europe-analysis.org/workspaces/inflation_monetary_policy/", canonical_ids: ["inflation_monetary_policy"], countries: ["hungary"], periods: ["2025"], sources: [{institution:"Original Publisher",dataset:"Recorded source",url:"https://example.org/original",layer:"descriptive"}], layer:"workspace_setup", warnings:["No generated conclusions"], metadata:{} }, "v2.0"), title: "Backup 原文", research_question: "Recorded question", user_notes: "Preserve notes <script>" });
const collection = () => ({schema:PROJECT_SCHEMA, revision:"backup-revision", active_id:"original", projects:[{id:"original",notebook:book()},{id:"second",notebook:{...emptyNotebook("en","v2.0"),title:"Second backup"}}]});
const file = (raw: string) => ({name:"collection.json",mimeType:"application/json",buffer:Buffer.from(raw)});
const stored = (page:Page) => page.evaluate(key=>localStorage.getItem(key),NOTEBOOK_PROJECTS_KEY);
for(const prefix of ["","/en"]) {
 const en=!!prefix, input=en?"Choose collection JSON backup":"选择集合 JSON 备份", apply=en?"Confirm collection restore":"确认恢复集合", mode=en?"Collection restore decision":"集合恢复方式";
 async function open(page:Page) { await page.goto(`${prefix}/notebook/`,{waitUntil:"networkidle"});await expect(page.getByLabel(en?"Choose research project":"选择研究项目",{exact:true})).toBeEnabled();await page.locator('[data-notebook-collection] summary').click(); }
 test(`full collection JSON restores pristine browser with exact identities and sources ${prefix||"zh"}`,async({page})=>{
   const backup=collection(),raw=JSON.stringify(backup);await open(page);await page.getByLabel(input,{exact:true}).setInputFiles(file(raw));
   await expect(page.locator('[data-collection-preview]')).toContainText("Backup 原文");expect(await stored(page)).toBeNull();
   page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:apply,exact:true}).click();
   await expect(page.locator('[data-active-project]')).toContainText("Backup 原文");
   await expect.poll(async()=>JSON.parse((await stored(page))??'{}').projects?.length).toBe(2);
   const saved=parseProjectRegistry((await stored(page))!);expect(saved.projects).toEqual(backup.projects);expect(saved.active_id).toBe(backup.active_id);expect(saved.revision).not.toBe(backup.revision);
   const wait=page.waitForEvent('download');await page.getByRole('button',{name:en?'Back Up All Research Projects':'备份全部研究项目',exact:true}).click();
   const downloaded=JSON.parse(fs.readFileSync((await(await wait).path())!,'utf8'));expect(downloaded).toEqual(saved);
   await page.reload({waitUntil:'networkidle'});await expect(page.locator('[data-notebook-item]')).toContainText('Literal <script> & 原文');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 });
 test(`merge collision, replacement confirmation, preview and legacy protection ${prefix||"zh"}`,async({page},info)=>{
   const backup=collection(),raw=JSON.stringify(backup),old=JSON.stringify(book());
   await page.addInitScript(({key,raw,legacy,old})=>{if(!localStorage.getItem(key))localStorage.setItem(key,raw);if(!localStorage.getItem(legacy))localStorage.setItem(legacy,old);},{key:NOTEBOOK_PROJECTS_KEY,raw,legacy:NOTEBOOK_STORAGE_KEY,old});
   await open(page);await page.getByLabel(input,{exact:true}).setInputFiles(file(raw));
   await expect(page.locator('[data-collection-preview]')).toContainText(en?'Colliding project IDs':'冲突的项目外层 ID');expect(await stored(page)).toBe(raw);
   await page.locator('[data-notebook-collection]').screenshot({path:info.outputPath('collection-preview.png')});
   const previewAxe=await new AxeBuilder({page}).include('[data-notebook-collection]').analyze();expect(previewAxe.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
   page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:apply,exact:true}).click();expect(await stored(page)).toBe(raw);
   page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:apply,exact:true}).click();
   await expect.poll(async()=>JSON.parse((await stored(page))!).projects.length).toBe(4);
   const merged=parseProjectRegistry((await stored(page))!);expect(merged.projects.slice(0,2)).toEqual(backup.projects);expect(merged.projects.slice(2).map(p=>p.notebook)).toEqual(backup.projects.map(p=>p.notebook));expect(new Set(merged.projects.map(p=>p.id)).size).toBe(4);
   await page.getByLabel(input,{exact:true}).setInputFiles(file(raw));await page.getByLabel(mode,{exact:true}).selectOption('replace');
   page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:apply,exact:true}).click();expect(parseProjectRegistry((await stored(page))!).projects.length).toBe(4);
   page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:apply,exact:true}).click();
   await expect.poll(async()=>JSON.parse((await stored(page))!).projects.length).toBe(2);expect(parseProjectRegistry((await stored(page))!).projects).toEqual(backup.projects);
   expect(await page.evaluate(key=>localStorage.getItem(key),NOTEBOOK_STORAGE_KEY)).toBe(old);
   const axe=await new AxeBuilder({page}).include('[data-notebook-projects]').analyze();expect(axe.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
 });
 test(`malformed future and oversized collection files never write; stale preview fails closed ${prefix||"zh"}`,async({page})=>{
   await open(page);
   for(const raw of ['{broken',JSON.stringify({...collection(),schema:'atlas-notebook-projects-v99'}),' '.repeat(3000001)]) {
     await page.getByLabel(input,{exact:true}).setInputFiles(file(raw));await expect(page.locator('[data-notebook-collection] [role="alert"]')).toBeVisible();expect(await stored(page)).toBeNull();await expect(page.locator('[data-collection-preview]')).toHaveCount(0);
   }
   await page.getByLabel(input,{exact:true}).setInputFiles(file(JSON.stringify(collection())));
   await page.getByLabel(en?'Notebook title':'笔记标题',{exact:true}).fill('Changed after preview');
   await expect(page.getByRole('button',{name:apply,exact:true})).toBeEnabled();const before=await stored(page);
   page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:apply,exact:true}).click();
   await expect(page.locator('[data-notebook-collection] [role="alert"]')).toBeVisible();expect(await stored(page)).toBe(before);
 });
 test(`quota failure and another tab cannot replace the collection from a preview ${prefix||"zh"}`,async({page,context})=>{
   await open(page);await page.getByLabel(input,{exact:true}).setInputFiles(file(JSON.stringify(collection())));
   await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='central-europe-atlas:notebook-projects:v1')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value);};});
   page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:apply,exact:true}).click();
   await expect(page.locator('[data-notebook-collection] [role="alert"]')).toBeVisible();expect(await stored(page)).toBeNull();await expect(page.getByLabel(input,{exact:true})).toBeDisabled();
   await page.reload({waitUntil:'networkidle'});await page.locator('[data-notebook-collection] summary').click();await page.getByLabel(input,{exact:true}).setInputFiles(file(JSON.stringify(collection())));
   const other=await context.newPage();await other.goto(`${prefix}/notebook/`,{waitUntil:'networkidle'});await other.getByLabel(en?'Notebook title':'笔记标题',{exact:true}).fill('Remote edit');await expect(other.getByLabel(en?'Choose research project':'选择研究项目',{exact:true})).toBeEnabled();
   const remote=await stored(other);await expect(page.getByLabel(en?'Notebook title':'笔记标题',{exact:true})).toHaveValue('Remote edit');
   page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:apply,exact:true}).click();await expect(page.locator('[data-notebook-collection] [role="alert"]')).toBeVisible();expect(await stored(page)).toBe(remote);await other.close();
 });
}
