import { platformStatus } from "@/lib/platformStatus";
import { researchDataLayerFiles } from "@/lib/countryMetadata";
import {
  hungaryAuthoritativeTopologyValidationDecisionSummary,
  hungaryGiscoLicenseVerificationDecisionSummary,
  hungaryNuts3ValidationManifestSummary,
} from "@/lib/regionQualityChecks";

const dataStatuses = [
  ["official", "正式数据", "已取得可核验来源、年份、数值、单位和更新时间，可进入事实数据表。"],
  ["verified", "已核验", "来源或事实已复核，但不表示已完成事件编码或模型资格检查。"],
  ["pending", "待接入", "字段已预留，数值或来源尚未接入。"],
  ["sample", "结构样例", "只用于验证页面、字段或交互，不进入分析。"],
  ["placeholder", "占位内容", "仅说明未来承接位置，不表达事实数值。"],
  ["calculated", "计算值", "由可追溯原始值按已记录方法计算，必须保留计算说明。"],
  ["derived", "派生值", "用于均值、排名和变化等事实比较，不等于风险判断。"],
] as const;

const reliabilityLevels = [
  ["A", "官方统计机构、央行、欧盟机构、国际组织", "可作为正式观测值的优先来源。"],
  ["B", "主流通讯社、权威智库、官方年报", "可作为事件或项目核验依据，正式统计仍优先 A 级。"],
  ["C", "地方媒体、企业公告、行业网站", "只作补充线索，需与更高等级来源交叉核验。"],
  ["D", "未核验二手来源、社交媒体、无明确出处内容", "不进入正式数据、事件库或模型计算。"],
] as const;

const eventFields = [
  "event_id", "date", "country_code", "region_code", "actor", "event_type", "direction",
  "intensity", "affected_model", "duration", "confidence", "source_status", "enters_model",
] as const;

const modelConditions = [
  "输入数据具有明确国家或地区、时间、数值、单位、状态和更新时间。",
  "每个输入变量均可追溯到来源名称、来源链接和可靠性等级。",
  "指标口径存在于指标字典，缺失值与计算值处理规则已公开。",
  "样例、占位、待核验、缺少来源的项目或事件不进入模型。",
  "模型公开输入变量、权重逻辑、置信度、适用范围和不能说明什么。",
  "数据完整度未达到预设门槛前，不输出风险指数、预测或选举结论。",
] as const;

const knownLimitations = [
  "十国基础宏观覆盖较完整，但 V4 扩展指标仍存在待接入年份。",
  "非 V4 六国暂未进入第一批区域边界和区域统计准备。",
  "匈牙利 NUTS3 已完成许可、主键和权威拓扑记录，但公开展示准入仍未启用。",
  "对华项目仍以核验表为主，金额、主体和状态时间线并非全部可量化。",
  "事件库已有少量来源核验摘要，大部分 actor、direction、intensity 等字段仍待编码。",
  "政治样本与党派色阶不是正式民调，不进入模型。",
] as const;

const boundaryHistory = [
  ["v0.11–v0.12", "建立匈牙利 NUTS3 沙盒文件、基础几何与 CRS 验收记录。"],
  ["v0.13–v0.15", "记录内部视觉 QA、许可来源、署名要求和拓扑证据字段。"],
  ["v0.16–v0.19", "建立 20 条 validation manifest，并完成 region_id 一对一匹配判定。"],
  ["v0.20", "记录 GISCO 公开非商业研究展示的许可判定。"],
  ["v0.21", "记录官方 Level 3 几何的权威拓扑验收判定；正式展示仍未启用。"],
] as const;

export default function MethodologyPage() {
  const topology = hungaryAuthoritativeTopologyValidationDecisionSummary;
  const license = hungaryGiscoLicenseVerificationDecisionSummary;
  const manifest = hungaryNuts3ValidationManifestSummary;

  return (
    <main className="page-shell">
      <p className="eyebrow">Methodology / {platformStatus.version}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">方法论与数据边界</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        本页说明平台如何区分正式数据、核验记录、待接入内容和结构样例，以及地图、事件和未来模型必须满足的条件。
      </p>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Data Status</p>
        <h2 className="mt-3 text-2xl font-semibold">1. 数据状态</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {dataStatuses.map(([key, label, note]) => (
            <article key={key} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 font-mono text-xs font-semibold text-[var(--muted)]">{key}</span>
                <h3 className="font-semibold">{label}</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{note}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          “待核验”是人工整理内容的页面工作流标签，不是独立的 DataStatus；进入统一数据层时必须明确归入 verified 或 pending。
        </p>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Source Reliability</p>
        <h2 className="mt-3 text-2xl font-semibold">2. 来源等级与使用边界</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {reliabilityLevels.map(([level, source, rule]) => (
            <article key={level} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">{level} 级</span>
                <h3 className="font-semibold">{source}</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{rule}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          每条正式观测值还必须记录指标来源、链接、频率、更新时间、许可或使用限制。来源等级不能替代具体数据集链接。
        </p>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Data Pipeline</p>
        <h2 className="mt-3 text-2xl font-semibold">3. 统一数据管线</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          v0.30 将国家、指标、观测值和来源分离。页面基础宏观数据只从 observations 读取；指标定义和来源说明分别通过 indicators 与 sources 关联。
        </p>
        <ol className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Source", "记录来源、链接与可靠性"],
            ["Cleaning", "统一国家代码、年份、单位和状态"],
            ["Observation", "保存数值与可追溯来源"],
            ["Indicator", "应用指标口径与缺失规则"],
            ["Model", "仅在准入条件满足后启用"],
            ["Visualization", "只展示可追溯输入与明确边界"],
          ].map(([label, note], index) => (
            <li key={label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <p className="font-mono text-xs font-semibold text-[var(--accent)]">{index + 1}. {label}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{note}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          当前 models 目录只保留类型契约；不生成 ModelOutput、风险分数、预测、情景或国家排名。
        </p>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Boundary Data</p>
          <h2 className="mt-3 text-2xl font-semibold">4. 地图边界数据</h2>
          <dl className="mt-5 grid gap-2 text-sm">
            {[
              ["来源", topology.boundary_source_name],
              ["范围", `匈牙利 NUTS3，${topology.feature_count} / ${topology.expected_region_count}`],
              ["许可", license.license_checked ? "已核验并保留署名记录" : "待核验"],
              ["主键", manifest.region_id_final_matched ? "一对一匹配已记录" : "待核验"],
              ["权威拓扑", topology.authoritative_topology_checked ? "验收记录已完成" : "待核验"],
              ["公开展示", "未启用"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                <dt className="font-semibold text-[var(--muted)]">{label}</dt>
                <dd className="text-right font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">图层注册不等于图层启用；public_display_ready 与 is_ready_for_display 当前均为 false。</p>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Event Coding</p>
          <h2 className="mt-3 text-2xl font-semibold">5. 事件编码规则</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {eventFields.map((field) => <span key={field} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 font-mono text-xs text-[var(--muted)]">{field}</span>)}
          </div>
          <ul className="mt-5 grid gap-2 text-sm leading-6 text-[var(--muted)]">
            <li>新闻摘要先保留来源与状态，再进行 actor、event_type、direction、intensity 等编码。</li>
            <li>来源已核验不等于事件编码完成；未编码记录的 enters_model 必须为 false。</li>
            <li>结构样例、来源缺失或 D 级来源不进入正式事件库和模型。</li>
          </ul>
        </article>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Model Activation Gate</p>
        <h2 className="mt-3 text-2xl font-semibold">6. 模型启用条件</h2>
        <ol className="mt-5 grid list-decimal gap-3 pl-5 text-sm leading-7 text-[var(--muted)] md:grid-cols-2">
          {modelConditions.map((item) => <li key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3">{item}</li>)}
        </ol>
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
          当前没有 /models、/forecast 或 /scenario 页面，也不输出风险指数、中国经济暴露指数或选举预测。
        </p>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Known Limitations</p>
          <h2 className="mt-3 text-2xl font-semibold">7. 已知限制</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-[var(--muted)]">
            {knownLimitations.map((item) => <li key={item} className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">{item}</li>)}
          </ul>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Analysis Checklist</p>
          <h2 className="mt-3 text-2xl font-semibold">8. 进入后续分析的检查清单</h2>
          <ol className="mt-5 grid list-decimal gap-2 pl-5 text-sm leading-6 text-[var(--muted)]">
            {[
              "有明确国家或地区和时间。", "有数值、单位和数据状态。", "有来源名称、链接与可靠性等级。",
              "指标口径存在于字典。", "更新时间和缺失值处理明确。", "不属于结构样例或未核验政治样本。",
              "项目或事件具有足够来源证据。", "通过对应质量验收规则。",
            ].map((item) => <li key={item}>{item}</li>)}
          </ol>
        </article>
      </section>

      <details className="mt-6 card p-6">
        <summary className="cursor-pointer text-lg font-semibold">技术记录与 17 个逻辑数据层</summary>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          以下内容用于复核、导出和后续工程工作，默认折叠，不作为普通用户的首要阅读路径。
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {boundaryHistory.map(([stage, note]) => (
            <div key={stage} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <p className="font-mono text-xs font-semibold text-[var(--accent)]">{stage}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {researchDataLayerFiles.map((layer) => (
            <article key={layer.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
              <p className="font-mono text-xs font-semibold text-[var(--accent)]">{layer.label}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{layer.description}</p>
            </article>
          ))}
        </div>
      </details>
    </main>
  );
}
