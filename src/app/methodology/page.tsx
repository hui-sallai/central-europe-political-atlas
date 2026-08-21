import type { Metadata } from "next";
import Link from "next/link";
import { CitationActions } from "@/components/CitationActions";
import { platformStatus } from "@/lib/platformStatus";
import { getResearchPackageFilename, platformApaCitation, platformBibtexCitation, platformCitation } from "@/lib/releaseMetadata";

export const metadata: Metadata = { title: "研究方法", description: "数据、模型、事件、空间、验证和引用规则。" };

const sections = [["data", "Data"], ["models", "Analysis"], ["events", "Events"], ["spatial", "Spatial"], ["validation", "Validation"], ["citation", "Citation"]] as const;

function Section({ id, label, title, children }: { id: string; label: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-24 border-t border-[var(--line)] py-10"><p className="editorial-kicker">{label}</p><h2 className="mt-3 text-3xl font-semibold">{title}</h2>{children}</section>;
}

export default function MethodologyPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return <main className="page-shell">
    <header className="max-w-4xl border-b border-[var(--line)] pb-8"><p className="editorial-kicker">Research / {platformStatus.version}</p><h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">研究方法与边界</h1><p className="mt-5 text-base leading-8 text-[var(--muted)]">本页说明公开研究流程和不能说明什么。完整字典、QA、版本记录与技术字段保留在研究数据包，不再占据主要页面。</p><nav className="mt-5 flex flex-wrap gap-3">{sections.map(([id, label]) => <a key={id} href={`#${id}`} className="text-sm font-semibold text-[var(--accent)]">{label}</a>)}</nav></header>

    <Section id="data" label="01 / Data" title="数据如何进入平台"><p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--muted)]">每条正式观测必须有国家或地区、时间、数值、单位、来源名称、来源链接、可靠性、状态和更新时间。official / verified 可进入相应事实层；pending 保留但不参与比较；sample 与 placeholder 不进入分析。A 级为官方统计或机构，B 级为可核验权威来源，C 级只作线索，D 级排除。</p><p className="mt-3 text-sm leading-7 text-[var(--muted)]">跨国比较只使用同定义、同单位、同层级和共同年份。计算值必须保留分子、分母、公式和来源。</p><Link href="/data" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)]">打开 Data Explorer</Link></Section>

    <Section id="models" label="02 / Analysis" title="透明分析方法"><p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--muted)]">所有方法统一通过 Analysis Runner：输入数据 → 计算 → diagnostics → result → consistency。综合指标继续使用既有标准化与权重；Scenario 仍是条件参数预设，不改写原始数据。</p><div className="mt-5 grid gap-5 md:grid-cols-2"><div className="border-l-2 border-[var(--accent)] pl-5"><h3 className="font-semibold">Panel Econometrics</h3><p className="mt-2 text-sm leading-7 text-[var(--muted)]">年度面板必须至少覆盖 8 国、8 年，并有至少 4 个关键可比变量达到 75% 覆盖。当前支持 Pooled OLS、Country FE、Country + Year FE，以及 HC1 或按国家聚类标准误。系数表示条件关联，固定效应不自动构成因果识别。</p></div><div className="border-l-2 border-[var(--line)] pl-5"><h3 className="font-semibold">Network Analysis</h3><p className="mt-2 text-sm leading-7 text-[var(--muted)]">技能只有在通用伙伴国双边边、年份、流向和权重完整时才启用。当前对华聚合序列不冒充完整网络，因此保持 data_building。中心性不等于政治影响，集中度不等于风险。</p></div></div><div className="mt-5 border-l-2 border-[var(--accent)] pl-5"><h3 className="font-semibold">启用条件</h3><p className="mt-2 text-sm leading-7 text-[var(--muted)]">来源、年份、单位、状态、更新时间、定义可比性和样本覆盖未通过时不运行。VAR 与 Bayesian 需要至少 40 个有效季度或月度观测，并通过平稳性、滞后和稳定性检查；Event Study 与因果政策分析继续只登记数据设计。</p></div><p className="mt-4 text-sm text-[var(--muted)]">所有输出是研究工具，不是客观风险真值、概率、投资建议、选举预测或因果结论。</p></Section>

    <Section id="events" label="03 / Events" title="事件编码"><p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--muted)]">Source → Event → Coding → Affected Indicator / Project → Research context。date、actor、event_type、direction 和 confidence 用于检索与解释；它们不自动构成因果关系，也不直接改变模型分数。未完整编码、低置信度或结构样例保持 enters_model=false。</p><Link href="/news" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)]">进入 Event Library</Link></Section>

    <Section id="spatial" label="04 / Spatial" title="空间与边界"><p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--muted)]">区域记录通过 region_id、行政层级、边界版本、来源、许可和年份关联。国家值不下推到区域，NUTS2 与 NUTS3 不混用。真实边界只有在来源、许可、坐标系、几何、拓扑和主键检查通过后才开放；地图不提供风险、预测、情景影响或真实党派支持率图层。</p></Section>

    <Section id="validation" label="05 / Validation" title="质量检查与已知限制"><p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--muted)]">验证覆盖确定性、权重、标准化边界、缺失值、年份对齐、情景零冲击、参数界限和复现。Expected unavailable 表示准入闸门按规则阻止输出，不是错误。</p><p className="mt-3 text-sm leading-7 text-[var(--muted)]"><strong>Validation ≠ scientific proof.</strong> 当前只声称 <strong>Historical reconstruction readiness</strong> 与方向性验证；没有 point-in-time vintage data 时，不报告预测准确率。事件关联不等于因果，项目库不等于项目普查，confidence 不等于发生概率。</p><div className="mt-5 flex flex-wrap gap-3"><a href={`${basePath}/research-data/validation_registry.json`} className="text-sm font-semibold text-[var(--accent)]">Validation registry</a><a href={`${basePath}/research-data/golden_test_cases.json`} className="text-sm font-semibold text-[var(--accent)]">Golden tests</a></div></Section>

    <Section id="citation" label="06 / Citation" title="引用与下载"><p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--muted)]">引用应包含平台版本、访问日期和稳定 URL。具体 observation、事件、项目、模型或情景应同时引用其记录标识和原始来源；平台不会伪造 DOI。</p><div className="mt-5"><CitationActions plainText={platformCitation()} apaText={platformApaCitation()} bibtexText={platformBibtexCitation()} label="复制平台引用" /></div><div className="mt-5 flex flex-wrap gap-3"><a href={`${basePath}/research-data/${getResearchPackageFilename()}`} className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white">Download research package</a><a href={`${basePath}/research-data/release_manifest.json`} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">Release manifest</a></div></Section>
  </main>;
}
