import { researchCountries } from "@/lib/researchData";
import {
  transmissionDataSummary,
  transmissionIndicators,
  transmissionObservations,
} from "@/lib/transmissionData";

export function TransmissionDataSummary() {
  const latest = transmissionObservations.filter((observation) => observation.year === 2024);

  return (
    <details className="mt-5 card p-6">
      <summary className="cursor-pointer text-lg font-semibold">v0.70 产业与冲击传导输入</summary>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--muted)]">
        V4 四国新增 {transmissionDataSummary.observation_count} 条 2023–2024 合格观测。对德依赖使用双边货物出口比重；工业与居民电价使用统一 Eurostat 消费档位；FDI 年流量不计入正式产业依赖权重。
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-xs text-[var(--muted)]">
              {['国家', '指标', '年份', '数值', '状态', '来源'].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {latest.map((observation) => (
              <tr key={observation.id} className="border-b border-[var(--line)] align-top">
                <td className="px-3 py-3 font-semibold">{researchCountries.find((country) => country.slug === observation.country_slug)?.name_zh ?? observation.country_slug}</td>
                <td className="px-3 py-3">{transmissionIndicators.find((indicator) => indicator.id === observation.indicator)?.name_zh ?? observation.indicator}</td>
                <td className="px-3 py-3">{observation.year}</td>
                <td className="whitespace-nowrap px-3 py-3">{observation.value} {observation.unit}</td>
                <td className="whitespace-nowrap px-3 py-3">{observation.status === "calculated" ? "A 级来源计算值" : "正式数据"}</td>
                <td className="min-w-56 px-3 py-3 text-xs leading-5">
                  <a href={observation.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">{observation.source_name}</a>
                  <p className="mt-1 break-all text-[var(--muted)]">{observation.notes}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
