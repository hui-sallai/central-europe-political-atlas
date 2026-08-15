"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { RegionalCoverageRecord } from "@/lib/spatialFoundation";
import { mapCountryFromLocation, serverMapCountryFallback, subscribeToMapCountry, updateMapCountry } from "@/lib/mapCountrySelection";

type FactualLayerSummary = {
  country_id: string;
  layer_id: string;
  layer_name_zh: string;
  is_ready_for_display: boolean;
  blocker?: string;
};

export function SpatialResearchWorkbench({ matrix, layers }: { matrix: RegionalCoverageRecord[]; layers: FactualLayerSummary[] }) {
  const requestedCountryId = useSyncExternalStore(subscribeToMapCountry, mapCountryFromLocation, serverMapCountryFallback);
  const countryId = matrix.some((record) => record.country_id === requestedCountryId)
    ? requestedCountryId
    : matrix[0]?.country_id ?? "poland";
  const selected = useMemo(
    () => matrix.find((record) => record.country_id === countryId) ?? matrix[0],
    [countryId, matrix],
  );
  const selectedLayers = useMemo(() => layers.filter((layer) => layer.country_id === selected?.country_id), [layers, selected?.country_id]);

  if (!selected) return null;

  return (
    <section className="mt-6 card p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Spatial Research Workbench</p>
          <h2 className="mt-3 text-2xl font-semibold">空间研究工作台</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            国家与图层分别验收。通过边界、许可、主键、拓扑与数据质量闸门的事实层可以显示；没有通过的图层保留明确阻断原因。
          </p>
        </div>
        <label className="grid gap-2 text-xs font-semibold text-[var(--muted)]">
          国家
          <select value={countryId} onChange={(event) => updateMapCountry(event.target.value)} className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--foreground)]">
            {matrix.map((record) => <option key={record.country_id} value={record.country_id}>{record.country_name_zh}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["区域主键", String(selected.region_count), selected.preferred_level],
          ["边界几何", `${selected.geometry_ready_count} / ${selected.region_count}`, selected.geometry_source],
          ["区域统计", `${selected.regional_indicator_count} / ${selected.regional_indicator_expected}`, "没有区域值时不会用国家值代填"],
          ["正式展示", selected.public_display_ready ? "可用" : "未启用", selected.license_status],
        ].map(([label, value, note]) => (
          <article key={label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-xl font-semibold text-[var(--accent)]">{value}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{note}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
          <h3 className="font-semibold">事实型图层注册状态</h3>
          <div className="mt-3 grid gap-2">
            {selectedLayers.map((layer) => (
              <div key={layer.layer_id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs">
                <span><strong>{layer.layer_name_zh}</strong>{layer.blocker ? <small className="mt-1 block text-[var(--muted)]">{layer.blocker}</small> : null}</span>
                <span className="shrink-0 text-[var(--muted)]">{layer.is_ready_for_display ? "可显示" : "未启用"}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
          <h3 className="font-semibold">当前主要缺口</h3>
          <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm leading-6 text-[var(--muted)]">
            {selected.priority_gaps.map((gap) => <li key={gap}>{gap}</li>)}
          </ul>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">可比性：{selected.comparability_status}</p>
        </article>
      </div>
    </section>
  );
}
