"use client";

import { localeNumber, type Locale } from "@/i18n/config";
import type { BallotElection, BallotResult, ElectionBallot } from "@/lib/politicalBallots";
import { BarMeter } from "./ResearchCharts";

export function ballotShareBasis(basis: ElectionBallot["shareBasis"], locale: Locale) {
  const en = locale === "en";
  const labels = {
    valid_votes: en ? "Valid votes for this ballot" : "该选票的有效票",
    ballots_cast: en ? "Ballots cast, including invalid ballots" : "全部投出票（含无效票）",
    candidate_votes: en ? "All candidate votes in this contest" : "该竞选中所有候选人所得票数",
    points: en ? "Ranked-ballot points" : "排序选票积分",
    unavailable: en ? "No verified percentage denominator" : "缺少已核实的百分比分母",
  };
  return labels[basis];
}

export function BallotResults({ election, ballot, locale }: { election: BallotElection; ballot: ElectionBallot; locale: Locale }) {
  const en = locale === "en";
  const t = (english: string, chinese: string) => en ? english : chinese;
  const points = ballot.shareBasis === "points";
  const hasShares = !points && ballot.results.some(r => r.publishedShare !== null || r.derivedShare !== null);
  const basis = ballotShareBasis(ballot.shareBasis, locale);
  const number = (n: number | null) => localeNumber(n, locale, {maximumFractionDigits: 4});
  const percent = (n: number | null) => n === null ? "—" : number(n) + "%";
  const totalLabel = points ? t("Ranking points", "排序积分") : t("Votes", "票数");
  const metricLabel = hasShares ? t("Vote share", "得票率") : totalLabel;
  const value = (r: BallotResult) => hasShares ? r.publishedShare ?? r.derivedShare : points ? r.points : r.votes;
  const ranked = ballot.results.filter(r => value(r) !== null).sort((a,b) => value(b)! - value(a)!);
  const charted = ranked.slice(0, 8);
  const seatWinners = ballot.results.filter(r=>r.seats!==null && r.seats>0).sort((a,b)=>b.seats!-a.seats!);
  const max = hasShares ? 100 : Math.max(1, ...charted.map(r => value(r)!));
  const sourceById = new Map(election.sources.map(s => [s.id,s]));
  const sources = (r: BallotResult) => r.sourceIds.map(id => sourceById.get(id)).filter(s => !!s);
  const tooltip = (r: BallotResult) => [
    r.name, election.date, ballot.label[locale], totalLabel + " " + number(points ? r.points : r.votes),
    ...(hasShares ? [basis + " · " + percent(value(r))] : []),
    t("Seats on this ballot", "此选票分配的席位") + " " + number(r.seats) + " / " + ballot.totalSeats,
    ...sources(r).map(s => s.title),
  ].join("\n");
  return <section data-ballot-results={ballot.geography} className="min-w-0 space-y-4">
    <figure className="editorial-panel p-4" data-ballot-vote-chart>
      <figcaption className="font-semibold">{metricLabel} · {ballot.label[locale]} · {election.year}</figcaption>
      <p className="mt-1 text-sm">{ballot.voteLabel[locale]} · {basis}</p>
      {ranked.length > charted.length && <p className="text-xs text-[var(--muted)]">{t("The chart shows the eight largest recorded values. The table includes every contestant.", "图中显示数值最高的八条记录，下表收录所有参选者。")}</p>}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">{charted.map(r => <li key={r.id} title={tooltip(r)} className="min-w-0 break-words text-xs">
        <div className="flex items-baseline justify-between gap-2"><span>{r.name}</span><strong className="shrink-0 tabular-nums">{hasShares ? percent(value(r)) : number(value(r))}</strong></div>
        <BarMeter label={r.name + " · " + metricLabel} value={value(r)!} max={max}/>
      </li>)}</ul>
      {!charted.length && <p>{t("No recorded values for this ballot.", "此选票未收录可绘图的数值。")}</p>}
    </figure>
    {seatWinners.length>0 && <figure className="editorial-panel p-4" data-ballot-seat-chart>
      <figcaption className="font-semibold">{t("Seats won on this ballot","该选票下赢得的席位")} · {ballot.label[locale]}</figcaption>
      <p className="mt-1 text-sm">{t("Seats allocated on this ballot","本选票分配的席位")} · {ballot.totalSeats}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">{seatWinners.slice(0,8).map(r=><li key={r.id} title={tooltip(r)} className="min-w-0 break-words text-xs">
        <div className="flex items-baseline justify-between gap-2"><span>{r.name}</span><strong className="shrink-0">{number(r.seats)} / {ballot.totalSeats}</strong></div>
        <BarMeter value={r.seats!} max={ballot.totalSeats} label={r.name+" · "+t("Seats","席位")}/>
      </li>)}</ul>
      {seatWinners.length>8 && <p className="mt-1 text-xs">{t("The eight largest seat counts are shown. Open the complete results for all seat allocations.","图中显示席位数最多的八条记录。所有席位分配见完整结果。")}</p>}
    </figure>}
    <details className="editorial-panel p-4" data-ballot-table-details>
      <summary className="font-semibold">{t("Complete contestant results", "完整参选者结果")} · {ballot.results.length}</summary>
      <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label={t("Scrollable results table", "可滚动的结果表")}>
        <table className="w-full min-w-[680px] text-left text-sm">
          <caption className="mb-2 text-left">{election.year} · {election.chamber} · {ballot.label[locale]}</caption>
          <thead><tr><th scope="col">{t("Contestant", "参选者")}</th><th scope="col">{totalLabel}</th>
            {hasShares && <><th scope="col">{t("Published share", "公布得票率")}</th><th scope="col">{t("Calculated share", "计算得票率")}</th></>}
            <th scope="col">{t("Ballot seats", "该选票席位")}</th><th scope="col">{t("Share of ballot seats", "占本选票席位")}</th><th scope="col">{t("Source", "来源")}</th>
          </tr></thead>
          <tbody>{ballot.results.map(r => <tr key={r.id} className="border-t border-[var(--line)]" data-contestant-id={r.contestantId}>
            <th scope="row" className="max-w-72 break-words py-2 pr-3">{r.name}</th><td>{number(points ? r.points : r.votes)}</td>
            {hasShares && <><td>{percent(r.publishedShare)}</td><td>{percent(r.derivedShare)}</td></>}
            <td>{number(r.seats)}{r.seatDetails.map((d,i) => <small className="block" key={i}>{d.label[locale]} · {number(d.seats)}</small>)}</td>
            <td>{percent(r.seats !== null && ballot.totalSeats > 0 ? 100 * r.seats / ballot.totalSeats : null)}</td>
            <td className="max-w-52 break-words">{sources(r).map(s => <a key={s.id} className="block underline" href={s.url}>{s.title}</a>)}
              {r.printedShareNote !== null && <small>{t("Unreproduced percentage printed in source", "原件所印、未能复算的百分比")} · {percent(r.printedShareNote)}</small>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>;
}
