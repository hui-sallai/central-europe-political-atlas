export type ExtendedCategory = "fiscal" | "external" | "investment" | "energy" | "industry";
export type ObservationStatus = "official" | "manual" | "pending" | "sample";

export type ExtendedIndicator = {
  id: string;
  labelZh: string;
  labelEn: string;
  category: ExtendedCategory;
  unit: string;
  frequency: "annual" | "quarterly" | "monthly";
  modelUse: "eligible_after_review" | "display_only" | "excluded";
  riskDirection: "higher_risk" | "lower_risk" | "neutral" | "context";
  transform: string;
};

export type ExtendedObservation = {
  countrySlug: string;
  indicatorId: string;
  date: string;
  value: number | null;
  unit: string;
  sourceName: string;
  sourceUrl: string;
  status: ObservationStatus;
  updatedAt: string;
  note?: string;
};

export type ChinaProjectRecord = {
  projectId: string;
  projectName: string;
  countrySlug: string;
  regionName: string;
  sector: string;
  actors: string;
  amountEur: number | null;
  projectStatus: string;
  riskTags: string[];
  sourceUrl: string;
  status: ObservationStatus;
  note: string;
};

export type CountryTableRecord = {
  countryCode: string;
  countrySlug: string;
  nameZh: string;
  nameEn: string;
  euMember: boolean;
  eurozoneMember: boolean;
  regionalGroup: string;
  priority: number;
  notes: string;
};

export type SourceTableRecord = {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  reliabilityLevel: "high" | "medium" | "pending";
  url: string;
  updateFrequency: string;
  usageNotes: string;
};

export type NewsEventRecord = {
  eventId: string;
  date: string;
  countrySlug: string;
  title: string;
  sourceId: string;
  topic: string;
  eventType: string;
  direction: "positive" | "negative" | "neutral" | "pending";
  intensity: number | null;
  modelImpact: "excluded" | "explain_only" | "eligible_after_review";
  chinaRelated: boolean;
  summary: string;
  status: ObservationStatus;
};

export const extendedIndicatorLabels: Record<ExtendedCategory, string> = {
  fiscal: "财政数据",
  external: "外部经济数据",
  investment: "投资数据",
  energy: "能源数据",
  industry: "产业数据",
};

export const extendedIndicators: ExtendedIndicator[] = [
  { id: "fiscal_deficit_gdp", labelZh: "财政赤字 / GDP", labelEn: "Government deficit / GDP", category: "fiscal", unit: "% GDP", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "higher_risk", transform: "level" },
  { id: "government_debt_gdp", labelZh: "政府债务 / GDP", labelEn: "Government debt / GDP", category: "fiscal", unit: "% GDP", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "higher_risk", transform: "level" },
  { id: "government_revenue_gdp", labelZh: "财政收入 / GDP", labelEn: "Government revenue / GDP", category: "fiscal", unit: "% GDP", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "level" },
  { id: "government_expenditure_gdp", labelZh: "财政支出 / GDP", labelEn: "Government expenditure / GDP", category: "fiscal", unit: "% GDP", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "level" },
  { id: "exports_mio_eur", labelZh: "出口", labelEn: "Exports", category: "external", unit: "百万欧元", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "level" },
  { id: "imports_mio_eur", labelZh: "进口", labelEn: "Imports", category: "external", unit: "百万欧元", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "level" },
  { id: "trade_balance_mio_eur", labelZh: "贸易差额", labelEn: "Trade balance", category: "external", unit: "百万欧元", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "exports - imports" },
  { id: "current_account_gdp", labelZh: "经常账户 / GDP", labelEn: "Current account / GDP", category: "external", unit: "% GDP", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "lower_risk", transform: "level" },
  { id: "fdi_mio_eur", labelZh: "FDI 流入", labelEn: "FDI inflow", category: "investment", unit: "百万欧元", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "level" },
  { id: "energy_import_dependency", labelZh: "能源进口依赖", labelEn: "Energy import dependency", category: "energy", unit: "%", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "higher_risk", transform: "level" },
  { id: "manufacturing_gva_gdp", labelZh: "制造业占 GDP 比重", labelEn: "Manufacturing GVA / GDP", category: "industry", unit: "% GDP", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "level" },
  { id: "automotive_export_share", labelZh: "汽车产业出口占比", labelEn: "Automotive industry export share", category: "industry", unit: "%", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "NACE C29 exports / total exports" },
];

export const countryTableRecords: CountryTableRecord[] = [
  { countryCode: "PL", countrySlug: "poland", nameZh: "波兰", nameEn: "Poland", euMember: true, eurozoneMember: false, regionalGroup: "V4", priority: 1, notes: "V4 最大经济体；财政、外部、能源和对华物流数据优先补。" },
  { countryCode: "HU", countrySlug: "hungary", nameZh: "匈牙利", nameEn: "Hungary", euMember: true, eurozoneMember: false, regionalGroup: "V4", priority: 2, notes: "对华制造业、汽车和电池供应链项目优先补。" },
  { countryCode: "CZ", countrySlug: "czechia", nameZh: "捷克", nameEn: "Czechia", euMember: true, eurozoneMember: false, regionalGroup: "V4", priority: 3, notes: "工业、汽车、能源和贸易结构优先补。" },
  { countryCode: "SK", countrySlug: "slovakia", nameZh: "斯洛伐克", nameEn: "Slovakia", euMember: true, eurozoneMember: true, regionalGroup: "V4", priority: 4, notes: "欧元区身份、汽车产业链和区域外部风险优先补。" },
];

export const sourceTableRecords: SourceTableRecord[] = [
  { sourceId: "eurostat", sourceName: "Eurostat", sourceType: "官方统计", reliabilityLevel: "high", url: "https://ec.europa.eu/eurostat/databrowser/", updateFrequency: "按指标更新", usageNotes: "V4 跨国可比数据主来源；用于财政、国民账户、能源和经常账户指标。" },
  { sourceId: "stat_pl", sourceName: "Statistics Poland", sourceType: "国家统计部门", reliabilityLevel: "high", url: "https://stat.gov.pl/en/", updateFrequency: "按指标更新", usageNotes: "波兰国别统计主源，用于交叉核验。" },
  { sourceId: "stat_hu", sourceName: "Hungarian Central Statistical Office", sourceType: "国家统计部门", reliabilityLevel: "high", url: "https://www.ksh.hu/?lang=en", updateFrequency: "按指标更新", usageNotes: "匈牙利国别统计主源，用于交叉核验。" },
  { sourceId: "stat_cz", sourceName: "Czech Statistical Office", sourceType: "国家统计部门", reliabilityLevel: "high", url: "https://www.czso.cz/csu/czso/home", updateFrequency: "按指标更新", usageNotes: "捷克国别统计主源，用于交叉核验。" },
  { sourceId: "stat_sk", sourceName: "Statistical Office of the Slovak Republic", sourceType: "国家统计部门", reliabilityLevel: "high", url: "https://slovak.statistics.sk/", updateFrequency: "按指标更新", usageNotes: "斯洛伐克国别统计主源，用于交叉核验。" },
  { sourceId: "news_pending", sourceName: "新闻来源待接入", sourceType: "新闻", reliabilityLevel: "pending", url: "https://hui-sallai.github.io/central-europe-political-atlas/news/", updateFrequency: "周度候选", usageNotes: "结构样例新闻使用；不进入模型。" },
  { sourceId: "project_pending", sourceName: "项目级来源待接入", sourceType: "对华经贸", reliabilityLevel: "pending", url: "https://hui-sallai.github.io/central-europe-political-atlas/data/", updateFrequency: "不定期", usageNotes: "项目表初版入口；金额、主体和合同来源需后续逐条补。" },
];

const eurostatUpdatedFiscal = "2026-04-22";
const eurostatUpdatedNationalAccounts = "2026-06-11";
const eurostatUpdatedCurrentAccount = "2026-04-15";
const eurostatUpdatedEnergy = "2026-04-21";
const eurostatUpdatedFdi = "2026-06-09";
const eurostatUpdatedTradeByActivity = "2026-04-30";

function obs(countrySlug: string, indicatorId: string, value: number | null, sourceUrl: string, updatedAt: string, note?: string): ExtendedObservation {
  const indicator = extendedIndicators.find((item) => item.id === indicatorId);

  return {
    countrySlug,
    indicatorId,
    date: "2024",
    value,
    unit: indicator?.unit ?? "",
    sourceName: value === null ? "待接入可核验来源" : "Eurostat",
    sourceUrl,
    status: value === null ? "pending" : "official",
    updatedAt,
    note,
  };
}

const sourceUrls = {
  deficit: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10dd_edpt1?time=2024&unit=PC_GDP&sector=S13&na_item=B9",
  debt: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10dd_edpt1?time=2024&unit=PC_GDP&sector=S13&na_item=GD",
  revenue: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_main?time=2024&unit=PC_GDP&sector=S13&na_item=TR",
  expenditure: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_main?time=2024&unit=PC_GDP&sector=S13&na_item=TE",
  exports: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?time=2024&unit=CP_MEUR&na_item=P6",
  imports: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?time=2024&unit=CP_MEUR&na_item=P7",
  currentAccount: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tipsbp20?time=2024&unit=PC_GDP",
  energyDependency: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_ind_id?time=2024&unit=PC&siec=TOTAL",
  manufacturing: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_a10?time=2024&unit=PC_GDP&na_item=B1G&nace_r2=C",
  fdi: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/bop_fdi6_flow?time=2024&freq=A&currency=MIO_EUR&nace_r2=FDI&stk_flow=LIAB&entity=TOTAL&fdi_item=DI__D__F&partner=WRL_REST",
  automotiveExports: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ext_tec09?time=2024&freq=A&unit=THS_EUR&stk_flow=EXP&partner=WORLD",
};

export const extendedObservations: ExtendedObservation[] = [
  ...([
    ["poland", -6.4, 54.8, 42.8, 49.2, 442878.2, 409202.0, 33676.2, 0.3, 19004.2, 45.669, 15.4, 15.0],
    ["hungary", -5.1, 73.5, 42.2, 47.3, 157086.7, 147873.3, 9213.4, 1.8, -57492.7, 48.943, 15.9, 21.9],
    ["czechia", -2.0, 43.3, 41.2, 43.2, 220888.9, 200838.3, 20050.6, 1.7, 12311.3, 39.32, 19.9, 32.4],
    ["slovakia", -5.3, 59.7, 42.1, 47.4, 111305.9, 111626.0, -320.1, -4.6, 4600.1, 53.501, 16.3, 40.4],
  ] as const).flatMap(([countrySlug, deficit, debt, revenue, expenditure, exports, imports, balance, currentAccount, fdi, energy, manufacturing, automotiveShare]) => [
    obs(countrySlug, "fiscal_deficit_gdp", deficit, `${sourceUrls.deficit}&geo=${countrySlugToGeo(countrySlug)}`, eurostatUpdatedFiscal),
    obs(countrySlug, "government_debt_gdp", debt, `${sourceUrls.debt}&geo=${countrySlugToGeo(countrySlug)}`, eurostatUpdatedFiscal),
    obs(countrySlug, "government_revenue_gdp", revenue, `${sourceUrls.revenue}&geo=${countrySlugToGeo(countrySlug)}`, eurostatUpdatedFiscal),
    obs(countrySlug, "government_expenditure_gdp", expenditure, `${sourceUrls.expenditure}&geo=${countrySlugToGeo(countrySlug)}`, eurostatUpdatedFiscal),
    obs(countrySlug, "exports_mio_eur", exports, `${sourceUrls.exports}&geo=${countrySlugToGeo(countrySlug)}`, eurostatUpdatedNationalAccounts),
    obs(countrySlug, "imports_mio_eur", imports, `${sourceUrls.imports}&geo=${countrySlugToGeo(countrySlug)}`, eurostatUpdatedNationalAccounts),
    obs(countrySlug, "trade_balance_mio_eur", balance, `${sourceUrls.exports}&geo=${countrySlugToGeo(countrySlug)}`, eurostatUpdatedNationalAccounts, "由 Eurostat P6 出口减 P7 进口计算。"),
    obs(countrySlug, "current_account_gdp", currentAccount, `${sourceUrls.currentAccount}&geo=${countrySlugToGeo(countrySlug)}`, eurostatUpdatedCurrentAccount),
    obs(countrySlug, "fdi_mio_eur", fdi, `${sourceUrls.fdi}&geo=${countrySlugToGeo(countrySlug)}`, eurostatUpdatedFdi, "Eurostat BPM6 口径：Direct investment in the reporting economy (DIRE), liabilities flow；负值表示净减少。"),
    obs(countrySlug, "energy_import_dependency", energy, `${sourceUrls.energyDependency}&geo=${countrySlugToGeo(countrySlug)}`, eurostatUpdatedEnergy),
    obs(countrySlug, "manufacturing_gva_gdp", manufacturing, `${sourceUrls.manufacturing}&geo=${countrySlugToGeo(countrySlug)}`, eurostatUpdatedNationalAccounts),
    obs(countrySlug, "automotive_export_share", automotiveShare, `${sourceUrls.automotiveExports}&geo=${countrySlugToGeo(countrySlug)}`, eurostatUpdatedTradeByActivity, "由 Eurostat ext_tec09 计算：NACE C29 机动车、挂车和半挂车制造业出口 / 全部 NACE 出口。"),
  ]),
];

export const chinaProjectRecords: ChinaProjectRecord[] = [
  {
    projectId: "hu-budapest-belgrade-rail",
    projectName: "布达佩斯-贝尔格莱德铁路匈牙利段",
    countrySlug: "hungary",
    regionName: "匈牙利 / 布达佩斯-凯莱比奥",
    sector: "铁路 / 基础设施",
    actors: "匈牙利政府、中国企业与融资主体待拆分",
    amountEur: null,
    projectStatus: "建设 / 延期风险待核验",
    riskTags: ["基础设施", "融资", "延期"],
    sourceUrl: "https://ec.europa.eu/info/law/better-regulation/have-your-say/initiatives_en",
    status: "manual",
    note: "先转为项目表记录；金额、合同主体和项目阶段需接入项目级来源后再标正式数据。",
  },
  {
    projectId: "hu-battery-ev-supply-chain",
    projectName: "中国电池与新能源汽车供应链投资",
    countrySlug: "hungary",
    regionName: "匈牙利多地",
    sector: "电池 / 汽车",
    actors: "企业主体待项目级拆分",
    amountEur: null,
    projectStatus: "在建 / 运营并存",
    riskTags: ["产业依赖", "制造业", "地方就业"],
    sourceUrl: "https://www.ksh.hu/?lang=en",
    status: "manual",
    note: "作为样本库初版项目；需补企业、地点、金额和年份。",
  },
  {
    projectId: "pl-china-europe-rail-logistics",
    projectName: "中欧班列与波兰物流节点",
    countrySlug: "poland",
    regionName: "波兰物流节点",
    sector: "物流 / 铁路",
    actors: "铁路与物流主体待拆分",
    amountEur: null,
    projectStatus: "运营 / 待量化",
    riskTags: ["物流通道", "贸易暴露"],
    sourceUrl: "https://stat.gov.pl/en/",
    status: "manual",
    note: "先从文字样本转为项目表；货运量、口岸、企业和年度贸易额待补。",
  },
  {
    projectId: "cz-industrial-goods-trade",
    projectName: "机械、电气与工业品贸易",
    countrySlug: "czechia",
    regionName: "捷克全国",
    sector: "贸易 / 工业",
    actors: "贸易主体待拆分",
    amountEur: null,
    projectStatus: "持续 / 待量化",
    riskTags: ["工业贸易", "供应链"],
    sourceUrl: "https://www.czso.cz/csu/czso/home",
    status: "manual",
    note: "由旧经贸样本转为项目表；后续按商品编码和年度贸易额补充。",
  },
  {
    projectId: "sk-auto-trade-chain",
    projectName: "汽车产业链相关贸易",
    countrySlug: "slovakia",
    regionName: "斯洛伐克多地",
    sector: "汽车 / 零部件",
    actors: "企业与贸易主体待拆分",
    amountEur: null,
    projectStatus: "持续 / 待量化",
    riskTags: ["汽车产业", "贸易暴露"],
    sourceUrl: "https://slovak.statistics.sk/",
    status: "manual",
    note: "当前为经贸样本转项目表；需按商品编码补贸易额和对华占比。",
  },
];

export const newsEventRecords: NewsEventRecord[] = [
  { eventId: "pl-2026-w23-security-eu", date: "2026-06-01", countrySlug: "poland", title: "政府继续强调安全、基础设施和欧盟资金议题", sourceId: "news_pending", topic: "欧盟", eventType: "weekly_sample", direction: "pending", intensity: null, modelImpact: "excluded", chinaRelated: false, summary: "结构样例，不进入模型；正式新闻源待接入。", status: "sample" },
  { eventId: "hu-2026-w23-policy-investment", date: "2026-06-01", countrySlug: "hungary", title: "新政府与产业投资政策成为本周观察重点", sourceId: "news_pending", topic: "经济", eventType: "weekly_sample", direction: "pending", intensity: null, modelImpact: "excluded", chinaRelated: false, summary: "结构样例，不进入模型；正式新闻源待接入。", status: "sample" },
  { eventId: "cz-2026-w23-industry-energy", date: "2026-06-01", countrySlug: "czechia", title: "产业竞争力、能源供应与政府经济政策受到关注", sourceId: "news_pending", topic: "能源", eventType: "weekly_sample", direction: "pending", intensity: null, modelImpact: "excluded", chinaRelated: false, summary: "结构样例，不进入模型；正式新闻源待接入。", status: "sample" },
  { eventId: "sk-2026-w23-auto-regional", date: "2026-06-01", countrySlug: "slovakia", title: "政府政策、汽车产业链和区域发展是本周重点", sourceId: "news_pending", topic: "区域", eventType: "weekly_sample", direction: "pending", intensity: null, modelImpact: "excluded", chinaRelated: false, summary: "结构样例，不进入模型；正式新闻源待接入。", status: "sample" },
];

export function getExtendedObservations(countrySlug: string, category?: ExtendedCategory) {
  return extendedObservations.filter((observation) => {
    const indicator = extendedIndicators.find((item) => item.id === observation.indicatorId);
    return observation.countrySlug === countrySlug && (!category || indicator?.category === category);
  });
}

export function getExtendedIndicator(indicatorId: string) {
  return extendedIndicators.find((indicator) => indicator.id === indicatorId);
}

export function getChinaProjectRecords(countrySlug: string) {
  return chinaProjectRecords.filter((project) => project.countrySlug === countrySlug);
}

export function getCountryTableRecord(countrySlug: string) {
  return countryTableRecords.find((country) => country.countrySlug === countrySlug);
}

export function getNewsEventRecords(countrySlug: string) {
  return newsEventRecords.filter((event) => event.countrySlug === countrySlug);
}

function countrySlugToGeo(countrySlug: string) {
  const geoBySlug: Record<string, string> = {
    poland: "PL",
    hungary: "HU",
    czechia: "CZ",
    slovakia: "SK",
  };

  return geoBySlug[countrySlug] ?? countrySlug.toUpperCase();
}
