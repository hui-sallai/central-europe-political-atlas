import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ALL_COUNTRIES = [
  "germany",
  "poland",
  "czechia",
  "slovakia",
  "hungary",
  "austria",
  "slovenia",
  "croatia",
  "romania",
  "serbia",
] as const;

const SECTION_IDS = [
  "overview",
  "economy",
  "institutions",
  "elections",
  "regions",
  "research",
  "events",
  "sources",
] as const;

test.describe("Antigravity Batch 4 Country Research Hub integration", () => {
  for (const prefix of ["/en", ""] as const) {
    const en = prefix === "/en";

    test(`section anchors, module separation, indicator handoffs, and accessibility on representative hubs (${en ? "en" : "zh"})`, async ({ page }) => {
      for (const slug of ["germany", "hungary", "serbia"] as const) {
        await page.goto(`${prefix}/countries/${slug}/`, { waitUntil: "networkidle" });
        const profile = page.locator("[data-country-profile]");
        await expect(profile).toBeVisible();

        // Distinct semantic sections for institutions, elections, regions, research, events, sources
        for (const id of ["institutions", "elections", "regions", "research", "events", "sources"] as const) {
          await expect(profile.locator(`section#${id}`)).toHaveCount(1);
        }

        // Section navigation anchors land cleanly below the sticky global header
        const headerHeight = await page.locator("header.site-header").evaluate((el) => el.getBoundingClientRect().height);
        const nav = profile.getByRole("navigation", { name: en ? "Profile sections" : "档案章节" });
        for (const id of ["elections", "regions", "events", "sources"] as const) {
          await nav.locator(`a[href="#${id}"]`).click();
          await expect.poll(() => new URL(page.url()).hash).toBe(`#${id}`);
          const targetTop = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
          expect(targetTop).toBeGreaterThanOrEqual(headerHeight - 2);
        }

        // Serbia qualifications preserved
        if (slug === "serbia") {
          const serbiaBox = profile.locator("[data-serbia-availability]");
          await expect(serbiaBox).toBeVisible();
          await expect(serbiaBox).toContainText("NSTJ3");
          await expect(serbiaBox).toContainText("SORS");
        }
      }

      // Economic handoff preserves selected indicator in single-country and two-country modes
      await page.goto(`${prefix}/countries/germany/`, { waitUntil: "networkidle" });
      const profile = page.locator("[data-country-profile]");
      await profile.locator("select").first().selectOption("government_debt_gdp");

      const singleHandoff = profile.locator("[data-economy-selected-handoff]");
      await expect(singleHandoff).toHaveAttribute("href", new RegExp(`comparison_indicator=annual%3Agovernment_debt_gdp`));
      const sourcesHandoff = profile.locator("[data-sources-selected-handoff]");
      await expect(sourcesHandoff).toHaveAttribute("href", new RegExp(`comparison_indicator=annual%3Agovernment_debt_gdp`));

      await profile.getByLabel(en ? "Compare with" : "加入比较的国家", { exact: true }).selectOption("poland");
      await expect(sourcesHandoff).toHaveAttribute("href", new RegExp(`compare_countries=germany%2Cpoland`));
      await expect(sourcesHandoff).toHaveAttribute("href", new RegExp(`comparison_indicator=annual%3Agovernment_debt_gdp`));

      // Follow indicator-preserving handoff into Data Explorer and verify state restoration
      await sourcesHandoff.click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/data/.*comparison_indicator=annual%3Agovernment_debt_gdp`));
      const ws = page.locator("[data-national-comparison]");
      await expect(ws.locator("[data-active-research-summary]")).toContainText("government_debt_gdp");
      await expect(ws.getByRole("checkbox", { name: en ? "Germany" : "德国", exact: true })).toBeChecked();
      await expect(ws.getByRole("checkbox", { name: en ? "Poland" : "波兰", exact: true })).toBeChecked();

      // Accessibility in light & dark modes on /countries/germany/
      await page.goto(`${prefix}/countries/germany/?compare=poland`, { waitUntil: "networkidle" });
      const cta = page.locator("[data-country-profile] .cta-dark").first();
      for (const [scheme, expectedBg] of [
        ["light", "rgb(24, 34, 45)"],
        ["dark", "rgb(232, 229, 222)"],
      ] as const) {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await expect.poll(() => cta.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(expectedBg);
        const axe = await new AxeBuilder({ page }).include("[data-country-profile]").analyze();
        expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test(`tablet viewports (1024px, 768px) and all 10 country routes render cleanly (${en ? "en" : "zh"})`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop-1440", "All-country & tablet viewport sweep runs once under desktop-1440");
      for (const width of [1024, 768] as const) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${prefix}/countries/hungary/`, { waitUntil: "networkidle" });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }

      await page.setViewportSize({ width: 1440, height: 900 });
      for (const slug of ALL_COUNTRIES) {
        const errors: string[] = [];
        const failedRequests: string[] = [];
        const onConsole = (m: { type: () => string; text: () => string }) => {
          if (m.type() === "error") errors.push(m.text());
        };
        const onResponse = (r: { status: () => number; url: () => string }) => {
          if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
        };
        page.on("console", onConsole);
        page.on("response", onResponse);

        await page.goto(`${prefix}/countries/${slug}/`, { waitUntil: "networkidle" });
        await expect(page.locator("[data-country-profile]")).toBeVisible();
        for (const id of SECTION_IDS) {
          await expect(page.locator(`#${id}`)).toHaveCount(1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        expect(errors, `console errors on ${prefix}/countries/${slug}/`).toEqual([]);
        expect(failedRequests, `failed requests on ${prefix}/countries/${slug}/`).toEqual([]);

        page.off("console", onConsole);
        page.off("response", onResponse);
      }
    });
  }
});
