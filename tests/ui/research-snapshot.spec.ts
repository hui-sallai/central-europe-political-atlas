import { execFileSync } from "node:child_process";
import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { buildZip, crc32 } from "../../src/lib/clientZip";
import { buildSnapshot, csvCell, sanitizeFilename, type SnapshotInput } from "../../src/lib/researchSnapshot";

// Python's standard ZIP reader provides an independent archive, CRC and UTF-8 compatibility check.
function unzip(bytes: Buffer | Uint8Array): Record<string, string> {
  return JSON.parse(execFileSync("python3", ["-c", "import sys,io,zipfile,json; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; print(json.dumps({n:z.read(n).decode('utf-8') for n in z.namelist()}))"], { input: bytes, maxBuffer: 12 * 1024 * 1024 }).toString());
}
async function downloadSnapshot(page: Page, scope?: string) {
  const button = scope ? page.locator(scope).getByRole("button", { name: "导出研究快照", exact: true }) : page.getByRole("button", { name: "导出研究快照", exact: true }).first();
  await expect(button).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await button.click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const files = unzip(fs.readFileSync(path!));
  const manifest = JSON.parse(files["manifest.json"]);
  expect(Object.keys(files)).toEqual(manifest.files);
  expect(manifest.schema).toBe("atlas-descriptive-snapshot-v1");
  expect(files["view-url.txt"].trim()).toBe(manifest.shareable_view_url);
  expect(files["README.md"]).toContain(String(manifest.observation_count));
  return { files, manifest };
}
function csvRows(csv: string) {
  // All fixture/view cells here are one line. Embedded quotes are unescaped per RFC 4180.
  return csv.trimEnd().split(/\r?\n/).map((line) => [...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map((match) => match[1].replaceAll('""', '"')));
}

test("ZIP and normalized snapshot unit contracts", () => {
  expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  expect(csvCell(null)).toBe('""'); expect(csvCell('a,"b"\n')).toBe('"a,""b""\n"');
  expect(sanitizeFilename("../../A/B\\C:测试\u0000")).not.toMatch(/[\\/:\u0000]/);
  const input: SnapshotInput = {
    title: "测试", view_type: "annual", page_path: "/data/", shareable_view_url: "https://hy-central-europe-analysis.org/data/?country=serbia&from=2020", countries: ["serbia"], indicators: ["cpi"], filters: { from: 2020, history: false },
    rows: [1, 2].map((id) => ({ id: String(id), country: "serbia", indicator: "cpi", period: "2020", value: id === 1 ? null : 0, unit: "%", status: id === 1 ? "missing" : "official", layer: "serbia_sors_descriptive", cross_country_comparable: false, source: { institution: "SORS/RZS", dataset: "CPI", source_url: "https://opendata.stat.gov.rs/", original_unit: "%", source_code: "CPI", source_layer: "serbia_sors_descriptive" } })),
  };
  const snapshot = buildSnapshot(input, "2026-10-01T12:00:00Z");
  expect(snapshot.manifest.sources).toHaveLength(1);
  expect(snapshot.manifest.observation_count).toBe(2);
  expect(snapshot.manifest.filters).toEqual(input.filters);
  const files = unzip(buildZip(snapshot.files, snapshot.generatedAt));
  expect(Object.keys(files)).toEqual(["README.md", "manifest.json", "data.csv", "sources.csv", "citation.txt", "view-url.txt"]);
  const csv = csvRows(files["data.csv"]); const valueIndex = csv[0].indexOf("value");
  expect(csv[1][valueIndex]).toBe(""); expect(csv[2][valueIndex]).toBe("0");
  const unicode = unzip(buildZip([{ name: "数据.csv", content: "塞尔维亚" }], snapshot.generatedAt));
  expect(unicode).toEqual({ "数据.csv": "塞尔维亚" });
  expect(() => buildZip([{ name: "../bad", content: "" }], snapshot.generatedAt)).toThrow();
  expect(() => buildSnapshot({ ...input, view_type: "country_comparison" })).toThrow();
  expect(Buffer.from(buildZip(snapshot.files, snapshot.generatedAt))).toEqual(Buffer.from(buildZip(snapshot.files, snapshot.generatedAt)));
});

test("annual snapshot follows filters, missing values, figure and sharing", async ({ page }) => {
  await page.goto("/data/?country=poland&indicator=hicp_inflation&from=2020&to=2022&history=0", { waitUntil: "networkidle" });
  await page.getByRole("combobox", { name: "结束年份", exact: true }).selectOption("2021");
  const { files, manifest } = await downloadSnapshot(page);
  expect(manifest.filters).toMatchObject({ country: "poland", indicator: "hicp_inflation", from: "2020", to: "2021", latest: false, history: false });
  const csv = csvRows(files["data.csv"]); const headers = csv.shift()!;
  expect(csv).toHaveLength(manifest.observation_count);
  expect(csv.every((row) => row[headers.indexOf("country")] === "poland" && row[headers.indexOf("indicator")] === "hicp_inflation" && ["2020", "2021"].includes(row[headers.indexOf("period")]))).toBe(true);
  expect(files["figure.svg"]).toContain("2021"); expect(files["figure.svg"]).not.toContain("var(--");
  expect(manifest.shareable_view_url).toContain("to=2021");
  const url = new URL(manifest.shareable_view_url);
  await page.goto(url.pathname + url.search, { waitUntil: "networkidle" });
  expect((await downloadSnapshot(page)).files["data.csv"]).toBe(files["data.csv"]);
});

test("latest/history/search filters and SORS original provenance", async ({ page }) => {
  await page.goto("/data/?country=serbia&indicator=trade_balance&from=2000&to=2002&history=0&sors=1", { waitUntil: "networkidle" });
  const { files, manifest } = await downloadSnapshot(page);
  const csv = csvRows(files["data.csv"]); const headers = csv.shift()!;
  expect(csv.some((row) => row[headers.indexOf("value")] === "")).toBe(true);
  expect(csv.filter((row) => row[headers.indexOf("value")] === "").every((row) => row[headers.indexOf("status")] !== "official")).toBe(true);
  const sourceCsv = csvRows(files["sources.csv"]); const sourceHeaders = sourceCsv.shift()!;
  const sors = sourceCsv.filter((row) => row[sourceHeaders.indexOf("institution")].includes("SORS"));
  expect(sors.length).toBeGreaterThan(0);
  expect(sors.every((row) => row[sourceHeaders.indexOf("source_code")] && row[sourceHeaders.indexOf("original_unit")])).toBe(true);
  expect(manifest.known_limitations.join(" ")).toContain("不可跨国比较");
  await page.getByLabel("仅显示每个指标的最新值").check();
  const latest = await downloadSnapshot(page);
  expect(latest.manifest.filters.latest).toBe(true);
  expect(latest.manifest.observation_count).toBeLessThanOrEqual(manifest.observation_count);
  await page.getByRole("searchbox").fill("no-such-indicator");
  expect((await downloadSnapshot(page)).manifest.observation_count).toBe(0);
});

test("high-frequency and macro snapshot controls round-trip", async ({ page }) => {
  await page.goto("/data/?tab=high_frequency&country=hungary&indicator=hicp_annual_rate&from=2020&to=2020&history=0", { waitUntil: "networkidle" });
  const hf = await downloadSnapshot(page, '[data-snapshot-scope="high-frequency"]');
  expect(hf.manifest.view_type).toBe("high_frequency"); expect(hf.manifest.observation_count).toBe(12);
  expect(hf.manifest.filters).toMatchObject({ country: "hungary", from: "2020", to: "2020", history: false });
  await page.goto("/data/?tab=macro_drivers&driver=policy_rate&area=hungary&transformation=level&history=0", { waitUntil: "networkidle" });
  const macro = await downloadSnapshot(page, '[data-snapshot-scope="macro-drivers"]');
  expect(macro.manifest.filters).toMatchObject({ driver: "policy_rate", area: "hungary", transformation: "level", history: false });
  expect(macro.manifest.observation_count).toBeGreaterThan(0); expect(macro.files["figure.svg"]).toBeTruthy();
  const url = new URL(macro.manifest.shareable_view_url);
  await page.goto(url.pathname + url.search, { waitUntil: "networkidle" });
  expect((await downloadSnapshot(page, '[data-snapshot-scope="macro-drivers"]')).files["data.csv"]).toBe(macro.files["data.csv"]);
});

test("SORS quarterly selection round-trips and original periods remain quarterly", async ({ page }) => {
  await page.goto("/data/?tab=high_frequency&country=serbia&sors_series=lfs_unemployment_quarterly", { waitUntil: "networkidle" });
  const snapshot = await downloadSnapshot(page, '[data-snapshot-scope="sors-monthly"]');
  expect(snapshot.manifest.filters.frequency).toBe("quarterly");
  expect(snapshot.files["data.csv"]).toContain("-Q");
  expect(snapshot.manifest.known_limitations.join(" ")).toContain("季末月份");
  const url = new URL(snapshot.manifest.shareable_view_url);
  await page.goto(url.pathname + url.search, { waitUntil: "networkidle" });
  expect((await downloadSnapshot(page, '[data-snapshot-scope="sors-monthly"]')).files["data.csv"]).toBe(snapshot.files["data.csv"]);
});

test("missing SORS archive metadata preserves display but blocks incomplete bundle", async ({ page }) => {
  await page.route("**/research-data/serbia/serbia_descriptive_history_*.json", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/data/?tab=high_frequency&country=serbia", { waitUntil: "networkidle" });
  const scope = page.locator('[data-snapshot-scope="sors-monthly"]');
  await expect(scope.locator("tbody tr").first()).toBeVisible();
  await expect(scope.getByRole("button", { name: "导出研究快照" })).toBeDisabled();
  await expect(scope).toContainText("原始来源代码暂不可用");
});

test("country pair export uses the displayed common-year values", async ({ page }) => {
  await page.goto("/countries/poland/?compare=hungary", { waitUntil: "networkidle" });
  const { manifest, files } = await downloadSnapshot(page, "[data-country-compare]");
  expect(manifest.countries).toEqual(["poland", "hungary"]);
  expect(manifest.observation_count).toBe(12);
  const csv = csvRows(files["data.csv"]); const headers = csv.shift()!;
  for (let i = 0; i < csv.length; i += 2) {
    expect(csv[i][headers.indexOf("period")]).toBe(csv[i + 1][headers.indexOf("period")]);
    expect(csv[i][headers.indexOf("unit")]).toBe(csv[i + 1][headers.indexOf("unit")]);
  }
  expect(files["sources.csv"]).toContain("https://");
});

test("map snapshot matches the map SVG export and has neutral dark-mode formatting", async ({ page }) => {
  await page.goto("/map/?country=hungary&layer=regional_population&year=2024&classification=equal_interval", { waitUntil: "networkidle" });
  await expect(page.locator('svg[data-map-export="hungary"]')).toBeVisible();
  await page.getByRole("button", { name: /外观：/ }).click();
  await page.getByRole("button", { name: /外观：/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const { manifest, files } = await downloadSnapshot(page);
  expect(manifest.view_type).toBe("regional_map");
  expect(manifest.filters).toMatchObject({ layer: "regional_population", classification: "equal_interval" });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出地图（SVG）", exact: true }).click();
  const svg = fs.readFileSync((await (await downloadPromise).path())!, "utf8");
  expect(files["map.svg"]).toBe(svg); expect(svg).not.toContain("var(--");
  expect(svg).toContain("© EuroGeographics");
  const csv = csvRows(files["data.csv"]); const headers = csv.shift()!;
  expect(csv).toHaveLength(manifest.observation_count);
  expect(csv.every((row) => row[headers.indexOf("country")] === "hungary" && row[headers.indexOf("period")] === manifest.filters.year)).toBe(true);
  expect(manifest.figure.legend).toHaveLength(5);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(axe.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
});
