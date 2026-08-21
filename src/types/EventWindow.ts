export type EventWindowGate = "full" | "exploratory" | "insufficient_data";

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
  absolute_change: number | null;
  percentage_change: number | null;
  pre_observations: number;
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
