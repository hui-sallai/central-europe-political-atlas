// Pure adapter from the political stores (the schema used by src/data/political/<country>/) to descriptive election
// views. It reads only what it is given: a country appears in the Political Explorer only when its stores are imported
// by politicalData.ts, which happens only after owner authorisation. No identity link, score or estimate is created here.
import type { PoliticalElectionView, PoliticalLocalText } from "./politicalExplorer";
import type { NationalRules, TurnoutBasis, VoteDefinition } from "./politicalNational";
import { contestantIdentity, type ElectionMembership } from "./politicalIdentity";

type Provenance = { source_id: string };
export type PoliticalStores = {
  members?:ElectionMembership[];
  elections: Array<{ election_id: string; year: number; date: string; date_end?: string | null; chamber: string; legislature_id: string; electoral_system_id: string; result_vintage: string; provenance?:Provenance[] }>;
  turnout: Array<{ election_id: string; vote_type?: string; eligible_voters: number | null; voters: number | null; valid_second_votes?: number | null; invalid_second_votes?: number | null; valid_votes?: number | null; invalid_votes?: number | null; ballots_cast?: number | null; published_turnout: number | null; turnout_definition?: string | null; turnout_basis?: TurnoutBasis; provenance?: Provenance[] }>;
  results: Array<{ election_id: string; contestant_ref: string; vote_type?: string; second_votes?: number | null; votes?: number | null; published_vote_share: number | null; seats: number | null; provenance: Provenance[] }>;
  contestants: Array<{ contestant_id: string; historical_display_label: string; contestant_kind?: string; lead_party_id?: string | null }>;
  legislatures: Array<{ legislature_id: string; total_seats: number | null; provenance?:Provenance[] }>;
  systems: Array<{ electoral_system_id: string; system_family: string; allocation_method: string; base_seats: number | null; vote_type: string; vote_definitions?: VoteDefinition[]; national_rules?: NationalRules; notes: PoliticalLocalText; provenance: Provenance[] }>;
  sources: Array<{ source_id: string; dataset: string; url: string; raw_sha256?: string; retrieved_at?: string; licence_url?: string; institution?:string }>;
};
export type PoliticalCountryMeta = { slug: string; name: PoliticalLocalText; voteLabel: PoliticalLocalText; originalLanguage: string };

export function electionViewsFromStores(stores: PoliticalStores, country: PoliticalCountryMeta): PoliticalElectionView[] {
  for(const ids of [stores.elections.map(e=>e.election_id),stores.contestants.map(c=>c.contestant_id),stores.sources.map(s=>s.source_id)])if(new Set(ids).size!==ids.length)throw Error("Duplicate political store identity");
  return stores.elections.map((election) => {
    const legislature = stores.legislatures.find((row) => row.legislature_id === election.legislature_id)!;
    const system = stores.systems.find((row) => row.electoral_system_id === election.electoral_system_id)!;
    const counts = stores.turnout.find((row) => row.election_id === election.election_id && (!row.vote_type||row.vote_type===system?.vote_type));
    if(!counts||!legislature||!system)throw Error(`Incomplete national election links: ${election.election_id}`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(election.date)||new Date(election.date).toISOString().slice(0,10)!==election.date||election.year!==Number(election.date.slice(0,4))||(election.date_end&&election.date_end<election.date))throw Error("Invalid election date interval");
    const rows = stores.results.filter((row) => row.election_id === election.election_id);
    const sourceIds = new Set([...rows.flatMap((row) => row.provenance.map((p) => p.source_id)), ...system.provenance.map((p) => p.source_id),...(counts.provenance??[]).map(p=>p.source_id)]);
    for(const p of [...(election.provenance??[]),...(legislature.provenance??[]),...(stores.members??[]).filter(m=>m.country===country.slug&&m.election_id===election.election_id).flatMap(m=>m.provenance)])sourceIds.add(p.source_id);
    const definitions:VoteDefinition[]=system.vote_definitions??[{id:system.vote_type,kind:system.vote_type==="second_vote"||system.vote_type==="chamber_list_vote"?"list":"other",label:country.voteLabel,denominator:(counts.valid_second_votes??counts.valid_votes)!=null?"valid_votes":"unknown",seatScope:country.slug==="germany"?"whole_chamber":"unavailable",sourceIds:[...sourceIds]}];
    if(new Set(definitions.map(d=>d.id)).size!==definitions.length||!definitions.some(d=>d.id===system.vote_type))throw Error("Duplicate or missing primary vote definition");
    if(rows.some(r=>r.vote_type&&!definitions.some(d=>d.id===r.vote_type)))throw Error("Undeclared vote type");
    for(const d of definitions)if(!["list","constituency","minority","other"].includes(d.kind)||!["valid_votes","ballots_cast","unknown"].includes(d.denominator)||!["whole_chamber","tier_only","unavailable"].includes(d.seatScope)||!d.sourceIds.length||d.sourceIds.some(id=>!stores.sources.some(s=>s.source_id===id)))throw Error("Unverified vote definition");
    const rules=system.national_rules;
    for(const id of [...definitions.flatMap(d=>d.sourceIds),...(rules?.sourceIds??[]),...(rules?.thresholds??[]).flatMap(t=>t.sourceIds)]){if(!stores.sources.some(s=>s.source_id===id))throw Error("Unregistered rule source");sourceIds.add(id);}
    if(rules?.thresholds?.some(t=>t.percent!==null&&(!Number.isFinite(t.percent)||t.percent<0||t.percent>100)))throw Error("Invalid legal threshold");
    const ballots=definitions.map(definition=>{
      if(stores.turnout.filter(t=>t.election_id===election.election_id&&(t.vote_type===definition.id||(!t.vote_type&&definition.id===system.vote_type))).length>1)throw Error("Duplicate turnout basis");
      const count=stores.turnout.find(t=>t.election_id===election.election_id&&(t.vote_type===definition.id||(!t.vote_type&&definition.id===system.vote_type)));
      const results=rows.filter(r=>r.vote_type===definition.id||(!r.vote_type&&definition.id===system.vote_type)).map(row=>{
        const contestant=stores.contestants.find(c=>c.contestant_id===row.contestant_ref);
        if(!contestant||!row.provenance.length||!stores.sources.some(s=>s.source_id===row.provenance[0].source_id))throw Error("Unresolved contestant or source");
        const votes=row.votes!==undefined?row.votes:row.second_votes??null;
        return {contestantId:row.contestant_ref,nativeLabel:contestant.historical_display_label,secondVotes:votes,votes,voteType:definition.id,publishedVoteShare:row.published_vote_share,seats:row.seats,sourceId:row.provenance[0].source_id,contestantKind:contestant.contestant_kind,...contestantIdentity(contestant,country.slug,election.election_id,stores.members??[],stores.sources.map(s=>s.source_id))};
      });
      if(new Set(results.map(r=>r.contestantId)).size!==results.length)throw Error("Duplicate contestant within vote type");
      const validVotes=count?.valid_votes!==undefined?count.valid_votes:count?.valid_second_votes??null;
      for(const v of [validVotes,count?.invalid_votes??count?.invalid_second_votes??null,count?.ballots_cast??null,legislature.total_seats])if(v!==null&&(!Number.isSafeInteger(v)||v<0))throw Error("Invalid national denominator");
      if(results.some(r=>r.publishedVoteShare!==null&&(!Number.isFinite(r.publishedVoteShare)||r.publishedVoteShare<0||r.publishedVoteShare>100)))throw Error("Invalid published share");
      for(const r of results)for(const value of [r.votes,r.seats])if(value!==null&&(!Number.isSafeInteger(value)||value<0))throw Error("Invalid national count");
      if(validVotes!==null&&results.reduce((n,r)=>n+(r.votes??0),0)>validVotes)throw Error("Votes exceed the defined denominator");
      if(definition.seatScope==="whole_chamber"&&legislature.total_seats!==null&&results.reduce((n,r)=>n+(r.seats??0),0)>legislature.total_seats)throw Error("Allocated seats exceed the chamber total");
      return {definition,validVotes,invalidVotes:count?.invalid_votes!==undefined?count.invalid_votes:count?.invalid_second_votes??null,ballotsCast:count?.ballots_cast??null,results};
    });
    const primary=ballots.find(b=>b.definition.id===system.vote_type)!;
    return {
      electionId: election.election_id, year: election.year, date: election.date,
      resultVintage: election.result_vintage, validSecondVotes: primary.validVotes,
      totalSeats: legislature.total_seats, publishedTurnout: counts.published_turnout,
      eligibleVoters: counts.eligible_voters, voters: counts.voters,
      system: { family: system.system_family, allocationMethod: system.allocation_method, baseSeats: system.base_seats, voteType: system.vote_type },
      notes: system.notes,
      sources: stores.sources.filter((s) => sourceIds.has(s.source_id)).map((s) => ({ id: s.source_id, title: s.dataset, url: s.url, sha256: s.raw_sha256, retrievedAt: s.retrieved_at, licenceUrl: s.licence_url, institution:s.institution })),
      results: primary.results,
      country: country.slug, countryName: country.name, chamber: election.chamber, voteLabel: country.voteLabel, originalLanguage: country.originalLanguage,
      turnoutDefinition: counts.turnout_definition ?? null,
      national:{chamber:election.chamber,dateEnd:election.date_end??null,vintage:election.result_vintage,activeVote:primary.definition,ballots,
        turnout:counts.turnout_basis??{numerator:country.slug==="germany"?"voters":"unknown",denominator:country.slug==="germany"?"registered_electorate":"unknown",definition:counts.turnout_definition??null,sourceIds:(counts.provenance??[]).map(p=>p.source_id)},
        rules:system.national_rules??{nationalAllocation:system.allocation_method,districtAllocation:null,thresholds:null,minorityRepresentation:null,totalSeatsDefinition:null,sourceIds:system.provenance.map(p=>p.source_id)}},
    };
  });
}
