import { test, expect } from "@playwright/test";

// Serbian public finance and current account (Ministry of Finance bulletin, owner decision D 2026-11-15): shown on
// Serbia's profile only, labelled as national definitions; printed ratios as published, calculated shares marked *.
test("Serbia profile shows Ministry of Finance public finance with national-definition labels (en)", async ({ page }) => {
  await page.goto("/en/countries/serbia/", { waitUntil: "networkidle" });
  const panel = page.locator("[data-serbia-public-finance]");
  await expect(panel).toContainText("Public finance and current account (Ministry of Finance)");
  await expect(panel).toContainText("National definitions");
  await expect(panel).toContainText("not compared with EU EDP/ESA government finance data");
  const row = (label: string) => panel.locator("tbody tr").filter({ hasText: label });
  await expect(row("Consolidated balance (GFS-1986)").locator("td").last()).toHaveText("-2.4"); // 2025, printed
  await expect(row("Public debt (central government, end of year)").locator("td").last()).toHaveText("43.7");
  await expect(row("Current account balance (BPM6, NBS data)").locator("td").first()).toHaveText("-3.9"); // 2020
  await expect(row("Consolidated public revenue").locator("td").last()).toHaveText("40.3*"); // calculated
  await expect(panel.locator("thead th").last()).toHaveText("2025");
  expect(await panel.innerText()).not.toMatch(/[一-鿿]/);
});

test("Serbia profile public finance panel in Chinese keeps the same values", async ({ page }) => {
  await page.goto("/countries/serbia/", { waitUntil: "networkidle" });
  const panel = page.locator("[data-serbia-public-finance]");
  await expect(panel).toContainText("公共财政与经常账户（塞尔维亚财政部）");
  await expect(panel.locator("tbody tr").filter({ hasText: "合并财政余额" }).locator("td").last()).toHaveText("-2.4");
  await expect(panel.getByRole("link", { name: "已发布财政序列与来源（JSON）" })).toHaveAttribute("href", "/research-data/serbia/serbia_public_finance_mfin.json");
});
