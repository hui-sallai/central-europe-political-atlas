import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";
import { parseNotebook } from "../../src/lib/researchNotebook";
import { NOTEBOOK_PROJECTS_KEY } from "../../src/lib/notebookProjects";
import { prepareSnapshotAttachment, buildResearchPackage, verifyResearchPackageIntegrity } from "../../src/lib/researchPackage";
import { readStoredArchive } from "../../src/lib/researchPackageArchive";
import { activeNotebookRaw } from "./notebook-storage";

const downloads = [
  { name: "Polish national annual data", url: "/data/?country=poland&indicator=hicp_inflation&from=2020&to=2022&history=0", scope: '[data-snapshot-scope="annual"]', figure: "figure.svg" },
  { name: "Hungarian monthly HICP", url: "/data/?tab=high_frequency&country=hungary&indicator=hicp_annual_rate&from=2020&to=2020&history=0", scope: '[data-snapshot-scope="high-frequency"]', figure: "figure.svg" },
  { name: "Hungarian policy rate level", url: "/data/?tab=macro_drivers&driver=policy_rate&area=hungary&transformation=level&history=0", scope: '[data-snapshot-scope="macro-drivers"]', figure: "figure.svg" },
  ...["harmonized", "side_by_side"].map(mode => ({name:mode, url:"/data/?tab=compare&compare_countries=poland,hungary&comparison_indicator=annual:real_gdp_growth&comparison_view=bar&comparison_mode="+mode,scope:"[data-national-comparison]",figure:null})),
  { name: "Serbian quarterly unemployment", url: "/data/?tab=high_frequency&country=serbia&sors_series=lfs_unemployment_quarterly", scope: '[data-snapshot-scope="sors-monthly"]', figure: "figure.svg" },
  { name: "Hungarian territory map", url: "/map/?country=hungary&layer=regional_population&year=2024&classification=equal_interval", scope: "", figure: "map.svg" },
];

for (const sample of downloads) test("Inspect genuine downloaded snapshot and selected Notebook evidence: " + sample.name, async ({page}) => {
  await page.goto(sample.url, {waitUntil:"networkidle"});
  if (sample.scope.startsWith("[data-snapshot-scope")) {
    const disclosure = page.getByText("原始来源记录与既有研究导出", {exact:true});
    if (await disclosure.count() && !(await disclosure.locator("..").evaluate(el => (el as HTMLDetailsElement).open))) await disclosure.click();
  } else if (!sample.scope) {
    await expect(page.locator('svg[data-map-export="hungary"]')).toBeVisible();
  }
  const surface = sample.scope ? page.locator(sample.scope) : page.locator("main");
  await surface.locator("[data-notebook-add]").first().click();
  await expect.poll(async () => JSON.parse(await activeNotebookRaw(page)).items?.length).toBe(1);
  const before = await activeNotebookRaw(page);
  const notebook = parseNotebook(before);
  const id = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "{}").active_id ?? "legacy", NOTEBOOK_PROJECTS_KEY);
  const project = {id, notebook};
  const item = notebook.items[0].id;
  const result = page.waitForEvent("download");
  await surface.getByRole("button", {name:"导出研究快照",exact:true}).first().click();
  const original = new Uint8Array(await readFile((await (await result).path())!));
  const digest = createHash("sha256").update(original).digest("hex");
  const handle = await prepareSnapshotAttachment(project, item, original, digest);
  expect(handle.sha256).toBe(digest);
  if (sample.figure) expect(handle.figure).toMatchObject({name:sample.figure, attachment:"quarantined", input_relationship:"unverified"});
  else expect(handle.figure).toBeNull();
  expect(handle.correspondence.historical_provenance.status).toBe("unverified");
  const pack = await buildResearchPackage({project, selectedIds:[item], attachments:[handle], locale:"zh-CN", template:"standard", reportTime:"2026-11-26T12:00:00.000Z"});
  const artifact = pack.manifest.artifacts[0];
  if (sample.name === "Serbian quarterly unemployment") {
    expect(handle.correspondence.status).toBe("compatible_live_configuration");
    expect(artifact.disposition).toBe("normalized_members");
    expect(artifact.actual_scope.frequencies).toEqual(["quarterly"]);
    const packaged = readStoredArchive(pack.bytes);
    const source = readStoredArchive(original);
    for (const path of artifact.members) expect(packaged.get(path)).toEqual(source.get(path.split("/").at(-1)!));
  } else if (sample.scope === "[data-national-comparison]") {
    expect(artifact.configuration.comparison.mode).toBe(sample.name);
    expect(handle.correspondence.status).toBe("partial_correspondence");
    expect(handle.correspondence.differences).toContain("recorded_row_set_differs");
    expect(artifact.disposition).toBe("reference_only");
  } else if (sample.scope) {
    expect(artifact.actual_scope.frequencies).toEqual([sample.name.includes("annual") ? "annual" : "monthly"]);
    if (sample.name.includes("policy rate")) expect(artifact.configuration.filters.transformation).toBe("level");
    expect(artifact.disposition).toBe("reference_only");
  } else {
    expect(artifact.disposition).toBe("reference_only");
    expect(artifact.configuration.filters.classification).toBe("equal_interval");
    expect(artifact.actual_scope.countries).toEqual(["hungary"]);
  }
  expect((await verifyResearchPackageIntegrity(pack.bytes, createHash("sha256").update(pack.bytes).digest("hex"))).expected_digest).toBe("matched");
  expect(await activeNotebookRaw(page)).toBe(before);
});
