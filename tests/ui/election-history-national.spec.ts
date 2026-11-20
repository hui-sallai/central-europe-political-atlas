import {test,expect} from "@playwright/test";
import {readFile} from "node:fs/promises";

const hu=["el-hu-ogy-2014-04-06","el-hu-ogy-2018-04-08","el-hu-ogy-2022-04-03","el-hu-ogy-2026-04-12"];

test("Hungarian election pairs preserve both ballot scopes, constituency seats and count-derived turnout",async({page})=>{
  await page.goto("/en/politics/hungary/?election="+hu[0]);
  const panel=page.locator("[data-politics-explorer]");
  const compare=panel.locator("[data-politics-compare]");
  for(let i=0;i<3;i++){
    await compare.locator("select").selectOption(hu[i+1]);
    await expect(compare.locator('[data-aggregate="turnout"]')).toContainText(["+7.9 pp","−0.1 pp","+9.4 pp"][i]);
    const details=compare.locator("[data-paired-elections]");
    await details.evaluate((el:HTMLDetailsElement)=>{el.open=true;});
    await expect(details.locator("[data-comparison-column]")).toHaveCount(2);
    await expect(details).toContainText("National list seats 93");
    await expect(details).toContainText("Single-member district seats 106");
    if(i===0)await expect(details).toContainText("Independent district seats included 1");
    await details.locator("[data-comparison-column] details").first().evaluate((el:HTMLDetailsElement)=>{el.open=true;});
    await expect(details.locator("table").first().getByRole("columnheader",{name:"Vote share (%)"})).toBeVisible();
    await expect(compare).toContainText("199");
    await panel.locator("[data-election-step]").getByRole("button",{name:/Next election/}).click();
    await expect(page).toHaveURL(new RegExp("election="+hu[i+1]));
  }
  await page.goto("/en/politics/hungary/?election="+hu[1]+"&vote_type=hu_nationality_list_vote&compare="+hu[2]);
  const paired=page.locator("[data-paired-elections]");
  await paired.locator("summary").first().click();
  await expect(paired.locator("[data-comparison-column]").nth(1)).toContainText(/Nationality|Nationalit/i);
  await expect(paired.locator("[data-comparison-column]").nth(1).getByRole("link").first()).toHaveAttribute("href",/vote_type=hu_nationality_list_vote/);
});

test("Historical turnout and seat exports retain dates, denominators, original sources and the 2018 independent seat",async({page})=>{
  await page.goto("/en/politics/hungary/?election="+hu[1]);
  const history=page.locator("[data-history-observations]");
  await expect(history.locator("[data-turnout-point]")).toHaveCount(5); // 2010 (printed round-1 turnout) admitted 2026-11-20
  await history.locator("[data-history-details] > summary").click();
  await history.getByLabel("2026-04-12",{exact:true}).uncheck();
  await expect(history.locator("[data-turnout-point]")).toHaveCount(4);
  for(const [id,contestant,seats,minority] of [[hu[1],"ct-hu-ogy18-p13",133,"ct-hu-ogy18-n01"],[hu[2],"ct-hu-ogy22-p06",135,"ct-hu-ogy22-n10"]] as const){
    const composition=history.locator('[data-history-composition="'+id+'"]');
    await composition.locator("summary").click();
    await expect(composition.locator('[data-seat-contestant="'+contestant+'"]')).toContainText(String(seats));
    await expect(composition.locator('[data-seat-contestant="'+minority+'"]')).toContainText(" · 1");
    await expect(composition).toContainText("National list seats 93");
  }
  for(const kind of ["Turnout CSV","Seat composition CSV"]){
    const [download]=await Promise.all([page.waitForEvent("download"),history.getByRole("button",{name:kind,exact:true}).click()]);
    const csv=await readFile((await download.path())!,"utf8");
    expect(csv).toContain("2018-04-08");
    expect(csv).not.toContain(hu[3]);
    expect(csv).toContain("https://");
    if(kind==="Turnout CSV")expect(csv).toContain("computed_from_counts");
    else {
      const lines=csv.trim().split(/\r?\n/).slice(1);
      for(const id of [hu[1],hu[2]]) for(const breakdown of ["whole_chamber_attribution","allocation_mechanism"]){
        const counts=lines.filter(line=>line.includes('"'+id+'"')&&line.includes('"'+breakdown+'"')).map(line=>Number(line.match(/,"(\d+)"$/)?.[1]));
        expect(counts.reduce((sum,n)=>sum+n,0)).toBe(199);
      }
      expect(csv).toContain('"Independent district seats","1"');
    }
  }
  await expect(page.locator("[data-parliament-seats] svg")).toHaveAttribute("aria-label",/199\/199/);
  await expect(page.locator("[data-parliament-seats]")).toContainText("Independent district seats");
  const resources=page.locator("details").filter({has:page.getByText("Sources, provenance and downloads",{exact:true})});
  await resources.locator("summary").first().click();
  const [jsonFile]=await Promise.all([page.waitForEvent("download"),resources.getByRole("button",{name:"JSON",exact:true}).click()]);
  const json=JSON.parse(await readFile((await jsonFile.path())!,"utf8"));
  expect(json.composition.independent_district_seats).toBe(1);
  expect(new Set(json.results.map((r:{vote_type:string})=>r.vote_type)).size).toBe(2);
  expect(json.results.reduce((n:number,r:{whole_chamber_seats:number})=>n+r.whole_chamber_seats,0)+1).toBe(199);
  await page.locator('a[hreflang="zh-CN"]').click();
  await expect(history.locator("[data-turnout-point]")).toHaveCount(4);
  await expect(page).toHaveURL(/history_events=/);
});

test("Slovakia has a single historical turnout point; Croatia can compare two diaspora ballots",async({page})=>{
  await page.goto("/politics/slovakia/");
  await expect(page.locator("[data-turnout-point]")).toHaveCount(1);
  await page.goto("/en/politics/croatia/?election=el-hr-sabor-2024-04-17&ballot=hr-ie-11&compare_country=croatia&compare_election=el-hr-sabor-2020-07-05&compare_ballot=hr-ie-11");
  const compare=page.locator("[data-comparison-picker]");
  await expect(compare.locator("[data-scoped-comparison] article")).toHaveCount(2);
  for(const part of await compare.locator("[data-scoped-comparison] article").all()){
    await expect(part).toContainText("Constituency abroad");
    await expect(part).toContainText("Seat-share denominator · 3");
  }
  await expect(compare.locator("[data-same-country-turnout]")).toBeVisible();
  await page.reload();
  await expect(compare.getByLabel("Comparison ballot")).toHaveValue("hr-ie-11");
});
