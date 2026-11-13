import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test('multi-country annual history uses explicit countries and indicator',async({page})=>{
 await page.goto('/en/models/?tab=compare&compare_countries=austria,croatia,germany,poland');const panel=page.locator('[data-national-comparison]');await expect(panel.locator('fieldset input:checked')).toHaveCount(4);await panel.getByLabel('Comparison frame',{exact:true}).selectOption('side_by_side');await panel.getByLabel('Reference period',{exact:true}).selectOption('2025');await panel.getByLabel('Indicator',{exact:true}).selectOption('annual:hicp_inflation');await expect(panel.locator('[data-interactive-series]').first()).toBeVisible();
});
test('2–10-country selection, actual historical range and complete CSV remain source-linked',async({page})=>{
 await page.goto('/en/models/?tab=compare');const panel=page.locator('[data-national-comparison]');await expect(panel.locator('fieldset input:checked')).toHaveCount(0);for(const box of await panel.locator('fieldset input').all())await box.check();await expect(panel.locator('fieldset input:checked')).toHaveCount(10);for(const box of await panel.locator('fieldset input').all())await box.uncheck();for(const name of ['Austria','Croatia'])await panel.getByRole('checkbox',{name,exact:true}).check();await panel.getByLabel('From period',{exact:true}).fill('2000');await panel.getByLabel('To period',{exact:true}).fill('2002');const waiting=page.waitForEvent('download');await panel.getByRole('button',{name:'Export actual observations (CSV)',exact:true}).click();const csv=await fs.readFile((await(await waiting).path())!,'utf8');expect(csv).toContain('source_url');expect(csv).toContain('descriptive annual history');for(const row of csv.trim().split('\r\n').slice(1))expect(Number(row.split(',')[1].replaceAll('"',''))).toBeGreaterThanOrEqual(2000);
});
test('failed history request preserves published snapshot observations without claiming official absence',async({page})=>{
 await page.route('**/research-data/annual_history_runtime.json',route=>route.fulfill({status:503,body:'Unavailable'}));await page.goto('/en/models/?tab=compare&compare_countries=austria,croatia');const panel=page.locator('[data-national-comparison]');await expect(panel).toContainText('Some sources could not be loaded');await expect(panel.locator('[data-interactive-series]').first()).toBeVisible();await expect(panel.locator('table').first()).toContainText('2025');
});

test('scenario displays inputs, assumptions and sensitivity without changing calculations', async ({ page }) => {
  await page.goto('/scenarios/');
  await page.getByRole('button', { name: '运行情景分析', exact: true }).click();
  await expect(page.getByRole('heading', { name: '基线输入与情景假设' })).toBeVisible();
  await expect(page.getByRole('img', { name: '固定假设下的情景敏感性' })).toBeVisible();
  await expect(page.getByRole('img', { name: '基线与情景得分，0–100' })).toBeVisible();
  await expect(page.getByText('仅调整指定输入，其他输入保持不变。', { exact: false })).toBeVisible();
});

test('scenario shows framework unavailability reasons instead of a generic placeholder', async ({ page }) => {
  await page.goto('/scenarios/');
  await page.getByRole('combobox', { name: 'Country', exact: true }).selectOption('serbia');
  await page.getByRole('combobox', { name: 'Scenario', exact: true }).selectOption('eu_funds_delay');
  await page.getByRole('button', { name: '运行情景分析', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('该国家不在此情景第一版的适用范围内。');
  await expect(page.getByText('该国家不在此情景第一版的适用范围内。', { exact: true })).toHaveCount(4);
  await expect(page.getByRole('img', { name: '基线与情景得分，0–100' })).toHaveCount(0);
});

test('panel result charts show existing intervals on explicitly separate axes', async ({ page }) => {
  await page.goto('/en/models/?skill=panel_econometrics');
  await page.getByRole('button', { name: 'Run panel model', exact: true }).click();
  await expect(page.getByText('Conditional associations, not causal effects.', { exact: false })).toBeVisible();
  const intervals = page.getByRole('img', { name: /95% CI/ });
  await expect(intervals.first()).toBeVisible();
  expect(await intervals.count()).toBeGreaterThan(1);
  await expect(page.getByText('Each coefficient has its own axis;', { exact: false })).toBeVisible();
});
