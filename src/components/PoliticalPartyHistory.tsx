"use client";

import { useEffect, useState } from "react";
import { localeDate, localeNumber, type Locale } from "@/i18n/config";
import { descriptiveShare, type PoliticalElectionView } from "@/lib/politicalExplorer";
import { germanOfficialSeries, OFFICIAL_SERIES_SOURCE, type OfficialSeries } from "@/lib/politicalSeries";
import { ResearchTimeSeriesChart } from "./ResearchTimeSeriesChart";

// Party history across Bundestag elections. Only series that the Federal Returning Officer's longitudinal table
// presents as one party (linked by exact official second-vote counts, never by name) are offered. Values come from the
// canonical election stores; an election without a list in the series is a gap, never zero or interpolated.
type HistoryMeasure = "published_share" | "votes" | "seats" | "seat_share";

export type PartyHistoryRow = { election: PoliticalElectionView; link: OfficialSeries["links"][number] | null; label: string | null; votes: number | null; publishedShare: number | null; seats: number | null; seatShare: number | null };

export function partyHistoryRows(series: OfficialSeries, elections: PoliticalElectionView[]): PartyHistoryRow[] {
  return elections.map((election) => {
    const link = series.links.find((item) => item.electionId === election.electionId) ?? null;
    const result = link ? election.results.find((item) => item.contestantId === link.contestantId) ?? null : null;
    return { election, link, label: result?.nativeLabel ?? null, votes: result?.secondVotes ?? null, publishedShare: result?.publishedVoteShare ?? null, seats: result?.seats ?? null, seatShare: result ? descriptiveShare(result.seats, election.totalSeats) : null };
  });
}

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function PoliticalPartyHistory({ elections, locale }: { elections: PoliticalElectionView[]; locale: Locale }) {
  const en = locale === "en";
  const [seriesId, setSeriesId] = useState("");
  const [measure, setMeasure] = useState<HistoryMeasure>("published_share");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("series"), requestedMeasure = params.get("series_measure");
    const timer = window.setTimeout(() => {
      if (germanOfficialSeries.some((item) => item.id === requested)) setSeriesId(requested!);
      if (["published_share", "votes", "seats", "seat_share"].includes(requestedMeasure ?? "")) setMeasure(requestedMeasure as HistoryMeasure);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function choose(id: string, next: HistoryMeasure) {
    setSeriesId(id); setMeasure(next);
    const url = new URL(window.location.href); if (id) url.searchParams.set("series", id); else url.searchParams.delete("series"); url.searchParams.set("series_measure", next);
    window.history.replaceState(null, "", url);
  }
  const series = germanOfficialSeries.find((item) => item.id === seriesId);
  const rows = series ? partyHistoryRows(series, elections) : [];
  const labels: Record<HistoryMeasure, { label: string; unit: string }> = en
    ? { published_share: { label: "Second-vote share (published)", unit: "%" }, votes: { label: "Second votes (official count)", unit: "votes" }, seats: { label: "Seats", unit: "seats" }, seat_share: { label: "Seat share (derived)", unit: "%" } }
    : { published_share: { label: "第二票得票率（官方公布）", unit: "%" }, votes: { label: "第二票数（官方计数）", unit: "票" }, seats: { label: "席位", unit: "席" }, seat_share: { label: "席位占比（计算值）", unit: "%" } };
  const value = (row: PartyHistoryRow) => (measure === "published_share" ? row.publishedShare : measure === "votes" ? row.votes : measure === "seats" ? row.seats : row.seatShare);
  const digits = measure === "votes" || measure === "seats" ? 0 : 1;
  const format = (v: number | null) => (v === null ? "—" : `${localeNumber(v, locale, { maximumFractionDigits: digits, minimumFractionDigits: digits })}${measure.endsWith("share") ? "%" : ""}`);
  const stood = rows.filter((row) => row.link);
  const vintage = (row: PartyHistoryRow) => (row.election.year === 2021 ? (en ? "corrected final (after the 2024 Berlin repeat)" : "更正后的最终结果（2024年柏林部分重选后）") : (en ? "final" : "最终结果"));
  const missingSeats = (row: PartyHistoryRow) => row.link && row.seats === null;
  const chartPoints = rows.map((row) => ({ x: row.election.year, y: row.link ? value(row) : null, detail: row.link ? `${row.election.year} · ${row.label} · ${format(value(row))}${measure.startsWith("seat") && missingSeats(row) ? (en ? " (no seats)" : "（无席位）") : ""} · ${vintage(row)}` : `${row.election.year} · ${en ? "no list in this series" : "该系列在此届无名单"}` }));

  function exportCsv() {
    if (!series) return;
    const header = ["country", "series_id", "authority_series_label", "relationship", "election_id", "election_date", "contestant_id", "original_ballot_label", "second_votes_official", "second_vote_share_published", "seats", "seat_share_derived", "result_vintage", "identity_verification_status", "identity_evidence_source", "identity_evidence_sha256", "authority_note"];
    const lines = stood.map((row) => [ "germany", series.id, series.label, series.relationship, row.election.electionId, row.election.date, row.link!.contestantId, row.label, row.votes, row.publishedShare, row.seats, row.seatShare === null ? "" : row.seatShare.toFixed(6), row.election.resultVintage + (row.election.year === 2021 ? " (corrected after 2024 Berlin repeat)" : ""), "verified_official_longitudinal_series", OFFICIAL_SERIES_SOURCE.url, OFFICIAL_SERIES_SOURCE.sha256, row.link!.note ?? "" ].map(csvCell).join(","));
    const url = URL.createObjectURL(new Blob([`﻿${[header.join(","), ...lines].join("\n")}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `germany-party-history-${series.id}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <section className="card p-5" aria-labelledby="politics-history-title" data-politics-history={series?.id ?? ""}>
      <h3 id="politics-history-title" className="font-semibold">{en ? "Party history across elections" : "政党的跨届选举历史"}</h3>
      <p className="mt-2 text-sm">{en ? "Only parties that the Federal Returning Officer's historical results table presents as one series are offered. Each election's list was matched to that table by its exact official second-vote count, never by name." : "仅提供联邦选举委员会历史结果表中作为同一序列呈现的政党。每届名单都是按官方第二票数完全相等与该表对应的，从不按名称匹配。"}</p>
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="min-w-0 text-sm">{en ? "Party (authority's series)" : "政党（官方序列）"}<select className="field-control block max-w-full" value={seriesId} onChange={(event) => choose(event.target.value, measure)}><option value="">{en ? "Select a party" : "请选择政党"}</option>{germanOfficialSeries.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.links.length}</option>)}</select></label>
        <label className="text-sm">{en ? "Measure" : "指标"}<select className="field-control block" value={measure} onChange={(event) => choose(seriesId, event.target.value as HistoryMeasure)}>{(Object.keys(labels) as HistoryMeasure[]).map((key) => <option key={key} value={key}>{labels[key].label}</option>)}</select></label>
      </div>
      {!series ? <p className="mt-3 text-sm" role="status" data-history-empty>{en ? "Select a verified official party series to view its historical chart, observations and CSV export. No party is selected by default." : "请选择已核实的官方政党序列，查看历史图表、观测与 CSV 导出。默认不选择任何政党。"}</p> : <>
      <p className="mt-3 text-sm" data-history-overview>{en
        ? `${series.label} has a list in ${stood.length} of ${elections.length} Bundestag elections from ${elections[0].year} to ${elections.at(-1)!.year}. ${series.relationship === "name_change_documented_by_authority" ? "The authority's table notes that the party stood under other names in some of these elections; the original ballot label of each election is shown below." : "The authority's table records no change of party name over these elections."}`
        : `${series.label} 在 ${elections[0].year}—${elections.at(-1)!.year} 年的 ${elections.length} 届联邦议院选举中有 ${stood.length} 届提交了名单。${series.relationship === "name_change_documented_by_authority" ? "官方表格注明该党在其中部分选举中使用过其他名称；下表列出每届选举的原始选票名称。" : "官方表格未记载该党在这些选举中更改名称。"}`}</p>
      <div className="mt-4">
        <ResearchTimeSeriesChart interactive containerRole="group" title={`${series.label}: ${labels[measure].label}`} description={en ? "One point per Bundestag election. A gap means the party had no list in that election; it is not zero." : "每届联邦议院选举一个点。空缺表示该党在该届没有名单，不等于零。"} series={[{ id: series.id, label: series.label, color: "var(--accent)", points: chartPoints, markers: true }]} xKind="number" xLabel={en ? "Election year" : "选举年份"} yLabel={`${labels[measure].label} (${labels[measure].unit})`} xTickValues={elections.map((election) => election.year)} includeZero formatX={(v) => String(v)} legend={false} />
      </div>
      {measure === "seats" || measure === "seat_share" ? <p className="mt-2 border-l-2 border-[var(--accent)] pl-3 text-sm" role="note" data-seat-caveat>{en ? "Seats depend on the electoral rules of each election — allocation method, overhang and compensation seats, chamber size and the 5% threshold all changed in this period (Hare/Niemeyer until 2005, Sainte-Laguë/Schepers from 2009, a fixed 630 seats in 2025). A change in seats is not a change in popular support; compare vote shares for that." : "席位取决于每届选举的规则——本时期分配方法、超额与补偿席位、议会规模和 5% 门槛都发生过变化（2005 年前采用 Hare/Niemeyer，2009 年起采用 Sainte-Laguë/Schepers，2025 年固定为 630 席）。席位变化不等于民众支持的变化；比较支持度请看得票率。"}</p> : null}
      <div className="mt-4 overflow-x-auto" role="region" tabIndex={0} aria-label={en ? "Election-by-election values (scrollable)" : "逐届数值（可横向滚动）"}>
        <table className="w-full min-w-[640px] text-left text-sm" data-history-table>
          <thead><tr><th scope="col">{en ? "Election" : "选举"}</th><th scope="col">{en ? "Original ballot label" : "原始选票名称"}</th><th scope="col">{labels[measure].label}</th><th scope="col">{en ? "Result vintage" : "结果版本"}</th><th scope="col">{en ? "Authority's note" : "官方备注"}</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.election.electionId} className="border-t border-[var(--line)]" data-history-year={row.election.year} data-history-state={row.link ? "observed" : "no_list"}>
              <th scope="row" className="py-2 font-normal">{localeDate(row.election.date, locale)}</th>
              <td>{row.link ? <span lang="de" data-original-language="de">{row.label}</span> : <span className="text-[var(--muted)]">{en ? "No list in this series (not on the authority's table for this election)" : "该系列在此届无名单（官方表格中此届无此行）"}</span>}</td>
              <td className="metric-number">{row.link ? format(value(row)) : "—"}</td>
              <td className="text-xs">{row.link ? vintage(row) : ""}</td>
              <td className="text-xs">{row.link?.note && /Parteiname/.test(row.link.note) ? <span lang="de" data-original-language="de">{row.link.note}</span> : ""}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-3 text-sm" data-history-limitations>{en ? "Limitations: the series reflects the electoral authority's statistical attribution of results to one party, not a party-register or legal-entity decision. Every contestant in the Atlas records for this period is a single party's own list (none is recorded as a joint list), lists are never combined, and no mergers or splits are inferred. Values are descriptive; they are not forecasts and say nothing about why support changed." : "局限：该序列反映的是选举机构把各届结果统计归属于同一政党的做法，不是政党登记或法律主体层面的认定。Atlas 记录中本时期的每份参选名单都是单一政党自己的名单（没有记录为联合名单的），名单从不合并，也不推断任何合并或分裂。数值仅为描述，不是预测，也不说明支持度变化的原因。"}</p>
      <div className="mt-3 space-y-1 text-xs text-[var(--muted)]" data-history-research>
        <p>{en ? "Series ID" : "序列 ID"}: {series.id} · {en ? "relationship" : "关系类型"}: {series.relationship === "name_change_documented_by_authority" ? (en ? "B — name change documented by the authority" : "B——官方记载的更名") : (en ? "A — same party per the authority's series" : "A——官方序列中的同一政党")}</p>
        <p>{en ? "Election-specific contestant IDs" : "各届参选名单 ID"}: {stood.map((row) => `${row.election.year} ${row.link!.contestantId}`).join(" · ")}</p>
        <p>{en ? "Identity evidence" : "身份证据"}: <a className="underline" href={OFFICIAL_SERIES_SOURCE.url}>{en ? "Federal Returning Officer, historical results table" : "联邦选举委员会历史结果表"}</a> · SHA-256 {OFFICIAL_SERIES_SOURCE.sha256.slice(0, 16)}… · {OFFICIAL_SERIES_SOURCE.licence}</p>
        <p>{en ? "Derived seat share = seats ÷ seats after the election × 100. Published shares are the authority's rounded figures." : "计算席位占比＝席位 ÷ 本届选举产生的席位 × 100。官方得票率为选举机构公布的四舍五入值。"}</p>
      </div>
      <button type="button" onClick={exportCsv} className="mt-3 rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)]" data-history-export>{en ? "Download this series (CSV)" : "下载此序列（CSV）"}</button>
      </>}
    </section>
  );
}
