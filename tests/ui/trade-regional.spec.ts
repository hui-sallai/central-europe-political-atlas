import fs from 'node:fs';
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {NOTEBOOK_STORAGE_KEY,parseNotebook} from '../../src/lib/researchNotebook';
const pack=JSON.parse(fs.readFileSync('public/research-data/network_ui_pack.json','utf8'));
for(const prefix of ['', '/en']){
 const en=!!prefix;
 test(`Regional trade controls, chart, CSV, Notebook and restored URL ${prefix||'zh'}`,async({page},testInfo)=>{
  await page.goto(`${prefix}/models/?tab=run&skill=network_dependency&country=hungary`,{waitUntil:'networkidle'});
  const panel=page.locator('[data-trade-workbench]'),control=(zh:string,english:string)=>panel.getByRole('combobox',{name:en?english:zh,exact:true});
  await expect(panel.locator('[data-trade-session]')).toBeVisible();await control('比较模式','Comparison mode').selectOption('regional');
  await expect(panel.locator('[data-notebook-add]')).toBeDisabled();
  const selected=panel.getByRole('group',{name:en?'Regional countries (select 3–5)':'区域国家（选择3–5国）',exact:true});
  for(const name of (en?['Poland','Germany','Austria','Slovakia']:['波兰','德国','奥地利','斯洛伐克']))await selected.getByRole('checkbox',{name,exact:true}).check();
  await expect(selected.getByRole('checkbox',{checked:true})).toHaveCount(5);
  await expect(selected.getByRole('checkbox',{checked:false}).first()).toBeDisabled();
  await control('参照年份','Reference year').selectOption('2022');await control('起始年','From year').selectOption('2021');await control('结束年','To year').selectOption('2023');await control('历史指标','Historical metric').selectOption('china_share');
  await expect(panel.locator('[data-trade-regional] tbody tr')).toHaveCount(5);
  const blocked=panel.locator('[data-trade-regional] tbody tr').filter({hasText:en?'Slovakia':'斯洛伐克'});await expect(blocked.locator('td').nth(1)).toHaveText('—');await expect(blocked).toContainText(en?'failed':'未通过');
  const chart=panel.getByRole('group',{name:en?'China trade share · Imports · 2021–2023':'中国贸易份额 · 进口 · 2021–2023',exact:true});
  await expect(chart.locator('circle[role=button]')).toHaveCount(11);await chart.locator('circle[role=button]').first().focus();await page.keyboard.press('Enter');await expect(panel.locator('[aria-labelledby=trade-history-title] [aria-live=polite]')).toContainText('UN Comtrade');
  const downloadPromise=page.waitForEvent('download');await panel.locator('[data-trade-export]').click();const download=await downloadPromise;const stream=await download.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(chunk);const csv=Buffer.concat(chunks).toString('utf8');expect(csv.split('\r\n')).toHaveLength(16);expect(csv).toContain('"coverage_failed"');expect(csv).toContain('"china_share","","fraction (0–1)"');
  await panel.locator('[data-notebook-add]').click();await expect.poll(()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)??'{}').items?.length,NOTEBOOK_STORAGE_KEY)).toBe(1);const notebook=parseNotebook((await page.evaluate(k=>localStorage.getItem(k),NOTEBOOK_STORAGE_KEY))!);expect(notebook.items[0].countries).toEqual(['hungary','poland','germany','austria','slovakia']);expect(notebook.items[0].metadata.row_count).toBe(11);expect(notebook.items[0].metadata.filters!.comparison_mode).toBe('regional');expect(notebook.items[0].canonical_ids.some(id=>id.includes('slovakia')||id.includes('germany:2022'))).toBe(false);
  await expect.poll(()=>new URL(page.url()).searchParams.get('trade_countries')).toBe('hungary,poland,germany,austria,slovakia');await page.reload({waitUntil:'networkidle'});await expect(control('比较模式','Comparison mode')).toHaveValue('regional');await expect(control('历史指标','Historical metric')).toHaveValue('china_share');await expect(panel.locator('[data-trade-regional] tbody tr')).toHaveCount(5);
  await page.screenshot({path:testInfo.outputPath('regional-five-countries.png'),fullPage:true});
  await selected.getByRole('checkbox',{name:en?'Austria':'奥地利',exact:true}).uncheck();await selected.getByRole('checkbox',{name:en?'Slovakia':'斯洛伐克',exact:true}).uncheck();await expect(panel.locator('[data-trade-regional] tbody tr')).toHaveCount(3);await expect(selected.getByRole('checkbox',{checked:false}).first()).toBeEnabled();
  for(const metric of ['partner_hhi','china_share','germany_share','top_partner_share','diversification','weighted_trade_volume','partner_count']){await control('历史指标','Historical metric').selectOption(metric);await expect(panel.locator('[data-trade-regional] tbody tr')).toHaveCount(3);await expect.poll(()=>new URL(page.url()).searchParams.get('trade_metric')).toBe(metric);}
  await control('历史指标','Historical metric').selectOption('germany_share');const german=panel.locator('[data-trade-regional] tbody tr').filter({hasText:en?'Germany':'德国'}).filter({has:page.locator('th',{hasText:en?'Germany':'德国'})});await expect(german.locator('td').nth(1)).toHaveText('—');
  await control('贸易流向','Trade flow').selectOption('exports');await control('历史指标','Historical metric').selectOption('china_share');await expect.poll(()=>new URL(page.url()).searchParams.get('trade_flow')).toBe('exports');await expect(panel.locator('[aria-labelledby=trade-history-title] circle[role=button]')).toHaveCount(9);
  for(const dark of [false,true]){await page.evaluate(d=>document.documentElement.classList.toggle('dark',d),dark);const axe=await new AxeBuilder({page}).include('[data-trade-workbench]').analyze();expect(axe.violations.filter(v=>['critical','serious'].includes(v.impact??''))).toEqual([]);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await control('比较模式','Comparison mode').selectOption('standard');await expect(control('国家 A','Country A')).toHaveValue('hungary');await expect(panel.locator('[data-trade-comparison]')).toBeVisible();
 });
 test(`Regional invalid URL and definition mismatch stay unavailable ${prefix||'zh'}`,async({page})=>{
  const panel=page.locator('[data-trade-workbench]');await page.goto(`${prefix}/models/?tab=run&skill=network_dependency&trade_mode=regional&trade_countries=hungary,poland,unknown`,{waitUntil:'networkidle'});await expect(panel.locator('[data-trade-url-warning]')).toBeVisible();await expect(panel.locator('[data-notebook-add]')).toBeDisabled();await expect(panel.locator('[data-trade-export]')).toBeDisabled();
  const changed=structuredClone(pack);changed.records.find((g:{reporter:string;year:number;flow:string})=>g.reporter==='poland'&&g.year===2020&&g.flow==='imports').coverage.threshold=.96;
  await page.route('**/research-data/network_ui_pack.json',route=>route.fulfill({json:changed}));await page.goto(`${prefix}/models/?tab=run&skill=network_dependency&trade_mode=regional&trade_countries=hungary,poland,germany&trade_year=2020&trade_pack=${'0'.repeat(64)}`,{waitUntil:'networkidle'});await expect(panel.locator('[data-trade-pack-warning]')).toBeVisible();await expect(panel.locator('[data-notebook-add]')).toBeDisabled();await expect(panel.locator('[data-trade-regional] tbody tr').first().locator('td').nth(1)).toHaveText('—');await expect(panel.locator('[data-trade-export]')).toBeDisabled();
 });
}
