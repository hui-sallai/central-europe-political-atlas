import Link from "next/link";
import { ModelExplorer } from "@/components/ModelExplorer";
import { ChinaExposureExplorer } from "@/components/ChinaExposureExplorer";
import { chinaExposureModelCard, chinaExposureOutputs } from "@/lib/chinaExposureModel";
import { modelAvailabilitySummary, modelCards, modelOutputs } from "@/lib/modelFramework";
import { platformStatus } from "@/lib/platformStatus";
import { researchCountries } from "@/lib/researchData";

export default function ModelsPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Transparent Models / {platformStatus.version}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">透明模型工作台</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        v0.50 的居民经济压力、财政压力与外部脆弱性及 v0.70 产业依赖规则均保持不变。v0.80 新增分维度的中国经济暴露模型；项目、贸易、投资和产业证据分别验收，不为缺失维度补值。
      </p>
      <Link href="/scenarios" className="mt-4 inline-flex rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white">
        进入情景模拟
      </Link>

      <section className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        {modelAvailabilitySummary.map((summary) => {
          const card = modelCards.find((item) => item.model_id === summary.model_id);
          return (
            <article key={summary.model_id} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
              <p className="font-semibold">{card?.name_zh}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ["可计算", summary.sufficient],
                  ["部分", summary.partial],
                  ["不可计算", summary.insufficient],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[var(--surface-muted)] px-2 py-2">
                    <dt className="text-[10px] text-[var(--muted)]">{label}</dt>
                    <dd className="mt-1 font-semibold text-[var(--accent)]">{value} 国</dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </section>

      <ModelExplorer countries={researchCountries} cards={modelCards} outputs={modelOutputs} />

      <ChinaExposureExplorer countries={researchCountries} card={chinaExposureModelCard} outputs={chinaExposureOutputs} />

      <section className="mt-6 card p-6">
        <p className="eyebrow">Reserved Interfaces</p>
        <h2 className="mt-3 text-2xl font-semibold">当前边界与后续接口</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            ["Scenario Simulation", "已在独立情景层启用；不改变 v0.50 基线模型或原始观测值。"],
            ["Industrial Dependency Index", "v0.75 已统一十国输入结构；FDI 和供应链集中度仍不计正式权重。"],
            ["China Economic Exposure", "v0.80 已启用分维度结果；十国尚不满足三维充分门槛，因此不输出总体指数或排名。"],
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
