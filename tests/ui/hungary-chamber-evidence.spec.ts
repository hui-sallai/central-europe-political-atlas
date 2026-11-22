import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { activeNotebookRaw } from "./notebook-storage";
import type { ResearchNotebook } from "../../src/lib/researchNotebook";

const parseCsv: (text: string, separator: string) => string[][] =
  createRequire(process.cwd() + "/package.json")("./scripts/political-data/germany/csv.mjs").parseCsv;
import elections from "../../src/data/political/hungary/elections.json";
import legislatures from "../../src/data/political/hungary/legislatures.json";

for (const prefix of ["", "/en"]) {
  test("Hungarian early elections reconcile whole chambers and download scoped evidence " + (prefix || "zh"), async ({page}) => {
    const route = prefix + "/politics/hungary/";
    const early = elections.filter(e => e.year <= 2010);
    const selector = page.locator("[data-selected-election]");
    for (const e of early.slice(0, 3)) {
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
          expect(exported.rounds[1].turnout).toBe([57.01,73.51,64.39,46.66][i]);
        } else {
          for (const holder of outside) expect(body).toContain(holder.kind);
          for (const unmatched of chamber.unmatched_national_lists ?? []) expect(body).toContain(unmatched.label);
        }
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}


for (const prefix of ["", "/en"]) {
  test("1998 turnout history retains the ballot, geographic scope and recorded evidence " + (prefix || "zh"), async ({page}) => {
    const election = "el-hu-ogy-1998-05-10";
    const ballots = ["hu98_smc_round1_vote", "hu98_smc_round2_vote"];
    const dates = ["1998-05-10", "1998-05-24"];
    const urls = ["https://static.valasztas.hu/ujweb/jog1/ovbk1.htm", "https://static.valasztas.hu/v98din2/l100.htm"];
    await page.goto(prefix + "/politics/hungary/?election=" + election + "&history_events=" + election + "&history_detail=turnout");
    const history = page.locator("[data-history-observations]");
    const first = history.locator('circle[data-turnout-point="' + election + '"]');
    const second = history.locator('[data-turnout-round-point="' + dates[1] + '"]');
    await expect(first).toHaveAttribute("data-ballot-id", ballots[0]);
    await expect(first.locator("title")).toContainText(/176.*56\.26%/);
    await expect(second).toHaveAttribute("data-ballot-id", ballots[1]);
    await expect(second.locator("path title")).toContainText(/175.*57\.01%/);
    await expect(history.locator('[data-turnout-year="1998"]')).toContainText(/176.*56\.26%/);
    await expect(history.locator("table tbody tr")).toHaveCount(2);
    const composition = history.locator('[data-history-composition="' + election + '"]');
    await composition.locator("summary").click();
    const joint = composition.getByRole("listitem").filter({hasText:"Fidesz-MDF / MDF-Fidesz"});
    await expect(joint).toContainText(/50.*Fidesz-MDF 35 \+ MDF-Fidesz 15/);
    await expect(joint.locator("a")).toHaveAttribute("href", /v98din2\/l23a\.htm$/);

    for (const kind of ["turnout","seats"]) {
      const label = kind === "turnout" ? (prefix ? "Turnout CSV" : "投票率 CSV") : (prefix ? "Seat composition CSV" : "席位构成 CSV");
      const [file] = await Promise.all([page.waitForEvent("download"), history.getByRole("button", {name:label, exact:true}).click()]);
      const [headers, ...values] = parseCsv(await readFile((await file.path())!, "utf8"), ",");
      const rows = values.map(cells => Object.fromEntries(headers.map((key, i) => [key,cells[i]])));
      if (kind === "turnout") {
        expect(rows.map(r=>[r.vote_type, r.date, r.round, r.turnout_percent, r.numerator, r.denominator,
          r.electorate_scope, r.constituency_count, r.runoff_constituencies, r.source_urls])).toEqual([
          [ballots[0],dates[0],"1","56.26","4536254","8062708","national","176","",urls[0]],
          [ballots[1],dates[1],"2","57.01","4570386","8016397","restricted","175","175",urls[1]],
        ]);
      } else {
        const whole = rows.filter(r=>r.breakdown === "whole_chamber_attribution");
        expect(whole.reduce((total,r)=>total + Number(r.seats),0)).toBe(386);
        const holder = whole.find(r=>r.segment === "Fidesz-MDF / MDF-Fidesz")!;
        expect(holder.seats).toBe("50");
        expect(JSON.parse(holder.outside_list_components)).toEqual([{label:"Fidesz-MDF", seats:35},{label:"MDF-Fidesz", seats:15}]);
        expect(holder.component_source_url).toMatch(/v98din2\/l23a\.htm$/);
      }
    }
    await history.getByRole("button",{name:prefix ? "Save turnout history" : "保存投票率历史",exact:true}).click();
    await expect.poll(async()=>JSON.parse(await activeNotebookRaw(page)).items?.length).toBe(1);
    const book: ResearchNotebook = JSON.parse(await activeNotebookRaw(page));
    expect(book.items[0].metadata.filters?.source_ballots).toEqual(ballots);
    expect(book.items[0].metadata.coverage?.[0]).toContain("176");
    expect(book.items[0].metadata.coverage?.[1]).toContain("175");
    expect(book.items[0].periods).toEqual(dates);
    expect(book.sources.map(s=>s.url)).toEqual(expect.arrayContaining(urls));
  });
}
