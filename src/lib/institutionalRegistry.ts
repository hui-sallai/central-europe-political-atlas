// Canonical ten-country political-institutions registry (owner brief 2026-11-16).
// Country records are authored in src/lib/institutions/countries/*.json and validated by
// scripts/institutions/build-institutions.mjs, which also derives election_links.json from the election stores.
// Every view reads institutional facts from here, so one correction to a country record reaches all of them.
import meta from "@/lib/institutions/meta.json";
import links from "@/lib/institutions/election_links.json";
import poland from "@/lib/institutions/countries/poland.json";
import hungary from "@/lib/institutions/countries/hungary.json";
import czechia from "@/lib/institutions/countries/czechia.json";
import slovakia from "@/lib/institutions/countries/slovakia.json";
import germany from "@/lib/institutions/countries/germany.json";
import romania from "@/lib/institutions/countries/romania.json";
import slovenia from "@/lib/institutions/countries/slovenia.json";
import serbia from "@/lib/institutions/countries/serbia.json";
import austria from "@/lib/institutions/countries/austria.json";
import croatia from "@/lib/institutions/countries/croatia.json";

export type Bilingual = { en: string; zh: string };
export type FieldStatus = "verified" | "partially_verified" | "pending" | "not_applicable";
export type Comparability = "direct" | "qualified" | "not_comparable";
export type InstitutionalSource = { source_id: string; publisher: string; title: string; url: string; kind: string; language: string; version: string; retrieved_on: string; retrieval_sha256: string | null; access: "manual_download" | "browser_reading" };
export type InstitutionalField = { value: string | number | null; label: Bilingual; detail?: Bilingual; steps?: Bilingual[]; articles: string | null; source_ids: string[]; status: FieldStatus; comparability?: Comparability; effective_from?: string | null; store_rule_record?: string };
export type Chamber = { chamber_id: string; official_name: string; name: Bilingual; role: "lower" | "upper" | "sole" | "federal_council" | "interest_council"; store_chamber?: string; members: { value: number | null; basis: Bilingual; articles: string; source_ids: string[] }; term_years: number | null; selection: { code: string; label: Bilingual; articles: string; source_ids?: string[] }; powers: Bilingual; note: Bilingual | null };
export type Office = { office_id: string; role: "head_of_state" | "head_of_government"; official_name: string; name: Bilingual; selection: { label: Bilingual; articles: string }; term_years: number | null; term_limit: Bilingual | null; source_ids: string[] };
export type ElectoralRule = { rule_id: string; chamber_id: string; status: FieldStatus; summary: Bilingual; constituencies: Bilingual | null; allocation: Bilingual | null; thresholds?: { applies_to: Bilingual; percent: number; articles?: string }[]; thresholds_from_store?: boolean; threshold_note?: Bilingual; minority: Bilingual | null; legal_basis: string; source_ids: string[]; store_rule_record: string | null };
export type InstitutionalChange = { change_id: string; dimension: string; title: Bilingual; adopted: string | null; promulgated: string | null; effective: string | null; effective_note?: Bilingual; previous: Bilingual | null; new: Bilingual; legal_basis: string; source_ids: string[]; status: "verified" | "partially_verified"; note?: Bilingual };
export type CaseStudySection = { id: "structure" | "formation" | "accountability" | "electoral" | "limits" | "changes" | "rules_vs_practice"; title: Bilingual; text: Bilingual; source_ids: string[] };
export type InstitutionalCountry = {
  schema_version: string; country: string; iso2: string; verified_on: string; baseline_status: "complete" | "partial"; case_study: boolean; overview: Bilingual;
  constitution: { id: string; official_name: string; name: Bilingual; adopted: string | null; in_force: string | null; in_force_note?: Bilingual; publication: string | null; current_text: { as_of: string; note: Bilingual }; source_ids: string[] };
  chambers: Chamber[]; offices: Office[]; fields: Record<string, InstitutionalField>; electoral_systems: ElectoralRule[]; changes: InstitutionalChange[];
  case_study_sections: CaseStudySection[]; pending: { field: string; reason: Bilingual }[]; sources: InstitutionalSource[];
};
export type ElectionInstitutionalLink = { election_id: string; country: string; date: string; chamber_id: string | null; chamber_official_name: string | null; seats: number | null; seat_count_basis: string | null; electoral_system_id: string; system_family: string | null; allocation_method: string | null; base_seats: number | null; thresholds: { applies_to: string; percent: number; description: Bilingual | null }[]; rule_basis: string | null; constitution_id: string; institutional_period_id: string | null; changes_in_force: string[]; later_changes: string[]; undated_changes: string[] };
export type InstitutionalPeriod = { period_id: string; from: string; to_exclusive: string | null; opened_by: string[] };

const RECORDS = { poland, hungary, czechia, slovakia, germany, romania, slovenia, serbia, austria, croatia } as unknown as Record<string, InstitutionalCountry>;
const LINKS = links as unknown as { periods: Record<string, InstitutionalPeriod[]>; elections: ElectionInstitutionalLink[] };
export const institutionMeta = meta as unknown as {
  countries: string[]; case_study_countries: string[]; verified_on: string; method: Bilingual;
  comparison_fields: { id: string; group: string; label: Bilingual }[]; groups: Record<string, Bilingual>;
  value_labels: Record<string, Bilingual>; status_labels: Record<FieldStatus, Bilingual>; chamber_roles: Record<Chamber["role"], Bilingual>;
};
export const institutionCountrySlugs: readonly string[] = institutionMeta.countries;
export const comparisonFields = institutionMeta.comparison_fields;
export const text = (value: Bilingual | null | undefined, en: boolean) => (value ? (en ? value.en : value.zh) : null);

export function institutionalCountry(slug: string): InstitutionalCountry | undefined { return RECORDS[slug]; }
export function countrySources(slug: string, ids?: readonly string[]): InstitutionalSource[] {
  const c = RECORDS[slug]; if (!c) return [];
  return ids ? c.sources.filter((s) => ids.includes(s.source_id)) : c.sources;
}
export function headOf(slug: string, role: Office["role"]) { return RECORDS[slug]?.offices.find((o) => o.role === role); }

// Chamber names as one display string, in chamber order ("Sejm and Senate").
export function chamberNames(slug: string, en: boolean) {
  const names = (RECORDS[slug]?.chambers ?? []).map((ch) => (en ? ch.name.en : ch.name.zh));
  return names.length ? names.join(en ? " and " : "与") : null;
}

// One cell of the comparison workspace. Missing or pending fields stay explicit; nothing is filled.
export function comparisonCell(slug: string, fieldId: string, en: boolean) {
  const f = RECORDS[slug]?.fields[fieldId];
  if (!f) return { status: "pending" as FieldStatus, label: en ? "No record" : "无记录", detail: null, articles: null, sources: [], comparability: "not_comparable" as Comparability, valueLabel: null, value: null };
  return {
    status: f.status, value: f.value, label: text(f.label, en)!, detail: text(f.detail, en), articles: f.articles,
    valueLabel: typeof f.value === "string" ? text(institutionMeta.value_labels[f.value], en) : null,
    comparability: f.comparability ?? (f.status === "verified" ? "direct" : "not_comparable"),
    sources: countrySources(slug, f.source_ids).map((s) => ({ title: s.title, url: s.url, publisher: s.publisher })),
  };
}

// Two to four countries; rows follow the meta field order. Returns null for an invalid selection.
export function compareInstitutions(slugs: readonly string[], en: boolean) {
  if (slugs.length < 2 || slugs.length > 4 || new Set(slugs).size !== slugs.length || !slugs.every((s) => s in RECORDS)) return null;
  return comparisonFields.map((f) => ({ field: f.id, group: f.group, label: text(f.label, en)!, cells: slugs.map((slug) => ({ slug, ...comparisonCell(slug, f.id, en) })) }));
}

// Dated changes first in date order (effective date, else promulgation, else adoption); undated changes last.
export const changeDate = (ch: InstitutionalChange) => ch.effective ?? ch.promulgated ?? ch.adopted ?? null;
export function institutionalTimeline(slug: string) {
  const changes = [...(RECORDS[slug]?.changes ?? [])];
  return changes.sort((a, b) => (changeDate(a) ?? "9999").localeCompare(changeDate(b) ?? "9999") || a.change_id.localeCompare(b.change_id));
}
export function institutionalPeriods(slug: string): InstitutionalPeriod[] { return LINKS.periods[slug] ?? []; }
export function electionInstitutionalContext(electionId: string) { return LINKS.elections.find((e) => e.election_id === electionId); }
export function countryElectionLinks(slug: string) { return LINKS.elections.filter((e) => e.country === slug); }
export function caseStudy(slug: string) { return RECORDS[slug]?.case_study_sections ?? []; }
