import { test, expect } from "@playwright/test";
import { activeNotebookRaw } from "./notebook-storage";

test.describe("Antigravity Batch 6 platform maturity, performance, and 6-journey E2E integration", () => {
  test("Performance: /en/data/ defers 7.3MB macro_driver_runtime.json until a macro driver is selected", async ({ page }) => {
    const requestedUrls: string[] = [];
    page.on("request", (req) => requestedUrls.push(req.url()));

    await page.goto("/en/data/", { waitUntil: "networkidle" });
    await expect(page.locator("[data-national-comparison]")).toBeVisible();
    expect(requestedUrls.some((u) => u.includes("macro_driver_runtime.json"))).toBe(false);
    expect(requestedUrls.some((u) => u.includes("monthly_history_runtime.json"))).toBe(false);

    // Macro drivers remain discoverable via macro_driver_dictionary.json and load on demand when selected
    const ws = page.locator("[data-national-comparison]");
    await ws.getByLabel("Frequency", { exact: true }).selectOption("monthly");
    const indicatorSelect = ws.getByLabel("Indicator", { exact: true });
    const macroOpt = await indicatorSelect.locator("option").evaluateAll((opts) =>
      opts.find((o) => (o as HTMLOptionElement).value.startsWith("macro:"))?.getAttribute("value") ?? "",
    );
    expect(macroOpt).toMatch(/^macro:/);

    const macroReqPromise = page.waitForResponse((res) => res.url().includes("macro_driver_runtime.json") && res.status() === 200);
    await indicatorSelect.selectOption(macroOpt);
    await macroReqPromise;
    await expect(ws.locator("[data-active-research-summary]")).toContainText("Monthly");
  });

  test("Performance: /en/models/ eliminates hydration CLS below 0.02", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
          if (!e.hadRecentInput && typeof e.value === "number") {
            (window as unknown as { __cls: number }).__cls += e.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/en/models/", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toBeVisible();
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThan(0.02);
  });

  test("Journeys A–F: end-to-end Political, Economic, Spatial, Thematic, Quantitative, and Notebook workflow", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Full 6-journey integration runs under desktop-1440");

    // JOURNEY A — Political Research: Home -> Germany Country Hub -> Parliamentary Archive (Germany & Hungary 1998)
    await page.goto("/en/", { waitUntil: "networkidle" });
    await page.goto("/en/countries/germany/", { waitUntil: "networkidle" });
    await expect(page.locator('[data-country-election-history="germany"]')).toBeVisible();
    await page.locator('[data-country-election-history="germany"] a').first().click();
    await expect(page).toHaveURL(/\/en\/politics\/germany\//);
    await expect(page.locator("h1")).toBeVisible();

    await page.goto("/en/politics/hungary/?election=hu-1998-ogy", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toBeVisible();

    // JOURNEY B — Economic Research: Country Hub -> indicator handoff -> Data Explorer -> Notebook collection
    await page.goto("/en/countries/germany/?indicator=government_debt_gdp&compare=poland", { waitUntil: "networkidle" });
    await page.locator("[data-sources-selected-handoff]").click();
    await expect(page).toHaveURL(/\/en\/data\/.*comparison_indicator=annual%3Agovernment_debt_gdp/);
    const ws = page.locator("[data-national-comparison]");
    await expect(ws.locator("[data-active-research-summary]")).toContainText("government_debt_gdp");
    await ws.locator("[data-notebook-add]").click();
    await expect.poll(async () => JSON.parse((await activeNotebookRaw(page)) ?? "{}").items?.length ?? 0).toBe(1);

    // JOURNEY C — Spatial Research: Country Hub -> Map -> Region selection -> Regional Development Workspace
    await page.goto("/en/countries/hungary/", { waitUntil: "networkidle" });
    await page.locator('#regions a[href="/en/map/?country=hungary"]').click();
    await expect(page).toHaveURL(/\/en\/map\/\?country=hungary/);
    const svg = page.locator('svg[data-map-export="hungary"]');
    await expect(svg.locator('path[role="button"]').first()).toBeVisible();
    await svg.locator('path[role="button"]').first().click();
    await page.locator('nav a[href*="/en/workspaces/regional_development/"]').click();
    await expect(page).toHaveURL(/\/en\/workspaces\/regional_development\/.*countries=hungary/);
    await expect(page.locator("h1")).toBeVisible();

    // JOURNEY D — Thematic Research: Workspaces -> Industrial Policy -> Country Filter -> Case
    await page.goto("/en/workspaces/", { waitUntil: "networkidle" });
    await page.locator('a[href="/en/workspaces/industrial_policy_strategic_investment/"]').first().click();
    await expect(page).toHaveURL(/\/en\/workspaces\/industrial_policy_strategic_investment\//);
    const themeRoot = page.locator('[data-thematic-workspace="industrial_policy_strategic_investment"]');
    await themeRoot.getByRole("checkbox", { name: "Hungary", exact: true }).check();
    await themeRoot.locator("section button.card").first().click();
    await expect(themeRoot.locator("[data-clear-thematic-case]")).toBeVisible();

    // JOURNEY E — Quantitative Research: Models workbench availability & limitations
    await page.goto("/en/models/", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText(/VAR|Local Projections|composite/i);

    // JOURNEY F — Research Notebook: verify collected evidence persists and renders cleanly
    await page.goto("/en/notebook/", { waitUntil: "networkidle" });
    await expect(page.locator("[data-notebook-page]")).toBeVisible();
    await expect(page.locator('[data-notebook-item="country_comparison"]')).toHaveCount(1);
    await expect(page.locator("main")).toContainText("1 evidence item");
  });
});
