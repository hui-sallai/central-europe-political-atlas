export type RegionalComparisonPoint = { value: number; year: string; unit: string; definition: string; classification: string; level: string; eligible: boolean };
/** Differences are descriptive and require the same admitted statistical frame. */
export function regionalDifference(reference: RegionalComparisonPoint | null, candidate: RegionalComparisonPoint | null) {
  if (!reference || !candidate || !reference.eligible || !candidate.eligible || ![reference.value,candidate.value].every(Number.isFinite)) return null;
  if (["year","unit","definition","classification","level"].some(k => !reference[k as keyof RegionalComparisonPoint] || reference[k as keyof RegionalComparisonPoint] !== candidate[k as keyof RegionalComparisonPoint])) return null;
  const absolute = candidate.value - reference.value;
  const percentagePoints = /%|percent|百分|百分点|\bpp\b/i.test(reference.unit);
  const relative = reference.value > 0 && candidate.value >= 0 && !percentagePoints && /EUR|PPS|person|人|欧元/i.test(reference.unit) ? 100 * absolute / reference.value : null;
  return { absolute, unit: percentagePoints ? "pp" : reference.unit, relative };
}
