import type {
  ChinaEvidenceCoverageMatrixRecord,
  ChinaExposureCoverageAuditRecord,
  ChinaSectorLinkageRecord,
  ChinaTradeHistoricalRecord,
} from "@/types/ChinaExposure";

const dimensionKeys = ["project", "trade", "investment", "industrial"] as const;
const dimensionLabels = { project: "Project", trade: "Trade", investment: "Investment", industrial: "Industrial" } as const;
const statusClasses = {
  sufficient: "border-emerald-200 bg-emerald-50 text-emerald-800",
  partial: "border-sky-200 bg-sky-50 text-sky-800",
  insufficient: "border-amber-200 bg-amber-50 text-amber-900",
  unavailable: "border-slate-200 bg-slate-50 text-slate-600",
  not_applicable: "border-stone-200 bg-stone-50 text-stone-600",
} as const;

type RankingGate = {
  required_comparable_country_count: number;
  available_overall_country_count: number;
  ranking_enabled: boolean;
  status: string;
  rule: string;
};

export function ChinaExposureCoverageMatrix({
  matrix,
  audit,
  history,
  sectors,
  rankingGate,
}: {
  matrix: ChinaEvidenceCoverageMatrixRecord[];
  audit: ChinaExposureCoverageAuditRecord[];
  history: ChinaTradeHistoricalRecord[];
  sectors: ChinaSectorLinkageRecord[];
  rankingGate: RankingGate;
}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <section className="mt-6 card p-6">
      <p className="eyebrow">China Evidence Coverage / v0.82</p>
      <h2 className="mt-3 text-2xl font-semibold">十国中国专项证据覆盖矩阵</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted)]">
        覆盖不足不等于低暴露。矩阵分别显示项目、贸易、投资和产业证据；项目空白保持未知，投资口径不同只记为 partial，不进入跨国排名。
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
          <thead><tr>{["国家", ...Object.values(dimensionLabels), "Sufficient", "Partial", "Unavailable", "项目库覆盖", "优先缺口"].map((header) => <th key={header} className="border-b border-[var(--line)] px-3 py-3 font-semibold first:pl-0">{header}</th>)}</tr></thead>
          <tbody>{matrix.map((record) => <tr key={record.country_slug} className="align-top">
            <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{record.country}</td>
            {dimensionKeys.map((dimension) => <td key={dimension} className="border-b border-[var(--line)] px-3 py-3">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClasses[record[dimension]]}`}>{record[dimension]}</span>
            </td>)}
            <td className="border-b border-[var(--line)] px-3 py-3 text-center font-semibold">{record.sufficient_dimensions}</td>
            <td className="border-b border-[var(--line)] px-3 py-3 text-center">{record.partial_dimensions}</td>
            <td className="border-b border-[var(--line)] px-3 py-3 text-center">{record.unavailable_dimensions}</td>
            <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5">{record.project_database_coverage}<br/><span className="text-[var(--muted)]">{record.reliable_project_count} / {record.recorded_project_count} 条 A/B</span></td>
            <td className="border-b border-[var(--line)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">{record.priority_gaps.slice(0, 3).join("；") || "当前变量完整"}</td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
          <p className="text-xs text-[var(--muted)]">贸易历史序列</p><p className="mt-2 text-xl font-semibold">{history.filter((item) => item.qa_status === "passed").length} / 40</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">十国 2021–2024；当前分数公式仍只读取 2024。</p>
        </article>
        <article className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
          <p className="text-xs text-[var(--muted)]">行业关联记录</p><p className="mt-2 text-xl font-semibold">{sectors.filter((item) => item.status === "verified_active").length} 个 active 单元</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Battery、Automotive、Electronics、Logistics、Infrastructure、Energy 分开记录。</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <p className="text-xs">跨国排名闸门</p><p className="mt-2 text-xl font-semibold">{rankingGate.available_overall_country_count} / {rankingGate.required_comparable_country_count}</p><p className="mt-2 text-xs leading-5">{rankingGate.ranking_enabled ? "可显示排名" : "未达到门槛，不显示不完整排名"}</p>
        </article>
      </div>

      <details className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
        <summary className="cursor-pointer font-semibold">查看 variables / projects / sources / gaps</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {matrix.map((record) => {
            const rows = audit.filter((item) => item.country_slug === record.country_slug);
            const countrySectors = sectors.filter((item) => item.country_slug === record.country_slug && item.status !== "no_verified_evidence");
            return <article key={record.country_slug} className="rounded-xl bg-white/80 p-4 text-xs leading-5">
              <strong>{record.country}</strong>
              <p className="mt-1 text-[var(--muted)]">Trade latest year: {record.trade_latest_year ?? "unavailable"}；FDI Tier: {record.china_fdi_source_tier ?? "未建立"}；FDI 可比性：{record.china_fdi_comparison_status}</p>
              <p className="mt-1 text-[var(--muted)]">可用变量：{rows.flatMap((item) => item.available_variables).join(" / ") || "无"}</p>
              <p className="mt-1 text-[var(--muted)]">项目：{[...new Set(rows.flatMap((item) => item.related_project_ids))].join(" / ") || "未形成可核验项目关联"}</p>
              <p className="mt-1 text-[var(--muted)]">行业证据：{countrySectors.map((item) => `${item.sector}:${item.status}`).join(" / ") || "覆盖不足"}</p>
              <div className="mt-2 flex flex-wrap gap-2">{[...new Set(rows.flatMap((item) => item.source_urls))].map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">来源 {index + 1}</a>)}</div>
            </article>;
          })}
        </div>
      </details>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        {[
          ["Evidence Matrix JSON", "china_evidence_coverage_matrix.json"],
          ["贸易历史 JSON", "china_trade_historical_series.json"],
          ["行业矩阵 JSON", "china_sector_linkage_matrix.json"],
          ["项目覆盖 QA", "china_project_coverage_audit.json"],
        ].map(([label, file]) => <a key={file} href={`${basePath}/research-data/${file}`} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[var(--accent)] hover:border-[var(--accent)]">{label}</a>)}
      </div>
    </section>
  );
}
