import { expect, test } from "@playwright/test";

const year02 = "el-hu-ogy-2002-04-07";
const year06 = "el-hu-ogy-2006-04-09";
const year10 = "el-hu-ogy-2010-04-11";

for (const [locale, path] of [["en", "/en/politics/hungary/"], ["zh", "/politics/hungary/"]] as const) {
  test("Early Hungarian ballots preserve their own election ID, turnout and electorate · " + locale, async ({ page }) => {
    await page.goto(path + "?election=" + year06 + "&compare=" + year02 + "&comparison_mode=labels");
    const left = page.locator("[data-selected-vote-type]");
    const right = page.locator("[data-peer-vote-type]");
    const turnout = page.locator('[data-aggregate="turnout"] td');
    const validVotes = page.locator('[data-aggregate="valid"] td');

    await expect(left).toHaveValue("hu06_territorial_list_vote");
    await expect(right).toHaveValue("hu02_territorial_list_vote");
    for (const control of [left, right]) {
      expect(await control.evaluate(el => {
        const bounds = el.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth + 1;
      })).toBe(true);
    }
    expect(await right.locator("option").evaluateAll(options => options.map(o => (o as HTMLOptionElement).value))).toEqual([
      "hu02_territorial_list_vote", "hu02_smc_round1_vote", "hu02_smc_round2_vote",
    ]);
    await expect(turnout.nth(0)).toContainText(/67\.83.*2006-04-09/);
    await expect(turnout.nth(1)).toContainText(/70\.53.*2002-04-07/);
    await expect(turnout.nth(2)).toContainText(locale === "en" ? "common turnout definition" : "统计口径");

    // With no independent choice, offer the same registered role and round in the peer election.
    await left.selectOption("hu06_smc_round2_vote");
    await expect(right).toHaveValue("hu02_smc_round2_vote");
    await expect(turnout.nth(0)).toContainText(/64\.39.*110.*2006-04-23/);
    await expect(turnout.nth(1)).toContainText(/73\.51.*131.*2002-04-21/);
    await expect(turnout.nth(2)).toContainText(locale === "en" ? "Runoff coverage" : "复选范围");
    await expect(validVotes.nth(0)).toHaveText("3,239,752");
    await expect(validVotes.nth(1)).toHaveText("4,395,458");
    await expect(validVotes.nth(2)).toHaveText("—");

    // The user's explicit choice on the right survives refresh and history navigation.
    await right.selectOption("hu02_smc_round1_vote");
    await expect(page).toHaveURL(/compare_vote_type=hu02_smc_round1_vote/);
    await page.reload();
    await expect(left).toHaveValue("hu06_smc_round2_vote");
    await expect(right).toHaveValue("hu02_smc_round1_vote");
    await expect(turnout.nth(1)).toContainText(/70\.53.*2002-04-07/);
    await page.goBack();
    await expect(right).toHaveValue("hu02_smc_round2_vote");
    await page.goForward();
    await expect(right).toHaveValue("hu02_smc_round1_vote");

    // When changing year on the left, keep the round using that year's own identifier.
    await page.locator("[data-selected-election]").selectOption(year10);
    await expect(left).toHaveValue("hu10_smc_round2_vote");
    await expect(right).toHaveValue("hu02_smc_round1_vote");
    await expect(turnout.nth(0)).toContainText(/46\.66.*57.*2010-04-25/);
    await expect(page).toHaveURL(/vote_type=hu10_smc_round2_vote/);
  });
}

test("Foreign and empty explicit Hungarian ballot IDs show a recoverable notice", async ({ page }) => {
  const path = "/en/politics/hungary/?election=" + year06 + "&compare=" + year10;
  const compare = page.locator("[data-politics-compare]");
  for (const value of ["hu06_smc_round2_vote", ""]) {
    await page.goto(path + "&compare_vote_type=" + value);
    await expect(compare.getByRole("alert")).toContainText("unavailable");
    await expect(compare.locator("[data-compare-aggregates]")).toHaveCount(0);
    await compare.locator("[data-peer-vote-type]").selectOption("hu10_smc_round1_vote");
    await expect(compare.locator('[data-aggregate="turnout"] td').nth(1)).toContainText(/64\.38.*2010-04-11/);
    await page.goBack();
    await expect(compare.getByRole("alert")).toBeVisible();
  }

  await page.goto(path + "&vote_type=hu10_smc_round2_vote");
  await expect(page.getByRole("status").filter({ hasText: "requested vote type" })).toBeVisible();
  await expect(compare).toHaveCount(0);
  await page.locator("[data-selected-vote-type]").selectOption("hu06_territorial_list_vote");
  await expect(compare.locator("[data-peer-vote-type]")).toHaveValue("hu10_territorial_list_vote");
});
