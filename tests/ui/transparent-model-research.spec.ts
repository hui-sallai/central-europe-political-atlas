import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import {activeNotebookRaw} from './notebook-storage';
const models=[['fiscal_pressure','2025','61.3',2],['external_vulnerability','2024','37.1',2],['industrial_dependency','2024','41.5',4]] as const;
for(const prefix of ['', '/en'])for(const [id,year,score,inputCount]of models){
 const en=Boolean(prefix);
 test(`complete ${id} research workflow ${en?'en':'zh'}`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${prefix}/models/?tab=run&skill=composite_indicators&model=${id}&country=poland&model_year=${year}`,{waitUntil:'networkidle'});
  const p=page.locator('[data-transparent-research]');await expect(p).toHaveAttribute('data-transparent-research',id);await expect(p.locator('[data-rule-score]')).toContainText(score);
  await expect(p.locator('[data-rule-inputs] tbody tr')).toHaveCount(inputCount);await expect(p.locator('[data-rule-calculation]')).toContainText(score);
  await p.getByRole('checkbox',{name:en?'Hungary':'匈牙利',exact:true}).check();await expect(p.locator('[data-rule-comparison] tbody tr')).toHaveCount(2);await expect(p.locator('[data-rule-comparison] tbody')).not.toContainText(en?'do not match':'不匹配');
  await expect(page).toHaveURL(/model_compare=hungary/);await page.reload({waitUntil:'networkidle'});await expect(p.getByRole('checkbox',{name:en?'Hungary':'匈牙利',exact:true})).toBeChecked();
  if(id==='external_vulnerability'){await expect(p.locator('[data-rule-scenario]')).toContainText(en?'No approved scenario':'没有已批准情景');await expect(p.locator('[data-rule-scenario] input')).toHaveCount(0);await expect(p.locator('[data-rule-scenario] svg')).toHaveCount(0);}
  else {const original=await p.locator('[data-rule-score]').innerText();if(id==='fiscal_pressure')await p.getByLabel(en?'Budget-balance deterioration (percentage points of GDP)':'财政余额恶化（GDP 百分点）',{exact:true}).fill('2');else{await p.getByRole('combobox',{name:en?'Registered scenario':'已登记情景',exact:true}).selectOption('germany_demand_slowdown');await p.getByLabel(en?'German-demand change (%, negative values)':'德国需求变化（%，负值）',{exact:true}).fill('-10');}await expect(p.locator('[data-rule-score]')).toHaveText(original);await expect(p.locator('[data-rule-scenario-result]')).toContainText('Δ');}
  await p.locator('[data-notebook-add]').click();await expect.poll(async()=>JSON.parse((await activeNotebookRaw(page))??'{}').items?.length).toBe(1);const item=JSON.parse((await activeNotebookRaw(page))!).items[0];expect(item.metadata.filters.model).toBe(id);expect(item.metadata.filters.formula_version).toBe(id+'_v1');expect(item.metadata.filters.baseline_inputs).toHaveLength(inputCount);expect(item.value).toBeUndefined();
  const csvWait=page.waitForEvent('download');await p.getByRole('button',{name:en?'Export inputs and results CSV':'导出输入与结果 CSV',exact:true}).click();const csv=fs.readFileSync((await(await csvWait).path())!,'utf8');expect(csv).toContain('effective_contribution');expect(csv).toContain('source_url');
  const jsonWait=page.waitForEvent('download');await p.getByRole('button',{name:en?'Export complete calculation records JSON':'导出完整计算记录 JSON',exact:true}).click();const data=JSON.parse(fs.readFileSync((await(await jsonWait).path())!,'utf8'));expect(data.baseline.score).toBe(Number(score));expect(data.model_card.model_id).toBe(id);expect(data.observations.length).toBeGreaterThan(inputCount);expect(data.observations.every((o:{source_url:string})=>o.source_url.startsWith('https://'))).toBe(true);if(data.scenario){expect(data.scenario.baseline_score).toBe(Number(score));expect(data.scenario.score_change).toBe(Number((data.scenario.scenario_score-data.baseline.score).toFixed(1)));}else expect(id).toBe('external_vulnerability');
  await p.getByText(en?'Research details: definitions, versions and limitations':'研究明细：定义、版本与限制',{exact:true}).click();await expect(p).toContainText(id+'_v1');
  const point=p.locator('circle[role="button"]').first();await point.focus();await point.press('Enter');
  for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);const axe=await new AxeBuilder({page}).include('[data-transparent-research]').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);await page.screenshot({path:info.outputPath(`${id}-workflow.png`),fullPage:true});expect(errors).toEqual([]);
 });
}
for(const prefix of ['', '/en']){
 const en=Boolean(prefix);
 test(`industrial comparison common year and unavailable inputs ${en?'en':'zh'}`,async({page})=>{
  await page.goto(`${prefix}/models/?tab=run&model=industrial_dependency&country=poland&model_year=2024&model_compare=croatia`,{waitUntil:'networkidle'});const p=page.locator('[data-transparent-research]');await expect(p.locator('[data-rule-comparison] tbody')).toContainText(en?'Pending':'待发布');await p.getByRole('button',{name:en?'Use common year 2023':'使用共同年份 2023',exact:true}).click();await expect(p.getByRole('combobox',{name:en?'Result observation year':'结果观测年',exact:true})).toHaveValue('2023');await expect(p.locator('[data-rule-comparison] tbody')).toContainText('15.8');
  await p.getByRole('combobox',{name:en?'Country':'国家',exact:true}).selectOption('germany');await expect(p.locator('[data-rule-score]')).toContainText('—');await expect(p).toContainText(en?'Not applicable':'不适用');await expect(p.locator('[data-notebook-add]')).toBeDisabled();await expect(p.locator('[data-rule-scenario-result]')).toHaveCount(0);
 });
 test(`stale version and invalid assumptions fail closed; switching models preserves household workbench ${en?'en':'zh'}`,async({page})=>{
  await page.goto(`${prefix}/models/?tab=run&model=fiscal_pressure&model_version=old`,{waitUntil:'networkidle'});const p=page.locator('[data-transparent-research]');await expect(p.getByRole('alert')).toContainText(en?'version':'版本');await expect(p.locator('[data-rule-score]')).toHaveCount(0);await p.getByRole('button',{name:en?'Explicitly reset to current registered configuration':'明确重置为当前登记配置'}).click();await expect(p.locator('[data-rule-score]')).toContainText('61.3');
  await page.getByRole('combobox',{name:en?'Analysis model':'分析模型',exact:true}).selectOption('external_vulnerability');await expect(p).toHaveAttribute('data-transparent-research','external_vulnerability');await expect(page).toHaveURL(/model=external_vulnerability/);await page.getByRole('combobox',{name:en?'Analysis model':'分析模型',exact:true}).selectOption('household_economic_pressure');await expect(page.locator('[data-household-research]')).toBeVisible();await expect(page.locator('[data-pressure-score]')).toContainText('22');await expect(p).toHaveCount(0);
  await page.goto(`${prefix}/models/?tab=run&model=industrial_dependency&model_scenario=energy_price_shock&model_shock=51`,{waitUntil:'networkidle'});await expect(p.getByRole('alert')).toBeVisible();await expect(p.locator('[data-rule-scenario-result]')).toHaveCount(0);
 });
}
