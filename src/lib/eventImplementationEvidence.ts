// E2 implementation evidence for the two reviewed E1 cases: dated primary documents showing what was announced, approved,
// implemented and demonstrably realised. Each record restates one claim from one document, with its institution, dates,
// reference, monetary amounts and units. The status is a documentary evidence status (verified / announced / disputed /
// unavailable), never a performance score. A company statement is never "verified"; a planned amount, announced capacity
// or expected outcome is never a realised one; an unavailable claim is recorded as unavailable rather than omitted.
// No record enters a model, an event registry or a window; nothing here estimates an effect.
import type { Bi } from "./eventAnalysisLinks";

export const IMPLEMENTATION_EVIDENCE_METHOD = "atlas-implementation-evidence-v1";
export const IMPLEMENTATION_STAGES = ["announcement", "approval", "implementation", "realized_outcome"] as const;
export type ImplementationStage = (typeof IMPLEMENTATION_STAGES)[number];
export type ClaimStatus = "verified" | "announced" | "disputed" | "unavailable";
export type DocumentKind = "official_eu_decision" | "official_eu_publication" | "council_document" | "national_gazette" | "national_authority_decision" | "company_statement" | "none_located";
export type MoneyKind = "requested" | "allocated" | "budgeted" | "authorised" | "paid" | "suspended" | "suspension_lifted" | "reduced" | "announced_investment";
export type Money = { value: number; currency: "EUR" | "HUF"; kind: MoneyKind; net_of_prefinancing: boolean | null; precision: "exact" | "rounded_as_published"; label: string };
export type Quantity = { value: number; unit: "GWh_per_year" | "modules" | "percent" | "milestones_and_targets"; kind: "announced_capacity" | "permitted_capacity" | "company_reported_output" | "reported_progress" | "count"; label: string };
export type ImplementationMilestone = {
  id: string; event_id: string; stage: ImplementationStage; status: ClaimStatus;
  /** Whether the claim is about the event itself, the recovery plan as a whole, or the surrounding industrial zone. */
  scope: "event_specific" | "whole_plan" | "zone_infrastructure";
  institution: Bi; document_kind: DocumentKind; document_ref: string; url: string | null;
  publication_date: string | null; event_date: string | null; date_precision: "day" | "month" | "year" | "undated";
  /** Retrieval date and SHA-256 of the document as read (PDF documents only; HTML pages carry no stable bytes). */
  retrieved: string; document_sha256: string | null;
  claim: Bi; amounts: Money[]; quantities: Quantity[]; note: Bi | null;
};
/** How a published Atlas observation relates to the implementation record. Compatibility is judged on geography, timing and definition separately. */
export type ImplementationLinkSpec = { event_id: string; indicator_id: string; anchor: string; measurement: "classification_compatible" | "classification_incompatible" | "not_separable" | "outcome_not_isolable"; reason: Bi };

const RETRIEVED = "2026-11-06";
const RRP = "https://reforms-investments.ec.europa.eu/czechias-recovery-and-resilience-plan";
const PRESS = (id: string) => `https://ec.europa.eu/commission/presscorner/detail/en/${id}`;
const EC: Bi = { zh: "欧盟委员会", en: "European Commission" };
const CZ = "cz-2023-10-16-repowereu-plan", HU = "hu-2022-08-12-catl-debrecen";
const DOC = {
  c2024_9258: "https://commission.europa.eu/document/download/df03e0ba-c7b4-4628-8d7c-837f9a728b37_en?filename=C_2024_9258_1_EN_ACT_part1_v3.pdf",
  c2024_9246: "https://commission.europa.eu/document/download/357fcd9f-5838-49d2-9271-617fcedf56c8_en?filename=C_2024_9246_1_EN_ACT_part1_v3.pdf",
  c2025_6441: "https://commission.europa.eu/document/download/95816a9f-02c2-420c-93fc-63174b985a94_en?filename=C_2025_6441_1_EN_ACT_part1_v3.pdf",
  c2025_8030: "https://commission.europa.eu/document/download/3c5d47b7-59a3-4bb2-918b-5f7fc4aa096d_en?filename=C_2025_8030_1_EN_ACT_part1_v5.pdf",
  c2025_8031: "https://commission.europa.eu/document/download/99d0318c-67bb-4404-9277-4d78d2c286df_en?filename=C_2025_8031_1_EN_ACT_part1_v4.pdf",
  c2026_1717: "https://reforms-investments.ec.europa.eu/document/download/9e06cb1c-a700-4981-a44c-25c399daa0d9_en?filename=C_2026_1717_1_EN_ACT_part1_v2.pdf",
  c2026_5650: "https://reforms-investments.ec.europa.eu/document/download/62f4c543-6096-4c9d-8559-922710575b9c_en?filename=C_2026_5650_1_EN_ACT_part1_v3.pdf",
  cid2023: "https://data.consilium.europa.eu/doc/document/ST-13383-2023-ADD-1-REV-1/en/pdf",
  mk137: "https://magyarkozlony.hu/dokumentumok/42e5fb83baf68b5dd9d6de9b45bac8b612316a85/letoltes",
  ekhe: "https://kormanyhivatalok.hu/system/files/dokumentum/hajdu-bihar/2023-08/hb_17_ikv_01008_46_2023_hatarozat_alairt.pdf",
  catl2022: "https://www.catl.com/en/news/983.html",
  catl2026: "https://kyodonewsprwire.jp/release/202609226408",
};
const eur = (value: number, kind: MoneyKind, label: string, net: boolean | null = null, precision: Money["precision"] = "exact"): Money => ({ value, currency: "EUR", kind, net_of_prefinancing: net, precision, label });
const huf = (value: number, kind: MoneyKind, label: string): Money => ({ value, currency: "HUF", kind, net_of_prefinancing: null, precision: "exact", label });
const base = { retrieved: RETRIEVED, amounts: [] as Money[], quantities: [] as Quantity[], note: null as Bi | null, document_sha256: null as string | null };

export const implementationEvidence: ImplementationMilestone[] = [
  // Czechia — REPowerEU chapter of the recovery and resilience plan --------------------------------------------------
  { ...base, id: "cz-e2-01-submission", event_id: CZ, stage: "announcement", status: "verified", scope: "event_specific", institution: EC, document_kind: "official_eu_publication", document_ref: "Commission Daily News MEX/23/3628", url: PRESS("mex_23_3628"), publication_date: "2023-06-30", event_date: "2023-06-30", date_precision: "day",
    claim: { zh: "委员会记录：捷克提交修订复苏计划并加入 REPowerEU 章节的请求，章节包括简化可再生能源许可、使电网接入更易规划、更透明的改革，以及建筑能效和铁路投资；请求基于 6.82 亿欧元 REPowerEU 赠款和 58 亿欧元贷款。", en: "The Commission records that Czechia submitted a request to revise its recovery plan and add a REPowerEU chapter: reforms to streamline renewable permitting and make grid connections clearer to plan and more transparent, and investments in building energy efficiency and railway infrastructure. The request is based on €682 million in REPowerEU grants and €5.8 billion of loans." },
    amounts: [eur(682_000_000, "requested", "REPowerEU grants requested", null, "rounded_as_published"), eur(5_800_000_000, "requested", "RRF loans requested (whole plan)", null, "rounded_as_published")] },
  { ...base, id: "cz-e2-02-commission-assessment", event_id: CZ, stage: "approval", status: "verified", scope: "event_specific", institution: EC, document_kind: "official_eu_publication", document_ref: "Commission press release IP/23/4642", url: PRESS("ip_23_4642"), publication_date: "2023-09-26", event_date: "2023-09-26", date_precision: "day",
    claim: { zh: "委员会对修订计划作出积极评估：计划总额 92 亿欧元（84 亿赠款、8.18 亿贷款），REPowerEU 章节含 15 项改革和 9 项投资；REPowerEU 赠款 6.81 亿欧元，另转入脱欧调整储备 5500 万欧元。", en: "The Commission adopted a positive assessment of the modified plan: €9.2 billion in total (€8.4 billion grants, €818 million loans); the REPowerEU chapter has 15 reforms and 9 investments; REPowerEU grants of €681 million, plus €55 million transferred from the Brexit Adjustment Reserve." },
    amounts: [eur(681_000_000, "allocated", "REPowerEU grants", null, "rounded_as_published"), eur(55_000_000, "allocated", "Brexit Adjustment Reserve transfer", null, "rounded_as_published"), eur(9_200_000_000, "allocated", "modified plan, whole", null, "rounded_as_published")] },
  { ...base, id: "cz-e2-03-council-adoption", event_id: CZ, stage: "approval", status: "verified", scope: "event_specific", institution: { zh: "欧盟理事会（据委员会国家页面）", en: "Council of the EU (as recorded on the Commission's country page)" }, document_kind: "official_eu_publication", document_ref: "Commission country page, plan versions", url: RRP, publication_date: null, event_date: "2023-10-17", date_precision: "day",
    claim: { zh: "计划于 2023 年 10 月 17 日更新，加入 REPowerEU 章节。", en: "The plan was updated on 17 October 2023 to add the REPowerEU chapter." },
    note: { zh: "国家页面不注明发布日期。", en: "The country page carries no publication date." } },
  { ...base, id: "cz-e2-04-chapter-content", event_id: CZ, stage: "approval", status: "verified", scope: "event_specific", institution: { zh: "欧盟理事会文件（委员会提案附件）", en: "Council of the EU document (annex to the Commission proposal)" }, document_kind: "council_document", document_ref: "ST 13383/23 ADD 1 REV 1", url: DOC.cid2023, publication_date: "2023", event_date: null, date_precision: "undated", document_sha256: "9dd8362d4c6ea48bcb6f82bf89a28536c5f8ad1d4aa10e6ed4efbaa18bc7810e",
    claim: { zh: "附件把 REPowerEU 章节定义为第 7 部分（7.1–7.7），称其包含 20 项措施；第 304 号里程碑“立法与程序变更生效”属于 7.1 部分（可再生能源与电力基础设施）改革 3 子措施 1：提高电网接入程序透明度。", en: "The annex defines the REPowerEU chapter as components 7.1–7.7 and states that it has 20 measures; milestone 304, \"Entry into force of legislative and procedural changes\", belongs to component 7.1 (renewable energy and electricity infrastructure), Reform 3, sub-measure 1: improve transparency of the grid connection procedure." },
    note: { zh: "Atlas 用此文件把第 304 号里程碑归入 REPowerEU 章节；其他里程碑编号在之后的计划修订中未重新核对。", en: "The Atlas uses this document to place milestone 304 in the REPowerEU chapter; other milestone numbers were not re-checked against later plan amendments." } },
  { ...base, id: "cz-e2-05-repowereu-prefinancing", event_id: CZ, stage: "implementation", status: "verified", scope: "event_specific", institution: EC, document_kind: "official_eu_publication", document_ref: "Commission Daily News MEX/23/6801", url: PRESS("mex_23_6801"), publication_date: "2023-12-21", event_date: "2023-12-21", date_precision: "day",
    claim: { zh: "委员会当日向捷克支付 REPowerEU 预付款 1.4709 亿欧元，相当于为 REPowerEU 章节追加资金的至多 20%。", en: "The Commission disbursed €147.09 million to Czechia that day as pre-financing for the REPowerEU funds, equivalent to up to 20% of the additional funds requested for the REPowerEU chapter." },
    amounts: [eur(147_090_000, "paid", "REPowerEU pre-financing", null, "rounded_as_published")] },
  { ...base, id: "cz-e2-06-payment-authorised-2024", event_id: CZ, stage: "implementation", status: "verified", scope: "whole_plan", institution: EC, document_kind: "official_eu_decision", document_ref: "C(2024) 9258 final", url: DOC.c2024_9258, publication_date: "2024-12-18", event_date: "2024-12-18", date_precision: "day", document_sha256: "81e59e37e235aa17d872b51ff8c407591426cab64adbbf0cb11f1bf16fad93c6",
    claim: { zh: "针对 2024 年 9 月 16 日提交的付款请求（65 个里程碑和目标中 63 个获满足），授权第四期 11.0566 亿欧元和第五期 5.8998 亿欧元非偿还性支持，以及第一期贷款 1.9090 亿欧元；扣除预付款后应支付 14.8248 亿欧元（其中用于清偿 REPowerEU 预付款 3397 万欧元）。", en: "For the payment request submitted on 16 September 2024 (63 of 65 milestones and targets fulfilled), authorised EUR 1 105 662 692 of the fourth and EUR 589 982 569 of the fifth non-repayable instalment and EUR 190 898 548 of the first loan instalment; EUR 1 482 476 906 to be paid after clearing pre-financing (of which EUR 33 969 816 clears REPowerEU pre-financing)." },
    amounts: [eur(1_105_662_692, "authorised", "4th instalment, non-repayable"), eur(589_982_569, "authorised", "5th instalment, non-repayable"), eur(190_898_548, "authorised", "1st loan instalment"), eur(1_482_476_906, "authorised", "non-repayable, to be paid", true)],
    note: { zh: "整个计划的付款授权；未找到该笔的付款公告。", en: "An authorisation for the plan as a whole; no payment notice for this decision was located." } },
  { ...base, id: "cz-e2-07-grid-milestone-suspended", event_id: CZ, stage: "implementation", status: "verified", scope: "event_specific", institution: EC, document_kind: "official_eu_decision", document_ref: "C(2024) 9246 final", url: DOC.c2024_9246, publication_date: "2024-12-18", event_date: "2024-12-18", date_precision: "day", document_sha256: "b891dce767eab5716ac007aaf8755b74b46ecd0bea3bf5566cde6d70dd35ae0f",
    claim: { zh: "委员会认定第 304 号里程碑（电网接入立法与程序变更）未满足：已生效的 LEX RES II 和接入法令没有规定能源监管机构每六个月审查一次、也没有规定具有约束力的最长接入时限；暂停第五期中与之相关的 97,629,788 欧元。", en: "The Commission found milestone 304 (grid-connection legislative and procedural changes) not satisfactorily fulfilled: LEX RES II and the connection decree in force set neither the six-monthly review by the Energy Regulator nor a binding maximum time for grid connection; EUR 97 629 788 of the fifth instalment linked to it was suspended." },
    amounts: [eur(97_629_788, "suspended", "5th instalment, milestone 304")] },
  { ...base, id: "cz-e2-08-payment-authorised-2025", event_id: CZ, stage: "implementation", status: "verified", scope: "whole_plan", institution: EC, document_kind: "official_eu_decision", document_ref: "C(2025) 6441 final", url: DOC.c2025_6441, publication_date: "2025-09-19", event_date: "2025-09-19", date_precision: "day", document_sha256: "e25e081c91b4d888fee5429502da57afd6fd99f7163a8dba3820b644a57dbe49",
    claim: { zh: "针对 2025 年 6 月 16 日提交的请求（全部里程碑和目标满足），授权第六期 17.9166 亿欧元非偿还性支持和第二期贷款 4145 万欧元。", en: "For the request submitted on 16 June 2025 (all milestones and targets fulfilled), authorised EUR 1 791 660 357 of the sixth non-repayable instalment and EUR 41 445 759 of the second loan instalment." },
    amounts: [eur(1_791_660_357, "authorised", "6th instalment, non-repayable"), eur(41_445_759, "authorised", "2nd loan instalment")] },
  { ...base, id: "cz-e2-09-payment-2025-09", event_id: CZ, stage: "implementation", status: "verified", scope: "whole_plan", institution: EC, document_kind: "official_eu_publication", document_ref: "Commission Daily News MEX/25/2230", url: PRESS("mex_25_2230"), publication_date: "2025-09-26", event_date: "2025-09-26", date_precision: "day",
    claim: { zh: "委员会当日支付第四笔款项：15.7 亿欧元赠款和 4100 万欧元贷款（实际付款）；该请求含 58 个里程碑和目标，措施包括可再生能源设施升级、储能与电网接入，以及简化许可的立法改革。", en: "The Commission disbursed the fourth payment that day: €1.57 billion in grants and €41 million in loans (the actual payment); the request had 58 milestones and targets, including renewable installations, storage and grid connections, and legislative reforms simplifying licensing and permitting." },
    amounts: [eur(1_570_000_000, "paid", "grants", true, "rounded_as_published"), eur(41_000_000, "paid", "loans", true, "rounded_as_published")], quantities: [{ value: 58, unit: "milestones_and_targets", kind: "count", label: "in the request" }],
    note: { zh: "整个计划的付款；来源未单列 REPowerEU 部分。", en: "A payment for the plan as a whole; the source does not separate a REPowerEU share." } },
  { ...base, id: "cz-e2-10-grid-milestone-fulfilled", event_id: CZ, stage: "implementation", status: "verified", scope: "event_specific", institution: EC, document_kind: "official_eu_decision", document_ref: "C(2025) 8031 final", url: DOC.c2025_8031, publication_date: "2025-11-21", event_date: "2025-11-21", date_precision: "day", document_sha256: "b1415003fd8b1ea45addf500af2f6334b79dca5e948fc14f63249839579f34aa",
    claim: { zh: "根据捷克 2025 年 6 月 18 日提交的补充证据（立法进一步修订，规定能源监管机构每半年监测一次接入期限，并规定强制接入时限），委员会认定第 304 号里程碑已满足；经济与金融委员会于 2025 年 11 月 4 日同意。解除暂停的 97,629,788 欧元获授权。", en: "On additional evidence of 18 June 2025 (legislation further amended to give the Energy Regulator a biannual monitoring obligation over connection deadlines and to set a mandatory timeline for grid connections), the Commission found milestone 304 satisfactorily fulfilled; the Economic and Financial Committee agreed on 4 November 2025. The suspended EUR 97 629 788 was authorised." },
    amounts: [eur(97_629_788, "suspension_lifted", "5th instalment, milestone 304")],
    note: { zh: "这是一项改革（法律生效），不是投资完成，也不是对接入时间或能源供应的测量。", en: "This is a reform (legislation in force), not a completed investment and not a measurement of connection times or energy supply." } },
  { ...base, id: "cz-e2-11-reduction-other-milestone", event_id: CZ, stage: "implementation", status: "verified", scope: "whole_plan", institution: EC, document_kind: "official_eu_decision", document_ref: "C(2025) 8030 final", url: DOC.c2025_8030, publication_date: "2025-11-21", event_date: "2025-11-21", date_precision: "day", document_sha256: "5076086797d0bed8d2c8f5eb88c07417963c907562082f82b86c422c67a92197",
    claim: { zh: "第四期非偿还性支持因第 193 号里程碑（长期护理法）未满足而削减 48,814,894 欧元。", en: "The fourth non-repayable instalment was reduced by EUR 48 814 894 because milestone 193 (the long-term care law) was not fulfilled." },
    amounts: [eur(48_814_894, "reduced", "4th instalment, milestone 193")],
    note: { zh: "列出以免误读：该削减不涉及 REPowerEU 章节。", en: "Listed to prevent misreading: this reduction does not concern the REPowerEU chapter." } },
  { ...base, id: "cz-e2-12-payment-authorised-2026-03", event_id: CZ, stage: "implementation", status: "verified", scope: "whole_plan", institution: EC, document_kind: "official_eu_decision", document_ref: "C(2026) 1717 final", url: DOC.c2026_1717, publication_date: "2026-03-10", event_date: "2026-03-10", date_precision: "day", document_sha256: "71acd4ee21917713fef5ec4eea43a27ca098f8cea8bc6973a8e57d606ae8fe38",
    claim: { zh: "针对 2025 年 11 月 24 日提交的请求，授权第七期 703,960,539 欧元；扣除预付款后支付 613,966,769 欧元（其中清偿 REPowerEU 预付款 14,341,115 欧元）。", en: "For the request submitted on 24 November 2025, authorised EUR 703 960 539 of the seventh instalment; EUR 613 966 769 to be paid after clearing pre-financing (of which EUR 14 341 115 clears REPowerEU pre-financing)." },
    amounts: [eur(703_960_539, "authorised", "7th instalment, non-repayable"), eur(613_966_769, "authorised", "to be paid", true)] },
  { ...base, id: "cz-e2-13-payment-2026-03", event_id: CZ, stage: "implementation", status: "verified", scope: "whole_plan", institution: EC, document_kind: "official_eu_publication", document_ref: "Commission Daily News MEX/26/669", url: PRESS("mex_26_669"), publication_date: "2026-03-20", event_date: "2026-03-20", date_precision: "day",
    claim: { zh: "捷克收到第五笔 RRF 付款 6.14 亿欧元；据委员会，捷克已收到其 87.5 亿欧元总额的 77%，计划中 71% 的里程碑和目标已满足。", en: "Czechia received its fifth RRF payment of €614 million; according to the Commission it had received 77% of its total €8.75 billion allocation, with 71% of all milestones and targets fulfilled." },
    amounts: [eur(614_000_000, "paid", "fifth payment", true, "rounded_as_published")], quantities: [{ value: 77, unit: "percent", kind: "reported_progress", label: "of allocation received" }, { value: 71, unit: "percent", kind: "reported_progress", label: "of milestones and targets fulfilled" }] },
  { ...base, id: "cz-e2-14-payment-authorised-2026-08", event_id: CZ, stage: "implementation", status: "verified", scope: "whole_plan", institution: EC, document_kind: "official_eu_decision", document_ref: "C(2026) 5650 final", url: DOC.c2026_5650, publication_date: "2026-08-03", event_date: "2026-08-03", date_precision: "day", document_sha256: "fd234262e0d5dba1a62758204451cc82e8dbd604f2f0e224a9339e4d06ff89a4",
    claim: { zh: "针对 2026 年 4 月 30 日提交的请求（52 个里程碑和目标全部满足），授权第八期 1,028,736,627 欧元；扣除预付款后支付 897,223,735 欧元（其中清偿 REPowerEU 预付款 20,957,467 欧元）。", en: "For the request submitted on 30 April 2026 (all 52 milestones and targets fulfilled), authorised EUR 1 028 736 627 of the eighth instalment; EUR 897 223 735 to be paid after clearing pre-financing (of which EUR 20 957 467 clears REPowerEU pre-financing)." },
    amounts: [eur(1_028_736_627, "authorised", "8th instalment, non-repayable"), eur(897_223_735, "authorised", "to be paid", true)], quantities: [{ value: 52, unit: "milestones_and_targets", kind: "count", label: "in the request" }] },
  { ...base, id: "cz-e2-15-payment-2026-08", event_id: CZ, stage: "implementation", status: "verified", scope: "whole_plan", institution: EC, document_kind: "official_eu_publication", document_ref: "Commission Daily News MEX/26/1731", url: PRESS("mex_26_1731"), publication_date: "2026-08-11", event_date: "2026-08-11", date_precision: "day",
    claim: { zh: "委员会当日向捷克支付 8.97 亿欧元（扣除预付款），措施包括修订电网收费规则；据委员会，捷克已收到其 86.7 亿欧元总额的 88%，88% 的里程碑和目标已满足。", en: "The Commission disbursed €897 million (net of pre-financing) to Czechia that day, for measures including the revision of electricity network tariff rules; according to the Commission Czechia had received 88% of its total €8.67 billion allocation, with 88% of milestones and targets fulfilled." },
    amounts: [eur(897_000_000, "paid", "sixth payment", true, "rounded_as_published")], quantities: [{ value: 88, unit: "percent", kind: "reported_progress", label: "of allocation received" }, { value: 88, unit: "percent", kind: "reported_progress", label: "of milestones and targets fulfilled" }] },
  { ...base, id: "cz-e2-16-outcome-unavailable", event_id: CZ, stage: "realized_outcome", status: "unavailable", scope: "event_specific", institution: { zh: "未找到", en: "None located" }, document_kind: "none_located", document_ref: "—", url: null, publication_date: null, event_date: null, date_precision: "undated",
    claim: { zh: "未找到 REPowerEU 各项投资的完成记录，也未找到可归因于这些措施的能源供应结构变化的测量。委员会的付款决定评估里程碑和目标，而不是结果。", en: "No completion records of the individual REPowerEU investments, and no measured change in the energy-supply structure attributable to them, were located. The Commission's payment decisions assess milestones and targets, not outcomes." } },

  // Hungary — CATL Debrecen battery plant -----------------------------------------------------------------------------
  { ...base, id: "hu-e2-01-announcement", event_id: HU, stage: "announcement", status: "announced", scope: "event_specific", institution: { zh: "CATL（企业）", en: "CATL (company)" }, document_kind: "company_statement", document_ref: "CATL news 983", url: DOC.catl2022, publication_date: "2022-08-12", event_date: "2022-08-12", date_precision: "day",
    claim: { zh: "CATL 公告在德布勒森南部工业园投资 73.4 亿欧元，规划产能 100 GWh，占地 221 公顷。", en: "CATL announced a €7.34 billion investment in Debrecen's Southern Industrial Park, a planned capacity of 100 GWh and a 221-hectare site." },
    amounts: [eur(7_340_000_000, "announced_investment", "planned investment", null, "rounded_as_published")], quantities: [{ value: 100, unit: "GWh_per_year", kind: "announced_capacity", label: "planned capacity" }] },
  { ...base, id: "hu-e2-02-priority-decree", event_id: HU, stage: "approval", status: "verified", scope: "zone_infrastructure", institution: { zh: "匈牙利政府（《匈牙利公报》2022 年第 137 期）", en: "Government of Hungary (Magyar Közlöny 2022/137)" }, document_kind: "national_gazette", document_ref: "Government Decree 323/2022 (VIII. 18.), Magyar Közlöny 2022/137 pp. 5853–5854", url: DOC.mk137, publication_date: "2022-08-18", event_date: "2022-08-19", date_precision: "day", document_sha256: "f6a6c31277e72b75477673130bf11f13d293689fa35c9655d115801ce018d263",
    claim: { zh: "政府令 323/2022 修订 75/2015 号令（将“在德布勒森建设的工业场地”相关行政案件列为国民经济优先案件）：替换场地的专门建设规则（最小地块 10 万平方米、建筑密度至多 60%、高度至多 25 米、绿地至少 15%）和边界坐标，于公布次日生效。该令未提及投资者。", en: "Government Decree 323/2022 amended Decree 75/2015, which makes administrative cases for \"the industrial site being developed in Debrecen\" priority cases of national economic importance: it replaced the site's special building rules (minimum plot 100 000 m², up to 60% built-up, up to 25 m high, at least 15% green area) and its boundary coordinates, in force from the day after promulgation. The decree does not name the investor." },
    note: { zh: "与 CATL 的关联：该令附件第一个边界点（EOV X 239457.6，Y 843384.8）与许可证所载场地第一个角点（X 239466，Y 843383）相距约 9 米。这是 Atlas 的坐标比较，不是任一文件的陈述；完整边界未比较。", en: "Link to CATL: the decree annex's first boundary point (EOV X 239457.6, Y 843384.8) lies about 9 m from the permit's first site corner (X 239466, Y 843383). This is an Atlas coordinate comparison, not a statement in either document; the full boundaries were not compared." } },
  { ...base, id: "hu-e2-03-grid-budget", event_id: HU, stage: "approval", status: "verified", scope: "zone_infrastructure", institution: { zh: "匈牙利政府（《匈牙利公报》2022 年第 137 期）", en: "Government of Hungary (Magyar Közlöny 2022/137)" }, document_kind: "national_gazette", document_ref: "Government Resolution 1415/2022 (VIII. 18.), Magyar Közlöny 2022/137 pp. 5873–5875", url: DOC.mk137, publication_date: "2022-08-18", event_date: "2022-08-18", date_precision: "day", document_sha256: "f6a6c31277e72b75477673130bf11f13d293689fa35c9655d115801ce018d263",
    claim: { zh: "政府决议 1415/2022 修订关于德布勒森南部经济区扩建基础设施的 1041/2022 号决议：电网工程（400/132 kV 变电站与线路）由中央预算出资 877.18849 亿福林，在签订资助合同后 60 个月内完成（MAVIR 450.55 亿、OPUS TITÁSZ 166.84 亿、MVM Démász 17.38 亿、德布勒森市 242.42 亿），并安排 2022–2026 年共 877.62708426 亿福林。该决议未提及投资者。", en: "Government Resolution 1415/2022 amended Resolution 1041/2022 on infrastructure for expanding Debrecen's Southern Economic Zone: grid works (400/132 kV substations and lines) financed with HUF 87 718 849 000 from the central budget within 60 months of the support contract (MAVIR HUF 45.055 bn, OPUS TITÁSZ HUF 16.684 bn, MVM Démász HUF 1.738 bn, Debrecen municipality HUF 24.242 bn), with HUF 87 762 708 426 scheduled over 2022–2026. The resolution does not name the investor." },
    amounts: [huf(87_718_849_000, "budgeted", "grid works financing"), huf(87_762_708_426, "budgeted", "scheduled provision 2022–2026")],
    note: { zh: "这是预算承诺，不是支出记录；决议同时给出两个总额，Atlas 不作调和。", en: "A budget commitment, not a record of spending; the resolution states both totals and the Atlas does not reconcile them." } },
  { ...base, id: "hu-e2-04-environmental-permit", event_id: HU, stage: "approval", status: "verified", scope: "event_specific", institution: { zh: "豪伊杜-比豪尔州政府办公室（环境主管机关）", en: "Hajdú-Bihar County Government Office (environmental authority)" }, document_kind: "national_authority_decision", document_ref: "HB/17-IKV/00002-220/2023 (cited in HB/17-IKV/01008-46/2023)", url: DOC.ekhe, publication_date: "2023-08", event_date: null, date_precision: "undated", document_sha256: "d344278ffc8c0b6160ec71186583b8e4a1f4640445e066ad77bf88275378aba2",
    claim: { zh: "统一环境使用许可 HB/17-IKV/00002-220/2023 已向 Contemporary Amperex Technology Hungary Kft. 签发，用于德布勒森南部工业园规划的电池工厂；在下述修改决定时已为终局决定，有效期至 2028 年 2 月 18 日。", en: "Unified environmental use permit HB/17-IKV/00002-220/2023 had been issued to Contemporary Amperex Technology Hungary Kft. for the battery plant planned in Debrecen's Southern Industrial Park; it was final when the modification below was decided, and it is valid until 18 February 2028." },
    note: { zh: "所读文本未写明原许可的签发日期，因此不给出日期。", en: "The text read does not state the original permit's issue date, so no date is given." } },
  { ...base, id: "hu-e2-05-permit-modified", event_id: HU, stage: "approval", status: "verified", scope: "event_specific", institution: { zh: "豪伊杜-比豪尔州政府办公室（环境主管机关）", en: "Hajdú-Bihar County Government Office (environmental authority)" }, document_kind: "national_authority_decision", document_ref: "HB/17-IKV/01008-46/2023", url: DOC.ekhe, publication_date: "2023-08", event_date: "2023-08", date_precision: "month", document_sha256: "d344278ffc8c0b6160ec71186583b8e4a1f4640445e066ad77bf88275378aba2",
    claim: { zh: "经 2023 年 6 月 29 日申请、6 月 30 日启动的重大变更审查，许可被修改并合并：建筑布局与占地缩小，工艺描述细化，产能不变。许可活动为锂离子电池制造（TEÁOR'08 2720），地块为德布勒森 0495/267，年产能 40 GWh。", en: "After a significant-change review requested on 29 June 2023 and opened on 30 June 2023, the permit was modified and consolidated: building layout and footprint reduced, technology description clarified, capacity unchanged. The permitted activity is lithium-ion battery manufacturing (TEÁOR'08 2720) on plot Debrecen 0495/267, with a production capacity of 40 GWh a year." },
    quantities: [{ value: 40, unit: "GWh_per_year", kind: "permitted_capacity", label: "permitted production capacity" }],
    note: { zh: "决定按时间戳签署，发布于该办公室 2023 年 8 月文件系列；许可产能 40 GWh 低于公告的 100 GWh。", en: "Signed by timestamp and published in the office's August 2023 file series; the permitted 40 GWh is less than the announced 100 GWh." } },
  { ...base, id: "hu-e2-06-permits-litigated", event_id: HU, stage: "approval", status: "disputed", scope: "event_specific", institution: { zh: "未找到一手来源", en: "No primary source located" }, document_kind: "none_located", document_ref: "—", url: null, publication_date: null, event_date: null, date_precision: "undated",
    claim: { zh: "匈牙利媒体报道环境许可遭法院诉讼，并报道最高法院（Kúria）于 2023 年 11 月 29 日撤销另一项灾害防护（工业安全）许可，随后重新开展程序。Atlas 未找到法院判决或主管机关的新决定，因此这些说法不作为证据，2023 年之后各项许可的法律状态尚未确定。", en: "Hungarian press reports court challenges to the environmental permit and a Kúria judgment of 29 November 2023 annulling a separate disaster-management (industrial safety) permit, followed by a new procedure. The Atlas has not located the court decisions or the authority's new decision, so these claims are not used as evidence and the legal status of the permits after 2023 is unresolved." } },
  { ...base, id: "hu-e2-07-support-unavailable", event_id: HU, stage: "approval", status: "unavailable", scope: "event_specific", institution: { zh: "未找到", en: "None located" }, document_kind: "none_located", document_ref: "—", url: null, publication_date: null, event_date: null, date_precision: "undated",
    claim: { zh: "对投资者的公共资金支持：未在官方来源中找到金额或资助合同，也未找到欧盟委员会针对该项目的国家援助决定。", en: "Public financial support to the investor: no amount or support contract was located in an official source, and no European Commission State aid decision for the project was located." } },
  { ...base, id: "hu-e2-08-occupancy-permit", event_id: HU, stage: "implementation", status: "announced", scope: "event_specific", institution: { zh: "CATL（企业，经 PR Newswire 发布）", en: "CATL (company, distributed by PR Newswire)" }, document_kind: "company_statement", document_ref: "CATL release, Debrecen, 22 September 2026", url: DOC.catl2026, publication_date: "2026-09-22", event_date: "2026-08", date_precision: "month",
    claim: { zh: "CATL 称新建电芯工厂于 2026 年 8 月取得使用许可，随后取得所有相关许可，豪伊杜-比豪尔州政府办公室进行了定期现场检查。", en: "CATL states that the newly built cell factory obtained its occupancy permit in August 2026 and then all relevant permits, and that the Hajdú-Bihar County Government Office carried out regular on-site inspections." },
    note: { zh: "企业声明：未写明签发机关和许可编号；建设完成未经官方记录核实。", en: "A company statement: the issuing authority and permit number are not given; completion of construction is not verified by an official record." } },
  { ...base, id: "hu-e2-09-capital-unavailable", event_id: HU, stage: "implementation", status: "unavailable", scope: "event_specific", institution: { zh: "未找到", en: "None located" }, document_kind: "none_located", document_ref: "—", url: null, publication_date: null, event_date: null, date_precision: "undated",
    claim: { zh: "工厂实际投入的资本：未找到项目层面的支出或直接投资流动的公开记录；匈牙利国际收支直接投资只以国家总量发布。", en: "Capital actually invested in the plant: no project-level public record of expenditure or of direct-investment flows was located; Hungary's balance-of-payments direct investment is published only as national totals." } },
  { ...base, id: "hu-e2-10-module-output", event_id: HU, stage: "realized_outcome", status: "announced", scope: "event_specific", institution: { zh: "CATL（企业，经 PR Newswire 发布）", en: "CATL (company, distributed by PR Newswire)" }, document_kind: "company_statement", document_ref: "CATL release, Debrecen, 22 September 2026", url: DOC.catl2026, publication_date: "2026-09-22", event_date: "2024", date_precision: "year",
    claim: { zh: "CATL 称模组生产于 2024 年秋季开始，截至发布时已生产 537,000 个模组。", en: "CATL states that module manufacturing began in autumn 2024 and that 537 000 modules had been produced by the date of the release." },
    quantities: [{ value: 537_000, unit: "modules", kind: "company_reported_output", label: "modules produced to the release date" }],
    note: { zh: "企业报告的产出，未经官方统计核实；未给出价值或产能利用率。", en: "Company-reported output, not verified by official statistics; no value or utilisation is given." } },
  { ...base, id: "hu-e2-11-trial-production", event_id: HU, stage: "realized_outcome", status: "announced", scope: "event_specific", institution: { zh: "CATL（企业，经 PR Newswire 发布）", en: "CATL (company, distributed by PR Newswire)" }, document_kind: "company_statement", document_ref: "CATL release, Debrecen, 22 September 2026", url: DOC.catl2026, publication_date: "2026-09-22", event_date: "2026-09-22", date_precision: "day",
    claim: { zh: "CATL 称电芯工厂前两条生产线于 2026 年 9 月 22 日开始试生产，全厂规划产能 100 GWh。", en: "CATL states that trial production began on 22 September 2026 on the first two production lines of the cell factory, and gives the full site a planned capacity of 100 GWh." },
    quantities: [{ value: 100, unit: "GWh_per_year", kind: "announced_capacity", label: "planned full-site capacity" }],
    note: { zh: "试运行不是批量生产；未给出产量。", en: "A trial run is not series production; no output volume is given." } },
  { ...base, id: "hu-e2-12-outcomes-unavailable", event_id: HU, stage: "realized_outcome", status: "unavailable", scope: "event_specific", institution: { zh: "未找到", en: "None located" }, document_kind: "none_located", document_ref: "—", url: null, publication_date: null, event_date: null, date_precision: "undated",
    claim: { zh: "工厂的就业和批量生产：未找到官方记录。公告的客户和产能不是已实现的产出。", en: "Employment and series production at the plant: no official record was located. Announced customers and capacity are not realised output." } },
];

/** Discrepancies the documents leave open. They are recorded, not resolved. */
export const unresolvedImplementationClaims: Record<string, Bi[]> = {
  [CZ]: [
    { zh: "REPowerEU 章节的措施数量：理事会文件附件称 20 项，委员会 2023 年 9 月新闻稿称 15 项改革和 9 项投资。", en: "Number of REPowerEU measures: the Council annex states 20; the Commission's September 2023 press release states 15 reforms and 9 investments." },
    { zh: "总额：委员会 2026 年 3 月称 87.5 亿欧元，2026 年 8 月称 86.7 亿欧元；所读文件未说明差额。", en: "Total allocation: the Commission stated €8.75 billion in March 2026 and €8.67 billion in August 2026; the documents read do not explain the difference." },
    { zh: "2023 年申请时的贷款为 58 亿欧元，评估时为 8.18 亿欧元；国家页面现为 2.6 亿欧元。", en: "Loans were €5.8 billion in the 2023 request and €818 million at assessment; the country page now shows €260 million." },
    { zh: "除预付款清偿外，付款决定未单列 REPowerEU 章节的付款；章节内各项投资的支付和完成情况尚不清楚。", en: "Apart from pre-financing clearance, the payment decisions do not separate payments for the REPowerEU chapter; payments to and completion of its individual investments are unknown." },
  ],
  [HU]: [
    { zh: "公告产能 100 GWh，许可产能 40 GWh。", en: "Announced capacity 100 GWh; permitted capacity 40 GWh." },
    { zh: "2022 年政府令和决议没有点名投资者；与 CATL 的关联依据场地坐标比较和许可，而不是文件陈述。", en: "The 2022 decree and resolution do not name the investor; the link to CATL rests on a site-coordinate comparison and the permit, not on a statement in those documents." },
    { zh: "许可诉讼和撤销灾害防护许可的结果只有媒体报道。", en: "The outcome of the permit litigation and of the annulled disaster-management permit is reported only in the press." },
    { zh: "政府支持的金额与合同、实际资本支出、就业和批量生产没有官方记录。", en: "Government support amount and contract, actual capital expenditure, employment and series production have no official record." },
  ],
};

/** Observation links. Geography and timing are computed from the stored observations; the definition check is stated here. */
export const implementationLinkSpecs: ImplementationLinkSpec[] = [
  { event_id: CZ, indicator_id: "energy_import_dependency", anchor: "cz-e2-10-grid-milestone-fulfilled", measurement: "outcome_not_isolable", reason: { zh: "全国能源平衡的总量。第 304 号里程碑是一项改革，没有记录接入时间或供应的变化；各项投资的完成也没有记录，因此无法从总量中分离 REPowerEU。", en: "A national energy-balance aggregate. Milestone 304 is a reform with no recorded change in connection times or supply, and completion of the investments is not recorded, so REPowerEU cannot be isolated in the total." } },
  { event_id: HU, indicator_id: "fdi_inflow", anchor: "hu-e2-09-capital-unavailable", measurement: "not_separable", reason: { zh: "BPM6 国家直接投资负债流入；项目资金流动不单独发布，而实际资本支出也没有记录。", en: "BPM6 national direct-investment liability inflows; project flows are not published separately, and actual capital expenditure is not recorded." } },
  { event_id: HU, indicator_id: "manufacturing_share_gdp", anchor: "hu-e2-10-module-output", measurement: "classification_compatible", reason: { zh: "许可的 TEÁOR'08 2720（电池制造）属于 NACE C 门类，分类上可比；但只有企业报告的模组数量，没有产出价值，项目贡献无法测量。", en: "The permit's TEÁOR'08 2720 (battery manufacturing) falls within NACE section C, so the classification is compatible; but only a company-reported module count exists and no output value, so the plant's contribution cannot be measured." } },
  { event_id: HU, indicator_id: "automotive_export_share", anchor: "hu-e2-05-permit-modified", measurement: "classification_incompatible", reason: { zh: "许可把该活动归入 TEÁOR'08 2720（NACE C27），而该指标使用 NACE C29；电池工厂的活动不在该指标的分类内。", en: "The permit classifies the activity as TEÁOR'08 2720 (NACE C27), while this indicator uses NACE C29; the plant's activity is outside the indicator's classification." } },
];

const OFFICIAL: DocumentKind[] = ["official_eu_decision", "official_eu_publication", "council_document", "national_gazette", "national_authority_decision"];
export const isOfficial = (k: DocumentKind) => OFFICIAL.includes(k);
const DATE = { day: /^\d{4}-\d{2}-\d{2}$/, month: /^\d{4}-\d{2}$/, year: /^\d{4}$/ } as const;
/** Sort key: the event date when known, otherwise the publication date; undated items last. */
export const chronologyKey = (m: ImplementationMilestone) => m.event_date ?? m.publication_date ?? "9999";
export function implementationFor(eventId: string): ImplementationMilestone[] {
  return implementationEvidence.filter((m) => m.event_id === eventId).sort((a, b) => chronologyKey(a).localeCompare(chronologyKey(b)) || IMPLEMENTATION_STAGES.indexOf(a.stage) - IMPLEMENTATION_STAGES.indexOf(b.stage) || a.id.localeCompare(b.id));
}

/** Documentary status of each stage: verified if an official document supports a claim in it; announced if only the party
 * concerned states it; disputed if the only claims are contested; unavailable if nothing documents it. */
export function implementationStageStatus(list: ImplementationMilestone[]) {
  return IMPLEMENTATION_STAGES.map((stage) => {
    const items = list.filter((m) => m.stage === stage);
    const n = (s: ClaimStatus) => items.filter((m) => m.status === s).length;
    const status: ClaimStatus = items.some((m) => m.status === "verified" && isOfficial(m.document_kind)) ? "verified" : n("announced") ? "announced" : n("disputed") ? "disputed" : "unavailable";
    return { stage, status, verified: n("verified"), announced: n("announced"), disputed: n("disputed"), unavailable: n("unavailable"), ids: items.map((m) => m.id) };
  });
}

/** Rules every record must satisfy; returns the list of violations (empty when valid). */
export function validateImplementationEvidence(list: ImplementationMilestone[] = implementationEvidence): string[] {
  const errors: string[] = [], ids = new Set<string>(), claims = new Set<string>(), money = new Set<string>();
  for (const m of list) {
    const e = (msg: string) => errors.push(`${m.id}: ${msg}`);
    if (ids.has(m.id)) e("duplicate id"); ids.add(m.id);
    if (!m.id.startsWith(m.event_id.slice(0, 3))) e("id does not belong to its event");
    const c = `${m.event_id}|${m.stage}|${m.document_ref}|${m.claim.en}`; if (claims.has(c)) e("duplicate milestone"); claims.add(c);
    for (const a of m.amounts) { const k = `${m.document_ref}|${a.kind}|${a.currency}|${a.value}|${a.label}`; if (money.has(k)) e("duplicate amount"); money.add(k); }
    if (!m.claim.en || !m.claim.zh) e("claim must be bilingual");
    if (m.date_precision === "undated" ? m.event_date !== null : !(m.event_date && DATE[m.date_precision].test(m.event_date))) e("event date does not match its precision");
    if (m.publication_date && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(m.publication_date)) e("bad publication date");
    if (m.event_date && m.publication_date && m.event_date.slice(0, m.publication_date.length) > m.publication_date.slice(0, m.event_date.length) && !(m.event_date === m.publication_date)) {
      // an act that enters into force after its publication (e.g. "the day after promulgation") is allowed only one day later
      const next = new Date(Date.parse(`${m.publication_date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
      if (m.event_date !== next) e("event dated after its source was published");
    }
    if (m.status === "verified" && (!isOfficial(m.document_kind) || !m.url?.startsWith("https://"))) e("verified requires an official document with an https URL");
    if (m.document_kind === "company_statement" && m.status !== "announced") e("a company statement is announced, never verified");
    if (m.status === "unavailable" && (m.url !== null || m.document_kind !== "none_located" || m.amounts.length || m.quantities.length)) e("an unavailable claim carries no document, amount or quantity");
    if (m.status === "disputed" && (m.amounts.length || m.quantities.length)) e("a disputed claim carries no amount or quantity");
    if (m.status !== "unavailable" && m.status !== "disputed" && !m.url) e("a documented claim needs a URL");
    for (const a of m.amounts) {
      if (!Number.isFinite(a.value) || a.value <= 0 || (a.precision === "exact" && !Number.isInteger(a.value))) e(`bad amount ${a.value}`);
      if (!["EUR", "HUF"].includes(a.currency)) e("unknown currency");
      if (a.kind === "paid" && (!isOfficial(m.document_kind) || m.stage !== "implementation")) e("a payment must come from an official document at the implementation stage");
      if (a.kind === "announced_investment" && (m.document_kind !== "company_statement" || m.stage !== "announcement")) e("an announced investment is an announcement by the investor");
    }
    for (const q of m.quantities) {
      if (q.kind === "company_reported_output" && m.document_kind !== "company_statement") e("company-reported output must cite the company");
      if (q.kind === "announced_capacity" && m.stage !== "announcement" && m.status !== "announced") e("an announced capacity is never a realised one");
    }
    if (m.stage === "realized_outcome" && m.status === "verified" && !isOfficial(m.document_kind)) e("a verified outcome needs an official record");
    if (m.document_sha256 !== null && !/^[0-9a-f]{64}$/.test(m.document_sha256)) e("bad document hash");
  }
  // Chronology: the first dated record of each stage cannot precede the first dated record of an earlier stage (the
  // realised-outcome stage is exempt, since production can precede a later completion record).
  for (const id of [...new Set(list.map((m) => m.event_id))]) {
    const first = IMPLEMENTATION_STAGES.slice(0, 3).map((s) => list.filter((m) => m.event_id === id && m.stage === s && m.event_date && m.status !== "unavailable").map((m) => m.event_date!).sort()[0] ?? null);
    for (let i = 1; i < first.length; i++) for (let j = 0; j < i; j++) if (first[i] && first[j] && first[i]! < first[j]!) errors.push(`${id}: ${IMPLEMENTATION_STAGES[i]} precedes ${IMPLEMENTATION_STAGES[j]}`);
  }
  return errors;
}
