"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { modelCards, modelOutputs } from "@/lib/modelFramework";

export function ModelObservationUsage() {
  const searchParams = useSearchParams();
  const modelObservation = searchParams.get("modelObservation");
  const usages = modelObservation
    ? modelOutputs.flatMap((output) => output.inputs
        .filter((input) => input.observation_id === modelObservation)
        .map((input) => ({ output, input })))
    : [];
  const selectedUsage = usages[0];

  return (
    <section id="model-observation-usage" className="mt-5 card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Model Observation Usage</p>
          <h2 className="mt-3 text-2xl font-semibold">模型输入追踪</h2>
        </div>
        <Link href="/models" className="text-sm font-semibold text-[var(--accent)] hover:underline">进入透明模型工作台</Link>
      </div>
      {selectedUsage ? (
        <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
          <p className="font-mono text-xs text-[var(--muted)]">{selectedUsage.input.observation_id}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div><p className="text-xs text-[var(--muted)]">国家 / 模型</p><p className="mt-1 font-semibold">{selectedUsage.output.country} / {modelCards.find((card) => card.model_id === selectedUsage.output.model_id)?.name_zh}</p></div>
            <div><p className="text-xs text-[var(--muted)]">原始观测</p><p className="mt-1 font-semibold">{selectedUsage.input.raw_value} {selectedUsage.input.unit} / {selectedUsage.input.year}</p></div>
            <div><p className="text-xs text-[var(--muted)]">模型使用</p><p className="mt-1 font-semibold">权重 {Math.round(selectedUsage.input.weight * 100)}% / 贡献 {selectedUsage.input.weighted_contribution}</p></div>
            <div><p className="text-xs text-[var(--muted)]">来源</p><a href={selectedUsage.input.source_url} target="_blank" rel="noreferrer" className="mt-1 block font-semibold text-[var(--accent)] hover:underline">{selectedUsage.input.source_name} / {selectedUsage.input.source_reliability} 级</a></div>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {modelCards.map((card) => (
            <article key={card.model_id} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <p className="font-semibold">{card.name_zh} / {card.model_version}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">使用：{card.inputs.map((input) => input.indicator_id).join(" / ")}</p>
            </article>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Models 页的每条输入均可通过 observation_id 返回这里；待接入、结构样例和来源不合格观测不会显示为模型输入。</p>
    </section>
  );
}
