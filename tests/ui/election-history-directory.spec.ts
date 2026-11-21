import {test, expect} from "@playwright/test";
import links from "../../src/lib/institutions/election_links.json";

for (const prefix of ["", "/en"]) {
  test(`historical directory matches every registered chamber-election and date (${prefix || "zh"})`, async ({page}) => {
    await page.goto(prefix+"/politics/");
    const directory = page.locator("[data-political-landing]");
    const linksOnPage = await directory.locator("[data-history-election]").evaluateAll(items =>
      items.map(item => [item.getAttribute("data-history-election"), item.getAttribute("href"), item.querySelector("time")?.dateTime]));
    const expected = links.elections.map(e => [e.election_id, prefix+"/politics/"+e.country+"/?election="+e.election_id, e.date]);
    expect(linksOnPage.sort()).toEqual(expected.sort());
    const slovakia = directory.locator('[data-political-country="slovakia"]');
    await expect(slovakia.locator("[data-election-year-links] a")).toHaveText(["2023"]);
    const hungary = directory.locator('[data-political-country="hungary"]');
    await expect(hungary.locator("[data-election-year-links] a")).toHaveText(["2002","2006","2010","2014","2018","2022","2026"]); // 2010 admitted 2026-11-20; 2002 and 2006 admitted 2026-11-22
    const romania = directory.locator('[data-political-country="romania"]');
    await expect(romania.locator("[data-election-year-links] h3")).toHaveText(["Camera Deputaților", "Senat"]);
    const early = hungary.locator('[data-history-election="el-hu-ogy-2014-04-06"]');
    await early.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(url => url.pathname === prefix+"/politics/hungary/" && url.searchParams.get("election") === "el-hu-ogy-2014-04-06");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
