import { canonicalNotebookUrl, validateNotebook, type NotebookItem, type NotebookSource, type ResearchNotebook } from "./researchNotebook";
import type { InspectedSnapshot, InspectedSnapshotRow, InspectedSnapshotSource } from "./researchPackageSnapshot";

export type CorrespondenceStatus = "exact_recorded_observation" | "compatible_live_configuration" |
  "partial_correspondence" | "conflicting_correspondence" | "insufficient_information" | "unsupported_artifact_type";

type SourceRelationship = {
  snapshot_source_id: string;
  notebook_source_ids: string[];
  status: "matched_recorded_fields" | "incomplete" | "ambiguous" | "conflicting" | "unmatched";
  differences: string[];
};
type Comparison = {
  status: CorrespondenceStatus;
  matched_row_ids: string[];
  source_relationships: SourceRelationship[];
  match_evidence: string[];
  differences: string[];
};

function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a), right = new Set(b);
  return left.size === right.size && [...left].every(x => right.has(x));
}

const annualSourceLayers = new Map([["formal", "formal_observation"], ["history", "historical_descriptive"], ["sors", "serbia_sors_descriptive"]]);
function checkSources(item: NotebookItem, itemSources: NotebookSource[], rows: InspectedSnapshotRow[], snapshot: InspectedSnapshot) {
  const byId = new Map(snapshot.sources.map(s => [s.source_id, s]));
  const rowsBySource = new Map<string, InspectedSnapshotRow[]>();
  for (const row of rows) {
    if (!row.source_id) continue;
    const bucket = rowsBySource.get(row.source_id);
    if (bucket) bucket.push(row);
    else rowsBySource.set(row.source_id, [row]);
  }

  function compareSource(n: NotebookSource, s: InspectedSnapshotSource, uses: InspectedSnapshotRow[]) {
    const conflicts: string[] = [], missing: string[] = [];
    // Annual Data Explorer records its internal source-layer spelling in sources.csv
    // and its display-layer spelling on both the observation and the Notebook source.
    const mappedLayer = snapshot.manifest.view_type === "annual" && annualSourceLayers.get(s.source_layer) === n.layer &&
      uses.every(row => row.layer === n.layer);
    // The national workspace places the statistical definition in the Notebook's dataset field.
    const definitionInDataset = item.type === "country_comparison" && item.layer === "descriptive_comparison";
    const fields = [
      ["institution", n.institution, s.institution], ["dataset", n.dataset, definitionInDataset ? s.definition : s.dataset],
      ["layer", n.layer, mappedLayer ? n.layer : s.source_layer], ["code", n.code, s.source_code],
      ["original_unit", n.original_unit, s.original_unit], ["normalized_unit", n.normalized_unit, s.unit],
      ["retrieved_at", n.retrieved_at, s.retrieved_at], ["updated_at", n.updated_at, s.updated_at],
    ] as const;
    for (const [key, recorded, supplied] of fields) {
      if (recorded && supplied && recorded !== supplied) conflicts.push(key);
      else if (Boolean(recorded) !== Boolean(supplied) || (!recorded && ["institution", "dataset", "layer"].includes(key))) missing.push(key);
    }
    if (s.definition && !definitionInDataset && item.metadata.filters?.definition !== s.definition) missing.push("statistical_definition_unrecorded");
    return { id: n.id, conflicts, missing };
  }

  const edges: SourceRelationship[] = [];
  for (const [id, uses] of rowsBySource) {
    const src = byId.get(id)!;
    const candidates = itemSources.filter(n => n.url === src.source_url).map(n => compareSource(n, src, uses));
    const best = candidates.filter(c => c.conflicts.length === 0);
    if (!best.length) {
      edges.push({snapshot_source_id: id, notebook_source_ids: [], status: candidates.length ? "conflicting" : "unmatched",
        differences: candidates.length ? [...new Set(candidates.flatMap(c => c.conflicts))] : ["no_recorded_source_at_this_url"]});
    } else {
      edges.push({snapshot_source_id: id, notebook_source_ids: best.map(c => c.id),
        status: best.length > 1 ? "ambiguous" : best[0].missing.length ? "incomplete" : "matched_recorded_fields",
        differences: [...new Set(best.flatMap(c => c.missing))]});
    }
  }
  // Two snapshot records may differ by definition, vintage or another field the Notebook discarded.
  const counts = new Map<string, number>();
  for (const e of edges) for (const id of e.notebook_source_ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const e of edges) if (e.notebook_source_ids.some(id => counts.get(id)! > 1)) {
    e.status = "ambiguous";
    e.differences.push("notebook_source_shared_by_distinct_snapshot_records");
  }
  return edges;
}

function compareItem(item: NotebookItem, sources: NotebookSource[], snapshot: InspectedSnapshot): Comparison {
  const {manifest, rows} = snapshot;
  const differences = new Set<string>(), evidence = new Set<string>();
  const result = (status: CorrespondenceStatus, matches: InspectedSnapshotRow[] = [], links: SourceRelationship[] = []): Comparison => ({
    status, matched_row_ids: matches.map(row => row.id), source_relationships: links,
    match_evidence: [...evidence], differences: [...differences],
  });
  const unsupported = !["series_view", "country_comparison", "regional_view", "map_view", "observation"].includes(item.type) ||
    new URL(item.url).pathname.split("/").includes("politics") || item.layer.startsWith("political") ||
    item.canonical_ids.some(id => id.startsWith("el-"));
  if (unsupported) {
    differences.add("no_supported_descriptive_snapshot_for_evidence_type");
    return result("unsupported_artifact_type");
  }

  const filters = item.metadata.filters ?? {};
  if (item.type === "observation") {
    const idSet = new Set(item.canonical_ids);
    const candidates = rows.filter(row => idSet.has(row.id));
    if (candidates.length !== 1) {
      differences.add(candidates.length ? "multiple_recorded_row_identifiers" : "recorded_row_identifier_not_found");
      return result("insufficient_information");
    }
    const row = candidates[0];
    evidence.add("canonical_row_id");
    let conflict = false;
    const compare = (field: string, recorded: unknown, supplied: unknown) => {
      if (recorded === undefined || recorded === "" || supplied === undefined || supplied === "") differences.add(field + "_unrecorded");
      else if (JSON.stringify(recorded) !== JSON.stringify(supplied)) { differences.add(field + "_conflict"); conflict = true; }
      else evidence.add(field);
    };
    if (!idSet.has(row.indicator)) {
      if (item.canonical_ids.length > 1) { differences.add("indicator_conflict"); conflict = true; }
      else differences.add("indicator_unrecorded");
    } else evidence.add("canonical_indicator");
    compare("country", item.countries.length ? item.countries : undefined, [row.country]);
    compare("period", item.periods.length ? item.periods : undefined, [row.period]);
    compare("value", item.value, row.value);
    compare("unit", item.unit, row.unit);
    compare("layer", item.layer, row.layer);
    compare("status", item.metadata.status, row.status);
    const comparable = row.cross_country_comparable;
    compare("comparability", item.comparability, comparable === null ? "not_promoted_by_notebook" :
      comparable ? "canonical_comparable" : "not_cross_country_comparable");
    const rowSource = snapshot.sources.find(s => s.source_id === row.source_id);
    for (const [key, value] of Object.entries(filters)) {
      const actual = key === "frequency" ? row.frequency : row.extras[key] ??
        (key === "definition" ? rowSource?.definition : undefined) ?? manifest.filters[key];
      // A filter saved in the Notebook with no corresponding snapshot field cannot establish agreement.
      compare("filter_" + key, value, actual);
    }
    // Regional row identifiers alone cannot attest the same vintage or geography classification.
    if (manifest.view_type === "regional_map" && (!filters.classification_system || !filters.admin_level)) differences.add("regional_classification_unrecorded");
    for (const semantic of ["transformation", "vintage", "definition_version", "aggregation_scope", "applicability_scope",
      "value_semantics", "seasonal_adjustment", "territory", "ballot", "round_scope"]) {
      if (row.extras[semantic] && !Object.hasOwn(filters, semantic)) differences.add(semantic + "_unrecorded");
    }
    const links = checkSources(item, sources, [row], snapshot);
    if (!links.length || !sources.length) differences.add("source_reference_unresolved");
    if (links.some(e => e.status === "conflicting")) conflict = true;
    if (links.some(e => e.status !== "matched_recorded_fields")) differences.add("source_identity_or_revision_differs_or_incomplete");
    if (!sameMembers(item.source_ids, links.flatMap(e => e.notebook_source_ids))) differences.add("source_scope_differs");
    if (links.length && links.every(e => e.status === "matched_recorded_fields")) evidence.add("recorded_source_metadata");
    return result(conflict ? "conflicting_correspondence" : differences.size ? "partial_correspondence" : "exact_recorded_observation", conflict ? [] : [row], links);
  }

  const national = item.type === "country_comparison" && item.layer === "descriptive_comparison";
  const regional = ["map_view", "regional_view"].includes(item.type);
  const query = new URL(item.url).searchParams;
  const tab = query.get("tab");
  let recordedView: string | undefined;
  if (item.type === "series_view") {
    if (Object.hasOwn(filters, "sors_series") || query.has("sors_series")) recordedView = "serbia_sors";
    else if (tab === "macro_drivers" || query.get("skill") === "macro_driver_explorer" ||
      (Object.hasOwn(filters, "driver") && Object.hasOwn(filters, "transformation"))) recordedView = "macro_drivers";
    else if (tab === "annual" || tab === "high_frequency") recordedView = tab;
  }
  if ((recordedView && recordedView !== manifest.view_type) || (manifest.view_type === "regional_map") !== regional ||
      (national && !Object.hasOwn(manifest.comparison, "mode")) ||
      (item.type === "country_comparison" && !national && manifest.view_type !== "country_comparison") ||
      (item.type === "series_view" && manifest.view_type === "country_comparison")) {
    differences.add("snapshot_view_type_conflict");
    return result("conflicting_correspondence");
  }
  const overlaps = (a: string[], b: string[]) => a.some(x => b.includes(x));
  if (!item.countries.length || !item.canonical_ids.length) {
    differences.add("configuration_scope_unrecorded");
    return result("insufficient_information");
  }
  if (!overlaps(item.countries, manifest.countries) || (!national && !overlaps(item.canonical_ids, manifest.indicators))) {
    differences.add("country_or_indicator_conflict");
    return result("conflicting_correspondence");
  }
  if (sameMembers(item.countries, manifest.countries)) evidence.add("countries"); else differences.add("country_scope_differs");
  if (!national) {
    if (sameMembers(item.canonical_ids, manifest.indicators)) evidence.add("indicators"); else differences.add("indicator_scope_differs");
  }
  if (!Object.keys(filters).length) differences.add("filters_unrecorded");
  let conflict = false;
  for (const [key, value] of Object.entries(filters)) {
    if (!Object.hasOwn(manifest.filters, key)) differences.add("missing_filter_" + key);
    else if (JSON.stringify(value) !== JSON.stringify(manifest.filters[key])) { differences.add("conflicting_filter_" + key); conflict = true; }
    else evidence.add("filter_" + key);
  }
  if (Object.keys(manifest.filters).some(key => !Object.hasOwn(filters, key))) differences.add("additional_artifact_filters");
  if (canonicalNotebookUrl(item.url) !== canonicalNotebookUrl(manifest.shareable_view_url)) differences.add("view_locator_differs");
  if (national && manifest.comparison.mode !== filters.mode) { differences.add("effective_comparison_mode_differs"); conflict = true; }
  const count = item.metadata.row_count;
  if (count === undefined || count !== rows.length) differences.add("row_count_unrecorded_or_differs"); else evidence.add("row_count");
  const actualPeriods = manifest.time_range.from === null ? [] : [manifest.time_range.from, manifest.time_range.to];
  if (!actualPeriods.length || JSON.stringify(item.periods) !== JSON.stringify(actualPeriods)) differences.add("recorded_periods_differ_from_actual_range");
  else evidence.add("period_endpoints");
  if (item.comparability && item.comparability !== manifest.comparability_status &&
      !(item.comparability === "separate_source_definitions_not_promoted" && manifest.comparability_status === "within_selected_series_only")) {
    differences.add("comparability_scope_differs");
    conflict = true;
  }
  if (!national && !sameMembers(item.layer.split("|"), manifest.data_layers)) {
    differences.add("layer_scope_differs");
    if (!overlaps(item.layer.split("|"), manifest.data_layers)) conflict = true;
  }
  let matched = rows;
  if (national) {
    const ids = new Set(item.canonical_ids);
    matched = rows.filter(row => ids.has(row.id));
    if (matched.length) evidence.add("overlapping_recorded_row_ids");
    if (!sameMembers(item.canonical_ids, rows.map(row => row.id))) differences.add("recorded_row_set_differs");
    if (count !== undefined && count > ids.size) differences.add("recorded_id_list_incomplete");
    if (!matched.length) differences.add("no_overlapping_recorded_row_ids");
  }
  if (regional) {
    const geo = rows.filter(r => r.extras.classification_system && r.extras.admin_level)
      .map(r => [r.country, r.extras.classification_system, r.extras.admin_level].join(":"));
    if (!geo.length || !item.metadata.geography?.length) differences.add("regional_classification_unrecorded");
    else if (!sameMembers(item.metadata.geography, geo)) { differences.add("regional_classification_conflict"); conflict = true; }
    if (item.metadata.selected_regions && !sameMembers(item.metadata.selected_regions,
      rows.filter(r => r.extras.selected_region === "true").map(r => r.extras.region_id || r.id))) differences.add("selected_regions_differ");
    if (item.metadata.classification && item.metadata.classification !== manifest.filters.classification) {
      differences.add("map_classification_conflict");
      conflict = true;
    }
    if (item.metadata.legend?.length) {
      const legend = snapshot.figure?.metadata.legend;
      if (!Array.isArray(legend)) differences.add("recorded_legend_unavailable");
      else if (JSON.stringify(item.metadata.legend) !== JSON.stringify(legend.map(l => l?.label))) {
        differences.add("recorded_legend_conflict");
        conflict = true;
      } else evidence.add("recorded_legend_labels");
    }
    if (snapshot.figure) {
      differences.add("figure_relationship_to_observations_unverified");
      const geographies = snapshot.figure.metadata.geographies;
      if (!Array.isArray(geographies) || geographies.some(g => !g || !g.country || !g.classification || !g.level)) {
        differences.add("figure_geography_unrecorded");
      } else if (!sameMembers(geo, geographies.map(g => [g.country, g.classification, g.level].join(":")))) {
        differences.add("figure_geography_conflict");
        conflict = true;
      }
    }
  }
  const links = checkSources(item, sources, matched, snapshot);
  if (!links.length || !sources.length || matched.some(row => !row.source_id)) differences.add("source_reference_unresolved");
  if (links.some(e => e.status !== "matched_recorded_fields")) differences.add("source_identity_or_revision_differs_or_incomplete");
  if (!sameMembers(item.source_ids, links.flatMap(e => e.notebook_source_ids))) differences.add("source_scope_differs");
  if (!national && links.some(e => e.status === "conflicting")) conflict = true;
  if (!rows.length) differences.add("empty_artifact");
  if (links.length && links.every(e => e.status === "matched_recorded_fields")) evidence.add("recorded_source_metadata");
  const status = conflict ? "conflicting_correspondence" : !Object.keys(filters).length || (national && !matched.length) ?
    "insufficient_information" : differences.size ? "partial_correspondence" : "compatible_live_configuration";
  // Generic view records contain indicator IDs and a count, not individual row IDs.
  return result(status, national && !conflict ? matched : [], links);
}

/** Compare recorded Notebook evidence with a structurally inspected snapshot. Capture history requires separate proof. */
export function compareSnapshotEvidence(notebook: ResearchNotebook, evidenceId: string, snapshot: InspectedSnapshot) {
  if (!validateNotebook(notebook)) throw Error("Invalid research notebook");
  const item = notebook.items.find(i => i.id === evidenceId);
  if (!item) throw Error("Unknown evidence identifier");
  const sources = notebook.sources.filter(s => item.source_ids.includes(s.id));
  const artifactTime = Date.parse(snapshot.manifest.generated_at), collectionTime = Date.parse(item.collected_at);
  const temporal = artifactTime === collectionTime ? "same_declared_time" :
    artifactTime > collectionTime ? "artifact_declared_after_collection" : "artifact_declared_before_collection";
  return {
    ...compareItem(item, sources, snapshot), historical_provenance: {
      status: "unverified" as const, notebook_collected_at: item.collected_at,
      declared_generated_at: snapshot.manifest.generated_at, temporal_relation: temporal,
      same_operation_capture_receipt: null,
    },
  };
}
