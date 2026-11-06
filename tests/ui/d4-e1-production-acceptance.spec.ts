import {test,expect,type Locator,type Page} from '@playwright/test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import observations from '../../src/data/observations/observations.json';
const CZ='cz-2023-10-16-repowereu-plan',HU='hu-2022-08-12-catl-debrecen';
async function download(page:Page,button:Locator,path:string){const pending=page.waitForEvent('download');await button.click();const file=await pending;await file.saveAs(path);return fs.readFile(path,'utf8');}
const digest=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
for(const [id,country]of [[CZ,'czechia'],[HU,'hungary']])test(`production E1 ${country}: deep link, actual exports, source references and scope`,async({page},info)=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(`/en/models/?tab=run&skill=event_window_analysis&country=${country}&event=${id}&section=case`,{waitUntil:'networkidle'});expect(response?.status()).toBe(200);
 const study=page.locator(`[data-case-study="${id}"]`);await expect(study).toBeVisible();await expect(page.locator('#event-case-study')).toBeFocused();
 const e1=study.locator('[data-case-section="mechanism-research"]');await expect(e1).toBeVisible();await expect(e1.locator('[data-e1-assessment-kind="hypothesis"]')).toBeVisible();
 if(id===CZ){await expect(study.locator('[data-case-window="full"]')).toBeVisible();await expect(study.locator('[data-case-window-stats]')).toContainText('12 / 12');await expect(study.locator('[data-case-chain="research_hypothesis"]')).toHaveCount(1);}else{await expect(study.locator('[data-case-window-blocker]')).toContainText('monthly');await expect(study.locator('[data-case-window]')).toHaveCount(0);await expect(e1.locator('[data-e1-event]')).toContainText('company statement');await expect(study.locator('[data-case-chain="unsupported_connection"]')).toContainText('announced amount');}
 const raw=await download(page,e1.locator('[data-e1-export-json]'),info.outputPath(`${country}-e1.json`)),json=JSON.parse(raw),ev=json.evidence;
 expect(ev.records.map((r:{event_id:string})=>r.event_id).sort()).toEqual([CZ,HU]);expect(ev.effect_estimated).toBe(false);expect(digest(ev)).toBe(json.evidence_sha256);await expect(e1.locator('[data-e1-digest]')).toContainText(json.evidence_sha256);
 expect(ev.windows[HU]).toBeNull();if(id===CZ)expect(ev.windows[CZ].gate).toBe('full');else expect(ev.windows[CZ]).toBeNull();
 const ids=new Set(ev.source_index.index.map((s:{id:string})=>s.id));expect(ids.size).toBe(ev.source_index.index.length);for(const s of ev.source_index.index){expect(s.url, s.id).toMatch(/^https:\/\//);expect(new URL(s.url).hostname).not.toMatch(/example|localhost/);}
 for(const refs of ev.source_index.refs)for(const k of ['event','annual','monthly','election','models'])for(const ref of refs[k])expect(ids.has(ref),ref).toBe(true);
 for(const r of ev.records)for(const a of r.indicators.annual)for(const o of a.observations.filter((o:{value:number|null})=>o.value!==null)){const original=observations.records.find(x=>x.id===o.observationId);expect(original).toBeDefined();expect(ev.source_index.index.find((s:{id:string})=>s.id===`observation:${o.observationId}`).url).toBe(original!.source_url);}
 const csv=await download(page,e1.locator('[data-e1-export-csv]'),info.outputPath(`${country}-e1.csv`));expect(csv).toContain(CZ);expect(csv).toContain(HU);expect(csv).toContain('source_refs');expect(csv).toContain('not_held');expect(csv).toContain(ev.schema_version);
 const again=JSON.parse(await download(page,e1.locator('[data-e1-export-json]'),info.outputPath(`${country}-e1-repeat.json`)));expect(again.evidence_sha256).toBe(json.evidence_sha256);
 await test.info().attach('export-integrity',{body:JSON.stringify({country,method:ev.schema_version,evidence_sha256:json.evidence_sha256,json_file_sha256:createHash('sha256').update(raw).digest('hex'),csv_file_sha256:createHash('sha256').update(csv).digest('hex'),source_hosts:[...new Set(ev.source_index.index.map((s:{url:string})=>new URL(s.url).hostname))],windows:ev.windows},null,2),contentType:'application/json'});expect(errors).toEqual([]);
});
test('production Poland D4 opens the existing case, calculations, sensitivity and traced exports',async({page},info)=>{
 test.setTimeout(120000);await page.goto('/en/politics/poland/?research_study=d4',{waitUntil:'networkidle'});const study=page.locator('[data-research-study]');await expect(study).toHaveAttribute('open','');await expect(study.locator('[data-research-study-pairs] tbody tr').first()).toBeVisible();await expect(study.locator('[data-research-study-models]')).toBeVisible();await expect(study).toContainText(/sensitivity/i);
 const jsonButton=study.locator('button').filter({hasText:/JSON/});const raw=await download(page,jsonButton,info.outputPath('poland-d4.json')),json=JSON.parse(raw);expect(digest(json.evidence)).toBe(json.evidence_sha256);expect(json.evidence.source_index.index.length).toBeGreaterThan(0);
 const csv=await download(page,study.locator('button').filter({hasText:/CSV/}),info.outputPath('poland-d4.csv'));expect(csv).toContain('source');expect(csv).toContain('sensitivity');await test.info().attach('D4-integrity',{body:JSON.stringify({digest:json.evidence_sha256,source_count:json.evidence.source_index.index.length,json_file_sha256:createHash('sha256').update(raw).digest('hex'),csv_file_sha256:createHash('sha256').update(csv).digest('hex')},null,2),contentType:'application/json'});
});
