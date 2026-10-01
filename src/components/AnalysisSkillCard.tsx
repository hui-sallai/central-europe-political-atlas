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
    <p className="editorial-kicker">{skill.method_kind} · {methodStateLabels[skill.state]}</p>
    <h2 className="mt-3 text-2xl font-semibold">{skill.name}</h2>
    <p className="mt-3 text-sm leading-7">{skill.description}</p>
    <div className="mt-3"><NotebookCollect create={() => ({ type: "method", title: canonicalSkill.name, labels: { "zh-CN": canonicalSkill.name, en: englishAnalysisSkill(canonicalSkill).name }, url: `${PLATFORM_BASE_URL.replace(/\/$/, "")}${locale === "en" ? "/en" : ""}/models/?tab=run&skill=${canonicalSkill.skill_id}`, canonical_ids: [canonicalSkill.skill_id], countries: [], periods: [], sources: [], layer: "method_registry", comparability: "methodological_reference_not_a_result", warnings: notebookWarnings["zh-CN"], warning_labels: notebookWarnings, metadata: { state: canonicalSkill.state, purpose: skill.description, supported_data: skill.required_data, readiness: canonicalSkill.gate ?? canonicalSkill.readiness_reference ?? "", reference: canonicalSkill.citation } })} /></div>
    {skill.reason_zh ? <p role="status" className="mt-3 text-sm">{skill.reason_zh}</p> : null}
    <h3 className="mt-4 font-semibold">适用范围与解释边界</h3>
    <ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">{skill.limitations.map((line) => <li key={line}>{line}</li>)}</ul>
    <details className="advanced-disclosure mt-4"><summary>数据需求、准入与诊断</summary>
      <p className="mt-3 text-sm">数据需求：{skill.required_data.join(" / ") || "已发布、已验证的数据输出"}</p>
      <p className="mt-2 text-sm">准入条件：{skill.gate ?? "以方法登记状态及数据验证结果为准"}</p>
      <p className="mt-2 text-sm">诊断：{skill.diagnostics.join(" / ")}</p>
    </details>
    <div className="mt-4 flex gap-4 text-sm"><Link href="/methodology#analysis-registry">方法说明</Link>
      {skill.readiness_reference ? <a href={`/research-data/${skill.readiness_reference.split("/").pop()}`}>查看准入与验证记录</a> : null}
      <a href="/research-data/analysis_skill_registry.json">机器可读方法登记</a>
      <a href={`/research-data/${getResearchPackageFilename()}`}>研究数据包</a>
    </div>
  </article></LocalizedContent>;
}
