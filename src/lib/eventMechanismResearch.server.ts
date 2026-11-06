// Build-time assembly of the E1 records: reads the same committed runtime files the site serves, runs the D4 protocol to
// find the admitted election pair around each event, and takes the pressure models' own outputs for the years around it.
// Server only; the result passed to the page is small and contains no candidate or person data.
import fs from "node:fs";
import path from "node:path";
import countriesJson from "@/data/countries/countries.json";
import type { Country, DataEnvelope } from "@/types/researchData";
import { eventCaseStudies } from "./eventCaseStudies";
import { getEventAnalysis } from "./eventAnalysisLinks";
import { getCountryObservations, getResearchIndicator, researchEvents } from "./researchData";
import { politicalContextData } from "./politicalContextData";
import { contextAnnualPoints, contextMonthlyPoints } from "./politicalEconomicContext";
import { politicalCzechElectionViews, politicalElectionViews, politicalHungarianElectionViews, politicalPolishElectionViews, politicalSlovakElectionViews } from "./politicalData";
import { runResearchCase } from "./comparativeResearchCase";
import { calculateModelOutputForYear, modelCards } from "./modelFramework";
import { buildEventMechanismRecord, monthsFrom, type EventMechanismRecord, type MechanismPoliticalContext } from "./eventMechanismResearch";

const read = <T,>(p: string): T => JSON.parse(fs.readFileSync(path.join(process.cwd(), p), "utf8")) as T;
const countries = (countriesJson as unknown as DataEnvelope<Country>).records;
const MODEL_IDS = ["household_economic_pressure", "fiscal_pressure"];
const FIRST_MODEL_YEAR = 2021;

let cache: EventMechanismRecord[] | null = null;
export function eventMechanismRecords(): EventMechanismRecord[] {
  if (cache) return cache;
  const inputs = politicalContextData("germany");
  const points = [...contextAnnualPoints(inputs.observations, read("public/research-data/annual_history_runtime.json"), inputs.indicators), ...contextMonthlyPoints(read("public/research-data/monthly_history_runtime.json"), read<{ records: never[] }>("public/research-data/high_frequency_runtime.json").records, inputs.monthlyMetadata)];
  const elections = [...politicalElectionViews(), ...politicalCzechElectionViews(), ...politicalPolishElectionViews(), ...politicalSlovakElectionViews(), ...politicalHungarianElectionViews()];
  const study = runResearchCase(elections, points, inputs.identityLinks ?? [], inputs.researchCaseModels);
  cache = eventCaseStudies.flatMap((s) => {
    const event = researchEvents.find((e) => e.event_id === s.event_id), analysis = getEventAnalysis(s.event_id);
    if (!event || !analysis) return [];
    const pair = study.pairs.find((p) => p.country === event.country_slug && p.fromDate < event.date && event.date < p.toDate) ?? null;
    const country = countries.find((c) => c.slug === event.country_slug);
    const models: MechanismPoliticalContext["models"] = country ? MODEL_IDS.map((id) => {
      const card = modelCards.find((c) => c.model_id === id)!;
      const years = Array.from({ length: 10 }, (_, i) => FIRST_MODEL_YEAR + i);
      return { modelId: id, formulaVersion: card.formula_version, weightVersion: card.weight_version, years: years.map((year) => { const out = calculateModelOutputForYear(country, card, year); return { year, score: out.score, availability: out.availability, inputs: out.inputs.map((x) => ({ indicator: x.indicator_id, value: x.raw_value, observationId: x.observation_id, sourceUrl: x.source_url })) }; }).filter((y, i, all) => y.score !== null || all.slice(i).some((z) => z.score !== null)) };
    }) : [];
    const electionOf = (id: string) => elections.find((e) => e.electionId === id)!;
    const sourcesOf = (id: string) => { const e = electionOf(id); const ids = new Set(e.national?.turnout.sourceIds ?? []); return e.sources.filter((x) => ids.has(x.id)).map((x) => ({ electionId: id, id: x.id, institution: x.institution ?? null, url: x.url })); };
    const political: MechanismPoliticalContext = {
      interval: pair ? {
        country: pair.country, fromElection: pair.fromElection, fromDate: pair.fromDate, toElection: pair.toElection, toDate: pair.toDate,
        monthsAfterFrom: monthsFrom(pair.fromDate, event.date), monthsBeforeTo: monthsFrom(event.date, pair.toDate),
        turnoutChange: pair.turnout.change, turnoutBasis: pair.turnout.basis, verifiedListMovement: pair.lists.verifiedShareMovement, identityBasis: pair.lists.identityBasis,
        indicators: pair.indicators.map((i) => ({ indicator: i.indicator, fromPeriod: i.primary.fromPeriod, toPeriod: i.primary.toPeriod, change: i.primary.change, status: i.primary.status, reason: i.primary.reason })),
        models: pair.models.map((m) => ({ modelId: m.modelId, fromYear: m.fromYear, toYear: m.toYear, fromScore: m.fromScore, toScore: m.toScore, change: m.change, status: m.status, reason: m.reason })),
        electionSources: [...sourcesOf(pair.fromElection), ...sourcesOf(pair.toElection)],
        studyPath: `/politics/${pair.country}/?research_study=d4`,
      } : null,
      models,
    };
    const nameOf = (id: string) => { const i = getResearchIndicator(id); return { en: i?.name ?? id, zh: i?.name_zh ?? id }; };
    return [buildEventMechanismRecord(s, event, analysis, (id) => getCountryObservations(event.country_slug, id), nameOf, political)];
  });
  return cache;
}
