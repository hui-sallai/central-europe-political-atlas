import {localeNumber, type Locale} from "@/i18n/config";
import type {PoliticalResult} from "@/lib/politicalExplorer";
import type {NationalBallotView} from "@/lib/politicalNational";

function EvidenceLinks({provenance, fields, locale}: {
  provenance: PoliticalResult["provenance"]; fields: string[]; locale: Locale;
}) {
  const en = locale === "en";
  const titles: Record<string, string> = {
    threshold: en ? "Final territorial-list totals" : "最终地区名单票数",
    national_totals_round1: en ? "Earlier national table" : "第一轮全国票数表",
    round2_territorial: en ? "Repeat-district summary" : "重投地区汇总表",
    notice_round1: en ? "Official first-round notice" : "官方第一轮公告",
    national_totals: en ? "Final national table" : "最终全国票数表",
    nomination_groups: en ? "Separate and joint nominations" : "单独提名与联合提名表",
  };
  const links = new Map<string,string>();
  for (const entry of provenance ?? []) {
    if (entry.source_url && entry.fields_covered?.some(field => fields.includes(field))) {
      links.set(entry.source_url, titles[entry.source_record_id ?? ""] ?? (en ? "Official source" : "官方来源"));
    }
  }
  return <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
    {[...links].map(([url, label]) => <a key={url} href={url} className="underline">{label}</a>)}
  </div>;
}

export function HistoricalBallotEvidence({ballot, locale}: {ballot: NationalBallotView; locale: Locale}) {
  const en = locale === "en";
  const number = (value: number | null | undefined) => localeNumber(value,locale);
  const percent = (value: number) => localeNumber(value,locale,{minimumFractionDigits:2,maximumFractionDigits:2}) + "%";
  const record = ballot.turnoutRecord;
  if (ballot.definition.roundScope === "valid_round_composite" && record) {
    const actual = record.actual_round1_ballot;
    return <details className="my-3 space-y-3 text-sm" data-composite-evidence>
      <summary className="cursor-pointer font-semibold">{en ? "Territorial-list votes by polling round and district coverage" : "各轮地区名单票数及覆盖范围"}</summary>
      <ul className="space-y-3">{record.round_composition?.map(part => <li key={part.round} data-composite-round={part.round}>
        <strong>{en ? `Round ${part.round}` : `第 ${part.round} 轮`}</strong> · {part.date} · {number(part.territorial_districts)} {en ? "territorial districts" : "个地区选区"} · {number(part.votes)} {en ? "valid list votes" : "张有效名单票"}
        <span className="block">{part.votes_basis === "published" ? (en ? "Published total" : "官方公布总数")
          : (en ? "Calculated from the final total minus the published first-round component." : "按最终总数减去已公布的第一轮分项计算。")}</span>
        {part.districts && <>
          <ul className="my-2 space-y-1">{part.districts.map(d => <li key={d.label}>
            <span lang="hu">{d.label}</span> · {en ? "Registered" : "登记选民"} {number(d.eligible_voters)} · {en ? "Turnout" : "投票率"} {percent(d.published_turnout)}
            {" · "}{en ? "Valid ballots as a share of voters" : "有效票占投票人数"} {percent(d.published_valid_percent_of_voters)}
            {" · "}{en ? "Invalid ballots as a share of voters" : "无效票占投票人数"} {percent(d.published_invalid_percent_of_voters)}
          </li>)}</ul>
          <p>{en ? "The district summaries give rounded percentages. Exact participant counts are unavailable." : "地区汇总表公布了四舍五入后的百分比。确切投票人数缺失。"}</p>
        </>}
      </li>)}</ul>
      <EvidenceLinks provenance={record.provenance} fields={["valid_votes","round_composition"]} locale={locale}/>
      {actual && <section className="space-y-2 border-t border-[var(--line)] pt-2" data-actual-first-round>
        <h5 className="font-semibold">{en ? "Actual first-round list ballot" : "第一轮实际投出的地区名单票"} · {actual.date}</h5>
        <p>{en ? `All ${number(ballot.definition.geographicScope?.territorial_districts)} districts, including those that voted again. Only aggregate figures are available for this coverage.` : `覆盖全部 ${number(ballot.definition.geographicScope?.territorial_districts)} 个地区选区，包括后来重投的地区。该范围仅有汇总记录。`}</p>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[
          [en ? "Registered voters" : "登记选民",number(actual.eligible_voters)],
          [en ? "Voters" : "投票人数",number(actual.voters)],
          [en ? "Published turnout" : "官方公布投票率",percent(actual.published_turnout)],
          [en ? "Ballots in the urn" : "票箱内选票",number(actual.ballots_in_urn)],
          [en ? "Valid ballots" : "有效票",number(actual.valid_ballots)],
          [en ? "Invalid ballots" : "无效票",number(actual.invalid_ballots)],
        ].map(([label,value]) => <div key={label}><dt className="text-xs">{label}</dt><dd className="metric-number">{value}</dd></div>)}</dl>
        <EvidenceLinks provenance={record.provenance} fields={["actual_round1_ballot"]} locale={locale}/>
      </section>}
    </details>;
  }
  const discrepancies = ballot.results.filter(r => r.round1_table_votes != null);
  const groups = ballot.results.flatMap(r => r.nomination_group_components ?? []);
  if (!groups.length && !discrepancies.length) return null;
  const sources = ballot.results.flatMap(r => r.provenance ?? []);
  return <details className="my-3 space-y-2 text-sm" data-candidate-evidence>
    <summary className="cursor-pointer font-semibold">{groups.length ? (en ? "Separate and joint nominations in the source" : "来源中的单独提名与联合提名") : (en ? "First-round vote counts in the two official tables" : "两份官方表格中的第一轮票数")}</summary>
    {discrepancies.length > 0 && <>
      <p>{en ? "The Atlas uses the final table. The two differences offset each other in the national total. The election office gives no explanation for the discrepancy." : "本页采用最终表格。两项差额在全国总数中相抵。选举办公室未说明出现差额的原因。"}</p>
      <table className="w-full text-left text-sm"><thead><tr>
        {[en ? "Entry" : "参选项",en ? "Earlier table (votes)" : "第一轮表（票）",en ? "Final table (votes)" : "最终表（票）"].map(h=><th scope="col" key={h}>{h}</th>)}
      </tr></thead><tbody>{discrepancies.map(r=><tr key={r.contestantId}>
        <th scope="row" lang="hu">{r.nativeLabel}</th><td>{number(r.round1_table_votes)}</td><td>{number(r.secondVotes)}</td>
      </tr>)}</tbody></table>
      <EvidenceLinks provenance={sources} fields={["round1_table_votes","votes"]} locale={locale}/>
    </>}
    {groups.length > 0 && <>
      <p>{en ? "The source identifies the separate and joint nominations for Fidesz and MDF. It does not name a polling round. These vote counts match the parties’ second-round totals, so the round assignment is inferred. Seats are final across both rounds. The Fidesz-MDF joint total includes the constituency decided in round one." : "来源列明 Fidesz 与 MDF 单独及联合提名的结果，未标明投票轮次。表中票数与两党第二轮合计相符，票数所属轮次据此推断。席位为两轮后的最终席数，Fidesz-MDF 联合提名的席数包含首轮即已决出的选区。"}</p>
      <div className="data-table-viewport" role="region" tabIndex={0} aria-label={en ? "Nomination group results" : "各提名组合的结果"}>
        <table className="w-full min-w-[420px] text-left text-sm"><thead><tr>
          {[en ? "Nomination" : "提名组合",en ? "Candidates as reported" : "来源所列候选人数",en ? "Reported votes" : "来源所列票数",en ? "Final seats" : "最终席位"].map(h=><th scope="col" key={h}>{h}</th>)}
        </tr></thead><tbody>{groups.map(g=><tr key={g.label}>
          <th scope="row"><span lang="hu">{g.label}</span><small className="block">{g.nomination === "joint" ? (en ? "Joint" : "联合提名") : (en ? "Separate" : "单独提名")}</small></th>
          <td>{number(g.candidates)}</td><td>{number(g.votes)}</td><td>{number(g.seats)}</td>
        </tr>)}</tbody></table>
      </div>
      <EvidenceLinks provenance={sources} fields={["nomination_group_components","votes"]} locale={locale}/>
    </>}
  </details>;
}
