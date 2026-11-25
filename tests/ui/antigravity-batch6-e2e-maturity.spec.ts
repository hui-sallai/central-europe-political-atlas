import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { activeNotebookRaw } from "./notebook-storage";
import { parseNotebook } from "../../src/lib/researchNotebook";

async function measureLayoutShiftSum(page: Page, url: string, readySelector: string) {
  await page.addInitScript(() => {
    const w = window as unknown as { __clsSum: number; __clsSupported: boolean };
    w.__clsSum = 0;
    w.__clsSupported =
      typeof PerformanceObserver !== "undefined" &&
      Array.isArray(PerformanceObserver.supportedEntryTypes) &&
      PerformanceObserver.supportedEntryTypes.includes("layout-shift");
    if (w.__clsSupported) {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
          if (!e.hadRecentInput && typeof e.value === "number") {
            w.__clsSum += e.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    }
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await expect(page.locator(readySelector).first()).toBeVisible();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return page.evaluate(() => {
    const w = window as unknown as { __clsSum: number; __clsSupported: boolean };
    return { supported: w.__clsSupported, sum: w.__clsSum };
  });
}

test.describe("Batch 6 — Lazy-loading regression matrix (Cases A–J)", () => {
  test("Cases A, B, C, G, H: annual, ordinary monthly, first & repeated macro selection, and Serbia SORS", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Full network matrix runs under desktop-1440");
    let macroFetches = 0;
    let historyFetches = 0;
    page.on("request", (req) => {
      if (req.url().includes("macro_driver_runtime.json")) macroFetches += 1;
      if (req.url().includes("monthly_history_runtime.json")) historyFetches += 1;
    });

    // Case A: Initial annual load — zero deferred fetches
    await page.goto("/en/data/?compare_countries=poland,hungary&compare_frequency=annual&comparison_indicator=annual:real_gdp_growth", { waitUntil: "networkidle" });
    const ws = page.locator("[data-national-comparison]");
    await expect(ws).toBeVisible();
    await expect(ws).toHaveAttribute("data-macro-load-status", "idle");
    await expect(ws.locator("[data-comparison-value]").first()).not.toHaveText("—");
    expect(macroFetches).toBe(0);
    expect(historyFetches).toBe(0);

    // Case B: Ordinary monthly indicator — observations & sources unchanged without deferred files
    await ws.getByLabel("Frequency", { exact: true }).selectOption("monthly");
    await ws.getByLabel("Indicator", { exact: true }).selectOption("monthly:hicp_annual_rate");
    await expect(ws.locator("[data-comparison-value]").first()).not.toHaveText("—");
    await expect(ws).toHaveAttribute("data-macro-load-status", "idle");
    expect(macroFetches).toBe(0);
    expect(historyFetches).toBe(0);

    // Case H: Serbia SORS quarterly series — loads from serbia_sors_runtime.json without deferred macro fetches
    await ws.getByLabel("Frequency", { exact: true }).selectOption("quarterly");
    await ws.getByLabel("Indicator", { exact: true }).selectOption("sors:lfs_unemployment_quarterly");
    await expect(ws).toHaveAttribute("data-macro-load-status", "idle");
    expect(macroFetches).toBe(0);
    expect(historyFetches).toBe(0);

    // Case C: First macro selection triggers on-demand load and populates actual observations
    await ws.getByLabel("Frequency", { exact: true }).selectOption("monthly");
    const indicatorSelect = ws.getByLabel("Indicator", { exact: true });
    const macroOptions = await indicatorSelect.locator("option").evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value).filter((v) => v.startsWith("macro:")),
    );
    expect(macroOptions.length).toBeGreaterThanOrEqual(2);

    const macroRes = page.waitForResponse((res) => res.url().includes("macro_driver_runtime.json") && res.status() === 200);
    const historyRes = page.waitForResponse((res) => res.url().includes("monthly_history_runtime.json") && res.status() === 200);
    await indicatorSelect.selectOption(macroOptions[0]);
    await Promise.all([macroRes, historyRes]);

    await expect(ws).toHaveAttribute("data-macro-load-status", "loaded");
    await expect(ws.locator("[data-comparison-records] summary")).not.toContainText("· 0");
    expect(macroFetches).toBe(1);
    expect(historyFetches).toBe(1);

    // Case G: Repeated macro selection (second macro indicator + annual -> macro roundtrip) triggers zero duplicate fetches
    await indicatorSelect.selectOption(macroOptions[1]);
    await expect(ws).toHaveAttribute("data-macro-load-status", "loaded");
    await ws.getByLabel("Frequency", { exact: true }).selectOption("annual");
    await ws.getByLabel("Frequency", { exact: true }).selectOption("monthly");
    await indicatorSelect.selectOption(macroOptions[0]);
    await expect(ws).toHaveAttribute("data-macro-load-status", "loaded");
    expect(macroFetches).toBe(1);
    expect(historyFetches).toBe(1);
  });

  test("Cases D & J: direct macro deep link (level & transformation), reload, and EN/ZH language switch", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Deep-link matrix runs under desktop-1440");
    await page.goto(
      "/en/data/?compare_countries=poland,hungary&compare_frequency=monthly&comparison_indicator=macro:policy_rate:monthly_change_bp",
      { waitUntil: "networkidle" },
    );
    const ws = page.locator("[data-national-comparison]");
    await expect(ws).toHaveAttribute("data-macro-load-status", "loaded");
    await expect(ws.locator("[data-active-research-summary]")).toContainText("policy_rate");
    await expect(ws.locator("[data-comparison-records] summary")).not.toContainText("· 0");

    // Reload preserves state and observations
    await page.reload({ waitUntil: "networkidle" });
    await expect(ws).toHaveAttribute("data-macro-load-status", "loaded");
    await expect(ws.locator("[data-active-research-summary]")).toContainText("policy_rate");

    // Direct level deep link in ZH
    await page.goto(
      "/data/?compare_countries=poland,hungary&compare_frequency=monthly&comparison_indicator=macro:policy_rate",
      { waitUntil: "networkidle" },
    );
    await expect(ws).toHaveAttribute("data-macro-load-status", "loaded");
    await expect(ws.locator("[data-comparison-records] summary")).not.toContainText("· 0");
  });

  test("Case E: rapid switching (annual -> macro -> annual -> macro) handles cancellation cleanly", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Rapid-switch cancellation test runs under desktop-1440");
    let holdFirst = true;
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    await page.route("**/research-data/macro_driver_runtime.json", async (route) => {
      if (holdFirst) {
        holdFirst = false;
        await firstGate;
      }
      await route.continue();
    });

    await page.goto("/en/data/?compare_countries=poland,hungary", { waitUntil: "networkidle" });
    const ws = page.locator("[data-national-comparison]");
    const freqSelect = ws.getByLabel("Frequency", { exact: true });
    const indSelect = ws.getByLabel("Indicator", { exact: true });

    // annual -> macro (starts slow fetch)
    await freqSelect.selectOption("monthly");
    await indSelect.selectOption("macro:policy_rate");
    await expect(ws).toHaveAttribute("data-macro-load-status", "loading");
    await expect(ws.locator("[data-summary-available-span]")).toContainText("Loading observations");

    // macro -> annual while fetch is still in flight (aborts first fetch)
    await freqSelect.selectOption("annual");
    releaseFirst();

    // annual -> macro again: must recover cleanly and load observations
    await freqSelect.selectOption("monthly");
    await indSelect.selectOption("macro:policy_rate");
    await expect(ws).toHaveAttribute("data-macro-load-status", "loaded");
    await expect(ws.locator("[data-comparison-records] summary")).not.toContainText("· 0");
  });

  test("Case F: independent failure simulation for macro_driver_runtime.json and monthly_history_runtime.json + retry recovery", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Failure simulation runs under desktop-1440");

    // F1: macro_driver_runtime.json fails while monthly_history_runtime.json succeeds
    let failMacro = true;
    await page.route("**/research-data/macro_driver_runtime.json", async (route) => {
      if (failMacro) return route.abort("failed");
      return route.continue();
    });

    await page.goto("/en/data/?compare_countries=poland,hungary&compare_frequency=monthly&comparison_indicator=macro:policy_rate", { waitUntil: "networkidle" });
    const ws = page.locator("[data-national-comparison]");
    await expect(ws).toHaveAttribute("data-macro-load-status", "partial");
    await expect(ws.locator("[data-load-failures]")).toHaveAttribute("data-load-failures", /macro_driver_runtime\.json/);

    // Retry recovers cleanly to loaded
    failMacro = false;
    await ws.locator("[data-retry-macro-load]").click();
    await expect(ws).toHaveAttribute("data-macro-load-status", "loaded");
    await expect(ws.locator("[data-load-failures]")).toHaveCount(0);

    // F2: monthly_history_runtime.json fails independently while macro_driver_runtime.json succeeds
    await page.unroute("**/research-data/macro_driver_runtime.json");
    await page.route("**/research-data/monthly_history_runtime.json", (route) => route.abort("failed"));
    await page.goto("/en/data/?compare_countries=poland,hungary&compare_frequency=monthly&comparison_indicator=macro:policy_rate", { waitUntil: "networkidle" });
    await expect(ws).toHaveAttribute("data-macro-load-status", "partial");
    await expect(ws.locator("[data-load-failures]")).toHaveAttribute("data-load-failures", /monthly_history_runtime\.json/);
    await expect(ws.locator("[data-comparison-records] summary")).not.toContainText("· 0");

    // F3: Both deferred files fail -> status 'failed', summary distinguishes load failure from official absence
    await page.route("**/research-data/macro_driver_runtime.json", (route) => route.abort("failed"));
    await page.goto("/en/data/?compare_countries=poland,hungary&compare_frequency=monthly&comparison_indicator=macro:policy_rate", { waitUntil: "networkidle" });
    await expect(ws).toHaveAttribute("data-macro-load-status", "failed");
    await expect(ws.locator("[data-summary-available-span]")).toContainText("Source load failed");
  });

  test("Case I: /models/?tab=compare also defers macro runtime files until macro selection", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Models comparison tab check runs under desktop-1440");
    let macroFetches = 0;
    page.on("request", (req) => {
      if (req.url().includes("macro_driver_runtime.json")) macroFetches += 1;
    });

    await page.goto("/en/models/?tab=compare", { waitUntil: "networkidle" });
    const ws = page.locator("[data-national-comparison]");
    await expect(ws).toBeVisible();
    await expect(ws).toHaveAttribute("data-macro-load-status", "idle");
    expect(macroFetches).toBe(0);

    await ws.getByLabel("Frequency", { exact: true }).selectOption("monthly");
    await ws.getByLabel("Indicator", { exact: true }).selectOption("macro:policy_rate");
    await expect(ws).toHaveAttribute("data-macro-load-status", "loaded");
    expect(macroFetches).toBe(1);
  });
});

test.describe("Batch 6 — /models/ laboratory layout-shift stability", () => {
  for (const [label, url, readySelector] of [
    ["EN default run view", "/en/models/", '[role="tablist"]'],
    ["ZH default run view", "/models/", '[role="tablist"]'],
    ["EN comparison view", "/en/models/?tab=compare", "[data-national-comparison]"],
    ["EN composite model deep link", "/en/models/?tab=run&skill=composite_indicators&model=fiscal_pressure&country=poland&model_year=2025", "[data-transparent-research]"],
  ] as const) {
    test(`Laboratory layout-shift sum < 0.02 on ${label}`, async ({ page }) => {
      const result = await measureLayoutShiftSum(page, url, readySelector);
      expect(result.supported).toBe(true);
      expect(result.sum).toBeLessThan(0.02);
    });
  }
});

for (const prefix of ["/en", ""]) {
  const en = prefix === "/en";
  const lang = en ? "EN" : "ZH";

  test.describe(`Batch 6 — End-to-end research journeys (${lang})`, () => {
    test(`Journey A (${lang}): Political Research — Germany early elections + Hungary 1998 composite ballot -> Notebook -> restore`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop-1440", "Journey A runs under desktop-1440");

      await page.goto(`${prefix}/`, { waitUntil: "networkidle" });
      await page.goto(`${prefix}/countries/germany/`, { waitUntil: "networkidle" });
      await expect(page.locator('[data-country-election-history="germany"]')).toBeVisible();

      // Registered German early historical elections (1990 & 1994)
      await page.goto(`${prefix}/politics/germany/?election=el-de-bt-1990-12-02&vote_type=second_vote`, { waitUntil: "networkidle" });
      await expect(page.locator("[data-selected-election]")).toHaveValue("el-de-bt-1990-12-02");
      await expect(page.locator("[data-german-threshold-areas]")).toContainText("37,426,103");
      await page.locator("[data-selected-election]").selectOption("el-de-bt-1994-10-16");
      await expect(page.locator("[data-german-overhang]")).toContainText("672");

      // Registered Hungary 1998 parliamentary election (el-hu-ogy-1998-05-10)
      await page.goto(`${prefix}/politics/hungary/?election=el-hu-ogy-1998-05-10`, { waitUntil: "networkidle" });
      await expect(page.locator("[data-selected-vote-type]")).toHaveValue("hu98_territorial_list_valid_round_vote");
      await expect(page.locator("[data-composite-scope]")).toContainText("1998-05-10 – 1998-05-24");
      await expect(page.locator("[data-composite-summary]")).toContainText("4,547,682");

      // Collect Hungary 1998 into Notebook and verify restoration link
      await page.locator("[data-selected-election-collect] [data-notebook-add]").click();
      await expect.poll(async () => JSON.parse((await activeNotebookRaw(page)) ?? "{}").items?.length ?? 0).toBe(1);
      await page.goto(`${prefix}/notebook/`, { waitUntil: "networkidle" });
      const reopenLink = page.locator("[data-notebook-item] a").first();
      const href = await reopenLink.getAttribute("href");
      expect(href).toContain("el-hu-ogy-1998-05-10");
    });

    test(`Journey B (${lang}): Economic Research — Country Hub -> Data Explorer -> CSV/Snapshot + Notebook -> restore`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop-1440", "Journey B runs under desktop-1440");

      await page.goto(`${prefix}/countries/germany/?indicator=government_debt_gdp&compare=poland`, { waitUntil: "networkidle" });
      await page.locator("[data-sources-selected-handoff]").click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/data/.*comparison_indicator=annual%3Agovernment_debt_gdp`));

      const ws = page.locator("[data-national-comparison]");
      await expect(ws.locator("[data-active-research-summary]")).toContainText("government_debt_gdp");
      await ws.getByLabel(en ? "From period" : "起始时期", { exact: true }).fill("2015");

      // Verify CSV download
      const [csvDownload] = await Promise.all([
        page.waitForEvent("download"),
        ws.getByRole("button", { name: en ? "Export actual observations (CSV)" : "导出实际观测（CSV）", exact: true }).click(),
      ]);
      const csvText = fs.readFileSync((await csvDownload.path())!, "utf8");
      expect(csvText).toContain('"country","period","value"');

      // Collect into Notebook and verify restored context
      await ws.locator("[data-notebook-add]").click();
      await expect.poll(async () => JSON.parse((await activeNotebookRaw(page)) ?? "{}").items?.length ?? 0).toBe(1);
      await page.goto(`${prefix}/notebook/`, { waitUntil: "networkidle" });
      await expect(page.locator('[data-notebook-item="country_comparison"]')).toHaveCount(1);
    });

    test(`Journey C (${lang}): Spatial Research — Country Hub -> Map -> Region selection -> Regional Development Workspace`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop-1440", "Journey C runs under desktop-1440");

      await page.goto(`${prefix}/countries/hungary/`, { waitUntil: "networkidle" });
      await page.locator(`#regions a[href="${prefix}/map/?country=hungary"]`).click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/map/\\?country=hungary`));

      const svg = page.locator('svg[data-map-export="hungary"]');
      await expect(svg.locator('path[role="button"]').first()).toBeVisible();
      await svg.locator('path[role="button"]').first().click();
      await expect(page.locator("[data-active-spatial-summary]")).toBeVisible();

      await page.locator(`nav a[href*="${prefix}/workspaces/regional_development/"]`).click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/workspaces/regional_development/.*countries=hungary`));
      await expect(page.locator("h1")).toBeVisible();
    });

    test(`Journey D (${lang}): Thematic Research — Workspaces -> Industrial Policy -> Country Filter -> Case -> Continuation`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop-1440", "Journey D runs under desktop-1440");

      await page.goto(`${prefix}/workspaces/`, { waitUntil: "networkidle" });
      await page.locator(`a[href="${prefix}/workspaces/industrial_policy_strategic_investment/"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/workspaces/industrial_policy_strategic_investment/`));

      const themeRoot = page.locator('[data-thematic-workspace="industrial_policy_strategic_investment"]');
      await themeRoot.getByRole("checkbox", { name: en ? "Hungary" : "匈牙利", exact: true }).check();
      await themeRoot.locator("section button.card").first().click();
      await expect(themeRoot.locator("[data-clear-thematic-case]")).toBeVisible();
      await expect(themeRoot.locator("article a").first()).toBeVisible();
    });

    test(`Journey E (${lang}): Quantitative Research — Supported model run + prohibited VAR/IRF restriction check`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop-1440", "Journey E runs under desktop-1440");

      await page.goto(`${prefix}/models/?tab=run&skill=composite_indicators&model=fiscal_pressure&country=poland&model_year=2025`, { waitUntil: "networkidle" });
      // Verify prohibited VAR dynamic response / IRF restriction notice remains intact
      await expect(page.locator("main > header")).toContainText(en ? /VAR dynamic responses and IRFs remain blocked/i : /正式 VAR 动态响应与 IRF 仍禁止发布/);

      // Verify supported transparent composite model runs and reports score
      const panel = page.locator('[data-transparent-research="fiscal_pressure"]');
      await expect(panel.locator("[data-rule-score]")).toContainText("61.3");
    });

    test(`Journey F (${lang}): Research Notebook — multi-module collection, isolated project creation/switching, backup & restore`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop-1440", "Journey F runs under desktop-1440");

      // Collect from Political Archive + Economic Data Explorer
      await page.goto(`${prefix}/politics/hungary/?election=el-hu-ogy-1998-05-10`, { waitUntil: "networkidle" });
      await page.locator("[data-selected-election-collect] [data-notebook-add]").click();
      await expect.poll(async () => JSON.parse((await activeNotebookRaw(page)) ?? "{}").items?.length ?? 0).toBe(1);

      await page.goto(`${prefix}/data/?compare_countries=poland,hungary&compare_frequency=annual&comparison_indicator=annual:real_gdp_growth`, { waitUntil: "networkidle" });
      await page.locator("[data-national-comparison] [data-notebook-add]").click();
      await expect.poll(async () => JSON.parse((await activeNotebookRaw(page)) ?? "{}").items?.length ?? 0).toBe(2);

      // Open Notebook, verify 2 multi-module items
      await page.goto(`${prefix}/notebook/`, { waitUntil: "networkidle" });
      await expect(page.locator("[data-notebook-item]")).toHaveCount(2);

      // Export JSON backup of Project 1
      const [backupDownload] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: en ? "Download active notebook JSON backup" : "下载当前笔记 JSON 备份", exact: true }).click(),
      ]);
      const backupRaw = fs.readFileSync((await backupDownload.path())!, "utf8");
      const parsedBackup = parseNotebook(backupRaw);
      expect(parsedBackup.items).toHaveLength(2);

      // Create isolated Project 2 and verify isolation (0 items)
      await page.getByLabel(en ? "New project title" : "新项目标题", { exact: true }).fill("Batch 6 Isolated Project");
      await page.getByRole("button", { name: en ? "Create project" : "创建项目", exact: true }).click();
      await expect(page.locator("[data-active-project]")).toContainText("Batch 6 Isolated Project");
      await expect(page.locator("[data-notebook-item]")).toHaveCount(0);

      // Import backup JSON as restored project and verify 2 items return
      await page.getByLabel(en ? "Import notebook JSON" : "导入研究笔记 JSON", { exact: true }).setInputFiles({
        name: "batch6-backup.json",
        mimeType: "application/json",
        buffer: Buffer.from(backupRaw),
      });
      await expect(page.locator("[data-notebook-item]")).toHaveCount(2);
    });
  });
}
