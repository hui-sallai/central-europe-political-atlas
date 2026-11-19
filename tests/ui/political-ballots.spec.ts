import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function download(page: Page, control: Locator) {
  const [file]=await Promise.all([page.waitForEvent("download"), control.click()]);
  return readFile((await file.path())!, "utf8");
}

test("Romanian year and chamber restore without pooling seats or filling unavailable turnout", async ({page})=>{
  const id="el-ro-s-2024-12-01";
  await page.goto("/en/politics/romania/?election="+id);
  const panel=page.locator("[data-political-ballot-explorer]");
  await expect(panel.locator("[data-ballot-chamber]")).toHaveValue("Senat");
  await expect(panel.locator("[data-ballot-composition]")).toContainText("134 allocated seats");
  await expect(panel.locator("[data-ballot-composition]")).toContainText("2 unfilled seats");
  await expect(panel.locator("[data-ballot-composition]")).toContainText("98.53%");
  await expect(panel.locator("[data-ballot-composition]")).toContainText("1.47%");
  await panel.locator("[data-ballot-year]").selectOption("2016");
  await expect(page).toHaveURL(/election=el-ro-s-2016-12-11/);
  await expect(panel.locator("[data-ballot-turnout]")).toContainText("No verified rate");
  await panel.locator("[data-ballot-year]").selectOption("2012");
  await panel.locator("[data-ballot-chamber]").selectOption("Camera Deputaților");
  await expect(page).toHaveURL(/election=el-ro-cd-2012-12-09/);
  await expect(panel.locator("[data-ballot-composition]")).toContainText("412 allocated seats");
  await expect(panel.locator("[data-ballot-rules]")).toContainText(/35\/2008/);
  await page.goBack();
  await expect(panel.locator("[data-ballot-chamber]")).toHaveValue("Senat");
  await page.goForward();
  await page.reload();
  await expect(panel.locator("[data-ballot-year]")).toHaveValue("2012");
  await expect(panel.locator("[data-ballot-chamber]")).toHaveValue("Camera Deputaților");
  const elected=JSON.parse(await download(page,panel.locator("[data-ballot-export] button").filter({hasText:/^JSON/})));
  expect(elected.election_id).toBe("el-ro-cd-2012-12-09");
  expect(elected.ballot.geography).toBe("national");
  expect(elected.ballot.results).toHaveLength(31);
  expect(elected.sources.some((s:{url:string})=>s.url.startsWith("http"))).toBeTruthy();
});

test("Slovenian national community ballots keep votes and historical ranking points separate", async ({page})=>{
  await page.goto("/en/politics/slovenia/?election=el-si-dz-2026-03-22");
  const panel=page.locator("[data-political-ballot-explorer]");
  const seats=panel.locator("[data-ballot-composition]");
  await expect(seats).toContainText("90 allocated seats");
  await panel.locator("[data-ballot-category]").selectOption("minority");
  await panel.locator("[data-ballot-scope]").selectOption("si-nc-madzarska");
  await expect(panel.locator("[data-ballot-vote-chart]")).toContainText(/vote/i);
  await page.goto("/en/politics/slovenia/?election=el-si-dz-2011-12-04&ballot=si-nc-madzarska");
  await expect(panel.locator("[data-ballot-vote-chart]")).toContainText("Ranking points");
  await panel.locator("[data-ballot-table-details] summary").click();
  await expect(panel.getByRole("columnheader",{name:"Ranking points"})).toBeVisible();
  await expect(panel.getByRole("columnheader",{name:"Published share"})).toHaveCount(0);
  const totals=JSON.parse(await download(page,panel.locator("[data-ballot-export] button").filter({hasText:/^JSON/})));
  expect(totals.ballot.results).toHaveLength(2);
  expect(totals.ballot.results.every((r:{points:number;votes:number|null;publishedShare:number|null})=>r.points>0 && r.votes===null && r.publishedShare===null)).toBeTruthy();
  await page.locator('a[hreflang="zh-CN"]').click();
  await expect(page).toHaveURL(/\/politics\/slovenia\/\?election=el-si-dz-2011-12-04&ballot=si-nc-madzarska/);
  await expect(panel.locator("[data-ballot-vote-chart]")).toContainText("排序积分");
});

test("Austrian historical Nationalrat sources and election-specific rules open from a direct link", async ({page})=>{
  await page.goto("/en/politics/austria/?election=el-at-nr-2002-11-24");
  const panel=page.locator("[data-political-ballot-explorer]");
  await expect(panel.locator("[data-ballot-chamber]")).toHaveCount(0);
  await expect(panel.locator("[data-ballot-composition]")).toContainText("Nationalrat");
  await expect(panel.locator("[data-ballot-composition]")).toContainText("183 allocated seats");
  await panel.locator("[data-ballot-rules] summary").click();
  await expect(panel.locator("[data-ballot-rules]")).toContainText("No verified period");
  await panel.locator("[data-ballot-year]").selectOption("2008");
  await panel.locator("[data-ballot-sources] summary").click();
  await expect(panel.locator("[data-ballot-sources] a").first()).toHaveAttribute("href",/^https?:/);
  const text=await download(page,panel.locator("[data-ballot-export] button").filter({hasText:/^CSV/}));
  expect(text.trim().split(/\r?\n/)).toHaveLength(16);
  expect(text).toContain("el-at-nr-2008-09-28");
  expect(text).toContain("source_urls");
  expect(text).toContain("https://");
  await panel.getByRole("link",{name:/Explore the historical economic context/}).click();
  await expect(page).toHaveURL(/compare_countries=austria/);
  await expect(page).toHaveURL(/compare_to=2008/);
});

test("Croatian ballot controls preserve each constituency and keep historical chambers distinct", async ({page})=>{
  await page.goto("/en/politics/croatia/?election=el-hr-sabor-2024-04-17");
  const panel=page.locator("[data-political-ballot-explorer]");
  await expect(panel.locator("[data-ballot-composition]")).toContainText("151 allocated seats");
  await expect(panel.locator("[data-ballot-vote-chart]")).toHaveCount(0);
  for(const [category,geography] of [["territorial","hr-ie-01"],["diaspora","hr-ie-11"],["minority","hr-ie-12-"]]){
    await panel.locator("[data-ballot-category]").selectOption(category);
    await expect(panel.locator("[data-ballot-results]")).toHaveAttribute("data-ballot-results",new RegExp("^"+geography));
    await expect(page).toHaveURL(new RegExp("ballot="+geography));
  }
  await panel.locator("[data-ballot-year]").selectOption("1993");
  await expect(panel.locator("[data-ballot-chamber]")).toHaveValue(/Županijski dom/);
  await expect(panel.locator("[data-ballot-composition]")).toContainText("63 allocated seats");
  await panel.locator("[data-ballot-scope]").selectOption("hr-zupanija-01");
  await expect(panel.locator("[data-ballot-turnout]")).toContainText("Published");
  await panel.locator("[data-ballot-year]").selectOption("1992");
  await expect(panel.locator("[data-ballot-chamber]")).toHaveValue(/Zastupnički dom/);
  await expect(panel.locator("[data-ballot-composition]")).toContainText("138 allocated seats");
  await expect(panel.locator("[data-ballot-vote-chart]")).toContainText("including invalid ballots");
  await expect(page).toHaveURL(/election=el-hr-sabor-1992-08-02/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBeTruthy();
});

test("invalid ballot references cannot produce a substituted result or export", async ({page})=>{
  await page.goto("/politics/croatia/?election=el-hr-sabor-2024-04-17&ballot=not-a-constituency");
  const panel=page.locator("[data-political-ballot-explorer]");
  await expect(panel.getByRole("alert")).toContainText("没有此选票记录");
  await expect(panel.locator("[data-ballot-export]")).toHaveCount(0);
  await expect(panel.locator("[data-ballot-results]")).toHaveCount(0);
  await panel.getByRole("button",{name:"重置选票选择"}).click();
  await expect(page).not.toHaveURL(/ballot=/);
  await expect(panel.getByRole("alert")).toHaveCount(0);
});
