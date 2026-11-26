import { atlasItemTarget, externalSourceLink } from "./safeNavigation";

export type CitationRecord = {
  id: string;
  kind: "source" | "view";
  title: string;
  url: string | null;
  institution?: string;
  retrieved_at?: string;
  updated_at?: string;
};

// BibTeX compares keys without case. Keep readable lower-case IDs; encode every other
// UTF-16 code unit, including underscores and lone surrogates in imported JSON.
// A dot can only be a component separator. The encoding also works for empty namespaces.
function encodeKeyPart(value: string): string {
  return value.replace(/[^a-z0-9-]/g, ch => "_" + ch.charCodeAt(0).toString(16).padStart(4, "0"));
}

export function citationKey(kind: CitationRecord["kind"], rawId: string, namespace = ""): string {
  return `atlas-${kind}.${encodeKeyPart(namespace)}.${encodeKeyPart(rawId)}`;
}

// Use the date as written (including its precision), never a viewer's local timezone.
export function citationAccessDate(raw?: string): number[] | undefined {
  if (!raw) return undefined;
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?)?)?$/.exec(raw);
  if (!match || match[0] !== raw) return undefined;
  const year = Number(match[1]);
  if (year === 0) return undefined;
  if (!match[2]) return [year];
  const month = Number(match[2]);
  if (month < 1 || month > 12) return undefined;
  if (!match[3]) return [year, month];
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day > 0 && day <= daysInMonth[month - 1] ? [year, month, day] : undefined;
}

function safeCitationUrl(record: CitationRecord): string | undefined {
  if (record.kind === "view" && !atlasItemTarget(record.url)) return undefined;
  return externalSourceLink(record.url)?.href;
}

function citationNote(record: CitationRecord): string {
  const notes = [];
  if (record.kind === "view") notes.push("Live Atlas research view.");
  if (record.institution) notes.push("Recorded institution: " + record.institution);
  if (record.updated_at) notes.push("Recorded source update: " + record.updated_at);
  return notes.join("\n");
}

function validateKeys(records: readonly CitationRecord[]) {
  const seen = new Set<string>();
  for (const record of records) {
    if (!/^[a-z0-9][a-z0-9_.-]*$/.test(record.id) || seen.has(record.id)) {
      throw new Error("Invalid or duplicate citation identifier");
    }
    seen.add(record.id);
  }
}

// Braces must balance for a BibTeX parser even when a brace is preceded by a TeX
// backslash. Fixed text macros contain no imported commands or unpaired braces.
const texEscapes: Record<string, string> = {
  "\\": "\\textbackslash{}", "{": "\\textbraceleft{}", "}": "\\textbraceright{}",
  "^": "\\textasciicircum{}", "~": "\\textasciitilde{}", "<": "\\textless{}", ">": "\\textgreater{}",
  "$": "\\$", "&": "\\&", "#": "\\#", "%": "\\%", "_": "\\_",
};
function bibText(value: string): string {
  const pieces: string[] = [];
  const openBraces: number[] = [];
  for (const ch of value) {
    if (ch === "{") openBraces.push(pieces.length);
    if (ch === "}" && openBraces.length) {
      // Ordinary TeX escapes round-trip through bibliography readers. Use them
      // for matched pairs only, so even a reader that counts escaped braces can parse the field.
      pieces[openBraces.pop()!] = "\\{";
      pieces.push("\\}");
    } else {
      pieces.push(texEscapes[ch] ?? (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(ch) ? " " : ch));
    }
  }
  return pieces.join("");
}

export function serializeCitationBibTeX(records: readonly CitationRecord[]): string {
  validateKeys(records);
  return records.map(record => {
    const fields: string[] = [];
    if (record.title) fields.push(`  title = {{${bibText(record.title)}}}`);
    const url = safeCitationUrl(record);
    // url is a verbatim field. Keep URI query separators, fragments and valid percent
    // escapes; percent-encode literal brace, backslash and caret delimiters.
    if (url) fields.push(`  url = {${url.replace(/[{}\\^]/g, ch => "%" + ch.charCodeAt(0).toString(16).toUpperCase())}}`);
    const access = citationAccessDate(record.retrieved_at);
    if (access) fields.push(`  urldate = {${access.map((n, i) => String(n).padStart(i === 0 ? 4 : 2, "0")).join("-")}}`);
    const note = citationNote(record);
    if (note) fields.push(`  note = {${bibText(note)}}`);
    return `@misc{${record.id},\n${fields.join(",\n")}\n}\n`;
  }).join("\n");
}

export function serializeCitationCsl(records: readonly CitationRecord[]): string {
  validateKeys(records);
  const items = records.map(record => {
    const accessed = citationAccessDate(record.retrieved_at);
    const url = safeCitationUrl(record);
    const note = citationNote(record);
    return {
      id: record.id,
      type: record.kind === "source" ? "document" : "webpage",
      ...(record.title ? {title: record.title} : {}),
      ...(url ? {URL: url} : {}),
      ...(accessed ? {accessed: {"date-parts": [accessed]}} : {}),
      ...(note ? {note} : {}),
    };
  });
  return JSON.stringify(items, null, 2) + "\n";
}
