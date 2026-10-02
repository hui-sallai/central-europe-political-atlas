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
