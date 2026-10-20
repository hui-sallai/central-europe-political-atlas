import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { addNotebookEvidence, emptyNotebook, NOTEBOOK_STORAGE_KEY, serializeNotebook, type EvidenceDraft } from "../../src/lib/researchNotebook";
const collected = "2026-10-01T12:00:00.000Z";
const draft: EvidenceDraft = {
  type: "observation", title: "Recorded observation", labels: { en: "Recorded observation", "zh-CN": "已记录观测" },
  url: "https://hy-central-europe-analysis.org/data/?country=germany&indicator=real_gdp_growth&from=2025&to=2025",
  canonical_ids: ["germany:gdp:2025"], countries: ["germany"], periods: ["2025"], value: -1.25, unit: "%",
  sources: [{ institution: "Original Publisher 原机构", dataset: "GDP publication", url: "https://example.org/official?code=gdp&unit=rate", layer: "official_annual", retrieved_at: "2026-09-20", updated_at: "2026-09-01" }],
  layer: "official_annual", comparability: "Same statistical definition only", warnings: ["Recorded definition warning"], metadata: { status: "published" },
};
function fixture() {
  let state = emptyNotebook("en", "v2.0 stored platform", collected);
  state = addNotebookEvidence(state, draft, state.platform_version, collected);
  state = addNotebookEvidence(state, { ...draft, title: "Missing observation", labels: { en: "Missing observation", "zh-CN": "缺失观测" }, canonical_ids: ["hungary:missing:2024"], countries: ["hungary"], periods: ["2024"], value: null, sources: [{ ...draft.sources[0], institution: "Excluded Publisher", dataset: "Missing source", url: "https://example.org/missing" }] }, state.platform_version, collected);
  state = addNotebookEvidence(state, { ...draft, type: "series_view", url: "https://hy-central-europe-analysis.org/models/?tab=compare&compare_frequency=monthly", title: "Monthly setup", labels: { en: "Monthly setup", "zh-CN": "月度设置" }, canonical_ids: ["monthly:hicp"], countries: ["germany", "hungary"], periods: ["2024-01", "2025-12"], value: undefined, sources: [], layer: "monthly_descriptive", metadata: { filters: { indicator: "hicp_annual_rate", from: "2024-01", to: "2025-12" } } }, state.platform_version, collected);
  return { ...state, title: "Evidence 证据 [brief]", research_question: "What changed? / 有何变化？", user_notes: "My note <script>window.briefInjected=1</script>\n# User heading", items: state.items.map(item => ({ ...item, note: "Literal **personal** note 备注" })) };
}
for (const prefix of ["", "/en"]) {
  const en = !!prefix;
  test(`brief selection, order, source-linked preview and Markdown export ${prefix || "zh"}`, async ({ page }, info) => {
    const state = fixture(), raw = serializeNotebook(state), writes: string[] = [];
    page.on("request", request => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: NOTEBOOK_STORAGE_KEY, raw });
    await page.goto(`${prefix}/notebook/`, { waitUntil: "networkidle" });
    const panel = page.locator("[data-notebook-brief]");
    await panel.locator("summary").focus(); await expect(panel.locator("summary")).toBeFocused(); await panel.locator("summary").press("Enter");
    const preview = panel.locator("[data-brief-preview]");
    await expect(preview).toContainText("-1.25"); await expect(preview).toContainText(en ? "Missing / unavailable" : "缺失／不可用");
    await expect(preview).toContainText(en ? "Research configuration" : "研究配置");
    await expect(preview).toContainText("2026-09-20"); await expect(preview).toContainText(collected); await expect(preview).toContainText("2025");
    await expect(preview).toContainText(en ? "Source retrieval date" : "来源检索日期");
    await expect(preview).toContainText("Same statistical definition only"); await expect(preview).toContainText("Literal **personal** note 备注");
    await expect(preview.locator("script,img")).toHaveCount(0);
    const missing = panel.locator(`[data-brief-choice="${state.items[1].id}"]`);
    await missing.getByRole("checkbox").uncheck(); await expect(preview).not.toContainText("Excluded Publisher");
    const setup = panel.locator(`[data-brief-choice="${state.items[2].id}"]`);
    await setup.getByRole("button", { name: new RegExp(`^${en ? "Move up" : "上移"}:`) }).click();
    await setup.getByRole("button", { name: new RegExp(`^${en ? "Move up" : "上移"}:`) }).click();
    await expect(preview.getByRole("heading", { name: en ? "1. Monthly setup" : "1. 月度设置", exact: true })).toBeVisible();
    await expect(preview.getByRole("link", { name: draft.url, exact: true })).toHaveAttribute("href", draft.url);
    await expect(preview.getByRole("link", { name: "Original Publisher 原机构 · GDP publication", exact: true })).toHaveAttribute("href", draft.sources[0].url);
    const [download] = await Promise.all([page.waitForEvent("download"), panel.getByRole("button", { name: en ? "Export Evidence Brief (Markdown)" : "导出研究证据简报（Markdown）", exact: true }).click()]);
    expect(download.suggestedFilename()).toMatch(new RegExp(`^atlas-evidence-brief-${en ? "en" : "zh-CN"}-\\d{4}-\\d{2}-\\d{2}\\.md$`));
    const text = fs.readFileSync((await download.path())!, "utf8");
    expect(text).toContain(en ? "## Research question" : "## 研究问题"); expect(text).toContain("2026-09-20"); expect(text).toContain(collected);
    expect(text).toContain("Original Publisher 原机构"); expect(text).not.toContain("Excluded Publisher"); expect(text).toContain(`(<${draft.sources[0].url}>)`);
    expect(text).toContain("\\<script\\>"); expect(text).toContain("\\*\\*personal\\*\\*");
    expect(await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_STORAGE_KEY)).toBe(raw);
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
    const axe = await new AxeBuilder({ page }).include("[data-notebook-brief]").analyze();
    expect(axe.violations.filter(v => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
    await preview.screenshot({ path: info.outputPath("evidence-brief-preview.png") });
  });
  test(`brief empty selection does not export or change JSON ${prefix || "zh"}`, async ({ page }) => {
    const raw = serializeNotebook(fixture());
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: NOTEBOOK_STORAGE_KEY, raw });
    await page.goto(`${prefix}/notebook/`, { waitUntil: "networkidle" });
    const panel = page.locator("[data-notebook-brief]"); await panel.locator("summary").click();
    await panel.getByRole("button", { name: en ? "Deselect all" : "取消全选", exact: true }).click();
    await expect(panel.locator("[data-brief-preview]")).toHaveCount(0);
    await expect(panel.getByRole("button", { name: en ? "Export Evidence Brief (Markdown)" : "导出研究证据简报（Markdown）", exact: true })).toBeDisabled();
    await expect(panel).toContainText(en ? "Select at least one" : "请至少选择一条");
    await panel.getByRole("button", { name: en ? "Select all" : "全选", exact: true }).click();
    await expect(panel.getByRole("checkbox", { checked: true })).toHaveCount(3);
    expect(await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_STORAGE_KEY)).toBe(raw);
  });
  test(`empty notebook retains existing JSON interface without a misleading brief ${prefix || "zh"}`, async ({ page }) => {
    await page.goto(`${prefix}/notebook/`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-notebook-page]")).toContainText(en ? "No evidence collected yet" : "尚未收集证据");
    await expect(page.locator("[data-notebook-brief]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: en ? "Export research notebook" : "导出研究笔记", exact: true })).toBeEnabled();
  });
}
