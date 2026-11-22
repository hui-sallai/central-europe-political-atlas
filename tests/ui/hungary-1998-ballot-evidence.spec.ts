import {expect, test} from "@playwright/test";

const election = "el-hu-ogy-1998-05-10";
const composite = "hu98_territorial_list_valid_round_vote";
const round1 = "hu98_smc_round1_vote";
const round2 = "hu98_smc_round2_vote";

for (const prefix of ["/en", ""]) {
  const en = prefix === "/en";
  test("1998 territorial ballot, residual and all-district first-round evidence · " + (prefix || "zh"),async({page})=>{
    await page.goto(prefix + "/politics/hungary/?election=" + election);
    const selector = page.locator("[data-selected-vote-type]");
    await expect(selector).toHaveValue(composite);
    await expect(selector.locator("option")).toHaveCount(3);
    await expect(page.locator("[data-composite-scope]")).toContainText("1998-05-10 – 1998-05-24");
    await expect(page.locator("[data-composite-summary]")).toContainText(/4,547,682.*15.*32.92%/);
    const chart = page.locator('[data-politics-chart="votes-seats"]');
    await expect(chart.locator("[data-vote-chart-basis]")).toContainText("1998-05-10 – 1998-05-24");
    await expect(chart.locator("[data-vote-chart-basis] a")).toHaveAttribute("href",/v98din2\/l120.htm$/);
    for (const [row, expected] of [["t01","32.92%"],["t02","29.48%"],["t07","2.80%"]]) {
      await expect(chart.locator('[data-chart-list="ct-hu-ogy98-'+row+'"]')).toContainText(expected);
    }
    const evidence=page.locator("[data-composite-evidence]");
    await evidence.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(evidence.locator('[data-composite-round="1"]')).toContainText(en?/18 territorial districts.*4,064,201.*Published total/:/18 个地区选区.*4,064,201.*官方公布总数/);
    const repeat=evidence.locator('[data-composite-round="2"]');
    await expect(repeat).toContainText(en?/2 territorial districts.*483,481.*Calculated/:/2 个地区选区.*483,481.*减去/);
    await expect(repeat).toContainText(/427,395.*56.16%.*99.03%.*0.97%/);
    await expect(repeat).toContainText(/440,557.*56.56%.*98.63%.*1.37%/);
    const actual = evidence.locator("[data-actual-first-round]");
    await expect(actual).toContainText(/1998-05-10.*20.*8,062,708.*4,536,254.*56.26%.*4,532,375.*4,483,974.*48,401/);
    await expect(actual.getByRole("link")).toHaveAttribute("href",/ovbk1.htm$/);
    await expect(evidence.locator('a[href$="/v98din1/l22.htm"]')).toBeVisible();
    await expect(evidence.locator('a[href$="/v98din2/l100t.htm"]')).toBeVisible();
    const results=page.locator("[data-results-disclosure]");
    await results.locator("summary").click();
    await expect(results.locator("tbody tr")).toHaveCount(15);
    await expect(results.locator("caption")).toHaveText(en?"Published vote share":"官方公布的得票率");
    await expect(results.getByRole("row",{name:/^MDF /})).toContainText("2.80%");
    const rules=page.locator("[data-national-thresholds]");
    await expect(rules).toContainText(en?/exceed 5%/:/超过 5%/);
    await expect(rules).toContainText(en?/reach 10%.*no joint or linked list stood/:/达到同一总数的 10%.*没有联合或关联名单/);
    await expect(rules).toContainText(en?/reach 15%/:/达到同一总数的 15%/);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });

  test("1998 candidate attributions, final seats and source vintages · "+(prefix || "zh"),async({page})=>{
    await page.goto(prefix+"/politics/hungary/?election="+election+"&vote_type="+round1);
    const selector=page.locator("[data-selected-vote-type]");
    await expect(selector).toHaveValue(round1);
    const rounds=page.locator("[data-election-round-details]");
    await expect(rounds.locator('[data-election-round="1"]')).toContainText(/1998-05-10.*176.*56.26%.*4,536,254.*8,062,708/);
    await expect(rounds.locator('[data-election-round="2"]')).toContainText(/1998-05-24.*175.*57.01%.*4,570,386.*8,016,397/);
    const discrepancy=page.locator("[data-candidate-evidence]");
    await discrepancy.locator("summary").click();
    await expect(discrepancy.getByRole("row",{name:/Fidesz/})).toContainText(/956,008.*956,106/);
    await expect(discrepancy.getByRole("row",{name:/SZDSZ/})).toContainText(/456,008.*455,910/);
    await expect(discrepancy).toContainText(en?"no explanation":"未说明");
    await expect(discrepancy.getByRole("link")).toHaveCount(2);
    const results=page.locator("[data-results-disclosure]");
    await results.locator("summary").click();
    await expect(results.getByRole("row",{name:/^Fidesz /})).toContainText(en?"Party total apportioned":"按提名政党分摊");
    await expect(results.getByRole("row",{name:/^Független /})).toContainText(en?"Independent candidates combined":"独立候选人合计");
    await expect(results.getByRole("columnheader",{name:en?"Round-one seats on the same basis":"第一轮已决席位（同一归属口径）"})).toBeVisible();
    const representation=page.locator("[data-vote-seat-table]");
    await expect(representation.locator("th").first()).toHaveText(en ? "Entry in the national table" : "全国汇总表中的参选项");
    const independent=representation.locator("tbody tr").filter({has:page.getByText("Független",{exact:true})});
    await expect(independent).toContainText(en?"Independent candidates combined":"独立候选人合计");
    await expect(independent).not.toContainText(en?"party ID":"政党 ID");
    await selector.selectOption(round2);
    const groups=page.locator("[data-candidate-evidence]");
    if (!await groups.evaluate(el=>(el as HTMLDetailsElement).open)) await groups.locator("summary").click();
    await expect(groups).toContainText(en?"round assignment is inferred":"票数所属轮次据此推断");
    await expect(groups).toContainText(en?"includes the constituency decided in round one":"包含首轮即已决出的选区");
    const componentRows=groups.locator("tbody tr");
    for (const [i,[name,votes,seats]] of [["Fidesz","1,085,538","55"],["Fidesz-MDF","620,617","35"],["MDF","22,714","2"],["MDF-Fidesz","334,177","15"]].entries()) {
      await expect(componentRows.nth(i).locator("th span")).toHaveText(name);
      await expect(componentRows.nth(i).locator("td").nth(1)).toHaveText(votes);
      await expect(componentRows.nth(i).locator("td").nth(2)).toHaveText(seats);
    }
    await expect(groups.locator('a[href$="/v98din2/l23a.htm"]')).toBeVisible();
    await expect(results.getByRole("columnheader",{name:/Districts settled|本轮确定/})).toHaveCount(0);
    const metrics=page.locator("[data-politics-research-details]");
    await expect(metrics.locator("dt",{hasText:en?"Invalid ballots":"无效票"}).locator("..")).toContainText("—");
    const chamber=rounds.locator("[data-chamber-reconciliation]");
    await expect(chamber.locator('[data-outside-list-kind="joint_candidates_without_list"]')).toContainText(/50.*Fidesz-MDF.*35.*MDF-Fidesz.*15/);
    await selector.selectOption(composite);
    await expect(page.locator("[data-composite-scope]")).toBeVisible();
    await expect(metrics).not.toContainText("8,016,397");
    await expect(metrics).toContainText("4,547,682");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
