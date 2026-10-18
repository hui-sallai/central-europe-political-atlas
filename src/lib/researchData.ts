import countriesJson from "@/data/countries/countries.json";
import eventsJson from "@/data/events/events.json";
import indicatorsJson from "@/data/indicators/indicators.json";
import observationsJson from "@/data/observations/observations.json";
import projectsJson from "@/data/projects/projects.json";
import { weeklyNews20261011 } from "./weeklyNews/2026-10-11";
import { weeklyNews20261018 } from "./weeklyNews/2026-10-18";
import { toEventRecord } from "./newsData";
import type {
  Country,
  DataEnvelope,
  Event,
  Indicator,
  Observation,
  Project,
} from "@/types/researchData";

function records<T>(value: unknown) {
  return (value as DataEnvelope<T>).records;
}

export const researchCountries = records<Country>(countriesJson);
export const researchIndicators = records<Indicator>(indicatorsJson);
export const researchObservations = records<Observation>(observationsJson);
// Preserve frozen historical records; append the approved weekly batches in memory only.
const historicalEvents = records<Event>(eventsJson);
const historicalEventIds = new Set(historicalEvents.map(event => event.id));
export const researchEvents: Event[] = [
  ...historicalEvents,
  ...[...weeklyNews20261011, ...weeklyNews20261018].filter(item => !historicalEventIds.has(item.id)).map(item => ({
    ...toEventRecord(item),
    id: item.id,
    country: researchCountries.find(country => country.slug === item.countrySlug)?.iso3 ?? item.countrySlug,
    country_slug: item.countrySlug,
    country_name: item.countryZh,
    data_status: "verified" as const,
    title: item.title,
    topic: item.topic,
    summary: item.summary,
    source_name: item.sourceLabel,
    source_url: item.sourceUrl ?? null,
    language: item.language,
  })),
];
export const researchProjects = records<Project>(projectsJson);

export function getResearchCountryBySlug(slug: string) {
  return researchCountries.find((country) => country.slug === slug);
}

export function getResearchIndicator(indicatorId: string) {
  return researchIndicators.find((indicator) => indicator.id === indicatorId);
}

export function getCountryObservations(countrySlug: string, indicatorId?: string) {
  return researchObservations
    .filter((observation) => observation.country_slug === countrySlug && (!indicatorId || observation.indicator === indicatorId))
    .sort((a, b) => a.year - b.year);
}

export function getLatestObservation(countrySlug: string, indicatorId: string) {
  return getCountryObservations(countrySlug, indicatorId).at(-1);
}

export function getEventsForCountry(countrySlug: string) {
  return researchEvents
    .filter((event) => event.country_slug === countrySlug)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getResearchProject(projectId: string) {
  return researchProjects.find((project) => project.id === projectId);
}

export function getProjectsForCountry(countrySlug: string) {
  return researchProjects.filter((project) => project.country_slug === countrySlug);
}
