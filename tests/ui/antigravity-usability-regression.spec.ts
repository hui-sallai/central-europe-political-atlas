import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ALPHA_COUNTRIES = ["germany", "hungary", "czechia", "poland", "serbia", "slovakia"] as const;

test.describe("Antigravity usability, responsive and accessibility regressions", () => {
  test("mobile header language switcher stays single-line without vertical wrapping in EN and ZH", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile-390", "Mobile header wrapping check runs on mobile-390");
    for (const route of ["/en/", "/"]) {
      await page.goto(route, { waitUntil: "networkidle" });
      const switcher = page.locator("header a[hreflang]");
      await expect(switcher).toBeVisible();
      const box = await switcher.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeLessThanOrEqual(34);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });

  test("homepage hero navigation links align vertically with CTA", async ({ page }) => {
    for (const route of ["/en/", "/"]) {
      await page.goto(route, { waitUntil: "networkidle" });
      const nav = page.locator("main header nav");
      await expect(nav).toHaveClass(/items-center/);
    }
  });

  test("scrollable continuity tables are keyboard-focusable with zero serious/critical axe violations on mobile", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile-390", "Scrollable table overflow check runs on mobile-390");
    for (const route of ["/en/politics/czechia/", "/politics/czechia/", "/en/politics/poland/", "/politics/poland/"]) {
      await page.goto(route, { waitUntil: "networkidle" });
      const regions = page.locator('[data-czech-continuity] [role="region"][tabindex="0"]');
      expect(await regions.count()).toBeGreaterThan(0);
      const axe = await new AxeBuilder({ page }).analyze();
      const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious, `Axe violations on ${route}`).toEqual([]);
    }
  });

  test("country parliamentary election pages provide consistent Politics and Country Hub navigation links", async ({ page }) => {
    for (const locale of ["en", "zh"] as const) {
      const prefix = locale === "en" ? "/en" : "";
      for (const country of ALPHA_COUNTRIES) {
        await page.goto(`${prefix}/politics/${country}/`, { waitUntil: "networkidle" });
        const header = page.locator(`[data-political-country-header="${country}"]`);
        await expect(header).toBeVisible();
        await expect(header.locator(`a[href="${prefix}/politics/"]`)).toBeVisible();
        await expect(header.locator(`a[href="${prefix}/countries/${country}/"]`)).toBeVisible();
        await expect(header).not.toContainText("Alpha");
      }
    }
  });
});
