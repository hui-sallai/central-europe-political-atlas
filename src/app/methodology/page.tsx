import { dataTableSchemas } from "@/lib/dataSchema";
import { frozenNavItems, frozenScopeNotes } from "@/lib/siteStructure";

export default function MethodologyPage() {
  const statusItems = [
    {
      title: "官方数据",
      body: "来自政府、统计部门、选举机构或其他官方发布渠道。可以作为平台的事实数据基础，但仍需保留来源、年份和口径说明。",
    },
    {
      title: "人工整理",
      body: "由人工从公开资料中整理、翻译或归并。可以进入研究展示，但进入分析计算前必须完成来源复核和字段标准化。",
    },
    {
      title: "待接入",
      body: "页面或字段已经预留，但尚未接入可信来源。不能作为事实数据，也不能进入分析计算。",
    },
    {
      title: "结构样例",
      body: "仅用于验证页面结构、交互和展示方式，不代表真实事实，不进入分析计算。",
    },
  ];

  return (
    <main className="page-shell">
      <p className="eyebrow">Methodology</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">最小版方法论</h1>
      <p className="mt-4 max-w-3xl leading-8 text-[var(--muted)]">
        本页只说明当前平台如何区分数据状态、分析使用边界和后续补数顺序。它不是完整研究方法章，而是防止误读的基础说明。
      </p>

      <section className="mt-8 card p-6">
        <p className="eyebrow">Frozen Structure</p>
        <h2 className="mt-3 text-2xl font-semibold">短期冻结页面结构</h2>
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
        {statusItems.map((item) => (
          <article key={item.title} className="card p-6">
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <article className="card p-6">
          <p className="eyebrow">Analysis Boundary</p>
          <h2 className="mt-3 text-xl font-semibold">哪些数据可以进入后续分析</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            只有完成来源复核、字段标准化并标注时间口径的数据，才可以进入后续分析计算。官方数据优先；人工整理数据需先复核。
          </p>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Excluded Data</p>
          <h2 className="mt-3 text-xl font-semibold">哪些数据不能进入分析计算</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            待接入字段、结构样例、未核验党派关系、未量化项目样本和缺少来源链接的新闻摘要，当前都不能进入分析计算。
          </p>
        </article>

        <article className="card p-6">
          <p className="eyebrow">No Forecasts</p>
          <h2 className="mt-3 text-xl font-semibold">当前不输出预测</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            当前平台只做资料整理、地图展示和数据状态标注，暂不输出选举预测、政策走向预测、国家关系预测，也不做风险指数。
          </p>
        </article>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Next Data Priorities</p>
        <h2 className="mt-3 text-xl font-semibold">后续补数顺序</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          后续将按 V4 国家优先补充财政、外部、能源、产业和对华经贸数据；完成 V4 口径后，再向其余国家扩展。
        </p>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Data Contract</p>
        <h2 className="mt-3 text-2xl font-semibold">数据应该长什么样</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          后续补数据必须先落到以下六张表。页面展示、来源核验和后续分析计算都从这些表读取，避免临时字段和样例内容混入正式数据。
        </p>

        <div className="mt-6 grid gap-4">
          {dataTableSchemas.map((table) => (
            <article key={table.id} className="rounded-2xl border border-[var(--line)] bg-white/65 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{table.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{table.purpose}</p>
                </div>
                <span className="w-fit rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)]">
                  {table.usedBy}
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      <th className="border-b border-[var(--line)] py-3 pr-4 font-semibold">字段</th>
                      <th className="border-b border-[var(--line)] px-4 py-3 font-semibold">中文名</th>
                      <th className="border-b border-[var(--line)] px-4 py-3 font-semibold">英文名</th>
                      <th className="border-b border-[var(--line)] px-4 py-3 font-semibold">要求</th>
                      <th className="border-b border-[var(--line)] px-4 py-3 font-semibold">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.fields.map((field) => (
                      <tr key={field.key}>
                        <td className="border-b border-[var(--line)] py-3 pr-4 font-mono text-xs">{field.key}</td>
                        <td className="border-b border-[var(--line)] px-4 py-3 font-semibold">{field.labelZh}</td>
                        <td className="border-b border-[var(--line)] px-4 py-3 text-[var(--muted)]">{field.labelEn}</td>
                        <td className="border-b border-[var(--line)] px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${field.required ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                            {field.required ? "必填" : "可选"}
                          </span>
                        </td>
                        <td className="border-b border-[var(--line)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">{field.note ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
