import {test,expect} from '@playwright/test';
for (const prefix of ['', '/en']) test('Country research journeys '+(prefix||'zh'),async({page})=>{
 const en=!!prefix;
 async function fromMap(iso:string){
  await page.goto(prefix+'/');
  await page.locator('.home-country-selector').getByRole('button',{name:iso,exact:true}).click();
  await page.locator('.home-map-actions a').first().click();
  await expect(page.locator('[data-country-profile]')).toBeVisible();
 }
 await fromMap('HU');
 await page.locator('#economy select').first().selectOption('real_gdp_growth');
 await page.getByLabel(en?'Compare with':'加入比较的国家',{exact:true}).selectOption('poland');
 await page.reload();
 await page.getByRole('link',{name:en?'Compare selected indicator':'比较所选指标'}).click();
 const comparison=page.locator('[data-national-comparison]');
 await expect(comparison.locator('input:checked')).toHaveCount(2);
 await expect(comparison.getByLabel(en?'Indicator':'指标',{exact:true})).toHaveValue('annual:real_gdp_growth');
 await fromMap('RS');
 await page.getByText(en?'Election dates and original sources':'历届选举日期与原始来源',{exact:true}).click();
 await page.getByRole('link',{name:'2023-12-17',exact:true}).click();
 await expect(page).toHaveURL(/election=el-rs-nsk-2023-12-17/);
 await page.locator('[data-context-entry]').click();
 await expect(page.locator('[data-context-disclosure]')).toHaveAttribute('open','');
 await fromMap('CZ');
 await page.getByRole('link',{name:en?'Regional data and availability':'区域数据与可用性'}).click();
 await expect(page).toHaveURL(/country=czechia/);
 const workspace=page.getByRole('link',{name:en?'Open regional development workspace':'进入区域发展研究'});
 await workspace.click();
 await expect(page).toHaveURL(/regional_development.*countries=czechia/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
