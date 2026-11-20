import {test,expect} from '@playwright/test';

test('regional workspace returns to the selected Serbian population area after reload',async({page})=>{
 await page.goto('/en/map/?country=serbia&layer=regional_population&year=2024&regions=serbia_bor');
 await page.getByRole('link',{name:'Open regional development workspace'}).click();
 await expect(page).toHaveURL(/map_regions=serbia_bor/);
 await page.reload();
 await page.getByRole('link',{name:'Return to selected map regions'}).click();
 await expect(page.locator('main')).toContainText('99,184');
 await expect(page).toHaveURL(/regions=serbia_bor/);
});
test('reviewed annual event handoff preserves the country, reference year and definition',async({page})=>{
 await page.goto('/en/news/?country=hungary&from=2022-08-12&to=2022-08-12&linked=1');
 const card=page.locator('article[id]').filter({has:page.locator('[data-event-annual="fdi_inflow"]')});
 await card.locator('summary').click();
 await expect(card).toContainText('Research hypothesis');
 await card.locator('[data-event-annual="fdi_inflow"]').click();
 await expect(page).toHaveURL(/comparison_indicator=annual%3Afdi_inflow/);
 await expect(page).toHaveURL(/compare_from=2022/);
 await expect(page).toHaveURL(/compare_countries=hungary/);
});
test('institutional comparison is collected with the selected dimension',async({page})=>{
 await page.goto('/en/politics/?institution_countries=poland,hungary&institution_dimension=executive#institutions');
 await page.locator('#institutions').getByRole('button', {name:'Add to notebook', exact:true}).click();
 await expect(page.locator('#institutions').getByRole('button', {name:'Added', exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>Object.values(localStorage).some(raw=>raw.includes('institutional_comparison')))).toBe(true);
 await page.goto('/en/notebook/');
 await expect(page.locator('main')).toContainText('Political institutions · poland / hungary');
});
test('Hungarian inflation compares with Poland and Czechia and saves the research view',async({page})=>{
 await page.goto('/en/');
 await page.locator('.home-country-selector').getByRole('button',{name:'HU',exact:true}).click();
 await page.locator('.home-map-actions a').first().click();
 await page.locator('[data-country-observation=hicp_inflation] a').last().click();
 const comparison=page.locator('[data-national-comparison]');
 for(const name of ['Poland','Czechia']) await comparison.getByRole('checkbox',{name,exact:true}).check();
 await expect(comparison.getByLabel('Indicator',{exact:true})).toHaveValue('annual:hicp_inflation');
 await comparison.locator('[data-notebook-add]').click();
 await expect(comparison.locator('[data-notebook-add]')).toContainText(/Added/i);
});
