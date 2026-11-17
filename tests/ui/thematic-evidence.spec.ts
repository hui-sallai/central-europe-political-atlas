import { expect, test } from "@playwright/test";
import type { ResearchNotebook } from "../../src/lib/researchNotebook";
import { activeNotebookRaw } from "./notebook-storage";

const industrial = "industrial_policy_strategic_investment";
const outputEvent = "pl-2026-08-20-industrial-output";
const monthlyOutput = "monthly:industrial_production_index";

test("documented output event opens the recorded monthly series and persists its sources and limitations", async ({ page }) => {
  await page.goto(`/en/news/?country=poland&from=2026-08-20&to=2026-08-20#${outputEvent}`);
  const record = page.locator(`article[id="${outputEvent}"]`);
  await record.locator("summary").first().click();
  await record.locator(`[data-event-theme="${industrial}"]`).click();
  const mapped = page.locator(`[data-theme-event="${outputEvent}"]`);
  await expect(mapped).toHaveAttribute("open", "");
  await expect(mapped).toContainText("Documented statistical relationship");
  await expect(mapped).toContainText("2015-01");
  const eventSource = await mapped.locator('a[href^="http"]').first().getAttribute("href");

  await mapped.getByRole("button", { name: "Save relationship", exact: true }).click();
  await expect.poll(() => activeNotebookRaw(page)).toContain("thematic_event_indicator_mapping");
  await page.reload();
  const notebook: ResearchNotebook = JSON.parse(await activeNotebookRaw(page));
  const saved = notebook.items.find(i => i.layer === "thematic_event_indicator_mapping");
  expect(saved).toMatchObject({
    type: "event", canonical_ids: [outputEvent, "industrial_production_index"], countries: ["poland"],
    periods: ["2026-08-20"], metadata: { classification: "A", entersModel: false },
  });
  expect(saved?.url).toContain("#" + outputEvent);
  expect(saved?.warnings.join(" ")).toContain("seasonally adjusted");
  const sources = notebook.sources.filter(s => saved?.source_ids.includes(s.id));
  expect(sources).toEqual(expect.arrayContaining([
    expect.objectContaining({ layer: "verified_event", url: eventSource }),
    expect.objectContaining({ layer: "high_frequency_monthly", url: expect.stringMatching(/^https:\/\//) }),
  ]));

  const series = mapped.locator(`[data-event-series="${monthlyOutput}"]`);
  const href = new URL((await series.getAttribute("href"))!, page.url());
  expect(Object.fromEntries(href.searchParams)).toMatchObject({
    comparison_indicator: monthlyOutput, compare_frequency: "monthly", compare_countries: "poland",
    compare_from: "2015-01", comparison_mode: "side_by_side",
  });
  await series.click();
  const comparison = page.locator("[data-national-comparison]");
  await expect(comparison.getByLabel("Frequency", { exact: true })).toHaveValue("monthly");
  await expect(comparison.getByLabel("Indicator", { exact: true })).toHaveValue(monthlyOutput);
  await expect(comparison.getByRole("checkbox", { name: "Poland", exact: true })).toBeChecked();
});

test("the receiving economy and the annual FDI layer survive the cross-border handoff", async ({ page }) => {
  const id = "si-2026-11-06-major-tech-retailer-sold-to-slovenian-big-bang";
  await page.goto(`/en/workspaces/fdi_production_networks/?country=slovenia&event=${id}`);
  const record = page.locator(`[data-theme-event="${id}"]`);
  await expect(record).toHaveAttribute("open", "");
  await expect(record).toContainText("Plausible research topic");
  const link = record.locator('[data-event-series="annual:fdi_inflow"]').first();
  const url = new URL((await link.getAttribute("href"))!, page.url());
  expect(Object.fromEntries(url.searchParams)).toMatchObject({
    comparison_indicator: "annual:fdi_inflow", compare_frequency: "annual", compare_countries: "serbia",
  });
  await link.click();
  const comparison = page.locator("[data-national-comparison]");
  await expect(comparison.getByRole("checkbox", { name: "Serbia", exact: true })).toBeChecked();
  await expect(comparison.getByRole("checkbox", { name: "Slovenia", exact: true })).not.toBeChecked();
  await expect(comparison.getByLabel("Frequency", { exact: true })).toHaveValue("annual");
  await expect(comparison.getByLabel("Indicator", { exact: true })).toHaveValue("annual:fdi_inflow");
});

for (const [id, classification] of [
  ["hu-2026-11-04-tarkanyi-zsolt-catl-szandeknyilatkozat", "No justified indicator relationship"],
  ["hu-2026-09-04-science-innovation-strategy", "Source evidence insufficient"],
]) {
  test(`event with "${classification}" retains the original record without offering unrelated series`, async ({ page }) => {
    await page.goto(`/en/workspaces/${industrial}/?country=hungary&event=${id}`);
    const record = page.locator(`[data-theme-event="${id}"]`);
    await expect(record).toHaveAttribute("open", "");
    await expect(record).toContainText(classification);
    await expect(record.getByRole("link", { name: "Original event record" })).toHaveAttribute("href", new RegExp("#" + id + "$"));
    await expect(record.locator("[data-event-series]")).toHaveCount(0);
    await expect(record.getByRole("button", { name: "Save relationship" })).toHaveCount(0);
  });
}
