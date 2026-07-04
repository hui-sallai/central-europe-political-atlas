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
  chineseActor: string;
  localActor: string;
  amount: number | null;
  currency: string | null;
  year: string;
  projectStatus: string;
  statusTimeline: string[];
  amountEvidence: string;
  actorEvidence: string;
  sourceUrl: string;
  sourceReliabilityLevel: "A" | "B" | "C" | "D";
  riskTags: string[];
  quantificationStatus: "amount_available" | "amount_missing" | "partially_quantifiable" | "not_quantifiable";
  exposureVariableFit: "strong_candidate" | "partial_candidate" | "context_only" | "not_ready";
  exposureVariableNote: string;
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
  reliabilityLevel: "A" | "B" | "C" | "D";
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
  { id: "fiscal_deficit_gdp", labelZh: "财政赤字/GDP", labelEn: "Government deficit / GDP", category: "fiscal", unit: "% GDP", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "higher_risk", transform: "level" },
  { id: "government_debt_gdp", labelZh: "政府债务/GDP", labelEn: "Government debt / GDP", category: "fiscal", unit: "% GDP", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "higher_risk", transform: "level" },
  { id: "government_revenue_gdp", labelZh: "财政收入/GDP", labelEn: "Government revenue / GDP", category: "fiscal", unit: "% GDP", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "level" },
  { id: "government_expenditure_gdp", labelZh: "财政支出/GDP", labelEn: "Government expenditure / GDP", category: "fiscal", unit: "% GDP", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "level" },
  { id: "exports_mio_eur", labelZh: "出口", labelEn: "Exports", category: "external", unit: "百万欧元", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "level" },
  { id: "imports_mio_eur", labelZh: "进口", labelEn: "Imports", category: "external", unit: "百万欧元", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "level" },
  { id: "trade_balance_mio_eur", labelZh: "贸易差额", labelEn: "Trade balance", category: "external", unit: "百万欧元", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "exports - imports" },
  { id: "current_account_gdp", labelZh: "经常账户/GDP", labelEn: "Current account / GDP", category: "external", unit: "% GDP", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "lower_risk", transform: "level" },
  { id: "fdi_mio_eur", labelZh: "FDI 流入", labelEn: "FDI inflow", category: "investment", unit: "百万欧元", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "level" },
  { id: "energy_import_dependency", labelZh: "能源进口依赖", labelEn: "Energy import dependency", category: "energy", unit: "%", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "higher_risk", transform: "level" },
  { id: "manufacturing_gva_gdp", labelZh: "制造业占 GDP 比重", labelEn: "Manufacturing GVA / GDP", category: "industry", unit: "% GDP", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "level" },
  { id: "automotive_export_share", labelZh: "汽车产业出口占比", labelEn: "Automotive industry export share", category: "industry", unit: "%", frequency: "annual", modelUse: "eligible_after_review", riskDirection: "context", transform: "NACE C29 exports / total exports" },
];

export const v4TemplateIndicatorIds = [
  "fiscal_deficit_gdp",
  "government_debt_gdp",
  "government_revenue_gdp",
  "government_expenditure_gdp",
  "exports_mio_eur",
  "imports_mio_eur",
  "trade_balance_mio_eur",
  "current_account_gdp",
  "fdi_mio_eur",
  "energy_import_dependency",
  "manufacturing_gva_gdp",
  "automotive_export_share",
] as const;

export const countryTableRecords: CountryTableRecord[] = [
  { countryCode: "PL", countrySlug: "poland", nameZh: "波兰", nameEn: "Poland", euMember: true, eurozoneMember: false, regionalGroup: "V4", priority: 1, notes: "V4 最大经济体；财政、外部、能源和对华物流数据优先补。" },
  { countryCode: "HU", countrySlug: "hungary", nameZh: "匈牙利", nameEn: "Hungary", euMember: true, eurozoneMember: false, regionalGroup: "V4", priority: 2, notes: "对华制造业、汽车和电池供应链项目优先补。" },
  { countryCode: "CZ", countrySlug: "czechia", nameZh: "捷克", nameEn: "Czechia", euMember: true, eurozoneMember: false, regionalGroup: "V4", priority: 3, notes: "工业、汽车、能源和贸易结构优先补。" },
  { countryCode: "SK", countrySlug: "slovakia", nameZh: "斯洛伐克", nameEn: "Slovakia", euMember: true, eurozoneMember: true, regionalGroup: "V4", priority: 4, notes: "欧元区身份、汽车产业链和区域外部风险优先补。" },
];

export const sourceTableRecords: SourceTableRecord[] = [
  { sourceId: "eurostat", sourceName: "Eurostat", sourceType: "官方统计", reliabilityLevel: "A", url: "https://ec.europa.eu/eurostat/databrowser/", updateFrequency: "按指标更新", usageNotes: "V4 跨国可比数据主来源；用于财政、国民账户、能源和经常账户指标。" },
  { sourceId: "stat_pl", sourceName: "Statistics Poland", sourceType: "国家统计部门", reliabilityLevel: "A", url: "https://stat.gov.pl/en/", updateFrequency: "按指标更新", usageNotes: "波兰国别统计主源，用于交叉核验。" },
  { sourceId: "stat_hu", sourceName: "Hungarian Central Statistical Office", sourceType: "国家统计部门", reliabilityLevel: "A", url: "https://www.ksh.hu/?lang=en", updateFrequency: "按指标更新", usageNotes: "匈牙利国别统计主源，用于交叉核验。" },
  { sourceId: "stat_cz", sourceName: "Czech Statistical Office", sourceType: "国家统计部门", reliabilityLevel: "A", url: "https://www.czso.cz/csu/czso/home", updateFrequency: "按指标更新", usageNotes: "捷克国别统计主源，用于交叉核验。" },
  { sourceId: "stat_sk", sourceName: "Statistical Office of the Slovak Republic", sourceType: "国家统计部门", reliabilityLevel: "A", url: "https://slovak.statistics.sk/", updateFrequency: "按指标更新", usageNotes: "斯洛伐克国别统计主源，用于交叉核验。" },
  { sourceId: "hu_gov_v4_summit_2026", sourceName: "匈牙利政府", sourceType: "政府公告", reliabilityLevel: "A", url: "https://kormany.hu/en/news/v4-csucs-godollon-orszagainkat-sokkal-tobb-koti-ossze-mint-ami-elvalasztja", updateFrequency: "事件更新", usageNotes: "2026 年 6 月 24 日格德勒 V4 峰会公告；用于四国正式事件记录，中文摘要由人工整理。" },
  { sourceId: "news_pending", sourceName: "新闻来源待接入", sourceType: "新闻", reliabilityLevel: "D", url: "https://hui-sallai.github.io/central-europe-political-atlas/news/", updateFrequency: "周度候选", usageNotes: "结构样例新闻使用；不进入模型。" },
  { sourceId: "project_pending", sourceName: "项目级来源待接入", sourceType: "对华经贸", reliabilityLevel: "D", url: "https://hui-sallai.github.io/central-europe-political-atlas/data/", updateFrequency: "不定期", usageNotes: "项目表初版入口；金额、主体和合同来源需后续逐条补。" },
];

const eurostatUpdatedFiscal = "2026-04-22";
const eurostatUpdatedNationalAccounts = "2026-07-02";
const eurostatUpdatedCurrentAccount = "2026-07-03";
const eurostatUpdatedEnergy = "2026-04-21";
const eurostatUpdatedFdi = "2026-06-09";
const eurostatUpdatedTradeByActivity = "2026-07-03";

function obs(
  countrySlug: string,
  indicatorId: string,
  dateOrValue: string | number | null,
  valueOrSourceUrl: number | null | string,
  sourceUrlOrUpdatedAt: string,
  updatedAtOrNote?: string,
  note?: string,
): ExtendedObservation {
  const indicator = extendedIndicators.find((item) => item.id === indicatorId);
  const usesLegacySignature = typeof dateOrValue !== "string";
  const date = usesLegacySignature ? "2024" : dateOrValue;
  const value = usesLegacySignature ? dateOrValue : (valueOrSourceUrl as number | null);
  const sourceUrlBase = usesLegacySignature ? (valueOrSourceUrl as string) : sourceUrlOrUpdatedAt;
  const sourceUrl = sourceUrlBase.includes("time=") ? sourceUrlBase : `${sourceUrlBase}&time=${date}`;
  const updatedAt = usesLegacySignature ? sourceUrlOrUpdatedAt : (updatedAtOrNote ?? "");
  const finalNote = usesLegacySignature ? updatedAtOrNote : note;

  return {
    countrySlug,
    indicatorId,
    date,
    value,
    unit: indicator?.unit ?? "",
    sourceName: "Eurostat",
    sourceUrl,
    status: value === null ? "pending" : "official",
    updatedAt,
    note: finalNote,
  };
}

const sourceUrls = {
  deficit: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10dd_edpt1?unit=PC_GDP&sector=S13&na_item=B9",
  debt: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10dd_edpt1?unit=PC_GDP&sector=S13&na_item=GD",
  revenue: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_main?unit=PC_GDP&sector=S13&na_item=TR",
  expenditure: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_main?unit=PC_GDP&sector=S13&na_item=TE",
  exports: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?unit=CP_MEUR&na_item=P6",
  imports: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp?unit=CP_MEUR&na_item=P7",
  currentAccount: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tipsbp20?unit=PC_GDP",
  energyDependency: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_ind_id?unit=PC&siec=TOTAL",
  manufacturing: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_a10?unit=PC_GDP&na_item=B1G&nace_r2=C",
  fdi: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/bop_fdi6_flow?freq=A&currency=MIO_EUR&nace_r2=FDI&stk_flow=LIAB&entity=TOTAL&fdi_item=DI__D__F&partner=WRL_REST",
  automotiveExports: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ext_tec09?freq=A&unit=THS_EUR&stk_flow=EXP&partner=WORLD&nace_r2=C29&nace_r2=TOTAL",
};

function sourceUrlFor(sourceKey: keyof typeof sourceUrls, countrySlug: string, date: string) {
  return `${sourceUrls[sourceKey]}&geo=${countrySlugToGeo(countrySlug)}&time=${date}`;
}

type V4HistoricalRow = readonly [
  countrySlug: string,
  date: string,
  deficit: number,
  debt: number,
  revenue: number,
  expenditure: number,
  exports: number,
  imports: number,
  balance: number,
  currentAccount: number,
  fdi: number | null,
  energy: number | null,
  manufacturing: number,
  automotiveShare: number | null,
];

const historicalV4Rows: V4HistoricalRow[] = [
  ["poland", "2021", -1.7, 53.0, 41.9, 43.6, 332532.2, 313866.4, 18665.8, -1.3, 30813.3, 40.464, 17.3, 13.1],
  ["poland", "2022", -3.4, 48.8, 39.9, 43.2, 412594.3, 401453.0, 11141.3, -2.2, 37532.6, 46.115, 17.7, 12.6],
  ["poland", "2023", -5.2, 49.5, 41.7, 46.9, 435227.7, 392084.8, 43142.9, 1.6, 34037.4, 47.996, 17.5, 15.1],
  ["poland", "2025", -7.3, 59.7, 43.6, 50.9, 461553.9, 435690.7, 25863.2, -0.9, null, null, 14.4, null],
  ["hungary", "2021", -7.1, 76.2, 41.0, 48.1, 123065.3, 123630.4, -565.1, -4.4, 28749.9, 54.121, 16.5, 21.9],
  ["hungary", "2022", -6.2, 74.1, 42.9, 49.1, 151371.5, 160388.2, -9016.7, -9.0, -2940.9, 64.206, 16.8, 20.4],
  ["hungary", "2023", -7.0, 73.3, 42.8, 49.7, 160320.1, 152133.2, 8186.9, 0.0, -63063.9, 62.087, 17.2, 22.7],
  ["hungary", "2025", -4.7, 74.6, 42.6, 47.3, 158940.0, 149132.8, 9807.2, 1.8, null, null, 15.1, null],
  ["czechia", "2021", -5.0, 40.7, 40.1, 45.0, 173561.8, 164405.3, 9156.5, -2.1, 11082.8, 39.958, 19.6, 27.9],
  ["czechia", "2022", -3.1, 42.5, 40.2, 43.2, 207798.3, 205481.3, 2317.0, -4.7, 9053.5, 41.772, 19.4, 27.2],
  ["czechia", "2023", -3.7, 42.2, 40.3, 44.0, 218273.7, 202594.4, 15679.3, -0.1, null, 41.679, 20.4, 32.0],
  ["czechia", "2025", -2.1, 44.3, 41.0, 43.2, 232020.6, 211742.9, 20277.7, 0.7, null, null, 19.4, null],
  ["slovakia", "2021", -5.1, 60.2, 39.8, 44.8, 92478.7, 92943.1, -464.4, -4.8, 2327.0, 52.584, 16.6, 31.0],
  ["slovakia", "2022", -1.6, 57.8, 41.5, 43.1, 108934.4, 115445.5, -6511.1, -9.6, 4647.3, 69.595, 17.4, 29.5],
  ["slovakia", "2023", -5.3, 55.8, 43.1, 48.4, 113029.9, 111058.0, 1971.9, -3.0, 439.1, 58.41, 16.8, 33.9],
  ["slovakia", "2025", -4.5, 61.4, 43.5, 47.9, 116370.6, 116580.1, -209.5, -3.6, null, null, 16.2, null],
];

function historicalRowToObservations([countrySlug, date, deficit, debt, revenue, expenditure, exports, imports, balance, currentAccount, fdi, energy, manufacturing, automotiveShare]: V4HistoricalRow): ExtendedObservation[] {
  return [
    obs(countrySlug, "fiscal_deficit_gdp", date, deficit, sourceUrlFor("deficit", countrySlug, date), eurostatUpdatedFiscal),
    obs(countrySlug, "government_debt_gdp", date, debt, sourceUrlFor("debt", countrySlug, date), eurostatUpdatedFiscal),
    obs(countrySlug, "government_revenue_gdp", date, revenue, sourceUrlFor("revenue", countrySlug, date), eurostatUpdatedFiscal),
    obs(countrySlug, "government_expenditure_gdp", date, expenditure, sourceUrlFor("expenditure", countrySlug, date), eurostatUpdatedFiscal),
    obs(countrySlug, "exports_mio_eur", date, exports, sourceUrlFor("exports", countrySlug, date), eurostatUpdatedNationalAccounts),
    obs(countrySlug, "imports_mio_eur", date, imports, sourceUrlFor("imports", countrySlug, date), eurostatUpdatedNationalAccounts),
    obs(countrySlug, "trade_balance_mio_eur", date, balance, sourceUrlFor("exports", countrySlug, date), eurostatUpdatedNationalAccounts, "Computed as Eurostat P6 exports minus P7 imports."),
    obs(countrySlug, "current_account_gdp", date, currentAccount, sourceUrlFor("currentAccount", countrySlug, date), eurostatUpdatedCurrentAccount),
    obs(countrySlug, "fdi_mio_eur", date, fdi, sourceUrlFor("fdi", countrySlug, date), eurostatUpdatedFdi, fdi === null ? "Value not available in Eurostat series at the time of import." : "Eurostat BPM6: direct investment liabilities flow; negative values indicate net reduction."),
    obs(countrySlug, "energy_import_dependency", date, energy, sourceUrlFor("energyDependency", countrySlug, date), eurostatUpdatedEnergy, energy === null ? "Value not available in Eurostat series at the time of import." : undefined),
    obs(countrySlug, "manufacturing_gva_gdp", date, manufacturing, sourceUrlFor("manufacturing", countrySlug, date), eurostatUpdatedNationalAccounts),
    obs(countrySlug, "automotive_export_share", date, automotiveShare, sourceUrlFor("automotiveExports", countrySlug, date), eurostatUpdatedTradeByActivity, automotiveShare === null ? "Value not available in Eurostat ext_tec09 at the time of import." : "Computed as NACE C29 exports divided by total exports in Eurostat ext_tec09."),
  ];
}

const historicalExtendedObservations = historicalV4Rows.flatMap(historicalRowToObservations);

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
  ...historicalExtendedObservations,
];

export function getV4TemplateCoverage(countrySlug: string) {
  const existingIndicatorIds = new Set(
    extendedObservations
      .filter((observation) => observation.countrySlug === countrySlug)
      .map((observation) => observation.indicatorId),
  );
  const present = v4TemplateIndicatorIds.filter((indicatorId) => existingIndicatorIds.has(indicatorId));
  const missing = v4TemplateIndicatorIds.filter((indicatorId) => !existingIndicatorIds.has(indicatorId));

  return {
    total: v4TemplateIndicatorIds.length,
    present,
    missing,
    complete: missing.length === 0,
  };
}

export function getLatestExtendedObservation(countrySlug: string, indicatorId: string) {
  const observations = extendedObservations
    .filter((observation) => observation.countrySlug === countrySlug && observation.indicatorId === indicatorId)
    .sort((a, b) => b.date.localeCompare(a.date));

  return observations.find((observation) => observation.status === "official" && observation.value !== null) ?? observations[0];
}

export const chinaProjectRecords: ChinaProjectRecord[] = [
  {
    projectId: "pl-china-europe-rail-malaszewicze",
    projectName: "中欧班列与马拉舍维切物流节点",
    countrySlug: "poland",
    regionName: "马拉舍维切 / 布列斯特边境通道",
    sector: "铁路物流 / 跨境转运",
    chineseActor: "China Railway Express / 中欧班列运营网络",
    localActor: "PKP Cargo / 波兰铁路与物流主体待拆分",
    amount: null,
    currency: null,
    year: "持续运营",
    projectStatus: "运营 / 贸易额与货运量待量化",
    statusTimeline: ["持续运营", "年度 TEU、贸易额、口岸主体待接入"],
    amountEvidence: "金额缺失：当前来源只能证明通道和运营网络存在，未给出项目投资额、年度货值或 TEU 口径；后续需接入口岸统计、铁路运营商或海关数据。",
    actorEvidence: "中国主体暂按中欧班列运营网络记录；当地主体需拆分 PKP Cargo、边境口岸、场站和海关相关实体，当前为人工整理。",
    sourceUrl: "https://www.crexpress.cn/",
    sourceReliabilityLevel: "C",
    riskTags: ["物流通道", "贸易暴露", "边境转运"],
    quantificationStatus: "amount_missing",
    exposureVariableFit: "partial_candidate",
    exposureVariableNote: "适合作为物流通道暴露变量候选，但必须先补年度 TEU、货值、口岸吞吐和运营主体字段；现阶段不直接进入量化指数。",
    status: "manual",
    note: "作为波兰对华物流暴露的核心入口；金额、主体合同、年度 TEU 和贸易额仍待接入。",
  },
  {
    projectId: "pl-leapmotor-tychy-assembly",
    projectName: "Leapmotor T03 蒂黑组装项目",
    countrySlug: "poland",
    regionName: "蒂黑",
    sector: "新能源汽车 / 整车组装",
    chineseActor: "Leapmotor / Leapmotor International",
    localActor: "Stellantis Poland",
    amount: null,
    currency: null,
    year: "2024",
    projectStatus: "已启动后出现调整 / 状态待持续核验",
    statusTimeline: ["2024 启动组装", "2025 Reuters 报道生产调整", "投资额和产量待接入"],
    amountEvidence: "金额缺失：Reuters 来源可核验生产调整和地点，但未披露投资额；需补 Stellantis/Leapmotor 公告、工厂产量或地方投资资料。",
    actorEvidence: "中国主体为 Leapmotor / Leapmotor International；当地主体为 Stellantis Poland，仍需用企业公告或当地登记资料核验具体生产实体。",
    sourceUrl: "https://www.reuters.com/business/autos-transportation/stellantis-stops-making-leapmotor-ev-poland-eyes-other-options-2025-04-08/",
    sourceReliabilityLevel: "B",
    riskTags: ["新能源汽车", "关税", "产能转移"],
    quantificationStatus: "amount_missing",
    exposureVariableFit: "partial_candidate",
    exposureVariableNote: "适合作为中国 EV 企业进入欧盟制造网络的事件型变量；金额和产量缺失前只能作解释变量，不进入量化暴露指数。",
    status: "manual",
    note: "可作为中国 EV 企业借欧洲既有工厂进入欧盟市场的样本；产量、投资额和后续产地调整需持续核验。",
  },
  {
    projectId: "pl-nuctech-kobylka",
    projectName: "Nuctech 波兰安检设备基地",
    countrySlug: "poland",
    regionName: "Kobylka / 华沙周边",
    sector: "安检设备 / 工业制造",
    chineseActor: "Nuctech",
    localActor: "Nuctech Warsaw Company / 当地实体待核验",
    amount: null,
    currency: null,
    year: "2018",
    projectStatus: "运营 / 欧盟外资补贴调查相关风险待跟踪",
    statusTimeline: ["2018 基地信息待核验", "2024 欧盟外资补贴调查", "金额和当地实体待接入"],
    amountEvidence: "金额缺失：欧盟委员会来源可核验外资补贴调查事件，但不提供波兰基地投资额；需补企业登记、采购合同或厂区投资资料。",
    actorEvidence: "中国主体为 Nuctech；当地主体暂记 Nuctech Warsaw Company，需以波兰商业登记或企业年报核验。",
    sourceUrl: "https://ec.europa.eu/commission/presscorner/detail/en/ip_24_1803",
    sourceReliabilityLevel: "A",
    riskTags: ["公共采购", "安全审查", "外资补贴"],
    quantificationStatus: "amount_missing",
    exposureVariableFit: "context_only",
    exposureVariableNote: "更适合作为公共采购和监管事件样本；金额、合同和客户结构缺失前，不适合作为经济暴露变量主项。",
    status: "manual",
    note: "项目具有安全、采购和欧盟监管维度；金额字段暂缺，先作为事件与项目标签样本。",
  },
  {
    projectId: "hu-catl-debrecen",
    projectName: "CATL 德布勒森电池工厂",
    countrySlug: "hungary",
    regionName: "德布勒森",
    sector: "动力电池 / 制造业",
    chineseActor: "CATL",
    localActor: "匈牙利政府 / Debrecen 地方主体",
    amount: 7.34,
    currency: "十亿欧元",
    year: "2022",
    projectStatus: "在建 / 量产进度待跟踪",
    statusTimeline: ["2022 企业公告投资", "建设和量产进度待跟踪", "补贴、产能、雇佣字段待接入"],
    amountEvidence: "金额已接入：CATL 企业公告披露 73.4 亿欧元投资额；仍需补政府补贴、产能、就业和实际支出进度。",
    actorEvidence: "中国主体为 CATL；当地主体暂记匈牙利政府与 Debrecen 地方主体，需补项目公司、土地/许可主体和补贴签署方。",
    sourceUrl: "https://www.catl.com/en/news/958.html",
    sourceReliabilityLevel: "C",
    riskTags: ["电池产业", "制造业集中", "环境与用水"],
    quantificationStatus: "partially_quantifiable",
    exposureVariableFit: "strong_candidate",
    exposureVariableNote: "金额、地点、行业和主体较清楚，适合作为后续中国制造业投资暴露变量的高优先级候选；量化前需补产能和补贴字段。",
    status: "manual",
    note: "金额和地点来自企业公告；后续量化前仍需补贴、产能、雇佣和供应链依赖字段。",
  },
  {
    projectId: "hu-byd-szeged",
    projectName: "BYD 塞格德新能源汽车工厂",
    countrySlug: "hungary",
    regionName: "塞格德",
    sector: "新能源汽车 / 整车制造",
    chineseActor: "BYD",
    localActor: "匈牙利政府 / Szeged 地方主体",
    amount: null,
    currency: null,
    year: "2023",
    projectStatus: "已宣布 / 投资额待接入",
    statusTimeline: ["2023 项目宣布", "投资额、产能、补贴条件待接入"],
    amountEvidence: "金额缺失：AP 来源可核验项目宣布和地点，但未给出明确投资额；需补 BYD、匈牙利政府或地方政府披露的金额、产能和补贴信息。",
    actorEvidence: "中国主体为 BYD；当地主体暂记匈牙利政府 / Szeged 地方主体，项目公司和许可主体待核验。",
    sourceUrl: "https://apnews.com/article/4c4754f43703d061e1dc02516be0c14a",
    sourceReliabilityLevel: "B",
    riskTags: ["新能源汽车", "欧盟关税", "地方就业"],
    quantificationStatus: "amount_missing",
    exposureVariableFit: "partial_candidate",
    exposureVariableNote: "适合作为整车制造进入欧盟市场的项目变量候选；金额和产能未接入前，不进入金额型暴露计算。",
    status: "manual",
    note: "项目规模较大但金额未在来源中明确披露；待补投资额、产能和补贴条件后再量化。",
  },
  {
    projectId: "hu-budapest-belgrade-rail",
    projectName: "布达佩斯-贝尔格莱德铁路匈牙利段",
    countrySlug: "hungary",
    regionName: "布达佩斯-凯莱比奥",
    sector: "铁路 / 基础设施",
    chineseActor: "China Railway International / China Railway Engineering partners",
    localActor: "MAV / Kínai-Magyar Vasúti Nonprofit Zrt.",
    amount: 949,
    currency: "十亿福林",
    year: "2021",
    projectStatus: "建设 / 测试和投运进度待核验",
    sourceUrl: "https://bbrailway.hu/",
    statusTimeline: ["2021 合同金额口径", "建设推进", "测试和投运进度待核验"],
    amountEvidence: "金额已接入：项目官网/项目口径保留 9490 亿福林合同金额；需进一步拆分贷款、承包比例、匈牙利段实际支出和现金流。",
    actorEvidence: "中国主体暂记 China Railway International / China Railway Engineering partners；当地主体为 MAV 及 Kínai-Magyar Vasúti Nonprofit Zrt.，仍需合同文件交叉核验。",
    sourceReliabilityLevel: "A",
    status: "manual",
    riskTags: ["基础设施", "融资", "一带一路"],
    quantificationStatus: "partially_quantifiable",
    exposureVariableFit: "strong_candidate",
    exposureVariableNote: "金额和基础设施属性明确，适合作为中国融资/承包暴露变量候选；进入量化前需拆分贷款结构、承包商份额和项目阶段。",
    note: "保留原币种金额；后续量化前需补贷款结构、承包比例、工期和现金流字段。",
  },
  {
    projectId: "cz-changhong-nymburk",
    projectName: "长虹欧洲 Nymburk 电子制造基地",
    countrySlug: "czechia",
    regionName: "Nymburk",
    sector: "消费电子 / 制造业",
    chineseActor: "Sichuan Changhong / Changhong Europe Electric",
    localActor: "Changhong Europe Electric s.r.o.",
    amount: 20,
    currency: "百万美元",
    year: "2007",
    projectStatus: "运营 / 最新产能与雇佣待核验",
    statusTimeline: ["2007 历史投资规模", "运营状态待以当地登记或年报核验", "最新产能与雇佣待接入"],
    amountEvidence: "金额已接入但为历史公开口径：2007 年约 2000 万美元；需用捷克商业登记、企业年报或地方投资资料核验是否仍适合作为当前暴露值。",
    actorEvidence: "中国主体为 Sichuan Changhong / Changhong Europe Electric；当地主体为 Changhong Europe Electric s.r.o.，需以捷克登记资料确认存续和控制关系。",
    sourceUrl: "https://www.changhong.com/",
    sourceReliabilityLevel: "C",
    riskTags: ["制造业", "电子产业", "早期投资"],
    quantificationStatus: "partially_quantifiable",
    exposureVariableFit: "context_only",
    exposureVariableNote: "可作为早期制造业进入样本；金额年代较早且当前产能/雇佣缺失，暂不适合作为当前中国经济暴露核心变量。",
    status: "manual",
    note: "早期中国制造业进入捷克样本；金额为公开资料中的历史投资规模，需接入企业年报或捷克商业登记核验。",
  },
  {
    projectId: "cz-cefc-citic-slavia",
    projectName: "CEFC/CITIC/Sinobo 对 Slavia Prague 及相关资产投资",
    countrySlug: "czechia",
    regionName: "布拉格",
    sector: "体育资产 / 房地产与品牌",
    chineseActor: "CEFC / CITIC / Sinobo",
    localActor: "SK Slavia Praha / Eden Arena 相关实体",
    amount: null,
    currency: null,
    year: "2015-2018",
    projectStatus: "存续结构复杂 / 所有权与金额待拆分",
    statusTimeline: ["2015-2018 投资与资产关系形成", "后续所有权变更待拆分", "金额、主体和资产范围待核验"],
    amountEvidence: "金额缺失：Reuters 来源可核验 CEFC 在捷克资产收购活动，但 Slavia、Eden Arena、地产和相关资产金额需拆分，不能作为单一项目金额。",
    actorEvidence: "中国主体涉及 CEFC / CITIC / Sinobo 等连续变化；当地主体涉及 SK Slavia Praha 与 Eden Arena 相关实体，所有权链条需逐项核验。",
    sourceUrl: "https://www.reuters.com/article/czech-china-cefc-idUSL5N11B07B/",
    sourceReliabilityLevel: "B",
    riskTags: ["资产收购", "政治关系", "所有权变更"],
    quantificationStatus: "amount_missing",
    exposureVariableFit: "context_only",
    exposureVariableNote: "适合作为资产收购和政治经济关系样本；在资产范围和所有权链条未拆分前，不进入经济暴露量化。",
    status: "manual",
    note: "作为捷克对华投资关系的代表性案例；需拆分足球俱乐部、场馆、房地产和金融股权后再量化。",
  },
  {
    projectId: "cz-cefc-jt-finance",
    projectName: "CEFC/CITIC 对 J&T Finance Group 股权关系",
    countrySlug: "czechia",
    regionName: "布拉格 / 捷克-斯洛伐克金融网络",
    sector: "金融服务 / 股权投资",
    chineseActor: "CEFC / CITIC-linked Rainbow Wisdom",
    localActor: "J&T Finance Group",
    amount: null,
    currency: null,
    year: "2015-至今待核验",
    projectStatus: "少数股权 / 监管与所有权状态待核验",
    statusTimeline: ["2015 起股权关系形成", "少数股权和监管状态待核验", "金额、股比和治理权待接入"],
    amountEvidence: "金额缺失：当前来源主要指向集团层面信息，未形成可直接引用的交易金额、股比和治理权字段；需补 J&T 年报、监管披露或交易公告。",
    actorEvidence: "中国主体暂记 CEFC / CITIC-linked Rainbow Wisdom；当地主体为 J&T Finance Group，需用年报和监管资料核验最终受益人、股比和权利结构。",
    sourceUrl: "https://www.jtfg.com/",
    sourceReliabilityLevel: "C",
    riskTags: ["金融股权", "监管审查", "跨境资本"],
    quantificationStatus: "amount_missing",
    exposureVariableFit: "partial_candidate",
    exposureVariableNote: "金融网络暴露相关性较强，但金额、股比和治理权缺失；补齐后可作为金融权益暴露变量候选。",
    status: "manual",
    note: "适合跟踪中国资本在捷克-斯洛伐克金融网络中的暴露；需以 J&T 年报和监管材料核验股权比例。",
  },
  {
    projectId: "sk-gotion-inobat-surany",
    projectName: "Gotion/InoBat 苏拉尼电池超级工厂",
    countrySlug: "slovakia",
    regionName: "Surany",
    sector: "动力电池 / 制造业",
    chineseActor: "Gotion High-Tech",
    localActor: "InoBat / 斯洛伐克政府与地方主体",
    amount: 1.2,
    currency: "十亿欧元",
    year: "2023",
    projectStatus: "规划 / 政府支持和建设进度待跟踪",
    statusTimeline: ["2023 项目宣布", "规划与政府支持阶段", "补贴、产能、投产年份待接入"],
    amountEvidence: "金额已接入：公开资料口径约 12 亿欧元；需补政府补贴、股权结构、产能、投产年份和实际建设进度。",
    actorEvidence: "中国主体为 Gotion High-Tech；当地主体为 InoBat 及斯洛伐克政府/地方主体，项目公司和审批主体需进一步核验。",
    sourceUrl: "https://www.inobat.eu/",
    sourceReliabilityLevel: "C",
    riskTags: ["电池产业", "政府补贴", "汽车供应链"],
    quantificationStatus: "partially_quantifiable",
    exposureVariableFit: "strong_candidate",
    exposureVariableNote: "金额、行业和地点较明确，适合作为电池供应链暴露变量候选；进入量化前需补股权、补贴、产能和建设进度。",
    status: "manual",
    note: "斯洛伐克最重要的中国电池链条项目入口；后续量化前需补股权、补贴、产能、投产年份和地方审批状态。",
  },
  {
    projectId: "sk-gotion-inobat-equity",
    projectName: "Gotion 对 InoBat 股权与技术合作",
    countrySlug: "slovakia",
    regionName: "Bratislava / Voderady / Surany 相关网络",
    sector: "电池技术 / 股权合作",
    chineseActor: "Gotion High-Tech",
    localActor: "InoBat",
    amount: null,
    currency: null,
    year: "2023",
    projectStatus: "股权合作 / 具体金额与权利结构待核验",
    statusTimeline: ["2023 股权与技术合作", "金额、股比和权利结构待核验"],
    amountEvidence: "金额缺失：当前来源可证明股权/技术合作关系，但未给出可直接使用的交易金额、股比和权利结构。",
    actorEvidence: "中国主体为 Gotion High-Tech；当地主体为 InoBat。该记录与 Surany 工厂相关但应作为股权/技术合作单独核验。",
    sourceUrl: "https://www.inobat.eu/",
    sourceReliabilityLevel: "C",
    riskTags: ["股权投资", "技术合作", "供应链依赖"],
    quantificationStatus: "amount_missing",
    exposureVariableFit: "partial_candidate",
    exposureVariableNote: "适合作为供应链控制关系或技术合作变量候选；金额、股比和治理权缺失前不进入金额型暴露计算。",
    status: "manual",
    note: "与苏拉尼工厂相关但应单独作为股权/技术合作记录；金额和治理权需从公司材料或登记资料核验。",
  },
];

export const newsEventRecords: NewsEventRecord[] = [
  { eventId: "hu-2026-06-24-v4-summit", date: "2026-06-24", countrySlug: "hungary", title: "匈牙利主办格德勒 V4 峰会，四国同意重启定期磋商", sourceId: "hu_gov_v4_summit_2026", topic: "区域", eventType: "government_announcement", direction: "neutral", intensity: null, modelImpact: "explain_only", chinaRelated: false, summary: "官方来源的人工中文摘要；记录 V4 定期协调及交通、能源、竞争力等合作议程，暂不参与模型计算。", status: "manual" },
  { eventId: "pl-2026-06-24-v4-summit", date: "2026-06-24", countrySlug: "poland", title: "波兰总理参加格德勒 V4 峰会，四国将协调欧盟议程立场", sourceId: "hu_gov_v4_summit_2026", topic: "欧盟", eventType: "government_announcement", direction: "neutral", intensity: null, modelImpact: "explain_only", chinaRelated: false, summary: "官方来源的人工中文摘要；涉及欧盟多年期预算、凝聚政策、农业、扩大与绿色转型协调，暂不参与模型计算。", status: "manual" },
  { eventId: "cz-2026-06-24-v4-summit", date: "2026-06-24", countrySlug: "czechia", title: "捷克总理参加格德勒 V4 峰会，合作议题覆盖竞争力与汽车产业", sourceId: "hu_gov_v4_summit_2026", topic: "经济", eventType: "government_announcement", direction: "neutral", intensity: null, modelImpact: "explain_only", chinaRelated: false, summary: "官方来源的人工中文摘要；涉及竞争力、排放交易体系、汽车产业和贸易政策协调，暂不参与模型计算。", status: "manual" },
  { eventId: "sk-2026-06-24-v4-presidency", date: "2026-06-24", countrySlug: "slovakia", title: "斯洛伐克将接任 V4 轮值主席，四国重启高层合作", sourceId: "hu_gov_v4_summit_2026", topic: "区域", eventType: "government_announcement", direction: "neutral", intensity: null, modelImpact: "explain_only", chinaRelated: false, summary: "官方来源的人工中文摘要；记录斯洛伐克下一主席期计划及南北交通、能源基础设施合作，暂不参与模型计算。", status: "manual" },
  { eventId: "pl-2026-w23-security-eu", date: "2026-06-01", countrySlug: "poland", title: "政府继续强调安全、基础设施和欧盟资金议题", sourceId: "news_pending", topic: "欧盟", eventType: "weekly_sample", direction: "pending", intensity: null, modelImpact: "excluded", chinaRelated: false, summary: "结构样例，不进入模型；正式新闻源待接入。", status: "sample" },
  { eventId: "hu-2026-w23-policy-investment", date: "2026-06-01", countrySlug: "hungary", title: "新政府与产业投资政策成为本周观察重点", sourceId: "news_pending", topic: "经济", eventType: "weekly_sample", direction: "pending", intensity: null, modelImpact: "excluded", chinaRelated: false, summary: "结构样例，不进入模型；正式新闻源待接入。", status: "sample" },
  { eventId: "cz-2026-w23-industry-energy", date: "2026-06-01", countrySlug: "czechia", title: "产业竞争力、能源供应与政府经济政策受到关注", sourceId: "news_pending", topic: "能源", eventType: "weekly_sample", direction: "pending", intensity: null, modelImpact: "excluded", chinaRelated: false, summary: "结构样例，不进入模型；正式新闻源待接入。", status: "sample" },
  { eventId: "sk-2026-w23-auto-regional", date: "2026-06-01", countrySlug: "slovakia", title: "政府政策、汽车产业链和区域发展是本周重点", sourceId: "news_pending", topic: "区域", eventType: "weekly_sample", direction: "pending", intensity: null, modelImpact: "excluded", chinaRelated: false, summary: "结构样例，不进入模型；正式新闻源待接入。", status: "sample" },
];

export function getExtendedObservations(countrySlug: string, category?: ExtendedCategory) {
  return extendedObservations
    .filter((observation) => {
      const indicator = extendedIndicators.find((item) => item.id === observation.indicatorId);
      return observation.countrySlug === countrySlug && (!category || indicator?.category === category);
    })
    .sort((a, b) => {
      const indicatorDelta = v4TemplateIndicatorIds.indexOf(a.indicatorId as (typeof v4TemplateIndicatorIds)[number]) - v4TemplateIndicatorIds.indexOf(b.indicatorId as (typeof v4TemplateIndicatorIds)[number]);
      return indicatorDelta || a.date.localeCompare(b.date);
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
