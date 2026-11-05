import { createElement, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "@playwright/test";
import { PoliticalCountryComparison } from "../../src/components/PoliticalCountryComparison";
import type { PoliticalElectionView } from "../../src/lib/politicalExplorer";

// The comparison view is exercised with synthetic fixtures here and with the admitted Czechia 2025 election on the live
// page below. Playwright compiles imported TSX to its own JSX objects; convert them to React elements for static markup.
type PwNode = { __pw_type: "jsx"; type: unknown; props: Record<string, unknown>; key?: string | null };
const isPw = (node: unknown): node is PwNode => !!node && typeof node === "object" && (node as PwNode).__pw_type === "jsx";
function toReact(node: unknown, index = 0): ReactNode {
  if (Array.isArray(node)) return node.map((child, i) => toReact(child, i));
  if (!isPw(node)) return node as ReactNode;
  if (typeof node.type === "function") return toReact((node.type as (props: unknown) => unknown)(node.props), index);
  const { children, ...rest } = node.props ?? {};
  const type = typeof node.type === "string" ? node.type : Fragment;
  return createElement(type, typeof node.type === "string" ? { ...rest, key: node.key ?? index } : { key: node.key ?? index }, ...(children === undefined ? [] : [toReact(children)]));
}
const view = (extra: Partial<PoliticalElectionView>): PoliticalElectionView => ({ electionId: "e", year: 2017, date: "2017-09-24", resultVintage: "final", validSecondVotes: 1000, totalSeats: 100, publishedTurnout: 76.2, eligibleVoters: 2000, voters: 1500, system: { family: "f", allocationMethod: "Method A", baseSeats: 100, voteType: "second_vote" }, notes: { en: "System note A.", "zh-CN": "制度说明甲。" }, sources: [], results: [{ contestantId: "a1", nativeLabel: "Liste Eins", secondVotes: 600, publishedVoteShare: 60.0, seats: 60, sourceId: "s" }], country: "alpha", countryName: { en: "Alpha", "zh-CN": "甲国" }, chamber: "Chamber A", voteLabel: { en: "Second votes", "zh-CN": "第二票" }, originalLanguage: "de", ...extra });
const a = view({});
const b = view({ electionId: "f", year: 2016, date: "2016-12-11", country: "beta", countryName: { en: "Beta", "zh-CN": "乙国" }, chamber: "Chamber B", originalLanguage: "ro", voteLabel: { en: "Chamber list votes", "zh-CN": "众议院名单票" }, totalSeats: null, publishedTurnout: null, system: { family: "g", allocationMethod: "not established", baseSeats: null, voteType: "chamber_list_vote" }, notes: { en: "System note B.", "zh-CN": "制度说明乙。" }, results: [{ contestantId: "b1", nativeLabel: "LISTA UNU", secondVotes: 450, publishedVoteShare: null, seats: 3, sourceId: "s" }, { contestantId: "b2", nativeLabel: "LISTA DOI", secondVotes: 5, publishedVoteShare: null, seats: null, sourceId: "s" }] });
const render = (locale: "zh-CN" | "en") => renderToStaticMarkup(createElement(Fragment, null, toReact(PoliticalCountryComparison({ a, b, locale }))));

for (const locale of ["zh-CN", "en"] as const) test(`cross-country view: side by side, caveated, never ranked or differenced (${locale})`, () => {
  const html = render(locale);
  expect(html).toContain(locale === "en" ? "held 1 year apart" : "相隔 1 年");
  expect(html).toContain(locale === "en" ? "The seat-allocation methods differ." : "席位分配方法也不同。");
  expect(html).toContain("System note A.".replace("System note A.", locale === "en" ? "System note A." : "制度说明甲。"));
  // Missing totals stay missing and derived shares are labelled.
  expect(html).toMatch(/data-fact="seats"[\s\S]*?(not established|尚未确定)/);
  expect(html).toContain('data-share-basis="derived"');
  expect(html).toContain('data-share-basis="published"');
  expect(html).toContain("45.0%");
  expect(html).not.toContain("LISTA DOI"); // below 1% and no seats: not charted
  expect((html.match(/<th scope="col">/g) ?? []).length).toBe(3 + 4 + 4);
  // No ranking or difference column, no forecast wording, and no raw enum values.
  expect(html).not.toMatch(/<th[^>]*>[^<]*(Rank|Difference|排名|差值)/i);
  expect(html).not.toMatch(/forecast|probab|预测|second_vote|chamber_list_vote/i);
  if (locale === "en") expect(html.replace(/<span lang="(de|ro)"[^>]*>[^<]*<\/span>/g, "")).not.toMatch(/[㐀-鿿]/u);
});

for (const locale of ["zh-CN", "en"] as const) test(`live politics page compares Germany 2025 with the admitted Czechia 2025 election, side by side and caveated (${locale})`, async ({ page }) => {
  await page.goto(locale === "en" ? "/en/politics/" : "/politics/", { waitUntil: "networkidle" });
  const panel = page.locator("[data-politics-explorer]");
  await expect(panel.locator("[data-cross-country-disabled]")).toHaveCount(0);
  await expect(panel.locator("select").first().locator("option")).toHaveCount(1); // Germany stays the primary country
  const comparison = panel.locator("[data-country-comparison]");
  await expect(comparison).toBeVisible();
  await expect(comparison.locator("[data-comparison-caveat]")).toBeVisible();
  await expect(comparison.locator("[data-country-lists='czechia']")).toContainText("ANO 2011");
  await expect(comparison.locator("[data-country-lists='czechia'] tbody tr").first()).toHaveAttribute("data-share-basis", "published");
  const facts = await comparison.locator("[data-country-facts]").innerText();
  expect(facts).toMatch(/630/); expect(facts).toMatch(/200/);
  const html = await comparison.innerHTML();
  expect(html).not.toMatch(/<th[^>]*>[^<]*(Rank|Difference|排名|差值)/i);
  expect(html).not.toMatch(/forecast|probab|预测/i);
  expect((await page.request.get("/research-data/political/czechia/election_results.json")).status()).toBe(200);
  await panel.getByText(locale === "en" ? "Sources, provenance and downloads" : "来源、出处与下载", { exact: true }).click();
  await expect(panel.locator("[data-politics-definitions]")).toContainText(locale === "en" ? "Derived vote share" : "计算得票率");
  await expect(panel.locator("[data-politics-definitions]")).toContainText("voters / eligible voters");
  expect((await page.request.get("/research-data/political/romania/election_results.json")).status()).toBe(404);
});

for (const locale of ["zh-CN", "en"] as const) test(`publication-gate status names every blocked country and shows no values for it (${locale})`, async ({ page }) => {
  await page.goto(locale === "en" ? "/en/politics/" : "/politics/", { waitUntil: "networkidle" });
  const status = page.locator("[data-politics-explorer] [data-admission-status]");
  await status.locator("summary").click();
  await expect(status.locator("[data-admission-state='admitted']")).toHaveCount(4);
  await expect(status.locator("[data-admission='germany']")).toHaveAttribute("data-admission-state", "admitted");
  await expect(status.locator("[data-admission='czechia']")).toHaveAttribute("data-admission-state", "admitted");
  await expect(status.locator("[data-admission='poland']")).toHaveAttribute("data-admission-state", "admitted");
  await expect(status.locator("[data-admission='slovakia']")).toHaveAttribute("data-admission-state", "admitted");
  for (const country of ["austria", "hungary"]) await expect(status.locator(`[data-admission='${country}']`)).toHaveAttribute("data-admission-state", "blocked");
  await expect(status.locator("[data-admission='romania']")).toHaveAttribute("data-admission-state", "staged_not_published");
  await expect(status.locator("[data-admission='hungary']")).toContainText("robots.txt");
  expect(await status.innerText()).not.toMatch(/\d{1,3}(,\d{3})+|\d+(\.\d+)?\s?%/);
  if (locale === "en") expect(await status.innerText()).not.toMatch(/[㐀-鿿]/u);
  for (const country of ["hungary", "austria"]) expect((await page.request.get(`/research-data/political/${country}/election_results.json`)).status()).toBe(404);
});

for (const locale of ["zh-CN", "en"] as const) test(`Germany 2025 rule fields point to the sourced system description, and blocker causes are shown (${locale})`, async ({ page }) => {
  await page.goto(locale === "en" ? "/en/politics/" : "/politics/", { waitUntil: "networkidle" });
  const details = page.locator("[data-national-research]");
  await details.locator("summary").click();
  await expect(details.locator("[data-system-description]")).toContainText(locale === "en" ? "5% rule" : "5%规则");
  await expect(details.locator("[data-system-description-source]").first()).toBeVisible();
  await expect(details).toContainText(locale === "en" ? "Not recorded as a separate structured field" : "未作为单独的结构字段记录");
  await expect(details).not.toContainText(locale === "en" ? "Not established in the authorised structured records" : "授权结构记录中尚未确立");
  const status = page.locator("[data-admission-status]");
  await status.locator("summary").click();
  await expect(status.locator("[data-admission='austria'] [data-admission-cause='reuse_restriction']")).toBeVisible();
  await expect(status.locator("[data-admission='czechia'] [data-admission-cause]")).toHaveCount(0);
  await expect(status.locator("[data-admission='hungary'] [data-admission-cause='reuse_restriction']")).toHaveCount(0);
  await expect(status.locator("[data-admission='germany'] [data-admission-cause]")).toHaveCount(0);
});

for (const locale of ["zh-CN", "en"] as const) test(`Czech view: real 2017–2025 election comparison, rule differences and Germany comparison (${locale})`, async ({ page }) => {
  const prefix = locale === "en" ? "/en" : "";
  await page.goto(`${prefix}/politics/`, { waitUntil: "networkidle" });
  await page.locator('[data-politics-country-view="czechia"]').click();
  await page.waitForURL(`**${prefix}/politics/czechia/`);
  const panel = page.locator("[data-politics-explorer]");
  await expect(panel.locator("tbody th button")).toHaveCount(3);
  const details = panel.locator("[data-national-research]");
  await details.locator("summary").click();
  await expect(details).toContainText("11%");
  await panel.locator("select").nth(1).selectOption({ label: "2017" });
  await expect(panel.locator("#politics-system")).toContainText("Vol 58/2017-173");
  await expect(details).toContainText("20%");
  await page.getByLabel(locale === "en" ? "Compare 2017 with" : "将 2017 年与以下选举比较").selectOption({ label: "2021" });
  const compare = panel.locator("[data-compare-aggregates]");
  await expect(compare).toBeVisible();
  await expect(compare.locator("tbody tr").first()).toContainText("4.6");
  // Only the seven register-verified party series are offered, after the empty choice.
  await expect(panel.locator("[data-politics-history] select").first().locator("option")).toHaveCount(8);
  await expect(panel.locator("[data-country-comparison]")).toBeVisible();
  await expect(panel.locator("[data-country-lists='germany']")).toBeVisible();
  await expect(panel).not.toContainText("Bundeswahlleiterin, Wiesbaden. Source links");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await panel.locator('[data-politics-country-view="germany"]').click();
  await page.waitForURL(`**${prefix}/politics/`);
  await expect(page.locator("[data-politics-explorer] select").first().locator("option")).toHaveCount(1);
});

test("Czech identity: party series, whole coalition figures and verified comparison in both languages", async ({ page }) => {
  await page.goto("/en/politics/czechia/");
  const panel = page.locator("[data-czech-continuity]");
  await expect(panel.locator("[data-continuity-entity]")).toHaveCount(11);
  const ods = panel.locator('[data-continuity-entity="ODS"]');
  await expect(ods.locator('[data-continuity-status="coalition_member"]')).toHaveCount(2);
  await expect(ods.locator('[data-continuity-status="coalition_member"]').first()).toContainText("not attributed to members");
  await expect(panel.locator('[data-continuity-entity="ANO"]')).toContainText("seat rules changed");
  await expect(panel.locator("[data-continuity-unresolved] summary")).toContainText("Unresolved relationships");
  await page.goto("/en/politics/czechia/?election=el-cz-ps-2025-10-03&compare=el-cz-ps-2021-10-08");
  await expect(page.locator("[data-linked-comparison]")).toBeVisible();
  await expect(page.locator('[data-linked-unit="coalition"]')).toHaveCount(1);
  await expect(page.locator('[data-linked-unit="party"]')).toHaveCount(2);
  await expect(page.locator("[data-verified-table]")).toHaveCount(0);
  await page.goto("/politics/czechia/");
  await expect(page.locator("[data-czech-continuity] h2")).toHaveText("名单身份与连续性");
});

test("Poland: national results, whole coalition lists, register-verified series, comparison with Germany", async ({ page }) => {
  await page.goto("/en/politics/poland/");
  await expect(page.locator("h1")).toHaveText("Polish parliamentary elections");
  const explorer = page.locator("[data-politics-explorer]");
  await expect(explorer).toContainText("KOMITET WYBORCZY PRAWO I SPRAWIEDLIWOŚĆ");
  await expect(explorer).toContainText("Coalition list");
  await expect(page.locator("[data-politics-history] select").first().locator("option")).toHaveCount(6);
  await expect(page.locator("[data-country-comparison]")).toBeVisible();
  await expect(page.locator("[data-continuity-entity]")).toHaveCount(5);
  const po = page.locator('[data-continuity-entity="Platforma Obywatelska RP"]');
  await expect(po.locator('[data-continuity-status="no_list"]')).toHaveCount(2);
  await expect(po.locator('[data-continuity-status="no_list"]').first()).toContainText("whose members are not stated");
  await expect(page.locator("[data-continuity-unresolved] summary")).toContainText("5");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto("/politics/poland/");
  await expect(page.locator("h1")).toHaveText("波兰议会选举");
});

test("Slovakia: 2023 list results, stated kinds only, and comparison with three countries", async ({ page }) => {
  await page.goto("/en/politics/slovakia/");
  await expect(page.locator("h1")).toHaveText("Slovak parliamentary election");
  const explorer = page.locator("[data-politics-explorer]");
  await expect(explorer).toContainText("SMER - sociálna demokracia");
  await expect(explorer).toContainText("Coalition list");
  await expect(page.locator("[data-country-comparison]")).toBeVisible();
  for (const slug of ["germany", "czechia", "poland"]) await expect(page.locator(`[data-politics-country-view="${slug}"]`)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto("/en/politics/poland/");
  await expect(page.locator('[data-continuity-entity="Prawo i Sprawiedliwość"] [data-identity-evidence]')).toContainText("not a register extract");
  await expect(page.locator('[data-continuity-entity="Prawo i Sprawiedliwość"] [data-identity-evidence] a')).toHaveCount(4);
  await page.goto("/politics/slovakia/");
  await expect(page.locator("h1")).toHaveText("斯洛伐克议会选举");
});

for (const [route, country] of [["/en/politics/slovakia/", "slovakia"], ["/en/politics/poland/", "poland"], ["/politics/czechia/", "czechia"]] as const) test(`election-macro comparison across four countries from ${country}`, async ({ page }) => {
  await page.goto(route);
  await page.locator("[data-context-disclosure] > summary").click();
  const table = page.locator("[data-election-macro]");
  await expect(table).toBeVisible();
  await expect(table.locator("[data-macro-election]")).toHaveCount(15);
  await expect(table.locator('[data-macro-election="el-sk-nrsr-2023-09-30"]')).toHaveAttribute("data-macro-status", "published");
  await expect(table.locator('[data-macro-election="el-sk-nrsr-2023-09-30"]')).toContainText("2022");
  await table.locator("select").first().selectOption("real_gdp_growth");
  await expect(table.locator('[data-macro-election="el-de-bt-2013-09-22"]')).toHaveAttribute("data-macro-status", "missing");
  await table.locator("select").nth(1).selectOption("retrospective_calendar_year");
  await expect(table.locator('[data-macro-election="el-sk-nrsr-2023-09-30"]')).toContainText("2023");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("published before polling day: dated values stay separate from current figures", async ({ page }) => {
  await page.goto("/en/politics/slovakia/");
  await page.locator("[data-context-disclosure] > summary").click();
  const table = page.locator("[data-election-as-of]");
  await expect(table).toBeVisible();
  await expect(table.locator("[data-as-of-row]")).toHaveCount(20);
  const deficit = table.locator('[data-as-of-row="el-sk-nrsr-2023-09-30:fiscal_balance_gdp"]');
  await expect(deficit).toContainText("−2.0");
  await expect(deficit).toContainText("−1.6");
  await expect(table.locator('[data-as-of-row="el-cz-ps-2025-10-03:unemployment_rate"]')).toHaveAttribute("data-as-of-status", "not_established");
  await expect(table.locator('[data-as-of-row="el-de-bt-2025-02-23:hicp_inflation"]')).toContainText("flash estimate");
  await expect(table.locator('[data-as-of-row="el-sk-nrsr-2023-09-30:real_gdp_growth"]')).toContainText("Not held for this period");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

for (const locale of ["en", "zh-CN"] as const) test(`comparative research workflow answers each question from a shareable selection and exports evidence (${locale})`, async ({ page }) => {
  const en = locale === "en";
  await page.goto(`${en ? "/en" : ""}/politics/slovakia/?context=1`, { waitUntil: "networkidle" });
  const panel = page.locator("[data-comparative-research]");
  await expect(panel).toBeVisible({ timeout: 30000 });
  await expect(panel.locator("[data-research-boundary]")).toContainText(en ? "An association is not a cause" : "关联不等于因果");
  // A: all fifteen elections, one row each, gaps stated.
  await expect(panel.locator("[data-research-a-table] [data-research-row]")).toHaveCount(15);
  await expect(panel.locator('[data-research-row="el-de-bt-2013-09-22"] [data-research-cell="missing"]').first()).toBeVisible();
  await expect(panel.locator("[data-research-findings='A']")).toContainText(en ? "from 0.1 (Poland 2015) to 13.2 (Poland 2023)" : "从 0.1（波兰 2015）到 13.2（波兰 2023）");
  // B: unselecting a middle election removes its pairs and never joins its neighbours.
  await panel.locator("[data-research-question]").selectOption("B");
  await expect(panel.locator('[data-research-pair="el-pl-sejm-2019-10-13:el-pl-sejm-2023-10-15:hicp_inflation"]')).toContainText("+12");
  await panel.locator('[data-research-election="el-cz-ps-2021-10-08"]').uncheck();
  await expect(panel.locator('[data-research-pair*="el-cz-ps-2021-10-08"]')).toHaveCount(0);
  await expect(panel.locator('[data-research-pair*="el-cz-ps-2017-10-20:el-cz-ps-2025-10-03"]')).toHaveCount(0);
  await panel.locator('[data-research-election="el-cz-ps-2021-10-08"]').check();
  // The released view cannot produce a change between elections.
  await panel.locator("[data-research-view]").selectOption("released_before_election");
  await expect(panel.locator('[data-research-change="calculated"]')).toHaveCount(0);
  await panel.locator("[data-research-view]").selectOption("last_complete_year");
  // C: coefficients only where enough pairs exist, within one country.
  await panel.locator("[data-research-question]").selectOption("C");
  await expect(panel.locator('[data-research-association="germany:government_debt_gdp:turnout_change"]')).toHaveAttribute("data-research-association-status", "coefficient");
  await expect(panel.locator('[data-research-association="poland:government_debt_gdp:turnout_change"]')).toHaveAttribute("data-research-association-status", "direction_only");
  await expect(panel.locator("[data-research-c-direction]")).toBeVisible();
  // D: revision, different period and missing evidence stay distinct.
  await panel.locator("[data-research-question]").selectOption("D");
  await expect(panel.locator("[data-research-released]")).toHaveCount(20);
  await expect(panel.locator('[data-research-released="el-cz-ps-2025-10-03:unemployment_rate"]')).toHaveAttribute("data-research-released-status", "not_established");
  await expect(panel.locator('[data-research-released="el-sk-nrsr-2023-09-30:fiscal_balance_gdp"] [data-research-relation="same_period_revision"]').first()).toBeVisible();
  await expect(panel.locator('[data-research-released="el-de-bt-2025-02-23:fiscal_balance_gdp"] [data-research-relation="different_period"]').first()).toBeVisible();
  // The address reproduces a narrowed selection after reload.
  await panel.locator('[data-research-country="germany"]').uncheck();
  await page.waitForFunction(() => new URLSearchParams(location.search).get("research_q") === "D" && !new URLSearchParams(location.search).get("research_countries")?.includes("germany"));
  await page.reload({ waitUntil: "networkidle" });
  const again = page.locator("[data-comparative-research]");
  await expect(again.locator("[data-research-question]")).toHaveValue("D", { timeout: 30000 });
  await expect(again.locator('[data-research-country="germany"]')).not.toBeChecked();
  await expect(again.locator("[data-research-released]")).toHaveCount(15);
  // Both exports hold the evidence; the JSON records a digest and the selection.
  const [json] = await Promise.all([page.waitForEvent("download"), again.locator("[data-research-export-json]").click()]);
  expect(json.suggestedFilename()).toBe("election-comparative-research.json");
  const pkg = JSON.parse(await (await import("node:fs/promises")).readFile(await json.path(), "utf8"));
  expect(pkg.evidence_sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(pkg.evidence.descriptive_only).toBe(true);
  expect(pkg.evidence.selection.countries).toEqual(["czechia", "poland", "slovakia"]);
  await expect(again.locator("[data-research-digest]")).toContainText(pkg.evidence_sha256);
  const [csv] = await Promise.all([page.waitForEvent("download"), again.locator("[data-research-export-csv]").click()]);
  expect(csv.suggestedFilename()).toBe("election-comparative-research.csv");
});

for (const locale of ["en", "zh-CN"] as const) test(`research deep link: Poland 2023 question D opens, restores and exports (${locale})`, async ({ page }) => {
  test.setTimeout(240000);
  const base = locale === "en" ? "/en/politics/poland/" : "/politics/poland/";
  await page.goto(`${base}?context=1&research_q=D`, { waitUntil: "networkidle" });
  const panel = page.locator("[data-comparative-research]");
  await expect(panel.locator("[data-research-question]")).toHaveValue("D", { timeout: 60000 });
  await expect(panel).toBeInViewport();
  expect(new URL(page.url()).searchParams.get("research_countries"), "an untouched deep link stays short").toBeNull();
  const box = panel.locator('[data-research-case="el-pl-sejm-2023-10-15"]');
  await expect(box).toHaveAttribute("data-research-case-status", "documented");
  await expect(box.locator("[data-research-case-row]")).toHaveCount(5);
  // The selection's gap is named, so it is not read as a gap in the inspected election.
  await expect(panel.locator('[data-research-availability="partial"]')).toContainText(locale === "en" ? "Czechia 2025" : "捷克 2025");
  await expect(panel.locator('[data-research-availability="partial"]')).toContainText(locale === "en" ? "Poland 2023" : "波兰 2023");
  const hicp = box.locator('[data-research-case-row="hicp_inflation"]');
  await expect(hicp.locator("[data-research-case-released]")).toContainText("9.5");
  await expect(hicp.locator("[data-research-case-released]")).toContainText("2023-08");
  await expect(hicp.locator('[data-research-case-view="last_complete_year"]')).toHaveAttribute("data-research-relation", "different_frequency");
  await expect(hicp.locator('[data-research-case-view="election_calendar_year"]')).toContainText("10.9");
  await expect(box).not.toContainText(/RCH_A|PC_ACT/);
  await expect(hicp.locator("[data-research-case-evidence] a")).toHaveAttribute("href", /2-19092023/);
  const debt = box.locator('[data-research-case-row="government_debt_gdp"]');
  await expect(debt.locator("[data-research-case-revision]")).toHaveAttribute("data-research-case-revision", "-0.3");
  await expect(debt.locator("[data-research-case-later]")).toContainText("49.3");
  await expect(box.locator('[data-research-case-row="real_gdp_growth"] [data-research-condition="no_current_series_at_frequency"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // The export carries the question and case that are on the page.
  const [csv] = await Promise.all([page.waitForEvent("download"), panel.locator("[data-research-export-csv]").click()]);
  const text = await (await import("node:fs/promises")).readFile(await csv.path(), "utf8");
  expect(text).toMatch(/"as_of_case","poland","el-pl-sejm-2023-10-15","","government_debt_gdp".*"49\.1","48\.8","-0\.3"/);
  // Changing the question keeps the selection, and every question gives a result.
  await panel.locator('[data-research-country="germany"]').uncheck();
  await panel.locator("[data-research-question]").selectOption("B");
  await expect(panel.locator("[data-research-b-table]")).toBeVisible();
  await page.waitForFunction(() => { const q = new URLSearchParams(location.search); return q.get("research_q") === "B" && q.get("context") === "1" && !q.get("research_countries")?.includes("germany"); });
  await panel.locator("[data-research-question]").selectOption("C");
  await expect(panel.locator("[data-research-c-pairs]")).toBeVisible();
  await expect(panel.locator('[data-research-availability="partial"]')).toBeVisible();
  await panel.locator("[data-research-question]").selectOption("A");
  await expect(panel.locator("[data-research-a-table]")).toBeVisible();
  // An election without dated releases says so; a pilot chosen here survives a reload.
  await panel.locator("[data-research-question]").selectOption("D");
  await panel.locator("[data-research-case-select]").selectOption("el-pl-sejm-2019-10-13");
  await expect(panel.locator("[data-research-case]")).toHaveAttribute("data-research-case-status", "not_documented");
  await expect(panel.locator('[data-research-condition="first_release_dates_not_recorded"]')).toHaveCount(5);
  await panel.locator("[data-research-case-select]").selectOption("el-cz-ps-2025-10-03");
  await page.waitForFunction(() => new URLSearchParams(location.search).get("research_case") === "el-cz-ps-2025-10-03");
  await page.reload({ waitUntil: "networkidle" });
  const again = page.locator("[data-comparative-research]");
  await expect(again.locator("[data-research-case]")).toHaveAttribute("data-research-case", "el-cz-ps-2025-10-03", { timeout: 60000 });
  await expect(again.locator("[data-research-case]")).toHaveAttribute("data-research-case-status", "partly_documented");
  await expect(again.locator('[data-research-case-row="unemployment_rate"]')).toHaveAttribute("data-research-case-row-status", "not_established");
  // The page's election parameter and a bare research_q keep working.
  await page.goto(`${base}?election=el-pl-sejm-2019-10-13&research_q=D`, { waitUntil: "networkidle" });
  await expect(page.locator("[data-research-case]")).toHaveAttribute("data-research-case", "el-pl-sejm-2019-10-13", { timeout: 60000 });
  await page.goto(`${base}?context=1&research_q=C`, { waitUntil: "networkidle" });
  await expect(page.locator("[data-research-question]")).toHaveValue("C", { timeout: 60000 });
  await page.goto(`${base}?context=1&research_q=nonsense`, { waitUntil: "networkidle" });
  await expect(page.locator("[data-research-question]")).toHaveValue("A", { timeout: 60000 });
});
