// Server-only context for the comparative research case: the two transparent pressure models, evaluated by the models' own
// code for each admitted election's last complete year, and the same fixed formula applied to inputs a dated release showed
// before polling day. Neither measures voting intention. A year without the model's own inputs stays unavailable; values from
// the 2000-2020 history layer are never fed into the model to reconstruct a score the model did not produce.
import countriesJson from "@/data/countries/countries.json";
import type { Country, DataEnvelope } from "@/types/researchData";
import { calculateModelOutputForYear, modelCards, normalizeModelInput } from "./modelFramework";
import { electionPeriods, publishedBeforeElection, type ElectionMacroIndicator } from "./electionMacroLinkage";
import type { PoliticalElectionView } from "./politicalExplorer";

export const CASE_MODEL_IDS = ["household_economic_pressure", "fiscal_pressure"] as const;
export type CaseModelId = typeof CASE_MODEL_IDS[number];
export type CaseModelInput = { indicator: string; year: number; value: number; normalized: number; weight: number; contribution: number; observationId: string; sourceUrl: string };
export type CaseModelReleasedInput = { indicator: string; period: string; frequency: string; value: number; normalized: number | null; weight: number; publishedOn: string; sourceUrl: string; flashEstimate: boolean };
export type CaseModelReleased = {
  status: "calculated" | "not_available";
  reason: "first_release_dates_not_recorded" | "input_release_not_documented" | "released_input_not_annual" | "released_inputs_different_periods" | null;
  score: number | null; period: string | null; samePeriodAsModelYear: boolean | null; inputs: CaseModelReleasedInput[];
};
export type CaseModelObservation = {
  electionId: string; country: string; modelId: CaseModelId; modelVersion: string; formulaVersion: string; weightVersion: string; weights: Record<string, number>;
  inputYear: number; score: number | null; availability: string; reason: "model_inputs_not_held_for_year" | null; inputs: CaseModelInput[]; released: CaseModelReleased;
};

const countries = (countriesJson as unknown as DataEnvelope<Country>).records;
const PILOT_REASON = "first_release_dates_not_recorded";

/** The model's own rule: each contribution rounded to one decimal, their sum divided by the weight held, rounded to one decimal. */
function scoreFrom(contributions: number[], weight: number) { return Number((contributions.reduce((s, v) => s + v, 0) / weight).toFixed(1)); }

export function researchCaseModelContext(elections: PoliticalElectionView[]): CaseModelObservation[] {
  return elections.flatMap((election) => {
    const country = countries.find((c) => c.slug === (election.country ?? "germany"));
    if (!country) return [];
    const inputYear = Number(electionPeriods(election.date).lastComplete);
    return CASE_MODEL_IDS.map((modelId): CaseModelObservation => {
      const card = modelCards.find((c) => c.model_id === modelId)!;
      const out = calculateModelOutputForYear(country, card, inputYear);
      const inputs = out.inputs.map((i) => ({ indicator: i.indicator_id, year: i.year, value: i.raw_value, normalized: i.normalized_score, weight: i.weight, contribution: i.weighted_contribution, observationId: i.observation_id, sourceUrl: i.source_url }));
      const releasedInputs = card.inputs.map((input) => ({ input, released: publishedBeforeElection(election, input.indicator_id as ElectionMacroIndicator, []) }));
      let released: CaseModelReleased;
      if (releasedInputs.some((r) => r.released.status !== "documented")) {
        const unrecorded = releasedInputs.some((r) => r.released.status !== "documented" && r.released.reason === PILOT_REASON);
        released = { status: "not_available", reason: unrecorded ? PILOT_REASON : "input_release_not_documented", score: null, period: null, samePeriodAsModelYear: null, inputs: [] };
      } else {
        const rows = releasedInputs.map(({ input, released: r }) => {
          const d = r as Extract<typeof r, { status: "documented" }>;
          const normalized = d.frequency === "annual" ? normalizeModelInput(d.value, input) : null;
          return { indicator: input.indicator_id, period: d.period, frequency: d.frequency, value: d.value, normalized: normalized === null ? null : Number(normalized.toFixed(1)), weight: input.weight, publishedOn: d.publishedOn, sourceUrl: d.sourceUrl, flashEstimate: d.flashEstimate, raw: normalized };
        });
        const clean = rows.map(({ raw, ...rest }) => { void raw; return rest; });
        if (rows.some((r) => r.frequency !== "annual")) released = { status: "not_available", reason: "released_input_not_annual", score: null, period: null, samePeriodAsModelYear: null, inputs: clean };
        else if (new Set(rows.map((r) => r.period)).size > 1) released = { status: "not_available", reason: "released_inputs_different_periods", score: null, period: null, samePeriodAsModelYear: null, inputs: clean };
        else released = { status: "calculated", reason: null, score: scoreFrom(rows.map((r) => Number((r.raw! * r.weight).toFixed(1))), rows.reduce((s, r) => s + r.weight, 0)), period: rows[0].period, samePeriodAsModelYear: rows[0].period === String(inputYear), inputs: clean };
      }
      return {
        electionId: election.electionId, country: country.slug, modelId, modelVersion: card.model_version, formulaVersion: card.formula_version, weightVersion: card.weight_version,
        weights: Object.fromEntries(card.inputs.map((i) => [i.indicator_id, i.weight])), inputYear, score: out.score, availability: out.availability,
        reason: out.score === null ? "model_inputs_not_held_for_year" : null, inputs, released,
      };
    });
  });
}
