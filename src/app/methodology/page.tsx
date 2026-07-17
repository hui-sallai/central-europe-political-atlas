import { dataStatusMeta, sourceStatusMeta } from "@/lib/dataStatusLabels";
import { researchDataLayerFiles } from "@/lib/countryMetadata";
import { frozenNavItems, frozenScopeNotes } from "@/lib/siteStructure";

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
  "暴露变量适配只作为候选库字段，不生成中国经济暴露指数。",
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
    body: "记录项目名称、国家、地区、行业、中方主体、当地主体、金额、币种、年份、状态时间线、金额证据或缺失原因、主体核验、来源等级、核验结论和暴露变量候选说明。",
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

const excludedItems = [
  "结构样例、占位色阶、样例新闻不进入模型。",
  "待接入、缺失、未标来源链接的数据不进入模型。",
  "未核验党派关系、未量化项目样本、缺少来源链接的新闻摘要不进入模型。",
  "对华项目表当前只建立暴露变量候选库，不生成中国经济暴露指数。",
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
        <h2 className="mt-3 text-2xl font-semibold">5.1 九个逻辑数据层</h2>
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
        <p className="eyebrow">China Project Verification</p>
        <h2 className="mt-3 text-2xl font-semibold">6. 对华项目核验规则</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          V4 对华项目表当前定位为项目核验表和暴露变量候选库。它不生成中国经济暴露指数，只记录项目是否具备后续量化所需字段。
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
