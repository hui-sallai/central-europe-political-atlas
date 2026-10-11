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
  await expect(page.locator("[data-representative-event]")).toHaveCount(9);
  await page.locator("[data-representative-event='hu-2023-01-26-eu-funds-conditionality']").click();
  const study = panel(page, "hu-2023-01-26-eu-funds-conditionality");
  await expect(study.locator("[data-linked-indicator='government_expenditure_gdp']")).toBeVisible();
  await expect(study.locator("[data-open-window]")).toHaveCount(0);
  await expect(page.locator("select").first()).toHaveValue("hungary");
});

for (const locale of ["zh-CN", "en"] as const) {
  test(`news cards offer only the entries an event supports (${locale})`, async ({ page }) => {
    const prefix = locale === "en" ? "/en" : "";
    await page.goto(`${prefix}/news/?country=czechia&from=2023-10-16&to=2023-10-16`, { waitUntil: "networkidle" });
    const linked = page.locator("#cz-2023-10-16-repowereu-plan");
    await expect(linked.locator("[data-event-entry]")).toHaveText(locale === "en" ? ["Event background", "Economic connections", "Event-window analysis"] : ["查看事件背景", "查看经济关联", "查看事件窗口分析"]);
    await expect(linked.locator("[data-event-entry='background']")).toHaveAttribute("href", `${prefix}/models/?tab=run&skill=event_window_analysis&country=czechia&event=cz-2023-10-16-repowereu-plan`);
    await page.goto(`${prefix}/news/?country=poland&from=2024-04-23&to=2024-04-23`, { waitUntil: "networkidle" });
    await expect(page.locator("#pl-2024-04-23-nuctech-fsr-inspection [data-event-entry]")).toHaveCount(1);
    await page.goto(`${prefix}/news/?country=austria&from=2026-10-01&to=2026-10-11`, { waitUntil: "networkidle" });
    const recent = page.locator("article").first();
    await expect(recent.locator("[data-event-entry]")).toHaveCount(1);
    await expect(recent.locator("[data-event-entry='background']")).toBeVisible();
  });
}

for (const locale of ["zh-CN", "en"] as const) {
  test(`reviewed 2026 event: mechanism and links shown, window explained as not yet possible (${locale})`, async ({ page }) => {
    const id = "ro-2026-10-09-the-national-bank-of-romanian-maintains-reference-interest-rate-id1069193";
    await page.goto(url(locale, id, "romania", "&section=indicators"), { waitUntil: "networkidle" });
    const study = panel(page, id);
    await expect(study.locator("[data-evidence-kind]")).toHaveCount(3);
    await expect(study.locator("[data-linked-indicator='policy_rate:level']")).toContainText(locale === "en" ? "Stated in the source" : "来源明确说明");
    await expect(study.locator("[data-linked-indicator='hicp_annual_rate']")).toContainText(locale === "en" ? "Research hypothesis" : "研究假设");
    await expect(study.locator("[data-window-availability] tr[data-window-gate='full']")).toHaveCount(0);
    await expect(study.locator("[data-level-reason='window']").first()).toContainText(locale === "en" ? "No numerical result is shown" : "不显示任何数值结果");
    await expect(study.locator("[data-open-window]")).toHaveCount(0);
    await expect(study.locator("#event-level-3")).toBeFocused();
    if (locale === "en") expect(await study.locator("[data-event-level]").evaluateAll((nodes) => nodes.map((node) => { const copy = node.cloneNode(true) as HTMLElement; copy.querySelectorAll("[data-original-language]").forEach((item) => item.remove()); return copy.textContent; }).join(" "))).not.toMatch(/[㐀-鿿]/u);
  });
}

test("reviewed 2026 events without a defensible link stay qualitative; annual links show only published years", async ({ page }) => {
  const cosco = "de-2026-10-07-hamburg-zippel-china-staatsreederei-cosco-wirtschaftsministerium-100";
  await page.goto(url("en", cosco, "germany"), { waitUntil: "networkidle" });
  await expect(panel(page, cosco).locator("[data-linked-indicator]")).toHaveCount(0);
  await expect(panel(page, cosco).locator("[data-unsupported-links]")).toContainText("FDI inflow");
  await expect(panel(page, cosco).locator("[data-event-actors]")).toContainText("COSCO (proposed acquirer)");
  const budget = "cz-2026-09-21-czech-government-approves-2027-budget-czk-386-billion-deficit-8897929";
  await page.goto(url("en", budget, "czechia"), { waitUntil: "networkidle" });
  await expect(panel(page, budget)).toContainText("Proposed draft (not yet enacted)");
  await expect(panel(page, budget).locator("[data-linked-indicator='fiscal_balance_gdp'] thead")).not.toContainText("2027");
  await expect(page.locator("[data-representative-event]")).toHaveCount(9);
});
