import type { Locale } from "@/i18n/config";
import { electionInstitutionalContext } from "./institutionalRegistry";
import type { BallotElection, ElectionBallot } from "./politicalBallots";
import { chamberSeats, turnoutForDisplay, type PoliticalElectionView, type PoliticalSource } from "./politicalExplorer";

type Segment = { label: string; seats: number };
type Attribution = Segment & { contestantId: string | null; voteType: string | null; sourceId: string | null };
export type HistoryObservation = {
  id: string; country: string; chamber: string; chamberId: string | null; date: string; dateBasis?: string | null;
  ballot: string | null; voteType: string | null; scope: string; turnout: number | null;
  published: boolean; numerator: number | null; denominator: number | null; definition: string | null;
  turnoutSources: PoliticalSource[]; seats: number | null; segments: Segment[]; attribution?: Attribution[]; sources: PoliticalSource[];
};

export function nationalHistoryObservation(e: PoliticalElectionView, locale: Locale): HistoryObservation {
  const en = locale === "en";
  const turnout = turnoutForDisplay(e);
  const basis = e.national?.turnout;
  const tiers = e.national?.seatTiers;
  const segments: Segment[] = [];
  if (tiers) {
    const independent = tiers.independentConstituency ?? 0;
    segments.push({label: en ? "National list seats" : "全国名单席位", seats: tiers.nationalList},
      {label: independent > 0 ? (en ? "District seats attributed to list contestants" : "归属名单参选方的单选区席位") : (en ? "Single-member district seats" : "单一议席选区席位"), seats: tiers.constituency - independent});
    if (independent > 0) segments.push({label: en ? "Independent district seats" : "独立候选人单选区席位", seats: independent});
  } else {
    for (const r of e.results) {
      const seats = chamberSeats(r, e);
      if (seats !== null && seats > 0) segments.push({label: r.nativeLabel, seats});
    }
  }
  // Chamber attribution includes both list ballots. Each source row is an election-specific identity.
  let attribution: Attribution[] | undefined;
  if (tiers && e.national?.chamberAttribution === "complete") {
    const parts: Attribution[] = e.national.ballots.flatMap(b => b.results.flatMap(r =>
      r.chamberSeats != null && r.chamberSeats > 0
        ? [{label:r.nativeLabel, seats:r.chamberSeats, contestantId:r.contestantId, voteType:b.definition.id, sourceId:r.chamberSeatSourceId ?? r.sourceId}]
        : []));
    if (tiers.independentConstituency) parts.push({
      label:en ? "Independent district seats" : "独立候选人单选区席位", seats:tiers.independentConstituency,
      contestantId:null, voteType:null, sourceId:null,
    });
    if (parts.reduce((sum,part)=>sum+part.seats,0)===e.totalSeats) attribution=parts;
  }
  const ids = basis?.sourceIds ?? [];
  return {
    id: e.electionId, country: e.country ?? "germany", chamber: e.chamber ?? "—", chamberId: electionInstitutionalContext(e.electionId)?.chamber_id ?? null, date: e.date,
    ballot: null, voteType: e.system.voteType, scope: en ? "National turnout" : "全国投票率",
    turnout: turnout.value, published: turnout.value !== null && !turnout.computed, numerator: e.voters,
    denominator: e.eligibleVoters, definition: basis?.definition ?? e.turnoutDefinition ?? null,
    turnoutSources: ids.length ? e.sources.filter(s => ids.includes(s.id)) : e.sources,
    seats: e.totalSeats, segments, attribution, sources: e.sources,
  };
}

export function ballotHistoryObservation(e: BallotElection, selected: ElectionBallot | null, locale: Locale): HistoryObservation {
  const b = selected ? e.ballots.find(b => b.geography === selected.geography && b.voteType === selected.voteType) : undefined;
  const institution = electionInstitutionalContext(e.id);
  const chamberId = e.country === "croatia" && institution?.chamber_official_name !== e.chamber ? null : institution?.chamber_id ?? null;
  const territorial = !selected ? e.territorialTurnout : null;
  const turnoutSources = b?.turnoutSourceIds ?? territorial?.sourceIds ?? [];
  return {
    id: e.id, country: e.country, chamber: e.chamber, chamberId, date: e.date, dateBasis: e.dateBasis,
    ballot: b?.geography ?? territorial?.geography ?? null,
    voteType: b?.voteType ?? null, scope: selected?.label[locale] ?? (territorial
      ? (locale === "en" ? "Territorial constituencies I–X" : "境内第 I 至 X 选区")
      : (locale === "en" ? "Choose an admitted ballot for turnout" : "选择已收录选票查看投票率")),
    turnout: b?.turnout ?? territorial?.value ?? null,
    published: b?.turnoutPublished ?? territorial?.published ?? false,
    numerator: b?.turnoutVoters ?? territorial?.numerator ?? null, denominator: b?.eligible ?? territorial?.denominator ?? null, definition: b?.turnoutDefinition ?? territorial?.definition ?? null,
    turnoutSources: e.sources.filter(s => turnoutSources.includes(s.id)), seats: e.seatSlots ?? e.totalSeats,
    segments: e.composition.map(s => ({label:s.label[locale], seats:s.seats})), sources:e.sources,
  };
}
