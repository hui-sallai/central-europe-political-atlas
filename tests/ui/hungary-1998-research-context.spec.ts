import {expect, test, type Locator, type Page} from "@playwright/test";
import {readFile} from "node:fs/promises";
import {activeNotebookRaw} from "./notebook-storage";
import officialTurnout from "../../src/data/political/hungary/election_turnout.json";
import officialResults from "../../src/data/political/hungary/election_results.json";

const id = "el-hu-ogy-1998-05-10";
const composite = "hu98_territorial_list_valid_round_vote";
const first = "hu98_smc_round1_vote";
const second = "hu98_smc_round2_vote";
async function downloadText(page:Page, button:Locator) {
  const [file] = await Promise.all([page.waitForEvent("download"),button.click()]);
  return readFile((await file.path())!, "utf8");
}

for (const prefix of ["/en",""]) {
  test("1998 ballot evidence, downloadable data and Notebook scope · "+(prefix||"zh"),async({page})=>{
    await page.goto(prefix+"/politics/hungary/?election="+id);
    const record=page.locator("[data-selected-election-download]");
    await record.locator("xpath=ancestor::details[1]/summary").click();
    const exported=JSON.parse(await downloadText(page,record.getByRole("button",{name:"JSON",exact:true})));
    const ballots=officialTurnout.filter(b=>b.election_id===id);
    expect(exported.ballots.map((b:{vote_type:string})=>b.vote_type)).toEqual(ballots.map(b=>b.vote_type));
    for(const ballot of exported.ballots) {
      expect(ballot.turnout_record).toMatchObject(ballots.find(b=>b.vote_type===ballot.vote_type)!);
      expect(ballot.ballot_source_url).toContain("valasztas.hu/");
    }
    expect(exported.ballots[0]).toMatchObject({ballot_date:null,ballot_date_start:"1998-05-10",ballot_date_end:"1998-05-24",round_scope:"valid_round_composite"});
    expect(exported.rounds.map((r:{sourceBallotId:string})=>r.sourceBallotId)).toEqual([first,second]);
    const rows=officialResults.filter(r=>r.election_id===id);
    expect(exported.results).toHaveLength(rows.length);
    for(const r of rows) expect(exported.results.find((e:{vote_type:string;contestant_ref:string})=>e.vote_type===r.vote_type && e.contestant_ref===r.contestant_ref)).toMatchObject(r);
    const csv=await downloadText(page, record.getByRole("button",{name:"CSV",exact:true}));
    for(const required of ["round_scope","actual_round1_ballot","round_composition","turnout_basis","geographic_scope","ballot_date_end","nomination_group_basis","round1_table_note","chamber_constituency_seats_outside_lists","4483974","483481",'"2.80"'])
      expect(csv).toContain(required);

    for (const [index,ballot] of [composite,first,second].entries()) {
      await page.locator("[data-selected-vote-type]").selectOption(ballot);
      await page.locator("[data-selected-election-collect] [data-notebook-add]").click();
      await expect.poll(async()=>JSON.parse(await activeNotebookRaw(page)).items?.length).toBe(index+1);
      const notebook=JSON.parse(await activeNotebookRaw(page));
      const item=notebook.items.find((i:{url:string})=>new URL(i.url).searchParams.get("vote_type")===ballot)!;
      expect(item.metadata.filters.vote_type).toBe(ballot);
      expect(item.metadata.filters.round_scope).toBe(index ? "single_round" : "valid_round_composite");
      expect(item.metadata.filters.attribution_basis).toBe(index ? "source_apportioned_party_total" : "original_list");
      expect(item.metadata.filters.source_urls.length).toBeGreaterThan(0);
      if(index===0) {
        expect(item.periods).toEqual(["1998-05-10","1998-05-24"]);
        expect(item.metadata.filters).toMatchObject({round1_districts:18,round2_districts:2,territorial_districts:20});
        expect(item.metadata.filters).not.toHaveProperty("round");
      } else {
        expect(item.periods).toEqual([index===1 ? "1998-05-10":"1998-05-24"]);
        expect(item.metadata.filters.constituencies).toBe(index===1 ? 176:175);
      }
    }
  });

  test("1998 and 2002 ballots preserve independent selection · "+(prefix||"zh"),async({page})=>{
    await page.goto(prefix+"/politics/hungary/?election="+id+"&compare=el-hu-ogy-2002-04-07&comparison_mode=labels");
    const left=page.locator("[data-selected-vote-type]"), right=page.locator("[data-peer-vote-type]");
    const turnout=page.locator('[data-aggregate="turnout"] td');
    await expect(left).toHaveValue(composite);
    await expect(right).toHaveValue("hu02_territorial_list_vote");
    await expect(turnout.nth(0)).toContainText("—");
    await expect(turnout.nth(2)).toContainText("—");
    await expect(page.locator("[data-ballot-label-comparison]")).toContainText("32.92%");
    await right.selectOption("hu02_smc_round2_vote");
    await left.selectOption(first);
    await page.reload();
    await expect(left).toHaveValue(first);
    await expect(right).toHaveValue("hu02_smc_round2_vote");
    await expect(turnout.nth(0)).toContainText("56.26");
    await expect(turnout.nth(2)).toContainText("—");
    await left.selectOption(second);
    await left.selectOption(composite);
    await expect(turnout.nth(0)).toContainText("—");
    await page.goBack();
    await expect(left).toHaveValue(second);
    await expect(right).toHaveValue("hu02_smc_round2_vote");
    await expect(turnout.nth(0)).toContainText("57.01");
  });
}
