import { defineConfig, devices } from "@playwright/test";

// UI tests against the static export (run `pnpm build:site` first). Two viewports per route: 1440 desktop, 390 mobile.
// Screenshots are compared per platform (baselines live in tests/ui/__screenshots__/<platform>/<project>/).
export default defineConfig({
  testDir: "tests/ui",
  outputDir: "test-results",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]] : [["list"]],
  snapshotPathTemplate: "{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", caret: "hide" } },
  use: { baseURL: "http://127.0.0.1:4310", colorScheme: "light", locale: "zh-CN", timezoneId: "Europe/Budapest" },
  projects: [
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile-390", use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: "node scripts/serve-out.mjs 4310", url: "http://127.0.0.1:4310/", reuseExistingServer: !process.env.CI, timeout: 30_000 },
});
