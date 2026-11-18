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
import huElections from "@/data/political/hungary/elections.json";
import huTurnout from "@/data/political/hungary/election_turnout.json";
import huResults from "@/data/political/hungary/election_results.json";
import huContestants from "@/data/political/hungary/electoral_contestants.json";
import huLegislatures from "@/data/political/hungary/legislatures.json";
import huSystems from "@/data/political/hungary/electoral_systems.json";
import huSources from "@/data/political/hungary/political_source_registry.json";
import rsElections from "@/data/political/serbia/elections.json";
import rsTurnout from "@/data/political/serbia/election_turnout.json";
import rsResults from "@/data/political/serbia/election_results.json";
import rsContestants from "@/data/political/serbia/electoral_contestants.json";
import rsLegislatures from "@/data/political/serbia/legislatures.json";
import rsSystems from "@/data/political/serbia/electoral_systems.json";
import rsSources from "@/data/political/serbia/political_source_registry.json";
import hrElections from "@/data/political/croatia/elections.json";
import hrTurnout from "@/data/political/croatia/election_turnout.json";
import hrResults from "@/data/political/croatia/election_results.json";
import hrContestants from "@/data/political/croatia/electoral_contestants.json";
import hrLegislatures from "@/data/political/croatia/legislatures.json";
import hrSystems from "@/data/political/croatia/electoral_systems.json";
import hrSources from "@/data/political/croatia/political_source_registry.json";
import siElections from "@/data/political/slovenia/elections.json";
import siTurnout from "@/data/political/slovenia/election_turnout.json";
import siResults from "@/data/political/slovenia/election_results.json";
import siContestants from "@/data/political/slovenia/electoral_contestants.json";
import siLegislatures from "@/data/political/slovenia/legislatures.json";
import siSystems from "@/data/political/slovenia/electoral_systems.json";
import siSources from "@/data/political/slovenia/political_source_registry.json";
import roElections from "@/data/political/romania/elections.json";
import roTurnout from "@/data/political/romania/election_turnout.json";
import roResults from "@/data/political/romania/election_results.json";
import roContestants from "@/data/political/romania/electoral_contestants.json";
import roLegislatures from "@/data/political/romania/legislatures.json";
import roSystems from "@/data/political/romania/electoral_systems.json";
import roSources from "@/data/political/romania/political_source_registry.json";
import atElections from "@/data/political/austria/elections.json";
import atTurnout from "@/data/political/austria/election_turnout.json";
import atResults from "@/data/political/austria/election_results.json";
import atContestants from "@/data/political/austria/electoral_contestants.json";
import atLegislatures from "@/data/political/austria/legislatures.json";
import atSystems from "@/data/political/austria/electoral_systems.json";
import atSources from "@/data/political/austria/political_source_registry.json";
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

/** Hungary's admitted National Assembly elections (2022, 2026), national list tier: docs/political-data/hungary_ogy_admission.json. */
export function politicalHungarianElectionViews(): PoliticalElectionView[] {
  const elections = electionViewsFromStores({ elections: huElections, turnout: huTurnout, results: huResults, contestants: huContestants, legislatures: huLegislatures, systems: huSystems, sources: huSources } as PoliticalStores, {
    slug: "hungary", name: { en: "Hungary", "zh-CN": "匈牙利" }, originalLanguage: "hu",
    voteLabel: { en: "Party-list votes", "zh-CN": "政党名单票" },
  });
  for (const view of elections) if (politicalPublicationProblems(view.country!, view.sources, ["hungary"]).length) throw Error("Political source publication gate failed");
  return elections;
}

/** Serbia's admitted National Assembly elections (2020, 2022, 2023, 2026), whole chamber: docs/political-data/serbia_nsk_admission.json, serbia_nsk2023_admission.json and serbia_nsk2022_2023_admission.json. */
export function politicalSerbianElectionViews(): PoliticalElectionView[] {
  const elections = electionViewsFromStores({ elections: rsElections, turnout: rsTurnout, results: rsResults, contestants: rsContestants, legislatures: rsLegislatures, systems: rsSystems, sources: rsSources } as PoliticalStores, {
    slug: "serbia", name: { en: "Serbia", "zh-CN": "塞尔维亚" }, originalLanguage: "sr",
    voteLabel: { en: "Electoral-list votes", "zh-CN": "选举名单票" },
  });
  for (const view of elections) if (politicalPublicationProblems(view.country!, view.sources, ["serbia"]).length) throw Error("Political source publication gate failed");
  return elections;
}

/** Raw admitted stores for a country whose results are not a single national table (constituencies, separate minority
 * elections). The national view builder (electionViewsFromStores) does not apply to them; the publication gate still does. */
export type PoliticalConstituencyStores = { elections: unknown[]; turnout: unknown[]; results: unknown[]; contestants: unknown[]; legislatures: unknown[]; systems: unknown[]; sources: PoliticalStores["sources"] };
function gatedStores(country: string, stores: PoliticalConstituencyStores): PoliticalConstituencyStores {
  const sources = stores.sources.map((s) => ({ id: s.source_id, title: s.dataset, url: s.url, sha256: s.raw_sha256, retrievedAt: s.retrieved_at, licenceUrl: s.licence_url, institution: s.institution }));
  if (politicalPublicationProblems(country, sources, [country]).length) throw Error("Political source publication gate failed");
  return stores;
}

/** Croatia's admitted Croatian Parliament elections (2015, 2016, 2020, 2024), whole chamber per constituency (hr-ie-01…11)
 * and per national-minority election (hr-ie-12-*): docs/political-data/croatia_sabor_admission.json. */
export function politicalCroatianStores(): PoliticalConstituencyStores {
  return gatedStores("croatia", { elections: hrElections, turnout: hrTurnout, results: hrResults, contestants: hrContestants, legislatures: hrLegislatures, systems: hrSystems, sources: hrSources as PoliticalStores["sources"] });
}

/** Slovenia's admitted National Assembly election (2026): general election (national) and the Italian and Hungarian
 * national-community elections (si-nc-*): docs/political-data/slovenia_dz_admission.json. */
export function politicalSlovenianStores(): PoliticalConstituencyStores {
  return gatedStores("slovenia", { elections: siElections, turnout: siTurnout, results: siResults, contestants: siContestants, legislatures: siLegislatures, systems: siSystems, sources: siSources as PoliticalStores["sources"] });
}

/** Romania's admitted Parliament elections of 2016 and 2024: separate election records per chamber and year (2016 from
 * AEP files, turnout not published; 2024 from the BEC final acts): docs/political-data/romania_parliament2024_admission.json.
 * The chambers must never be combined. */
export function politicalRomanianStores(): PoliticalConstituencyStores {
  return gatedStores("romania", { elections: roElections, turnout: roTurnout, results: roResults, contestants: roContestants, legislatures: roLegislatures, systems: roSystems, sources: roSources as PoliticalStores["sources"] });
}

/** Austria's admitted Nationalrat elections (2013, 2017, 2019, 2024), whole chamber (183 seats), national level; seats by
 * tier for 2019 and 2024: docs/political-data/austria_nationalrat_admission.json. */
export function politicalAustrianStores(): PoliticalConstituencyStores {
  return gatedStores("austria", { elections: atElections, turnout: atTurnout, results: atResults, contestants: atContestants, legislatures: atLegislatures, systems: atSystems, sources: atSources as PoliticalStores["sources"] });
}

/**
 * Other countries with authorised, published election stores, for cross-country comparison. A country is added here only
 * after explicit owner authorisation, a closed admission gate record and an exact-hash political admission record.
 * Candidate packages in staging are never imported.
 */
export function politicalComparisonCountries(): PoliticalCountryView[] {
  return [czechCountry(), polishCountry(), slovakCountry(), hungarianCountry(), serbianCountry()];
}

const germanCountry = (): PoliticalCountryView => ({ slug: "germany", name: { en: "Germany", "zh-CN": "德国" }, elections: politicalElectionViews() });
function czechCountry(): PoliticalCountryView { return { slug: "czechia", name: { en: "Czechia", "zh-CN": "捷克" }, elections: politicalCzechElectionViews() }; }
function slovakCountry(): PoliticalCountryView { return { slug: "slovakia", name: { en: "Slovakia", "zh-CN": "斯洛伐克" }, elections: politicalSlovakElectionViews() }; }
function hungarianCountry(): PoliticalCountryView { return { slug: "hungary", name: { en: "Hungary", "zh-CN": "匈牙利" }, elections: politicalHungarianElectionViews() }; }
function polishCountry(): PoliticalCountryView { return { slug: "poland", name: { en: "Poland", "zh-CN": "波兰" }, elections: politicalPolishElectionViews() }; }
function serbianCountry(): PoliticalCountryView { return { slug: "serbia", name: { en: "Serbia", "zh-CN": "塞尔维亚" }, elections: politicalSerbianElectionViews() }; }

/** Comparison countries for the Serbian view. */
export function politicalSerbianComparisonCountries(): PoliticalCountryView[] { return [germanCountry(), czechCountry(), polishCountry(), slovakCountry(), hungarianCountry()]; }

/** Comparison countries for the Czech, Polish, Slovak and Hungarian views of the explorer (Serbia added 2026-11-15). */
export function politicalCzechComparisonCountries(): PoliticalCountryView[] { return [germanCountry(), polishCountry(), slovakCountry(), hungarianCountry(), serbianCountry()]; }
export function politicalPolishComparisonCountries(): PoliticalCountryView[] { return [germanCountry(), czechCountry(), slovakCountry(), hungarianCountry(), serbianCountry()]; }
export function politicalSlovakComparisonCountries(): PoliticalCountryView[] { return [germanCountry(), czechCountry(), polishCountry(), hungarianCountry(), serbianCountry()]; }
export function politicalHungarianComparisonCountries(): PoliticalCountryView[] { return [germanCountry(), czechCountry(), polishCountry(), slovakCountry(), serbianCountry()]; }
