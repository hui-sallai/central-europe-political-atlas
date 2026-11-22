import { localeDate, localeNumber, type Locale } from "@/i18n/config";
import { chamberSeatShare, chamberSeats, chartResults, compareCountries, shareForDisplay, seatMeasureScope, type CountryComparisonRow, type PoliticalElectionView } from "@/lib/politicalExplorer";

import { roundElectorateLabel, turnoutFraction } from "@/lib/politicalNational";

// Two national parliamentary elections from different countries, side by side. Presentational and stateless: the
// explorer chooses the elections. Values are shown as published or as labelled derived shares; nothing is subtracted,
// ranked or pooled across countries, and lists are never matched between countries.
export function PoliticalCountryComparison({ a, b, locale }: { a: PoliticalElectionView; b: PoliticalElectionView; locale: Locale }) {
  const en = locale === "en";
  const comparison = compareCountries(a, b);
  const name = (election: PoliticalElectionView) => `${election.countryName?.[locale] ?? election.country ?? ""} ${election.year}`;
  const number = (value: number | null, digits = 0) => localeNumber(value, locale, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const labels: Record<CountryComparisonRow["key"], string> = en
    ? { date: "Election date", chamber: "Chamber", vote: "Vote counted here", turnout: "Published turnout (%)", valid: "Valid list votes", seats: "Seats", lists: "Lists on the ballot", seat_lists: "Lists that won seats", allocation: "Seat allocation method", base_seats: "Base seats under the rules" }
    : { date: "选举日期", chamber: "议院", vote: "此处统计的选票", turnout: "官方投票率（%）", valid: "有效名单票", seats: "席位", lists: "参选名单数", seat_lists: "获得席位的名单数", allocation: "席位分配方法", base_seats: "规则规定的基础席位" };
  const candidateBallot=[a,b].some(e=>e.national?.activeVote.kind==="constituency");
  if (candidateBallot) {
    labels.valid=en?"Valid votes for the selected ballot":"所选选票的有效票";
    labels.lists=en?"Recorded ballot contestants":"已收录的参选项";
    labels.seat_lists=en?"Contestants with whole-chamber seats":"有全院席位归属的参选项";
  }
  const cell = (key: CountryComparisonRow["key"], value: string | number | null, election:PoliticalElectionView) => {
    const ballot=election.national?.ballots.find(b=>b.definition.id===election.system.voteType);
    const round=election.national?.rounds?.find(r=>r.round===ballot?.round);
    if (key==="vote") return ballot?.definition.label[locale] ?? election.voteLabel?.[locale] ?? value;
    if (key==="date" && election.national?.dateEnd && election.national.dateEnd!==election.date)
      return localeDate(election.date,locale)+" – "+localeDate(election.national.dateEnd,locale);
    if (key==="turnout" && ballot?.definition.roundScope==="valid_round_composite")
      return en ? "No single turnout across the valid polling rounds" : "各地区取自不同有效轮次，没有单一投票率";
    if (key==="turnout" && round) return <>
      {number(round.turnout,2)}{round.turnout===null?"":"%"} · {round.date} · {roundElectorateLabel(round,locale)}
      {round.sourceUrl&&<a href={round.sourceUrl} className="ml-2 underline">{en?"Round summary":"本轮官方汇总"}</a>}</>;

    if (value === null) return en ? "not established" : "尚未确定";
    if (key === "date") return localeDate(String(value), locale);
    if (key === "turnout" && typeof value === "number") {
      const fraction = election.national && turnoutFraction(election.national.turnout, locale);
      return <>{localeNumber(value, locale, { maximumFractionDigits: 2 })}%{fraction && <small className="block">{fraction}</small>}</>;
    }
    if (typeof value === "number") return number(value);
    return value;
  };
  const lists = (election: PoliticalElectionView) => (
    <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={en ? `Contestants, ${name(election)} (scrollable)` : `${name(election)} 的参选项（可横向滚动）`}>
      <table className="w-full min-w-[420px] text-left text-sm" data-country-lists={election.country}>
        <caption className="mb-2 text-left font-semibold">{name(election)} · {election.voteLabel?.[locale] ?? election.system.voteType}</caption>
        <thead><tr><th scope="col">{election.national?.activeVote.attributionBasis==="source_apportioned_party_total"?(en?"Party totals apportioned by the election office; independent category":"选举办公室分摊至各政党的票数及独立参选类别"):election.national?.activeVote.kind==="constituency"?(en?"Nominating organisation or independent category":"提名组织或独立参选类别"):(en ? "List (original label)" : "名单（原文名称）")}</th><th scope="col">{en ? "Vote share" : "得票率"}</th><th scope="col">{en ? "Whole-chamber seats" : "全议院席位"}</th><th scope="col">{en ? "Whole-chamber seat share (derived)" : "全议院席位占比（计算值）"}</th></tr></thead>
        <tbody>{chartResults(election).map((result) => {
          const {computed:derived,value:share}=shareForDisplay(result,election);
          // Only whole-chamber seats are set side by side across countries; a list-tier count is shown as such, with no share.
          const seatScope=seatMeasureScope(election), whole=seatScope==="whole_chamber";
          const seatShare = whole ? chamberSeatShare(result, election) : null;
          return <tr key={result.contestantId} className="border-t border-[var(--line)]" data-share-basis={derived ? "derived" : "published"}>
            <th scope="row" className="py-2 font-normal"><span lang={election.originalLanguage} data-original-language={election.originalLanguage}>{result.nativeLabel}</span></th>
            <td className="metric-number">{number(share, election.national?.activeVote.roundScope==="valid_round_composite" && !derived ? 2 : 1)}{share === null ? "" : "%"}<span className="block text-xs text-[var(--muted)]">{derived ? (en ? "derived" : "计算值") : (en ? "published" : "官方公布")}</span></td>
            <td className="metric-number" data-seat-scope={seatScope}>{whole ? number(chamberSeats(result, election)) : <>{en ? "not established" : "尚未确定"}{seatScope==="national_list_tier"&&<span className="block text-xs text-[var(--muted)]">{en ? `list tier only: ${number(result.seats)}` : `仅名单层：${number(result.seats)}`}</span>}</>}</td>
            <td className="metric-number">{whole ? `${number(seatShare, 1)}${seatShare === null ? "" : "%"}` : (en ? "not comparable" : "不可比较")}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
  return (
    <div className="mt-4 space-y-4" data-country-comparison={`${a.electionId}|${b.electionId}`}>
      <p className="border-l-2 border-[var(--accent)] pl-3 text-sm" role="note" data-comparison-caveat>
        {comparison.yearsApart > 0
          ? (en ? `These elections were held ${comparison.yearsApart} year${comparison.yearsApart === 1 ? "" : "s"} apart; they do not describe the same political period. ` : `两场选举相隔 ${comparison.yearsApart} 年，描述的不是同一政治时期。`)
          : (en ? "These elections were held in the same year, on different dates. " : "两场选举在同一年举行，但日期不同。")}
        {en ? "They were run under different electoral systems, for different chambers and with different kinds of lists, so the figures are shown side by side and are not differenced or ranked." : "两国的选举制度、议院和名单类型都不同，因此数字只并排显示，不做相减或排名。"}
        {comparison.sameAllocationMethod ? "" : (en ? " The seat-allocation methods differ." : "席位分配方法也不同。")}
        {[a, b].some((e) => seatMeasureScope(e) === "national_list_tier") ? (en ? " One election holds only list-tier seats, so its seats are not set against whole-chamber representation." : "其中一场选举只有名单层席位，因此其席位不与全议院代表席位对照。") : ""}
      </p>
      <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={en ? "Two elections side by side (scrollable)" : "两场选举并排对照（可横向滚动）"}>
        <table className="w-full min-w-[520px] text-left text-sm" data-country-facts>
          <thead><tr><th scope="col">{en ? "Fact" : "事实"}</th><th scope="col">{name(a)}</th><th scope="col">{name(b)}</th></tr></thead>
          <tbody>{comparison.rows.map((row) => <tr key={row.key} className="border-t border-[var(--line)]" data-fact={row.key}><th scope="row" className="py-2 font-normal">{labels[row.key]}</th><td className="metric-number">{cell(row.key,row.a,a)}</td><td className="metric-number">{cell(row.key,row.b,b)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[a, b].map((election) => <div key={election.electionId} data-country-system={election.country}><p className="text-sm font-semibold">{en ? `Electoral system: ${name(election)}` : `选举制度：${name(election)}`}</p><p className="mt-1 text-sm">{election.notes[locale]}</p></div>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">{lists(a)}{lists(b)}</div>
      <p className="text-sm">{candidateBallot?(en?"The distributions include contestants with seats or at least 1% of their own ballot. Each share uses the denominator for that ballot.":"分布列出获席参选项或在其所处选票中得票达到 1% 的参选项。各占比使用本选票对应分母。"):en ? "Lists that won seats or reached 1% of valid list votes. A share marked “derived” is calculated by the Atlas as votes ÷ valid list votes × 100 because no official share was published in the source; “published” shares are the authority's own. Lists in different countries are unrelated and are never matched." : "仅列出获得席位或得票率达到 1% 的名单。标为“计算值”的得票率由 Atlas 按“票数 ÷ 有效名单票 × 100”计算，因为来源没有公布官方得票率；“官方公布”的得票率来自选举机构。不同国家的名单互不相关，不会相互匹配。"}</p>
    </div>
  );
}
