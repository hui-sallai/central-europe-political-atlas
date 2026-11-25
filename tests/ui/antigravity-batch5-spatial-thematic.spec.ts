import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Antigravity Batch 5 spatial and thematic research integration", () => {
  for (const prefix of ["/en", ""] as const) {
    const en = prefix === "/en";

    test(`regional map keyboard focus, stable region identity, bilingual labels, clear-regions, and map-to-workspace handoff (${en ? "en" : "zh"})`, async ({ page }, info) => {
      await page.goto(`${prefix}/map/?country=hungary&layer=regional_gdp_per_capita&year=2024`, { waitUntil: "networkidle" });
      const summary = page.locator("[data-active-spatial-summary]");
      await expect(summary).toBeVisible();
      await expect(summary).toContainText("NUTS");
      await expect(summary).toContainText("0/5");

      // Bilingual SVG group label
      const svg = page.locator('svg[data-map-export="hungary"]');
      await expect(svg).toHaveAttribute("role", "group");
      await expect(svg).toHaveAttribute("aria-label", en ? /Hungary 2024 regional facts map/ : /匈牙利 2024 区域事实地图/);

      // Stable region identity via data-region-id across SVG paint-order re-sorts
      const paths = svg.locator('path[role="button"]');
      await expect(paths.first()).toBeVisible();
      const regionIds = await paths.evaluateAll((els) => els.slice(0, 6).map((el) => el.getAttribute("data-region-id")!));
      const r0 = svg.locator(`path[data-region-id="${regionIds[0]}"]`);
      const r1 = svg.locator(`path[data-region-id="${regionIds[1]}"]`);

      // Bilingual choropleth accessible label includes value, unit, and year
      await expect(r0).toHaveAttribute("aria-label", /2024/);

      // Keyboard focus stays distinct from pointer hover even after mouse moves away
      await r0.focus();
      await expect(r0).toBeFocused();
      await expect(r0).toHaveAttribute("stroke", "var(--accent)");
      await expect(r0).toHaveAttribute("stroke-dasharray", "4 2");
      await page.mouse.move(0, 0);
      await expect(r0).toHaveAttribute("stroke", "var(--accent)");

      // Activate with Enter and Space using stable data-region-id
      await page.keyboard.press("Enter");
      await expect(r0).toHaveAttribute("aria-pressed", "true");
      await expect(summary).toContainText("1/5");

      await r1.focus();
      await page.keyboard.press(" ");
      await expect(r1).toHaveAttribute("aria-pressed", "true");
      await expect(summary).toContainText("2/5");

      // Deselect and re-select with Space
      await page.keyboard.press(" ");
      await expect(r1).toHaveAttribute("aria-pressed", "false");
      await page.keyboard.press(" ");
      await expect(r1).toHaveAttribute("aria-pressed", "true");

      // Five-region selection limit: activating 6th region replaces earliest selected region (FIFO)
      for (const id of regionIds.slice(2, 6)) {
        const p = svg.locator(`path[data-region-id="${id}"]`);
        await p.focus();
        await page.keyboard.press("Enter");
      }
      await expect(summary).toContainText("5/5");
      await expect(r0).toHaveAttribute("aria-pressed", "false");
      await expect(svg.locator(`path[data-region-id="${regionIds[5]}"]`)).toHaveAttribute("aria-pressed", "true");

      const comp = page.locator("[data-regional-comparison]");
      if (info.project.name === "mobile-390") {
        await expect(comp.locator("[data-table-scroll-cue]")).toBeVisible();
      }

      // Set quantitative output + reference region, then verify Clear selected regions resets selection & URL
      await comp.getByLabel(en ? "Regional output" : "区域输出", { exact: true }).selectOption("quantitative");
      await comp.getByLabel(en ? "Optional difference reference (your choice)" : "可选差值参照（由你指定）", { exact: true }).selectOption(regionIds[1]);
      await expect.poll(() => new URL(page.url()).searchParams.get("region_reference")).toBe(regionIds[1]);

      await comp.locator("[data-clear-selected-regions]").click();
      await expect(summary).toContainText("0/5");
      await expect.poll(() => {
        const u = new URL(page.url());
        return {
          hasRegions: u.searchParams.has("regions"),
          hasRef: u.searchParams.has("region_reference"),
          country: u.searchParams.get("country"),
          layer: u.searchParams.get("layer"),
        };
      }).toEqual({ hasRegions: false, hasRef: false, country: "hungary", layer: "regional_gdp_per_capita" });

      // Actual map-to-regional-development workspace transition, reload, and browser history return
      await r0.click();
      await r1.click();
      const wsLink = page.locator(`nav a[href*="${prefix}/workspaces/regional_development/"]`);
      await wsLink.click();
      await expect(page).toHaveURL((url) =>
        url.pathname === `${prefix}/workspaces/regional_development/` &&
        url.searchParams.get("countries") === "hungary" &&
        url.searchParams.get("map_layer") === "regional_gdp_per_capita" &&
        (url.searchParams.get("map_regions") ?? "").includes(regionIds[0]) &&
        url.searchParams.get("from") === "2024",
      );
      await page.reload({ waitUntil: "networkidle" });
      expect(new URL(page.url()).searchParams.get("map_layer")).toBe("regional_gdp_per_capita");

      await page.goBack({ waitUntil: "networkidle" });
      await expect(page).toHaveURL(new RegExp(`${prefix}/map/`));

      // Boundary-only layer exposes localized boundary description
      await page.locator(".spatial-control-rail select").nth(1).selectOption("regional_boundary");
      await expect(svg.locator(`path[data-region-id="${regionIds[0]}"]`)).toHaveAttribute("aria-label", en ? /boundary only/ : /仅边界/);

      // Dark-mode surface contrast + axe compliance (deterministic CSS readiness polling)
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

    test(`thematic unavailable-case recovery, filter independence, all four themes, and tablet widths (${en ? "en" : "zh"})`, async ({ page }, info) => {
      if (info.project.name === "desktop-1440") {
        for (const width of [1024, 768] as const) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${prefix}/map/?country=serbia`, { waitUntil: "networkidle" });
          await expect(page.locator("[data-active-spatial-summary]")).toContainText("NSTJ");
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        }
        await page.setViewportSize({ width: 1440, height: 900 });
      }

      // Unavailable case deep link shows status warning AND allows dismissal while preserving country filter
      await page.goto(`${prefix}/workspaces/industrial_policy_strategic_investment/?country=hungary&case=nonexistent-case`, { waitUntil: "networkidle" });
      const ws = page.locator('[data-thematic-workspace="industrial_policy_strategic_investment"]');
      await expect(ws.getByRole("status")).toBeVisible();
      await expect(ws.locator("[data-clear-thematic-case]")).toBeVisible();
      await ws.locator("[data-clear-thematic-case]").click();
      await expect(ws.locator("[data-clear-thematic-case]")).toHaveCount(0);
      await expect(ws.getByRole("checkbox", { name: en ? "Hungary" : "匈牙利", exact: true })).toBeChecked();
      await expect.poll(() => new URL(page.url()).searchParams.has("case")).toBe(false);
      await page.reload({ waitUntil: "networkidle" });
      await expect(ws.getByRole("checkbox", { name: en ? "Hungary" : "匈牙利", exact: true })).toBeChecked();

      // Clear country filter restores all countries
      await ws.locator("[data-clear-thematic-countries]").click();
      await expect(ws.locator("[data-clear-thematic-countries]")).toHaveCount(0);
      await expect.poll(() => new URL(page.url()).searchParams.has("country")).toBe(false);

      // Verify accurate scope summary across all four thematic workspaces
      for (const themeId of [
        "industrial_policy_strategic_investment",
        "fdi_production_networks",
        "energy_dependency_transition",
        "eu_funding_development",
      ] as const) {
        await page.goto(`${prefix}/workspaces/${themeId}/`, { waitUntil: "networkidle" });
        const root = page.locator(`[data-thematic-workspace="${themeId}"]`);
        const caseCount = await root.locator("section button.card").count();
        const scopeText = await root.locator("[data-thematic-scope-summary]").innerText();
        if (en) {
          expect(scopeText).toContain(`${caseCount} ${caseCount === 1 ? "published case" : "published cases"}`);
        } else {
          expect(scopeText).toContain(`${caseCount} 个已发布案例`);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    });
  }
});
