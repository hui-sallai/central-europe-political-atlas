import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { activeNotebookRaw } from "./notebook-storage";

test.describe("Antigravity Batch 3 economic research discovery and usability", () => {
  for (const prefix of ["/en", ""] as const) {
    const en = prefix === "/en";

    test(`economic indicator discovery, empty-search recovery and active summary (${en ? "en" : "zh"})`, async ({ page }) => {
      await page.goto(`${prefix}/data/`, { waitUntil: "networkidle" });
      const workspace = page.locator("[data-national-comparison]");
      await expect(workspace).toBeVisible();

      const summary = workspace.locator("[data-active-research-summary]");
      await expect(summary).toContainText("real_gdp_growth");
      await expect(summary).toContainText(en ? "Annual" : "年度");

      // Localized frequency labels inside indicator select (no untranslated "· annual ·" on zh)
      const firstOption = await workspace.getByLabel(en ? "Indicator" : "指标", { exact: true }).locator("option").first().innerText();
      if (!en) {
        expect(firstOption).toContain("年度");
        expect(firstOption).not.toContain("· annual ·");
      } else {
        expect(firstOption).toContain("Annual");
      }

      // Empty-search recovery distinguishes empty filter from missing observations
      const search = workspace.getByLabel(en ? "Search all indicators and frequencies" : "搜索所有指标和频率");
      await search.fill("zzzz-no-indicator");
      await expect(workspace.locator("[data-empty-indicator-search]")).toBeVisible();
      await workspace.locator("[data-reset-indicator-filter]").click();
      await expect(search).toHaveValue("");
      await expect(workspace.locator("[data-empty-indicator-search]")).toHaveCount(0);

      // Country selection, period filter clear, and Notebook collection preservation
      await workspace.getByRole("checkbox", { name: en ? "Germany" : "德国", exact: true }).check();
      await workspace.getByRole("checkbox", { name: en ? "Poland" : "波兰", exact: true }).check();
      await expect(summary).toContainText(en ? "Germany" : "德国");
      await expect(summary).toContainText(en ? "Poland" : "波兰");

      await workspace.getByLabel(en ? "From period" : "起始时期", { exact: true }).fill("2020");
      await workspace.getByLabel(en ? "To period" : "结束时期", { exact: true }).fill("2024");
      await expect(workspace.locator("[data-clear-period-filter]")).toBeVisible();
      await workspace.locator("[data-clear-period-filter]").click();
      await expect(workspace.getByLabel(en ? "From period" : "起始时期", { exact: true })).toHaveValue("");

      // Collect to Notebook and verify storage persistence
      await workspace.locator("[data-notebook-add]").click();
      await expect.poll(async () => JSON.parse((await activeNotebookRaw(page)) ?? "{}").items?.length ?? 0).toBe(1);

      // Accessibility in light and dark modes
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.waitForTimeout(220);
        const axe = await new AxeBuilder({ page }).include("[data-national-comparison]").analyze();
        expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test(`wide economic table shows scroll affordance cue on mobile (${en ? "en" : "zh"})`, async ({ page }, info) => {
      test.skip(info.project.name !== "mobile-390", "Mobile scroll-cue check runs on mobile-390");
      await page.goto(`${prefix}/data/?compare_countries=germany,poland&comparison_indicator=annual:real_gdp_growth`, { waitUntil: "networkidle" });
      const cue = page.locator("[data-national-comparison] [data-table-scroll-cue]").first();
      await expect(cue).toBeVisible();
      await expect(cue).toContainText(en ? "Scroll horizontally" : "左右滚动");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});
