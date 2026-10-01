import fs from "node:fs";
import { expect, test } from "@playwright/test";

// New English baselines require the same deliberate update policy as Chinese ones.
// Never replace missing or mismatching baselines during normal test runs.
for (const route of ["/", "/data/", "/map/", "/countries/hungary/", "/models/", "/methodology/"]) {
  test(`English visual baseline: ${route}`, async ({ page }, testInfo) => {
    await page.goto(`/en${route}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await expect(page.locator("html")).toHaveAttribute("data-theme", colorScheme);
      const name = `en-${route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replaceAll("/", "-")}-${colorScheme}.png`;
      if (!fs.existsSync(testInfo.snapshotPath(name)) && testInfo.config.updateSnapshots === "none") throw new Error(`Missing English baseline: ${name}. Run pnpm test:ui:update deliberately and review the result.`);
      await expect(page).toHaveScreenshot(name);
    }
  });
}
