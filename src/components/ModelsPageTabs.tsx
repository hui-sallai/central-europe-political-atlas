"use client";

import { useState, type ReactNode } from "react";

const tabs = [
  { id: "run", label: "Run Analysis" },
  { id: "compare", label: "Compare Countries" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function ModelsPageTabs({ runAnalysis, compareCountries }: { runAnalysis: ReactNode; compareCountries: ReactNode }) {
  const [tab, setTab] = useState<TabId>("run");

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
