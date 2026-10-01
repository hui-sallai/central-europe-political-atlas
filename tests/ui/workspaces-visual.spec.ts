import fs from "node:fs";
import { test, expect } from "@playwright/test";
for (const locale of ["zh-CN", "en"] as const) for (const id of ["", "regional_development"]) test(`workspace visual: ${locale} ${id || "index"}`, async ({ page }, info) => {
  await page.goto(`${locale === "en" ? "/en" : ""}/workspaces/${id ? `${id}/` : ""}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
    const name = `workspace-${locale}-${id || "index"}-${scheme}.png`;
    if (!fs.existsSync(info.snapshotPath(name)) && info.config.updateSnapshots === "none") throw new Error(`Missing workspace baseline: ${name}; record deliberately and review.`);
    await expect(page).toHaveScreenshot(name, { fullPage: true });
  }
});
