"use client";

import { useState } from "react";
import { CountryMapWorkbench } from "@/components/CountryMapWorkbench";
import { CountryReadingTabs } from "@/components/CountryReadingTabs";
import type { Country } from "@/lib/data";

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

export function CountryDetailModeTabs({ country }: CountryDetailModeTabsProps) {
  const [activeMode, setActiveMode] = useState<DetailMode>("map");
  const activeModeInfo = detailModes.find((mode) => mode.id === activeMode) ?? detailModes[0];

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

      {activeMode === "map" ? <CountryMapWorkbench country={country} /> : null}
      {activeMode === "reading" ? <CountryReadingTabs country={country} /> : null}
    </section>
  );
}
