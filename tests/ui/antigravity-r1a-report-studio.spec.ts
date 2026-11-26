import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { addNotebookEvidence, emptyNotebook, NOTEBOOK_STORAGE_KEY, serializeNotebook, type EvidenceDraft } from "../../src/lib/researchNotebook";

const collected = "2026-11-26T08:00:00.000Z";

function studioFixture() {
  let state = emptyNotebook("en", "v2.0", collected);
  const obs: EvidenceDraft = {
    type: "observation",
    title: "Poland Real GDP Growth 2025",
    labels: { en: "Poland Real GDP Growth 2025", "zh-CN": "波兰 2025 年实际 GDP 增长率" },
    url: "https://hy-central-europe-analysis.org/data/?country=poland&indicator=real_gdp_growth&from=2025&to=2025",
    canonical_ids: ["poland:real_gdp_growth:2025"],
    countries: ["poland"],
    periods: ["2025"],
    value: 3.1,
    unit: "%",
    sources: [
      {
        institution: "Eurostat",
        dataset: "Real GDP growth rate",
        code: "nama_10_gdp",
        url: "https://ec.europa.eu/eurostat/databrowser/view/nama_10_gdp",
        layer: "official_annual",
        original_unit: "%",
        retrieved_at: "2026-11-01",
        updated_at: "2026-10-15",
      },
    ],
    layer: "official_annual",
    comparability: "Harmonized ESA 2010",
    warnings: ["Preliminary estimate subject to revision"],
    metadata: { status: "published" },
  };
  state = addNotebookEvidence(state, obs, "v2.0", collected);
  state = addNotebookEvidence(
    state,
    {
      ...obs,
      type: "country_comparison",
      title: "Policy rate side-by-side",
      labels: { en: "Policy rate side-by-side", "zh-CN": "政策利率并列视图" },
      url: "https://hy-central-europe-analysis.org/data/?compare_countries=poland,hungary&comparison_indicator=macro:policy_rate",
      canonical_ids: ["macro:policy_rate"],
      countries: ["poland", "hungary"],
      periods: ["2024-01", "2025-12"],
      value: undefined,
      sources: [],
      layer: "macro_descriptive",
      warnings: ["Policy instruments differ by central bank"],
      metadata: { filters: { indicator: "macro:policy_rate" } },
    },
    "v2.0",
    collected,
  );
  return {
    ...state,
    title: "R1-A Report Studio Fixture <script>window.__xss=1</script>",
    research_question: "How do macro observations and descriptive configurations align?",
    user_notes: "User note with literal <b>tags</b>.",
  };
}

for (const prefix of ["", "/en"]) {
  const en = Boolean(prefix);
  const lang = en ? "EN" : "ZH";

  test(`R1-A Report Studio templates, readiness summary, multi-format exports & accessibility (${lang})`, async ({ page }) => {
    const state = studioFixture();
    const raw = serializeNotebook(state);
    const writes: string[] = [];
    page.on("request", (req) => {
      if (!["GET", "HEAD"].includes(req.method())) writes.push(req.url());
    });
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: NOTEBOOK_STORAGE_KEY, raw });
    await page.goto(`${prefix}/notebook/`, { waitUntil: "networkidle" });

    const panel = page.locator("[data-notebook-brief]");
    await panel.locator("summary").click();
    const preview = panel.locator("[data-brief-preview]");
    await expect(preview).toBeVisible();

    // Readiness strip reflects exact selected counts
    const readiness = panel.locator("[data-report-readiness]");
    await expect(readiness).toContainText("2 / 2");

    // Switch template -> comparative_note -> methodological_audit
    const templateSelect = panel.locator("[data-report-template]");
    await templateSelect.selectOption("comparative_note");
    await expect(preview).toContainText(en ? "Coverage and comparability summary" : "覆盖范围与可比性摘要");
    await templateSelect.selectOption("methodological_audit");
    await expect(preview).toContainText(en ? "Methodological and provenance audit" : "方法限制与来源完整性审计");

    // Evidence type filter narrows checklist without altering selection
    const typeFilter = panel.locator("[data-report-type-filter]");
    await typeFilter.selectOption("observation");
    await expect(panel.locator("[data-brief-choice]")).toHaveCount(1);
    await typeFilter.selectOption("all");
    await expect(panel.locator("[data-brief-choice]")).toHaveCount(2);

    // Export Print-Ready HTML
    const [htmlDl] = await Promise.all([page.waitForEvent("download"), panel.locator("[data-export-brief-html]").click()]);
    expect(htmlDl.suggestedFilename()).toMatch(new RegExp(`^atlas-research-report-${en ? "en" : "zh-CN"}-\\d{4}-\\d{2}-\\d{2}\\.html$`));
    const htmlText = fs.readFileSync((await htmlDl.path())!, "utf8");
    expect(htmlText).toContain("@media print");
    expect(htmlText).not.toContain("<script>");
    expect(htmlText).toContain("&lt;script&gt;");

    // Export BibTeX
    const [bibDl] = await Promise.all([page.waitForEvent("download"), panel.locator("[data-export-brief-bibtex]").click()]);
    expect(bibDl.suggestedFilename()).toMatch(new RegExp(`^atlas-citations-${en ? "en" : "zh-CN"}-\\d{4}-\\d{2}-\\d{2}\\.bib$`));
    const bibText = fs.readFileSync((await bibDl.path())!, "utf8");
    expect(bibText).toContain("@misc{source_");
    expect(bibText).toContain("Eurostat");

    // Export CSL-JSON
    const [cslDl] = await Promise.all([page.waitForEvent("download"), panel.locator("[data-export-brief-csl]").click()]);
    expect(cslDl.suggestedFilename()).toMatch(new RegExp(`^atlas-citations-${en ? "en" : "zh-CN"}-\\d{4}-\\d{2}-\\d{2}\\.csl\\.json$`));
    const cslData = JSON.parse(fs.readFileSync((await cslDl.path())!, "utf8"));
    expect(Array.isArray(cslData)).toBe(true);
    expect(cslData.length).toBe(3);

    // Zero localStorage mutation, zero non-GET requests, no horizontal overflow
    expect(await page.evaluate((key) => localStorage.getItem(key), NOTEBOOK_STORAGE_KEY)).toBe(raw);
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);

    // WCAG axe check in both light and dark modes
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe("");
      const axe = await new AxeBuilder({ page }).include("[data-notebook-brief]").analyze();
      expect(axe.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
    }
  });
}
