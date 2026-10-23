// Reviewed political-economic case studies: an end-to-end dossier for selected verified events, built on the existing
// event-analysis records (eventAnalysisLinks.ts) and the existing event-window engine. Presentation metadata only — it
// never changes an event or project record, never enters a model and never assigns a numerical effect. Every
// milestone restates a dated statement on its cited official source page; hypotheses are labelled as hypotheses, and a
// connection the evidence cannot support is shown as unsupported rather than omitted.
import type { Bi } from "@/lib/eventAnalysisLinks";

/** Policy or project stage as established by a source document. */
export type CaseStage = "announcement" | "proposal" | "legal_adoption" | "implementation" | "observed_outcome";
/** Basis of one link in the transmission chain. */
export type ChainBasis = "documented_fact" | "documented_mechanism" | "research_hypothesis" | "unsupported_connection";
export type AlternativeKind = "business_cycle" | "eu_policy" | "energy_prices" | "government_measures" | "concurrent_projects" | "base_effects" | "aggregate_composition" | "statistical_revisions" | "concurrent_events";

export interface CaseMilestone { date: string; stage: CaseStage; text: Bi; source_url: string }
export interface CaseChainLink { step: Bi; basis: ChainBasis; timing: Bi }
export interface CaseSource { label: string; url: string; supports: Bi }

export interface EventCaseStudy {
  event_id: string;
  title: Bi;
  research_question: Bi;
  /** Stages the sources document, and stages they do not; an undocumented stage is never inferred from later data. */
  stages_documented: CaseStage[];
  stages_not_documented: CaseStage[];
  /** Set when the Atlas event date and the current source page differ. The event record itself is not changed. */
  date_note?: Bi;
  establishes: Bi[];
  uncertain: Bi[];
  milestones: CaseMilestone[];
  chain: CaseChainLink[];
  /** Annual indicators shown as observed evidence; each must be an explained (non-unsupported) link in the event's analysis record. */
  annual: Array<{ indicator_id: string; role: Bi }>;
  /** Monthly descriptive window computed by the existing event-window engine; the outcome must be an explained monthly link. */
  window?: {
    outcome: string;
    months: number;
    role: Bi;
    source: CaseSource;
    /** Descriptive context for another country, same engine and window. Never a control group or a treatment comparison. */
    comparison?: { country: string; rationale: Bi };
    /** A common external series shown as a potential confounder, not as a decomposition. */
    external?: { outcome: string; rationale: Bi; source: CaseSource };
  };
  /** Why no monthly window is shown, when none is. */
  window_blocker?: Bi;
  comparison_note: Bi;
  alternatives: Array<{ kind: AlternativeKind; text: Bi }>;
  /** Other Atlas project records in the same country and period, listed as concurrent factors only (status restates the project record). */
  concurrent_projects: Array<{ project_id: string; label: Bi; status: Bi }>;
  can_establish: Bi[];
  cannot_establish: Bi[];
  sources: CaseSource[];
}

const COMMISSION_RRP = "https://reforms-investments.ec.europa.eu/czechias-recovery-and-resilience-plan";
const CATL = "https://www.catl.com/en/news/983.html";

export const eventCaseStudies: EventCaseStudy[] = [
  {
    event_id: "cz-2023-10-16-repowereu-plan",
    title: { zh: "捷克复苏计划加入 REPowerEU 能源章节", en: "Czechia adds a REPowerEU energy chapter to its recovery plan" },
    research_question: {
      zh: "捷克复苏与韧性计划加入 REPowerEU 章节时，文件实际确定了什么？在通过前后，捷克居民能源价格通胀呈现怎样的描述性变化，又有哪些其他因素同样可能解释这些变化？",
      en: "What did the REPowerEU amendment to Czechia's recovery and resilience plan actually establish, what does Czech consumer energy-price inflation look like descriptively around its adoption, and which other factors could equally account for what is observed?",
    },
    stages_documented: ["announcement", "legal_adoption", "implementation"],
    stages_not_documented: ["observed_outcome"],
    date_note: {
      zh: "Atlas 事件记录的日期为 2023-10-16；欧盟委员会计划页面现将加入 REPowerEU 章节的更新列为 2023 年 10 月 17 日。两者同属 2023 年 10 月，月度窗口的事件月不受影响；事件记录本身未作修改。",
      en: "The Atlas event record is dated 2023-10-16; the Commission's plan page now lists the update adding the REPowerEU chapter as 17 October 2023. Both fall in October 2023, so the event month of the monthly window is unaffected; the event record itself is unchanged.",
    },
    establishes: [
      { zh: "捷克修订后的复苏与韧性计划加入了 REPowerEU 章节，计划总值 92 亿欧元（复苏基金赠款 84 亿欧元、贷款 2.6 亿欧元）。", en: "Czechia's amended recovery and resilience plan added a REPowerEU chapter; the plan is valued at €9.2 billion (€8.4 billion in RRF grants and €260 million in loans)." },
      { zh: "REPowerEU 赠款为 6.81 亿欧元，另有 5500 万欧元由脱欧调整储备转入。", en: "The REPowerEU grant is €681 million, plus €55 million transferred from the Brexit Adjustment Reserve." },
      { zh: "该章节的改革与投资针对电网接入、可再生能源和能源安全；按条例，全部里程碑与目标的截止期为 2026 年 8 月。", en: "The chapter's reforms and investments target grid access, renewable energy and energy security; under the Regulation, all milestones and targets are due by August 2026." },
    ],
    uncertain: [
      { zh: "来源没有给出 REPowerEU 各项投资的拨付时间与实施进度；后续付款决定针对整个计划，未单独列出 REPowerEU 部分。", en: "The sources give no disbursement dates or implementation progress for the individual REPowerEU investments; later payment decisions concern the plan as a whole and do not separate the REPowerEU part." },
      { zh: "2024 年 12 月的付款决定部分暂停了第四、第五期付款；被暂停部分与 REPowerEU 章节的关系未在来源中说明。", en: "The December 2024 payment decision partially suspended the fourth and fifth instalments; the source does not say how the suspended part relates to the REPowerEU chapter." },
    ],
    milestones: [
      { date: "2021-09-08", stage: "legal_adoption", text: { zh: "理事会批准捷克最初的复苏与韧性计划。", en: "The Council approved Czechia's original recovery and resilience plan." }, source_url: COMMISSION_RRP },
      { date: "2023-09-26", stage: "announcement", text: { zh: "欧盟委员会主席在布拉格宣布委员会对修订计划的积极评估。", en: "The Commission President announced, in Prague, the Commission's positive assessment of the amended plan." }, source_url: COMMISSION_RRP },
      { date: "2023-10-17", stage: "legal_adoption", text: { zh: "计划更新，加入 REPowerEU 章节（Atlas 事件记录日期为 2023-10-16）。", en: "The plan was updated to add the REPowerEU chapter (the Atlas event record is dated 2023-10-16)." }, source_url: COMMISSION_RRP },
      { date: "2024-12-18", stage: "implementation", text: { zh: "委员会决定授权第四、第五期非偿还性分期付款和第一期贷款付款，并部分暂停第四、第五期付款。该决定针对整个计划。", en: "A Commission decision authorised the fourth and fifth non-repayable instalments and the first loan instalment, and partially suspended the fourth and fifth instalments. The decision concerns the plan as a whole." }, source_url: COMMISSION_RRP },
    ],
    chain: [
      { step: { zh: "修订计划加入 REPowerEU 章节并获通过。", en: "The amended plan, including a REPowerEU chapter, was adopted." }, basis: "documented_fact", timing: { zh: "2023 年 10 月", en: "October 2023" } },
      { step: { zh: "章节资助电网接入、可再生能源和能源安全方面的改革与投资。", en: "The chapter funds reforms and investments in grid access, renewables and energy security." }, basis: "documented_mechanism", timing: { zh: "实施期至 2026 年 8 月", en: "Implementation period to August 2026" } },
      { step: { zh: "若投资落地，可能在数年内降低能源进口依赖（年度指标）。", en: "If the investments are carried out, they could lower energy import dependency over several years (annual indicator)." }, basis: "research_hypothesis", timing: { zh: "投资完成之后，以年为单位", en: "After the investments are completed, over years" } },
      { step: { zh: "计划通过本身在随后几个月改变居民能源价格。", en: "The adoption of the plan itself changes consumer energy prices in the following months." }, basis: "unsupported_connection", timing: { zh: "通过日不是投资实施日，月度价格由批发市场和国内措施主导", en: "The adoption date is not when investments are made; monthly prices are driven by wholesale markets and domestic measures" } },
    ],
    annual: [
      { indicator_id: "energy_import_dependency", role: { zh: "计划目标所指向的结构性指标；已发布年份只能显示投资期初的水平。", en: "The structural indicator the plan's objectives point to; the published years can only show the level at the start of the investment period." } },
    ],
    window: {
      outcome: "hicp_energy_annual_rate:yoy_rate",
      months: 12,
      role: { zh: "描述计划通过前后的国内居民能源价格环境，不衡量计划的作用。", en: "Describes the domestic consumer energy-price environment around the adoption; it does not measure what the plan did." },
      source: { label: "Eurostat HICP (prc_hicp_minr, NRG, annual rate of change)", url: "https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_minr/default/table", supports: { zh: "月度能源 HICP 同比，与运行数据中的定义一致。", en: "Monthly energy HICP annual rate, matching the definition in the runtime data." } },
      comparison: { country: "slovakia", rationale: { zh: "斯洛伐克使用相同的 Eurostat 定义，仅作为描述性背景：它有自己的复苏计划和国内价格措施，不是对照组，两国之差也不是处理效应。", en: "Slovakia uses the same Eurostat definition and is shown as descriptive context only: it has its own recovery plan and domestic price measures, so it is not a control group and the difference between the two is not a treatment effect." } },
      external: { outcome: "europe_natural_gas_price_usd:level", rationale: { zh: "欧洲天然气基准价格是影响全部欧洲国家能源价格的共同外部因素，在此作为潜在混杂因素列出，不用于分解。", en: "The European gas benchmark is a common external factor for energy prices in every European country; it is listed as a potential confounder and is not used to decompose anything." }, source: { label: "World Bank Commodity Price Data (Pink Sheet)", url: "https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx", supports: { zh: "欧洲天然气月度均价（美元）。", en: "Monthly average European natural gas price (USD)." } } },
    },
    comparison_note: { zh: "比较国家只提供同一定义下的描述性背景；Atlas 不构造伪对照组，也不计算双重差分或任何处理效应。", en: "The comparison country provides descriptive context under the same definition only; the Atlas builds no pseudo-control group and computes no difference-in-differences or treatment effect." },
    alternatives: [
      { kind: "energy_prices", text: { zh: "2022–2023 年欧洲批发天然气和电力价格大幅波动，是同期欧洲各国能源价格的共同背景因素（天然气基准价格见第 6 部分）。", en: "European wholesale gas and electricity prices swung widely in 2022–2023 and are a common background factor for energy prices across Europe in this period (gas benchmark in section 6)." } },
      { kind: "base_effects", text: { zh: "同比增长率机械地反映上一年的基数：2022 年的价格飙升会让 2023 年的同比读数下降，与当年的政策无关。", en: "Annual rates mechanically reflect the previous year's base: the 2022 price surge pulls down 2023 annual readings regardless of policy in 2023." } },
      { kind: "government_measures", text: { zh: "国内受管制价格与能源支持措施会直接改变居民能源价格；Atlas 没有为这一窗口记录这些措施，因此无法把它们与计划分开。", en: "Domestic regulated prices and energy-support measures change consumer energy prices directly; the Atlas does not record such measures for this window, so they cannot be separated from the plan." } },
      { kind: "eu_policy", text: { zh: "同期可能还有欧盟层面的能源措施和其他成员国的同类计划；Atlas 没有为这一窗口记录它们。", en: "EU-level energy measures and comparable plans in other member states may have operated in the same period; the Atlas does not record them for this window." } },
      { kind: "statistical_revisions", text: { zh: "能源进口依赖会随能源平衡表更新而修订；这里显示的是 Atlas 当前存储的数值及其更新日期。", en: "Energy import dependency is revised when energy balances are updated; the values shown are those currently stored in the Atlas, with their update date." } },
      { kind: "concurrent_events", text: { zh: "窗口内的其他已核验捷克事件由事件窗口引擎列出（见下）。", en: "Other verified Czech events inside the window are listed by the event-window engine (below)." } },
    ],
    concurrent_projects: [],
    can_establish: [
      { zh: "计划修订的内容、金额与已记录的通过和付款节点。", en: "What the amendment contains, its amounts, and the documented adoption and payment milestones." },
      { zh: "通过前后居民能源价格通胀的描述性水平和变化（事件月单独报告）。", en: "The descriptive level and change of consumer energy-price inflation around the adoption, with the event month reported separately." },
    ],
    cannot_establish: [
      { zh: "计划对能源价格或能源进口依赖的任何影响：没有对照组，也没有识别策略。", en: "Any effect of the plan on energy prices or energy import dependency: there is no comparison group and no identification strategy." },
      { zh: "REPowerEU 投资的实施进度或完成情况：来源没有记录。", en: "Whether, or how far, the REPowerEU investments have been carried out: the sources do not record it." },
      { zh: "捷克与斯洛伐克之差的含义：两国的价格机制与政策不同，差异不是计划的作用。", en: "What the gap between Czechia and Slovakia means: their price mechanisms and policies differ, so the gap is not an effect of the plan." },
    ],
    sources: [
      { label: "European Commission — Czechia's recovery and resilience plan", url: COMMISSION_RRP, supports: { zh: "计划金额、REPowerEU 赠款、通过与付款节点。", en: "Plan amounts, REPowerEU grant, adoption and payment milestones." } },
      { label: "European Commission (Atlas event source)", url: "https://commission.europa.eu/business-economy-euro/economic-recovery/recovery-and-resilience-facility/country-pages/czechias-recovery-and-resilience-plan_en", supports: { zh: "Atlas 事件记录引用的原始地址（现重定向至上一页面）。", en: "The original address cited by the Atlas event record (now redirects to the page above)." } },
    ],
  },
  {
    event_id: "hu-2022-08-12-catl-debrecen",
    title: { zh: "CATL 宣布德布勒森电池工厂投资计划", en: "CATL announces its Debrecen battery-plant investment" },
    research_question: {
      zh: "CATL 德布勒森电池工厂公告实际确定了什么？匈牙利已发布的直接投资、制造业和汽车出口指标能说明什么、不能说明什么？",
      en: "What did CATL's Debrecen battery-plant announcement actually establish, and what can — and cannot — Hungary's published direct-investment, manufacturing and automotive-export indicators tell us?",
    },
    stages_documented: ["announcement"],
    stages_not_documented: ["legal_adoption", "implementation", "observed_outcome"],
    establishes: [
      { zh: "CATL 于 2022 年 8 月 12 日宣布在德布勒森南部工业园建设其第二座欧洲电池工厂，投资额 73.4 亿欧元，规划产能 100 GWh，占地 221 公顷。", en: "On 12 August 2022 CATL announced its second European battery plant, in the Southern Industrial Park of Debrecen, with an investment of €7.34 billion, a planned capacity of 100 GWh and a site of 221 hectares." },
      { zh: "公告称，经股东大会批准后，首批生产设施将于 2022 年内开工；梅赛德斯-奔驰是初始产能的首个也是最大客户。", en: "The announcement said that, subject to shareholder-meeting approval, construction of the first production facilities would start within 2022, and named Mercedes-Benz as the first and biggest customer of the initial capacity." },
    ],
    uncertain: [
      { zh: "股东大会批准、开工、实际资金到位和投产均未在 Atlas 来源中记录；项目记录状态为“在建 / 量产进度待跟踪”。", en: "Shareholder approval, the start of construction, the capital actually invested and the start of production are not recorded in the Atlas sources; the project record's status is \"under construction / production progress to be tracked\"." },
      { zh: "当地项目公司、土地与许可主体、政府补贴及签署方仍待核验。", en: "The local project company, the land and permit holders, any government subsidy and its signatories are still to be verified." },
    ],
    milestones: [
      { date: "2022-08-12", stage: "announcement", text: { zh: "CATL 公告投资计划：73.4 亿欧元、100 GWh、德布勒森南部工业园、221 公顷。", en: "CATL announced the investment plan: €7.34 billion, 100 GWh, Southern Industrial Park of Debrecen, 221 hectares." }, source_url: CATL },
    ],
    chain: [
      { step: { zh: "CATL 公告了投资额、产能和地点。", en: "CATL announced the investment amount, capacity and location." }, basis: "documented_fact", timing: { zh: "2022 年 8 月", en: "August 2022" } },
      { step: { zh: "国际收支统计在资金实际跨境流动时记录直接投资（BPM6），而不是在公告日。", en: "Balance-of-payments statistics record direct investment when capital actually crosses the border (BPM6), not on the announcement date." }, basis: "documented_mechanism", timing: { zh: "资金到位之时（日期未知）", en: "When capital arrives (date unknown)" } },
      { step: { zh: "建设期的资金流入可能计入匈牙利直接投资流入。", en: "Capital inflows during construction could enter Hungary's direct-investment inflow." }, basis: "research_hypothesis", timing: { zh: "建设期，未记录", en: "Construction period, not recorded" } },
      { step: { zh: "投产后可能体现为制造业增加值和汽车相关出口。", en: "Once in production, the plant could appear in manufacturing value added and automotive-related exports." }, basis: "research_hypothesis", timing: { zh: "投产之后，未记录", en: "After production starts, not recorded" } },
      { step: { zh: "公告金额已体现在 2022 年的直接投资流入中。", en: "The announced amount is already reflected in the 2022 direct-investment inflow." }, basis: "unsupported_connection", timing: { zh: "公告不是资金流动；2022 年匈牙利直接投资流入为负值", en: "An announcement is not a capital flow; Hungary's 2022 direct-investment inflow is negative" } },
    ],
    annual: [
      { indicator_id: "fdi_inflow", role: { zh: "国家层面的直接投资负债流入总量；单个项目无法从中分离，公告投资额不能当作已实现的直接投资。", en: "The national total of direct-investment liability inflows; a single project cannot be isolated in it, and the announced amount cannot be treated as realised FDI." } },
      { indicator_id: "manufacturing_share_gdp", role: { zh: "投产后才可能相关的结构性指标；已发布年份不知是否涵盖投产。", en: "A structural indicator that could only become relevant after production starts; it is not known whether the published years cover production." } },
      { indicator_id: "automotive_export_share", role: { zh: "Atlas 计算的 NACE C29 出口占比；电池不一定归入 C29，该关联属研究假设。", en: "The Atlas-calculated NACE C29 export share; batteries are not necessarily classified in C29, so this link is a research hypothesis." } },
    ],
    window_blocker: {
      zh: "不提供月度统计窗口：该事件没有经过说明的月度指标关联。公告日不是投产日，Atlas 也没有月度直接投资序列；对月度工业生产或通胀做窗口只会描述与项目无关的时期。",
      en: "No monthly statistical window is shown: the event has no explained monthly indicator link. The announcement date is not a production start, and the Atlas has no monthly direct-investment series; a window on monthly industrial production or inflation would only describe a period unrelated to the project.",
    },
    comparison_note: { zh: "不提供跨国比较：各国直接投资流入总量受本国特有的金融流动主导，没有可比的项目层面数据，任何国家差异都不能归于该项目。", en: "No cross-country comparison is offered: national direct-investment totals are dominated by country-specific financial flows, there is no comparable project-level data, and no cross-country difference could be attributed to this project." },
    alternatives: [
      { kind: "aggregate_composition", text: { zh: "已发布的匈牙利直接投资流入在 2023–2024 年为大幅负值（远大于该项目的公告金额），说明总量由其他流动主导；Atlas 没有分解这些流动。", en: "Hungary's published direct-investment inflow is strongly negative in 2023–2024 (far larger in size than this project's announced amount), so the total is dominated by other flows; the Atlas does not decompose them." } },
      { kind: "concurrent_projects", text: { zh: "同期匈牙利还有其他已登记的外资项目（见下），其资金流动同样计入国家总量。", en: "Other registered foreign-investment projects in Hungary in the same years (below) also enter the national total." } },
      { kind: "business_cycle", text: { zh: "汽车行业周期、欧洲需求和能源成本同时影响制造业占比与汽车相关出口。", en: "The automotive cycle, European demand and energy costs move the manufacturing share and automotive-related exports at the same time." } },
      { kind: "statistical_revisions", text: { zh: "国际收支直接投资数据会被修订；这里显示的是 Atlas 当前存储的数值及其更新日期。", en: "Balance-of-payments direct-investment data are revised; the values shown are those currently stored in the Atlas, with their update date." } },
      { kind: "concurrent_events", text: { zh: "窗口内的其他已核验匈牙利事件由事件窗口引擎列出（见下）。", en: "Other verified Hungarian events inside the window are listed by the event-window engine (below)." } },
    ],
    concurrent_projects: [
      { project_id: "hu-byd-szeged", label: { zh: "比亚迪塞格德工厂（2023）", en: "BYD Szeged plant (2023)" }, status: { zh: "已宣布；投资额尚未接入；记录待核验", en: "Announced; investment amount not yet recorded; record pending verification" } },
      { project_id: "hu-budapest-belgrade-rail", label: { zh: "布达佩斯—贝尔格莱德铁路（2021）", en: "Budapest–Belgrade railway (2021)" }, status: { zh: "建设中；测试与投运进度待核验", en: "Under construction; testing and operation progress to be verified" } },
    ],
    can_establish: [
      { zh: "公告的内容：投资额、产能、地点、占地和首个客户。", en: "What was announced: amount, capacity, location, site area and first customer." },
      { zh: "公告前后匈牙利已发布年度指标的水平。", en: "The levels of Hungary's published annual indicators before and after the announcement." },
    ],
    cannot_establish: [
      { zh: "投资是否、何时、以多大规模实际到位：公告不是已完成的投资。", en: "Whether, when or how much of the investment has actually been made: an announcement is not a completed investment." },
      { zh: "该项目在匈牙利直接投资流入、制造业占比或汽车出口中的份额：国家总量无法归因于单个项目。", en: "This project's share of Hungary's direct-investment inflow, manufacturing share or automotive exports: national totals cannot be attributed to one project." },
      { zh: "公告对任何指标的影响：没有对照组，也没有识别策略。", en: "Any effect of the announcement on any indicator: there is no comparison group and no identification strategy." },
    ],
    sources: [
      { label: "CATL — announcement of the Debrecen plant", url: CATL, supports: { zh: "投资额、产能、地点、占地、开工条件与首个客户。", en: "Amount, capacity, location, site area, construction condition and first customer." } },
    ],
  },
];

const byEvent = new Map(eventCaseStudies.map((study) => [study.event_id, study]));
export const caseStudyEventIds: string[] = eventCaseStudies.map((study) => study.event_id);
export function getEventCaseStudy(eventId: string): EventCaseStudy | undefined {
  return byEvent.get(eventId);
}

/** Splits annual observations into before / event year / after, without computing any statistic. */
export function annualPhase(year: number, eventDate: string): "pre" | "event" | "post" {
  const eventYear = Number(eventDate.slice(0, 4));
  return year < eventYear ? "pre" : year === eventYear ? "event" : "post";
}
