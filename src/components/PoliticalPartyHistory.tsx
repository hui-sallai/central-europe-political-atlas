"use client";

import { useEffect, useMemo, useState } from "react";
import { localeDate, localeNumber, localizedRoute, type Locale } from "@/i18n/config";
import { chamberSeats, chamberSeatShare, type PoliticalElectionView, type PoliticalSource } from "@/lib/politicalExplorer";
import { germanOfficialSeries, OFFICIAL_SERIES_SOURCE, type OfficialSeries } from "@/lib/politicalSeries";
import { sourceVerifiedPartySeries, type PoliticalIdentityLink } from "@/lib/politicalIdentity";
import { PLATFORM_BASE_URL } from "@/lib/releaseMetadata";
import { electionInstitutionalContext } from "@/lib/institutionalRegistry";
import { NotebookCollect } from "./NotebookCollect";
import { ResearchTimeSeriesChart } from "./ResearchTimeSeriesChart";

// Party history across Bundestag elections. Only series that the Federal Returning Officer's longitudinal table
// presents as one party (linked by exact official second-vote counts, never by name) are offered. Values come from the
// canonical election stores; an election without a list in the series is a gap, never zero or interpolated.
type HistoryMeasure = "published_share" | "votes" | "seats" | "seat_share";

export type PartyHistoryRow = { election: PoliticalElectionView; link: OfficialSeries["links"][number] | null; label: string | null; votes: number | null; publishedShare: number | null; seats: number | null; seatShare: number | null; sources: PoliticalSource[] };

export function partyHistoryRows(series: Pick<OfficialSeries, "links">, elections: PoliticalElectionView[]): PartyHistoryRow[] {
  return elections.map((election) => {
    const link = series.links.find((item) => item.electionId === election.electionId) ?? null;
    const result = link ? election.results.find((item) => item.contestantId === link.contestantId) ?? null : null;
    return { election, link, label: result?.nativeLabel ?? null, votes: result?.secondVotes ?? null, publishedShare: result?.publishedVoteShare ?? null, seats: result ? chamberSeats(result,election) : null, seatShare: result ? chamberSeatShare(result,election) : null, sources: result ? election.sources.filter(s=>s.id===result.sourceId||s.id===result.chamberSeatSourceId) : [] };
  });
}

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function PoliticalPartyHistory({ elections, locale, identityLinks=[] }: { elections: PoliticalElectionView[]; locale: Locale;identityLinks?:PoliticalIdentityLink[] }) {
  const en = locale === "en";
  const country=elections[0]?.country??"germany",german=country==="germany";
  const registry=useMemo(()=>german?germanOfficialSeries:sourceVerifiedPartySeries(elections,identityLinks),[german,elections,identityLinks]);
  const firstLinkedCzechElection = country === "czechia"
    ? elections.find(election => registry.some(item => item.links.some(link => link.electionId === election.electionId)))
    : undefined;
  const [seriesId, setSeriesId] = useState("");
  const [measure, setMeasure] = useState<HistoryMeasure>("published_share");
  useEffect(() => {
    function restore() {
      const params=new URLSearchParams(window.location.search);
      const requested=params.get("series");
      setSeriesId(registry.find(item=>item.id===requested)?.id??"");
      const next=params.get("series_measure");
      setMeasure(next==="votes"||next==="seats"||next==="seat_share"?next:"published_share");
    }
    const timer=window.setTimeout(restore, 0);
    window.addEventListener("popstate",restore);
    return ()=>{window.clearTimeout(timer);window.removeEventListener("popstate",restore);};
  }, [registry]);
  function choose(id: string, next: HistoryMeasure) {
    setSeriesId(id); setMeasure(next);
    const url = new URL(window.location.href); if (id) url.searchParams.set("series", id); else url.searchParams.delete("series"); url.searchParams.set("series_measure", next);
    window.history.replaceState(null, "", url);
  }
  const series = registry.find((item) => item.id === seriesId);
  const rows = series ? partyHistoryRows(series, elections) : [];
  const identityIds = series && "evidenceSourceIds" in series ? series.evidenceSourceIds : [];
  const officialHistory=elections.flatMap(e=>e.sources).find(s=>s.id===OFFICIAL_SERIES_SOURCE.source_id);
  const identitySources: PoliticalSource[] = german ? [officialHistory??{
    id: OFFICIAL_SERIES_SOURCE.source_id, title: "Historical national results compilation", institution: "Die Bundeswahlleiterin, Wiesbaden",
    url: OFFICIAL_SERIES_SOURCE.url, sha256: OFFICIAL_SERIES_SOURCE.sha256,
  }] : [...new Map(elections.flatMap(e=>e.sources).filter(s=>identityIds.includes(s.id)).map(s=>[s.id,s])).values()];
  const rowSourceUrls=(row:PartyHistoryRow)=>row.sources.map(s=>s.url).join(" | ");
  const seriesEdges=identityLinks.filter(edge=>["same_party","documented_rename","authority_series"].includes(edge.relation)&&edge.status==="verified"&&identityIds.some(id=>edge.sourceIds.includes(id))
    && series?.links.some(l=>l.electionId===edge.fromElection && l.contestantId===edge.fromContestant)
    && series.links.some(l=>l.electionId===edge.toElection && l.contestantId===edge.toContestant));
  const relationLabels: Record<PoliticalIdentityLink["relation"],string>={
    same_party:en?"Same registered party":"同一登记政党", documented_rename:en?"Documented legal rename":"有法律文件记载的更名",
    authority_series:en?"Official historical series":"官方历史序列", merger:en?"Merger":"合并",split:en?"Split":"分立",
    alliance_membership:en?"Alliance member":"联盟成员",same_coalition_composition:en?"Same coalition composition":"相同联盟构成",
  };
  const labels: Record<HistoryMeasure, { label: string; unit: string }> = en
    ? { published_share: { label: german?"Second-vote share (published)":"Vote share (published)", unit: "%" }, votes: { label: german?"Second votes (official count)":"Votes (official count)", unit: "votes" }, seats: { label: "Seats", unit: "seats" }, seat_share: { label: "Seat share (derived)", unit: "%" } }
    : { published_share: { label: german?"第二票得票率（官方公布）":"得票率（官方公布）", unit: "%" }, votes: { label: german?"第二票数（官方计数）":"票数（官方计数）", unit: "票" }, seats: { label: "席位", unit: "席" }, seat_share: { label: "席位占比（计算值）", unit: "%" } };
  const value = (row: PartyHistoryRow) => (measure === "published_share" ? row.publishedShare : measure === "votes" ? row.votes : measure === "seats" ? row.seats : row.seatShare);
  const digits = measure === "votes" || measure === "seats" ? 0 : 1;
  const format = (v: number | null) => (v === null ? "—" : `${localeNumber(v, locale, { maximumFractionDigits: digits, minimumFractionDigits: digits })}${measure.endsWith("share") ? "%" : ""}`);
  const stood = rows.filter((row) => row.link);
  const vintage = (row: PartyHistoryRow) => (german && row.election.year === 2021 ? (en ? "corrected final (after the 2024 Berlin repeat)" : "更正后的最终结果（2024年柏林部分重选后）") : row.election.resultVintage);
  const missingSeats = (row: PartyHistoryRow) => row.link && row.seats === null;
  const chartPoints = rows.map((row) => ({ x: german?row.election.year:Date.parse(row.election.date), y: row.link ? value(row) : null, detail: row.link ? `${row.election.year} · ${row.label} · ${format(value(row))}${measure.startsWith("seat") && missingSeats(row) ? (en ? " (seat count unavailable)" : "（席位数未记录）") : ""} · ${vintage(row)}` : `${row.election.year} · ${german?(en?"no list in the official series":"官方序列未列名单"):(en?"no verified link":"无已核实关联")}` }));

  function exportCsv() {
    if (!series) return;
    const header = ["country", "series_id", "authority_series_label", "relationship", "election_id", "election_date", "contestant_id", "original_ballot_label", german?"second_votes_official":"votes_official", german?"second_vote_share_published":"vote_share_published", "seats", "seat_share_derived", "result_vintage", "identity_verification_status", "identity_evidence_source", "identity_evidence_sha256", "authority_note", "chamber", "observation_source_ids", "observation_source_urls"];
    const lines = stood.map((row) => [ country, series.id, series.label, series.relationship, row.election.electionId, row.election.date, row.link!.contestantId, row.label, row.votes, row.publishedShare, row.seats, row.seatShare === null ? "" : row.seatShare.toFixed(6), row.election.resultVintage + (german && row.election.year === 2021 ? " (corrected after 2024 Berlin repeat)" : ""), german?"verified_official_longitudinal_series":"source_verified_party_continuity", identitySources.map(s=>s.url).join(" | "), identitySources.map(s=>s.sha256??"").join(" | "), row.link!.note ?? "", row.election.chamber??"", row.sources.map(s=>s.id).join(" | "), rowSourceUrls(row) ].map(csvCell).join(","));
    const url = URL.createObjectURL(new Blob([`﻿${[header.join(","), ...lines].join("\n")}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${country}-party-history-${series.id}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  function showContestants() {
    const detail=document.querySelector<HTMLDetailsElement>("[data-results-disclosure]");
    if(!detail) return;
    detail.open=true;
    detail.querySelector("summary")?.focus();
    detail.scrollIntoView({block:"start"});
  }

  return (
    <section className="card p-5" aria-labelledby="politics-history-title" data-politics-history={series?.id ?? ""}>
      <h3 id="politics-history-title" className="font-semibold">{en ? "Party history across elections" : "政党的跨届选举历史"}</h3>
      <p className="mt-2 text-sm">{!german?(en?"Only explicit source-verified party-list links are offered. Alliances, mergers and splits do not automatically continue a series.":"仅提供来源已核实的政党名单关联；联盟、合并和分裂不自动延续序列。"):en ? "Only parties that the Federal Returning Officer's historical results table presents as one series are offered. Each election's list was matched to that table by its exact official second-vote count, never by name." : "仅提供联邦选举委员会历史结果表中作为同一序列呈现的政党。每届名单都是按官方第二票数完全相等与该表对应的，从不按名称匹配。"}</p>
      {firstLinkedCzechElection && elections[0].year < firstLinkedCzechElection.year && <p className="mt-2 text-sm" data-identity-coverage>
        {en ? `Verified party links begin with the ${firstLinkedCzechElection.year} election. Earlier ballots retain each list’s votes and seats. Continuity with later parties is unverified.` : `已核实的政党关联始于 ${firstLinkedCzechElection.year} 年选举。此前各届保留每份名单的票数和席位，与后来政党的连续性尚待核实。`}
        {" "}<button type="button" className="underline" onClick={showContestants}>{en ? "View lists in the selected election" : "查看所选届次的名单"}</button>
      </p>}
      {registry.length===0 ? <div role="status" className="mt-3 text-sm" data-history-no-series>
        <p>{en?"The archive has no verified cross-election party series for this country. Each election retains its original contestant and joint-list results.":"该国档案中尚无已核实的跨届政党序列。各届均保留原始参选名单与联合名单结果。"}</p>
        <button type="button" className="mt-2 underline" onClick={showContestants}>{en?"View contestants in the selected election":"查看所选届次的参选名单"}</button>
      </div> : <>
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="min-w-0 text-sm">{en ? "Party (authority's series)" : "政党（官方序列）"}<select className="field-control block max-w-full" value={seriesId} onChange={(event) => choose(event.target.value, measure)}><option value="">{en ? "Select a party" : "请选择政党"}</option>{registry.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.links.length}</option>)}</select></label>
        <label className="text-sm">{en ? "Measure" : "指标"}<select className="field-control block" value={measure} onChange={(event) => choose(seriesId, event.target.value as HistoryMeasure)}>{(Object.keys(labels) as HistoryMeasure[]).map((key) => <option key={key} value={key}>{labels[key].label}</option>)}</select></label>
      </div>
      {!series ? <p className="mt-3 text-sm" role="status" data-history-empty>{en ? "Select a verified official party series to view its historical chart, observations and CSV export. No party is selected by default." : "请选择已核实的官方政党序列，查看历史图表、观测与 CSV 导出。默认不选择任何政党。"}</p> : <>
      <p className="mt-3 text-sm" data-history-overview>{!german?(en?"Source-verified election-specific observations; original ballot labels are retained. No name matching or automatic legal succession is inferred.":"按来源核实的各届观测，保留原始选票名称；不按名称匹配，不自动推断法律继承。"):en
        ? `${series.label} has a list in ${stood.length} of ${elections.length} Bundestag elections from ${elections[0].year} to ${elections.at(-1)!.year}. ${series.relationship === "name_change_documented_by_authority" ? "The authority's table notes that the party stood under other names in some of these elections; the original ballot label of each election is shown below." : "The authority's table records no change of party name over these elections."}`
        : `${series.label} 在 ${elections[0].year}—${elections.at(-1)!.year} 年的 ${elections.length} 届联邦议院选举中有 ${stood.length} 届提交了名单。${series.relationship === "name_change_documented_by_authority" ? "官方表格注明该党在其中部分选举中使用过其他名称；下表列出每届选举的原始选票名称。" : "官方表格未记载该党在这些选举中更改名称。"}`}</p>
      <div className="mt-4">
        <ResearchTimeSeriesChart interactive containerRole="group" title={`${series.label}: ${labels[measure].label}`} description={en ? "One point per linked election and recorded measure. A gap marks a missing link or value." : "每个点对应一届选举中具有已核实关联的观测值。空缺表示缺少关联或数值。"} series={[{ id: series.id, label: series.label, color: "var(--accent)", points: chartPoints, markers: true }]} xKind="number" xLabel={german?(en ? "Election year" : "选举年份"):(en?"Election date":"选举日期")} yLabel={`${labels[measure].label} (${labels[measure].unit})`} xTickValues={elections.map((election) => german?election.year:Date.parse(election.date))} includeZero formatX={(v) => german?String(v):new Date(v).toISOString().slice(0,10)} legend={false} />
      </div>
      {measure === "seats" || measure === "seat_share" ? <p className="mt-2 border-l-2 border-[var(--accent)] pl-3 text-sm" role="note" data-seat-caveat>{!german?(en?"Seat changes depend on each election’s rules, thresholds, minority allocation and chamber size; see the source notes of every election.":"席位变化涉及各届规则、门槛、少数群体分配和议院规模，请参阅每届来源说明。"):en ? "Seats depend on the electoral rules of each election — allocation method, overhang and compensation seats, chamber size and the 5% threshold all changed in this period (Hare/Niemeyer until 2005, Sainte-Laguë/Schepers from 2009, a fixed 630 seats in 2025). A change in seats is not a change in popular support; compare vote shares for that." : "席位取决于每届选举的规则——本时期分配方法、超额与补偿席位、议会规模和 5% 门槛都发生过变化（2005 年前采用 Hare/Niemeyer，2009 年起采用 Sainte-Laguë/Schepers，2025 年固定为 630 席）。席位变化不等于民众支持的变化；比较支持度请看得票率。"}</p> : null}
      <div className="mt-4 overflow-x-auto" role="region" tabIndex={0} aria-label={en ? "Election-by-election values (scrollable)" : "逐届数值（可横向滚动）"}>
        <table className="w-full min-w-[640px] text-left text-sm" data-history-table>
          <thead><tr><th scope="col">{en ? "Election" : "选举"}</th><th scope="col">{en ? "Original ballot label" : "原始选票名称"}</th><th scope="col">{labels[measure].label}</th><th scope="col">{en ? "Result vintage" : "结果版本"}</th><th scope="col">{en ? "Authority's note" : "官方备注"}</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.election.electionId} className="border-t border-[var(--line)]" data-history-year={row.election.year} data-history-state={row.link ? "observed" : german ? "no_list" : "unverified_link"}>
              <th scope="row" className="py-2 font-normal"><a className="underline" href={localizedRoute("/politics/"+country+"/",locale)+"?election="+encodeURIComponent(row.election.electionId)}>{localeDate(row.election.date, locale)}</a></th>
              <td>{row.link ? <span lang={row.election.originalLanguage??(german?"de":undefined)}>{row.label}</span> : <span className="text-[var(--muted)]">{german?(en ? "No list in this series (not on the authority's table for this election)" : "该系列在此届无名单（官方表格中此届无此行）"):(en?"No verified identity link for this election":"该届尚无已核实的身份关联")}</span>}</td>
              <td className="metric-number">{row.link ? format(value(row)) : "—"}</td>
              <td className="text-xs">{row.link && <>{vintage(row)}{row.sources.map(s=><a key={s.id} className="block break-words underline" href={s.url}>{s.title}</a>)}</>}</td>
              <td className="text-xs">{row.link?.note && /Parteiname/.test(row.link.note) ? <span lang="de" data-original-language="de">{row.link.note}</span> : ""}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-3 text-sm" data-history-limitations>{!german?(en?"Only reviewed links support this trajectory. Gaps are not zero. Party lists remain separate from alliances; a historical relation is not an attribution of an alliance’s votes to a member party.":"仅已审核关联支持本序列，缺失不是零。政党名单和联盟保持分离，历史关系不等于将联盟得票分给成员政党。"):en ? "Limitations: the series reflects the electoral authority's statistical attribution of results to one party, not a party-register or legal-entity decision. Every contestant in the Atlas records for this period is a single party's own list (none is recorded as a joint list), lists are never combined, and no mergers or splits are inferred. Values are descriptive; they are not forecasts and say nothing about why support changed." : "局限：该序列反映的是选举机构把各届结果统计归属于同一政党的做法，不是政党登记或法律主体层面的认定。Atlas 记录中本时期的每份参选名单都是单一政党自己的名单（没有记录为联合名单的），名单从不合并，也不推断任何合并或分裂。数值仅为描述，不是预测，也不说明支持度变化的原因。"}</p>
      <div className="mt-3 space-y-1 text-xs text-[var(--muted)]" data-history-research>
        <p>{en ? "Series ID" : "序列 ID"}: {series.id} · {en ? "relationship" : "关系类型"}: {!german?[...new Set(seriesEdges.map(e=>relationLabels[e.relation]))].join(" · "):series.relationship === "name_change_documented_by_authority" ? (en ? "B — name change documented by the authority" : "B——官方记载的更名") : (en ? "A — same party per the authority's series" : "A——官方序列中的同一政党")}</p>
        <p>{en ? "Election-specific contestant IDs" : "各届参选名单 ID"}: {stood.map((row) => `${row.election.year} ${row.link!.contestantId}`).join(" · ")}</p>
        <p>{en ? "Identity evidence" : "身份证据"} · {identitySources.map(s=><a key={s.id} className="mr-2 break-words underline" href={s.url}>{s.title}{s.sha256 && " · SHA-256 "+s.sha256.slice(0,16)+"…"}</a>)}{german && OFFICIAL_SERIES_SOURCE.licence}</p>
        <p>{en ? "Derived seat share = seats ÷ seats after the election × 100. Published shares are the authority's rounded figures." : "计算席位占比＝席位 ÷ 本届选举产生的席位 × 100。官方得票率为选举机构公布的四舍五入值。"}</p>
      </div>
      <button type="button" onClick={exportCsv} className="mt-3 rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)]" data-history-export>{en ? "Download this series (CSV)" : "下载此序列（CSV）"}</button>
      <div className="mt-2"><NotebookCollect label={en?"Save verified party history":"收藏已核实政党历史"} create={()=>{
        const url=new URL(localizedRoute("/politics/"+country+"/",locale),PLATFORM_BASE_URL);
        url.searchParams.set("series",series.id);url.searchParams.set("series_measure",measure);url.hash="politics-history-title";
        const sources=[...new Map([...identitySources,...stood.flatMap(r=>r.sources)].map(s=>[s.id,s])).values()];
        const chambers=[...new Set(stood.flatMap(r=>electionInstitutionalContext(r.election.electionId)?.chamber_id??[]))];
        return {type:"series_view",title:series.label+" · "+labels[measure].label,url:url.href,canonical_ids:[series.id,...stood.flatMap(r=>[r.election.electionId,r.link!.contestantId])],
          countries:[country],periods:rows.map(r=>r.election.date),layer:"verified_electoral_party_history",unit:labels[measure].unit,
          sources:sources.map(s=>({institution:s.institution??s.title,dataset:s.title,url:s.url,code:s.id,layer:"electoral_record",...(s.retrievedAt?{retrieved_at:s.retrievedAt}:{})})),
          warnings:[en?"Only recorded observations with a verified identity link enter this series.":"该序列仅收录具有已核实身份关联的观测。"],
          metadata:{filters:{measure,series:series.id,chambers},row_count:stood.filter(r=>value(r)!==null).length,entersModel:false}};
      }}/></div>
      </>}
      </>}
    </section>
  );
}
