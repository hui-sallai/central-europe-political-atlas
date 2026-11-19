"use client";

import { localizedRoute, type Locale } from "@/i18n/config";
import type { BallotElection, ElectionBallot } from "@/lib/politicalBallots";
import { PLATFORM_BASE_URL } from "@/lib/releaseMetadata";
import { sanitizeFilename, toCsv } from "@/lib/researchSnapshot";
import { NotebookCollect } from "./NotebookCollect";

export function PoliticalBallotExport({ election, ballot, locale }: { election: BallotElection; ballot: ElectionBallot | null; locale: Locale }) {
  const en = locale === "en";
  const params = new URLSearchParams({election:election.id});
  if (ballot) params.set("ballot",ballot.geography);
  const url = new URL(localizedRoute('/politics/' + election.country + '/',locale) + '?' + params, PLATFORM_BASE_URL).href;
  const basis = ballot?.label[locale] ?? (en ? "Chamber composition" : "议院席位构成");
  const sourceIds = new Set(ballot ? [...ballot.sourceIds, ...ballot.results.flatMap(r => r.sourceIds)] : election.sources.map(s => s.id));
  const sources = election.sources.filter(s => sourceIds.has(s.id));
  function download(format: "csv" | "json") {
    const metadata = {election_id:election.id, date:election.date, date_basis:election.dateBasis, repeat_poll_date:election.repeatPollDate, chamber:election.chamber, legislature_id:election.legislatureId, electoral_system_id:election.systemId, occupied_seats:election.totalSeats, seat_slots:election.seatSlots, research_url:url};
    let content: string;
    if (format === "json") {
      content = JSON.stringify({...metadata, scope:ballot ? "ballot" : "chamber_composition", ballot, composition:election.composition, territorial_turnout:election.territorialTurnout, sources:election.sources, rules:election.rules, rule_details:election.ruleDetails},null,2);
    } else {
      const rows = ballot ? ballot.results.map(r => ({
        ...metadata, geography:ballot.geography, ballot_category:ballot.category, vote_type:ballot.voteType,
        share_denominator:ballot.shareBasis, ballot_seats:ballot.totalSeats, result_id:r.id, contestant_id:r.contestantId, name:r.name,
        votes:r.votes, points:r.points, published_share:r.publishedShare, derived_share:r.derivedShare,
        unreproduced_printed_share:r.printedShareNote, seats:r.seats, seat_detail:JSON.stringify(r.seatDetails),
        eligible_voters:ballot.eligible, voters_turned_out:ballot.turnoutVoters, ballots_cast:ballot.cast, valid_votes:ballot.valid, invalid_votes:ballot.invalid, turnout:ballot.turnout, turnout_definition:ballot.turnoutDefinition, turnout_basis:ballot.turnout === null ? null : ballot.turnoutPublished ? "published" : "derived",
        source_ids:r.sourceIds.join(" | "), source_urls:sources.filter(s=>r.sourceIds.includes(s.id)).map(s=>s.url).join(" | "),
      })) : election.composition.map(d=>({...metadata, composition_label:d.label[locale], seats:d.seats,
        source_ids:sources.map(s=>s.id).join(" | "), source_urls:sources.map(s=>s.url).join(" | ")}));
      if (!rows.length) return;
      content = "\uFEFF" + toCsv(Object.keys(rows[0]),rows);
    }
    const blobUrl = URL.createObjectURL(new Blob([content], {type:format==="csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8"}));
    const link=document.createElement("a");
    link.href=blobUrl;
    link.download=sanitizeFilename(election.id+"-"+(ballot?.geography??"chamber"))+"."+format;
    link.click();
    window.setTimeout(()=>URL.revokeObjectURL(blobUrl),1000);
  }
  return <div className="flex flex-wrap items-center gap-3" data-ballot-export>
    <NotebookCollect label={en ? "Save election evidence" : "保存选举证据"} create={()=>({
      type:"series_view",title:election.year+" · "+election.chamber+" · "+basis,url,
      canonical_ids:[election.id,election.legislatureId,election.systemId,...(ballot?[ballot.geography,ballot.voteType]:[])],
      countries:[election.country],periods:[election.date],layer:"admitted_parliamentary_election",
      sources:sources.map(s=>({institution:s.institution??s.title,dataset:s.title,code:s.id,url:s.url,layer:"election_document",...(s.retrievedAt?{retrieved_at:s.retrievedAt}:{})})),
      warnings:[en?"Results describe contestants and ballot populations in this election.":"结果对应当届选举的参选者及该选票的选民范围。"],
      metadata:{filters:{election:election.id,chamber:election.chamber,ballot:ballot?.geography??"",share_denominator:ballot?.shareBasis??""},row_count:ballot?.results.length??election.composition.length,entersModel:false},
    })}/>
    {(["csv","json"] as const).map(format=><button key={format} type="button" className="underline" onClick={()=>download(format)}>{format.toUpperCase()} · {basis}</button>)}
  </div>;
}
