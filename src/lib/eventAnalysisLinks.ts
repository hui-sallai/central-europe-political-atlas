// Reviewed event-analysis records: explicit, explained links between selected verified events and Atlas indicators,
// plus a qualitative transmission framework. This is presentation metadata only — it never changes an event record,
// never enters a model and never assigns a numerical effect. Every event-specific statement restates the event's own
// source record (events.json, projects.json or the reviewed 2026 news batch); hypotheses are labelled as hypotheses. Events without a record here
// have no reviewed economic linkage: an event category alone is never used to recommend an indicator.
import type { Event } from "@/types/Event";

export type Bi = { zh: string; en: string };
/** documented: stated in the event's source; proposed: research hypothesis; unsupported: coded earlier but not defensible at this level. */
export type LinkBasis = "documented" | "proposed" | "unsupported";
export type EvidenceKind = "observed_fact" | "documented_mechanism" | "research_hypothesis";
/** What the source record establishes about the measure — an announcement is not an implemented policy. */
export type MeasureStatus = "announced" | "adopted" | "implemented" | "proposed" | "stated";

export interface EventIndicatorLink {
  /** Annual: indicator id in observations.json. Monthly: outcome id of the event-window workbench. */
  indicator_id: string;
  frequency: "annual" | "monthly";
  basis: LinkBasis;
  rationale: Bi;
}

export interface EventAnalysisRecord {
  event_id: string;
  representative: boolean;
  /** historical: enough later data may exist for a window; recent: 2026 events, usually too recent for one. */
  period: "historical" | "recent";
  event_actors: Bi[];
  research_topics: Bi[];
  measure_status: MeasureStatus;
  overview: Bi;
  context: Bi[];
  uncertainties: Bi[];
  mechanism: { channel: Bi; affected_actors: Bi; steps: Array<{ kind: EvidenceKind; text: Bi }>; alternatives: Bi[] };
  indicators: EventIndicatorLink[];
  limitations: Bi[];
  sources: Array<{ label: string; url: string }>;
}

const NOT_CAUSAL: Bi = {
  zh: "事件前后指标的任何变化都只是描述：没有对照组，也没有识别策略，不能据此判断事件造成了变化。",
  en: "Any change in an indicator around the event is descriptive only: there is no comparison group and no identification strategy, so it cannot show that the event caused the change.",
};

export const eventAnalysisRecords: EventAnalysisRecord[] = [
  {
    event_id: "hu-2022-08-12-catl-debrecen",
    representative: true,
    period: "historical",
    event_actors: [
      { zh: "CATL（投资方）", en: "CATL (investor)" },
      { zh: "匈牙利政府与德布勒森地方主体（当地主体，暂记，待核验）", en: "Hungarian government and Debrecen local bodies (local counterpart; provisional, pending verification)" },
    ],
    research_topics: [{ zh: "外商直接投资", en: "Foreign direct investment" }, { zh: "中欧经济关系", en: "China–Europe economic relations" }, { zh: "电池与汽车供应链", en: "Battery and automotive supply chains" }],
    measure_status: "announced",
    overview: {
      zh: "2022 年 8 月 12 日，CATL 发布公告，披露将在匈牙利德布勒森建设电池工厂，并给出投资额、规划产能和地点。Atlas 项目记录登记的公告投资额为 73.4 亿欧元。",
      en: "On 12 August 2022 CATL announced that it would build a battery plant in Debrecen, Hungary, stating the investment amount, planned capacity and location. The Atlas project record carries the announced investment of EUR 7.34 billion.",
    },
    context: [
      { zh: "这是一项企业公告的投资计划，不是已完成的投资。项目记录的状态为“在建 / 量产进度待跟踪”。", en: "This is an investment plan announced by a company, not a completed investment. The project record's status is \"under construction / production progress to be tracked\"." },
      { zh: "项目记录尚未接入政府补贴、实际产能、就业和实际支出进度。", en: "The project record does not yet hold government subsidies, actual capacity, employment or actual spending progress." },
    ],
    uncertainties: [
      { zh: "公告金额是计划口径；实际到位资金与时间未在 Atlas 中核验。", en: "The announced amount is a planned figure; the capital actually invested, and when, is not verified in the Atlas." },
      { zh: "当地项目公司、土地与许可主体、补贴签署方仍待核验。", en: "The local project company, the land and permit holders and the subsidy signatories are still to be verified." },
    ],
    mechanism: {
      channel: { zh: "产业投资（绿地外商直接投资）", en: "Industrial investment (greenfield foreign direct investment)" },
      affected_actors: { zh: "投资企业、当地供应商与劳动力市场、下游汽车制造商。", en: "The investing company, local suppliers and the local labour market, and downstream car manufacturers." },
      steps: [
        { kind: "observed_fact", text: { zh: "企业公告了投资额、规划产能和地点。", en: "The company announced the investment amount, planned capacity and location." } },
        { kind: "documented_mechanism", text: { zh: "国际收支统计在资金实际流动时记录直接投资，而不是在公告日记录。", en: "Balance-of-payments statistics record direct investment when capital actually flows, not on the announcement date." } },
        { kind: "research_hypothesis", text: { zh: "建设期可能体现为直接投资流入与投资品进口；投产后可能体现为制造业增加值和电池、汽车相关出口。两者都尚未在 Atlas 中观察或检验。", en: "The construction phase could appear as direct-investment inflows and imports of capital goods; the production phase could appear in manufacturing value added and battery- and automotive-related exports. Neither has been observed or tested in the Atlas." } },
      ],
      alternatives: [
        { zh: "国家层面的直接投资流入是总量指标，年度波动很大，单个项目无法从中分离。", en: "National direct-investment inflow is an aggregate with very large year-to-year swings; a single project cannot be isolated in it." },
        { zh: "同期汽车行业周期与能源价格变化也会影响制造业和出口指标。", en: "The automotive cycle and energy-price changes in the same period also move manufacturing and export indicators." },
      ],
    },
    indicators: [
      { indicator_id: "fdi_inflow", frequency: "annual", basis: "proposed", rationale: { zh: "绿地投资在资金到位时计入直接投资流入；这是研究假设，国家总量不能归因于单个项目。", en: "Greenfield investment enters direct-investment inflows when capital arrives; this is a research hypothesis, and the national total cannot be attributed to one project." } },
      { indicator_id: "manufacturing_share_gdp", frequency: "annual", basis: "proposed", rationale: { zh: "投产后电池制造计入制造业增加值；公告本身不改变该指标。", en: "Once in production, battery manufacturing counts towards manufacturing value added; the announcement itself does not change this indicator." } },
      { indicator_id: "automotive_export_share", frequency: "annual", basis: "proposed", rationale: { zh: "电池供应可能与汽车相关出口有关；该关联属研究假设。", en: "Battery supply may relate to automotive-related exports; this link is a research hypothesis." } },
      { indicator_id: "battery_investment", frequency: "annual", basis: "unsupported", rationale: { zh: "事件记录编码了该指标，但 Atlas 没有已发布的电池投资序列。", en: "The event record codes this indicator, but the Atlas has no published battery-investment series." } },
    ],
    limitations: [
      { zh: "未建立月度指标关联：公告日不是投产日，月度工业生产在公告前后的变化与该项目没有可说明的关系。", en: "No monthly indicator is linked: the announcement date is not a production start, and changes in monthly industrial production around it have no explainable relationship to the project." },
      NOT_CAUSAL,
    ],
    sources: [{ label: "CATL", url: "https://www.catl.com/en/news/983.html" }],
  },
  {
    event_id: "hu-2023-01-26-eu-funds-conditionality",
    representative: true,
    period: "historical",
    event_actors: [
      { zh: "欧盟理事会（作出决定）", en: "Council of the EU (adopted the decision)" },
      { zh: "欧盟委员会（说明适用方式）", en: "European Commission (explained its application)" },
      { zh: "匈牙利公共利益信托及其维持的实体（受限对象）", en: "Hungarian public interest trusts and the entities they maintain (subject to the restriction)" },
    ],
    research_topics: [{ zh: "欧盟经济治理", en: "EU economic governance" }, { zh: "欧盟资金安排", en: "EU funding arrangements" }, { zh: "财政", en: "Public finances" }],
    measure_status: "implemented",
    overview: {
      zh: "欧盟委员会于 2023 年 1 月 26 日说明：理事会 2022 年 12 月 15 日的决定所采取的措施，限制与匈牙利公共利益信托及其维持的实体签署新的欧盟预算法律承诺。",
      en: "On 26 January 2023 the European Commission explained that the measures adopted by the Council decision of 15 December 2022 restrict new legal commitments under the EU budget with Hungarian public interest trusts and the entities they maintain.",
    },
    context: [
      { zh: "这是已生效的措施：限制针对新的法律承诺，对象是特定类型的机构，而不是匈牙利的全部欧盟资金。", en: "This is a measure in force: the restriction concerns new legal commitments with a specific type of institution, not all EU funding for Hungary." },
    ],
    uncertainties: [
      { zh: "Atlas 没有记录受限机构的数量、涉及金额或措施的后续变化。", en: "The Atlas does not record the number of institutions affected, the amounts involved or later changes to the measure." },
    ],
    mechanism: {
      channel: { zh: "欧盟资金安排", en: "EU funding arrangements" },
      affected_actors: { zh: "受限的公共利益信托及其维持的机构；间接涉及国家预算。", en: "The restricted public interest trusts and the institutions they maintain; indirectly, the national budget." },
      steps: [
        { kind: "observed_fact", text: { zh: "理事会于 2022 年 12 月 15 日作出决定；委员会于 2023 年 1 月 26 日说明其适用。", en: "The Council adopted its decision on 15 December 2022; the Commission explained its application on 26 January 2023." } },
        { kind: "documented_mechanism", text: { zh: "措施禁止与上述机构签署新的欧盟预算法律承诺。", en: "The measure prohibits new legal commitments under the EU budget with those institutions." } },
        { kind: "research_hypothesis", text: { zh: "受限机构获得的欧盟资金可能减少；若由国家预算替代，可能体现为政府支出。两者都未在 Atlas 中观察或检验。", en: "EU funding reaching the restricted institutions could fall; if the national budget replaces it, this could appear in government expenditure. Neither has been observed or tested in the Atlas." } },
      ],
      alternatives: [
        { zh: "政府收入与支出占 GDP 的比重受经济周期、通胀、能源相关支出等多种因素影响。", en: "Government revenue and expenditure as a share of GDP respond to the business cycle, inflation, energy-related spending and many other factors." },
        { zh: "同一年份的其他财政与欧盟资金事项未被分离。", en: "Other fiscal and EU-funding developments in the same years are not separated out." },
      ],
    },
    indicators: [
      { indicator_id: "government_expenditure_gdp", frequency: "annual", basis: "proposed", rationale: { zh: "若国家预算替代受限的欧盟资金，可能体现在政府支出；这是研究假设，年度总量无法识别该渠道。", en: "If the national budget replaces restricted EU funding, this could appear in government expenditure; this is a research hypothesis, and the annual total cannot identify the channel." } },
      { indicator_id: "government_revenue_gdp", frequency: "annual", basis: "proposed", rationale: { zh: "欧盟转移支付计入政府收入的部分可能受影响；这是研究假设。", en: "The part of EU transfers recorded as government revenue could be affected; this is a research hypothesis." } },
      { indicator_id: "eu_funds_received", frequency: "annual", basis: "unsupported", rationale: { zh: "这是最直接相关的指标，但 Atlas 没有已发布的欧盟资金到位序列。", en: "This is the most directly relevant indicator, but the Atlas has no published series of EU funds received." } },
    ],
    limitations: [
      { zh: "未建立月度指标关联：措施针对特定机构的资金承诺，月度通胀、失业或工业生产与之没有可说明的关系。", en: "No monthly indicator is linked: the measure concerns funding commitments for specific institutions, and monthly inflation, unemployment or industrial production have no explainable relationship to it." },
      NOT_CAUSAL,
    ],
    sources: [{ label: "European Commission", url: "https://commission.europa.eu/news-and-media/news/joint-statement-commissioners-hahn-and-gabriel-application-council-implementing-decision-15-december-2023-01-26_en" }],
  },
  {
    event_id: "cz-2023-10-16-repowereu-plan",
    representative: true,
    period: "historical",
    event_actors: [
      { zh: "欧盟理事会", en: "Council of the EU" },
      { zh: "捷克政府", en: "Czech government" },
    ],
    research_topics: [{ zh: "能源安全", en: "Energy security" }, { zh: "欧盟资金安排", en: "EU funding arrangements" }, { zh: "欧盟经济治理", en: "EU economic governance" }],
    measure_status: "adopted",
    overview: {
      zh: "捷克修订后的复苏与韧性计划纳入了 REPowerEU 章节，重点涉及电网接入、可再生能源与能源安全。",
      en: "Czechia's amended recovery and resilience plan added a REPowerEU chapter focused on grid access, renewable energy and energy security.",
    },
    context: [
      { zh: "这是已通过的计划修订：它确定了改革与投资的内容，具体项目需在之后几年实施。", en: "This is an adopted plan amendment: it sets out reforms and investments, which are to be implemented over the following years." },
    ],
    uncertainties: [
      { zh: "Atlas 没有记录各项投资的金额、拨付时间或实施进度。", en: "The Atlas does not record the amounts, disbursement dates or implementation progress of the individual investments." },
    ],
    mechanism: {
      channel: { zh: "能源供给与欧盟资金安排", en: "Energy supply and EU funding arrangements" },
      affected_actors: { zh: "电网运营方、可再生能源投资者、能源用户（包括制造业企业）。", en: "Grid operators, renewable-energy investors and energy users, including manufacturing firms." },
      steps: [
        { kind: "observed_fact", text: { zh: "修订后的计划纳入了 REPowerEU 章节。", en: "The amended plan includes a REPowerEU chapter." } },
        { kind: "documented_mechanism", text: { zh: "该章节的改革与投资针对电网接入、可再生能源和能源安全。", en: "The chapter's reforms and investments target grid access, renewable energy and energy security." } },
        { kind: "research_hypothesis", text: { zh: "若投资落地，数年内可能降低能源进口依赖，并影响国内能源价格环境。两者都未在 Atlas 中观察或检验。", en: "If the investments are carried out, they could over several years lower energy import dependency and affect the domestic energy-price environment. Neither has been observed or tested in the Atlas." } },
      ],
      alternatives: [
        { zh: "2022–2023 年欧洲能源价格的大幅波动主导了同期的能源通胀。", en: "The large swings in European energy prices in 2022–2023 dominate energy inflation in the same period." },
        { zh: "能源进口依赖还取决于天气、需求和国际市场。", en: "Energy import dependency also depends on weather, demand and international markets." },
      ],
    },
    indicators: [
      { indicator_id: "energy_import_dependency", frequency: "annual", basis: "proposed", rationale: { zh: "该章节以能源安全与可再生能源为目标；对进口依赖的影响是需要数年才可能出现的研究假设。", en: "The chapter targets energy security and renewables; an effect on import dependency is a research hypothesis that could take years to appear." } },
      { indicator_id: "hicp_energy_annual_rate:yoy_rate", frequency: "monthly", basis: "proposed", rationale: { zh: "仅用于描述计划通过前后的国内能源价格环境；该窗口由 2022–2023 年能源价格冲击主导，不能归于这项计划。", en: "Used only to describe the domestic energy-price environment around the plan's adoption; the window is dominated by the 2022–2023 energy-price shock and cannot be attributed to the plan." } },
      { indicator_id: "manufacturing_share_gdp", frequency: "annual", basis: "unsupported", rationale: { zh: "事件记录编码了该指标，但来源没有说明该计划与制造业占比之间的关系。", en: "The event record codes this indicator, but the source does not describe a relationship between the plan and the manufacturing share." } },
      { indicator_id: "eu_funds_received", frequency: "annual", basis: "unsupported", rationale: { zh: "Atlas 没有已发布的欧盟资金到位序列。", en: "The Atlas has no published series of EU funds received." } },
    ],
    limitations: [
      { zh: "计划通过日期不是投资实施日期；月度窗口只能描述背景环境。", en: "The adoption date is not the date the investments are carried out; a monthly window can only describe the surrounding conditions." },
      NOT_CAUSAL,
    ],
    sources: [{ label: "European Commission", url: "https://commission.europa.eu/business-economy-euro/economic-recovery/recovery-and-resilience-facility/country-pages/czechias-recovery-and-resilience-plan_en" }],
  },
  {
    event_id: "pl-2024-04-23-nuctech-fsr-inspection",
    representative: true,
    period: "historical",
    event_actors: [
      { zh: "欧盟委员会（执行检查）", en: "European Commission (carried out the inspections)" },
      { zh: "Nuctech（被检查企业）", en: "Nuctech (inspected company)" },
    ],
    research_topics: [{ zh: "中欧经济关系", en: "China–Europe economic relations" }, { zh: "外资补贴监管", en: "Foreign-subsidy regulation" }, { zh: "公共采购", en: "Public procurement" }],
    measure_status: "implemented",
    overview: {
      zh: "欧盟委员会公告记录了依据《外国补贴条例》对安检设备企业 Nuctech 在波兰和荷兰场所进行的检查。",
      en: "A European Commission announcement records inspections, under the Foreign Subsidies Regulation, at the premises of the security-equipment company Nuctech in Poland and the Netherlands.",
    },
    context: [
      { zh: "检查是调查步骤，不是违规认定，也不是处罚。", en: "An inspection is an investigative step, not a finding of infringement and not a penalty." },
      { zh: "Atlas 的波兰项目记录缺少投资金额与合同结构，状态为“仅作背景”。", en: "The Atlas project record for Poland lacks the investment amount and contract structure; its status is \"background only\"." },
    ],
    uncertainties: [
      { zh: "调查的结果未在 Atlas 中记录。", en: "The outcome of the investigation is not recorded in the Atlas." },
      { zh: "当地实体仍待以商业登记或企业年报核验。", en: "The local entity is still to be verified against the commercial register or company reports." },
    ],
    mechanism: {
      channel: { zh: "监管变化与市场准入", en: "Regulatory change and market access" },
      affected_actors: { zh: "被检查企业及其公共采购客户。", en: "The inspected company and its public-procurement customers." },
      steps: [
        { kind: "observed_fact", text: { zh: "委员会在该企业位于波兰和荷兰的场所进行了检查。", en: "The Commission inspected the company's premises in Poland and the Netherlands." } },
        { kind: "documented_mechanism", text: { zh: "检查依据的是欧盟《外国补贴条例》。", en: "The inspections were carried out under the EU Foreign Subsidies Regulation." } },
        { kind: "research_hypothesis", text: { zh: "调查可能影响该企业在欧盟的公共采购准入和投资决定；这是企业层面的假设，未在 Atlas 中观察或检验。", en: "The investigation could affect the company's access to EU public procurement and its investment decisions; this is a firm-level hypothesis that has not been observed or tested in the Atlas." } },
      ],
      alternatives: [
        { zh: "单个企业的调查步骤在国家宏观总量中不可见。", en: "An investigative step concerning one company is not visible in national macroeconomic aggregates." },
      ],
    },
    indicators: [
      { indicator_id: "fdi_inflow", frequency: "annual", basis: "unsupported", rationale: { zh: "事件记录编码了该指标，但项目金额缺失，且单个企业的调查无法与波兰全国直接投资流入建立可说明的关系。", en: "The event record codes this indicator, but the project amount is missing and one company's investigation has no explainable relationship to Poland's national direct-investment inflow." } },
      { indicator_id: "manufacturing_share_gdp", frequency: "annual", basis: "unsupported", rationale: { zh: "事件记录编码了该指标，但来源没有说明该检查与制造业占比之间的关系。", en: "The event record codes this indicator, but the source does not describe a relationship between the inspection and the manufacturing share." } },
    ],
    limitations: [
      { zh: "该事件只支持事件背景与机制框架：现有证据不足以把它与任何 Atlas 指标建立关联，因此不提供指标观察或事件窗口分析入口。", en: "This event supports background and a mechanism framework only: the evidence is not sufficient to link it to any Atlas indicator, so no indicator observation or event-window entry is offered." },
      NOT_CAUSAL,
    ],
    sources: [{ label: "European Commission", url: "https://ec.europa.eu/commission/presscorner/detail/en/ip_24_1803" }],
  },
  {
    event_id: "de-2026-10-07-hamburg-zippel-china-staatsreederei-cosco-wirtschaftsministerium-100",
    representative: true,
    period: "recent",
    event_actors: [
      { zh: "德国政府（阻止收购）", en: "German government (blocked the acquisition)" },
      { zh: "中远（拟议收购方）", en: "COSCO (proposed acquirer)" },
      { zh: "Zippel（收购标的）", en: "Zippel (target company)" },
    ],
    research_topics: [{ zh: "外资审查", en: "Foreign-investment screening" }, { zh: "中欧经济关系", en: "China–Europe economic relations" }, { zh: "物流与航运", en: "Logistics and shipping" }],
    measure_status: "announced",
    overview: {
      zh: "据 ZDFheute 报道，德国政府因安全关切阻止中远收购货运企业 Zippel 的 80% 股权，相关部门将发出禁止通知。",
      en: "ZDFheute reports that Germany's government blocked COSCO's proposed acquisition of 80% of the goods transporter Zippel on security grounds, with a prohibition notice to follow.",
    },
    context: [
      { zh: "报道时禁止通知尚待发出：这是已宣布的决定，正式文书在其后。", en: "At the time of the report the prohibition notice was still to be issued: this is an announced decision, with the formal act to follow." },
      { zh: "事件涉及一笔具体的企业收购，而不是对某类投资的普遍限制。", en: "The event concerns one specific corporate acquisition, not a general restriction on a class of investment." },
    ],
    uncertainties: [
      { zh: "Atlas 没有记录交易金额、禁止通知的正式内容或当事方是否提出异议。", en: "The Atlas does not record the transaction value, the formal content of the prohibition notice or whether the parties contest it." },
    ],
    mechanism: {
      channel: { zh: "投资限制与市场准入", en: "Investment restrictions and market access" },
      affected_actors: { zh: "拟议收购方、标的企业及其股东。", en: "The proposed acquirer, the target company and its shareholders." },
      steps: [
        { kind: "observed_fact", text: { zh: "政府阻止了拟议的 80% 股权收购，并表示将发出禁止通知。", en: "The government blocked the proposed 80% acquisition and said a prohibition notice would follow." } },
        { kind: "documented_mechanism", text: { zh: "报道给出的理由是安全关切。", en: "The reason given in the report is security concerns." } },
        { kind: "research_hypothesis", text: { zh: "被阻止的交易不会形成相应的直接投资流入；类似决定也可能影响其他投资者的预期。两者都未在 Atlas 中观察或检验。", en: "A blocked transaction does not produce the corresponding direct-investment inflow; decisions of this kind could also affect other investors' expectations. Neither has been observed or tested in the Atlas." } },
      ],
      alternatives: [
        { zh: "德国的直接投资流入是数百亿欧元量级的年度总量，由大量交易和企业内部资金流动决定。", en: "Germany's direct-investment inflow is an annual aggregate in the tens of billions of euros, driven by a large number of transactions and intra-company flows." },
      ],
    },
    indicators: [
      { indicator_id: "fdi_inflow", frequency: "annual", basis: "unsupported", rationale: { zh: "这是最接近的指标，但交易金额未知，且单笔被阻止的收购无法与德国全国直接投资流入建立可说明的关系。", en: "This is the closest indicator, but the transaction value is unknown and one blocked acquisition has no explainable relationship to Germany's national direct-investment inflow." } },
    ],
    limitations: [
      { zh: "该事件只支持事件背景与机制框架：Atlas 没有企业层面或按来源国划分的投资审查数据。", en: "This event supports background and a mechanism framework only: the Atlas has no firm-level data and no investment-screening data by country of origin." },
      NOT_CAUSAL,
    ],
    sources: [{ label: "ZDFheute", url: "https://www.zdfheute.de/politik/deutschland/hamburg-zippel-china-staatsreederei-cosco-wirtschaftsministerium-100.html" }],
  },
  {
    event_id: "ro-2026-10-09-the-national-bank-of-romanian-maintains-reference-interest-rate-id1069193",
    representative: true,
    period: "recent",
    event_actors: [{ zh: "罗马尼亚国家银行（作出利率决定）", en: "National Bank of Romania (took the rate decision)" }],
    research_topics: [{ zh: "货币政策", en: "Monetary policy" }, { zh: "通胀", en: "Inflation" }],
    measure_status: "implemented",
    overview: {
      zh: "据罗马尼亚国际广播电台报道，罗马尼亚国家银行维持政策利率 6.5% 不变，贷款便利利率为 7.5%，存款便利利率为 5.5%。",
      en: "Radio Romania International reports that the National Bank of Romania held its policy rate at 6.5%, with the lending facility at 7.5% and the deposit facility at 5.5%.",
    },
    context: [
      { zh: "这是一次维持利率不变的决定：政策利率本身没有变化。", en: "This is a decision to keep rates unchanged: the policy rate itself did not move." },
      { zh: "罗马尼亚不属于欧元区，政策利率由本国央行决定。", en: "Romania is outside the euro area, and its policy rate is set by its own central bank." },
    ],
    uncertainties: [
      { zh: "事件记录没有收录央行给出的理由或对未来利率的表述。", en: "The event record does not include the central bank's reasoning or any statement about future rates." },
    ],
    mechanism: {
      channel: { zh: "货币政策传导", en: "Monetary transmission" },
      affected_actors: { zh: "银行、借款的家庭和企业、储户。", en: "Banks, borrowing households and firms, and savers." },
      steps: [
        { kind: "observed_fact", text: { zh: "政策利率维持在 6.5%。", en: "The policy rate was kept at 6.5%." } },
        { kind: "documented_mechanism", text: { zh: "贷款便利与存款便利利率构成围绕政策利率的利率走廊。", en: "The lending and deposit facility rates form a corridor around the policy rate." } },
        { kind: "research_hypothesis", text: { zh: "维持利率意味着融资条件延续，可能与通胀和信贷的走势有关。这是一般性的研究假设，未在 Atlas 中针对这次决定检验。", en: "Holding the rate means financing conditions continue as before, which may relate to the path of inflation and credit. This is a general research hypothesis and has not been tested in the Atlas for this decision." } },
      ],
      alternatives: [
        { zh: "通胀同时受能源和食品价格、税收变化、汇率和财政政策影响。", en: "Inflation also responds to energy and food prices, tax changes, the exchange rate and fiscal policy." },
        { zh: "一次“不变”的决定没有可与之对比的政策变动。", en: "A no-change decision offers no policy movement to compare against." },
      ],
    },
    indicators: [
      { indicator_id: "policy_rate:level", frequency: "monthly", basis: "documented", rationale: { zh: "这次决定针对的就是这一利率；该序列用于核对决定前后的利率水平。", en: "The decision is about this rate; the series is used to check the level of the rate around the decision." } },
      { indicator_id: "hicp_annual_rate", frequency: "monthly", basis: "proposed", rationale: { zh: "通胀是货币政策决定的常见背景变量；它与这次决定的关系是研究假设。", en: "Inflation is the usual background variable for monetary-policy decisions; its relationship to this decision is a research hypothesis." } },
    ],
    limitations: [
      { zh: "事件发生在 2026 年 10 月，事件后的月度观测尚未发布，因此目前无法进行事件窗口分析。", en: "The event took place in October 2026 and no post-event monthly observations are published yet, so no event-window analysis is possible at present." },
      { zh: "Atlas 的货币政策识别结果只涉及欧洲央行冲击，不适用于罗马尼亚央行的这次决定。", en: "The Atlas's identified monetary-policy results concern ECB shocks only and do not apply to this decision by Romania's central bank." },
      NOT_CAUSAL,
    ],
    sources: [{ label: "Radio Romania International", url: "https://www.rri.ro/en/news-and-current-affairs/today-in-the-news/the-national-bank-of-romanian-maintains-reference-interest-rate-id1069193.html" }],
  },
  {
    event_id: "cz-2026-10-07-czechia-receives-first-eu309-million-eu-safe-defence-fund-8899283",
    representative: true,
    period: "recent",
    event_actors: [
      { zh: "捷克（借款方）", en: "Czechia (borrower)" },
      { zh: "欧盟 SAFE 防务贷款工具（资金来源）", en: "EU SAFE defence loan instrument (source of the funds)" },
    ],
    research_topics: [{ zh: "欧盟防务融资", en: "EU defence financing" }, { zh: "公共支出", en: "Public expenditure" }, { zh: "欧盟经济治理", en: "EU economic governance" }],
    measure_status: "implemented",
    overview: {
      zh: "据布拉格国际广播电台报道，捷克收到 SAFE 贷款的首笔 3.09 亿欧元，约占 20 亿欧元贷款规模的 15%。",
      en: "Radio Prague International reports that Czechia received a first SAFE loan payment of €309 million, about 15% of a €2 billion loan allocation.",
    },
    context: [
      { zh: "SAFE 提供的是贷款，不是赠款：收到的资金需要偿还。", en: "SAFE provides loans, not grants: the money received has to be repaid." },
      { zh: "首笔拨付不表示相关采购或项目已经完成。", en: "A first disbursement does not mean the related procurement or projects are complete." },
    ],
    uncertainties: [
      { zh: "事件记录没有收录资金的具体用途、后续拨付时间或贷款条件。", en: "The event record does not include what the money is to be spent on, the timing of later payments or the loan terms." },
    ],
    mechanism: {
      channel: { zh: "公共支出与政府融资", en: "Public expenditure and government financing" },
      affected_actors: { zh: "国家预算、国防采购方及其供应商。", en: "The state budget, defence procurement bodies and their suppliers." },
      steps: [
        { kind: "observed_fact", text: { zh: "捷克收到首笔 3.09 亿欧元。", en: "Czechia received a first payment of €309 million." } },
        { kind: "documented_mechanism", text: { zh: "这笔款项属于总规模约 20 亿欧元的贷款安排。", en: "The payment belongs to a loan arrangement of about €2 billion in total." } },
        { kind: "research_hypothesis", text: { zh: "贷款提取后可能计入政府债务；资金支出时可能体现为政府支出。两者都未在 Atlas 中观察或检验。", en: "Once drawn, the loan could count towards government debt; when the money is spent, it could appear in government expenditure. Neither has been observed or tested in the Atlas." } },
      ],
      alternatives: [
        { zh: "政府债务和支出占 GDP 的比重主要由整体预算、经济增长和利率决定。", en: "Government debt and expenditure as a share of GDP are driven mainly by the overall budget, economic growth and interest rates." },
        { zh: "国防支出的记账时间可能与资金到账时间不同。", en: "Defence spending may be recorded at a different time from when the money arrives." },
      ],
    },
    indicators: [
      { indicator_id: "government_debt_gdp", frequency: "annual", basis: "proposed", rationale: { zh: "贷款提取后可能计入政府债务；这是研究假设，2026 年的年度数据尚未发布。", en: "Once drawn, a loan could count towards government debt; this is a research hypothesis, and annual data for 2026 is not yet published." } },
      { indicator_id: "government_expenditure_gdp", frequency: "annual", basis: "proposed", rationale: { zh: "贷款资金支出时可能体现为政府支出；Atlas 没有单独的国防支出序列。", en: "When loan money is spent it could appear in government expenditure; the Atlas has no separate defence-expenditure series." } },
    ],
    limitations: [
      { zh: "已发布的年度观测止于事件之前，只能作为背景，不能显示这笔款项之后的任何变化。", en: "Published annual observations end before the event; they are background only and cannot show anything that happened after this payment." },
      { zh: "未建立月度指标关联：月度通胀、失业或工业生产与一笔防务贷款拨付没有可说明的关系。", en: "No monthly indicator is linked: monthly inflation, unemployment or industrial production have no explainable relationship to one defence-loan payment." },
      NOT_CAUSAL,
    ],
    sources: [{ label: "Radio Prague International", url: "https://english.radio.cz/czechia-receives-first-eu309-million-eu-safe-defence-fund-8899283" }],
  },
  {
    event_id: "cz-2026-09-21-czech-government-approves-2027-budget-czk-386-billion-deficit-8897929",
    representative: true,
    period: "recent",
    event_actors: [
      { zh: "捷克政府（批准预算草案）", en: "Czech government (approved the draft budget)" },
      { zh: "捷克议会（尚待审议）", en: "Czech parliament (still to consider it)" },
    ],
    research_topics: [{ zh: "财政政策", en: "Fiscal policy" }, { zh: "公共财政", en: "Public finances" }],
    measure_status: "proposed",
    overview: {
      zh: "据布拉格国际广播电台报道，捷克政府批准了 2027 年预算草案，拟议赤字为 3860 亿克朗；草案仍须议会审议。",
      en: "Radio Prague International reports that the Czech government approved a draft 2027 budget with a proposed deficit of CZK 386 billion; the draft still requires parliamentary consideration.",
    },
    context: [
      { zh: "这是政府批准的草案，不是已生效的预算法：议会可以修改。", en: "This is a draft approved by the government, not an enacted budget law: parliament can amend it." },
      { zh: "3860 亿克朗是计划中的 2027 年国家预算赤字，不是已实现的结果。", en: "CZK 386 billion is the planned state-budget deficit for 2027, not a realised outcome." },
    ],
    uncertainties: [
      { zh: "事件记录没有收录草案的收支构成或所依据的宏观经济假设。", en: "The event record does not include the composition of revenue and spending or the macroeconomic assumptions behind the draft." },
    ],
    mechanism: {
      channel: { zh: "财政政策", en: "Fiscal policy" },
      affected_actors: { zh: "国家预算、公共部门、纳税人和政府债券投资者。", en: "The state budget, the public sector, taxpayers and holders of government bonds." },
      steps: [
        { kind: "observed_fact", text: { zh: "政府批准了拟议赤字为 3860 亿克朗的 2027 年预算草案。", en: "The government approved a draft 2027 budget with a proposed deficit of CZK 386 billion." } },
        { kind: "documented_mechanism", text: { zh: "草案须经议会审议后才能成为预算法。", en: "The draft has to pass parliament before it becomes the budget law." } },
        { kind: "research_hypothesis", text: { zh: "若按计划执行，赤字需要通过举债融资，可能体现在 2027 年的财政余额和政府债务中。这尚未发生，也未在 Atlas 中检验。", en: "If carried out as planned, the deficit would be financed by borrowing and could appear in the 2027 fiscal balance and government debt. This has not happened yet and has not been tested in the Atlas." } },
      ],
      alternatives: [
        { zh: "实际财政结果取决于经济增长、税收收入和年内的预算调整。", en: "The actual fiscal outcome depends on economic growth, tax revenue and in-year budget changes." },
        { zh: "以克朗计的国家预算赤字与以 GDP 百分比计的广义政府余额口径不同。", en: "A state-budget deficit in koruna is not the same measure as the general-government balance as a percentage of GDP." },
      ],
    },
    indicators: [
      { indicator_id: "fiscal_balance_gdp", frequency: "annual", basis: "proposed", rationale: { zh: "预算赤字与财政余额在概念上相关，但口径不同（国家预算对广义政府）；2027 年的数据要到之后才会发布。", en: "A budget deficit is conceptually related to the fiscal balance, but the measures differ (state budget versus general government); 2027 data will only be published later." } },
      { indicator_id: "government_debt_gdp", frequency: "annual", basis: "proposed", rationale: { zh: "赤字通过举债融资；对债务比率的影响是研究假设，还取决于 GDP 的变化。", en: "Deficits are financed by borrowing; an effect on the debt ratio is a research hypothesis and also depends on how GDP changes." } },
    ],
    limitations: [
      { zh: "已发布的年度观测只说明此前的财政状况；草案涉及的 2027 年尚无任何数据。", en: "Published annual observations describe only the earlier fiscal position; no data exists yet for 2027, the year the draft covers." },
      { zh: "未建立月度指标关联：预算草案的批准日期与月度通胀、失业或工业生产没有可说明的关系。", en: "No monthly indicator is linked: the date a draft budget is approved has no explainable relationship to monthly inflation, unemployment or industrial production." },
      NOT_CAUSAL,
    ],
    sources: [{ label: "Radio Prague International", url: "https://english.radio.cz/czech-government-approves-2027-budget-czk-386-billion-deficit-8897929" }],
  },
  {
    event_id: "sk-2026-10-09-sakova-slovakia-has-secured-contracts-and-sufficient-gas-supplies-for-winter",
    representative: true,
    period: "recent",
    event_actors: [
      { zh: "沙科娃（作出表态，据 TASR 报道）", en: "Saková (made the statement, as reported by TASR)" },
      { zh: "俄罗斯天然气工业股份公司（表态中提到的合同对方）", en: "Gazprom (contract counterparty named in the statement)" },
    ],
    research_topics: [{ zh: "能源安全", en: "Energy security" }, { zh: "天然气供应安排", en: "Gas supply arrangements" }, { zh: "跨境经济关系", en: "Cross-border economic relations" }],
    measure_status: "stated",
    overview: {
      zh: "据 TASR 报道，沙科娃表示斯洛伐克已安排好冬季天然气供应，并提到延续至 2027 年 9 月的俄气合同以及补充采购。",
      en: "TASR reports Saková saying that Slovakia has arranged its winter gas supply, referring to a Gazprom contract running to September 2027 and to supplementary procurement.",
    },
    context: [
      { zh: "这是当事方的公开表态，Atlas 没有独立核实合同内容或供应量。", en: "This is a public statement by an actor; the Atlas has not independently verified the contracts or the volumes." },
      { zh: "表态涉及的是供应安排，而不是价格。", en: "The statement concerns supply arrangements, not prices." },
    ],
    uncertainties: [
      { zh: "事件记录没有收录合同数量、价格条款、运输路线或补充采购的来源。", en: "The event record does not include contract volumes, price terms, transit routes or the sources of the supplementary procurement." },
    ],
    mechanism: {
      channel: { zh: "能源供给", en: "Energy supply" },
      affected_actors: { zh: "天然气进口商和供应商、家庭与工业用气方。", en: "Gas importers and suppliers, and household and industrial gas users." },
      steps: [
        { kind: "observed_fact", text: { zh: "沙科娃表示冬季天然气供应已有安排。", en: "Saková said that winter gas supply has been arranged." } },
        { kind: "documented_mechanism", text: { zh: "表态提到一份延续至 2027 年 9 月的俄气合同以及补充采购。", en: "The statement refers to a Gazprom contract running to September 2027 and to supplementary procurement." } },
        { kind: "research_hypothesis", text: { zh: "供应安排可能与能源进口依赖和国内能源价格环境有关。这是研究假设，未在 Atlas 中观察或检验。", en: "Supply arrangements may relate to energy import dependency and to the domestic energy-price environment. This is a research hypothesis that has not been observed or tested in the Atlas." } },
      ],
      alternatives: [
        { zh: "国内能源价格还取决于欧洲批发价格、天气、库存以及价格管制和补贴。", en: "Domestic energy prices also depend on European wholesale prices, weather, storage and on price regulation and subsidies." },
        { zh: "能源进口依赖指标涵盖全部能源，不区分天然气，也不区分供应国。", en: "The energy import dependency indicator covers all energy; it does not separate gas or distinguish supplier countries." },
      ],
    },
    indicators: [
      { indicator_id: "energy_import_dependency", frequency: "annual", basis: "proposed", rationale: { zh: "进口天然气是能源进口的一部分；该指标不区分供应国，因此只能作为背景。", en: "Imported gas is part of energy imports; the indicator does not distinguish supplier countries, so it serves as background only." } },
      { indicator_id: "hicp_energy_annual_rate:yoy_rate", frequency: "monthly", basis: "proposed", rationale: { zh: "仅用于描述国内能源价格环境；价格同时受批发市场和监管影响，不能归于供应安排。", en: "Used only to describe the domestic energy-price environment; prices also reflect wholesale markets and regulation and cannot be attributed to the supply arrangements." } },
      { indicator_id: "europe_natural_gas_price_usd:level", frequency: "monthly", basis: "unsupported", rationale: { zh: "欧洲天然气基准价格由整个市场决定，与一国的供应安排没有可说明的关系。", en: "The European gas benchmark price is set by the whole market and has no explainable relationship to one country's supply arrangements." } },
    ],
    limitations: [
      { zh: "事件发生在 2026 年 10 月，事件后的月度观测尚未发布，因此目前无法进行事件窗口分析。", en: "The event took place in October 2026 and no post-event monthly observations are published yet, so no event-window analysis is possible at present." },
      { zh: "Atlas 没有按供应国划分的天然气进口数据。", en: "The Atlas has no gas-import data by supplier country." },
      NOT_CAUSAL,
    ],
    sources: [{ label: "TASR", url: "https://newsnow.tasr.sk/sakova-slovakia-has-secured-contracts-and-sufficient-gas-supplies-for-winter/" }],
  },
];

const byEvent = new Map(eventAnalysisRecords.map((record) => [record.event_id, record]));

export function getEventAnalysis(eventId: string): EventAnalysisRecord | undefined {
  return byEvent.get(eventId);
}

export const representativeEventIds: string[] = eventAnalysisRecords.filter((record) => record.representative).map((record) => record.event_id);

/** Monthly event-window outcomes with an explained link (documented or proposed). Never derived from the event category. */
export function linkedWindowOutcomes(eventId: string): string[] {
  return (byEvent.get(eventId)?.indicators ?? []).filter((link) => link.frequency === "monthly" && link.basis !== "unsupported").map((link) => link.indicator_id);
}

/**
 * Event actors versus source publisher. Many records carry the reporting outlet in `actor`; a publisher is never
 * presented as an actor. Actors come from a reviewed record, or from `actor` only when it differs from the publisher.
 */
export function eventActors(event: Pick<Event, "event_id" | "actor" | "source_name">): { actors: Bi[] | null; publisher: string } {
  const reviewed = byEvent.get(event.event_id)?.event_actors;
  if (reviewed?.length) return { actors: reviewed, publisher: event.source_name };
  const actor = event.actor?.trim();
  const coded = actor && actor !== "待编码" && actor !== event.source_name.trim();
  return { actors: coded ? [{ zh: actor, en: actor }] : null, publisher: event.source_name };
}

export type LevelState = "available" | "unavailable";
export interface EventAnalysisLevels {
  background: LevelState;
  mechanism: LevelState;
  indicators: LevelState;
  /** An explained monthly link exists. Whether the window can be computed is decided by the event-window engine's own gates. */
  window_link: LevelState;
}

/** Content availability per level. Statistical eligibility for the event window is separate and stays with the engine. */
export function eventAnalysisLevels(event: Pick<Event, "event_id" | "data_status" | "source_url">): EventAnalysisLevels {
  const record = byEvent.get(event.event_id);
  const usable = (frequency: "annual" | "monthly") => Boolean(record?.indicators.some((link) => link.frequency === frequency && link.basis !== "unsupported"));
  return {
    background: event.data_status === "verified" && event.source_url ? "available" : "unavailable",
    mechanism: record ? "available" : "unavailable",
    indicators: usable("annual") || usable("monthly") ? "available" : "unavailable",
    window_link: usable("monthly") ? "available" : "unavailable",
  };
}
