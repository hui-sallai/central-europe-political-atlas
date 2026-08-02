import { dataStatusMeta, sourceStatusMeta } from "@/lib/dataStatusLabels";
import { researchDataLayerFiles } from "@/lib/countryMetadata";
import { frozenNavItems, frozenScopeNotes } from "@/lib/siteStructure";

const chinaExposureCandidatesLabel = "china_exposure_candidates（暴露变量候选库）";

const dataStatusItems = [
  { title: dataStatusMeta.official.label, body: "已接入可核验来源，页面可作为当前事实数据展示；仍必须保留年份、单位、来源链接和更新时间。" },
  { title: dataStatusMeta.manual.label, body: "由人工从公开材料整理，适合研究展示和后续复核；在完成来源复核前，不作为最终事实口径。" },
  { title: dataStatusMeta.pending.label, body: "字段或页面位置已经预留，但尚未接入可信来源；不能被读作已有数据。" },
  { title: dataStatusMeta.sample.label, body: "只用于验证页面结构、地图交互和表格样式；不代表事实，也不进入模型或分析计算。" },
  { title: "计算值", body: "由已接入原始数据按明确公式计算，例如贸易差额、汽车出口占比；必须保留公式、来源和备注。" },
  { title: "派生值", body: "由横向比较、五年变化、均值差距、排名变化等事实对照生成；不等于预测、评分或风险指数。" },
];

const sourceLevelItems = [
  { title: sourceStatusMeta.official.label, body: "政府、统计部门、央行、选举机构、Eurostat 等官方来源。优先用于正式数据。" },
  { title: sourceStatusMeta.manual.label, body: "人工整理自公开网页、报告或新闻材料。需要保留原始链接和复核记录。" },
  { title: sourceStatusMeta.pending.label, body: "来源机构、链接或具体表号尚未确认。页面只能显示为待接入或待核验。" },
  { title: sourceStatusMeta.sample.label, body: "结构样例所附来源，不作为真实来源，也不参与任何后续计算。" },
];

const reliabilityItems = [
  { level: "A 级", field: "reliability_level = A", title: "官方统计机构、央行、欧盟机构、国际组织", body: "可以作为正式数据或事件依据。" },
  { level: "B 级", field: "reliability_level = B", title: "主流通讯社、权威智库、官方年报", body: "可以作为正式数据或事件依据；数值型数据仍需注明口径，并优先与 A 级来源交叉核验。" },
  { level: "C 级", field: "reliability_level = C", title: "地方媒体、企业公告、行业网站", body: "只作补充线索，不单独支撑正式数据或事件结论。" },
  { level: "D 级", field: "reliability_level = D", title: "未核验二手来源、社交媒体、无明确出处内容", body: "不进入正式数据、事件库和模型计算。" },
];

const dataPriorityItems = [
  { group: "V4 历史序列", body: "优先补齐波兰、匈牙利、捷克、斯洛伐克 2021-2025 的 12 个扩展指标。" },
  { group: "字典层", body: "指标字典、来源字典和字段口径先行，保证后续 Python / R / Stata 可读取同一套数据结构。" },
  { group: "质量验收", body: "V4 四国 × 12 个指标 × 2021-2025 共 240 个观测位置逐项验收。" },
  { group: "项目核验", body: "对华项目优先补金额证据、主体核验、状态时间线、来源等级和可量化结论。" },
];

const projectVerificationItems = [
  { title: "可量化", rule: "有金额 + 有主体 + 有年份 + 有来源", body: "可作为项目级量化候选；进入正式分析前仍需复核金额口径、合同主体和时间口径。" },
  { title: "部分可量化", rule: "无金额但有明确事件和主体", body: "可作为事件型或结构型变量候选；金额、股比、产能、TEU、合同口径等字段缺失时不做金额型计算。" },
  { title: "仅作背景", rule: "只有新闻线索", body: "只用于背景说明或后续追踪，不作为正式数据点。" },
  { title: "不进入分析", rule: "无可靠来源", body: "来源缺失或可靠性为 D 级时，不进入正式数据、事件库和后续分析。" },
];

const projectFieldItems = [
  "项目表必须保留核验结论、核验理由和核验规则。",
  "金额字段必须同步写明金额状态、金额证据或金额缺失原因。",
  "主体字段必须写明中国主体、当地主体和主体核验说明。",
  "项目状态必须写明年份、项目状态和项目状态时间线。",
  "来源必须保留可点击来源链接和 A/B/C/D 来源等级。",
  `${chinaExposureCandidatesLabel}只记录暴露变量适配候选，不生成中国经济暴露指数。`,
];

const fieldRuleGroups = [
  {
    title: "观测值表",
    body: "记录国家或地区、指标、日期、频率、数值、单位、来源名称、来源链接、来源等级、状态、更新时间和备注。",
  },
  {
    title: "指标字典",
    body: "记录 indicator_id、中文名、英文名、类别、所属板块、单位、频率、覆盖范围、主来源、备用来源、原始值/计算值/派生值属性、比较资格、缺失值规则和更新时间。",
  },
  {
    title: "来源字典",
    body: "记录 source_id、来源中英文名、来源类型、覆盖范围、链接、可靠性等级、来源状态、更新频率，以及是否可作为正式数据、事件依据、补充线索或排除项。",
  },
  {
    title: "项目核验表",
    body: `记录项目名称、国家、地区、行业、中方主体、当地主体、金额、币种、年份、状态时间线、金额证据或缺失原因、主体核验、来源等级、核验结论和 ${chinaExposureCandidatesLabel} 说明。`,
  },
  {
    title: "派生比较表",
    body: "记录最高值、最低值、V4 均值、高于/低于均值、五年变化、均值差距和排名变化；只保存事实派生，不保存风险分数。",
  },
];

const derivedBoundaryItems = [
  "派生比较只服务于事实对照：最高值、最低值、均值、五年变化、均值差距和排名变化。",
  "派生比较不得写成风险判断，不输出财政压力指数、产业依赖指数、中国暴露指数或选举预测。",
  "派生值必须能追溯到原始观测值或计算值；原始值待接入时，对应派生项也必须标记为待接入或不可计算。",
];

const qualityRuleItems = [
  "V4 数据质量验收覆盖四国、12 个扩展指标、2021-2025 共 240 个观测位置。",
  "每个观测位置必须检查数值、单位、状态、来源名称、来源链接、来源等级、更新时间、缺失原因和备注。",
  "验收结果必须区分正式数据、待接入、计算值、人工整理，以及是否进入横向比较、五年变化、均值差距和排名变化。",
];

const dictionaryStructureItems = [
  "指标字典规定指标能否进入横向比较、五年变化、均值差距、排名变化和未来模型候选变量。",
  "来源字典规定来源的可靠性等级、使用范围和是否可进入正式数据或事件库。",
  "观测值、项目核验和派生比较必须引用字典层口径，不允许在展示层临时发明字段含义。",
];

const politicalFieldReviewItems = [
  "政府首脑、国家元首、执政结构、主要党派和党派缩写必须有明确来源后才能作为正式字段展示。",
  "未核验政治人物和党派关系只能显示为待核验或人工整理样本，不进入模型、比较或事件判断。",
  "首页和地图页不得裸露未解释的党派缩写；缩写说明应放在国家页政治样本区并标注数据状态。",
];

const boundarySourceVerificationItems = [
  "v0.10 已完成边界来源核验字段准备；v0.11 只增加匈牙利 NUTS3 边界文件离线沙盒，不启用真实地图展示。",
  "Eurostat GISCO NUTS 2024 作为第一批边界候选来源；region_sources 必须记录 license_status、license_url、usage_note 和 last_checked。",
  "region_boundaries 必须记录 NUTS version、admin_level、geometry_format、coordinate_system、file_selected、file_url、file_status、filter_status、display_status、geometry_available、topology_checked 和 region_code_match_status。",
  "regions 中匈牙利 NUTS3 只预留 20 个 region_id 与 NUTS code 匹配位置；未核验前 data_status 保持 pilot_pending_region_code_match。",
  "region_quality_checks 必须核验 source_available、license_checked、file_selected、file_downloaded、hungary_filtered、geometry_filtered、crs_confirmed、topology_checked、region_id_matched 和 ready_for_display。",
  "map_layers 中注册 hu_nuts3_boundary_pilot 不代表图层已启用；is_ready_for_display 在许可、几何、拓扑和主键匹配通过前必须保持 false。",
  "风险图层、预测图层、真实党派支持率图层继续未启用；不新增模型、预测、风险指数或中国经济暴露指数。",
];

const boundarySandboxItems = [
  "v0.11 锁定 NUTS_RG_01M_2024_4326_LEVL_3.geojson 作为匈牙利 NUTS3 沙盒候选文件。",
  "沙盒脚本只过滤 Hungary / HU / NUTS3 要素，并输出 hu_nuts3_gisco_2024.geojson 与对应 validation.json。",
  "validation.json 必须记录来源文件、国家、层级、坐标系、要素数、NUTS codes、几何状态、拓扑状态、主键匹配状态和展示资格。",
  "沙盒文件不等于真实地图展示；未通过许可、拓扑、主键匹配和质量验收前不得进入正式地图图层。",
  "20 / 20 代码预匹配只表示离线关联候选完整，不把 region_id_matched 或 ready_for_display 改为 true。",
  "v0.11 不新增第 18 张表，不生成风险、预测、党派支持率、中国经济暴露指数或区域评分。",
];

const boundarySandboxQaItems = [
  "v0.12 只验证匈牙利 NUTS3 沙盒文件并执行基础拓扑 QA，不启用真实地图展示。",
  "沙盒过滤完成不等于拓扑通过；基础 QA 只检查坐标范围、环闭合、退化环、自相交和区域间异常穿越，仍需权威拓扑验收。",
  "20 / 20 预匹配只表示 NUTS code 与 region_id 候选关系完整，不等于 region_id_matched=true。",
  "只有 source、license、file、CRS、geometry、topology、region_id 和质量验收全部通过后，才能讨论 is_ready_for_display。",
  "validation.json 必须保留预期要素数、实际要素数、NUTS code 数量、几何数量、CRS、拓扑状态、主键状态和展示资格。",
  "v0.12 不新增第 18 张表；风险图层、预测图层、真实党派支持率图层、中国经济暴露指数和区域评分继续未启用。",
];

const boundaryVisualQaItems = [
  "v0.13.1 只记录匈牙利 NUTS3 内部视觉 QA 结果，不启用正式真实地图展示。",
  "视觉 QA 通过不等于许可通过；license_checked=false 时，public_display_ready 必须保持 false。",
  "视觉 QA 通过不等于权威拓扑通过；基础重叠与破碎检查不能替代权威拓扑验收。",
  "视觉 QA 通过不等于正式地图展示启用；is_ready_for_display 必须继续保持 false。",
  "v0.13.1 不新增第 18 张表，不启用风险图层、预测图层、真实党派支持率图层、中国经济暴露指数或区域评分。",
];

const boundaryReadinessGateItems = [
  "视觉 QA 通过只是必要条件，不是正式地图展示的充分条件。",
  "license、authoritative topology、final region_id match 三项未通过前，不得启用正式地图。",
  "public_display_ready 与 is_ready_for_display 必须继续保持 false。",
  "readiness_gate_status=not_ready_for_public_display 时，真实边界展示不得启用。",
  "v0.14 只建立匈牙利 NUTS3 展示准入闸门，不新增第 18 张表，不生成风险、预测、党派支持率、中国经济暴露指数或区域评分。",
];

const boundaryLicenseTopologyEvidenceItems = [
  "许可记录与权威拓扑证据是正式真实地图展示前的必要条件。",
  "region_sources 与 region_boundaries 必须分别记录 license_source、license_url、attribution_required、attribution_text 和 license_checked。",
  "基础沙盒拓扑 QA 不能替代权威拓扑验收；必须记录 authoritative_topology_method、authoritative_topology_checked 和 topology_evidence_status。",
  "即使视觉 QA 已通过，只要 license_checked 或 authoritative_topology_checked 仍为 false，public_display_ready 和 is_ready_for_display 就必须继续为 false。",
  "最终 region_id / NUTS code 匹配未完成前，不得将边界文件注册为正式可展示图层。",
  "v0.15 不新增第 18 张表，不生成风险、预测、真实党派支持率、中国经济暴露指数或区域评分。",
];

const boundaryRegionIdMatchItems = [
  "v0.16.1 仅记录匈牙利 NUTS3 主键匹配准备摘要。初步无缺失、无重复，不等于最终主键匹配通过；正式展示仍需 license、authoritative topology、final region_id matching 全部通过。",
  "20 / 20 预匹配只表示候选记录数量与 NUTS code 数量一致，不等于最终主键匹配通过。",
  "最终核验必须检查缺失匹配、重复 region_id、重复 NUTS code、代码变体、命名变体和边界文件属性字段。",
  "unmatched_region_count、duplicate_region_id_count 和 duplicate_nuts_code_count 为 0 时，仍需保留 pending final review 状态，不能直接改为通过。",
  "regions、region_boundaries、region_quality_checks 与 map_layers 必须使用同一组主键匹配字段和证据状态。",
  "region_id_final_matched 未通过前，public_display_ready 和 is_ready_for_display 必须保持 false。",
  "v0.16.1 不新增第 18 张表，不生成风险、预测、真实党派支持率、中国经济暴露指数或区域评分。",
];

const excludedItems = [
  "结构样例、占位色阶、样例新闻不进入模型。",
  "待接入、缺失、未标来源链接的数据不进入模型。",
  "未核验党派关系、未量化项目样本、缺少来源链接的新闻摘要不进入模型。",
  `对华项目表当前只建立 ${chinaExposureCandidatesLabel}，不生成中国经济暴露指数。`,
  "当前平台暂不输出预测，不生成风险指数，也不提供政策、选举或国家关系预测。",
];

const analysisChecklist = [
  "有明确国家或地区。",
  "有明确年份、季度或月份。",
  "有数值。",
  "有单位。",
  "有来源名称。",
  "有来源链接。",
  "有来源等级。",
  "有数据状态。",
  "指标口径在指标字典中存在。",
  "来源口径在来源字典中存在。",
  "不属于结构样例。",
  "不属于未核验政治样本。",
  "不属于缺少来源的项目或事件。",
];

export default function MethodologyPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Methodology</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">方法论与数据边界</h1>
      <p className="mt-4 max-w-3xl leading-8 text-[var(--muted)]">
        本页说明平台如何区分真实数据、人工整理、待接入内容和结构样例。它不是完整研究方法章，而是防止误读的最小说明。
      </p>

      <section className="mt-8 card p-6">
        <p className="eyebrow">Current Scope</p>
        <h2 className="mt-3 text-2xl font-semibold">1. 当前页面结构</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {frozenNavItems.map((item) => (
            <article key={item.href} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.role}</p>
            </article>
          ))}
        </div>
        <div className="mt-5 grid gap-2">
          {frozenScopeNotes.map((note) => (
            <p key={note} className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted)]">
              {note}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <p className="eyebrow">Data Status</p>
          <h2 className="mt-3 text-2xl font-semibold">2. 数据状态</h2>
          <div className="mt-5 grid gap-3">
            {dataStatusItems.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <p className="eyebrow">Source Level</p>
          <h2 className="mt-3 text-2xl font-semibold">3. 来源等级</h2>
          <div className="mt-5 grid gap-3">
            {sourceLevelItems.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Reliability Level</p>
        <h2 className="mt-3 text-2xl font-semibold">4. 来源可靠性等级</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {reliabilityItems.map((item) => (
            <article key={item.level} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">{item.level}</span>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 font-mono text-[10px] text-[var(--muted)]">{item.field}</span>
                <h3 className="font-semibold">{item.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          使用规则：A/B 级可以作为正式数据或事件依据；C 级只作补充线索；D 级不进入正式数据、事件库和模型计算。
        </p>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Data Priority</p>
        <h2 className="mt-3 text-2xl font-semibold">5. 数据优先级：V4 历史序列、字典层、质量验收、项目核验优先</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          V4 国家，即波兰、匈牙利、捷克、斯洛伐克，已进入 2021-2025 历史序列、横向比较和数据质量验收阶段。当前优先顺序不是继续扩指标，而是让已有数据可核验、可导出、可复用。
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {dataPriorityItems.map((item) => (
            <article key={item.group} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <h3 className="font-semibold">{item.group}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Logical Data Layers</p>
        <h2 className="mt-3 text-2xl font-semibold">5.1 十七个逻辑数据层</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          当前先固化研究数据结构，并在数据页提供 JSON / CSV 导出入口；这些逻辑层不是模型页，也不代表预测功能已经启用。
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {researchDataLayerFiles.map((layer) => (
            <article key={layer.id} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <p className="font-mono text-xs font-semibold text-[var(--accent)]">{layer.label}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{layer.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Export Layer</p>
        <h2 className="mt-3 text-2xl font-semibold">5.2 数据导出与接口准备</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            "当前阶段：v0.16.1 Hungary region-id matching readiness summary；只记录匈牙利 NUTS3 主键匹配准备摘要，真实地图展示仍未启用。",
            "当前只做 CSV / JSON 数据结构准备。",
            "不提供预测 API。",
            "不提供模型 API。",
            "不输出风险指数。",
            "不输出中国经济暴露指数。",
          ].map((item) => (
            <p key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Regional Map Data</p>
        <h2 className="mt-3 text-2xl font-semibold">5.3 区域地图数据准备规则</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            "regions 是区域主键层；v0.12 在既有 V4 区域结构上只推进匈牙利 NUTS3 沙盒验证与拓扑 QA，非 V4 国家暂不进入第一批边界核验。",
            "region_boundaries 只登记边界来源、许可、格式、坐标系、几何状态和拓扑检查；未通过许可与质量验收前不显示真实地图边界。",
            "region_indicators 与国家级 indicators 分开管理；region_observations 必须保留年份、数值、单位、来源链接、来源等级和缺失原因。",
            "region_quality_checks 用于检查边界、许可、区域代码、数值、单位和来源状态；未通过项不得进入正式地图图层。",
            "project_locations 只把对华项目定位到城市、区域或国家层级；缺少可核验位置来源时不进入地图展示。",
            "map_layers 仅注册未来图层，is_ready_for_display=false 的图层不得作为真实图层展示；风险图层、预测图层和真实党派支持率图层均未启用，新闻区仍不做评价。",
            "v0.15 在既有 region_sources、region_boundaries、region_quality_checks 与 map_layers 中记录许可与权威拓扑证据；视觉 QA 结果只作为必要条件，不能单独启用展示。",
            "v0.16.1 在既有 region_quality_checks 说明区记录主键匹配准备摘要；初步 0 个缺失或重复不等于最终验收通过。",
          ].map((item) => (
            <p key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Boundary Source Verification</p>
        <h2 className="mt-3 text-2xl font-semibold">5.4 真实区域边界来源核验规则</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {boundarySourceVerificationItems.map((item) => (
            <p key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Boundary File Sandbox</p>
        <h2 className="mt-3 text-2xl font-semibold">5.5 v0.11 沙盒边界说明</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {boundarySandboxItems.map((item) => (
            <p key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Sandbox Validation And Topology QA</p>
        <h2 className="mt-3 text-2xl font-semibold">5.6 v0.12 沙盒验收规则</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {boundarySandboxQaItems.map((item) => (
            <p key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Boundary Visual QA Result Pass</p>
        <h2 className="mt-3 text-2xl font-semibold">5.7 v0.13.1 视觉 QA 结果记录规则</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {boundaryVisualQaItems.map((item) => (
            <p key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Hungary Boundary Readiness Gate</p>
        <h2 className="mt-3 text-2xl font-semibold">5.8 v0.14 展示准入闸门规则</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {boundaryReadinessGateItems.map((item) => (
            <p key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Hungary Boundary License And Authoritative Topology Evidence</p>
        <h2 className="mt-3 text-2xl font-semibold">5.9 v0.15 许可与权威拓扑证据规则</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {boundaryLicenseTopologyEvidenceItems.map((item) => (
            <p key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Hungary Region-ID Matching Readiness Summary</p>
        <h2 className="mt-3 text-2xl font-semibold">5.10 v0.16.1 主键匹配准备摘要规则</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {boundaryRegionIdMatchItems.map((item) => (
            <p key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">China Project Verification</p>
        <h2 className="mt-3 text-2xl font-semibold">6. 对华项目核验规则</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          V4 对华项目表当前定位为项目核验表和 {chinaExposureCandidatesLabel}。它不生成中国经济暴露指数，只记录项目是否具备后续量化所需字段。
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {projectVerificationItems.map((item) => (
            <article key={item.title} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">{item.rule}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-5 grid gap-2">
          {projectFieldItems.map((item) => (
            <p key={item} className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Field Rules</p>
          <h2 className="mt-3 text-2xl font-semibold">7. 字段口径</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-7 text-[var(--muted)]">
            {fieldRuleGroups.map((rule) => (
              <li key={rule.title} className="rounded-2xl bg-white/65 px-4 py-3">
                <span className="font-semibold text-[var(--ink)]">{rule.title}：</span>
                {rule.body}
              </li>
            ))}
          </ul>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Excluded From Model</p>
          <h2 className="mt-3 text-2xl font-semibold">8. 不进入模型的内容</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-7 text-[var(--muted)]">
            {excludedItems.map((item) => (
              <li key={item} className="rounded-2xl bg-white/65 px-4 py-3">{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Derived Metrics Boundary</p>
          <h2 className="mt-3 text-2xl font-semibold">9. 派生比较边界</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-7 text-[var(--muted)]">
            {derivedBoundaryItems.map((item) => (
              <li key={item} className="rounded-2xl bg-white/65 px-4 py-3">{item}</li>
            ))}
          </ul>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Quality Acceptance</p>
          <h2 className="mt-3 text-2xl font-semibold">10. 数据质量验收规则</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-7 text-[var(--muted)]">
            {qualityRuleItems.map((item) => (
              <li key={item} className="rounded-2xl bg-white/65 px-4 py-3">{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Dictionary Layer</p>
          <h2 className="mt-3 text-2xl font-semibold">11. 字典层结构</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-7 text-[var(--muted)]">
            {dictionaryStructureItems.map((item) => (
              <li key={item} className="rounded-2xl bg-white/65 px-4 py-3">{item}</li>
            ))}
          </ul>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Political Field Review</p>
          <h2 className="mt-3 text-2xl font-semibold">12. 政治人物字段复核规则</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-7 text-[var(--muted)]">
            {politicalFieldReviewItems.map((item) => (
              <li key={item} className="rounded-2xl bg-white/65 px-4 py-3">{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Analysis Checklist</p>
        <h2 className="mt-3 text-2xl font-semibold">13. 进入后续分析的检查清单</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          一个数据点只有同时满足以下条件，才可以进入后续分析：
        </p>
        <ol className="mt-5 grid list-decimal gap-3 pl-5 text-sm leading-7 text-[var(--muted)] md:grid-cols-2">
          {analysisChecklist.map((item) => (
            <li key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3">{item}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
