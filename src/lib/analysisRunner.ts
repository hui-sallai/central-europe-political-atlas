import { analysisSkills } from "@/lib/analysisSkills";
import { calculateModelOutput, modelCards } from "@/lib/modelFramework";
import { researchCountries } from "@/lib/researchData";
import type { AnalysisResult, AnalysisRunRequest } from "@/types/AnalysisSkill";
import type { ModelOutput } from "@/types/ModelOutput";

export function runAnalysisSkill(request: AnalysisRunRequest): AnalysisResult<ModelOutput> {
  const skill = analysisSkills.find((candidate) => candidate.skill_id === request.skillId);
  if (!skill || skill.calculation_mode === "registry_only") {
    return {
      status: "registry_only",
      estimates: null,
      diagnostics: {
        input_completeness: null,
        year_alignment: "not_run",
        validation_gate: "registry_only",
        missing_variables: skill?.required_data ?? [],
      },
      visualizations: [],
      data_trace: [],
      limitations: skill?.limitations ?? ["分析技能未登记。"],
    };
  }

  const country = researchCountries.find((candidate) => candidate.slug === request.dataset.country_slug);
  const card = modelCards.find((candidate) => candidate.model_id === request.skillId);
  if (!country || !card) {
    return {
      status: "unavailable",
      estimates: null,
      diagnostics: {
        input_completeness: null,
        year_alignment: "not_available",
        validation_gate: "country_or_model_not_found",
        missing_variables: [],
      },
      visualizations: [],
      data_trace: [],
      limitations: ["找不到所选国家或综合指标配置。"],
    };
  }

  const output = calculateModelOutput(country, card);
  return {
    status: output.score === null ? "unavailable" : "completed",
    estimates: output,
    diagnostics: {
      input_completeness: output.data_completeness,
      year_alignment: output.year_alignment_status,
      validation_gate: output.score === null ? "blocked_insufficient_inputs" : "passed",
      missing_variables: output.missing_indicator_ids,
    },
    visualizations: [],
    data_trace: output.input_observation_ids,
    limitations: card.limitations,
  };
}
