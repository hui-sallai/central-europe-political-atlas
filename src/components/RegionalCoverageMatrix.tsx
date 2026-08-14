import { projectLocationRecords } from "@/lib/projectLocations";
import { regionalCoverageMatrix, regionalFoundationSummary } from "@/lib/spatialFoundation";

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
          {regionalFoundationSummary.region_count} 个区域主键 / {regionalFoundationSummary.public_display_ready_country_count} 国可公开展示
        </span>
      </div>

      <div className="wide-table-scroll mt-5 max-w-full">
        <table className="research-data-table w-full min-w-[1500px] border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr className="uppercase tracking-[0.12em] text-[var(--muted)]">
              {["国家", "区域数", "选定层级", "Geometry ready", "Topology", "Public display", "区域指标", "项目映射", "已核验点位", "主要缺口"].map((header) => (
                <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regionalCoverageMatrix.map((record) => (
              <tr key={record.country_id} className="align-top">
                <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{record.country_name_zh}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.region_count}</td>
                <td className="border-b border-[var(--line)] px-3 py-3 leading-5">{record.preferred_level}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.geometry_ready_count} / {record.region_count}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.topology_status}</td>
                <td className="border-b border-[var(--line)] px-3 py-3 font-semibold">{displayBoolean(record.public_display_ready)}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.regional_indicator_count} / {record.regional_indicator_expected}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.mapped_project_count}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{record.verified_mapped_project_count}</td>
                <td className="border-b border-[var(--line)] px-3 py-3 leading-5 text-[var(--muted)]">{record.priority_gaps.join("；")}</td>
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
              {regionalCoverageMatrix.map((record) => (
                <tr key={`qa-${record.country_id}`} className="align-top">
                  <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{record.country_name_zh}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.expected_feature_count}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.actual_feature_count}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.missing_region_count}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.duplicate_region_code_count}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.invalid_geometry_count}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.coordinate_system}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.multipolygon_status}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.overlap_status}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.gap_status}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.containment_status}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{displayBoolean(record.region_id_one_to_one_match)}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.topology_status}</td>
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
                {["Project", "Country", "Region", "City / locality", "Precision", "Match status", "Source level", "Map ready", "Source"].map((header) => (
                  <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectLocationRecords.map((record) => (
                <tr key={record.project_location_id} className="align-top">
                  <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{record.project_name}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.country_id}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3 font-mono">{record.region_id || "待接入"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.city_or_locality || "待接入"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.location_precision}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.region_match_status}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{record.location_source_reliability}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">{displayBoolean(record.is_ready_for_map_layer)}</td>
                  <td className="border-b border-[var(--line)] px-3 py-3">
                    {record.location_source_url ? <a href={record.location_source_url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)]">核验来源</a> : "待接入"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
