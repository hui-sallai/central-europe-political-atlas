import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const inventory=JSON.parse(fs.readFileSync('src/data/data-coverage/historical_recovery_inventory.json','utf8'));
for(const prefix of ['', '/en']){
 const en=!!prefix;
 test(`coverage exclusions and actual electricity periods ${prefix||'zh'}`,async({page})=>{
  await page.goto(`${prefix}/data/?country=romania&indicator=industrial_electricity_price&history=1`,{waitUntil:'networkidle'});
  const coverage=page.locator('[data-historical-coverage]').first();
  await expect(coverage).toContainText('2023–2024');
  await expect(coverage).toContainText(en?'Statistical definition break':'统计定义断点');
  await expect(coverage).toContainText(en?'Regular source refresh required':'需常规来源刷新');
  await coverage.locator('summary').click();await expect(coverage).toContainText('2022:d');
  await expect(coverage.locator('a')).toHaveAttribute('href',/historical_recovery_inventory.json$/);
  await page.goto(`${prefix}/data/?country=hungary&indicator=fdi_inflow&history=1`,{waitUntil:'networkidle'});
  await expect(page.locator('[data-historical-coverage]').first()).toContainText(en?'Vintage held':'版本拼接暂缓');
  await page.goto(`${prefix}/data/?country=slovakia&indicator=automotive_export_share&history=1`,{waitUntil:'networkidle'});
  await expect(page.locator('[data-historical-coverage]').first()).toContainText(en?'Officially missing period':'官方序列空缺');
  await expect(page.locator('[data-historical-coverage]').first()).toContainText('2015–2017');
 });
 test(`annual comparison pair-specific eligible years, holes and exact chart sources ${prefix||'zh'}`,async({page})=>{
  await page.goto(`${prefix}/models/?tab=compare&macro_countries=austria,slovakia&macro_indicator=automotive_export_share&macro_range=all`,{waitUntil:'networkidle'});
  const section=page.getByRole('region',{name:en?'Historical annual comparison':'年度历史比较',exact:true});
  const select=section.getByRole('combobox',{name:en?'Historical year':'历史年份',exact:true});
  await expect(select.locator('option[value="2018"]')).toHaveCount(1);
  await expect(select.locator('option[value="2015"]')).toHaveCount(0);
  await select.selectOption('2014');await expect(section.locator('[data-macro-reference]')).toContainText('2014');
  const chart=section.locator('[data-interactive-series]');await chart.locator('[data-chart-table] summary').click();
  await expect(chart.locator('tbody a').first()).toHaveAttribute('href',/^https:\/\//);
  await page.reload({waitUntil:'networkidle'});await expect(select).toHaveValue('2014');
  await page.goto(`${prefix}/models/?tab=compare&macro_countries=romania,austria&macro_indicator=industrial_electricity_price&macro_range=all`,{waitUntil:'networkidle'});
  await expect(section.locator('[data-common-annual-periods]')).toContainText('2023–2024');
  await expect(select.locator('option[value="2022"]')).toHaveCount(0);
 });
 for(const country of ['hungary','poland','romania','slovakia']){
  test(`regional admitted historical comparison ${country} ${prefix||'zh'}`,async({page},info)=>{
   const runtime=JSON.parse(fs.readFileSync(`public/research-data/regional-history/${country}.json`,'utf8'));
   const ids=Object.keys(runtime.regions).slice(0,2);
   const ranges=inventory.comparability.regional.regional_gdp_per_capita.by_country[country].common_comparable_years.ranges;
   const first=ranges[0].slice(0,4);
   await page.goto(`${prefix}/map/?country=${country}&layer=regional_gdp_per_capita&year=2024&regions=${ids.join(',')}`,{waitUntil:'networkidle'});
   const section=page.locator('[data-regional-comparison]');
   const select=section.getByRole('combobox',{name:en?'Common eligible comparison year':'共同合格比较年份',exact:true});
   await expect(select.locator(`option[value="${first}"]`)).toHaveCount(1);
   await select.selectOption(first);
   await expect(section.locator("p").first()).toContainText(first);
   await expect(section.locator("p").first()).toContainText(en?"Map snapshot":"地图快照");
   await expect(page).toHaveURL(new RegExp(`comparison_year=${first}`));
   await page.reload({waitUntil:'networkidle'});await expect(select).toHaveValue(first);
   const rows=section.locator('tbody tr');await expect(rows).toHaveCount(2);
   await expect(rows.first().locator('td').nth(1)).toHaveText(first);
   await expect(rows.first().locator('td').nth(2)).not.toHaveText(en?'No published value':'无已发布数值');
   await expect(rows.first().locator('a').first()).toHaveAttribute('href',/^https:\/\//);
   await expect(rows.first()).toContainText('NUTS2024');
   if(country==='hungary'&&en)await section.screenshot({path:info.outputPath('historical-regional-comparison.png')});
   await expect(page.getByRole('combobox',{name:en?'Year':'年份',exact:true})).toHaveValue('2024');
   const lastYear=await select.locator('option').last().getAttribute('value');expect(lastYear).toBe('2024');
   if(country==='poland'){
    await page.goto(`${prefix}/map/?country=poland&layer=regional_gdp&year=2024&regions=${ids.join(',')}`,{waitUntil:'networkidle'});
    await expect(select.locator('option[value="2018"]')).toHaveCount(1);await select.selectOption('2018');
    await expect(section.locator('tbody tr').first().locator('td').nth(1)).toHaveText('2018');
    await expect(section.locator('tbody tr').first()).toContainText('ADM1');
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  });
 }
 test(`coverage failures preserve observations and withhold unsupported comparisons ${prefix||'zh'}`,async({page})=>{
  await page.route('**/research-data/historical_recovery_inventory.json',route=>route.abort());
  await page.goto(`${prefix}/models/?tab=compare&macro_countries=romania,austria&macro_indicator=industrial_electricity_price`,{waitUntil:'networkidle'});
  await expect(page.locator('[data-common-annual-periods]')).toContainText('—');
  await expect(page.locator('[data-historical-coverage]').first()).toContainText(en?'unavailable':'读取失败');
  await page.unroute('**/research-data/historical_recovery_inventory.json');
  await page.route('**/research-data/regional-history/hungary.json',route=>route.abort());
  await page.goto(`${prefix}/map/?country=hungary&layer=regional_gdp_per_capita&year=2024&regions=hungary_tolna,hungary_hajdu_bihar`,{waitUntil:'networkidle'});
  const section=page.locator('[data-regional-comparison]');
  await expect(section).toContainText(en?'could not be fully loaded':'读取不完整');
  const select=section.getByRole('combobox',{name:en?'Common eligible comparison year':'共同合格比较年份',exact:true});
  await expect(select.locator('option[value="2024"]')).toHaveCount(1);
  await expect(select.locator('option[value="2018"]')).toHaveCount(0);

 });
}
