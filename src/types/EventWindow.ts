export type EventWindowGate = "full" | "exploratory" | "insufficient_data";

/** Mathematical meaning of a series value — drives how changes are reported. */
export type ValueSemantics =
  | "index_level"
  | "rate_percent"
  | "rate_percentage_point"
  | "currency_level"
  | "growth_rate"
  | "yoy_rate";

/** How the pre-to-post change must be worded. The UI reads this field; it never guesses. */
export type EventChangeSemantics =
  | "percentage_points"
  | "relative_percent"
  | "index_points"
  | "absolute_units";

export interface EventWindowPoint {
  period: string;
  relative_month: number;
  value: number | null;
}

export interface EventWindowOverlap {
  event_id: string;
  date: string;
  event_type: string;
  title: string;
}

export interface EventWindowResult {
  event_id: string;
  event_title: string;
  event_date: string;
  event_period: string;
  country: string;
  outcome: string;
  window: { pre_months: number; post_months: number };
  gate: EventWindowGate;
  exploratory: boolean;
  points: EventWindowPoint[];
  pre_period_mean: number | null;
  event_period_value: number | null;
  post_period_mean: number | null;
  /** post_period_mean − pre_period_mean. Event month is never included in either side. */
  absolute_change_pre_to_post: number | null;
  /** event_period_value − pre_period_mean, when both exist. */
  event_vs_pre_difference: number | null;
  /** Relative change in percent — level series only, never reported for rate series. */
  relative_percentage_change: number | null;
  change_semantics: EventChangeSemantics;
  value_semantics: ValueSemantics | null;
  unit: string | null;
  pre_observations: number;
  /** True post-event observations only (relative_month > 0); the event month never counts. */
  post_observations: number;
  expected_periods: number;
  missing_periods: string[];
  data_completeness: number;
  overlapping_events: EventWindowOverlap[];
  overlapping_event_warning: string | null;
  data_trace: string[];
  interpretation_boundary: string;
}

export interface EventEligibility {
  eligible: boolean;
  reason: string | null;
}

export const EVENT_WINDOW_BOUNDARY = "事件窗口分析只描述事件时间附近的指标变化，不识别因果关系；观察到的变化不能归因于单一事件。";
