import { localizedRoute, type Locale } from "@/i18n/config";
import type { WorkspaceEvidenceCard, WorkspacePayload } from "@/components/workspaceEvidence";
export type WorkspaceSelection = { countries: string[]; from: number; to: number };
export function workspaceToolLink(path: string, locale: Locale, params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") query.set(key, String(value));
  return `${localizedRoute(path, locale)}${query.size ? `?${query}` : ""}`;
}
export function periodsInRange(periods: string[], selection: WorkspaceSelection) {
  return periods.filter(period => Number(period.slice(0, 4)) >= selection.from && Number(period.slice(0, 4)) <= selection.to);
}
export function evidenceLink(card: WorkspaceEvidenceCard, country: string, selection: WorkspaceSelection, locale: Locale) {
  if (card.layer === "regional_history") return "/research-data/regional_descriptive_history.json";
  if (card.layer === "serbia_nstj_archive") return "/research-data/serbia/serbia_descriptive_history_regional.json";
  if (card.kind === "sors") return workspaceToolLink("/data/", locale, { tab: "high_frequency", country, sors_series: card.targetId });
  if (card.kind === "map") return workspaceToolLink("/map/", locale, { country, layer: card.targetId, year: periodsInRange(card.coverage.find(row => row.country === country)?.periods ?? [], selection).at(-1) });
  if (card.kind === "macro_drivers") return workspaceToolLink("/data/", locale, { tab: "macro_drivers", driver: card.targetId, area: country, transformation: "level", history: card.layer === "historical_monthly" ? 1 : 0 });
  return workspaceToolLink("/data/", locale, { tab: card.kind === "high_frequency" ? "high_frequency" : "annual", country, indicator: card.targetId, from: selection.from, to: selection.to, history: card.layer.startsWith("historical") ? 1 : 0, sors: 0 });
}
export function workspaceLinks(payload: WorkspacePayload, selection: WorkspaceSelection, locale: Locale) {
  return {
    data: payload.cards.filter(card => card.kind !== "map").flatMap(card => selection.countries.filter(country => periodsInRange(card.coverage.find(row => row.country === country)?.periods ?? [], selection).length).map(country => ({ evidence: card.id, country, url: evidenceLink(card, country, selection, locale) }))),
    map: payload.cards.filter(card => card.kind === "map").flatMap(card => selection.countries.filter(country => periodsInRange(card.coverage.find(row => row.country === country)?.periods ?? [], selection).length).map(country => ({ evidence: card.id, country, url: evidenceLink(card, country, selection, locale) }))),
    models: payload.methods.filter(method => method.state === "active").map(method => ({ skill: method.id, url: workspaceToolLink("/models/", locale, { skill: method.id, country: method.supportsCountry ? selection.countries[0] : undefined }) })),
    events: selection.countries.flatMap(country => payload.eventTypes.map(type => ({ country, type, url: workspaceToolLink("/news/", locale, { country, type, from: `${selection.from}-01-01`, to: `${selection.to}-12-31` }) }))),
  };
}
export function comparisonAllowed(card: WorkspaceEvidenceCard, selection: WorkspaceSelection) {
  if (selection.countries.length < 2) return true;
  const rows = selection.countries.map(country => card.coverage.find(row => row.country === country));
  return card.kind === "annual" && card.layer === "canonical_annual" && rows.every(row => row?.comparable && row.units.length === 1 && row.units[0] === rows[0]?.units[0]) && periodsInRange(rows[0]?.periods ?? [], selection).some(period => rows.every(row => row?.periods.includes(period)));
}
