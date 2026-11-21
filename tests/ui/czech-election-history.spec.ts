import {expect, test} from "@playwright/test";
import {readFileSync} from "node:fs";
import {readFile} from "node:fs/promises";
import {activeNotebookRaw} from "./notebook-storage";

const store = (name: string) => JSON.parse(readFileSync("src/data/political/czechia/"+name+".json","utf8"));
const elections = store("elections") as {election_id:string; date:string; year:number}[];
const results = store("election_results") as {
  election_id:string; contestant_ref:string; published_vote_share:number|null; derived_vote_share:number; seats:number;
  provenance:{source_id:string; source_url:string; fields_covered:string[]}[];
}[];
const lists = store("electoral_contestants") as {contestant_id:string; historical_display_label:string; contestant_kind:string}[];
const turnout = store("election_turnout") as {election_id:string; published_turnout:number; voters:number; eligible_voters:number}[];

for (const [locale,route] of [["en","/en/politics/czechia/"],["zh-CN","/politics/czechia/"]] as const) {
  const en = locale === "en";
  test(locale+" Czech election lists, computed shares and party identity scope",async({page})=>{
    await page.goto(route+"?election="+elections[0].election_id);
    const selected = page.locator("[data-selected-election]");
    const details = page.locator("[data-results-disclosure]");
    const partyHistory = page.locator("[data-politics-history]");
    await expect(partyHistory.locator("[data-identity-coverage]")).toContainText("2017");
    await partyHistory.locator("[data-identity-coverage] button").click();
    await expect(details).toHaveAttribute("open","");
    for (const election of elections) {
      await selected.selectOption(election.election_id);
      const observation = results.filter(r=>r.election_id===election.election_id);
      const body = details.locator("tbody tr");
      await expect(body).toHaveCount(observation.length);
      await expect(details.locator("thead")).toContainText(en?"Computed vote share":"按官方票数计算的得票率");
      const coalition = observation.find(r=>lists.some(c=>c.contestant_id===r.contestant_ref && c.contestant_kind==="coalition"));
      const sample = coalition ?? observation[0];
      const name = lists.find(c=>c.contestant_id===sample.contestant_ref)!.historical_display_label;
      const selectedRow = body.filter({has:page.getByText(name,{exact:true})});
      if (coalition) await expect(selectedRow).toContainText(en?"Coalition list":"联盟名单");
      await expect(selectedRow.locator("td").nth(0)).toHaveText(sample.derived_vote_share.toLocaleString(locale,{maximumFractionDigits:3})+"%");
      await expect(selectedRow.locator("td").nth(1)).toHaveText(sample.published_vote_share===null?"—":sample.published_vote_share.toFixed(2)+"%");
      await expect(page.locator("[data-parliament-seats] svg")).toHaveAttribute("aria-label",/200\/200/);
    }
    await partyHistory.getByRole("combobox").first().selectOption({index:1});
    const table = partyHistory.locator("[data-history-table]");
    for (const year of [2002,2006,2010,2013]) {
      const row = table.locator('[data-history-year="'+year+'"]');
      await expect(row).toHaveAttribute("data-history-state","unverified_link");
      await expect(row.locator("td").nth(1)).toHaveText("—");
    }
  });

  test(locale+" Czech chamber history links each election to its official counts, rules and research export",async({page})=>{
    await page.goto(route+"?election="+elections[0].election_id+"&history_detail=seats");
    const history = page.locator("[data-history-observations]");
    await expect(history.locator("[data-turnout-point]")).toHaveCount(7);
    await expect(history.locator("[data-history-turnout-basis]")).toContainText(en?"Issued envelopes / registered voters":"信封");

    for (const election of elections) {
      const composition = history.locator('[data-history-composition="'+election.election_id+'"]');
      const point = turnout.find(r=>r.election_id===election.election_id)!;
      const turnoutRow = history.locator("tbody tr").filter({hasText:election.date});
      await expect(turnoutRow).toContainText(point.published_turnout.toLocaleString(locale)+"%");
      await expect(turnoutRow).toContainText(point.voters.toLocaleString(locale)+" / "+point.eligible_voters.toLocaleString(locale));
      await expect(turnoutRow).toContainText(/envelopes/i);
      await composition.locator("summary").click();
      await expect(composition.locator("[data-history-allocation]")).toContainText(election.year < 2021 ? (en?"One scrutiny":"一级分配") : (en?"Two scrutinies":"两级分配"));
      const winners = results.filter(r=>r.election_id===election.election_id && r.seats>0);
      await expect(composition.locator("[data-seat-contestant]")).toHaveCount(winners.length);
      const winner = winners.find(r=>lists.some(c=>c.contestant_id===r.contestant_ref && c.contestant_kind==="coalition")) ?? winners[0];
      const share = winner.seats/200*100;
      await expect(composition.locator('[data-seat-contestant="'+winner.contestant_ref+'"]')).toContainText(share.toLocaleString(locale)+"%");
      await expect(composition.locator("[data-seat-source]").first()).toHaveAttribute("href",winner.provenance.find(p=>p.fields_covered.includes("seats"))!.source_url);
      await expect(composition.getByRole("link",{name:en?"Electoral rules for this election":"本届选举适用规则"})).toHaveAttribute("href",route+"?election="+election.election_id+"#politics-system");
    }
    const [download] = await Promise.all([page.waitForEvent("download"),history.getByRole("button",{name:en?"Seat composition CSV":"席位构成 CSV",exact:true}).click()]);
    const csv = await readFile((await download.path())!,"utf8");
    expect(csv).toContain("chamber_share_percent");
    expect(csv).toContain('"ct-cz-ps2002-25"');
    expect(csv).toContain('"15.5"');
    expect(csv).toContain("PS2002_reg_20230428_csv.zip");
    await history.getByRole("button",{name:en?"Save seat compositions":"保存席位构成",exact:true}).click();
    await expect.poll(()=>activeNotebookRaw(page)).toContain("PS2002_reg_20230428_csv.zip");
  });
}
