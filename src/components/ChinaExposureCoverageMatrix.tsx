import type { ChinaExposureCoverageAuditRecord } from "@/types/ChinaExposure";

const dimensionLabels = { project: "Project", trade: "Trade", investment: "Investment", industrial: "Industrial" } as const;
const statusLabels = { sufficient: "sufficient", partial: "partial", insufficient: "insufficient", unavailable: "unavailable" } as const;
const statusClasses = {
  sufficient: "border-emerald-200 bg-emerald-50 text-emerald-800",
  partial: "border-sky-200 bg-sky-50 text-sky-800",
  insufficient: "border-amber-200 bg-amber-50 text-amber-900",
  unavailable: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

export function ChinaExposureCoverageMatrix({ records }: { records: ChinaExposureCoverageAuditRecord[] }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const countries = [...new Map(records.map((record) => [record.country_slug, record.country])).entries()];
  return (
    <section className="mt-6 card p-6">
      <p className="eyebrow">China Exposure Data Coverage / v0.81</p>
      <h2 className="mt-3 text-2xl font-semibold">十国四维数据覆盖审计</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted)]">
        本表只表示数据 readiness，不是中国风险、政治影响或国家排名。Investment 的五国 OECD 存量证据因十国覆盖不齐仍不进入分数；项目空白不解释为零暴露。
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[920px] w-full border-collapse text-left text-sm">
          <thead><tr>{["国家", ...Object.values(dimensionLabels), "主要缺口 / 说明"].map((header) => <th key={header} className="border-b border-[var(--line)] px-3 py-3 font-semibold first:pl-0">{header}</th>)}</tr></thead>
          <tbody>
            {countries.map(([slug, country]) => {
              const rows = records.filter((record) => record.country_slug === slug);
              const gaps = rows.flatMap((record) => record.missing_variables.map((item) => `${dimensionLabels[record.dimension]}: ${item}`));
              return <tr key={slug} className="align-top">
                <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{country}</td>
                {(Object.keys(dimensionLabels) as Array<keyof typeof dimensionLabels>).map((dimension) => {
                  const record = rows.find((item) => item.dimension === dimension);
                  if (!record) return <td key={dimension} className="border-b border-[var(--line)] px-3 py-3">—</td>;
                  return <td key={dimension} className="border-b border-[var(--line)] px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClasses[record.status]}`}>{statusLabels[record.status]}</span>
                    <p className="mt-1 text-[10px] text-[var(--muted)]">完整度 {record.data_completeness}%</p>
                  </td>;
                })}
                <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{gaps.slice(0, 3).join("；") || "当前变量完整"}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <details className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
        <summary className="cursor-pointer font-semibold">状态边界与来源回链</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {records.map((record) => <article key={`${record.country_slug}-${record.dimension}`} className="rounded-xl bg-white/80 p-3 text-xs leading-5">
            <strong>{record.country} / {dimensionLabels[record.dimension]}</strong>
            <p className="mt-1 text-[var(--muted)]">{record.coverage_note}</p>
            <p className="mt-1 text-[var(--muted)]">来源等级：{record.source_reliability.join(" / ") || "无"}；QA：{record.qa_status}</p>
          </article>)}
        </div>
      </details>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        {[
          ["覆盖审计 JSON", "china_exposure_coverage_audit.json"],
          ["贸易 QA JSON", "china_trade_qa.json"],
          ["项目覆盖 QA JSON", "china_project_coverage_audit.json"],
        ].map(([label, file]) => (
          <a key={file} href={`${basePath}/research-data/${file}`} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[var(--accent)] hover:border-[var(--accent)]">{label}</a>
        ))}
      </div>
    </section>
  );
}
