import type { PoliticalLocalText, PoliticalSource } from "./politicalExplorer";
import { politicalAustrianStores, politicalCroatianStores, politicalRomanianStores, politicalSlovenianStores, type PoliticalConstituencyStores } from "./politicalData";

export type BallotCountrySlug = "austria" | "croatia" | "romania" | "slovenia";
export type BallotCategory = "national" | "territorial" | "diaspora" | "minority" | "county";
export type SeatDetail = { key?: string; label: PoliticalLocalText; seats: number };
export type BallotResult = {
  id: string; contestantId: string; name: string; votes: number | null; points: number | null;
  publishedShare: number | null; derivedShare: number | null; printedShareNote: number | null;
  seats: number | null; seatDetails: SeatDetail[]; sourceIds: string[];
};
export type ElectionBallot = {
  geography: string; category: BallotCategory; label: PoliticalLocalText; voteType: string;
  voteLabel: PoliticalLocalText; shareBasis: "valid_votes" | "ballots_cast" | "candidate_votes" | "points" | "unavailable";
  totalSeats: number; turnout: number | null; turnoutPublished: boolean; turnoutDefinition: string; turnoutSourceIds: string[];
  turnoutVoters: number | null; printedTurnoutNote: number | null; eligible: number | null; voters: number | null; valid: number | null;
  invalid: number | null; cast: number | null; sourceIds: string[]; results: BallotResult[];
};
export type BallotElection = {
  id: string; country: BallotCountrySlug; date: string; dateBasis: string | null; repeatPollDate: string | null; year: number; chamber: string;
  legislatureId: string; systemId: string; totalSeats: number; seatSlots: number | null;
  compositionBasis: "mechanisms"|"parties"; composition: SeatDetail[]; rules: PoliticalLocalText; ruleDetails: PoliticalLocalText[];
  territorialTurnout: { geography: string; value: number | null; published: boolean; numerator: number | null; denominator: number | null; definition: string; sourceIds: string[] } | null;
  districts: string[]; sources: PoliticalSource[]; ballots: ElectionBallot[];
};

const loaders = {
  austria: politicalAustrianStores,
  croatia: politicalCroatianStores,
  romania: politicalRomanianStores,
  slovenia: politicalSlovenianStores,
};

export function isBallotCountry(country: string): country is BallotCountrySlug {
  return Object.hasOwn(loaders, country);
}

type Provenanced = { provenance: { source_id: string }[] };
type ElectionRow = Provenanced & {
  election_id: string; date: string; date_basis?: string; repeat_poll_date?: string | null; year: number; chamber: string; chamber_printed?: string;
  legislature_id: string; electoral_system_id: string;
  constituency_structure?: { constituencies?: string[]; unit: string }[];
};
type ResultRow = Provenanced & {
  result_id: string; contestant_ref: string; election_id: string; geography: string; vote_type: string; total_seats: number;
  votes: number | null; points?: number; seats: number | null; published_vote_share: number | null; derived_vote_share: number | null;
  printed_vote_share_not_reproduced?: number; printed_share_of_all_candidate_votes?: number;
} & Partial<Record<SeatDetailKey, number | null>>;
type TurnoutRow = Provenanced & {
  election_id: string; geography: string; vote_type: string; published_turnout: number | null; derived_turnout: number | null;
  turnout_definition: string; printed_turnout_not_reproduced?: number; eligible_voters: number | null; voters: number | null;
  voters_turned_out?: number | null; valid_votes: number | null; invalid_votes: number | null; ballots_cast: number | null;
};
type SystemRow = Provenanced & {
  electoral_system_id: string; notes: PoliticalLocalText; interval_basis: string;
  vote_definitions: { id: string; label: PoliticalLocalText; denominator: string | null; sourceIds: string[] }[];
  national_rules: {
    thresholds: { description: PoliticalLocalText; sourceIds: string[] }[] | null; minorityRepresentation: PoliticalLocalText | null;
    diasporaRepresentation?: PoliticalLocalText; totalSeatsDefinition: PoliticalLocalText | null; sourceIds: string[];
  };
};
type LegislatureRow = Provenanced & {
  legislature_id: string; chamber_printed?: string; total_seats: number; seat_slots?: number;
  seats_by_mechanism?: Record<string, number>; seats_by_party?: Record<string, number>;
  seats_by_national_minority?: { constituency: string; minority: string; seats: number }[];
  seats_by_national_minority_constituency?: { constituency: string; seat_printed: string; seats: number }[];
  seats_by_county?: { constituency: string; county: string }[];
  seats_by_constituency?: { constituency: number; name: string }[];
  seats_by_land?: { name: string; regional: { constituency: string; name: string }[] }[];
};
type ContestantRow = Provenanced & { election_id: string; contestant_id: string; historical_display_label: string };

const bi = (en: string, zh: string): PoliticalLocalText => ({ en, "zh-CN": zh });

const seatMechanisms: Record<string, PoliticalLocalText> = {
  single_member_colleges: bi("Single-member colleges", "单一议席选区"),
  additional_seats: bi("Additional seats", "增补席位"),
  national_minority_organisations: bi("National-minority organisations", "少数民族组织"),
  list_seats_43_constituencies: bi("List seats in 43 constituencies", "43 个选区的名单席位"),
  list_seats_43_constituencies_filled: bi("Filled list seats in 43 constituencies", "43 个选区已分配的名单席位"),
  unfilled: bi("Unfilled seats", "空缺席位"),
  general_lists: bi("General lists", "一般名单"),
  italian_national_community: bi("Italian national community", "意大利族民族共同体"),
  hungarian_national_community: bi("Hungarian national community", "匈牙利族民族共同体"),
  national_lists: bi("National lists", "全国名单"),
  single_member_constituencies: bi("Single-member constituencies", "单一议席选区"),
  national_minorities_special_constituencies: bi("National-minority constituencies", "少数民族特别选区"),
  serbian_community_from_national_lists: bi("Serbian community members declared elected from national lists", "从全国名单宣布当选的塞尔维亚族代表"),
  minorities_under_8_percent_from_national_lists: bi("Other minority members declared elected from national lists", "从全国名单宣布当选的其他少数民族代表"),
  counties: bi("Members elected by counties", "各郡选出的议员"),
  special_lists_abroad: bi("Special lists abroad", "境外特别名单"),
  national_minorities: bi("National-minority seats", "少数民族席位"),
  territorial_constituencies: bi("Territorial constituencies", "地域选区"),
  constituency_abroad: bi("Constituency abroad", "境外选区"),
};

const seatDetailLabels = {
  regional_seats: bi("Regional stage", "区域阶段席位"),
  land_seats: bi("Land stage", "州级阶段席位"),
  federal_seats: bi("Federal stage", "联邦阶段席位"),
  constituency_stage_seats: bi("Constituency stage", "选区阶段席位"),
  national_stage_seats: bi("National stage", "全国阶段席位"),
  list_seats: bi("List seats", "名单席位"),
  minority_seats: bi("Minority seats", "少数民族席位"),
  absolute_majority_college_wins: bi("Absolute-majority college wins", "单一选区绝对多数胜选"),
  first_stage_seats: bi("First-stage seats", "第一阶段席位"),
  national_stage_entitlement: bi("National-stage entitlement", "全国阶段配额"),
  undeployed_seats: bi("Unassigned entitlement", "未分配配额"),
  members_declared_elected_from_list: bi("Additional members declared elected from this list", "从此名单另行宣布当选的议员"),
};
type SeatDetailKey = keyof typeof seatDetailLabels;
const seatKeys = Object.keys(seatDetailLabels) as SeatDetailKey[];

function sourceIds(...records: Provenanced[]) {
  return [...new Set(records.flatMap(record => record.provenance.map(p => p.source_id)))];
}

function composition(legislature: LegislatureRow): SeatDetail[] {
  if (legislature.seats_by_mechanism) {
    return Object.entries(legislature.seats_by_mechanism).map(([key, seats]) => {
      const label = seatMechanisms[key];
      if (!label) throw Error("Unknown admitted seat mechanism: " + key);
      return {key, label, seats};
    });
  }
  return Object.entries(legislature.seats_by_party ?? {}).map(([name, seats]) => ({label: bi(name, name), seats}));
}

const minorityNames: Record<string, string> = {
  "Serbian": "塞尔维亚族", "Hungarian": "匈牙利族", "Italian": "意大利族", "Czech and Slovak": "捷克族和斯洛伐克族",
  "Albanian, Bosniak, Montenegrin, Macedonian and Slovenian": "阿尔巴尼亚族、波什尼亚克族、黑山族、马其顿族与斯洛文尼亚族",
  "Austrian, German, Rusyn, Ukrainian and Jewish": "奥地利族、德意志族、卢森尼亚族、乌克兰族与犹太族",
  "Austrian, Bulgarian, German, Polish, Roma, Romanian, Rusyn, Russian, Turkish, Ukrainian, Vlach and Jewish": "奥地利族、保加利亚族、德意志族、波兰族、罗姆族、罗马尼亚族、卢森尼亚族、俄罗斯族、土耳其族、乌克兰族、弗拉赫族与犹太族",
};

function ballotScope(geography: string, election: ElectionRow, legislature: LegislatureRow): {label: PoliticalLocalText; category: BallotCategory} {
  if (geography === "national") return {label: bi("National ballot", "全国投票"), category: "national"};
  const group = election.constituency_structure?.find(g => g.constituencies?.includes(geography));
  const districtNumber = Number(geography.split("-").at(-1));
  switch (group?.unit) {
    case "national_list": return {label: bi("National-list tier", "全国名单层级"), category: "national"};
    case "national_community": {
      const label = geography === "si-nc-italijanska" ? seatMechanisms.italian_national_community : seatMechanisms.hungarian_national_community;
      return {label, category: "minority"};
    }
    case "county": {
      const name = legislature.seats_by_county?.find(r => r.constituency === geography)?.county ?? geography;
      return {label: bi(name,name), category: "county"};
    }
    case "diaspora":
    case "special_list_abroad": return {label: bi("Constituency abroad", "境外选区"), category:"diaspora"};
    case "territorial":
    case "single_member": return {label: bi("Constituency " + districtNumber, "第 " + districtNumber + " 选区"), category: "territorial"};
    case "national_minority": {
      const community = legislature.seats_by_national_minority?.find(r => r.constituency === geography)?.minority;
      if (community) return {category:"minority", label:bi(community, minorityNames[community] ?? community)};
      const place = legislature.seats_by_national_minority_constituency?.find(r => r.constituency === geography)?.seat_printed;
      return {category:"minority", label:bi("Special constituency " + districtNumber + (place ? " · " + place : ""), "特别选区 " + districtNumber + (place ? " · " + place : ""))};
    }
    default: throw Error("Missing published ballot scope: " + election.election_id + "/" + geography);
  }
}

function projectBallot(election: ElectionRow, legislature: LegislatureRow, system: SystemRow, turnout: TurnoutRow,
    rows: ResultRow[], contestants: Map<string, ContestantRow>): ElectionBallot {
  const definition = system.vote_definitions.find(v => v.id === turnout.vote_type);
  if (!definition || !rows.length) throw Error("Unresolved ballot: " + election.election_id + "/" + turnout.geography);
  const scoped = ballotScope(turnout.geography, election, legislature);
  const shareBasis: ElectionBallot["shareBasis"] = rows.some(r => r.points != null) ? "points"
    : rows.some(r => r.printed_share_of_all_candidate_votes != null) ? "candidate_votes"
    : rows.every(r => r.published_vote_share == null && r.derived_vote_share == null) ? "unavailable"
    : definition.denominator === "ballots_cast" ? "ballots_cast" : definition.denominator === "valid_votes" ? "valid_votes" : "unavailable";
  const results = rows.map(row => {
    const contestant = contestants.get(row.contestant_ref);
    if (!contestant || contestant.election_id !== election.election_id || row.total_seats !== rows[0].total_seats) throw Error("Invalid contest scope: " + row.result_id);
    const seatDetails = seatKeys.flatMap(key => row[key] == null ? [] : [{key, label: seatDetailLabels[key], seats: row[key]}]);
    return {
      id: row.result_id, contestantId: row.contestant_ref, name: contestant.historical_display_label,
      votes: row.votes, points: row.points ?? null, seats: row.seats, seatDetails,
      publishedShare: row.published_vote_share ?? row.printed_share_of_all_candidate_votes ?? null,
      derivedShare: row.derived_vote_share, printedShareNote: row.printed_vote_share_not_reproduced ?? null,
      sourceIds: sourceIds(row, contestant),
    };
  });
  return {
    ...scoped, geography: turnout.geography, voteType: definition.id, voteLabel: definition.label, shareBasis,
    totalSeats: rows[0].total_seats, turnout: turnout.published_turnout ?? turnout.derived_turnout,
    turnoutPublished: turnout.published_turnout != null, turnoutDefinition: turnout.turnout_definition, turnoutSourceIds: sourceIds(turnout),
    printedTurnoutNote: turnout.printed_turnout_not_reproduced ?? null, eligible: turnout.eligible_voters, voters: turnout.voters,
    turnoutVoters: turnout.voters_turned_out ?? turnout.voters, valid: turnout.valid_votes, invalid: turnout.invalid_votes,
    cast: turnout.ballots_cast, sourceIds: [...new Set([...sourceIds(turnout), ...definition.sourceIds, ...results.flatMap(r=>r.sourceIds)])],
    results,
  };
}

function districts(legislature: LegislatureRow): string[] {
  if (legislature.seats_by_land) {
    return legislature.seats_by_land.flatMap(land => land.regional.map(r => land.name + " · " + r.constituency + " " + r.name));
  }
  return legislature.seats_by_constituency?.map(r => r.constituency + " · " + r.name) ?? [];
}

// Called only by server-side entry points. The existing loaders enforce the country's source gate.
export function politicalBallotElections(country: BallotCountrySlug): BallotElection[] {
  const stores = loaders[country]();
  const elections = stores.elections as ElectionRow[];
  const legislatures = stores.legislatures as LegislatureRow[];
  const systems = stores.systems as SystemRow[];
  const turnout = stores.turnout as TurnoutRow[];
  const resultRows = stores.results as ResultRow[];
  const contestants = new Map((stores.contestants as ContestantRow[]).map(row => [row.contestant_id, row]));
  return elections.map(election => {
    const legislature = legislatures.find(l => l.legislature_id === election.legislature_id);
    const system = systems.find(s => s.electoral_system_id === election.electoral_system_id);
    if (!system || !legislature) throw Error("Missing election rule or legislature: " + election.election_id);
    const rowsByGeography = new Map<string, ResultRow[]>();
    for (const row of resultRows.filter(r => r.election_id === election.election_id)) {
      const rows = rowsByGeography.get(row.geography) ?? [];
      rows.push(row);
      rowsByGeography.set(row.geography, rows);
    }
    const turns = turnout.filter(t => t.election_id === election.election_id);
    const ballots = turns.filter(t => rowsByGeography.has(t.geography)).map(t => {
      const rows = rowsByGeography.get(t.geography)!;
      if (rows.some(r=>r.vote_type !== t.vote_type)) throw Error("Incompatible ballot types: " + t.geography);
      return projectBallot(election, legislature, system, t, rows, contestants);
    });
    if (ballots.length !== rowsByGeography.size) throw Error("Missing turnout scope: " + election.election_id);
    const aggregate = turns.find(t => t.geography === "hr-territorial-i-x");
    const rules = system.national_rules;
    const ruleDetails = [...rules.thresholds?.map(t => t.description) ?? [], rules.minorityRepresentation, rules.diasporaRepresentation,
      rules.totalSeatsDefinition].filter((v):v is PoliticalLocalText => Boolean(v));
    const references = new Set([...sourceIds(election, legislature, system, ...turns), ...rules.sourceIds,
      ...(rules.thresholds ?? []).flatMap(t=>t.sourceIds), ...ballots.flatMap(b => b.sourceIds)]);
    const sources = stores.sources.filter(s => references.has(s.source_id)).map(toPoliticalSource);
    if (sources.length !== references.size) throw Error("Unresolved source references: " + election.election_id);
    // The 2000 decisions use the contemporary Chamber of Representatives title quoted in the registered election notes.
    const chamber = election.chamber_printed ?? legislature.chamber_printed ??
      (country === "croatia" && election.year === 2000 ? "Zastupnički dom Hrvatskoga državnog sabora" : election.chamber);
    // In the Romanian lower-house allocation tables, seat_slots covers the list tier only.
    // The whole chamber also includes separately assigned national-minority seats.
    const mechanisms = legislature.seats_by_mechanism;
    const slots = legislature.seat_slots;
    const chamberSlots = slots != null && country === "romania" && slots === mechanisms?.list_seats_43_constituencies
      ? slots + (mechanisms.national_minority_organisations ?? 0) : slots ?? null;
    return {
      id: election.election_id, date: election.date, dateBasis: election.date_basis ?? null, repeatPollDate: election.repeat_poll_date ?? null, year: election.year, country, chamber,
      legislatureId: legislature.legislature_id, systemId: system.electoral_system_id, totalSeats: legislature.total_seats,
      seatSlots: chamberSlots, compositionBasis: mechanisms ? "mechanisms" as const : "parties" as const, composition: composition(legislature), rules: system.notes, ruleDetails,
      territorialTurnout: aggregate ? {geography: aggregate.geography, value: aggregate.published_turnout ?? aggregate.derived_turnout,
        published: aggregate.published_turnout != null, numerator: aggregate.voters_turned_out ?? aggregate.voters, denominator: aggregate.eligible_voters, definition: aggregate.turnout_definition, sourceIds: sourceIds(aggregate)} : null,
      districts: districts(legislature), sources, ballots,
    };
  }).sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function toPoliticalSource(s: PoliticalConstituencyStores["sources"][number]): PoliticalSource {
  return {id:s.source_id, title:s.dataset, url:s.url, institution:s.institution, sha256:s.raw_sha256, licenceUrl:s.licence_url, retrievedAt:s.retrieved_at};
}
