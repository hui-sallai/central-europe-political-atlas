import type { PoliticalElectionView, PoliticalResult } from "./politicalExplorer";
export type ElectionMembership = {contestant_id:string;atlas_party_id:string;country:string;election_id:string;review_status:string;provenance:{source_id:string}[]};
/** Membership is an election-specific fact, never a historical legal-continuity shortcut. */
export function contestantIdentity(contestant:{contestant_id:string;contestant_kind?:string},country:string,electionId:string,members:ElectionMembership[],sourceIds:readonly string[]) {
  const matches=members.filter(m=>m.country===country&&m.election_id===electionId&&m.contestant_id===contestant.contestant_id&&["verified_same_election_membership",...(country==="germany"?["confirmed_2025_election_specific_membership"]:[])].includes(m.review_status)&&m.provenance.length>0&&m.provenance.every(p=>sourceIds.includes(p.source_id)));
  const ids=[...new Set(matches.map(m=>m.atlas_party_id))];
  if(contestant.contestant_kind==="party_list"&&ids.length>1)throw Error("A party list cannot be silently merged from several legal parties");
  return {partyId:contestant.contestant_kind==="party_list"&&ids.length===1?ids[0]:null,memberPartyIds:ids};
}

export type PoliticalIdentityLink = {
  country:string; fromElection:string; fromContestant:string; toElection:string; toContestant:string;
  relation:"same_party"|"documented_rename"|"authority_series"|"merger"|"split"|"alliance_membership";
  basis:"official_register"|"official_longitudinal_table"|"official_document"|"unresolved";
  status:"verified"|"unresolved"|"disputed"; sourceIds:string[];
};
export function continuousPartyLink(link:PoliticalIdentityLink,a:PoliticalElectionView,b:PoliticalElectionView):boolean {
  if(link.status!=="verified"||link.basis==="unresolved"||!link.sourceIds.length||!a.country||a.country!==b.country||a.chamber!==b.chamber||a.date>=b.date||link.country!==a.country||link.fromElection!==a.electionId||link.toElection!==b.electionId)return false;
  const x=a.results.find(r=>r.contestantId===link.fromContestant),y=b.results.find(r=>r.contestantId===link.toContestant);
  if(!x||!y||x.contestantKind!=="party_list"||y.contestantKind!=="party_list"||a.national?.activeVote.kind!=="list"||b.national?.activeVote.kind!=="list")return false;
  if(!link.sourceIds.every(id=>[...a.sources,...b.sources].some(s=>s.id===id&&s.sha256&&s.retrievedAt)))return false;
  if(link.relation==="authority_series")return link.basis==="official_longitudinal_table";
  if(link.relation==="same_party")return Boolean(x.partyId&&x.partyId===y.partyId&&link.basis==="official_register");
  // Renames require their own official document; shared labels, mergers, splits and alliances never bridge a series.
  return link.relation==="documented_rename"&&link.basis==="official_document";
}
export function partyLinkDifference(link:PoliticalIdentityLink,a:PoliticalElectionView,b:PoliticalElectionView) {
  if(!continuousPartyLink(link,a,b))return null;
  const x=a.results.find(r=>r.contestantId===link.fromContestant)!,y=b.results.find(r=>r.contestantId===link.toContestant)!;
  const difference=(key:keyof Pick<PoliticalResult,"publishedVoteShare"|"seats">)=>x[key]===null||y[key]===null?null:y[key]!-x[key]!;
  const comparable=a.national!.activeVote.denominator!=="unknown"&&a.national!.activeVote.denominator===b.national!.activeVote.denominator&&a.national!.activeVote.id===b.national!.activeVote.id;
  return {a:x,b:y,shareChange:comparable?difference("publishedVoteShare"):null,seatsChange:difference("seats"),legalContinuity:link.relation!=="authority_series"};
}
/** Explicit reviewed edges only. An unlinked election is a chart gap, even when its ballot label is identical. */
export function verifiedPartyTrajectory(elections:PoliticalElectionView[],links:PoliticalIdentityLink[],anchor:{electionId:string;contestantId:string}) {
  let previous:PoliticalElectionView|null=null,contestant:string|null=null;
  return [...elections].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>{
    let result:PoliticalResult|null=null;
    if(e.electionId===anchor.electionId)result=e.results.find(r=>r.contestantId===anchor.contestantId&&r.contestantKind==="party_list")??null;
    else if(previous&&contestant){const edges=links.filter(l=>l.fromElection===previous!.electionId&&l.fromContestant===contestant&&l.toElection===e.electionId&&continuousPartyLink(l,previous!,e));if(edges.length===1)result=e.results.find(r=>r.contestantId===edges[0].toContestant)??null;}
    if(result){previous=e;contestant=result.contestantId;}
    return {election:e,result};
  });
}
export function sourceVerifiedPartySeries(elections:PoliticalElectionView[],links:PoliticalIdentityLink[]) {
  const valid=links.filter(l=>{const a=elections.find(e=>e.electionId===l.fromElection),b=elections.find(e=>e.electionId===l.toElection);return a&&b&&continuousPartyLink(l,a,b);});
  const roots=[...new Map(valid.filter(l=>!valid.some(x=>x.toElection===l.fromElection&&x.toContestant===l.fromContestant)).map(l=>[`${l.fromElection}:${l.fromContestant}`,l])).values()];
  return roots.map(root=>{const rows=verifiedPartyTrajectory(elections,valid,{electionId:root.fromElection,contestantId:root.fromContestant});const links=rows.filter(r=>r.result).map(r=>({electionId:r.election.electionId,contestantId:r.result!.contestantId,note:null}));return {id:`verified:${root.country}:${root.fromContestant}`,label:rows.find(r=>r.result)?.result?.nativeLabel??root.fromContestant,relationship:"source_verified_continuity" as const,links,evidenceSourceIds:[...new Set(valid.filter(l=>links.some(r=>r.electionId===l.fromElection&&r.contestantId===l.fromContestant)&&links.some(r=>r.electionId===l.toElection&&r.contestantId===l.toContestant)).flatMap(l=>l.sourceIds))]};}).filter(s=>s.links.length>=2);
}
