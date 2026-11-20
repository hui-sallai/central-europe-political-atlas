import {readFile} from "node:fs/promises";
import {expect,test} from "@playwright/test";
import {activeNotebookRaw} from "./notebook-storage";
import {parseNotebook} from "../../src/lib/researchNotebook";

test("Hungary 2014 separates event contestants, laws in force and subsequent reforms",async({page})=>{
  const id="el-hu-ogy-2014-04-06";
  await page.goto("/en/politics/hungary/?election="+id);
  const history=page.locator("[data-history-no-series]");
  await expect(history).toContainText("no verified cross-election party series");
  await history.getByRole("button").click();
  await expect(page.locator("[data-results-disclosure]")).toHaveAttribute("open","");
  const period=page.locator('[data-election-period="'+id+'"]');
  await period.locator("summary").click();
  await expect(period).toContainText("Subsequent changes");
  await period.locator('a[href$="#hu-2012-fundamental-law"]').click();

  const law=page.locator("#hu-2012-fundamental-law");
  await expect(law).toHaveAttribute("open","");
  await expect(law).toContainText("2011-04-25");
  await expect(law).toContainText("2012-01-01");
  const linked=law.locator("[data-period-elections] a");
  await expect(linked).toHaveCount(4);
  await law.getByRole("button",{name:"Save this institutional change"}).click();
  await expect.poll(()=>activeNotebookRaw(page)).toContain("historical_institutional_change");
  const book=parseNotebook(await activeNotebookRaw(page));
  const item=book.items.find(i=>i.layer==="historical_institutional_change")!;
  expect(item.canonical_ids).toContain(id);
  expect(item.metadata.filters?.effective).toBe("2012-01-01");
  expect(book.sources.filter(s=>item.source_ids.includes(s.id)).map(s=>s.code)).toContain("hu-fundamental-law");
  await page.goto(new URL(item.url).pathname+new URL(item.url).hash);
  await expect(law).toHaveAttribute("open","");
});

test("Czech verified party history exports individual observation sources and restores from Notebook",async({page})=>{
  await page.goto("/en/politics/czechia/");
  const section=page.locator("[data-politics-history]");
  const choice=section.locator("select").first();
  const id=await choice.locator("option").filter({hasText:/^ANO/}).first().getAttribute("value");
  expect(id).toBeTruthy();
  await choice.selectOption(id!);
  await section.locator("select").nth(1).selectOption("seats");
  const observed=section.locator('[data-history-state="observed"]');
  await expect(observed.first().locator('td a[href^="https://"]').first()).toBeVisible();
  const download=page.waitForEvent("download");
  await section.locator("[data-history-export]").click();
  const csv=await readFile((await (await download).path())!,"utf8");
  expect(csv).toContain("observation_source_ids");expect(csv).toContain("https://");
  await section.getByRole("button",{name:"Save verified party history"}).click();
  await expect.poll(()=>activeNotebookRaw(page)).toContain("verified_electoral_party_history");
  const book=parseNotebook(await activeNotebookRaw(page));
  const item=book.items.find(i=>i.layer==="verified_electoral_party_history")!;
  expect(item.canonical_ids).toContain(id);expect(item.metadata.filters?.measure).toBe("seats");
  expect(item.source_ids.length).toBeGreaterThan(1);
  const url=new URL(item.url);
  await page.goto(url.pathname+url.search+url.hash);
  await expect(choice).toHaveValue(id!);
  await expect(section.locator("select").nth(1)).toHaveValue("seats");
});

test("年度背景从罗马尼亚参议院保留选举、频率和参照期，支持追加比较国并返回原院别",async({page})=>{
  const id="el-ro-s-2024-12-01";
  await page.goto("/politics/romania/?election="+id);
  await page.locator("[data-election-data-handoff] a").click();
  const data=page.locator("[data-national-comparison]");
  await expect(data.getByLabel("起始时期",{exact:true})).toHaveValue("2021");
  await expect(data.getByLabel("结束时期",{exact:true})).toHaveValue("2023");
  await data.getByRole("checkbox",{name:"匈牙利",exact:true}).check();
  await expect(data.getByRole("checkbox",{name:"罗马尼亚",exact:true})).toBeChecked();
  await page.reload();
  const origin=data.locator("[data-election-origin]");
  await expect(origin).toContainText("Senat");
  await expect(origin).toContainText("登记日期待核实");
  await origin.getByRole("link").click();
  await expect(page.locator("[data-ballot-chamber]")).toHaveValue("Senat");
  await expect(page).toHaveURL(new RegExp("election="+id));
});
