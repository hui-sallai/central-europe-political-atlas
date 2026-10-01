// Build-time presentation summaries only. Canonical observations never enter a client bundle here.
import { researchCountries, researchIndicators, researchObservations, researchEvents } from "@/lib/researchData";
import annualHistory from "@/data/historical/annual_descriptive_history.json";
import monthlyHistory from "@/data/historical/monthly_descriptive_history.json";
import highFrequency from "@/data/high-frequency/high_frequency_observations.json";
import seriesDictionary from "@/data/high-frequency/series_dictionary.json";
import drivers from "@/data/macro-drivers/macro_driver_observations.json";
import driverDictionary from "@/data/macro-drivers/macro_driver_dictionary.json";
import sors from "@/data/serbia/serbia_descriptive_history_monthly.json";
import sorsRegional from "@/data/serbia/serbia_descriptive_history_regional.json";
import regionalHistory from "@/data/historical/regional_descriptive_history.json";
import { regionObservationRecords } from "@/lib/regionObservations";
import { regionIndicatorRecords } from "@/lib/regionIndicators";
import { projectLocationRecords } from "@/lib/projectLocations";
import { spatialResearchCountriesV089, spatialResearchProjectsV089 } from "@/lib/spatialResearchV089";
import { runtimeAnalysisSkills } from "@/lib/analysisSkills";
import { analysisNames, englishUnit } from "@/i18n/presentation";
import { englishText } from "@/i18n/reviewedText";
import { englishAnalysisSkill } from "@/i18n/analysisPresentation";
import { researchWorkspaces, type ResearchWorkspaceDefinition } from "@/content/researchWorkspaces";
import type { Locale } from "@/i18n/config";
import { workspaceMessages } from "@/content/workspaceMessages";

export type EvidenceSource = { name: string; url: string; layer: string; periods?: string[] };
export type Coverage = { country: string; periods: string[]; sources: EvidenceSource[]; comparable: boolean; units: string[] };
export type WorkspaceEvidenceCard = { id: string; title: string; kind: "annual" | "high_frequency" | "macro_drivers" | "sors" | "map"; layer: string; coverage: Coverage[]; targetId: string };
export type WorkspacePayload = {
  id: string; title: string; introduction: string; questions: string[]; warnings: string[]; coverageNote: string; comparisonDimensions: string;
  horizon: { from: number; to: number }; countries: { id: string; name: string }[]; cards: WorkspaceEvidenceCard[];
  events: { id: string; country: string; date: string; title: string; language: string; type: string; topic: string; source: EvidenceSource }[];
  eventTypes: string[]; methods: { id: string; name: string; state: "active" | "registry_only" | "blocked"; limitations: string[]; reason: string; supportsCountry: boolean }[];
};
type EvidenceRow = { country: string; period: string; source: EvidenceSource; unit: string; comparable: boolean };
function summarize(rows: EvidenceRow[]): Coverage[] {
  return researchCountries.map(country => {
    const selected = rows.filter(row => row.country === country.slug);
    const sources = [...new Map(selected.map(row => [JSON.stringify(row.source), row.source])).values()].map(s => ({ ...s, periods: [...new Set(selected.filter(row => JSON.stringify(row.source) === JSON.stringify(s)).map(row => row.period))].sort() }));
    return { country: country.slug, periods: [...new Set(selected.map(row => row.period))].sort(), sources, comparable: selected.length > 0 && selected.every(row => row.comparable), units: [...new Set(selected.map(row => row.unit))] };
  });
}
const source = (name: string, url: string, layer: string): EvidenceSource => ({ name, url, layer });
export function buildWorkspaceEvidence(workspace: ResearchWorkspaceDefinition, locale: Locale): WorkspacePayload {
  const m = workspaceMessages[locale];
  const cards: WorkspaceEvidenceCard[] = [];
  for (const id of workspace.indicatorIds) {
    const indicator = researchIndicators.find(row => row.id === id)!;
    const formal = researchObservations.filter(row => row.indicator === id && row.value !== null && Number.isFinite(row.value)).map(row => ({ country: row.country_slug, period: String(row.year), source: source(row.source_name, row.source_url, "canonical_annual"), unit: row.unit, comparable: row.country_slug !== "serbia" && row.comparability_status === "comparable" && row.applicability_status === "applicable" && !row.review_required }));
    const history = annualHistory.records.filter(row => row.indicator === id && row.value !== null && Number.isFinite(row.value)).map(row => ({ country: row.country_slug, period: String(row.year), source: source(row.source_dataset, row.source_query_url, "historical_annual"), unit: row.unit, comparable: false }));
    for (const [layer, rows] of [["canonical_annual", formal], ["historical_annual", history]] as const) if (rows.length) cards.push({ id: `${id}:${layer}`, title: `${locale === "en" ? indicator.name : indicator.name_zh} · ${locale === "en" ? englishUnit(indicator.unit) : indicator.unit}`, kind: "annual", layer, coverage: summarize(rows), targetId: id });
  }
  for (const id of [...workspace.highFrequencyIds, ...workspace.driverIds]) {
    const isDriver = workspace.driverIds.includes(id);
    const label = isDriver ? driverDictionary.records.find(row => row.driver_id === id) : seriesDictionary.records.find(row => row.indicator === id);
    const name = label && "name_en" in label ? (locale === "en" ? label.name_en : label.name_zh) : label && "label_zh" in label ? (locale === "en" ? englishText(label.label_zh) : label.label_zh) : id;
    const live: EvidenceRow[] = isDriver ? drivers.records.filter(row => row.driver_id === id && row.transformation === "level" && row.value !== null).flatMap(row => row.applicable_country_ids.map((country: string) => ({ country, period: row.period, source: source(row.source_dataset, row.source_url, "macro_drivers"), unit: row.unit, comparable: false }))) : highFrequency.records.filter(row => row.indicator === id && row.value !== null).map(row => ({ country: row.country, period: row.period, source: source(row.source_dataset, row.source_url, "high_frequency"), unit: row.unit, comparable: false }));
    const history: EvidenceRow[] = monthlyHistory.records.filter(row => row.series === id && row.value !== null).map(row => { const s = monthlyHistory.series_sources.find(s => s.source_ref === row.source_ref)!; return { country: row.country_slug, period: row.period, source: source(s.source, s.source_url, "historical_monthly"), unit: s.unit, comparable: false }; });
    for (const [layer, rows] of [[isDriver ? "macro_drivers" : "high_frequency", live], ["historical_monthly", history]] as const) if (rows.length) cards.push({ id: `${id}:${layer}`, title: name, kind: isDriver ? "macro_drivers" : "high_frequency", layer, coverage: summarize(rows), targetId: id });
  }
  if (workspace.id === "inflation_monetary_policy") {
    const rows = sors.records.filter(row => row.series === "cpi_annual_index" && row.normalized_value !== null).map(row => { const s = sors.series_sources.find(s => s.source_ref === row.source_ref)!; return { country: "serbia", period: row.period, source: source(s.source_institution, s.source_url, "serbia_sors"), unit: row.normalized_unit, comparable: false }; });
    cards.push({ id: "cpi_annual_index:sors", title: m.sorsCpi, kind: "sors", layer: "serbia_sors", targetId: "cpi_annual_index", coverage: summarize(rows) });
  }
  for (const id of workspace.mapLayers) {
    const indicator = regionIndicatorRecords.find(row => row.region_indicator_id === id);
    const rows = regionObservationRecords.filter(row => row.region_indicator_id === id && row.value !== null && row.is_in_map_layer && !row.is_structural_sample && !row.is_pending && spatialResearchCountriesV089.some(country => country.country_id === row.country_id && country.approved_layers.some(layer => layer === id))).map(row => ({ country: row.country_id, period: row.year, source: source(row.source_name, row.source_url, "regional_current"), unit: row.unit, comparable: false }));
    if (id === "china_project_locations") rows.push(...spatialResearchProjectsV089.filter(project => /^\d{4}$/.test(project.year)).map(project => {
      const location = projectLocationRecords.find(row => row.project_location_id === project.project_location_id)!;
      return { country: project.country_id, period: project.year, source: source(location.location_source_name, location.location_source_url, "verified_project_location"), unit: "location", comparable: false };
    }));
    const title = id === "china_project_locations" ? m.projectLocations : (locale === "en" ? indicator?.name_en : indicator?.name_zh) ?? id;
    cards.push({ id: `${id}:regional`, title, kind: "map", layer: "regional_current", targetId: id, coverage: summarize(rows) });
    const historicalIndicator = regionalHistory.indicators[id as keyof typeof regionalHistory.indicators];
    const historical = regionalHistory.records.filter(row => row.indicator === id && row.value !== null).flatMap(row => (historicalIndicator?.source_refs ?? []).map(ref => {
      const originalSource = regionalHistory.sources.find(s => s.source_ref === ref)!;
      return { country: researchCountries.find(country => row.region_id.startsWith(`${country.slug}_`))?.slug ?? "", period: String(row.statistical_year), source: source(originalSource.dataset, originalSource.url, "regional_history"), unit: historicalIndicator.unit, comparable: false };
    }));
    if (historical.length) cards.push({ id: `${id}:regional-history`, title, kind: "map", layer: "regional_history", targetId: id, coverage: summarize(historical) });
  }
  const methods = workspace.methodIds.map(id => {
    const canonical = runtimeAnalysisSkills.find(row => row.skill_id === id)!;
    const skill = locale === "en" ? englishAnalysisSkill(canonical) : canonical;
    return { id, name: locale === "en" ? analysisNames[id] ?? skill.name : skill.name, state: canonical.state as "active" | "registry_only" | "blocked", limitations: skill.limitations, reason: skill.description, supportsCountry: canonical.supports_country };
  });
  if (workspace.id === "regional_development") for (const s of sorsRegional.series_sources.filter(s => workspace.mapLayers.some(id => s.mapping.startsWith(id)))) {
    const levels = [...new Set(sorsRegional.records.filter(row => row.source_ref === s.source_ref).map(row => `${row.statistical_level}:${row.classification_version}`))];
    for (const level of levels) {
      const rows = sorsRegional.records.filter(row => row.source_ref === s.source_ref && row.normalized_value !== null && `${row.statistical_level}:${row.classification_version}` === level).map(row => ({ country: "serbia", period: row.period, source: source(`${s.source_institution} · ${s.source_dataset} · ${level}`, s.source_url, "serbia_nstj_archive"), unit: row.normalized_unit, comparable: false }));
      if (rows.length) cards.push({ id: `nstj:${s.series}:${level}`, title: `SORS / ${level} · ${s.label}`, kind: "map", layer: "serbia_nstj_archive", targetId: s.series, coverage: summarize(rows) });
    }
  }
  return { id: workspace.id, title: workspace.title[locale], introduction: workspace.introduction[locale], questions: workspace.questions.map(q => q[locale]), warnings: workspace.warnings.map(q => q[locale]), coverageNote: workspace.coverageNote[locale], comparisonDimensions: workspace.comparisonDimensions[locale], horizon: workspace.defaultTimeHorizon, countries: researchCountries.map(country => ({ id: country.slug, name: locale === "en" ? country.name : country.name_zh })), cards, methods,
    eventTypes: workspace.eventTypes,
    events: researchEvents.filter(event => event.data_status === "verified" && event.source_url && (workspace.eventTypes.includes(event.event_type) || workspace.eventTopics.includes(event.topic ?? ""))).sort((a, b) => b.date.localeCompare(a.date)).map(event => ({ id: event.id, country: event.country_slug, date: event.date, title: event.title, language: event.language, type: event.event_type, topic: event.topic ?? "", source: source(event.source_name, event.source_url!, "verified_event") })) };
}
export function workspaceSummaries(locale: Locale) {
  return researchWorkspaces.map(workspace => {
    const payload = buildWorkspaceEvidence(workspace, locale);
    const coverage = payload.cards.flatMap(card => card.coverage).filter(row => row.periods.length);
    const periods = coverage.flatMap(row => row.periods).sort();
    return { id: workspace.id, title: payload.title, introduction: payload.introduction, countries: payload.countries.filter(country => coverage.some(row => row.country === country.id)).map(country => country.name), from: periods[0] ?? "—", to: periods.at(-1) ?? "—", warnings: payload.warnings, coverageNote: payload.coverageNote };
  });
}
