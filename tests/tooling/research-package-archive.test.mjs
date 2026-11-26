import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, file) => module._compile(ts.transpileModule(
  readFileSync(file, "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}},
).outputText, file);
const { buildZip } = require("../../src/lib/clientZip.ts");
const { readStoredArchive, decodeArchiveText, sha256Hex, verifySha256, ArchiveValidationError } =
  require("../../src/lib/researchPackageArchive.ts");

const timestamp = "2026-11-26T10:00:00.000Z";
const utf8 = new TextEncoder();
const make = (names = ["data.csv"]) => buildZip(names.map(name => ({name, content: "fixture"})), timestamp);
const withCode = code => err => err instanceof ArchiveValidationError && err.code === code;

// All malformed examples below are bounded in-memory derivatives of synthetic Atlas archives.
test("reader returns exact owned member bytes, in writer order, including a subview and a UTF-8 BOM", () => {
  const text = "\uFEFFsource,unit\r\nČSÚ,欧元\r\n";
  const envelope = buildZip([{name: "sources.csv", content: text}, {name: "snapshots/obj.zip", content: Uint8Array.of(0, 255)}], timestamp);
  const padded = new Uint8Array(envelope.length + 4);
  padded.set(envelope, 2);
  const entries = readStoredArchive(padded.subarray(2, 2 + envelope.length), {allowedName: name => name === "sources.csv" || name === "snapshots/obj.zip"});
  assert.deepEqual([...entries.keys()], ["sources.csv", "snapshots/obj.zip"]);
  assert.equal(decodeArchiveText(entries.get("sources.csv")), text);
  assert.deepEqual([...entries.get("snapshots/obj.zip")], [0, 255]);
  padded.fill(0);
  assert.deepEqual(entries.get("sources.csv"), utf8.encode(text));
  assert.throws(() => decodeArchiveText(Uint8Array.of(0xff)), withCode("invalid_utf8"));
});

test("reader enforces structural, byte, member, path and format limits before trusting archive contents", () => {
  const a = make(["a", "b"]);
  assert.throws(() => readStoredArchive(a, {maxBytes: 8}), withCode("archive_limit"));
  assert.throws(() => readStoredArchive(a, {maxMemberBytes: 4}), withCode("archive_limit"));
  assert.throws(() => readStoredArchive(a, {maxEntries: 1}), withCode("archive_limit"));
  assert.throws(() => readStoredArchive(a, {maxEntries: Infinity}), withCode("archive_limit"));
  assert.throws(() => readStoredArchive(a, {allowedName: name => name === "a"}), withCode("unexpected_member"));
  assert.throws(() => readStoredArchive(make(["a".repeat(201)])), withCode("archive_limit"));
  assert.throws(() => readStoredArchive(a.subarray(0, 15)), withCode("invalid_archive"));
  assert.throws(() => readStoredArchive(a.subarray(0, -1)), withCode("unsupported_zip"));
  assert.throws(() => readStoredArchive(new Uint8Array([...a, 0])), withCode("unsupported_zip"));
  assert.throws(() => readStoredArchive(make([])), withCode("invalid_archive"));
  for (const names of [["one", "ONE"], ["dir", "dir/a"], ["dir/a", "dir"], ["Case/a", "case/b"], ["aux.txt"], ["dir./file"], ["x:y"]]) {
    assert.throws(() => readStoredArchive(make(names)), withCode("invalid_member"));
  }
});

test("reader validates STORE flags, exact local and central records, sizes, member names and CRC", () => {
  const clean = make(["data.csv"]);
  const original = new DataView(clean.buffer);
  const end = clean.length - 22;
  const central = original.getUint32(end + 16, true);
  function mutated(write) {
    const bytes = clean.slice();
    write(new DataView(bytes.buffer), bytes);
    return bytes;
  }
  const cases = [
    ["unsupported_zip", v => v.setUint16(central + 8, 0x0801, true)],
    ["unsupported_zip", v => v.setUint16(central + 10, 8, true)],
    ["unsupported_zip", v => v.setUint16(end + 4, 1, true)],
    ["unsupported_zip", v => v.setUint16(central + 30, 1, true)],
    ["invalid_archive", v => v.setUint32(central + 42, 1, true)],
    ["invalid_archive", v => v.setUint32(central + 20, 2, true)],
    ["invalid_archive", v => v.setUint32(end + 16, end + 1, true)],
    ["invalid_archive", v => v.setUint16(28, 1, true)],
    ["invalid_archive", v => v.setUint8(30, 0x41)],
    ["invalid_utf8", v => v.setUint8(central + 46, 0xff)],
    ["integrity_mismatch", v => v.setUint8(30 + "data.csv".length, 0x61)],
  ];
  for (const [code, write] of cases) assert.throws(() => readStoredArchive(mutated(write)), withCode(code));
  // Both stored names are replaced to test path policy separately from name consistency.
  for (const unsafe of ["../a.csv", "/abc.csv", "X:/a.csv"]) {
    const name = utf8.encode(unsafe);
    assert.equal(name.length, "data.csv".length);
    assert.throws(() => readStoredArchive(mutated((v, bytes) => {
      bytes.set(name, 30);
      bytes.set(name, central + 46);
    })), withCode("invalid_member"));
  }
});

test("reader rejects repeated names even if the distinct central records each point at their own local record", () => {
  const bytes = make(["one", "two"]);
  const view = new DataView(bytes.buffer);
  const firstCentral = view.getUint32(bytes.length - 22 + 16, true);
  const secondCentral = firstCentral + 46 + 3;
  const secondLocal = view.getUint32(secondCentral + 42, true);
  bytes.set(utf8.encode("one"), secondLocal + 30);
  bytes.set(utf8.encode("one"), secondCentral + 46);
  assert.throws(() => readStoredArchive(bytes), withCode("invalid_member"));
});

test("Web Crypto SHA-256 matches published vectors and Node's independent hash of original archive bytes", async () => {
  assert.equal(await sha256Hex(new Uint8Array()), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(await sha256Hex(utf8.encode("abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const archive = make();
  const digest = createHash("sha256").update(archive).digest("hex");
  assert.equal(await verifySha256(archive, digest), true);
  assert.equal(await verifySha256(archive, digest.toUpperCase()), false);
  assert.equal(await verifySha256(archive, digest + "\n"), false);
  const altered = archive.slice();
  altered[30 + "data.csv".length] ^= 1;
  assert.equal(await verifySha256(altered, digest), false);
  const interior = Uint8Array.of(1, 97, 98, 99, 2).subarray(1, 4);
  assert.equal(await sha256Hex(interior), await sha256Hex(utf8.encode("abc")));
});
