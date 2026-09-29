// Shared number display rules: missing → "—" (never 0), negatives with a true minus sign (U+2212) so columns of
// tabular figures align, "%" and "‰" attached to the number, other units separated by one space.
export const MISSING = "—";

export function formatNumber(value: number | null | undefined, options: Intl.NumberFormatOptions = { maximumFractionDigits: 3 }): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return MISSING;
  const text = Math.abs(value).toLocaleString("zh-CN", options);
  return value < 0 && text !== "0" ? `−${text}` : text;
}

export function formatWithUnit(value: number | null | undefined, unit: string, options?: Intl.NumberFormatOptions): string {
  const number = formatNumber(value, options);
  if (number === MISSING || !unit) return number;
  return /^[%‰]/.test(unit) ? `${number}${unit}` : `${number} ${unit}`;
}
