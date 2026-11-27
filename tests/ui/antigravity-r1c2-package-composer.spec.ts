import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { addNotebookEvidence, emptyNotebook, NOTEBOOK_STORAGE_KEY, serializeNotebook } from "../../src/lib/researchNotebook";
import { NOTEBOOK_PROJECTS_KEY } from "../../src/lib/notebookProjects";
import { readStoredArchive } from "../../src/lib/researchPackageArchive";
import { buildSnapshot } from "../../src/lib/researchSnapshot";
import { buildZip } from "../../src/lib/clientZip";
import { notebookSnapshotView } from "../../src/components/notebookEvidence";
import { activeNotebookRaw } from "./notebook-storage";

const SORS_FIXTURE_TIME = "2026-11-26T12:00:00.000Z";
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function buildSorsCpiFixture() {
  const root = path.resolve(__dirname, "../..");
  const runtime = JSON.parse(fs.readFileSync(path.join(root, "public/research-data/serbia_sors_runtime.json"), "utf8"));
  const history = JSON.parse(fs.readFileSync(path.join(root, "public/research-data/serbia/serbia_descriptive_history_monthly.json"), "utf8"));
  const key = "cpi_index_2006";
  const selected = runtime.series.find((s: { store: string; key: string }) => s.store === "monthly" && s.key === key);
  const archived = history.series_sources.find((s: { series: string }) => s.series === key);
  const origin = "https://hy-central-europe-analysis.org/data/";
  const query = new URLSearchParams({ tab: "high_frequency", country: "serbia", sors_series: key });
  const input = {
    locale: "zh-CN" as const,
    title: "塞尔维亚 · " + selected.label,
    view_type: "serbia_sors" as const,
    page_path: "/data/",
    shareable_view_url: origin + "?" + query.toString(),
    countries: ["serbia"],
    indicators: [selected.display_indicator],
    filters: { country: "serbia", sors_series: key, sort: "period_desc", frequency: "monthly" },
    comparability_status: "serbia_only_not_cross_country_comparable",
    limitations: ["SORS 原始单位与标准化单位分别保留；CPI 不等同于 HICP；断点状态不跨段拼接。"],
    rows: [...selected.points].reverse().map(([period, normalized, original, flag, within, cross]: [string, number | null, number | null, string, number, number]) => ({
      id: "sors:" + key + ":" + period,
      country: "serbia",
      indicator: selected.display_indicator,
      period,
      value: normalized,
      unit: selected.unit ?? "",
      original_value: original,
      original_unit: selected.original_unit,
      layer: "serbia_sors_descriptive",
      status: selected.status_legend[flag] ?? flag,
      comparable_within_segment: within === 1,
      cross_country_comparable: cross === 1,
      source: {
        institution: "Statistical Office of the Republic of Serbia (SORS/RZS)",
        dataset: selected.dataset,
        source_url: selected.source_url,
        source_code: JSON.stringify(archived.original_code),
        retrieved_at: archived.retrieved_at,
        unit: selected.unit ?? "",
        original_unit: selected.original_unit ?? "",
        status: selected.mapping_status,
        source_layer: "serbia_sors_descriptive",
      },
    })),
  };
  const snapshot = buildSnapshot(input, SORS_FIXTURE_TIME);
  return { ...snapshot, input, bytes: buildZip(snapshot.files, snapshot.generatedAt) };
}

function sorsCpiNotebookFixture() {
  const sors = buildSorsCpiFixture();
  let state = emptyNotebook("en", "v2.0", SORS_FIXTURE_TIME);
  state = addNotebookEvidence(state, notebookSnapshotView(sors.input), "v2.0", SORS_FIXTURE_TIME);
  return {
    notebook: { ...state, title: "Case A — Admitted Serbia SORS CPI", research_question: "Verify admitted SORS CPI attachment." },
    sorsBytes: sors.bytes,
    sorsSha: sha256(sors.bytes),
  };
}

test.describe("Phase II R1-C2 — Research Package Composer", () => {
  for (const prefix of ["/en", ""]) {
    const en = prefix === "/en";
    const lang = en ? "EN" : "ZH";

    test(`Case A (${lang}): Admitted SORS CPI attachment -> 4 stages -> download ZIP -> independent verify + axe`, async ({ page }, info) => {
      const { notebook, sorsBytes, sorsSha } = sorsCpiNotebookFixture();
      const raw = serializeNotebook(notebook);
      const externalRequests: string[] = [];
      page.on("request", req => {
        const u = req.url();
        if (!u.startsWith("http://127.0.0.1") && !u.startsWith("http://localhost") && !u.startsWith("data:") && !u.startsWith("blob:")) {
          externalRequests.push(u);
        }
      });

      await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: NOTEBOOK_STORAGE_KEY, raw });
      await page.goto(`${prefix}/notebook/`, { waitUntil: "networkidle" });

      // Open Report Studio -> open Package Composer (progressive disclosure)
      await page.locator("[data-notebook-brief] > summary").click();
      const composer = page.locator("[data-research-package-composer]");
      await composer.locator("> summary").click();

      // Attach admitted SORS CPI snapshot with independently retained expected SHA-256
      await composer.locator("[data-attachment-expected-sha]").fill(sorsSha);
      await composer.locator("[data-attachment-file-input]").setInputFiles({
        name: "sors-cpi-admitted-fixture.zip",
        mimeType: "application/zip",
        buffer: Buffer.from(sorsBytes),
      });

      const card = composer.locator("[data-prepared-attachment]").first();
      await expect(card).toBeVisible();
      await expect(card.locator("[data-stage-a]")).toContainText(sorsSha);
      await expect(card.locator("[data-stage-b]")).toHaveAttribute("data-stage-b", "compatible_live_configuration");
      await expect(card.locator("[data-historical-provenance]")).toBeVisible();
      await expect(card.locator("[data-stage-c]")).toHaveAttribute("data-stage-c", "verified_permitted_use");
      await expect(card.locator("[data-stage-d]")).toHaveAttribute("data-stage-d", "pending");

      // Build & preview deterministic package
      await composer.locator("[data-build-package]").click();
      const preview = composer.locator("[data-package-preview]");
      await expect(preview).toBeVisible();
      await expect(preview.locator("[data-count-included]")).toHaveText("1");
      await expect(preview.locator("[data-byte-coverage]")).toHaveAttribute("data-byte-coverage", "bytes_for_each_selected_item");
      await expect(card.locator("[data-stage-d]")).toHaveAttribute("data-stage-d", "original_archive");
      const pkgSha = (await preview.locator("[data-package-sha256]").innerText()).trim();
      expect(pkgSha).toMatch(/^[0-9a-f]{64}$/);

      // Download actual ZIP and independently inspect included bytes
      const [dl] = await Promise.all([page.waitForEvent("download"), preview.locator("[data-download-package]").click()]);
      const downloadedBytes = new Uint8Array(fs.readFileSync((await dl.path())!));
      expect(sha256(downloadedBytes)).toBe(pkgSha);
      const members = readStoredArchive(downloadedBytes);
      expect(members.has("package_manifest.json")).toBe(true);
      expect(members.has("report.md")).toBe(true);
      expect(members.has("report.html")).toBe(true);
      expect(members.has("citations.bib")).toBe(true);
      expect(members.has("citations.csl.json")).toBe(true);
      const includedSnapshotPath = `snapshots/${sorsSha}/snapshot.zip`;
      expect(members.has(includedSnapshotPath)).toBe(true);
      expect(members.get(includedSnapshotPath)).toEqual(sorsBytes);

      // Independent local verification: (1) with matching expected SHA-256, (2) without expected SHA-256
      await composer.locator("[data-verify-expected-sha]").fill(pkgSha);
      await composer.locator("[data-verify-package-input]").setInputFiles({
        name: dl.suggestedFilename(),
        mimeType: "application/zip",
        buffer: Buffer.from(downloadedBytes),
      });
      await expect(composer.locator("[data-verify-result]")).toHaveAttribute("data-verify-result", "matched");

      await composer.locator("[data-verify-expected-sha]").fill("");
      await composer.locator("[data-verify-package-input]").setInputFiles({
        name: dl.suggestedFilename(),
        mimeType: "application/zip",
        buffer: Buffer.from(downloadedBytes),
      });
      await expect(composer.locator("[data-verify-result]")).toHaveAttribute("data-verify-result", "not_supplied");

      // Storage invariance, zero external requests, zero overflow
      expect(await page.evaluate(k => localStorage.getItem(k), NOTEBOOK_STORAGE_KEY)).toBe(raw);
      expect(await page.evaluate(k => localStorage.getItem(k), NOTEBOOK_PROJECTS_KEY)).toBeNull();
      expect(externalRequests).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);

      // Screenshot of completed composer
      await composer.screenshot({ path: info.outputPath(`r1c2-composer-case-a-${lang.toLowerCase()}.png`) });

      // WCAG light & dark mode axe checks
      for (const theme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.evaluate(t => document.documentElement.setAttribute("data-theme", t), theme);
        await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe("");
        const axe = await new AxeBuilder({ page }).include("[data-research-package-composer]").analyze();
        expect(axe.violations.filter(v => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
      }
    });
  }

  test("Cases B & E: Real annual snapshot (unresolved rights + quarantined figure.svg) -> reference-only 7-file package", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Multi-page real export workflow runs under desktop-1440");

    await page.goto("/en/data/?country=poland&indicator=hicp_inflation&from=2020&to=2022&history=0", { waitUntil: "networkidle" });
    const disclosure = page.getByText("Original source records and existing research exports", { exact: true });
    if (await disclosure.count()) await disclosure.click();
    const scope = page.locator('[data-snapshot-scope="annual"]');
    await scope.locator("[data-notebook-add]").first().click();
    await expect.poll(async () => JSON.parse(await activeNotebookRaw(page)).items?.length ?? 0).toBe(1);

    const [snapDl] = await Promise.all([
      page.waitForEvent("download"),
      scope.getByRole("button", { name: "Export research snapshot", exact: true }).first().click(),
    ]);
    const snapBytes = new Uint8Array(fs.readFileSync((await snapDl.path())!));

    await page.goto("/en/notebook/", { waitUntil: "networkidle" });
    await page.locator("[data-notebook-brief] > summary").click();
    const composer = page.locator("[data-research-package-composer]");
    await composer.locator("> summary").click();
    await composer.locator("[data-attachment-file-input]").setInputFiles({
      name: snapDl.suggestedFilename(),
      mimeType: "application/zip",
      buffer: Buffer.from(snapBytes),
    });

    const card = composer.locator("[data-prepared-attachment]").first();
    await expect(card).toBeVisible();
    // Case E: figure.svg quarantined, NEVER rendered as active <svg>
    await expect(card.locator("[data-figure-status]")).toContainText("figure.svg");
    await expect(composer.locator("[data-prepared-attachments] svg")).toHaveCount(0);
    // Case B: rights unresolved -> reference_only
    await expect(card.locator("[data-stage-c]")).toHaveAttribute("data-stage-c", "unknown_pending_verification");

    await composer.locator("[data-build-package]").click();
    const preview = composer.locator("[data-package-preview]");
    await expect(preview.locator("[data-count-included]")).toHaveText("0");
    await expect(preview.locator("[data-count-reference-only]")).toHaveText("1");
    await expect(preview.locator("[data-report-only-package-note]")).toBeVisible();

    const [pkgDl] = await Promise.all([page.waitForEvent("download"), preview.locator("[data-download-package]").click()]);
    const pkgMembers = readStoredArchive(new Uint8Array(fs.readFileSync((await pkgDl.path())!)));
    expect(pkgMembers.size).toBe(7); // 7 root files only; zero snapshot/figure bytes
  });

  test("Case C: Real National Comparison bar mode -> partial_correspondence -> reference-only", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Case C runs under desktop-1440");

    await page.goto("/en/data/?tab=compare&compare_countries=poland,hungary&comparison_indicator=annual:real_gdp_growth&comparison_view=bar&comparison_mode=harmonized", { waitUntil: "networkidle" });
    const ws = page.locator("[data-national-comparison]");
    await ws.locator("[data-notebook-add]").click();
    await expect.poll(async () => JSON.parse(await activeNotebookRaw(page)).items?.length ?? 0).toBe(1);
    const [snapDl] = await Promise.all([
      page.waitForEvent("download"),
      ws.getByRole("button", { name: "Export research snapshot", exact: true }).click(),
    ]);
    const snapBytes = new Uint8Array(fs.readFileSync((await snapDl.path())!));

    await page.goto("/en/notebook/", { waitUntil: "networkidle" });
    await page.locator("[data-notebook-brief] > summary").click();
    const composer = page.locator("[data-research-package-composer]");
    await composer.locator("> summary").click();
    await composer.locator("[data-attachment-file-input]").setInputFiles({
      name: snapDl.suggestedFilename(),
      mimeType: "application/zip",
      buffer: Buffer.from(snapBytes),
    });

    const card = composer.locator("[data-prepared-attachment]").first();
    await expect(card.locator("[data-stage-b]")).toHaveAttribute("data-stage-b", "partial_correspondence");
    await composer.locator("[data-build-package]").click();
    await expect(composer.locator("[data-count-included]")).toHaveText("0");
    await expect(composer.locator("[data-count-reference-only]")).toHaveText("1");
  });

  test("Case D: Historical political evidence (Hungary 1998) rejects economic snapshot as unsupported_artifact_type", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Case D runs under desktop-1440");
    const { sorsBytes } = sorsCpiNotebookFixture();

    await page.goto("/en/politics/hungary/?election=el-hu-ogy-1998-05-10", { waitUntil: "networkidle" });
    await page.locator("[data-selected-election-collect] [data-notebook-add]").click();
    await expect.poll(async () => JSON.parse(await activeNotebookRaw(page)).items?.length ?? 0).toBe(1);

    await page.goto("/en/notebook/", { waitUntil: "networkidle" });
    await page.locator("[data-notebook-brief] > summary").click();
    const composer = page.locator("[data-research-package-composer]");
    await composer.locator("> summary").click();
    await composer.locator("[data-attachment-file-input]").setInputFiles({
      name: "economic-sors.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(sorsBytes),
    });

    const card = composer.locator("[data-prepared-attachment]").first();
    await expect(card.locator("[data-stage-b]")).toHaveAttribute("data-stage-b", "unsupported_artifact_type");
    await composer.locator("[data-build-package]").click();
    await expect(composer.locator("[data-count-included]")).toHaveText("0");
    await expect(composer.locator("[data-count-reference-only]")).toHaveText("1");
  });

  test("Case F: Malformed archive, invalid digest format, tampered package, and wrong expected digest", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Case F runs under desktop-1440");
    const { notebook, sorsBytes } = sorsCpiNotebookFixture();
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: NOTEBOOK_STORAGE_KEY, raw: serializeNotebook(notebook) });
    await page.goto("/en/notebook/", { waitUntil: "networkidle" });

    await page.locator("[data-notebook-brief] > summary").click();
    const composer = page.locator("[data-research-package-composer]");
    await composer.locator("> summary").click();

    // 1. Invalid expected digest format rejected before reading
    await composer.locator("[data-attachment-expected-sha]").fill("not-hex");
    await composer.locator("[data-attachment-file-input]").setInputFiles({
      name: "sors.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(sorsBytes),
    });
    await expect(composer.locator("[data-attachment-error]")).toContainText("64 hexadecimal");

    // 2. Wrong expected SHA-256 rejected with digest_mismatch
    await composer.locator("[data-attachment-expected-sha]").fill("0".repeat(64));
    await composer.locator("[data-attachment-file-input]").setInputFiles({
      name: "sors.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(sorsBytes),
    });
    await expect(composer.locator("[data-attachment-error]")).toContainText("digest_mismatch");

    // 3. Malformed non-ZIP file rejected with invalid_archive
    await composer.locator("[data-attachment-expected-sha]").fill("");
    await composer.locator("[data-attachment-file-input]").setInputFiles({
      name: "corrupt.zip",
      mimeType: "application/zip",
      buffer: Buffer.from("not a zip archive at all"),
    });
    await expect(composer.locator("[data-attachment-error]")).toContainText(/unsupported_zip|invalid_archive/);

    // 4. Build valid package, then tamper 1 byte -> verifier fails; also wrong expected SHA-256 -> digest_mismatch
    await composer.locator("[data-build-package]").click();
    const [dl] = await Promise.all([page.waitForEvent("download"), composer.locator("[data-download-package]").click()]);
    const validBytes = new Uint8Array(fs.readFileSync((await dl.path())!));

    await composer.locator("[data-verify-expected-sha]").fill("f".repeat(64));
    await composer.locator("[data-verify-package-input]").setInputFiles({
      name: "valid.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(validBytes),
    });
    await expect(composer.locator("[data-verify-error]")).toContainText("digest_mismatch");

    const tampered = new Uint8Array(validBytes);
    tampered[tampered.length - 1] ^= 0xff;
    await composer.locator("[data-verify-expected-sha]").fill("");
    await composer.locator("[data-verify-package-input]").setInputFiles({
      name: "tampered.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(tampered),
    });
    await expect(composer.locator("[data-verify-error]")).toBeVisible();
  });

  test("Case G: State invalidation, deselection drop, note-edit invalidation, and cross-project isolation", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Case G runs under desktop-1440");
    const { notebook, sorsBytes } = sorsCpiNotebookFixture();
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: NOTEBOOK_STORAGE_KEY, raw: serializeNotebook(notebook) });
    await page.goto("/en/notebook/", { waitUntil: "networkidle" });

    // Create Project 2 to initialize NOTEBOOK_PROJECTS_KEY, then switch back to legacy
    await page.getByLabel("New project title", { exact: true }).fill("R1-C2 Isolated Project");
    await page.getByRole("button", { name: "Create project", exact: true }).click();
    await expect(page.locator("[data-active-project]")).toContainText("R1-C2 Isolated Project");
    const project2Id = await page.getByLabel("Choose research project", { exact: true }).inputValue();
    await page.getByLabel("Choose research project", { exact: true }).selectOption("legacy");
    const projectsBefore = await page.evaluate(k => localStorage.getItem(k), NOTEBOOK_PROJECTS_KEY);

    const brief = page.locator("[data-notebook-brief]");
    await brief.locator("> summary").click();
    const composer = page.locator("[data-research-package-composer]");
    await composer.locator("> summary").click();

    // Attach SORS snapshot and build package
    await composer.locator("[data-attachment-file-input]").setInputFiles({
      name: "sors.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(sorsBytes),
    });
    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(1);
    await composer.locator("[data-build-package]").click();
    await expect(composer.locator("[data-download-package]")).toBeVisible();

    // Template change immediately invalidates built package (stale package NOT downloadable!)
    await brief.locator("[data-report-template]").selectOption("comparative_note");
    await expect(composer.locator("[data-download-package]")).toHaveCount(0);
    await expect(composer.locator("[data-package-stale-notice]")).toBeVisible();

    // Deselect evidence -> handle dropped; reselect -> handle stays dropped (requires explicit reinspection!)
    const checkbox = brief.locator("[data-brief-choice] input[type='checkbox']").first();
    await checkbox.uncheck();
    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(0);
    await checkbox.check();
    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(0);

    // Confirm NOTEBOOK_PROJECTS_KEY was NEVER mutated by attachment/build/invalidation
    expect(await page.evaluate(k => localStorage.getItem(k), NOTEBOOK_PROJECTS_KEY)).toBe(projectsBefore);

    // Re-attach, then edit user note on bound evidence -> handle immediately invalidated
    await composer.locator("[data-attachment-file-input]").setInputFiles({
      name: "sors.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(sorsBytes),
    });
    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(1);
    await page.locator("[data-user-note]").first().fill("Edited researcher note invalidates handle");
    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(0);

    // Switch to Project 2 and back -> clean remount with zero leaked state
    await expect(page.getByLabel("Choose research project", { exact: true })).toBeEnabled();
    await page.getByLabel("Choose research project", { exact: true }).selectOption(project2Id);
    await expect(page.locator("[data-research-package-composer]")).toHaveCount(0);
    await page.getByLabel("Choose research project", { exact: true }).selectOption("legacy");
    await brief.locator("> summary").click();
    await composer.locator("> summary").click();
    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(0);
  });

  test("Responsive breakpoints (1024px & 768px): zero horizontal overflow in composer", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Breakpoint check runs once under desktop-1440");
    const { notebook, sorsBytes } = sorsCpiNotebookFixture();
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: NOTEBOOK_STORAGE_KEY, raw: serializeNotebook(notebook) });
    for (const width of [1024, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/en/notebook/", { waitUntil: "networkidle" });
      await page.locator("[data-notebook-brief] > summary").click();
      const composer = page.locator("[data-research-package-composer]");
      await composer.locator("> summary").click();
      await composer.locator("[data-attachment-file-input]").setInputFiles({
        name: "sors.zip",
        mimeType: "application/zip",
        buffer: Buffer.from(sorsBytes),
      });
      await composer.locator("[data-build-package]").click();
      await expect(composer.locator("[data-package-preview]")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
    }
  });

  test("Mixed-binding Stage D accuracy: same admitted SORS ZIP bound to compatible item AND unsupported item", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Mixed-binding Stage D check runs under desktop-1440");
    const sors = buildSorsCpiFixture();
    const sorsSha = sha256(sors.bytes);
    let state = emptyNotebook("en", "v2.0", SORS_FIXTURE_TIME);
    state = addNotebookEvidence(state, notebookSnapshotView(sors.input), "v2.0", SORS_FIXTURE_TIME);
    state = addNotebookEvidence(
      state,
      {
        type: "method",
        title: "Blocked VAR dynamic response",
        url: "https://hy-central-europe-analysis.org/models/",
        canonical_ids: ["var"],
        countries: [],
        periods: [],
        sources: [],
        layer: "method",
        warnings: ["Formal VAR dynamic responses remain blocked."],
        metadata: { state: "blocked" },
      },
      "v2.0",
      SORS_FIXTURE_TIME,
    );
    const compatibleId = state.items[0].id;
    const unsupportedId = state.items[1].id;
    const raw = serializeNotebook({ ...state, title: "Mixed Binding Stage D Project" });
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: NOTEBOOK_STORAGE_KEY, raw });
    await page.goto("/en/notebook/", { waitUntil: "networkidle" });

    // Open Composer directly (also exercises direct build without opening Report Studio!)
    const composer = page.locator("[data-research-package-composer]");
    await composer.locator("> summary").click();

    // 1. Bind admitted SORS CPI snapshot to compatible item
    await composer.locator("[data-attachment-evidence-select]").selectOption(compatibleId);
    await composer.locator("[data-attachment-file-input]").setInputFiles({
      name: "sors-cpi-1.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(sors.bytes),
    });
    // 2. Bind exact same snapshot bytes to unsupported method item
    await composer.locator("[data-attachment-evidence-select]").selectOption(unsupportedId);
    await composer.locator("[data-attachment-file-input]").setInputFiles({
      name: "sors-cpi-2.zip",
      mimeType: "application/zip",
      buffer: Buffer.from(sors.bytes),
    });

    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(2);
    await composer.locator("[data-build-package]").click();
    const preview = composer.locator("[data-package-preview]");
    await expect(preview).toBeVisible();

    // Confirm Stage D distinguishes per-evidence inclusion vs reference-only!
    const compatCard = composer.locator(`[data-prepared-attachment="${compatibleId}"]`);
    const unsupCard = composer.locator(`[data-prepared-attachment="${unsupportedId}"]`);
    await expect(compatCard.locator("[data-stage-d]")).toHaveAttribute("data-stage-d", "original_archive");
    await expect(unsupCard.locator("[data-stage-d]")).toHaveAttribute("data-stage-d", "reference_only");
    await expect(unsupCard.locator("[data-stage-d]")).toContainText("another compatible binding");

    // Confirm manifest counts & single deduplicated artifact in downloaded ZIP
    await expect(preview.locator("[data-count-included]")).toHaveText("1");
    await expect(preview.locator("[data-count-reference-only]")).toHaveText("1");
    const [dl] = await Promise.all([page.waitForEvent("download"), preview.locator("[data-download-package]").click()]);
    const members = readStoredArchive(new Uint8Array(fs.readFileSync((await dl.path())!)));
    const snapPaths = [...members.keys()].filter(k => k.startsWith("snapshots/"));
    expect(snapPaths).toEqual([`snapshots/${sorsSha}/snapshot.zip`]);
  });

  test("Pending-operation race conditions & permanent invalidation (Scenarios A–M)", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-1440", "Async race harness runs under desktop-1440");
    const { notebook: baseNotebook, sorsBytes } = sorsCpiNotebookFixture();
    // Add a second evidence item so Scenario B can toggle selected evidence while keeping a non-empty selection
    const notebook = addNotebookEvidence(
      baseNotebook,
      {
        type: "method",
        title: "Blocked VAR dynamic response",
        url: "https://hy-central-europe-analysis.org/models/",
        canonical_ids: ["var"],
        countries: [],
        periods: [],
        sources: [],
        layer: "method",
        warnings: ["Formal VAR dynamic responses remain blocked."],
        metadata: { state: "blocked" },
      },
      "v2.0",
      SORS_FIXTURE_TIME,
    );
    const raw = serializeNotebook(notebook);

    // Deterministic test-only Web Crypto digest gate supporting per-operation batch stashing (zero production hooks)
    await page.addInitScript(({ key, raw }) => {
      localStorage.setItem(key, raw);
      const origDigest = crypto.subtle.digest.bind(crypto.subtle);
      type Entry = { resolve: () => void; reject: (err: Error) => void };
      const queue: Entry[] = [];
      const batches = new Map<number, Entry[]>();
      let nextBatchId = 1;
      let paused = false;
      (window as unknown as Record<string, unknown>).__digestGate = {
        pause: () => { paused = true; },
        stashAndUnpause: () => {
          const id = nextBatchId++;
          batches.set(id, queue.splice(0, queue.length));
          paused = false;
          return id;
        },
        resolveBatch: (id: number) => {
          const entries = batches.get(id) ?? [];
          batches.delete(id);
          while (entries.length) entries.shift()!.resolve();
        },
        rejectBatch: (id: number) => {
          const entries = batches.get(id) ?? [];
          batches.delete(id);
          while (entries.length) entries.shift()!.reject(new Error("Simulated late digest failure"));
        },
        resumeAll: () => { paused = false; while (queue.length) queue.shift()!.resolve(); },
        rejectAll: () => { paused = false; while (queue.length) queue.shift()!.reject(new Error("Simulated late digest failure")); },
        pendingCount: () => queue.length,
      };
      crypto.subtle.digest = (async (alg: AlgorithmIdentifier, data: BufferSource) => {
        if (paused) {
          await new Promise<void>((resolve, reject) => queue.push({ resolve, reject }));
        }
        return origDigest(alg, data);
      }) as typeof crypto.subtle.digest;
    }, { key: NOTEBOOK_STORAGE_KEY, raw });

    type DigestGateApi = {
      pause: () => void;
      stashAndUnpause: () => number;
      resolveBatch: (id: number) => void;
      rejectBatch: (id: number) => void;
      resumeAll: () => void;
      rejectAll: () => void;
      pendingCount: () => number;
    };
    const gate = () => page.evaluate(() => {
      const g = (window as unknown as { __digestGate: DigestGateApi }).__digestGate;
      return g.pendingCount();
    });
    const pauseGate = () => page.evaluate(() => (window as unknown as { __digestGate: DigestGateApi }).__digestGate.pause());
    const stashAndUnpause = () => page.evaluate(() => (window as unknown as { __digestGate: DigestGateApi }).__digestGate.stashAndUnpause());
    const resolveBatch = (id: number) => page.evaluate(batchId => (window as unknown as { __digestGate: DigestGateApi }).__digestGate.resolveBatch(batchId), id);
    const rejectBatch = (id: number) => page.evaluate(batchId => (window as unknown as { __digestGate: DigestGateApi }).__digestGate.rejectBatch(batchId), id);
    const resumeAll = () => page.evaluate(() => (window as unknown as { __digestGate: DigestGateApi }).__digestGate.resumeAll());

    await page.goto("/en/notebook/", { waitUntil: "networkidle" });
    const brief = page.locator("[data-notebook-brief]");
    const composer = page.locator("[data-research-package-composer]");

    // Scenario J: Direct first build WITHOUT opening Report Studio (ensureTimestamp must not self-invalidate)
    await composer.locator("> summary").click();
    await composer.locator("[data-build-package]").click();
    await expect(composer.locator("[data-package-preview]")).toBeVisible();
    await expect(composer.locator("[data-download-package]")).toBeVisible();

    // Scenario M: Verification result clears immediately when expected digest input is edited
    const [dl] = await Promise.all([page.waitForEvent("download"), composer.locator("[data-download-package]").click()]);
    const pkgBytes = new Uint8Array(fs.readFileSync((await dl.path())!));
    const pkgSha = (await composer.locator("[data-package-sha256]").innerText()).trim();
    await composer.locator("[data-verify-expected-sha]").fill(pkgSha);
    await composer.locator("[data-verify-package-input]").setInputFiles({ name: "pkg.zip", mimeType: "application/zip", buffer: Buffer.from(pkgBytes) });
    await expect(composer.locator("[data-verify-result]")).toHaveAttribute("data-verify-result", "matched");
    await composer.locator("[data-verify-expected-sha]").fill("0".repeat(64));
    await expect(composer.locator("[data-verify-result]")).toHaveCount(0);

    // Scenario K: Template A -> B -> A permanently invalidates old package (never resurrects!)
    await brief.locator("> summary").click();
    await brief.locator("[data-report-template]").selectOption("comparative_note");
    await expect(composer.locator("[data-package-preview]")).toHaveCount(0);
    await expect(composer.locator("[data-package-stale-notice]")).toBeVisible();
    await brief.locator("[data-report-template]").selectOption("standard");
    await expect(composer.locator("[data-package-preview]")).toHaveCount(0);
    await expect(composer.locator("[data-download-package]")).toHaveCount(0);

    // Scenario L: Evidence note A -> B -> A permanently drops handle (never resurrects!)
    await composer.locator("[data-attachment-file-input]").setInputFiles({ name: "sors.zip", mimeType: "application/zip", buffer: Buffer.from(sorsBytes) });
    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(1);
    const noteBox = page.locator("[data-user-note]").first();
    await noteBox.fill("Temporary edit B");
    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(0);
    await noteBox.fill("");
    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(0);

    // Scenario A + H: Change template during pending build #1, let newer build #2 COMPLETE first, then resolve older build #1 late -> newer preview & download MUST survive intact!
    await pauseGate();
    await composer.locator("[data-build-package]").click();
    await expect(composer.locator("[data-build-package]")).toBeDisabled();
    await expect.poll(gate).toBeGreaterThan(0);
    const staleBuildBatchH = await stashAndUnpause();

    await brief.locator("[data-report-template]").selectOption("comparative_note");
    await expect(composer.locator("[data-build-package]")).toBeEnabled();
    await composer.locator("[data-build-package]").click();
    await expect(composer.locator("[data-package-preview]")).toBeVisible();
    const newerShaH = (await composer.locator("[data-package-sha256]").innerText()).trim();
    expect(newerShaH).toMatch(/^[0-9a-f]{64}$/);

    // Release older build #1 to resolve AFTER newer build #2 already completed
    await resolveBatch(staleBuildBatchH);
    await page.waitForTimeout(100);
    await expect(composer.locator("[data-package-preview]")).toBeVisible();
    await expect(composer.locator("[data-package-sha256]")).toHaveText(newerShaH);
    await expect(composer.locator("[data-package-build-error]")).toHaveCount(0);
    await expect(composer.locator("[data-build-package]")).toBeEnabled();
    const [dlH] = await Promise.all([page.waitForEvent("download"), composer.locator("[data-download-package]").click()]);
    expect(sha256(new Uint8Array(fs.readFileSync((await dlH.path())!)))).toBe(newerShaH);

    // Scenario I: Change template during pending build #1, let newer build #2 COMPLETE first, then REJECT older build #1 late -> newer preview & download MUST survive with zero build error!
    await pauseGate();
    await composer.locator("[data-build-package]").click();
    await expect(composer.locator("[data-build-package]")).toBeDisabled();
    await expect.poll(gate).toBeGreaterThan(0);
    const staleBuildBatchI = await stashAndUnpause();

    await brief.locator("[data-report-template]").selectOption("methodological_audit");
    await expect(composer.locator("[data-build-package]")).toBeEnabled();
    await composer.locator("[data-build-package]").click();
    await expect(composer.locator("[data-package-preview]")).toBeVisible();
    const newerShaI = (await composer.locator("[data-package-sha256]").innerText()).trim();
    expect(newerShaI).not.toBe(newerShaH);

    // Release older build #1 with rejection AFTER newer build #2 already completed
    await rejectBatch(staleBuildBatchI);
    await page.waitForTimeout(100);
    await expect(composer.locator("[data-package-build-error]")).toHaveCount(0);
    await expect(composer.locator("[data-package-preview]")).toBeVisible();
    await expect(composer.locator("[data-package-sha256]")).toHaveText(newerShaI);
    await expect(composer.locator("[data-build-package]")).toBeEnabled();
    const [dlI] = await Promise.all([page.waitForEvent("download"), composer.locator("[data-download-package]").click()]);
    expect(sha256(new Uint8Array(fs.readFileSync((await dlI.path())!)))).toBe(newerShaI);

    // Scenario B: Change selected evidence during a pending build -> busy recovers, stale build discarded, fresh build reflects new selection
    await pauseGate();
    await composer.locator("[data-build-package]").click();
    await expect(composer.locator("[data-build-package]")).toBeDisabled();
    await expect.poll(gate).toBeGreaterThan(0);
    const staleBuildBatchB = await stashAndUnpause();

    const secondCheckbox = brief.locator("[data-brief-choice] input[type='checkbox']").nth(1);
    await secondCheckbox.uncheck();
    await expect(composer.locator("[data-build-package]")).toBeEnabled();
    await resolveBatch(staleBuildBatchB);
    await page.waitForTimeout(100);
    await expect(composer.locator("[data-package-preview]")).toHaveCount(0);

    // Fresh build with 1 selected item succeeds
    await composer.locator("[data-build-package]").click();
    await expect(composer.locator("[data-package-preview]")).toBeVisible();
    await expect(composer.locator("[data-count-unbound]")).toHaveText("1");
    await secondCheckbox.check();

    // Scenario C: Edit an exported project field (Research question) during a pending build -> busy recovers, stale build discarded
    await pauseGate();
    await composer.locator("[data-build-package]").click();
    await expect(composer.locator("[data-build-package]")).toBeDisabled();
    await expect.poll(gate).toBeGreaterThan(0);
    const staleBuildBatchC = await stashAndUnpause();

    const questionBox = page.locator('section[aria-labelledby="notebook-question"] textarea');
    await questionBox.fill("Updated research question mid-build");
    await expect(composer.locator("[data-build-package]")).toBeEnabled();
    await resolveBatch(staleBuildBatchC);
    await page.waitForTimeout(100);
    await expect(composer.locator("[data-package-preview]")).toHaveCount(0);

    // Scenario D: Pending inspection while evidence is deselected & reselected -> late completion permanently discarded
    await pauseGate();
    await composer.locator("[data-attachment-file-input]").setInputFiles({ name: "sors-race-d.zip", mimeType: "application/zip", buffer: Buffer.from(sorsBytes) });
    await expect.poll(gate).toBeGreaterThan(0);
    const firstCheckbox = brief.locator("[data-brief-choice] input[type='checkbox']").first();
    await firstCheckbox.uncheck();
    await firstCheckbox.check();
    await resumeAll();
    await expect(composer.locator("[data-attachment-file-input]")).toBeEnabled();
    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(0);

    // Scenario E: Edit and restore bound evidence metadata (user note) during pending inspection -> late completion permanently discarded
    await pauseGate();
    await composer.locator("[data-attachment-file-input]").setInputFiles({ name: "sors-race-e.zip", mimeType: "application/zip", buffer: Buffer.from(sorsBytes) });
    await expect.poll(gate).toBeGreaterThan(0);
    await noteBox.fill("Edited mid-inspection");
    await noteBox.fill("");
    await resumeAll();
    await expect(composer.locator("[data-attachment-file-input]")).toBeEnabled();
    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(0);

    // Scenario G: Pending build while attachment removed -> old build discarded, busy recovers
    await composer.locator("[data-attachment-file-input]").setInputFiles({ name: "sors-g.zip", mimeType: "application/zip", buffer: Buffer.from(sorsBytes) });
    await expect(composer.locator("[data-prepared-attachment]")).toHaveCount(1);
    await pauseGate();
    await composer.locator("[data-build-package]").click();
    await expect.poll(gate).toBeGreaterThan(0);
    await composer.locator("[data-remove-attachment]").first().click();
    await expect(composer.locator("[data-build-package]")).toBeEnabled();
    await resumeAll();
    await expect(composer.locator("[data-package-preview]")).toHaveCount(0);

    // Scenario F: Pending build while switching projects -> zero cross-project leak
    await page.getByLabel("New project title", { exact: true }).fill("Race Target Project");
    await page.getByRole("button", { name: "Create project", exact: true }).click();
    await expect(page.locator("[data-active-project]")).toContainText("Race Target Project");
    const targetProjId = await page.getByLabel("Choose research project", { exact: true }).inputValue();
    await page.getByLabel("Choose research project", { exact: true }).selectOption("legacy");
    await composer.locator("> summary").click();
    await pauseGate();
    await composer.locator("[data-build-package]").click();
    await expect.poll(gate).toBeGreaterThan(0);
    await page.getByLabel("Choose research project", { exact: true }).selectOption(targetProjId);
    await resumeAll();
    await expect(page.locator("[data-package-preview]")).toHaveCount(0);
  });
});
