import { expect, test } from "@playwright/test";
import sources from "../../src/data/political/germany/political_source_registry.json";

const early = "el-de-bt-1998-09-27";
const later = "el-de-bt-2002-09-22";
for (const en of [true, false]) {
  test("Bundestag chamber reform and verified-series boundary · " + (en ? "en" : "zh"), async ({ page }) => {
    const route = (en ? "/en" : "") + "/politics/germany/";
    const compare = page.locator("[data-politics-compare]");
    const rules = compare.locator("[data-german-rule-comparison]");
    for (const [a, b] of [[early, later], [later, early]]) {
      await page.goto(route + "?election=" + a + "&compare=" + b);
      const forward = a === early;
      await expect(rules).toBeVisible();
      const rowCells = (label: string) => rules.getByRole("row", { name: new RegExp(label) }).getByRole("cell");
      await expect(rowCells(en ? "Statutory seats" : "法定基础席位")).toHaveText(forward ? ["656", "598"] : ["598", "656"]);
      await expect(rowCells(en ? "Final Bundestag" : "联邦议院最终")).toHaveText(forward ? ["669", "603"] : ["603", "669"]);
      const derived = en ? "5 (derived)" : "5（推算）";
      await expect(rowCells(en ? "Overhang" : "超额席位")).toHaveText(forward ? ["13", derived] : [derived, "13"]);
      await expect(rowCells(en ? "Proportional allocation" : "比例席位")).toHaveText(["Hare/Niemeyer", "Hare/Niemeyer"]);
      await expect(rules.locator("[data-german-constituency-reform]")).toContainText("328");
      await expect(rules.locator("[data-german-constituency-reform]")).toContainText("299");
      await rules.locator("summary").click();
      await expect(rules.locator('[data-german-rule-election="' + early + '"]')).toContainText("5%");
      await expect(rules.locator('[data-german-rule-election="' + later + '"]')).toContainText(en ? "gives no threshold" : "未列出门槛");
      const overhangSource = sources.find(s => s.source_id === "src-de-bwl-overhang")!;
      await expect(rules.locator('[data-german-rule-election="' + later + '"] [data-german-rule-source="src-de-bwl-overhang"]')).toHaveAttribute("href", overhangSource.url);
      await expect(rules.getByRole("link", { name: en ? "Institutional change record" : "制度变更记录" })).toHaveAttribute("href", (en ? "/en" : "") + "/countries/germany/#de-1996-bwg-thirteenth-amendment");
      await expect(compare.locator("[data-aggregate=turnout] td").last()).toContainText(forward ? "−3.1" : "+3.1");
      await expect(compare.locator("[data-verified-series-unavailable]")).toBeVisible();
      await expect(compare.locator("[data-verified-series]")).toHaveCount(0);
      await compare.getByRole("button", { name: en ? "Election-specific ballot labels" : "当届选票名称比较" }).click();
      await expect(compare.locator('[data-share-denominator="' + early + '"]')).toContainText("49,308,512");
      await expect(compare.locator('[data-share-denominator="' + later + '"]')).toContainText("47,996,480");
      await expect(compare.locator("[data-compare-lists]")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  });
}
