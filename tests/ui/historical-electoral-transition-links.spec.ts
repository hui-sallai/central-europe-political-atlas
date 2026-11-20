import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import registry from "../../src/lib/institutions/election_links.json";
import recordedResults from "../../src/data/political/hungary/election_results.json";

const readCsv: (text: string, separator: string) => string[][] =
  createRequire(process.cwd() + "/package.json")("./scripts/political-data/germany/csv.mjs").parseCsv;
const first = "el-hu-ogy-2010-04-11";
const next = "el-hu-ogy-2014-04-06";
const runoff = "hu10_smc_round2_vote";

test("country hub and fresh bilingual sessions restore the election, round and history", async ({page, browser, baseURL}) => {
  await page.goto("/en/countries/hungary/");
  const hub = page.locator('[data-country-election-history="hungary"]');
  await hub.getByRole("navigation", { name: "Available election years" }).getByRole("link", { name:"2010" }).click();
  const election = page.locator("[data-selected-election]");
  await expect(election).toHaveValue(first);
  await page.locator("[data-selected-vote-type]").selectOption(runoff);
  await page.reload();
  await expect(page.locator("[data-selected-vote-type]")).toHaveValue(runoff);
  const copied = page.url();
  await election.selectOption(next);
  await expect(election).toHaveValue(next);
  await expect(page.locator("[data-selected-vote-type]")).toHaveValue("hu_party_list_vote");
  await expect(page).not.toHaveURL(/hu10_smc/);
  await page.goBack();
  await expect(election).toHaveValue(first);
  await expect(page.locator("[data-selected-vote-type]")).toHaveValue(runoff);
  await page.goForward();
  await expect(election).toHaveValue(next);
  const fresh = await browser.newContext({baseURL});
  try {
    const tab = await fresh.newPage();
    await tab.goto(copied);
    await expect(tab.locator("[data-selected-election]")).toHaveValue(first);
    await expect(tab.locator("[data-selected-vote-type]")).toHaveValue(runoff);
    await tab.locator('a[hreflang="zh-CN"]').click();
    await expect(tab.locator("[data-selected-election]")).toHaveValue(first);
    await expect(tab.locator("[data-selected-vote-type]")).toHaveValue(runoff);
    await expect(tab).toHaveURL(url => url.pathname === "/politics/hungary/" && url.searchParams.get("election") === first);
  } finally { await fresh.close(); }
});

test("downloaded CSV and JSON retain every official result field and the three distinct seat tiers", async ({page}) => {
  await page.goto("/en/politics/hungary/?election=" + first + "&vote_type=" + runoff);
  const downloads = page.locator('[data-selected-election-download="'+first+'"]');
  await downloads.locator("xpath=ancestor::details[1]/summary").click();
  async function exported(format: string) {
    const [file] = await Promise.all([page.waitForEvent("download"), downloads.getByRole("button", {name:format,exact:true}).click()]);
    expect(file.suggestedFilename()).toBe(first + "." + format.toLowerCase());
    return readFile((await file.path())!, "utf8");
  }
  const source = recordedResults.filter(row => row.election_id === first);
  const bundle = JSON.parse(await exported("JSON"));
  expect(bundle.results).toHaveLength(source.length);
  expect(bundle.results).toEqual(source.map(row => expect.objectContaining(row)));
  expect(bundle.composition).toMatchObject({chamber_seats:386,district_seats:176,territorial_list_seats:146,national_compensation_seats:64,transferred_seats:6});
  expect(bundle.electoral_system_id).toBe("es-hu-ogy-2010");
  expect(bundle.rounds.map((r:{date:string}) => r.date)).toEqual(["2010-04-11","2010-04-25"]);

  const [header,...data] = readCsv(await exported("CSV"), ",");
  const records = data.map(row => Object.fromEntries(header.map((key,i) => [key,row[i]])));
  expect(data.length).toBe(source.length);
  for (const row of source) {
    const item = records.find(item => item.result_id === row.result_id)!;
    for (const [key,value] of Object.entries(row)) {
      expect(item[key], row.result_id + "/" + key).toBe(value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value));
    }
    expect(item.ballot_round).toBe(row.vote_type === runoff ? "2" : "1");
    expect(item.ballot_date).toBe(row.vote_type === runoff ? "2010-04-25" : "2010-04-11");
    expect(item.vote_denominator).toBe(String(row.valid_votes));
    expect(item.chamber_combined_list_tier_seats).toBe("210");
  }
});

test("an unknown election link does not select another election's results",async({page})=>{
  await page.goto("/politics/hungary/?election=unregistered-election");
  await expect(page.getByRole("status").filter({hasText:"档案中没有该届选举"})).toBeVisible();
  await expect(page.locator("#politics-system")).toHaveCount(0);
  await page.locator("[data-selected-election]").selectOption(first);
  await expect(page.locator("#politics-system")).toBeVisible();
});

test("the other nine national archives open their registered historical election and rules", async ({page}) => {
  const countries = [...new Set(registry.elections.map(e => e.country))].filter(slug => slug !== "hungary");
  expect(countries).toHaveLength(9);
  for (const slug of countries) {
    const record = registry.elections.filter(e => e.country === slug).toSorted((a,b) => a.date.localeCompare(b.date))[0];
    await page.goto("/en/politics/" + slug + "/?election=" + record.election_id);
    if (["austria","croatia","romania","slovenia"].includes(slug)) {
      await expect(page.locator("[data-ballot-year]")).toHaveValue(record.date.slice(0,4));
      await expect(page.locator("[data-ballot-rules]")).toHaveAttribute("data-ballot-rules",record.electoral_system_id);
    } else {
      await expect(page.locator("[data-selected-election]")).toHaveValue(record.election_id);
      await expect(page.locator("[data-election-period]")).toHaveAttribute("data-election-period",record.election_id);
    }
  }
});
