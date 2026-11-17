import type { Locale } from "@/i18n/config";
import {
  eventMappings, indicatorCatalogue, limitationLibrary, relationshipLabel, researchCases, researchThemes,
  thematicMeta, type MappingLayer,
} from "@/lib/thematicResearch";
import { thematicIndicatorLabel } from "./thematicIndicatorLabel";

function availablePeriod(layer: MappingLayer, date: string) {
  if (!layer.coverage || !layer.explorer_key) return [];
  const { first, last, count } = layer.coverage;
  const year = date.slice(0, 4);
  const completeAnnualRun = layer.frequency === "annual" && count === Number(last) - Number(first) + 1;
  const eventYearHeld = completeAnnualRun && year >= first && year <= last;
  return [{
    key: layer.explorer_key, layer: layer.layer, frequency: layer.frequency,
    from: eventYearHeld ? year : first, to: eventYearHeld ? year : last,
  }];
}

// Project only the reviewed evidence and links used by Event Library cards. The generated
// index also contains observation windows, which stay on the server.
export function eventThemeNavigation(locale: Locale) {
  const en = locale === "en";
  const language = en ? "en" : "zh";
  return Object.fromEntries(eventMappings.map(mapping => {
    const links = researchThemes.filter(theme => mapping.theme_ids.includes(theme.theme_id)).map(theme => {
      const cases = researchCases.filter(c => c.event_ids.includes(mapping.event_id) && c.theme_ids.includes(theme.theme_id));
      return { theme: theme.theme_id, title: theme.title[language], caseId: cases.length === 1 ? cases[0].case_id : undefined };
    });
    const indicators = mapping.indicators.map(row => {
      const catalogue = indicatorCatalogue.find(item => item.indicator_id === row.indicator_id && item.registry_name);
      const nationalLink = !row.pending && !row.region_id && thematicMeta.countries.includes(row.geo)
        && ["A", "B", "C"].includes(row.relationship);
      return {
        id: row.indicator_id, country: row.geo, label: thematicIndicatorLabel(row.indicator_id, en, catalogue?.registry_name),
        relationship: relationshipLabel(row.relationship, en), hypothesis: row.relationship === "C",
        connection: row.connection[language],
        limitations: row.limitations.map(id => limitationLibrary[id]?.[language]).filter((v): v is string => !!v),
        periods: nationalLink ? row.layers.flatMap(layer => availablePeriod(layer, mapping.date)) : [],
      };
    });
    return [mapping.event_id, {
      links, indicators, summary: mapping.summary[language],
      classification: relationshipLabel(mapping.classification, en),
      status: thematicMeta.evidence_status[mapping.evidence_status]?.[language],
      reason: mapping.reason_code ? thematicMeta.reason_codes[mapping.reason_code]?.[language] : undefined,
    }] as const;
  }));
}
export type EventThemeNavigation = ReturnType<typeof eventThemeNavigation>;
