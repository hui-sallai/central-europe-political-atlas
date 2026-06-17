import { dataStatusMeta, sourceStatusMeta } from "@/lib/dataStatusLabels";
import { frozenNavItems, frozenScopeNotes } from "@/lib/siteStructure";

const dataStatusItems = [
  { title: dataStatusMeta.official.label, body: "已接入可核验来源，页面可作为当前事实数据展示；仍必须保留年份、单位、来源链接和更新时间。" },
  { title: dataStatusMeta.manual.label, body: "由人工从公开材料整理，适合研究展示和后续复核；在完成来源复核前，不作为最终事实口径。" },
  { title: dataStatusMeta.pending.label, body: "字段或页面位置已经预留，但尚未接入可信来源；不能被读作已有数据。" },
  { title: dataStatusMeta.sample.label, body: "只用于验证页面结构、地图交互和表格样式；不代表事实，也不进入模型或分析计算。" },
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
  { group: "财政", indicators: ["财政赤字/GDP", "政府债务/GDP"] },
  { group: "外部", indicators: ["出口", "进口", "贸易差额", "经常账户/GDP"] },
  { group: "投资", indicators: ["FDI 流入"] },
  { group: "能源", indicators: ["能源进口依赖"] },
  { group: "产业", indicators: ["制造业占 GDP 比重", "汽车出口占比"] },
];

const fieldRules = [
  "每个正式数据点必须同时具备：年份、单位、来源名称、来源链接、来源状态。",
  "经济指标统一优先使用各国统计部门和 Eurostat 可核验表；金额类指标统一换算或显示为欧元口径。",
  "观测值表按国家、地区、指标、日期、频率、数值、单位、来源、状态、更新时间保存。",
  "党派、项目和新闻事件必须区分事实字段、人工整理字段和结构样例字段。",
  "来源可靠性必须写入 reliability_level 字段：A/B 级可以作为正式数据或事件依据；C 级只作补充线索；D 级不进入正式数据、事件库和模型计算。",
];

const excludedItems = [
  "结构样例、占位色阶、样例新闻不进入模型。",
  "待接入、缺失、未标来源链接的数据不进入模型。",
  "未核验党派关系、未量化项目样本、缺少来源链接的新闻摘要不进入模型。",
  "当前平台暂不输出预测，不生成风险指数，也不提供政策、选举或国家关系预测。",
];

const analysisChecklist = [
  "有明确国家或地区。",
  "有明确年份、季度或月份。",
  "有数值和单位。",
  "有来源名称。",
  "有来源链接。",
  "有数据状态。",
  "指标口径在指标字典中存在。",
  "不属于结构样例或未核验内容。",
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
        <h2 className="mt-3 text-2xl font-semibold">当前页面结构</h2>
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
          <h2 className="mt-3 text-2xl font-semibold">数据状态</h2>
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
          <h2 className="mt-3 text-2xl font-semibold">来源等级</h2>
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
        <h2 className="mt-3 text-2xl font-semibold">来源可靠性等级</h2>
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
        <h2 className="mt-3 text-2xl font-semibold">数据优先级：V4 第一批指标</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          第一阶段优先补齐 V4 国家，即波兰、匈牙利、捷克、斯洛伐克。以下指标优先使用 A 级来源，并要求每个数据点具备年份、单位、来源名称、来源链接和来源状态。
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {dataPriorityItems.map((item) => (
            <article key={item.group} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <h3 className="font-semibold">{item.group}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.indicators.map((indicator) => (
                  <span key={indicator} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">
                    {indicator}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Field Rules</p>
          <h2 className="mt-3 text-2xl font-semibold">字段口径</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-7 text-[var(--muted)]">
            {fieldRules.map((rule) => (
              <li key={rule} className="rounded-2xl bg-white/65 px-4 py-3">{rule}</li>
            ))}
          </ul>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Excluded From Model</p>
          <h2 className="mt-3 text-2xl font-semibold">不进入模型的内容</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-7 text-[var(--muted)]">
            {excludedItems.map((item) => (
              <li key={item} className="rounded-2xl bg-white/65 px-4 py-3">{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Analysis Checklist</p>
        <h2 className="mt-3 text-2xl font-semibold">进入后续分析的检查清单</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          一个数据点只有同时满足以下条件，才可以进入后续分析：
        </p>
        <ol className="mt-5 grid gap-3 text-sm leading-7 text-[var(--muted)] md:grid-cols-2">
          {analysisChecklist.map((item, index) => (
            <li key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3">
              <span className="mr-2 font-semibold text-[var(--foreground)]">{index + 1}.</span>
              {item}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
