import { test, expect } from "@playwright/test";

// The desktop annual table renders the first 150 rows of the current sort; "show all" renders every filtered row,
// a filter change returns to the limited view, and the CSV download always carries every filtered row.
for (const prefix of ["", "/en"]) {
  const en = !!prefix;
  test(`annual desktop table row limit and show-all ${prefix || "zh"}`, async ({ page }, testInfo) => {
    // Mobile keeps its own card limit (MOBILE_CARD_LIMIT); the desktop table is hidden below the breakpoint.
    test.skip(testInfo.project.name === "mobile-390", "desktop table only");
    test.slow();
    await page.goto(`${prefix}/data/?country=poland`, { waitUntil: "networkidle" });
    await page.locator("details.mt-8 > summary").click();
    await page.locator('[data-snapshot-scope="annual"]').getByRole("combobox",{name:en?"Indicator":"指标",exact:true}).selectOption("all");
    const table = page.getByRole("region", { name: en ? "Annual observation table (scrollable)" : "年度观测表（可滚动）" }).locator("tbody tr");
    const limit = page.locator("[data-annual-table-limit]");
    await expect(limit).toHaveAttribute("data-annual-table-limit", "150");
    await expect(table).toHaveCount(150);
    const total = Number((await limit.locator("button").innerText()).match(/\d+/)![0]);
    expect(total).toBeGreaterThan(150);
    if (en) expect(await limit.innerText()).not.toMatch(/\p{Script=Han}/u);
    // Default sort is newest first, so the limited view keeps the most recent years.
    const years = await table.evaluateAll((rows) => rows.map((row) => Number(row.querySelectorAll("td")[1].textContent)));
    expect(years).toEqual([...years].sort((a, b) => b - a));

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: en ? "Download filtered observations (CSV)" : "下载当前筛选结果（CSV）", exact: true }).click();
    const csv = await (await download).createReadStream();
    let text = "";
    for await (const chunk of csv) text += chunk;
    expect(text.trim().split("\n").length - 1).toBe(total);

    await limit.locator("button").click();
    await expect(limit).toHaveAttribute("data-annual-table-limit", "all");
    await expect(table).toHaveCount(total);
    await limit.locator("button").click();
    await expect(table).toHaveCount(150);

    await limit.locator("button").click();
    await expect(table).toHaveCount(total);
    await page.getByRole("combobox", { name: en ? "Country" : "国家", exact: true }).first().selectOption("hungary");
    await expect(limit).toHaveAttribute("data-annual-table-limit", "150");
    await expect(table).toHaveCount(150);
  });
}
