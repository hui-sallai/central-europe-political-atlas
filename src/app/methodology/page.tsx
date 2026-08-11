import { platformStatus } from "@/lib/platformStatus";
import { researchEvents, researchProjects } from "@/lib/researchData";
import { researchDataLayerFiles } from "@/lib/countryMetadata";
import { modelAvailabilitySummary, modelCards } from "@/lib/modelFramework";
import { industrialDependencyReadiness, scenarioDefinitions } from "@/lib/scenarioFramework";
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
  "event_id", "date", "country", "region_code", "actor", "event_type", "direction",
  "intensity", "affected_indicator", "affected_model", "duration", "confidence", "source_status", "enters_model",
  "related_project_ids",
] as const;

const eventTypes = ["fiscal", "EU_funds", "macro", "energy", "industrial_policy", "FDI", "China", "election", "regional"] as const;

const eventCodingFlow = [
  ["Source", "核验来源与链接"],
  ["Event", "提取可识别政策或经济事件"],
  ["Coding", "记录主体、类型、方向、强度与置信度"],
  ["Affected Indicator", "关联现有 indicator_id"],
  ["Future Model Input", "只登记候选关系，不生成分数"],
] as const;

const projectDatabaseFlow = [
  ["Project Database", "核验项目、主体、地点、金额状态与来源"],
  ["Exposure Variables", "登记投资、贸易、供应链、物流、金融等候选关系"],
  ["Future China Exposure Index", "仅保留未来方法接口；当前不生成指数或排名"],
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
  "事件库优先完成 V4 样本；非 V4 事件、低置信度记录和结构样例仍待接入或待编码。",
  "政治样本与党派色阶不是正式民调，不进入模型。",
  "居民经济压力模型暂未纳入实际工资与居民能源成本；财政压力模型暂未纳入融资成本与欧盟资金。",
] as const;

const transparentModelFlow = [
  ["Observation", "只读取状态合格且可追溯的观测值"],
  ["Standardization", "按 Model Card 固定边界转换到 0–100"],
  ["Weighting", "应用集中维护的公开权重"],
  ["Model Score", "完整输入满足门槛时才输出"],
  ["Drivers", "按加权贡献解释主要驱动"],
  ["Confidence", "结合数据完整度与模型范围说明置信度"],
] as const;

const scenarioFlow = [
  ["Baseline", "读取既有模型输出与合格 observation"],
  ["Shock Assumption", "记录用户设定的条件式冲击"],
  ["Adjusted Variable", "只调整明确对应的模型输入"],
  ["Model Recalculation", "沿用 v0.50 标准化边界与权重"],
  ["Scenario Difference", "同时显示基线、情景与差值"],
  ["Interpretation", "说明传导链、置信度与不能说明什么"],
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
  const codedEventCount = researchEvents.filter((event) => event.coding_status === "coded" && event.data_status === "verified").length;

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
          v0.50 已启用三个透明规则模型；每个输出均保留 observation_id、来源、标准化值、权重和贡献。v0.60 在其上增加独立情景层，但仍不生成预测、选举结论或地图风险图层。
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
          <h2 className="mt-3 text-2xl font-semibold">5. Event Coding Methodology</h2>
          <ol className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {eventCodingFlow.map(([label, note], index) => (
              <li key={label} className="rounded-xl border border-[var(--line)] bg-white/65 p-3">
                <p className="font-mono text-[10px] font-semibold text-[var(--accent)]">{index + 1}. {label}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{note}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">当前已完成 {codedEventCount} 条 V4 正式事件编码；全部保持 enters_model=false。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {eventTypes.map((eventType) => <span key={eventType} className="rounded-full border border-[var(--line)] bg-white px-3 py-1 font-mono text-xs text-[var(--muted)]">{eventType}</span>)}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {eventFields.map((field) => <span key={field} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 font-mono text-xs text-[var(--muted)]">{field}</span>)}
          </div>
          <ul className="mt-5 grid gap-2 text-sm leading-6 text-[var(--muted)]">
            <li>新闻摘要先保留来源与状态，再进行 actor、event_type、direction、intensity 等编码。</li>
            <li>来源已核验不等于事件编码完成；未编码记录的 enters_model 必须为 false。</li>
            <li>direction 与 intensity 是结构化研究变量，不是事实预测或政策评价。</li>
            <li>结构样例、低置信度、来源缺失或 D 级来源不进入正式事件库和模型。</li>
          </ul>
        </article>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">China Project Methodology</p>
        <h2 className="mt-3 text-2xl font-semibold">6. China Project Database 与关联边界</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {projectDatabaseFlow.map(([label, note], index) => (
            <article key={label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <p className="font-mono text-xs font-semibold text-[var(--accent)]">{index + 1}. {label}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          当前项目库保留 {researchProjects.length} 项记录，并采用“可量化 / 部分可量化 / 仅作背景 / 不进入分析”四类核验结论。Event → Project → Indicator 只表示可追溯研究关系，不自动生成政治风险判断。
        </p>
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
          当前阶段不生成 China Exposure Index；缺失金额、主体、时间或可靠来源的字段保持缺失，不以零值或推测值补齐。
        </p>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Transparent Model Methodology</p>
        <h2 className="mt-3 text-2xl font-semibold">7. 透明模型方法与启用条件</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {transparentModelFlow.map(([label, note], index) => (
            <li key={label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <p className="font-mono text-xs font-semibold text-[var(--accent)]">{index + 1}. {label}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{note}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modelCards.map((card) => {
            const availability = modelAvailabilitySummary.find((item) => item.model_id === card.model_id);
            return (
              <article key={card.model_id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
                <h3 className="font-semibold">{card.name_zh}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.weight_note}</p>
                <p className="mt-3 text-xs text-[var(--muted)]">可计算 {availability?.sufficient ?? 0} 国；部分可计算 {availability?.partial ?? 0} 国；不可计算 {availability?.insufficient ?? 0} 国。</p>
              </article>
            );
          })}
        </div>
        <ol className="mt-5 grid list-decimal gap-3 pl-5 text-sm leading-7 text-[var(--muted)] md:grid-cols-2">
          {modelConditions.map((item) => <li key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3">{item}</li>)}
        </ol>
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
          /models 只展示可追溯的规则分数和 Model Card；/scenarios 只展示条件式冲击比较。二者都不是客观风险真值或预测；/forecast 仍不存在，也不输出 China Exposure Index 或选举预测。
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">每张 Model Card 必须记录 model_version、effective_date 和权重变更说明；任何权重或标准化边界变化都需要生成新版本，不能静默覆盖历史口径。</p>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Scenario Methodology</p>
        <h2 className="mt-3 text-2xl font-semibold">8. 情景模拟方法与边界</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {scenarioFlow.map(([label, note], index) => (
            <li key={label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <p className="font-mono text-xs font-semibold text-[var(--accent)]">{index + 1}. {label}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{note}</p>
            </li>
          ))}
        </ol>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {scenarioDefinitions.map((scenario) => (
            <article key={scenario.scenario_id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{scenario.name_zh}</h3>
                  <p className="mt-1 font-mono text-xs text-[var(--muted)]">{scenario.scenario_id}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scenario.calculation_status === "available" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                  {scenario.calculation_status === "available" ? "可直接重算" : "当前不可计算"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{scenario.description}</p>
              <p className="mt-3 font-mono text-xs leading-5 text-[var(--muted)]">关联：{scenario.affected_indicators.join(" / ")}</p>
              {scenario.unavailable_reason ? <p className="mt-3 text-xs font-semibold leading-5 text-amber-900">{scenario.unavailable_reason}</p> : null}
            </article>
          ))}
        </div>

        <ul className="mt-5 grid gap-2 text-sm leading-6 text-[var(--muted)] md:grid-cols-2">
          <li className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">Scenario 是“如果……那么……”条件分析，不表示发生概率、未来年份或事实预测。</li>
          <li className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">冲击参数不写回 observations；每个结果必须保留基线 observation_id、模型权重和计算规则。</li>
          <li className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">没有直接模型输入时返回 unavailable，不以相关但不同口径的指标代替。</li>
          <li className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">已核验事件只作历史背景，intensity 不进入情景加减分。</li>
        </ul>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p className="font-semibold">Industrial Dependency Index：未启用</p>
          <p className="mt-2">{industrialDependencyReadiness.decision}</p>
          <p className="mt-2 text-xs">主要缺口：{industrialDependencyReadiness.blockers.join("；")}</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Known Limitations</p>
          <h2 className="mt-3 text-2xl font-semibold">9. 已知限制</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-[var(--muted)]">
            {knownLimitations.map((item) => <li key={item} className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">{item}</li>)}
          </ul>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Analysis Checklist</p>
          <h2 className="mt-3 text-2xl font-semibold">10. 进入后续分析的检查清单</h2>
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
