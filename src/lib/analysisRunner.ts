import { analysisSkills } from "@/lib/analysisSkills";
import { calculateModelOutput, modelCards } from "@/lib/modelFramework";
import { runPanelEconometrics } from "@/lib/panelEngine";
import { researchCountries } from "@/lib/researchData";
import type { AnalysisResult, AnalysisRunRequest } from "@/types/AnalysisSkill";
import type { ModelOutput } from "@/types/ModelOutput";
import type { PanelAnalysisOutput, PanelSpecification } from "@/types/PanelAnalysis";

export function runAnalysisSkill(request: AnalysisRunRequest): AnalysisResult<ModelOutput | PanelAnalysisOutput> {
  const skill = analysisSkills.find((candidate) => candidate.skill_id === request.skillId);
  if (!skill || skill.calculation_mode !== "active") {
    return {
      status: skill?.calculation_mode === "data_building" || skill?.calculation_mode === "blocked" || skill?.calculation_mode === "registry_only" ? skill.calculation_mode : "registry_only",
      estimates: null,
      diagnostics: {
        input_completeness: null,
        year_alignment: "not_run",
        validation_gate: skill?.calculation_mode ?? "registry_only",
        missing_variables: skill?.required_data ?? [],
      },
      visualizations: [],
      data_trace: [],
      limitations: skill?.limitations ?? ["分析技能未登记。"],
    };
  }

  if (request.skillId === "panel_econometrics") {
    try {
      const output = runPanelEconometrics(request.dataset.panel_observations ?? [], request.parameters as unknown as PanelSpecification);
      return {
        status: "completed",
        estimates: output,
        diagnostics: { input_completeness: Math.round(output.diagnostics.sample_coverage * 100), year_alignment: output.diagnostics.year_coverage, validation_gate: "panel_gate_passed", missing_variables: [] },
        visualizations: [{ type: "coefficient_plot", title: "Panel coefficients", data: output.coefficients }],
        data_trace: output.data_trace,
        limitations: skill.limitations,
      };
    } catch (error) {
      return {
        status: "unavailable",
        estimates: null,
        diagnostics: { input_completeness: null, year_alignment: "not_run", validation_gate: error instanceof Error ? error.message : "panel_estimation_failed", missing_variables: [] },
        visualizations: [], data_trace: [], limitations: skill.limitations,
      };
    }
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
