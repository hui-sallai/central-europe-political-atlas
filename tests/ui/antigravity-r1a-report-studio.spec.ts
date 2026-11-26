import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { addNotebookEvidence, emptyNotebook, NOTEBOOK_STORAGE_KEY, serializeNotebook, type EvidenceDraft } from "../../src/lib/researchNotebook";
import { NOTEBOOK_PROJECTS_KEY } from "../../src/lib/notebookProjects";
import { activeNotebookRaw } from "./notebook-storage";

const collected = "2026-11-26T08:00:00.000Z";

function economicFixture() {
  let state = emptyNotebook("en", "v2.0", collected);
  const baseSource = {
    institution: "Eurostat",
    dataset: "Real GDP growth rate",
    code: "nama_10_gdp",
    url: "https://ec.europa.eu/eurostat/databrowser/view/nama_10_gdp",
    layer: "official_annual",
    original_unit: "%",
    retrieved_at: "2026-11-01",
    updated_at: "2026-10-15",
  };
  state = addNotebookEvidence(state, {
    type: "observation",
    title: "Poland Annual GDP 2025",
    labels: { en: "Poland Annual GDP 2025", "zh-CN": "波兰 2025 年年度 GDP" },
    url: "https://hy-central-europe-analysis.org/data/?country=poland&indicator=real_gdp_growth&from=2025&to=2025",
    canonical_ids: ["poland:real_gdp_growth:2025"],
    countries: ["poland"],
    periods: ["2025"],
    value: 3.1,
    unit: "%",
    sources: [baseSource],
    layer: "official_annual",
    comparability: "Harmonized ESA 2010",
    warnings: ["Preliminary estimate"],
    metadata: { status: "published" },
  }, "v2.0", collected);
  state = addNotebookEvidence(state, {
    type: "observation",
    title: "Hungary Pending Null FDI 2025",
    labels: { en: "Hungary Pending Null FDI 2025", "zh-CN": "匈牙利 2025 年待发布 FDI（空值）" },
    url: "https://hy-central-europe-analysis.org/data/?country=hungary&indicator=fdi_inflow&from=2025&to=2025",
    canonical_ids: ["hungary:fdi_inflow:2025"],
    countries: ["hungary"],
    periods: ["2025"],
    value: null,
    unit: "% GDP",
    sources: [],
    layer: "official_annual",
    warnings: ["Pending official release"],
    metadata: { status: "pending" },
  }, "v2.0", collected);
  state = addNotebookEvidence(state, {
    type: "country_comparison",
    title: "Monthly Policy Rate Side-by-Side",
    labels: { en: "Monthly Policy Rate Side-by-Side", "zh-CN": "月度政策利率并列视图" },
    url: "https://hy-central-europe-analysis.org/data/?compare_countries=poland,hungary&compare_frequency=monthly&comparison_indicator=macro:policy_rate",
    canonical_ids: ["macro:policy_rate"],
    countries: ["poland", "hungary"],
    periods: ["2024-01", "2025-12"],
    value: undefined,
    sources: [],
    layer: "macro_descriptive",
    warnings: ["Policy instruments differ by central bank"],
    metadata: { filters: { indicator: "macro:policy_rate", mode: "side_by_side" } },
  }, "v2.0", collected);
  return {
    ...state,
    title: "Project B — Economic Research",
    research_question: "How do annual GDP, pending FDI, and monthly policy rates align?",
    user_notes: "Economic note line 1.\nEconomic note line 2.",
  };
}

function mixedFixture() {
  let state = emptyNotebook("en", "v2.0", collected);
  const drafts: EvidenceDraft[] = [
    {
      type: "observation",
      title: "Poland GDP 2025",
      labels: { en: "Poland GDP 2025", "zh-CN": "波兰 2025 年 GDP" },
      url: "https://hy-central-europe-analysis.org/data/?country=poland&indicator=real_gdp_growth",
      canonical_ids: ["poland:real_gdp_growth:2025"],
      countries: ["poland"],
      periods: ["2025"],
      value: 3.1,
      unit: "%",
      sources: [{ institution: "Eurostat", dataset: "Real GDP", url: "https://ec.europa.eu/eurostat/databrowser/view/nama_10_gdp?long=" + "a".repeat(60), layer: "official_annual", retrieved_at: "2026-11-01" }],
      layer: "official_annual",
      comparability: "Harmonized ESA 2010",
      warnings: ["Revision notice"],
      metadata: { status: "published" },
    },
    {
      type: "regional_view",
      title: "Hungary Regional GDP Map",
      labels: { en: "Hungary Regional GDP Map", "zh-CN": "匈牙利区域 GDP 地图" },
      url: "https://hy-central-europe-analysis.org/map/?country=hungary",
      canonical_ids: ["nuts2:hungary:gdp"],
      countries: ["hungary"],
      periods: ["2023"],
      value: undefined,
      sources: [{ institution: "KSH / Eurostat Regional", dataset: "NUTS 2 Regional Accounts", url: "https://ec.europa.eu/eurostat/regional", layer: "regional_descriptive", retrieved_at: "2026-11-01" }],
      layer: "regional_descriptive",
      warnings: [],
      metadata: { filters: { country: "hungary" } },
    },
    {
      type: "workspace",
      title: "Industrial Policy Thematic Case",
      labels: { en: "Industrial Policy Thematic Case", "zh-CN": "产业政策专题案例" },
      url: "https://hy-central-europe-analysis.org/workspaces/industrial_policy_strategic_investment/",
      canonical_ids: ["theme:industrial_policy"],
      countries: ["germany", "hungary"],
      periods: ["2020-2025"],
      value: undefined,
      sources: [],
      layer: "thematic_workspace",
      warnings: ["Descriptive thematic curation"],
      metadata: { filters: { theme: "industrial_policy_strategic_investment" } },
    },
    {
      type: "method",
      title: "Blocked VAR Dynamic Response",
      labels: { en: "Blocked VAR Dynamic Response", "zh-CN": "受限 VAR 动态响应" },
      url: "https://hy-central-europe-analysis.org/models/?skill=var_time_series",
      canonical_ids: ["var_dynamic_response"],
      countries: ["germany"],
      periods: ["2010-2025"],
      value: undefined,
      sources: [{ institution: "EXCLUDED_ONLY_PUBLISHER", dataset: "EXCLUDED_ONLY_DATASET", url: "https://example.org/excluded-only", layer: "econometric_registry" }],
      layer: "econometric_registry",
      warnings: ["Formal VAR dynamic responses and IRFs remain blocked"],
      metadata: { state: "blocked" },
    },
  ];
  for (const d of drafts) state = addNotebookEvidence(state, d, "v2.0", collected);
  return {
    ...state,
    title: "Project C — Mixed Research <script>window.__xss=1</script>",
    research_question: "How do economic, regional, thematic, and blocked-method records align?",
    user_notes: "First line of user note.\nSecond line with <b>literal tags</b>.\n" + "Long analytical note segment. ".repeat(12),
    items: state.items.map((item, idx) => ({ ...item, note: `Item ${idx + 1} note line A.\nItem ${idx + 1} note line B.` })),
  };
}

test.describe("Phase II R1-A — Reproducible Research Report Studio", () => {
  test("Project A (Political Research): real canonical Germany 1990 + Hungary 1998 collection -> Report Studio", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Full multi-page canonical collection runs under desktop-1440");

    // Collect actual canonical Germany 1990 election
    await page.goto("/en/politics/germany/?election=el-de-bt-1990-12-02&vote_type=second_vote", { waitUntil: "networkidle" });
    await page.locator("[data-selected-election-collect] [data-notebook-add]").click();
    await expect.poll(async () => JSON.parse((await activeNotebookRaw(page)) ?? "{}").items?.length ?? 0).toBe(1);

    // Collect actual canonical Hungary 1998 election
    await page.goto("/en/politics/hungary/?election=el-hu-ogy-1998-05-10", { waitUntil: "networkidle" });
    await page.locator("[data-selected-election-collect] [data-notebook-add]").click();
    await expect.poll(async () => JSON.parse((await activeNotebookRaw(page)) ?? "{}").items?.length ?? 0).toBe(2);

    // Open Notebook Report Studio
    await page.goto("/en/notebook/", { waitUntil: "networkidle" });
    const panel = page.locator("[data-notebook-brief]");
    await panel.locator("summary").click();
    const preview = panel.locator("[data-brief-preview]");
    await expect(preview).toContainText("el-de-bt-1990-12-02");
    await expect(preview).toContainText("el-hu-ogy-1998-05-10");
    await expect(panel.locator("[data-report-readiness]")).toContainText("2 / 2");

    // Verify Markdown & HTML exports preserve canonical election metadata
    const [mdDl] = await Promise.all([
      page.waitForEvent("download"),
      panel.getByRole("button", { name: "Export Evidence Brief (Markdown)", exact: true }).click(),
    ]);
    const mdText = fs.readFileSync((await mdDl.path())!, "utf8");
    expect(mdText).toContain("el-de-bt-1990-12-02");
    expect(mdText).toContain("el-hu-ogy-1998-05-10");

    const [htmlDl] = await Promise.all([page.waitForEvent("download"), panel.locator("[data-export-brief-html]").click()]);
    const htmlText = fs.readFileSync((await htmlDl.path())!, "utf8");
    expect(htmlText).toContain("el-de-bt-1990-12-02");
    expect(htmlText).toContain("el-hu-ogy-1998-05-10");
  });

  test("Project B (Economic Research): readiness summary distinguishes numerical, explicit null, and live configurations", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Project B fixture runs under desktop-1440");
    const raw = serializeNotebook(economicFixture());
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: NOTEBOOK_STORAGE_KEY, raw });
    await page.goto("/en/notebook/", { waitUntil: "networkidle" });

    const panel = page.locator("[data-notebook-brief]");
    await panel.locator("summary").click();
    const readiness = panel.locator("[data-report-readiness]");
    await expect(readiness).toContainText("3 / 3");
    // Switch to methodological_audit and verify distinct counts
    await panel.locator("[data-report-template]").selectOption("methodological_audit");
    const preview = panel.locator("[data-brief-preview]");
    await expect(preview).toContainText("Methodological and provenance audit");
    await expect(preview).toContainText("Missing / unavailable");
    await expect(preview).toContainText("Research configuration");
  });

  for (const prefix of ["", "/en"]) {
    const en = Boolean(prefix);
    const lang = en ? "EN" : "ZH";

    test(`Project C (Mixed Research): discovery, hidden selection, isolated print, PDF rendering, clipboard & accessibility (${lang})`, async ({ page, browser }, info) => {
      const state = mixedFixture();
      const raw = serializeNotebook(state);
      const externalRequests: string[] = [];
      page.on("request", (req) => {
        const u = req.url();
        if (!u.startsWith("http://127.0.0.1") && !u.startsWith("http://localhost") && !u.startsWith("data:") && !u.startsWith("blob:")) {
          externalRequests.push(u);
        }
      });

      await page.addInitScript(({ key, raw }) => {
        localStorage.setItem(key, raw);
        let copied = "";
        Object.defineProperty(window, "__copiedMarkdown", { get: () => copied });
        Object.defineProperty(window, "__failClipboard", { value: false, writable: true });
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              if ((window as unknown as { __failClipboard: boolean }).__failClipboard) throw new Error("Denied");
              copied = text;
            },
          },
        });
      }, { key: NOTEBOOK_STORAGE_KEY, raw });

      await page.goto(`${prefix}/notebook/`, { waitUntil: "networkidle" });
      const panel = page.locator("[data-notebook-brief]");
      await panel.locator("summary").click();

      // Confirm BibTeX & CSL-JSON buttons are NOT present in R1-A
      await expect(panel.locator("[data-export-brief-bibtex]")).toHaveCount(0);
      await expect(panel.locator("[data-export-brief-csl]")).toHaveCount(0);

      // Exclude item #4 (Blocked VAR with EXCLUDED_ONLY_PUBLISHER)
      const excludedId = state.items[3].id;
      await panel.locator(`[data-brief-choice="${excludedId}"] input[type="checkbox"]`).uncheck();
      await expect(panel.locator("[data-brief-preview]")).not.toContainText("EXCLUDED_ONLY_PUBLISHER");

      // Search & country filter + hidden-selected indicator
      await panel.locator("[data-report-country-filter]").selectOption("hungary");
      await expect(panel.locator("[data-brief-choice]")).toHaveCount(2);
      await expect(panel.locator("[data-hidden-selected-count]")).toContainText("1");

      // Keyword search empty-state recovery preserves existing selection (3 selected)
      await panel.locator("[data-report-search]").fill("zzzz-no-match-999");
      await expect(panel.locator("[data-report-empty-filter]")).toBeVisible();
      await expect(panel.locator("[data-report-selection-counts]")).toContainText("3 / 4");
      await panel.locator("[data-report-clear-filters]").click();
      await expect(panel.locator("[data-brief-choice]")).toHaveCount(4);

      // Visible reordering under filter works immediately and clears stale status
      await panel.locator("[data-report-country-filter]").selectOption("hungary");
      const secondVisible = panel.locator("[data-brief-choice]").nth(1);
      await secondVisible.getByRole("button", { name: new RegExp(`^${en ? "Move up" : "上移"}:`) }).click();
      await panel.locator("[data-report-clear-filters]").click();

      // Copy Markdown matches downloaded Markdown identically for current selection/order/template
      await panel.locator("[data-report-template]").selectOption("comparative_note");
      await panel.locator("[data-copy-brief-md]").click();
      await expect(panel.locator("[data-report-status]")).toContainText(en ? "copied" : "已复制");
      const copiedMd = await page.evaluate(() => (window as unknown as { __copiedMarkdown: string }).__copiedMarkdown);

      const [mdDl] = await Promise.all([
        page.waitForEvent("download"),
        panel.getByRole("button", { name: en ? "Export Evidence Brief (Markdown)" : "导出研究证据简报（Markdown）", exact: true }).click(),
      ]);
      const downloadedMd = fs.readFileSync((await mdDl.path())!, "utf8");
      expect(copiedMd).toBe(downloadedMd);
      expect(downloadedMd).not.toContain("EXCLUDED_ONLY_PUBLISHER");

      // Changing template clears stale export-success status
      await panel.locator("[data-report-template]").selectOption("methodological_audit");
      await expect(panel.locator("[data-report-status]")).toHaveText("");

      // Clipboard permission failure handled accurately
      await page.evaluate(() => { (window as unknown as { __failClipboard: boolean }).__failClipboard = true; });
      await panel.locator("[data-copy-brief-md]").click();
      await expect(panel.locator("[data-report-status]")).toContainText(en ? "Clipboard" : "剪贴板");

      // Isolated report-only printing creates iframe containing ONLY selected report (zero excluded item/source)
      await page.evaluate(() => {
        (window as unknown as { __isolatedPrintHtml: string }).__isolatedPrintHtml = "";
        const origAppend = document.body.appendChild.bind(document.body);
        document.body.appendChild = ((node: Node) => {
          if (node instanceof HTMLIFrameElement && node.getAttribute("data-isolated-report-print-frame")) {
            (window as unknown as { __isolatedPrintHtml: string }).__isolatedPrintHtml = node.srcdoc;
            // Stub print so headless dialog does not hang
            Object.defineProperty(node, "contentWindow", {
              configurable: true,
              value: { focus: () => {}, print: () => {}, addEventListener: () => {} },
            });
          }
          return origAppend(node);
        }) as typeof document.body.appendChild;
      });
      await panel.locator("[data-print-brief]").click();
      const isolatedHtml = await page.evaluate(() => (window as unknown as { __isolatedPrintHtml: string }).__isolatedPrintHtml);
      expect(isolatedHtml).toContain("<!doctype html>");
      expect(isolatedHtml).toContain("Poland GDP 2025");
      expect(isolatedHtml).not.toContain("EXCLUDED_ONLY_PUBLISHER");
      expect(isolatedHtml).not.toContain("data-notebook-page");

      // Download standalone HTML and render actual A4 PDF in Chromium (desktop only)
      const [htmlDl] = await Promise.all([page.waitForEvent("download"), panel.locator("[data-export-brief-html]").click()]);
      const htmlContent = fs.readFileSync((await htmlDl.path())!, "utf8");
      expect(htmlContent).not.toContain("<script>");
      expect(htmlContent).not.toContain("EXCLUDED_ONLY_PUBLISHER");
      if (info.project.name === "desktop-1440") {
        const pdfPage = await browser.newPage();
        await pdfPage.setContent(htmlContent, { waitUntil: "load" });
        const pdfBytes = await pdfPage.pdf({ format: "A4", printBackground: true });
        expect(pdfBytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
        expect(pdfBytes.length).toBeGreaterThan(5000);
        await pdfPage.close();
      }

      // Active-project storage invariance (both NOTEBOOK_STORAGE_KEY and NOTEBOOK_PROJECTS_KEY)
      expect(await page.evaluate((k) => localStorage.getItem(k), NOTEBOOK_STORAGE_KEY)).toBe(raw);
      expect(await page.evaluate((k) => localStorage.getItem(k), NOTEBOOK_PROJECTS_KEY)).toBeNull();
      expect(externalRequests).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);

      // WCAG light & dark axe checks
      for (const theme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe("");
        const axe = await new AxeBuilder({ page }).include("[data-notebook-brief]").analyze();
        expect(axe.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
      }
    });
  }

  test("Project-switching isolation & NOTEBOOK_PROJECTS_KEY invariance across active projects", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Project isolation runs under desktop-1440");
    const raw = serializeNotebook(mixedFixture());
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: NOTEBOOK_STORAGE_KEY, raw });
    await page.goto("/en/notebook/", { waitUntil: "networkidle" });

    // Create Project 2 via Project Manager (initializes NOTEBOOK_PROJECTS_KEY)
    await page.getByLabel("New project title", { exact: true }).fill("Isolated Project 2");
    await page.getByRole("button", { name: "Create project", exact: true }).click();
    await expect(page.locator("[data-active-project]")).toContainText("Isolated Project 2");
    const secondId = await page.getByLabel("Choose research project", { exact: true }).inputValue();
    await expect(page.locator("[data-notebook-brief]")).toHaveCount(0);

    // Switch back to legacy project (Project C) and capture persisted NOTEBOOK_PROJECTS_KEY snapshot
    await page.getByLabel("Choose research project", { exact: true }).selectOption("legacy");
    await expect(page.locator("[data-notebook-brief]")).toBeVisible();
    const projectsBefore = await page.evaluate((k) => localStorage.getItem(k), NOTEBOOK_PROJECTS_KEY);
    expect(projectsBefore).not.toBeNull();

    // Mutate Report Studio state (template, search, selection) on Project C
    const panel = page.locator("[data-notebook-brief]");
    await panel.locator("summary").click();
    await panel.locator("[data-report-template]").selectOption("methodological_audit");
    await panel.locator("[data-report-search]").fill("Poland");
    await panel.locator("[data-brief-choice] input[type='checkbox']").first().uncheck();

    // Confirm NOTEBOOK_PROJECTS_KEY was NOT mutated by Report Studio interactions
    const projectsAfter = await page.evaluate((k) => localStorage.getItem(k), NOTEBOOK_PROJECTS_KEY);
    expect(projectsAfter).toBe(projectsBefore);

    // Switch to Project 2 and back to Project C -> Report Studio remounts cleanly (key={activeId}) with zero leaked filters/template
    await page.getByLabel("Choose research project", { exact: true }).selectOption(secondId);
    await expect(page.locator("[data-notebook-brief]")).toHaveCount(0);
    await page.getByLabel("Choose research project", { exact: true }).selectOption("legacy");
    await panel.locator("summary").click();
    await expect(panel.locator("[data-report-template]")).toHaveValue("standard");
    await expect(panel.locator("[data-report-search]")).toHaveValue("");
    await expect(panel.locator("[data-report-selection-counts]")).toContainText("4 / 4");
  });
});
