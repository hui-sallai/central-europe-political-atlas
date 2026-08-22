// Shared monthly-period helpers (YYYY-MM). Used by the high-frequency acquisition
// pipeline and by the validation suite so missing-month detection is tested against
// exactly the same logic that builds the coverage exports.

export function monthToIndex(period) {
  const [year, month] = period.split("-").map(Number);
  return year * 12 + (month - 1);
}

export function indexToMonth(index) {
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Inclusive month sequence from start to end (both YYYY-MM). */
export function monthSequence(start, end) {
  const startIndex = monthToIndex(start);
  const endIndex = monthToIndex(end);
  if (endIndex < startIndex) return [];
  const sequence = [];
  for (let index = startIndex; index <= endIndex; index += 1) sequence.push(indexToMonth(index));
  return sequence;
}

/**
 * Months in [start, end] for which the observation map has no non-null value.
 * A month absent from the map counts as missing — an API that simply omits a
 * row must not hide a gap.
 */
export function missingMonths(start, end, valueByPeriod) {
  return monthSequence(start, end).filter((period) => {
    const value = valueByPeriod.get(period);
    return value === undefined || value === null;
  });
}

/** Whole-month distance between two YYYY-MM periods. */
export function monthDistance(a, b) {
  return Math.abs(monthToIndex(a) - monthToIndex(b));
}
