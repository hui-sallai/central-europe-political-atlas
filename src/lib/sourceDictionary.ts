export type SourceReliabilityLevel = "A" | "B" | "C" | "D";
export type SourceStatus = "official" | "manual" | "pending" | "sample";

export type SourceDictionaryRecord = {
  sourceId: string;
  nameZh: string;
  nameEn: string;
  sourceType: string;
  coverage: string;
  indicatorCoverage: string;
  url: string;
  reliabilityLevel: SourceReliabilityLevel;
  sourceStatus: SourceStatus;
  updateFrequency: string;
  canBeOfficialData: boolean;
  canBeEventBasis: boolean;
  supplementalOnly: boolean;
  excludedFromAnalysis: boolean;
  lastCheckedAt: string;
  note: string;
};

const lastCheckedAt = "2026-07-17";

export const sourceDictionaryRows: SourceDictionaryRecord[] = [
  { sourceId: "eurostat", nameZh: "Eurostat", nameEn: "Eurostat", sourceType: "Eurostat", coverage: "欧盟与欧洲国家", indicatorCoverage: "宏观、财政、外部、能源、产业", url: "https://ec.europa.eu/eurostat/databrowser/", reliabilityLevel: "A", sourceStatus: "official", updateFrequency: "按数据集更新", canBeOfficialData: true, canBeEventBasis: false, supplementalOnly: false, excludedFromAnalysis: false, lastCheckedAt, note: "官方统计数据库；可作为宏观数据和正式观测值来源，不作为新闻事件依据。" },
  { sourceId: "national_statistics", nameZh: "各国统计局", nameEn: "National statistical offices", sourceType: "各国统计局", coverage: "十国", indicatorCoverage: "人口、国民账户、价格、劳动力、产业", url: "https://hui-sallai.github.io/central-europe-political-atlas/data/", reliabilityLevel: "A", sourceStatus: "official", updateFrequency: "按国家发布节奏", canBeOfficialData: true, canBeEventBasis: false, supplementalOnly: false, excludedFromAnalysis: false, lastCheckedAt, note: "国家官方统计机构；用于正式观测值，正式版逐国替换为具体统计局链接。" },
  { sourceId: "national_central_banks", nameZh: "各国央行", nameEn: "National central banks", sourceType: "各国央行", coverage: "十国", indicatorCoverage: "国际收支、FDI、金融与宏观背景", url: "https://www.ecb.europa.eu/", reliabilityLevel: "A", sourceStatus: "official", updateFrequency: "按指标更新", canBeOfficialData: true, canBeEventBasis: false, supplementalOnly: false, excludedFromAnalysis: false, lastCheckedAt, note: "用于 FDI、经常账户和金融口径交叉核验；不作为新闻事件依据。" },
  { sourceId: "international_organizations", nameZh: "国际组织", nameEn: "International organizations", sourceType: "国际组织", coverage: "全球 / 欧洲", indicatorCoverage: "宏观、投资、能源、贸易补充", url: "https://data.oecd.org/", reliabilityLevel: "A", sourceStatus: "official", updateFrequency: "按机构更新", canBeOfficialData: true, canBeEventBasis: true, supplementalOnly: false, excludedFromAnalysis: false, lastCheckedAt, note: "OECD、IMF、World Bank、UNCTAD 等可作为正式数据或事件依据。" },
  { sourceId: "eu_institutions", nameZh: "欧盟机构", nameEn: "EU institutions", sourceType: "欧盟机构", coverage: "欧盟", indicatorCoverage: "财政、监管、项目与政策事件", url: "https://european-union.europa.eu/", reliabilityLevel: "A", sourceStatus: "official", updateFrequency: "按公告更新", canBeOfficialData: true, canBeEventBasis: true, supplementalOnly: false, excludedFromAnalysis: false, lastCheckedAt, note: "欧盟委员会、理事会、议会等官方材料可作为正式数据和事件依据。" },
  { sourceId: "official_government", nameZh: "官方政府部门", nameEn: "Official government departments", sourceType: "官方政府部门", coverage: "十国", indicatorCoverage: "政府结构、政策事件、项目公告", url: "https://hui-sallai.github.io/central-europe-political-atlas/methodology/", reliabilityLevel: "A", sourceStatus: "official", updateFrequency: "按公告更新", canBeOfficialData: true, canBeEventBasis: true, supplementalOnly: false, excludedFromAnalysis: false, lastCheckedAt, note: "政府公告、部委材料和正式政策文件可作为正式数据或事件依据。" },
  { sourceId: "electoral_commissions", nameZh: "选举机构", nameEn: "Electoral commissions", sourceType: "选举机构", coverage: "十国", indicatorCoverage: "选举结果、政党、区域投票", url: "https://hui-sallai.github.io/central-europe-political-atlas/methodology/", reliabilityLevel: "A", sourceStatus: "pending", updateFrequency: "按选举周期", canBeOfficialData: true, canBeEventBasis: true, supplementalOnly: false, excludedFromAnalysis: false, lastCheckedAt, note: "官方选举结果可作为正式数据和事件依据；当前区域选举数据待接入。" },
  { sourceId: "mainstream_wire", nameZh: "主流通讯社", nameEn: "Mainstream news agencies", sourceType: "主流通讯社", coverage: "全球 / 欧洲", indicatorCoverage: "新闻事件、项目状态", url: "https://www.reuters.com/", reliabilityLevel: "B", sourceStatus: "manual", updateFrequency: "实时 / 日更", canBeOfficialData: false, canBeEventBasis: true, supplementalOnly: true, excludedFromAnalysis: false, lastCheckedAt, note: "可作为事件依据和补充线索；正式数据仍优先使用 A 级来源。" },
  { sourceId: "authoritative_thinktanks", nameZh: "权威智库", nameEn: "Authoritative think tanks", sourceType: "权威智库", coverage: "欧洲 / 区域", indicatorCoverage: "背景解释、专题事件", url: "https://www.bruegel.org/", reliabilityLevel: "B", sourceStatus: "manual", updateFrequency: "按报告更新", canBeOfficialData: false, canBeEventBasis: true, supplementalOnly: true, excludedFromAnalysis: false, lastCheckedAt, note: "可作为事件依据或补充解释，不能替代官方统计。" },
  { sourceId: "official_annual_reports", nameZh: "官方年报", nameEn: "Official annual reports", sourceType: "官方年报", coverage: "机构 / 企业 / 政府", indicatorCoverage: "项目主体、金额、股权、产能", url: "https://hui-sallai.github.io/central-europe-political-atlas/data/", reliabilityLevel: "B", sourceStatus: "manual", updateFrequency: "年度", canBeOfficialData: true, canBeEventBasis: true, supplementalOnly: false, excludedFromAnalysis: false, lastCheckedAt, note: "可作为项目金额、主体、股权和产能核验来源。" },
  { sourceId: "company_announcements", nameZh: "企业公告", nameEn: "Company announcements", sourceType: "企业公告", coverage: "项目主体", indicatorCoverage: "对华项目金额、主体、时间线", url: "https://hui-sallai.github.io/central-europe-political-atlas/data/", reliabilityLevel: "B", sourceStatus: "manual", updateFrequency: "按公告更新", canBeOfficialData: true, canBeEventBasis: true, supplementalOnly: false, excludedFromAnalysis: false, lastCheckedAt, note: "可作为项目和企业行为依据；关键金额进入分析前需与官方或年报交叉核验。" },
  { sourceId: "local_media", nameZh: "地方媒体", nameEn: "Local media", sourceType: "地方媒体", coverage: "国家 / 地方", indicatorCoverage: "项目线索、地方事件", url: "https://hui-sallai.github.io/central-europe-political-atlas/news/", reliabilityLevel: "C", sourceStatus: "manual", updateFrequency: "不定期", canBeOfficialData: false, canBeEventBasis: true, supplementalOnly: true, excludedFromAnalysis: false, lastCheckedAt, note: "可作为事件线索和地方补充，不单独进入正式数据。" },
  { sourceId: "industry_sites", nameZh: "行业网站", nameEn: "Industry websites", sourceType: "行业网站", coverage: "行业 / 企业", indicatorCoverage: "产业链、汽车、能源、物流项目", url: "https://hui-sallai.github.io/central-europe-political-atlas/data/", reliabilityLevel: "C", sourceStatus: "manual", updateFrequency: "不定期", canBeOfficialData: false, canBeEventBasis: true, supplementalOnly: true, excludedFromAnalysis: false, lastCheckedAt, note: "可作为行业事件和项目线索，进入正式分析前需更高等级来源复核。" },
  { sourceId: "manual_sources", nameZh: "人工整理来源", nameEn: "Manually curated sources", sourceType: "人工整理来源", coverage: "平台内部", indicatorCoverage: "摘要、翻译、字段整理", url: "https://hui-sallai.github.io/central-europe-political-atlas/methodology/", reliabilityLevel: "C", sourceStatus: "manual", updateFrequency: "随数据维护", canBeOfficialData: false, canBeEventBasis: true, supplementalOnly: true, excludedFromAnalysis: false, lastCheckedAt, note: "必须回链到原始来源，不能单独作为正式依据。" },
  { sourceId: "pending_sources", nameZh: "待接入来源", nameEn: "Pending sources", sourceType: "待接入来源", coverage: "待定", indicatorCoverage: "缺失字段", url: "https://hui-sallai.github.io/central-europe-political-atlas/data/", reliabilityLevel: "D", sourceStatus: "pending", updateFrequency: "待定", canBeOfficialData: false, canBeEventBasis: false, supplementalOnly: false, excludedFromAnalysis: true, lastCheckedAt, note: "字段预留但来源尚未接入；不进入正式数据、事件库或后续分析。" },
  { sourceId: "sample_sources", nameZh: "结构样例来源", nameEn: "Structural sample sources", sourceType: "结构样例来源", coverage: "平台结构测试", indicatorCoverage: "页面结构、地图样例、新闻样例", url: "https://hui-sallai.github.io/central-europe-political-atlas/methodology/", reliabilityLevel: "D", sourceStatus: "sample", updateFrequency: "不更新", canBeOfficialData: false, canBeEventBasis: false, supplementalOnly: false, excludedFromAnalysis: true, lastCheckedAt, note: "只用于验证结构，不进入正式数据、事件库、模型或分析。" },
];

export function sourceReliabilityRule(level: SourceReliabilityLevel) {
  const rules: Record<SourceReliabilityLevel, string> = {
    A: "官方统计、官方机构、正式数据库；用于宏观数据和正式观测值。",
    B: "权威媒体、智库、企业公告、年报；用于事件、项目和背景核验。",
    C: "地方媒体、行业网站、二级转述；只作补充线索。",
    D: "无法核验、结构样例、占位内容；不进入正式分析。",
  };

  return rules[level];
}

export function getSourceDictionaryRecord(sourceId: string) {
  return sourceDictionaryRows.find((source) => source.sourceId === sourceId);
}
