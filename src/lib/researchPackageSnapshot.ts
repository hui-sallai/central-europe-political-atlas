import countries from "@/data/countries/countries.json";
import { atlasItemTarget, externalSourceLink } from "./safeNavigation";
import { buildSnapshot, SNAPSHOT_SCHEMA, toCsv } from "./researchSnapshot";
import { decodeArchiveText, readStoredArchive, sha256Hex } from "./researchPackageArchive";

const requiredFiles = ["README.md", "manifest.json", "data.csv", "sources.csv", "citation.txt", "view-url.txt"];
const baseColumns = ["id", "country", "indicator", "period", "value", "unit", "layer", "status", "source_id", "cross_country_comparable"];
const sourceColumns = ["source_id", "institution", "dataset", "source_url", "source_code", "retrieved_at", "updated_at", "unit", "original_unit", "definition", "reliability", "status", "source_layer"] as const;
const views = new Set(["annual", "high_frequency", "macro_drivers", "serbia_sors", "regional_map", "country_comparison"]);
const countrySlugs = new Set(countries.records.map(country => country.slug));
const sharedAreas = new Set(["global", "euro_area", "europe"]);
const layerAliases: Readonly<Record<string, string>> = {formal: "formal_observation", history: "historical_descriptive", sors: "serbia_sors_descriptive"};
const layers = new Set(["formal_observation", "historical_descriptive", "serbia_sors_descriptive", "published snapshot", "descriptive annual history",
  "published monthly", "descriptive monthly history", "SORS descriptive", "shared published series", "published macro observation",
  "regional_descriptive", "geography_descriptive", "project_location_descriptive"]);
const maxRows = 20_000;
const maxField = 16_384;

export type SnapshotFrequency = "annual" | "monthly" | "quarterly" | "semiannual";
export type InspectedSnapshotSource = Record<typeof sourceColumns[number], string>;
export interface InspectedSnapshotRow {
  id: string; country: string; indicator: string; period: string; value: number | null;
  unit: string; layer: string; status: string; source_id: string; cross_country_comparable: boolean | null;
  frequency: SnapshotFrequency | null; extras: Record<string, string>;
}
export type SnapshotManifest = Omit<ReturnType<typeof buildSnapshot>["manifest"], "sources"> & {sources: InspectedSnapshotSource[]};
export interface InspectedSnapshot {
  sha256: string;
  byteLength: number;
  manifest: SnapshotManifest;
  rows: InspectedSnapshotRow[];
  sources: InspectedSnapshotSource[];
  figure: null | {
    name: "figure.svg" | "map.svg"; byteLength: number; sha256: string; metadata: Record<string, unknown>;
    input_relationship: "unverified"; attachment: "quarantined";
  };
}
type ErrorCode = "unsupported_schema" | "invalid_manifest" | "invalid_inventory" | "invalid_csv" | "invalid_observation" |
  "source_mismatch" | "inconsistent_scope" | "unsafe_content" | "unsupported_figure" | "size_limit";
export class SnapshotValidationError extends Error {
  constructor(readonly code: ErrorCode) { super(code); this.name = "SnapshotValidationError"; }
}
function check(value: unknown, code: ErrorCode): asserts value {
  if (!value) throw new SnapshotValidationError(code);
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function strings(value: unknown, max = maxRows): value is string[] {
  return Array.isArray(value) && value.length <= max && value.every(s => typeof s === "string" && s.length <= maxField);
}
function safeKey(key: string) {
  return key !== "__proto__" && key !== "prototype" && key !== "constructor";
}
const activeMarkup = /<![A-Za-z]|<\/?[A-Za-z][\w:-]*(?:\s[^<>]*|\s*\/?)>|!\[|\b(?:javascript|vbscript|file):|data:\s*(?:text\/html|image\/svg\+xml)|\]\s*\(\s*data:/i;
function safeText(value: string) {
  return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(value) && !activeMarkup.test(value);
}
function sourceDate(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const date = value.slice(0, 10);
  return Number.isFinite(Date.parse(value)) && new Date(date + "T00:00:00Z").toISOString().startsWith(date);
}
function inspectMetadata(value: unknown, depth = 0, budget = {nodes: 0}) {
  check(depth <= 10 && ++budget.nodes <= 150_000, "size_limit");
  if (Array.isArray(value)) {
    check(value.length <= maxRows, "size_limit");
    for (const child of value) inspectMetadata(child, depth + 1, budget);
  } else if (object(value)) {
    for (const [key, child] of Object.entries(value)) {
      check(key.length <= 150 && safeKey(key), "invalid_manifest");
      if (typeof child === "string" && /(?:^|_)(?:url|href)$/.test(key)) check(externalSourceLink(child), "unsafe_content");
      inspectMetadata(child, depth + 1, budget);
    }
  } else if (typeof value === "string") {
    check(value.length <= maxField, "size_limit");
    check(safeText(value), "unsafe_content");
  } else if (typeof value === "number") check(Number.isFinite(value), "invalid_manifest");
}

function parseManifest(bytes: Uint8Array): SnapshotManifest {
  const raw = decodeArchiveText(bytes);
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new SnapshotValidationError("invalid_manifest"); }
  check(object(data) && data.schema === SNAPSHOT_SCHEMA, "unsupported_schema");
  inspectMetadata(data);
  // The v1 writer emits this exact JSON layout. This also rejects ambiguous duplicate object keys.
  check(JSON.stringify(data, null, 2) + "\n" === raw, "invalid_manifest");
  check(data.locale === "en" || data.locale === "zh-CN", "invalid_manifest");
  check(typeof data.title === "string" && data.title.trim() && views.has(String(data.view_type)), "invalid_manifest");
  const generated = data.generated_at;
  check(typeof generated === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(generated) &&
    Number.isFinite(Date.parse(generated)) && new Date(generated).toISOString() === (generated.includes(".") ? generated : generated.replace("Z", ".000Z")), "invalid_manifest");
  check(object(data.filters) && object(data.comparison) && strings(data.countries, 20) && strings(data.indicators, 512), "invalid_manifest");
  check(strings(data.known_limitations, 200) && strings(data.source_attributions, 100) && strings(data.files, 7) &&
    Array.isArray(data.sources) && data.sources.length <= 4000 && Number.isInteger(data.observation_count) && Number(data.observation_count) >= 0 && Number(data.observation_count) <= maxRows, "invalid_manifest");
  check(new Set(data.countries).size === data.countries.length && new Set(data.indicators).size === data.indicators.length &&
    data.indicators.every(i => /^[\w:.-]+$/.test(i)) && data.countries.every(c => countrySlugs.has(c) ||
      (data.view_type === "macro_drivers" && sharedAreas.has(c.replace(/^scope:/, "")))), "inconsistent_scope");
  check(typeof data.comparability_status === "string" && data.comparability_status.length > 0, "invalid_manifest");
  const canonical = atlasItemTarget(data.canonical_url), shared = atlasItemTarget(data.shareable_view_url);
  check(canonical && shared && canonical.pathname === shared.pathname && !canonical.search && !canonical.hash, "unsafe_content");
  check(data.figure === null || object(data.figure), "unsupported_figure");
  for (const source of data.sources) {
    check(object(source) && Object.keys(source).length === sourceColumns.length && sourceColumns.every(k => typeof source[k] === "string"), "source_mismatch");
    check(externalSourceLink(source.source_url), "unsafe_content");
    check(source.institution && source.dataset && source.source_layer &&
      sourceDate(source.retrieved_at as string) && sourceDate(source.updated_at as string), "source_mismatch");
  }
  // Remaining derived fields, inventory, boundary and notices are checked by replaying the v1 writer.
  return data as unknown as SnapshotManifest;
}

// Accept the v1 writer's fully quoted UTF-8 CSV with CRLF records, doubled quotes and embedded line breaks.
function dataCsv(text: string): {headers: string[]; records: string[][]} {
  const cell = /"((?:[^"]|"")*)"/y;
  const rows: string[][] = [];
  let row: string[] = [], pos = 0, fields = 0;
  while (pos < text.length) {
    cell.lastIndex = pos;
    const match = cell.exec(text);
    check(match, "invalid_csv");
    const value = match[1].replaceAll('""', '"');
    check(value.length <= maxField && ++fields <= 400_000 && row.length < 64, "size_limit");
    check(safeText(value), "unsafe_content");
    if (/^\s*[=+@-]|^[\t\r\n]/.test(value)) {
      check(/^[+-]?(\d+([.,]\d+)?|[.,]\d+)([eE][+-]?\d+)?$/.test(value.trim()), "unsafe_content");
    }
    row.push(value);
    pos = cell.lastIndex;
    if (text[pos] === ",") { pos++; continue; }
    check(text.startsWith("\r\n", pos), "invalid_csv");
    check(!rows.length || row.length === rows[0].length, "invalid_csv");
    rows.push(row);
    check(rows.length <= maxRows + 1, "size_limit");
    pos += 2;
    row = [];
  }
  check(rows.length && row.length === 0, "invalid_csv");
  const [headers, ...records] = rows;
  check(new Set(headers).size === headers.length && baseColumns.every((s, i) => headers[i] === s) &&
    headers.every(h => /^[a-z][a-z0-9_]*$/.test(h) && safeKey(h)), "invalid_csv");
  return {headers, records};
}
function periodFrequency(period: string): SnapshotFrequency | null {
  if (!period) return null;
  if (/^\d{4}$/.test(period)) return "annual";
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return "monthly";
  if (/^\d{4}-Q[1-4]$/.test(period)) return "quarterly";
  if (/^\d{4}-[HS][12]$/.test(period)) return "semiannual";
  throw new SnapshotValidationError("invalid_observation");
}
function readRows(text: string, manifest: SnapshotManifest) {
  const {headers, records} = dataCsv(text);
  check(records.length === manifest.observation_count, "inconsistent_scope");
  const sources = new Map(manifest.sources.map(s => [s.source_id, s]));
  const seen = new Set<string>();
  const selectedCountries = new Set(manifest.countries), selectedIndicators = new Set(manifest.indicators);
  return records.map((r): InspectedSnapshotRow => {
    const [id, country, indicator, period, numeric, unit, layer, status, source_id, comparable] = r;
    const extras = Object.fromEntries(headers.slice(baseColumns.length).map((k, i) => [k, r[i + baseColumns.length]]));
    check(id.trim() && !seen.has(id) && status.trim() && layers.has(layer), "invalid_observation");
    seen.add(id);
    const frequency = periodFrequency(period);
    check(["", "true", "false"].includes(comparable), "invalid_observation");
    check(selectedCountries.has(country) || (manifest.view_type === "macro_drivers" && selectedCountries.has("scope:" + country)), "inconsistent_scope");
    check(selectedIndicators.has(indicator) || (manifest.view_type === "regional_map" && indicator === "regional_boundary" && status === "boundary_only"), "inconsistent_scope");
    const value = numeric === "" ? null : Number(numeric);
    check(value === null || (Number.isFinite(value) && String(value) === numeric && unit.trim() && frequency), "invalid_observation");
    check(value === null || !/^(?:pending|missing|unavailable|not_applicable|no_common_comparable_observation|待接入|不适用|缺失)$/i.test(status), "invalid_observation");
    check(value !== null || !/^(?:observed|official|available|published|released|valid|calculated|normal value|正式数据)$/i.test(status), "invalid_observation");
    const source = sources.get(source_id);
    check(source_id ? source : value === null, "source_mismatch");
    for (const [key, field] of Object.entries(extras)) {
      if (field && /(?:^|_)(?:url|href)$/.test(key)) check(externalSourceLink(field), "unsafe_content");
    }
    if (source) {
      check((layerAliases[source.source_layer] ?? source.source_layer) === layer, "source_mismatch");
      check(!source.unit || source.unit === unit, "source_mismatch");
      check(!source.original_unit || !extras.original_unit || source.original_unit === extras.original_unit, "source_mismatch");
      check(!source.definition || !extras.definition || source.definition === extras.definition, "source_mismatch");
    }
    const expectedFrequency = manifest.filters.frequency ?? (
      manifest.view_type === "annual" ? "annual" : ["macro_drivers", "high_frequency"].includes(manifest.view_type) ? "monthly" : null);
    if (expectedFrequency && frequency) check(expectedFrequency === frequency, "inconsistent_scope");
    if (manifest.view_type === "serbia_sors" || /sors/i.test(layer)) check(country === "serbia", "inconsistent_scope");
    if (manifest.comparability_status === "serbia_only_not_cross_country_comparable") check(comparable === "false", "inconsistent_scope");
    if (manifest.view_type === "country_comparison") {
      check(comparable === "true" && !/sors/i.test(layer) && !/sors|stat\.gov\.rs/i.test(source?.source_url ?? ""), "inconsistent_scope");
    }
    return {id, country, indicator, period, value, unit, layer, status, source_id,
      cross_country_comparable: comparable === "" ? null : comparable === "true", frequency, extras};
  });
}

function checkSelection(manifest: SnapshotManifest, rows: InspectedSnapshotRow[]) {
  const {filters, countries: selected, indicators} = manifest;
  if (filters.countries !== undefined) check(JSON.stringify(filters.countries) === JSON.stringify(selected), "inconsistent_scope");
  if (filters.country !== undefined) {
    const pair = filters.compare === undefined ? [filters.country] : [filters.country, filters.compare];
    check(JSON.stringify(pair) === JSON.stringify(selected), "inconsistent_scope");
  }
  if (filters.area !== undefined) check(selected.length === 1 && selected[0] === filters.area, "inconsistent_scope");
  if (filters.driver !== undefined) check(indicators.length === 1 && indicators[0] === filters.driver, "inconsistent_scope");
  if (filters.indicator !== undefined && filters.indicator !== "all") {
    check(typeof filters.indicator === "string", "inconsistent_scope");
    const [category, metric] = filters.indicator.split(":");
    if (category === "sors" && metric) {
      check(rows.every(r => r.id.startsWith("sors:" + metric + ":")), "inconsistent_scope");
    } else {
      const id = metric && ["annual", "monthly", "macro"].includes(category) ? metric : filters.indicator;
      check(indicators.every(i => i === id), "inconsistent_scope");
    }
  }
  if (filters.sors_series !== undefined) {
    check(typeof filters.sors_series === "string" && rows.every(r => r.id.startsWith("sors:" + filters.sors_series + ":")), "inconsistent_scope");
  }
  if (filters.transformation !== undefined) check(rows.every(r => r.extras.transformation === filters.transformation), "inconsistent_scope");
  // Data Explorer applies year controls to the year part of monthly periods. Comparison exports use native period precision.
  for (const key of ["from", "to"] as const) {
    const bound = filters[key];
    if (bound === undefined || bound === "" || bound === "all") continue;
    check(typeof bound === "string" && periodFrequency(bound), "inconsistent_scope");
    check(rows.every(r => {
      if (!r.period) return r.value === null;
      const period = bound.length === 4 ? r.period.slice(0, 4) : r.period;
      return period.length === bound.length && (key === "from" ? period >= bound : period <= bound);
    }), "inconsistent_scope");
  }
  if (manifest.comparison.mode && selected.length > 1 && filters.mode !== undefined) check(filters.mode === manifest.comparison.mode, "inconsistent_scope");
}

function checkFigureMetadata(manifest: SnapshotManifest, name: "figure.svg" | "map.svg") {
  const figure = manifest.figure;
  check(figure && object(figure), "unsupported_figure");
  if (name === "figure.svg") {
    check(figure.selection === "current_filtered_rows" && figure.palette === "neutral_print" && figure.title === manifest.title, "unsupported_figure");
    return;
  }
  check(Array.isArray(figure.geographies) && figure.geographies.length === manifest.countries.length &&
    Array.isArray(figure.legend) && figure.legend.every(item => object(item) && typeof item.label === "string"), "unsupported_figure");
  const declared = new Set(manifest.countries);
  for (const entry of figure.geographies) {
    check(object(entry) && typeof entry.country === "string" && declared.delete(entry.country) &&
      typeof entry.classification === "string" && typeof entry.level === "string", "unsupported_figure");
  }
  for (const key of ["layer", "year", "classification"] as const) {
    if (key in figure) check(figure[key] === manifest.filters[key], "inconsistent_scope");
  }
  if ("thresholds" in figure) check(Array.isArray(figure.thresholds) && figure.thresholds.every(n => typeof n === "number" && Number.isFinite(n)) &&
    JSON.stringify(figure.thresholds) === JSON.stringify(manifest.comparison.thresholds), "inconsistent_scope");
}

function checkCommonPeriods(manifest: SnapshotManifest, rows: InspectedSnapshotRow[]) {
  if (manifest.comparison.mode === "side_by_side") {
    check(manifest.view_type !== "country_comparison" && manifest.comparability_status === "side_by_side_no_harmonization", "inconsistent_scope");
    return;
  }
  if (manifest.comparison.mode !== "harmonized") return;
  const periods = manifest.comparison.actual_common_periods;
  check(manifest.view_type === "country_comparison" && strings(periods) && manifest.countries.length >= 2, "inconsistent_scope");
  const eligible = new Set(periods);
  check(eligible.size === periods.length && periods.every(p => !!periodFrequency(p)), "inconsistent_scope");
  const seenPeriods = new Set<string>();
  const groups = new Map<string, {countries: Set<string>; unit: string; frame: string}>();
  for (const row of rows) {
    check(row.value !== null && row.extras.comparison_frame && eligible.has(row.period), "inconsistent_scope");
    seenPeriods.add(row.period);
    if (manifest.filters.view === "bar") check(row.period === manifest.comparison.reference_period, "inconsistent_scope");
    const key = JSON.stringify([row.indicator, row.period]);
    const group = groups.get(key) ?? {countries: new Set<string>(), unit: row.unit, frame: row.extras.comparison_frame};
    check(!group.countries.has(row.country) && group.unit === row.unit && group.frame === row.extras.comparison_frame, "inconsistent_scope");
    group.countries.add(row.country);
    groups.set(key, group);
  }
  if (manifest.filters.view !== "bar") check(seenPeriods.size === eligible.size, "inconsistent_scope");
  for (const group of groups.values()) check(group.countries.size === manifest.countries.length, "inconsistent_scope");
}

const tags = new Set(["svg","defs","pattern","path","rect","line","circle","g","text","title","desc","polyline","polygon"]);
const attributes = new Set(("xmlns width height viewBox x y x1 y1 x2 y2 cx cy r rx ry d points fill stroke stroke-width stroke-linejoin " +
  "stroke-linecap stroke-dasharray opacity font-family font-size font-weight text-anchor paint-order id role lang style patternUnits patternTransform").split(" "));
const maxStrokeStyleLength = 1024;
const maxStrokeDeclarations = 16;

function checkStrokeStyle(style: string) {
  check(style.length <= maxStrokeStyleLength, "size_limit");
  let cursor = 0;
  function skipWhitespace() {
    const start = cursor;
    while (cursor < style.length && /[ \t\r\n]/.test(style[cursor])) cursor++;
    return cursor > start;
  }
  function readDigits() {
    const start = cursor;
    while (cursor < style.length && style[cursor] >= "0" && style[cursor] <= "9") cursor++;
    return cursor > start;
  }
  function readNumber() {
    const integer = readDigits();
    if (style[cursor] !== ".") return integer;
    cursor++;
    return readDigits();
  }

  // The cursor only advances. Chart legends use unitless widths and comma/space-separated dash lengths.
  skipWhitespace();
  check(cursor < style.length, "unsupported_figure");
  let declarations = 0;
  while (cursor < style.length) {
    check(++declarations <= maxStrokeDeclarations, "size_limit");
    const dashList = style.startsWith("stroke-dasharray:", cursor);
    const property = dashList ? "stroke-dasharray:" : "stroke-width:";
    check(dashList || style.startsWith(property, cursor), "unsupported_figure");
    cursor += property.length;
    skipWhitespace();
    check(readNumber(), "unsupported_figure");
    for (;;) {
      const hasSpace = skipWhitespace();
      if (cursor === style.length || style[cursor] === ";") break;
      check(dashList, "unsupported_figure");
      if (style[cursor] === ",") {
        cursor++;
        skipWhitespace();
      } else {
        check(hasSpace, "unsupported_figure");
      }
      check(readNumber(), "unsupported_figure");
    }
    if (cursor === style.length) break;
    cursor++; // declaration separator, with an optional trailing semicolon
    skipWhitespace();
  }
}

function inspectSvg(text: string) {
  const xml = '<?xml version="1.0" encoding="UTF-8"?>';
  let pos = text.startsWith(xml) ? xml.length : 0, count = 0, root = false;
  const stack: string[] = [];
  const token = /<\/?([a-zA-Z]+)((?:\s+[\w-]+="[^"<>]*")*)\s*(\/?)>/y;
  const attr = /\s+([\w-]+)="([^"<>]*)"/g;
  while (pos < text.length) {
    const next = text.indexOf("<", pos);
    const plain = text.slice(pos, next < 0 ? undefined : next);
    check((stack.length || !plain.trim()) && !/&(?!(?:amp|lt|gt|quot|apos);)/.test(plain), "unsupported_figure");
    if (next < 0) break;
    token.lastIndex = next;
    const m = token.exec(text);
    check(m && tags.has(m[1]) && ++count <= 60_000, "unsupported_figure");
    const [raw, tag, body, selfClosing] = m;
    if (raw.startsWith("</")) {
      check(!body && !selfClosing && stack.pop() === tag, "unsupported_figure");
    } else {
      if (!stack.length) {
        check(!root && tag === "svg", "unsupported_figure");
        root = true;
      }
      const keys = new Set<string>();
      for (const [,k,v] of body.matchAll(attr)) {
        check(!keys.has(k) && (attributes.has(k) || /^(?:aria|data)-[a-z0-9-]+$/.test(k)), "unsupported_figure");
        keys.add(k);
        if (k === "xmlns") check(v === "http://www.w3.org/2000/svg", "unsupported_figure");
        else if (k === "style") checkStrokeStyle(v);
        else if (k === "stroke" || k === "fill") check(/^(?:#[\da-fA-F]{3,8}|[a-zA-Z]+|url\(#[\w.:-]+\))$/.test(v), "unsupported_figure");
        else if (!/^(?:aria|data)-/.test(k)) check(!/[\\&]/.test(v) && !/(?:url\s*\(|\w:\/\/|javascript:|data:)/i.test(v), "unsupported_figure");
      }
      if (!stack.length) check(keys.has("xmlns"), "unsupported_figure");
      if (!selfClosing) stack.push(tag);
      check(stack.length <= 48, "unsupported_figure");
    }
    pos = token.lastIndex;
  }
  check(root && !stack.length, "unsupported_figure");
}

/** Inspect the supported v1 byte profile locally. Figure bytes are digested and quarantined, never rendered or returned. */
export async function inspectSnapshot(input: Uint8Array): Promise<InspectedSnapshot> {
  check(input instanceof Uint8Array && input.byteLength <= 16 * 1024 * 1024, "size_limit");
  const bytes = Uint8Array.from(input);
  const files = readStoredArchive(bytes, {maxEntries: 7, allowedName: name => requiredFiles.includes(name) || name === "map.svg" || name === "figure.svg"});
  check(requiredFiles.every(k => files.has(k)) && files.size <= requiredFiles.length + 1, "invalid_inventory");
  const manifest = parseManifest(files.get("manifest.json")!);
  const name = files.has("map.svg") ? "map.svg" : files.has("figure.svg") ? "figure.svg" : null;
  check(Boolean(name) === (manifest.figure !== null) && (!name || (name === "map.svg") === (manifest.view_type === "regional_map")), "invalid_inventory");
  check(JSON.stringify([...files.keys()]) === JSON.stringify(manifest.files), "invalid_inventory");
  const memberText = (key: string) => decodeArchiveText(files.get(key)!);
  const sourceCsv = memberText("sources.csv");
  check(sourceCsv === toCsv([...sourceColumns], manifest.sources), "source_mismatch");
  const dataText = memberText("data.csv");
  const rows = readRows(dataText, manifest);
  checkSelection(manifest, rows);
  checkCommonPeriods(manifest, rows);
  const byId = new Map(manifest.sources.map(s => [s.source_id, s]));
  const rebuilt = buildSnapshot({
    title: manifest.title, locale: manifest.locale, view_type: manifest.view_type, filters: manifest.filters, comparison: manifest.comparison,
    page_path: manifest.canonical_url, shareable_view_url: manifest.shareable_view_url, countries: manifest.countries,
    indicators: manifest.indicators, comparability_status: manifest.comparability_status, limitations: manifest.known_limitations,
    rows: rows.map(r => ({...r.extras, id:r.id, country:r.country, indicator:r.indicator, period:r.period, value:r.value, unit:r.unit,
      layer:r.layer, status:r.status, cross_country_comparable:r.cross_country_comparable ?? undefined, source:byId.get(r.source_id)})),
    ...(name && manifest.figure ? {figure:{name, svg:"", metadata:manifest.figure}} : {}),
  }, manifest.generated_at);
  check(dataText === rebuilt.files.find(f => f.name === "data.csv")?.content, "invalid_csv");
  check(JSON.stringify(rebuilt.manifest) === JSON.stringify(manifest), "invalid_manifest");
  for (const key of ["README.md","view-url.txt","citation.txt"]) {
    const text = memberText(key);
    check(text === rebuilt.files.find(f => f.name === key)?.content, "invalid_manifest");
    check(!activeMarkup.test(text), "unsafe_content");
  }
  let figure: InspectedSnapshot["figure"] = null;
  if (name && manifest.figure) {
    checkFigureMetadata(manifest, name);
    const raw = files.get(name)!;
    inspectSvg(decodeArchiveText(raw));
    figure = {name, byteLength:raw.byteLength, sha256:await sha256Hex(raw), metadata:manifest.figure,
      input_relationship:"unverified", attachment:"quarantined"};
  }
  return {sha256:await sha256Hex(bytes), byteLength:bytes.byteLength, manifest, rows, sources:manifest.sources, figure};
}
