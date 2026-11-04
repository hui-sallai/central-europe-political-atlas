// Pure view of how one legal party or one repeated coalition took part across elections. A coalition's votes and seats
// are shown only as the coalition's own total and are never assigned to a member. A change is given only between two
// lists joined by a verified link; everything else is an explicit non-comparable period.
import type { PoliticalElectionView } from "./politicalExplorer";
import { partyLinkDifference, sourceVerifiedPartySeries, type PoliticalIdentityLink } from "./politicalIdentity";

export type ContinuityParty = { atlas_party_id: string; entity_kind: string; abbreviation: string | null; abbreviation_at_lists?: string; registered_name: string | null; continuous_series_eligible: boolean; legal_register_citation: string | null; identity_evidence?: { report_year: number; citation: string; url: string }[] };
export type ContinuityStatus = "own_list" | "coalition_list" | "coalition_member" | "no_list";
export type ContinuityRow = {
  electionId: string; year: number; vintage: string; status: ContinuityStatus; contestantId: string | null; label: string | null;
  /** Own-list total, or the coalition's own total when the entity is the coalition. Null for a member of a coalition. */
  share: number | null; seats: number | null;
  coalition: { label: string; share: number | null; seats: number | null; memberCount: number } | null;
  change: { fromYear: number; shareChange: number | null; seatsChange: number | null; rulesChanged: boolean; acrossCoalitionPeriod: boolean; acrossMissingList?: boolean } | null;
};
export type ContinuityEntity = { id: string; label: string; kind: string; registerUrl: string | null; evidenceLinks?: { reportYear: number; citation: string; url: string }[]; rows: ContinuityRow[] };

export const rulesChanged = (a: PoliticalElectionView, b: PoliticalElectionView) => a.system.allocationMethod !== b.system.allocationMethod || JSON.stringify(a.national?.rules.thresholds?.map((t) => t.percent)) !== JSON.stringify(b.national?.rules.thresholds?.map((t) => t.percent));
const sorted = (elections: PoliticalElectionView[]) => [...elections].sort((a, b) => a.date.localeCompare(b.date));
const byId = (elections: PoliticalElectionView[], id: string) => elections.find((e) => e.electionId === id)!;

function partyEntity(party: ContinuityParty, elections: PoliticalElectionView[], links: PoliticalIdentityLink[]): ContinuityEntity {
  const verified = links.filter((l) => l.relation === "same_party" && l.status === "verified");
  const rows = sorted(elections).map((e): ContinuityRow => {
    const own = e.results.find((r) => r.partyId === party.atlas_party_id);
    const member = own ? null : e.results.find((r) => r.memberPartyIds?.includes(party.atlas_party_id));
    const base = { electionId: e.electionId, year: e.year, vintage: e.resultVintage, change: null };
    if (own) {
      const edge = verified.find((l) => l.toElection === e.electionId && l.toContestant === own.contestantId);
      const from = edge ? byId(elections, edge.fromElection) : null;
      const difference = edge && from ? partyLinkDifference(edge, from, e) : null;
      return { ...base, status: "own_list", contestantId: own.contestantId, label: own.nativeLabel, share: own.publishedVoteShare, seats: own.seats, coalition: null, change: difference && from ? { fromYear: from.year, shareChange: difference.shareChange, seatsChange: difference.seatsChange, rulesChanged: rulesChanged(from, e), acrossCoalitionPeriod: Boolean(edge?.intervening_coalition_lists?.length), acrossMissingList: Boolean(edge?.elections_without_own_list?.length) } : null };
    }
    if (member) return { ...base, status: "coalition_member", contestantId: member.contestantId, label: null, share: null, seats: null, coalition: { label: member.nativeLabel, share: member.publishedVoteShare, seats: member.seats, memberCount: member.memberPartyIds?.length ?? 0 } };
    return { ...base, status: "no_list", contestantId: null, label: null, share: null, seats: null, coalition: null };
  });
  return { id: party.atlas_party_id, label: party.abbreviation_at_lists ? `${party.abbreviation} (${party.abbreviation_at_lists})` : party.abbreviation ?? party.registered_name ?? party.atlas_party_id, kind: party.entity_kind, registerUrl: party.legal_register_citation, evidenceLinks: party.identity_evidence?.map((e) => ({ reportYear: e.report_year, citation: e.citation, url: e.url })), rows };
}

function coalitionEntity(chain: PoliticalIdentityLink[], elections: PoliticalElectionView[]): ContinuityEntity {
  const ids = new Map(chain.flatMap((l) => [[l.fromElection, l.fromContestant], [l.toElection, l.toContestant]] as [string, string][]));
  const rows = sorted(elections).map((e): ContinuityRow => {
    const list = e.results.find((r) => r.contestantId === ids.get(e.electionId));
    const base = { electionId: e.electionId, year: e.year, vintage: e.resultVintage };
    if (!list) return { ...base, status: "no_list", contestantId: null, label: null, share: null, seats: null, coalition: null, change: null };
    const edge = chain.find((l) => l.toElection === e.electionId);
    const from = edge ? byId(elections, edge.fromElection) : null;
    const previous = from?.results.find((r) => r.contestantId === edge!.fromContestant);
    const diff = (x: number | null | undefined, y: number | null) => (x === null || x === undefined || y === null ? null : y - x);
    return { ...base, status: "coalition_list", contestantId: list.contestantId, label: list.nativeLabel, share: list.publishedVoteShare, seats: list.seats, coalition: null, change: from && previous ? { fromYear: from.year, shareChange: diff(previous.publishedVoteShare, list.publishedVoteShare), seatsChange: diff(previous.seats, list.seats), rulesChanged: rulesChanged(from, e), acrossCoalitionPeriod: false } : null };
  });
  return { id: `coalition:${chain[0].fromContestant}`, label: rows.find((r) => r.label)?.label ?? chain[0].fromContestant, kind: "coalition", registerUrl: null, rows };
}

export function continuityEntities(elections: PoliticalElectionView[], links: PoliticalIdentityLink[], parties: ContinuityParty[]) {
  const coalitions = links.filter((l) => l.relation === "same_coalition_composition" && l.status === "verified");
  const unresolved = links.filter((l) => l.relation === "same_party" && l.status === "unresolved").map((l) => {
    const a = byId(elections, l.fromElection), b = byId(elections, l.toElection);
    return { fromYear: a.year, toYear: b.year, fromLabel: a.results.find((r) => r.contestantId === l.fromContestant)!.nativeLabel, toLabel: b.results.find((r) => r.contestantId === l.toContestant)!.nativeLabel, nameChanged: Boolean(l.code_list_name_changed) };
  });
  return {
    entities: [...parties.filter((p) => p.continuous_series_eligible).map((p) => partyEntity(p, elections, links)), ...coalitions.map((l) => coalitionEntity([l], elections))],
    unresolved,
  };
}

/** Election-to-election rows for verified units only, earlier election first: party series and repeated coalitions. */
export function linkedUnitComparison(elections: PoliticalElectionView[], links: PoliticalIdentityLink[], x: PoliticalElectionView, y: PoliticalElectionView) {
  const [a, b] = x.date <= y.date ? [x, y] : [y, x];
  const row = (id: string, label: string, kind: "party" | "coalition", idA: string, idB: string) => {
    const ra = a.results.find((r) => r.contestantId === idA)!, rb = b.results.find((r) => r.contestantId === idB)!;
    const diff = (p: number | null, q: number | null) => (p === null || q === null ? null : q - p);
    return { id, label, kind, a: ra, b: rb, shareChange: diff(ra.publishedVoteShare, rb.publishedVoteShare), seatsChange: diff(ra.seats, rb.seats) };
  };
  const parties = sourceVerifiedPartySeries(sorted(elections), links).flatMap((series) => {
    const la = series.links.find((l) => l.electionId === a.electionId), lb = series.links.find((l) => l.electionId === b.electionId);
    return la && lb && a.electionId !== b.electionId ? [row(series.id, series.label, "party", la.contestantId, lb.contestantId)] : [];
  });
  const coalitions = links.filter((l) => l.relation === "same_coalition_composition" && l.status === "verified" && l.fromElection === a.electionId && l.toElection === b.electionId).map((l) => row(`coalition:${l.fromContestant}`, a.results.find((r) => r.contestantId === l.fromContestant)!.nativeLabel, "coalition", l.fromContestant, l.toContestant));
  return { a, b, rulesChanged: rulesChanged(a, b), rows: [...parties, ...coalitions] };
}
