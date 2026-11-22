"use client";

import { Fragment, useState } from "react";
import { localeNumber, type Locale } from "@/i18n/config";
import {
  alignByLabel, chamberSeats, chartResults, seatMeasureScope, shareForDisplay, voteDenominator,
  type PoliticalElectionView, type PoliticalResult,
} from "@/lib/politicalExplorer";

type SeatField = "territorialSeats" | "compensationSeats" | "constituencySeats" | "seats" | "chamberSeats" | "districtSeatsThisRound";
type SeatColumn = { field: SeatField; label: string };

function hasHistoricalListTiers(election: PoliticalElectionView) {
  return Boolean(election.national?.historicalAllocation && election.national.activeVote.seatScope === "tier_only");
}

function seatColumns(election: PoliticalElectionView, detailed: boolean, locale: Locale): SeatColumn[] {
  const en = locale === "en";
  if (hasHistoricalListTiers(election)) {
    const columns: SeatColumn[] = [
      {field:"seats", label:en ? "List seats (territorial + compensation)" : "名单席位（地区＋补偿）"},
      {field:"chamberSeats", label:en ? "Whole-chamber seats" : "全院席位"},
    ];
    if (detailed) columns.push(
      {field:"territorialSeats", label:en ? "Territorial seats" : "地区名单席位"},
      {field:"compensationSeats", label:en ? "Compensation seats" : "补偿席位"},
      {field:"constituencySeats", label:en ? "Constituency seats" : "单一选区席位"},
    );
    return columns;
  }
  if (election.national?.activeVote.kind === "constituency" && election.results.some(r => r.districtSeatsThisRound != null)) {
    return [{field:"districtSeatsThisRound", label:en ? "District seats won this round" : "本轮赢得的选区席位"}];
  }
  const scope = seatMeasureScope(election);
  if (scope === "national_list_tier") return [{field:"seats", label:en ? "National list seats" : "全国名单席位"}];
  if (scope === "unavailable") return [{field:"chamberSeats", label:en ? "Seat attribution unavailable" : "席位归属未确定"}];
  return [{field:"chamberSeats", label:en ? "Whole-chamber seats" : "全院席位"}];
}

function BallotCells({record, election, columns, locale}: {
  record: PoliticalResult | null; election: PoliticalElectionView; columns: SeatColumn[]; locale: Locale;
}) {
  const en = locale === "en";
  const share = record && shareForDisplay(record, election);
  const apportioned = election.national?.activeVote.attributionBasis === "source_apportioned_party_total";
  return <>
    <td className="metric-number py-1 pr-3" data-comparison-share={election.electionId}>
      {share ? share.value === null ? "—" : <>
        {localeNumber(share.value, locale, {minimumFractionDigits:2, maximumFractionDigits:2})}%
        <small className="block">{share.computed ? (en ? "Computed vote share" : "按官方票数计算的得票率") : (en ? "Published vote share" : "官方公布的得票率")}</small>
        {apportioned && <small className="block">{record?.attribution_basis === "independent_candidates_aggregate" ? (en ? "Independent aggregate" : "独立候选人合计") : (en ? "Apportioned party total" : "按政党分摊总数")}</small>}
      </> : (en ? "No recorded entry under this label" : "当届收录记录中无此名称")}
    </td>
    {columns.map(({field}) => {
      const value = record && (field === "chamberSeats" ? chamberSeats(record, election) : record[field]);
      return <td key={field} className="metric-number pr-3" data-seat-field={field} data-seat-election={election.electionId}>
        {localeNumber(value, locale)}
        {value != null && field === "districtSeatsThisRound" && <small className="block">
          {record?.districtSeatsBasis === "derived" ? (en ? "From final and first-round counts" : "按最终和首轮席数计算") : record?.districtSeatsBasis === "published" ? (en ? "Published" : "官方公布") : null}
        </small>}
      </td>;
    })}
  </>;
}

export function ElectionBallotLabelComparison({a,b,locale}: {a:PoliticalElectionView; b:PoliticalElectionView; locale:Locale}) {
  const en = locale === "en";
  const [showAll,setShowAll] = useState(false);
  const [detailed,setDetailed] = useState(false);
  const sides = [a,b];
  const mixedRounds = sides.some(e => e.national?.activeVote.roundScope === "valid_round_composite")
    && sides.some(e => e.national?.activeVote.roundScope !== "valid_round_composite");
  const includesApportioned = sides.some(e => e.national?.activeVote.attributionBasis === "source_apportioned_party_total");
  const columns = sides.map(e => seatColumns(e, detailed, locale));
  const significant = new Set(sides.flatMap(e => chartResults(e).map(r => r.nativeLabel)));
  const aligned = alignByLabel(a,b);
  const visible = showAll ? aligned : aligned.filter(row => significant.has(row.label) || (row.a?.districtSeatsThisRound ?? 0) > 0 || (row.b?.districtSeatsThisRound ?? 0) > 0);
  return <div className="mt-4 space-y-3" data-ballot-label-comparison>
    <p className="text-sm" data-identity-limitation>{includesApportioned
      ? (en ? "Rows align recorded names from the selected tables. In the apportioned ballot the election office divides joint candidates’ votes among parties. Independent candidates have a separate aggregate. Matching labels cannot establish party continuity." : "各行按所选表格中记载的名称对齐。分摊统计中，联合候选人的票数由选举办公室分给各提名政党；独立候选人另行合计。同名无法确认跨届政党身份。")
      : en ? "Rows align the original ballot labels. An identical name alone cannot establish party continuity or support a party-level change."
      : "按原始选票名称对齐。仅凭同名无法确认跨届政党身份，也无法据此计算政党的跨届变化。"}</p>
    {mixedRounds && <p className="text-sm" data-comparison-round-basis>{en
      ? "The territorial-list composite uses the valid polling round in each district. The other ballot covers one polling round. Each vote share uses its own denominator."
      : "地区名单合计采用各地区的有效轮次，对照选票只涵盖一个投票日。两侧得票率分别按各自的有效票数计算。"}</p>}
    <ul className="space-y-1 text-sm">{sides.map(e => {
      const definition = e.national?.activeVote;
      const basis = definition?.denominator === "ballots_cast" ? (en ? "ballots cast" : "投出的选票") : (en ? "valid votes" : "有效票");
      const denominator = voteDenominator(e);
      return <li key={e.electionId} data-share-denominator={e.electionId}>
        <strong>{e.year}</strong> · {e.voteLabel?.[locale] ?? definition?.label[locale] ?? e.system.voteType}
        {" · "}{denominator == null ? (en ? "Vote-share denominator unavailable" : "得票率分母缺失") : localeNumber(denominator,locale) + " " + basis}
      </li>;
    })}</ul>
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <label className="inline-flex min-h-11 items-center gap-2"><input type="checkbox" checked={showAll} onChange={ev=>setShowAll(ev.target.checked)}/>
        {en ? "Show all recorded ballot labels" : "显示全部已收录的选票名称"} ({aligned.length})
      </label>
      {sides.some(hasHistoricalListTiers) && <label className="inline-flex min-h-11 items-center gap-2"><input type="checkbox" checked={detailed} onChange={ev=>setDetailed(ev.target.checked)}/>
        {en ? "Show individual seat tiers" : "展开各层席位"}
      </label>}
    </div>
    <p className="text-xs text-[var(--muted)]">{!showAll && (en
      ? "Showing labels with seats or at least 1% of either selected ballot. "
      : "当前显示在任一所选选票中赢得席位或得票率达到 1% 的参选方。")}
      <span className="sm:hidden">{en ? "Scroll horizontally to read both elections." : "横向滚动可阅读两届数据。"}</span>
    </p>
    <div className="data-table-viewport" role="region" tabIndex={0} aria-label={en ? "Ballot-label comparison (scrollable)" : "选票名称比较（可横向滚动）"}>
      <table className="w-full min-w-[640px] text-left text-sm" data-compare-lists>
        <caption className="mb-2 text-left font-semibold">{en ? "Results by election-specific ballot label" : "按当届选票名称比较结果"}</caption>
        <thead><tr>
          <th scope="col">{includesApportioned ? (en ? "Name in source table" : "来源表格中的名称") : (en ? "Ballot label (original)" : "选票名称（原文）")}</th>
          {sides.map((e,i) => <Fragment key={e.electionId}>
            <th scope="col" className="min-w-28 pr-3">{e.year} · {en ? "Vote share" : "得票率"}</th>
            {columns[i].map(col=><th key={col.field} scope="col" className="min-w-24 pr-3">{e.year} · {col.label}</th>)}
          </Fragment>)}
        </tr></thead>
        <tbody>{visible.map(row=><tr key={row.label} className="border-t border-[var(--line)]" data-label-row={row.a && row.b ? "both" : "one"}>
          <th scope="row" className="py-2 pr-3 font-normal"><span lang={a.originalLanguage} data-original-language={a.originalLanguage}>{row.label}</span></th>
          <BallotCells record={row.a} election={a} columns={columns[0]} locale={locale}/>
          <BallotCells record={row.b} election={b} columns={columns[1]} locale={locale}/>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
