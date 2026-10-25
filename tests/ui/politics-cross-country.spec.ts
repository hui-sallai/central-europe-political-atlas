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
  await expect(status.locator("[data-admission-state='admitted']")).toHaveCount(2);
  await expect(status.locator("[data-admission='germany']")).toHaveAttribute("data-admission-state", "admitted");
  await expect(status.locator("[data-admission='czechia']")).toHaveAttribute("data-admission-state", "admitted");
  for (const country of ["slovakia", "poland", "austria", "hungary"]) await expect(status.locator(`[data-admission='${country}']`)).toHaveAttribute("data-admission-state", "blocked");
  await expect(status.locator("[data-admission='romania']")).toHaveAttribute("data-admission-state", "staged_not_published");
  await expect(status.locator("[data-admission='hungary']")).toContainText("robots.txt");
  expect(await status.innerText()).not.toMatch(/\d{1,3}(,\d{3})+|\d+(\.\d+)?\s?%/);
  if (locale === "en") expect(await status.innerText()).not.toMatch(/[㐀-鿿]/u);
  for (const country of ["hungary", "poland", "slovakia"]) expect((await page.request.get(`/research-data/political/${country}/election_results.json`)).status()).toBe(404);
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
  await expect(status.locator("[data-admission='slovakia'] [data-admission-cause='reuse_restriction']")).toBeVisible();
  await expect(status.locator("[data-admission='czechia'] [data-admission-cause]")).toHaveCount(0);
  await expect(status.locator("[data-admission='hungary'] [data-admission-cause='reuse_restriction']")).toHaveCount(0);
  await expect(status.locator("[data-admission='germany'] [data-admission-cause]")).toHaveCount(0);
});
