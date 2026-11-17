import { expect, test } from "@playwright/test";

const industrial = "industrial_policy_strategic_investment";
const catl = "hu-2022-08-12-catl-debrecen";
const battery = "hu-battery-strategic-investment";

test("the workspace index offers four thematic routes and country hubs retain their selection", async ({ page }) => {
  await page.goto("/en/workspaces/");
  const themes = page.getByRole("region", { name: "Thematic research", exact: true });
  await expect(themes.getByRole("link")).toHaveCount(4);
  await themes.getByRole("link", { name: "Energy dependency and energy transition" }).click();
  await expect(page.locator("[data-thematic-workspace]")).toHaveAttribute("data-thematic-workspace", "energy_dependency_transition");

  await page.goto("/countries/hungary/");
  await page.getByRole("region", { name: "专题研究", exact: true }).getByRole("link", { name: "产业政策与战略投资" }).click();
  await expect(page).toHaveURL(new RegExp("/workspaces/" + industrial + "/\\?country=hungary"));
  await expect(page.getByRole("checkbox", { name: "匈牙利", exact: true })).toBeChecked();
});

test("the Event Library restores the CATL case and retains the case, country and event when switching language", async ({ page }) => {
  await page.goto("/en/news/?country=hungary&from=2022-08-12&to=2022-08-12");
  const event = page.locator("#" + catl);
  await event.locator("summary").click();
  await event.locator(`[data-event-theme="${industrial}"]`).click();
  await expect(page.locator(`[data-thematic-case="${battery}"]`)).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Hungary", exact: true })).toBeChecked();
  await page.locator('a[hreflang="zh-CN"]').click();
  await expect(page).toHaveURL(url => url.pathname === "/workspaces/" + industrial + "/" &&
    url.searchParams.get("country") === "hungary" && url.searchParams.get("event") === catl &&
    url.searchParams.get("case") === battery);
  await expect(page.getByRole("checkbox", { name: "匈牙利", exact: true })).toBeChecked();
  await expect(page.locator(`[data-thematic-case="${battery}"]`)).toBeVisible();
});

test("a documented Polish industrial-output release opens the matching country and monthly definition", async ({ page }) => {
  await page.goto("/en/news/?country=poland&from=2026-08-20&to=2026-08-20&linked=1");
  const event = page.locator("#pl-2026-08-20-industrial-output");
  await event.locator("summary").click();
  await expect(event.locator("[data-thematic-review]")).toContainText("Documented statistical relationship");
  await event.locator('[data-event-indicator="monthly:industrial_production_index"]').click();
  const comparison = page.locator("[data-national-comparison]");
  await expect(comparison.getByRole("checkbox", { name: "Poland", exact: true })).toBeChecked();
  await expect(comparison.getByLabel("Indicator", { exact: true })).toHaveValue("monthly:industrial_production_index");
  await expect(page).toHaveURL(url => url.searchParams.get("compare_frequency") === "monthly"
    && url.searchParams.get("compare_from") === "2015-01" && url.searchParams.get("compare_to") === "2026-08");
});

test("documentary-only and unreviewed events retain their separate status and original sources", async ({ page }) => {
  await page.goto("/en/news/?country=slovakia&from=2026-08-17&to=2026-08-17");
  const reviewed = page.locator("#sk-2026-08-17-industrial-orders");
  await reviewed.locator("summary").click();
  await expect(reviewed.locator("[data-thematic-review]")).toContainText("The relevant measure is not held");
  await expect(reviewed.locator("[data-event-indicator], [data-event-annual]")).toHaveCount(0);
  await expect(reviewed.locator('a[target="_blank"][href^="https://"]')).toHaveCount(1);

  await page.goto("/en/news/?country=hungary&from=2026-08-20&to=2026-08-20");
  const unreviewed = page.locator("#hu-2026-08-20-magyar-reacts-lazar-resignation");
  await unreviewed.locator("summary").click();
  await expect(unreviewed).toContainText("Thematic relationships have not yet been reviewed");
  await expect(unreviewed.locator("[data-event-theme]")).toHaveCount(0);
});
