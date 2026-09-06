import registry from "@/data/analysis/analysis_skill_registry.json";
import { modelCards } from "@/lib/modelFramework";
import { PLATFORM_BASE_URL, PLATFORM_VERSION } from "@/lib/releaseMetadata";
import type { AnalysisSkill, AnalysisSkillCategory, AnalysisSkillRegistryRecord, AnalysisSkillRuntimeManifest } from "@/types/AnalysisSkill";

export const canonicalAnalysisRegistry = registry as { records: AnalysisSkillRegistryRecord[]; categories: Record<AnalysisSkillCategory, string> };
export const analysisCategoryLabels = canonicalAnalysisRegistry.categories;
export const methodStateLabels = { active: "已启用", registry_only: "已登记，当前未运行", blocked: "受限，暂不可运行", deprecated_alias: "历史别名" } as const;
const citation = `${PLATFORM_BASE_URL}methodology/ (Analysis Skills Registry, ${PLATFORM_VERSION})`;
export const runtimeAnalysisSkills: AnalysisSkillRuntimeManifest[] = canonicalAnalysisRegistry.records.flatMap((row) => {
  if (row.state === "deprecated_alias" || !row.presentation) return [];
  return [{ ...row.presentation, skill_id: row.skill_id, state: row.state, calculation_mode: row.state,
    required_data: row.required_data ?? [], gate: row.gate, readiness_reference: row.readiness_reference,
    note: row.note, reason_zh: row.reason_zh, citation }];
});
const composite = runtimeAnalysisSkills.find((row) => row.skill_id === "composite_indicators")!;
export const activeCompositeSkills: AnalysisSkill[] = modelCards.map((card) => ({
  ...composite, skill_id: card.model_id, name: card.name_zh, description: card.purpose,
  required_data: card.inputs.map((input) => input.indicator_id), optional_data: card.reserved_inputs,
  parameters: [card.formula_version, card.weight_version], minimum_observations: card.inputs.length,
  limitations: card.limitations,
}));
export const analysisSkills = [...runtimeAnalysisSkills, ...activeCompositeSkills];

export function resolveAnalysisSkill(requested: string | null) {
  const id = requested ?? "composite_indicators";
  const record = canonicalAnalysisRegistry.records.find((row) => row.skill_id === id);
  const target = record?.state === "deprecated_alias" ? record.alias_of : id;
  return runtimeAnalysisSkills.find((row) => row.skill_id === target);
}
export function resolveAnalysisRoute(requested: string | null, country: string | null, countries: readonly string[]) {
  const skill = resolveAnalysisSkill(requested);
  const notices: string[] = [];
  const alias = canonicalAnalysisRegistry.records.find((row) => row.skill_id === requested && row.state === "deprecated_alias");
  if (alias) notices.push("历史别名已转到对应的当前方法。");
  if (!skill) notices.push("未知分析方法，请从方法列表选择。");
  let countrySlug: string | undefined;
  if (country && skill?.supports_country) {
    countrySlug = countries.includes(country) ? country : countries[0];
    if (countrySlug !== country) notices.push("国家参数无效，已选择可用国家。");
  } else if (country) notices.push("此方法不使用国家参数。");
  return { skill, category: skill?.category ?? "composite_indicators", countrySlug, notices };
}
