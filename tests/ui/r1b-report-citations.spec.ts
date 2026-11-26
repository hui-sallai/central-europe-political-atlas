import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { expect, test, type Download } from "@playwright/test";
import { activeNotebookRaw } from "./notebook-storage";
import { NOTEBOOK_PROJECTS_KEY } from "../../src/lib/notebookProjects";
import type { ResearchNotebook } from "../../src/lib/researchNotebook";

async function readEntries(download: Download): Promise<Record<string, string>> {
  return JSON.parse(execFileSync("python3", ["-c", [
    "import json, sys, zipfile",
    "with zipfile.ZipFile(sys.argv[1]) as z:",
    " assert z.testzip() is None",
    " print(json.dumps({p:z.read(p).decode('utf-8') for p in z.namelist()}))",
  ].join("\n"), (await download.path())!], { encoding: "utf8" }));
}

for (const prefix of ["/en", ""]) {
  test("Selected election evidence, bibliographies and active report date " + (prefix || "zh"), async ({page}) => {
    const en = Boolean(prefix);
    const german = "el-de-bt-1990-12-02", hungarian = "el-hu-ogy-1998-05-10";
    for (const [i, path] of [
      "/politics/germany/?election=" + german + "&vote_type=second_vote",
      "/politics/hungary/?election=" + hungarian,
    ].entries()) {
      await page.goto(prefix + path);
      await page.locator("[data-selected-election-collect] [data-notebook-add]").click();
      await expect.poll(async () => JSON.parse(await activeNotebookRaw(page)).items?.length).toBe(i + 1);
    }
    await page.goto(prefix + "/notebook/");
    const projectBefore = await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_PROJECTS_KEY);
    const notebook: ResearchNotebook = JSON.parse(await activeNotebookRaw(page));
    const panel = page.locator("[data-notebook-brief]");
    await panel.locator("summary").press("Enter");
    await panel.locator("[data-report-template]").selectOption("comparative_note");
    const hu = panel.locator('[data-brief-choice="' + notebook.items[1].id + '"]');
    await hu.getByRole("button", {name: new RegExp("^" + (en ? "Move up" : "上移"))}).click();
    await panel.locator("[data-report-search]").fill(hungarian);
    await expect(panel.locator("[data-hidden-selected-count]")).toBeVisible();

    const button = panel.getByRole("button", {name: en ? "Download citations and manifest (ZIP)" : "下载引用和报告清单（ZIP）", exact:true});
    await expect(button).toBeEnabled();
    const transfers: string[] = [];
    const zipDigests: string[] = [];
    page.on("request", request => {
      if (request.method() !== "GET" || (request.url().startsWith("http") && new URL(request.url()).origin !== new URL(page.url()).origin)) transfers.push(request.url());
    });
    const downloadZip = async () => {
      const result = page.waitForEvent("download");
      await button.click();
      const saved = await result;
      zipDigests.push(createHash("sha256").update(await readFile((await saved.path())!)).digest("hex"));
      return readEntries(saved);
    };
    const files = await downloadZip();
    expect(Object.keys(files).sort()).toEqual(["citations.bib", "citations.csl.json", "report_manifest.json"]);
    const manifest = JSON.parse(files["report_manifest.json"]);
    const ordered = [notebook.items[1], notebook.items[0]];
    expect(manifest.selected_evidence_ids).toEqual(ordered.map(item => item.id));
    expect(manifest.report).toMatchObject({ template: "comparative_note", locale: en ? "en" : "zh-CN" });
    expect(manifest.project.notebook_id).toBe(notebook.notebook_id);
    expect(manifest.project.project_id).toBe(projectBefore ? JSON.parse(projectBefore).active_id : "legacy");
    for (const [i, item] of ordered.entries()) {
      expect(manifest.evidence[i]).toMatchObject({id:item.id, source_ids:item.source_ids, canonical_ids:item.canonical_ids,
        metadata:{filters:{election:item.metadata.filters!.election, vote_type:item.metadata.filters!.vote_type,
          vote_denominator:i === 0 ? 4547682 : 46455772}}});
    }
    const citations: { id: string }[] = JSON.parse(files["citations.csl.json"]);
    const ids = citations.map(row => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of [...manifest.sources.map((s: {citation_id:string}) => s.citation_id),
      ...manifest.evidence.map((e: {view_citation_id:string}) => e.view_citation_id)]) {
      expect(ids).toContain(entry);
      expect(files["citations.bib"]).toContain(entry);
    }
    expect(await downloadZip()).toEqual(files);
    expect(zipDigests[1]).toBe(zipDigests[0]);
    const md = page.waitForEvent("download");
    await panel.getByRole("button", {name:en ? "Export Evidence Brief (Markdown)" : "导出研究证据简报（Markdown）",exact:true}).click();
    expect(await readFile((await (await md).path())!, "utf8")).toContain(manifest.report.generated_at);
    await hu.getByRole("checkbox").uncheck();
    const subset = JSON.parse((await downloadZip())["report_manifest.json"]);
    expect(subset.selected_evidence_ids).toEqual([notebook.items[0].id]);
    expect(subset.report.generated_at).toBe(manifest.report.generated_at);
    expect(subset.sources.map((s: {id: string}) => s.id).sort()).toEqual([...notebook.items[0].source_ids].sort());
    expect(await page.evaluate(key => localStorage.getItem(key), NOTEBOOK_PROJECTS_KEY)).toBe(projectBefore);
    await panel.getByRole("button", {name:en ? "Deselect all" : "取消全选",exact:true}).click();
    await expect(button).toBeDisabled();
    expect(transfers).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

    await page.getByLabel(en ? "New project title" : "新项目标题", {exact: true}).fill("Separate ballot project");
    await page.getByRole("button", {name: en ? "Create project" : "创建项目", exact: true}).click();
    await expect(page.locator("[data-active-project]")).toContainText("Separate ballot project");
    await expect(panel).toHaveCount(0);
    await page.goto(prefix + "/politics/germany/?election=" + german + "&vote_type=first_vote");
    await page.locator("[data-selected-election-collect] [data-notebook-add]").click();
    await expect.poll(async () => JSON.parse(await activeNotebookRaw(page)).items?.length).toBe(1);
    await page.goto(prefix + "/notebook/");
    await panel.locator("summary").press("Enter");
    const isolatedFiles = await downloadZip();
    const second = JSON.parse(isolatedFiles["report_manifest.json"]);
    expect(second.project.project_id).not.toBe(manifest.project.project_id);
    expect(second.project.notebook_id).not.toBe(manifest.project.notebook_id);
    expect(second.report.title).toBe("Separate ballot project");
    expect(second.evidence).toHaveLength(1);
    expect(second.evidence[0].metadata.filters).toMatchObject({vote_type: "first_vote", vote_denominator: 46274925});
    expect(second.sources.map((s: {id: string}) => s.id).sort()).toEqual([...second.evidence[0].source_ids].sort());
    expect(isolatedFiles["citations.bib"]).not.toContain(manifest.evidence[0].view_citation_id);
  });
}
