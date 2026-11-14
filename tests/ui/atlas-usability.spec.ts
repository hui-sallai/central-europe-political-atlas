import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
const regionalPayload=JSON.parse(fs.readFileSync('public/data/regional/v089/map-observations/hungary.json','utf8')), regional=regionalPayload.records;
const macro=JSON.parse(fs.readFileSync('public/research-data/macro_driver_runtime.json','utf8')).records;
for(const prefix of ['', '/en']) {
 const en=!!prefix;
 test(`atlas map first and country research entry ${prefix||'zh'}`,async({page})=>{
  await page.goto(`${prefix}/`,{waitUntil:'networkidle'});
  expect(await page.locator('main > section').first().getAttribute('aria-labelledby')).toBe('home-map-title');
  await page.locator('.home-country-selector').getByRole('button',{name:'HU',exact:true}).click();
  await expect(page.locator('.home-map-actions a[href*="/data/"]')).toHaveAttribute('href',`${prefix}/data/?country=hungary`);
  await expect(page.locator('.home-map-actions a[href*="politics/"]')).toHaveAttribute('href',`${prefix}/politics/hungary/`);
  await expect(page.locator('[data-home-case]')).toHaveCount(0);await page.goto(`${prefix}/workspaces/`);await expect(page.locator('[data-home-case]')).toHaveCount(3);
 });
 test(`Romania industrial electricity requested years and explicit recovery ${prefix||'zh'}`,async({page})=>{
  await page.goto(`${prefix}/data/?country=romania&indicator=industrial_electricity_price&from=2002&to=2010`,{waitUntil:'networkidle'});
  const panel=page.locator('[data-national-comparison]');await expect(panel.getByRole('textbox',{name:en?'From period':'起始时期',exact:true})).toHaveValue('2002');
  await panel.getByRole('textbox',{name:en?'From period':'起始时期',exact:true}).fill('2023');await panel.getByRole('textbox',{name:en?'To period':'结束时期',exact:true}).fill('2024');
  await panel.getByLabel(en?'Visualization':'比较展示',{exact:true}).selectOption('table');await expect(panel.locator('[data-comparison-records] tbody tr')).toHaveCount(2);await page.reload();await expect(panel.getByRole('textbox',{name:en?'From period':'起始时期',exact:true})).toHaveValue('2023');
 });
 test(`Hungary monthly policy rate exact point, touch and keyboard ${prefix||'zh'}`,async({page})=>{
  await page.goto(`${prefix}/data/?tab=macro_drivers&driver=policy_rate&area=hungary&transformation=level`,{waitUntil:'networkidle'});
  const chart=page.locator('[data-interactive-series]').first(), points=chart.locator('circle[role="button"]');
  await expect(points.first()).toBeVisible();
  const first=macro.filter((r:unknown[])=>r[1]==='policy_rate'&&r[2]==='hungary'&&r[7]==='level'&&r[5]!==null).sort((a:unknown[],b:unknown[])=>String(a[4]).localeCompare(String(b[4])))[0];
  const sourcePoint=points.filter({hasText:''});expect(await sourcePoint.count()).toBeGreaterThan(0);
  await points.first().focus();await page.keyboard.press('ArrowRight');
  await expect(points.nth(1)).toBeFocused();await points.nth(2).click({force:true});
  await expect(chart.locator('[aria-live]')).not.toBeEmpty();
  const records=page.locator('[data-comparison-records]');await records.locator('summary').click();await records.getByRole('searchbox').fill(String(first[4]));await expect(records.locator('tbody')).toContainText(String(first[5]));
  const violations=(await new AxeBuilder({page}).include('[data-interactive-series]').analyze()).violations.filter(v=>['serious','critical'].includes(v.impact??''));expect(violations).toEqual([]);
 });
 test(`Tolna and Hajdu Bihar same year difference and historical boundary ${prefix||'zh'}`,async({page})=>{
  await page.goto(`${prefix}/map/?country=hungary&layer=regional_gdp_per_capita&year=2024&regions=hungary_tolna,hungary_hajdu_bihar&region_output=quantitative&region_reference=hungary_tolna`,{waitUntil:'networkidle'});
  const panel=page.locator('[data-regional-comparison]');await expect(panel.locator('tbody tr')).toHaveCount(2);
  const a=regional.find((r:Record<string,string>)=>r.region_id==='hungary_tolna'&&r.region_indicator_id==='regional_gdp_per_capita'&&r.year==='2024');
  const b=regional.find((r:Record<string,string>)=>r.region_id==='hungary_hajdu_bihar'&&r.region_indicator_id==='regional_gdp_per_capita'&&r.year==='2024');
  await expect(panel.locator('tbody tr').nth(1)).toContainText(String(b.value-a.value));
  await expect(panel).toContainText('2024');await expect(panel.locator('tbody a').first()).toHaveAttribute('href',a.source_url);
  const history=page.locator('[data-region-history]');await expect(history.locator('circle[role="button"]').first()).toBeVisible();
  await history.locator('[data-interactive-series]').getByRole('combobox',{name:en?'Inspect a value':'查看数值点',exact:true}).selectOption('current:2021');await expect(history.locator('[aria-live]')).not.toBeEmpty();
  await expect(history.locator('[data-trend-status]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  await page.goto(`${prefix}/map/?country=hungary&layer=regional_gdp_per_capita&year=2002`,{waitUntil:'networkidle'});
  await expect(page.getByRole('combobox',{name:en?'Year':'年份',exact:true})).toHaveValue('2002');
  await page.getByRole('button',{name:en?'Use latest common available year':'使用最新共同可用年份',exact:false}).click();
  await expect(page.getByRole('combobox',{name:en?'Year':'年份',exact:true})).toHaveValue('2024');
  await page.route('**/data/regional/v089/map-observations/hungary.json',route=>route.fulfill({json:{...regionalPayload,records:regional.filter((r:Record<string,string>)=>!(r.region_id==='hungary_tolna' && r.region_indicator_id==='regional_gdp_per_capita' && r.year==='2024'))}}));
  await page.goto(`${prefix}/map/?country=hungary&layer=regional_gdp_per_capita&year=2024&regions=hungary_tolna,hungary_hajdu_bihar&region_output=quantitative&region_reference=hungary_tolna`,{waitUntil:'networkidle'});
  await expect(page.getByRole('combobox',{name:en?'Year':'年份',exact:true})).toHaveValue('2024');
  await page.getByRole('button',{name:en?'Use latest common available year':'使用最新共同可用年份',exact:false}).click();
  await expect(page.getByRole('combobox',{name:en?'Year':'年份',exact:true})).toHaveValue('2023');
 });
 test(`country overview historical point inspection ${prefix||'zh'}`,async({page})=>{
  for (const country of ["hungary", "poland"]) {
  await page.goto(`${prefix}/countries/${country}/`,{waitUntil:'networkidle'});
  const chart=page.locator('[data-interactive-series]').first();
  const selection=chart.getByRole('combobox',{name:en?'Inspect a value':'查看数值点',exact:true});
  const value=await selection.locator('option').nth(1).getAttribute('value');await selection.selectOption(value!);
  await expect(chart.locator('[aria-live]')).not.toBeEmpty();await chart.locator('[data-chart-table] summary').click();
  await expect(chart.locator('tbody tr')).not.toHaveCount(0);await expect(chart.locator('tbody a').first()).toHaveAttribute('href',/^https:\/\//);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
    if (!en) { const box=await chart.boundingBox(); expect(box).not.toBeNull(); expect(box!.x+box!.width).toBeLessThanOrEqual(page.viewportSize()!.width+2); }
  }
 });
 test(`neutral six-country political entry and legacy Germany deep link ${prefix||'zh'}`,async({page})=>{
  await page.goto(`${prefix}/politics/`,{waitUntil:'networkidle'});await expect(page.locator('[data-political-country]')).toHaveCount(6);await expect(page.locator('#germany')).toHaveCount(0);
  await page.locator('[data-political-country="germany"] h2 a').focus();await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${prefix}/politics/germany/`));await expect(page.locator('[data-politics-explorer]')).toBeVisible();
  await page.goto(`${prefix}/politics/?context=1`,{waitUntil:'networkidle'});await expect(page).toHaveURL(new RegExp(`${prefix}/politics/germany/`));await expect(page.locator('[data-politics-explorer]')).toBeVisible();
 });
}
