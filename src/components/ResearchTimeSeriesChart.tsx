// Shared research time-series chart: explicit axes, round ticks, gridlines, unit titles, optional zero line,
// confidence bands, point markers, multiple series and an accessible title. Pure render (no state hooks), so it
// works in server rendering and in the SSR-based UI validators.

// --- Pure axis helpers: "nice" numeric ticks and collision-free calendar ticks -----------------------------

/** Round a raw step to 1, 2, 2.5 or 5 × 10^k. */
function niceStep(rawStep: number): number {
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / 10 ** exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}

/** 4–6 evenly spaced round ticks covering [min, max]; the returned domain is the outer tick range. */
export function niceTicks(min: number, max: number, target = 5): { ticks: number[]; domain: [number, number]; step: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { ticks: [0, 1], domain: [0, 1], step: 1 };
  if (min === max) {
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
    min -= pad;
    max += pad;
  }
  const step = niceStep((max - min) / Math.max(1, target - 1));
  const lower = Math.floor(min / step) * step;
  const upper = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = lower; value <= upper + step / 2; value += step) ticks.push(Number(value.toFixed(10)));
  return { ticks, domain: [lower, upper], step };
}

/** Fixed decimals for a tick step so labels are consistent (0.25 → 2, 0.5 → 1, 2.5 → 1, 5 → 0). */
export function tickDecimals(step: number): number {
  const exponent = Math.floor(Math.log10(step));
  const mantissa = Math.round((step / 10 ** exponent) * 10) / 10;
  return Math.max(0, -exponent + (mantissa === 2.5 ? 1 : 0));
}

export const monthIndex = (period: string) => Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1;
export const indexToPeriod = (index: number) => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;

/**
 * Calendar ticks for a monthly axis: January of every n-th year (n from 1, 2, 5, 10) or, for spans under
 * about two years, every 3 or 6 months, choosing the densest interval that keeps at most `maxLabels` labels.
 */
export function monthTicks(first: number, last: number, maxLabels = 8): { value: number; label: string }[] {
  const span = last - first;
  if (span < 24) {
    for (const step of [1, 3, 6, 12]) {
      const ticks: number[] = [];
      for (let value = Math.ceil(first / step) * step; value <= last; value += step) ticks.push(value);
      if (ticks.length <= maxLabels) return ticks.map((value) => ({ value, label: indexToPeriod(value) }));
    }
  }
  for (const years of [1, 2, 5, 10, 20]) {
    const ticks: number[] = [];
    const firstYear = Math.ceil(first / 12);
    for (let year = Math.ceil(firstYear / years) * years; year * 12 <= last; year += years) ticks.push(year * 12);
    if (ticks.length <= maxLabels && ticks.length > 0) return ticks.map((value) => ({ value, label: String(value / 12) }));
  }
  return [{ value: first, label: indexToPeriod(first) }, { value: last, label: indexToPeriod(last) }];
}

export interface ChartPoint { x: number | string; y: number | null }
export interface ChartBandPoint { x: number | string; lower: number; upper: number }
export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: ChartPoint[];
  /** SVG dash pattern; use line style (not only colour) to separate series. */
  dash?: string;
  width?: number; // 0 = points only (no connecting line), e.g. values that must not form a trend
  markers?: boolean;
  band?: ChartBandPoint[];
  bandOpacity?: number;
}

interface Props {
  title: string;
  description?: string;
  series: ChartSeries[];
  xKind: "month" | "number";
  xLabel?: string;
  yLabel: string;
  /** Draw a y = 0 reference line (auto: when 0 lies inside the data range). */
  zeroLine?: boolean | "auto";
  zeroDash?: string;
  includeZero?: boolean;
  xTickValues?: number[];
  latestMarker?: boolean;
  height?: number;
  legend?: boolean;
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  className?: string;
}

const WIDTH = 760;
const MARGIN = { top: 34, right: 22, bottom: 50, left: 66 };

export function ResearchTimeSeriesChart({ title, description, series, xKind, xLabel, yLabel, zeroLine = "auto", zeroDash = "5 4", includeZero = false, xTickValues, latestMarker = false, height = 300, legend = true, formatX, formatY, className }: Props) {
  const toX = (value: number | string) => (typeof value === "string" ? monthIndex(value) : value);
  const allX = series.flatMap((s) => s.points.map((p) => toX(p.x)));
  const allY = series.flatMap((s) => [...s.points.flatMap((p) => (p.y === null || !Number.isFinite(p.y) ? [] : [p.y])), ...(s.band ?? []).flatMap((b) => [b.lower, b.upper])]);
  if (!allX.length || !allY.length) return <p className="text-sm text-[var(--muted)]">没有可绘制的观测值（缺失值不会显示为 0）。</p>;
  const xMin = Math.min(...allX), xMax = Math.max(...allX);
  const yMinRaw = Math.min(...allY, ...(includeZero ? [0] : [])), yMaxRaw = Math.max(...allY, ...(includeZero ? [0] : []));
  const { ticks: yTicks, domain: [yLow, yHigh], step } = niceTicks(yMinRaw, yMaxRaw, 5);
  const plotW = WIDTH - MARGIN.left - MARGIN.right, plotH = height - MARGIN.top - MARGIN.bottom;
  const sx = (value: number) => MARGIN.left + (xMax === xMin ? plotW / 2 : ((value - xMin) / (xMax - xMin)) * plotW);
  const sy = (value: number) => MARGIN.top + (1 - (value - yLow) / (yHigh - yLow)) * plotH;
  const decimals = tickDecimals(step);
  // Same display rule as src/lib/format.ts (true minus sign), inlined because this file must stay import-free.
  const signed = (value: number, options: Intl.NumberFormatOptions) => { const text = Math.abs(value).toLocaleString("zh-CN", options); return value < 0 && Number(text.replace(/,/g, "")) !== 0 ? `−${text}` : text; };
  const fmtY = formatY ?? ((value: number) => signed(value, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
  // Observed values keep their own precision (tick rounding would show 5.75 as "6").
  const fmtValue = formatY ?? ((value: number) => signed(value, { maximumFractionDigits: Math.max(3, decimals) }));
  const xTicks = xKind === "month"
    ? monthTicks(xMin, xMax, 8)
    : (xTickValues ?? niceTicks(xMin, xMax, 6).ticks.filter((v) => v >= xMin && v <= xMax)).map((value) => ({ value, label: formatX ? formatX(value) : String(value) }));
  const showZero = zeroLine === true || (zeroLine === "auto" && yLow < 0 && yHigh > 0);
  const titleId = `chart-${series.map((s) => s.id).join("-")}-${title.length}`.replace(/[^A-Za-z0-9-]/g, "");
  const segments = (points: ChartPoint[]) => {
    const out: ChartPoint[][] = [];
    let current: ChartPoint[] = [];
    for (const point of points) {
      if (point.y === null || !Number.isFinite(point.y)) { if (current.length) out.push(current); current = []; } else current.push(point);
    }
    if (current.length) out.push(current);
    return out;
  };
  const latest = latestMarker && series[0] ? [...series[0].points].reverse().find((p) => p.y !== null) : undefined;
  return (
    <figure className={`research-chart ${className ?? ""}`}>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full min-w-[520px]" role="img" aria-labelledby={`${titleId}-title`} data-chart="research-time-series">
          <title id={`${titleId}-title`}>{title}</title>
          {description ? <desc>{description}</desc> : null}
          <text x={MARGIN.left} y={16} fontSize="12" fontWeight="600" fill="var(--muted)" data-axis-title="y">{yLabel}</text>
          {yTicks.map((tick) => (
            <g key={`y${tick}`} data-tick="y">
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={sy(tick)} y2={sy(tick)} stroke="var(--line)" strokeWidth="1" />
              <line x1={MARGIN.left - 5} x2={MARGIN.left} y1={sy(tick)} y2={sy(tick)} stroke="var(--muted)" strokeWidth="1" />
              <text x={MARGIN.left - 8} y={sy(tick) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{fmtY(tick)}</text>
            </g>
          ))}
          <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={MARGIN.top + plotH} stroke="var(--muted)" strokeWidth="1" data-axis="y" />
          <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH} stroke="var(--muted)" strokeWidth="1" data-axis="x" />
          {xTicks.map((tick) => (
            <g key={`x${tick.value}`} data-tick="x">
              <line x1={sx(tick.value)} x2={sx(tick.value)} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH + 5} stroke="var(--muted)" strokeWidth="1" />
              <text x={sx(tick.value)} y={MARGIN.top + plotH + 19} textAnchor="middle" fontSize="12" fill="var(--muted)">{tick.label}</text>
            </g>
          ))}
          {xLabel ? <text x={MARGIN.left + plotW / 2} y={height - 8} textAnchor="middle" fontSize="12" fill="var(--muted)" data-axis-title="x">{xLabel}</text> : null}
          {showZero ? <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={sy(0)} y2={sy(0)} stroke="var(--foreground)" strokeWidth="1.2" strokeDasharray={zeroDash} data-zero-line="true" /> : null}
          {series.map((s) => s.band?.length ? (
            <polygon key={`band-${s.id}`} fill={s.color} opacity={s.bandOpacity ?? 0.14} points={[...s.band.map((b) => `${sx(toX(b.x))},${sy(b.upper)}`), ...[...s.band].reverse().map((b) => `${sx(toX(b.x))},${sy(b.lower)}`)].join(" ")} />
          ) : null)}
          {series.filter((s) => s.width !== 0).map((s) => segments(s.points).map((segment, index) => (
            <polyline key={`line-${s.id}-${index}`} fill="none" stroke={s.color} strokeWidth={s.width ?? 2.2} strokeDasharray={s.dash} strokeLinejoin="round" points={segment.map((p) => `${sx(toX(p.x))},${sy(p.y as number)}`).join(" ")} />
          )))}
          {series.filter((s) => s.markers).map((s) => s.points.filter((p) => p.y !== null).map((p) => (
            <circle key={`m-${s.id}-${p.x}`} cx={sx(toX(p.x))} cy={sy(p.y as number)} r="2.6" fill={s.color}><title>{`${s.label} · ${typeof p.x === "string" ? p.x : formatX ? formatX(p.x) : p.x}：${fmtValue(p.y as number)}`}</title></circle>
          )))}
          {latest && series[0] ? (
            <g data-latest-marker="true">
              <circle cx={sx(toX(latest.x))} cy={sy(latest.y as number)} r="4.5" fill="var(--surface)" stroke={series[0].color} strokeWidth="2" />
              <text x={sx(toX(latest.x)) - 8} y={sy(latest.y as number) - 10} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--foreground)" stroke="var(--surface)" strokeWidth="4" paintOrder="stroke">{`${typeof latest.x === "string" ? latest.x : formatX ? formatX(latest.x) : latest.x}：${fmtValue(latest.y as number)}`}</text>
            </g>
          ) : null}
        </svg>
      </div>
      {legend ? (
        <figcaption className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--muted)]">
          {series.map((s) => (
            <span key={`legend-${s.id}`} className="inline-flex items-center gap-2">
              <svg width="28" height="10" aria-hidden="true">{s.width === 0 ? <circle cx="14" cy="5" r="3" fill={s.color} /> : <line x1="1" x2="27" y1="5" y2="5" stroke={s.color} style={{ strokeWidth: s.width ?? 2.2, strokeDasharray: s.dash }} />}</svg>
              <span className="text-[var(--foreground)]">{s.label}</span>
              {s.band?.length ? <span>（阴影为区间）</span> : null}
            </span>
          ))}
          {showZero ? <span className="inline-flex items-center gap-2"><svg width="28" height="10" aria-hidden="true"><line x1="1" x2="27" y1="5" y2="5" stroke="var(--foreground)" style={{ strokeWidth: 1.2, strokeDasharray: zeroDash }} /></svg>零值参考线</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
