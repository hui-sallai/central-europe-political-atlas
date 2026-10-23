import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import {activeNotebookRaw} from './notebook-storage';
for(const prefix of ['', '/en']){
 const en=Boolean(prefix);
 test(`complete household analytical workflow ${en?'en':'zh'}`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${prefix}/models/?tab=run&skill=composite_indicators&model=household_economic_pressure&country=poland&pressure_year=2024&pressure_from=2021&pressure_to=2025&pressure_shock=2`,{waitUntil:'networkidle'});
  const p=page.locator('[data-household-research]');await expect(p).toBeVisible();await expect(p.locator('[data-pressure-score]')).not.toContainText('—');
  const score=await p.locator('[data-pressure-score]').innerText();
  await p.getByRole('checkbox',{name:en?'Germany':'德国',exact:true}).check();
  await expect(p.getByRole('checkbox',{name:en?'Germany':'德国',exact:true})).toBeChecked();
  await p.getByLabel(en?'HICP increase (percentage points, 0–5)':'HICP 增量（百分点，0–5）',{exact:true}).fill('3');
  await expect(p.locator('[data-pressure-score]')).toHaveText(score);await expect(p.locator('[data-pressure-scenario]')).toContainText('Δ');
  await expect(page).toHaveURL(/pressure_shock=3/);
  await page.reload({waitUntil:'networkidle'});await expect(p.getByRole('checkbox',{name:en?'Germany':'德国',exact:true})).toBeChecked();await expect(p.getByLabel(en?'HICP increase (percentage points, 0–5)':'HICP 增量（百分点，0–5）',{exact:true})).toHaveValue('3');
  await p.locator('[data-notebook-add]').click();await expect.poll(async()=>JSON.parse((await activeNotebookRaw(page))??'{}').items?.length).toBe(1);
  const item=JSON.parse((await activeNotebookRaw(page))!).items[0];expect(item.metadata.filters.shock).toBe(3);expect(item.countries).toContain('germany');expect(item.value).toBeUndefined();
  const download=page.waitForEvent('download');await p.getByRole('button',{name:en?'Export annual inputs CSV':'导出年度输入 CSV',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  const jsonDownload=page.waitForEvent('download');await p.getByRole('button',{name:en?'Export calculated results JSON':'导出计算结果 JSON',exact:true}).click();const exported=JSON.parse(fs.readFileSync((await(await jsonDownload).path())!,'utf8'));expect(exported.configuration.shock).toBe(3);expect(exported.scenario.baseline_score).toBe(exported.baseline.score);expect(exported.baseline.inputs).toHaveLength(2);
  await p.getByText(en?'Research details: sources, versions and boundaries':'研究明细：来源、版本与边界',{exact:true}).click();await expect(p.getByRole('link',{name:en?'Original observation view':'原始观测视图'}).first()).toHaveAttribute('href',/indicator=hicp_inflation/);
  const point=p.locator('circle[role="button"]').first();await point.focus();await expect(point).toBeFocused();await point.press('Enter');
  for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);const axe=await new AxeBuilder({page}).include('[data-household-research]').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  await page.screenshot({path:info.outputPath('household-workflow.png'),fullPage:true});
  expect(errors).toEqual([]);
 });
 test(`invalid and missing household inputs fail safely ${en?'en':'zh'}`,async({page})=>{
  await page.goto(`${prefix}/models/?tab=run&model=household_economic_pressure&country=poland&pressure_shock=9`,{waitUntil:'networkidle'});const p=page.locator('[data-household-research]');await expect(p.getByRole('alert')).toContainText(en?'shock':'通胀增量');await expect(p.locator('[data-pressure-score]')).toHaveCount(0);
  await p.getByRole('button',{name:en?'Explicitly reset to default configuration':'明确重置为默认配置'}).click();await expect(p.locator('[data-pressure-score]')).toBeVisible();
  await p.getByRole('combobox',{name:en?'Country':'国家',exact:true}).selectOption('serbia');await expect(p.locator('[data-pressure-score]')).toContainText('—');await expect(p.locator('[data-notebook-add]')).toBeDisabled();
 });
}
