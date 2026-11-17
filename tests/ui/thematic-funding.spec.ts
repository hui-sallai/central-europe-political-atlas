import { expect, test } from "@playwright/test";
import { activeNotebookRaw } from "./notebook-storage";

test("financing keeps instruments, missing amounts and inapplicable countries distinct", async ({ page }) => {
  await page.goto("/en/workspaces/eu_funding_development/?countries=poland,romania,serbia");
  await expect(page.getByRole("checkbox", { name:"Poland", exact:true })).toBeChecked();
  await expect(page.getByText(/Programme allocation · 25,276,853,716 EUR/)).toBeVisible();
  await expect(page.getByText(/Programme allocation · 34,541,303,518 EUR/)).toBeVisible();
  await expect(page.getByText(/Payment request submitted · Amount not stated/)).toBeVisible();
  const programmes=page.locator("details").filter({has:page.locator("summary",{hasText:"Programme applicability"})}).last();
  await programmes.locator("summary").first().click();
  await expect(programmes.getByText(/Serbia.*not applicable/)).toBeVisible();
  await expect(page.locator('a[href$="/eu_funding_records.csv"]')).toHaveAttribute("href", /[0-9a-f]{40}\/docs\/research-themes\//);
});

test("project evidence can be collected outside a research case", async ({ page }) => {
  await page.goto("/workspaces/industrial_policy_strategic_investment/?country=hungary");
  await page.locator("summary").filter({hasText:"投资项目与政策措施"}).click();
  const project=page.locator("#hu-byd-szeged-vehicle-plant");
  await project.locator("summary").first().click();
  await expect(project.locator('a[href^="http"]').first()).toHaveAttribute("href", /^https?:/);
  await expect(project.getByRole("link",{name:/项目位置/})).toHaveAttribute("href", /country=hungary.*regions=hungary_/);
  await project.getByRole("button",{name:"保存项目证据"}).click();
  await expect.poll(() => activeNotebookRaw(page)).toContain("investment_documentation");
  const book=JSON.parse(await activeNotebookRaw(page));
  expect(book.items[0].canonical_ids).toContain("hu-byd-szeged");
  expect(book.items[0].url).toMatch(/country=hungary#hu-byd-szeged-vehicle-plant$/);
  expect(book.items[0].warnings.length).toBeGreaterThan(0);
  expect(book.sources.length).toBeGreaterThan(0);
});
