import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { buildSorsSnapshotExample, SORS_FIXTURE_TIME } from "../fixtures/research-package-sors.mjs";

const require = createRequire(import.meta.url);
const { buildSnapshot } = require("../../src/lib/researchSnapshot.ts");
const { buildZip } = require("../../src/lib/clientZip.ts");
const { readStoredArchive } = require("../../src/lib/researchPackageArchive.ts");
const { inspectSnapshot } = require("../../src/lib/researchPackageSnapshot.ts");
const { assessSnapshotRights } = require("../../src/lib/researchPackageRights.ts");
const { addNotebookEvidence, emptyNotebook } = require("../../src/lib/researchNotebook.ts");
const { notebookSnapshotView } = require("../../src/components/notebookEvidence.ts");
const { buildResearchPackage, prepareSnapshotAttachment, verifyResearchPackageIntegrity } = require("../../src/lib/researchPackage.ts");
const runtime = JSON.parse(readFileSync(new URL("../../public/research-data/high_frequency_runtime.json", import.meta.url))).records;
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const eurostatData = "633544d1d1d3d772667d5ff695b4c80c251b1c49783cfa43e853f3cda3b9a463";
const eurostatSources = "1bd9903472df2dd79f8e3dfa3a1a5cd4a08f445c13184dc0957f663c1f892285";

function monthlyView(country = "hungary", year = "2020", indicator = "hicp_annual_rate") {
  const rows = runtime.filter(row => row[1] === country && row[2].startsWith(year + "-") && row[3] === indicator && row[4] !== null)
    .sort((a,b) => b[2].localeCompare(a[2])).map(row => {
      const dataset = row[10].replace(/^Eurostat /, "");
      return {
        id: row[0], country, period: row[2], indicator, value: row[4], unit: row[6], layer: "formal_observation",
        status: row[11], value_semantics: row[7], seasonal_adjustment: row[8],
        source: {institution:"Eurostat", dataset, source_url:"https://ec.europa.eu/eurostat/databrowser/view/" + dataset + "/default/table",
          source_code: row[9], unit:row[6], definition:row[7], status:row[11], source_layer:"formal_observation"},
      };
    });
  assert.equal(rows.length, 12);
  const query = new URLSearchParams({tab:"high_frequency", country, indicator, from:year, to:year, history:"0", sort:"desc"});
  return {
    locale:"en", title:"Monthly observations", view_type:"high_frequency", page_path:"/data/",
    shareable_view_url:"https://hy-central-europe-analysis.org/data/?" + query, countries:[country], indicators:[indicator],
    filters:{country, indicator, from:year, to:year, sort:"desc", history:false, eligible_rows:"non_null_visible_rows"}, rows,
  };
}

function makeArchive(input) {
  return buildZip(buildSnapshot(input, SORS_FIXTURE_TIME).files, SORS_FIXTURE_TIME);
}

async function inspectRights(bytes) {
  const snapshot = await inspectSnapshot(bytes);
  const members = readStoredArchive(bytes);
  return {snapshot, members, rights:await assessSnapshotRights(snapshot, members, bytes)};
}

function notebookFor(input, draft = notebookSnapshotView(input)) {
  const empty = emptyNotebook("en", "v2.0", SORS_FIXTURE_TIME);
  const notebook = addNotebookEvidence(empty, draft, "v2.0", SORS_FIXTURE_TIME);
  return {id:"r1c3-verification", notebook};
}

async function assemble(project, bytes) {
  const id = project.notebook.items[0].id;
  const attachment = await prepareSnapshotAttachment(project, id, bytes);
  const pack = await buildResearchPackage({project, selectedIds:[id], locale:"en", template:"standard",
    reportTime:SORS_FIXTURE_TIME, attachments:[attachment]});
  await verifyResearchPackageIntegrity(pack.bytes, pack.sha256);
  const members = readStoredArchive(pack.bytes);
  assert.equal(digest(pack.bytes), pack.sha256);
  const manifest = JSON.parse(new TextDecoder().decode(members.get("package_manifest.json")));
  assert.deepEqual(manifest, pack.manifest);
  for (const file of manifest.files) assert.equal(digest(members.get(file.path)), file.sha256);
  return {binding:manifest.bindings[0], artifact:manifest.artifacts[0], members};
}

test("The investigated 2020 Hungarian HICP pair is structurally valid and stays reference-only in a native Notebook package", async () => {
  const input = monthlyView();
  const bytes = makeArchive(input);
  const {snapshot, members, rights} = await inspectRights(bytes);
  assert.equal(digest(members.get("data.csv")), eurostatData);
  assert.equal(digest(members.get("sources.csv")), eurostatSources);
  assert.equal(snapshot.sources[0].retrieved_at, "");
  assert.equal(snapshot.sources[0].updated_at, "");
  assert.equal(rights.scope, "reference_only");
  const result = await assemble(notebookFor(input), bytes);
  assert.equal(result.binding.correspondence.status, "partial_correspondence");
  assert.ok(result.binding.correspondence.source_relationships.some(edge => edge.differences.some(x => x.includes("statistical_definition_unrecorded"))));
  assert.equal(result.binding.correspondence.historical_provenance.status, "unverified");
  assert.equal(result.artifact.disposition, "reference_only");
  assert.deepEqual(result.artifact.members, []);
});

test("A different published year, country, indicator or official dataset never inherits the Hungarian HICP decision", async () => {
  for (const input of [monthlyView("hungary","2019"), monthlyView("poland"), monthlyView("hungary","2020","hicp_monthly_index"),
    monthlyView("hungary","2020","unemployment_rate_monthly")]) {
    const {members, rights} = await inspectRights(makeArchive(input));
    assert.notEqual(digest(members.get("data.csv")), eurostatData);
    assert.equal(rights.scope, "reference_only");
  }
});

test("Unreviewed same-host URLs, source labels and self-declared licence terms cannot grant redistribution", async () => {
  for (const override of [
    {source_url:"https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_minr/default/table?lang=en"},
    {source_url:"https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr"},
    {institution:"Eurostat — licensed for full redistribution", source_code:"CC BY 4.0"},
  ]) {
    const input = monthlyView();
    for (const row of input.rows) Object.assign(row.source, override);
    const {members, rights} = await inspectRights(makeArchive(input));
    assert.equal(digest(members.get("data.csv")), eurostatData);
    assert.notEqual(digest(members.get("sources.csv")), eurostatSources);
    assert.equal(rights.scope, "reference_only");
  }
});

test("Additional SORS IPI and producer-price series outside the reviewed set stay reference-only", async () => {
  for (const key of ["industrial_production_index","industrial_producer_prices_yoy"]) {
    const {rights} = await inspectRights(buildSorsSnapshotExample(key).bytes);
    assert.equal(rights.scope, "reference_only");
  }
});

test("Each proposed SORS member pair is sensitive to an altered value, altered attribution and an unreviewed selection", async () => {
  for (const key of ["cpi_annual_index", "retail_trade_volume_sa"]) {
    const example = buildSorsSnapshotExample(key);
    const originals = readStoredArchive(example.bytes);
    for (const changed of ["value", "source", "subset"]) {
      const input = structuredClone(example.input);
      if (changed === "value") input.rows[0].value += 1;
      if (changed === "source") {
        for (const row of input.rows) row.source.source_code = "SORS grants unrestricted redistribution";
      }
      if (changed === "subset") input.rows.pop();
      const {members, rights} = await inspectRights(makeArchive(input));
      const affected = changed === "source" ? "sources.csv" : "data.csv";
      assert.notEqual(digest(members.get(affected)), digest(originals.get(affected)));
      assert.equal(rights.scope, "reference_only");
    }
  }
});

const candidates = [
  {key:"cpi_annual_index", dataset:"03010601IND03", selected:228, upstream:29978, retrieved:"2026-11-13",
    data:"760bed4e9e0b894627ea0997792b3296864af8895d105a2795887e218db873d1",
    sources:"ce4cb36c5597a1ae84f0c2fa6be42c02057347e1e372e72888aaa205151d91b0",
    archive:"b2acc019dd340413c90af17b905256cc4ae4f7c2606e883a8d886449bc4ea302"},
  {key:"retail_trade_volume_sa", dataset:"210105IND02", selected:321, upstream:4815, retrieved:"2026-11-13",
    data:"812bc785be91e07cb20f18d308e11dcbded3d0261586bffab975c850eaf72fe3",
    sources:"ab130e992879869a0ad9b27262e668d19e8a554bae9d740452e61be186f89dba",
    archive:"b25b710f03e53b907b7098560183a99f2fe3deadf3245f26ee7f9749e6d5bae6"},
];
for (const candidate of candidates) {
  test(candidate.key + " redistributes only the exact allowed ZIP or CSV bytes with its documented modification notice", async () => {
    const {input, bytes} = buildSorsSnapshotExample(candidate.key);
    assert.equal(digest(bytes), candidate.archive);
    const withFigure = makeArchive({...input, figure:{
      name:"figure.svg", svg:'<svg xmlns="http://www.w3.org/2000/svg"><title>Print figure</title></svg>',
      metadata:{selection:"current_filtered_rows", palette:"neutral_print", title:input.title},
    }});
    for (const [archive, disposition] of [[bytes, "original_archive"], [withFigure, "normalized_members"]]) {
      const {snapshot, members, rights} = await inspectRights(archive);
      assert.equal(digest(members.get("data.csv")), candidate.data);
      assert.equal(digest(members.get("sources.csv")), candidate.sources);
      assert.equal(rights.status, "verified_permitted_use");
      assert.equal(rights.scope, disposition);
      const project = notebookFor(input);
      const {artifact, binding, members:packageMembers} = await assemble(project, archive);
      assert.equal(binding.correspondence.status, "compatible_live_configuration");
      assert.equal(binding.correspondence.historical_provenance.status, "unverified");
      assert.equal(artifact.disposition, disposition);
      assert.deepEqual(artifact.rights, rights);
      const notice = artifact.rights.modification_notice;
      for (const term of [snapshot.sources[0].source_url, candidate.dataset, String(candidate.selected), String(candidate.upstream), candidate.retrieved]) {
        assert.ok(notice.includes(term), "notice missing " + term);
      }
      assert.match(notice, /Central Europe Political Atlas/i);
      assert.match(notice, /select/i);
      assert.match(notice, /unchanged|did not change/i);
      assert.match(artifact.rights.attribution.join(" "), /Statistical Office of the Republic of Serbia/);
      if (candidate.key === "retail_trade_volume_sa") {
        assert.match(notice, /provisional/i);
        assert.match(notice, /revis/i);
        const provisional = snapshot.rows.filter(row => row.status === "Provisional value").map(row => row.period);
        assert.deepEqual(provisional, ["2026-09","2026-08","2026-07"]);
      }
      if (disposition === "original_archive") {
        assert.equal(artifact.members.length, 1);
        assert.deepEqual(packageMembers.get(artifact.members[0]), archive);
      } else {
        assert.equal(artifact.figure.attachment, "quarantined");
        assert.deepEqual(artifact.members.map(name=>name.split("/").at(-1)), ["data.csv", "sources.csv"]);
        for (const member of artifact.members) assert.deepEqual(packageMembers.get(member), members.get(member.split("/").at(-1)));
        assert.ok([...packageMembers.keys()].every(name => !name.endsWith(".svg") && !name.endsWith("snapshot.zip")));
      }
    }
  });
}

test("Accepted SORS rights cannot supply Stage D bytes for partial, conflicting, or unsupported Notebook evidence", async () => {
  const {input, bytes} = buildSorsSnapshotExample("retail_trade_volume_sa");
  for (const status of ["partial_correspondence", "conflicting_correspondence", "unsupported_artifact_type"]) {
    let draft = notebookSnapshotView(input);
    if (status === "partial_correspondence") draft.metadata.row_count--;
    if (status === "conflicting_correspondence") draft = notebookSnapshotView(buildSorsSnapshotExample("cpi_annual_index").input);
    if (status === "unsupported_artifact_type") draft = {
      type:"method", title:"Model publication boundary", url:"https://hy-central-europe-analysis.org/models/",
      canonical_ids:["var"], countries:[], periods:[], sources:[], layer:"method", warnings:[], metadata:{state:"blocked"},
    };
    const {binding, artifact} = await assemble(notebookFor(input, draft), bytes);
    assert.equal(artifact.rights.scope, "original_archive");
    assert.equal(binding.correspondence.status, status);
    assert.equal(artifact.disposition, "reference_only");
    assert.deepEqual(artifact.members, []);
  }
});
