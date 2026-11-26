import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, file) => module._compile(ts.transpileModule(
  readFileSync(file, "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}},
).outputText, file);
const {citationKey, citationAccessDate, serializeCitationCsl, serializeCitationBibTeX} =
  require("../../src/lib/notebookCitationFormats.ts");

// Imported-looking metadata in this file is synthetic. No TeX engine is invoked.
const fixture = {
  id: citationKey("source", "Központi/中文", "notebook-1"), kind: "source",
  title: "Magyar cím 中欧 {A & B} 50% O_{2} \\name + $ # ^ ~",
  institution: "Intézmény & 考证组", url: "https://example.org/file?a=1&b=%3A_w#{ref}",
  retrieved_at: "2024-02-29T23:59:59-05:00", updated_at: "2025-10-11",
};
test("citation keys keep source/view, local IDs and notebook namespaces disjoint after case-folding", () => {
  const variants = ["A", "a", "é", "e\u0301", "?", "_003f", ".", "_", "!", " ", "内", "\ud800", "\ud801", "\ufffd",
    "a".repeat(99) + "1", "a".repeat(99) + "2", "部分-123"];
  const keys = ["source", "view"].flatMap(kind => ["a", "A", "."].flatMap(ns =>
    variants.map(id => citationKey(kind, id, ns))));
  assert.equal(new Set(keys.map(key => key.toLowerCase())).size, keys.length);
  for (const key of keys) assert.match(key, /^[a-z0-9_.-]+$/);
  assert.notEqual(citationKey("source", "a.b", "c"), citationKey("source", "b", "c.a"));
  assert.equal(citationKey("source", "官方文书"), citationKey("source", "官方文书"));
});
test("access dates preserve precision and the written calendar day, rejecting incomplete or invalid matches", () => {
  const cases = [
    ["2024", [2024]], ["2025-04", [2025, 4]], ["2000-02-29", [2000, 2, 29]],
    ["0002-02-28", [2, 2, 28]], ["2024-02-29T23:59:59.123-05:00", [2024, 2, 29]],
    ["2025-01-01T00:01:00+02:00", [2025, 1, 1]],
  ];
  for (const [input, expected] of cases) assert.deepEqual(citationAccessDate(input), expected);
  for (const input of [undefined, "0000", "1900-02-29", "2025-02-29", "2024-04-31", "2024-00", "2024-13",
    "2024-12-00", "2024-12-31 extra", "2024-02-29Tn/a", "2025-10-11T24:15:00Z", "2024-01-01T00:00:00+24:00",
    "retrieved in 2022", "2020-10-11\n", "2020-01-01T10:00:00.000", "", "2024/06/01"]) {
    assert.equal(citationAccessDate(input), undefined, String(input));
  }
});
test("only source retrieval establishes a citation date, with no assigned institution role", () => {
  const view = {id:citationKey("view", "Központi/中文", "notebook-1"), kind:"view", title:"Case",
    url:"https://hy-central-europe-analysis.org/en/politics/germany/?election=x"};
  const items = JSON.parse(serializeCitationCsl([fixture, view]));
  assert.deepEqual(items[0], {id:fixture.id, type:"document", title:fixture.title, URL:fixture.url,
    accessed:{"date-parts":[[2024,2,29]]}, note:"Recorded institution: " + fixture.institution + "\nRecorded source update: 2025-10-11"});
  assert.deepEqual(items[1], {id:view.id,type:"webpage",title:"Case",URL:view.url,note:"Live Atlas research view."});
  const bib = serializeCitationBibTeX([fixture, view]);
  assert.match(bib, /urldate = \{2024-02-29\}/);
  assert.equal(bib.includes("Intézmény \\& 考证组"), true);
  assert.doesNotMatch(bib, /^\s*(?:year|author|publisher|doi|edition)\s*=/mi);
  assert.deepEqual(JSON.parse(serializeCitationCsl([{...fixture, retrieved_at:"unknown"}]))[0].accessed, undefined);
  assert.deepEqual(JSON.parse(serializeCitationCsl([{...fixture, retrieved_at:undefined}]))[0].issued, undefined);
});
test("BibTeX text and verbatim URLs handle syntax metacharacters separately", () => {
  assert.ok(serializeCitationBibTeX([{...fixture, title:"{a{b}c}"}]).includes("\\{a\\{b\\}c\\}"));
  const title = "A lone } 中文 { Ő \\marker^^ & % # _ $ ~\n     B";
  const url = "https://example.org/p?q=1_{a}^x\\y%20&hi=X#p_z";
  const bib = serializeCitationBibTeX([{...fixture, title, url}]);
  assert.ok(bib.includes("\\textbackslash{}marker\\textasciicircum{}\\textasciicircum{}"));
  assert.ok(bib.includes("A lone \\textbraceright{} 中文 \\textbraceleft{} Ő"));
  assert.ok(bib.includes("\\& \\% \\# \\_ \\$ \\textasciitilde{}"));
  assert.ok(bib.includes("url = {https://example.org/p?q=1_%7Ba%7D%5Ex%5Cy%20&hi=X#p_z}"));
  assert.doesNotMatch(bib, /\\marker|\^\^/);
  for (const title of ["only {", "only }", "}{", "margin\\", "\u0000line\u0005\r\n"]) {
    const text = serializeCitationBibTeX([{...fixture, title}]);
    let depth = 0;
    for (const ch of text) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      assert.ok(depth >= 0);
    }
    assert.equal(depth, 0);
  }
});
test("null, unsafe and non-Atlas view targets never become citation links", () => {
  for (const [kind, url] of [["source", null], ["source", "data:text/plain,test"], ["source", "https://example.org/?token=omit"],
    ["source", "https://reader@example.org/"], ["source", "https://example.org/a\nb"],
    ["view", "https://example.org/map/"], ["view", "https://hy-central-europe-analysis.org/admin/"]]) {
    const record = {...fixture, kind, url};
    assert.ok(!("URL" in JSON.parse(serializeCitationCsl([record]))[0]));
    assert.doesNotMatch(serializeCitationBibTeX([record]), /\n  url = /);
  }
});
test("both serializers reject duplicate or structurally invalid keys", () => {
  for (const serialize of [serializeCitationCsl, serializeCitationBibTeX]) {
    assert.throws(() => serialize([fixture, fixture]), /citation identifier/);
    for (const id of ["", "source,a", "source\ninvalid", "A.B", "x}"]) {
      assert.throws(() => serialize([{...fixture, id}]), /citation identifier/);
    }
  }
});
