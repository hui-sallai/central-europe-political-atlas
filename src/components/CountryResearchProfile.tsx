"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkline } from "@/components/ResearchCharts";
import type { Country as UiCountry } from "@/lib/data";
import type { Event, ModelOutput, Observation, Project } from "@/types/researchData";

type CountryTab = "overview" | "economy" | "politics" | "external" | "models";

const tabs: Array<{ id: CountryTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "economy", label: "Economy" },
  { id: "politics", label: "Politics" },
  { id: "external", label: "External & China" },
  { id: "models", label: "Models" },
];

const indicatorLabels: Record<string, string> = {
  gdp_current_eur: "GDP",
  gdp_per_capita_eur: "人均 GDP",
  real_gdp_growth: "GDP 实际增长",
  hicp_inflation: "HICP 通胀",
  unemployment_rate: "失业率",
  government_debt_gdp: "政府债务 / GDP",
  fiscal_balance_gdp: "财政余额 / GDP",
  exports_goods_services: "出口",
  imports_goods_services: "进口",
  current_account_gdp: "经常账户 / GDP",
  fdi_inflow: "FDI 流入",
  energy_import_dependency: "能源进口依赖",
  manufacturing_share_gdp: "制造业占 GDP",
  automotive_export_share: "汽车出口占比",
};

const overviewIndicatorIds = ["gdp_current_eur", "gdp_per_capita_eur", "real_gdp_growth", "hicp_inflation", "unemployment_rate", "government_debt_gdp"];

function formatValue(value: number | null, unit: string) {
  if (value === null) return "待接入";
  return `${value.toLocaleString("zh-CN", { maximumFractionDigits: unit.includes("欧元") ? 0 : 1 })} ${unit}`.trim();
}

function latestByIndicator(observations: Observation[], indicatorId: string) {
  return observations.filter((item) => item.indicator === indicatorId && item.value !== null).sort((a, b) => b.year - a.year)[0];
}

function ModelSnapshot({ output }: { output: ModelOutput }) {
  return (
    <article className="border-t border-[var(--line)] py-4 first:border-t-0">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{output.model_id.replaceAll("_", " ")}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{output.availability} · completeness {output.data_completeness}%</p>
        </div>
        <p className="metric-number text-2xl font-semibold text-[var(--accent)]">{output.score === null ? "—" : output.score.toFixed(1)}</p>
      </div>
    </article>
  );
}

export function CountryResearchProfile({
  country,
  observations,
  events,
  projects,
  modelOutputs,
  regionalMapAvailable,
}: {
  country: UiCountry;
  observations: Observation[];
  events: Event[];
  projects: Project[];
  modelOutputs: ModelOutput[];
  regionalMapAvailable: boolean;
}) {
  const [activeTab, setActiveTab] = useState<CountryTab>("overview");
  const latestIndicators = overviewIndicatorIds.map((indicatorId) => ({
    indicatorId,
    latest: latestByIndicator(observations, indicatorId),
    series: observations.filter((item) => item.indicator === indicatorId).sort((a, b) => a.year - b.year),
  }));
  const economyIndicators = [...new Set(observations.map((item) => item.indicator))].filter((indicatorId) => indicatorLabels[indicatorId]);

  return (
    <section className="mt-8">
      <div className="research-tabs" role="tablist" aria-label={`${country.nameZh}研究页面`}>
        {tabs.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className="research-tab" onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="mt-7 grid gap-8 xl:grid-cols-[1.4fr_0.6fr]">
          <div>
            <div className="grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
              {latestIndicators.map(({ indicatorId, latest, series }) => (
                <article key={indicatorId} className="bg-[var(--surface)] p-4">
                  <p className="text-xs font-semibold text-[var(--muted)]">{indicatorLabels[indicatorId]}</p>
                  <p className="metric-number mt-2 text-xl font-semibold">{latest ? formatValue(latest.value, latest.unit) : "待接入"}</p>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">{latest?.year ?? "—"} · {latest?.source_name ?? "来源待接入"}</p>
                  <div className="mt-3"><Sparkline label={`${indicatorLabels[indicatorId]}趋势`} values={series.map((item) => ({ label: String(item.year), value: item.value }))} /></div>
                </article>
              ))}
            </div>
            <section className="editorial-section mt-7">
              <div className="flex items-end justify-between gap-4"><div><p className="editorial-kicker">Recent Events</p><h2 className="mt-2 text-2xl font-semibold">近期事件</h2></div><Link href={`/news?country=${country.slug}`} className="text-sm font-semibold text-[var(--accent)]">查看全部</Link></div>
              <div className="mt-4 divide-y divide-[var(--line)]">
                {events.slice(0, 4).map((event) => <article key={event.id} className="grid gap-2 py-4 sm:grid-cols-[110px_1fr]"><p className="metric-number text-xs text-[var(--muted)]">{event.date}</p><div><h3 className="font-semibold">{event.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{event.summary}</p></div></article>)}
              </div>
            </section>
          </div>
          <aside>
            <p className="editorial-kicker">Research Snapshot</p>
            <dl className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
              {[
                ["区域地图", regionalMapAvailable ? "可用" : "待接入"],
                ["模型结果", `${modelOutputs.filter((item) => item.score !== null).length} 可用`],
                ["近期事件", `${events.length} 条`],
                ["对华项目", `${projects.length} 项`],
                ["欧盟成员", country.euMember ? "是" : "否"],
                ["货币", country.currency],
              ].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3"><dt className="text-[var(--muted)]">{label}</dt><dd className="font-semibold">{value}</dd></div>)}
            </dl>
            <div className="mt-6"><p className="editorial-kicker">Model Snapshot</p><div className="mt-3">{modelOutputs.map((output) => <ModelSnapshot key={output.model_id} output={output} />)}</div><Link href={`/models?country=${country.slug}`} className="mt-3 inline-flex text-sm font-semibold text-[var(--accent)]">进入 Analysis Workbench</Link></div>
          </aside>
        </div>
      ) : null}

      {activeTab === "economy" ? (
        <div className="mt-7 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {economyIndicators.map((indicatorId) => {
            const series = observations.filter((item) => item.indicator === indicatorId).sort((a, b) => a.year - b.year);
            const latest = series.filter((item) => item.value !== null).at(-1);
            return <article key={indicatorId} className="grid gap-3 py-4 sm:grid-cols-[minmax(150px,0.6fr)_minmax(150px,0.55fr)_minmax(180px,1fr)_auto] sm:items-center"><div><p className="text-sm font-semibold">{indicatorLabels[indicatorId]}</p><p className="mt-1 text-xs text-[var(--muted)]">latest {latest?.year ?? "—"}</p></div><p className="metric-number text-xl font-semibold text-[var(--accent)]">{latest ? formatValue(latest.value, latest.unit) : "待接入"}</p><Sparkline label={`${indicatorLabels[indicatorId]}时间序列`} values={series.map((item) => ({ label: String(item.year), value: item.value }))} /><details className="advanced-disclosure sm:min-w-36"><summary>来源与记录</summary><div className="mt-3 grid gap-2 text-xs text-[var(--muted)]">{series.map((item) => <p key={item.id}>{item.year}: {formatValue(item.value, item.unit)} · {item.source_name}</p>)}</div></details></article>;
          })}
        </div>
      ) : null}

      {activeTab === "politics" ? (
        <div className="mt-7 grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <section><p className="editorial-kicker">Government</p><dl className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">{[["政体", country.polityZh], ["议会", country.parliamentZh], ["政府首脑", country.headOfGovernmentZh], ["国家元首", country.headOfStateZh], ["执政结构", country.governmentZh]].map(([label, value]) => <div key={label} className="py-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl><p className="mt-4 text-xs leading-5 text-[var(--warning)]">政治人物和执政结构按现有来源状态展示；待核验内容不进入模型。</p></section>
          <section><p className="editorial-kicker">Parties</p><div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">{country.parties.map((party) => <article key={`${party.shortName}-${party.nameZh}`} className="grid gap-2 py-4 sm:grid-cols-[120px_1fr_auto]"><p className="font-semibold">{party.nameZh}</p><p className="text-sm text-[var(--muted)]">{party.familyZh}</p><p className="text-xs font-semibold text-[var(--muted)]">{party.role === "governing" ? "执政" : party.role === "support" ? "支持" : "在野 / 待核验"}</p></article>)}</div><div className="mt-6"><p className="editorial-kicker">Political Events</p><div className="mt-3 grid gap-3">{events.filter((event) => event.event_type === "election" || event.topic === "政治").slice(0, 5).map((event) => <Link key={event.id} href={`/news?country=${country.slug}#${event.id}`} className="border-l-2 border-[var(--accent)] pl-4"><p className="text-xs text-[var(--muted)]">{event.date}</p><p className="mt-1 text-sm font-semibold">{event.title}</p></Link>)}</div></div></section>
        </div>
      ) : null}

      {activeTab === "external" ? (
        <div className="mt-7 grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <section><p className="editorial-kicker">External Position</p><dl className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">{[["欧盟", country.euMember ? "成员" : "非成员"], ["北约", country.natoMember ? "成员" : "非成员"], ["对德与外部依赖", "见 Economy 与 Analysis 中的外部指标"], ["对华经贸", country.chinaTradeNote]].map(([label, value]) => <div key={label} className="py-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 leading-6">{value}</dd></div>)}</dl></section>
          <section><div className="flex items-end justify-between gap-4"><div><p className="editorial-kicker">China-related Projects</p><h2 className="mt-2 text-2xl font-semibold">项目证据</h2></div><Link href={`/data?country=${country.slug}`} className="text-sm font-semibold text-[var(--accent)]">打开数据浏览</Link></div><div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">{projects.length ? projects.map((project) => <article key={project.id} className="py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{project.name}</h3><p className="mt-1 text-xs text-[var(--muted)]">{project.city} · {project.sector}</p></div><span className="text-xs font-semibold text-[var(--warning)]">{project.verification_status}</span></div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{project.verification_note}</p><a href={project.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-[var(--accent)]">{project.source_name} · {project.source_reliability} 级</a></article>) : <p className="py-6 text-sm text-[var(--muted)]">当前没有已登记项目。</p>}</div></section>
        </div>
      ) : null}

      {activeTab === "models" ? (
        <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_0.65fr]">
          <section><p className="editorial-kicker">Composite Indicators</p><div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">{modelOutputs.map((output) => <ModelSnapshot key={output.model_id} output={output} />)}</div></section>
          <aside className="editorial-panel p-5"><p className="editorial-kicker">Future Skills</p><h2 className="mt-3 text-2xl font-semibold">统一分析入口</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">Panel、VAR、Event Study、Network 与 Bayesian 接口已登记，但 v1.1 不运行统计估计。</p><Link href={`/models?country=${country.slug}`} className="mt-5 inline-flex rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">进入 Analysis Workbench</Link></aside>
        </div>
      ) : null}
    </section>
  );
}
