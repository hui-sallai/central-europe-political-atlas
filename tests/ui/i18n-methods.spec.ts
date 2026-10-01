import { expect, test } from "@playwright/test";
import { runtimeAnalysisSkills } from "../../src/lib/analysisSkills";
import { englishAnalysisSkill } from "../../src/i18n/analysisPresentation";

test("English method overlays cannot change canonical capabilities", () => {
  for (const skill of runtimeAnalysisSkills) {
    const overlay = englishAnalysisSkill(skill);
    const canonicalFields = (value: typeof skill) => Object.fromEntries(Object.entries(value).filter(([key]) => !["name", "description", "limitations", "reason_zh", "method_kind"].includes(key)));
    expect(canonicalFields(overlay)).toEqual(canonicalFields(skill));
    expect([overlay.name, overlay.description, ...overlay.limitations, overlay.reason_zh ?? ""].join(" ")).not.toMatch(/[\u3400-\u9fff]/u);
    expect(overlay.limitations.length).toBe(skill.limitations.length);
  }
});

for (const skill of runtimeAnalysisSkills) test(`English method controls and diagnostics: ${skill.skill_id}`, async ({ page }) => {
  await page.goto(`/en/models/?skill=${skill.skill_id}`, { waitUntil: "networkidle" });
  await expect(page.locator(`#${skill.skill_id} h2`)).toHaveText(englishAnalysisSkill(skill).name);
  const actions: Record<string, string> = { composite_indicators: "Run analysis", panel_econometrics: "Run panel model", reduced_form_var: "Run VAR model" };
  if (actions[skill.skill_id]) {
    const action = page.getByRole("button", { name: actions[skill.skill_id], exact: true });
    await expect(action).toBeEnabled();
    await action.click();
  }
  await page.locator("details").evaluateAll(details => details.forEach(detail => { (detail as HTMLDetailsElement).open = true; }));
  if (skill.skill_id === "panel_local_projections") {
    await page.getByRole("button", { name: "Overlay fitted-model paths (descriptive)", exact: true }).click();
    await page.getByRole("button", { name: "View composition and specification sensitivity details", exact: true }).click();
    await page.locator("details").evaluateAll(details => details.forEach(detail => { (detail as HTMLDetailsElement).open = true; }));
  }
  const untranslated = await page.locator("body").evaluate(body => {
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const failures: string[] = [];
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim() ?? "";
      if (!node.parentElement?.closest("[data-original-language],script,style") && text !== "中文" && /[\u3400-\u9fff]/u.test(text)) failures.push(text);
    }
    return [...new Set(failures)];
  });
  expect(untranslated).toEqual([]);
  const untranslatedAttributes = await page.locator("main").evaluate(main => [...main.querySelectorAll("[aria-label],[title],[placeholder],[alt]")].filter(element => !element.closest("[data-original-language]")).flatMap(element => ["aria-label", "title", "placeholder", "alt"].map(attribute => element.getAttribute(attribute) ?? "").filter(value => /[\u3400-\u9fff]/u.test(value))));
  expect(untranslatedAttributes).toEqual([]);
  expect(await page.locator("main").evaluate(element => element.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
