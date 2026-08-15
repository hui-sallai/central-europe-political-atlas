import { modelCards } from "@/lib/modelFramework";
import { scenarioDefinitions } from "@/lib/scenarioFramework";
import { validationRegistry, validationSummary } from "@/lib/researchValidation";
import type { ValidationStatus } from "@/types/Validation";

const labels: Record<ValidationStatus, string> = {
  passed: "通过",
  partial: "部分完成",
  failed: "失败",
  not_tested: "未测试",
};

function combinedStatus(statuses: ValidationStatus[]): ValidationStatus {
  if (!statuses.length) return "not_tested";
  if (statuses.includes("failed")) return "failed";
  if (statuses.includes("partial")) return "partial";
  if (statuses.every((status) => status === "passed")) return "passed";
  return "not_tested";
}

function statusFor(targetId: string, testType: string) {
  return combinedStatus(validationRegistry
    .filter((item) => item.target_id === targetId && item.test_type === testType)
    .map((item) => item.status));
}

function statusBadge(status: ValidationStatus) {
  const tone = status === "passed"
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : status === "failed"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-amber-200 bg-amber-50 text-amber-950";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{labels[status]}</span>;
}

export function ModelValidationStatus() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const missingStatus = combinedStatus(validationRegistry.filter((item) => item.test_type === "missing_data").map((item) => item.status));
  const goldenStatus = combinedStatus(validationRegistry.filter((item) => item.test_type === "golden_regression").map((item) => item.status));

  return (
    <section id="model-validation-status" className="mt-6 card p-6">
      <p className="eyebrow">v0.91 Validation Registry</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Model Validation Status</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">状态来自可执行验证，不是文档自评。部分完成表示边界已明确但证据仍不足，例如 point-in-time backtest。</p>
        </div>
        <a href={`${basePath}/research-data/validation_registry.json`} className="text-sm font-semibold text-[var(--accent)] hover:underline">导出 validation registry</a>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["验证记录", validationSummary.total],
          ["通过", validationSummary.passed],
          ["部分完成", validationSummary.partial],
          ["失败", validationSummary.failed],
          ["Golden cases", `${validationSummary.golden_cases - validationSummary.golden_failures}/${validationSummary.golden_cases}`],
        ].map(([label, value]) => <div key={label} className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div>)}
      </div>
      <div className="wide-table-scroll mt-5">
        <table className="research-data-table w-full min-w-[900px] text-left text-sm">
          <thead><tr>{["模型", "Determinism", "Boundary", "Missing data", "Direction", "Year alignment", "Golden"].map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead>
          <tbody>{modelCards.map((card) => <tr key={card.model_id}><td className="px-3 py-3 font-semibold">{card.name_zh}<p className="mt-1 font-mono text-[10px] font-normal text-[var(--muted)]">{card.formula_version}</p></td><td className="px-3 py-3">{statusBadge(statusFor(card.model_id, "determinism"))}</td><td className="px-3 py-3">{statusBadge(statusFor(card.model_id, "normalization_boundary"))}</td><td className="px-3 py-3">{statusBadge(missingStatus)}</td><td className="px-3 py-3">{statusBadge(statusFor(card.model_id, "monotonicity"))}</td><td className="px-3 py-3">{statusBadge(statusFor(card.model_id, "year_alignment"))}</td><td className="px-3 py-3">{statusBadge(goldenStatus)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {scenarioDefinitions.map((definition) => {
          const statuses = validationRegistry.filter((item) => item.target_id === definition.scenario_id).map((item) => item.status);
          return <article key={definition.scenario_id} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{definition.name_zh}</h3>{statusBadge(combinedStatus(statuses))}</div><p className="mt-3 text-xs leading-5 text-[var(--muted)]">已检查确定性、零冲击、参数边界、单调性、隔离和共同基线。</p></article>;
        })}
      </div>
      <details className="mt-5 rounded-2xl border border-[var(--line)] p-4">
        <summary className="cursor-pointer font-semibold">未解决的验证限制</summary>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--muted)]">{validationSummary.unresolved.map((item) => <li key={item}>{item}</li>)}</ul>
      </details>
    </section>
  );
}
