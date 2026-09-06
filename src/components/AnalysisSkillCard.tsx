import Link from "next/link";
import { methodStateLabels } from "@/lib/analysisSkills";
import { getResearchPackageFilename } from "@/lib/releaseMetadata";
import type { AnalysisSkillRuntimeManifest } from "@/types/AnalysisSkill";

export function AnalysisSkillCard({ skill }: { skill: AnalysisSkillRuntimeManifest }) {
  return <article className="editorial-panel mt-6 p-5" id={skill.skill_id}>
    <p className="editorial-kicker">{skill.method_kind} · {methodStateLabels[skill.state]}</p>
    <h2 className="mt-3 text-2xl font-semibold">{skill.name}</h2>
    <p className="mt-3 text-sm leading-7">{skill.description}</p>
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
  </article>;
}
