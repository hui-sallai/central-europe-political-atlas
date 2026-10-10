import { createElement, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "@playwright/test";
import { compareSeries, isPublished, latestCommonYear, latestPublished, type FreshnessPoint } from "../../src/lib/freshnessCore";
import { compare, latestAvailable, latestCommon } from "../../src/lib/freshness";
import { CompareTable, mixedPeriodRows, type CompareTableRow } from "../../src/components/CompareTable";

const p = (year: number, value: number | null, extra: Partial<FreshnessPoint> = {}): FreshnessPoint => ({ year, value, unit: "%", status: value === null ? "pending" : "official", ...extra });

test("freshness core: latest available is the last published value; missing is never 0", () => {
  expect(latestPublished([p(2023, 1), p(2024, 2), p(2025, null)])?.year).toBe(2024);
  expect(latestPublished([p(2025, null)])).toBeUndefined();
  expect(latestPublished([])).toBeUndefined();
  expect(latestPublished([p(2025, 3, { status: "pending" }), p(2024, 2)])?.year).toBe(2024);
  expect(isPublished(p(2025, 0))).toBe(true); // a real zero is a value, not a gap
  expect(isPublished(p(2025, Number.NaN))).toBe(false);
});

test("freshness core: latest common year needs every series, same unit, comparable; no fallback", () => {
  expect(latestCommonYear([[p(2024, 1), p(2025, 2)], [p(2024, 3), p(2025, null)]])).toBe(2024);
  expect(latestCommonYear([[p(2025, 2)], [p(2024, 3)]])).toBeNull(); // asymmetric, nothing shared
  expect(latestCommonYear([[p(2025, 2)], [p(2025, 3, { unit: "EUR" })]])).toBeNull(); // unit mismatch
  expect(latestCommonYear([[p(2025, 2), p(2024, 1)], [p(2025, 3, { comparable: false }), p(2024, 4)]])).toBe(2024);
  expect(latestCommonYear([[p(2025, 2)], []])).toBeNull();
  expect(latestCommonYear([])).toBeNull();
});

test("freshness core: compare modes disclose different reference periods", () => {
  const data = { de: [p(2024, 1), p(2025, 2)], hu: [p(2024, 3), p(2025, null)] };
  const available = compareSeries(data, "latest_available");
  expect(available.cells.de).toMatchObject({ value: 2, year: 2025 });
  expect(available.cells.hu).toMatchObject({ value: 3, year: 2024 });
  expect(available.periods_differ).toBe(true);
  expect(available.common_year).toBe(2024);
  const common = compareSeries(data, "latest_common");
  expect(common.cells.de).toMatchObject({ value: 1, year: 2024 });
  expect(common.cells.hu).toMatchObject({ value: 3, year: 2024 });
  expect(common.periods_differ).toBe(false);
  // no common year: strict mode shows nothing rather than mixing periods
  const none = compareSeries({ de: [p(2025, 2)], hu: [p(2023, 3)] }, "latest_common");
  expect(none.common_year).toBeNull();
  expect(none.cells.de.value).toBeNull();
  expect(none.cells.hu.value).toBeNull();
  // different units are never placed side by side
  const units = compareSeries({ de: [p(2025, 2)], hu: [p(2025, 3, { unit: "EUR" })] }, "latest_available");
  expect(units.units_differ).toBe(true);
  expect(units.cells.de.value).toBeNull();
  // a missing country stays missing
  expect(compareSeries({ de: [p(2025, 2)], rs: [p(2025, null)] }, "latest_available").cells.rs).toMatchObject({ value: null, year: null });
});

test("freshness selectors on the annual observations", () => {
  expect(latestAvailable("serbia", "hicp_inflation")).toBeUndefined();
  expect(latestAvailable("hungary", "gdp_current_eur")?.year).toBe(2025);
  expect(latestAvailable("romania", "fdi_inflow")?.year).toBe(2023);
  expect(latestAvailable("hungary", "fdi_inflow")?.year).toBe(2024);
  expect(latestCommon(["romania", "hungary"], "fdi_inflow")).toBe(2023);
  expect(latestCommon(["serbia", "hungary"], "hicp_inflation")).toBeNull();
  const mixed = compare(["romania", "hungary"], "fdi_inflow", "latest_available");
  expect(mixed.periods_differ).toBe(true);
  expect(mixed.cells.romania.year).toBe(2023);
  expect(mixed.cells.hungary.year).toBe(2024);
  expect(compare(["romania", "hungary"], "fdi_inflow", "latest_common").periods_differ).toBe(false);
});

const syntheticRows = (mode: "latest_available" | "latest_common"): CompareTableRow[] => [
  { id: "hicp_inflation", label: "HICP 通胀率", result: compareSeries({ germany: [p(2024, 2.5), p(2025, 2.2)], hungary: [p(2024, 3.7), p(2025, null)] }, mode) },
  { id: "unemployment_rate", label: "失业率", result: compareSeries({ germany: [p(2025, 3.4)], hungary: [p(2025, 4.5)] }, mode) },
];
const names: Record<string, string> = { germany: "德国", hungary: "匈牙利" };
// Playwright compiles JSX in imported .tsx files to its own component objects; convert that tree to React elements
// so the presentational component can be rendered to static markup in a plain unit test.
type PwNode = { __pw_type: "jsx"; type: unknown; props: Record<string, unknown>; key?: string | null };
const isPw = (node: unknown): node is PwNode => !!node && typeof node === "object" && (node as PwNode).__pw_type === "jsx";
function toReact(node: unknown, index = 0): ReactNode {
  if (Array.isArray(node)) return node.map((child, i) => toReact(child, i));
  if (!isPw(node)) return node as ReactNode;
  if (typeof node.type === "function") return toReact((node.type as (props: unknown) => unknown)(node.props), index);
  const { children, ...rest } = node.props ?? {};
  const type = typeof node.type === "string" ? node.type : Fragment;
  const props = typeof node.type === "string" ? { ...rest, key: node.key ?? index } : { key: node.key ?? index };
  return createElement(type, props, ...(children === undefined ? [] : [toReact(children)]));
}
const render = (mode: "latest_available" | "latest_common", locale: "zh-CN" | "en") => renderToStaticMarkup(createElement(Fragment, null, toReact(CompareTable({ rows: syntheticRows(mode), current: "germany", other: "hungary", nameOf: (slug: string) => names[slug], mode, locale }))));

test("compare table: mixed reference periods are disclosed (zh and en)", () => {
  expect(mixedPeriodRows(syntheticRows("latest_available")).map((row) => row.id)).toEqual(["hicp_inflation"]);
  const zh = render("latest_available", "zh-CN");
  expect(zh).toContain('data-mixed-periods="hicp_inflation"');
  expect(zh).toContain("参照年份不同，不属于同期比较");
  expect(zh).toContain("德国 2025, 匈牙利 2024");
  expect(zh).toContain("2025 / 2024");
  expect(zh).toContain('data-cell-year="2024"');
  const en = render("latest_available", "en");
  expect(en).toContain("Different reference periods — not a same-period comparison");
  expect(en).toContain("Germany 2025, Hungary 2024");
  expect(en).not.toMatch(/[㐀-鿿]/u);
  // strict mode: one shared year, no notice, no per-cell year tags
  for (const locale of ["zh-CN", "en"] as const) {
    const common = render("latest_common", locale);
    expect(common).not.toContain("data-mixed-periods");
    expect(common).not.toContain("data-cell-year");
    expect(common).toContain(">2024<");
  }
});

for (const locale of ["zh-CN", "en"] as const) for (const colorScheme of ["light", "dark"] as const) {
  test(`country compare mode switch (${locale}, ${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto(`${locale === "en" ? "/en" : ""}/countries/hungary/?compare=romania`, { waitUntil: "networkidle" });
    const panel = page.locator("[data-country-compare]");
    const group = panel.locator("[data-compare-mode]");
    const common = panel.getByRole("button", { name: locale === "en" ? "Latest common year" : "最新共同年份", exact: true });
    const available = panel.getByRole("button", { name: locale === "en" ? "Latest available" : "各国最新可得", exact: true });
    await expect(group).toHaveAttribute("data-compare-mode", "latest_common");
    await expect(common).toHaveAttribute("aria-pressed", "true");
    await expect(panel.locator("[data-cell-year]")).toHaveCount(0);
    await expect(panel.locator("[data-mixed-periods]")).toHaveCount(0);
    const strictValues = await panel.locator("tbody tr").evaluateAll((rows) => rows.map((row) => row.textContent));
    await available.click();
    await expect(group).toHaveAttribute("data-compare-mode", "latest_available");
    await expect(available).toHaveAttribute("aria-pressed", "true");
    await expect(panel.locator("[data-compare-mode-note='latest_available']")).toBeVisible();
    expect(await panel.locator("[data-cell-year]").count()).toBeGreaterThan(0);
    // The notice appears exactly when a row has different reference periods (none for these six indicators today).
    const differing = await panel.locator("tr[data-periods-differ='true']").count();
    await expect(panel.locator("[data-mixed-periods]")).toHaveCount(differing > 0 ? 1 : 0);
    if (locale === "en") expect(await panel.locator("table").innerText()).not.toMatch(/[㐀-鿿]/u);
    expect(new URL(page.url()).searchParams.get("compare")).toBe("romania");
    await common.click();
    await expect(panel.locator("[data-cell-year]")).toHaveCount(0);
    expect(await panel.locator("tbody tr").evaluateAll((rows) => rows.map((row) => row.textContent))).toEqual(strictValues);
  });
}
