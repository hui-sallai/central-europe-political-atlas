import { regionalObservationQa } from "@/lib/spatialDataV086";
import { mapLayerReadinessV087, projectLocationReadiness, regionalCoverageMatrixV087, regionalGeometryQa, spatialV087Summary } from "@/lib/spatialDataV087";

function displayBoolean(value: boolean) {
  return value ? "是" : "否";
}

export function RegionalCoverageMatrix() {
  return (
    <section className="mt-6 card p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Regional Data Coverage</p>
          <h2 className="mt-3 text-2xl font-semibold">十国区域数据覆盖矩阵</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            所有计数由现有 regions、region_boundaries、region_observations 与 project_locations 自动生成。未通过许可、拓扑、主键和署名闸门的国家不会进入公开地图。
          </p>
        </div>
        <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold text-[var(--muted)]">
          {spatialV087Summary.region_count} 个区域主键 / {spatialV087Summary.factual_observation_count} 条事实观测
        </span>
      </div>

      <div className="wide-table-scroll mt-5 max-w-full">
        <table className="research-data-table w-full min-w-[1850px] border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr className="uppercase tracking-[0.12em] text-[var(--muted)]">
              {["国家", "区域数", "分类 / 层级", "Geometry", "P0 指标", "P1 指标", "事实观测", "待接入", "Latest year", "Latest common year", "Approved layers", "Rejected layers", "项目映射", "Blocker"].map((header) => (
                <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regionalCoverageMatrixV087.map((record) => (
              <tr key={record.country_id} className="align-top">
                <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{record.country_name_zh}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.region_count}</td>
                <td className="border-b border-[var(--line)] px-3 py-3 leading-5">{record.classification_system} / {record.admin_level}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.geometry_count} / {record.region_count}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.p0_indicator_count} / 3</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.p1_indicator_count} / 2</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.factual_observation_count}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.pending_observation_count}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.latest_year}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.latest_common_year}</td>
                <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{record.approved_layers.join(" / ") || "无"}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.rejected_layers.join(" / ") || "无"}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.project_mapped_count} / {record.project_display_eligible_count} eligible</td>
                <td className="border-b border-[var(--line)] px-3 py-3 leading-5 text-[var(--muted)]">{record.blocker || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="mt-5 rounded-2xl border border-[var(--line)] bg-white/65 p-4">
        <summary className="cursor-pointer font-semibold">Ten-country Geometry QA / 十国几何验收摘要</summary>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">未下载或未过滤的国家按缺失几何记录，不把“未检查”误写为通过。</p>
        <div className="wide-table-scroll mt-4 max-w-full">
          <table className="research-data-table w-full min-w-[1650px] border-separate border-spacing-0 text-left text-xs">
            <thead><tr className="text-[var(--muted)]">{["国家", "Expected", "Actual", "Missing", "Duplicate code", "Invalid geometry", "CRS", "MultiPolygon", "Overlap", "Gaps", "Containment", "region_id 1:1", "Topology"].map((header) => <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>)}</tr></thead>
            <tbody>
              {regionalGeometryQa.map((record) => (
                <tr key={`qa-${record.country_id}`} className="align-top">
                  <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{record.country_id}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.expected_feature_count}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.actual_feature_count}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.missing_region_count}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.duplicate_region_id_count}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.invalid_geometry_count}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.coordinate_system}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">Polygon / MultiPolygon</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.overlap_review_status}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.abnormal_gap_status}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.containment_ready ? "passed" : "review required"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{displayBoolean(record.region_id_ready)}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.topology_ready ? "local QA passed" : "review required"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="mt-5 rounded-2xl border border-[var(--line)] bg-white/65 p-4">
        <summary className="cursor-pointer font-semibold">Project Location Trace / 项目定位追踪</summary>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          这里只显示项目到区域的候选关联及其原始来源。城市或区域名称明确不等于精确坐标已核验；未达到“已定位”的记录不进入正式点位图层。
        </p>
        <div className="wide-table-scroll mt-4 max-w-full">
          <table className="research-data-table w-full min-w-[1200px] border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr className="text-[var(--muted)]">
                {["Project", "Country", "Region", "City / locality", "Role", "Precision", "Marker type", "Confidence", "Map eligibility", "Source level", "Map ready", "Source"].map((header) => (
                  <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectLocationReadiness.map((record) => (
                <tr key={record.project_location_id} className="align-top">
                  <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{record.project_name}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.country_id}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3 font-mono">{record.region_id || "待接入"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.city_or_locality || "待接入"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.location_role}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.location_precision}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.marker_type}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.confidence}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.readiness_status}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.source_reliability}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{displayBoolean(record.map_eligible)}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">
                    {record.source_url ? <a href={record.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)]">核验来源</a> : "待接入"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="mt-5 rounded-2xl border border-[var(--line)] bg-white/65 p-4">
        <summary className="cursor-pointer font-semibold">Layer Readiness / 图层独立准入</summary>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">边界、区域统计和项目定位分别验收。数据存在不代表图层自动开放。</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {mapLayerReadinessV087.map((record) => <div key={`${record.country_id}-${record.layer_id}`} className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs"><p className="font-mono font-semibold">{record.country_id} / {record.layer_id}</p><p className="mt-2">display: {String(record.is_ready_for_display)}</p><p className="mt-1 leading-5 text-[var(--muted)]">{record.blocker || `latest ${record.latest_available_year} / common ${record.latest_common_year}`}</p></div>)}
        </div>
      </details>

      <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/65 p-4 text-xs leading-6 text-[var(--muted)]">
        <span className="font-semibold text-[var(--foreground)]">Regional QA：</span>
        {regionalObservationQa.factual_observation_count} 条事实值，{regionalObservationQa.pending_observation_count} 个明确缺失位置；重复 {regionalObservationQa.duplicate_observation_count}、国家错配 {regionalObservationQa.country_mismatch_count}、无来源 {regionalObservationQa.missing_source_count}。异常只标记复核，不自动修改。
      </div>
    </section>
  );
}
