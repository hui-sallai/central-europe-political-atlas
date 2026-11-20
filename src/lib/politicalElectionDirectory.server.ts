// Compact server-rendered metadata for country entry points. Full ballot rows stay on election pages.
import {cache} from "react";
import {electionInstitutionalContext} from "./institutionalRegistry";
import {admittedCountrySlugs, politicalAdmissions} from "./politicalAdmission";
import {isBallotCountry, politicalBallotElections, type BallotElection} from "./politicalBallots";
import {politicalComparisonCountries, politicalElectionViews} from "./politicalData";
import {turnoutForDisplay, type PoliticalElectionView, type PoliticalLocalText, type PoliticalSource} from "./politicalExplorer";

export type DirectoryDate = {id: string; year: number; date: string; chamber: string; dateNeedsCheck?: boolean};
export type DirectoryResultType = "votes" | "points" | "seats" | "turnout";
export type DirectoryElection = DirectoryDate & {
  seats: number | null; slots: number | null; rules: PoliticalLocalText;
  turnout: number | null; turnoutPublished: boolean; turnoutScope: "national" | "general" | "territorial" | "constituencies";
  composition: {label: PoliticalLocalText; seats: number}[]; sources: PoliticalSource[];
  availableResults: DirectoryResultType[];
};
export type ElectionDirectoryCountry = {
  slug: string; name: PoliticalLocalText; history: DirectoryDate[]; latest: DirectoryElection[];
  ruleRecords: number; datedPeriods: number; availableResults: DirectoryResultType[];
};

function nationalSummary(election: PoliticalElectionView): DirectoryElection {
  const turnout = turnoutForDisplay(election);
  const availableResults: DirectoryResultType[] = [];
  if (election.results.some(row => row.secondVotes !== null)) availableResults.push("votes");
  if (election.totalSeats !== null) availableResults.push("seats");
  if (turnout.value !== null) availableResults.push("turnout");
  return {
    id: election.electionId, date: election.date, year: election.year, chamber: election.chamber ?? "",
    availableResults, seats: election.totalSeats, slots: null, rules: election.notes, sources: election.sources,
    turnout: turnout.value, turnoutPublished: !turnout.computed, turnoutScope: "national", composition: [],
  };
}

function ballotSummary(election: BallotElection): DirectoryElection {
  const national = election.ballots.find(ballot => ballot.geography === "national");
  const territorial = election.territorialTurnout;
  const rows = election.ballots.flatMap(ballot => ballot.results);
  const availableResults: DirectoryResultType[] = [];
  if (rows.some(row => row.votes !== null)) availableResults.push("votes");
  if (rows.some(row => row.points !== null)) availableResults.push("points");
  availableResults.push("seats");
  if (territorial?.value != null || election.ballots.some(ballot => ballot.turnout !== null)) availableResults.push("turnout");
  return {
    id: election.id, date: election.date, year: election.year, chamber: election.chamber,
    dateNeedsCheck: election.dateBasis?.includes("background_to_verify") ?? false,
    availableResults, seats: election.totalSeats, slots: election.seatSlots, composition: election.composition,
    rules: election.rules, sources: election.sources, turnout: territorial ? territorial.value : national?.turnout ?? null,
    turnoutPublished: territorial ? territorial.published : national?.turnoutPublished ?? false,
    turnoutScope: territorial ? "territorial" : !national ? "constituencies" : election.country === "slovenia" ? "general" : "national",
  };
}

export const electionDirectory = cache((): ElectionDirectoryCountry[] => {
  const traditional = [
    {slug:"germany", elections:politicalElectionViews()},
    ...politicalComparisonCountries(),
  ];
  return admittedCountrySlugs.map(slug => {
    const admission = politicalAdmissions.find(row => row.slug === slug)!;
    const summaries = isBallotCountry(slug)
      ? politicalBallotElections(slug).map(ballotSummary)
      : (traditional.find(country => country.slug === slug)?.elections ?? []).map(nationalSummary);
    if (!summaries.length) throw new Error("Missing election metadata for admitted route: " + slug);
    const sorted = summaries.toSorted((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const latestDate = sorted[sorted.length - 1].date;
    const links = sorted.map(election => electionInstitutionalContext(election.id));
    return {slug, name:admission.name,
      availableResults:[...new Set(sorted.flatMap(election => election.availableResults))],
      ruleRecords:links.filter(link => link?.electoral_system_id).length,
      datedPeriods:links.filter(link => link?.institutional_period_id).length,
      history:sorted.map(({id,year,date,chamber,dateNeedsCheck}) => ({id,year,date,chamber,dateNeedsCheck})),
      latest:sorted.filter(election => election.date === latestDate)};
  });
});
