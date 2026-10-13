// Imported only by the two Politics server routes, never the global data module.
import elections from "@/data/political/germany/elections.json";
import turnout from "@/data/political/germany/election_turnout.json";
import results from "@/data/political/germany/election_results.json";
import contestants from "@/data/political/germany/electoral_contestants.json";
import legislatures from "@/data/political/germany/legislatures.json";
import systems from "@/data/political/germany/electoral_systems.json";
import sources from "@/data/political/germany/political_source_registry.json";
import type { PoliticalCountryView, PoliticalElectionView } from "./politicalExplorer";
import { electionViewsFromStores } from "./politicalStores";

export function politicalElectionViews(): PoliticalElectionView[] {
  return electionViewsFromStores({ elections, turnout, results, contestants, legislatures, systems, sources }, {
    slug: "germany", name: { en: "Germany", "zh-CN": "德国" }, originalLanguage: "de",
    voteLabel: { en: "Second votes (party-list vote)", "zh-CN": "第二票（政党名单票）" },
  });
}

/**
 * Other countries with authorised, published election stores, for cross-country comparison. Empty: Germany is the only
 * production country. A country is added here only after explicit owner authorisation and an updated source registry;
 * candidate packages in staging are never imported.
 */
export function politicalComparisonCountries(): PoliticalCountryView[] {
  return [];
}
