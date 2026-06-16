export default function MethodologyPage() {
  const statusItems = [
    {
      title: "官方数据",
      body: "来自政府、统计部门、选举机构或其他官方发布渠道。可以作为平台的事实数据基础，但仍需保留来源、年份和口径说明。",
    },
    {
      title: "人工整理",
      body: "由人工从公开资料中整理、翻译或归并。可以进入研究展示，但进入模型前必须完成来源复核和字段标准化。",
    },
    {
      title: "待接入",
      body: "页面或字段已经预留，但尚未接入可信来源。不能作为事实数据，也不能进入模型。",
    },
    {
      title: "结构样例",
      body: "仅用于验证页面结构、交互和展示方式，不代表真实事实，不进入模型。",
    },
  ];

  return (
    <main className="page-shell">
      <p className="eyebrow">Methodology</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">最小版方法论</h1>
      <p className="mt-4 max-w-3xl leading-8 text-[var(--muted)]">
        本页只说明当前平台如何区分数据状态、模型使用边界和后续补数顺序。它不是完整研究方法章，而是防止误读的基础说明。
      </p>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {statusItems.map((item) => (
          <article key={item.title} className="card p-6">
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <article className="card p-6">
          <p className="eyebrow">Model Boundary</p>
          <h2 className="mt-3 text-xl font-semibold">哪些数据可以进入模型</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            只有完成来源复核、字段标准化并标注时间口径的数据，才可以作为模型输入。官方数据优先；人工整理数据需先复核。
          </p>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Excluded Data</p>
          <h2 className="mt-3 text-xl font-semibold">哪些数据不能进入模型</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            待接入字段、结构样例、未核验党派关系、未量化项目样本和缺少来源链接的新闻摘要，当前都不能进入模型。
          </p>
        </article>

        <article className="card p-6">
          <p className="eyebrow">No Forecasts</p>
          <h2 className="mt-3 text-xl font-semibold">当前不输出预测</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            当前平台只做资料整理、地图展示和数据状态标注，暂不输出选举预测、政策走向预测或国家关系预测。
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
    </main>
  );
}
