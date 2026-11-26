import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Locator } from "@playwright/test";
import { activeNotebookRaw } from "./notebook-storage";
import { NOTEBOOK_PROJECTS_KEY, serializeProjectRegistry, singleNotebookProject } from "../../src/lib/notebookProjects";
import { addNotebookEvidence, emptyNotebook, NOTEBOOK_STORAGE_KEY, serializeNotebook, type ResearchNotebook } from "../../src/lib/researchNotebook";

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

// Isolated test project. A retained legacy backup holds different text so a switch to the wrong
// storage key would be visible both in the downloaded files and in the invariance assertions.
function warningFixture() {
  const time = "2026-11-26T10:00:00.000Z";
  let book = emptyNotebook("en", "v2.0", time);
  const warning = "Shared scope warning";
  const excludedWarning = "Warning recorded against the omitted item";
  for (const [key, state] of [["first", "blocked"], ["second", "registry_only"], ["omitted", "registry_only"]] as const) {
    const raw = key === "omitted" ? excludedWarning : warning;
    book = addNotebookEvidence(book, {
      type: "method", title: "Test method " + key,
      url: "https://hy-central-europe-analysis.org/methodology/",
      canonical_ids: ["fixture-" + key], countries: [], periods: [], layer: "test",
      warnings: [raw], warning_labels: {en: ["English wording " + key], "zh-CN": ["中文说明 " + key]},
      metadata: {state}, sources: [{institution: "Test authority", dataset: "Source " + key,
        url: "https://example.org/" + key, layer: "test"}],
    }, book.platform_version, time);
  }
  const project: ResearchNotebook = {...book, user_notes: "A project note", research_question: "A test question",
    methodology_warnings: ["Notebook scope unassigned", warning, excludedWarning, warning],
    items: book.items.map(item => ({...item, note: "Note on " + item.title}))};
  const legacy = {...emptyNotebook("en", "v2.0", time), title: "Retained legacy sentinel"};
  return {project, registryRaw: serializeProjectRegistry(singleNotebookProject(project)), legacyRaw: serializeNotebook(legacy)};
}

async function getDownload(control: Locator) {
  const [file] = await Promise.all([control.page().waitForEvent("download"), control.click()]);
  return file;
}

for (const locale of ["en", "zh-CN"] as const) {
  const en = locale === "en";
  for (const colorScheme of ["light", "dark"] as const) {
    test(`Warning scope and citation disclosure — ${locale} ${colorScheme}`, async ({page}, info) => {
      const {project, registryRaw, legacyRaw} = warningFixture();
      const [first, second, omitted] = project.items;
      const keys = [NOTEBOOK_PROJECTS_KEY, NOTEBOOK_STORAGE_KEY];
      await page.emulateMedia({colorScheme, reducedMotion: "reduce"});
      await page.addInitScript(({keys, values}) => {
        keys.forEach((key, i) => localStorage.setItem(key, values[i]));
      }, {keys, values: [registryRaw, legacyRaw]});
      await page.goto(en ? "/en/notebook/" : "/notebook/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", colorScheme);
      const panel = page.locator("[data-notebook-brief]");
      await panel.locator("summary").press("Enter");
      await panel.locator(`[data-brief-choice="${omitted.id}"]`).getByRole("checkbox").uncheck();
      await panel.locator("[data-report-search]").fill(first.title);
      await expect(panel.locator("[data-hidden-selected-count]")).toContainText("1");
      const button = panel.locator("[data-export-citation-bundle]");
      const disclosure = panel.locator("[data-citation-disclosure]");
      await expect(button).toHaveCount(1);
      await expect(disclosure).toBeVisible();
      const copy = en
        ? "This ZIP is created on your device. It includes selected evidence and recorded sources, your research question, project notes and notes on selected items. Review private research material before sharing."
        : "此 ZIP 在你的设备上生成，包含已选证据及其记录的来源、研究问题、项目笔记和已选条目的笔记。分享前请检查其中的私人研究内容。";
      await expect(disclosure).toHaveText(copy);
      await expect(button).toHaveAccessibleDescription(copy);
      await button.evaluate(el => el.scrollIntoView({block: "center"}));
      await expect(disclosure).toBeInViewport({ratio: 1});
      const photo = info.outputPath("citation-control-" + colorScheme + ".png");
      await page.screenshot({path: photo, animations: "disabled"});
      await info.attach("Citation export and sharing disclosure", {path: photo, contentType: "image/png"});

      const files = await readEntries(await getDownload(button));
      const manifest = JSON.parse(files["report_manifest.json"]);
      const aggregate = manifest.limitations.notebook_warning_aggregate;
      expect(aggregate).toEqual({source_field: "methodology_warnings", attribution: "scope_uncertain", warnings: project.methodology_warnings});
      expect(manifest.selected_evidence_ids).toEqual([first.id, second.id]);
      expect(manifest.project.user_authored_notes).toBe(project.user_notes);
      expect(manifest.report.research_question).toBe(project.research_question);
      for (const [i, item] of [first, second].entries()) {
        expect(manifest.evidence[i]).toMatchObject({id: item.id, warnings: item.warnings, warning_labels: item.warning_labels, note: item.note});
        expect(manifest.limitations.evidence[i].codes).toContain(item.metadata.state + "_method");
      }

      const markdownControl = panel.getByRole("button", {name: en ? "Export Evidence Brief (Markdown)" : "导出研究证据简报（Markdown）", exact: true});
      const markdown = await readFile((await (await getDownload(markdownControl)).path())!, "utf8");
      const html = await readFile((await (await getDownload(panel.locator("[data-export-brief-html]"))).path())!, "utf8");
      const heading = en ? "Notebook-wide warnings (may also concern excluded evidence)" : "笔记整体警告（可能也涉及未选证据）";
      const warningSection = markdown.split("\n## " + heading + "\n")[1]?.split("\n## ")[0];
      expect(warningSection?.trim().split("\n\n")).toEqual(aggregate.warnings);
      const sections = await page.evaluate(({html, heading}) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const block = [...doc.querySelectorAll("section")].find(s => s.querySelector("h2")?.textContent === heading);
        return {aggregate: [...(block?.querySelectorAll("p") ?? [])].map(p => p.textContent),
          evidence: [...doc.querySelectorAll("section")].filter(s => s.querySelector("h3"))
            .map(s => ({title: s.querySelector("h3")?.textContent, text: s.textContent ?? ""}))};
      }, {html, heading});
      expect(sections.aggregate).toEqual(aggregate.warnings);
      for (const item of [first, second]) {
        const itemHtml = sections.evidence.find(s => s.title?.endsWith(item.title))?.text;
        expect(itemHtml).toContain(item.warning_labels![locale]![0]);
        expect(itemHtml).toContain(item.warnings[0]);
        expect(itemHtml).not.toContain(omitted.warnings[0]);
        expect(markdown).toContain(item.warning_labels![locale]![0]);
      }
      for (const output of [markdown, html, ...Object.values(files)]) {
        expect(output).not.toContain(omitted.title);
        expect(output).not.toContain("Source omitted");
        expect(output).not.toContain(omitted.warning_labels![locale]![0]);
        expect(output).not.toContain("Retained legacy sentinel");
      }
      expect(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), keys)).toEqual([registryRaw, legacyRaw]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    });
  }
}
