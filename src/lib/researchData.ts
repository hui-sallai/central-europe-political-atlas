import countriesJson from "@/data/countries/countries.json";
import eventsJson from "@/data/events/events.json";
import indicatorsJson from "@/data/indicators/indicators.json";
import observationsJson from "@/data/observations/observations.json";
import projectsJson from "@/data/projects/projects.json";
import sourcesJson from "@/data/sources/sources.json";
import type {
  Country,
  DataEnvelope,
  Event,
  Indicator,
  Observation,
  Project,
  Source,
} from "@/types/researchData";

function records<T>(value: unknown) {
  return (value as DataEnvelope<T>).records;
}

export const researchCountries = records<Country>(countriesJson);
export const researchIndicators = records<Indicator>(indicatorsJson);
export const researchObservations = records<Observation>(observationsJson);
export const researchSources = records<Source>(sourcesJson);
export const researchEvents = records<Event>(eventsJson);
export const researchProjects = records<Project>(projectsJson);

export function getResearchCountryBySlug(slug: string) {
  return researchCountries.find((country) => country.slug === slug);
}

export function getResearchIndicator(indicatorId: string) {
  return researchIndicators.find((indicator) => indicator.id === indicatorId);
}

export function getResearchSource(sourceId: string) {
  return researchSources.find((source) => source.id === sourceId);
}

export function getCountryObservations(countrySlug: string, indicatorId?: string) {
  return researchObservations
    .filter((observation) => observation.country_slug === countrySlug && (!indicatorId || observation.indicator === indicatorId))
    .sort((a, b) => a.year - b.year);
}

export function getObservation(countrySlug: string, indicatorId: string, year: number) {
  return researchObservations.find(
    (observation) => observation.country_slug === countrySlug && observation.indicator === indicatorId && observation.year === year,
  );
}

export function getLatestObservation(countrySlug: string, indicatorId: string) {
  return getCountryObservations(countrySlug, indicatorId).at(-1);
}

export function getLatestEventForCountry(countrySlug: string) {
  return getEventsForCountry(countrySlug)[0];
}

export function getEventsForCountry(countrySlug: string) {
  return researchEvents
    .filter((event) => event.country_slug === countrySlug)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getEventsForIndicator(indicatorId: string, countrySlug?: string) {
  return researchEvents
    .filter((event) => event.affected_indicator.includes(indicatorId) && (!countrySlug || event.country_slug === countrySlug))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getEventsForProject(projectId: string) {
  return researchEvents
    .filter((event) => event.related_project_ids.includes(projectId))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getResearchProject(projectId: string) {
  return researchProjects.find((project) => project.id === projectId);
}

export function getProjectsForIndicator(indicatorId: string, countrySlug?: string) {
  return researchProjects.filter(
    (project) => project.related_indicator_ids.includes(indicatorId) && (!countrySlug || project.country_slug === countrySlug),
  );
}

export function getProjectsForCountry(countrySlug: string) {
  return researchProjects.filter((project) => project.country_slug === countrySlug);
}
