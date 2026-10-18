"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { localizedRoute } from "@/i18n/config";
import { workspaceMessages } from "@/content/workspaceMessages";
import type { WorkspacePayload, WorkspaceEvidenceCard } from "@/components/workspaceEvidence";
import { comparisonAllowed, evidenceLink, periodsInRange, workspaceLinks, workspaceToolLink, type WorkspaceSelection } from "@/components/workspaceLinks";
import { NotebookCollect } from "./NotebookCollect";
import { notebookMessages } from "@/content/notebookMessages";
import { PLATFORM_BASE_URL } from "@/lib/releaseMetadata";
import { defaultTradeSession, restoreTradeSession, TRADE_SESSION_PARAMS, tradeMetrics, tradePackRevision, tradeSessionCountries, tradeSessionUrl, tradeSessionYear, tradeCommonYears, tradeEvidenceAvailability, tradeWorkspaceConfiguration, validTradeSelection, type TradePack, type TradeSession } from "@/lib/tradeNetworkPresentation";

export function ResearchWorkspace({ payload, locale }: { payload: WorkspacePayload; locale: Locale }) {
  const m = workspaceMessages[locale];
  const isTrade=payload.id==="trade_external_exposure",en=locale==="en",t=(zh:string,english:string)=>en?english:zh;
  const [trade,setTrade]=useState(()=>defaultTradeSession()),[tradePack,setTradePack]=useState<TradePack|null>(null),[revision,setRevision]=useState(""),[tradeError,setTradeError]=useState(false);
  const [tradeRestored,setTradeRestored]=useState(false);
  const [primary, setPrimary] = useState("hungary");
  const [secondary, setSecondary] = useState("");
  const [from, setFrom] = useState(payload.horizon.from);
  const [to, setTo] = useState(payload.horizon.to);
  const [ready, setReady] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "preparing" | "done" | "error">("idle");
  const session={...trade,from,to},regional=isTrade&&trade.mode==="regional";
  let tradeConfig:WorkspaceSelection["trade"];
  if(regional&&tradePack&&revision)try{tradeConfig=tradeWorkspaceConfiguration(tradePack,session,locale,revision);}catch{/* Invalid configurations remain visible but cannot be saved. */}
  const selection: WorkspaceSelection = { countries: regional?tradeSessionCountries(session):[primary, ...(secondary && secondary !== primary ? [secondary] : [])], from, to, ...(tradeConfig?{trade:tradeConfig}:{}) };
  const validSetup=from<=to&&(!regional||!!tradeConfig);
  const metricLabels:Record<string,string>={partner_hhi:t("伙伴集中度 HHI","Trading-partner HHI"),china_share:t("中国贸易份额","China trade share"),germany_share:t("德国贸易份额","Germany trade share"),top_partner_share:t("最大伙伴份额","Top-partner share"),diversification:t("伙伴多样化（1 − HHI）","Partner diversification (1 − HHI)"),weighted_trade_volume:t("名义贸易额（当年美元）","Nominal trade volume (current USD)"),partner_count:t("有效伙伴数量","Eligible partner count")};
  useEffect(()=>{if(!isTrade)return;const controller=new AbortController();fetch(`${process.env.NEXT_PUBLIC_BASE_PATH??""}/research-data/network_ui_pack.json`,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(async(p:TradePack)=>{if(!Array.isArray(p.records))throw Error();const hash=await tradePackRevision(p);if(!controller.signal.aborted){setTradePack(p);setRevision(hash);}}).catch(()=>{if(!controller.signal.aborted)setTradeError(true);});return()=>controller.abort();},[isTrade]);
  const years = payload.cards.flatMap(card => card.coverage.flatMap(row => row.periods)).map(period => Number(period.slice(0, 4))).filter(Number.isFinite);
  const minYear = Math.min(...years, payload.horizon.from);
  const maxYear = Math.max(...years, ...payload.events.map(event => Number(event.date.slice(0, 4))), payload.horizon.to);
  const options = [...new Set([...Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index),...(regional?[from,to]:[])])].sort((a,b)=>a-b);
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      const requested = [...new Set((params.get("countries") ?? params.get("country") ?? "hungary").split(","))].filter(id => payload.countries.some(country => country.id === id)).slice(0, 2);
      setPrimary(requested[0] ?? "hungary"); setSecondary(requested[1] ?? "");
      const year = (key: string, fallback: number) => /^\d{4}$/.test(params.get(key) ?? "") && Number(params.get(key)) >= minYear && Number(params.get(key)) <= maxYear ? Number(params.get(key)) : fallback;
      setFrom(year("from", payload.horizon.from)); setTo(year("to", payload.horizon.to)); setReady(true);
      if(isTrade&&tradePack){const restored=restoreTradeSession(tradePack,params,requested[0]??"hungary");setTrade(restored);setTradeRestored(true);if(restored.mode==="regional"){setFrom(restored.from??year("from",payload.horizon.from));setTo(restored.to??year("to",payload.horizon.to));}}
    };
    const timer = window.setTimeout(read, 0); window.addEventListener("popstate", read);
    return () => { window.clearTimeout(timer); window.removeEventListener("popstate", read); };
  }, [payload, minYear, maxYear,isTrade,tradePack]);
  useEffect(() => {
    if (!ready||(isTrade&&(!tradePack||!tradeRestored))) return;
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ countries: [primary, ...(secondary && secondary !== primary ? [secondary] : [])].join(","), from: String(from), to: String(to) }).toString();
    if(regional&&tradePack){const params=new URL(tradeSessionUrl(tradePack,{...trade,from,to},locale,trade.expectedPack||revision)).searchParams;for(const key of ["country",...TRADE_SESSION_PARAMS]){const value=params.get(key);if(value!==null)url.searchParams.set(key,value);}}
    window.history.replaceState(null, "", url);
  }, [ready, primary, secondary, from, to,isTrade,tradePack,trade,regional,revision,locale,tradeRestored]);
  const validRange = from <= to;
  const links = workspaceLinks(payload, selection, locale);
  const visibleEvents = payload.events.filter(event => selection.countries.includes(event.country) && Number(event.date.slice(0, 4)) >= from && Number(event.date.slice(0, 4)) <= to);
  const countryName = (id: string) => payload.countries.find(country => country.id === id)?.name ?? id;
  const periodLabel = (periods: string[]) => periods.length ? `${periods[0]}–${periods.at(-1)}` : "—";
  const labelForCard = (card: WorkspaceEvidenceCard) => card.layer === "regional_history" || card.layer === "serbia_nstj_archive" ? m.historicalLink : card.kind === "map" ? m.mapLink : m.dataLink;
  function evidenceCards(kind: "data" | "map") {
    return payload.cards.filter(card => (kind === "map" ? card.kind === "map" : card.kind !== "map") && (card.layer !== "serbia_nstj_archive" || selection.countries.includes("serbia"))).map(card => {
      const rows = card.coverage.filter(row => selection.countries.includes(row.country));
      const hasEvidence = rows.some(row => periodsInRange(row.periods, selection).length);
      const incomplete = card.coverage.filter(row=>!regional||selection.countries.includes(row.country)).filter(row => {
        const periods = periodsInRange(row.periods, selection);
        const expected = card.kind === "high_frequency" || card.kind === "macro_drivers" || card.kind === "sors" ? (to - from + 1) * 12 : to - from + 1;
        return periods.length < expected;
      }).map(row => countryName(row.country));
      return <article key={card.id} className="card p-5" data-workspace-evidence={card.id}>
        <h3 className="text-lg font-semibold">{card.title}</h3><p className="mt-2 font-mono text-xs text-[var(--muted)]">{card.targetId} · {card.layer}</p>
        {!hasEvidence ? <p className="mt-3 text-sm">{m.empty}</p> : null}
        {rows.map(row => {
          const periods = periodsInRange(row.periods, selection);
          return <div key={row.country} className="mt-3 border-t border-[var(--line)] pt-3 text-sm leading-6">
            <p><strong>{countryName(row.country)}</strong> · {m.coverage}: <span className="metric-number">{periodLabel(row.periods)}</span></p>
            <p>{m.latest}: <span className="metric-number">{row.periods.at(-1) ?? "—"}</span> · {m.periodCount}: <span className="metric-number">{periods.length}</span></p>
            <p>{m.from} / {m.to}: <span className="metric-number">{periodLabel(periods)}</span></p>
            {periods.length ? <><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{row.sources.filter(s => periodsInRange(s.periods ?? row.periods, selection).length).map(s => <a key={s.url + s.layer + s.name} href={s.url} className="text-[var(--accent)]"><span data-original-language="zh-CN" lang="zh-CN">{s.name}</span></a>)}</div><Link className="mt-3 inline-flex font-semibold text-[var(--accent)]" href={evidenceLink(card, row.country, selection, locale)}>{labelForCard(card)} · {countryName(row.country)}</Link></> : null}
          </div>;
        })}
        {selection.countries.length>1 && !comparisonAllowed(card, selection) ? <p className="mt-3 text-sm" data-comparison-unavailable>{m.comparisonUnavailable}</p> : null}
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{m.gaps}: {incomplete.join(", ") || "—"}</p>
      </article>;
    });
  }
  async function download() {
    if(!validSetup)return;
    setExportStatus("preparing");
    try {
      const [{ buildWorkspaceSnapshot }, { buildZip }] = await Promise.all([import("@/lib/workspaceSnapshot"), import("@/lib/clientZip")]);
      const snapshot = buildWorkspaceSnapshot(payload, selection, locale);
      const url = URL.createObjectURL(new Blob([buildZip(snapshot.files, snapshot.generatedAt)], { type: "application/zip" }));
      const a = document.createElement("a"); a.href = url; a.download = snapshot.filename; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); setExportStatus("done");
    } catch { setExportStatus("error"); }
  }
  return <main className="page-shell" data-research-workspace={payload.id}>
    <div className="mb-4"><NotebookCollect disabled={!ready || !validSetup} label={notebookMessages[locale].addWorkspace} create={async () => {
      const { researchWorkspaces } = await import("@/content/researchWorkspaces"); const definition = researchWorkspaces.find(w => w.id === payload.id)!; const savedWarnings=(language:Locale)=>[...definition.warnings.map(w=>w[language]),...(tradeConfig&&tradePack?tradeWorkspaceConfiguration(tradePack,session,language,revision).limitations:[])];
      const visible = payload.cards.filter(card => card.coverage.some(row => selection.countries.includes(row.country) && periodsInRange(row.periods,selection).length));
      const sources = visible.flatMap(card => card.coverage.filter(row => selection.countries.includes(row.country)).flatMap(row => row.sources.filter(s => periodsInRange(s.periods ?? row.periods,selection).length).map(s => ({ institution: "", dataset: s.name, url: s.url, layer: s.layer }))));
      return { type: "workspace", title: payload.title, labels: definition.title, url: new URL(window.location.pathname + window.location.search + window.location.hash, PLATFORM_BASE_URL).href, canonical_ids: [payload.id, ...new Set(visible.map(c => c.targetId))], countries: selection.countries, periods: [String(from),String(to)], sources: [...new Map(sources.map(s => [JSON.stringify(s),s])).values(),...(tradeConfig?[{institution:"UN Comtrade",dataset:"TOTAL bilateral goods trade; eligible-partner network indicators",url:"https://comtradeplus.un.org/",layer:"descriptive_trade_network"}]:[])], layer: "workspace_setup", comparability: "setup_only_no_combined_dataset", warnings: savedWarnings("zh-CN"), warning_labels: { "zh-CN": savedWarnings("zh-CN"), en: savedWarnings("en") }, metadata: { filters: { countries: selection.countries, from, to, ...(tradeConfig?{trade_flow:tradeConfig.flow,trade_metric:tradeConfig.metric,trade_year_selection:tradeConfig.year_selection,trade_year_mode:tradeConfig.reference_year_mode,trade_reference_year:tradeConfig.reference_year??"none",trade_research_url:tradeConfig.research_url,trade_pack:tradeConfig.pack_revision,common_eligible_years:tradeConfig.common_eligible_years.map(String),trade_pack_generated_at:tradeConfig.pack_generated_at}:{}) }, ...(tradeConfig?{coverage:tradeConfig.availability.map(row=>row.length>950?row.slice(0,900)+" … (abbreviated; full availability at research URL)":row),status:"regional_trade_configuration_not_conclusion",reference:tradeConfig.limitations.join(" ")} :{}), evidence_categories: [...new Set(visible.map(c => c.layer))] } };
    }} /></div>
    <Link href={localizedRoute("/workspaces/", locale)} className="text-sm text-[var(--accent)]">← {m.all}</Link>
    <header className="mt-5 max-w-4xl border-b border-[var(--line)] pb-7"><p className="editorial-kicker">{m.title}</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{payload.title}</h1><p className="mt-5 leading-8 text-[var(--muted)]">{payload.introduction}</p></header>
    <section className="card mt-7 p-5" aria-labelledby="workspace-controls"><h2 id="workspace-controls" className="text-xl font-semibold">{m.select}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {!regional?<><label className="text-sm font-semibold">{m.countries}<select className="field-control mt-2 w-full" value={primary} onChange={e => { setPrimary(e.target.value); if (e.target.value === secondary) setSecondary(""); }}>{payload.countries.map(country => <option key={country.id} value={country.id}>{country.name}</option>)}</select></label>
      <label className="text-sm font-semibold">{m.secondary}<select className="field-control mt-2 w-full" value={secondary} onChange={e => setSecondary(e.target.value)}><option value="">{m.none}</option>{payload.countries.filter(country => country.id !== primary).map(country => <option key={country.id} value={country.id}>{country.name}</option>)}</select></label></>:null}
      <label className="text-sm font-semibold">{m.from}<select className="field-control mt-2 w-full" value={from} onChange={e => {setFrom(Number(e.target.value));if(regional)setTrade(s=>({...s,issues:s.issues.filter(i=>i!=="range")}));}}>{options.map(year => <option key={year}>{year}</option>)}</select></label>
      <label className="text-sm font-semibold">{m.to}<select className="field-control mt-2 w-full" value={to} onChange={e => {setTo(Number(e.target.value));if(regional)setTrade(s=>({...s,issues:s.issues.filter(i=>i!=="range")}));}}>{options.map(year => <option key={year}>{year}</option>)}</select></label>
    </div><p className="mt-4 text-sm leading-6 text-[var(--muted)]">{m.periodNote}</p>{!validRange ? <p role="alert" className="mt-3">{m.rangeError}</p> : null}</section>
    {isTrade?<section className="card mt-7 min-w-0 p-5" aria-labelledby="workspace-trade-title" data-workspace-trade>
      <h2 id="workspace-trade-title" className="text-xl font-semibold">{t("区域贸易研究配置","Regional trade research configuration")}</h2>
      <label className="mt-4 block">{t("贸易研究模式","Trade research mode")}<select className="field-control mt-2" disabled={!tradeRestored} value={trade.mode} onChange={e=>setTrade(s=>({...s,mode:e.target.value as TradeSession["mode"],country:primary,regional:s.regional.length?s.regional:[primary,...(secondary?[secondary]:[])],issues:[]}))}><option value="standard">{t("保留单国／双国工作区","Single / two-country workspace")}</option><option value="regional">{t("区域研究（3–5国）","Regional research (3–5 countries)")}</option></select></label>
      {!tradePack?<p role="status" className="mt-3">{tradeError?t("贸易数据包加载失败；原有年度经济工作区仍可使用。请刷新后重试区域配置。","Trade pack failed to load; the existing annual-economic workspace remains available. Refresh to retry regional configuration."):t("正在读取已发布贸易数据包…","Loading the published trade pack…")}</p>:null}
      {regional&&tradePack?<>
        <fieldset className="mt-4 rounded-lg border border-[var(--line)] p-3"><legend>{t("区域国家（选择3–5国）","Regional countries (select 3–5)")}</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{payload.countries.filter(c=>tradePack.records.some(g=>g.reporter===c.id)).map(c=><label className="flex items-center gap-2" key={c.id}><input type="checkbox" checked={trade.regional.includes(c.id)} disabled={!trade.regional.includes(c.id)&&trade.regional.length>=5} onChange={e=>setTrade(s=>({...s,regional:e.target.checked?[...s.regional,c.id]:s.regional.filter(id=>id!==c.id),issues:[]}))}/>{c.name}</label>)}</div></fieldset>
        <p className="mt-2 text-sm" role="status">{trade.regional.length}/5 · {validTradeSelection(tradePack,session)?t("选择顺序不代表排名。","Selection order is not a ranking."):t("须选择3至5个国家，才能打开、收藏或导出区域配置。","Select 3–5 countries to open, collect or export a regional configuration.")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label>{t("贸易流向","Trade flow")}<select className="field-control mt-2" value={trade.flow} onChange={e=>setTrade(s=>({...s,flow:e.target.value as TradeSession["flow"],issues:[]}))}><option value="imports">{t("进口","Imports")}</option><option value="exports">{t("出口","Exports")}</option></select></label>
          <label>{t("贸易网络指标","Trade-network indicator")}<select className="field-control mt-2" value={trade.metric} onChange={e=>setTrade(s=>({...s,metric:e.target.value as TradeSession["metric"],issues:[]}))}>{tradeMetrics.map(metric=><option key={metric} value={metric}>{metricLabels[metric]}</option>)}</select></label>
          <label>{t("参照年份选择","Reference-year selection")}<select className="field-control mt-2" value={trade.yearMode==="fixed"?"explicit":trade.yearSelection} onChange={e=>setTrade(s=>({...s,yearMode:e.target.value==="explicit"?"fixed":"auto",year:e.target.value==="explicit"?(tradeSessionYear(tradePack,session)??to):null,yearSelection:e.target.value==="common"?"common":"latest",issues:[]}))}><option value="latest">{t("最新有效年（可部分覆盖）","Latest eligible (partial coverage possible)")}</option><option value="common">{t("期间内最新共同有效年","Latest common eligible year in period")}</option><option value="explicit">{t("手动指定年份，不自动替换","Explicit year, no substitution")}</option></select></label>
          {trade.yearMode==="fixed"?<label>{t("手动参照年份","Explicit reference year")}<select className="field-control mt-2" value={trade.year??to} onChange={e=>setTrade(s=>({...s,year:Number(e.target.value),issues:[]}))}>{[...new Set([...options,...(trade.year===null?[]:[trade.year])])].sort((a,b)=>a-b).map(y=><option key={y}>{y}</option>)}</select></label>:null}
        </div>
        <div className="mt-4 space-y-2 text-sm" data-workspace-trade-availability><p>{trade.regional.map(countryName).join(" / ")} · {metricLabels[trade.metric]} · {from}–{to} · {t("参照年","Reference year")}: {tradeSessionYear(tradePack,session)??"—"}</p>
          <p>{t("共同有效年份","Common eligible years")}: {tradeCommonYears(tradePack,session).join(", ")||"—"}</p>
          {!tradeCommonYears(tradePack,session).length?<p role="status">{t("没有共同有效年份，不构成完整比较。可改用部分覆盖或手动年份；缺失值不补零。","No common eligible year; no complete comparison is established. Partial coverage and explicit years remain available; missing values are not zero-filled.")}</p>:null}
          {tradeEvidenceAvailability(tradePack,session).map(row=><p key={row.country}>{countryName(row.country)} · {t("有效年份","Eligible years")}: {row.eligible.join(", ")||"—"} · {t("缺失／排除","Missing / excluded")}: {row.excluded.map(x=>`${x.year} (${({absent:t("缺少记录","absent"),coverage_failed:t("覆盖不合格","coverage failed"),metric_missing:t("指标缺失／不适用","metric missing / N/A"),definition:t("定义不匹配","definition mismatch")})[x.reason]??t("未通过验证","not eligible")})`).join(", ")||"—"}</p>)}
          {trade.issues.length?<p role="status">{t("链接中有无效配置，请修正国家、指标、流向与年份后再保存。","The link contains invalid configuration. Correct countries, metric, flow and years before saving.")}</p>:null}
          {trade.expectedPack&&trade.expectedPack!==revision?<p role="status">{t("数据包与保存时不同，已使用当前记录重新验证。","The pack differs from the saved revision; current records have been revalidated.")}</p>:null}
        </div>
        {tradeConfig?<Link className="mt-4 inline-flex rounded-full border border-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent)]" href={new URL(tradeConfig.research_url).pathname+new URL(tradeConfig.research_url).search} data-workspace-trade-open>{t("在区域贸易研究中比较","Compare in Regional Trade Research")}</Link>:null}
        <p className="mt-4 text-sm">{t("下方年度经济指标与UN Comtrade双边货物贸易分别保留，不与Eurostat货物及服务总额合成为一个观测。贸易份额以有效伙伴合计为分母，不代表整体经济依赖。链接重开当前数据，不冻结历史修订。","Annual economic indicators below remain separate from UN Comtrade bilateral goods trade and are not combined with Eurostat goods-and-services totals. Trade shares use eligible-partner totals, not overall economic dependence. Links reopen current data, not frozen revisions.")}</p>
      </>:null}
    </section>:null}
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.questions}</h2><p className="mt-3 leading-7">{payload.introduction}</p><ul className="mt-3 list-disc space-y-2 pl-5">{payload.questions.map(q => <li key={q}>{q}</li>)}</ul></section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.data}</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{payload.coverageNote}</p><div className="mt-5 grid gap-4 md:grid-cols-2">{validRange ? evidenceCards("data") : null}</div></section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.patterns}</h2><p className="mt-3 leading-7">{payload.comparisonDimensions}</p><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{m.comparisonNote}</p></section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.events}</h2><p className="mt-3 text-xs text-[var(--muted)]">{m.original}</p><div className="mt-4 grid gap-4 md:grid-cols-2">{visibleEvents.slice(0, 8).map(event => <article key={event.id} className="card p-4"><p className="text-xs">{event.date} · {countryName(event.country)} · {event.type} · {event.language}</p><div lang="zh-CN" data-original-language="zh-CN" className="mt-3"><h3 className="font-semibold">{event.title}</h3></div><a className="mt-3 inline-flex text-sm text-[var(--accent)]" href={event.source.url}>{m.source}: <span lang="zh-CN" data-original-language="zh-CN">{event.source.name}</span></a><Link className="mt-3 block text-sm font-semibold text-[var(--accent)]" href={workspaceToolLink("/news/", locale, { country: event.country, type: event.type, from: `${from}-01-01`, to: `${to}-12-31` }) + `#${event.id}`}>{m.eventLink}</Link></article>)}</div>{!visibleEvents.length ? <p className="mt-3 text-sm">{m.empty}</p> : null}</section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.regions}</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{m.history} {m.projectNote}</p><div className="mt-5 grid gap-4 md:grid-cols-2">{validRange ? evidenceCards("map") : null}</div></section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.methods}</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{payload.methods.map(method => <article key={method.id} className="card p-5" data-workspace-method={method.id} data-method-state={method.state}><h3 className="text-lg font-semibold">{method.name}</h3><p className="mt-2 font-mono text-xs">{m[method.state]}</p><p className="mt-3 text-sm leading-7">{method.reason}</p><h4 className="mt-3 text-sm font-semibold">{m.limitation}</h4><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">{method.limitations.map(note => <li key={note}>{note}</li>)}</ul>{method.state === "active" ? <Link href={links.models.find(link => link.skill === method.id)!.url} className="mt-4 inline-flex font-semibold text-[var(--accent)]">{m.modelLink}</Link> : null}</article>)}</div>{!payload.methods.length ? <p className="mt-3 text-sm">{m.noMethod}</p> : null}</section>
    <section className="card mt-8 p-6"><h2 className="text-2xl font-semibold">{m.boundaries}</h2><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7">{payload.warnings.map(w => <li key={w}>{w}</li>)}</ul></section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.continue}</h2><div className="mt-4 flex flex-wrap gap-4">{[["/data/", m.dataLink], ["/map/", m.mapLink], ["/models/", m.modelLink], ["/news/", m.eventLink]].map(([path, text]) => <Link key={path} className="text-[var(--accent)]" href={path === "/data/" ? links.data[0]?.url ?? localizedRoute(path, locale) : path === "/map/" ? links.map.find(link => !link.url.startsWith("/research-data/"))?.url ?? localizedRoute(path, locale) : path === "/models/" ? links.models[0]?.url ?? localizedRoute(path, locale) : links.events[0]?.url ?? localizedRoute(path, locale)}>{text}</Link>)}</div></section>
    <section className="editorial-section mt-8"><h2 className="text-2xl font-semibold">{m.export}</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted)]">{m.exportNote}</p><button type="button" onClick={() => void download()} disabled={!ready || !validSetup || exportStatus === "preparing"} className="mt-4 rounded-full border border-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--accent)] disabled:opacity-50">{m.snapshot}</button><span role="status" className="ml-3 text-sm">{exportStatus === "idle" ? "" : m[exportStatus]}</span></section>
  </main>;
}
