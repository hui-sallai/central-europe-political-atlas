/**
 * Central UI language registry (v1.3). Chinese is the primary interaction language;
 * English is kept for the brand name, standard method names, statistical abbreviations,
 * dataset names, source names and technical identifiers. Internal enums stay in English
 * in data and exports; every user-facing surface must map through this registry.
 */

export const navigationLabels = {
  overview: "总览",
  countries: "国家",
  data: "数据",
  analysis: "分析",
  scenarios: "情景",
  events: "事件",
  map: "地图",
  research: "研究方法",
} as const;

export const actionLabels = {
  runAnalysis: "运行分析",
  runPanel: "运行面板模型",
  runNetwork: "运行贸易网络分析",
  runScenario: "运行情景分析",
  runEventWindow: "运行事件窗口分析",
  compareCountries: "国家比较",
  addCompareCountry: "添加对比国家",
  viewCountryProfile: "查看国家档案",
  viewRelatedEvents: "查看相关事件",
  openFullMap: "打开完整地图",
  viewMethodology: "查看方法说明",
  viewInputData: "查看输入数据",
  analyzeEvent: "分析此事件",
  viewModel: "查看分析",
  viewMap: "查看区域地图",
  runVar: "运行 VAR 模型",
  loadRegisteredVarSpec: "载入正式 baseline",
  loadExploratoryVarSpec: "载入探索性规格",
  moveVariableUp: "上移",
  moveVariableDown: "下移",
  viewRawData: "查看原始数据",
  viewTransformedData: "查看变换后数据",
} as const;

export const varLabels = {
  workbenchTitle: "简化式 VAR（Reduced-form VAR）",
  workbenchKicker: "宏观时间序列 · 单国月度模型",
  variables: "变量（2–4 个）",
  transformation: "变换方式",
  icCriterion: "滞后选择准则",
  maxLag: "最大滞后",
  startPeriod: "开始月份",
  endPeriod: "结束月份",
  readinessTitle: "运行前数据状态",
  registeredSpecification: "登记规格",
  effectiveObservations: "有效观测",
  missingRatio: "缺失比例",
  stationarity: "平稳性",
  maxAllowedLag: "最大允许滞后",
  readinessStates: {
    estimable: "VAR 可估计",
    estimable_with_warning: "VAR 可估计（平稳性提示）",
    dynamic_response_ready: "动态响应可用",
    insufficient_observations: "观测不足",
    missing_data: "数据缺失",
    non_stationary: "非平稳",
    unstable: "模型不稳定",
    residual_diagnostics_failed: "VAR 可估计；动态响应暂不可用",
    unsupported_specification: "规格不支持",
    singular: "变量共线",
  },
  resultTabs: { results: "结果", irf: "动态响应", diagnostics: "诊断", inputData: "输入数据", method: "方法" },
  specification: "模型规格",
  sampleWindow: "样本窗口",
  selectedLag: "选定滞后",
  informationCriteria: "信息准则",
  stabilityCheck: "稳定性",
  stable: "稳定（所有根在单位圆内）",
  unstable: "不稳定（存在单位圆外的根）",
  parameterGate: "参数数量门",
  residualCovariance: "残差协方差",
  lagSelectionTable: "滞后选择（共同有效样本）",
  stationarityTable: "平稳性检验（ADF，含常数项）",
  residualAutocorrelation: "残差自相关（Portmanteau）",
  sampleCoverage: "样本覆盖",
  shockVariable: "冲击变量",
  responseVariable: "响应变量",
  horizon: "视野（月）",
  irfTitle: "正交化简化式脉冲响应",
  coefficientDownload: "下载完整系数与结果（JSON）",
  transformedSeries: "变换后序列",
  rawValue: "原始值",
  transformedValue: "变换后值",
  blockedTitle: "当前规格不能运行正式 VAR",
  noStructuralNote: "简化式创新 ≠ 已识别经济冲击；本输出不是结构脉冲响应，不构成因果效应。",
} as const;

export const fieldLabels = {
  country: "国家",
  analysisSkill: "分析方法",
  year: "年份",
  indicator: "指标",
  search: "搜索",
  source: "来源",
  dataStatus: "数据状态",
  updatedAt: "更新时间",
  value: "数值",
  unit: "单位",
  dataset: "数据集",
  layer: "图层",
  region: "区域",
  projects: "项目",
  outcome: "结果变量",
  explanatoryVariables: "解释变量",
  fixedEffects: "固定效应",
  seMethod: "标准误方法",
  fromYear: "起始年份",
  toYear: "结束年份",
  includedCountries: "纳入国家",
  flow: "贸易流向",
  exports: "出口",
  imports: "进口",
  compareWith: "对比国家",
  event: "事件",
  eventOutcome: "观察指标",
  window: "分析窗口",
  scenario: "情景",
  shock: "冲击幅度",
} as const;

export const downloadLabels = {
  filteredCsv: "下载当前筛选结果（CSV）",
  fullObservationsCsv: "下载全部观测数据（CSV）",
  researchPackageZip: "下载完整研究数据包（ZIP）",
  resultJson: "导出分析结果（JSON）",
  comparisonJson: "导出比较结果（JSON）",
  matrixJson: "导出对比矩阵（JSON）",
} as const;

/** Internal enum → user-facing Chinese. Enums stay in English in exports/metadata. */
export const statusLabels = {
  active: "可运行",
  blocked: "暂不可用",
  registry_only: "尚未开放",
  data_building: "数据建设中",
  gate_passed: "数据条件满足",
  gate_failed: "数据条件不足",
  sufficient: "输入充分",
  partial: "部分输入",
  insufficient: "数据不足",
  high: "高",
  medium: "中",
  low: "低",
  not_available: "不可用",
} as const;

export const analysisLabels = {
  runTab: "运行分析",
  compareTab: "国家比较",
  resultTabs: { results: "结果", drivers: "驱动因素", method: "方法", data: "输入数据" },
  workflow: ["1 设置", "2 运行", "3 查看结果", "4 导出"],
  score: "得分",
  trend: "趋势",
  confidence: "结果可信度",
  unavailable: "暂不可计算",
  diagnostics: "计算诊断",
  inputCompleteness: "输入完整度",
  yearAlignment: "年份一致性",
  validationGate: "验证状态",
  missingVariables: "缺失变量",
  advancedMetadata: "高级模型信息与限制",
} as const;

export const emptyStates = {
  noScore: "暂不可计算：当前缺少同一年份的完整模型输入。",
  noTimeSeries: "暂不可运行：当前月度时间序列不足。",
  noData: "暂无数据：当前来源尚未发布该时期数据。",
  noNetworkGroup: "数据覆盖不足，当前组合不可用于正式网络指标。",
  noEventWindow: "数据窗口不足，无法运行完整事件窗口分析。",
} as const;

export const tooltipLabels = {
  hhi: "HHI（赫芬达尔指数）：伙伴份额平方和，越高越集中。",
  withinR2: "Within R²：剔除固定效应后的解释力。",
  clusterSe: "聚类标准误：按国家聚类时，聚类数量较少可能导致标准误与 p 值不稳定。",
  hicp: "HICP：欧盟统一消费者价格指数。",
  comparisonYear: "共同年份：正式比较只在所有国家都有合法输入的年份进行。",
  commonYearGate: "共同年份门控：不同年份的数值不会进入同一排名或同一列。",
  eligibleCoverage: "有效覆盖率：仅 network_eligible 伙伴额 / World 总额，不含聚合记录。",
} as const;

export const datasetLabels = {
  coreAnnual: "年度核心数据",
  highFrequency: "高频数据",
} as const;

export const brandZhSubtitle = "中欧政治经济分析平台";
