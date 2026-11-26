import type { Locale } from "@/i18n/config";
import type { NotebookProject } from "./notebookProjects";
import { buildEvidenceBrief, serializeBriefHtml, serializeEvidenceBrief, validateSelection, type BriefTemplate } from "./notebookBrief";
import { buildReportCitationBundle } from "./notebookCitations";
import { buildZip } from "./clientZip";
import { decodeArchiveText, readStoredArchive, sha256Hex } from "./researchPackageArchive";
import { inspectSnapshot } from "./researchPackageSnapshot";
import { compareSnapshotEvidence } from "./researchPackageBinding";
import { assessSnapshotRights } from "./researchPackageRights";

export const PACKAGE_SCHEMA = "atlas-research-package-v1";
export const BINDING_SCHEMA = "atlas-evidence-artifact-binding-v1";
const MiB = 1024 * 1024;
const limits = { maxBytes: 48 * MiB, maxEntries: 64, maxMemberBytes: 16 * MiB };
const encoder = new TextEncoder();
const pretty = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const rootFiles = ["README.md", "report.md", "report.html", "report_manifest.json", "citations.bib", "citations.csl.json"];
const digestPattern = /^[0-9a-f]{64}$/;

type PackageErrorCode = "invalid_project" | "selection_changed" | "invalid_attachment" | "digest_mismatch" | "package_limit" | "invalid_package";
export class ResearchPackageError extends Error {
  constructor(readonly code: PackageErrorCode, message: string) {
    super(message);
    this.name = "ResearchPackageError";
  }
}
function fail(code: PackageErrorCode, message: string): never { throw new ResearchPackageError(code, message); }

function evidenceState(project: NotebookProject, evidenceId: string) {
  if (!project || typeof project.id !== "string" || !/^[A-Za-z0-9-]{1,100}$/.test(project.id)) fail("invalid_project", "Invalid project identity.");
  const [item] = validateSelection(project.notebook, [evidenceId]);
  const sources = project.notebook.sources.filter(source => item.source_ids.includes(source.id));
  return JSON.stringify([project.id, project.notebook.notebook_id, item, sources]);
}

async function inspectForEvidence(project: NotebookProject, evidenceId: string, input: Uint8Array, expectedSha256?: string) {
  const state = evidenceState(project, evidenceId);
  if (!(input instanceof Uint8Array) || !(input.buffer instanceof ArrayBuffer) || input.byteLength > 16 * MiB) fail("package_limit", "Unsupported snapshot buffer or size.");
  // Keep the exact bytes seen by inspection even if the file picker or caller reuses its buffer.
  const bytes = new Uint8Array(input);
  const localProject = structuredClone(project);
  const snapshot = await inspectSnapshot(bytes);
  if (expectedSha256 !== undefined && snapshot.sha256 !== expectedSha256) fail("digest_mismatch", "Snapshot differs from the supplied SHA-256.");
  const members = readStoredArchive(bytes);
  const rights = await assessSnapshotRights(snapshot, members, bytes);
  const match = compareSnapshotEvidence(localProject.notebook, evidenceId, snapshot);
  return {state, bytes, snapshot, rights, match, evidenceId, expectedSha256};
}

type Checked = Awaited<ReturnType<typeof inspectForEvidence>>;
type Rights = Checked["rights"];
export type SnapshotAttachment = Readonly<{
  evidence_id: string; sha256: string; byte_length: number; correspondence: Checked["match"]; rights: Rights;
  figure: Checked["snapshot"]["figure"];
}>;
const checkedAttachments = new WeakMap<SnapshotAttachment, Checked>();

/** Transient review handle. Neither mutable display fields nor caller-provided rights claims authorize an attachment. */
export async function prepareSnapshotAttachment(project: NotebookProject, evidenceId: string, bytes: Uint8Array, expectedSha256?: string): Promise<SnapshotAttachment> {
  const checked = await inspectForEvidence(project, evidenceId, bytes, expectedSha256);
  const handle = Object.freeze(structuredClone({
    evidence_id: evidenceId, sha256: checked.snapshot.sha256, byte_length: checked.bytes.byteLength,
    correspondence: checked.match, rights: checked.rights, figure: checked.snapshot.figure,
  }));
  checkedAttachments.set(handle, checked);
  return handle;
}

export type ResearchPackageRequest = {
  project: NotebookProject; selectedIds: string[]; locale: Locale; template: BriefTemplate; reportTime: string;
  attachments?: readonly SnapshotAttachment[];
};
type FileDigest = {path: string; byte_length: number; sha256: string};

function fileDigest(path: string, bytes: Uint8Array): Promise<FileDigest> {
  return sha256Hex(bytes).then(sha256 => ({path, byte_length: bytes.byteLength, sha256}));
}

function attachmentOrder(request: ResearchPackageRequest, handles: readonly SnapshotAttachment[]): Checked[] {
  if (handles.length > 16) fail("package_limit", "At most 16 evidence bindings per package.");
  const pairs = new Set<string>();
  let inputBytes = 0;
  const checked = handles.map(handle => {
    const entry = checkedAttachments.get(handle);
    if (!entry) fail("invalid_attachment", "Inspect this file in the current session first.");
    if (!request.selectedIds.includes(entry.evidenceId) || entry.state !== evidenceState(request.project, entry.evidenceId)) {
      fail("selection_changed", "This evidence or project differs from the attachment review.");
    }
    const key = JSON.stringify([entry.evidenceId, entry.snapshot.sha256]);
    if (pairs.has(key)) fail("invalid_attachment", "Duplicate evidence and artifact binding.");
    pairs.add(key);
    inputBytes += entry.bytes.byteLength;
    if (inputBytes > 32 * MiB) fail("package_limit", "Combined snapshot inputs exceed 32 MiB.");
    return entry;
  });
  return checked.sort((a,b) => request.selectedIds.indexOf(a.evidenceId) - request.selectedIds.indexOf(b.evidenceId)
    || compareText(a.snapshot.sha256, b.snapshot.sha256));
}
function compareText(a: string, b: string) { return a < b ? -1 : a > b ? 1 : 0; }
function eligible(entry: Checked) {
  return eligibleStatus(entry.match.status);
}

function artifactRecord(group: Checked[], payload: Map<string, Uint8Array>) {
  const {snapshot, bytes, rights} = group[0];
  const matches = group.filter(eligible);
  const covered = new Set(matches.flatMap(entry => entry.match.matched_row_ids));
  // A matching live view binds a configuration, never a historical set of row IDs.
  const liveView = matches.some(entry => entry.match.status === "compatible_live_configuration");
  const coversScope = snapshot.rows.length > 0 && (liveView || snapshot.rows.every(row => covered.has(row.id)));
  const prefix = "snapshots/" + snapshot.sha256 + "/";
  const members: string[] = [];
  if (coversScope && rights.status === "verified_permitted_use") {
    if (rights.scope === "original_archive" && !snapshot.figure) {
      members.push(prefix + "snapshot.zip");
      payload.set(members[0], bytes);
    } else if (rights.scope === "normalized_members" || rights.scope === "original_archive") {
      const original = readStoredArchive(bytes);
      for (const name of ["data.csv", "sources.csv"]) {
        members.push(prefix + name);
        payload.set(prefix + name, original.get(name)!);
      }
    }
  }
  const disposition = !members.length ? "reference_only" : members[0].endsWith(".zip") ? "original_archive" : "normalized_members";
  const m = snapshot.manifest;
  const sourceRows = new Map<string, string[]>();
  for (const row of snapshot.rows) {
    const ids = sourceRows.get(row.source_id);
    if (ids) ids.push(row.id);
    else sourceRows.set(row.source_id, [row.id]);
  }
  return {
    artifact_id: "sha256:" + snapshot.sha256, artifact_schema: m.schema, sha256: snapshot.sha256, byte_length: bytes.byteLength,
    declared_generation_time: m.generated_at, view_type: m.view_type, view_url: m.shareable_view_url,
    configuration: {filters: m.filters, comparison: m.comparison, comparability_status: m.comparability_status},
    actual_scope: {observation_ids: snapshot.rows.map(row => row.id),
      source_rows: Array.from(sourceRows, ([source_id, observation_ids]) => ({source_id: source_id || null, observation_ids})),
      missing_observations: snapshot.rows.filter(row => row.value === null).map(row => ({id:row.id, status:row.status})),
      source_ids: snapshot.sources.map(s => s.source_id),
      countries: [...new Set(snapshot.rows.map(r => r.country))], indicators: [...new Set(snapshot.rows.map(r => r.indicator))],
      periods: [...new Set(snapshot.rows.map(r => r.period))], frequencies: [...new Set(snapshot.rows.map(r => r.frequency))],
      layers: [...new Set(snapshot.rows.map(r => r.layer))], units: [...new Set(snapshot.rows.map(r => r.unit))]},
    scope_basis: liveView ? "matching_live_view_parameters" : coversScope ? "individually_matched_rows" : "incomplete_recorded_scope",
    integrity: "sha256_of_original_input_bytes", attribution: {status:"recorded_not_independently_authenticated",
      source_attributions:m.source_attributions, sources:snapshot.sources},
    methodological_limitations: m.known_limitations, missing_value_policy:m.missing_value_policy,
    rights, figure: snapshot.figure, disposition, members,
    inclusion_reason: !coversScope ? "selected_correspondence_does_not_cover_artifact" :
      !members.length ? "redistribution_unresolved_or_restricted" : "permitted_bytes_for_selected_scope",
  };
}

function readme(locale: Locale) {
  if (locale === "en") return "# Research package\n\nThe report, citations and report manifest describe the selected Notebook evidence. package_manifest.json records each proposed correspondence, the included paths, source attribution, reuse conditions and unresolved limitations. It inventories the exact bytes of every other file. Check its SHA-256 against an independently retained package digest to detect replacement.\n\nOnly the listed permitted bytes are attached. For normalized members, the two CSVs are original byte slices from the inspected archive. Other members, including figures, are omitted. A matching view or digest cannot date the capture or authenticate an official source. Review personal notes and the recorded source terms before sharing.\n";
  return "# 研究包\n\n报告、引文和报告清单记录已选笔记证据。package_manifest.json 列出每项匹配、实际收录的文件、来源署名、再利用条件和未决限制，并记录除清单自身之外每个文件的精确字节数和摘要。可用独立保存的整包 SHA-256 检查文件是否被替换。\n\n仅收录明确许可的字节。若收录范围为规范化数据，两个 CSV 保留输入快照中的原始字节，其他文件及图形均未附入。匹配的视图或摘要无法单独确定采集时间或验证官方来源。分享前请检查私人笔记及来源使用条件。\n";
}

/** The caller selects the active report. No storage, network, current clock or model evaluation is consulted. */
export async function buildResearchPackage(input: ResearchPackageRequest) {
  const {project, selectedIds, locale, template, reportTime} = input;
  if (!project || typeof project.id !== "string" || !/^[A-Za-z0-9-]{1,100}$/.test(project.id)) fail("invalid_project", "Invalid project identity.");
  const citation = buildReportCitationBundle(project.notebook, selectedIds, locale, reportTime, template, project.id);
  const brief = buildEvidenceBrief(project.notebook, selectedIds, locale, reportTime, template);
  const entries = attachmentOrder(input, input.attachments ?? []);
  const text = [readme(locale), serializeEvidenceBrief(brief), serializeBriefHtml(brief, locale), citation.manifestJson, citation.bibtex, citation.cslJson];
  const payload = new Map<string, Uint8Array>(rootFiles.map((p,i) => [p, encoder.encode(text[i])]));
  const groups = new Map<string, Checked[]>();
  for (const entry of entries) {
    const key = entry.snapshot.sha256;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  const artifacts = [...groups.keys()].sort().map(key => artifactRecord(groups.get(key)!, payload));
  const bindings = entries.map(entry => ({
    schema: BINDING_SCHEMA, project_id: project.id, notebook_id: project.notebook.notebook_id,
    evidence_id: entry.evidenceId, artifact_id: "sha256:" + entry.snapshot.sha256, binding_time: reportTime,
    expected_digest_check: entry.expectedSha256 === undefined ? "not_supplied" : "matches_supplied_digest",
    correspondence: entry.match,
  }));
  const evidence = selectedIds.map(id => {
    const related = bindings.filter(b => b.evidence_id === id);
    const attached = related.filter(b => eligibleStatus(b.correspondence.status) &&
      artifacts.some(a => a.artifact_id === b.artifact_id && a.members.length));
    return {evidence_id:id, disposition: attached.length ? "bytes_included" : related.length ? "reference_only" : "unbound",
      considered_artifacts: related.map(b => b.artifact_id), attached_artifacts: attached.map(b => b.artifact_id)};
  });
  const core = {
    schema: PACKAGE_SCHEMA, report_manifest: "report_manifest.json", report_manifest_schema: citation.manifest.schema,
    project_id: project.id, notebook_id: project.notebook.notebook_id, selected_evidence_ids: [...selectedIds],
    locale, template, generated_at: reportTime, evidence, artifacts, bindings,
    byte_coverage: !evidence.length ? "empty_selection" : evidence.every(e => e.disposition === "bytes_included") ? "bytes_for_each_selected_item" : "incomplete",
    digest_scope: "SHA-256 of exact member bytes, lowercase hexadecimal; package_manifest.json excluded from its own inventory",
  };
  const files = await Promise.all(Array.from(payload, ([path, bytes]) => fileDigest(path, bytes)));
  const manifest = {...core, files};
  payload.set("package_manifest.json", encoder.encode(pretty(manifest)));
  const bytesTotal = [...payload.values()].reduce((sum, b) => sum + b.byteLength, 0);
  if (bytesTotal + 65536 > limits.maxBytes || [...payload.values()].some(b => b.byteLength > limits.maxMemberBytes)) fail("package_limit", "Generated research package exceeds limits.");
  const bytes = buildZip(Array.from(payload, ([name, content]) => ({name, content})), reportTime);
  return {manifest: structuredClone(manifest), bytes, sha256: await sha256Hex(bytes)};
}
function eligibleStatus(status: string) { return status === "exact_recorded_observation" || status === "compatible_live_configuration"; }

const packageMember = (name: string) => rootFiles.includes(name) || name === "package_manifest.json" ||
  /^snapshots\/[0-9a-f]{64}\/(snapshot\.zip|data\.csv|sources\.csv)$/.test(name);

/** Byte verification only. Without an independent expected digest an altered, internally consistent archive can pass. */
export async function verifyResearchPackageIntegrity(input: Uint8Array, expectedSha256?: string) {
  if (!(input instanceof Uint8Array) || !(input.buffer instanceof ArrayBuffer) || input.byteLength > limits.maxBytes) fail("package_limit", "Invalid package size or buffer.");
  const bytes = new Uint8Array(input);
  const digest = await sha256Hex(bytes);
  if (expectedSha256 !== undefined && digest !== expectedSha256) fail("digest_mismatch", "Research package differs from the expected SHA-256.");
  const members = readStoredArchive(bytes, {...limits, allowedName:packageMember});
  for (const path of [...rootFiles, "package_manifest.json"]) if (!members.has(path)) fail("invalid_package", "Required package file missing.");
  let manifest;
  try {manifest = JSON.parse(decodeArchiveText(members.get("package_manifest.json")!));}
  catch {return fail("invalid_package", "Unreadable package manifest.");}
  if (manifest?.schema !== PACKAGE_SCHEMA || !Array.isArray(manifest.files) || manifest.files.length !== members.size - 1) fail("invalid_package", "Invalid member inventory.");
  const seen = new Set<string>();
  for (const row of manifest.files) {
    if (!row || typeof row.path !== "string" || row.path === "package_manifest.json" || seen.has(row.path) || !members.has(row.path) ||
        typeof row.sha256 !== "string" || !digestPattern.test(row.sha256)) fail("invalid_package", "Invalid member inventory entry.");
    seen.add(row.path);
    const member = members.get(row.path)!;
    const archiveId = /^snapshots\/([0-9a-f]{64})\/snapshot\.zip$/.exec(row.path)?.[1];
    if ((archiveId && archiveId !== row.sha256) || member.byteLength !== row.byte_length || await sha256Hex(member) !== row.sha256) fail("digest_mismatch", "Member integrity check failed.");
  }
  return {sha256:digest,byte_length:bytes.byteLength,verified_members:seen.size,expected_digest:expectedSha256 === undefined ? "not_supplied" : "matched"} as const;
}
