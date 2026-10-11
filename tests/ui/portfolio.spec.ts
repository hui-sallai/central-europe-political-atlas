import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const cases = [
  ["data-pipeline", "01_Research_Data_Pipeline.pdf"],
  ["trade-exposure", "02_Trade_Exposure_Brief.pdf"],
  ["localization-qa", "03_Localization_QA_Sample_Pack.pdf"],
  ["ai-evaluation", "04_AI_LLM_Evaluation_Simulation.pdf"],
];
test("public portfolio has four usable cases, PDF-only downloads and accessible responsive pages", async ({ page, request }) => {
  await page.goto("/portfolio/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Selected Client Portfolio");
  await expect(page.locator("main article")).toHaveCount(4);
  await expect(page.locator('a[href$=".docx"]')).toHaveCount(0);
  const body = await page.locator("main").innerText();
  expect(body).not.toMatch(/\/Users\/|file:\/\//);
  for (const [slug, pdf] of cases) {
    await page.goto(`/portfolio/${slug}/`);
    await expect(page.getByRole("heading", { name: "Main deliverables" })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://hy-central-europe-analysis.org/portfolio/${slug}/`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.filter(v => ["critical", "serious"].includes(v.impact ?? ""))).toEqual([]);
    const response = await request.get(`/portfolio/files/${pdf}`);
    expect(response.status()).toBe(200);
    expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
  }
  await page.goto("/portfolio/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(v => ["critical", "serious"].includes(v.impact ?? ""))).toEqual([]);
  await expect(page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "Portfolio" })).toBeVisible();
});
