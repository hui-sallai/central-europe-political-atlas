"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { localeDate, localeNumber, localizedRoute } from "@/i18n/config";
import { alignByLabel, chartResults, compareElections, measureValue, type ElectionAggregate, type PoliticalCountryView, type PoliticalElectionView, type PoliticalMeasure } from "@/lib/politicalExplorer";
import { PoliticalCountryComparison } from "./PoliticalCountryComparison";
import { NotebookCollect } from "./NotebookCollect";
import type { EvidenceDraft } from "@/lib/researchNotebook";

/** Germany-only descriptive results; no unresolved cross-election identity lines. */
export default function PoliticalExplorerAlpha({ elections, comparisonCountries = [] }: { elections: PoliticalElectionView[]; comparisonCountries?: PoliticalCountryView[] }) {
  const locale = useLocale();
  const en = locale === "en";
  const [electionId, setElectionId] = useState(elections.at(-1)?.electionId ?? "");
  const [measure, setMeasure] = useState<PoliticalMeasure>("vote_share");
  const [compareId, setCompareId] = useState("");
  // Cross-country comparison: only countries with authorised, published stores are ever passed in.
  const [otherCountry, setOtherCountry] = useState(comparisonCountries[0]?.slug ?? "");
  const [otherCountryElection, setOtherCountryElection] = useState("");
  const comparedCountry = comparisonCountries.find((item) => item.slug === otherCountry) ?? null;
  const comparedCountryElection = comparedCountry ? comparedCountry.elections.find((item) => item.electionId === otherCountryElection) ?? comparedCountry.elections.at(-1) ?? null : null;
  const election = elections.find((item) => item.electionId === electionId) ?? elections[0];
  const labels: Record<PoliticalMeasure, string> = en
    ? { votes: "Second votes", vote_share: "Second-vote share (derived)", seats: "Election seats", seat_share: "Seat share (derived)" }
    : { votes: "第二票票数", vote_share: "第二票占比（计算值）", seats: "选举席位", seat_share: "席位占比（计算值）" };

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("election"), metric = params.get("measure");
      if (elections.some(e => e.electionId === id)) setElectionId(id!);
      if (["votes", "vote_share", "seats", "seat_share"].includes(metric ?? "")) setMeasure(metric as PoliticalMeasure);
      const other = params.get("compare");
      setCompareId(elections.some(e => e.electionId === other) ? other! : "");
    };
    restore(); window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [elections]);
  function select(id: string, metric: PoliticalMeasure) {
    setElectionId(id); setMeasure(metric);
    const url = new URL(window.location.href); url.searchParams.set("election", id); url.searchParams.set("measure", metric);
    window.history.replaceState(null, "", url);
  }
  function compareWith(id: string) {
    setCompareId(id);
    const url = new URL(window.location.href); if (id) url.searchParams.set("compare", id); else url.searchParams.delete("compare");
    window.history.replaceState(null, "", url);
  }
  const other = elections.find((item) => item.electionId === compareId && item.electionId !== election?.electionId) ?? null;
  const number = (value: number | null, digits = 0) => localeNumber(value, locale, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const signed = (value: number | null, digits = 0) => value === null ? "—" : `${value > 0 ? "+" : value < 0 ? "−" : ""}${localeNumber(Math.abs(value), locale, { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
  const aggregateLabels: Record<ElectionAggregate["key"], string> = en
    ? { turnout: "Published turnout (%)", eligible: "Eligible voters", voters: "Voters", valid: "Valid second votes", seats: "Election seats", lists: "Lists on the ballot", seat_lists: "Lists that won seats" }
    : { turnout: "官方投票率（%）", eligible: "合格选民", voters: "投票人数", valid: "有效第二票", seats: "选举席位", lists: "参选名单数", seat_lists: "获得席位的名单数" };
  const charted = election ? chartResults(election) : [];
  const maxShare = Math.max(1, ...charted.map((result) => result.publishedVoteShare ?? 0));
  const maxSeats = Math.max(1, ...charted.map((result) => result.seats ?? 0));
  const largest = charted[0];
  function draft(sourceId?: string): EvidenceDraft {
    if (!election) throw new Error("No election selected");
    const selectedSources = election.sources.filter(s => !sourceId || s.id === sourceId);
    const boundary = { en: "Election-specific descriptive evidence. Unresolved party relations are excluded from continuous series; no causal estimates, forecasts or evaluative scores.", "zh-CN": "当届选举描述性证据。未解决政党关系不进入连续序列；不提供因果估计、预测或评价分数。" };
    const url = new URL(localizedRoute("/politics/", locale), "https://hy-central-europe-analysis.org");
    url.searchParams.set("election", election.electionId); url.searchParams.set("measure", measure); if (sourceId) url.searchParams.set("source", sourceId);
    return { type: sourceId ? "source" : "series_view", title: `Germany ${election.year} election`, labels: { en: `Germany ${election.year} election`, "zh-CN": `德国 ${election.year} 年选举` }, url: url.href, canonical_ids: sourceId ? [sourceId] : [election.electionId, ...election.results.map(r => r.contestantId)], countries: ["germany"], periods: [election.date], layer: "national_election_second_votes", sources: selectedSources.map(s => ({ institution: "Die Bundeswahlleiterin, Wiesbaden", dataset: s.title, url: s.url, code: s.id, layer: "tier1_official", retrieved_at: s.retrievedAt })), warnings: [boundary.en], warning_labels: { en: [boundary.en], "zh-CN": [boundary["zh-CN"]] }, comparability: "election_specific_no_party_continuity", metadata: { filters: { election: election.electionId, measure, ...(sourceId ? { source: sourceId } : {}) }, row_count: sourceId ? 1 : election.results.length, reference: `Die Bundeswahlleiterin, Wiesbaden; ${election.resultVintage}` } };
  }

  return <section aria-labelledby="political-explorer-title" className="space-y-6" data-politics-explorer>
    <header>
      <h2 id="political-explorer-title" className="text-2xl font-semibold">{en ? "Germany: national elections" : "德国：联邦议会选举"}</h2>
      <p>{en ? "Descriptive results, not forecasts or causal estimates. Ballot contestants are not continuous party series." : "描述性选举结果，不是预测或因果估计。参选名单不代表跨届连续政党序列。"}</p>
    </header>
    <div className="card overflow-x-auto p-4" role="region" tabIndex={0} aria-label={en ? "Election history (scrollable)" : "选举历史（可横向滚动）"}>
      <table className="w-full min-w-[560px] text-left text-sm"><caption className="mb-3 text-left font-semibold">{en ? "Election history · 2002–2025" : "选举历史 · 2002–2025"}</caption>
        <thead><tr><th scope="col">{en ? "Date" : "日期"}</th><th scope="col">{en ? "Published turnout" : "官方投票率"}</th><th scope="col">{en ? "Contestants" : "参选名单数"}</th><th scope="col">{en ? "Election seats" : "选举席位"}</th><th scope="col">{en ? "Rules / source" : "规则／来源"}</th></tr></thead>
        <tbody>{elections.map(item => <tr key={item.electionId} className="border-t border-[var(--line)]"><th scope="row" className="py-3"><button type="button" className="text-[var(--accent)] underline" aria-pressed={election?.electionId === item.electionId} onClick={() => select(item.electionId, measure)}>{localeDate(item.date, locale)}</button></th><td>{localeNumber(item.publishedTurnout, locale)}%</td><td>{item.results.length}</td><td>{item.totalSeats}{item.year === 2021 ? <span className="block text-xs">{en ? "Corrected after repeat" : "重选后更正"}</span> : null}</td><td><button type="button" className="underline" onClick={() => { select(item.electionId, measure); document.getElementById("politics-system")?.scrollIntoView(); }}>{en ? "System notes" : "选制说明"}</button></td></tr>)}</tbody>
      </table>
    </div>
    <div className="flex flex-wrap gap-4">
      <label>{en ? "Country" : "国家"}<select disabled className="field-control block"><option>{en ? "Germany" : "德国"}</option></select></label>
      <label>{en ? "Election" : "选举"}<select className="field-control block" value={election?.electionId ?? ""} onChange={(event) => select(event.target.value, measure)}>
        {elections.map((item) => <option key={item.electionId} value={item.electionId}>{item.year}</option>)}
      </select></label>
      <label>{en ? "Measure" : "指标"}<select className="field-control block" value={measure} onChange={(event) => select(election!.electionId, event.target.value as PoliticalMeasure)}>
        {Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
    </div>
    {!election ? <p role="status">{en ? "No approved election data available." : "暂无通过准入的数据。"}</p> : <>
      <div aria-live="polite" id="politics-system" className="card p-5">
        <h3 className="font-semibold">{en ? "Electoral system and result vintage" : "选制与结果版本"}</h3>
        <p>{en ? "Result vintage" : "结果版本"}: {election.year === 2021 ? (en ? "Corrected final after the 2024 Berlin repeat" : "2024年柏林部分重选后的更正最终结果") : (en ? "Final" : "最终结果")}</p>
        <p>{en ? "Published turnout" : "官方公布投票率"}: {localeNumber(election.publishedTurnout, locale)}{election.publishedTurnout === null ? "" : "%"}</p>
        <p>{election.notes[locale]}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4" data-politics-research-details>
          {[
            [en ? "Election date" : "选举日期", localeDate(election.date, locale)],
            [en ? "Vote shown" : "所示选票", en ? "Second vote (party-list vote)" : "第二票（政党名单票）"],
            [en ? "Seat allocation method" : "席位分配方法", election.system.allocationMethod],
            [en ? "Base seats under the rules" : "规则规定的基础席位", number(election.system.baseSeats)],
            [en ? "Seats after this election" : "本届选举产生的席位", number(election.totalSeats)],
            [en ? "Eligible voters" : "合格选民", number(election.eligibleVoters)],
            [en ? "Voters" : "投票人数", number(election.voters)],
            [en ? "Valid second votes" : "有效第二票", number(election.validSecondVotes)],
          ].map(([label, value]) => <div key={label}><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="metric-number font-semibold">{value}</dd></div>)}
        </dl>
      </div>
      <div className="card p-5" data-politics-summary>
        <h3 className="font-semibold">{en ? `The ${election.year} election at a glance` : `${election.year} 年选举概览`}</h3>
        <p className="mt-2 text-sm leading-7">{en
          ? `${election.results.length} lists stood for election and ${election.results.filter((r) => (r.seats ?? 0) > 0).length} of them won seats. Published turnout was ${number(election.publishedTurnout, 1)}%. ${largest ? "The list with the most second votes received " + number(largest.publishedVoteShare, 1) + "% (published)." : ""}`
          : `共有 ${election.results.length} 份名单参选，其中 ${election.results.filter((r) => (r.seats ?? 0) > 0).length} 份获得席位。官方公布的投票率为 ${number(election.publishedTurnout, 1)}%。${largest ? "获得第二票最多的名单得票率为 " + number(largest.publishedVoteShare, 1) + "%（官方公布）。" : ""}`}</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <figure data-politics-chart="votes-seats">
            <figcaption className="text-sm font-semibold">{en ? "Second-vote share and seats, by list" : "各名单的第二票得票率与席位"}</figcaption>
            <p className="mt-1 text-xs text-[var(--muted)]">{en ? "Lists that won seats or reached 1% of second votes. Upper bar: published share of second votes (%). Lower bar: seats. Bars use one neutral colour; order is by second votes." : "仅列出获得席位或得票率达到 1% 的名单。上方条：官方公布的第二票得票率（%）；下方条：席位数。所有条形使用同一中性颜色，按第二票数排序。"}</p>
            <ul className="mt-3 space-y-3">{charted.map((result) => (
              <li key={result.contestantId} className="text-xs" data-chart-list={result.contestantId}>
                <span lang="de" data-original-language="de" className="font-semibold">{result.nativeLabel}</span>
                <div className="mt-1 flex items-center gap-2"><span className="h-3 rounded-sm bg-[var(--accent)]" style={{ width: `${Math.max(0.5, 70 * (result.publishedVoteShare ?? 0) / maxShare)}%` }} aria-hidden="true" /><span className="metric-number">{number(result.publishedVoteShare, 1)}%</span></div>
                <div className="mt-1 flex items-center gap-2"><span className="h-3 rounded-sm border border-[var(--accent)]" style={{ width: `${Math.max(0.5, 70 * (result.seats ?? 0) / maxSeats)}%` }} aria-hidden="true" /><span className="metric-number">{result.seats === null ? (en ? "seats: —" : "席位：—") : `${number(result.seats)} ${en ? "seats" : "席"}`}</span></div>
              </li>
            ))}</ul>
          </figure>
          <figure data-politics-chart="turnout">
            <figcaption className="text-sm font-semibold">{en ? "Published turnout, 2002–2025" : "官方投票率，2002–2025"}</figcaption>
            <p className="mt-1 text-xs text-[var(--muted)]">{en ? "Percent of eligible voters, as published. The selected election is filled; bars start at 0%." : "占合格选民的百分比（官方公布值）。当前选中的选举为实心；条形从 0% 起。"}</p>
            <ul className="mt-3 space-y-2">{elections.map((item) => (
              <li key={item.electionId} className="flex items-center gap-2 text-xs" data-turnout-year={item.year}>
                <span className="metric-number w-10">{item.year}</span>
                <span className={`h-3 rounded-sm border border-[var(--accent)] ${item.electionId === election.electionId ? "bg-[var(--accent)]" : ""}`} style={{ width: `${0.7 * (item.publishedTurnout ?? 0)}%` }} aria-hidden="true" />
                <span className="metric-number">{number(item.publishedTurnout, 1)}%</span>
              </li>
            ))}</ul>
          </figure>
        </div>
      </div>
      <NotebookCollect create={() => draft()} />
      <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={en ? "Election results (scrollable)" : "选举结果（可横向滚动）"}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="text-left">{labels[measure]}</caption>
          <thead><tr><th scope="col">{en ? "Ballot contestant (original name)" : "参选名单（原文名称）"}</th><th scope="col">{labels[measure]}</th>{measure === "vote_share" ? <><th scope="col">{en ? "Published vote share" : "官方公布票率"}</th><th scope="col">{en ? "Seat share (derived)" : "席位占比（计算值）"}</th></> : null}<th scope="col">{en ? "Source" : "来源"}</th></tr></thead>
          <tbody>{election.results.map((result) => {
            const value = measureValue(result, election, measure);
            const source = election.sources.find((item) => item.id === result.sourceId);
            return <tr key={result.contestantId} className="border-t border-[var(--line)]">
              <th scope="row" className="py-3 font-normal"><span lang="de" data-original-language="de">{result.nativeLabel}</span><span className="block text-xs text-[var(--muted)]">{en ? "Party’s own list · no cross-election identity link" : "政党自身名单 · 无跨届身份关联"}</span></th>
              <td className="metric-number">{localeNumber(value, locale)}{value !== null && measure.endsWith("share") ? "%" : ""}</td>
              {measure === "vote_share" ? <><td className="metric-number">{localeNumber(result.publishedVoteShare, locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}{result.publishedVoteShare === null ? "" : "%"}</td><td className="metric-number">{localeNumber(measureValue(result, election, "seat_share"), locale)}{result.seats === null ? "" : "%"}</td></> : null}
              <td>{source ? <a href={source.url} className="underline">{source.title}</a> : <span>{en ? "Source missing" : "来源缺失"}</span>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p>{en ? "Derived shares = count / election denominator × 100. Missing seats remain missing, not zero. Rounded vote shares do not determine electoral qualification." : "计算占比＝票数或席位数／对应选举分母×100。缺失席位不转换为零；四舍五入的票率不能用于判断资格门槛。"}</p>
      <p>{en ? "Source: Die Bundeswahlleiterin, Wiesbaden. Source links identify the election evidence." : "来源：Die Bundeswahlleiterin, Wiesbaden。来源链接指向对应选举证据。"}</p>
      <section className="card p-5" aria-labelledby="politics-compare-title" data-politics-compare>
        <h3 id="politics-compare-title" className="font-semibold">{en ? "Compare two elections" : "比较两届选举"}</h3>
        <label className="mt-3 block text-sm">{en ? `Compare ${election.year} with` : `将 ${election.year} 年与以下选举比较`}<select className="field-control block" value={other?.electionId ?? ""} onChange={(event) => compareWith(event.target.value)}>
          <option value="">{en ? "No comparison" : "不比较"}</option>
          {elections.filter((item) => item.electionId !== election.electionId).map((item) => <option key={item.electionId} value={item.electionId}>{item.year}</option>)}
        </select></label>
        {other ? <>
          <div className="mt-4 overflow-x-auto" role="region" tabIndex={0} aria-label={en ? "Election-level comparison (scrollable)" : "选举层面的比较（可横向滚动）"}>
            <table className="w-full min-w-[520px] text-left text-sm" data-compare-aggregates>
              <caption className="mb-2 text-left font-semibold">{en ? "Election-level figures" : "选举层面的数字"}</caption>
              <thead><tr><th scope="col">{en ? "Measure" : "指标"}</th><th scope="col">{election.year}</th><th scope="col">{other.year}</th><th scope="col">{en ? `Difference (${other.year} − ${election.year})` : `差值（${other.year} − ${election.year}）`}</th></tr></thead>
              <tbody>{compareElections(election, other).map((row) => { const digits = row.key === "turnout" ? 1 : 0; return <tr key={row.key} className="border-t border-[var(--line)]" data-aggregate={row.key}><th scope="row" className="py-2 font-normal">{aggregateLabels[row.key]}</th><td className="metric-number">{number(row.a, digits)}</td><td className="metric-number">{number(row.b, digits)}</td><td className="metric-number">{signed(row.difference, digits)}{row.key === "turnout" && row.difference !== null ? (en ? " pp" : " 个百分点") : ""}</td></tr>; })}</tbody>
            </table>
          </div>
          <p className="mt-3 text-sm">{en ? `Rules differ: ${election.year} used ${election.system.allocationMethod} with ${number(election.system.baseSeats)} base seats; ${other.year} used ${other.system.allocationMethod} with ${number(other.system.baseSeats)}. Seat totals are not like-for-like across rule changes.` : `规则不同：${election.year} 年采用 ${election.system.allocationMethod}，基础席位 ${number(election.system.baseSeats)} 席；${other.year} 年采用 ${other.system.allocationMethod}，基础席位 ${number(other.system.baseSeats)} 席。规则变化前后的席位总数不能直接等同比较。`}</p>
          <div className="mt-4 overflow-x-auto" role="region" tabIndex={0} aria-label={en ? "Lists in the two elections (scrollable)" : "两届选举的名单（可横向滚动）"}>
            <table className="w-full min-w-[640px] text-left text-sm" data-compare-lists>
              <caption className="mb-2 text-left font-semibold">{en ? "Lists in each election (rows aligned by identical ballot label only)" : "各届选举的名单（仅按完全相同的选票名称对齐）"}</caption>
              <thead><tr><th scope="col">{en ? "Ballot label (original)" : "选票名称（原文）"}</th><th scope="col">{en ? `${election.year}: published share` : `${election.year}：官方得票率`}</th><th scope="col">{en ? `${election.year}: seats` : `${election.year}：席位`}</th><th scope="col">{en ? `${other.year}: published share` : `${other.year}：官方得票率`}</th><th scope="col">{en ? `${other.year}: seats` : `${other.year}：席位`}</th></tr></thead>
              <tbody>{alignByLabel(election, other).filter((row) => [row.a, row.b].some((r) => r && ((r.seats ?? 0) > 0 || (r.publishedVoteShare ?? 0) >= 1))).map((row) => { const absent = en ? "not on the ballot under this label" : "该名称未出现在选票上"; const share = (r: typeof row.a) => r ? `${number(r.publishedVoteShare, 1)}${r.publishedVoteShare === null ? "" : "%"}` : absent; const seats = (r: typeof row.a) => r ? number(r.seats) : "—"; return <tr key={row.label} className="border-t border-[var(--line)]" data-label-row={row.a && row.b ? "both" : "one"}><th scope="row" className="py-2 font-normal"><span lang="de" data-original-language="de">{row.label}</span></th><td className="metric-number">{share(row.a)}</td><td className="metric-number">{seats(row.a)}</td><td className="metric-number">{share(row.b)}</td><td className="metric-number">{seats(row.b)}</td></tr>; })}</tbody>
            </table>
          </div>
          <p className="mt-3 text-sm" data-identity-limitation>{en ? "Rows are aligned only where the official ballot label is identical. This is a display aid, not a verified party identity: a list that changed its name appears on two rows, and no change is calculated for any individual list, because cross-election party identity has not been established in the Atlas." : "只有官方选票名称完全相同的名单才会排在同一行。这只是显示上的对齐，不是经过核实的政党身份：更名的名单会出现在两行，且不对任何单个名单计算变化，因为 Atlas 尚未确立跨届政党身份。"}</p>
        </> : <p className="mt-3 text-sm text-[var(--muted)]">{en ? "Choose a second election to see election-level differences and the two sets of lists side by side." : "选择另一届选举，即可查看选举层面的差值，并并排查看两届的名单。"}</p>}
      </section>
      <section className="card p-5" data-politics-cross-country>
        <h3 className="font-semibold">{en ? "Comparing countries" : "跨国比较"}</h3>
        {comparisonCountries.length && comparedCountry && comparedCountryElection ? <>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="text-sm">{en ? "Compare with country" : "比较的国家"}<select className="field-control block" value={comparedCountry.slug} onChange={(event) => { setOtherCountry(event.target.value); setOtherCountryElection(""); }}>{comparisonCountries.map((item) => <option key={item.slug} value={item.slug}>{item.name[locale]}</option>)}</select></label>
            <label className="text-sm">{en ? "Election" : "选举"}<select className="field-control block" value={comparedCountryElection.electionId} onChange={(event) => setOtherCountryElection(event.target.value)}>{comparedCountry.elections.map((item) => <option key={item.electionId} value={item.electionId}>{item.year}</option>)}</select></label>
          </div>
          <PoliticalCountryComparison a={election} b={comparedCountryElection} locale={locale} />
        </> : <p className="mt-2 text-sm" data-cross-country-disabled>{en ? "Not available yet: Germany is the only country with authorised election data. A country becomes selectable only once its official data is published in the Atlas; no placeholder values are shown. The comparison view is built and will show two elections side by side — dates, chambers, turnout, seats, lists and each electoral system — without ranking parties or countries. A candidate package for Romania's 2016 Chamber of Deputies election exists in staging; it is not published and needs owner authorisation and unresolved source checks before it can be used." : "暂不可用：目前只有德国拥有经授权的选举数据。只有当一个国家的官方数据在 Atlas 中发布后，该国才可选择；不显示任何占位数值。比较视图已经建好，届时将并排显示两场选举的日期、议院、投票率、席位、名单和各自的选举制度，且不对政党或国家排名。罗马尼亚 2016 年众议院选举的候选数据包已在暂存区，但尚未发布；在获得所有者授权并完成未决的来源核查之前不能使用。"}</p>}
      </section>
      <details className="card p-5"><summary className="cursor-pointer font-semibold">{en ? "Sources, provenance and downloads" : "来源、出处与下载"}</summary>
        <ul className="mt-4 space-y-4">{election.sources.map(source => <li key={source.id} className="break-words text-sm"><a href={source.url} className="underline">{source.title}</a><p className="text-xs">SHA-256: {source.sha256} · {en ? "Retrieved" : "获取时间"}: {source.retrievedAt}</p>{source.licenceUrl ? <a href={source.licenceUrl} className="underline">{en ? "Reuse terms" : "复用条款"}</a> : null}<div className="mt-2"><NotebookCollect create={() => draft(source.id)} label={en ? "Collect source" : "收藏来源"} /></div></li>)}</ul>
        <div className="mt-4 space-y-2 text-sm" data-politics-definitions>
          <p className="font-semibold">{en ? "Definitions and formulas" : "定义与公式"}</p>
          <p>{en ? "Published values (vote share, turnout) are the election authority's own figures and are shown as published." : "官方公布值（得票率、投票率）是选举机构自己的数字，按公布值显示。"}</p>
          <p>{en ? "Derived vote share = a list's second votes ÷ valid second votes × 100. Derived seat share = a list's seats ÷ seats after the election × 100. Derived values are labelled and never replace a published value." : "计算得票率＝名单第二票数 ÷ 有效第二票 × 100。计算席位占比＝名单席位 ÷ 本届选举产生的席位 × 100。计算值均有标注，且不替代官方公布值。"}</p>
          <p>{en ? "Turnout" : "投票率"}: {election.turnoutDefinition ? <span lang="en">{election.turnoutDefinition}</span> : (en ? "definition not recorded" : "未记录定义")}</p>
          <p>{en ? `Result vintage: “${election.resultVintage}”. A corrected vintage replaces the earlier figures for that election and is stated wherever it applies.` : `结果版本：“${election.resultVintage}”。更正版本会取代该届选举的早期数字，并在适用处注明。`}</p>
          <p>{en ? "Reuse: each source below links to the publisher's reuse terms; the Atlas redistributes only data whose terms allow it." : "复用：下方每个来源都链接到发布方的复用条款；Atlas 只再分发条款允许的数据。"}</p>
        </div>
        <p className="mt-4"><a href="/research-data/political/germany/election_results.csv" className="underline">{en ? "Results CSV (all seven elections)" : "结果CSV（七届选举）"}</a>{" · "}<a href="/research-data/political/germany/manifest.json" className="underline">{en ? "Twelve-store JSON/CSV manifest" : "十二张表JSON／CSV清单"}</a>{" · "}<a href="/research-data/political/germany/election_turnout.csv" className="underline">{en ? "Turnout CSV" : "投票率CSV"}</a>{" · "}<a href="/research-data/political/germany/electoral_systems.csv" className="underline">{en ? "Electoral-system rules CSV" : "选举制度规则CSV"}</a></p>
      </details>
    </>}
  </section>;
}
