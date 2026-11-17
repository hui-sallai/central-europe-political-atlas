import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import cases from "../../src/lib/research-themes/cases.json";
import index from "../../src/lib/research-themes/thematic_index.json";
import { parseNotebook } from "../../src/lib/researchNotebook";
import { activeNotebookRaw } from "./notebook-storage";

async function downloadJson(page: Page, button: Locator) {
  const [download] = await Promise.all([page.waitForEvent("download"),button.click()]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const file = await download.path();
  if (!file) throw new Error("Browser did not provide the downloaded JSON file");
  return readFile(file, "utf8");
}

for (const record of cases.cases) {
  test(`Thematic case, source evidence and export: ${record.case_id}`, async ({page})=>{
    const country=record.countries[0];
    await page.goto(`/en/workspaces/${record.theme_ids[0]}/?case=${record.case_id}&country=${country}`);
    const panel=page.locator(`[data-thematic-case="${record.case_id}"]`);
    await expect(panel.getByRole("heading",{name:record.title.en,exact:true})).toBeVisible();
    await panel.locator("[data-case-chronology] > summary").click();
    const timeline=panel.locator("[data-case-chronology]");
    const chronology=index.chronologies.find(c=>c.case_id===record.case_id)!;
    await expect(timeline.locator("ol > li")).toHaveCount(chronology.dated.length+chronology.undated.length);
    await expect(timeline.getByRole("link").first()).toHaveAttribute("href",/^https:\/\//);
    const windows=index.evidence_windows.filter(w=>w.case_id===record.case_id);
    const json=JSON.parse(await downloadJson(page,panel.locator("[data-case-export]")));
    expect(json.record).toEqual(record);
    expect(json.windows).toEqual(windows);
    expect(json.chronology.dated).toEqual(chronology.dated);
    expect(json.chronology.undated).toEqual(chronology.undated);
    expect(json.citations.length).toBeGreaterThan(0);
    const href=new URL(json.research_url);
    expect(href.searchParams.get("case")).toBe(record.case_id);
    expect(href.searchParams.get("country")).toBe(country);
    if (!windows.length) {
      await expect(panel.locator("[data-case-window]")).toHaveCount(0);
      await expect(panel).toContainText(record.window_blocker!.en);
      return;
    }
    const series=windows[0].series.find(s=>s.status!=="none"&&s.observations.length)!;
    await expect(panel.locator("[data-case-window]")).toContainText(windows[0].anchor_label.en);
    const link=panel.locator("[data-case-history-link]");
    await link.click();
    const comparison=page.locator("[data-national-comparison]");
    await expect(comparison).toBeVisible();
    await expect(comparison.getByRole("combobox",{name:"Indicator",exact:true})).toHaveValue("annual:"+series.indicator_id);
    await expect(comparison.getByRole("checkbox",{checked:true})).toHaveCount(1);
    expect(new URL(page.url()).searchParams.get("compare_countries")).toBe(country);
  });
}

test("Thematic Notebook backup retains source references, observation identities and case restrictions",async({page})=>{
  const record=cases.cases.find(c=>c.case_id==="hu-battery-strategic-investment")!;
  const window=index.evidence_windows.find(w=>w.case_id===record.case_id)!;
  const series=window.series.find(s=>s.layer==="regional_annual")!;
  await page.goto(`/en/workspaces/${record.theme_ids[0]}/?case=${record.case_id}&country=hungary`);
  const panel=page.locator(`[data-thematic-case="${record.case_id}"]`);
  await panel.locator("[data-case-actions] [data-notebook-add]").click();
  await expect.poll(async()=>JSON.parse(await activeNotebookRaw(page)).items?.length).toBe(1);
  const picker=panel.getByRole("combobox",{name:/^Historical observations/});
  const option=picker.locator("option").filter({hasText:series.geo}).first();
  const selected=await option.getAttribute("value");
  if (!selected) throw new Error("Expected a regional historical series selection");
  await picker.selectOption(selected);
  await panel.locator("[data-case-window] summary").filter({hasText:"Observation records"}).click();
  await panel.locator("[data-case-window] [data-notebook-add]").click();
  await expect.poll(async()=>JSON.parse(await activeNotebookRaw(page)).items?.length).toBe(2);
  await page.goto("/en/notebook/");
  const notebook=parseNotebook(await downloadJson(page,page.getByRole("button",{name:"Download active notebook JSON backup",exact:true})));
  const item=notebook.items.find(i=>i.layer==="thematic_research_case")!;
  expect(item.canonical_ids).toEqual(expect.arrayContaining([record.case_id,...record.event_ids]));
  expect(item.warnings).toEqual(record.limitations.map(l=>l.en));
  expect(item.source_ids.length).toBeGreaterThan(0);
  for(const id of item.source_ids) expect(notebook.sources.find(s=>s.id===id)?.url).toMatch(/^https:\/\//);
  expect(new URL(item.url).searchParams.get("case")).toBe(record.case_id);
  const history=notebook.items.find(i=>i.layer===series.layer)!;
  expect(history.canonical_ids).toEqual(expect.arrayContaining([window.window_id,...series.observations.map(o=>o.observation_id)]));
  expect(history.periods).toEqual(series.observations.map(o=>o.period));
  expect(history.metadata.filters?.geo).toBe(series.geo);
  const saved=new URL(history.url);
  expect(saved.searchParams.get("case_window")).toBe(window.window_id);
  expect(saved.searchParams.get("case_series")).toContain(series.indicator_id);
  const entry=index.indicator_catalogue.find(row=>row.indicator_id===series.indicator_id&&row.layer===series.layer)!;
  const catalogueSources=entry.source_url!.split(/\s+\|\s+/);
  expect(notebook.sources.filter(source=>history.source_ids.includes(source.id)).map(s=>s.url)).toEqual(catalogueSources);
  await page.goto(saved.pathname+saved.search);
  await expect(picker).toHaveValue(selected);
  await panel.locator("[data-case-window] summary").filter({hasText:"Observation records"}).click();
  await expect(panel.locator("[data-case-window]")).toContainText(series.observations[0].observation_id);
  await picker.selectOption({index:0});
  await page.goBack();
  await expect(picker).toHaveValue(selected);
  saved.searchParams.set("case_series","unregistered");
  await page.goto(saved.pathname+saved.search);
  await expect(panel.locator("[data-case-window] [role=status]")).toContainText("do not match");
  await expect(panel.locator("[data-case-window] [data-notebook-add]")).toHaveCount(0);
});
