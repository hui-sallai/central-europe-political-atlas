import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Eight main routes × two viewports (projects in playwright.config.ts):
//  - visual comparison of the first viewport against the committed baseline for this platform;
//  - axe (WCAG 2.x A/AA): no serious or critical violations;
//  - exactly one canonical link pointing at the route itself.
// Baseline policy (frozen): a mismatch fails and a MISSING baseline also fails. Baselines are only created or refreshed
// deliberately — locally with `pnpm test:ui:update`, or in CI with the "record-ui-baselines" workflow_dispatch mode, which
// uploads the recorded files as an artifact to review and commit (that mode never deploys).
const ROUTES = ["/", "/countries/", "/countries/poland/", "/data/", "/map/", "/models/", "/news/", "/methodology/"];
const CANONICAL_BASE = "https://hy-central-europe-analysis.org";

for (const route of ROUTES) {
  test(`${route} — visual, accessibility, canonical`, async ({ page }, testInfo) => {
    await page.goto(route, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });

    const name = `${route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "-")}.png`;
    const baseline = testInfo.snapshotPath(name);
    if (!fs.existsSync(baseline) && testInfo.config.updateSnapshots === "none") {
      throw new Error(`Missing screenshot baseline ${baseline}. New or changed routes need a deliberate baseline: run \`pnpm test:ui:update\` (or the record-ui-baselines CI mode for Linux) and commit the reviewed files.`);
    }
    await expect(page).toHaveScreenshot(name);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.impact}: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);

    const canonicals = await page.locator('link[rel="canonical"]').evaluateAll((links) => links.map((l) => l.getAttribute("href")));
    expect(canonicals).toEqual([`${CANONICAL_BASE}${route}`]);
  });
}
