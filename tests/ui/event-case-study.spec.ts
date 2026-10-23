import { expect, test, type Page } from "@playwright/test";

const url = (locale: "zh-CN" | "en", event: string, country: string) => `${locale === "en" ? "/en" : ""}/models/?tab=run&skill=event_window_analysis&country=${country}&event=${event}&section=case`;
const dossier = (page: Page, event: string) => page.locator(`[data-case-study="${event}"]`);
const noCjkOutsideOriginals = (page: Page, selector: string) => page.locator(selector).evaluate((node) => { const copy = node.cloneNode(true) as HTMLElement; copy.querySelectorAll("[data-original-language]").forEach((item) => item.remove()); return copy.textContent ?? ""; });

for (const locale of ["zh-CN", "en"] as const) {
  test(`REPowerEU case: documents, chain, engine window, descriptive comparison and limits (${locale})`, async ({ page }) => {
    const id = "cz-2023-10-16-repowereu-plan";
    await page.goto(url(locale, id, "czechia"), { waitUntil: "networkidle" });
    const study = dossier(page, id);
    await expect(study.locator("[data-case-section]")).toHaveCount(9);
    await expect(study.locator("[data-case-stage='legal_adoption']")).toHaveAttribute("data-documented", "true");
    await expect(study.locator("[data-case-stage='observed_outcome']")).toHaveAttribute("data-documented", "false");
    await expect(study.locator("[data-case-date-note]")).toContainText("2023-10-16");
    await expect(study.locator("[data-case-milestone]")).toHaveCount(4);
    for (const basis of ["documented_fact", "documented_mechanism", "research_hypothesis", "unsupported_connection"]) await expect(study.locator(`[data-case-chain='${basis}']`)).toHaveCount(1);
    await expect(study.locator("[data-case-annual='energy_import_dependency'] [data-observation-id]").first()).toBeVisible();
    // The monthly window comes from the existing engine with the full gate; the event month is reported separately.
    await expect(study.locator("[data-case-window='full']")).toBeVisible();
    await expect(study.locator("[data-case-window-stats]")).toContainText("2023-10");
    await expect(study.locator("[data-case-window-stats]")).toContainText("12 / 12");
    await expect(study.locator("[data-case-window-source]")).toContainText("2022-10");
    await expect(study.locator("[data-case-comparison='slovakia']")).toContainText(locale === "en" ? "not a control group" : "不是对照组");
    await expect(study.locator("[data-case-external]")).toBeVisible();
    await expect(study.locator("[data-case-cannot]")).toContainText(locale === "en" ? "no identification strategy" : "没有识别策略");
    // The four-level record stays available below the dossier.
    await expect(page.locator(`[data-event-analysis="${id}"] [data-event-level]`)).toHaveCount(4);
    if (locale === "en") expect(await noCjkOutsideOriginals(page, `[data-case-study="${id}"]`)).not.toMatch(/[㐀-鿿]/u);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });

  test(`CATL case: announcement only, annual evidence, documented window blocker, no comparison (${locale})`, async ({ page }) => {
    const id = "hu-2022-08-12-catl-debrecen";
    await page.goto(url(locale, id, "hungary"), { waitUntil: "networkidle" });
    const study = dossier(page, id);
    await expect(study.locator("[data-case-stage='announcement']")).toHaveAttribute("data-documented", "true");
    await expect(study.locator("[data-case-stage='implementation']")).toHaveAttribute("data-documented", "false");
    await expect(study.locator("[data-case-chain='unsupported_connection']")).toContainText(locale === "en" ? "announced amount" : "公告金额");
    for (const indicator of ["fdi_inflow", "manufacturing_share_gdp", "automotive_export_share"]) await expect(study.locator(`[data-case-annual='${indicator}']`)).toBeVisible();
    await expect(study.locator("[data-case-annual='fdi_inflow']")).toContainText(locale === "en" ? "event year" : "事件年");
    await expect(study.locator("[data-case-window-blocker]")).toBeVisible();
    await expect(study.locator("[data-case-window]")).toHaveCount(0);
    await expect(study.locator("[data-case-comparison]")).toHaveCount(0);
    await expect(study.locator("[data-case-concurrent-projects] li")).toHaveCount(2);
    if (locale === "en") expect(await noCjkOutsideOriginals(page, `[data-case-study="${id}"]`)).not.toMatch(/[㐀-鿿]/u);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(await study.evaluate((node) => node.getBoundingClientRect().width <= innerWidth)).toBe(true);
  });
}

test("case entries select the event, deep link focuses the dossier, and Notebook saves the live configuration", async ({ page }) => {
  await page.goto("/models/?tab=run&skill=event_window_analysis", { waitUntil: "networkidle" });
  await expect(page.locator("[data-case-study-entry]")).toHaveCount(2);
  await page.locator("[data-case-study-entry='hu-2022-08-12-catl-debrecen']").click();
  await expect(dossier(page, "hu-2022-08-12-catl-debrecen")).toBeVisible();
  await page.goto(url("zh-CN", "cz-2023-10-16-repowereu-plan", "czechia"), { waitUntil: "networkidle" });
  await expect(page.locator("#event-case-study")).toBeFocused();
  await dossier(page, "cz-2023-10-16-repowereu-plan").locator("[data-notebook-add]").click();
  await expect.poll(() => page.evaluate(() => Object.values(localStorage).join("\n"))).toContain("case_study:cz-2023-10-16-repowereu-plan");
  const stored = await page.evaluate(() => Object.values(localStorage).join("\n"));
  expect(stored).toContain("section=case");
  expect(stored).toContain("not a frozen result");
});

test("the Event Library links only reviewed cases to the dossier", async ({ page }) => {
  await page.goto("/news/?country=czechia&from=2023-10-16&to=2023-10-16", { waitUntil: "networkidle" });
  await expect(page.locator("#cz-2023-10-16-repowereu-plan [data-event-entry='case']")).toHaveAttribute("href", /event=cz-2023-10-16-repowereu-plan.*section=case/);
  await page.goto("/news/?country=poland&from=2024-04-23&to=2024-04-23", { waitUntil: "networkidle" });
  await expect(page.locator("#pl-2024-04-23-nuctech-fsr-inspection [data-event-entry]").first()).toBeVisible();
  await expect(page.locator("#pl-2024-04-23-nuctech-fsr-inspection [data-event-entry='case']")).toHaveCount(0);
});
