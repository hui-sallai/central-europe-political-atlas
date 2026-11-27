import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { activeNotebookRaw } from "./notebook-storage";

const cases = [
  { series: "cpi_index_2006", count: 228, include: true,
    data: "32dc6d5c95e16c585c7567bb6a9b220f899b3cb82cd196091fe4b8a5e62e1454", sources: "0fea6dc6b324e6ba35bec790b0aeab70323c15e0e00105c8c7ca5e05a0661761" },
  { series: "lfs_unemployment_quarterly", count: 62, include: true,
    data: "970a79c0a6f7693561dd05f8cba9c3a4a14eaca551983355b4f9dab8dd5bc204", sources: "df7b9c82eefb75487a90e23b5d32fe6beff570f3eba43e9d80444c490d7267c9" },
  { series: "cpi_annual_index", count: 228, include: true,
    data: "760bed4e9e0b894627ea0997792b3296864af8895d105a2795887e218db873d1", sources: "ce4cb36c5597a1ae84f0c2fa6be42c02057347e1e372e72888aaa205151d91b0" },
  { series: "retail_trade_volume_sa", count: 321, include: true,
    data: "812bc785be91e07cb20f18d308e11dcbded3d0261586bffab975c850eaf72fe3", sources: "ab130e992879869a0ad9b27262e668d19e8a554bae9d740452e61be186f89dba" },
  { series: "hicp_annual_rate", count: 12, include: false,
    data: "633544d1d1d3d772667d5ff695b4c80c251b1c49783cfa43e853f3cda3b9a463", sources: "1bd9903472df2dd79f8e3dfa3a1a5cd4a08f445c13184dc0957f663c1f892285" },
];

const roots = ["README.md", "report.md", "report.html", "citations.bib", "citations.csl.json", "report_manifest.json", "package_manifest.json"];
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

// Independent ZIP and CRC reader. No source or figure from the archive is executed or written to a ZIP-supplied path.
function inspectZip(file: string): Record<string, Buffer> {
  const code = [
    "import sys, json, zipfile, base64",
    "with zipfile.ZipFile(sys.argv[1]) as z:",
    " assert z.testzip() is None and len(set(z.namelist())) == len(z.namelist())",
    " print(json.dumps({name: base64.b64encode(z.read(name)).decode('ascii') for name in z.namelist()}))",
  ].join("\n");
  const members: Record<string, string> = JSON.parse(execFileSync("python3", ["-c", code, file], { encoding: "utf8", maxBuffer: 4_000_000 }));
  return Object.fromEntries(Object.entries(members).map(([name, data]) => [name, Buffer.from(data, "base64")]));
}

function inventory(members: Record<string, Buffer>) {
  return Object.entries(members).map(([path, bytes]) => ({ path, byte_length: bytes.length, sha256: sha256(bytes) }));
}

for (const item of cases) {
  for (const locale of ["en", "zh"] as const) {
    test(`R1-C3 ${locale} ${item.series}: real snapshot, Notebook, correspondence and final ZIP`, async ({ page }, info) => {
      const prefix = locale === "en" ? "/en" : "";
      const eurostat = item.series === "hicp_annual_rate";
      const query = eurostat ? "country=hungary&indicator=hicp_annual_rate&from=2020&to=2020&history=0" : "country=serbia&sors_series=" + item.series;
      await page.goto(prefix + "/data/?tab=high_frequency&" + query, { waitUntil: "networkidle" });
      const disclosure = page.getByText(locale === "en" ? "Original source records and existing research exports" : "原始来源记录与既有研究导出", { exact: true });
      const scope = page.locator(`[data-snapshot-scope="${eurostat ? "high-frequency" : "sors-monthly"}"]`);
      // A slow static-page hydration can replace an early native disclosure click. Wait for the selected controls.
      await expect(async () => {
        if (!(await scope.isVisible()) && !(await disclosure.locator("..").evaluate(el => (el as HTMLDetailsElement).open))) await disclosure.click();
        await expect(scope).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 25_000 });
      await scope.locator("[data-notebook-add]").click();
      await expect.poll(async () => JSON.parse(await activeNotebookRaw(page)).items?.length ?? 0).toBe(1);
      const storedNotebook = await activeNotebookRaw(page);
      const [dl] = await Promise.all([page.waitForEvent("download"), scope.getByRole("button", { name: locale === "en" ? "Export research snapshot" : "导出研究快照", exact: true }).click()]);
      const liveSnapshot = info.outputPath("snapshot.zip");
      await dl.saveAs(liveSnapshot);
      const liveMembers = inspectZip(liveSnapshot);
      expect(sha256(liveMembers["data.csv"])).toBe(item.data);
      expect(sha256(liveMembers["sources.csv"])).toBe(item.sources);

      // A release reviewer can supply unmodified pre-change downloads. Their archive timestamps and UI text can differ.
      // Desktop can check historical compatibility. Mobile always completes the flow with its newly downloaded snapshot.
      const baselineDir = info.project.name === "desktop-1440" ? process.env.R1C3_BASELINE_SNAPSHOTS : undefined;
      const attached = baselineDir ? join(baselineDir, `${locale}-${item.series}-snapshot.zip`) : liveSnapshot;
      expect(existsSync(attached)).toBe(true);
      const snapshot = inspectZip(attached);
      const snapshotHash = sha256(readFileSync(attached));
      expect(sha256(snapshot["data.csv"])).toBe(item.data);
      expect(sha256(snapshot["sources.csv"])).toBe(item.sources);
      expect(snapshot["figure.svg"]).toBeDefined();
      const manifest = JSON.parse(snapshot["manifest.json"].toString());
      expect(manifest.files).toEqual(Object.keys(snapshot));
      expect(manifest.observation_count).toBe(item.count);
      await page.goto(prefix + "/notebook/", { waitUntil: "networkidle" });
      await page.locator("[data-notebook-brief] > summary").click();
      const composer = page.locator("[data-research-package-composer]");
      await composer.locator("> summary").click();
      await composer.locator("[data-attachment-expected-sha]").fill(snapshotHash);
      await composer.locator("[data-attachment-file-input]").setInputFiles(attached);
      const card = composer.locator("[data-prepared-attachment]");
      await expect(card.locator("[data-stage-a]")).toContainText(snapshotHash);
      await expect(card.locator("[data-figure-status]")).toContainText("figure.svg");
      await expect(card.locator("[data-stage-b]")).toHaveAttribute("data-stage-b", eurostat ? "partial_correspondence" : "compatible_live_configuration");
      await expect(card.locator("[data-stage-c]")).toHaveAttribute("data-stage-c", item.include ? "verified_permitted_use" : "unknown_pending_verification");
      await expect(card.locator("[data-stage-d]")).toHaveAttribute("data-stage-d", "pending");
      await composer.locator("[data-build-package]").click();
      const disposition = item.include ? "normalized_members" : "reference_only";
      await expect(card.locator("[data-stage-d]")).toHaveAttribute("data-stage-d", disposition);
      const preview = composer.locator("[data-package-preview]");
      const expectedDigest = (await preview.locator("[data-package-sha256]").innerText()).trim();
      const [pkg] = await Promise.all([page.waitForEvent("download"), preview.locator("[data-download-package]").click()]);
      const saved = info.outputPath("research-package.zip");
      await pkg.saveAs(saved);
      expect(sha256(readFileSync(saved))).toBe(expectedDigest);
      const files = inspectZip(saved);
      const output = JSON.parse(files["package_manifest.json"].toString());
      expect(output.artifacts).toHaveLength(1);
      expect(output.bindings).toHaveLength(1);
      const [artifact] = output.artifacts;
      const [binding] = output.bindings;
      expect(binding.expected_digest_check).toBe("matches_supplied_digest");
      expect(binding.correspondence.historical_provenance).toMatchObject({ status: "unverified", same_operation_capture_receipt: null });
      expect(artifact.sha256).toBe(snapshotHash);
      expect(artifact.actual_scope.observation_ids).toHaveLength(item.count);
      expect(artifact.disposition).toBe(disposition);
      expect(JSON.parse(files["citations.csl.json"].toString()).length).toBeGreaterThan(0);
      expect(files["citations.bib"].toString()).toMatch(/@[a-z]+\{/i);
      expect(JSON.parse(files["report_manifest.json"].toString()).schema).toBe("atlas-research-report-manifest-v1");
      const dataPath = `snapshots/${snapshotHash}/`;
      const additional = item.include ? [dataPath + "data.csv", dataPath + "sources.csv"] : [];
      expect(Object.keys(files).sort()).toEqual([...roots, ...additional].sort());
      expect(artifact.members.slice().sort()).toEqual(additional.sort());
      if (item.include) {
        expect(files[dataPath + "data.csv"].equals(snapshot["data.csv"])).toBe(true);
        expect(files[dataPath + "sources.csv"].equals(snapshot["sources.csv"])).toBe(true);
        expect(artifact.rights.attribution.length).toBeGreaterThan(0);
        expect(artifact.rights.modification_notice).toContain("SORS");
      }
      if (eurostat) {
        expect(binding.correspondence.source_relationships).toEqual([expect.objectContaining({ status: "incomplete", differences: ["statistical_definition_unrecorded"] })]);
      }
      if (item.series === "retail_trade_volume_sa" && item.include) {
        expect(artifact.rights.modification_notice).toMatch(/provisional/i);
        expect(artifact.rights.modification_notice).toMatch(/revis/i);
      }
      const contents = inventory(files);
      for (const entry of contents.filter(row => row.path !== "package_manifest.json")) expect(output.files).toContainEqual(entry);
      expect(output.files).toHaveLength(contents.length - 1);
      await composer.locator("[data-verify-expected-sha]").fill(expectedDigest);
      await composer.locator("[data-verify-package-input]").setInputFiles(saved);
      await expect(composer.locator("[data-verify-result]")).toHaveAttribute("data-verify-result", "matched");
      expect(await activeNotebookRaw(page)).toBe(storedNotebook);
      writeFileSync(info.outputPath("verified-inventory.json"), JSON.stringify({
        locale, series: item.series, view: manifest.shareable_view_url, observation_count: item.count,
        live_download_sha256: sha256(readFileSync(liveSnapshot)), attached_snapshot_sha256: snapshotHash,
        previously_exported_snapshot: Boolean(baselineDir), snapshot_members: inventory(snapshot),
        package_sha256: expectedDigest, package_members: contents,
        correspondence: binding.correspondence.status, historical_provenance: binding.correspondence.historical_provenance.status,
        rights: artifact.rights, disposition,
      }, null, 2) + "\n");
    });
  }
}
