import Link from "next/link";
import type { Metadata } from "next";
import { ComparativeSpatialWorkbench } from "@/components/ComparativeSpatialWorkbench";
import { mapDisplayBoundary, platformStatus } from "@/lib/platformStatus";
import {
  spatialComparisonEligibilityV089,
  spatialResearchCountriesV089,
  spatialResearchLayersV089,
  spatialResearchProjectsV089,
  spatialResearchRegionsV089,
  spatialV089Summary,
} from "@/lib/spatialResearchV089";

export const metadata: Metadata = {
  title: "区域事实地图",
  description: "九国区域事实比较、历史变化、项目位置和来源追溯工作台。",
};

export default function MapPage() {
  return (
    <main className="page-shell">
      <header className="max-w-4xl border-b border-[var(--line)] pb-7"><p className="editorial-kicker">Map Workspace / {platformStatus.version}</p><h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em]">区域事实地图</h1><p className="mt-5 text-base leading-8 text-[var(--muted)]">左侧选择国家、图层与年份，中间查看事实边界，右侧读取当前区域档案。九国可用，塞尔维亚区域比较继续待接入；模型、情景影响、风险与预测图层均未启用。</p><p className="mt-3 text-sm text-[var(--muted)]">当前可用：{spatialV089Summary.public_country_count} / 10 国 · {spatialV089Summary.observation_count} 条区域事实观测</p></header>

      <ComparativeSpatialWorkbench
        countries={spatialResearchCountriesV089}
        regions={spatialResearchRegionsV089}
        observations={[]}
        projects={spatialResearchProjectsV089}
        layers={spatialResearchLayersV089}
        eligibility={spatialComparisonEligibilityV089}
      />

      <section className="mt-6 border-y border-[var(--line)] py-5"><h2 className="text-xl font-semibold">图层边界</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted)]">开放行政边界、经济、人口变化、制造业 GVA 比重与通过定位核验的项目参考。不同统计层级不会互相复制；待接入值不会显示为 0。</p><p className="mt-3 text-xs leading-5 text-[var(--muted)]">{mapDisplayBoundary}</p><Link href="/methodology#spatial" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)]">查看边界来源、许可与展示准入规则</Link></section>
    </main>
  );
}
