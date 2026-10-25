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
  { slug: "czechia", causes: ["reuse_restriction", "missing_official_evidence", "identity_unverified", "internal_approval"], name: t("Czechia", "捷克"), state: "blocked", record: "docs/political-data/source-closure/czechia_source_closure.json",
    reason: t("The ČSÚ CC BY 4.0 terms name csu.gov.cz, not the election open-data site; reuse and republication stay open until ČSÚ replies. Identity, electoral-rule and vintage gates are also open.", "捷克统计局 CC BY 4.0 条款针对 csu.gov.cz，而非选举开放数据站点；在统计局回复前，再利用与再发布仍未确认。身份、选举规则与版本关卡也未关闭。") },
  { slug: "slovakia", causes: ["reuse_restriction", "missing_official_evidence", "identity_unverified", "internal_approval"], name: t("Slovakia", "斯洛伐克"), state: "blocked", record: "docs/political-data/source-closure/slovakia_source_closure.json",
    reason: t("CC BY 4.0 terms cover statistics.sk; their application to the election files awaits confirmation, and the terms prohibit automated collection. The identity gate is open and the source files are incomplete.", "CC BY 4.0 条款针对 statistics.sk，是否适用于选举文件有待确认；条款禁止自动采集。身份关卡仍未关闭，来源文件也不完整。") },
  { slug: "poland", causes: ["reuse_restriction", "missing_official_evidence", "identity_unverified", "internal_approval"], name: t("Poland", "波兰"), state: "blocked", record: "docs/political-data/source-closure/poland_source_closure.json",
    reason: t("The election data site's legal-information page is empty; no reuse terms are located, so reuse, republication and redistribution are unresolved. Definition, identity and rule gates are open.", "选举数据网站的法律信息页面为空，未找到再利用条款，因此再利用、再发布与再分发均未确认。定义、身份与规则关卡仍未关闭。") },
  { slug: "austria", causes: ["reuse_restriction", "missing_official_evidence", "internal_approval"], name: t("Austria", "奥地利"), state: "blocked", record: "docs/political-data/source-closure/austria_source_closure.json",
    reason: t("The interior ministry permits reuse only for non-commercial purposes, and whether this covers the result workbooks is unresolved; its robots.txt disallows AI agents.", "内政部仅允许非商业目的的转载，是否涵盖结果工作簿尚未确认；其 robots.txt 禁止 AI 代理。") },
  { slug: "hungary", causes: ["missing_official_evidence", "identity_unverified", "internal_approval"], name: t("Hungary", "匈牙利"), state: "blocked", record: "docs/political-data/hungary_source_status.json",
    reason: t("The election office's terms are on a site whose robots.txt disallows all agents, so they have not been reviewed; the results application offers no downloadable file. Joint-list identities are not yet documented.", "选举办公室的条款位于 robots.txt 禁止所有代理访问的网站，因此尚未审阅；结果应用不提供可下载文件。联合名单的身份尚无文件依据。") },
  { slug: "romania", causes: ["missing_official_evidence", "internal_approval"], name: t("Romania", "罗马尼亚"), state: "staged_not_published", record: "docs/political-data/romania_publication_readiness.json",
    reason: t("A 2016 Chamber of Deputies candidate package exists in staging only; it needs owner authorisation and unresolved source checks before publication.", "2016 年众议院候选数据包仅在暂存区；发布前需要负责人授权并解决来源核查问题。") },
];

export const notInAdmissionPipeline = t("Croatia, Slovenia and Serbia have not yet entered the admission pipeline.", "克罗地亚、斯洛文尼亚和塞尔维亚尚未进入准入流程。");

export const admittedCountrySlugs = politicalAdmissions.filter((row) => row.state === "admitted").map((row) => row.slug);
