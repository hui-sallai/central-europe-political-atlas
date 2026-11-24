import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { activeNotebookRaw } from "./notebook-storage";

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

  test("global navigation includes Workspaces without wrapping desktop header", async ({ page }, info) => {
    for (const locale of ["en", "zh"] as const) {
      const prefix = locale === "en" ? "/en" : "";
      await page.goto(`${prefix}/`, { waitUntil: "networkidle" });
      if (info.project.name === "desktop-1440") {
        const wsLink = page.locator(`header a[href="${prefix}/workspaces/"]`).first();
        await expect(wsLink).toBeVisible();
        const headerH = await page.locator("header.site-header").evaluate((el) => Math.round(el.getBoundingClientRect().height));
        expect(headerH).toBeLessThanOrEqual(64);
      } else {
        await page.locator('header button[aria-controls="mobile-nav"]').click();
        await expect(page.locator(`#mobile-nav a[href="${prefix}/workspaces/"]`)).toBeVisible();
      }
    }
  });

  test("workspaces index does not duplicate main page title or intro", async ({ page }) => {
    for (const [route, h1Text, h2Text] of [
      ["/en/workspaces/", "Research Workspaces", "Question-first workspaces"],
      ["/workspaces/", "研究问题工作区", "问题导向工作区"],
    ] as const) {
      await page.goto(route, { waitUntil: "networkidle" });
      await expect(page.locator("h1")).toHaveText(h1Text);
      await expect(page.locator("#question-first-title")).toHaveText(h2Text);
      await expect(page.locator("h2", { hasText: h1Text })).toHaveCount(0);
    }
  });

  test("notebook provides jump nav, styled project controls, and singular/plural evidence wording", async ({ page }) => {
    await page.goto("/en/politics/germany/?election=el-de-bt-1990-12-02", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Add to notebook" }).first().click();
    await expect.poll(async () => JSON.parse((await activeNotebookRaw(page)) ?? "{}").items?.length ?? 0).toBe(1);
    await page.goto("/en/notebook/", { waitUntil: "networkidle" });
    const jump = page.locator("[data-notebook-jump-nav]");
    await expect(jump).toBeVisible();
    await expect(jump.locator('a[href="#notebook-evidence"]')).toContainText("1");
    await expect(page.locator("[data-notebook-projects]")).toContainText("1 evidence item");
    await expect(page.locator("[data-notebook-projects]")).not.toContainText("1 evidence items");
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });
});
