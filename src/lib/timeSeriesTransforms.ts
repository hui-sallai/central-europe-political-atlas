import type { TimeSeriesTransformationSpec, TransformationId, TransformedPoint } from "@/types/MacroDynamics";
import type { HighFrequencyPoint } from "@/lib/eventWindowEngine";

export const TRANSFORM_REGISTRY_VERSION = "transformation-registry-v1.41";

/**
 * Transformation registry (v1.41). Index levels are never allowed into a
 * stationary VAR as raw levels; rate series may enter in level only after an
 * explicit stationarity test. The UI always shows the transformation actually
 * used — nothing is silently transformed.
 */
export const TIME_SERIES_TRANSFORMATION_REGISTRY: TimeSeriesTransformationSpec[] = [
  {
    indicator: "hicp_monthly_index",
    input_semantics: "index_level",
    allowed_transformations: ["log_difference", "log_difference_12"],
    default_transformation: "log_difference",
    output_semantics: "growth_rate",
    output_unit: "%（100×Δlog，月度通胀近似）",
    stationarity_note: "指数水平不允许直接进入 VAR；100×Δlog(HICP) 为月度通胀近似，12 个月对数差分为另一独立变换。",
  },
  {
    indicator: "hicp_annual_rate",
    input_semantics: "yoy_rate",
    allowed_transformations: ["level", "first_difference"],
    default_transformation: "level",
    output_semantics: "yoy_rate",
    output_unit: "%",
    stationarity_note: "百分比率不自动视为平稳：level 规格必须通过 ADF 检验，否则使用一阶差分。",
  },
  {
    indicator: "industrial_production_index",
    input_semantics: "index_level",
    allowed_transformations: ["log_difference", "log_difference_12"],
    default_transformation: "log_difference",
    output_semantics: "growth_rate",
    output_unit: "%（100×Δlog）",
    stationarity_note: "指数水平禁止直接进入平稳 VAR；默认 100×Δlog(IPI)，可选 12 个月对数增长。",
  },
  {
    indicator: "unemployment_rate_monthly",
    input_semantics: "rate_percent",
    allowed_transformations: ["level", "first_difference"],
    default_transformation: "level",
    output_semantics: "rate_percent",
    output_unit: "%",
    stationarity_note: "level 或一阶差分由 ADF 检验决定，不做静默变换；实际使用的变换必须展示。",
  },
];

export function transformationSpec(indicator: string): TimeSeriesTransformationSpec | null {
  return TIME_SERIES_TRANSFORMATION_REGISTRY.find((spec) => spec.indicator === indicator) ?? null;
}

export const transformationLabels: Record<TransformationId, string> = {
  level: "水平值（level）",
  first_difference: "一阶差分 · Δx",
  log_difference: "月度对数差分 · 100 × Δlog(x)",
  log_difference_12: "12个月对数变化 · 100 × [log(x_t)-log(x_t-12)]",
};

const LAG_BY_TRANSFORMATION: Record<TransformationId, number> = {
  level: 0,
  first_difference: 1,
  log_difference: 1,
  log_difference_12: 12,
};

function monthIndex(period: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  return year * 12 + month - 1;
}

/** Minimum raw observations needed before a transformed series can start. */
export function transformationLag(id: TransformationId): number {
  return LAG_BY_TRANSFORMATION[id];
}

/**
 * Applies a transformation to a raw monthly series with full trace: every
 * transformed point records the raw observation ids and raw values it used.
 * Missing raw values produce missing transformed values — never interpolated.
 */
export function applyTransformation(
  series: HighFrequencyPoint[],
  transformation: TransformationId,
): TransformedPoint[] {
  const sorted = [...series].sort((a, b) => a.period.localeCompare(b.period));
  const lag = LAG_BY_TRANSFORMATION[transformation];
  return sorted.map((point, index) => {
    const current = point.value;
    if (transformation === "level") {
      return {
        period: point.period,
        value: current,
        transformation,
        source_observation_ids: [point.observation_id],
        raw_values: [current],
      };
    }
    const candidate = index >= lag ? sorted[index - lag] : null;
    const currentMonth = monthIndex(point.period);
    const candidateMonth = candidate ? monthIndex(candidate.period) : null;
    const lagged = candidate && currentMonth !== null && candidateMonth !== null && currentMonth - candidateMonth === lag
      ? candidate
      : null;
    const laggedValue = lagged?.value ?? null;
    let value: number | null = null;
    if (current !== null && laggedValue !== null) {
      if (transformation === "first_difference") {
        value = current - laggedValue;
      } else if (current > 0 && laggedValue > 0) {
        value = 100 * (Math.log(current) - Math.log(laggedValue));
      }
    }
    return {
      period: point.period,
      value,
      transformation,
      source_observation_ids: lagged ? [point.observation_id, lagged.observation_id] : [point.observation_id],
      raw_values: [current, laggedValue],
    };
  });
}
