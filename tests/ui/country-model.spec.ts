import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { modelCards, getModelOutputsForCountry } from "../../src/lib/modelFramework";
import { formatNumber } from "../../src/lib/format";

for (const prefix of ["", "/en"]) test(`country composite-model meanings and navigation ${prefix || "zh"}`, async ({ page }) => {
  await page.goto(`${prefix}/countries/serbia/`);
  if (!prefix) await page.getByRole("tab", { name: "模型结果", exact: true }).click();
  const outputs = getModelOutputsForCountry("serbia");
  for (const output of outputs) {
    const card = modelCards.find(card => card.model_id === output.model_id)!;
    const block = page.locator(`[data-country-model="${output.model_id}"]`);
    await expect(block).toContainText(prefix ? card.name : card.name_zh);
    await expect(block.locator("[data-model-score]")).toHaveText(formatNumber(output.score, { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
    await expect(block.locator("[data-model-reference-year]")).toHaveText(String(output.input_year ?? "—"));
    await expect(block).toContainText("0–100");
    await expect(block.locator("h3")).not.toContainText(/household_economic_pressure|fiscal_pressure/);
    await expect(block.locator("[data-model-availability]")).not.toContainText(/\b(sufficient|insufficient|registry_only)\b/);
    await expect(block.getByRole("link", { name: prefix ? "Open this model" : "打开此模型", exact: true })).toHaveAttribute("href", `${prefix}/models/?tab=run&skill=composite_indicators&model=${output.model_id}&country=serbia`);
  }
  await page.locator('[data-country-model="fiscal_pressure"]').getByRole("link", { name: prefix ? "Open this model" : "打开此模型", exact: true }).click();
  await expect(page.locator('select').filter({ has: page.locator('option[value="fiscal_pressure"]') })).toHaveValue("fiscal_pressure");
  await expect(page.locator('select').filter({ has: page.locator('option[value="serbia"]') }).first()).toHaveValue("serbia");
  expect((await page.locator("main > header .editorial-kicker").innerText()).match(/v2\.0/gi)).toHaveLength(1);
  await page.goto(`${prefix}/countries/poland/`);
  if (!prefix) await page.getByRole("tab", { name: "模型结果", exact: true }).click();
  await expect(page.getByRole("link", { name: prefix ? "Research data exports" : "研究数据导出", exact: true }).first()).toHaveAttribute("href", `${prefix}/methodology/#citation`);
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
