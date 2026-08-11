import Link from "next/link";
import { ModelExplorer } from "@/components/ModelExplorer";
import { modelAvailabilitySummary, modelCards, modelOutputs } from "@/lib/modelFramework";
import { platformStatus } from "@/lib/platformStatus";
import { researchCountries } from "@/lib/researchData";

export default function ModelsPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Transparent Models / {platformStatus.version}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">透明模型工作台</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        v0.50 启用居民经济压力、财政压力与外部脆弱性三个规则模型。所有分数都由可追溯 observation、固定标准化边界和公开权重计算；不使用机器学习，不预测选举，也不把事件直接计入分数。
      </p>
      <Link href="/scenarios" className="mt-4 inline-flex rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white">
        进入 v0.60 情景模拟
      </Link>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {modelAvailabilitySummary.flatMap((summary) => {
          const card = modelCards.find((item) => item.model_id === summary.model_id);
          return [
            <article key={`${summary.model_id}-sufficient`} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-xs text-[var(--muted)]">{card?.name_zh} / 可计算</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">{summary.sufficient} 国</p>
            </article>,
            <article key={`${summary.model_id}-partial`} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-xs text-[var(--muted)]">{card?.name_zh} / 部分可计算</p>
              <p className="mt-2 text-2xl font-semibold">{summary.partial} 国</p>
            </article>,
            <article key={`${summary.model_id}-insufficient`} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-xs text-[var(--muted)]">{card?.name_zh} / 不可计算</p>
              <p className="mt-2 text-2xl font-semibold">{summary.insufficient} 国</p>
            </article>,
          ];
        })}
      </section>

      <ModelExplorer countries={researchCountries} cards={modelCards} outputs={modelOutputs} />

      <section className="mt-6 card p-6">
        <p className="eyebrow">Reserved Interfaces</p>
        <h2 className="mt-3 text-2xl font-semibold">后续模型接口</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["Scenario Simulation", "已在独立情景层启用；不改变 v0.50 基线模型或原始观测值。"],
            ["Industrial Dependency Index", "准入检查未通过，等待供应链集中度、贸易伙伴暴露和计算值规则补齐。"],
            ["China Exposure Index", "项目候选变量已建立，但当前不生成指数、排名或风险结论。"],
          ].map(([name, note]) => (
            <article key={name} className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-muted)] p-4">
              <h3 className="font-semibold">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
