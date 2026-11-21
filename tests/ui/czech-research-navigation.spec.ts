import { expect, test } from "@playwright/test";
import elections from "../../src/data/political/czechia/elections.json";
import turnout from "../../src/data/political/czechia/election_turnout.json";

for (const prefix of ["", "/en"]) {
  const en = prefix === "/en";
  test(`Czech archive links, exports and turnout comparison (${en ? "en" : "zh"})`, async ({page}) => {
    await page.goto(prefix + "/politics/?history_countries=czechia,germany");
    const card = page.locator('[data-political-country="czechia"]');
    const links = card.locator("[data-history-election]");
    await expect(links).toHaveText(elections.map(e => String(e.year)));
    const history = page.locator("[data-history-comparison]");
    const cs = en ? "Issued envelopes / registered voters" : "发出的投票信封数 / 登记选民数";
    for (const e of elections) {
      const row = history.locator(`[data-history-record="${e.election_id}"]`);
      await expect(row).toContainText(cs);
      await expect(row.locator("strong")).toHaveText(turnout.find(t => t.election_id === e.election_id)!.published_turnout+"%");
    }
    const germany = history.locator('[data-history-record="el-de-bt-2025-02-23"]');
    await expect(germany).toContainText(en ? "Voters / registered voters" : "实际投票人数 / 登记选民数");

    await links.first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-selected-election]")).toHaveValue(elections[0].election_id);
    const definitions = page.locator("[data-politics-research-details] dt");
    await expect(definitions.filter({hasText: en ? "Issued envelopes" : "发出票封数"})).toHaveCount(1);
    for (const record of elections.slice(1)) {
      await page.locator("[data-election-step]").getByRole("button", {name:en ? /Next election/ : /下一届选举/}).click();
      await expect(page.locator("[data-selected-election]")).toHaveValue(record.election_id);
    }
    const csv = page.locator('a[href="/research-data/political/czechia/election_results.csv"]').first();
    await expect(csv).toHaveText(en ? "Results CSV (all listed elections)" : "历届选举结果 CSV");
    const response = await page.request.get((await csv.getAttribute("href"))!);
    expect(response.ok()).toBeTruthy();
    const content = await response.text();
    for (const e of elections) expect(content).toContain(e.election_id);
    const manifest = await page.request.get("/research-data/political/czechia/manifest.json");
    expect((await manifest.json()).elections).toEqual(elections.map(e => e.election_id));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
