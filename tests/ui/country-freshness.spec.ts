import { expect, test } from "@playwright/test";
import { researchCountries, getCountryObservations } from "../../src/lib/researchData";
import { latestAvailable } from "../../src/lib/freshness";
import { newsLibraryMetadata } from "../../src/lib/newsLibraryMetadata";

for (const prefix of ["", "/en"]) test(`country directory published years, units and metadata ${prefix || "zh"}`, async ({ page }) => {
  await page.goto(`${prefix}/countries/`);
  const cards = page.locator("main section > article");
  await expect(cards).toHaveCount(10);
  for (const [index, country] of researchCountries.entries()) for (const id of ["real_gdp_growth", "hicp_inflation", "unemployment_rate", "gdp_per_capita_eur"]) {
    const cell = cards.nth(index).locator(`[data-country-observation="${id}"]`);
    const published = latestAvailable(country.slug, id);
    await expect(cell).toHaveAttribute("data-observation-year", published ? String(published.year) : "");
    await expect(cell.locator("a").last()).toHaveAttribute("href", `${prefix}/data/?country=${country.slug}&indicator=${id}&tab=annual`);
    if (published) await expect(cell.locator("p").first()).not.toHaveText("—");
    else await expect(cell.locator("p").first()).toHaveText("—");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto(`${prefix}/countries/romania/`);
  const gdp=latestAvailable("romania","real_gdp_growth");await expect(page.locator('[data-country-observation="real_gdp_growth"]')).toHaveAttribute("data-observation-year",String(gdp!.year));
  await page.getByRole("link",{name:prefix?"Economic data and country comparison":"经济数据与国家比较",exact:true}).click();const comparison=page.locator('[data-national-comparison]');await expect(comparison).toBeVisible();await expect(comparison.getByRole("checkbox",{name:prefix?"Romania":"罗马尼亚",exact:true})).toBeChecked();await expect(comparison.locator('fieldset input:checked')).toHaveCount(1);
  await page.goto(`${prefix}/news/`);const meta=page.locator('[data-latest-signals-meta]');await expect(meta).toContainText(newsLibraryMetadata.latestNewsBatch);await expect(meta).toContainText(newsLibraryMetadata.historicalStoreUpdatedAt);await expect(meta).toContainText(newsLibraryMetadata.latestEventDate);
  await page.goto(`${prefix}/`);await expect(page.locator('.home-country-metrics,.home-latest-event,[data-home-case]')).toHaveCount(0);
  expect(getCountryObservations("serbia", "hicp_inflation").every(row => row.value === null)).toBe(true);
});
