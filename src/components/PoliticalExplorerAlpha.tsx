"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { localeDate, localeNumber, localizedRoute } from "@/i18n/config";
import { measureValue, type PoliticalElectionView, type PoliticalMeasure } from "@/lib/politicalExplorer";
import { NotebookCollect } from "./NotebookCollect";
import type { EvidenceDraft } from "@/lib/researchNotebook";

/** Germany-only descriptive results; no unresolved cross-election identity lines. */
export default function PoliticalExplorerAlpha({ elections }: { elections: PoliticalElectionView[] }) {
  const locale = useLocale();
  const en = locale === "en";
  const [electionId, setElectionId] = useState(elections.at(-1)?.electionId ?? "");
  const [measure, setMeasure] = useState<PoliticalMeasure>("vote_share");
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
    };
    restore(); window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [elections]);
  function select(id: string, metric: PoliticalMeasure) {
    setElectionId(id); setMeasure(metric);
    const url = new URL(window.location.href); url.searchParams.set("election", id); url.searchParams.set("measure", metric);
    window.history.replaceState(null, "", url);
  }
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
      <details className="card p-5"><summary className="cursor-pointer font-semibold">{en ? "Sources, provenance and downloads" : "来源、出处与下载"}</summary>
        <ul className="mt-4 space-y-4">{election.sources.map(source => <li key={source.id} className="break-words text-sm"><a href={source.url} className="underline">{source.title}</a><p className="text-xs">SHA-256: {source.sha256} · {en ? "Retrieved" : "获取时间"}: {source.retrievedAt}</p>{source.licenceUrl ? <a href={source.licenceUrl} className="underline">{en ? "Reuse terms" : "复用条款"}</a> : null}<div className="mt-2"><NotebookCollect create={() => draft(source.id)} label={en ? "Collect source" : "收藏来源"} /></div></li>)}</ul>
        <p className="mt-4"><a href="/research-data/political/germany/election_results.csv" className="underline">{en ? "Results CSV (all seven elections)" : "结果CSV（七届选举）"}</a>{" · "}<a href="/research-data/political/germany/manifest.json" className="underline">{en ? "Twelve-store JSON/CSV manifest" : "十二张表JSON／CSV清单"}</a></p>
      </details>
    </>}
  </section>;
}
