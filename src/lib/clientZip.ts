/** ZIP32 STORE archives. Each entry is UTF-8; no compression or runtime dependency. */
export type ZipFile = { name: string; content: string | Uint8Array };

const encoder = new TextEncoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  let crc = n;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function buildZip(files: ZipFile[], generatedAt: string): Uint8Array<ArrayBuffer> {
  if (files.length > 65535) throw new Error("ZIP32 file limit exceeded");
  const date = new Date(generatedAt);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid archive date");
  const year = Math.min(2107, Math.max(1980, date.getUTCFullYear()));
  const dosDate = ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  const dosTime = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (date.getUTCSeconds() >> 1);
  const names = new Set<string>();
  const entries = files.map((file) => {
    if (!file.name || /[\\\u0000-\u001f]/.test(file.name) || file.name.startsWith("/") || file.name.split("/").some((part) => !part || part === ".." || part === ".") || names.has(file.name)) throw new Error("Unsafe or duplicate ZIP filename");
    names.add(file.name);
    const name = encoder.encode(file.name);
    const bytes = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    if (name.length > 65535 || bytes.length >= 0xffffffff) throw new Error("ZIP32 entry limit exceeded");
    return { name, bytes, crc: crc32(bytes) };
  });
  const localSize = entries.reduce((sum, entry) => sum + 30 + entry.name.length + entry.bytes.length, 0);
  const centralSize = entries.reduce((sum, entry) => sum + 46 + entry.name.length, 0);
  if (localSize + centralSize + 22 >= 0xffffffff) throw new Error("ZIP32 archive limit exceeded");
  const output = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(output.buffer);
  const u16 = (offset: number, value: number) => view.setUint16(offset, value, true);
  const u32 = (offset: number, value: number) => view.setUint32(offset, value, true);
  let local = 0, central = localSize;
  for (const entry of entries) {
    u32(local, 0x04034b50); u16(local + 4, 20); u16(local + 6, 0x0800);
    u16(local + 10, dosTime); u16(local + 12, dosDate); u32(local + 14, entry.crc);
    u32(local + 18, entry.bytes.length); u32(local + 22, entry.bytes.length); u16(local + 26, entry.name.length);
    output.set(entry.name, local + 30); output.set(entry.bytes, local + 30 + entry.name.length);
    u32(central, 0x02014b50); u16(central + 4, 20); u16(central + 6, 20); u16(central + 8, 0x0800);
    u16(central + 12, dosTime); u16(central + 14, dosDate); u32(central + 16, entry.crc);
    u32(central + 20, entry.bytes.length); u32(central + 24, entry.bytes.length); u16(central + 28, entry.name.length);
    u32(central + 42, local); output.set(entry.name, central + 46);
    local += 30 + entry.name.length + entry.bytes.length;
    central += 46 + entry.name.length;
  }
  u32(central, 0x06054b50); u16(central + 8, entries.length); u16(central + 10, entries.length);
  u32(central + 12, centralSize); u32(central + 16, localSize);
  return output;
}
