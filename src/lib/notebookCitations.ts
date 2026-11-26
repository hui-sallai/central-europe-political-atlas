import type { Locale } from "@/i18n/config";
import { CONFIGURATION_TYPES, notebookBriefMessages, validateSelection, type BriefTemplate } from "./notebookBrief";
import { atlasItemTarget, externalSourceLink } from "./safeNavigation";
import { notebookLimits, type NotebookItem, type ResearchNotebook } from "./researchNotebook";
import { citationAccessDate, citationKey, serializeCitationBibTeX, serializeCitationCsl, type CitationRecord } from "./notebookCitationFormats";

const schema = "atlas-research-report-manifest-v1";
const bibliographicGaps = ["publication_date", "document_type", "author", "issuing_body", "publisher", "edition", "vintage", "doi", "gazette_issue", "official_notice_id"] as const;
const reportByteLimit = 8 * 1024 * 1024;

// These are the two evidence warnings recorded by NationalComparisonWorkspace. Unknown wording is
// retained verbatim without trying to diagnose whether the publisher was missing observations.
const sourceLoadingWarnings = new Set([
  "Some source files could not be loaded. This package contains only loaded observations, not proof of official absence.",
  "Coverage evidence could not be loaded. Historical comparison eligibility is withheld.",
]);

function validReportTime(time: string) {
  if (typeof time !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(time)) return false;
  const day = time.slice(0, 10);
  return Number.isFinite(Date.parse(time)) && new Date(day + "T00:00:00Z").toISOString().slice(0, 10) === day;
}

function reproducibility(item: NotebookItem) {
  if (item.type === "observation") return "recorded_observation";
  return CONFIGURATION_TYPES.has(item.type) ? "live_research_configuration" : "recorded_reference";
}

/** Local, read-only projection. Project registry IDs are supplied by the caller, never guessed from notebook IDs. */
export function buildReportCitationBundle(
  notebook: ResearchNotebook, selectedIds: string[], locale: Locale, reportTime: string,
  template: BriefTemplate = "standard", projectId?: string,
) {
  if (!Array.isArray(selectedIds) || selectedIds.length > notebookLimits.items || !selectedIds.every(id => typeof id === "string")) throw Error("Invalid report selection");
  const items = validateSelection(notebook, selectedIds);
  if (!validReportTime(reportTime)) throw Error("Invalid report date");
  if (locale !== "en" && locale !== "zh-CN") throw Error("Invalid report locale");
  if (!["standard", "comparative_note", "methodological_audit"].includes(template)) throw Error("Invalid report template");
  if (projectId !== undefined && (typeof projectId !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(projectId))) throw Error("Invalid project ID");

  // First use within the selected report determines source order. IDs remain distinct across layers/revisions.
  const sourceUse = new Map<string, string[]>();
  for (const item of items) {
    for (const id of new Set(item.source_ids)) {
      if (!sourceUse.has(id)) sourceUse.set(id, []);
      sourceUse.get(id)!.push(item.id);
    }
  }
  const sourceById = new Map(notebook.sources.map(source => [source.id, source]));
  const sources = Array.from(sourceUse, ([id, evidenceIds]) => {
    const source = sourceById.get(id)!;
    return {
      ...source, recorded_url: source.url, url: externalSourceLink(source.url)?.href ?? null,
      citation_id: citationKey("source", id, notebook.notebook_id), evidence_ids: evidenceIds,
      publication_date: null, document_type: null, missing_bibliographic_fields: [...bibliographicGaps],
    };
  });
  const evidence = items.map(item => {
    const safe = atlasItemTarget(item.url);
    return {
      ...structuredClone(item), recorded_url: item.url, url: safe ? new URL(item.url).href : null,
      view_citation_id: citationKey("view", item.id, notebook.notebook_id), reproducibility: reproducibility(item),
    };
  });

  // v1 aggregates item warnings in the project list without recording a separate scope.
  // Keep matched text at item scope, so an unrelated or excluded warning cannot apply to the report.
  const itemWarnings = new Set(notebook.items.flatMap(item => item.warnings));
  const manifest = {
    schema,
    report: { title: notebook.title || notebookBriefMessages[locale].title, research_question: notebook.research_question,
      locale, template, generated_at: reportTime, countries: [...new Set(items.flatMap(item => item.countries))],
      periods: [...new Set(items.flatMap(item => item.periods))] },
    project: { project_id: projectId ?? null, notebook_id: notebook.notebook_id, notebook_schema: notebook.schema,
      recorded_title: notebook.title, recorded_locale: notebook.locale, created_at: notebook.created_at, updated_at: notebook.updated_at,
      platform_version: notebook.platform_version, user_authored_notes: notebook.user_notes,
      ...(notebook.workspace_context !== undefined ? {workspace_context: notebook.workspace_context} : {}) },
    selected_evidence_ids: [...selectedIds],
    evidence, sources,
    limitations: {
      project_warnings: notebook.methodology_warnings.filter(w => !itemWarnings.has(w)),
      evidence: evidence.map(item => ({
        evidence_id: item.id, codes: [
          ...(item.reproducibility === "live_research_configuration" ? ["live_configuration"] : []),
          ...(item.type === "observation" && item.value === undefined ? ["value_unrecorded"] : []),
          ...(item.type === "observation" && item.value === null ? ["value_explicitly_missing"] : []),
          ...(!item.source_ids.length ? ["no_source_recorded"] : []),
          ...(item.url === null ? ["atlas_link_withheld"] : []),
          ...(item.metadata.state === "blocked" || item.metadata.state === "registry_only" ? [item.metadata.state + "_method"] : []),
          ...(item.warnings.some(w => sourceLoadingWarnings.has(w)) ? ["incomplete_source_loading"] : []),
        ],
        // Full recorded warnings and all localizations remain on the referenced evidence record.
      })),
      sources: sources.map(source => ({
        source_id: source.id, codes: ["publication_date_unrecorded", "document_type_unrecorded", "institution_role_unverified",
          "revision_history_unverified",
          ...(source.url === null ? ["source_link_withheld"] : []),
          ...(!source.retrieved_at ? ["retrieval_date_unrecorded"] : citationAccessDate(source.retrieved_at) ? [] : ["retrieval_date_unstructured"]),
          ...(!source.updated_at ? ["update_date_unrecorded"] : []),
          ...(!source.dataset ? ["source_title_unrecorded"] : []),
          ...(!source.institution ? ["institution_unrecorded"] : []),
        ],
      })),
      snapshot_binding: "no_verified_artifact_attached",
    },
  };
  const records: CitationRecord[] = [
    ...sources.map(source => ({kind: "source" as const, id: source.citation_id, title: source.dataset, url: source.url,
      institution: source.institution, retrieved_at: source.retrieved_at, updated_at: source.updated_at})),
    ...evidence.map(item => ({kind: "view" as const, id: item.view_citation_id, title: item.labels?.[locale] || item.title, url: item.url})),
  ];
  const bibtex = serializeCitationBibTeX(records);
  const cslJson = serializeCitationCsl(records);
  const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
  const encoder = new TextEncoder();
  const bytes = [bibtex, cslJson, manifestJson].reduce((sum, file) => sum + encoder.encode(file).byteLength, 0);
  if (bytes > reportByteLimit) throw Error("Citation bundle exceeds the export size limit");
  return { bibtex, cslJson, manifestJson, manifest };
}
