import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { buildSorsSnapshotExample } from "../fixtures/research-package-sors.mjs";

const require = createRequire(import.meta.url);
const {readStoredArchive} = require("../../src/lib/researchPackageArchive.ts");
const {inspectSnapshot} = require("../../src/lib/researchPackageSnapshot.ts");
const {assessSnapshotRights} = require("../../src/lib/researchPackageRights.ts");
const read = relative => JSON.parse(readFileSync(new URL("../../" + relative, import.meta.url), "utf8"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const canonical = read("src/data/serbia/serbia_descriptive_history_monthly.json");
const register = read("docs/legal-security/source_rights_registry.json").sources;
const sors = register.find(s => s.source_id === "src-sors");

for (const [key, frequency, count] of [["cpi_index_2006", "monthly", 228], ["lfs_unemployment_quarterly", "quarterly", 62]]) {
  test("Rights for the admitted " + key + " extract match canonical source rows, dates, scope and terms", async () => {
    const {bytes} = buildSorsSnapshotExample(key);
    const inspected = await inspectSnapshot(bytes);
    assert.equal(inspected.sha256, hash(bytes));
    const scope = canonical.series_sources.find(s => s.series === key);
    const raw = read("src/data/serbia/raw/" + scope.source_dataset + ".extract.json");
    const rows = new Map(canonical.records.filter(r => r.series === key && r.territory_code === "RS" && r.statistical_level === "national")
      .map(r => [r.period, r]));
    const sourceRows = new Map(raw.records.map(r => [r.god + "-" + r.mes.replace("K", "Q"), r]));
    assert.equal(rows.size, count);
    assert.equal(sourceRows.size, count);
    assert.equal(inspected.rows.length, count);
    assert.equal(inspected.sources.length, 1);
    assert.equal(inspected.sources[0].dataset, raw.dataset_id);
    assert.equal(inspected.sources[0].source_url, raw.source_url);
    assert.equal(inspected.sources[0].retrieved_at, scope.retrieved_at ?? "");
    assert.deepEqual(JSON.parse(inspected.sources[0].source_code), scope.original_code);
    for (const row of inspected.rows) {
      const obs = rows.get(row.period);
      const sourceRow = sourceRows.get(row.period);
      assert.equal(row.id, "sors:" + key + ":" + row.period);
      assert.equal(row.country, "serbia");
      assert.equal(row.layer, "serbia_sors_descriptive");
      assert.equal(row.frequency, frequency);
      assert.equal(row.value, obs.normalized_value);
      assert.equal(row.unit, obs.normalized_unit);
      assert.equal(row.extras.original_unit, obs.original_unit);
      assert.equal(Number(row.extras.original_value), obs.original_value);
      assert.equal(obs.original_value, sourceRow.vrednost);
      assert.equal(obs.source_ref, scope.source_ref);
      assert.equal(sourceRow.IDTer, "RS");
      for (const [code, value] of Object.entries(scope.original_code)) assert.equal(String(sourceRow[code]), value);
      assert.equal(row.status, canonical.sors_status_legend[sourceRow.IDStatusPodatka]);
      assert.equal(row.cross_country_comparable, false);
      assert.equal(obs.cross_country_comparable, false);
      assert.equal(row.source_id, inspected.sources[0].source_id);
    }
    const rights = await assessSnapshotRights(inspected, readStoredArchive(bytes), bytes);
    assert.equal(rights.status, "verified_permitted_use");
    assert.equal(rights.scope, "original_archive");
    assert.deepEqual(rights.registry_sources, [{id:sors.source_id, terms_url:sors.terms_url, licence:sors.licence_name, attribution:sors.required_attribution_text}]);
    assert.equal(rights.terms_url, sors.terms_url);
    assert.ok(rights.attribution.includes(sors.required_attribution_text));
    for (const detail of [raw.response_sha256, String(raw.response_record_count), String(raw.extract_record_count), raw.source_url]) {
      assert.ok(rights.modification_notice.includes(detail));
    }
  });
}

test("Whole-archive permission checks original bytes and complete inventory, including ancillary records and figures", async () => {
  const {bytes} = buildSorsSnapshotExample();
  const later = buildSorsSnapshotExample("cpi_index_2006", "2026-11-26T12:01:00.000Z");
  const original = await inspectSnapshot(bytes);
  const different = await inspectSnapshot(later.bytes);
  const members = readStoredArchive(bytes);
  const laterMembers = readStoredArchive(later.bytes);
  assert.notEqual(original.sha256, different.sha256);
  assert.deepEqual(members.get("data.csv"), laterMembers.get("data.csv"));
  assert.deepEqual(members.get("sources.csv"), laterMembers.get("sources.csv"));
  for (const [snapshot, files, actual] of [
    [different, laterMembers, later.bytes], [original, members, undefined],
    [original, laterMembers, bytes], [different, members, bytes], [original, members, later.bytes],
    [{...original, figure:{name:"figure.svg"}}, members, bytes],
    [original, new Map([...members, ["figure.svg", new TextEncoder().encode("<svg/>")]]), bytes],
  ]) {
    const rights = await assessSnapshotRights(snapshot, files, actual);
    assert.equal(rights.status, "verified_permitted_use");
    assert.equal(rights.scope, "normalized_members");
  }
});

test("No transferable permission from a matching URL, status claim, partial extract or crossed source/observation pair", async () => {
  const {bytes} = buildSorsSnapshotExample();
  const inspected = await inspectSnapshot(bytes);
  const members = readStoredArchive(bytes);
  const other = readStoredArchive(buildSorsSnapshotExample("lfs_unemployment_quarterly").bytes);
  const unknown = new Map(members);
  unknown.set("data.csv", new TextEncoder().encode("another selection"));
  const mixed = new Map(members);
  mixed.set("sources.csv", other.get("sources.csv"));
  for (const [snapshot, files] of [
    [inspected, unknown], [inspected, mixed], [inspected, new Map()],
    [{...inspected, manifest:{...inspected.manifest, comparability_status:"registered_comparable_within_segments"}}, members],
    [{...inspected, sources:[{...inspected.sources[0], source_url:"https://example.org/"}], rights:"permitted"}, members],
  ]) {
    const rights = await assessSnapshotRights(snapshot, files, bytes);
    assert.equal(rights.status, "unknown_pending_verification");
    assert.equal(rights.scope, "reference_only");
  }
  const restricted = register.find(s => s.source_id === "src-gisco");
  const edited = {...inspected, sources:[{...inspected.sources[0], source_url:restricted.exact_source_url + "example"}]};
  const rights = await assessSnapshotRights(edited, members, bytes);
  assert.equal(rights.status, "restricted_redistribution");
  assert.equal(rights.scope, "reference_only");
  assert.equal(rights.terms_url, restricted.terms_url);
});
