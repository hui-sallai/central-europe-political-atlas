import { test, expect } from '@playwright/test';

test('multi-country annual history and explicit periods', async ({ page }) => {
  await page.goto('/en/models/?tab=compare');
  const panel = page.getByRole('region', { name: 'Historical annual comparison' });
  await expect(panel.getByRole('checkbox', { checked: true })).toHaveCount(3);
  await panel.getByRole('checkbox').nth(3).check();
  await expect(panel.getByRole('checkbox', { checked: true })).toHaveCount(4);
  await panel.getByLabel('Reference mode').selectOption('latest_available');
  await panel.getByLabel('Historical year').selectOption('2025');
  await expect(panel.getByRole('img')).toBeVisible();
  await expect(panel.getByLabel('Historical year')).toHaveValue('2025');
  await expect(panel.locator('article').filter({ hasText: '2025' }).first()).toBeVisible();
  await panel.getByRole('combobox', { name: 'Indicator', exact: true }).selectOption('hicp_inflation');
  await expect(panel.getByRole('img')).toBeVisible();
});

test('scenario displays inputs, assumptions and sensitivity without changing calculations', async ({ page }) => {
  await page.goto('/scenarios/');
  await page.getByRole('button', { name: '运行情景分析', exact: true }).click();
  await expect(page.getByRole('heading', { name: '基线输入与情景假设' })).toBeVisible();
  await expect(page.getByRole('img', { name: '固定假设下的情景敏感性' })).toBeVisible();
  await expect(page.getByText('仅调整指定输入，其他输入保持不变。', { exact: false })).toBeVisible();
});
