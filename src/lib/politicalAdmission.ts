// Publication-gate status per country for the Political Explorer. Presentation only: it restates the gate records in
// docs/political-data (source-closure gate matrix, candidate and source-status files) and never admits a country.
// A country is "admitted" only when its official stores are imported by politicalData.ts; tests keep the two in step.
import type { PoliticalLocalText } from "./politicalExplorer";

export type AdmissionState = "admitted" | "staged_not_published" | "blocked";
/** Blocker causes, as classified in docs/political-data/stage_c_decision_record.json. */
export type BlockerCause = "reuse_restriction" | "missing_official_evidence" | "parser_incompatibility" | "identity_unverified" | "internal_approval";
export type CountryAdmission = { slug: string; name: PoliticalLocalText; state: AdmissionState; reason: PoliticalLocalText; record: string; causes: BlockerCause[] };
export const blockerCauseLabels: Record<BlockerCause, PoliticalLocalText> = {
  reuse_restriction: { en: "Reuse terms restrict or are absent", "zh-CN": "再利用条款受限或缺失" },
  missing_official_evidence: { en: "Official evidence missing", "zh-CN": "缺少官方证据" },
  parser_incompatibility: { en: "Format not yet supported", "zh-CN": "格式尚不支持" },
  identity_unverified: { en: "List or alliance identity unverified", "zh-CN": "名单或联盟身份未核实" },
  internal_approval: { en: "Owner authorisation required", "zh-CN": "需要负责人授权" },
};

const t = (en: string, zh: string): PoliticalLocalText => ({ en, "zh-CN": zh });

export const politicalAdmissions: CountryAdmission[] = [
  { slug: "germany", causes: [], name: t("Germany", "德国"), state: "admitted", record: "docs/political-data/germany_production_acceptance.json",
    reason: t("Official federal results with an open licence (dl-de/by-2-0), source snapshots and verified party-series relationships.", "联邦官方结果，开放许可（dl-de/by-2-0），附来源快照与经核实的政党序列关系。") },
  { slug: "czechia", causes: [], name: t("Czechia", "捷克"), state: "admitted", record: "docs/political-data/czechia_identity_admission.json",
    reason: t("Chamber of Deputies 2017, 2021 and 2025, national level: ČSÚ DataStat files whose catalogue metadata record no copyright work, no protected database and no personal data, reconciled with the official totals. List kinds and coalition members come from the official registers; links between elections exist only where a legal register was reviewed. 2002–2013 remain blocked.", "2017、2021、2025 年众议院选举（全国层面）：捷克统计局 DataStat 文件，其目录元数据载明不含受版权保护作品、不含受保护数据库、不含个人数据，并已与官方总数核对。名单类型和联盟成员来自官方登记册；跨届关联仅在核查法定登记册后建立。2002—2013 年选举仍受阻。") },
  { slug: "slovakia", causes: [], name: t("Slovakia", "斯洛伐克"), state: "admitted", record: "docs/political-data/slovakia_rights_evidence_admission.json",
    reason: t("National Council 2023, national level: State Commission minutes, reconciled with the official totals. The rights basis is a reading of the Copyright Act (2023 version) for results the commission must publish; no licence exists, and whether the minutes are an official decision is not established. Statistical Office files stay unused because its terms prohibit automated tools, so 2020, 2016 and 2012 remain blocked.", "2023 年国民议会选举（全国层面）：国家委员会会议记录，并已与官方总数核对。权利依据是对《著作权法》（2023 年版本）的解读，适用于该委员会依法必须公布的结果；不存在正式许可，会议记录是否属于官方决定尚未确定。统计局的条款禁止自动化工具，其文件仍未使用，因此 2020、2016、2012 年选举仍受阻。") },
  { slug: "poland", causes: [], name: t("Poland", "波兰"), state: "admitted", record: "docs/political-data/poland_sejm_admission.json",
    reason: t("Sejm 2011, 2015, 2019 and 2023, national level: PKW result notices published in the official gazette, treated as official documents outside copyright (Art. 4, Copyright Act) and reconciled with the official totals. Party series exist only where PKW communiqués print the same party register number (not the court register itself); a coalition's members are not stated. The election archive's own data files stay unused because its legal page is empty.", "2011、2015、2019、2023 年众议院选举（全国层面）：官方公报刊登的国家选举委员会结果公告，视为不受著作权保护的官方文件（《著作权法》第 4 条），并已与官方总数核对。政党序列仅在国家选举委员会公告列出相同政党登记号时建立（并非法院登记册本身）；来源未载明联盟成员。选举档案网站的法律页面为空，其数据文件仍未使用。") },
  { slug: "austria", causes: ["reuse_restriction", "missing_official_evidence", "internal_approval"], name: t("Austria", "奥地利"), state: "blocked", record: "docs/political-data/source-closure/austria_source_closure.json",
    reason: t("The interior ministry permits reuse only for non-commercial purposes, and whether this covers the result workbooks is unresolved; its robots.txt disallows AI agents.", "内政部仅允许非商业目的的转载，是否涵盖结果工作簿尚未确认；其 robots.txt 禁止 AI 代理。") },
  { slug: "hungary", causes: ["missing_official_evidence", "identity_unverified", "internal_approval"], name: t("Hungary", "匈牙利"), state: "blocked", record: "docs/political-data/hungary_source_status.json",
    reason: t("The election office's terms are on a site whose robots.txt disallows all agents, so they have not been reviewed; the results application offers no downloadable file. Joint-list identities are not yet documented.", "选举办公室的条款位于 robots.txt 禁止所有代理访问的网站，因此尚未审阅；结果应用不提供可下载文件。联合名单的身份尚无文件依据。") },
  { slug: "romania", causes: ["missing_official_evidence", "internal_approval"], name: t("Romania", "罗马尼亚"), state: "staged_not_published", record: "docs/political-data/romania_publication_readiness.json",
    reason: t("A 2016 Chamber of Deputies candidate package exists in staging only; it needs owner authorisation and unresolved source checks before publication.", "2016 年众议院候选数据包仅在暂存区；发布前需要负责人授权并解决来源核查问题。") },
];

export const notInAdmissionPipeline = t("Croatia, Slovenia and Serbia have not yet entered the admission pipeline.", "克罗地亚、斯洛文尼亚和塞尔维亚尚未进入准入流程。");

export const admittedCountrySlugs = politicalAdmissions.filter((row) => row.state === "admitted").map((row) => row.slug);
