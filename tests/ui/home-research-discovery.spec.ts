import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { researchWorkspaces } from "../../src/content/researchWorkspaces";
import { researchCountries } from "../../src/lib/researchData";
import { spatialDisplayGateAudit } from "../../src/lib/spatialDataV087";
import { politicalComparisonCountries } from "../../src/lib/politicalData";
import publication from "../../src/data/macro/var_dynamic_response_publication_boundary.json";
import verification from "../../src/data/events/news_source_verification_2026-11-11.json";

for (const prefix of ["", "/en"]) test(`homepage research discovery, coverage and live entry flows: ${prefix || "Chinese"}`, async ({ page }, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${prefix}/`, { waitUntil: "networkidle" });
  await expect(page.locator("main > header")).not.toContainText("Publication-Gate Consolidation");
  const sections = await page.locator("main > section").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-home-research") !== null ? "cases" : node.getAttribute("aria-labelledby")));
  expect(sections.indexOf("home-map-title")).toBe(0);
  expect(sections.indexOf("question-first-title")).toBeLessThan(sections.indexOf("cases"));
  expect(sections.indexOf("home-map-title")).toBeLessThan(sections.indexOf("question-first-title"));
  const coverage = page.locator("[data-home-coverage]");
  await expect(coverage.locator('[data-home-coverage-kind="national"] li')).toHaveCount(researchCountries.length);
  const regional = spatialDisplayGateAudit.filter(c => c.boundary_layer_ready && c.regional_data_ready);
  expect(regional).toHaveLength(9);
  await expect(coverage.locator('[data-home-coverage-kind="regional"] li')).toHaveCount(regional.length);
  await expect(coverage.locator('[data-home-coverage-kind="regional"] a[href*="country=serbia"]')).toHaveCount(0);
  const political = ["germany", ...politicalComparisonCountries().map(country => country.slug)];
  expect(political).toHaveLength(5);
  await expect(coverage.locator('[data-home-coverage-kind="political"] li')).toHaveCount(political.length);
  for (const slug of political) await expect(coverage.locator(`[data-home-coverage-kind="political"] a[href="${prefix}/politics/${slug === "germany" ? "" : `${slug}/`}"]`)).toHaveCount(1);
  expect(publication.formal_dynamic_response_publication_available).toBe(false);
  expect(publication.formal_irf_publication_available).toBe(false);
  await expect(page.locator("[data-home-var-gate]")).toContainText(prefix ? "IRFs remain unavailable" : "IRF 仍不可用");
  const checked = verification.records.map(record => record.retrieved_at).sort().at(-1)!;
  await expect(page.locator("[data-home-news-check] time")).toHaveAttribute("datetime", checked);
  await expect(page.locator("[data-latest-signals-meta]")).toContainText("2026-11-11");
  for (const workspace of researchWorkspaces) await expect(page.locator(`a[href="${prefix}/workspaces/${workspace.id}/"]`)).toHaveCount(1);

  // The original map remains keyboard-operable, and profile/map links retain the selected country.
  for (const country of researchCountries) {
    const button = page.locator(".home-country-selector").getByRole("button", { name: country.iso2, exact: true });
    await button.focus(); await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".home-map-actions a").first()).toHaveAttribute("href", `${prefix}/countries/${country.slug}/`);
    await expect(page.locator(".home-map-actions a").last()).toHaveAttribute("href", `${prefix}/map/?country=${country.slug}`);
  }
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(axe.violations.filter(v => ["serious", "critical"].includes(v.impact ?? "")).map(v => ({ id: v.id, nodes: v.nodes.map(node => ({ target: node.target, reason: node.failureSummary })) }))).toEqual([]);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
  await page.screenshot({ path: info.outputPath(`${prefix ? "en" : "zh"}-home-research.png`), fullPage: true });

  for (const [id, country] of [["d4", "poland"], ["hu-2022-08-12-catl-debrecen", "hungary"], ["cz-2023-10-16-repowereu-plan", "czechia"]]) {
    await page.goto(`${prefix}/`, { waitUntil: "networkidle" });
    const link = page.locator(`[data-home-case="${id}"] h3 a`);
    const href = await link.getAttribute("href");
    expect(href).toBe(id === "d4" ? `${prefix}/politics/poland/?research_study=d4` : `${prefix}/models/?tab=run&skill=event_window_analysis&country=${country}&event=${id}&section=case`);
    await link.click();
    if (id === "d4") {
      await expect(page.locator("[data-research-study]")).toHaveAttribute("open", "");
      await expect(page.locator("[data-research-study-pairs] tbody tr").first()).toBeVisible();
    } else {
      await expect(page.locator(`[data-case-study="${id}"]`)).toBeVisible();
      await expect(page.locator("#event-case-study")).toBeFocused();
      await expect(page.locator(`[data-case-study="${id}"] [data-e1-export-json]`)).toBeVisible();
    }
  }
  await page.goto(`${prefix}/`, { waitUntil: "networkidle" });
  await page.locator(`a[href="${prefix}/workspaces/fiscal_macro_conditions/"]`).click();
  await expect(page).toHaveURL(new RegExp(`${prefix}/workspaces/fiscal_macro_conditions/`));
  await expect(page.locator("main h1")).toBeVisible();
  expect(errors).toEqual([]);
});
