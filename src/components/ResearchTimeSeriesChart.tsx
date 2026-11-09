"use client";
import { englishUnit } from "@/i18n/presentation";
import { englishText } from "@/i18n/reviewedText";
import { LocalizedContent } from "@/i18n/LocalizedContent";
import { useLocale } from "@/i18n/LocaleProvider";
import { localeNumber } from "@/i18n/config";
import { useState } from "react";
// Shared research time-series chart: explicit axes, round ticks, gridlines, unit titles, optional zero line,
// confidence bands, point markers, multiple series and an accessible title. Optional point interaction
// uses local presentation state only and remains compatible with SSR-based validators.

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

export interface ChartPoint { x: number | string; y: number | null; detail?: string; unit?: string; source?: string; sourceUrl?: string; status?: string; breakBefore?: boolean }
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
  interactive?: boolean;
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
  /** "group" when the interactive points must be reachable without nesting controls inside an image (axe nested-interactive). */
  containerRole?: "img" | "group";
}

const WIDTH = 760;
const MARGIN = { top: 34, right: 22, bottom: 50, left: 66 };

export function ResearchTimeSeriesChart(props: Props) {
  return props.interactive ? <InteractiveResearchTimeSeriesChart {...props} /> : <RenderedResearchTimeSeriesChart {...props} />;
}

function InteractiveResearchTimeSeriesChart(props: Props) {
  const locale = useLocale(), en = locale === "en";
  const [activePoint, setActivePoint] = useState<string | null>(null);
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  const periods = [...new Set(props.series.flatMap(s => s.points.map(p => p.x)))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true}));
  const ordinal = (x: number | string) => props.xKind === "month" ? monthIndex(String(x)) : Number(x);
  const within = (x: number | string) => (!from || ordinal(x) >= ordinal(from)) && (!to || ordinal(x) <= ordinal(to));
  const series = props.series.map(s => ({ ...s, markers: true, points: s.points.filter(p => within(p.x)), band: s.band?.filter(p => within(p.x)) }));
  const selection = series.some(s => s.points.some(p => `${s.id}:${p.x}` === activePoint && p.y !== null)) ? activePoint : null;
  return <LocalizedContent>{<div data-interactive-series className="min-w-0 max-w-full">
    {periods.length > 12 ? <fieldset className="mb-3 flex flex-wrap gap-3 text-xs"><legend className="font-semibold">{en ? "Chart period" : "图表时期"}</legend>{[[from,setFrom,en ? "From" : "起始"],[to,setTo,en ? "To" : "结束"]].map(([value,set,label]) => <label key={label as string}>{label as string}<select className="field-control ml-2" value={value as string} onChange={e => (set as (v:string)=>void)(e.target.value)}><option value="">{en ? "All" : "全部"}</option>{periods.map(p => <option key={p} value={p}>{p}</option>)}</select></label>)}</fieldset> : null}
    <label className="mb-3 block text-xs font-semibold">{en ? "Inspect a value" : "查看数值点"}<select className="field-control mt-2 min-w-0 max-w-full" value={selection ?? ""} onChange={e => setActivePoint(e.target.value)}><option value="">{en ? "Choose a period and series" : "选择时期与序列"}</option>{series.map(s => <optgroup key={s.id} label={s.label}>{s.points.filter(p=>p.y !== null).map(p=><option key={p.x} value={`${s.id}:${p.x}`}>{s.label} · {p.x}</option>)}</optgroup>)}</select></label>
    <RenderedResearchTimeSeriesChart {...props} series={series} containerRole="group" activePoint={selection} setActivePoint={setActivePoint} />
    <p className="text-xs text-[var(--muted)]">{en ? "Hover or tap a point. Use Tab, then arrow keys to inspect values. Gaps and recorded breaks are not connected." : "悬停或点按观测点；按 Tab 后使用方向键逐点查看。缺失时期和已记录断点不连线。"}</p>
    <details className="mt-3 min-w-0 max-w-full text-xs" data-chart-table><summary className="cursor-pointer font-semibold">{en ? "Exact values and sources" : "精确数值与来源"}</summary><div className="data-table-viewport mt-2" tabIndex={0} role="region" aria-label={en ? "Chart values (scrollable)" : "图表数值（可滚动）"}><table data-chart-observations className="research-data-table w-full min-w-[480px] text-left"><caption className="text-left">{props.title}</caption><thead><tr>{(en ? ["Series","Period","Value","Unit","Status / definition","Source"] : ["序列","时期","数值","单位","状态／定义","来源"]).map(h => <th scope="col" className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{series.flatMap(s => s.points.map((p,i) => <tr key={`${s.id}:${i}`}><th scope="row" className="p-2 font-normal">{s.label}</th><td className="p-2">{p.x}</td><td className="p-2 metric-number">{p.y === null ? "—" : p.y.toLocaleString(locale,{maximumFractionDigits:20})}</td><td className="p-2">{en ? englishUnit(p.unit ?? props.yLabel) : p.unit ?? props.yLabel}</td><td className="p-2">{en ? englishText(p.status ?? p.detail ?? (p.y === null ? "Missing value" : "Status not recorded")) : p.status ?? p.detail ?? (p.y === null ? "缺失值" : "未记录状态")}</td><td className="p-2">{p.sourceUrl ? <a className="underline text-[var(--accent)]" href={p.sourceUrl}><span lang={en && /[㐀-鿿]/u.test(p.source ?? "") ? "zh-CN" : undefined} data-original-language={en && /[㐀-鿿]/u.test(p.source ?? "") ? "zh-CN" : undefined}>{p.source ?? p.sourceUrl}</span></a> : <span lang={en && /[㐀-鿿]/u.test(p.source ?? "") ? "zh-CN" : undefined} data-original-language={en && /[㐀-鿿]/u.test(p.source ?? "") ? "zh-CN" : undefined}>{p.source ?? "—"}</span>}</td></tr>))}</tbody></table></div></details>
  </div>}</LocalizedContent>;
}

// Non-interactive research charts remain stateless, including frozen-output SSR validation.
function RenderedResearchTimeSeriesChart({ title, description, series, xKind, xLabel, yLabel, zeroLine = "auto", zeroDash = "5 4", includeZero = false, xTickValues, latestMarker = false, height = 300, legend = true, formatX, formatY, className, containerRole = "img", interactive = false, activePoint = null, setActivePoint = () => {} }: Props & { activePoint?: string | null; setActivePoint?: (value: string) => void }) {
  const locale = useLocale();
  const toX = (value: number | string) => (typeof value === "string" ? monthIndex(value) : value);
  const allX = series.flatMap((s) => s.points.map((p) => toX(p.x)));
  const allY = series.flatMap((s) => [...s.points.flatMap((p) => (p.y === null || !Number.isFinite(p.y) ? [] : [p.y])), ...(s.band ?? []).flatMap((b) => [b.lower, b.upper])]);
  if (!allX.length || !allY.length) return <LocalizedContent>{<p className="text-sm text-[var(--muted)]">没有可绘制的观测值（缺失值不会显示为 0）。</p>}</LocalizedContent>;
  const xMin = Math.min(...allX), xMax = Math.max(...allX);
  const yMinRaw = Math.min(...allY, ...(includeZero ? [0] : [])), yMaxRaw = Math.max(...allY, ...(includeZero ? [0] : []));
  const { ticks: yTicks, domain: [yLow, yHigh], step } = niceTicks(yMinRaw, yMaxRaw, 5);
  const plotW = WIDTH - MARGIN.left - MARGIN.right, plotH = height - MARGIN.top - MARGIN.bottom;
  const sx = (value: number) => MARGIN.left + (xMax === xMin ? plotW / 2 : ((value - xMin) / (xMax - xMin)) * plotW);
  const sy = (value: number) => MARGIN.top + (1 - (value - yLow) / (yHigh - yLow)) * plotH;
  const decimals = tickDecimals(step);
  // Locale affects display only, never chart coordinates or numerical inference.
  const signed = (value: number, options: Intl.NumberFormatOptions) => localeNumber(value, locale, options);
  const fmtY = formatY ?? ((value: number) => signed(value, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
  // Observed values keep their own precision (tick rounding would show 5.75 as "6").
  const fmtValue = interactive ? (value: number) => signed(value, { maximumFractionDigits: 20 }) : formatY ?? ((value: number) => signed(value, { maximumFractionDigits: Math.max(3, decimals) }));
  const xTicks = xKind === "month"
    ? monthTicks(xMin, xMax, 8)
    : (xTickValues ?? niceTicks(xMin, xMax, 6).ticks.filter((v) => v >= xMin && v <= xMax)).map((value) => ({ value, label: formatX ? formatX(value) : String(value) }));
  const showZero = zeroLine === true || (zeroLine === "auto" && yLow < 0 && yHigh > 0);
  const titleId = `chart-${series.map((s) => s.id).join("-")}-${title.length}`.replace(/[^A-Za-z0-9-]/g, "");
  const segments = (points: ChartPoint[]) => {
    let previous: number | null = null;
    const out: ChartPoint[][] = [];
    let current: ChartPoint[] = [];
    for (const point of points) {
      const x = toX(point.x);
      if (interactive && (point.breakBefore || (previous !== null && x - previous > 1))) { if (current.length) out.push(current); current = []; }
      previous = x;
      if (point.y === null || !Number.isFinite(point.y)) { if (current.length) out.push(current); current = []; } else current.push(point);
    }
    if (current.length) out.push(current);
    return out;
  };
  const latest = latestMarker && series[0] ? [...series[0].points].reverse().find((p) => p.y !== null) : undefined;
  return (
    <LocalizedContent>{<figure className={`research-chart min-w-0 ${className ?? ""}`}>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      {description ? <p className="mb-3 text-xs leading-6 text-[var(--muted)]">{description}</p> : null}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${title}（图表，可横向滚动）`}>
        <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full min-w-[520px]" role={containerRole} aria-labelledby={`${titleId}-title`} data-chart="research-time-series">
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
          {series.filter((s) => s.markers || interactive).map((s) => s.points.filter((p) => p.y !== null).map((p) => (
            <circle key={`m-${s.id}-${p.x}`} cx={sx(toX(p.x))} cy={sy(p.y as number)} r={interactive ? 5 : 2.6} fill={s.color} tabIndex={interactive ? (activePoint === `${s.id}:${p.x}` || (!activePoint && s === series.find(s => s.points.some(p => p.y !== null)) && p === s.points.find(p => p.y !== null)) ? 0 : -1) : undefined} role={interactive ? "button" : undefined} aria-label={`${s.label} · ${p.x}: ${fmtValue(p.y as number)} ${p.unit ?? yLabel} · ${p.status ?? ""} · ${p.detail ?? ""} · ${p.source ?? ""}`} onMouseEnter={interactive ? () => setActivePoint(`${s.id}:${p.x}`) : undefined} onFocus={interactive ? () => setActivePoint(`${s.id}:${p.x}`) : undefined} onClick={interactive ? () => setActivePoint(`${s.id}:${p.x}`) : undefined} onKeyDown={interactive ? e => { if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) { e.preventDefault(); const points = [...e.currentTarget.ownerSVGElement!.querySelectorAll<SVGCircleElement>('circle[role="button"]')]; const index = points.indexOf(e.currentTarget); points[(index + (["ArrowLeft","ArrowUp"].includes(e.key) ? -1 : 1) + points.length) % points.length]?.focus(); } if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActivePoint(`${s.id}:${p.x}`); } } : undefined}><title>{`${s.label} · ${typeof p.x === "string" ? p.x : formatX ? formatX(p.x) : p.x}：${fmtValue(p.y as number)} ${p.detail ?? ""}`}</title></circle>
          )))}
          {latest && series[0] ? (
            <g data-latest-marker="true">
              <circle cx={sx(toX(latest.x))} cy={sy(latest.y as number)} r="4.5" fill="var(--surface)" stroke={series[0].color} strokeWidth="2" />
              <text x={sx(toX(latest.x)) - 8} y={sy(latest.y as number) - 10} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--foreground)" stroke="var(--surface)" strokeWidth="4" paintOrder="stroke">{`${typeof latest.x === "string" ? latest.x : formatX ? formatX(latest.x) : latest.x}：${fmtValue(latest.y as number)}`}</text>
            </g>
          ) : null}
        </svg>
      </div>
      {interactive ? <div className="mt-2 min-h-10 break-words text-sm" aria-live="polite">{series.flatMap(s => s.points.filter(p => `${s.id}:${p.x}` === activePoint && p.y !== null).map(p => <p key={`${s.id}:${p.x}`}>{s.label} · {String(p.x)}: {fmtValue(p.y as number)} · {p.unit ?? yLabel} · {p.status ?? ""} · {p.detail ?? ""} · {p.source ?? ""}</p>))}</div> : null}
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
    </figure>}</LocalizedContent>
  );
}
