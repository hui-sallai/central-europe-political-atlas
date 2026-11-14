import { test, expect } from "@playwright/test";

// Serbian National Assembly 2020 and 2026 (owner decision C, 2026-11-15). List labels follow owner rule (b): full
// titles, which usually name persons, are never shown; no candidate or list-leader names appear anywhere on the page.
const PERSONAL_NAMES = /Vučić|Вучић|Dačić|Дачић|Šapić|Шапић|Zukorlić|Зукорлић|Pásztor|Пастор|Šešelj|Шешељ|Karić|Карић|Tepić|Тепић|Ponoš|Понош|Ljajić|Љајић|Nikolić|Николић|Đurić|Ђурић|Gajić|Гајић|Ugljanin|Угљанин/;

test("Serbian elections page shows 2026 whole-chamber results without personal names (en)", async ({ page }) => {
  await page.goto("/en/politics/serbia/", { waitUntil: "networkidle" });
  const main = page.locator("main");
  await expect(main.locator("h1")).toHaveText("Serbian parliamentary elections");
  await expect(main).toContainText("2026");
  await expect(main).toContainText("Valid votes");
  await expect(main).toContainText("4,385,065");
  await expect(main).toContainText("18 lists stood for election and 7 of them won seats");
  await expect(main).toContainText("„СТУДЕНТСКА ЛИСТА – СТУДЕНТИ ПОБЕЂУЈУ”: 140");
  await expect(main).toContainText("Изборна листа, ред. бр. 1: 103");
  await expect(main).toContainText("Социјалистичка партија Србије");
  expect(await main.innerText()).not.toMatch(PERSONAL_NAMES);
  await expect(main.locator('a[href="/research-data/political/serbia/election_results.csv"]')).toHaveText("Results CSV (2020, 2026)");
});

test("Serbian 2020 election reconciles to 250 seats and keeps names out (zh)", async ({ page }) => {
  await page.goto("/politics/serbia/?election=el-rs-nsk-2020-06-21", { waitUntil: "networkidle" });
  const main = page.locator("main");
  await expect(main.locator("h1")).toHaveText("塞尔维亚议会选举");
  await expect(main).toContainText("3,100,608");
  await expect(main).toContainText("Изборна листа, ред. бр. 1: 188");
  await expect(main).toContainText("21");
  expect(await main.innerText()).not.toMatch(PERSONAL_NAMES);
});

test("politics landing lists Serbia as admitted and no longer outside the pipeline", async ({ page }) => {
  await page.goto("/en/politics/", { waitUntil: "networkidle" });
  const main = page.locator("main");
  await expect(main).toContainText("Choose from six countries with admitted parliamentary election records.");
  await expect(main.locator("[data-political-country=serbia]")).toContainText("2020, 2026");
  await expect(main.locator("[data-political-country=serbia]")).toContainText("250");
  await expect(main).not.toContainText("including Serbia");
});
