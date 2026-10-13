import { expect, test } from "@playwright/test";
import { canonicalSourceCheck, CANONICAL_SOURCE_CHECK_RUN } from "../../src/lib/canonicalSourceCheck";

for (const locale of ["zh-CN", "en"] as const) {
  test(`country observations show real source-check provenance behind disclosure (${locale})`, async ({ page }) => {
    await page.goto(`${locale === "en" ? "/en" : ""}/countries/hungary/`, { waitUntil: "networkidle" });
    // The Chinese profile shows the six headline indicators; the English one also lists FDI.
    const indicator = locale === "en" ? "fdi_inflow" : "unemployment_rate";
    const cell = page.locator(`[data-country-observation='${indicator}']`).first();
    const check = cell.locator("[data-source-check]");
    // Essential information stays visible; provenance detail is behind the disclosure.
    await expect(check).toBeHidden();
    await cell.locator("summary").click();
    await expect(check).toHaveAttribute("data-source-check", CANONICAL_SOURCE_CHECK_RUN.retrieved);
    await expect(check).toContainText(canonicalSourceCheck[`hungary|${indicator}`].source_updated!);
    if (locale === "en") await expect(check.locator("[data-availability]")).toHaveAttribute("data-availability", "not_yet_published_at_source");
    await expect(check).toContainText(locale === "en" ? "not provided by the source" : "来源不提供单个观测的官方发布日期");
    if (locale === "en") expect(await check.innerText()).not.toMatch(/[㐀-鿿]/u);
  });

  test(`Serbia: gaps carry an evidence-based reason, never a substitute series (${locale})`, async ({ page }) => {
    await page.goto(`${locale === "en" ? "/en" : ""}/countries/serbia/`, { waitUntil: "networkidle" });
    const debt = page.locator("[data-country-observation='government_debt_gdp']").first();
    await expect(debt).toHaveAttribute("data-observation-status", "pending");
    await expect(debt).toContainText(locale === "en" ? "The source dataset does not cover this country" : "该来源数据集不覆盖此国家");
    const hicp = page.locator("[data-country-observation='hicp_inflation']").first();
    await expect(hicp).toHaveAttribute("data-observation-status", "pending");
    await expect(hicp).toContainText(locale === "en" ? "definition-differs flag" : "标注口径不同");
    await expect(hicp.locator(".metric-number").first()).toHaveText("—");
  });
}

test("stored values that differ at source are disclosed without being replaced", async ({ page }) => {
  const key = Object.keys(canonicalSourceCheck).find((item) => item.endsWith("|real_gdp_growth") && canonicalSourceCheck[item].revised_years.length)!;
  const country = key.split("|")[0];
  await page.goto(`/en/countries/${country}/`, { waitUntil: "networkidle" });
  const cell = page.locator("[data-country-observation='real_gdp_growth']").first();
  await cell.locator("summary").click();
  await expect(cell.locator("[data-revised-at-source]")).toContainText("stored value is unchanged pending owner review");
});
