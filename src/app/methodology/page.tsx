import type { Metadata } from "next";
import Link from "next/link";
import { CitationActions } from "@/components/CitationActions";
import { ModelValidationStatus } from "@/components/ModelValidationStatus";
import { dataStatusMeta } from "@/lib/dataStatusLabels";
import { modelCards } from "@/lib/modelFramework";
import { platformStatus } from "@/lib/platformStatus";
import { platformApaCitation, platformBibtexCitation, platformCitation, releaseChangelog } from "@/lib/releaseMetadata";
import { scenarioDefinitions } from "@/lib/scenarioFramework";
import { sourceReliabilityRule } from "@/lib/sourceDictionary";

export const metadata: Metadata = {
  title: "方法论、验证与引用",
  description: "平台范围、数据状态、来源等级、跨国可比性、模型、情景、验证、限制和引用规则。",
};

const sectionLinks = [
  ["scope", "1. Scope"], ["sources", "2. Data Sources"], ["statuses", "3. Data Status"],
  ["comparability", "4. Cross-country Comparability"], ["regional", "5. Regional Data"],
  ["events", "6. Event Coding"], ["projects", "7. China Project Database"],
  ["models", "8. Transparent Models"], ["scenarios", "9. Scenario Analysis"],
  ["validation", "10. Validation & Reproducibility"], ["limitations", "11. Limitations"],
  ["history", "12. Version History"], ["citation", "13. Citation"],
] as const;

const sourceLevels = (["A", "B", "C", "D"] as const).map((level) => [level, sourceReliabilityRule(level)] as const);

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="mt-6 scroll-mt-24 card p-6"><p className="eyebrow">{eyebrow}</p><h2 className="mt-3 text-2xl font-semibold">{title}</h2>{children}</section>;
}

export default function MethodologyPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <main className="page-shell">
      <p className="eyebrow">Methodology / {platformStatus.version}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">方法论、验证与引用</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--muted)]">本页集中说明哪些记录可以进入比较与模型、公式如何复现、情景不能说明什么，以及如何引用平台和导出记录。历史开发阶段只保留在 Changelog。</p>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="方法论目录">
        {sectionLinks.map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]">{label}</a>)}
      </nav>

      <Section id="scope" eyebrow="Research Scope" title="1. Scope">
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl bg-[var(--surface-muted)] p-4"><h3 className="font-semibold">平台提供</h3><ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--muted)]"><li>十国事实数据和九国区域事实比较</li><li>公开公式与权重的规则模型</li><li>固定基线下的条件式情景分析</li><li>事件、项目、指标和来源追溯</li></ul></article>
          <article className="rounded-2xl bg-[var(--surface-muted)] p-4"><h3 className="font-semibold">平台不提供</h3><ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--muted)]"><li>选举或概率预测</li><li>投资建议或客观风险真值</li><li>因果影响估计</li><li>区域情景分数或综合未来风险</li></ul></article>
        </div>
      </Section>

      <Section id="sources" eyebrow="Source Policy" title="2. Data Sources">
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">每条正式记录保留来源名称、URL、数据集、年份、更新时间和可靠性等级。A/B 级可作为正式数据或事件依据；C 级只作补充；D 级不进入正式分析。</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{sourceLevels.map(([level, rule]) => <article key={level} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"><p className="text-xl font-semibold text-[var(--accent)]">{level} 级</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{rule}</p></article>)}</div>
        <Link href="/data?panel=dictionaries#source-dictionary" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline">浏览来源字典</Link>
      </Section>

      <Section id="statuses" eyebrow="Status Vocabulary" title="3. Data Status">
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Object.entries(dataStatusMeta).filter(([key]) => key !== "manual" && key !== "missing").map(([key, value]) => <article key={key} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"><p className="font-mono text-xs font-semibold text-[var(--accent)]">{key}</p><h3 className="mt-2 font-semibold">{value.label}</h3><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{value.description}</p></article>)}</div>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">缺失展示进一步区分：Unavailable（当前不能计算）、Pending publication（等待发布）、Not applicable（不适用）、Insufficient evidence（证据不足）和 Review required（需复核）。</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            ["Source reliability", "评价来源类型和可核验性，使用 A/B/C/D；它不表示模型结果正确的概率。"],
            ["Model / scenario confidence", "评价合格输入覆盖、年份一致性和证据完整度；它不是事件发生概率。"],
            ["Project verification", "评价项目主体、金额、年份和来源证据，使用可量化、部分可量化、仅作背景或不进入分析。"],
            ["Location precision", "评价 exact site、city、region 或 country-only 的定位精度；它不表示项目事实本身的可靠性。"],
          ].map(([title, description]) => <article key={title} className="rounded-2xl bg-[var(--surface-muted)] p-4"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{description}</p></article>)}
        </div>
      </Section>

      <Section id="comparability" eyebrow="Comparison Gate" title="4. Cross-country Comparability">
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">跨国排名、均值差距和派生比较只使用同一定义、单位、行政层级和 latest common year。待接入、不适用、定义不一致或 review_required 的记录会被排除，而不是转成零值。</p>
        <ol className="mt-4 grid gap-2 text-sm leading-6 text-[var(--muted)] md:grid-cols-2">{["明确国家或地区与稳定 ID", "明确年份、季度、月份或事件日期", "数值与单位完整", "来源名称、链接和可靠性完整", "状态和更新时间完整", "指标与来源字典中存在", "不属于结构样例或未核验政治样本", "计算值保留分子、分母、公式与年份"].map((item, index) => <li key={item} className="rounded-xl bg-[var(--surface-muted)] px-4 py-3"><strong>{index + 1}.</strong> {item}</li>)}</ol>
      </Section>

      <Section id="regional" eyebrow="Spatial Evidence" title="5. Regional Data">
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">区域事实按 region_id、行政层级、边界版本、许可、来源和年份管理。国家值不会下推到区域；NUTS2 与 NUTS3 不直接混合。九国已开放通过展示闸门的事实图层，塞尔维亚区域比较继续待接入。</p>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">地图不是唯一入口：可用区域事实同时通过区域表格、国家页和 research-data 导出读取。地图没有启用风险、预测、情景影响、China Exposure 或真实党派支持率图层。</p>
      </Section>

      <Section id="events" eyebrow="Event Coding" title="6. Event Coding">
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Source → Event → Coding → Affected Indicator → Future Model Input。direction、intensity 和 confidence 是结构化研究字段，不是预测概率。事件可解释近期变化，但当前记录保持 enters_model=false，不直接改变基础模型或情景分数。</p>
        <Link href="/news" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline">进入 Event Library</Link>
      </Section>

      <Section id="projects" eyebrow="Project Evidence" title="7. China Project Database">
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Project → Region → Sector → Source → China Exposure evidence → Related events。项目按可量化、部分可量化、仅作背景和不进入分析核验；没有可靠来源的金额保持缺失。</p>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">China Economic Exposure 仍受证据维度门槛约束；暴露不等于政治影响力、风险或投资质量。China-linked Project Disruption 继续保持 score_enabled=false。</p>
      </Section>

      <Section id="models" eyebrow="Transparent Model Methodology" title="8. Transparent Models">
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Observation → Standardization → Weighting → Score → Drivers → Confidence。每项分数保留 observation_id、原始值、来源、标准化值、权重和贡献。缺失输入不会自动插值。</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">{modelCards.map((card) => <article key={card.model_id} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"><p className="font-mono text-xs text-[var(--accent)]">{card.model_id}</p><h3 className="mt-2 font-semibold">{card.name_zh}</h3><p className="mt-2 text-xs leading-5 text-[var(--muted)]">formula={card.formula_version} · weights={card.weight_version}</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.output_meaning}</p></article>)}</div>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">模型只有在来源、年份、单位、状态、更新时间和完整度通过时才输出精确分数。任何未来模型都必须公开输入、权重逻辑、置信度和不能说明什么。</p>
      </Section>

      <Section id="scenarios" eyebrow="Conditional Analysis" title="9. Scenario Analysis">
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Baseline → Shock Assumption → Adjusted Variable → Model Recalculation → Scenario Difference → Interpretation。情景不改写原始 observation，不把事件强度当作数值冲击，也不解释为未来事实。</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">{scenarioDefinitions.map((scenario) => <article key={scenario.scenario_id} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"><p className="font-mono text-xs text-[var(--accent)]">{scenario.scenario_id}</p><h3 className="mt-2 font-semibold">{scenario.name_zh}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{scenario.description}</p><p className="mt-2 text-xs text-[var(--muted)]">范围 {scenario.shock_min}–{scenario.shock_max} {scenario.shock_unit}</p></article>)}</div>
      </Section>

      <Section id="validation" eyebrow="Validation & Reproducibility" title="10. Validation & Reproducibility">
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">验证覆盖确定性、权重、标准化边界、缺失值、方向、年份对齐、情景零冲击、隔离、参数界限、敏感性和复现。Expected unavailable 是准入闸门通过，不与数值相等测试混为一类。</p>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">当前只声称 Historical reconstruction readiness。没有 point-in-time vintage data 时，不报告 backtest accuracy。</p>
        <ModelValidationStatus />
      </Section>

      <Section id="limitations" eyebrow="Known Limits" title="11. Limitations">
        <ul className="mt-5 grid gap-3 md:grid-cols-2">{["模型标准化边界和权重是公开研究设定，不是自然阈值。", "Confidence 表示证据与输入覆盖，不是发生概率。", "统计修订可能改变历史观测，当前没有完整 vintage 数据。", "项目库是经核验样本库，不是全部项目普查。", "事件关联不自动构成因果关系或分数调整。", "塞尔维亚国家数据可用，区域比较仍待接入。"].map((item) => <li key={item} className="rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">{item}</li>)}</ul>
      </Section>

      <Section id="history" eyebrow="Changelog" title="12. Version History">
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">这里记录方法阶段，不复制 commit log；历史版本不再占据主要页面正文。</p>
        <div className="mt-5 grid gap-3">{releaseChangelog.map(([version, changes, methods, breaking]) => <details key={version} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"><summary className="cursor-pointer font-semibold">{version}</summary><dl className="mt-3 grid gap-2 text-sm leading-6 text-[var(--muted)] md:grid-cols-3"><div><dt className="text-xs font-semibold text-[var(--foreground)]">Major changes</dt><dd>{changes}</dd></div><div><dt className="text-xs font-semibold text-[var(--foreground)]">Method changes</dt><dd>{methods}</dd></div><div><dt className="text-xs font-semibold text-[var(--foreground)]">Breaking changes</dt><dd>{breaking}</dd></div></dl></details>)}</div>
      </Section>

      <Section id="citation" eyebrow="Cite This Platform" title="13. Citation">
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">引用必须包含平台版本和访问日期。平台没有 DOI，不会伪造 DOI。具体模型、情景、事件、项目和 observation 应同时引用其稳定 ID 与原始来源。</p>
        <div className="mt-5"><CitationActions plainText={platformCitation()} apaText={platformApaCitation()} bibtexText={platformBibtexCitation()} label="复制平台引用" /></div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-[var(--accent)]"><a href={`${basePath}/research-data/platform_metadata.json`} className="hover:underline">platform_metadata.json</a><a href={`${basePath}/research-data/release_manifest.json`} className="hover:underline">release_manifest.json</a><Link href="/data?panel=dictionaries" className="hover:underline">数据与来源字典</Link></div>
      </Section>
    </main>
  );
}
