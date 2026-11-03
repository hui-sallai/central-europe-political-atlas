// Imported only by the Politics server routes, never the global data module.
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
import czMembers from "@/data/political/czechia/contestant_members.json";
import czParties from "@/data/political/czechia/political_parties.json";
import czLinks from "@/data/political/czechia/party_identity_links.json";
import plElections from "@/data/political/poland/elections.json";
import plTurnout from "@/data/political/poland/election_turnout.json";
import plResults from "@/data/political/poland/election_results.json";
import plContestants from "@/data/political/poland/electoral_contestants.json";
import plLegislatures from "@/data/political/poland/legislatures.json";
import plSystems from "@/data/political/poland/electoral_systems.json";
import plSources from "@/data/political/poland/political_source_registry.json";
import plMembers from "@/data/political/poland/contestant_members.json";
import plParties from "@/data/political/poland/political_parties.json";
import plLinks from "@/data/political/poland/party_identity_links.json";
import skElections from "@/data/political/slovakia/elections.json";
import skTurnout from "@/data/political/slovakia/election_turnout.json";
import skResults from "@/data/political/slovakia/election_results.json";
import skContestants from "@/data/political/slovakia/electoral_contestants.json";
import skLegislatures from "@/data/political/slovakia/legislatures.json";
import skSystems from "@/data/political/slovakia/electoral_systems.json";
import skSources from "@/data/political/slovakia/political_source_registry.json";
import type { PoliticalCountryView, PoliticalElectionView } from "./politicalExplorer";
import { electionViewsFromStores, type PoliticalStores } from "./politicalStores";
import { politicalPublicationProblems } from "./politicalNational";
import type { PoliticalIdentityLink } from "./politicalIdentity";
import { continuityEntities, type ContinuityParty } from "./politicalContinuity";

export function politicalElectionViews(): PoliticalElectionView[] {
  const views = electionViewsFromStores({ elections, turnout, results, contestants, legislatures, systems, sources, members }, {
    slug: "germany", name: { en: "Germany", "zh-CN": "德国" }, originalLanguage: "de",
    voteLabel: { en: "Second votes (party-list vote)", "zh-CN": "第二票（政党名单票）" },
  });
  for(const view of views)if(politicalPublicationProblems(view.country!,view.sources,["germany"]).length)throw Error("Political source publication gate failed");
  return views;
}

/**
 * Czechia's admitted elections (2017, 2021, 2025): docs/political-data/czechia_ps2025_admission.json and
 * docs/political-data/czechia_ps2017_2021_admission.json, with exact-hash political admission records.
 */
export function politicalCzechElectionViews(): PoliticalElectionView[] {
  const elections = electionViewsFromStores({ elections: czElections, turnout: czTurnout, results: czResults, contestants: czContestants, legislatures: czLegislatures, systems: czSystems, sources: czSources, members: czMembers } as PoliticalStores, {
    slug: "czechia", name: { en: "Czechia", "zh-CN": "捷克" }, originalLanguage: "cs",
    voteLabel: { en: "List votes", "zh-CN": "名单票" },
  });
  for (const view of elections) if (politicalPublicationProblems(view.country!, view.sources, ["czechia"]).length) throw Error("Political source publication gate failed");
  return elections;
}

/** Reviewed Czech identity links (verified and explicitly unresolved) from the official registers. */
export function politicalCzechIdentityLinks(): PoliticalIdentityLink[] {
  return czLinks as PoliticalIdentityLink[];
}

/** Per-entity list participation for the priority Czech parties and the coalition with a repeated composition. */
export function politicalCzechContinuity() {
  return continuityEntities(politicalCzechElectionViews(), politicalCzechIdentityLinks(), czParties as ContinuityParty[]);
}

/** Poland's admitted Sejm elections (2011–2023): docs/political-data/poland_sejm_admission.json. */
export function politicalPolishElectionViews(): PoliticalElectionView[] {
  const elections = electionViewsFromStores({ elections: plElections, turnout: plTurnout, results: plResults, contestants: plContestants, legislatures: plLegislatures, systems: plSystems, sources: plSources, members: plMembers } as PoliticalStores, {
    slug: "poland", name: { en: "Poland", "zh-CN": "波兰" }, originalLanguage: "pl",
    voteLabel: { en: "List votes", "zh-CN": "名单票" },
  });
  for (const view of elections) if (politicalPublicationProblems(view.country!, view.sources, ["poland"]).length) throw Error("Political source publication gate failed");
  return elections;
}

/** Polish identity links: same party register number (verified) or identical committee name only (unresolved). */
export function politicalPolishIdentityLinks(): PoliticalIdentityLink[] {
  return plLinks as PoliticalIdentityLink[];
}

export function politicalPolishContinuity() {
  return continuityEntities(politicalPolishElectionViews(), politicalPolishIdentityLinks(), plParties as ContinuityParty[]);
}

/** Slovakia's admitted National Council election (2023): docs/political-data/slovakia_nrsr2023_admission.json. */
export function politicalSlovakElectionViews(): PoliticalElectionView[] {
  const elections = electionViewsFromStores({ elections: skElections, turnout: skTurnout, results: skResults, contestants: skContestants, legislatures: skLegislatures, systems: skSystems, sources: skSources } as PoliticalStores, {
    slug: "slovakia", name: { en: "Slovakia", "zh-CN": "斯洛伐克" }, originalLanguage: "sk",
    voteLabel: { en: "List votes", "zh-CN": "名单票" },
  });
  for (const view of elections) if (politicalPublicationProblems(view.country!, view.sources, ["slovakia"]).length) throw Error("Political source publication gate failed");
  return elections;
}

/**
 * Other countries with authorised, published election stores, for cross-country comparison. A country is added here only
 * after explicit owner authorisation, a closed admission gate record and an exact-hash political admission record.
 * Candidate packages in staging are never imported.
 */
export function politicalComparisonCountries(): PoliticalCountryView[] {
  return [czechCountry(), polishCountry(), slovakCountry()];
}

const germanCountry = (): PoliticalCountryView => ({ slug: "germany", name: { en: "Germany", "zh-CN": "德国" }, elections: politicalElectionViews() });
function czechCountry(): PoliticalCountryView { return { slug: "czechia", name: { en: "Czechia", "zh-CN": "捷克" }, elections: politicalCzechElectionViews() }; }
function slovakCountry(): PoliticalCountryView { return { slug: "slovakia", name: { en: "Slovakia", "zh-CN": "斯洛伐克" }, elections: politicalSlovakElectionViews() }; }
function polishCountry(): PoliticalCountryView { return { slug: "poland", name: { en: "Poland", "zh-CN": "波兰" }, elections: politicalPolishElectionViews() }; }

/** Comparison countries for the Czech, Polish and Slovak views of the explorer. */
export function politicalCzechComparisonCountries(): PoliticalCountryView[] { return [germanCountry(), polishCountry(), slovakCountry()]; }
export function politicalPolishComparisonCountries(): PoliticalCountryView[] { return [germanCountry(), czechCountry(), slovakCountry()]; }
export function politicalSlovakComparisonCountries(): PoliticalCountryView[] { return [germanCountry(), czechCountry(), polishCountry()]; }
