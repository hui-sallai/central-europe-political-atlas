"use client";

import { ElectionInstitutionalPeriod } from "./InstitutionalHistory";
import { hungarianElectionTransition } from "@/lib/institutionalRegistry";
import { GermanHistoricalAllocation } from "./GermanHistoricalAllocation";
import { GermanElectionRuleComparison } from "./GermanElectionRuleComparison";
import { CzechElectionRuleComparison } from "./CzechElectionRuleComparison";
import { czechAllocationLabel } from "@/lib/czechElectionRules";
import { ElectoralSystemComparison, HistoricalAllocationComparison } from "./ElectoralSystemComparison";
import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { localeDate, localeNumber, localizedRoute } from "@/i18n/config";
import { chartResults, compareElections, measureValue, seatMeasureScope, seatsWon, selectedElectionRound, type ElectionAggregate, type PoliticalCountryView, type PoliticalElectionView, type PoliticalMeasure, shareForDisplay, turnoutForDisplay, voteDenominator } from "@/lib/politicalExplorer";
import { HistoricalBallotEvidence } from "./HistoricalBallotEvidence";
import { ElectionBallotLabelComparison } from "./ElectionBallotLabelComparison";
import { ElectionResultDownloads } from "./ElectionResultDownloads";
import { nationalComparisonView } from "@/lib/politicalComparisonBallots";
import { ElectionRoundDetails, HistoricalChamberReconciliation } from "./ElectionRoundDetails";
import { ParliamentSeats } from "./ParliamentSeats";
import { nationalHistoryObservation } from "@/lib/electionHistoryObservations";
import { ElectionHistoryFigures } from "./ElectionHistoryFigures";
import { PoliticalComparisonPicker, ScopedDistribution } from "./PoliticalComparisonPicker";
import { germanOfficialSeries } from "@/lib/politicalSeries";
import { PoliticalPartyHistory } from "./PoliticalPartyHistory";
import { PoliticalLinkedComparison } from "./PoliticalLinkedComparison";
import { electionCountryRoute } from "@/lib/electionMacroLinkage";
import { PoliticalVerifiedComparison } from "./PoliticalVerifiedComparison";
import { PoliticalEconomicContext, type PoliticalContextInputs } from "./PoliticalEconomicContext";
import { NotebookCollect } from "./NotebookCollect";
import type { EvidenceDraft } from "@/lib/researchNotebook";
import { counterpartBallot, roundElectorateLabel, selectNationalBallot } from "@/lib/politicalNational";
import { PoliticalNationalDetails } from "./PoliticalNationalDetails";
import { blockerCauseLabels, notInAdmissionPipeline, politicalAdmissions } from "@/lib/politicalAdmission";
import { PoliticalPollingPanel } from "./PoliticalPollingPanel";
import type { AdmittedPolling } from "@/lib/politicalPolling";
import { sourceVerifiedPartySeries, type PoliticalIdentityLink } from "@/lib/politicalIdentity";

/** Germany-only descriptive results; no unresolved cross-election identity lines. */
export default function PoliticalExplorerAlpha({ elections, comparisonCountries = [], contextInputs, pollingData=null,identityLinks=[] }: { elections: PoliticalElectionView[]; comparisonCountries?: PoliticalCountryView[]; contextInputs?: PoliticalContextInputs; pollingData?:AdmittedPolling|null;identityLinks?:PoliticalIdentityLink[] }) {
  const locale = useLocale();
  const en = locale === "en";
  const [electionId, setElectionId] = useState<string | null>(null);
  const [measure, setMeasure] = useState<PoliticalMeasure>("vote_share");
  const [compareId, setCompareId] = useState("");
  const [compareVoteType,setCompareVoteType]=useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState("verified");
  const [historyKey, setHistoryKey] = useState(0);
  const [contextOpen, setContextOpen] = useState(false);
  const [voteType,setVoteType]=useState<string | null>(null);
  const baseElection = elections.find((item) => item.electionId === electionId);
  const election = baseElection && voteType !== null ? selectNationalBallot(baseElection,voteType) : baseElection;
  const countrySlug=elections[0]?.country??"germany", countryName=elections[0]?.countryName?.[locale]??(en?"Germany":"德国");
  const period=`${elections[0]?.year??"—"}–${elections.at(-1)?.year??"—"}`;
  const secondVote=(election??baseElection)?.system.voteType==="second_vote";
  // Seat labels name the scope: whole-chamber representation, or a list tier whose seats are divided by the tier's own size.
  const scope = (election??baseElection) ? seatMeasureScope((election??baseElection)!) : "whole_chamber";
  const tierSeats = (election??baseElection)?.national?.activeVote.tierSeats ?? null;
  const tierShareLabel = en ? `National list-tier seat share (derived, of ${tierSeats ?? "—"} list seats)` : `全国名单层席位占比（计算值，占 ${tierSeats ?? "—"} 个名单席位）`;
  const seatLabel = scope === "national_list_tier" ? (en ? "National list seats" : "全国名单席位") : scope === "unavailable" ? (en ? "Seats (scope not established)" : "席位（范围未确定）") : (en ? "Whole-chamber seats" : "全议院席位");
  const seatShareLabel = scope === "national_list_tier" ? tierShareLabel : scope === "unavailable" ? (en ? "Seat share (not established)" : "席位占比（未确定）") : (en ? "Whole-chamber seat share (derived)" : "全议院席位占比（计算值）");
  const czech = countrySlug === "czechia";
  const composite = election?.national?.activeVote.roundScope === "valid_round_composite";
  const apportioned = election?.national?.activeVote.attributionBasis === "source_apportioned_party_total";
  const shareDigits = czech || composite ? 2 : 1;
  const labels: Record<PoliticalMeasure, string> = en
    ? { votes: secondVote?"Second votes":"Votes for selected ballot", vote_share: secondVote?"Second-vote share (derived)":czech?"Computed vote share":"Vote share (derived)", seats: seatLabel, seat_share: seatShareLabel }
    : { votes: secondVote?"第二票票数":"所选选票票数", vote_share: secondVote?"第二票占比（计算值）":czech?"按官方票数计算的得票率":"得票率（计算值）", seats: seatLabel, seat_share: seatShareLabel };

  if (composite) labels.vote_share = en ? "Published vote share" : "官方公布的得票率";

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("election"), metric = params.get("measure");
      setVoteType(params.get("vote_type"));
      setElectionId(id ?? elections.at(-1)?.electionId ?? "");
      setMeasure(["votes", "vote_share", "seats", "seat_share"].includes(metric ?? "") ? metric as PoliticalMeasure : "vote_share");
      const other = params.get("compare");
      setCompareVoteType(params.get("compare_vote_type"));
      setCompareId(elections.some(e => e.electionId === other) ? other! : "");
      setComparisonMode(params.get("comparison_mode") === "labels" ? "labels" : "verified");
      if (params.get("context") === "1" || params.has("research_q") || params.get("research_study") === "d4") setContextOpen(true);
    };
    restore(); window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [elections]);
  function select(id: string, metric: PoliticalMeasure) {
    setElectionId(id); setMeasure(metric);
    const url = new URL(window.location.href); url.searchParams.set("election", id); url.searchParams.set("measure", metric);
    if (id !== electionId) {
      // A selected ballot belongs to the old election unless its registered definition is also available here.
      const next = elections.find(item => item.electionId === id);
      if (voteType !== null) {
        const ballot = election && next && counterpartBallot(election, next);
        setVoteType(ballot?.definition.id ?? null);
        if (ballot) url.searchParams.set("vote_type", ballot.definition.id);
        else url.searchParams.delete("vote_type");
      }
      if (compareId === id) {
        setCompareId("");
        setCompareVoteType(null);
        url.searchParams.delete("compare");
        url.searchParams.delete("compare_vote_type");
      }
      window.history.pushState(null, "", url);
    } else window.history.replaceState(null, "", url);
  }
  function compareWith(id: string) {
    setCompareId(id); setCompareVoteType(null);
    const url = new URL(window.location.href); url.searchParams.delete("compare_vote_type"); if (id) url.searchParams.set("compare", id); else url.searchParams.delete("compare");
    window.history.pushState(null, "", url);
  }
  const peerElection = elections.find((item) => item.electionId === compareId && item.electionId !== election?.electionId) ?? null;
  const peerMatch = election && peerElection ? counterpartBallot(election, peerElection) : null;
  const peerBallotId = compareVoteType ?? peerMatch?.definition.id;
  const other = peerElection && peerBallotId !== undefined
    ? selectNationalBallot(peerElection, peerBallotId)
    : election?.system.voteType === baseElection?.system.voteType ? peerElection : null;
  const transition=countrySlug==="hungary"?hungarianElectionTransition():null;
  const transitionPeer=transition && (election?.electionId===transition.before.election_id ? transition.after :
    election?.electionId===transition.after.election_id ? transition.before : null);
  const crossesReform=Boolean(election && peerElection && countrySlug==="hungary" &&
    Boolean(election.national?.historicalAllocation)!==Boolean(peerElection.national?.historicalAllocation));
  function choosePeerBallot(ballot:string) {
    const url=new URL(window.location.href);
    url.searchParams.set("compare_vote_type",ballot);
    setCompareVoteType(ballot);
    window.history.pushState(null,"",url);
  }
  const currentIndex = elections.findIndex(e => e.electionId === electionId);
  const history = elections.map(e => nationalHistoryObservation(e,locale));
  const number = (value: number | null, digits = 0) => localeNumber(value, locale, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const verifiedSeries = countrySlug === "germany" ? germanOfficialSeries : sourceVerifiedPartySeries(elections, identityLinks);
  const seriesContestants = new Set(verifiedSeries.flatMap((series) => series.links.map((link) => `${link.electionId}:${link.contestantId}`)));
  const percent = (value: number | null, digits = 0) => value === null ? "—" : `${number(value, digits)}%`;
  const signed = (value: number | null, digits = 0) => value === null ? "—" : `${value > 0 ? "+" : value < 0 ? "−" : ""}${localeNumber(Math.abs(value), locale, { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
  const aggregateLabels: Record<ElectionAggregate["key"], string> = en
    ? { turnout: "Turnout (%)", eligible: "Eligible voters", voters: "Voters", valid: secondVote?"Valid second votes":"Valid votes for selected ballot", seats: "Election seats", lists: "Lists on the ballot", seat_lists: "Lists that won seats" }
    : { turnout: "投票率（%）", eligible: "合格选民", voters: "投票人数", valid: secondVote?"有效第二票":"所选选票有效票", seats: "选举席位", lists: "参选名单数", seat_lists: "获得席位的名单数" };
  if (countrySlug === "czechia") {
    aggregateLabels.eligible = en ? "Registered voters" : "登记选民人数";
    aggregateLabels.voters = en ? "Issued envelopes" : "发出票封数";
  }
  const charted = election ? chartResults(election) : [];
  const maxShare = Math.max(1, ...charted.map((result) => election ? shareForDisplay(result, election).value ?? 0 : 0));
  const turnoutShown = election ? turnoutForDisplay(election) : null;
  const computedShares = Boolean(election && charted.some((result) => shareForDisplay(result, election).computed));

  const maxSeats = Math.max(1, ...charted.map((result) => election ? seatsWon(result, election) : 0));
  const splitSeats = election?.national?.activeVote.seatScope === "tier_only" && election.national.chamberAttribution === "complete";
  const largest = charted[0];
  const ballot=election?.national?.ballots.find(b=>b.definition.id===election.system.voteType);
  const round = election && selectedElectionRound(election);
  const peerRound = other && selectedElectionRound(other);
  const compositeComparison = composite || other?.national?.activeVote.roundScope === "valid_round_composite";
  const ballotPeriod = composite && ballot ? `${ballot.dateStart} – ${ballot.dateEnd}` : round?.date ?? election?.date;
  const allocation=election?.national?.historicalAllocation;
  const votesOnly=election?.national?.activeVote.seatScope==="unavailable" && election.national.activeVote.kind==="constituency";
  const germanFirstVote = countrySlug === "germany" && election?.system.voteType === "first_vote";
  const firstVoteChamber = germanFirstVote && baseElection?.system.voteType === "second_vote" ? baseElection : null;
  const districtRoundColumn = votesOnly && !apportioned && Boolean(round);
  const denominator=election?voteDenominator(election):null;
  function draft(sourceId?: string): EvidenceDraft {
    if (!election) throw new Error("No election selected");
    const scoped = ballot?.definition.roundScope ? ballot : undefined;
    const composite = scoped?.definition.roundScope === "valid_round_composite";
    const periods = composite && scoped.dateStart && scoped.dateEnd ? [scoped.dateStart, scoped.dateEnd] : [round?.date ?? election.date];
    const references = [...(scoped?.turnoutRecord?.provenance ?? []), ...(scoped?.results.flatMap(r => r.provenance ?? []) ?? [])];
    const selectedSources = election.sources.filter(s => !sourceId || s.id === sourceId).flatMap(source => {
      const urls = [...new Set(references.filter(p => p.source_id === source.id).map(p => p.source_url).filter((url): url is string => !!url))];
      return urls.length ? urls.map(url => ({...source, url})) : [source];
    });
    const boundary = { en: "Election-specific descriptive evidence. Unresolved party relations are excluded from continuous series; no causal estimates, forecasts or evaluative scores.", "zh-CN": "当届选举描述性证据。未解决政党关系不进入连续序列；不提供因果估计、预测或评价分数。" };
    const url = new URL(localizedRoute(electionCountryRoute(election.country??"germany"), locale), "https://hy-central-europe-analysis.org");
    url.searchParams.set("election", election.electionId); url.searchParams.set("measure", measure); if (sourceId) url.searchParams.set("source", sourceId); if(election.national&&election.national.ballots.length>1)url.searchParams.set("vote_type",election.system.voteType);
    return { type: sourceId ? "source" : "series_view", title: `${election.countryName?.en??election.country} ${election.year} election`, labels: { en: `${election.countryName?.en??election.country} ${election.year} election`, "zh-CN": `${election.countryName?.["zh-CN"]??election.country} ${election.year} 年选举` }, url: url.href, canonical_ids: sourceId ? [sourceId] : [election.electionId, ...election.results.map(r => r.contestantId)], countries: [election.country??"germany"], periods, layer: secondVote?"national_election_second_votes":`national_election:${election.system.voteType}`, sources: selectedSources.map(s => ({ institution: s.institution??"Institution not recorded", dataset: s.title, url: s.url, code: s.id, layer: s.tier ?? "tier1_official", retrieved_at: s.retrievedAt })), warnings: [boundary.en], warning_labels: { en: [boundary.en], "zh-CN": [boundary["zh-CN"]] }, comparability: "election_specific_no_party_continuity", metadata: { filters: { election: election.electionId, ...(composite ? {date_start:scoped.dateStart!,date_end:scoped.dateEnd!} : {date:round?.date??election.date}),
      ...(scoped ? {round_scope:scoped.definition.roundScope!,attribution_basis:scoped.definition.attributionBasis ?? "original_list",
        ...scoped.definition.geographicScope, source_urls:[...new Set(references.flatMap(p => p.source_url ? [p.source_url] : []))]} : {}), chamber: election.chamber ?? "", measure,
      ...(election.national?.systemId?{electoral_system_id:election.national.systemId}:{}),
      ...(election.national?.legislatureId?{legislature_id:election.national.legislatureId}:{}),
      ...(round?{round:round.round,round_date:round.date,electorate:round.electorateScope==="national"?"national":"runoff_constituencies",
        ...(round.constituencyCount == null ? {} : {constituencies:round.constituencyCount})}:{}),
      ...(countrySlug === "germany" && ballot ? {seat_scope: ballot.definition.seatScope, vote_denominator_basis: ballot.definition.denominator} : {}),
      ...(allocation?{seat_scope:election.national!.activeVote.seatScope,allocation_tiers:["single_member","territorial_list","national_compensation"],allocation_date:election.national!.dateEnd??election.date}:{}),
      ...(denominator===null?{}:{vote_denominator:denominator}), ...(election.national&&election.national.ballots.length>1?{vote_type:election.system.voteType}:{}), ...(sourceId ? { source: sourceId } : {}) }, row_count: sourceId ? 1 : election.results.length, reference: `${election.chamber}; ${election.resultVintage}` } };
  }

  return <section aria-labelledby="political-explorer-title" className="space-y-6" data-politics-explorer>
    <header>
      <h2 id="political-explorer-title" className="text-2xl font-semibold">{en ? `${countryName}: national elections` : `${countryName}：国家议会选举`}</h2>
      <p>{en ? "Descriptive results, not forecasts or causal estimates. Election-specific ballot records remain distinct; only verified official series links permit party-level comparisons." : "描述性选举结果，不是预测或因果估计。当届选票记录保持独立；仅通过已核实官方序列关联进行政党层面的比较。"}</p>
    </header>
    <nav aria-label={en ? "Sections of the election explorer" : "选举浏览器的各部分"} className="flex flex-wrap gap-2 text-sm" data-politics-jump-nav>
      {[["politics-system", en ? "Selected election" : "所选选举"], ["politics-compare-title", en ? "Compare two elections" : "比较两届选举"], ["politics-history-title", en ? "Party history" : "政党历史"], ...(contextInputs ? [["politics-context-disclosure", en ? "Political-economic context" : "政治经济背景"]] : [])].map(([id, label]) => (
        <a key={id} href={`#${id}`} className="rounded-full border border-[var(--line)] px-3 py-1 underline-offset-2 hover:underline" data-jump={id} onClick={() => { if (id === "politics-context-disclosure") setContextOpen(true); }}>{label}</a>
      ))}
    </nav>
    <div className="card overflow-x-auto p-4" role="region" tabIndex={0} aria-label={en ? "Election history (scrollable)" : "选举历史（可横向滚动）"}>
      <table className="w-full min-w-[560px] text-left text-sm"><caption className="mb-3 text-left font-semibold">{en ? `Election history · ${period}` : `选举历史 · ${period}`}</caption>
        <thead><tr><th scope="col">{en ? "Date" : "日期"}</th><th scope="col">{en ? "Turnout" : "投票率"}</th><th scope="col">{en ? "Contestants" : "参选名单数"}</th><th scope="col">{en ? "Election seats" : "选举席位"}</th><th scope="col">{en ? "Rules / source" : "规则／来源"}</th></tr></thead>
        <tbody>{elections.map(item => <tr key={item.electionId} className="border-t border-[var(--line)]"><th scope="row" className="py-3"><button type="button" className="text-[var(--accent)] underline" aria-pressed={election?.electionId === item.electionId} onClick={() => select(item.electionId, measure)}>{localeDate(item.date, locale)}</button></th><td>{percent(turnoutForDisplay(item).value, 2)}{turnoutForDisplay(item).value !== null && <small className="block">{item.national?.rounds?.[0]&&roundElectorateLabel(item.national.rounds[0],locale)+" · "}{turnoutForDisplay(item).computed ? (en ? "Computed from official counts" : "按官方人数计算") : (en ? "Published" : "公布值")}</small>}</td><td>{item.results.length}{item.national?.rounds?.length&&<small className="block">{item.national.activeVote.label[locale]}</small>}</td><td>{item.totalSeats}{countrySlug==="germany" && item.year === 2021 ? <span className="block text-xs">{en ? "Corrected after repeat" : "重选后更正"}</span> : null}</td><td><button type="button" className="underline" onClick={() => { select(item.electionId, measure); document.getElementById("politics-system")?.scrollIntoView(); }}>{en ? "System notes" : "选制说明"}</button></td></tr>)}</tbody>
      </table>
    </div>
    <nav aria-label={en ? "Consecutive admitted elections" : "相邻的已收录选举"} className="flex flex-wrap gap-4 text-sm" data-election-step>
      {[{item:elections[currentIndex-1],label:en?"Previous election":"上一届选举"}, {item:elections[currentIndex+1],label:en?"Next election":"下一届选举"}].filter(x=>x.item).map(({item,label})=><button key={item.electionId} type="button" className="underline" onClick={()=>select(item.electionId,measure)}>{label} · {item.date}</button>)}
    </nav>
    <div className="flex flex-wrap gap-4">
      {baseElection?.national&&baseElection.national.ballots.length>1?<label className="min-w-0 max-w-full">{en?"Vote type":"选票类型"}<select data-selected-vote-type aria-label={en ? "Vote type" : "选票类型"} className="field-control block max-w-full" value={election?.system.voteType ?? ""} onChange={e=>{setVoteType(e.target.value);const url=new URL(window.location.href);url.searchParams.set("vote_type",e.target.value);window.history.pushState(null,"",url);}}>{!election && <option value="" disabled>{en ? "Choose a recorded ballot" : "选择已收录的选票"}</option>}{baseElection.national.ballots.map(b=><option key={b.definition.id} value={b.definition.id}>{b.definition.label[locale]}</option>)}</select></label>:null}
      <label>{en ? "Country" : "国家"}{countrySlug === "germany" ? <select disabled className="field-control block"><option>{en ? "Germany" : "德国"}</option></select> : <select disabled className="field-control block"><option>{countryName}</option></select>}</label>
      <label>{en ? "Election" : "选举"}<select data-selected-election aria-label={en ? "Election" : "选举"} className="field-control block" value={baseElection?.electionId ?? ""} onChange={(event) => select(event.target.value, measure)}>
        {!baseElection && <option value="">{en ? "Select an election" : "选择选举"}</option>}
        {elections.map((item) => <option key={item.electionId} value={item.electionId}>{item.year}</option>)}
      </select></label>
      <label>{en ? "Measure" : "指标"}<select className="field-control block" value={measure} disabled={!election} onChange={(event) => election && select(election.electionId, event.target.value as PoliticalMeasure)}>
        {Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
    </div>
    {!election ? <div role="status"><p>{electionId === null ? (en ? "Loading the selected election…" : "正在读取所选选举…") : !baseElection ? (en ? "This election is outside the published archive. Choose an available election above." : "档案中没有该届选举，请从上方选择已收录的年份。") : voteType !== null?(en?"The requested vote type is unavailable for this election; no other vote type has been silently substituted.":"该届选举没有所请求的选票类型；未默默替换为另一种选票。"):en ? "No approved election data available." : "暂无通过准入的数据。"}</p>{baseElection && voteType !== null?<button type="button" className="underline" onClick={()=>{setVoteType(null);const u=new URL(window.location.href);u.searchParams.delete("vote_type");window.history.replaceState(null,"",u);}}>{en?"Return to the registered primary vote":"返回登记的主要选票"}</button>:null}</div> : <>
      <div aria-live="polite" id="politics-system" className="card p-5">
        <a className="text-sm underline" href={`${en?"/en":""}/politics/?institution_countries=${countrySlug}#institutions`}>{en?'Compare this country’s institutions':'比较该国的政治制度'}</a>
        <ElectionInstitutionalPeriod id={election.electionId} en={en}/>
        <h3 className="font-semibold">{en ? "Electoral system and result vintage" : "选制与结果版本"}</h3>
        <p>{en ? "Result vintage" : "结果版本"}: {countrySlug==="germany" && election.year === 2021 ? (en ? "Corrected final after the 2024 Berlin repeat" : "2024年柏林部分重选后的更正最终结果") : election.resultVintage==="final"?(en ? "Final" : "最终结果"):election.resultVintage}</p>
        {composite ? <p data-composite-scope>{en
          ? "The final territorial-list total uses the valid polling round in each district. It spans both dates and has no single turnout, electorate or invalid-ballot count."
          : "最终地区名单票数取各地区有效轮次，涵盖两个投票日。合计口径下没有单一投票率、登记选民数或无效票数。"} {ballotPeriod}</p> : <p>{turnoutShown?.computed ? (en ? "Turnout, computed from official counts" : "投票率，根据官方人数计算") : (en ? "Published turnout" : "官方公布投票率")}{round&&" · "+roundElectorateLabel(round,locale)}: {localeNumber(turnoutShown?.value ?? null, locale)}{turnoutShown?.value === null ? "" : "%"}</p>}
        {countrySlug === "serbia" && <p>{en ? "Turnout uses voters who voted divided by registered voters. Attendance and ballots cast are recorded separately. The report gives no turnout percentage." : "投票率用实际投票人数除以登记选民人数计算。到场人数与投入票箱的选票数另列。原报告未公布投票率百分比。"}</p>}
        {ballot && <HistoricalBallotEvidence ballot={ballot} locale={locale}/>}
        <ElectionRoundDetails election={election} locale={locale}/>
        <p>{election.notes[locale]}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4" data-politics-research-details>
          {[
            [composite ? (en ? "Selected ballot period" : "所选选票日期区间") : round ? (en ? "Selected ballot date" : "所选选票日期") : (en ? "Election date" : "选举日期"), composite ? ballotPeriod! : localeDate(round?.date??election.date, locale)],
            [en ? "Vote shown" : "所示选票", election.voteLabel?.[locale]??election.system.voteType],
            [en ? "Seat allocation method" : "席位分配方法", countrySlug === "czechia" ? czechAllocationLabel(election.system.allocationMethod, locale) : election.system.allocationMethod],
            [en ? "Base seats under the rules" : "规则规定的基础席位", number(election.system.baseSeats)],
            [en ? "Seats after this election" : "本届选举产生的席位", number(election.totalSeats)],
            [aggregateLabels.eligible, number(election.eligibleVoters)],
            [aggregateLabels.voters, number(election.voters)],
            ...(countrySlug === "serbia" ? [[en ? "Recorded attendance" : "到场人数", number(election.votersTurnedOut ?? null)], [en ? "Ballots cast" : "投入票箱的选票数", number(election.national?.ballots[0]?.ballotsCast ?? null)]] : []),
            [secondVote?(en ? "Valid second votes" : "有效第二票"):(en?"Valid votes":"有效票"), number(election.validSecondVotes)],
            ...(composite || apportioned ? [[en ? "Invalid ballots" : "无效票", number(ballot?.invalidVotes ?? null)]] : []),
          ].map(([label, value]) => <div key={label}><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="metric-number font-semibold">{value}</dd></div>)}
        </dl>
      </div>
      <div className="card p-5" data-politics-summary>
        <h3 className="font-semibold">{en ? `The ${election.year} election at a glance` : `${election.year} 年选举概览`}</h3>
        {election.resultCoverage === "seat_winning_lists_only" ? <p className="mt-2 text-sm leading-7" data-result-coverage="seat_winning_lists_only">{en
          ? `The source prints only the ${election.results.length} lists that won seats. Lists without seats, valid ballots and voters on the electoral roll are not printed there, so no vote share over valid ballots and no turnout are shown.`
          : `来源只列出获得席位的 ${election.results.length} 份名单。未获席位的名单、有效票和登记选民人数均未列出，因此不显示以有效票为分母的得票率，也不显示投票率。`}</p> : votesOnly ? <p className="mt-2 text-sm leading-7">{apportioned ? (en
          ? `The election office divided joint candidates’ votes among their nominating parties. Independent candidates appear together. The selected ballot has ${number(denominator)} valid votes.`
          : `选举办公室将联合候选人的票数分摊给各提名政党，独立候选人合并列示。所选选票共有 ${number(denominator)} 张有效票。`) : en?`The archive groups candidate votes by the printed nominating organisation or independent category. ${number(denominator)} valid votes were recorded for this ballot.`:`档案按原文提名组织或独立参选类别汇总候选人票。所选选票共记录 ${number(denominator)} 张有效票。`}</p> : composite && largest ? <p className="mt-2 text-sm leading-7" data-composite-summary>{en
          ? `The final total covers ${number(denominator)} valid votes for ${election.results.length} territorial lists across both polling dates. The official table gives ${largest.nativeLabel} ${percent(largest.publishedVoteShare,shareDigits)} of those votes.`
          : `最终统计涵盖两个投票日，共 ${number(denominator)} 张有效票、${election.results.length} 份地区名单。官方表格公布的 ${largest.nativeLabel} 得票率为 ${percent(largest.publishedVoteShare,shareDigits)}。`}</p> : <p className="mt-2 text-sm leading-7">{en
          ? `${election.results.length} ${allocation?"territorial lists":"lists"} stood for election and ${election.results.filter((r) => seatsWon(r, election) > 0).length} of them won ${scope === "national_list_tier" ? "national list seats" : "seats"}. ${turnoutShown?.computed ? "Turnout computed from official counts was" : "Published turnout was"} ${percent(turnoutShown?.value ?? null, czech || allocation ? 2 : 1)}. ${largest ? "The contestant with the most votes on the selected ballot received " + percent(shareForDisplay(largest, election).value, czech ? 2 : 1) + (shareForDisplay(largest, election).computed ? " (computed within this ballot)." : " (published).") : ""}`
          : `共有 ${election.results.length} 份${allocation?"地区名单":"名单"}参选，其中 ${election.results.filter((r) => seatsWon(r, election) > 0).length} 份获得${scope === "national_list_tier" ? "全国名单席位" : "席位"}。${turnoutShown?.computed ? "根据官方人数计算的投票率为" : "官方公布的投票率为"} ${percent(turnoutShown?.value ?? null, czech || allocation ? 2 : 1)}。${largest ? "所选选票中得票最多的参选方得票率为 " + percent(shareForDisplay(largest, election).value, czech ? 2 : 1) + (shareForDisplay(largest, election).computed ? "（在此选票内计算）。" : "（官方公布）。") : ""}`}</p>}
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <ParliamentSeats election={firstVoteChamber ?? election}/>
          <figure data-politics-chart="votes-seats">
            <figcaption className="text-sm font-semibold">{apportioned ? (en ? "Candidate votes by party and independent aggregate" : "候选人得票按政党及独立候选人合计分列") : votesOnly?(en?"Candidate votes by nominating organisation":"候选人得票按提名组织分列"):secondVote?(en ? "Second-vote share and seats, by list" : "各名单的第二票得票率与席位"):(en?"Vote share and representation, by contestant":"各参选方得票率与代表席位")}</figcaption>
            {ballot&&<p className="mt-1 text-xs" data-vote-chart-basis>{ballotPeriod} · {ballot.definition.label[locale]} · {en?"Share denominator":"占比分母"} · {number(denominator)} {ballot.definition.denominator==="valid_votes"?(en?"valid votes":"有效票"):ballot.definition.denominator==="ballots_cast"?(en?"ballots cast":"投出票数"):(en?"(unestablished)":"（未确定）")}
              {" · "}{ballot.sourceUrl?<a className="underline" href={ballot.sourceUrl}>{en?"Official ballot totals":"官方选票汇总"}</a>:election.sources.filter(s=>ballot.definition.sourceIds.includes(s.id)).map(s=><a className="mr-2 underline" key={s.id} href={s.url}>{s.title}</a>)}</p>}
            <p className="mt-1 text-xs text-[var(--muted)]">{votesOnly ? (en?"Entries reaching 1% of valid votes on the selected ballot. The complete table includes the other entries. Seat totals are reported in the final chamber allocation.":"显示所选选票中得票达到有效票 1% 的条目；完整结果表保留其他条目。席位总数见最终全院分配。") : en ? `Contestants that won seats or reached 1% of the selected ballot. Upper bar: ${computedShares ? "vote share computed within this ballot" : "published vote share"} (%). Lower bar: ${scope === "national_list_tier" ? "national list seats only (the list tier, not the whole chamber)" : "whole-chamber seats"}. Bars use one neutral colour; order is by votes.` : `仅列出获得席位或所选选票得票率达到 1% 的参选方。上方条：${computedShares ? "在此选票内计算的得票率" : "官方公布的得票率"}（%）；下方条：${scope === "national_list_tier" ? "仅全国名单席位（名单层，并非全议院）" : "全议院席位"}。所有条形使用同一中性颜色，按票数排序。`}</p>
            <ul className="mt-3 space-y-3">{charted.map((result) => (
              <li key={result.contestantId} className="text-xs" data-chart-list={result.contestantId}>
                <span lang={election.originalLanguage} data-original-language={election.originalLanguage} className="font-semibold">{result.nativeLabel}</span>
                <div className="mt-1 flex items-center gap-2"><span className="h-3 rounded-sm bg-[var(--accent)]" style={{ width: `${70 * (shareForDisplay(result, election).value ?? 0) / maxShare}%`,display:shareForDisplay(result, election).value===null?"none":undefined }} aria-hidden="true" /><span className="metric-number">{percent(shareForDisplay(result, election).value, shareDigits)}{(round || composite)&&` · ${number(result.secondVotes)} ${en?"votes":"票"}`}</span></div>
                {!votesOnly&&<div className="mt-1 flex items-center gap-2"><span className="h-3 rounded-sm border border-[var(--accent)]" style={{ width: `${70 * seatsWon(result, election) / maxSeats}%`,display:measureValue(result, election, "seats")===null?"none":undefined }} aria-hidden="true" /><span className="metric-number" data-chart-seats={scope}>{measureValue(result, election, "seats") === null ? (en ? "seats: —" : "席位：—") : `${number(measureValue(result, election, "seats"))} ${scope === "national_list_tier" ? (en ? "list seats" : "个名单席位") : (en ? "seats" : "席")}`}{splitSeats ? (en ? ` (list ${number(result.seats)} + constituency ${number(result.constituencySeats ?? null)})` : `（名单 ${number(result.seats)} + 单选区 ${number(result.constituencySeats ?? null)}）`) : ""}</span></div>}
              </li>
            ))}</ul>
          </figure>
          <ElectionHistoryFigures rows={history} selected={election.electionId} locale={locale} select={id=>select(id,measure)}/>
        </div>
      </div>
      <GermanHistoricalAllocation election={election} locale={locale}/>
      {contextInputs ? <p className="text-sm"><a href="#politics-context-disclosure" className="text-[var(--accent)] underline" data-context-entry onClick={() => setContextOpen(true)}>{en ? "Explore the economic conditions surrounding this election." : "探索这届选举前后的经济背景。"}</a></p> : null}
      <div data-selected-election-collect><NotebookCollect create={() => draft()} /></div>
      <details id="politics-contestant-results" className="card p-5" data-results-disclosure>
      <summary className="cursor-pointer font-semibold">{en ? "Research details: complete contestant results" : "研究详情：完整参选名单结果"}</summary>
      <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={en ? "Election results (scrollable)" : "选举结果（可横向滚动）"}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="text-left">{labels[measure]}</caption>
          <thead><tr><th scope="col">{apportioned ? (en ? "Party or aggregate as recorded" : "来源所列政党或汇总类别") : (en ? "Ballot contestant (original name)" : "参选名单（原文名称）")}</th><th scope="col">{labels[measure]}</th>{measure === "vote_share" ? <>{!composite && <th scope="col">{en ? "Published vote share" : "官方公布票率"}</th>}{!germanFirstVote && <th scope="col">{seatShareLabel}</th>}</> : null}{apportioned && <th scope="col">{en ? "Final seats by first-named party or independent category" : "最终席位（按首列政党或独立候选人类别）"}</th>}
            {apportioned && round?.round === 1 && <th scope="col">{en ? "Round-one seats on the same basis" : "第一轮已决席位（同一归属口径）"}</th>}
            {districtRoundColumn&&<th scope="col">{round?.round===1?(en?"Districts settled in round 1 (published)":"第一轮确定的选区席位（公布值）"):(en?"Districts settled in this round (derived)":"本轮确定的选区席位（计算值）")}</th>}{splitSeats ? <>{allocation ? <><th scope="col">{en?"Territorial-list seats":"地区名单席位"}</th><th scope="col">{en?"National compensation seats":"全国补偿席位"}</th><th scope="col">{en?"Fragment votes":"补偿余票"}</th></> : <th scope="col">{en ? "National list seats" : "全国名单席位"}</th>}<th scope="col">{en ? "Constituency seats" : "单选区席位"}</th><th scope="col">{en ? "Whole-chamber seats" : "全议院席位"}</th></> : null}<th scope="col">{en ? "Source" : "来源"}</th></tr></thead>
          <tbody>{election.results.map((result) => {
            const published = composite && measure === "vote_share";
            const value = published ? result.publishedVoteShare : measureValue(result, election, measure);
            const source = election.sources.find((item) => item.id === result.sourceId);
            return <tr key={result.contestantId} className="border-t border-[var(--line)]">
              <th scope="row" className="py-3 font-normal"><span lang={election.originalLanguage??"de"} data-original-language={election.originalLanguage??"de"}>{result.nativeLabel}</span><span className="block text-xs text-[var(--muted)]">{apportioned ? (result.attribution_basis === "independent_candidates_aggregate" ? (en ? "Independent candidates combined" : "独立候选人合计") : (en ? "Party total apportioned by the election office" : "选举办公室按提名政党分摊的总票数")) : result.contestantKind === "aggregate_voter_groups_and_individual_candidates" ? (en ? "Voter groups and individual candidates combined" : "选民团体及独立候选人合计") : germanFirstVote ? (en ? "Constituency candidates grouped by nominating organisation" : "按提名组织汇总的选区候选人") : votesOnly ? (en?"Printed nominating organisation or independent category for this round":"当轮原文提名组织或独立参选类别") : result.contestantKind==="nationality_list" ? (en ? "Nationality list · a separate ballot with its own denominator" : "民族名单 · 单独的选票，使用各自的分母") : result.contestantKind==="coalition" ? (en ? "Coalition list · votes and seats are not divided among members" : "联盟名单 · 票数和席位不分配给各成员") : result.contestantKind==="voters_committee_list" ? (en ? "Voters' election committee · specific to this election" : "选民选举委员会 · 仅限当届") : seriesContestants.has(`${election.electionId}:${result.contestantId}`) ? (en ? "Election-specific party list · see verified series comparison below" : "当届政党名单 · 已核实序列比较见下方") : (en ? "Election-specific party list · no verified link to another election" : "当届政党名单 · 没有与其他届选举的已核实关联")}</span></th>
              <td className="metric-number">{published ? number(value,shareDigits) : localeNumber(value, locale)}{value !== null && measure.endsWith("share") ? "%" : ""}</td>
              {measure === "vote_share" ? <>{!composite && <td className="metric-number">{number(result.publishedVoteShare,shareDigits)}{result.publishedVoteShare === null ? "" : "%"}</td>}{!germanFirstVote && <td className="metric-number">{localeNumber(measureValue(result, election, "seat_share"), locale)}{measureValue(result, election, "seat_share") === null ? "" : "%"}</td>}</> : null}{apportioned && <td>{number(result.first_named_party_seats_final ?? null)}</td>}
              {apportioned && round?.round === 1 && <td>{number(result.first_named_party_round1_seats ?? null)}</td>}
              {districtRoundColumn&&<td>{number(result.districtSeatsThisRound??null)}</td>}{splitSeats ? <>{allocation ? <><td>{number(result.territorialSeats??null)}</td><td>{number(result.compensationSeats??null)}</td><td>{number(result.fragmentVotes??null)}</td></> : <td className="metric-number">{number(result.seats)}</td>}<td className="metric-number">{number(result.constituencySeats ?? null)}</td><td className="metric-number">{number(result.chamberSeats ?? null)}{(() => { const s = election.sources.find((item) => item.id === result.chamberSeatSourceId); return s ? <a href={s.url} className="block text-xs font-normal underline" data-chamber-seat-source={s.id}>{en ? "composition record" : "议会构成记录"}</a> : null; })()}</td></> : null}
              <td>{source ? <a href={source.url} className="underline">{source.title}</a> : <span>{en ? "Source missing" : "来源缺失"}</span>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {apportioned && <p className="text-sm">{en ? "The source credits each joint candidate’s constituency seat to the first party named. The chamber composition lists joint holders separately." : "来源将联合候选人的选区席位计入首列政党。最终议会构成另列联合获席方。"}</p>}
      <p>{en ? "Derived shares = count / election denominator × 100. Missing seats remain missing, not zero. Rounded vote shares do not determine electoral qualification." : "计算占比＝票数或席位数／对应选举分母×100。缺失席位不转换为零；四舍五入的票率不能用于判断资格门槛。"}</p>
      {countrySlug==="germany"?<p>{en ? "Source: Die Bundeswahlleiterin, Wiesbaden. Source links identify the election evidence." : "来源：Die Bundeswahlleiterin, Wiesbaden。来源链接指向对应选举证据。"}</p>:null}
      </details>
      <section className="card p-5" aria-labelledby="politics-compare-title" data-politics-compare>
        <h3 id="politics-compare-title" className="font-semibold">{en ? "Compare two elections" : "比较两届选举"}</h3>
        <label className="mt-3 block text-sm">{en ? `Compare ${election.year} with` : `将 ${election.year} 年与以下选举比较`}<select className="field-control block" value={peerElection?.electionId ?? ""} onChange={(event) => compareWith(event.target.value)}>
          <option value="">{en ? "No comparison" : "不比较"}</option>
          {elections.filter((item) => item.electionId !== election.electionId).map((item) => <option key={item.electionId} value={item.electionId}>{item.year}</option>)}
        </select></label>
        {transitionPeer && !peerElection && <button type="button" className="mt-2 text-sm underline" onClick={()=>compareWith(transitionPeer.election_id)}>{en?"Compare the electoral reform with":"比较选制变迁"} · {transitionPeer.date.slice(0,4)}</button>}
        {peerElection?.national && (peerElection.national.ballots.length > 1 || compareVoteType !== null) && <label className="mt-2 block text-sm">{en?"Ballot in the comparison election":"对照选举的选票"}
          <select className="field-control block max-w-full" data-peer-vote-type value={other?.system.voteType??""} onChange={ev=>choosePeerBallot(ev.target.value)}>
            {!other&&<option value="" disabled>{en?"Choose an admitted ballot":"选择已收录的选票"}</option>}
            {peerElection.national.ballots.map(ballot=><option key={ballot.definition.id} value={ballot.definition.id}>{ballot.definition.label[locale]}</option>)}
          </select></label>}
        {peerElection && !other ? <p role="alert">{compareVoteType !== null
          ? (en ? "The linked ballot is unavailable in this election. Choose a recorded ballot to compare." : "这届选举未收录链接指定的选票，请选择已有选票进行比较。")
          : (en ? "No corresponding ballot is recorded for the selected round and vote type. Choose a comparison ballot." : "对照选举未登记与所选轮次和选票类型相对应的选票。请手动选择对照选票。")}</p> :
          other && crossesReform ? <ElectoralSystemComparison a={election} b={other} locale={locale}/> : other ? <>
          <div className="mt-3 flex flex-wrap gap-3" role="group" aria-label={en ? "Comparison mode" : "比较模式"}>{["verified","labels"].map(mode=><button key={mode} type="button" className="rounded border border-[var(--line)] px-3 py-2 text-sm" aria-pressed={comparisonMode===mode} onClick={()=>{setComparisonMode(mode);const url=new URL(window.location.href);url.searchParams.set("comparison_mode",mode);window.history.replaceState(null,"",url);}}>{mode==="verified"?(en?"Verified party-series comparison":"已核实政党序列比较"):(en?"Election-specific ballot labels":"当届选票名称比较")}</button>)}</div>
          {election.national?.historicalAllocation && other.national?.historicalAllocation && <HistoricalAllocationComparison a={election} b={other} locale={locale}/>}
          <div className="mt-4 overflow-x-auto" role="region" tabIndex={0} aria-label={en ? "Election-level comparison (scrollable)" : "选举层面的比较（可横向滚动）"}>
            <table className="w-full min-w-[520px] text-left text-sm" data-compare-aggregates>
              <caption className="mb-2 text-left font-semibold">{en ? "Election-level figures" : "选举层面的数字"}</caption>
              <thead><tr><th scope="col">{en ? "Measure" : "指标"}</th><th scope="col">{election.year}</th><th scope="col">{other.year}</th><th scope="col">{en ? `Difference (${other.year} − ${election.year})` : `差值（${other.year} − ${election.year}）`}</th></tr></thead>
              <tbody>{compareElections(election, other).map(row => {
                const isTurnout = row.key === "turnout";
                const digits = isTurnout ? (czech || round || peerRound ? 2 : 1) : 0;
                const candidateBallot = election.national?.activeVote.kind === "constituency" || other.national?.activeVote.kind === "constituency";
                const label = candidateBallot && row.key === "lists" ? (en ? "Recorded ballot competitors" : "已收录的参选项")
                  : candidateBallot && row.key === "seat_lists" ? (en ? "Competitors with seats" : "获得席位的参选项") : aggregateLabels[row.key];
                return <tr key={row.key} className="border-t border-[var(--line)]" data-aggregate={row.key}>
                  <th scope="row" className="py-2 font-normal">{label}</th>
                  <td className="metric-number">{number(row.a, digits)}{isTurnout && round && <small className="block">{roundElectorateLabel(round,locale)} · {round.date}</small>}</td>
                  <td className="metric-number">{number(row.b, digits)}{isTurnout && peerRound && <small className="block">{roundElectorateLabel(peerRound,locale)} · {peerRound.date}</small>}</td>
                  <td className="metric-number">{signed(row.difference, digits)}{isTurnout && row.difference !== null && (en ? " pp" : " 个百分点")}
                    {isTurnout && row.difference === null && (compositeComparison || round || peerRound) && <small className="block">
                      {compositeComparison ? (en ? "The territorial-list total combines polling rounds and has no single turnout." : "地区名单票合并了不同轮次，没有单一投票率。") : round?.electorateScope === "restricted" || peerRound?.electorateScope === "restricted"
                        ? (en ? "Runoff coverage depends on which constituencies required a second ballot." : "各届复选范围取决于哪些选区需要举行第二轮投票。")
                        : (en ? "A common turnout definition has not been verified for this pair." : "这两届投票率尚无经核实的共同统计口径。")}
                    </small>}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          {countrySlug === "germany" && <GermanElectionRuleComparison a={election} b={other} locale={locale}/>}
          {countrySlug === "czechia" && <CzechElectionRuleComparison a={election} b={other} locale={locale}/>}
          <details className="mt-3" data-paired-elections><summary className="font-semibold">{en?"Compare both ballots, seat distributions and rules":"并列查看两届选票、席位分布与规则"}</summary>
            <div className="mt-3 grid min-w-0 gap-5 lg:grid-cols-2">{[election,other].map(item=>{
              const view=nationalComparisonView(item);
              return <div key={item.electionId}>{countrySlug === "czechia" && <h4 className="font-semibold">{item.year}</h4>}
                <ScopedDistribution election={view} ballot={view.ballots.find(b => b.id === item.system.voteType) ?? view.ballots[0]} country={countrySlug} locale={locale} compactRules={countrySlug === "czechia"}/>
                {countrySlug !== "czechia" && <p className="mt-2 text-xs">{item.system.allocationMethod} · {en?"Base seats":"基础席位"} {number(item.system.baseSeats)}</p>}
                {item.national?.historicalAllocation ? <HistoricalChamberReconciliation election={item} locale={locale}/> : item.national?.seatTiers&&<p className="text-xs">{en?"National list seats":"全国名单席位"} {item.national.seatTiers.nationalList} · {en?"Single-member district seats":"单一选区席位"} {item.national.seatTiers.constituency}
                  {item.national.seatTiers.independentConstituency ? <> · {en?"Independent district seats included":"其中独立候选人选区席位"} {item.national.seatTiers.independentConstituency}</>:null}</p>}
                <ul className="mt-2 text-xs">{item.sources.map(source=><li key={source.id}><a className="underline" href={source.url}>{source.title}</a></li>)}</ul>
              </div>;
            })}</div>
          </details>
          {comparisonMode === "verified" ? countrySlug !== "germany" ? <PoliticalLinkedComparison elections={elections} links={identityLinks} a={election} b={other} locale={locale}/> : <PoliticalVerifiedComparison a={election} b={other} locale={locale} onHistory={id=>{const url=new URL(window.location.href);url.searchParams.set("series",id);url.hash="politics-history-title";window.history.replaceState(null,"",url);setHistoryKey(k=>k+1);window.setTimeout(()=>document.getElementById("politics-history-title")?.scrollIntoView(),0);}}/> : <ElectionBallotLabelComparison a={election} b={other} locale={locale}/>}
        </> : <p className="mt-3 text-sm text-[var(--muted)]">{en ? "Choose a second election to see election-level differences and the two sets of lists side by side." : "选择另一届选举，即可查看选举层面的差值，并并排查看两届的名单。"}</p>}
      </section>
      <PoliticalPartyHistory key={historyKey} elections={elections} locale={locale} identityLinks={identityLinks}/>
      <PoliticalNationalDetails election={election} comparison={other} locale={locale}/>
      <PoliticalPollingPanel data={pollingData} country={election.country??"germany"} locale={locale}/>
      {contextInputs ? <details id="politics-context-disclosure" className="card scroll-mt-24 p-5" open={contextOpen} onToggle={event=>setContextOpen(event.currentTarget.open)} data-context-disclosure><summary className="cursor-pointer font-semibold">{en ? "Explore election-economic historical context" : "探索选举与经济历史背景"}</summary><p className="mt-2 text-sm">{en ? "Published annual and monthly observations, verified events and a source-linked timeline. Historical context only, not an explanation of voting behaviour." : "已发布年度与月度观测、已核验事件和可查来源的时间线。仅为历史背景，不解释投票行为。"}</p>{contextOpen ? <PoliticalEconomicContext election={election} comparison={other ?? null} inputs={contextInputs} locale={locale} allElections={[...elections,...comparisonCountries.flatMap(c=>c.elections)]}/> : null}</details> : null}
      <section className="card p-5" data-politics-cross-country>
        <h3 className="font-semibold">{en ? "Comparing countries" : "跨国比较"}</h3>
        <nav className="mt-2 flex flex-wrap gap-x-4 text-sm" aria-label={en?"Other election pages":"其他国家选举页"}>{politicalAdmissions.filter(v=>v.state==="admitted"&&v.politicsRoute!==false&&v.slug!==countrySlug).map(v=><a key={v.slug} data-politics-country-view={v.slug} className="text-[var(--accent)] underline" href={localizedRoute("/politics/"+v.slug+"/",locale)}>{v.name[locale]}</a>)}</nav>
        <PoliticalComparisonPicker election={election} countries={comparisonCountries} locale={locale}/>
        <details className="mt-4 border-t border-[var(--line)] pt-3" data-admission-status>
          <summary className="cursor-pointer text-sm font-semibold">{en ? "Publication-gate status by country" : "各国发布关卡状态"}</summary>
          <p className="mt-2 text-xs text-[var(--muted)]">{en ? "A country is compared only after every source, reuse-permission, definition, identity, electoral-rule and vintage gate is closed. Blocked countries show no values." : "只有在来源、再利用许可、定义、身份、选举规则与版本关卡全部关闭后，一个国家才能参与比较。受阻国家不显示任何数值。"}</p>
          <ul className="mt-2 grid gap-2 text-sm">{politicalAdmissions.map((row) => (
            <li key={row.slug} data-admission={row.slug} data-admission-state={row.state}>
              <span className="font-semibold">{en ? row.name.en : row.name["zh-CN"]}</span>{" · "}<span className="text-xs font-semibold text-[var(--accent)]">{row.state === "admitted" ? (en ? "Admitted" : "已准入") : row.state === "staged_not_published" ? (en ? "Staged, not published" : "暂存，未发布") : (en ? "Blocked" : "受阻")}</span>
              <span className="block text-xs text-[var(--muted)]">{en ? row.reason.en : row.reason["zh-CN"]}</span>
              {row.causes.length ? <span className="mt-1 flex flex-wrap gap-1" data-admission-causes>{row.causes.map((cause) => <span key={cause} data-admission-cause={cause} className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs">{en ? blockerCauseLabels[cause].en : blockerCauseLabels[cause]["zh-CN"]}</span>)}</span> : null}
            </li>
          ))}</ul>
          <p className="mt-2 text-xs text-[var(--muted)]">{en ? notInAdmissionPipeline.en : notInAdmissionPipeline["zh-CN"]}</p>
        </details>
      </section>
      <details className="card p-5"><summary className="cursor-pointer font-semibold">{en ? "Sources, provenance and downloads" : "来源、出处与下载"}</summary>
        <ul className="mt-4 space-y-4">{election.sources.map(source => <li key={source.id} className="break-words text-sm"><a href={source.url} className="underline">{source.title}</a><p className="text-xs">SHA-256: {source.sha256} · {en ? "Retrieved" : "获取时间"}: {source.retrievedAt}</p>{source.licenceUrl ? <a href={source.licenceUrl} className="underline">{en ? "Reuse terms" : "复用条款"}</a> : null}<div className="mt-2"><NotebookCollect create={() => draft(source.id)} label={en ? "Collect source" : "收藏来源"} /></div></li>)}</ul>
        <div className="mt-4 space-y-2 text-sm" data-politics-definitions>
          <p className="font-semibold">{en ? "Definitions and formulas" : "定义与公式"}</p>
          <p>{en ? "Published values (vote share, turnout) are the election authority's own figures and are shown as published." : "官方公布值（得票率、投票率）是选举机构自己的数字，按公布值显示。"}</p>
          <p>{en ? "Derived vote share = contestant votes ÷ the source-defined denominator × 100. Whole-chamber seat share is calculated only when that ballot's seat scope and the chamber total are known. Derived values never replace a published value." : "计算得票率＝参选方票数 ÷ 来源定义的分母 × 100。仅在该选票的席位范围和议院总席位均已明确时计算全议院席位占比。计算值不替代官方公布值。"}</p>
          <p>{en ? "Turnout" : "投票率"}: {election.turnoutDefinition ? <span lang="en">{election.turnoutDefinition}</span> : (en ? "definition not recorded" : "未记录定义")}</p>
          <p>{en ? `Result vintage: “${election.resultVintage}”. A corrected vintage replaces the earlier figures for that election and is stated wherever it applies.` : `结果版本：“${election.resultVintage}”。更正版本会取代该届选举的早期数字，并在适用处注明。`}</p>
          <p>{en ? "Reuse: each source below links to the publisher's reuse terms; the Atlas redistributes only data whose terms allow it." : "复用：下方每个来源都链接到发布方的复用条款；Atlas 只再分发条款允许的数据。"}</p>
        </div>
        {(countrySlug === "serbia" || countrySlug === "hungary" || election.national?.germanAllocation) && <ElectionResultDownloads key={election.electionId + election.system.voteType} election={election} en={en}/>}
        {countrySlug === "serbia" && <p className="mt-4"><a href="/research-data/political/serbia/election_results.csv" className="underline">{en ? "Results CSV (2020, 2022, 2023, 2026)" : "结果CSV（2020、2022、2023、2026）"}</a>{" · "}<a href="/research-data/political/serbia/manifest.json" className="underline">{en ? "Export manifest" : "导出清单"}</a></p>}
        {countrySlug === "hungary" && <p className="mt-4"><a href="/research-data/political/hungary/election_results.csv" className="underline">{en ? "Results CSV ("+elections.map(e=>e.year).join(", ")+")" : "结果CSV（"+elections.map(e=>e.year).join("、")+"）"}</a>{" · "}<a href="/research-data/political/hungary/manifest.json" className="underline">{en ? "Export manifest" : "导出清单"}</a></p>}
        {countrySlug === "slovakia" && <p className="mt-4"><a href="/research-data/political/slovakia/election_results.csv" className="underline">{en ? "Results CSV (2023)" : "结果CSV（2023）"}</a>{" · "}<a href="/research-data/political/slovakia/manifest.json" className="underline">{en ? "Export manifest" : "导出清单"}</a></p>}
        {countrySlug === "poland" && <p className="mt-4"><a href="/research-data/political/poland/election_results.csv" className="underline">{en ? "Results CSV (2011–2023)" : "结果CSV（2011—2023）"}</a>{" · "}<a href="/research-data/political/poland/manifest.json" className="underline">{en ? "Export manifest" : "导出清单"}</a>{" · "}<a href="/research-data/political/poland/party_identity_links.csv" className="underline">{en ? "Unresolved identity links CSV" : "未确定身份关联CSV"}</a></p>}
        {countrySlug === "czechia" && <p className="mt-4"><a href="/research-data/political/czechia/election_results.csv" className="underline">{en ? "Results CSV (all listed elections)" : "历届选举结果 CSV"}</a>{" · "}<a href="/research-data/political/czechia/manifest.json" className="underline">{en ? "Export manifest" : "导出清单"}</a></p>}
        {countrySlug === "germany" && <p className="mt-4"><a href="/research-data/political/germany/election_results.csv" className="underline">{en ? "Results CSV (all ten elections, 1990–2025)" : "结果CSV（十届选举，1990–2025）"}</a>{" · "}<a href="/research-data/political/germany/manifest.json" className="underline">{en ? "Twelve-store JSON/CSV manifest" : "十二张表JSON／CSV清单"}</a>{" · "}<a href="/research-data/political/germany/election_turnout.csv" className="underline">{en ? "Turnout CSV" : "投票率CSV"}</a>{" · "}<a href="/research-data/political/germany/electoral_systems.csv" className="underline">{en ? "Electoral-system rules CSV" : "选举制度规则CSV"}</a></p>}
      </details>
    </>}
  </section>;
}
