import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Antigravity Batch 5 spatial and thematic research integration", () => {
  for (const prefix of ["/en", ""] as const) {
    const en = prefix === "/en";

    test(`regional map keyboard selection, active summary, clear-regions, dark-mode contrast, and mobile scroll cue (${en ? "en" : "zh"})`, async ({ page }, info) => {
      await page.goto(`${prefix}/map/?country=hungary&layer=regional_gdp_per_capita&year=2024`, { waitUntil: "networkidle" });
      const summary = page.locator("[data-active-spatial-summary]");
      await expect(summary).toBeVisible();
      await expect(summary).toContainText("NUTS");
      await expect(summary).toContainText("0/5");

      // Keyboard-accessible SVG region selection (selected path moves to top of SVG paint order)
      const paths = page.locator('svg[data-map-export="hungary"] path[role="button"]');
      const pressedPaths = page.locator('svg[data-map-export="hungary"] path[aria-pressed="true"]');
      await expect(paths.first()).toBeVisible();
      await paths.first().focus();
      await expect(paths.first()).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(pressedPaths).toHaveCount(1);
      await expect(summary).toContainText("1/5");

      await paths.first().focus();
      await page.keyboard.press(" ");
      await expect(pressedPaths).toHaveCount(2);
      await expect(summary).toContainText("2/5");

      const comp = page.locator("[data-regional-comparison]");
      const clearBtn = comp.locator("[data-clear-selected-regions]");
      await expect(clearBtn).toBeVisible();

      if (info.project.name === "mobile-390") {
        await expect(comp.locator("[data-table-scroll-cue]")).toBeVisible();
      }

      // Map-to-regional-development handoff link retains country and map_layer context
      const wsLink = page.locator(`nav a[href*="${prefix}/workspaces/regional_development/"]`);
      await expect(wsLink).toHaveAttribute("href", /countries=hungary/);
      await expect(wsLink).toHaveAttribute("href", /map_layer=regional_gdp_per_capita/);

      // Clear selected regions resets count and URL regions param
      await clearBtn.click();
      await expect(summary).toContainText("0/5");
      await expect.poll(() => new URL(page.url()).searchParams.has("regions")).toBe(false);

      // Dark-mode surface contrast (no hardcoded white select / summary background) + axe compliance
      for (const [scheme, expectedSurface] of [
        ["light", "rgb(251, 250, 247)"],
        ["dark", "rgb(24, 28, 32)"],
      ] as const) {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await expect.poll(() => summary.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(expectedSurface);
        const axe = await new AxeBuilder({ page }).include(".spatial-workbench-layout").analyze();
        expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test(`thematic workspace filter reset, case clear, scope summary, and tablet widths (${en ? "en" : "zh"})`, async ({ page }, info) => {
      if (info.project.name === "desktop-1440") {
        for (const width of [1024, 768] as const) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${prefix}/map/?country=serbia`, { waitUntil: "networkidle" });
          await expect(page.locator("[data-active-spatial-summary]")).toContainText("NSTJ");
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        }
        await page.setViewportSize({ width: 1440, height: 900 });
      }

      await page.goto(`${prefix}/workspaces/industrial_policy_strategic_investment/`, { waitUntil: "networkidle" });
      const ws = page.locator('[data-thematic-workspace="industrial_policy_strategic_investment"]');
      await expect(ws.locator("[data-thematic-scope-summary]")).toContainText(en ? "case" : "案例");

      await ws.getByRole("checkbox", { name: en ? "Hungary" : "匈牙利", exact: true }).check();
      await expect(ws.locator("[data-clear-thematic-countries]")).toBeVisible();

      // Select first case, verify clear-case button preserves country filter
      await ws.locator("section button.card").first().click();
      await expect(ws.locator("[data-clear-thematic-case]")).toBeVisible();
      await ws.locator("[data-clear-thematic-case]").click();
      await expect(ws.locator("[data-clear-thematic-case]")).toHaveCount(0);
      await expect(ws.getByRole("checkbox", { name: en ? "Hungary" : "匈牙利", exact: true })).toBeChecked();

      // Clear country filter restores all countries and removes country query param
      await ws.locator("[data-clear-thematic-countries]").click();
      await expect(ws.locator("[data-clear-thematic-countries]")).toHaveCount(0);
      await expect.poll(() => new URL(page.url()).searchParams.has("country")).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});
