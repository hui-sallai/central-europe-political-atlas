import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { NOTEBOOK_STORAGE_KEY, parseNotebook } from "../../src/lib/researchNotebook";

for (const locale of ["zh-CN", "en"] as const) {
  const route=locale==='en'?'/en/politics/':'/politics/';
  test(`Politics filters, corrected vintage, missing seats, sources and notebook: ${locale}`, async ({page}) => {
    await page.goto(route,{waitUntil:'networkidle'});
    const panel=page.locator('[data-politics-explorer]');
    await expect(panel.locator('select').nth(1)).toHaveValue('el-de-bt-2025-02-23');
    await expect(panel.locator('table').first().locator('tbody tr')).toHaveCount(7);
    await expect(panel.locator('table').nth(1).locator('tbody tr')).toHaveCount(29);
    await panel.locator('select').nth(1).selectOption('el-de-bt-2021-09-26');
    await expect(panel.locator('table').nth(1).locator('tbody tr')).toHaveCount(40);
    await expect(panel.locator('#politics-system')).toContainText('735');
    await expect(panel.locator('#politics-system')).toContainText('736');
    await expect(panel.locator('table').nth(1)).toContainText('Nationaldemokratische Partei Deutschlands');
    await expect(panel.locator('table').nth(1)).not.toContainText('Die Heimat');
    await panel.locator('select').nth(2).selectOption('seats');
    const missing=panel.locator('table').nth(1).locator('tbody tr').filter({hasText:'Partei für Gesundheitsforschung'});
    await expect(missing.locator('td').first()).toHaveText('—');
    await panel.locator('[data-notebook-add]').first().click();
    await expect(page.getByRole('banner')).toContainText('1');
    const notebook=parseNotebook((await page.evaluate(key=>localStorage.getItem(key),NOTEBOOK_STORAGE_KEY))!);
    expect(notebook.items[0].type).toBe('series_view');
    expect(notebook.items[0].metadata.filters).toMatchObject({election:'el-de-bt-2021-09-26',measure:'seats'});
    expect(notebook.items[0].metadata).not.toHaveProperty('rows');
    await panel.locator('details summary').click();
    await expect(panel.locator('details')).toContainText('SHA-256');
    const response=await page.request.get('/research-data/political/germany/election_results.json');
    expect(response.ok()).toBe(true);expect((await response.json()).length).toBe(209);
    await page.reload({waitUntil:'networkidle'});
    await expect(panel.locator('select').nth(1)).toHaveValue('el-de-bt-2021-09-26');
    await expect(panel.locator('select').nth(2)).toHaveValue('seats');
    const language=locale==='en'?'中文':'English';await page.getByRole('link',{name:language,exact:true}).click();
    await expect(page.locator('[data-politics-explorer] select').nth(1)).toHaveValue('el-de-bt-2021-09-26');
  });
  test(`Politics charts, research details and two-election comparison: ${locale}`, async ({page}) => {
    await page.goto(route+'?election=el-de-bt-2025-02-23',{waitUntil:'networkidle'});
    const panel=page.locator('[data-politics-explorer]');
    await expect(panel.locator('[data-politics-chart="turnout"] [data-turnout-year]')).toHaveCount(7);
    await expect(panel.locator('[data-politics-chart="turnout"] [data-turnout-year="2025"]')).toContainText('82.5%');
    // Only lists that won seats or reached 1% are charted; values are the published ones.
    await expect(panel.locator('[data-politics-chart="votes-seats"] [data-chart-list]')).toHaveCount(11);
    await expect(panel.locator('[data-politics-chart="votes-seats"] [data-chart-list]').first()).toContainText('164');
    await expect(panel.locator('[data-politics-research-details]')).toContainText('Sainte-Laguë/Schepers');
    await expect(panel.locator('[data-politics-research-details]')).toContainText('630');
    await expect(panel.locator('[data-compare-aggregates]')).toHaveCount(0);
    await panel.locator('[data-politics-compare] select').selectOption('el-de-bt-2021-09-26');
    await expect(panel.locator('[data-aggregate="turnout"]')).toContainText(locale==='en'?'−6.1 pp':'−6.1 个百分点');
    await expect(panel.locator('[data-aggregate="seats"]')).toContainText('+105');
    await expect(panel.locator('[data-aggregate="seats"]')).toContainText('735');
    // No identity is inferred: differently spelled labels stay on separate rows and no per-list change is shown.
    const lists=panel.locator('[data-compare-lists]');
    await expect(lists.locator('tbody tr').filter({hasText:/^Die Linke/})).toHaveAttribute('data-label-row','one');
    await expect(lists.locator('tbody tr').filter({hasText:/^DIE LINKE/})).toHaveAttribute('data-label-row','one');
    await expect(lists.locator('thead th')).toHaveCount(5);
    await expect(panel.locator('[data-identity-limitation]')).toBeVisible();
    await expect(panel.locator('[data-politics-cross-country]')).toContainText(locale==='en'?'Germany is the only country':'只有德国');
    await expect(panel.locator('select').first().locator('option')).toHaveCount(1);
    expect(new URL(page.url()).searchParams.get('compare')).toBe('el-de-bt-2021-09-26');
    await page.reload({waitUntil:'networkidle'});
    await expect(panel.locator('[data-politics-compare] select')).toHaveValue('el-de-bt-2021-09-26');
    // Selecting the compared election as the main one drops the comparison instead of comparing an election with itself.
    await panel.locator('select').nth(1).selectOption('el-de-bt-2021-09-26');
    await expect(panel.locator('[data-compare-aggregates]')).toHaveCount(0);
    for(const text of ['forecast','probability','ranking']) await expect(panel.locator('[data-politics-compare]')).not.toContainText(text);
  });
  test(`Politics accessibility, canonical, mobile overflow and themes: ${locale}`, async ({page})=>{
    await page.goto(route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',`https://hy-central-europe-analysis.org${route}`);
    for(const scheme of ['light','dark'] as const){
      await page.emulateMedia({colorScheme:scheme});await expect(page.locator('html')).toHaveAttribute('data-theme',scheme);
      expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
      expect(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth+2)).toBe(true);
    }
  });
  test(`Politics deliberate visual baseline: ${locale}`, async ({page},info)=>{
    await page.goto(route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
    await page.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
    for(const scheme of ['light','dark'] as const){
      await page.emulateMedia({colorScheme:scheme});await expect(page.locator('html')).toHaveAttribute('data-theme',scheme);
      const name=`politics-${locale}-${scheme}.png`;
      if(!fs.existsSync(info.snapshotPath(name))&&info.config.updateSnapshots==='none')throw Error(`Missing deliberate Politics baseline ${name}`);
      await expect(page).toHaveScreenshot(name,{fullPage:true});
    }
  });
}

for (const locale of ['zh-CN','en'] as const) test(`Party history: official series, gaps, seat caveat and export (${locale})`, async ({page}) => {
  const prefix=locale==='en'?'/en':'';
  await page.goto(`${prefix}/politics/`,{waitUntil:'networkidle'});
  const history=page.locator('[data-politics-history]');
  const series=history.locator('select').first();
  const linke=await series.locator('option').filter({hasText:/^Die Linke ·/}).getAttribute('value');
  await series.selectOption(linke!);
  await expect(history.locator('[data-history-year]')).toHaveCount(7);
  await expect(history.locator('[data-history-year="2002"]')).toContainText('PDS');
  await expect(history.locator('[data-history-year="2021"]')).toContainText('DIE LINKE');
  await expect(history.locator('[data-history-year="2021"]')).toContainText('4.9%');
  await expect(history.locator('[data-history-overview]')).toContainText(locale==='en'?'other names':'其他名称');
  await expect(history.locator('[data-history-research]')).toContainText('ct-de-');
  // A party that did not stand in every election shows gaps, never zero.
  const afd=await series.locator('option').filter({hasText:/^AfD ·/}).getAttribute('value');
  await series.selectOption(afd!);
  await expect(history.locator('[data-history-state="no_list"]')).toHaveCount(3);
  await expect(history.locator('[data-history-year="2009"] td').nth(1)).toHaveText('—');
  await history.locator('select').nth(1).selectOption('seats');
  await expect(history.locator('[data-seat-caveat]')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('series')).toBe(afd);
  const download=page.waitForEvent('download');
  await history.locator('[data-history-export]').click();
  const file=await (await download).path();
  const csv=fs.readFileSync(file!,'utf8');
  expect(csv.split('\n')).toHaveLength(5);
  expect(csv).toContain('identity_verification_status');
  expect(csv).toContain('verified_official_longitudinal_series');
  expect(csv).not.toMatch(/el-de-bt-2009/);
});
