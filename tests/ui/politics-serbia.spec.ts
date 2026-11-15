import { test, expect } from "@playwright/test";

// Serbian National Assembly 2020 and 2026 (owner decision C, 2026-11-15); 2022 and full 2023 from the RIK reports (owner brief 2026-11-15). List labels follow owner rule (b): full
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
  await expect(main.locator('a[href="/research-data/political/serbia/election_results.csv"]')).toHaveText("Results CSV (2020, 2022, 2023, 2026)");
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
  await expect(main.locator("[data-political-country=serbia]")).toContainText("2020, 2022, 2023, 2026");
  await expect(main.locator("[data-political-country=serbia]")).toContainText("250");
  await expect(main).not.toContainText("including Serbia");
});

test("other countries' pages offer Serbia in the country comparison, side by side and without personal names", async ({ page }) => {
  await page.goto("/en/politics/poland/", { waitUntil: "networkidle" });
  const section = page.locator("[data-politics-cross-country]");
  const country = section.getByLabel("Compare with country");
  await expect(country.locator("option[value=serbia]")).toHaveText("Serbia");
  await country.selectOption("serbia");
  const serbia = section.locator("[data-country-comparison] [data-country-lists='serbia']");
  await expect(serbia).toBeVisible();
  await expect(serbia).toContainText("Изборна листа, ред. бр. 1");
  expect(await section.innerText()).not.toMatch(PERSONAL_NAMES);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto("/politics/germany/", { waitUntil: "networkidle" });
  await expect(page.locator("[data-politics-cross-country] select").first().locator("option[value=serbia]")).toHaveText("塞尔维亚");
});

const LATIN_NAMES = /Vučić|Dačić|Pásztor|Pastor|Šešelj|Tepić|Jovanović|Mihailović|Đurđević|Stamenkovski|Zukorlić|Usame|Zelenović|Ćuta|Radulović|Stamatović|Stojković|Obradović|Parandilović|Ugljanin|Tadić|Pejić|Šajn|Pavlović|Gavrin|Aleksić|Nestorović|Jeremić|Kovačević|Kamberi|Vuletić|Milošević|Žigmanov|Nikolić|Тепић|Алексић|Несторовић|Јовановић|Камбери|Ћута|Жигманов/;

for (const locale of ["en", "zh-CN"] as const) test(`Serbian 2023: full RIK report, all 18 lists, shares over valid ballots, deep link survives reload and back navigation (${locale})`, async ({ page }) => {
  const en = locale === "en";
  const link = `${en ? "/en" : ""}/politics/serbia/?election=el-rs-nsk-2023-12-17`;
  await page.goto(link, { waitUntil: "networkidle" });
  const main = page.locator("main");
  const check2023 = async () => {
    await expect(main).toContainText("3,710,978");
    await expect(main).toContainText("6,500,666");
    await expect(main.locator("[data-politics-summary]")).toContainText(en ? "18 lists stood for election and 10 of them won seats" : "18");
    await expect(main.locator("[data-result-coverage]")).toHaveCount(0);
    await expect(main).toContainText("Изборна листа, ред. бр. 1: 129");
    await expect(main).toContainText("MI-GLAS IZ NARODA: 13");
  };
  await check2023();
  expect(await main.innerText()).not.toMatch(PERSONAL_NAMES);
  expect(await main.innerText()).not.toMatch(LATIN_NAMES);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.reload({ waitUntil: "networkidle" });
  await check2023();
  await page.goto(`${en ? "/en" : ""}/politics/`, { waitUntil: "networkidle" });
  await page.goBack({ waitUntil: "networkidle" });
  expect(new URL(page.url()).searchParams.get("election")).toBe("el-rs-nsk-2023-12-17");
  await check2023();
});

for (const locale of ["en", "zh-CN"] as const) test(`Serbian 2022: 19 lists and 250 seats from the RIK report, no names (${locale})`, async ({ page }) => {
  const en = locale === "en";
  await page.goto(`${en ? "/en" : ""}/politics/serbia/?election=el-rs-nsk-2022-04-03`, { waitUntil: "networkidle" });
  const main = page.locator("main");
  await expect(main).toContainText("3,693,328");
  await expect(main).toContainText("6,502,307");
  if (en) await expect(main.locator("[data-politics-summary]")).toContainText("19 lists stood for election and 12 of them won seats");
  await expect(main).toContainText("Изборна листа, ред. бр. 1: 120");
  await expect(main).toContainText("Srpska stranka Zavetnici: 10");
  expect(await main.innerText()).not.toMatch(PERSONAL_NAMES);
  expect(await main.innerText()).not.toMatch(LATIN_NAMES);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
