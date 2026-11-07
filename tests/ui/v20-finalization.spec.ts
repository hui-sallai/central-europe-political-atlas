import { test, expect, type Page, type Locator, type TestInfo } from "@playwright/test";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { RESEARCH_CASE } from "../../src/lib/comparativeResearchCase";
import { researchWorkspaces } from "../../src/content/researchWorkspaces";

const journeys = [
  { id: "d4", path: "/politics/poland/?research_study=d4" },
  { id: "hu-2022-08-12-catl-debrecen", path: "/models/?tab=run&skill=event_window_analysis&country=hungary&event=hu-2022-08-12-catl-debrecen&section=case" },
  { id: "cz-2023-10-16-repowereu-plan", path: "/models/?tab=run&skill=event_window_analysis&country=czechia&event=cz-2023-10-16-repowereu-plan&section=case" },
];
const sha = (evidence: unknown) => createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
const displayedChange = (value: number | null, locale: string) => value === null ? "—" : `${value > 0 ? "+" : value < 0 ? "−" : ""}${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Math.abs(value))}`;
async function download(page: Page, button: Locator, info: TestInfo, filename: string) {
  const pending = page.waitForEvent("download");
  await button.focus(); await page.keyboard.press("Enter");
  const file = await pending, path = info.outputPath(filename);
  await file.saveAs(path);
  return fs.readFile(path, "utf8");
}
function csvRows(text: string) {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === "," && !quoted) { row.push(cell); cell = ""; }
    else if (c === "\n" && !quoted) { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const header = rows.shift()!;
  return rows.map(values => Object.fromEntries(header.map((key, i) => [key.replace(/^\uFEFF/, ""), values[i]])));
}
async function essentialAccess(page: Page, panel: Locator) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
  const regions = panel.locator('[role="region"][tabindex="0"]');
  if (await regions.count()) {
    const region = regions.first(); await region.focus(); await expect(region).toBeFocused();
    const overflowing = await region.evaluate(node => node.scrollWidth > node.clientWidth + 2);
    if (overflowing) {
      await region.evaluate(node => { node.scrollLeft = 0; });
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => region.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    }
  }
  for (const svg of await panel.locator("svg[data-case-window-chart]").all()) {
    const box = await svg.boundingBox(); expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-2);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 2);
  }
}

for (const journey of journeys) test(`v2.0 homepage journey and language / refresh restoration: ${journey.id}`, async ({ page }, info) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/en/", { waitUntil: "networkidle" });
  await page.locator(`[data-home-case="${journey.id}"] h3 a`).click();
  await expect(page).toHaveURL(new RegExp(journey.id === "d4" ? "research_study=d4" : `event=${journey.id}`));
  let digest: string | undefined;
  for (const [step, locale] of (["en", "zh-CN", "en"] as const).entries()) {
    const en = locale === "en";
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const url = new URL(page.url());
    expect(url.pathname).toBe(`${en ? "/en" : ""}${journey.path.split("?")[0]}`);
    for (const [key, value] of new URLSearchParams(journey.path.split("?")[1])) expect(url.searchParams.get(key)).toBe(value);
    const panel = page.locator(journey.id === "d4" ? "[data-research-study]" : `[data-case-study="${journey.id}"]`);
    await expect(panel).toBeVisible();
    if (journey.id === "d4") {
      await expect(panel).toHaveAttribute("open", "");
      await expect(panel).toHaveAttribute("data-research-study", RESEARCH_CASE.id);
      await expect(panel.getByRole("heading", { name: en ? "Protocol" : "研究协议", exact: true })).toBeVisible();
      for (const selector of ["[data-research-study-direction]", "[data-research-study-comparability]", "[data-research-study-missing]", "[data-research-study-models]"]) await expect(panel.locator(selector)).toBeVisible();
    } else {
      await expect(page.locator("#event-case-study")).toBeFocused();
      await expect(panel.locator("[data-e1-assessment-kind=hypothesis]")).toBeVisible();
      await expect(panel.locator("[data-e2-unresolved]")).toBeVisible();
      await expect(panel.locator('[data-e2-milestone*="-e21-"]')).toHaveCount(4);
      if (journey.id.startsWith("hu")) {
        await expect(panel.locator("[data-e1-event]")).toContainText(en ? "company statement (not an official public record)" : "企业声明（不是官方公共记录）");
        await expect(panel.locator("[data-case-window-blocker]")).toBeVisible();
        await expect(panel.locator("[data-case-window]")).toHaveCount(0);
        await expect(panel.locator('[data-e2-milestone="hu-e21-13-permit-fourth-amendment"]')).toContainText("40.7");
      } else {
        await expect(panel.locator('[data-case-window="full"]')).toBeVisible();
        await expect(panel.locator('[data-e2-milestone="cz-e21-17-final-request-assessed"]')).toContainText(en ? "preliminary" : "初步");
        await expect(panel.locator('[data-e2-milestone="cz-e21-18-distribution-grid-completed"]')).toContainText(en ? "2 133.9" : "2,133.9");
      }
    }
    await essentialAccess(page, panel);
    // Locale round-trip checks export integration; the full E2.1 evidence audit remains in its existing acceptance record.
    if (step < 2) {
      const button = panel.locator(journey.id === "d4" ? "[data-research-study-export-json]" : "[data-e1-export-json]");
      const json = JSON.parse(await download(page, button, info, `${journey.id}-${locale}.json`));
      expect(sha(json.evidence)).toBe(json.evidence_sha256);
      if (digest) expect(json.evidence_sha256).toBe(digest);
      digest = json.evidence_sha256;
      if (journey.id === "d4") {
        const evidence = json.evidence;
        await expect(panel.locator("[data-research-study-pairs] tbody tr")).toHaveCount(evidence.pairs.length);
        for (const pair of evidence.pairs) {
          const row = panel.locator(`[data-study-pair="${pair.fromElection}|${pair.toElection}"]`);
          await expect(row.locator("[data-study-turnout]")).toHaveText(displayedChange(pair.turnout.change, locale));
        }
        const findings = panel.locator("[data-research-study-findings] li");
        await expect(findings).toHaveText(evidence.findings.map((finding: { en: string; zh: string }) => finding[en ? "en" : "zh"]));
        const csv = csvRows(await download(page, panel.locator("[data-research-study-export-csv]"), info, `d4-${locale}.csv`));
        const sources = new Set(evidence.source_index.index.map((source: { id: string }) => source.id));
        for (const row of csv) for (const id of (row.source_refs ?? "").split("; ").filter(Boolean)) expect(sources.has(id), id).toBe(true);
        const indicators = panel.locator("[data-research-study-indicators] tbody tr");
        await expect(indicators).toHaveCount(evidence.pairs.reduce((count: number, pair: { indicators: unknown[] }) => count + pair.indicators.length, 0));
        let indicatorRow = 0;
        for (const pair of evidence.pairs) {
          const row = csv.find(row => row.record_type === "turnout_change" && row.election_id === pair.toElection && row.comparison_election_id === pair.fromElection)!;
          expect(row).toBeDefined(); expect(row.method_version).toBe(evidence.schema_version);
          expect(row.difference === "" ? null : Number(row.difference)).toBe(pair.turnout.change);
          for (const indicator of pair.indicators) {
            const cells = indicators.nth(indicatorRow++).locator("td");
            for (const [index, view] of [indicator.primary, indicator.sensitivity].entries()) {
              if (view.change !== null) await expect(cells.nth(index + 1)).toHaveText(`${displayedChange(view.change, locale)} (${view.fromPeriod}→${view.toPeriod})`);
              else { await expect(cells.nth(index + 1)).not.toBeEmpty(); await expect(cells.nth(index + 1)).not.toHaveText("0"); }
              const entry = csv.find(entry => entry.record_type === "indicator_change" && entry.election_id === pair.toElection && entry.comparison_election_id === pair.fromElection && entry.indicator_or_model === indicator.indicator && entry.view === view.view)!;
              expect(entry).toBeDefined(); expect(entry.method_version).toBe(evidence.schema_version);
              for (const [field, expected] of [["value", view.toValue], ["comparison_value", view.fromValue], ["difference", view.change]] as const) expect(entry[field] === "" ? null : Number(entry[field])).toBe(expected);
              expect(entry.unit).toBe(view.unit ?? "");
            }
          }
        }
      } else {
        const csv = await download(page, panel.locator("[data-e1-export-csv]"), info, `${journey.id}-${locale}.csv`);
        expect(csv).toContain(journey.id); expect(csv).toContain("source_refs");
      }
    }
    const suffix = new URL(page.url()).search;
    // Reload each locale's deep link before changing language and check restoration again.
    await page.reload({ waitUntil: "networkidle" });
    await expect(panel).toBeVisible();
    if (journey.id === "d4") await expect(panel).toHaveAttribute("open", "");
    else await expect(page.locator("#event-case-study")).toBeFocused();
    if (step < 2) {
      await page.getByRole("link", { name: en ? "中文" : "English", exact: true }).focus(); await page.keyboard.press("Enter");
      await expect(page.locator("html")).toHaveAttribute("lang", en ? "zh-CN" : "en");
    }
    // A language switch must not lose the configured case query.
    expect(new URL(page.url()).search).toBe(suffix);
  }
  await info.attach("integration-digest", { body: JSON.stringify({ case: journey.id, evidence_sha256: digest }), contentType: "application/json" });
  expect(errors).toEqual([]);
});

test("v2.0 bilingual homepage language switch, workspaces and essential navigation", async ({ page }) => {
  test.setTimeout(120000);
  for (const prefix of ["/en", ""]) {
    const en = !!prefix;
    for (const workspace of researchWorkspaces) {
      await page.goto(`${prefix}/`, { waitUntil: "networkidle" });
      await page.locator(`a[href="${prefix}/workspaces/${workspace.id}/"]`).click();
      await expect(page.locator("main h1")).toHaveText(workspace.title[en ? "en" : "zh-CN"]);
    }
    for (const path of ["/politics/", "/countries/", "/map/", "/models/", "/methodology/"]) {
      await page.goto(`${prefix}/`, { waitUntil: "networkidle" });
      const nav = page.locator(".site-header");
      const menu = nav.locator('button[aria-controls="mobile-nav"]');
      if (await menu.isVisible()) { await menu.focus(); await page.keyboard.press("Enter"); await expect(menu).toHaveAttribute("aria-expanded", "true"); }
      await nav.locator(`a[href="${prefix}${path}"]:visible`).click();
      await expect(page).toHaveURL(url => url.pathname === `${prefix}${path}`);
      await expect(page.locator("main h1")).toBeVisible();
    }
    await page.goto(`${prefix}/`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: en ? "中文" : "English", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", en ? "zh-CN" : "en");
  }
});
