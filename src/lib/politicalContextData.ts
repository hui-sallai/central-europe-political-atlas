// Server-only presentation inputs. No new stores, identities or research outputs.
import { researchObservations, researchIndicators, researchEvents } from "./researchData";
import highFrequency from "@/data/high-frequency/high_frequency_observations.json";
import { CONTEXT_ANNUAL_IDS, CONTEXT_MONTHLY_IDS } from "./politicalEconomicContext";

export function politicalContextData(country: string) {
  const monthlyMetadata = [...new Map(highFrequency.records.filter(r=>r.country===country&&CONTEXT_MONTHLY_IDS.includes(r.indicator)).map(r=>[`${r.indicator}:${r.unit}:${r.definition_version}`,{country:r.country,indicator:r.indicator,unit:r.unit,source_url:r.source_url,source_dataset:r.source_dataset,definition_version:r.definition_version,seasonal_adjustment:r.seasonal_adjustment,revision_status:r.revision_status}])).values()];
  return { observations:researchObservations.filter(o=>o.country_slug===country&&CONTEXT_ANNUAL_IDS.includes(o.indicator)),indicators:researchIndicators.filter(i=>CONTEXT_ANNUAL_IDS.includes(i.id)),events:researchEvents.filter(e=>e.country_slug===country&&e.data_status==="verified"),monthlyMetadata };
}
