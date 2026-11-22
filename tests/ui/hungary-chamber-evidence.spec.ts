import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import elections from "../../src/data/political/hungary/elections.json";
import legislatures from "../../src/data/political/hungary/legislatures.json";

for (const prefix of ["", "/en"]) {
  test("Hungarian early elections reconcile whole chambers and download scoped evidence " + (prefix || "zh"), async ({page}) => {
    const route = prefix + "/politics/hungary/";
    // 2002–2010: the accepted single-round ballots. 1998 (valid-round composite list ballot, apportioned single-member totals) needs the
    // round-scope adapter of docs/v20-hungary-1998-2026-11-23.md §J before its round view and download are asserted here.
    const early = elections.filter(e => e.year >= 2002 && e.year <= 2010);
    const selector = page.locator("[data-selected-election]");
    for (const e of early.slice(0, 2)) {
      await page.goto(route + "?election=" + e.election_id);
      await expect(selector).toHaveValue(e.election_id);
      await expect(page.locator("[data-election-round-details]")).toContainText(e.date);
    }
    await expect(selector.locator("option")).toHaveText(elections.map(e => String(e.year)));
    for (const e of elections) {
      await selector.selectOption(e.election_id);
      await expect(page.getByRole("heading", {name: prefix ? `The ${e.year} election at a glance` : `${e.year} 年选举概览`, exact: true})).toContainText(String(e.year));
      expect(new URL(page.url()).searchParams.get("election")).toBe(e.election_id);
    }
    for (const [i, e] of early.entries()) {
      await page.goto(route + "?election=" + e.election_id + "&compare=" + early[(i + 1) % early.length].election_id);
      const panel = page.locator("[data-election-round-details]");
      const selected = panel.locator("[data-chamber-reconciliation]");
      const paired = page.locator("[data-paired-elections]");
      await paired.locator("summary").first().click();
      const peer = paired.locator('[data-chamber-reconciliation="' + e.election_id + '"]');
      const chamber = legislatures.find(l => l.legislature_id === e.legislature_id)!;
      const outside = chamber.constituency_seats_outside_lists!;
      for (const view of [selected, peer]) {
        await expect(view).toContainText(String(386 - outside.reduce((n, p) => n + p.seats, 0)));
        for (const part of outside) {
          const holder = view.locator('[data-outside-list-kind="' + part.kind + '"]');
          await expect(holder).toContainText(part.label);
          await expect(holder).toContainText(String(part.seats));
        }
        await expect(view.locator("[data-unmatched-compensation]")).toHaveCount(chamber.unmatched_national_lists?.length ?? 0);
      }
      await expect(page.locator("[data-parliament-seats] svg")).toHaveAttribute("aria-label", /386\/386/);
      if (e.year === 2006) {
        await expect(panel.locator('[data-election-round="2"]')).toContainText("Tájékoztató adatok");
        await expect(panel.locator('[data-election-round="2"] a')).toHaveAttribute("href", /vdin2\/hu\/l100\.htm$/);
      }
      const record = page.locator("[data-selected-election-download]");
      await record.locator("xpath=ancestor::details[1]/summary").click();
      for (const format of ["JSON", "CSV"]) {
        const [download] = await Promise.all([page.waitForEvent("download"), record.getByRole("button", {name:format, exact:true}).click()]);
        const body = await readFile((await download.path())!, "utf8");
        if (format === "JSON") {
          const exported = JSON.parse(body);
          expect(exported.composition.constituency_seats_outside_lists).toEqual(outside);
          expect(exported.composition.independent_district_seats).toBe(outside.filter(s => s.kind === "independent_candidate").reduce((n,s) => n + s.seats,0));
          expect(exported.composition.unmatched_compensation_lists.map((l:{label:string}) => l.label)).toEqual((chamber.unmatched_national_lists ?? []).map(l => l.label));
          expect(exported.rounds[1].turnout).toBe([73.51,64.39,46.66][i]);
        } else {
          for (const holder of outside) expect(body).toContain(holder.kind);
          for (const unmatched of chamber.unmatched_national_lists ?? []) expect(body).toContain(unmatched.label);
        }
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
