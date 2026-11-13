import {test,expect} from '@playwright/test';
for(const prefix of ['', '/en']){
 const en=!!prefix;
 test(`annual and high-frequency direct links, refresh, history and locale ${prefix||'zh'}`,async({page})=>{
  await page.goto(`${prefix}/data/?country=germany&indicator=real_gdp_growth&from=2021&to=2021`);const p=page.locator('[data-national-comparison]');await expect(p.getByLabel(en?'Indicator':'指标',{exact:true})).toHaveValue('annual:real_gdp_growth');await expect(p.getByLabel(en?'From period':'起始时期',{exact:true})).toHaveValue('2021');await expect(p.locator('fieldset input:checked')).toHaveCount(1);
  await page.goto(`${prefix}/data/?tab=high_frequency&country=austria&indicator=industrial_production_index&from=2025&to=2026`);await expect(p.getByLabel(en?'Indicator':'指标',{exact:true})).toHaveValue('monthly:industrial_production_index');await expect(p.getByLabel(en?'From period':'起始时期',{exact:true})).toHaveValue('2025-01');await expect(p.getByLabel(en?'To period':'结束时期',{exact:true})).toHaveValue('2026-12');await page.reload();await expect(p.getByRole('checkbox',{name:en?'Austria':'奥地利',exact:true})).toBeChecked();const url=page.url();await page.goto(prefix+'/methodology/');await page.goBack();await expect(p.getByLabel(en?'Indicator':'指标',{exact:true})).toHaveValue('monthly:industrial_production_index');expect(new URL(page.url()).search).toBe(new URL(url).search);await page.getByRole('link',{name:en?'中文':'English',exact:true}).click();await expect(p.getByLabel(en?'指标':'Indicator',{exact:true})).toHaveValue('monthly:industrial_production_index');await expect(p.locator('fieldset input:checked')).toHaveCount(1);
 });
 test(`invalid explicitly supplied selection is visible, never replaced, and native history restores valid state ${prefix||'zh'}`,async({page})=>{
  await page.goto(`${prefix}/data/?tab=high_frequency&country=hungary&indicator=hicp_annual_rate&from=2025&to=2026`);const p=page.locator('[data-national-comparison]');await expect(p.locator('fieldset input:checked')).toHaveCount(1);await page.evaluate(()=>{history.pushState(null,'',location.pathname+'?tab=high_frequency&country=unknown&indicator=cpi&from=bad&to=2026');dispatchEvent(new PopStateEvent('popstate'));});await expect(p.getByRole('alert').first()).toBeVisible();await expect(p.locator('fieldset input:checked')).toHaveCount(0);await expect(p.getByLabel(en?'From period':'起始时期',{exact:true})).toHaveValue('bad');expect(new URL(page.url()).searchParams.get('country')).toBe('unknown');await page.goBack();await expect(p.locator('fieldset input:checked')).toHaveCount(1);await expect(p.getByLabel(en?'Indicator':'指标',{exact:true})).toHaveValue('monthly:hicp_annual_rate');await page.goForward();await expect(p.locator('fieldset input:checked')).toHaveCount(0);
 });
}

for(const prefix of ['', '/en'])test(`source-native Serbian links retain their actual indicator and frequency ${prefix||'zh'}`,async({page})=>{
 const en=!!prefix;
 for(const [series,frequency]of [['real_gdp_growth','annual'],['cpi_annual_index','monthly'],['lfs_unemployment_quarterly','quarterly']] as const){
  await page.goto(`${prefix}/data/?tab=high_frequency&country=serbia&sors_series=${series}&from=2020&to=2025`,{waitUntil:'networkidle'});
  const w=page.locator('[data-national-comparison]');
  await expect(w.getByRole('combobox',{name:en?'Indicator':'指标',exact:true})).toHaveValue(`sors:${series}`);
  await expect(w.getByRole('combobox',{name:en?'Frequency':'观测频率',exact:true})).toHaveValue(frequency);
  await expect(w.getByRole('textbox',{name:en?'From period':'起始时期',exact:true})).toHaveValue(frequency==='quarterly'?'2020-Q1':frequency==='monthly'?'2020-01':'2020');
  await page.reload();await expect(w.getByRole('combobox',{name:en?'Indicator':'指标',exact:true})).toHaveValue(`sors:${series}`);
 }
});
