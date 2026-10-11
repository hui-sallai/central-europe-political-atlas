import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Dark theme: the same eight routes must have no serious or critical axe violations (incl. colour contrast) and must
// actually resolve to the dark theme before any interaction.
const ROUTES = ["/", "/countries/", "/countries/poland/", "/data/", "/map/", "/models/", "/news/", "/methodology/"];

test.use({ colorScheme: "dark" });

for (const route of ROUTES) {
  test(`${route} — dark theme accessibility`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });
    // Theme is applied during hydration; wait for the same required state instead of sampling it once.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking.map((v) => `${v.impact}: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}
