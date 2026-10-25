// Imported only by the two Politics server routes, never the global data module.
import elections from "@/data/political/germany/elections.json";
import turnout from "@/data/political/germany/election_turnout.json";
import results from "@/data/political/germany/election_results.json";
import contestants from "@/data/political/germany/electoral_contestants.json";
import legislatures from "@/data/political/germany/legislatures.json";
import systems from "@/data/political/germany/electoral_systems.json";
import sources from "@/data/political/germany/political_source_registry.json";
import members from "@/data/political/germany/contestant_members.json";
import czElections from "@/data/political/czechia/elections.json";
import czTurnout from "@/data/political/czechia/election_turnout.json";
import czResults from "@/data/political/czechia/election_results.json";
import czContestants from "@/data/political/czechia/electoral_contestants.json";
import czLegislatures from "@/data/political/czechia/legislatures.json";
import czSystems from "@/data/political/czechia/electoral_systems.json";
import czSources from "@/data/political/czechia/political_source_registry.json";
import type { PoliticalCountryView, PoliticalElectionView } from "./politicalExplorer";
import { electionViewsFromStores, type PoliticalStores } from "./politicalStores";
import { politicalPublicationProblems } from "./politicalNational";

export function politicalElectionViews(): PoliticalElectionView[] {
  const views = electionViewsFromStores({ elections, turnout, results, contestants, legislatures, systems, sources, members }, {
    slug: "germany", name: { en: "Germany", "zh-CN": "德国" }, originalLanguage: "de",
    voteLabel: { en: "Second votes (party-list vote)", "zh-CN": "第二票（政党名单票）" },
  });
  for(const view of views)if(politicalPublicationProblems(view.country!,view.sources,["germany"]).length)throw Error("Political source publication gate failed");
  return views;
}

/**
 * Other countries with authorised, published election stores, for cross-country comparison. A country is added here only
 * after explicit owner authorisation, a closed admission gate record and an exact-hash political admission record
 * (Czechia 2025: docs/political-data/czechia_ps2025_admission.json). Candidate packages in staging are never imported.
 */
export function politicalComparisonCountries(): PoliticalCountryView[] {
  const elections = electionViewsFromStores({ elections: czElections, turnout: czTurnout, results: czResults, contestants: czContestants, legislatures: czLegislatures, systems: czSystems, sources: czSources } as PoliticalStores, {
    slug: "czechia", name: { en: "Czechia", "zh-CN": "捷克" }, originalLanguage: "cs",
    voteLabel: { en: "List votes", "zh-CN": "名单票" },
  });
  for (const view of elections) if (politicalPublicationProblems(view.country!, view.sources, ["czechia"]).length) throw Error("Political source publication gate failed");
  return [{ slug: "czechia", name: { en: "Czechia", "zh-CN": "捷克" }, elections }];
}
