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

    test(`all eight section anchors, keyboard nav, deep-link reload, language switch, and accessibility (${en ? "en" : "zh"})`, async ({ page }) => {
      // Representative hubs: Germany, Hungary, Serbia
      for (const slug of ["germany", "hungary", "serbia"] as const) {
        await page.goto(`${prefix}/countries/${slug}/?indicator=government_debt_gdp&compare=poland`, { waitUntil: "networkidle" });
        const profile = page.locator("[data-country-profile]");
        await expect(profile).toBeVisible();

        for (const id of ["institutions", "elections", "regions", "research", "events", "sources"] as const) {
          await expect(profile.locator(`section#${id}`)).toHaveCount(1);
        }

        // Verify natural card heights (items-start prevents Regions from stretching to Research height on desktop)
        const headerHeight = await page.locator("header.site-header").evaluate((el) => el.getBoundingClientRect().height);
        const nav = profile.getByRole("navigation", { name: en ? "Profile sections" : "档案章节" });

        // Exercise ALL 8 section anchors, preserving existing query params and landing below sticky header
        for (const id of SECTION_IDS) {
          const anchor = nav.locator(`a[href="#${id}"]`);
          if (id === "events") {
            await anchor.focus();
            await expect(anchor).toBeFocused();
            await page.keyboard.press("Enter");
          } else {
            await anchor.click();
          }
          await expect.poll(() => new URL(page.url()).hash).toBe(`#${id}`);
          expect(new URL(page.url()).searchParams.get("indicator")).toBe("government_debt_gdp");
          expect(new URL(page.url()).searchParams.get("compare")).toBe("poland");
          const targetTop = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
          expect(targetTop).toBeGreaterThanOrEqual(headerHeight - 2);
        }

        if (slug === "serbia") {
          const serbiaBox = profile.locator("[data-serbia-availability]");
          await expect(serbiaBox).toBeVisible();
          await expect(serbiaBox).toContainText("NSTJ3");
          await expect(serbiaBox).toContainText("SORS");
        }
      }

      // Direct navigation to a section deep link, reload, and language switch preserving query + fragment
      const deepUrl = `${prefix}/countries/germany/?indicator=government_debt_gdp&compare=poland#events`;
      await page.goto(deepUrl, { waitUntil: "networkidle" });
      await expect.poll(() => new URL(page.url()).hash).toBe("#events");
      await page.reload({ waitUntil: "networkidle" });
      expect(new URL(page.url()).hash).toBe("#events");
      expect(new URL(page.url()).searchParams.get("indicator")).toBe("government_debt_gdp");
      expect(new URL(page.url()).searchParams.get("compare")).toBe("poland");

      const otherLangLink = page.locator(`header.site-header a[hreflang="${en ? "zh-CN" : "en"}"]`);
      await otherLangLink.click();
      await expect(page).toHaveURL((url) =>
        url.pathname === `${en ? "" : "/en"}/countries/germany/` &&
        url.searchParams.get("indicator") === "government_debt_gdp" &&
        url.searchParams.get("compare") === "poland" &&
        url.hash === "#events",
      );

      // Accessibility in light & dark modes (deterministic CSS readiness polling, no fixed sleep)
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

    test(`single-country and two-country economic handoffs, indicator changes, history back, and reload (${en ? "en" : "zh"})`, async ({ page }) => {
      // A. Single-country handoff: Germany + government_debt_gdp, no comparison country
      await page.goto(`${prefix}/countries/germany/`, { waitUntil: "networkidle" });
      const profile = page.locator("[data-country-profile]");
      const indicatorSelect = profile.locator("select").first();
      const compareSelect = profile.getByLabel(en ? "Compare with" : "加入比较的国家", { exact: true });

      await indicatorSelect.selectOption("government_debt_gdp");
      const singleHandoff = profile.locator("[data-economy-selected-handoff]");
      await expect(singleHandoff).toBeVisible();
      await singleHandoff.click();

      await expect(page).toHaveURL(new RegExp(`${prefix}/data/.*comparison_indicator=annual%3Agovernment_debt_gdp`));
      const ws = page.locator("[data-national-comparison]");
      await expect(ws.locator("[data-active-research-summary]")).toContainText("government_debt_gdp");
      await expect(ws.getByRole("checkbox", { name: en ? "Germany" : "德国", exact: true })).toBeChecked();
      await expect(ws.getByRole("checkbox", { name: en ? "Poland" : "波兰", exact: true })).not.toBeChecked();

      // F. Return from Data Explorer via browser history
      await page.goBack({ waitUntil: "networkidle" });
      await expect(page).toHaveURL(new RegExp(`${prefix}/countries/germany/.*indicator=government_debt_gdp`));
      await expect(indicatorSelect).toHaveValue("government_debt_gdp");

      // B. Two-country handoff: Germany + Poland + government_debt_gdp via Sources handoff
      await compareSelect.selectOption("poland");
      const sourcesHandoff = profile.locator("[data-sources-selected-handoff]");
      await expect(sourcesHandoff).toHaveAttribute("href", /compare_countries=germany%2Cpoland/);
      await expect(sourcesHandoff).toHaveAttribute("href", /comparison_indicator=annual%3Agovernment_debt_gdp/);
      await sourcesHandoff.click();

      await expect(ws.locator("[data-active-research-summary]")).toContainText("government_debt_gdp");
      await expect(ws.getByRole("checkbox", { name: en ? "Germany" : "德国", exact: true })).toBeChecked();
      await expect(ws.getByRole("checkbox", { name: en ? "Poland" : "波兰", exact: true })).toBeChecked();

      // C, D, E. Return, change indicator, reload deep link, then remove comparison country
      await page.goBack({ waitUntil: "networkidle" });
      await indicatorSelect.selectOption("unemployment_rate");
      await expect(sourcesHandoff).toHaveAttribute("href", /comparison_indicator=annual%3Aunemployment_rate/);

      await page.reload({ waitUntil: "networkidle" });
      await expect(indicatorSelect).toHaveValue("unemployment_rate");
      await expect(compareSelect).toHaveValue("poland");

      await compareSelect.selectOption("");
      await expect(profile.locator("[data-economy-selected-handoff]")).toBeVisible();
      expect(new URL(page.url()).searchParams.has("compare")).toBe(false);
    });

    test(`all 10 localized country routes smoke test at desktop, tablet, and mobile (${en ? "en" : "zh"})`, async ({ page }, info) => {
      if (info.project.name === "desktop-1440") {
        for (const width of [1024, 768] as const) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${prefix}/countries/hungary/`, { waitUntil: "networkidle" });
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        }
        await page.setViewportSize({ width: 1440, height: 900 });
      }

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
        expect(errors, `console errors on ${prefix}/countries/${slug}/ (${info.project.name})`).toEqual([]);
        expect(failedRequests, `failed requests on ${prefix}/countries/${slug}/ (${info.project.name})`).toEqual([]);

        page.off("console", onConsole);
        page.off("response", onResponse);
      }
    });
  }
});
