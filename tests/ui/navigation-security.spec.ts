import { expect, test } from "@playwright/test";
import { allowedSlug, atlasItemTarget, countryProfileHref, externalSourceLink, EXTERNAL_SOURCE_REL } from "../../src/lib/safeNavigation";

// Pure unit tests for the navigation boundary (no page needed). Invalid input must never produce an href.
const ATLAS = "https://hy-central-europe-analysis.org";
const hostile = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "file:///etc/passwd",
  "http://example.com",
  "https://user:pass@example.com/",
  "https://example.com/?token=abc",
  "https://example.com/?api_key=abc",
  "https://example.com/?API-KEY=abc&x=1",
  "https://example.com/?secret=1",
  "https://example.com/?password=1",
  "https://example.com/\r\nSet-Cookie:x=1",
  "https://exa\tmple.com/",
  "https://example.com/\u0000",
  " https://example.com/",
  "https://example.com/ ",
  "//example.com/path",
  "",
  "not a url",
];

test("external source links: hostile and malformed URLs never become hrefs", () => {
  for (const value of [...hostile, 42, null, undefined, {}]) expect(externalSourceLink(value), String(value)).toBeNull();
});

test("external source links: valid https URLs are canonicalised and expose their host", () => {
  expect(externalSourceLink("https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr/default/table?lang=en")).toEqual({ href: "https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr/default/table?lang=en", host: "ec.europa.eu" });
  expect(externalSourceLink("https://EXAMPLE.com/a b")).toEqual({ href: "https://example.com/a%20b", host: "example.com" });
  // malformed percent-encoding is kept literally by URL parsing; the result is still a canonical https href
  expect(externalSourceLink("https://example.com/%E0%A4%A")?.href).toBe("https://example.com/%E0%A4%A");
  expect(EXTERNAL_SOURCE_REL).toBe("noreferrer");
});

test("Atlas item targets: only the exact Atlas origin and allowed paths", () => {
  for (const value of [...hostile,
    "https://example.com/data/",
    "https://hy-central-europe-analysis.org.evil.com/data/",
    "http://hy-central-europe-analysis.org/data/",
    "https://user:pass@hy-central-europe-analysis.org/data/",
    "https://hy-central-europe-analysis.org/",
    "https://hy-central-europe-analysis.org/admin/",
    "https://hy-central-europe-analysis.org//evil.com/data/",
    "https://hy-central-europe-analysis.org/data/?token=abc",
    "https://hy-central-europe-analysis.org/data/%E0%A4%A",
    `${ATLAS}/data/\r\n`,
  ]) expect(atlasItemTarget(value), String(value)).toBeNull();
});

test("Atlas item targets: legitimate query and hash state is preserved as a relative href", () => {
  expect(atlasItemTarget(`${ATLAS}/en/workspaces/inflation_monetary_policy/?countries=hungary&from=2021&to=2026`)).toEqual({ pathname: "/en/workspaces/inflation_monetary_policy/", search: "?countries=hungary&from=2021&to=2026", hash: "" });
  expect(atlasItemTarget(`${ATLAS}/data/?country=poland&indicator=hicp_inflation#annual`)).toEqual({ pathname: "/data/", search: "?country=poland&indicator=hicp_inflation", hash: "#annual" });
  expect(atlasItemTarget(`${ATLAS}/countries/hungary/`)?.pathname).toBe("/countries/hungary/");
});

test("country compare: only allowlisted slugs become profile hrefs", () => {
  const allowed = ["poland", "czechia", "germany"];
  expect(countryProfileHref("poland", allowed)).toBe("/countries/poland");
  expect(allowedSlug("czechia", allowed)).toBe("czechia");
  for (const value of ["hungary", "unknown", "../admin", "..%2Fadmin", "poland/../admin", "poland/", "/poland", "\"><script>alert(1)</script>", "pol'and", "<poland>", "%70oland", "javascript:alert(1)", "", " poland", "POLAND", null, undefined, 1]) {
    expect(countryProfileHref(value, allowed), String(value)).toBeNull();
    expect(allowedSlug(value, allowed), String(value)).toBeNull();
  }
});

test("country compare page: an injected non-allowlisted select value never becomes a link", async ({ page }) => {
  await page.goto("/countries/hungary/", { waitUntil: "networkidle" });
  const select = page.locator("[data-country-compare] select");
  await expect(select).toBeVisible();
  const before = await page.locator("[data-country-compare] a[href*='/countries/']").getAttribute("href");
  await select.evaluate((element) => {
    const s = element as HTMLSelectElement;
    for (const value of ["../admin", "javascript:alert(1)", "poland/../x"]) { const option = document.createElement("option"); option.value = value; option.textContent = value; s.appendChild(option); }
    s.value = "../admin";
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const hrefs = await page.locator("[data-country-compare] a").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
  for (const href of hrefs) { expect(href).not.toContain(".."); expect(href).not.toMatch(/javascript:/i); }
  expect(await page.locator("[data-country-compare] a[href*='/countries/']").getAttribute("href")).toBe(before);
  expect(new URL(page.url()).searchParams.get("compare")).not.toBe("../admin");
  // Positive control: the same native change-event path does update the link for an allowlisted slug.
  await select.evaluate((element) => { const s = element as HTMLSelectElement; s.value = "slovakia"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await expect(page.locator("[data-country-compare] a[href*='/countries/']")).toHaveAttribute("href", /\/countries\/slovakia\/?$/);
});
