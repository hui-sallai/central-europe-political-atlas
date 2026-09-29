import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Eight main routes × two viewports (projects in playwright.config.ts):
//  - visual comparison of the first viewport against the committed baseline for this platform;
//  - axe (WCAG 2.x A/AA): no serious or critical violations;
//  - exactly one canonical link pointing at the route itself.
// A platform without baselines yet (e.g. the first Linux CI run) records them instead of failing; the recorded files
// are uploaded as a CI artifact so they can be committed.
const ROUTES = ["/", "/countries/", "/countries/poland/", "/data/", "/map/", "/models/", "/news/", "/methodology/"];
const CANONICAL_BASE = "https://hy-central-europe-analysis.org";

for (const route of ROUTES) {
  test(`${route} — visual, accessibility, canonical`, async ({ page }, testInfo) => {
    await page.goto(route, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });

    const name = `${route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "-")}.png`;
    const baseline = testInfo.snapshotPath(name);
    if (fs.existsSync(baseline)) {
      await expect(page).toHaveScreenshot(name);
    } else {
      fs.mkdirSync(baseline.slice(0, baseline.lastIndexOf("/")), { recursive: true });
      await page.screenshot({ path: baseline, animations: "disabled", caret: "hide", scale: "css" });
      testInfo.annotations.push({ type: "baseline-recorded", description: baseline });
    }

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.impact}: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);

    const canonicals = await page.locator('link[rel="canonical"]').evaluateAll((links) => links.map((l) => l.getAttribute("href")));
    expect(canonicals).toEqual([`${CANONICAL_BASE}${route}`]);
  });
}
