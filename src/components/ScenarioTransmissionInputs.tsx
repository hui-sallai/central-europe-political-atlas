import Link from "next/link";
import { scenarioTransmissionInputs } from "@/lib/scenarioResearch";

export function ScenarioTransmissionInputs() {
  return (
    <details className="mt-5 card p-6">
      <summary className="cursor-pointer text-lg font-semibold">Transmission Inputs / 情景传导输入</summary>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--muted)]">
        这里说明哪些指标进入情景重算、哪些只作区域或产业背景。默认折叠，不改变数据工作台的国家与宏观数据主线。
      </p>
      <div className="wide-table-scroll mt-5">
        <table className="research-data-table w-full min-w-[980px] text-left text-sm">
          <thead><tr>{["Indicator", "角色", "Scenario usage", "Model usage", "Availability", "Source", "进入重算"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
          <tbody>{scenarioTransmissionInputs.map((record) => <tr key={record.indicator_id}>
            <td className="px-3 py-3 font-mono text-xs font-semibold">{record.indicator_id}</td>
            <td className="px-3 py-3">{record.role}</td>
            <td className="px-3 py-3 text-xs">{record.scenario_usage.join(" / ")}</td>
            <td className="px-3 py-3 text-xs">{record.model_usage.join(" / ")}</td>
            <td className="px-3 py-3">{record.availability}</td>
            <td className="px-3 py-3 text-xs">{record.source}</td>
            <td className="px-3 py-3 font-semibold">{record.enters_recalculation ? "是" : "否，仅作背景"}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <Link href="/scenarios" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline">进入 Scenario Workspace</Link>
    </details>
  );
}
