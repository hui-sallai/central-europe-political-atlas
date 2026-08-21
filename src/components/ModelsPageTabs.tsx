"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

const tabs = [
  { id: "run", label: "运行分析" },
  { id: "compare", label: "国家比较" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function ModelsPageTabs({ runAnalysis, compareCountries }: { runAnalysis: ReactNode; compareCountries: ReactNode }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(searchParams.get("tab") === "compare" ? "compare" : "run");

  return (
    <section className="mt-8">
      <div className="research-tabs" role="tablist" aria-label="分析工作台导航">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="research-tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-2">{tab === "run" ? runAnalysis : compareCountries}</div>
    </section>
  );
}
