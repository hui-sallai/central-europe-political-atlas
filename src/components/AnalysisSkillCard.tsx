"use client";
import Link from "next/link";
import { useLocale } from "@/i18n/LocaleProvider";
import { LocalizedContent } from "@/i18n/LocalizedContent";
import { englishAnalysisSkill } from "@/i18n/analysisPresentation";
import { methodStateLabels } from "@/lib/analysisSkills";
import { getResearchPackageFilename } from "@/lib/releaseMetadata";
import type { AnalysisSkillRuntimeManifest } from "@/types/AnalysisSkill";
import { NotebookCollect } from "./NotebookCollect";
import { PLATFORM_BASE_URL } from "@/lib/releaseMetadata";

export function AnalysisSkillCard({ skill: canonicalSkill }: { skill: AnalysisSkillRuntimeManifest }) {
  const locale = useLocale();
  const skill = locale === "en" ? englishAnalysisSkill(canonicalSkill) : canonicalSkill;
  const notebookWarnings = { "zh-CN": [...canonicalSkill.limitations], en: [...englishAnalysisSkill(canonicalSkill).limitations] };
  if (canonicalSkill.skill_id === "reduced_form_var") {
    notebookWarnings["zh-CN"].push("系数估计可用；正式动态响应与正式 IRF 均不可发布。");
    notebookWarnings.en.push("Coefficient estimation is available; formal dynamic responses and formal IRFs are unavailable for publication.");
  }
  return <LocalizedContent><article className="editorial-panel mt-6 p-5" id={skill.skill_id}>
    <p className="editorial-kicker">{locale==='en'?'Research method':'研究方法'} · {methodStateLabels[skill.state]}</p>
    <h2 className="mt-3 text-2xl font-semibold">{skill.name}</h2>
    <p className="mt-3 text-sm leading-7">{skill.description}</p>
    <div className="mt-3"><NotebookCollect create={() => ({ type: "method", title: canonicalSkill.name, labels: { "zh-CN": canonicalSkill.name, en: englishAnalysisSkill(canonicalSkill).name }, url: `${PLATFORM_BASE_URL.replace(/\/$/, "")}${locale === "en" ? "/en" : ""}/models/?tab=run&skill=${canonicalSkill.skill_id}`, canonical_ids: [canonicalSkill.skill_id], countries: [], periods: [], sources: [], layer: "method_registry", comparability: "methodological_reference_not_a_result", warnings: notebookWarnings["zh-CN"], warning_labels: notebookWarnings, metadata: { state: canonicalSkill.state, purpose: skill.description, supported_data: skill.required_data, readiness: canonicalSkill.gate ?? canonicalSkill.readiness_reference ?? "", reference: canonicalSkill.citation } })} /></div>
    {skill.state!=="active" ? <p role="status" className="mt-3 text-sm">{locale==="en"?"This method is not available for calculation. Registration does not constitute publication approval.":"此方法当前不提供计算；登记不代表通过发布准入。"}</p> : null}
    {skill.skill_id==='reduced_form_var'?<p role="note" className="mt-3 text-sm">{locale==='en'?'Coefficient estimation remains separate from publication: formal dynamic responses and IRFs are blocked.':'系数估计与结果发布分开：正式动态响应与 IRF 仍禁止发布。'}</p>:null}
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-semibold">{locale==='en'?'Available inputs':'可用输入'}</dt><dd>{skill.supported_frequency?.join(' / ')|| (locale==='en'?'Registered observations':'已登记观测')} · {locale==='en'?'Only admitted source definitions':'仅使用已准入来源定义'}</dd></div><div><dt className="font-semibold">{locale==='en'?'Applicable countries':'适用国家'}</dt><dd>{skill.supports_country?(locale==='en'?'Check the selected country in the method-specific controls below; a national profile does not imply model eligibility.':'须在下方方法控件核查所选国家；存在国家档案不代表模型可用。'):(locale==='en'?'Registered fixed groups or common scope; arbitrary national combinations are not admitted.':'登记的固定分组或共同范围；不接入任意国家组合。')}</dd></div><div><dt className="font-semibold">{locale==='en'?'Main result':'主要结果'}</dt><dd>{locale==='en'?'The selected method reports only its authorised output; missing and blocked results remain unavailable.':'所选方法仅展示已获准的输出；缺失与受限结果保持不可用。'}</dd></div></dl>
    <h3 className="mt-4 font-semibold">适用范围与解释边界</h3>
    <ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">{skill.limitations.slice(0,2).map((line) => <li key={line}>{line}</li>)}</ul>
    <details className="advanced-disclosure mt-4"><summary>数据需求、准入与诊断</summary>
      {skill.reason_zh?<p role="note" className="mt-2 text-sm">{skill.reason_zh}</p>:null}<ul>{skill.limitations.slice(2).map(line=><li key={line} className="mt-2 text-sm">{line}</li>)}</ul>
      <p className="mt-3 text-sm">数据需求：{skill.required_data.join(" / ") || "已发布、已验证的数据输出"}</p>
      <p className="mt-2 text-sm">准入条件：{skill.gate ?? "以方法登记状态及数据验证结果为准"}</p>
      <p className="mt-2 text-sm">诊断：{skill.diagnostics.join(" / ")}</p>
    </details>
    <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold">{locale==='en'?'Technical methods, source records and research exports':'技术方法、来源记录与研究导出'}</summary><div className="mt-3 flex flex-wrap gap-4"><Link href={locale==='en'?'/en/methodology#analysis-registry':'/methodology#analysis-registry'}>方法说明</Link><a href="/research-data/analysis_skill_registry.json">机器可读方法登记</a><a href={`/research-data/${getResearchPackageFilename()}`}>研究数据包</a></div></details>
  </article></LocalizedContent>;
}
