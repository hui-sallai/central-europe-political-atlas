"use client";
import { useMemo, useState } from "react";
import { localeDate, localeNumber, type Locale } from "@/i18n/config";
import type { PoliticalElectionView } from "@/lib/politicalExplorer";
import type { ContextPoint } from "@/lib/politicalEconomicContext";
import { ELECTION_MACRO_INDICATORS, electionMacroCoverage, electionMacroCsv, electionMacroRows, type ElectionMacroIndicator, type MacroCell, type MacroView } from "@/lib/electionMacroLinkage";

// Side-by-side election and macroeconomic observations. Changes appear only within one country; nothing is differenced,
// ranked or pooled across countries, and no figure is attributed to a party or list.
export function PoliticalElectionMacroTable({ elections, points, locale }: { elections: PoliticalElectionView[]; points: ContextPoint[]; locale: Locale }) {
  const en = locale === "en";
  const [indicator, setIndicator] = useState<ElectionMacroIndicator>("hicp_inflation");
  const [view, setView] = useState<MacroView>("last_complete_year");
  const rows = useMemo(() => electionMacroRows(elections, points), [elections, points]);
  const coverage = electionMacroCoverage(rows);
  const names: Record<ElectionMacroIndicator, string> = en ? { hicp_inflation: "HICP inflation", real_gdp_growth: "Real GDP growth", unemployment_rate: "Unemployment rate", fiscal_balance_gdp: "Government balance (% of GDP)", government_debt_gdp: "Government debt (% of GDP)" } : { hicp_inflation: "HICP 通胀", real_gdp_growth: "实际 GDP 增长", unemployment_rate: "失业率", fiscal_balance_gdp: "政府收支差额（占 GDP %）", government_debt_gdp: "政府债务（占 GDP %）" };
  const n = (v: number | null, digits = 1) => (v === null ? "—" : localeNumber(v, locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  const delta = (v: number | null, digits = 1) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${n(Math.abs(v), digits)}`);
  const missing = (c: MacroCell) => (c.status === "pending" ? (en ? "Pending publication" : "待发布") : en ? "No published observation in the Atlas" : "Atlas 中没有已发布观测");
  const asOfElections = new Set(rows.filter((r) => r.publishedBeforeElection.status === "documented").map((r) => r.electionId));
  const selected = rows.filter((r) => r.indicator === indicator);
  const cellOf = (r: typeof selected[number]) => (view === "last_complete_year" ? r.lastCompleteYear : r.retrospective);
  function exportCsv() {
    const url = URL.createObjectURL(new Blob([electionMacroCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "election-macro-linkage.csv"; anchor.click(); URL.revokeObjectURL(url);
  }
  return <div className="mt-6 border-t border-[var(--line)] pt-5" data-election-macro>
    <h4 className="font-semibold">{en ? "Elections and macroeconomic conditions, across countries" : "跨国比较：选举与宏观经济状况"}</h4>
    <p className="mt-2 text-sm" role="note" data-election-macro-limits>{en ? "Descriptive only. These tables do not show that economic conditions caused an election result, or that any party caused an economic change, and they do not rank countries or predict elections. Figures in this table are the current data vintage, which may include revisions made after the election. Germany, Czechia, Poland and Slovakia define turnout differently and use different seat rules." : "仅作描述。这些表格不表示经济状况导致选举结果，也不表示任何政党造成经济变化，不对国家排名，也不预测选举。此表数字为当前数据版本，可能包含选举后的修订。德国、捷克、波兰和斯洛伐克的投票率定义和席位规则各不相同。"}</p>
    <div className="mt-3 flex flex-wrap gap-4">
      <label className="text-sm">{en ? "Indicator" : "指标"}<select className="field-control mt-2 block" value={indicator} onChange={(e) => setIndicator(e.target.value as ElectionMacroIndicator)}>{ELECTION_MACRO_INDICATORS.map((id) => <option key={id} value={id}>{names[id]}</option>)}</select></label>
      <label className="text-sm">{en ? "Period" : "期间"}<select className="field-control mt-2 block" value={view} onChange={(e) => setView(e.target.value as MacroView)}><option value="last_complete_year">{en ? "Last complete year before the election" : "选举前最后一个完整年度"}</option><option value="retrospective_calendar_year">{en ? "Election calendar year (retrospective)" : "选举所在日历年（回顾）"}</option></select></label>
    </div>
    <p className="mt-3 text-sm" data-election-macro-view>{view === "last_complete_year" ? (en ? "The year ended before polling day. That does not show the figure was public by then." : "该年度在投票日前结束，但这不表示该数字当时已公布。") : (en ? "The whole election year, including months after polling day. It is not information voters could have had." : "整个选举年度，包含投票日之后的月份。这不是选民当时可能掌握的信息。")} {en ? "Both views use current figures. For what had actually been published before polling day, see the table below." : "两种视图均使用当前数字。投票日前实际已公布的信息见下表。"}</p>
    <div className="mt-3 overflow-x-auto" role="region" tabIndex={0} aria-label={en ? "Elections and macroeconomic observations (scrollable)" : "选举与宏观经济观测（可横向滚动）"}>
      <table className="w-full min-w-[980px] text-left text-sm" data-election-macro-table>
        <thead><tr>{[en ? "Country" : "国家", en ? "Election" : "选举", en ? "Turnout (%) and basis" : "投票率（%）及口径", en ? "Turnout change (points)" : "投票率变化（百分点）", en ? "Seats and thresholds" : "席位与门槛", en ? "Year" : "年度", names[indicator], en ? "Change since previous election" : "相对上届选举的变化", en ? "Source" : "来源"].map((t) => <th scope="col" key={t} className="p-2">{t}</th>)}</tr></thead>
        <tbody>{selected.map((r) => { const c = cellOf(r); return <tr key={r.electionId} className="border-t border-[var(--line)]" data-macro-election={r.electionId} data-macro-status={c.status}>
          <td className="p-2">{r.countryName?.[locale] ?? r.country}</td>
          <td className="p-2">{localeDate(r.electionDate, locale)}<span className="block text-xs">{r.chamber}</span></td>
          <td className="p-2">{n(r.turnout.published ?? r.turnout.computed, 2)}<span className="block text-xs">{r.turnout.numerator}{r.turnout.computed !== null ? (en ? " · computed from official counts" : " · 根据官方人数计算") : ""}</span></td>
          <td className="p-2">{delta(r.turnout.changeSincePrevious, 2)}</td>
          <td className="p-2">{r.seats ?? "—"}<span className="block text-xs">{r.thresholds?.length ? r.thresholds.map((t) => `${n(t, 0)}%`).join(" / ") : en ? "see rules" : "见规则"}</span></td>
          <td className="p-2">{c.period}</td>
          <td className="p-2">{c.status === "published" ? `${n(c.value)} ${c.unit ?? ""}` : missing(c)}</td>
          <td className="p-2">{c.status === "published" && c.changeSincePreviousElection === null ? (en ? "Not comparable or no prior value" : "不可比或无上届数值") : delta(c.changeSincePreviousElection)}</td>
          <td className="p-2 text-xs">{c.sourceUrl ? <a className="underline" href={c.sourceUrl}>{c.source}</a> : "—"}{c.layer ? <span className="block">{c.layer}</span> : null}</td>
        </tr>; })}</tbody>
      </table>
    </div>
    <p className="mt-3 text-sm" data-election-macro-coverage>{en ? "Published observations out of elections, last complete year / election year: " : "已发布观测数／选举数，最后完整年度／选举年度："}{coverage.map((c) => `${names[c.indicator]} ${c.lastCompleteYear}/${c.retrospective} ${en ? "of" : "／共"} ${c.elections}`).join(" · ")}</p>
    <p className="mt-2 text-sm">{en ? "Changes use only the same series, definition and relative period within one country. Real wages are not shown: the Atlas holds nominal compensation only, with gaps. For party-list changes, use the verified comparison above, which excludes lists without documented identity." : "变化仅使用同一国家内相同序列、定义和相对期间。未显示实际工资：Atlas 仅有名义薪酬且存在缺口。政党名单的变化请使用上方已核实比较，其中不包括身份未记录的名单。"}</p>
    <div className="mt-6" data-election-as-of>
      <h5 className="font-semibold">{en ? "What had been published before polling day" : "投票日前已公布的信息"}</h5>
      <p className="mt-2 text-sm">{en ? "Pilot: the latest election in Germany, Czechia, Poland and Slovakia. Each value is printed in a dated Eurostat news release issued before polling day. The current figure is shown separately and never fills a gap. A release date is the earliest one located, since a national office may have published sooner, and publication does not show that voters saw a figure. Monthly and quarterly figures are not the same measure as the annual indicators above." : "试点：德国、捷克、波兰和斯洛伐克最近一届选举。每个数值均来自投票日前发布、注明日期的欧盟统计局新闻稿。当前数字单独显示，绝不用于填补空缺。发布日期是找到的最早日期，因为国家统计机构可能更早公布；已公布也不表示选民看到了该数字。月度和季度数字与上方的年度指标并非同一度量。"}</p>
      <div className="mt-3 overflow-x-auto" role="region" tabIndex={0} aria-label={en ? "Figures published before polling day (scrollable)" : "投票日前已公布的数字（可横向滚动）"}>
        <table className="w-full min-w-[980px] text-left text-sm" data-election-as-of-table>
          <thead><tr>{[en ? "Election" : "选举", en ? "Indicator" : "指标", en ? "Period" : "期间", en ? "Published on" : "发布日期", en ? "Value then" : "当时数值", en ? "Later releases" : "后续发布", en ? "Current value" : "当前数值", en ? "Revision" : "修订", en ? "Source" : "来源"].map((t) => <th scope="col" key={t} className="p-2">{t}</th>)}</tr></thead>
          <tbody>{rows.filter((r) => asOfElections.has(r.electionId)).map((r) => { const a = r.publishedBeforeElection; return <tr key={`${r.electionId}:${r.indicator}`} className="border-t border-[var(--line)]" data-as-of-row={`${r.electionId}:${r.indicator}`} data-as-of-status={a.status}>
            <td className="p-2">{r.countryName?.[locale] ?? r.country}<span className="block text-xs">{localeDate(r.electionDate, locale)}</span></td>
            <td className="p-2">{names[r.indicator]}</td>
            {a.status === "documented" ? <>
              <td className="p-2">{a.period}</td>
              <td className="p-2">{localeDate(a.publishedOn, locale)}{a.earliestLocatedRelease !== a.publishedOn ? <span className="block text-xs">{en ? "First located: " : "最早找到："}{localeDate(a.earliestLocatedRelease, locale)}</span> : null}</td>
              <td className="p-2">{n(a.value)}<span className="block text-xs">{a.unit}{a.flashEstimate ? (en ? " · flash estimate" : " · 快速估算") : ""}</span></td>
              <td className="p-2">{a.laterReleases.length ? a.laterReleases.map((l) => <a key={l.url} className="block underline" href={l.url}>{localeDate(l.publishedOn, locale)}: {n(l.value)}</a>) : "—"}</td>
              <td className="p-2">{a.current.status === "published" ? n(a.current.value) : (en ? "Not held for this period" : "未持有该期间数据")}</td>
              <td className="p-2">{delta(a.revisionSinceRelease)}</td>
              <td className="p-2 text-xs"><a className="underline" href={a.sourceUrl}>{en ? "Eurostat release" : "欧盟统计局新闻稿"}</a></td>
            </> : <td className="p-2" colSpan={7}>{en ? "Not established: " : "未确定："}{en ? (a.note ?? "no dated release was read for this figure.") : "未找到投票日前最后一次发布。"}</td>}
          </tr>; })}</tbody>
        </table>
      </div>
    </div>
    <button type="button" className="mt-2 underline" onClick={exportCsv}>{en ? "Export all elections and indicators CSV" : "导出全部选举与指标 CSV"}</button>
  </div>;
}
