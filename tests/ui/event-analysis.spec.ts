import { expect, test, type Page } from "@playwright/test";

const url = (locale: "zh-CN" | "en", event: string, country: string, extra = "") => `${locale === "en" ? "/en" : ""}/models/?tab=run&skill=event_window_analysis&country=${country}&event=${event}${extra}`;
const panel = (page: Page, event: string) => page.locator(`[data-event-analysis="${event}"]`);

for (const locale of ["zh-CN", "en"] as const) {
  test(`representative study with an explained monthly link shows all four levels (${locale})`, async ({ page }) => {
    const id = "cz-2023-10-16-repowereu-plan";
    await page.goto(url(locale, id, "czechia"), { waitUntil: "networkidle" });
    const study = panel(page, id);
    await expect(study.locator("[data-event-level]")).toHaveCount(4);
    await expect(study.locator("[data-evidence-kind='observed_fact']")).toHaveCount(1);
    await expect(study.locator("[data-evidence-kind='research_hypothesis']")).toHaveCount(1);
    await expect(study.locator("[data-linked-indicator='energy_import_dependency']")).toContainText(locale === "en" ? "Research hypothesis" : "研究假设");
    await expect(study.locator("[data-unsupported-links]")).toBeVisible();
    await expect(study.locator("[data-source-publisher]")).toContainText("European Commission");
    await expect(study.locator("[data-event-actors]")).toContainText(locale === "en" ? "Czech government" : "捷克政府");
    const row = study.locator("[data-window-availability] tbody tr").first();
    await expect(row).toHaveAttribute("data-window-gate", "full");
    if (locale === "en") expect(await study.locator("[data-event-level]").evaluateAll((nodes) => nodes.map((node) => { const copy = node.cloneNode(true) as HTMLElement; copy.querySelectorAll("[data-original-language]").forEach((item) => item.remove()); return copy.textContent; }).join(" "))).not.toMatch(/[㐀-鿿]/u);
    // The window is computed only on request, by the existing engine, and stays descriptive.
    await study.locator("[data-open-window]").click();
    await expect(page.locator("[data-chart-unit]")).toBeVisible();
    await expect(page.locator("[data-window-source]")).toContainText("2022-10");
    await expect(page.getByText(locale === "en" ? /not a causal/i : /不构成因果|不是因果/).first()).toBeVisible();
  });

  test(`study without a defensible indicator link offers no indicator or window entry (${locale})`, async ({ page }) => {
    const id = "pl-2024-04-23-nuctech-fsr-inspection";
    await page.goto(url(locale, id, "poland", "&outcome=industrial_production_index"), { waitUntil: "networkidle" });
    const study = panel(page, id);
    await expect(study.locator("[data-linked-indicator]")).toHaveCount(0);
    await expect(study.locator("[data-level-reason='indicators']")).toBeVisible();
    await expect(study.locator("[data-level-reason='window']")).toBeVisible();
    await expect(study.locator("[data-open-window]")).toHaveCount(0);
    // A category-derived outcome in the URL is not preselected.
    await expect(page.locator("select").nth(2)).toHaveValue("");
  });

  test(`recent event: background shown, mechanism and indicators explained as unavailable, no numbers (${locale})`, async ({ page }) => {
    await page.goto(`${locale === "en" ? "/en" : ""}/models/?tab=run&skill=event_window_analysis&country=hungary`, { waitUntil: "networkidle" });
    const select = page.locator("select").nth(1);
    const recent = await select.locator("option:not([disabled])").evaluateAll((options) => (options as HTMLOptionElement[]).map((option) => option.value).find((value) => /^hu-2026-(09|10)/.test(value)));
    expect(recent).toBeTruthy();
    await select.selectOption(recent!);
    const study = panel(page, recent!);
    await expect(study.locator("[data-event-level='1'] [data-level-state]")).toHaveText(locale === "en" ? "Available" : "可用");
    await expect(study.locator("[data-level-reason='mechanism']")).toBeVisible();
    await expect(study.locator("[data-level-reason='indicators']")).toBeVisible();
    await expect(study.locator("[data-level-reason='window']")).toContainText(locale === "en" ? "too recent" : "太近");
    await expect(study.locator("[data-window-availability] tr[data-window-gate='full']")).toHaveCount(0);
    await expect(page.locator("[data-outcome-link-note]")).toContainText(locale === "en" ? "No series is recommended" : "不为该事件推荐序列");
  });
}

test("representative event buttons select the event and its country", async ({ page }) => {
  await page.goto("/models/?tab=run&skill=event_window_analysis", { waitUntil: "networkidle" });
  await expect(page.locator("[data-representative-event]")).toHaveCount(4);
  await page.locator("[data-representative-event='hu-2023-01-26-eu-funds-conditionality']").click();
  const study = panel(page, "hu-2023-01-26-eu-funds-conditionality");
  await expect(study.locator("[data-linked-indicator='government_expenditure_gdp']")).toBeVisible();
  await expect(study.locator("[data-open-window]")).toHaveCount(0);
  await expect(page.locator("select").first()).toHaveValue("hungary");
});
