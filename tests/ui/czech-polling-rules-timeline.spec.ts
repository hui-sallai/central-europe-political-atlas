import {expect,test} from "@playwright/test";
import elections from "../../src/data/political/czechia/elections.json";
import systems from "../../src/data/political/czechia/electoral_systems.json";
import sources from "../../src/data/political/czechia/political_source_registry.json";

for (const [prefix,en] of [["/en",true],["",false]] as const) {
  test("Czech institutional timeline links every polling period to its own statutory text "+(en?"EN":"ZH"),async({page})=>{
    await page.goto(prefix+"/countries/czechia/#history-czechia");
    const timeline=page.locator("#history-czechia");
    await expect(timeline).toHaveJSProperty("open",true);
    await expect(timeline.locator("[data-timeline-election]")).toHaveCount(7);
    for (const election of elections) {
      await expect(timeline.locator('[data-timeline-election="'+election.election_id+'"]')).toHaveAttribute("href",prefix+"/politics/czechia/?election="+election.election_id);
      const rules=timeline.locator("#"+election.electoral_system_id);
      await rules.locator("summary").click();
      expect(await rules.locator("time").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("datetime")))).toEqual([election.date,election.date_end]);
      const system=systems.find(s=>s.electoral_system_id===election.electoral_system_id)!;
      for (const id of system.national_rules.sourceIds) {
        await expect(rules.locator('[data-polling-rule-source="'+id+'"]')).toHaveAttribute("href",sources.find(s=>s.source_id===id)!.url);
      }
    }
    const change=timeline.locator("#cz-2021-chamber-electoral-rules");
    await change.locator("summary").click();
    await expect(change.getByText(en?"Effective date":"生效日期",{exact:true}).locator("..")).toContainText(en?"Unrecorded":"未登记");
    await expect(change).toContainText(en?"Between the 2017 and 2021 elections":"介于 2017 与 2021 年选举之间");
  });

  test("The selected Czech election restores its own rule on the institutional timeline "+(en?"EN":"ZH"),async({page})=>{
    const election=elections.find(e=>e.year===2010)!;
    await page.goto(prefix+"/politics/czechia/?election="+election.election_id);
    const period=page.locator('[data-election-period="'+election.election_id+'"]');
    await period.locator("summary").click();
    await period.getByRole("link",{name:en?"Polling dates and the applicable statutory text":"投票日期及当届适用的法规文本"}).click();
    const rules=page.locator("#"+election.electoral_system_id);
    await expect(rules).toHaveJSProperty("open",true);
    await expect(rules.locator("[data-polling-rule-source]")).toBeVisible();
    await page.reload();
    await expect(rules.locator("[data-polling-rule-source]")).toBeVisible();
  });
}
