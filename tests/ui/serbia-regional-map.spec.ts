import { test, expect } from "@playwright/test";

// Serbia regional map (owner approval 2026-11-14): 25 NSTJ3 areas from GISCO NUTS 2024, SORS population on 1 January,
// compared within Serbia only (never in cross-country regional comparison).
test("Serbian NSTJ3 map renders SORS population within Serbia only (en)", async ({ page }) => {
  await page.goto("/en/map/?country=serbia&layer=regional_population&year=2024&regions=serbia_bor", { waitUntil: "networkidle" });
  const main = page.locator("main");
  await expect(main).toContainText("Serbia’s 25 NSTJ3 areas (not EU NUTS regions)");
  await expect(main).toContainText("Within-country descriptive comparison");
  await expect(main).toContainText("RS221 · NSTJ3");
  await expect(main).toContainText("99,184");
  await expect(page.locator(".spatial-map-stage svg path")).toHaveCount(25);
  expect((await main.innerText()).match(/[一-鿿]/g)).toBeNull();
});

test("Serbia cannot enter cross-country regional comparison", async ({ page }) => {
  await page.goto("/en/map/?country=croatia&layer=regional_population&year=2024", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cross-country comparison" }).click();
  const control = page.locator(".spatial-comparison-control");
  await expect(control.getByRole("button", { name: /Serbia/ })).toBeDisabled();
  await expect(control.getByRole("button", { name: /Slovakia/ })).toBeEnabled();
});

test("Chinese map and Serbian profile agree on the within-country scope", async ({ page }) => {
  await page.goto("/map/?country=serbia&layer=regional_population&year=2024", { waitUntil: "networkidle" });
  await expect(page.locator("main")).toContainText("塞尔维亚 25 个 NSTJ3 区域（非欧盟 NUTS）");
  await expect(page.locator("main")).toContainText("本国内描述性比较");
  await page.goto("/en/countries/serbia/", { waitUntil: "networkidle" });
  await expect(page.locator("[data-serbia-availability]")).toContainText("compared within Serbia only");
  await expect(page.locator("main")).toContainText("Regional facts map available");
});
