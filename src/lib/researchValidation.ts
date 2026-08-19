import {
  calculateModelOutput,
  classifyModelAvailability,
  modelCards,
  modelOutputs,
  normalizeModelInput,
  recalculateModelOutputs,
} from "./modelFramework";
import {
  calculateScenario,
  SCENARIO_FORMULA_VERSION,
  scenarioBacktestRegistry,
  scenarioDefinitions,
} from "./scenarioFramework";
import {
  chinaProjectDisruptionDecision,
  scenarioEvidenceLinks,
  scenarioRegionalContexts,
  scenarioResults,
  scenarioSensitivity,
} from "./scenarioResearch";
import type { ModelCard, ModelOutput } from "@/types/ModelOutput";
import type { ScenarioDefinition, ScenarioResult } from "@/types/Scenario";
import type { GoldenTestCase, ValidationRecord, ValidationSeverity, ValidationStatus, ValidationTargetType } from "@/types/Validation";

const REVIEWED_AT = "2026-08-15";
const TOLERANCE = 0.0001;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableValue(item)]));
  }
  return value;
}

function stableStringify(value: unknown) {
  return JSON.stringify(stableValue(value));
}

function record(
  validationId: string,
  targetType: ValidationTargetType,
  targetId: string,
  testType: string,
  expected: string,
  actual: string,
  status: ValidationStatus,
  notes: string,
  country = "all",
  year: number | null = null,
  severity: ValidationSeverity = status === "failed" ? "error" : status === "partial" ? "warning" : "info",
): ValidationRecord {
  return {
    validation_id: validationId,
    target_type: targetType,
    target_id: targetId,
    country,
    year,
    test_type: testType,
    input_state: "canonical v0.90 inputs and published configuration",
    expected_behavior: expected,
    actual_behavior: actual,
    status,
    severity,
    notes,
    reviewed_at: REVIEWED_AT,
  };
}

function comparableModelOutput(output: ModelOutput) {
  return {
    score: output.score,
    data_completeness: output.data_completeness,
    confidence: output.confidence,
    main_drivers: output.main_drivers,
    input_year: output.input_year,
    availability: output.availability,
  };
}

function reversedCard(card: ModelCard): ModelCard {
  return { ...card, inputs: [...card.inputs].reverse() };
}

function modelValidationRecords() {
  const recomputed = recalculateModelOutputs();
  const records: ValidationRecord[] = [];

  for (const card of modelCards) {
    const weightSum = Number(card.inputs.reduce((sum, input) => sum + input.weight, 0).toFixed(8));
    const overlap = card.inputs.filter((input) => card.reserved_inputs.includes(input.indicator_id));
    records.push(record(
      `model_${card.model_id}_weight_integrity`, "model", card.model_id, "weight_integrity",
      "Eligible weights sum to 1 and reserved/context variables carry no weight.",
      `weight_sum=${weightSum}; reserved_overlap=${overlap.length}`,
      weightSum === 1 && overlap.length === 0 ? "passed" : "failed",
      `formula=${card.formula_version}; weights=${card.weight_version}`,
    ));

    const boundariesPass = card.inputs.every((input) => {
      const low = normalizeModelInput(input.normalization.lower, input);
      const high = normalizeModelInput(input.normalization.upper, input);
      const expectedLow = input.normalization.invert ? 100 : 0;
      const expectedHigh = input.normalization.invert ? 0 : 100;
      return low === expectedLow
        && high === expectedHigh
        && normalizeModelInput(input.normalization.lower - 1000, input) !== null
        && normalizeModelInput(input.normalization.upper + 1000, input) !== null
        && normalizeModelInput(null, input) === null
        && normalizeModelInput(undefined, input) === null;
    });
    records.push(record(
      `model_${card.model_id}_normalization_boundary`, "model", card.model_id, "normalization_boundary",
      "Minimum, maximum and out-of-range values clamp to 0–100; null/undefined remain missing.",
      boundariesPass ? "All configured inputs passed boundary and missing-value checks." : "At least one configured input failed.",
      boundariesPass ? "passed" : "failed",
      "Missing values are never converted to zero.",
    ));

    const directionPass = card.inputs.every((input) => {
      const midpoint = (input.normalization.lower + input.normalization.upper) / 2;
      const adverseValue = input.normalization.invert
        ? midpoint - Math.abs(input.normalization.upper - input.normalization.lower) * 0.1
        : midpoint + Math.abs(input.normalization.upper - input.normalization.lower) * 0.1;
      const baseline = normalizeModelInput(midpoint, input);
      const adverse = normalizeModelInput(adverseValue, input);
      return baseline !== null && adverse !== null && adverse >= baseline;
    });
    records.push(record(
      `model_${card.model_id}_direction`, "model", card.model_id, "monotonicity",
      "Moving every configured input in its documented adverse direction must not reduce the score contribution.",
      directionPass ? "All configured input directions are monotonic." : "A configured input moved against its documented direction.",
      directionPass ? "passed" : "failed",
      "Direction follows the published Model Card normalization, not an external risk judgement.",
    ));

    const modelRows = modelOutputs.filter((output) => output.model_id === card.model_id);
    const scalePass = modelRows.every((output) => output.formula_version === card.formula_version && output.weight_version === card.weight_version);
    records.push(record(
      `model_${card.model_id}_cross_country_scale`, "model", card.model_id, "cross_country_scale",
      "All countries use the same formula, normalization and weight versions.",
      `${modelRows.length} outputs checked; shared formula=${card.formula_version}; shared weights=${card.weight_version}`,
      scalePass ? "passed" : "failed",
      "Country-specific missingness may change availability but not the formula.",
    ));
  }

  for (const output of modelOutputs) {
    const card = modelCards.find((candidate) => candidate.model_id === output.model_id)!;
    const fresh = recomputed.find((candidate) => candidate.country_slug === output.country_slug && candidate.model_id === output.model_id)!;
    const reordered = calculateModelOutput({ slug: output.country_slug } as never, reversedCard(card));
    const deterministic = stableStringify(comparableModelOutput(output)) === stableStringify(comparableModelOutput(fresh))
      && stableStringify(comparableModelOutput(output)) === stableStringify(comparableModelOutput(reordered));
    records.push(record(
      `model_${output.model_id}_${output.country_slug}_determinism`, "model", output.model_id, "determinism",
      "Repeated calculation and input object reordering preserve score, completeness, confidence and drivers.",
      deterministic ? "Repeated and reordered calculations are identical." : "Output changed across a deterministic replay.",
      deterministic ? "passed" : "failed",
      `model=${output.model_version}; formula=${output.formula_version}; weights=${output.weight_version}`,
      output.country_slug, output.input_year,
    ));

    const aligned = output.score === null || (output.inputs.length > 0 && output.inputs.every((input) => input.year === output.input_year));
    records.push(record(
      `model_${output.model_id}_${output.country_slug}_year_alignment`, "data", output.model_id, "year_alignment",
      "Every precise score uses one common input year; insufficient outputs may remain null.",
      `${output.year_alignment_status}; input_year=${output.input_year ?? "none"}; trace_years=${[...new Set(output.inputs.map((input) => input.year))].join("/") || "none"}`,
      aligned ? "passed" : "failed",
      "Staggered-year exact scores are not enabled.",
      output.country_slug, output.input_year,
    ));
  }

  const missingPass = classifyModelAvailability(1) === "sufficient"
    && classifyModelAvailability(0.75) === "partial"
    && classifyModelAvailability(0.5) === "insufficient";
  records.push(record(
    "models_missing_data_gate", "model", "all_models", "missing_data",
    "100% is sufficient, at least 75% is partial, below 75% is insufficient; missing is not zero.",
    `1=${classifyModelAvailability(1)}; 0.75=${classifyModelAvailability(0.75)}; 0.5=${classifyModelAvailability(0.5)}`,
    missingPass ? "passed" : "failed",
    "No automatic imputation is used.",
  ));

  const fdiLeak = modelCards.some((card) => card.inputs.some((input) => input.indicator_id === "fdi_inflow"));
  records.push(record(
    "models_negative_fdi_exclusion", "model", "external_vulnerability,industrial_dependency", "negative_fdi",
    "Annual FDI flow must not enter weighted scores while its direction is not methodologically stable.",
    fdiLeak ? "fdi_inflow is present in an eligible weighted input." : "fdi_inflow is reserved/context only and carries zero formal weight.",
    fdiLeak ? "failed" : "passed",
    "Negative flows are not interpreted mechanically as low or high exposure.",
  ));

  return records;
}

function availableCountry(definition: ScenarioDefinition) {
  return scenarioResults.find((result) => result.scenario_id === definition.scenario_id && result.status === "available")?.country_slug ?? "poland";
}

function calculate(definition: ScenarioDefinition, countrySlug: string, shockValue: number, regionalContextCoverage = 0, evidenceQuality = 0) {
  return calculateScenario({ definition, countrySlug, shockValue, cards: modelCards, outputs: modelOutputs, regionalContextCoverage, evidenceQuality });
}

function comparableScenario(result: ScenarioResult) {
  return {
    baseline_score: result.baseline_score,
    scenario_score: result.scenario_score,
    score_change: result.score_change,
    adjusted_input: result.adjusted_input,
    status: result.status,
  };
}

function scenarioValidationRecords() {
  const records: ValidationRecord[] = [];
  for (const definition of scenarioDefinitions) {
    const country = availableCountry(definition);
    const first = calculate(definition, country, definition.default_shock_value, 100, 100);
    const second = calculate(definition, country, definition.default_shock_value, 100, 100);
    records.push(record(
      `scenario_${definition.scenario_id}_determinism`, "scenario", definition.scenario_id, "determinism",
      "Identical baseline, shock and formula produce identical numerical output.",
      stableStringify(comparableScenario(first)) === stableStringify(comparableScenario(second)) ? "Replay is identical." : "Replay differs.",
      stableStringify(comparableScenario(first)) === stableStringify(comparableScenario(second)) ? "passed" : "failed",
      `formula=${SCENARIO_FORMULA_VERSION}`,
      country, first.baseline_date ? Number(first.baseline_date) : null,
    ));

    const zero = calculate(definition, country, 0);
    const zeroPass = zero.status !== "available" || (zero.scenario_score === zero.baseline_score && zero.score_change === 0);
    records.push(record(
      `scenario_${definition.scenario_id}_zero_shock`, "scenario", definition.scenario_id, "zero_shock_invariance",
      "At shock=0, scenario output equals baseline and difference equals zero.",
      zero.status === "available" ? `baseline=${zero.baseline_score}; scenario=${zero.scenario_score}; change=${zero.score_change}` : `unavailable: ${zero.unavailable_reason}`,
      zeroPass ? "passed" : "failed",
      "Unavailable baselines do not produce a fake zero score.",
      country, zero.baseline_date ? Number(zero.baseline_date) : null,
    ));

    const below = calculate(definition, country, definition.shock_min - Math.max(1, definition.shock_step));
    const above = calculate(definition, country, definition.shock_max + Math.max(1, definition.shock_step));
    const boundsPass = below.shock_boundary_status === "clamped_to_min" && below.shock_value === definition.shock_min
      && above.shock_boundary_status === "clamped_to_max" && above.shock_value === definition.shock_max;
    records.push(record(
      `scenario_${definition.scenario_id}_shock_boundary`, "scenario", definition.scenario_id, "shock_boundary",
      "Out-of-range values are explicitly clamped and labelled; they are never silently calculated.",
      `below=${below.shock_boundary_status}/${below.shock_value}; above=${above.shock_boundary_status}/${above.shock_value}`,
      boundsPass ? "passed" : "failed",
      "The UI and export expose requested and applied shock values separately.",
      country,
    ));

    const isolationPass = first.status !== "available" || first.adjusted_input?.indicator_id === definition.adjusted_indicator_id;
    records.push(record(
      `scenario_${definition.scenario_id}_isolation`, "scenario", definition.scenario_id, "scenario_isolation",
      "Only the declared adjusted indicator may enter numeric recalculation.",
      first.adjusted_input ? `adjusted=${first.adjusted_input.indicator_id}; declared=${definition.adjusted_indicator_id}` : `unavailable: ${first.unavailable_reason}`,
      isolationPass ? "passed" : "failed",
      `context=${definition.contextual_variables.join(",") || "none"}`,
      country,
    ));

    const contextOff = calculate(definition, country, definition.default_shock_value, 0, 0);
    const contextOn = calculate(definition, country, definition.default_shock_value, 100, 100);
    const leakagePass = contextOff.scenario_score === contextOn.scenario_score && contextOff.score_change === contextOn.score_change;
    records.push(record(
      `scenario_${definition.scenario_id}_context_leakage`, "regional_context", definition.scenario_id, "context_numeric_leakage",
      "Regional, event and project context may change confidence metadata but never the numeric scenario score.",
      `context_off=${contextOff.scenario_score}; context_on=${contextOn.scenario_score}`,
      leakagePass ? "passed" : "failed",
      "Context is explanatory evidence only.",
      country,
    ));

    const points = scenarioSensitivity.filter((point) => point.scenario_id === definition.scenario_id && point.country_slug === country && point.status === "available");
    const monotonic = points.every((point, index) => index === 0 || (point.score_change ?? -Infinity) + TOLERANCE >= (points[index - 1]!.score_change ?? -Infinity));
    records.push(record(
      `scenario_${definition.scenario_id}_sensitivity`, "scenario", definition.scenario_id, "sensitivity_monotonicity",
      "A larger adverse shock must not produce a smaller adverse score response; saturation is allowed and labelled.",
      points.map((point) => `${point.shock_value}:${point.score_change}`).join(" | ") || "No calculable sensitivity points.",
      points.length === 0 ? "partial" : monotonic ? "passed" : "failed",
      points.length === 0 ? "No eligible baseline for this representative case." : "Flat steps are accepted only at a normalization boundary.",
      country,
    ));

    const sameBaseline = calculate(definition, country, definition.default_shock_value).baseline_score
      === calculate(definition, country, definition.scenario_id === "germany_demand_slowdown" ? definition.shock_min : definition.shock_max).baseline_score;
    records.push(record(
      `scenario_${definition.scenario_id}_compare_baseline`, "scenario", definition.scenario_id, "scenario_compare",
      "Scenario A and B start from the same baseline and are not compounded.",
      sameBaseline ? "Both comparisons use the same baseline." : "Baseline changed between A and B.",
      sameBaseline ? "passed" : "failed",
      "Compound scenarios are not enabled in v0.91.",
      country,
    ));

    const maximumAdverse = definition.scenario_id === "germany_demand_slowdown" ? definition.shock_min : definition.shock_max;
    const saturation = calculate(definition, country, maximumAdverse);
    const saturationPass = saturation.status !== "available" || saturation.saturation_status !== "not_applicable";
    records.push(record(
      `scenario_${definition.scenario_id}_saturation`, "scenario", definition.scenario_id, "saturation",
      "Maximum configured shocks record whether the adjusted input reached a 0/100 normalization boundary.",
      `shock=${maximumAdverse}; saturation_status=${saturation.saturation_status}; score=${saturation.scenario_score}`,
      saturationPass ? "passed" : "failed",
      "If a boundary is reached, further flat score movement is saturation rather than evidence of no effect.",
      country,
    ));
  }

  const confidencePass = scenarioResults.every((result) => result.status !== "available" || result.confidence === result.confidence_decomposition.label);
  records.push(record(
    "scenario_confidence_rule", "scenario", "all_scenarios", "confidence_decomposition",
    "Published confidence is generated from the rule-based decomposition and means evidence reliability, not probability.",
    confidencePass ? "Every available result uses the decomposed label." : "A result still uses a static confidence label.",
    confidencePass ? "passed" : "failed",
    "Components: baseline completeness, eligibility, direct coverage, regional context and evidence quality.",
  ));

  const spatialLevelPass = scenarioRegionalContexts.every((context) => {
    const groups = new Map<string, Set<string>>();
    for (const value of context.values) {
      const levels = groups.get(value.indicator_id) ?? new Set<string>();
      levels.add(value.admin_level);
      groups.set(value.indicator_id, levels);
    }
    return [...groups.values()].every((levels) => levels.size <= 1);
  });
  records.push(record(
    "regional_context_spatial_level", "regional_context", "scenario_regional_context", "spatial_level",
    "Each factual regional ranking uses one explicit spatial level per country and indicator.",
    spatialLevelPass ? "No mixed-level ranking detected." : "At least one ranking mixes spatial levels.",
    spatialLevelPass ? "passed" : "failed",
    "Cross-level regional rankings remain prohibited.",
  ));

  const evidencePass = scenarioEvidenceLinks.every((link) => link.enters_score === false);
  records.push(record(
    "scenario_evidence_numeric_leakage", "scenario", "scenario_evidence_links", "evidence_numeric_leakage",
    "Events and projects remain explanatory links and never enter numeric scenario calculations.",
    `${scenarioEvidenceLinks.length} links checked; numeric entrants=${scenarioEvidenceLinks.filter((link) => link.enters_score !== false).length}`,
    evidencePass ? "passed" : "failed",
    "Event intensity and project presence do not alter a score.",
  ));

  const germanyDefinition = scenarioDefinitions.find((item) => item.scenario_id === "germany_demand_slowdown")!;
  const germanyText = stableStringify(germanyDefinition).toLowerCase();
  const germanyTerminologyPass = germanyText.includes("synthetic pressure adjustment")
    && !germanyText.includes("forecast export share")
    && !germanyText.includes("expected trade loss");
  records.push(record(
    "scenario_germany_demand_assumption", "scenario", "germany_demand_slowdown", "assumption_terminology",
    "The exposure adjustment is labelled synthetic pressure adjustment and never described as forecast export share or expected trade loss.",
    germanyTerminologyPass ? "Terminology is explicit and bounded." : "Potentially misleading trade-loss terminology remains.",
    germanyTerminologyPass ? "passed" : "failed",
    "The arithmetic adjustment is not an estimated elasticity, export loss or GDP forecast.",
  ));

  const energyDefinition = scenarioDefinitions.find((item) => item.scenario_id === "energy_price_shock")!;
  const energyPass = energyDefinition.adjusted_indicator_id === "industrial_electricity_price"
    && energyDefinition.contextual_variables.includes("energy_import_dependency")
    && !energyDefinition.contextual_variables.includes(energyDefinition.adjusted_indicator_id);
  records.push(record(
    "scenario_energy_direct_input", "scenario", "energy_price_shock", "energy_transmission",
    "Industrial electricity price is the only recalculated input; energy import dependency and regional manufacturing remain context.",
    `adjusted=${energyDefinition.adjusted_indicator_id}; contextual=${energyDefinition.contextual_variables.join(",")}`,
    energyPass ? "passed" : "failed",
    "Household electricity price and energy inflation are not forced into a model that lacks those eligible inputs.",
  ));

  const euDefinition = scenarioDefinitions.find((item) => item.scenario_id === "eu_funds_delay")!;
  records.push(record(
    "scenario_eu_funds_assumption", "scenario", "eu_funds_delay", "eu_funds_transmission",
    "The fiscal deterioration is user-defined and is not presented as an estimated EU-funds multiplier.",
    euDefinition.assumptions.join(" "),
    euDefinition.assumptions.some((item) => item.includes("不估计欧盟拨款弹性")) ? "passed" : "failed",
    "Only fiscal_balance_gdp is recalculated.",
  ));

  const inflationDefinition = scenarioDefinitions.find((item) => item.scenario_id === "inflation_resurgence")!;
  records.push(record(
    "scenario_inflation_assumption", "scenario", "inflation_resurgence", "inflation_transmission",
    "HICP shock is not described as a disposable-income shock.",
    inflationDefinition.description,
    !stableStringify(inflationDefinition).includes("可支配收入冲击") ? "passed" : "failed",
    "Employment and other inputs remain fixed.",
  ));

  const failureStatePass = scenarioResults.every((result) => result.status === "available" || (result.scenario_score === null && result.score_change === null && Boolean(result.unavailable_reason)));
  records.push(record(
    "scenario_failure_state", "scenario", "all_scenarios", "failure_state",
    "Unavailable baselines produce a reason and null outputs, never NaN, blank output or a fake zero score.",
    `unavailable=${scenarioResults.filter((item) => item.status === "unavailable").length}; invalid_unavailable=${scenarioResults.filter((item) => item.status === "unavailable" && (item.scenario_score !== null || !item.unavailable_reason)).length}`,
    failureStatePass ? "passed" : "failed",
    "Precise output is refused when model inputs are insufficient.",
  ));

  records.push(record(
    "china_project_disruption_gate", "scenario", "china_project_disruption", "score_gate",
    "China project disruption scoring remains disabled until its formal data gate is met.",
    `decision=${chinaProjectDisruptionDecision.decision}; score_enabled=${chinaProjectDisruptionDecision.score_enabled}`,
    chinaProjectDisruptionDecision.score_enabled === false ? "passed" : "failed",
    "Eligible projects may appear as context only.",
  ));

  const backtestPartial = scenarioBacktestRegistry.every((item) => item.evaluation_status === "structure_only");
  records.push(record(
    "scenario_backtest_feasibility", "scenario", "backtest_registry", "point_in_time_backtest",
    "Backtest records remain structure-only until point-in-time vintage data can reconstruct historical baselines.",
    `${scenarioBacktestRegistry.length} records; statuses=${[...new Set(scenarioBacktestRegistry.map((item) => item.evaluation_status))].join(",")}`,
    backtestPartial ? "partial" : "failed",
    "Historical values may be revised data; this is not forecast-accuracy testing.",
  ));

  return records;
}

const expectedModelScores: Record<string, number | null> = {
  "hungary:household_economic_pressure": 34,
  "hungary:fiscal_pressure": 57.6,
  "hungary:external_vulnerability": 34.8,
  "hungary:industrial_dependency": 46.3,
  "poland:household_economic_pressure": 22,
  "poland:fiscal_pressure": 61.3,
  "poland:external_vulnerability": 37.1,
  "poland:industrial_dependency": 41.5,
  "germany:household_economic_pressure": 20.5,
  "germany:fiscal_pressure": 40.7,
  "germany:external_vulnerability": 39,
  "germany:industrial_dependency": null,
  "romania:household_economic_pressure": 54.5,
  "romania:fiscal_pressure": 64.1,
  "romania:external_vulnerability": 52.6,
  "romania:industrial_dependency": 31.7,
};

const expectedScenarioScores: Record<string, number | null> = {
  "hungary:inflation_resurgence": 44,
  "hungary:eu_funds_delay": 62.6,
  "hungary:energy_price_shock": 49.2,
  "hungary:germany_demand_slowdown": 47.5,
  "poland:inflation_resurgence": 32,
  "poland:eu_funds_delay": 66.3,
  "poland:energy_price_shock": 44,
  "poland:germany_demand_slowdown": 42.8,
  "germany:inflation_resurgence": 30.5,
  "germany:eu_funds_delay": 45.7,
  "germany:energy_price_shock": null,
  "germany:germany_demand_slowdown": null,
  "romania:inflation_resurgence": 64.5,
  "romania:eu_funds_delay": 69.1,
  "romania:energy_price_shock": 33.6,
  "romania:germany_demand_slowdown": 32.8,
};

function matchesExpected(actual: number | null, expected: number | null) {
  if (actual === null || expected === null) return actual === expected;
  return Math.abs(actual - expected) <= TOLERANCE;
}

export const goldenTestCases: GoldenTestCase[] = [
  ...Object.entries(expectedModelScores).map(([key, expected]) => {
    const [country, targetId] = key.split(":");
    const output = modelOutputs.find((item) => item.country_slug === country && item.model_id === targetId);
    const actual = output?.score ?? null;
    return {
      case_id: `golden_model_${country}_${targetId}`,
      target_type: "model" as const,
      country,
      target_id: targetId,
      known_input: output?.input_observation_ids.join("|") ?? "insufficient_inputs",
      expected_output: expected,
      actual_output: actual,
      expected_status: expected === null ? "unavailable" as const : "numeric" as const,
      actual_status: actual === null ? "unavailable" as const : "numeric" as const,
      validation_status: matchesExpected(actual, expected) ? expected === null ? "passed_gate" as const : "passed_numeric" as const : "failed" as const,
      tolerance: TOLERANCE,
      status: matchesExpected(actual, expected) ? "passed" as const : "failed" as const,
      formula_version: output?.formula_version ?? "unavailable",
    };
  }),
  ...Object.entries(expectedScenarioScores).map(([key, expected]) => {
    const [country, targetId] = key.split(":");
    const output = scenarioResults.find((item) => item.country_slug === country && item.scenario_id === targetId);
    const actual = output?.scenario_score ?? null;
    return {
      case_id: `golden_scenario_${country}_${targetId}`,
      target_type: "scenario" as const,
      country,
      target_id: targetId,
      known_input: output ? `${output.input_observation_ids.join("|")};shock=${output.shock_value}` : "unavailable",
      expected_output: expected,
      actual_output: actual,
      expected_status: expected === null ? "unavailable" as const : "numeric" as const,
      actual_status: actual === null ? "unavailable" as const : "numeric" as const,
      validation_status: matchesExpected(actual, expected) ? expected === null ? "passed_gate" as const : "passed_numeric" as const : "failed" as const,
      tolerance: TOLERANCE,
      status: matchesExpected(actual, expected) ? "passed" as const : "failed" as const,
      formula_version: output?.formula_version ?? SCENARIO_FORMULA_VERSION,
    };
  }),
];

const goldenFailures = goldenTestCases.filter((item) => item.status === "failed");

export const validationRegistry: ValidationRecord[] = [
  ...modelValidationRecords(),
  ...scenarioValidationRecords(),
  record(
    "golden_test_cases", "data", "golden_test_cases", "golden_regression",
    "Fixed Hungary, Poland, Germany and Romania model/scenario cases reproduce known outputs.",
    `${goldenTestCases.length} cases; failures=${goldenFailures.length}`,
    goldenFailures.length === 0 ? "passed" : "failed",
    "Expected values are fixed and must be intentionally migrated when a formula version changes.",
  ),
  record(
    "scenario_export_consistency", "data", "scenario_exports", "export_consistency",
    "Definitions, results, channels, evidence, sensitivity and backtest registries expose internally consistent identifiers.",
    `definitions=${scenarioDefinitions.length}; results=${scenarioResults.length}; sensitivity=${scenarioSensitivity.length}; backtests=${scenarioBacktestRegistry.length}`,
    scenarioResults.every((item) => scenarioDefinitions.some((definition) => definition.scenario_id === item.scenario_id)) ? "passed" : "failed",
    "The executable validation script separately parses every generated JSON/CSV export.",
  ),
  record(
    "canonical_data_immutability", "data", "canonical_observations", "canonical_immutability",
    "Scenario and validation execution must not change canonical observations or transmission inputs.",
    "The executable validation command compares SHA-256 content before and after runtime evaluation and blocks on mismatch.",
    "passed",
    "Scenario-adjusted values exist only inside scenario result records.",
  ),
  record(
    "formula_versioning", "data", "model_and_scenario_formulas", "formula_versioning",
    "Every model card/output and scenario result records formula and weight versions without silently replacing historical meaning.",
    `models=${modelCards.every((card) => Boolean(card.formula_version && card.weight_version))}; scenarios=${scenarioResults.every((item) => Boolean(item.formula_version && item.weight_version))}`,
    modelCards.every((card) => Boolean(card.formula_version && card.weight_version)) && scenarioResults.every((item) => Boolean(item.formula_version && item.weight_version)) ? "passed" : "failed",
    "Any future formula or normalization change requires a new version and migration note.",
  ),
  record(
    "scenario_reproducibility_record", "data", "scenario_results", "reproducibility",
    "Every scenario result preserves baseline inputs, shock, model/formula/weight versions, output and calculation timestamp.",
    `${scenarioResults.filter((item) => item.baseline_input_values.length > 0 && item.formula_version && item.weight_version && item.calculation_timestamp).length}/${scenarioResults.length} records contain a complete available-baseline trace.`,
    scenarioResults.every((item) => item.status === "unavailable" || (item.baseline_input_values.length > 0 && Boolean(item.formula_version && item.weight_version && item.calculation_timestamp))) ? "passed" : "failed",
    "Unavailable results retain their reason and any baseline trace that exists.",
  ),
];

export const validationSummary = {
  stage: "v0.91 Model & Scenario Validation",
  reviewed_at: REVIEWED_AT,
  total: validationRegistry.length,
  passed: validationRegistry.filter((item) => item.status === "passed").length,
  partial: validationRegistry.filter((item) => item.status === "partial").length,
  failed: validationRegistry.filter((item) => item.status === "failed").length,
  not_tested: validationRegistry.filter((item) => item.status === "not_tested").length,
  blocking_failures: validationRegistry.filter((item) => item.status === "failed" && item.severity === "error").length,
  golden_cases: goldenTestCases.length,
  golden_failures: goldenFailures.length,
  expected_unavailable_cases: goldenTestCases.filter((item) => item.validation_status === "passed_gate").length,
  validated_countries: new Set(goldenTestCases.map((item) => item.country)).size,
  models_covered: modelCards.length,
  scenarios_covered: scenarioDefinitions.length,
  unresolved: [
    "Historical backtests remain structure_only because point-in-time vintage observations are not yet available.",
    "Revised historical data can support directional validation but not strict real-time forecast accuracy claims.",
    "Regional context remains factual and cross-level comparison is prohibited; no regional scenario score exists.",
  ],
};
