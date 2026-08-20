import { scenarioDefinitions } from "@/lib/scenarioFramework";
import type { ScenarioPreset } from "@/types/AnalysisSkill";

const targetSkillByScenario: Record<string, string> = {
  inflation_resurgence: "household_economic_pressure",
  energy_price_shock: "var_svar / industrial_dependency",
  germany_demand_slowdown: "var_svar / network_dependency",
  eu_funds_delay: "panel_econometrics / fiscal_pressure",
};

export const scenarioPresets: ScenarioPreset[] = scenarioDefinitions.map((definition) => ({
  scenario_id: definition.scenario_id,
  target_skill: targetSkillByScenario[definition.scenario_id] ?? definition.reference_model_id,
  predefined_parameters: {
    shock: definition.default_shock_value,
    unit: definition.shock_unit,
    minimum: definition.shock_min,
    maximum: definition.shock_max,
  },
  explanation: definition.description,
}));
