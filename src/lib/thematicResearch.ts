// Thematic research layer (owner brief of 2026-11-17): industrial policy and strategic investment, FDI and production
// networks, energy dependency and transition, EU funding. Authored records live in src/lib/research-themes/*.json and are
// validated by scripts/research-themes/build-research-themes.mjs, which also derives thematic_index.json (indicator
// catalogue, enriched event–indicator mappings, country × theme coverage, chronologies and descriptive evidence windows).
// Presentation metadata only: nothing here edits an observation, enters a model or states an effect.
// thematic_index.json carries copied observations; read it at build time (server components, generateStaticParams),
// not in client bundles.
import meta from "@/lib/research-themes/meta.json";
import themesDoc from "@/lib/research-themes/themes.json";
import mappingsDoc from "@/lib/research-themes/event_mappings.json";
import investmentDoc from "@/lib/research-themes/investment_records.json";
import fundingDoc from "@/lib/research-themes/eu_funding.json";
import casesDoc from "@/lib/research-themes/cases.json";
import indexDoc from "@/lib/research-themes/thematic_index.json";
import type { EvidenceDraft } from "@/lib/researchNotebook";

export type Bi = { en: string; zh: string };
export type Relationship = "A" | "B" | "C" | "D" | "E";
export type ThemeId = "industrial_policy_strategic_investment" | "fdi_production_networks" | "energy_dependency_transition" | "eu_funding_development";
export type Layer = "canonical_annual" | "historical_annual" | "high_frequency_monthly" | "historical_monthly" | "macro_driver_monthly" | "sors_annual" | "sors_monthly" | "regional_annual" | "regional_history" | "sors_regional";
export type Coverage = { first: string; last: string; count: number } | null;

export type Theme = {
  theme_id: ThemeId; code: "A" | "B" | "C" | "D"; title: Bi; description: Bi; countries: string[];
  indicators: { indicator_id: string; layers: Layer[]; role: Bi; scope?: string[]; not_applicable_for?: string[] }[];
  pending_indicators: { indicator_id: string; reason: Bi }[]; not_held: Bi[]; event_types: string[];
  research_questions: Bi[]; limitations: Bi[]; case_ids: string[];
};
export type MappingLayer = { layer: Layer; frequency: "annual" | "monthly"; transformation: string | null; dataset: string | null; unit: string | null; definition: string | null; source_url: string | null; coverage: Coverage; observations_after_event: number; explorer_key: string | null };
export type MappingRow = { indicator_id: string; relationship: Relationship; connection: Bi; limitations: string[]; geo: string; pending: boolean; country?: string; region_id?: string; transformation?: string; revises_existing?: { source: string; measurement: string }; layers: MappingLayer[] };
export type EventMapping = {
  event_id: string; date: string; country: string; event_type: string; source_name: string; source_url: string; theme_ids: ThemeId[];
  classification: Relationship; reason_code: string | null; evidence_status: string; extends_event_analysis: boolean; summary: Bi; indicators: MappingRow[];
};
export type Amount = { value: number; currency: string; kind: string; precision: string; label: Bi };
export type InvestmentStage = { stage: string; status: string; date: string | null; date_precision: string; summary: Bi; evidence: { implementation_milestones?: string[]; event_ids?: string[]; project_id?: string }; amounts?: Amount[]; quantities?: { value: number; unit: string; kind: string; label: Bi }[] };
export type InvestmentRecord = {
  record_id: string; kind: "strategic_investment" | "industrial_policy_instrument"; theme_ids: ThemeId[]; country: string; title: Bi; project_id: string | null; event_ids: string[];
  implementation_event_id: string | null; sector: Bi; activity_classification: string | null; responsible_institutions: Bi[];
  location: { region_id: string; admin_code: string; classification: string; locality: string; basis: "project_location" } | null; administrative_responsibility: Bi;
  stages: InvestmentStage[]; realised_expenditure: { status: string; milestone_id: string | null }; limitations: Bi[];
};
export type FundingRecord = {
  record_id: string; country: string; programme: string; funding_period: string; category: string; stage: string; amount: number | null; currency: string | null; amount_precision: string | null;
  price_basis: string | null; status_date: string; date_precision: string; evidence_status: string; source: { kind: string; ref?: string }; geographic_scope: string; region_id: string | null;
  event_id: string | null; implementation_milestone: string | null; case_id: string | null; related_indicators: string[]; note: Bi;
};
export type CaseSeries = { indicator_id: string; layer: Layer; country?: string; region_id?: string; transformation?: string };
export type ResearchCase = {
  case_id: string; theme_ids: ThemeId[]; countries: string[]; context_countries: string[]; status: "published"; extends: { kind: string; event_id: string } | null;
  title: Bi; research_question: Bi; event_ids: string[]; investment_records: string[]; funding_records: string[]; implementation_milestones?: string[];
  institutional_context: Bi[]; series: CaseSeries[]; regional: { region_id: string; admin_code: string; role: string; records: string[]; indicators: string[] }[];
  findings: Bi[]; interpretation: Bi; limitations: Bi[]; window_blocker?: Bi; links: { kind: string; route: string; label: Bi }[];
};
export type WindowObservation = { period: string; value: number; observation_id: string; recovery_phase?: string };
export type EvidenceWindow = {
  case_id: string; window_id: string; anchor_date: string; anchor_period: string; anchor_label: Bi; frequency: "annual" | "monthly"; before: number; after: number; note: Bi;
  series: (CaseSeries & { geo: string; transformation: string | null; observations: WindowObservation[]; missing_periods: string[]; before_count: number; after_count: number; anchor_observed: boolean; status: "complete" | "asymmetric" | "pre_event_only" | "none" })[];
};
export type CoverageRow = {
  country: string; theme_id: ThemeId; theme_applicable: boolean; official_source_identified: boolean; data_admitted: { admitted: number; defined: number }; historical_observations: boolean;
  case_ids: string[]; events_mapped: Record<Relationship, number>; investment_records: number; funding_records: number; evidence_missing: string[]; not_held_concepts: number; note: Bi | null;
};
export type ChronologyItem = { date: string | null; date_precision: string; kind: "investment_stage" | "funding_stage" | "event" | "implementation_milestone"; record_id: string; stage: string | null; status: string; summary: Bi | null; amount?: number | null; currency?: string | null; category?: string };

export const thematicMeta = meta as unknown as {
  schema_version: string; verified_on: string; countries: string[]; method: Bi; boundaries: Bi[];
  relationship_types: Record<Relationship, { code: string; label: Bi; definition: Bi }>; reason_codes: Record<string, Bi>;
  investment_stages: { id: string; label: Bi }[]; stage_status: Record<string, Bi>; funding_stages: { id: string; label: Bi }[];
  evidence_status: Record<string, Bi>; coverage_statuses: Record<string, Bi>; layers: Record<Layer, Bi>;
};
export const researchThemes = themesDoc.themes as unknown as Theme[];
export const limitationLibrary = mappingsDoc.limitation_library as Record<string, Bi>;
export const investmentRecords = investmentDoc.records as unknown as InvestmentRecord[];
export const fundingRecords = fundingDoc.records as unknown as FundingRecord[];
export const fundingProgrammes = fundingDoc.programmes as Record<string, { label: Bi; eligible: string }>;
export const researchCases = casesDoc.cases as unknown as ResearchCase[];
const INDEX = indexDoc as unknown as {
  stats: Record<string, unknown>; indicator_catalogue: (MappingLayer & { indicator_id: string; registry_name: Bi | null; coverage: Record<string, Coverage> })[];
  mappings: EventMapping[]; coverage_matrix: CoverageRow[]; funding_applicability: { country: string; programmes: Record<string, string> }[];
  chronologies: { case_id: string; dated: ChronologyItem[]; undated: ChronologyItem[] }[]; evidence_windows: EvidenceWindow[];
};
export const thematicStats = INDEX.stats;
export const indicatorCatalogue = INDEX.indicator_catalogue;
export const eventMappings = INDEX.mappings;
export const coverageMatrix = INDEX.coverage_matrix;
export const fundingApplicability = INDEX.funding_applicability;

export const bi = (value: Bi | null | undefined, en: boolean) => (value ? (en ? value.en : value.zh) : "");
export const theme = (id: string) => researchThemes.find((t) => t.theme_id === id);
export const researchCase = (id: string) => researchCases.find((c) => c.case_id === id);
/** The reviewed mapping for an event, or undefined when the event has not been reviewed (shown as "not yet reviewed", never as "no relationship"). */
export const mappingForEvent = (eventId: string) => eventMappings.find((m) => m.event_id === eventId);
export const mappingsFor = (themeId?: string, country?: string) => eventMappings.filter((m) => (!themeId || m.theme_ids.includes(themeId as ThemeId)) && (!country || m.country === country));
export const investmentsFor = (country?: string, themeId?: string) => investmentRecords.filter((r) => (!country || r.country === country) && (!themeId || r.theme_ids.includes(themeId as ThemeId)));
export const fundingFor = (country?: string) => fundingRecords.filter((f) => !country || f.country === country);
export const coverageFor = (country: string, themeId: string) => coverageMatrix.find((r) => r.country === country && r.theme_id === themeId);
export const caseChronology = (caseId: string) => INDEX.chronologies.find((c) => c.case_id === caseId);
export const caseWindows = (caseId: string) => INDEX.evidence_windows.filter((w) => w.case_id === caseId);
export const relationshipLabel = (code: Relationship, en: boolean) => bi(thematicMeta.relationship_types[code].label, en);

/** A Notebook evidence draft for one reviewed event–indicator relationship (existing Notebook contract, type "event"). */
export function mappingNotebookDraft(eventId: string, indicatorId: string, en: boolean, siteBase: string): EvidenceDraft | null {
  const m = mappingForEvent(eventId);
  const row = m?.indicators.find((r) => r.indicator_id === indicatorId);
  if (!m || !row) return null;
  const layer = row.layers.find((l) => l.coverage) ?? row.layers[0];
  return {
    type: "event",
    title: `${m.event_id} · ${indicatorId} (${row.relationship})`,
    labels: { en: `${relationshipLabel(row.relationship, true)}: ${row.connection.en}`, "zh-CN": `${relationshipLabel(row.relationship, false)}：${row.connection.zh}` },
    url: `${siteBase.replace(/\/$/, "")}${en ? "/en" : ""}/news/?country=${m.country}&type=${m.event_type}&from=${m.date}&to=${m.date}#${m.event_id}`,
    canonical_ids: [m.event_id, indicatorId],
    countries: [m.country],
    periods: [m.date],
    sources: [
      { institution: m.source_name, dataset: m.source_name, url: m.source_url, layer: "verified_event" },
      ...(layer?.source_url ? [{ institution: layer.dataset ?? indicatorId, dataset: layer.dataset ?? indicatorId, url: layer.source_url, layer: layer.layer }] : []),
    ],
    layer: "thematic_event_indicator_mapping",
    comparability: "event_context_not_a_comparable_numeric_observation",
    warnings: [...row.limitations.map((k) => bi(limitationLibrary[k], en)), bi(thematicMeta.boundaries[0], en)].filter(Boolean),
    metadata: { event_type: m.event_type, status: m.evidence_status, classification: row.relationship, evidence_categories: m.theme_ids, entersModel: false },
  };
}
