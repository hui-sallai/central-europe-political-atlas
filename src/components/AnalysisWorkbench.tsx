"use client";
import { LocalizedContent } from "@/i18n/LocalizedContent";
import { useLocale } from "@/i18n/LocaleProvider";
import { analysisNames } from "@/i18n/presentation";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { EcbIdentificationStatus } from "@/components/EcbIdentificationStatus";
import { analysisCategoryLabels, runtimeAnalysisSkills, resolveAnalysisRoute, methodStateLabels } from "@/lib/analysisSkills";
import { AnalysisSkillCard } from "@/components/AnalysisSkillCard";
import { statusLabels } from "@/lib/uiLabels";
import type { Country } from "@/types/Country";
import type { Event } from "@/types/Event";
import type { AnalysisSkillCategory } from "@/types/AnalysisSkill";
import type { ModelCard, ModelId, ModelOutput } from "@/types/ModelOutput";
import { TRADE_SESSION_PARAMS } from "@/lib/tradeNetworkPresentation";
import {TransparentModelResearchWorkbench} from "@/components/TransparentModelResearchWorkbench";
import {MODEL_RESEARCH_PARAMS} from "@/lib/transparentModelResearch";
import { HouseholdPressureWorkbench } from "@/components/HouseholdPressureWorkbench";

const categories = Object.keys(analysisCategoryLabels) as AnalysisSkillCategory[];
const PanelLocalProjectionWorkbench = dynamic(() => import("@/components/PanelLocalProjectionWorkbench").then(module => module.PanelLocalProjectionWorkbench));

const PanelEconometricsWorkbench = dynamic(() => import("@/components/PanelEconometricsWorkbench").then((module) => module.PanelEconometricsWorkbench), {
  loading: () => <p className="mt-6 border-y border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">正在加载面板工作区…</p>,
});
const TradeNetworkWorkbench = dynamic(() => import("@/components/TradeNetworkWorkbench").then((module) => module.TradeNetworkWorkbench), {
  loading: () => <p className="mt-6 border-y border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">正在加载贸易网络工作区…</p>,
});
const EventWindowWorkbench = dynamic(() => import("@/components/EventWindowWorkbench").then((module) => module.EventWindowWorkbench), {
  loading: () => <p className="mt-6 border-y border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">正在加载事件窗口工作区…</p>,
});
const VarWorkbench = dynamic(() => import("@/components/VarWorkbench").then((module) => module.VarWorkbench), {
  loading: () => <p className="mt-6 border-y border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">正在加载宏观时间序列工作区…</p>,
});
const MacroDriverWorkbench = dynamic(() => import("@/components/MacroDriverWorkbench").then((module) => module.MacroDriverWorkbench), {
  loading: () => <p className="mt-6 border-y border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">正在加载宏观驱动工作台…</p>,
});
const LocalProjectionWorkbench = dynamic(() => import("@/components/LocalProjectionWorkbench").then((module) => module.LocalProjectionWorkbench), {
  loading: () => <p className="mt-6 border-y border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">正在加载本地投影工作区…</p>,
});

type WorkbenchProps = { countries: Country[]; cards: ModelCard[]; outputs: ModelOutput[]; events: Event[] };
export function AnalysisWorkbench(props: WorkbenchProps) {
  const query = useSearchParams();
  const routeKey=new URLSearchParams(query.toString());
  // Trade-owned filters must not remount the workbench on each native-history update.
  // Method/tab routing and every other method retain their existing remount behaviour.
  if(routeKey.get("skill")==="network_dependency"){
    for(const key of ["country",...TRADE_SESSION_PARAMS])routeKey.delete(key);
    if(routeKey.get("tab")!=="compare")routeKey.set("tab","run");
    routeKey.sort();
  }
  return <LocalizedContent>{<AnalysisWorkbenchContent key={routeKey.toString()} {...props} />}</LocalizedContent>;
}
function AnalysisWorkbenchContent({ countries, cards, events }: WorkbenchProps) {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const requestedSkill = searchParams.get("skill");
  const route = resolveAnalysisRoute(requestedSkill, searchParams.get("country"), countries.map((c) => c.slug));
  const [selectedSkillId, setSelectedSkillId] = useState(route.skill?.skill_id ?? "composite_indicators");
  const selectedSkill = runtimeAnalysisSkills.find((s) => s.skill_id === selectedSkillId)!;
  const category = selectedSkill.category;
  const setCategory = (next: AnalysisSkillCategory) => setSelectedSkillId(runtimeAnalysisSkills.find((s) => s.category === next)!.skill_id);
  const [modelId, setModelId] = useState<ModelId>(cards.find(card => card.model_id === searchParams.get("model"))?.model_id ?? cards[0]?.model_id ?? "household_economic_pressure");
  const skills = runtimeAnalysisSkills.filter((skill) => skill.category === category);
  function selectModel(id:ModelId){
    setModelId(id);const u=new URL(window.location.href);u.searchParams.set("model",id);
    for(const key of MODEL_RESEARCH_PARAMS)u.searchParams.delete(key);
    window.history.replaceState(null,"",u.pathname+u.search+u.hash);
  }

  return <LocalizedContent>{(
    <section className="mt-8">
      {route.notices.map((notice) => <p key={notice} role="status" className="my-4 text-sm">{notice}</p>)}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">{(["active", "registry_only", "blocked"] as const).map((state) => <button key={state} onClick={() => setSelectedSkillId(runtimeAnalysisSkills.find((s) => s.state === state)!.skill_id)}>{methodStateLabels[state]} {runtimeAnalysisSkills.filter((s) => s.state === state).length}</button>)}</div>
      <div className="research-tabs" role="tablist" aria-label="分析方法类别">
        {categories.map((item) => <button key={item} type="button" role="tab" className="research-tab" aria-selected={category === item} onClick={() => { setCategory(item); }}>{analysisCategoryLabels[item]}</button>)}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">{skills.map((skill) => <button key={skill.skill_id} className="research-tab" aria-pressed={skill.skill_id === selectedSkillId} onClick={() => setSelectedSkillId(skill.skill_id)}>{locale === "en" ? analysisNames[skill.skill_id] : skill.name}</button>)}</div>
      <AnalysisSkillCard skill={selectedSkill} />
      {selectedSkill.state !== "active" ? null : category === "composite_indicators" ? (
        <div className="mt-6"><label>{locale === "en" ? "Analysis model" : "分析模型"}<select className="field-control mt-2" value={modelId} onChange={e=>selectModel(e.target.value as ModelId)}>{cards.map(c=><option key={c.model_id} value={c.model_id}>{locale === "en" ? c.name : c.name_zh}</option>)}</select></label>{modelId === "household_economic_pressure" ? <HouseholdPressureWorkbench countries={countries}/> : <TransparentModelResearchWorkbench key={modelId} model={modelId} countries={countries}/>}</div>
      ) : category === "panel_econometrics" ? (
        selectedSkillId === "panel_local_projections" ? <PanelLocalProjectionWorkbench /> : <PanelEconometricsWorkbench countries={countries} />
      ) : category === "network_analysis" ? (
        <TradeNetworkWorkbench countries={countries} initialCountry={route.countrySlug} />
      ) : category === "event_analysis" ? (
        <EventWindowWorkbench
          countries={countries}
          events={events}
          initialCountry={route.countrySlug}
          initialEvent={searchParams.get("event") ?? undefined}
          initialOutcome={searchParams.get("outcome") ?? undefined}
        />
      ) : category === "macro_time_series" ? (
        <div className="mt-6 grid gap-6">
          {selectedSkillId === "monetary_policy_identification" ? <EcbIdentificationStatus /> : null}
          {selectedSkillId === "local_projections" ? <LocalProjectionWorkbench initialCountry={route.countrySlug} /> : null}
          {selectedSkillId === "macro_driver_explorer" ? <MacroDriverWorkbench countries={countries} initialCountry={route.countrySlug} /> : null}
          {selectedSkillId === "reduced_form_var" ? <VarWorkbench countries={countries} initialCountry={route.countrySlug} /> : null}
        </div>
      ) : (
        <div className="divide-y divide-[var(--line)] border-y border-[var(--line)] mt-6">{skills.map((skill) => <article key={skill.skill_id} className="grid gap-3 py-5 md:grid-cols-[220px_1fr_auto] md:items-start"><div><p className="editorial-kicker">{skill.calculation_mode.replaceAll("_", " ")}</p><h2 className="mt-2 text-xl font-semibold">{skill.name}</h2></div><p className="text-sm leading-7 text-[var(--muted)]">{skill.description}</p><span className="text-xs font-semibold text-[var(--warning)]">{statusLabels[skill.calculation_mode]}</span><details className="advanced-disclosure md:col-span-3"><summary>登记的需求与诊断</summary><p className="mt-3 text-xs text-[var(--muted)]">Required: {skill.required_data.join(" / ")}</p><p className="mt-2 text-xs text-[var(--muted)]">Diagnostics: {skill.diagnostics.join(" / ")}</p></details></article>)}</div>
      )}
    </section>
  )}</LocalizedContent>;
}
