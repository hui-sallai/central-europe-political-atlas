import { expect, test } from "@playwright/test";
import elections from "../../src/data/political/czechia/elections.json";
import results from "../../src/data/political/czechia/election_results.json";
import contestants from "../../src/data/political/czechia/electoral_contestants.json";
import systems from "../../src/data/political/czechia/electoral_systems.json";
import sources from "../../src/data/political/czechia/political_source_registry.json";
import turnout from "../../src/data/political/czechia/election_turnout.json";

for (const en of [true, false]) {
  const locale = en ? "en" : "zh-CN";
  test("Czech election comparison restores historical rules and ballot evidence · " + locale, async ({page}) => {
    const route = (en ? "/en" : "") + "/politics/czechia/";
    for (const [left, right] of [[2017,2021],[2010,2021],[2002,2025],[2002,2006]]) {
      const pair = [left,right].map(year => elections.find(e => e.year === year)!);
      const compare = page.locator("[data-politics-compare]");
      if (left === 2017) {
        await page.goto(route + "?election=" + pair[0].election_id + "&compare=" + pair[1].election_id + "&comparison_mode=labels");
      } else {
        await page.locator("[data-selected-election]").selectOption(pair[0].election_id);
        await compare.locator("select").first().selectOption(pair[1].election_id);
        await expect(page).toHaveURL(new RegExp("compare=" + pair[1].election_id));
      }
      const rules = compare.locator("[data-czech-rule-comparison]");
      for (const [index,election] of pair.entries()) {
        const id = election.election_id;
        const system = systems.find(s => s.election_id === id)!;
        const counts = turnout.find(t => t.election_id === id)!;
        const panel = rules.locator('[data-rule-election="' + id + '"]');
        await expect(panel).toContainText(election.date + " – " + election.date_end);
        const one = election.year <= 2017;
        await expect(panel).toContainText(one ? (en ? "One scrutiny" : "一级分配") : (en ? "Two scrutinies" : "两级分配"));
        expect(await panel.locator("dd").allTextContents()).toEqual(system.national_rules.thresholds.map(t=>t.percent+"%"));
        await expect(compare.locator('[data-aggregate="voters"] th')).toHaveText(en ? "Issued envelopes" : "发出票封数");
        await expect(compare.locator('[data-aggregate="lists"] td').nth(index)).toHaveText(String(results.filter(row=>row.election_id===id).length));
        await expect(compare.locator('[data-aggregate="eligible"] td').nth(index)).toHaveText(counts.eligible_voters.toLocaleString(locale));
        await expect(compare.locator('[data-aggregate="turnout"] td').nth(index)).toHaveText(counts.published_turnout.toFixed(2));
        if (!(await panel.locator("details").evaluate(details => (details as HTMLDetailsElement).open))) {
          await panel.locator("summary").click();
        }
        for (const sourceId of system.national_rules.sourceIds) {
          await expect(panel.locator('[data-rule-source="' + sourceId + '"]')).toHaveAttribute("href",sources.find(s=>s.source_id===sourceId)!.url);
        }
        await expect(panel).toContainText(en ? "§ 48" : "第 48 条");
      }
      if (right >= 2021) {
        await expect(rules).toContainText(en ? "exact effective date is unverified" : "确切生效日期仍待核实");
        await expect(rules.getByRole("link",{name:en ? "Institutional change record" : "制度变更记录"})).toHaveAttribute("href",(en?"/en":"")+"/countries/czechia/#cz-2021-chamber-electoral-rules");
      }
      if (left === 2002) {
        const coalition = contestants.find(c => c.election_id === pair[0].election_id && c.contestant_kind === "coalition")!;
        const observed = results.find(r => r.contestant_ref === coalition.contestant_id)!;
        const row = compare.locator("[data-compare-lists] tbody tr").filter({hasText:coalition.historical_display_label});
        await expect(row.locator("td").first()).toHaveText(observed.derived_vote_share.toFixed(2) + "%" + (en?"Computed vote share":"按官方票数计算的得票率"));
        await expect(row.locator("td").nth(1)).toHaveText(String(observed.seats));
      }
    }
  });
}
