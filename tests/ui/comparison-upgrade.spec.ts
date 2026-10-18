import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test('multi-country annual history and explicit periods', async ({ page }) => {
  await page.goto('/en/models/?tab=compare');
  const panel = page.getByRole('region', { name: 'Historical annual comparison' });
  await expect(panel.getByRole('checkbox', { checked: true })).toHaveCount(2);
  await panel.getByRole('checkbox').nth(2).check();
  await panel.getByRole('checkbox').nth(3).check();
  await expect(panel.getByRole('checkbox', { checked: true })).toHaveCount(4);
  await panel.getByLabel('Reference mode').selectOption('latest_available');
  await panel.getByLabel('Historical year').selectOption('2025');
  await expect(panel.getByRole('group', { name: /Annual history/ })).toBeVisible();
  await expect(panel.getByLabel('Historical year')).toHaveValue('2025');
  await expect(panel.locator('article').filter({ hasText: '2025' }).first()).toBeVisible();
  await panel.getByRole('combobox', { name: 'Indicator', exact: true }).selectOption('hicp_inflation');
  await expect(panel.getByRole('group', { name: /Annual history/ })).toBeVisible();
});

test('bounded country selection, historical range, point details and real CSV download', async ({ page }) => {
  await page.goto('/en/models/?tab=compare');
  const panel = page.getByRole('region', { name: 'Historical annual comparison' });
  await expect(panel.getByRole('checkbox', { checked: true })).toHaveCount(2);
  await expect(panel.getByRole('checkbox', { checked: true }).first()).toBeDisabled();
  for (const i of [2, 3, 4]) await panel.getByRole('checkbox').nth(i).check();
  await expect(panel.getByRole('checkbox', { checked: true })).toHaveCount(5);
  await expect(panel.getByRole('checkbox', { checked: false }).first()).toBeDisabled();
  await expect(panel.getByText('Descriptive backfill only;', { exact: false })).toBeVisible();
  await panel.getByLabel('Trend and export period').selectOption('custom');
  await panel.getByLabel('From year').fill('2000');
  await panel.getByLabel('To year').fill('2002');
  const point = panel.locator('circle[role=button]').first();
  await point.focus();
  await expect(panel.locator('[aria-live=polite]')).toContainText('2000');
  const downloadEvent = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Export actual observations (CSV)' }).click();
  const download = await downloadEvent;
  const csv = await fs.readFile((await download.path())!, 'utf8');
  expect(csv).toContain('"source_url","layer"');
  expect(csv).toContain('"descriptive annual history"');
  const rows = csv.trim().split('\r\n').slice(1);
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) expect(Number(row.split(',')[2].replaceAll('"', ''))).toBeGreaterThanOrEqual(2000);
  for (const row of rows) expect(Number(row.split(',')[2].replaceAll('"', ''))).toBeLessThanOrEqual(2002);
});

test('failed history request preserves published snapshot comparison', async ({ page }) => {
  await page.route('**/research-data/annual_history_runtime.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/en/models/?tab=compare');
  const panel = page.getByRole('region', { name: 'Historical annual comparison' });
  await expect(panel.getByText('Historical backfill unavailable;', { exact: false })).toBeVisible();
  await expect(panel.getByRole('group', { name: /Annual history/ })).toBeVisible();
  await expect(panel.locator('article').first()).toContainText('2025');
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
