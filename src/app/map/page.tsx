import { ComparativeSpatialWorkbench } from "@/components/ComparativeSpatialWorkbench";
import { mapDisplayBoundary, platformStatus } from "@/lib/platformStatus";
import { regionalGeometryQa, sharedSpatialLicenseRecords, spatialDisplayGateAudit } from "@/lib/spatialDataV087";
import {
  spatialComparisonEligibilityV088,
  spatialResearchCountriesV088,
  spatialResearchLayersV088,
  spatialResearchObservationsV088,
  spatialResearchProjectsV088,
  spatialResearchRegionsV088,
  spatialV088Summary,
} from "@/lib/spatialResearchV088";

export default function MapPage() {
  const serbia = spatialDisplayGateAudit.find((record) => record.country_id === "serbia");

  return (
    <main className="page-shell">
      <p className="eyebrow">Map / {platformStatus.version}</p>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em]">区域比较研究工作台</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            九个欧盟国家已开放通过验收的事实边界与 P0 区域指标。选择国家、指标和年份后，可以比较区域、查看项目与追溯来源；塞尔维亚继续保持空间比较待接入。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:max-w-xl">
          {[["地图就绪", `${spatialV088Summary.public_country_count} / 10`], ["事实观测", String(spatialV088Summary.observation_count)], ["项目位置", String(spatialV088Summary.project_location_count)], ["区域模型", "未启用"]].map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2"><p className="text-[var(--muted)]">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}
        </div>
      </div>

      <ComparativeSpatialWorkbench
        countries={spatialResearchCountriesV088}
        regions={spatialResearchRegionsV088}
        observations={spatialResearchObservationsV088}
        projects={spatialResearchProjectsV088}
        layers={spatialResearchLayersV088}
        eligibility={spatialComparisonEligibilityV088}
      />

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Layer Boundary</p>
          <h2 className="mt-3 text-xl font-semibold">可用层与未启用层</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">当前只开放行政边界、区域人口、GDP、人均 GDP 与通过位置核验的项目参考。区域失业率因 Eurostat NUTS 2 与当前多国展示层级不完全一致而继续受控待接入；制造业层等待统一官方区域数据。</p>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{mapDisplayBoundary}</p>
        </article>
        <article className="card p-6">
          <p className="eyebrow">Serbia</p>
          <h2 className="mt-3 text-xl font-semibold">Spatial comparison pending</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{serbia?.public_display_blocker || "官方边界对应与同层级区域统计可比性尚未通过。"}</p>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">不使用国家值下推，不把待接入值显示为 0，也不为追求十国齐全而降低展示闸门。</p>
        </article>
      </section>

      <details className="mt-6 card p-6">
        <summary className="cursor-pointer text-lg font-semibold">技术 QA、许可与逐国展示记录</summary>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--muted)]">底层 QA 数据完整保留，但不再占据地图首屏。许可、几何、主键和拓扑记录用于解释展示资格，不构成区域评价。</p>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {sharedSpatialLicenseRecords.map((record) => <article key={record.license_record_id} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4"><p className="font-mono text-xs font-semibold text-[var(--accent)]">{record.license_record_id}</p><p className="mt-2 font-semibold">{record.provider}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{record.usage_terms}</p><p className="mt-2 text-xs">{record.attribution}</p><a href={record.license_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)] underline">核验使用条件</a></article>)}
        </div>
        <div className="wide-table-scroll mt-5 max-w-full">
          <table className="research-data-table w-full min-w-[1100px] border-separate border-spacing-0 text-left text-xs">
            <thead><tr className="text-[var(--muted)]">{["国家", "Expected", "Actual", "Region ID", "Topology", "CRS", "Overlap", "Gaps"].map((header) => <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>)}</tr></thead>
            <tbody>{regionalGeometryQa.map((record) => <tr key={record.country_id}><td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{record.country_id}</td><td className="border-b border-[var(--line)] px-3 py-3">{record.expected_feature_count}</td><td className="border-b border-[var(--line)] px-3 py-3">{record.actual_feature_count}</td><td className="border-b border-[var(--line)] px-3 py-3">{record.region_id_ready ? "通过" : "待复核"}</td><td className="border-b border-[var(--line)] px-3 py-3">{record.topology_ready ? "本地 QA 通过" : "待复核"}</td><td className="border-b border-[var(--line)] px-3 py-3">{record.coordinate_system}</td><td className="border-b border-[var(--line)] px-3 py-3">{record.overlap_review_status}</td><td className="border-b border-[var(--line)] px-3 py-3">{record.abnormal_gap_status}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </main>
  );
}
