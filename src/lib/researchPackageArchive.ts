import { crc32 } from "./clientZip";

/** Local Research Package ingestion supports the UTF-8, single-disk layout produced by buildZip. */
type ArchiveErrorCode = "archive_limit" | "invalid_archive" | "unsupported_zip" | "invalid_member" |
  "unexpected_member" | "invalid_utf8" | "integrity_mismatch" | "crypto_unavailable";

export class ArchiveValidationError extends Error {
  constructor(readonly code: ArchiveErrorCode, message: string) {
    super(message);
    this.name = "ArchiveValidationError";
  }
}

export type ArchiveLimits = {
  maxBytes?: number;
  maxEntries?: number;
  maxMemberBytes?: number;
  allowedName?: (name: string) => boolean;
};

const mib = 1024 * 1024;
const maxArchiveBytes = 64 * mib;
// Keep any BOM as a character. The CSV decoder can consume a leading BOM explicitly.
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function fail(code: ArchiveErrorCode, message: string): never {
  throw new ArchiveValidationError(code, message);
}

function limit(requested: number | undefined, usual: number, maximum: number) {
  const value = requested ?? usual;
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) fail("archive_limit", "Invalid archive inspection limit.");
  return value;
}

export function decodeArchiveText(bytes: Uint8Array): string {
  try {
    return utf8.decode(bytes);
  } catch {
    return fail("invalid_utf8", "Archive text must be valid UTF-8.");
  }
}

function registerPath(name: string, paths: Map<string, string>) {
  const parts = name.split("/");
  let prefix = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part) || part.endsWith(".") ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) {
      fail("invalid_member", "Unsafe or unsupported archive path.");
    }
    prefix = prefix ? prefix + "/" + part : part;
    const key = prefix.toLowerCase();
    const isDirectory = i < parts.length - 1;
    const expected = isDirectory ? prefix + "/" : prefix;
    const existing = paths.get(key);
    if (existing !== undefined && (!isDirectory || existing !== expected)) {
      fail("invalid_member", "Duplicate or conflicting archive path.");
    }
    paths.set(key, expected);
  }
}

/**
 * Parse only contiguous local records followed by their matching central records in the same order.
 * Stored sizes bound all reads; no inflater, filesystem extraction or imported markup execution.
 * All returned byte arrays are independent copies. Use allowedName to constrain the application format.
 */
export function readStoredArchive(input: Uint8Array, limits: ArchiveLimits = {}): Map<string, Uint8Array<ArrayBuffer>> {
  const maxBytes = limit(limits.maxBytes, 16 * mib, maxArchiveBytes);
  const maxEntries = limit(limits.maxEntries, 32, 128);
  const maxMemberBytes = limit(limits.maxMemberBytes, 8 * mib, 32 * mib);
  if (!(input instanceof Uint8Array) || !(input.buffer instanceof ArrayBuffer)) fail("invalid_archive", "Expected ordinary archive bytes.");
  if (input.byteLength > maxBytes) fail("archive_limit", "Archive exceeds the byte limit.");
  if (input.byteLength < 22) fail("invalid_archive", "Incomplete ZIP end record.");

  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, true);
  const u32 = (offset: number) => view.getUint32(offset, true);
  const end = input.length - 22;
  if (u32(end) !== 0x06054b50 || u16(end + 4) || u16(end + 6) || u16(end + 20)) {
    fail("unsupported_zip", "Expected a single-disk ZIP32 end record without a comment.");
  }
  const count = u16(end + 10);
  if (count > maxEntries) fail("archive_limit", "Archive exceeds the member count limit.");
  if (!count || count !== u16(end + 8)) fail("invalid_archive", "Inconsistent archive member count.");
  const directory = u32(end + 16);
  if (directory + u32(end + 12) !== end) fail("invalid_archive", "Inconsistent central directory extent.");

  const files = new Map<string, Uint8Array<ArrayBuffer>>();
  const paths = new Map<string, string>();
  let local = 0, central = directory;
  for (let i = 0; i < count; i++) {
    if (central + 46 > end || u32(central) !== 0x02014b50) fail("invalid_archive", "Invalid central directory record.");
    if (u16(central + 4) !== 20 || u16(central + 6) !== 20 || u16(central + 8) !== 0x0800 || u16(central + 10) !== 0 ||
        u16(central + 30) || u16(central + 32) || u16(central + 34) || u16(central + 36) || u32(central + 38)) {
      fail("unsupported_zip", "Only unencrypted UTF-8 STORE entries without extra fields or attributes are supported.");
    }
    const size = u32(central + 24);
    const nameLength = u16(central + 28);
    if (size > maxMemberBytes || nameLength > 200) fail("archive_limit", "Archive member exceeds its inspection limit.");
    if (u32(central + 20) !== size || central + 46 + nameLength > end || u32(central + 42) !== local) {
      fail("invalid_archive", "Archive sizes or offsets disagree.");
    }
    const name = decodeArchiveText(input.subarray(central + 46, central + 46 + nameLength));
    registerPath(name, paths);
    if (limits.allowedName && !limits.allowedName(name)) fail("unexpected_member", "Unexpected archive member.");

    const start = local + 30 + nameLength;
    if (start + size > directory || u32(local) !== 0x04034b50) fail("invalid_archive", "Invalid local member extent.");
    if (u16(local + 4) !== u16(central + 6) || u16(local + 6) !== u16(central + 8) || u16(local + 8) !== u16(central + 10) ||
        u32(local + 10) !== u32(central + 12) || u32(local + 14) !== u32(central + 16) || u32(local + 18) !== size ||
        u32(local + 22) !== size || u16(local + 26) !== nameLength || u16(local + 28) !== 0) {
      fail("invalid_archive", "Local and central member headers disagree.");
    }
    const localName = input.subarray(local + 30, start);
    if (!localName.every((byte, index) => byte === input[central + 46 + index])) fail("invalid_archive", "Archive member names disagree.");
    const content = new Uint8Array(input.subarray(start, start + size));
    if (crc32(content) !== u32(central + 16)) fail("integrity_mismatch", "Archive member CRC differs from its recorded value.");
    files.set(name, content);
    local = start + size;
    central += 46 + nameLength;
  }
  if (local !== directory || central !== end) fail("invalid_archive", "Unexpected bytes outside archive members.");
  return files;
}

/** Lowercase hexadecimal SHA-256 over exactly the supplied bytes, including any BOM or line endings. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!(bytes instanceof Uint8Array) || !(bytes.buffer instanceof ArrayBuffer)) fail("invalid_archive", "Expected ordinary artifact bytes.");
  if (bytes.byteLength > maxArchiveBytes) fail("archive_limit", "Artifact exceeds the digest byte limit.");
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) fail("crypto_unavailable", "Web Crypto is required for artifact verification.");
  const digest = await subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifySha256(bytes: Uint8Array, expected: string): Promise<boolean> {
  return typeof expected === "string" && expected.length === 64 && /^[a-f0-9]{64}$/.test(expected) && (await sha256Hex(bytes)) === expected;
}
