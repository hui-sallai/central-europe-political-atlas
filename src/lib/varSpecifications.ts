import type {
  TransformationId,
  VarComparabilitySignature,
  VarSpecificationProfile,
} from "@/types/MacroDynamics";

export const BASELINE_VAR_PROFILE: VarSpecificationProfile = {
  profile_id: "baseline_monthly_macro_v1",
  profile_kind: "baseline_prespecified",
  name: "月度宏观预设基准规格",
  variables: [
    { role: "inflation", indicator: "hicp_monthly_index", transformation: "log_difference" },
    { role: "industrial_production", indicator: "industrial_production_index", transformation: "log_difference" },
    { role: "labour", indicator: "unemployment_rate_monthly", transformation: "level" },
  ],
  deterministic_terms: "constant",
  sample_policy: {
    frequency: "monthly",
    start_period: "2015-01",
    end_policy: "latest_country_observation",
    minimum_effective_observations: 60,
    contiguous_months_required: true,
  },
  lag_policy: {
    criterion: "bic",
    max_lag: 12,
    parameter_ratio_minimum: 4,
    common_sample: true,
  },
  fallback_policy: "none",
  interpretation_boundary: "预设规格不根据单个国家的 ADF 结果改变经济定义；任一变量未通过正式平稳性门时，该国 baseline 不具备动态响应资格。",
};

export const EXPLORATORY_TRANSFORMATION_CHAINS: Array<{
  role: string;
  chain: Array<{ indicator: string; transformation: TransformationId }>;
}> = [
  {
    role: "inflation",
    chain: [
      { indicator: "hicp_monthly_index", transformation: "log_difference" },
      { indicator: "hicp_monthly_index", transformation: "log_difference_12" },
      { indicator: "hicp_annual_rate", transformation: "level" },
      { indicator: "hicp_annual_rate", transformation: "first_difference" },
    ],
  },
  {
    role: "industrial_production",
    chain: [
      { indicator: "industrial_production_index", transformation: "log_difference" },
      { indicator: "industrial_production_index", transformation: "log_difference_12" },
    ],
  },
  {
    role: "labour",
    chain: [
      { indicator: "unemployment_rate_monthly", transformation: "level" },
      { indicator: "unemployment_rate_monthly", transformation: "first_difference" },
    ],
  },
];

export const EXPLORATORY_VAR_PROFILE: VarSpecificationProfile = {
  ...BASELINE_VAR_PROFILE,
  profile_id: "exploratory_monthly_macro_fallback_v1",
  profile_kind: "exploratory_search_policy",
  name: "月度宏观探索性变换搜索",
  fallback_policy: "documented_exploratory_chain",
  interpretation_boundary: "按预先登记的 fallback chain 进行探索性规格搜索；每次 ADF 尝试、变换改变及选择原因均须记录，结果不得冒充 baseline。",
};

export const VAR_SPECIFICATION_PROFILES = [BASELINE_VAR_PROFILE, EXPLORATORY_VAR_PROFILE] as const;

export function profileVariables(profile: VarSpecificationProfile) {
  return profile.variables.map(({ indicator, transformation }) => ({ indicator, transformation }));
}

export function createVarComparabilitySignature(
  variables: Array<{ indicator: string; transformation: TransformationId }>,
): VarComparabilitySignature {
  const lagPolicy = "common_sample_bic_requested_max12_parameter_ratio4";
  const samplePolicy = "monthly_contiguous_from_2015-01_to_latest_country_observation";
  const variableToken = variables.map((item) => `${item.indicator}:${item.transformation}`).join("__");
  return {
    variables: variables.map((item) => item.indicator),
    transformations: variables.map((item) => item.transformation),
    frequency: "monthly",
    deterministic_terms: "constant",
    lag_policy: lagPolicy,
    sample_policy: samplePolicy,
    signature_id: `varcmp-v1.41__${variableToken}__constant__${lagPolicy}__${samplePolicy}`,
  };
}
