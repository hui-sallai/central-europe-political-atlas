import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {activeNotebookRaw} from './notebook-storage';
for(const prefix of ['', '/en']){
 const en=Boolean(prefix);
 test(`national definitions, representation, separate polling and Notebook ${en?'en':'zh'}`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${prefix}/politics/?election=el-de-bt-2025-02-23`,{waitUntil:'networkidle'});
  const panel=page.locator('[data-politics-explorer]'),details=panel.locator('[data-national-research]');
  await details.locator('summary').focus();await page.keyboard.press('Enter');await expect(details).toHaveAttribute('open','');
  await expect(details).toContainText('Bundestag');await expect(details).toContainText('2025-02-23');
  await expect(details.locator('[data-vote-seat-table] tbody tr')).toHaveCount(29);
  const spd=details.locator('tbody tr').filter({hasText:'pp-de-0001'});await expect(spd).toContainText('16.4%');await expect(spd).toContainText('2.65');
  await expect(spd).toContainText('pp-de-0001');await expect(spd.getByRole('link')).toHaveAttribute('href',/bundeswahlleiterin/);
  const polling=panel.locator('[data-political-polling]');await expect(polling.locator('[data-polling-unavailable]')).toContainText(en?'no owner-authorised':'尚无经所有者授权');await expect(polling.locator('svg')).toHaveCount(0);await expect(polling.locator('tbody')).toHaveCount(0);
  await polling.locator('summary').click();await expect(polling).toContainText(en?'No default pooling':'不默认合并');
  await panel.locator('[data-notebook-add]').first().click();await expect.poll(async()=>JSON.parse((await activeNotebookRaw(page))??'{}').items?.length).toBe(1);const item=JSON.parse((await activeNotebookRaw(page))!).items[0];expect(item.countries).toEqual(['germany']);expect(item.layer).toBe('national_election_second_votes');expect(item.canonical_ids).toContain('el-de-bt-2025-02-23');
  await page.addStyleTag({content:'*, *::before, *::after { transition: none !important; animation: none !important; }'});
  for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);const axe=await new AxeBuilder({page}).include('[data-national-research]').include('[data-political-polling]').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);expect(errors).toEqual([]);await page.screenshot({path:info.outputPath('national-foundation.png'),fullPage:true});
 });
 test(`unsupported vote deep link is not silently replaced ${en?'en':'zh'}`,async({page})=>{
  await page.goto(`${prefix}/politics/?election=el-de-bt-2025-02-23&vote_type=unsupported`,{waitUntil:'networkidle'});const p=page.locator('[data-politics-explorer]');await expect(p.getByRole('status')).toContainText(en?'no other vote type':'未默默替换');await expect(p.locator('[data-politics-summary]')).toHaveCount(0);
  await p.getByRole('button',{name:en?'Return to the registered primary vote':'返回登记的主要选票',exact:true}).click();await expect(p.locator('[data-politics-summary]')).toBeVisible();await expect(page).not.toHaveURL(/vote_type=/);
 });
}
