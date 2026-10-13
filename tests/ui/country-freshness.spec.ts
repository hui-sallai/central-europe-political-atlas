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
  const fdi = latestAvailable("romania", "fdi_inflow");
  if (prefix) await expect(page.locator('[data-country-observation="fdi_inflow"]')).toHaveAttribute("data-observation-year", String(fdi!.year));
  else {
    await page.getByRole("tab", { name: "经济数据", exact: true }).click();
    await expect(page.locator('[data-country-observation="fdi_inflow"]')).toHaveAttribute("data-observation-year", String(fdi!.year));
  }
  await page.getByRole("link", { name: prefix ? "Historical comparison" : "历史比较", exact: true }).click();
  await expect(page.getByRole("region", { name: prefix ? "Historical annual comparison" : "年度历史比较", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: prefix ? "Romania" : "罗马尼亚", exact: true })).toBeChecked();
  await page.goto(`${prefix}/`);
  const meta = page.locator("[data-latest-signals-meta]");
  await expect(meta).toContainText(newsLibraryMetadata.latestNewsBatch);
  await expect(meta).toContainText(newsLibraryMetadata.historicalStoreUpdatedAt);
  await expect(meta).toContainText(newsLibraryMetadata.latestEventDate);
  if (prefix) {
    for (const button of await page.locator(".home-country-selector button").all()) {
      await button.click();
      await expect(page.locator(".home-country-metrics")).not.toContainText(/[\u3400-\u9fff]/u);
    }
    await page.locator(".home-country-selector").getByRole("button", { name: "RS", exact: true }).click();
    await expect(page.locator(".home-country-metrics")).toContainText("Pending publication / connection");
  }
  expect(getCountryObservations("serbia", "hicp_inflation").every(row => row.value === null)).toBe(true);
});
