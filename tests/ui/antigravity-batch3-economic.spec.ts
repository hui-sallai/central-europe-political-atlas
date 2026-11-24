import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { activeNotebookRaw } from "./notebook-storage";

test.describe("Antigravity Batch 3 economic research discovery and usability", () => {
  for (const prefix of ["/en", ""] as const) {
    const en = prefix === "/en";

    test(`economic indicator discovery, active summary, period recovery and accessibility (${en ? "en" : "zh"})`, async ({ page }) => {
      await page.goto(`${prefix}/data/`, { waitUntil: "networkidle" });
      const workspace = page.locator("[data-national-comparison]");
      await expect(workspace).toBeVisible();

      const summary = workspace.locator("[data-active-research-summary]");
      await expect(summary).toContainText("real_gdp_growth");
      await expect(summary).toContainText(en ? "Annual" : "年度");
      await expect(summary.locator("[data-summary-requested-range]")).toContainText(en ? "Unrestricted" : "未限定");

      // Localized frequency labels inside indicator select (no untranslated "· annual ·" on zh)
      const firstOption = await workspace.getByLabel(en ? "Indicator" : "指标", { exact: true }).locator("option").first().innerText();
      if (!en) {
        expect(firstOption).toContain("年度");
        expect(firstOption).not.toContain("· annual ·");
      } else {
        expect(firstOption).toContain("Annual");
      }

      // Select countries first, then verify empty-search reset preserves the active selection
      await workspace.getByRole("checkbox", { name: en ? "Germany" : "德国", exact: true }).check();
      await workspace.getByRole("checkbox", { name: en ? "Poland" : "波兰", exact: true }).check();
      await expect(summary).toContainText(en ? "Germany" : "德国");
      await expect(summary).toContainText(en ? "Poland" : "波兰");
      await expect(summary.locator("[data-summary-available-span]")).toContainText(en ? "Common eligible" : "共同合格");

      const search = workspace.getByLabel(en ? "Search all indicators and frequencies" : "搜索所有指标和频率");
      await search.fill("zzzz-no-indicator");
      await expect(workspace.locator("[data-empty-indicator-search]")).toBeVisible();
      await workspace.locator("[data-reset-indicator-filter]").click();
      await expect(search).toHaveValue("");
      await expect(workspace.locator("[data-empty-indicator-search]")).toHaveCount(0);
      await expect(summary).toContainText("real_gdp_growth");
      await expect(summary).toContainText(en ? "Germany" : "德国");
      await expect(summary).toContainText(en ? "Poland" : "波兰");

      // Case A: Normal populated date range + explicit reference period + clear
      const fromInput = workspace.getByLabel(en ? "From period" : "起始时期", { exact: true });
      const toInput = workspace.getByLabel(en ? "To period" : "结束时期", { exact: true });
      await fromInput.fill("2020");
      await toInput.fill("2023");
      await expect(summary.locator("[data-summary-requested-range]")).toContainText("2020 – 2023");

      const refSelect = workspace.getByLabel(en ? "Reference period" : "参照时期", { exact: true });
      await refSelect.selectOption("2021");
      await expect(summary.locator("[data-summary-reference-period]")).toContainText("2021");
      await expect(summary.locator("[data-summary-reference-period]")).toContainText(en ? "Explicit" : "指定");

      await workspace.locator("[data-clear-period-filter]").click();
      await expect(fromInput).toHaveValue("");
      await expect(toInput).toHaveValue("");
      await expect(refSelect).toHaveValue("");
      await expect.poll(() => {
        const u = new URL(page.url());
        return u.searchParams.get("compare_from") || u.searchParams.get("compare_to") || u.searchParams.get("comparison_period") || "";
      }).toBe("");

      // Case B: Clear period remains accessible even when all countries are deselected (availablePeriods empty)
      await fromInput.fill("2020");
      await toInput.fill("2023");
      await workspace.getByRole("button", { name: en ? "Clear country selection" : "清除国家选择" }).click();
      await expect(summary.locator("[data-summary-available-span]")).toContainText(en ? "No loaded observations" : "无已加载观测");
      await expect(workspace.locator("[data-clear-period-filter]")).toBeVisible();
      await workspace.locator("[data-clear-period-filter]").click();
      await expect(fromInput).toHaveValue("");
      await expect(toInput).toHaveValue("");
      await expect(summary).toContainText("real_gdp_growth");

      // Case C: Invalid ordered range retains requested value in summary and clears cleanly
      await workspace.getByRole("checkbox", { name: en ? "Germany" : "德国", exact: true }).check();
      await workspace.getByRole("checkbox", { name: en ? "Poland" : "波兰", exact: true }).check();
      await fromInput.fill("2024");
      await toInput.fill("2020");
      await expect(summary.locator("[data-summary-requested-range]")).toContainText("2024 – 2020");
      await expect(summary.locator("[data-summary-requested-range]")).toContainText(en ? "Invalid range" : "时期无效");
      await workspace.locator("[data-clear-period-filter]").click();
      await expect(fromInput).toHaveValue("");
      await expect(toInput).toHaveValue("");

      // Collect to Notebook and verify storage persistence
      await workspace.locator("[data-notebook-add]").click();
      await expect.poll(async () => JSON.parse((await activeNotebookRaw(page)) ?? "{}").items?.length ?? 0).toBe(1);

      // Accessibility in light and dark modes (wait for CSS token/transition readiness rather than fixed sleep)
      const cta = workspace.locator(".cta-dark").first();
      for (const [scheme, expectedBg] of [
        ["light", "rgb(24, 34, 45)"],
        ["dark", "rgb(232, 229, 222)"],
      ] as const) {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await expect.poll(() => cta.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(expectedBg);
        const axe = await new AxeBuilder({ page }).include("[data-national-comparison]").analyze();
        expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test(`legacy year-transfer notice clears and reloads cleanly (${en ? "en" : "zh"})`, async ({ page }) => {
      await page.goto(`${prefix}/data/?tab=high_frequency&compare_countries=germany,poland&from=2022&to=2023`, { waitUntil: "networkidle" });
      const workspace = page.locator("[data-national-comparison]");
      const notice = workspace.getByText(en ? "Legacy year filters are converted" : "旧年度筛选已明确转换");
      await expect(notice).toBeVisible();
      await expect(workspace.locator("[data-clear-period-filter]")).toBeVisible();
      await workspace.locator("[data-clear-period-filter]").click();
      await expect(notice).toHaveCount(0);

      await expect.poll(() => {
        const u = new URL(page.url());
        return ["from", "to", "compare_from", "compare_to", "comparison_period"].filter((k) => u.searchParams.has(k));
      }).toEqual([]);

      const cleanedUrl = page.url();
      await page.goto(cleanedUrl, { waitUntil: "networkidle" });
      await expect(workspace.getByLabel(en ? "From period" : "起始时期", { exact: true })).toHaveValue("");
      await expect(workspace.getByText(en ? "Legacy year filters are converted" : "旧年度筛选已明确转换")).toHaveCount(0);
    });

    test(`wide economic table scroll cue updates on scroll, keyboard focus, and details toggle (${en ? "en" : "zh"})`, async ({ page }, info) => {
      test.skip(info.project.name !== "mobile-390", "Mobile horizontal-scroll checks run on mobile-390");
      await page.goto(`${prefix}/data/?compare_countries=germany,poland&comparison_indicator=annual:real_gdp_growth`, { waitUntil: "networkidle" });
      const workspace = page.locator("[data-national-comparison]");
      const cue = workspace.locator("[data-table-scroll-cue]").first();
      await expect(cue).toBeVisible();
      await expect(cue).toContainText(en ? "Scroll horizontally" : "左右滚动");

      // Keyboard-focusable scroll region scrolls with ArrowRight and updates cue at end/start
      const viewport = workspace.locator(".data-table-viewport").first();
      await viewport.focus();
      await expect(viewport).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => viewport.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

      await viewport.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
      });
      await expect(cue).toContainText(en ? "Scrolled to the last column" : "已滚动至末列");

      await viewport.evaluate((el) => {
        el.scrollLeft = 0;
      });
      await expect(cue).toContainText(en ? "Scroll horizontally" : "左右滚动");

      // Opening collapsed detailed records reveals its wide-table scroll cue
      const details = workspace.locator("details[data-comparison-records]");
      await details.locator("summary").click();
      await expect(details.locator("[data-table-scroll-cue]")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});
