import type { Event } from "@/types/Event";
import type {
  EventChangeSemantics,
  EventEligibility,
  EventWindowGate,
  EventWindowOverlap,
  EventWindowPoint,
  EventWindowResult,
  ValueSemantics,
} from "@/types/EventWindow";
import { EVENT_WINDOW_BOUNDARY } from "@/types/EventWindow";

export interface HighFrequencyPoint {
  observation_id: string;
  country: string;
  period: string;
  indicator: string;
  value: number | null;
  transformation?: string;
  unit?: string;
  value_semantics?: ValueSemantics;
  seasonal_adjustment?: string;
  definition_version?: string;
}

const MONTH_PRECISION = /^\d{4}-\d{2}/;

/**
 * Event Window Analysis eligibility (descriptive level-1 analysis only):
 * the event must be verified and its date must carry at least month precision.
 */
export function eventWindowEligibility(event: Event): EventEligibility {
  if (event.data_status !== "verified") {
    return { eligible: false, reason: "事件未通过核验（data_status ≠ verified），不能进入事件窗口分析。" };
  }
  if (!MONTH_PRECISION.test(event.date)) {
    return { eligible: false, reason: "事件日期精度不足：需要至少精确到月份（YYYY-MM）。" };
  }
  return { eligible: true, reason: null };
}

function shiftPeriod(period: string, months: number) {
  const [year, month] = period.split("-").map(Number);
  const total = year * 12 + (month - 1) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

const FULL_GATE = { pre: 12, post: 6 } as const;
const EXPLORATORY_GATE = { pre: 6, post: 3 } as const;

/** Rate-like series report changes in percentage points and never as relative %. */
const RATE_SEMANTICS: ReadonlySet<ValueSemantics> = new Set(["rate_percent", "rate_percentage_point", "growth_rate", "yoy_rate"]);

function resolveValueSemantics(series: HighFrequencyPoint[]): ValueSemantics | null {
  const explicit = series.find((point) => point.value_semantics)?.value_semantics;
  if (explicit) return explicit;
  // Backward-compatible derivation for callers that only carry `transformation`.
  if (series[0]?.transformation === "yoy_rate") return "yoy_rate";
  if (series[0]?.transformation === "level") return series[0]?.unit === "%" ? "rate_percent" : "index_level";
  return null;
}

function resolveChangeSemantics(valueSemantics: ValueSemantics | null): EventChangeSemantics {
  if (valueSemantics && RATE_SEMANTICS.has(valueSemantics)) return "percentage_points";
  if (valueSemantics === "index_level") return "index_points";
  if (valueSemantics === "currency_level") return "absolute_units";
  return "absolute_units";
}

/**
 * Descriptive event window computation. Period separation is strict:
 * PRE = relative_month < 0, EVENT = relative_month === 0, POST = relative_month > 0.
 * The event month is reported separately (event_period_value) and is never mixed
 * into the post mean or the post observation count. Reports change magnitudes
 * only — no causal language, no effect estimates. Relative percentage change is
 * reported only for level series with a non-zero base; rate series report
 * percentage-point changes exclusively.
 */
export function computeEventWindow(
  event: Event,
  series: HighFrequencyPoint[],
  options: { preMonths?: number; postMonths?: number } = {},
): EventWindowResult {
  const preMonths = options.preMonths ?? 12;
  const postMonths = options.postMonths ?? 12;
  const eventPeriod = event.date.slice(0, 7);

  const byPeriod = new Map(series.filter((item) => item.country === event.country_slug).map((item) => [item.period, item]));
  const points: EventWindowPoint[] = [];
  const missing: string[] = [];
  const trace: string[] = [];
  for (let offset = -preMonths; offset <= postMonths; offset += 1) {
    const period = shiftPeriod(eventPeriod, offset);
    const observation = byPeriod.get(period);
    const value = observation && observation.value !== null ? observation.value : null;
    if (value === null) missing.push(period);
    else if (observation) trace.push(observation.observation_id);
    points.push({ period, relative_month: offset, value });
  }

  const preValues = points.filter((point) => point.relative_month < 0 && point.value !== null).map((point) => point.value as number);
  const postValues = points.filter((point) => point.relative_month > 0 && point.value !== null).map((point) => point.value as number);
  const eventPoint = points.find((point) => point.relative_month === 0);

  const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const preMean = mean(preValues);
  const postMean = mean(postValues);
  const eventValue = eventPoint?.value ?? null;
  const absoluteChange = preMean !== null && postMean !== null ? postMean - preMean : null;
  const eventVsPre = preMean !== null && eventValue !== null ? eventValue - preMean : null;

  const valueSemantics = resolveValueSemantics(series);
  const changeSemantics = resolveChangeSemantics(valueSemantics);
  const isLevelSeries = changeSemantics === "index_points" || changeSemantics === "absolute_units";
  const relativePercentageChange = absoluteChange !== null && preMean !== null && preMean !== 0 && isLevelSeries
    ? (absoluteChange / Math.abs(preMean)) * 100
    : null;

  let gate: EventWindowGate = "full";
  if (preValues.length < FULL_GATE.pre || postValues.length < FULL_GATE.post) {
    gate = preValues.length >= EXPLORATORY_GATE.pre && postValues.length >= EXPLORATORY_GATE.post ? "exploratory" : "insufficient_data";
  }

  const overlapping: EventWindowOverlap[] = [];
  const completeness = points.filter((point) => point.value !== null).length / points.length;

  return {
    event_id: event.event_id,
    event_title: event.title,
    event_date: event.date,
    event_period: eventPeriod,
    country: event.country_slug,
    outcome: series[0]?.indicator ?? "",
    window: { pre_months: preMonths, post_months: postMonths },
    gate,
    exploratory: gate === "exploratory",
    points,
    pre_period_mean: preMean === null ? null : Number(preMean.toFixed(4)),
    event_period_value: eventValue,
    post_period_mean: postMean === null ? null : Number(postMean.toFixed(4)),
    absolute_change_pre_to_post: absoluteChange === null ? null : Number(absoluteChange.toFixed(4)),
    event_vs_pre_difference: eventVsPre === null ? null : Number(eventVsPre.toFixed(4)),
    relative_percentage_change: relativePercentageChange === null ? null : Number(relativePercentageChange.toFixed(2)),
    change_semantics: changeSemantics,
    value_semantics: valueSemantics,
    unit: series[0]?.unit ?? null,
    pre_observations: preValues.length,
    post_observations: postValues.length,
    expected_periods: points.length,
    missing_periods: missing,
    data_completeness: Number((completeness * 100).toFixed(1)),
    overlapping_events: overlapping,
    overlapping_event_warning: null,
    data_trace: trace,
    interpretation_boundary: EVENT_WINDOW_BOUNDARY,
  };
}

/**
 * Splits window points into consecutive non-null segments for chart rendering.
 * A missing month breaks the line — the chart must never interpolate across gaps.
 */
export function buildLineSegments(points: EventWindowPoint[]): Array<Array<{ index: number; period: string; value: number }>> {
  const segments: Array<Array<{ index: number; period: string; value: number }>> = [];
  let current: Array<{ index: number; period: string; value: number }> = [];
  points.forEach((point, index) => {
    if (point.value === null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push({ index, period: point.period, value: point.value });
  });
  if (current.length) segments.push(current);
  return segments;
}

/** Fills in overlapping verified events inside the computed window (same country). */
export function attachOverlappingEvents(result: EventWindowResult, events: Event[]): EventWindowResult {
  const windowStart = result.points[0]?.period ?? result.event_period;
  const windowEnd = result.points.at(-1)?.period ?? result.event_period;
  const overlapping = events
    .filter((candidate) => candidate.event_id !== result.event_id
      && candidate.country_slug === result.country
      && candidate.data_status === "verified"
      && MONTH_PRECISION.test(candidate.date)
      && candidate.date.slice(0, 7) >= windowStart
      && candidate.date.slice(0, 7) <= windowEnd)
    .map((candidate) => ({ event_id: candidate.event_id, date: candidate.date, event_type: candidate.event_type, title: candidate.title }));
  return {
    ...result,
    overlapping_events: overlapping,
    overlapping_event_warning: overlapping.length
      ? "该时间窗口内存在同期其他已核验事件，不能把观察到的变化归因于单一事件。"
      : null,
  };
}

const OUTCOME_SUGGESTIONS: Record<string, string[]> = {
  energy: ["hicp_annual_rate", "industrial_production_index"],
  macro: ["hicp_annual_rate", "industrial_production_index", "unemployment_rate_monthly"],
  fiscal: ["hicp_annual_rate", "industrial_production_index"],
  EU_funds: ["industrial_production_index", "unemployment_rate_monthly"],
  industrial_policy: ["industrial_production_index", "unemployment_rate_monthly"],
  FDI: ["industrial_production_index", "unemployment_rate_monthly"],
  China: ["industrial_production_index", "hicp_annual_rate"],
  election: ["hicp_annual_rate", "unemployment_rate_monthly"],
  regional: ["industrial_production_index"],
};

/** Navigation-only outcome suggestions; they never define a causal chain. */
export function suggestedOutcomes(eventType: string): string[] {
  return OUTCOME_SUGGESTIONS[eventType] ?? ["hicp_annual_rate", "industrial_production_index", "unemployment_rate_monthly"];
}
