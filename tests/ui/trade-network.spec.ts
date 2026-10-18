import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import {test,expect} from '@playwright/test';
import {tradeCsv,tradeMetrics} from '../../src/lib/tradeNetworkPresentation';
const pack=JSON.parse(fs.readFileSync('public/research-data/network_ui_pack.json','utf8'));
for(const prefix of ['', '/en']){
 const en=!!prefix,route=`${prefix}/models/?tab=run&skill=network_dependency&country=hungary`;
 test(`Trade latest year, historical comparison, partner selection and CSV ${prefix||'zh'}`,async({page})=>{
  await page.goto(route,{waitUntil:'networkidle'});const panel=page.locator('[data-trade-workbench]');
  await expect(panel.getByRole("combobox",{name:en?'Reference year':'参照年份',exact:true})).toHaveValue('2025');
  await panel.getByRole("combobox",{name:en?'Country B':'国家 B',exact:true}).selectOption('poland');
  const a=pack.records.find((r:{reporter:string;year:number;flow:string})=>r.reporter==='hungary'&&r.year===2025&&r.flow==='imports');
  const b=pack.records.find((r:{reporter:string;year:number;flow:string})=>r.reporter==='poland'&&r.year===2025&&r.flow==='imports');
  await expect(panel.locator('[data-trade-metric="partner_hhi"] td').first()).toHaveText(en?'index (0–1)':'指数（0–1）');
  await expect(panel.locator('[data-trade-metric="partner_hhi"] td').nth(1)).toHaveText(a.metrics.partner_hhi.toLocaleString(en?'en':'zh-CN',{maximumFractionDigits:4}));
  await expect(panel.locator('[data-trade-metric="partner_hhi"] td').nth(2)).toHaveText(b.metrics.partner_hhi.toLocaleString(en?'en':'zh-CN',{maximumFractionDigits:4}));
  await expect(panel.locator('[data-chart="research-time-series"] circle[role="button"]')).toHaveCount(22);
  for(const metric of tradeMetrics){await panel.getByRole("combobox",{name:en?'Historical metric':'历史指标',exact:true}).selectOption(metric);await expect(panel.locator('[data-axis-title="y"]')).toContainText(metric==='weighted_trade_volume'?(en?'USD billion':'十亿美元'):metric==='partner_count'?(en?'partners':'个伙伴'):metric.endsWith('share')?'%':'0–1');}
  await panel.getByRole("combobox",{name:en?'Historical metric':'历史指标',exact:true}).selectOption('china_share');
  const point=panel.locator('[data-chart="research-time-series"] circle[role="button"]').first();await point.focus();await page.keyboard.press('Enter');
  await expect(panel.locator('.research-chart [aria-live="polite"]')).toContainText('2015');
  const node=panel.getByRole('group',{name:en?'Interactive trade-partner network':'可交互贸易伙伴网络',exact:true}).getByRole('button').first();await node.focus();await page.keyboard.press('Enter');
  await expect(panel.locator('[data-trade-partner-detail]')).toContainText('USD');await expect(node).toHaveAttribute('aria-pressed','true');
  for(const f of ['imports','exports'])await expect(panel.locator(`[data-trade-china-flow="${f}"]`)).toBeVisible();
  const wait=page.waitForEvent('download');await panel.locator('[data-trade-export]').click();const download=await wait;
  const expected=tradeCsv(pack,pack.records.filter((r:{reporter:string;flow:string})=>['hungary','poland'].includes(r.reporter)&&r.flow==='imports'),tradeMetrics);
  expect(fs.readFileSync((await download.path())!,'utf8')).toBe('\uFEFF'+expected);
  if(en)expect(await panel.innerText()).not.toMatch(/[\u3400-\u9fff]/u);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 });
 test(`Trade blocked groups, missing Germany year and flow-specific defaults ${prefix||'zh'}`,async({page})=>{
  await page.goto(route,{waitUntil:'networkidle'});const panel=page.locator('[data-trade-workbench]'),year=panel.getByRole("combobox",{name:en?'Reference year':'参照年份',exact:true});await expect(year).toHaveValue('2025');
  await panel.getByRole("combobox",{name:en?'Country B':'国家 B',exact:true}).selectOption('slovakia');
  await expect(panel.locator('[data-trade-coverage="slovakia"]')).toContainText(en?'failed':'未通过');
  await expect(panel.locator('[data-trade-metric="partner_hhi"] td').nth(3)).toHaveText('—');
  const download=page.waitForEvent('download');await panel.locator('[data-trade-export]').click();const csv=fs.readFileSync((await(await download).path())!,'utf8');expect(csv).not.toContain('"slovakia"');
  await panel.getByRole("combobox",{name:en?'Country A':'国家 A',exact:true}).selectOption('germany');await year.selectOption('2022');await expect(year).toHaveValue('2022');
  await expect(panel.locator('[data-trade-unavailable]')).toContainText(en?'failed':'未通过');
  await expect(panel.locator('[data-trade-metric="partner_hhi"] td').nth(1)).toHaveText('—');
  await expect(panel.locator('[data-chart="research-time-series"] circle[role="button"]')).toHaveCount(10);
  await panel.getByRole("combobox",{name:en?'Country A':'国家 A',exact:true}).selectOption('slovakia');await expect(year).toHaveValue('');
  await expect(panel.locator('[data-trade-export]')).toBeDisabled();await expect(panel.locator('[data-trade-unavailable]')).toContainText(en?'No year':'没有通过');
  await panel.getByRole("combobox",{name:en?'Trade flow':'贸易流向',exact:true}).selectOption('exports');await expect(year).toHaveValue('2025');await expect(panel.locator('[data-trade-export]')).toBeEnabled();
 });
 test(`Trade accessibility, readable labels and mobile overflow ${prefix||'zh'}`,async({page})=>{
  await page.goto(route,{waitUntil:'networkidle'});const panel=page.locator('[data-trade-workbench]');await expect(panel.getByRole("combobox",{name:en?'Reference year':'参照年份',exact:true})).toHaveValue('2025');
  await panel.getByRole("combobox",{name:en?'Country B':'国家 B',exact:true}).selectOption('poland');
  await panel.locator('details').evaluateAll(ds=>ds.forEach(d=>(d as HTMLDetailsElement).open=true));
  for(const scheme of ['light','dark'] as const){await page.emulateMedia({colorScheme:scheme});expect((await new AxeBuilder({page}).include('[data-trade-workbench]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);}
 });
}
test('Trade load failure and unsupported schema remain unavailable',async({page})=>{
 await page.route('**/research-data/network_ui_pack.json',route=>route.abort());await page.goto('/en/models/?skill=network_dependency',{waitUntil:'networkidle'});
 await expect(page.locator('[data-trade-workbench]')).toContainText('could not be loaded');
 await page.unroute('**/research-data/network_ui_pack.json');await page.route('**/research-data/network_ui_pack.json',route=>route.fulfill({json:{...pack,schema_version:'unknown'}}));await page.reload({waitUntil:'networkidle'});
 await expect(page.locator('[data-trade-export]')).toBeDisabled();await expect(page.locator('[data-trade-coverage]').first()).toContainText('Unsupported pack');
});
test('Trade latest eligible default is not fixed; invalid manual year and inverted range never fall back',async({page})=>{
 const altered=structuredClone(pack);const row=altered.records.find((r:{reporter:string;year:number;flow:string})=>r.reporter==='hungary'&&r.year===2025&&r.flow==='imports');row.coverage.gate_passed=false;row.coverage.eligible_coverage_ratio=.9;
 await page.route('**/research-data/network_ui_pack.json',route=>route.fulfill({json:altered}));
 await page.goto('/en/models/?skill=network_dependency&country=hungary',{waitUntil:'networkidle'});
 const panel=page.locator('[data-trade-workbench]'),year=panel.getByRole('combobox',{name:'Reference year',exact:true});await expect(year).toHaveValue('2024');
 await year.selectOption('2025');await expect(year).toHaveValue('2025');await expect(panel.locator('[data-trade-unavailable]')).toContainText('failed');
 await panel.getByRole('combobox',{name:'From year',exact:true}).selectOption('2025');await panel.getByRole('combobox',{name:'To year',exact:true}).selectOption('2020');
 await expect(panel.locator('[data-trade-export]')).toBeDisabled();await expect(panel.locator('[data-trade-change="hungary"]')).toContainText('—');await expect(panel.locator('[data-chart="research-time-series"]')).toHaveCount(0);
});
