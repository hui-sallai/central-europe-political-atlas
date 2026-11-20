import {expect,test} from "@playwright/test";

const first="el-hu-ogy-2010-04-11";
const second="el-hu-ogy-2014-04-06";
const runoff="hu10_smc_round2_vote";
const national="hu_party_list_vote";

for (const [prefix, en] of [["/en",true],["",false]] as const) {
  test("Hungary's two electoral systems, independent ballots and legal dates "+(en?"EN":"ZH"),async({page})=>{
    const path=prefix+"/politics/hungary/";
    await page.goto(path+"?election="+first+"&vote_type=hu10_territorial_list_vote&compare="+second+"#politics-compare-title");
    const comparison=page.locator("[data-system-break-comparison]");
    const former=comparison.locator('[data-comparison-system="'+first+'"]');
    const latter=comparison.locator('[data-comparison-system="'+second+'"]');
    await expect(former).toContainText("386");
    await expect(latter).toContainText("199");
    await expect(former.locator("[data-comparison-tiers]")).toContainText(/176.*146.*64/);
    await expect(latter.locator("[data-comparison-tiers]")).toContainText(/106.*93/);
    await expect(former.locator("[data-comparison-turnout]")).toContainText(/64.38%.*2010-04-25.*57.*46.66%/);
    await expect(latter.locator("[data-comparison-turnout]")).toContainText("5,096,524 / 8,241,488");
    await expect(page.locator("[data-peer-vote-type]")).toHaveValue(national);
    await expect(comparison.locator("[data-linked-unit],[data-label-row],[data-aggregate]")).toHaveCount(0);
    for (const [column,seats] of [[former,386],[latter,199]] as const) {
      await column.locator("[data-comparison-chamber] > summary").click();
      const parts=await column.locator("[data-comparison-chamber] li").allTextContents();
      expect(parts.reduce((sum,row)=>sum+Number(row.match(/·\s*(\d+)\s*\//)?.[1]),0)).toBe(seats);
      await column.locator("[data-comparison-rules] > summary").click();
      await expect(column.locator("[data-comparison-rules]")).toContainText("10%");
    }
    await expect(former.locator("[data-comparison-chamber]")).toContainText("FIDESZ-KDNP-MVMP");
    await expect(former.locator("[data-comparison-rules]")).toContainText(en?"No verified period boundary":"尚无已核实的时期边界");
    await expect(latter.locator("[data-comparison-rules]")).toContainText("2012-01-01");
    await expect(former.locator("[data-comparison-rules]")).not.toContainText("15%");
    await expect(latter.locator("[data-comparison-rules]")).toContainText("15%");
    await expect(former.locator("[data-comparison-column]")).toContainText("5,132,531");
    await page.locator("[data-peer-vote-type]").selectOption("hu_nationality_list_vote");
    await page.reload();
    await expect(latter.locator("[data-comparison-column]")).toContainText(en?"Nationality":"民族名单");
    await expect(former.locator("[data-comparison-column]")).toContainText(en?"Territorial-list":"地区名单");
    await comparison.getByRole("link",{name:en?"Electoral reform, legal dates and sources":"选制改革、法律日期与来源"}).click();
    const timeline=page.locator("#hungary-electoral-system-transition");
    await expect(timeline).toHaveJSProperty("open",true);
    await timeline.getByText(en?"Legal dates and sources":"法律日期与来源",{exact:true}).click();
    await expect(timeline).toContainText("2012-01-01");
    await expect(timeline).toContainText(en?"Separate adoption and commencement dates":"未单列选举法");
    await expect(timeline.locator('[data-transition-source="src-hu-act-ccIII-2011"]')).toHaveAttribute("href",/\/2011-203-00-00$/);
    await expect(timeline.locator('[data-transition-source="src-hu-nvi-mandleir-2010"]')).toHaveAttribute("href",/mandleir.htm$/);
    await timeline.getByRole("link",{name:en?"Compare both electoral systems and results":"比较两届选制与结果"}).click();
    await expect(comparison).toBeVisible();
  });
}

test("Historical ballots are selectable on the right and invalid peer codes require correction",async({page})=>{
  await page.goto("/en/politics/hungary/?election="+second+"&vote_type="+national+"&compare="+first+"&compare_vote_type="+runoff);
  const peer=page.locator('[data-comparison-system="'+first+'"] [data-comparison-column]');
  await expect(peer).toContainText("2010-04-25");
  await expect(peer).toContainText("46.66%");
  await expect(peer).not.toContainText("64.38%");
  await page.goto("/en/politics/hungary/?election="+second+"&compare="+first+"&compare_vote_type=unrecorded");
  await expect(page.locator("[data-politics-compare] [role=alert]")).toBeVisible();
  await expect(page.locator("[data-system-break-comparison]")).toHaveCount(0);
  await page.locator("[data-peer-vote-type]").selectOption(runoff);
  await expect(peer).toBeVisible();
  await page.goBack();
  await expect(page.locator("[data-politics-compare] [role=alert]")).toBeVisible();
});

test("The selected runoff keeps its electorate and vote basis in the national cross-country table",async({page})=>{
  await page.goto("/en/politics/hungary/?election="+first+"&vote_type="+runoff+"&compare_country=poland&compare_election=el-pl-sejm-2023-10-15");
  const panel=page.locator("[data-country-comparison]");
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-fact="turnout"]')).toContainText(/46.66%.*2010-04-25.*57 runoff constituencies/);
  await expect(panel.locator('[data-fact="valid"] th')).toHaveText("Valid votes for the selected ballot");
  const results=panel.locator('[data-country-lists="hungary"]');
  await expect(results.locator("th").first()).toContainText("Nominating organisation");
  await expect(results.locator('[data-seat-scope="unavailable"]').first()).toBeVisible();
  await expect(results).not.toContainText("list tier only");
});
