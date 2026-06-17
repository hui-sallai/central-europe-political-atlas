"use client";

import { useState } from "react";
import { DataStatusBadge } from "@/components/DataStatusBadge";
import { CountryMapWorkbench } from "@/components/CountryMapWorkbench";
import { CountryReadingTabs } from "@/components/CountryReadingTabs";
import type { Country } from "@/lib/data";
import { getExtendedIndicator, getExtendedObservations, type ExtendedCategory } from "@/lib/extendedData";

type DetailMode = "map" | "reading";

type CountryDetailModeTabsProps = {
  country: Country;
};

const detailModes: { id: DetailMode; label: string; description: string }[] = [
  {
    id: "map",
    label: "地图层级",
    description: "默认视图：切换党派支持率、经济强度和基础底图。",
  },
  {
    id: "reading",
    label: "文字资料",
    description: "作为同一国家页内的阅读层，整理政治、党派、对华经贸、来源与数据状态。",
  },
];

const economicFieldItems: { category: ExtendedCategory; label: string }[] = [
  { category: "fiscal", label: "财政数据" },
  { category: "external", label: "外部经济数据" },
  { category: "investment", label: "投资数据" },
  { category: "energy", label: "能源数据" },
  { category: "industry", label: "产业数据" },
];

const fixedFieldItems = [
  { label: "对华经贸项目", statusText: "待量化", statusKind: "manual" as const, note: "项目表入口已预留，金额、主体、地区和年份仍需量化。" },
  { label: "新闻事件", statusText: "待接入", statusKind: "pending" as const, note: "正式新闻事件库尚未接入，不进入模型。" },
  { label: "政治数据", statusText: "待核验", statusKind: "manual" as const, note: "政府、党派和政治结构需与官方来源继续复核。" },
];

function StatusTextPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[10px] font-semibold leading-none text-[var(--muted)]">
      {label}
    </span>
  );
}

export function CountryDetailModeTabs({ country }: CountryDetailModeTabsProps) {
  const [activeMode, setActiveMode] = useState<DetailMode>("map");
  const activeModeInfo = detailModes.find((mode) => mode.id === activeMode) ?? detailModes[0];
  const extendedObservations = getExtendedObservations(country.slug);
  const economicStatusItems = economicFieldItems.map((item) => {
    const categoryObservations = extendedObservations.filter((observation) => getExtendedIndicator(observation.indicatorId)?.category === item.category);
    const hasOfficialData = categoryObservations.some((observation) => observation.status === "official" && observation.value !== null);

    return {
      ...item,
      count: categoryObservations.length,
      statusText: hasOfficialData ? "正式数据" : "待接入",
      statusKind: hasOfficialData ? "official" as const : "pending" as const,
      note: hasOfficialData ? `已接入 ${categoryObservations.length} 个 V4 模板指标。` : "字段已预留，等待接入可核验来源。",
    };
  });

  return (
    <section className="mt-8">
      <div className="card p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="px-2">
            <p className="eyebrow">Country View</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{activeModeInfo.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {detailModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveMode(mode.id)}
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  activeMode === mode.id
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[...economicStatusItems, ...fixedFieldItems].map((item) => (
          <article key={item.label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">{item.label}：</h3>
              <div className="flex flex-wrap justify-end gap-1.5">
                <StatusTextPill label={item.statusText} />
                <DataStatusBadge status={item.statusKind} />
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{item.note}</p>
          </article>
        ))}
      </div>

      {activeMode === "map" ? <CountryMapWorkbench country={country} /> : null}
      {activeMode === "reading" ? <CountryReadingTabs country={country} /> : null}
    </section>
  );
}
