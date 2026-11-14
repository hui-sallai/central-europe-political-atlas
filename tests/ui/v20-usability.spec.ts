import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {activeNotebookRaw} from './notebook-storage';
import AxeBuilder from '@axe-core/playwright';
const countries=['austria','germany','slovakia','slovenia','czechia','hungary','poland','romania','croatia','serbia'];
const skills=JSON.parse(fs.readFileSync('src/data/analysis/analysis_skill_registry.json','utf8')).records;
const evidence=process.env.ATLAS_USABILITY_EVIDENCE;
for(const prefix of ['', '/en']){
 const en=!!prefix;
 test(`arbitrary comparison, all sources and exact export ${en?'en':'zh'}`,async({page},info)=>{
  page.setDefaultTimeout(10000);test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${prefix}/data/`);const w=page.locator('[data-national-comparison]');await expect(w).toBeVisible();
  const checks=w.locator('fieldset input');await expect(checks).toHaveCount(10);await expect(w.locator('fieldset input:checked')).toHaveCount(0);
  for(let i=0;i<10;i++){await checks.nth(i).check();if(i>=1)await expect(w.locator('fieldset input:checked')).toHaveCount(i+1);}
  await expect.poll(()=>new URL(page.url()).searchParams.get('compare_countries')?.split(',').length).toBe(10);
  await page.reload();await expect(w.locator('fieldset input:checked')).toHaveCount(10);
  const shared=page.url();await page.goto(prefix+'/countries/');await page.goBack();await expect(w.locator('fieldset input:checked')).toHaveCount(10);expect(new URL(page.url()).search).toBe(new URL(shared).search);
  for(let i=0;i<10;i++)await checks.nth(i).uncheck();await expect(w.locator('fieldset input:checked')).toHaveCount(0);
  await w.getByRole('checkbox',{name:en?'Austria':'奥地利',exact:true}).check();await w.getByRole('checkbox',{name:en?'Croatia':'克罗地亚',exact:true}).check();
  await expect(w.locator('[data-common-periods]')).not.toContainText(': —.');
  await w.getByLabel(en?'Visualization':'比较展示',{exact:true}).selectOption('bar');await expect(w.getByRole('figure')).toBeVisible();
  if(evidence)await page.screenshot({path:path.join(evidence,`after-comparison-${en?'en':'zh'}-${info.project.name}.png`),fullPage:true});
  const download=page.waitForEvent('download');await w.getByRole('button',{name:en?'Export actual observations (CSV)':'导出实际观测（CSV）'}).click();const d=await download;const csv=fs.readFileSync((await d.path())!,'utf8');expect(csv).toContain('source_url');expect(csv).toContain('austria');expect(csv).toContain('croatia');expect(csv).not.toContain('"hungary"');
  const raw=JSON.parse(fs.readFileSync('src/data/observations/observations.json','utf8'));const observations=Array.isArray(raw)?raw:raw.records;const original=observations.find((r:{country_slug:string;indicator:string;value:number|null})=>r.country_slug==='austria'&&r.indicator==='real_gdp_growth'&&r.value!==null);expect(csv).toContain(`"austria","${original.year}","${original.value}"`);
  await w.locator('[data-notebook-add]').click();await expect.poll(async()=>JSON.parse((await activeNotebookRaw(page))??'{}').items?.length).toBe(1);
  await w.getByLabel(en?'Visualization':'比较展示',{exact:true}).selectOption('table');await expect(w.locator('[data-comparison-records]')).toBeVisible();expect(await w.locator('[data-comparison-records]').locator('tbody tr').count()).toBeLessThanOrEqual(25);
  const detailSearch=w.getByLabel(en?'Search country, period, value or source':'搜索国家、时期、数值或来源');await detailSearch.fill('2020');await expect(w.locator('[data-comparison-records]').locator('tbody')).toContainText('2020');await detailSearch.clear();
  for(const topic of ['Growth and output','Prices and inflation','Employment and population','Government finance','Trade and investment','Energy and industry','Money and finance']){const index=['Growth and output','Prices and inflation','Employment and population','Government finance','Trade and investment','Energy and industry','Money and finance'].indexOf(topic);await w.locator('nav button').nth(index+1).click();await expect(w.locator('nav button').nth(index+1)).toHaveAttribute('aria-pressed','true');}
  await w.locator('nav button').first().click();const search=w.getByLabel(en?'Search all indicators and frequencies':'搜索所有指标和频率');await search.fill('cpi');await expect(w.getByLabel(en?'Indicator':'指标',{exact:true}).locator('option')).toContainText(['CPI']);await search.clear();
  await page.goto(`${prefix}/data/?tab=high_frequency&country=serbia&indicator=hicp_annual_rate&from=2025&to=2026`);await expect(w.getByLabel(en?'From period':'起始时期',{exact:true})).toHaveValue('2025-01');await expect(w.getByLabel(en?'To period':'结束时期',{exact:true})).toHaveValue('2026-12');
  await page.goto(`${prefix}/models/?tab=compare&monthly_countries=austria,croatia&monthly_indicator=hicp_annual_rate&compare_frequency=monthly`);
  const mw=page.locator('[data-national-comparison]');await expect(mw.locator('fieldset input:checked')).toHaveCount(2);await expect(mw.getByLabel(en?'Indicator':'指标',{exact:true})).toHaveValue('monthly:hicp_annual_rate');await expect(mw.locator('[data-common-periods]')).not.toContainText(': —.');
  await mw.getByLabel(en?'From period':'起始时期',{exact:true}).fill('2025-13');await expect(mw.getByRole('alert')).toBeVisible();await mw.getByLabel(en?'From period':'起始时期',{exact:true}).clear();
  await page.goto(`${prefix}/data/?compare_countries=serbia,austria&comparison_mode=side_by_side&compare_frequency=quarterly&comparison_indicator=sors:lfs_unemployment_quarterly&comparison_view=table`);await expect(w.getByLabel(en?'Indicator':'指标',{exact:true})).toHaveValue('sors:lfs_unemployment_quarterly');await expect(w.locator('[data-comparison-records]').locator('tbody')).toContainText(/\d{4}-Q[1-4]/);
  await page.goto(`${prefix}/data/?compare_countries=austria,serbia&compare_frequency=monthly&comparison_indicator=monthly:unemployment_rate_monthly`);await expect(w.locator('[data-common-periods]')).toContainText('—');await expect(w.locator('[data-comparison-value]')).toHaveText(['—','—']);
  await page.goto(`${prefix}/data/?tab=macro_drivers&country=serbia&driver=policy_rate&comparison_mode=side_by_side`);await expect(w.getByLabel(en?'Indicator':'指标',{exact:true})).toHaveValue('macro:policy_rate');await expect(w.locator('svg').first()).toBeVisible();
  const primaryUrl=page.url();await page.locator('details.mt-8 > summary').click();await expect(page.locator('[data-national-comparison]')).toBeVisible();await page.waitForTimeout(200);expect(new URL(page.url()).searchParams.get('compare_countries')).toBe(new URL(primaryUrl).searchParams.get('compare_countries'));await page.locator('details.mt-8 > summary').click();
  const ax=await new AxeBuilder({page}).include('[data-national-comparison]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(ax.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  if(evidence){fs.mkdirSync(evidence,{recursive:true});await page.screenshot({path:path.join(evidence,`after-data-${en?'en':'zh'}-${info.project.name}.png`),fullPage:true});}
 });
 test(`homepage, ten profiles, six elections and every model ${en?'en':'zh'}`,async({page},info)=>{
  page.setDefaultTimeout(10000);test.setTimeout(240000);const seen:string[]=[];const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(prefix+'/');await expect(page.locator('h1')).toHaveText(en?'Central Europe Political Atlas':'中欧政治经济平台');await expect(page.locator('.home-country-selector button')).toHaveCount(10);await page.locator('.home-country-selector button').filter({hasText:'RS'}).click();await expect(page.locator('main')).toContainText(en?'Serbia':'塞尔维亚');
  if(evidence)await page.screenshot({path:path.join(evidence,`after-home-${en?'en':'zh'}-${info.project.name}.png`),fullPage:true});
  for(const c of countries){const route=`${prefix}/countries/${c}/`;await page.goto(route);await expect(page.locator('[data-country-profile]')).toBeVisible();await page.locator('[data-country-profile] select').first().selectOption('unemployment_rate');if(c==='serbia')await expect(page.locator('[data-serbia-availability]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);seen.push(route);}
  await page.goto(prefix+'/politics/');await expect(page.locator('[data-political-country]')).toHaveCount(6);await expect(page.locator('[data-parliament-seats]')).toHaveCount(0);
  if(evidence)await page.screenshot({path:path.join(evidence,`after-politics-${en?'en':'zh'}-${info.project.name}.png`),fullPage:true});
  for(const c of ['germany','poland','czechia','slovakia','hungary','serbia']){const route=`${prefix}/politics/${c}/`;await page.goto(route);await expect(page.locator('[data-parliament-seats]')).toBeVisible();await expect(page.locator('[data-parliament-seats] svg')).toBeVisible();if(c==='germany'&&evidence)await page.locator('[data-parliament-seats]').screenshot({path:path.join(evidence,`after-seats-${en?'en':'zh'}-${info.project.name}.png`)});seen.push(route);}
  await page.goto(prefix+'/politics/?election=el-de-bt-2025-02-23&context=1');await expect(page).toHaveURL(/politics\/germany\//);expect(new URL(page.url()).searchParams.get('election')).toBe('el-de-bt-2025-02-23');
  for(const s of skills){const route=`${prefix}/models/?tab=run&skill=${s.skill_id}&country=serbia`;await page.goto(route);await expect(page.locator('main')).toBeVisible();await expect(page.locator('select').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);seen.push(route);}
  for(const route of ['/map/?country=serbia','/scenarios/','/methodology/','/news/?country=serbia','/workspaces/']){await page.goto(prefix+route);await expect(page.locator('main')).toBeVisible();seen.push(prefix+route);}
  expect(errors).toEqual([]);if(evidence)fs.writeFileSync(path.join(evidence,`after-pages-${en?'en':'zh'}-${info.project.name}.json`),JSON.stringify(seen,null,2));
 });
}

for(const prefix of ['', '/en'])test(`regional cross-country selection and explicit compatible reference ${prefix||'zh'}`,async({page},info)=>{
 const en=!!prefix;const hu=JSON.parse(fs.readFileSync('public/research-data/regional-history/hungary.json','utf8')),pl=JSON.parse(fs.readFileSync('public/research-data/regional-history/poland.json','utf8'));const hungarian=Object.keys(hu.regions).slice(0,2),polish=Object.keys(pl.regions)[0];
 await page.goto(`${prefix}/map/?country=hungary&layer=regional_gdp_per_capita&year=2024&regions=${hungarian[0]},${polish}&comparison_year=2023`);
 const section=page.locator('[data-regional-comparison]');await expect(section.locator('tbody tr')).toHaveCount(2);await expect(section.locator('tbody tr').first().locator('td').nth(2)).not.toHaveText(en?'No published value':'无已发布数值');
 await section.getByRole('combobox',{name:en?'Regional output':'区域输出',exact:true}).selectOption('quantitative');const reference=section.getByRole('combobox',{name:en?'Optional difference reference (your choice)':'可选差值参照（由你指定）',exact:true});await expect(reference).toHaveValue('');await reference.selectOption(hungarian[0]);await expect(section.locator('tbody tr').last().locator('td').nth(3)).toHaveText(en?'No matching comparable observation':'缺少同口径可比观测');
 await page.goto(`${prefix}/map/?country=hungary&layer=regional_gdp_per_capita&year=2024&regions=${hungarian.join(',')}&comparison_year=2023&region_output=quantitative&region_reference=${hungarian[0]}`);await expect(reference).toHaveValue(hungarian[0]);await expect(section.locator('tbody tr').last().locator('td').nth(3)).not.toHaveText(en?'No matching comparable observation':'缺少同口径可比观测');await page.reload();await expect(reference).toHaveValue(hungarian[0]);
 if(evidence)await section.screenshot({path:path.join(evidence,`after-regional-${en?'en':'zh'}-${info.project.name}.png`)});
});
