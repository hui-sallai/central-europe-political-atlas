import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const prefix of ['', '/en']){
 const en=!!prefix;
 test(`three annual Pending explanations keep dataset and country checks distinct ${prefix||'zh'}`,async({page})=>{
  for(const indicator of ['fdi_inflow','energy_import_dependency','automotive_export_share']){
   await page.goto(`${prefix}/data/?country=poland&indicator=${indicator}&from=2025&to=2025&history=0`,{waitUntil:'networkidle'});
   const panel=page.locator('[data-observation-provenance]');await panel.locator(':scope > summary').click();const note=panel.locator('[data-pending-availability]');await expect(note).toBeVisible();await expect(note).toHaveAttribute('data-pending-reason','not_yet_published_at_source');await expect(note.locator('[data-pending-country-check]')).toContainText('2026-10-13');await expect(note.locator('[data-pending-dataset-coverage]')).toContainText('2026-10-20');await expect(note.locator('[data-pending-dataset-coverage]')).toContainText('2024');await expect(note).toContainText(en?'not a claim that data remains unavailable after that date':'不代表检查日之后仍不可用');await expect(note.locator('[data-pending-definition] a')).toHaveCount(indicator==='automotive_export_share'?2:1);await expect(panel.locator('[data-provenance-dates]')).toContainText('—');
  }
  await expect(page.locator('[data-notebook-add]').first()).toBeEnabled();for(const dark of [false,true]){await page.evaluate(d=>document.documentElement.classList.toggle('dark',d),dark);const a=await new AxeBuilder({page}).include('[data-observation-provenance]').analyze();expect(a.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);}expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 });
 test(`country-specific older year and older missing-value reason are never replaced by global 2024 coverage ${prefix||'zh'}`,async({page})=>{
  await page.goto(`${prefix}/data/?country=croatia&indicator=automotive_export_share&from=2024&to=2024&history=0`,{waitUntil:'networkidle'});const panel=page.locator('[data-observation-provenance]');await panel.locator(':scope > summary').click();await expect(panel.locator('[data-pending-country-check]')).toContainText('2023');await expect(panel.locator('[data-pending-dataset-coverage]')).toContainText('2024');await expect(panel.locator('[data-pending-definition]')).toContainText('HS87');
  await page.goto(`${prefix}/data/?country=austria&indicator=fdi_inflow&from=2021&to=2021&history=0`,{waitUntil:'networkidle'});await panel.locator(':scope > summary').click();await expect(panel.locator('[data-pending-availability]')).toHaveAttribute('data-pending-reason','missing_at_source');await expect(panel).toContainText(en?'does not establish a publication delay':'不能仅据此归因为发布时间滞后');
  await page.goto(`${prefix}/data/?country=poland&indicator=energy_import_dependency&from=2024&to=2024&history=0`,{waitUntil:'networkidle'});await panel.locator(':scope > summary').click();await expect(panel.locator('[data-pending-availability]')).toHaveCount(0);
 });
}
