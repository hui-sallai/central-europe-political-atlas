import { expect, test } from "@playwright/test";
import contestants from "../../src/data/political/hungary/electoral_contestants.json";
import results from "../../src/data/political/hungary/election_results.json";

const first = "el-hu-ogy-2006-04-09";
const second = "el-hu-ogy-2002-04-07";
const listVotes = ["hu06_territorial_list_vote", "hu02_territorial_list_vote"];
const sourceLabels = new Map(contestants.map(c => [c.contestant_id, c.historical_display_label]));
const lists = results.filter(r => listVotes.includes(r.vote_type));
const labels = [...new Set(lists.map(r => sourceLabels.get(r.contestant_ref)!))].sort();

for (const en of [true, false]) {
  const locale = en ? "en" : "zh-CN";
  const route = (en ? "/en" : "") + "/politics/hungary/";
  test("Hungarian ballot shares, list and whole-chamber seats and all recorded entrants · " + locale, async ({page}) => {
    await page.goto(route + "?election=" + first + "&compare=" + second + "&comparison_mode=labels");
    const panel = page.locator("[data-ballot-label-comparison]");
    const table = panel.getByRole("table");
    const row = (label: string) => table.getByRole("row").filter({has:page.getByRole("rowheader",{name:label,exact:true})});
    const pct = en ? "Computed vote share" : "按官方票数计算的得票率";
    const ms = row("MSZP");
    await expect(panel.locator("[data-identity-limitation]")).toContainText(en ? "party continuity" : "跨届政党身份");
    for (const [id,vote,combined,full] of [[first,"43.21",88,186],[second,"42.05",100,178]] as const) {
      await expect(ms.locator('[data-comparison-share="'+id+'"]')).toHaveText(vote + "%" + pct);
      await expect(ms.locator('[data-seat-election="'+id+'"][data-seat-field="seats"]')).toHaveText(String(combined));
      await expect(ms.locator('[data-seat-election="'+id+'"][data-seat-field="chamberSeats"]')).toHaveText(String(full));
    }
    await expect(row("MIÉP-Jobbik").locator('[data-seat-field="seats"][data-seat-election="'+first+'"]')).toHaveText("0");
    await expect(row("MIÉP-Jobbik").locator('[data-comparison-share="'+first+'"]')).toHaveText("2.20%" + pct);
    await expect(row("MIÉP-Jobbik").locator('[data-seat-field="seats"][data-seat-election="'+second+'"]')).toHaveText("—");
    await expect(row("MIÉP").locator('[data-comparison-share="'+second+'"]')).toHaveText("4.37%" + pct);
    await expect(table.getByRole("columnheader",{name:en ? /territorial \+ compensation/i : /地区＋补偿/})).toHaveCount(2);
    await expect(table.getByRole("rowheader")).not.toHaveCount(labels.length);
    await panel.getByRole("checkbox",{name:en ? /Show all recorded ballot labels/ : /显示全部已收录的选票名称/}).check();
    expect((await table.getByRole("rowheader").allTextContents()).sort()).toEqual(labels);
    await panel.getByRole("checkbox",{name:en ? "Show individual seat tiers" : "展开各层席位"}).check();
    for (const [id,territorial,compensation,constituency] of [[first,71,17,98],[second,69,31,78]] as const) {
      for (const [key,value] of [["territorialSeats",territorial],["compensationSeats",compensation],["constituencySeats",constituency]] as const) {
        await expect(ms.locator('[data-seat-election="'+id+'"][data-seat-field="'+key+'"]')).toHaveText(String(value));
      }
    }

    // The runoff and the other election's territorial list deliberately have different denominators.
    await page.goto(route + "?election=" + first + "&vote_type=hu06_smc_round2_vote&compare=" + second
      + "&compare_vote_type=hu02_territorial_list_vote&comparison_mode=labels");
    await expect(ms.locator('[data-comparison-share="'+first+'"]')).toHaveText("46.62%" + pct);
    await expect(ms.locator('[data-seat-election="'+first+'"][data-seat-field="districtSeatsThisRound"]')).toHaveText(
      "64" + (en ? "From final and first-round counts" : "按最终和首轮席数计算"));
    await expect(ms.locator('[data-comparison-share="'+second+'"]')).toHaveText("42.05%" + pct);
    await expect(panel.locator('[data-share-denominator="'+first+'"]')).toContainText("3,239,752");
    await expect(panel.locator('[data-share-denominator="'+second+'"]')).toContainText("5,616,750");
  });
}
