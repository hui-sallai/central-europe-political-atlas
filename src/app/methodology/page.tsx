import { platformStatus } from "@/lib/platformStatus";
import { ModelValidationStatus } from "@/components/ModelValidationStatus";
import { researchEvents, researchProjects } from "@/lib/researchData";
import { researchDataLayerFiles } from "@/lib/countryMetadata";
import { modelAvailabilitySummary, modelCards } from "@/lib/modelFramework";
import { chinaExposureModelCard } from "@/lib/chinaExposureModel";
import { industrialDependencyReadiness, scenarioBacktestRegistry, scenarioDefinitions, transmissionChannels } from "@/lib/scenarioFramework";
import { chinaProjectDisruptionDecision } from "@/lib/scenarioResearch";
import {
  hungaryAuthoritativeTopologyValidationDecisionSummary,
  hungaryGiscoLicenseVerificationDecisionSummary,
  hungaryNuts3ValidationManifestSummary,
} from "@/lib/regionQualityChecks";
import { publicDisplayGate, serbiaSpatialComparabilityPolicy } from "@/lib/spatialFoundation";
import { regionalObservationQa } from "@/lib/spatialDataV086";
import { sharedSpatialLicenseRecords, spatialV087Summary } from "@/lib/spatialDataV087";

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
  "十国已使用同一核心扩展与 transmission 数据结构；塞尔维亚财政、经常账户等位置及各国少量未发布年份仍明确标记为待接入。",
  "十国已进入统一区域主键与边界来源审计；除匈牙利既有 NUTS3 证据外，其余国家的具体几何、区域代码和区域统计仍待核验。",
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
  ["Direct Variable", "只调整明确对应的合法模型输入"],
  ["Model Recalculation", "沿用 v0.50 标准化边界与权重"],
  ["Regional Context", "区域事实只作结构背景，不生成分数"],
  ["Evidence", "事件和项目解释相关性，但不进入分数"],
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

      <ModelValidationStatus />

      <section className="mt-6 card p-6">
        <p className="eyebrow">Validation &amp; Reproducibility / v0.91</p>
        <h2 className="mt-3 text-2xl font-semibold">验证、稳定性与可复现性</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Determinism", "相同 observations、weights 与 formula version 必须复现相同 score、完整度、置信度和 drivers。"],
            ["Boundary & missing", "标准化限制在 0–100；null/undefined 保持缺失，绝不按 0 处理。"],
            ["Scenario isolation", "单一情景只调整声明的直接输入；区域、事件和项目证据不进入数值重算。"],
            ["Formula versioning", "Model Card、输出和情景记录分别保存 formula_version 与 weight_version；规则变化必须新建版本。"],
            ["Zero shock", "shock=0 必须满足 scenario=baseline、difference=0。越界值会明确截断并记录请求值。"],
            ["Confidence", "置信度由完整度、模型准入、直接覆盖、区域背景和证据质量组成，表示分析可靠性，不是概率。"],
            ["Golden cases", "匈牙利、波兰、德国和罗马尼亚保存固定模型与情景输出，用于识别意外公式漂移。"],
            ["Backtest limit", "现有历史值可能经过修订；没有 vintage data 时只做 directional validation，不报告 forecast accuracy。"],
          ].map(([label, note]) => <article key={label} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"><h3 className="font-semibold">{label}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p></article>)}
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">China Economic Exposure Model Card / v0.82 evidence parity</p>
        <h2 className="mt-3 text-2xl font-semibold">中国经济暴露模型的方法与边界</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted)]">{chinaExposureModelCard.purpose}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {chinaExposureModelCard.dimensions.map((dimension) => (
            <article key={dimension.id} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <h3 className="font-semibold">{dimension.name_zh}</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{dimension.variables.map((item) => `${item.variable_id}：${Math.round(item.weight * 100)}%${item.use === "context" ? "（背景）" : ""}`).join("；")}</p>
            </article>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <p className="rounded-2xl bg-[var(--surface-muted)] p-4 text-sm leading-6"><strong>总分门槛：</strong>{chinaExposureModelCard.overall_rule}</p>
          <p className="rounded-2xl bg-[var(--surface-muted)] p-4 text-sm leading-6"><strong>事件规则：</strong>{chinaExposureModelCard.event_policy}</p>
        </div>
        <ul className="mt-5 grid gap-2 text-sm leading-6 text-[var(--muted)] md:grid-cols-2">
          {chinaExposureModelCard.limitations.map((item) => <li key={item} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">{item}</li>)}
        </ul>
        <p className="mt-4 text-sm font-semibold leading-6">Project Database → Exposure Variables → Dimension Outputs → Overall decision。普通 FDI 不替代中国来源 FDI，背景项目不进入量化，事件 intensity 不直接加减分。</p>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">v0.82 China Exposure Evidence Parity</p>
        <h2 className="mt-3 text-2xl font-semibold">中国专项证据可比性规则</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["证据一致性", "十国分别审计 Project、Trade、Investment 和 Industrial；insufficient 或 unavailable 表示证据不足，不表示低暴露。"],
            ["贸易维度", "2021–2024 使用同一 UN Comtrade HS TOTAL 货物贸易口径。2024 继续用于当前分数，历史序列只解释趋势和稳定性。"],
            ["投资层级", "Tier 1 为 OECD/Eurostat 同口径存量；Tier 2 为央行 FDI/IIP；Tier 3 为其他官方资料。定义或分母不同时只记 partial，不硬进排名。"],
            ["Stock / Flow", "优先使用 China-origin inward FDI stock/position。年度 flow 可为负且波动大，只作背景，不与存量混用。"],
            ["项目覆盖", "项目库覆盖统一为 representative、partial、sparse、insufficient。没有项目记录时项目值为 null，不是 0。"],
            ["历史与当前", "announced、committed、under_construction、operational 属当前状态链；cancelled、completed、transferred 保留历史证据但不作为当前 active exposure。"],
            ["产业关联", "行业矩阵区分 active、historical、announced、cancelled、no verified evidence 与 insufficient coverage；国内产业结构不能单独代表中国暴露。"],
            ["防重复计算", "同一项目可解释项目与产业两个维度，但代表不同分析含义；同一项目金额不得在总体计算中重复加权。施工合同与中国来源 FDI 始终分开。"],
            ["事件边界", "事件只更新 project status、ownership、investment 或变量证据，再触发重算；event intensity 不直接加减分。"],
            ["Overall Gate", "至少三个核心维度达到 sufficient 且可比才计算国家总分；partial 不能凑门槛，v0.82 不降低该规则。"],
            ["Ranking Gate", "只有至少 7/10 国家拥有可比 overall score 时才显示跨国排名；否则只展示国家级证据与分维度状态。"],
            ["置信度", "同时考虑维度完整度、来源等级、年份对齐、项目库覆盖和定义可比性，不只按变量数量计算。"],
          ].map(([label, note]) => (
            <article key={label} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <h3 className="font-semibold">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
            </article>
          ))}
        </div>
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
          v0.50 的三个基础模型和 v0.70 产业依赖规则保持原口径；v0.76 只按质量、同年可比与模型准入结果重算可用性。每个输出仍保留 observation_id、来源、标准化值、权重和贡献。
        </p>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">v0.76 Data Parity QA &amp; Gap Closure</p>
        <h2 className="mt-3 text-2xl font-semibold">十国数据质量与可比性规则</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["核心扩展结构", "十国 × 12 指标 × 2021–2025，共 600 个观测位置"],
            ["Transmission 结构", "十国 × 4 指标 × 2023–2024，共 80 个观测位置"],
            ["来源原则", "Eurostat 与 UN Comtrade 等 A 级来源优先"],
            ["缺失规则", "未发布保持 pending；不适用和定义不一致单独记录，不写成 0"],
          ].map(([label, note]) => (
            <article key={label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <h3 className="font-semibold">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          指标进入跨国比较或既有模型须逐条通过单位、定义、来源链接、等级、状态、更新时间和计算追溯验收。排名与均值只使用 latest_common_year；定义不一致、待接入、不适用和 review_required 记录均排除。v0.76 不修改模型权重、情景公式或地图展示状态；德国自身的“对德国出口依赖”按不适用处理，不以零值替代。
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          计算值必须保存 numerator、denominator、source_dataset、source_query_url、calculation_formula 与 calculation_year。同比异常、符号反转、重复记录、单位冲突和不可能百分比只触发 review_required，不自动改写原始 observation。
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
        <p className="eyebrow">Scenario &amp; Transmission Methodology / v0.90</p>
        <h2 className="mt-3 text-2xl font-semibold">8. 情景与冲击传导方法</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {scenarioFlow.map(([label, note], index) => (
            <li key={label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <p className="font-mono text-xs font-semibold text-[var(--accent)]">{index + 1}. {label}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{note}</p>
            </li>
          ))}
        </ol>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
            <h3 className="font-semibold">Germany demand transmission</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">对德国出口依赖 = 对德国货物出口 / 对世界货物出口。德国需求降幅按公开的 adverse proportional 规则形成压力暴露增量，再重算产业依赖模型；不以总出口规模替代，也不估计 GDP 损失。</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
            <h3 className="font-semibold">Energy price transmission</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">工业电价使用 Eurostat 非居民 IC 档含税价格，两半年值简单平均。冲击参数按比例调整工业电价后重算产业模型；能源进口依赖不被当作能源价格。</p>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-white/65 p-4 md:col-span-2">
            <h3 className="font-semibold">v0.70 数据与标准化口径</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">UN Comtrade 与 Eurostat 为 A 级来源。汽车出口占比、对德出口依赖和年度电价属于有公开公式的计算值；模型仅接纳白名单计算值。FDI 流量因年度波动、负值和企业重组含义复杂，当前只作解释性输入，正式权重为 0。</p>
          </article>
        </div>

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
          <li className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">Direct shock 只改变原模型已有合法输入；contextual exposure 只描述结构背景。</li>
          <li className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">跨国比较只比较同一情景、同一参数和同一模型定义下的 score change。</li>
          <li className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">情景不输出发生概率、因果效应、综合未来风险或区域情景分数。</li>
        </ul>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Transmission schema", `${transmissionChannels.length} 条 direct/context channel；每条记录方向、模型、区域背景、证据和限制。`],
            ["Confidence decomposition", "结合基线完整度、模型准入、直接传导覆盖、区域背景覆盖和项目/事件证据质量；不是概率。"],
            ["China project disruption", `${chinaProjectDisruptionDecision.eligible_project_ids.length} 项可作中断背景，但缺少统一弹性与年度流量，score_enabled=false。`],
            ["Backtest registry", `${scenarioBacktestRegistry.length} 条结构记录；缺少按当时信息重建的历史模型输出时不报告准确率。`],
          ].map(([label, note]) => <article key={label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4"><h3 className="font-semibold">{label}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p></article>)}
        </div>

        <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">情景 ≠ 预测；暴露 ≠ 风险；相关 ≠ 因果；结构背景 ≠ 精确影响量。结果必须保留 baseline date、input values、shock parameter、model version、formula version 和 calculation timestamp。</p>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          <p className="font-semibold">Industrial Dependency Index：十国输入结构已统一</p>
          <p className="mt-2">{industrialDependencyReadiness.decision}</p>
          <p className="mt-2 text-xs">保留限制：{industrialDependencyReadiness.blockers.join("；")}</p>
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Regional Economic Depth &amp; Harmonization / v0.89</p>
        <h2 className="mt-3 text-2xl font-semibold">9. 区域空间数据方法</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted)]">
          区域事实层使用 Country → Region → Geometry → Regional Observation → Layer Gate → Public Display 的关联链。当前 {spatialV087Summary.country_count} 国共有 {spatialV087Summary.region_count} 个稳定区域主键和 {spatialV087Summary.factual_observation_count} 条区域事实；区域指标与国家级 observations 分表管理，缺失区域值不会由国家值代填。
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Region hierarchy", "按国家选择有分析意义且可读的 ADM/NUTS 层级，不机械统一为同一 NUTS level。"],
            ["Boundary source", "欧盟九国优先 GISCO NUTS 2024；波兰因 NUTS2 拆分马佐夫舍而保留 ADM1 几何，塞尔维亚采用 national_admin，不伪造 NUTS。"],
            ["Geometry QA", "检查要素数、重复与缺失代码、无效几何、CRS、MultiPolygon、重叠、缝隙和国界包含关系。"],
            ["Region matching", "region_id 必须与官方区域代码和单一 geometry feature 一对一对应。"],
            ["Shared GISCO licence", "同一 GISCO NUTS 2024 数据集只维护一条许可与署名记录，各国引用共享记录；逐国几何和图层 QA 仍独立。"],
            ["Country display decision", "每国记录 boundary、license、topology、region_id、attribution、approved layers、rejected layers、blockers 和 review date。"],
            ["Layer-level gate", "边界通过不表示所有统计层通过；人口、GDP、人均 GDP、就业率、失业率、制造业 GVA 比重和项目参考分别验收。"],
            ["Choropleth classification", "单国事实色阶使用国家内分位数或有文档的数值区间，不使用 low/medium/high risk。"],
            ["Latest common year", "跨国比较自动取全部所选国家都有同口径观测的最新年份；不得把不同年份放入同一排名。"],
            ["Comparable unit requirement", "跨国模式只允许相同区域层级、指标定义、单位和年份；不自动转换或下推不可比数据。"],
            ["Cross-country scale", "比较模式中的全部地图使用同一个分位数或等距尺度；单国模式允许国家内部尺度，并在页面明确标注。"],
            ["Factual ranking", "排名只描述同指标事实位置，不表示风险、预测、政策质量或因果效果。"],
            ["Missing data", "缺失值使用中性 no-data 状态，不以 0 或最低色阶代替。"],
            ["Project geolocation", "无精确坐标时只能使用 marker_type=regional_reference，并明示 location precision；公开工作台只显示 high / medium confidence。"],
            ["Project and regional context", "项目可与所在区域人口、GDP、人均 GDP、劳动力和制造业指标并列展示，但这种连接只是上下文，不构成项目影响的因果解释。"],
            ["Multi-location project", "一个 project_id 可以关联多个 project_location，并用 origin、destination、facility、corridor_node 或 administrative_reference 区分角色。"],
            ["Regional observation", "P0 为人口、GDP、人均 GDP；P1 为失业率、就业率、制造业 GVA 比重。只接入有年份、单位、来源链接、可靠性和状态的真实区域值。"],
            ["Spatial comparability", "比较必须使用可对应层级和一致定义；层级差异需显式记录。"],
            ["Model boundary", "本轮不生成区域风险、选举、党派、情景或 China Exposure 色阶。"],
          ].map(([label, note]) => (
            <article key={label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <h3 className="font-mono text-xs font-semibold text-[var(--accent)]">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/65 p-4 text-sm leading-6 text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">v0.89 Regional Economic Data Harmonization</p>
          <p className="mt-2">区域观测值按 region_id、indicator、year 唯一；检查重复、国家错配、异常值、单位与来源。当前事实值 {regionalObservationQa.factual_observation_count} 条，明确待接入 {regionalObservationQa.pending_observation_count} 个位置。异常只标记 review_required，不自动修正。</p>
          <p className="mt-2">跨国比较必须锁定同一区域层级、指标定义、单位和 latest common year；区域值不得由国家值下推，计算值必须保留分子、分母、来源代码和公式。</p>
          <p className="mt-2">当前共有 {spatialV087Summary.public_boundary_country_count} 国通过事实边界准入、{spatialV087Summary.public_layer_count} 个国家-图层通过独立展示闸门。通过只表示事实地图资格，不代表模型、风险或政策判断。</p>
          <p className="mt-2">区域失业率采用 Eurostat LFS 年度总人口口径（15–74 岁，%）；就业率采用 20–64 岁总人口口径（%）。两者只在当前展示层级可直接匹配时接入，不把 NUTS2 值复制到 NUTS3。</p>
          <p className="mt-2">制造业指标固定为同区域、同年份 NACE C 制造业 GVA / TOTAL GVA × 100，不与制造业就业占比混用。人口与人均 GDP 变化使用 (2024 / 2021 - 1) × 100，失业率变化使用 2024 值 - 2021 值（百分点）。</p>
          <p className="mt-2">正式排名要求同层级、同定义、同单位和同一比较年；国家内均值及同层级样本均值仅作描述性基准。不同 NUTS / ADM 层级不进入同一正式排名。</p>
          <p className="mt-2">边界连续性记录表示 2021–2024 观测映射到当前 NUTS 2024 / 现行 ADM 区域代码，并不等于已完成历史边界变更的权威证明。塞尔维亚继续使用 national_admin 待核验状态，不虚构 NUTS 分类。</p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
            <h3 className="font-semibold">Public Display Gate</h3>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">六项必须同时通过，页面不得手动跳过。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {publicDisplayGate.map((item) => <code key={item} className="rounded-full bg-white px-3 py-1 text-xs">{item}</code>)}
            </div>
          </article>
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
            <h3 className="font-semibold">Serbia spatial comparability policy</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{serbiaSpatialComparabilityPolicy.correspondence_to_eu_scale}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{serbiaSpatialComparabilityPolicy.comparability_limitation}</p>
          </article>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {sharedSpatialLicenseRecords.map((record) => <article key={record.license_record_id} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4"><p className="font-mono text-xs font-semibold text-[var(--accent)]">{record.license_record_id}</p><p className="mt-2 text-sm font-semibold">{record.provider}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{record.usage_terms}</p><p className="mt-2 text-xs leading-5">{record.attribution}</p></article>)}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Known Limitations</p>
          <h2 className="mt-3 text-2xl font-semibold">10. 已知限制</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-[var(--muted)]">
            {knownLimitations.map((item) => <li key={item} className="rounded-xl bg-[var(--surface-muted)] px-4 py-3">{item}</li>)}
          </ul>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Analysis Checklist</p>
          <h2 className="mt-3 text-2xl font-semibold">11. 进入后续分析的检查清单</h2>
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
