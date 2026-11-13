import {activeNotebookRaw} from './notebook-storage';
import fs from 'node:fs';
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {parseNotebook} from '../../src/lib/researchNotebook';
const query='tab=compare&compare_frequency=monthly&monthly_countries=hungary,poland,germany&monthly_indicator=hicp_annual_rate&monthly_from=2025-01&monthly_to=2026-09&monthly_mode=common';
for(const prefix of ['', '/en']){
 const en=!!prefix;
 test(`monthly observations preserve sources, vintages, Notebook and freely selected countries ${prefix||'zh'}`,async({page})=>{
  await page.goto(`${prefix}/models/?${query}`);const p=page.locator('[data-national-comparison]');await expect(p.locator('fieldset input:checked')).toHaveCount(3);await expect(p.locator('table').first().locator('tbody tr')).toHaveCount(3);await expect(p.locator('table').first()).toContainText('2026-09');await expect(p.locator('table').first()).toContainText('Eurostat');
  const waiting=page.waitForEvent('download');await p.getByRole('button',{name:en?'Export actual observations (CSV)':'导出实际观测（CSV）',exact:true}).click();const csv=fs.readFileSync((await(await waiting).path())!,'utf8');expect(csv).toContain('"vintage"');expect(csv).toContain('latest_revised');expect(csv).toContain('"2025-01"');expect(csv).not.toContain('annual:');
  await p.locator('[data-notebook-add]').click();await expect.poll(async()=>JSON.parse((await activeNotebookRaw(page))??'{}').items?.length).toBe(1);const n=parseNotebook((await activeNotebookRaw(page))!);expect(n.items[0].metadata.filters?.indicator).toBe('monthly:hicp_annual_rate');expect(n.items[0].value).toBeUndefined();
  const point=p.locator('circle[role="button"]').first();await point.focus();await point.press('Enter');await expect(p.locator('[aria-live="polite"]').first()).toContainText('Eurostat');
  for(const box of await p.locator('fieldset input').all())await box.check();await expect(p.locator('fieldset input:checked')).toHaveCount(10);await page.getByRole('link',{name:en?'中文':'English',exact:true}).click();await expect(p.locator('fieldset input:checked')).toHaveCount(10);await expect(p.getByLabel(en?'指标':'Indicator',{exact:true})).toHaveValue('monthly:hicp_annual_rate');
  for(const dark of [false,true]){await page.evaluate(d=>document.documentElement.classList.toggle('dark',d),dark);const axe=await new AxeBuilder({page}).include('[data-national-comparison]').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);}expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 });
 test(`missing monthly unemployment, side-by-side coverage and explicit future period remain unavailable ${prefix||'zh'}`,async({page})=>{
  await page.goto(`${prefix}/models/?${query.replace('hungary,poland,germany','germany,serbia').replace('hicp_annual_rate','unemployment_rate_monthly')}`);const p=page.locator('[data-national-comparison]');await expect(p.locator('[data-common-periods]')).toContainText('—');await expect(p.locator('[data-comparison-value]')).toHaveText(['—','—']);await p.getByLabel(en?'Comparison frame':'比较口径',{exact:true}).selectOption('side_by_side');await expect(p.locator('table').first()).toContainText('2026-08');await expect(p.locator('[data-comparison-value]').last()).toHaveText('—');
  await page.goto(`${prefix}/models/?${query}&comparison_period=2030-01`);await expect(p.locator('[data-comparison-value]')).toHaveText(['—','—','—']);await expect(p.getByLabel(en?'Reference period':'参照时期',{exact:true})).toHaveValue('2030-01');await p.getByLabel(en?'Frequency':'观测频率',{exact:true}).selectOption('annual');await expect(p.getByLabel(en?'Indicator':'指标',{exact:true})).toHaveValue(/^annual:/);await expect(p.locator('fieldset input:checked')).toHaveCount(3);
 });
}
