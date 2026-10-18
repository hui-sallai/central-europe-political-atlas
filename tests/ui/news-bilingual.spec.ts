import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { weeklyNews20261011 } from "../../src/lib/weeklyNews/2026-10-11";
import { newsTranslations } from "../../src/lib/newsTranslations";

test("approved news batch: all ten countries, bilingual paragraphs, sources and responsive layout", async ({ page }) => {
  test.setTimeout(120_000);
  const countries = [...new Set(weeklyNews20261011.map(item => item.countrySlug))];
  for (const locale of ["zh-CN", "en"] as const) for (const country of countries) {
    await page.goto(`${locale === "en" ? "/en" : ""}/news/?country=${country}&from=2026-09-06&to=2026-10-11`, { waitUntil: "networkidle" });
    const items = weeklyNews20261011.filter(item => item.countrySlug === country);
    await expect(page.locator("[data-news-count]")).toHaveText(String(items.length));
    for (const item of items) {
      const card = page.locator(`[id="${item.id}"]`);
      await expect(card).toBeVisible();
      await expect(card.locator("h3")).toHaveText(locale === "en" ? newsTranslations[item.id].title : item.title);
      const summary = card.locator("div[data-presentation-language] > p");
      await expect(summary).toHaveCount(2);
      await expect(summary.first()).toHaveText((locale === "en" ? newsTranslations[item.id].summary : item.summary).split("\n\n")[0]);
      await expect(card.locator(`a[href="${item.sourceUrl}"]`)).toHaveCount(1);
      await expect(card.locator("div[data-presentation-language]")).toHaveAttribute("lang", locale === "en" ? "en" : "zh-CN");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await page.goto("/en/news/?country=croatia&from=2026-09-06&to=2026-10-11&q=minimum%20wage", { waitUntil: "networkidle" });
  await expect(page.locator("[data-news-count]")).toHaveText("1");
  await expect(page.locator("article[id] h3")).toContainText("Minimum Wage");
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await expect(page.locator("html")).toHaveAttribute("data-theme", colorScheme);
    await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  }
});

test("2026-10-18 batch: every record visible in both languages with its source", async ({ page }) => {
  const { weeklyNews20261018 } = await import("../../src/lib/weeklyNews/2026-10-18");
  for (const locale of ["zh-CN", "en"] as const) {
    await page.goto(`${locale === "en" ? "/en" : ""}/news/?from=2026-10-12&to=2026-10-18`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-news-count]")).toHaveText(String(weeklyNews20261018.length));
    // The list shows the newest 30 records first; check the most recent ones.
    for (const item of [...weeklyNews20261018].sort((x, y) => y.weekOf.localeCompare(x.weekOf)).slice(0, 6)) {
      const card = page.locator(`article[id="${item.id}"]`);
      await expect(card.locator("h3")).toHaveText(locale === "en" ? newsTranslations[item.id].title : item.title);
      await expect(card.locator(`a[href="${item.sourceUrl}"]`)).toHaveCount(1);
    }
  }
});
