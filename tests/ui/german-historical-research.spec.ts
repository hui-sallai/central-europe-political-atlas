import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { activeNotebookRaw } from "./notebook-storage";
import officialResults from "../../src/data/political/germany/election_results.json";
import officialTurnout from "../../src/data/political/germany/election_turnout.json";

async function downloadText(page: Page, button: Locator) {
  const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
  return readFile((await download.path())!, "utf8");
}

const firstElection = "el-de-bt-1990-12-02";
for (const prefix of ["/en", ""]) {
  test("German historical ballots retain their scope in the page, export and Notebook " + prefix, async ({ page }) => {
    await page.goto(prefix + "/politics/germany/?election=" + firstElection + "&vote_type=first_vote");
    const elections = page.locator("[data-selected-election]");
    const ballots = page.locator("[data-selected-vote-type]");
    await expect(elections.locator("option")).toHaveCount(10);
    const denominators = [[46274925, 46455772], [46949356, 47105174], [49166580, 49308512]];
    for (const [index, id] of [firstElection, "el-de-bt-1994-10-16", "el-de-bt-1998-09-27"].entries()) {
      await elections.selectOption(id);
      await expect(ballots.locator("option")).toHaveCount(2);
      for (const [i, kind] of ["first_vote", "second_vote"].entries()) {
        await ballots.selectOption(kind);
        await expect(page.locator("[data-vote-chart-basis]")).toContainText(denominators[index][i].toLocaleString("en"));
        await expect(page.locator("[data-chart-seats]").first()).toBeVisible({visible: i === 1});
      }
    }

    await elections.selectOption(firstElection);
    const record = page.locator("[data-selected-election-download]");
    await record.locator("xpath=ancestor::details[1]/summary").click();
    for (const [index, kind] of ["first_vote", "second_vote"].entries()) {
      await ballots.selectOption(kind);
      const expected = officialResults.filter(row => row.election_id === firstElection && row.vote_type === kind);
      const turnout = officialTurnout.find(row => row.election_id === firstElection && row.vote_type === kind)!;
      const denominator = turnout.valid_votes ?? turnout.valid_second_votes;
      const result = JSON.parse(await downloadText(page, record.getByRole("button", { name: "JSON" })));
      expect(result.selected_vote_type).toBe(kind);
      expect(result.results).toHaveLength(expected.length);
      expected.forEach((row, i) => expect(result.results[i]).toMatchObject({...row, vote_denominator: denominator}));
      if (kind === "second_vote") {
        expect(result.electoral_area_valid_second_votes).toEqual({ west:37426103, east:9029669 });
      } else {
        expect(result).not.toHaveProperty("chamber_allocation");
        expect(result.results.every((r: {seats: number | null}) => r.seats === null)).toBe(true);
        expect(result.results.find((r: {contestant_label: string}) => r.contestant_label === "EFP")).toBeDefined();
      }
      const csv = await downloadText(page, record.getByRole("button", { name: "CSV" }));
      expect(csv).toContain("vote_denominator");
      expect(csv).toContain(String(denominator));
      expect(csv).toContain("src-de-bwl-final-archive");
      expect(csv).toContain(kind);
      await page.locator("[data-selected-election-collect] [data-notebook-add]").click();
      await expect.poll(async () => JSON.parse(await activeNotebookRaw(page)).items?.length).toBe(index + 1);
      const notebook = JSON.parse(await activeNotebookRaw(page));
      const item = notebook.items[index];
      expect(item.metadata.filters).toMatchObject({election: firstElection, vote_type: kind, vote_denominator: denominator,
        seat_scope: kind === "first_vote" ? "unavailable" : "whole_chamber"});
      expect(new URL(item.url).searchParams.get("vote_type")).toBe(kind);
      expect(item.periods).toEqual(["1990-12-02"]);
    }
    expect(officialResults).toHaveLength(384);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("German territorial rules and final mandates follow the selected election " + prefix, async ({ page }) => {
    await page.goto(prefix + "/politics/germany/?election=" + firstElection);
    const panel = page.locator("[data-german-historical-allocation]");
    await expect(panel).toBeVisible();
    const areas = panel.locator("[data-german-threshold-areas]");
    await expect(areas).toContainText("37,426,103");
    await expect(areas).toContainText("9,029,669");
    const rows = areas.locator("[data-german-area-results] tbody tr");
    await expect(rows).toHaveCount(3);
    for (const [label, national, regional, seats] of [["PDS", "2.4%", "11.1%", "17"],
      ["B90/Gr.", "1.2%", "6.1%", "8"], ["GRÜNE", "3.8%", "4.8%", prefix ? "No seat awarded" : "未获席位"]]) {
      const row = rows.filter({ has: page.getByRole("rowheader", {name:label, exact:true}) });
      await expect(row).toContainText(national);
      await expect(row).toContainText(regional);
      await expect(row.locator("td").last()).toHaveText(seats);
    }
    await areas.getByRole("checkbox").check();
    await expect(rows).toHaveCount(24);
    await expect(areas.getByRole("link").first()).toHaveAttribute("href", /bundeswahlleiterin.de/);
    for (const [id, total, overhang] of [[firstElection,662,6], ["el-de-bt-1994-10-16",672,16],
      ["el-de-bt-1998-09-27",669,13]] as const) {
      await page.locator("[data-selected-election]").selectOption(id);
      const chart = page.locator("[data-german-overhang]");
      await expect(chart).toContainText(String(total));
      await expect(chart).toContainText(String(overhang));
      const details = panel.locator("[data-german-seat-detail]");
      await details.evaluate((el: HTMLDetailsElement) => { el.open = true; });
      await expect(details.locator("[data-german-land-overhang] tbody tr").first()).toBeVisible();
      if (id.includes("1994")) await expect(panel.locator("[data-german-basic-mandate]")).toContainText("4.4%");
    }
  });
}
