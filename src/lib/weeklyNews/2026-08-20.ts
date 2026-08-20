import type { WeeklyNewsItem } from "../newsData";
import type { EventSourceStatus, EventType } from "../../types/Event";

type Source = {
  label: string;
  url: string;
  language: string;
  status: EventSourceStatus;
};

type Entry = {
  id: string;
  date: string;
  title: string;
  summary: string;
  topic?: WeeklyNewsItem["topic"];
  eventType?: EventType;
  source?: Source;
};

const sources = {
  huMfa: { label: "匈牙利外交机构", url: "https://bucharest.mfa.gov.hu/hu/articles/baka-andras-magyarorszag-uj-koztarsasagi-elnoke-1", language: "hu / zh", status: "official" },
  huNews: { label: "The Budapest Times", url: "https://www.budapesttimes.hu/category/hungary/", language: "en / zh", status: "manual" },
  huJournal: { label: "Hungarian Political Journal", url: "https://www.hungarianpoliticaljournal.com/executive-report", language: "en / zh", status: "manual" },
  plGus: { label: "Statistics Poland", url: "https://stat.gov.pl/kalendarium/08-2026.html", language: "pl / zh", status: "official" },
  plReuters: { label: "Reuters / MarketScreener", url: "https://ae.marketscreener.com/news/poland-to-lower-personal-income-taxes-raise-tax-rate-for-companies-ce7859d2d981f327", language: "en / zh", status: "manual" },
  plBudget: { label: "PAP / Reuters / MarketScreener", url: "https://au.marketscreener.com/news/poland-posts-pln-141-bln-budget-gap-after-seven-months-of-2026-pap-ce7859dfd081f324", language: "en / zh", status: "manual" },
  plIng: { label: "ING Think", url: "https://think.ing.com/downloads/pdf/article/polands-economy-resilient-to-middle-east-woes", language: "en / zh", status: "manual" },
  natoRoPl: { label: "NATO / Romania Insider", url: "https://www.romania-insider.com/nato-firmly-condemns-russia-violating-romanian-polish-airspace", language: "en / zh", status: "manual" },
  czGov: { label: "捷克政府", url: "https://vlada.gov.cz/cz/media-centrum/ocekavane-udalosti/17--srpna-2026-schuze-vlady-cr-228329/", language: "cs / zh", status: "official" },
  czGovPress: { label: "捷克政府", url: "https://vlada.gov.cz/vanoce/cz/media-centrum/tiskove-konference/tiskova-konference-po-jednani-vlady--17--srpna-2026-228352/", language: "cs / zh", status: "official" },
  czStat: { label: "Czech Statistical Office", url: "https://csu.gov.cz/", language: "cs / en / zh", status: "official" },
  skStat: { label: "Statistical Office of the Slovak Republic", url: "https://slovak.statistics.sk/wps/portal/ext/home/", language: "sk / en / zh", status: "official" },
  skRoma: { label: "斯洛伐克政府罗姆人社区专员办公室", url: "https://www.romovia.vlada.gov.sk/", language: "sk / zh", status: "official" },
  skParliament: { label: "National Council of the Slovak Republic", url: "https://www.nrsr.sk/web/?SectionId=174", language: "sk / zh", status: "official" },
  siStat: { label: "Statistical Office of the Republic of Slovenia", url: "https://www.stat.si/StatWeb/en/Home/Index", language: "sl / en / zh", status: "official" },
  rsGov: { label: "塞尔维亚政府", url: "https://www.srbija.gov.rs/index.php/en", language: "sr / en / zh", status: "official" },
  atStat: { label: "Statistics Austria", url: "https://www.statistik.at/en/medien/release-calendar", language: "de / en / zh", status: "official" },
  deNews: { label: "tagesschau.de", url: "https://www.tagesschau.de/archiv/allemeldungen", language: "de / zh", status: "manual" },
  roInsider: { label: "Romania Insider", url: "https://www.romania-insider.com/", language: "en / zh", status: "manual" },
  roGuardian: { label: "The Guardian / agencies", url: "https://www.theguardian.com/world/2026/aug/14/romania-nuclear-plant-shut-down-cernavoda-danube-river-water-drought", language: "en / zh", status: "manual" },
  roAgerpres: { label: "AGERPRES", url: "https://agerpres.ro/economic/2026/08/03/bolojan-dacia-si-ford-au-oprit-productia-de-astazi-voluntar-pana-pe-data-de-19-august--1581815", language: "ro / zh", status: "manual" },
  roTagesschau: { label: "tagesschau.de", url: "https://www.tagesschau.de/archiv/allemeldungen", language: "de / zh", status: "manual" },
  hrDzs: { label: "Croatian Bureau of Statistics", url: "https://podaci.dzs.hr/en/", language: "hr / en / zh", status: "official" },
  hrHrt: { label: "HRT", url: "https://vijesti.hrt.hr/", language: "hr / zh", status: "manual" },
} satisfies Record<string, Source>;

const countries = {
  hungary: ["匈牙利", "hu / en / zh"],
  poland: ["波兰", "pl / en / zh"],
  czechia: ["捷克", "cs / en / zh"],
  slovakia: ["斯洛伐克", "sk / en / zh"],
  slovenia: ["斯洛文尼亚", "sl / en / zh"],
  serbia: ["塞尔维亚", "sr / en / zh"],
  austria: ["奥地利", "de / en / zh"],
  germany: ["德国", "de / en / zh"],
  romania: ["罗马尼亚", "ro / en / zh"],
  croatia: ["克罗地亚", "hr / en / zh"],
} as const;

function makeBatch(countrySlug: keyof typeof countries, defaultSource: Source, entries: Entry[]): WeeklyNewsItem[] {
  const [countryZh, language] = countries[countrySlug];
  return entries.map((entry) => {
    const source = entry.source ?? defaultSource;
    return {
      id: entry.id,
      countrySlug,
      countryZh,
      title: entry.title,
      topic: entry.topic ?? "经济",
      summary: `${entry.summary} 本条为过去一周事件库记录，不单独触发模型计算。`,
      sourceLabel: source.label,
      sourceUrl: source.url,
      language: source.language || language,
      weekOf: entry.date,
      dataStatus: "verified",
      actor: source.label,
      eventType: entry.eventType ?? "macro",
      direction: "neutral",
      intensity: null,
      affectedIndicators: [],
      affectedModels: [],
      relatedProjectIds: [],
      duration: "pending",
      confidence: source.status === "official" ? "high" : "medium",
      sourceStatus: source.status,
      codingStatus: "partial",
      entersModel: false,
    };
  });
}

export const weeklyNews20260820Additional: WeeklyNewsItem[] = [
  ...makeBatch("hungary", sources.huNews, [
    { id: "hu-2026-08-15-eu-recovery-fund", date: "2026-08-15", title: "政府称将争取收回全部欧盟复苏资金", summary: "主管部长表示将继续争取约 100 亿欧元欧盟复苏资金，相关资金能否足额取得仍取决于后续程序。", topic: "欧盟", eventType: "EU_funds" },
    { id: "hu-2026-08-15-motorway-contract-review", date: "2026-08-15", title: "政府宣布审查高速公路特许经营合同", summary: "政府把高速公路特许经营安排纳入重新审视范围，当前记录政策审查而非合同已经变更。", topic: "政治", eventType: "fiscal" },
    { id: "hu-2026-08-16-paks-barge-operation", date: "2026-08-16", title: "多瑙河低水位应对措施在帕克什附近实施", summary: "政府推进沉放驳船等临时工程以维持帕克什核电站冷却条件，措施属于应急运行安排。", topic: "能源", eventType: "energy" },
    { id: "hu-2026-08-15-paks-second-barge-plan", date: "2026-08-15", title: "帕克什核电站第二阶段驳船工程进入准备", summary: "有关部门公布后续驳船沉放安排，以应对多瑙河水位继续下降的运行风险。", topic: "能源", eventType: "energy" },
    { id: "hu-2026-08-14-procurement-exclusion-register", date: "2026-08-14", title: "公共采购排除企业登记制度进入公开讨论", summary: "新的公共采购排除登记安排受到关注，核心涉及供应商合规与政府采购透明度。", topic: "政治", eventType: "fiscal" },
    { id: "hu-2026-08-13-drought-farmer-measures", date: "2026-08-13", title: "政府公布旱情下的农业支持措施", summary: "政府针对旱情与低水位对农业经营的影响公布支持安排，具体财政影响仍待正式预算资料。", topic: "经济", eventType: "fiscal" },
    { id: "hu-2026-08-15-energy-development-plan", date: "2026-08-15", title: "政府通过能源系统发展方案", summary: "能源发展方案聚焦供应安全和基础设施适应，当前不把政策目标等同于已完成投资。", topic: "能源", eventType: "energy" },
    { id: "hu-2026-08-14-affordable-rental-programme", date: "2026-08-14", title: "可负担租赁住房计划进入政策议程", summary: "住房计划被列入政府近期政策事项，项目规模、资格条件和财政来源仍需后续正式文件核验。", topic: "政治", eventType: "regional", source: sources.huJournal },
    { id: "hu-2026-08-14-commercial-property-investment", date: "2026-08-14", title: "上半年商业地产投资活动受到市场关注", summary: "行业资料显示商业地产交易回升；该条仅作为市场背景，未将行业口径转入正式宏观观测。", topic: "经济", eventType: "FDI", source: sources.huJournal },
  ]),
  ...makeBatch("poland", sources.plGus, [
    { id: "pl-2026-08-19-tax-package", date: "2026-08-19", title: "政府提出个人所得税与大型企业税率调整", summary: "总理公布个人所得税门槛和大型企业所得税调整方案；现阶段按政策提案记录。", topic: "政治", eventType: "fiscal", source: sources.plReuters },
    { id: "pl-2026-08-17-seven-month-budget-gap", date: "2026-08-17", title: "财政部公布前七个月预算执行缺口", summary: "公开数据记录前七个月中央预算收支差额，后续仍需与全年预算执行口径区分。", eventType: "fiscal", source: sources.plBudget },
    { id: "pl-2026-08-13-nato-airspace-response", date: "2026-08-13", title: "北约讨论波兰与罗马尼亚领空事件", summary: "北约成员就近期领空侵犯和无人机事件进行磋商，事件按安全与区域政治背景记录。", topic: "政治", eventType: "regional", source: sources.natoRoPl },
    { id: "pl-2026-08-14-july-consumer-prices", date: "2026-08-14", title: "统计局发布 7 月消费者价格数据", summary: "Statistics Poland 更新 7 月消费价格指标，正式数值仍由 canonical observations 的质量验收流程管理。" },
    { id: "pl-2026-08-20-enterprise-wages-employment", date: "2026-08-20", title: "统计局更新企业部门就业与工资数据", summary: "本周发布计划涵盖企业部门就业与平均工资，用于跟踪劳动力市场而非直接形成压力判断。" },
    { id: "pl-2026-08-20-industrial-output", date: "2026-08-20", title: "统计局更新工业生产数据", summary: "工业生产月度发布进入事件库，具体数值需通过观测值表和来源字段后再用于分析。", eventType: "industrial_policy" },
    { id: "pl-2026-08-20-producer-prices", date: "2026-08-20", title: "统计局更新工业生产者价格", summary: "生产者价格发布用于记录成本端变化，不把单月变动自动解释为消费者通胀方向。" },
    { id: "pl-2026-08-20-housing-construction", date: "2026-08-20", title: "统计局更新住房建设活动", summary: "住房开工、许可和竣工信息进入周度事件索引，区域明细仍以官方表格为准。", eventType: "regional" },
    { id: "pl-2026-08-13-gdp-analysis", date: "2026-08-13", title: "研究机构评估二季度增长韧性", summary: "ING 基于官方快报分析投资、消费与外部冲击对增长的影响；该条属于二级研究解读。", source: sources.plIng },
  ]),
  ...makeBatch("czechia", sources.czGov, [
    { id: "cz-2026-08-17-post-cabinet-briefing", date: "2026-08-17", title: "政府发布 8 月 17 日内阁会议结果说明", summary: "会后发布会汇总内阁审议结果；各议题是否完成立法仍按后续正式文件核验。", topic: "政治", eventType: "regional", source: sources.czGovPress },
    { id: "cz-2026-08-17-drought-response", date: "2026-08-17", title: "内阁审议旱情应对与水资源安排", summary: "内阁将旱情影响和应对措施列入议程，当前只记录政策讨论与行政安排。", topic: "政治", eventType: "regional" },
    { id: "cz-2026-08-17-digital-consumer-law", date: "2026-08-17", title: "内阁审议数字时代消费者保护修法", summary: "议程涉及数字交易环境下的消费者保护与民法调整，尚不把议程列项视为法律已经生效。", topic: "政治", eventType: "industrial_policy" },
    { id: "cz-2026-08-17-prague-high-speed-rail", date: "2026-08-17", title: "布拉格高速铁路空间规划进入内阁审议", summary: "政府讨论高速铁路相关空间发展文件，项目投资和建设时序仍待专项资料。", topic: "区域", eventType: "regional" },
    { id: "cz-2026-08-17-digital-innovation-centres", date: "2026-08-17", title: "欧洲数字创新中心支持方案进入内阁审议", summary: "议程涉及数字创新中心支持，当前仅记录产业政策方向，不推定资金已经拨付。", topic: "欧盟", eventType: "industrial_policy" },
    { id: "cz-2026-08-17-municipal-fiscal-monitoring", date: "2026-08-17", title: "政府审阅地方财政监测材料", summary: "地方政府财政监测被纳入会议议程，后续比较仍需采用统一财政定义和年份。", topic: "政治", eventType: "fiscal" },
    { id: "cz-2026-08-17-cybersecurity-strategy", date: "2026-08-17", title: "国家网络安全战略执行事项进入议程", summary: "政府讨论网络安全战略相关任务，事件只用于政策背景，不生成政治风险分数。", topic: "政治", eventType: "industrial_policy" },
    { id: "cz-2026-08-13-statistical-metadata-update", date: "2026-08-13", title: "统计局更新指标元数据系统", summary: "捷克统计局更新统计指标目录和元数据入口，为后续来源核验提供官方定义。", eventType: "macro", source: sources.czStat },
    { id: "cz-2026-08-14-current-economic-data", date: "2026-08-14", title: "统计局更新近期经济数据入口", summary: "近期经济数据发布被纳入周度事件索引；平台不从页面摘要自动提取模型输入。", eventType: "macro", source: sources.czStat },
  ]),
  ...makeBatch("slovakia", sources.skStat, [
    { id: "sk-2026-08-19-july-hicp", date: "2026-08-19", title: "斯洛伐克公布 7 月 HICP", summary: "统计局公布 7 月欧盟协调口径消费价格，年度通胀放缓；模型输入仍以正式观测值为准。" },
    { id: "sk-2026-08-18-accommodation-q2", date: "2026-08-18", title: "二季度住宿业营业额与接待能力数据发布", summary: "住宿业季度发布用于观察旅游服务活动，不与全国 GDP 或就业指标混用。" },
    { id: "sk-2026-08-17-industrial-orders", date: "2026-08-17", title: "统计局发布 6 月工业新订单", summary: "工业新订单月度数据进入事件索引，仅作为产业活动的近期背景。", eventType: "industrial_policy" },
    { id: "sk-2026-08-13-july-cpi", date: "2026-08-13", title: "统计局发布 7 月消费者价格指数", summary: "国家口径 CPI 发布与 HICP 分开记录，避免在跨国比较中混用定义。" },
    { id: "sk-2026-08-20-consumer-survey", date: "2026-08-20", title: "统计局更新 7 月消费者调查", summary: "消费者调查反映受访者判断，不作为官方经济产出或模型基础分数。" },
    { id: "sk-2026-08-14-inacovce-family-support", date: "2026-08-14", title: "Iňačovce 社区家庭支持服务扩展", summary: "政府社区项目将卫生设施与家庭支持、儿童照护和非正式教育结合，按区域社会政策事件记录。", topic: "区域", eventType: "regional", source: sources.skRoma },
    { id: "sk-2026-08-13-anti-discrimination-guide", date: "2026-08-13", title: "政府部门发布仇恨言论与歧视教育手册", summary: "罗姆人社区专员办公室与内政部门发布教育材料，属于制度与社会政策记录。", topic: "政治", eventType: "regional", source: sources.skRoma },
    { id: "sk-2026-08-13-youth-advisory-body", date: "2026-08-13", title: "罗姆人青年事务咨询机构举行成立会议", summary: "新的青年咨询机制进入运作，当前不推导其政策效果。", topic: "政治", eventType: "regional", source: sources.skRoma },
    { id: "sk-2026-08-17-parliament-weekly-agenda", date: "2026-08-17", title: "国民议会发布本周议事安排", summary: "议会周度安排作为制度活动入口，具体法案结果仍需逐项核验。", topic: "政治", eventType: "election", source: sources.skParliament },
  ]),
  ...makeBatch("slovenia", sources.siStat, [
    { id: "si-2026-08-20-building-permits", date: "2026-08-20", title: "斯洛文尼亚公布 7 月建筑许可", summary: "统计局更新建筑许可数量与规划建筑面积，作为建设活动的先行信息。", eventType: "regional", source: { ...sources.siStat, url: "https://www.stat.si/StatWeb/en/News/Index/14531" } },
    { id: "si-2026-08-19-services-producer-prices", date: "2026-08-19", title: "二季度服务生产者价格发布", summary: "服务生产者价格季度数据用于观察企业服务成本，不直接替代 CPI。", source: { ...sources.siStat, url: "https://www.stat.si/StatWeb/en/News/Index/14513" } },
    { id: "si-2026-08-19-construction-producer-prices", date: "2026-08-19", title: "二季度建筑生产者价格发布", summary: "建筑价格季度发布进入成本与投资背景库。", source: { ...sources.siStat, url: "https://www.stat.si/StatWeb/en/News/Index/14507" } },
    { id: "si-2026-08-18-employment-june", date: "2026-08-18", title: "统计局更新 6 月就业人数", summary: "登记就业数据用于劳动力市场观察，与 LFS 失业率保持口径区分。" },
    { id: "si-2026-08-14-agricultural-input-prices", date: "2026-08-14", title: "农业投入价格月度数据发布", summary: "农业投入价格反映农业生产成本，不直接作为消费者食品价格。" },
    { id: "si-2026-08-14-construction-output", date: "2026-08-14", title: "建筑产出月度数据发布", summary: "建筑活动月度指标进入区域和投资背景索引。", eventType: "regional" },
    { id: "si-2026-08-14-transport-indicators", date: "2026-08-14", title: "交通与运输指标更新", summary: "公路、铁路等运输活动数据进入外部和区域经济背景库。", eventType: "regional" },
    { id: "si-2026-08-14-agricultural-producer-prices", date: "2026-08-14", title: "农业生产者价格发布", summary: "农产品生产者价格与投入价格分开记录，避免混淆成本和产出价格。" },
    { id: "si-2026-08-14-roundwood-purchases", date: "2026-08-14", title: "原木采购价值月度数据发布", summary: "林业原材料采购数据作为区域产业活动背景保留。", eventType: "industrial_policy" },
  ]),
  ...makeBatch("serbia", sources.rsGov, [
    { id: "rs-2026-08-20-budget-revision", date: "2026-08-20", title: "政府通过 2026 年预算修订法案", summary: "预算修订进入正式政府程序，财政影响仍需以法案和预算执行表为准。", topic: "政治", eventType: "fiscal", source: { ...sources.rsGov, url: "https://www.srbija.gov.rs/vest/en/285175/government-adopts-2026-budget-revision-bill.php" } },
    { id: "rs-2026-08-19-bor-seliste-road", date: "2026-08-19", title: "Bor–Selište 公路项目公布完工目标", summary: "政府更新区域道路建设进度和预计完工时间，按基础设施事件记录。", topic: "区域", eventType: "regional" },
    { id: "rs-2026-08-19-obrenovac-waste-system", date: "2026-08-19", title: "Obrenovac 推进现代化废弃物管理系统", summary: "地方环境基础设施项目进入政府新闻索引，投资规模仍按项目资料核验。", topic: "区域", eventType: "regional" },
    { id: "rs-2026-08-19-sunflower-pricing", date: "2026-08-19", title: "政府要求向日葵收成获得适当定价", summary: "农业主管部门就收购和价格问题表态，当前不把政策表态视为市场价格观测。" },
    { id: "rs-2026-08-18-uk-bilateral-cooperation", date: "2026-08-18", title: "塞尔维亚与英国讨论双边合作", summary: "双方讨论政治经济合作议题，具体协议和项目需等待正式文本。", topic: "政治", eventType: "regional" },
    { id: "rs-2026-08-18-prahovo-port", date: "2026-08-18", title: "Prahovo 港口改扩建项目获政府更新", summary: "政府公布港口改扩建安排和投资信息，按交通基础设施项目记录。", topic: "区域", eventType: "regional" },
    { id: "rs-2026-08-18-diaspora-return", date: "2026-08-18", title: "政府强调侨民回流的经济与人口作用", summary: "相关部门将回流与就业、投资和人口政策联系，当前仅作为政策叙事记录。", topic: "政治", eventType: "regional" },
    { id: "rs-2026-08-18-bakery-inspections", date: "2026-08-18", title: "市场监管部门加强烘焙行业检查", summary: "监管行动涉及食品经营合规和消费者保护，不生成企业风险评分。", topic: "政治", eventType: "industrial_policy" },
    { id: "rs-2026-08-14-nis-gas-power-plant", date: "2026-08-14", title: "Niš 附近燃气电站项目进入政府议程", summary: "政府更新燃气发电基础设施规划，当前不把规划装机等同于已投产能力。", topic: "能源", eventType: "energy" },
  ]),
  ...makeBatch("austria", sources.atStat, [
    { id: "at-2026-08-14-import-prices-q1", date: "2026-08-14", title: "奥地利发布一季度进口价格指数", summary: "进口价格季度数据用于外部成本观察，不直接替代消费价格。" },
    { id: "at-2026-08-14-import-prices-q2", date: "2026-08-14", title: "奥地利发布二季度进口价格指数", summary: "二季度进口价格更新与一季度修订分开记录，便于保持时间序列。" },
    { id: "at-2026-08-14-minimum-wage-index", date: "2026-08-14", title: "7 月协议最低工资指数发布", summary: "协议工资指数反映集体协议工资变动，不等同于实际工资或居民收入。" },
    { id: "at-2026-08-14-used-vehicle-registrations", date: "2026-08-14", title: "前七个月二手车辆登记数据发布", summary: "车辆登记数据作为耐用品市场和交通活动背景。", eventType: "industrial_policy" },
    { id: "at-2026-08-14-slaughterings", date: "2026-08-14", title: "6 月屠宰与肉类生产数据发布", summary: "农业生产月度数据进入行业背景库。" },
    { id: "at-2026-08-17-agricultural-prices-annual", date: "2026-08-17", title: "2025 年农业价格指数发布", summary: "年度农业价格指数用于长期比较，不与 2026 月度数据混作同年观测。" },
    { id: "at-2026-08-17-agricultural-prices-q2", date: "2026-08-17", title: "二季度农业价格指数发布", summary: "季度农业价格更新用于观察投入与产出价格变化。" },
    { id: "at-2026-08-17-agricultural-prices-june", date: "2026-08-17", title: "6 月农业价格指数发布", summary: "月度农业价格发布与季度、年度结果保持频率区分。" },
    { id: "at-2026-08-18-vehicle-stock", date: "2026-08-18", title: "截至 7 月底机动车保有量更新", summary: "车辆保有量作为交通和消费结构背景，不进入当前模型分数。", eventType: "industrial_policy" },
  ]),
  ...makeBatch("germany", sources.deNews, [
    { id: "de-2026-08-20-china-trade", date: "2026-08-20", title: "中国继续保持德国最大贸易伙伴地位", summary: "联邦统计数据表明上半年对华贸易仍居首位，同时进口与出口结构不对称。", topic: "对华经贸", eventType: "China", source: { ...sources.deNews, url: "https://www.tagesschau.de/wirtschaft/konjunktur/exporte-deutschland-china-100.html" } },
    { id: "de-2026-08-20-wealth-inequality", date: "2026-08-20", title: "研究显示财富不平等略降但仍处高位", summary: "研究讨论财富分布与地区差异，属于研究解读而非官方国民账户指标。", source: { ...sources.deNews, url: "https://www.tagesschau.de/wirtschaft/verbraucher/vermoegensungleichheit-deutschland-100.html" } },
    { id: "de-2026-08-20-solar-target", date: "2026-08-20", title: "德国达到 2026 年太阳能扩张目标", summary: "能源行业数据表明太阳能新增容量达到年度目标，仍需与电网和发电量指标区分。", topic: "能源", eventType: "energy", source: { ...sources.deNews, url: "https://www.tagesschau.de/wirtschaft/energie/solar-ausbau-energieversorgung-100.html" } },
    { id: "de-2026-08-20-climate-policy", date: "2026-08-20", title: "政府气候政策执行路径引发公共讨论", summary: "政策访谈讨论联邦政府气候政策约束和执行重点，不代表已经出台新法。", topic: "政治", eventType: "energy", source: { ...sources.deNews, url: "https://www.tagesschau.de/inland/innenpolitik/klimapolitik-bundesregierung-partzsch-100.html" } },
    { id: "de-2026-08-20-housing-supply", date: "2026-08-20", title: "婴儿潮一代住房转移对供给的影响受到关注", summary: "研究讨论代际住房转移与房地产供给，属于结构性背景。", eventType: "regional", source: { ...sources.deNews, url: "https://www.tagesschau.de/wirtschaft/verbraucher/immobilien-preise-babyboomer-angebot-100.html" } },
    { id: "de-2026-08-19-gas-storage", date: "2026-08-19", title: "德国天然气储存水平引发冬季供应讨论", summary: "政府和专家讨论储气水平及寒冬情形，当前不生成能源风险分数。", topic: "能源", eventType: "energy" },
    { id: "de-2026-08-19-social-reform-proposal", date: "2026-08-19", title: "社会福利组织提出就业激励改革方案", summary: "方案旨在通过就业激励降低贫困，当前按社会政策提案而非生效政策记录。", topic: "政治", eventType: "fiscal" },
    { id: "de-2026-08-19-fuel-prices", date: "2026-08-19", title: "低水位与油价推动德国燃油价格回升", summary: "报道将莱茵河低水位和油价与加油站价格联系，属于近期成本传导背景。", topic: "能源", eventType: "energy" },
    { id: "de-2026-08-19-industrial-order-backlog", date: "2026-08-19", title: "德国工业订单存量升至多年高位", summary: "联邦统计数据更新工业订单存量，提供制造业活动背景但不替代产出指标。", eventType: "industrial_policy" },
  ]),
  ...makeBatch("romania", sources.roInsider, [
    { id: "ro-2026-08-13-cernavoda-shutdown", date: "2026-08-13", title: "切尔纳沃德核电站第二机组受低水位影响停运", summary: "多瑙河低水位导致受控停运，事件按能源供应冲击记录。", topic: "能源", eventType: "energy", source: { ...sources.roInsider, url: "https://www.romania-insider.com/index.php/cernavoda-plant-shuts-down-aug-2026" } },
    { id: "ro-2026-08-13-transgaz-loan", date: "2026-08-13", title: "Transgaz 获得 3 亿欧元基础设施贷款", summary: "融资用于天然气输送系统发展与现代化，项目金额来自企业与银行披露。", topic: "能源", eventType: "FDI", source: { ...sources.roInsider, url: "https://www.romania-insider.com/bt-loan-transgaz-aug-2026" } },
    { id: "ro-2026-08-13-cluj-industrial-site", date: "2026-08-13", title: "Elite Grup 收购克卢日 Sanex 工业地块", summary: "企业披露以 4,000 万欧元收购工业地块，计划用于城市更新；后续开发仍待项目进展。", topic: "区域", eventType: "FDI", source: { ...sources.roInsider, url: "https://www.romania-insider.com/elite-grup-sanex-site-land-aug-2026" } },
    { id: "ro-2026-08-13-nato-airspace", date: "2026-08-13", title: "北约讨论罗马尼亚与波兰领空事件", summary: "北约成员就领空侵犯和无人机事件进行磋商，按区域安全背景记录。", topic: "政治", eventType: "regional", source: sources.natoRoPl },
    { id: "ro-2026-08-14-electricity-saving-call", date: "2026-08-14", title: "政府呼吁家庭和企业节约用电", summary: "核电停运后，政府推动自愿削峰并评估替代供应。", topic: "能源", eventType: "energy", source: { ...sources.roGuardian, url: "https://www.lemonde.fr/en/environment/article/2026/08/14/romania-urges-households-and-businesses-to-save-electricity-after-its-only-nuclear-power-plant-shuts-down-over-low-danube-water-levels_6756485_114.html" } },
    { id: "ro-2026-08-19-auto-production-pause", date: "2026-08-19", title: "Dacia 与 Ford 自愿减产安排持续至 8 月 19 日", summary: "汽车企业通过计划停产降低电力需求，事件按能源约束下的工业运行调整记录。", topic: "能源", eventType: "industrial_policy", source: sources.roAgerpres },
    { id: "ro-2026-08-20-drone-interception", date: "2026-08-20", title: "罗马尼亚战机击落装载爆炸物的无人机", summary: "无人机事件发生在黑海近海基础设施周边，按区域安全与关键基础设施背景记录。", topic: "政治", eventType: "regional", source: sources.roTagesschau },
    { id: "ro-2026-08-14-moldova-power-effects", date: "2026-08-14", title: "罗马尼亚核电停运影响摩尔多瓦电力供应安排", summary: "区域电力互联受到核电停运影响，摩尔多瓦需评估其他进口来源。", topic: "区域", eventType: "energy", source: sources.roGuardian },
    { id: "ro-2026-08-14-alternative-power-supply", date: "2026-08-14", title: "能源部门启用替代电源并增加进口安排", summary: "政府在核电停运背景下依赖其他国内电源、可再生能源和进口平衡系统。", topic: "能源", eventType: "energy", source: sources.roGuardian },
  ]),
  ...makeBatch("croatia", sources.hrDzs, [
    { id: "hr-2026-08-18-building-permits", date: "2026-08-18", title: "克罗地亚公布建筑许可数据", summary: "国家统计局更新建筑许可和规划建筑活动，作为建设投资背景。", topic: "区域", eventType: "regional", source: { ...sources.hrDzs, url: "https://podaci.dzs.hr/en/statistics/construction/building-permits/" } },
    { id: "hr-2026-08-19-energy-statistics", date: "2026-08-19", title: "短期能源统计数据更新", summary: "能源生产、供应和消费月度数据进入官方发布入口。", topic: "能源", eventType: "energy", source: { ...sources.hrDzs, url: "https://podaci.dzs.hr/en/statistics/environment-and-energy/energy/" } },
    { id: "hr-2026-08-14-building-material-prices", date: "2026-08-14", title: "建筑材料生产者价格指数更新", summary: "建筑材料价格用于观察建设成本，不直接替代 CPI。", source: { ...sources.hrDzs, url: "https://podaci.dzs.hr/en/statistics/industry/producer-building-material-price/" } },
    { id: "hr-2026-08-17-agriculture-restructuring-fund", date: "2026-08-17", title: "农业商会呼吁设立农业重组基金", summary: "行业组织提出农业重组融资建议，现阶段按政策倡议记录。", topic: "政治", eventType: "fiscal", source: { ...sources.hrHrt, url: "https://vijesti.hrt.hr/gospodarstvo/mihelic-hpk-poziva-na-osnivanje-fonda-za-restrukturiranje-poljoprivrede-12864837" } },
    { id: "hr-2026-08-15-tourism-fire-response", date: "2026-08-15", title: "旅游部门通报山火期间游客安置与恢复情况", summary: "旅游和应急机构通报游客安置及目的地运行恢复，按区域经济事件记录。", topic: "区域", eventType: "regional", source: { ...sources.hrHrt, url: "https://vijesti.hrt.hr/gospodarstvo/mints-i-htz-nadlezne-sluzbe-pravodobno-odgovorile-turisti-zbrinuti-normalizira-se-12862203" } },
    { id: "hr-2026-08-17-extraordinary-parliament", date: "2026-08-17", title: "总统请求议会举行特别会议", summary: "总统就环境事件请求议会特别开会，后续议程与决议仍待正式程序。", topic: "政治", eventType: "regional", source: { ...sources.hrHrt, url: "https://vijesti.hrt.hr/hrvatska/predsjednik-milanovic-u-utorak-salje-zahtjev-za-izvanredno-saborsko-zasjedanje-12865217" } },
    { id: "hr-2026-08-15-tourism-season", date: "2026-08-15", title: "政府评估旅游旺季表现与后续季节", summary: "总理就旅游季表现作出评估，该表态不替代正式住宿和旅游统计。", source: { ...sources.hrHrt, url: "https://vijesti.hrt.hr/gospodarstvo/plenkovic-turisticka-sezona-je-bolja-ocekujemo-i-dobru-posezonu-12862402" } },
    { id: "hr-2026-08-17-no-confidence-call", date: "2026-08-17", title: "反对党提出政府不信任动议诉求", summary: "反对党要求就环境事件追究政府责任，按政治程序事件记录。", topic: "政治", eventType: "election", source: { ...sources.hrHrt, url: "https://vijesti.hrt.hr/hrvatska/most-trazi-opoziv-vlade-i-hitnu-sjednicu-sabora-zbog-slucaja-u-gospicu-12864973" } },
    { id: "hr-2026-08-16-wildfire-remediation", date: "2026-08-16", title: "消防部门转入山火现场善后阶段", summary: "应急机构通报火场稳定和善后工作，按区域治理与旅游环境背景记录。", topic: "区域", eventType: "regional", source: { ...sources.hrHrt, url: "https://vijesti.hrt.hr/hrvatska/tucakovic-noc-protekla-mirno-nastavlja-se-sanacija-pozarista-12863322" } },
  ]),
];
