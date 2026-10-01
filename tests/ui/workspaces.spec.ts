import fs from "node:fs";
import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { workspaceIds, researchWorkspaces } from "../../src/content/researchWorkspaces";
import { buildWorkspaceEvidence } from "../../src/components/workspaceEvidence";
import { buildWorkspaceSnapshot } from "../../src/lib/workspaceSnapshot";
import { comparisonAllowed, workspaceLinks } from "../../src/components/workspaceLinks";
import { buildZip } from "../../src/lib/clientZip";
function unzip(bytes: Buffer | Uint8Array): Record<string, string> {
  return JSON.parse(execFileSync("python3", ["-c", "import sys,io,zipfile,json; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; print(json.dumps({n:z.read(n).decode('utf-8') for n in z.namelist()}))"], { input: bytes }).toString());
}
for (const locale of ["zh-CN", "en"] as const) for (const id of ["", ...workspaceIds]) test(`workspace route and accessibility: ${locale} ${id || "index"}`, async ({ page }) => {
  const path = `${locale === "en" ? "/en" : ""}/workspaces/${id ? `${id}/` : ""}`;
  const html = fs.readFileSync(`out${path}index.html`, "utf8");
  expect(html).toContain(`<html lang="${locale}"`);
  expect(html).toContain(`href="https://hy-central-europe-analysis.org${path}"`);
  expect(html).not.toContain('"@type":"Dataset"');
  await page.goto(path, { waitUntil: "networkidle" });
  await expect(page.locator("h1")).toHaveCount(1);
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    expect(await page.locator("body").evaluate(el => el.scrollWidth <= innerWidth + 2)).toBe(true);
  }
  if (id) {
    expect(await page.locator('[data-method-state="registry_only"] a, [data-method-state="blocked"] a').count()).toBe(0);
    for (const link of await page.locator('[data-workspace-method] a').evaluateAll(els => els.map(el => el.getAttribute("href")))) expect(link).toContain("skill=");
  }
});
test("country selection, gate, query round trip and workspace download", async ({ page }) => {
  await page.goto("/en/workspaces/inflation_monetary_policy/?countries=hungary&from=2021&to=2026#research", { waitUntil: "networkidle" });
  await page.getByRole("combobox", { name: "Compare with (optional)", exact: true }).selectOption("serbia");
  await expect(page.locator("[data-comparison-unavailable]").first()).toContainText("Comparison unavailable");
  await expect(page.locator('[data-workspace-evidence="cpi_annual_index:sors"]')).toContainText("SORS");
  const sourceLink = page.locator('[data-workspace-evidence="cpi_annual_index:sors"] a').filter({ hasText: "Open in Data Explorer" });
  await expect(sourceLink).toHaveAttribute("href", /sors_series=cpi_annual_index/);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export research workspace", exact: true }).click();
  const download = await downloadPromise;
  const files = unzip(fs.readFileSync((await download.path())!));
  expect(Object.keys(files)).toEqual(["README.md", "workspace.json", "links.json", "sources-summary.csv", "citation.txt"]);
  const setup = JSON.parse(files["workspace.json"]);
  expect(setup.selected_countries).toEqual(["hungary", "serbia"]);
  expect(setup.selected_date_range).toEqual({ from: 2021, to: 2026 });
  expect(setup.locale).toBe("en"); expect(setup.platform_version).toMatch(/^v2\.0 /);
  expect(setup.formal_model_samples).toBe("unchanged"); expect(setup.linked_methods).not.toContain("svar");
  expect(files["README.md"]).not.toMatch(/[\u3400-\u9fff]/u);
  expect(files["sources-summary.csv"]).toContain("SORS");
  for (const link of Object.values(JSON.parse(files["links.json"])).flat() as { url: string }[]) expect(link.url).toMatch(/^https:\/\/hy-central-europe-analysis\.org\//);
  await page.getByRole("link", { name: "中文", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "对比国家（可选）", exact: true })).toHaveValue("serbia");
  expect(new URL(page.url()).searchParams.get("countries")).toBe("hungary,serbia"); expect(new URL(page.url()).hash).toBe("#research");
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Compare with (optional)", exact: true })).toHaveValue("serbia");
});
test("workspace deep links select existing Data, Models and Map state", async ({ page }) => {
  await page.goto("/en/workspaces/fiscal_macro_conditions/?countries=poland&from=2021&to=2022", { waitUntil: "networkidle" });
  await page.locator('[data-workspace-evidence="real_gdp_growth:canonical_annual"]').getByRole("link", { name: "Open in Data Explorer · Poland", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Country", exact: true })).toHaveValue("poland");
  await expect(page.getByRole("combobox", { name: "Indicator", exact: true })).toHaveValue("real_gdp_growth");
  await expect(page.getByRole("combobox", { name: "Start year", exact: true })).toHaveValue("2021");
  await page.goto("/en/workspaces/trade_external_exposure/?countries=poland&from=2021&to=2024", { waitUntil: "networkidle" });
  await page.locator('[data-workspace-method="network_dependency"]').getByRole("link", { name: "Open in Models", exact: true }).click();
  await expect(page).toHaveURL(/skill=network_dependency/);
  await expect(page.locator("#network_dependency")).toBeVisible();
  await page.goto("/en/workspaces/regional_development/?countries=hungary&from=2021&to=2024", { waitUntil: "networkidle" });
  await page.locator('[data-workspace-evidence="regional_population:regional"]').getByRole("link", { name: "Open in Map · Hungary", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Layer", exact: true })).toHaveValue("regional_population");
  await expect(page).toHaveURL(/country=hungary/);
});
test("invalid setup, inactive-method fixture and deterministic setup-only archive", () => {
  const payload = buildWorkspaceEvidence(researchWorkspaces[0], "en");
  const selection = { countries: ["hungary", "serbia"], from: 2021, to: 2026 };
  expect(() => buildWorkspaceSnapshot(payload, { ...selection, from: 2027 }, "en")).toThrow();
  expect(() => buildWorkspaceSnapshot(payload, { ...selection, countries: ["unknown"] }, "en")).toThrow();
  expect(() => buildWorkspaceSnapshot(payload, { ...selection, countries: ["hungary", "hungary"] }, "en")).toThrow();
  const blocked = { ...payload, methods: payload.methods.map(method => ({ ...method, state: "blocked" as const })) };
  expect(workspaceLinks(blocked, selection, "en").models).toEqual([]);
  expect(payload.cards.every(card => !comparisonAllowed(card, selection))).toBe(true);
  const snapshot = buildWorkspaceSnapshot(payload, selection, "en", "2026-10-01T12:00:00Z");
  const files = unzip(buildZip(snapshot.files, snapshot.generatedAt));
  expect(files["workspace.json"]).not.toContain('"value"');
  expect(files["workspace.json"]).not.toContain('"estimate"');
  expect(files["workspace.json"]).toBe(snapshot.files.find(file => file.name === "workspace.json")!.content);
  expect(Buffer.from(buildZip(snapshot.files, snapshot.generatedAt))).toEqual(Buffer.from(buildZip(snapshot.files, snapshot.generatedAt)));
});
test("Serbia regional evidence retains source-native NSTJ archive identity", async ({ page }) => {
  await page.goto("/en/workspaces/regional_development/?countries=serbia&from=2014&to=2025", { waitUntil: "networkidle" });
  const cards = page.locator('[data-workspace-evidence^="nstj:"]');
  expect(await cards.count()).toBeGreaterThan(0);
  await expect(cards.first()).toContainText("NSTJ");
  const links = await cards.locator('a[href^="/research-data/"]').evaluateAll(els => els.map(el => el.getAttribute("href")));
  expect(links.length).toBeGreaterThan(0); expect(links.every(link => link === "/research-data/serbia/serbia_descriptive_history_regional.json")).toBe(true);
  expect(await cards.locator('a[href*="/map/"]').count()).toBe(0);
  const downloadPromise = page.waitForEvent("download"); await page.getByRole("button", { name: "Export research workspace", exact: true }).click();
  const download = await downloadPromise; const files = unzip(fs.readFileSync((await download.path())!));
  expect(JSON.parse(files["workspace.json"]).linked_methods).toEqual([]);
  expect(files["sources-summary.csv"]).toContain("NSTJ"); expect(files["sources-summary.csv"]).toContain("SORS");
  expect(Object.keys(files)).not.toContain("data.csv");
});
