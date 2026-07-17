"use client";

import { useMemo, useState } from "react";
import { DataStatusBadge, SourceStatusBadge } from "@/components/DataStatusBadge";
import type { Country, Region } from "@/lib/data";

type Admin2ExplorerProps = {
  country: Country;
  region: Region;
};

const placeholderTypes = ["二级行政区样本 A", "二级行政区样本 B", "二级行政区样本 C", "二级行政区样本 D"];

export function Admin2Explorer({ country, region }: Admin2ExplorerProps) {
  const admin2Items = useMemo(
    () =>
      placeholderTypes.map((type, index) => ({
        id: `${region.slug}-${index + 1}`,
        name: `${region.nameZh}${type}`,
        type,
        status: "待接入正式 ADM2 数据",
      })),
    [region.nameZh, region.slug],
  );
  const [selectedId, setSelectedId] = useState(admin2Items[0]?.id);
  const selectedItem = admin2Items.find((item) => item.id === selectedId) ?? admin2Items[0];

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <aside className="card p-6">
        <p className="eyebrow">ADM2 Explorer</p>
        <h2 className="mt-3 text-2xl font-semibold">二级行政区选择</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <DataStatusBadge status="sample" />
          <SourceStatusBadge status="sample" />
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          当前为结构样例，不进入模型。正式版将在这里接入 {country.nameZh} / {region.nameZh} 的真实二级行政区边界、名称、地方主政人员和区域级指标。
        </p>
        <div className="mt-5 space-y-2">
          {admin2Items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                item.id === selectedItem.id
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--line)] bg-white/60 hover:border-[var(--accent)]"
              }`}
            >
              <p className="text-sm font-semibold">{item.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DataStatusBadge status="sample" />
                <SourceStatusBadge status="sample" />
                <span className="text-xs text-[var(--muted)]">{item.type}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div className="card p-6">
        <p className="eyebrow">Selected ADM2</p>
        <h2 className="mt-3 text-2xl font-semibold">{selectedItem.name}</h2>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          这里将展示二级行政区的政治样本色阶、地方负责人、最近选举结果、人口和基础经济指标。当前只保留选择交互和信息结构，不填充未经核验的具体数据。
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {["政治样本色阶", "地方主政人员", "基础经济指标"].map((item) => (
            <div key={item} className="rounded-2xl border border-[var(--line)] bg-white/60 p-4">
              <p className="text-sm font-semibold">{item}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DataStatusBadge status="pending" />
                <SourceStatusBadge status="pending" />
                <span className="text-xs text-[var(--muted)]">{selectedItem.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
