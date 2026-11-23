import { useState } from "react";
import { localeNumber, type Locale } from "@/i18n/config";
import type { PoliticalElectionView } from "@/lib/politicalExplorer";
import type { GermanHistoricalAllocation as Allocation } from "@/lib/politicalNational";

type Props = { election: PoliticalElectionView; locale: Locale };

const areaNames = {
  west: { en: "Former Federal territory and West Berlin", "zh-CN": "原联邦地区及西柏林" },
  east: { en: "New Länder and East Berlin", "zh-CN": "新联邦州及东柏林" },
};
const areas = ["west", "east"] as const;
const tableClass = "w-full text-left text-sm tabular-nums [&_th]:p-2 [&_td]:p-2 [&_tbody_tr]:border-t [&_tbody_tr]:border-[var(--line)]";

function sourceLink(election: PoliticalElectionView, id: string, label: string) {
  const source = election.sources.find(entry => entry.id === id);
  return source && <a href={source.url} className="underline" data-german-source={id}>{label}</a>;
}

function publishedPercent(value: number | null | undefined, locale: Locale) {
  return value == null ? "—" : localeNumber(value, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

function ElectoralAreas({ election, locale, allocation }: Props & { allocation: Allocation }) {
  const [showAll, setShowAll] = useState(false);
  const en = locale === "en";
  const thresholdAreas = allocation.thresholdAreas;
  if (!thresholdAreas) return null;
  const ballot = election.national?.ballots.find(item => item.definition.id === "second_vote");
  if (!ballot) return null;
  const examples = ["ct-de-1990-06", "ct-de-1990-08", "ct-de-1990-05"];
  const results = showAll ? ballot.results : ballot.results.filter(r => examples.includes(r.contestantId));
  const valid = ballot.turnoutRecord?.electoral_area_valid_second_votes;
  const ruleArea = {west: "second votes in the electoral area of the former Federal territory and West Berlin",
    east: "second votes in the electoral area of the new Länder and East Berlin"};
  return <section data-german-threshold-areas>
    <h4 className="font-semibold">{en ? "Separate thresholds in the two electoral areas" : "两个选举区域如何决定名单分配资格"}</h4>
    <p className="mt-1 text-sm">{en
      ? "A list that met the second-vote threshold in either area entered the seat allocation. PDS and B90/Gr. qualified in the east. The western GRÜNE stood as a separate contestant and won no Bundestag seats."
      : "名单只要在任一选举区域达到第二票门槛，即可参与席位分配。PDS 和 B90/Gr. 均在东部达标。西部 GRÜNE 是单独参选的名单，未获联邦议院席位。"}</p>
    <dl className="my-3 grid gap-2 sm:grid-cols-2">{areas.map(area => {
      const threshold = election.national?.rules.thresholds?.find(rule => rule.appliesTo === ruleArea[area]);
      return <div key={area} className="rounded border border-[var(--line)] p-3">
        <dt className="text-sm font-semibold">{areaNames[area][locale]}</dt>
        <dd className="mt-1 text-xs" lang="de">{thresholdAreas[area].label}</dd>
        <dd className="mt-2 text-sm tabular-nums">{localeNumber(valid?.[area], locale)} {en ? "valid second votes" : "张有效第二票"}</dd>
        <dd className="text-sm">{en ? "Area threshold" : "本区域门槛"} · {threshold?.percent == null ? "—" : localeNumber(threshold.percent, locale) + "%"}</dd>
      </div>;
    })}</dl>
    <label className="inline-flex min-h-10 items-center gap-2 text-sm">
      <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)}/>
      {en ? `Show all ${ballot.results.length} second-vote contestants` : `显示全部 ${ballot.results.length} 份第二票参选名单`}
    </label>
    <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label={en ? "Second votes by electoral area" : "按选举区域分列的第二票"}>
      <table className={tableClass + " min-w-[660px]"} data-german-area-results>
        <caption className="pb-2 text-left text-xs">{en
          ? `Votes and published share of valid second votes within each column. Nationwide denominator: ${localeNumber(ballot.validVotes, locale)}. A dash marks an unreported figure.`
          : `各栏显示得票数及其占本栏有效第二票的官方比例。全国分母为 ${localeNumber(ballot.validVotes, locale)} 票。破折号表示该字段未公布数值。`}</caption>
        <thead><tr>{(en ? ["Ballot label", "Nationwide", "West", "East", "Qualified for allocation", "Final seats"]
          : ["参选名单", "全国", "西部", "东部", "参与席位分配", "最终席位"]).map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{results.map(row => <tr key={row.contestantId} data-contestant={row.contestantId}>
          <th scope="row" lang="de">{row.nativeLabel}</th>
          <td>{localeNumber(row.secondVotes, locale)}<span className="block">{publishedPercent(row.publishedVoteShare, locale)}</span></td>
          {areas.map(area => <td key={area}>{localeNumber(row.electoralAreaSecondVotes?.[area].votes, locale)}
            <span className="block">{publishedPercent(row.electoralAreaSecondVotes?.[area].published_percent, locale)}</span></td>)}
          <td>{allocation.seatReproduction.qualifying_contestants.includes(row.nativeLabel) ? (en ? "Yes" : "是") : (en ? "No" : "否")}</td>
          <td>{row.seats === null && row.contestantId === "ct-de-1990-05" ? (en ? "No seat awarded" : "未获席位") : localeNumber(row.seats, locale)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="mt-2 text-xs">{sourceLink(election, "src-de-bwl-historical-results", en ? "Federal Returning Officer · historical results (CSV)" : "德国联邦选举主任 · 历届结果（CSV）")}</p>
  </section>;
}

function SeatDetails({ election, allocation, locale }: Props & { allocation: Allocation }) {
  const en = locale === "en";
  const headers = en ? ["Contestant", "Before overhang (derived)", "Overhang", "Constituency", "Land list", "Final seats"]
    : ["参选名单", "计入超额前（推算）", "超额席位", "选区席位", "州名单席位", "最终席位"];
  return <details className="mt-3" data-german-seat-detail>
    <summary className="cursor-pointer py-2 text-sm font-semibold">{en ? "Seat allocation by contestant and Land" : "按参选名单和联邦州查看席位分配"}</summary>
    <p className="my-2 text-sm">{en
      ? `${allocation.seatReproduction.method} allocated ${localeNumber(allocation.seatReproduction.seats, locale)} statutory seats among qualifying lists. The historical base shown here is reproduced from published final seats minus published overhang seats.`
      : `${allocation.seatReproduction.method} 法在符合资格的名单间分配 ${localeNumber(allocation.seatReproduction.seats, locale)} 个法定席位。此处法定基数用公布的最终席位减去公布的超额席位复核。`}</p>
    <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label={en ? "Mandates by contestant" : "按参选名单分列的议席"}>
      <table className={tableClass + " min-w-[570px]"}>
        <caption className="pb-1 text-left text-xs">{en ? "Seat-winning contestants. Constituency and Land-list mandates sum to the final seats." : "仅列获席名单。选区席位与州名单席位之和为最终席位。"}</caption>
        <thead><tr>{headers.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{election.results.filter(row => row.seats != null && row.seats > 0).map(row =>
          <tr key={row.contestantId}><th scope="row" lang="de">{row.nativeLabel}</th>
            {[row.seatsBeforeOverhangDerived, row.overhangSeats, row.constituencyMandates, row.listMandates, row.seats].map((count, i) =>
              <td key={headers[i + 1]}>{localeNumber(count, locale)}</td>)}
          </tr>)}</tbody>
      </table>
    </div>
    <table className={tableClass + " mt-3"} data-german-land-overhang>
      <caption className="pb-1 text-left font-semibold">{en ? "Overhang seats by Land" : "各联邦州产生的超额席位"}</caption>
      <thead><tr>{(en ? ["Land", "Contestant", "Overhang seats"] : ["联邦州", "参选名单", "超额席位"]).map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
      <tbody>{allocation.overhangByLand.map(item => <tr key={item.land + item.party}>
        <th scope="row" className="break-words" lang="de">{item.land}</th><td lang="de">{item.party}</td><td>{localeNumber(item.seats, locale)}</td>
      </tr>)}</tbody>
    </table>
    <p className="mt-2 flex flex-wrap gap-3 text-xs">
      {sourceLink(election, "src-de-bwl-overhang", en ? "Federal Returning Officer · Überhangmandate" : "德国联邦选举主任 · 超额席位")}
      {sourceLink(election, "src-de-bwl-historical-results", en ? "Historical seat returns (CSV)" : "历届席位结果（CSV）")}
      {sourceLink(election, "src-de-bwl-hare-niemeyer", en ? "Hare/Niemeyer allocation" : "Hare/Niemeyer 分配法")}
    </p>
  </details>;
}

export function GermanHistoricalAllocation({ election, locale }: Props) {
  const allocation = election.national?.germanAllocation;
  if (!allocation || election.system.voteType !== "second_vote") return null;
  const en = locale === "en";
  const pds = election.results.find(row => row.contestantId === "ct-de-1994-06");
  const thresholds = election.national?.rules.thresholds;
  const clause = thresholds?.find(rule => rule.sourceIds.includes("src-de-bwl-basic-mandate"));
  const nationalThreshold = thresholds?.find(rule => rule.appliesTo === "national second votes")?.percent;
  return <section className="card min-w-0 p-5" data-german-historical-allocation={election.year}>
    <h3 className="mb-3 font-semibold">{election.year} · {allocation.thresholdAreas
      ? (en ? "The reunification election" : "两德统一后的首次全德选举")
      : (en ? "Bundestag seat allocation" : "联邦议院席位分配")}</h3>
    {allocation.thresholdAreas && <ElectoralAreas election={election} allocation={allocation} locale={locale}/>}
    {pds && clause && nationalThreshold != null && <section data-german-basic-mandate>
      <h4 className="font-semibold">{en ? "How PDS qualified under the basic-mandate clause" : "PDS 如何依基本议席条款取得分配资格"}</h4>
      <p className="mt-1 text-sm">{en
        ? `PDS received ${publishedPercent(pds.publishedVoteShare, locale)} of valid national second votes, below the ${localeNumber(nationalThreshold, locale)}% national threshold. Its ${localeNumber(pds.constituencyMandates, locale)} constituency mandates qualified it for proportional allocation under the Grundmandatsklausel. PDS received ${localeNumber(pds.seats, locale)} final seats.`
        : `PDS 的全国有效第二票得票率为 ${publishedPercent(pds.publishedVoteShare, locale)}，低于 ${localeNumber(nationalThreshold, locale)}% 的全国门槛。凭借 ${localeNumber(pds.constituencyMandates, locale)} 个选区席位，PDS 依基本议席条款（Grundmandatsklausel）参与比例分配，最终获得 ${localeNumber(pds.seats, locale)} 席。`}</p>
      <p className="mt-1 text-sm">{clause.description[locale]}</p>
      <p className="mt-2 flex flex-wrap gap-3 text-xs">{sourceLink(election, "src-de-bwl-basic-mandate", en ? "Federal Returning Officer · Grundmandatsklausel" : "德国联邦选举主任 · 基本议席条款")}
        {sourceLink(election, "src-de-bwl-election-1994", en ? "Official election result" : "官方选举结果")}</p>
    </section>}
    <SeatDetails election={election} allocation={allocation} locale={locale}/>
    {allocation.legalBasis.length > 0 && <details data-german-legal-basis>
      <summary className="cursor-pointer py-2 text-sm font-semibold">{en ? "Legislation and documented dates" : "相关法律及已核实日期"}</summary>
      <ul className="space-y-3 text-sm">{allocation.legalBasis.map(law => <li key={law.law_id}>
        <p className="font-semibold" lang="de">{law.title}</p><p>{law.summary[locale]}</p>
        {law.court_decision && <p className="text-xs">{en ? "Judgment cited" : "所引判决"} · <span lang="en">{law.court_decision}</span></p>}
        <p className="text-xs">{en ? "Bundestag adoption" : "联邦议院通过"} · {law.adopted_by_bundestag}　{en ? "Promulgation" : "公布"} · {law.promulgated}</p>
        <p className="text-xs">{en ? "Entry into force" : "生效日期"} · {law.in_force ?? (en ? "Date not verified" : "日期尚未核实")}　{law.bundestag_document} · {law.gazette}</p>
        <p className="text-xs">{sourceLink(election, law.source_id, en ? "Bundestag historical handbook · ch. 1.1" : "德国联邦议院历史手册 · 第 1.1 章")}</p>
      </li>)}</ul>
    </details>}
  </section>;
}
