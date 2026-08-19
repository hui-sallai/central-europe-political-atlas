"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const DataCountryExplorer = dynamic(() => import("@/components/DataCountryExplorer").then((module) => module.DataCountryExplorer), { ssr: false, loading: () => <Loading label="正在读取国家数据…" /> });
const ModelObservationUsage = dynamic(() => import("@/components/ModelObservationUsage").then((module) => module.ModelObservationUsage), { ssr: false });
const ModelValidationStatus = dynamic(() => import("@/components/ModelValidationStatus").then((module) => module.ModelValidationStatus), { ssr: false, loading: () => <Loading label="正在读取验证记录…" /> });
const ResearchDictionaryBrowser = dynamic(() => import("@/components/ResearchDictionaryBrowser").then((module) => module.ResearchDictionaryBrowser), { ssr: false, loading: () => <Loading label="正在读取字典…" /> });
const CrossCountryParitySummary = dynamic(() => import("@/components/CrossCountryParitySummary").then((module) => module.CrossCountryParitySummary), { ssr: false });
const RegionalCoverageMatrix = dynamic(() => import("@/components/RegionalCoverageMatrix").then((module) => module.RegionalCoverageMatrix), { ssr: false });
const TransmissionDataSummary = dynamic(() => import("@/components/TransmissionDataSummary").then((module) => module.TransmissionDataSummary), { ssr: false });
const ScenarioTransmissionInputs = dynamic(() => import("@/components/ScenarioTransmissionInputs").then((module) => module.ScenarioTransmissionInputs), { ssr: false });
const ChinaExposureDataPanel = dynamic(() => import("@/components/ChinaExposureDataPanel").then((module) => module.ChinaExposureDataPanel), { ssr: false });

type PanelId = "dictionaries" | "validation" | "coverage" | "regional" | "transmission" | "china";

function Loading({ label }: { label: string }) {
  return <div className="card p-6 text-sm text-[var(--muted)]" role="status">{label}</div>;
}

export function DataWorkspaceClient() {
  const [panel, setPanel] = useState<PanelId | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const requested = new URLSearchParams(window.location.search).get("panel") as PanelId | null;
      if (["dictionaries", "validation", "coverage", "regional", "transmission", "china"].includes(requested ?? "")) setPanel(requested);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  function openPanel(next: PanelId) {
    const isClosing = panel === next;
    setPanel(isClosing ? null : next);
    const url = new URL(window.location.href);
    if (isClosing) url.searchParams.delete("panel");
    else url.searchParams.set("panel", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <>
      <ModelObservationUsage />
      <DataCountryExplorer />
      <section className="mt-6 card p-6">
        <p className="eyebrow">Research Structure & QA</p>
        <h2 className="mt-3 text-2xl font-semibold">字典、覆盖与质量记录</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">默认只加载国家数据工作台；研究字典、验证、区域和专项 QA 按需加载，降低首屏 HTML 与脚本负担。</p>
        <div className="mt-4 flex flex-wrap gap-2">{[
          ["dictionaries", "指标 / 来源字典"], ["validation", "验证状态"], ["coverage", "十国覆盖"],
          ["regional", "区域数据"], ["transmission", "传导输入"], ["china", "China evidence"],
        ].map(([id, label]) => <button key={id} type="button" onClick={() => openPanel(id as PanelId)} aria-pressed={panel === id} className={`rounded-full border px-4 py-2 text-sm font-semibold ${panel === id ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--accent)]"}`}>{label}</button>)}</div>
      </section>
      <div className="mt-5" aria-live="polite">
        {panel === "dictionaries" ? <ResearchDictionaryBrowser /> : null}
        {panel === "validation" ? <ModelValidationStatus /> : null}
        {panel === "coverage" ? <CrossCountryParitySummary /> : null}
        {panel === "regional" ? <RegionalCoverageMatrix /> : null}
        {panel === "transmission" ? <><TransmissionDataSummary /><ScenarioTransmissionInputs /></> : null}
        {panel === "china" ? <ChinaExposureDataPanel /> : null}
      </div>
    </>
  );
}
