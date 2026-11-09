/** Presentation only. Periods are calendar years or integer month indices; no values are imputed. */
export function observationAvailability(points: { period: number; value: number | null; status?: string }[], from?: number, to?: number) {
  const valid = points.filter(p => p.value !== null && Number.isFinite(p.value) && Number.isFinite(p.period));
  const periods = [...new Set(valid.map(p => p.period))].sort((a, b) => a - b);
  const first = periods[0] ?? null, last = periods.at(-1) ?? null;
  const start = from ?? first, end = to ?? last;
  const invalid = (start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end)) || (start !== null && end !== null && start > end);
  const present = new Set(periods), insideMissing: number[] = [];
  if (first !== null && last !== null) for (let p = first; p <= last; p++) if (!present.has(p)) insideMissing.push(p);
  const selected = start !== null && end !== null && start <= end ? periods.filter(p => p >= start && p <= end) : [];
  const outside = start === null || end === null || invalid ? null : first === null || last === null ? end - start + 1 : Math.max(0, Math.min(end, first - 1) - start + 1) + Math.max(0, end - Math.max(start, last + 1) + 1);
  return { first, last, count: periods.length, periods, insideMissing, selectedCount: selected.length, outside, invalid,
    pending: [...new Set(points.filter(p => p.value === null && /pending|待发布|待接入/.test(p.status ?? "")).map(p => p.period))],
    restrictions: [...new Set(points.map(p => p.status ?? "").filter(s => /break|incompat|definition_mismatch|non_comparable|not_applicable|restricted|not_admitted|断点|不可比|不适用|暂缓/.test(s)))] };
}
