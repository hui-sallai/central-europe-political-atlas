import { countryParitySummaries, parityQaSummary } from "@/lib/dataParityQa";

function percentage(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function CrossCountryParitySummary() {
  return (
    <section className="mt-5 card p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">v0.76 Data Parity QA &amp; Gap Closure</p>
          <h2 className="mt-3 text-2xl font-semibold">十国数据覆盖与质量收口</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            覆盖率从 canonical observations 自动计算，并区分正式可比值、待接入、不适用、定义不一致与需复核记录。
            跨国比较只采用相同年份、同口径且质量通过的数据；缺失值不插补。
          </p>
        </div>
        <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold text-[var(--muted)]">
          {parityQaSummary.matrixRows} 个国家 × 指标 QA 行
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["适用观测位置", String(parityQaSummary.applicableCells)],
          ["完整可比值", String(parityQaSummary.completeCells)],
          ["待接入位置", String(parityQaSummary.pendingCells)],
          ["需复核 / 部分可比", String(parityQaSummary.reviewRequiredRows)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.11em] text-[var(--muted)]">
              {[
                "国家",
                "Applicable",
                "Complete",
                "Partial",
                "Pending",
                "Coverage",
                "Model Ready",
                "Priority Gaps",
              ].map((header) => (
                <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {countryParitySummaries.map((row) => (
              <tr key={row.countrySlug} className="align-top">
                <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{row.countryName}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{row.applicable}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{row.complete}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{row.partial}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{row.pending}</td>
                <td className="border-b border-[var(--line)] px-3 py-3 font-semibold text-[var(--accent)]">{percentage(row.coverageRatio)}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{row.modelReady}</td>
                <td className="max-w-[360px] border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">
                  {row.priorityGaps.length > 0 ? row.priorityGaps.join("；") : "无高优先级缺口"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="mt-5 rounded-2xl border border-[var(--line)] bg-white/55 p-4">
        <summary className="cursor-pointer text-sm font-semibold">Priority Gaps 口径</summary>
        <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
          每国只显示最多五项：定义不一致和异常复核优先，其次是 2021–2024 的实际缺口，最后才是尚未发布的 2025 值。
          完整逐国逐指标矩阵保留在 canonical QA 数据中，不在前台铺开。
        </p>
      </details>
    </section>
  );
}
