// Reviewed event-analysis records: explicit, explained links between selected verified events and Atlas indicators,
// plus a qualitative transmission framework. This is presentation metadata only — it never changes an event record,
// never enters a model and never assigns a numerical effect. Every event-specific statement restates the event's own
// source record (events.json / projects.json); hypotheses are labelled as hypotheses. Events without a record here
// have no reviewed economic linkage: an event category alone is never used to recommend an indicator.
import type { Event } from "@/types/Event";

export type Bi = { zh: string; en: string };
/** documented: stated in the event's source; proposed: research hypothesis; unsupported: coded earlier but not defensible at this level. */
export type LinkBasis = "documented" | "proposed" | "unsupported";
export type EvidenceKind = "observed_fact" | "documented_mechanism" | "research_hypothesis";
/** What the source record establishes about the measure — an announcement is not an implemented policy. */
export type MeasureStatus = "announced" | "adopted" | "implemented";

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
