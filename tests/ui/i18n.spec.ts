import fs from "node:fs";
import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { localizedRoute, localeDate, localeNumber } from "../../src/i18n/config";
import { buildSnapshot, type SnapshotInput } from "../../src/lib/researchSnapshot";

test("locale route and formatting contracts", () => {
  expect(localizedRoute("/data/?country=poland#series", "en")).toBe("/en/data/?country=poland#series");
  expect(localizedRoute("/en/countries/hungary/?compare=poland", "zh-CN")).toBe("/countries/hungary/?compare=poland");
  for (const path of ["/research-data/package.zip", "/geo/boundary.json", "/og/site.png", "/favicon.ico", "/historical-extension/", "https://example.org/", "#spatial"]) expect(localizedRoute(path, "en")).toBe(path);
  expect(localeNumber(null, "en")).toBe("—");
  expect(localeNumber(-1234.5, "en")).toBe("−1,234.5");
  expect(localeDate("2026-10-01T00:00:00Z", "en")).toContain("2026");
});

test("bilingual snapshot numeric and provenance parity", () => {
  const input: SnapshotInput = { title: "Descriptive view", view_type: "annual", page_path: "/data/", shareable_view_url: "https://hy-central-europe-analysis.org/data/?country=poland", countries: ["poland"], indicators: ["hicp_inflation"], filters: { country: "poland", from: 2020 }, rows: [null, 0, -2.5].map((value, i) => ({ id: String(i), country: "poland", indicator: "hicp_inflation", period: String(2020 + i), value, unit: "%", layer: "formal_observation", status: value === null ? "missing" : "official", source: { institution: "Eurostat", dataset: "prc_hicp_aind", source_url: "https://ec.europa.eu/eurostat/", source_layer: "formal_observation", original_unit: "%" } })) };
  const zh = buildSnapshot({ ...input, locale: "zh-CN" }, "2026-10-01T12:00:00Z");
  const en = buildSnapshot({ ...input, locale: "en", page_path: "/en/data/" }, "2026-10-01T12:00:00Z");
  for (const name of ["data.csv", "sources.csv"]) expect(en.files.find(file => file.name === name)?.content).toEqual(zh.files.find(file => file.name === name)?.content);
  expect(en.manifest.locale).toBe("en");
  expect(en.manifest.schema).toBe(zh.manifest.schema);
  expect(en.manifest.known_limitations.join(" ")).toContain("No zero-filling");
  expect(en.files.find(file => file.name === "README.md")?.content).not.toMatch(/[\u3400-\u9fff]/u);
});

const implementedRoutes = ["/", "/countries/", "/data/", "/map/", "/models/", "/scenarios/", "/methodology/", "/countries/hungary/", "/legal/", "/privacy/"];
for (const route of implementedRoutes) test(`static locale, SEO and accessibility: ${route}`, async ({ page }) => {
  for (const locale of ["zh-CN", "en"] as const) {
    const target = localizedRoute(route, locale);
    const html = fs.readFileSync(`out${target}index.html`, "utf8");
    expect(html).toContain(`<html lang="${locale}"`);
    await page.goto(target, { waitUntil: "networkidle" });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://hy-central-europe-analysis.org${target}`);
    for (const language of ["zh-CN", "en", "x-default"]) await expect(page.locator(`link[rel="alternate"][hreflang="${language}"]`)).toHaveCount(1);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", locale === "en" ? "en_GB" : "zh_CN");
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await expect(page.locator("html")).toHaveAttribute("data-theme", colorScheme);
      await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    }
  }
});

test("language switching preserves updated query and hash", async ({ page }) => {
  await page.goto("/data/?country=poland&indicator=hicp_inflation&from=2020&to=2022&history=0#series", { waitUntil: "networkidle" });
  await page.getByRole("combobox", { name: "结束年份", exact: true }).selectOption("2021");
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/data\/?\?[^#]*to=2021[^#]*#series$/);
  await expect(page.getByRole("combobox", { name: "End year", exact: true })).toHaveValue("2021");
  await page.getByRole("link", { name: "中文", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "结束年份", exact: true })).toHaveValue("2021");
});

for (const route of ["/map/?country=hungary&layer=regional_population&year=2024&classification=quantile#spatial", "/countries/hungary/?compare=poland#research"]) test(`language switch round-trip: ${route}`, async ({ page }) => {
  await page.goto(route, { waitUntil: "networkidle" });
  const before = new URL(page.url());
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(new URL(page.url()).search).toBe(before.search);
  expect(new URL(page.url()).hash).toBe(before.hash);
  await page.getByRole("link", { name: "中文", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  expect(new URL(page.url()).pathname).toBe(before.pathname);
  expect(new URL(page.url()).search).toBe(before.search);
  expect(new URL(page.url()).hash).toBe(before.hash);
});

test("annual bilingual downloads preserve actual data and source CSV", async ({ page }) => {
  const bundles: Record<string, string>[] = [];
  for (const locale of ["zh-CN", "en"] as const) {
    await page.goto(`${localizedRoute("/data/", locale)}?country=poland&indicator=hicp_inflation&from=2020&to=2021&history=0`, { waitUntil: "networkidle" });
    // Exercise actual controls, not just equivalent initial query strings.
    await page.getByRole("combobox", { name: locale === "en" ? "Country" : "国家", exact: true }).selectOption("hungary");
    await page.getByRole("combobox", { name: locale === "en" ? "Indicator" : "指标", exact: true }).selectOption("unemployment_rate");
    await page.getByRole("combobox", { name: locale === "en" ? "End year" : "结束年份", exact: true }).selectOption("2022");
    const name = locale === "en" ? "Export research snapshot" : "导出研究快照";
    const button = page.getByRole("button", { name, exact: true }).first();
    const pending = page.waitForEvent("download");
    await button.click();
    const download = await pending;
    const bundle = JSON.parse(execFileSync("python3", ["-c", "import sys,zipfile,json; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps({n:z.read(n).decode('utf-8') for n in z.namelist()}))", (await download.path())!]).toString()) as Record<string, string>;
    expect(JSON.parse(bundle["manifest.json"]).locale).toBe(locale);
    bundles.push(bundle);
  }
  for (const file of ["data.csv", "sources.csv"]) expect(bundles[0][file]).toEqual(bundles[1][file]);
  for (const file of ["README.md", "citation.txt", "figure.svg"]) expect(bundles[1][file]).not.toMatch(/[\u3400-\u9fff]/u);
});

test("bilingual map classes, values and snapshots remain identical", async ({ page }) => {
  for (const classification of ["equal_interval", "quantile"]) {
    const bundles: Record<string, string>[] = [];
    const fills: string[][] = [];
    for (const locale of ["zh-CN", "en"] as const) {
      await page.goto(`${localizedRoute("/map/", locale)}?country=hungary&layer=regional_population&year=2024&classification=${classification}`, { waitUntil: "networkidle" });
      await expect(page.locator('svg[data-map-export="hungary"]')).toBeVisible();
      fills.push(await page.locator('svg[data-map-export="hungary"] path').evaluateAll(paths => paths.map(path => path.getAttribute("fill") ?? "")));
      const pending = page.waitForEvent("download");
      await page.getByRole("button", { name: locale === "en" ? "Export research snapshot" : "导出研究快照", exact: true }).click();
      const download = await pending;
      bundles.push(JSON.parse(execFileSync("python3", ["-c", "import sys,zipfile,json; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps({n:z.read(n).decode('utf-8') for n in z.namelist()}))", (await download.path())!]).toString()));
    }
    expect(fills[0].length).toBeGreaterThan(0);
    expect(fills[1]).toEqual(fills[0]);
    for (const file of ["data.csv", "sources.csv"]) expect(bundles[1][file]).toEqual(bundles[0][file]);
    const manifests = bundles.map(bundle => JSON.parse(bundle["manifest.json"]));
    expect(manifests[1].comparison).toEqual(manifests[0].comparison);
    expect(manifests[1].figure.thresholds).toEqual(manifests[0].figure.thresholds);
    expect(manifests[1].figure.legend).toEqual(manifests[0].figure.legend);
    for (const file of ["README.md", "citation.txt", "map.svg"]) expect(bundles[1][file]).not.toMatch(/[\u3400-\u9fff]/u);
  }
});

for (const view of [
  { route: "/data/?tab=high_frequency&country=hungary&indicator=hicp_annual_rate&from=2020&to=2020&history=1", scope: "high-frequency" },
  { route: "/data/?tab=macro_drivers&driver=policy_rate&area=hungary&transformation=level&history=0", scope: "macro-drivers" },
  { route: "/data/?tab=high_frequency&country=serbia&sors_series=lfs_unemployment_quarterly", scope: "sors-monthly" },
  { route: "/countries/poland/?compare=hungary", scope: "country-compare" },
]) test(`bilingual snapshot parity: ${view.scope}`, async ({ page }) => {
  const bundles: Record<string, string>[] = [];
  for (const locale of ["zh-CN", "en"] as const) {
    await page.goto(localizedRoute(view.route, locale), { waitUntil: "networkidle" });
    const scope = page.locator(view.scope === "country-compare" ? "[data-country-compare]" : `[data-snapshot-scope="${view.scope}"]`);
    const pending = page.waitForEvent("download");
    await scope.getByRole("button", { name: locale === "en" ? "Export research snapshot" : "导出研究快照", exact: true }).click();
    const download = await pending;
    bundles.push(JSON.parse(execFileSync("python3", ["-c", "import sys,zipfile,json; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps({n:z.read(n).decode('utf-8') for n in z.namelist()}))", (await download.path())!], { maxBuffer: 12 * 1024 * 1024 }).toString()));
  }
  for (const file of ["data.csv", "sources.csv"]) expect(bundles[1][file]).toEqual(bundles[0][file]);
  for (const file of ["README.md", "citation.txt", "figure.svg"]) if (bundles[1][file]) expect(bundles[1][file]).not.toMatch(/[\u3400-\u9fff]/u);
  const manifests = bundles.map(bundle => JSON.parse(bundle["manifest.json"]));
  for (const key of ["filters", "sources", "observation_count", "schema", "comparison"]) expect(manifests[1][key]).toEqual(manifests[0][key]);
});
