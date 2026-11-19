import {test, expect} from '@playwright/test';
import {activeNotebookRaw} from './notebook-storage';

for (const prefix of ['/en', '']) {
  test(`Politics and country hubs preserve the chamber and historical seat scope (${prefix || 'zh'})`, async ({page}) => {
    const en = prefix === '/en';
    await page.goto(prefix + '/politics/');
    const index = page.locator('[data-political-landing]');
    await expect(index.locator('[data-political-country]')).toHaveCount(10);
    const romania = index.locator('[data-political-country=romania]');
    await expect(romania.locator('[data-directory-election]')).toHaveCount(2);
    const deputies = romania.locator('[data-directory-election="el-ro-cd-2024-12-01"]');
    await expect(deputies).toContainText(en ? '331 seats' : '331 席');
    await expect(deputies).not.toContainText('312');
    await expect(deputies).toContainText(en ? 'Registry date awaiting confirmation' : '登记日期待核实');
    await expect(romania.locator('[data-directory-election="el-ro-s-2024-12-01"]')).toContainText(en ? '134 of 136' : '共 136 席，已分配 134 席');
    const croatia = index.locator('[data-political-country=croatia]');
    await expect(croatia).toContainText(en ? 'territorial constituencies I–X: 61.48%' : '境内第一至第十选区投票率：61.48%');
    await expect(index.locator('[data-political-country=slovenia]')).toContainText('Državni zbor');
    await expect(index.locator('[data-political-country=austria] [data-directory-election]')).toContainText('Nationalrat');
    await expect(index.locator('[data-political-country=austria] [data-directory-election]')).not.toContainText('Bundesrat');

    await page.goto(prefix + '/countries/croatia/#institutions');
    const timeline = page.locator('#history-croatia');
    await timeline.locator('summary').first().click();
    const county = timeline.locator('a[href$="el-hr-zupanijski-dom-1993-02-07"]');
    await expect(county).toContainText('Županijski dom');
    await expect(county).toContainText('63');
    await county.click();
    await expect(page.locator('[data-ballot-year]')).toHaveValue('1993');
    await expect(page.locator('[data-political-ballot-explorer]')).toContainText('Županijski dom');
  });
}

test("the map opens a Romanian chamber and its Notebook evidence restores the recorded selection", async ({page}) => {
  await page.goto('/en/');
  await page.locator('.home-country-selector').getByRole('button',{name:'RO',exact:true}).click();
  const actions = page.locator('.home-map-actions');
  await expect(actions.locator('a[href="/en/politics/romania/"]')).toBeVisible();
  await actions.locator('a[href="/en/countries/romania/"]').click();
  const hub = page.locator('[data-country-election-history=romania]');
  const electionId = 'el-ro-s-2024-12-01';
  await hub.locator(`[data-directory-election="${electionId}"] a`).click();
  const explorer = page.locator('[data-political-ballot-explorer]');
  await expect(explorer.locator('[data-ballot-chamber]')).toHaveValue('Senat');
  await explorer.locator('[data-ballot-export] [data-notebook-add]').click();
  await expect.poll(() => activeNotebookRaw(page)).toContain(electionId);
  const notebook = JSON.parse(await activeNotebookRaw(page));
  const saved = notebook.items.find((item:{canonical_ids:string[]}) => item.canonical_ids.includes(electionId));
  expect(saved.layer).toBe('admitted_parliamentary_election');
  expect(saved.source_ids.length).toBeGreaterThan(0);
  const savedUrl = new URL(saved.url);
  expect(savedUrl.searchParams.get('election')).toBe(electionId);
  await page.goto('/en/notebook/');
  await page.goto(savedUrl.pathname + savedUrl.search);
  await expect(explorer.locator('[data-ballot-chamber]')).toHaveValue('Senat');
});
