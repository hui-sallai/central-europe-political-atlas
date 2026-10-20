"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { monthlyIndicators, monthlyRows, monthlyReference, monthlyValid, monthlyUrl, monthlyCsv, monthlyEvidence, restoreMonthlySession, monthNumber, monthPeriod, type MonthlyPayload, type MonthlySession } from "@/lib/monthlyComparison";
import { ResearchTimeSeriesChart } from "./ResearchTimeSeriesChart";
import { NotebookCollect } from "./NotebookCollect";
import { MonthlyEventContext } from "./MonthlyEventContext";

type Country = { slug: string; name: string; name_zh: string };
const colors = ["#a6453c", "#246a87", "#64803c", "#8753a1", "#b06d20"];
export function MonthlyComparisonWorkbench({ countries, payload }: { countries: Country[]; payload: MonthlyPayload }) {
  const en = useLocale() === "en", t = (zh: string, english: string) => en ? english : zh;
  const [session, setSession] = useState(() => restoreMonthlySession(new URLSearchParams(), countries.map(c => c.slug), payload));
  const [ready, setReady] = useState(false), [message, setMessage] = useState("");
  useEffect(() => {
    const read = () => { setSession(restoreMonthlySession(new URLSearchParams(window.location.search), countries.map(c => c.slug), payload)); setReady(true); };
    const timer = window.setTimeout(read, 0); window.addEventListener("popstate", read);
    return () => { window.clearTimeout(timer); window.removeEventListener("popstate", read); };
  }, [countries, payload]);
  useEffect(() => { if (ready && !session.issues.length) { const url = new URL(monthlyUrl(session, en)); window.history.replaceState(null, "", window.location.pathname + url.search + window.location.hash); } }, [session, ready, en]);
  const update = (patch: Partial<MonthlySession>) => { setSession(s => ({ ...s, ...patch, issues: patch.countries ? [] : s.issues })); setMessage(""); };
  const rows = useMemo(() => monthlyRows(session, payload), [session, payload]);
  const valid = monthlyValid(session), reference = monthlyReference(session, rows);
  const indicator = monthlyIndicators[session.indicator as keyof typeof monthlyIndicators];
  const title = indicator ? (en ? indicator.en : indicator.zh) : session.indicator;
  const name = (slug: string) => { const c = countries.find(c => c.slug === slug); return (en ? c?.name : c?.name_zh) ?? slug; };
  const number = (n: number) => n.toLocaleString(en ? "en" : "zh-CN", { maximumFractionDigits: 3 }).replaceAll("-", "−");
  const months = valid ? Array.from({ length: monthNumber(session.to) - monthNumber(session.from) + 1 }, (_, i) => monthPeriod(monthNumber(session.from) + i)) : [];
  const warningSources = [...new Set(rows.map(r => r[6]))].map(i => payload.sources[i]).filter(s => s.warning);
  const warnings = [...new Set(warningSources.map(s => s.warning))];
  function exportCsv() {
    const url = URL.createObjectURL(new Blob(["\uFEFF", monthlyCsv(rows, payload)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `monthly-${session.indicator}-${session.from}-${session.to}.csv`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function share() { try { await navigator.clipboard.writeText(monthlyUrl(session, en)); setMessage(t("研究链接已复制。", "Research link copied.")); } catch { setMessage(t("请使用下方研究链接。", "Use the research link below.")); } }
  return <section className="editorial-panel mt-6 min-w-0 p-5" aria-label={t("多国月度比较", "Multi-country monthly comparison")} data-monthly-comparison>
    <h3 className="text-2xl font-semibold">{t("多国月度经济比较", "Multi-country monthly economic comparison")}</h3>
    <p className="mt-3 text-sm">{t("只比较现有已发布月度观测，不混入年度数据。同比率仍以月为参考期；指数水平不是增长率。缺失不补零、不插值。", "Compare existing published monthly observations, separately from annual data. Annual inflation rates still have monthly reference periods; index levels are not growth rates. No zero-filling or interpolation.")}</p>
    <p className="mt-2 text-sm text-[var(--muted)]">{t("当前修订版的描述性比较，不是投票时可知信息、因果结论或冻结模型输入。覆盖从现有高频观测起点开始；不自动拼接独立历史补充或 SORS 季度/CPI 数据。", "Descriptive comparison of current revisions, not information known at a historical date, causal conclusions or frozen model inputs. Coverage starts with the existing high-frequency observations; separate historical backfills and SORS quarterly/CPI data are not spliced in.")}</p>
    <fieldset className="my-4 flex flex-wrap gap-3"><legend>{t("选择国家（2–5 国）", "Countries (2–5)")}</legend>{countries.map(c => <label key={c.slug}><input type="checkbox" checked={session.countries.includes(c.slug)} disabled={!session.countries.includes(c.slug) && session.countries.length >= 5} onChange={() => update({ countries: session.countries.includes(c.slug) ? session.countries.filter(s => s !== c.slug) : [...session.countries, c.slug] })} /> {name(c.slug)}</label>)}</fieldset>
    <div className="grid gap-4 sm:grid-cols-3">
      <label>{t("指标", "Indicator")}<select className="field-control mt-2" value={session.indicator} onChange={e => update({ indicator: e.target.value })}>{!indicator ? <option value={session.indicator}>{t("不可用指标", "Unavailable indicator")}</option> : null}{Object.entries(monthlyIndicators).map(([id, i]) => <option key={id} value={id}>{en ? i.en : i.zh}</option>)}</select></label>
      <label>{t("起始月", "From month")}<input className="field-control mt-2" type="month" value={session.from} onChange={e => update({ from: e.target.value })} /></label>
      <label>{t("结束月", "To month")}<input className="field-control mt-2" type="month" value={session.to} onChange={e => update({ to: e.target.value })} /></label>
      <label>{t("参照月份口径", "Reference-month mode")}<select className="field-control mt-2" value={session.mode} onChange={e => update({ mode: e.target.value })}>{!["common", "explicit", "partial"].includes(session.mode) ? <option value={session.mode}>{t("无效口径", "Invalid mode")}</option> : null}<option value="common">{t("最新共同合格月份", "Latest common eligible month")}</option><option value="explicit">{t("指定月份", "Explicit month")}</option><option value="partial">{t("最新有观测月份（允许部分覆盖）", "Latest observed month (partial coverage)")}</option></select></label>
      {session.mode === "explicit" ? <label>{t("指定参照月", "Explicit reference month")}<input className="field-control mt-2" type="month" value={session.month} onChange={e => update({ month: e.target.value })} /></label> : null}
    </div>
    {!valid ? <p role="alert" className="mt-4">{t("请选择2–5国、有效指标及最多1200个月的有效期间，并核对链接参数。", "Select 2–5 countries, a supported indicator and a valid period of at most 1,200 months; check the URL parameters.")}</p> : null}
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button className="rounded border border-[var(--line)] px-3 py-2 text-sm" disabled={!ready || !rows.length} onClick={exportCsv}>{t("导出实际月度观测（CSV）", "Export actual monthly observations (CSV)")}</button>
      <NotebookCollect disabled={!ready || !rows.length} label={t("收藏月度比较配置", "Collect monthly comparison configuration")} create={() => monthlyEvidence(session, rows, payload, en)} />
      <button className="rounded border border-[var(--line)] px-3 py-2 text-sm" onClick={() => void share()}>{t("复制月度研究链接", "Copy monthly research link")}</button>
      <a className="text-sm underline" data-monthly-link href={monthlyUrl(session, en)}>{t("打开月度研究链接", "Open monthly research link")}</a><span role="status">{message}</span>
    </div>
    <p className="mt-3 text-xs">{t("CSV仅含趋势期间内合格的实际已发布观测，不生成缺失行。Notebook保存配置与最多100条引用，不冻结数值或修订。", "CSV includes only eligible actual published observations within the trend period; absent rows are not generated. Notebook saves the configuration and up to 100 references, not frozen values or revisions.")}</p>
    <MonthlyEventContext selected={session.countries} countries={countries} from={session.from} to={session.to} enabled={ready && valid} />
    <h4 className="mt-6 text-lg font-semibold">{t("参照月比较", "Reference-month comparison")} · {reference ?? "—"}</h4>
    <p className="mt-2 text-sm" data-monthly-reference>{session.mode === "partial" ? t("部分覆盖模式：所有国家仍使用同一月份；没有观测的国家保留缺失，不使用各国不同的最新月份。", "Partial-coverage mode: all countries still use one calendar month. Countries without observations remain unavailable; separate national latest months are not mixed.") : session.mode === "explicit" ? t("指定月份不会自动替换；超出趋势期间的观测不进入此表。", "Explicit months are never replaced; observations outside the trend period are excluded from this table.") : t("共同月份是所选期间内所有国家都有合格实际观测的最新月份。", "The common month is the latest month within the selected period with eligible actual observations for every selected country.")}</p>
    {!reference ? <p className="mt-3" role="status">{t("没有可用参照月：可能不存在共同合格月份，或指定月份/配置无效。请检查覆盖范围。", "No reference month: no common eligible month exists, or the explicit month/configuration is invalid. Check coverage.")}</p> : null}
    <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">{t("实际月度观测及来源", "Actual monthly observations and sources")}</caption><thead><tr>{[t("国家", "Country"), t("月份", "Month"), t("值 / 单位", "Value / unit"), t("状态与覆盖", "Status / coverage"), t("来源 / 修订", "Source / vintage")].map(h => <th scope="col" className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{session.countries.map(country => {
      const r = rows.find(row => row[1] === country && row[3] === reference), source = r ? payload.sources[r[6]] : undefined;
      const raw = payload.rows.find(row => row[1] === country && row[2] === session.indicator && row[3] === reference);
      const coverage = rows.filter(row => row[1] === country).map(row => row[3]).sort();
      const reason = reference && (reference < session.from || reference > session.to) ? t("超出所选期间", "Outside selected period") : raw?.[5] === "pending" ? t("待发布", "Pending publication") : raw ? t("缺失值或定义/状态未通过比较检查", "Missing value or definition/status not eligible") : t("现有发布记录不覆盖此月；不推断官方是否已发布", "No record in current coverage; official availability not inferred");
      return <tr className="border-t border-[var(--line)]" key={country}><th scope="row" className="p-3">{name(country)}</th><td className="p-3 tabular-nums">{reference ?? "—"}</td><td className="p-3 tabular-nums">{r && r[4] !== null ? `${number(r[4])}${source?.unit === "RCH_A" || source?.unit === "PC_ACT" ? "%" : ""} · ${source?.unit}` : "—"}</td><td className="p-3">{r ? t("官方已发布", "Official published") : reason}<span className="mt-1 block text-xs">{coverage[0] ?? "—"} – {coverage.at(-1) ?? "—"} · {coverage.length} {t("个月", "months")}</span></td><td className="p-3">{source ? <><a href={source.url} className="underline">{source.dataset}</a><span className="block text-xs">{source.vintage} · {source.updated}</span></> : "—"}</td></tr>;
    })}</tbody></table></div>
    {rows.length ? <div className="mt-6 min-w-0"><ResearchTimeSeriesChart interactive containerRole="group" title={`${title} · ${session.from}–${session.to}`} description={t("同一日历月轴；缺失月份断线。图中为现有已发布修订，不含不合格观测。", "Common calendar-month axis; missing months break lines. Existing published revisions only; ineligible observations are excluded.")} xKind="month" xLabel={t("参考月份", "Reference month")} yLabel={indicator ? (en ? indicator.label.split(" / ")[0] : indicator.label) : ""} formatY={number} height={320} series={session.countries.map((country, i) => { const map = new Map(rows.filter(r => r[1] === country).map(r => [r[3], r])); return { id: country, label: name(country), color: colors[i], markers: true, points: months.map(month => { const r = map.get(month), source = r ? payload.sources[r[6]] : undefined; return { x: month, y: r?.[4] ?? null, detail: source ? `${source.dataset} · ${source.unit} · ${source.vintage} · ${source.updated}` : t("无合格观测", "No eligible observation") }; }) }; })} /></div> : <p className="mt-4">{t("所选期间没有合格月度观测。", "No eligible monthly observations in the selected period.")}</p>}
    <details className="mt-5 border-t border-[var(--line)] pt-4"><summary className="cursor-pointer font-semibold">{t("研究细节：定义、来源与限制", "Research details: definitions, sources and limitations")}</summary>
      <p className="mt-3 text-sm">{t("NSA：未季调；SA：季调；SCA：季节及日历调整。HICP不替换为全国CPI；失业率为总年龄、两性合计的劳动力人口百分比。工业生产为 NACE Rev.2 B–D。", "NSA: not seasonally adjusted; SA: seasonally adjusted; SCA: seasonally and calendar adjusted. HICP is not substituted with national CPI. Unemployment covers total age and both sexes as a percentage of the active population. Industrial production covers NACE Rev.2 B–D.")}</p>
      <p className="mt-2 text-sm">{t("Serbia没有现有 Eurostat 月度失业率观测；不使用季度失业率替代。当前修订版不代表历史实时数据版本。跨期方法变化不自动意味着数值连续。", "Serbia has no existing Eurostat monthly unemployment observations; quarterly unemployment is not substituted. Current revisions are not historical real-time vintages. Method changes do not establish numerical continuity.")}</p>
      {warnings.map(w => <p key={w} className="mt-2 text-sm">{en ? w : w.includes("2021") ? "波兰工业生产：2021年从LEU近似转为KAU；保留非阻断方法提示，不声称严格单位不变。" : "匈牙利月度失业率：2023年方法变化，2011–2022年回溯修订；仅限当前修订版，不声称实时版本等价。"}</p>)}
      {[...new Set(rows.map(r => r[6]))].map(index => { const s = payload.sources[index]; return <p key={index} className="mt-3 break-words text-xs"><a className="underline" href={s.url}>{s.dataset}</a> · {s.unit} · {s.adjustment} · {s.vintage} · {s.updated}<br />{s.definition} · {s.classification} · {s.base ?? "—"}</p>; })}
    </details>
  </section>;
}
