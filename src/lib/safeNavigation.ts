// Explicit navigation boundary for hrefs built from stored or DOM-provided values (Research Notebook, country compare).
// Every function parses once, re-checks the validation rules and returns a freshly constructed href, or null so the
// caller renders no link. It never passes an input string through unchanged.
import { safeNotebookUrl } from "./researchNotebook";

const ATLAS_ORIGIN = "https://hy-central-europe-analysis.org";
// C0/C1 control characters, including CR/LF and tab (WHATWG URL parsing silently strips some of them).
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

/** Rel value for external source links: no Referer, so the notebook page URL is not sent to third-party sites. */
export const EXTERNAL_SOURCE_REL = "noreferrer";

function parsedHttps(value: unknown, atlas: boolean): URL | null {
  if (typeof value !== "string" || value !== value.trim() || CONTROL.test(value) || !safeNotebookUrl(value, atlas)) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  return url;
}

/**
 * Atlas evidence URL → parts of a same-origin relative href (pathname, search, hash), or null.
 * Requires the existing safeNotebookUrl(value, true) rules: https, exact Atlas origin, allowed Atlas path, no
 * credentials and no secret-like query keys. Also rejects control characters, protocol-relative paths and
 * undecodable percent-encoding in the path.
 */
export function atlasItemTarget(value: unknown): { pathname: string; search: string; hash: string } | null {
  const url = parsedHttps(value, true);
  if (!url || url.origin !== ATLAS_ORIGIN) return null;
  const { pathname, search, hash } = url;
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("\\")) return null;
  try { decodeURIComponent(pathname); } catch { return null; }
  return { pathname, search, hash };
}

/** External source URL → canonical https href plus its hostname (shown to the reader), or null. */
export function externalSourceLink(value: unknown): { href: string; host: string } | null {
  const url = parsedHttps(value, false);
  if (!url || !url.hostname) return null;
  return { href: url.href, host: url.hostname };
}

/** Country slug → profile path only when the value is exactly one of the allowed slugs; otherwise null. */
export function allowedSlug(value: unknown, allowed: readonly string[]): string | null {
  return typeof value === "string" && allowed.includes(value) ? value : null;
}

export function countryProfileHref(value: unknown, allowed: readonly string[]): string | null {
  const slug = allowedSlug(value, allowed);
  return slug ? `/countries/${encodeURIComponent(slug)}` : null;
}
