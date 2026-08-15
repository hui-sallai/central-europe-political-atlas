import { FactualRegionalMap } from "@/components/FactualRegionalMap";
import { SpatialResearchWorkbench } from "@/components/SpatialResearchWorkbench";
import { StatusSummary } from "@/components/StatusSummary";
import { mapDisplayBoundary, platformStatus } from "@/lib/platformStatus";
import {
  factualMapCountries,
  factualMapObservations,
  mapLayerReadinessV087,
  projectLocationReadiness,
  publicDisplayDecisionsV087,
  regionalCoverageMatrixV087,
  regionalGeometryQa,
  sharedSpatialLicenseRecords,
  spatialDisplayGateAudit,
  spatialV087Summary,
} from "@/lib/spatialDataV087";

const disabledLayers = ["风险地图", "预测地图", "真实党派支持率地图", "China Exposure 地图", "情景色阶", "区域综合评分"];

export default function MapPage() {
  const readyCountries = spatialDisplayGateAudit.filter((record) => record.boundary_layer_ready);
  const serbia = spatialDisplayGateAudit.find((record) => record.country_id === "serbia");

  return (
    <main className="page-shell">
      <p className="eyebrow">Map Workbench / {platformStatus.version}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">多国事实地图</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        地图按国家、按图层独立验收。通过的事实边界与区域统计可以公开查看；未通过的国家或图层会说明具体阻断原因。{mapDisplayBoundary}
      </p>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Multi-Country Spatial Readiness</p>
        <h2 className="mt-3 text-2xl font-semibold">多国空间准入概览</h2>
        <div className="mt-5">
          <StatusSummary
            items={[
              { label: "十国 Geometry QA", value: `${spatialV087Summary.geometry_qa_passed_country_count} / 10`, note: "文件、代码、几何完整性、坐标范围和明显重叠候选均已记录。" },
              { label: "公开边界国家", value: `${spatialV087Summary.public_boundary_country_count} / 10`, note: "塞尔维亚继续等待官方边界对应与区域统计可比性验收。" },
              { label: "已批准国家-图层", value: `${spatialV087Summary.public_layer_count} 个`, note: "边界、人口、GDP、人均 GDP 与项目区域参考分别判定。" },
              { label: "项目区域参考", value: `${spatialV087Summary.project_reference_count} 条`, note: "只显示 high / medium confidence；不是精确项目坐标。" },
              { label: "模型与预测地图", value: "未启用", note: "不生成区域风险、预测、选举、党派或 China Exposure 色阶。" },
            ]}
          />
        </div>
      </section>

      <FactualRegionalMap countries={factualMapCountries} observations={factualMapObservations} />

      <SpatialResearchWorkbench
        matrix={regionalCoverageMatrixV087.map((record) => {
          const qa = regionalGeometryQa.find((item) => item.country_id === record.country_id);
          const decision = publicDisplayDecisionsV087.find((item) => item.country_id === record.country_id);
          return {
            country_id: record.country_id,
            country_name_zh: record.country_name_zh,
            region_count: record.region_count,
            preferred_level: `${record.classification_system} / ${record.admin_level}`,
            classification: record.admin_level,
            geometry_source: decision?.license_record_id ?? "source_pending",
            geometry_ready_count: qa?.actual_feature_count ?? 0,
            expected_feature_count: qa?.expected_feature_count ?? record.region_count,
            actual_feature_count: qa?.actual_feature_count ?? 0,
            duplicate_region_code_count: qa?.duplicate_region_code_count ?? 0,
            missing_region_count: qa?.missing_region_count ?? record.region_count,
            invalid_geometry_count: qa?.invalid_geometry_count ?? 0,
            coordinate_system: qa?.coordinate_system ?? "unavailable",
            multipolygon_status: "Polygon / MultiPolygon recorded",
            overlap_status: qa?.overlap_review_status ?? "pending",
            gap_status: qa?.abnormal_gap_status ?? "pending",
            containment_status: qa?.containment_ready ? "passed" : "review_required",
            region_id_one_to_one_match: Boolean(qa?.region_id_ready),
            topology_status: qa?.topology_ready ? "local QA passed" : "review_required",
            license_status: decision?.license_ready ? "shared licence record checked" : "pending",
            public_display_ready: Boolean(decision?.boundary_ready),
            regional_indicator_count: record.p0_indicator_count + record.p1_indicator_count,
            regional_indicator_expected: 5,
            mapped_project_count: record.project_mapped_count,
            verified_mapped_project_count: projectLocationReadiness.filter((item) => item.country_id === record.country_id && item.default_display).length,
            comparability_status: record.country_id === "serbia" ? "national_admin; EU NUTS comparison pending" : "layer and year recorded",
            priority_gaps: record.priority_gaps,
          };
        })}
        layers={mapLayerReadinessV087.map((record) => ({
          country_id: record.country_id,
          layer_id: record.layer_id,
          layer_name_zh: record.layer_name_zh,
          is_ready_for_display: record.is_ready_for_display,
          blocker: record.blocker,
        }))}
      />

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Available Factual Layers</p>
          <h2 className="mt-3 text-2xl font-semibold">已通过与未启用图层</h2>
          <div className="mt-5 grid gap-3">
            {readyCountries.map((country) => (
              <div key={country.country_id} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                <div className="flex items-center justify-between gap-3"><strong>{country.country_name_zh}</strong><span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs">{country.approved_layer_count} 个可用图层</span></div>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{country.public_display_blocker || "当前登记图层均已通过。"}</p>
              </div>
            ))}
            {serbia ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><strong>塞尔维亚</strong><p className="mt-2 text-xs leading-5 text-amber-950">Spatial QA pending：{serbia.public_display_blocker}</p></div> : null}
          </div>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Display Rules</p>
          <h2 className="mt-3 text-2xl font-semibold">事实地图展示边界</h2>
          <ol className="mt-5 grid list-decimal gap-3 pl-5 text-sm leading-6 text-[var(--muted)]">
            <li>国家边界必须通过 geometry、region_id、许可、署名与 topology QA。</li>
            <li>统计图层必须覆盖该国当前区域层级，并记录年份、单位与来源。</li>
            <li>图例采用国家内分位数，跨国比较只允许相同指标、定义、单位和共同年份。</li>
            <li>项目无精确坐标时只能显示 regional_reference，并明确位置精度。</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            {disabledLayers.map((layer) => <span key={layer} className="rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{layer}：未启用</span>)}
          </div>
        </article>
      </section>

      <details className="mt-6 card p-6">
        <summary className="cursor-pointer text-lg font-semibold">技术 QA、许可与逐国展示决策</summary>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--muted)]">地图主体不再由匈牙利历史 QA 记录主导。共享许可、逐国几何 QA 和图层门控保留在此处及数据导出中。</p>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {sharedSpatialLicenseRecords.map((record) => <article key={record.license_record_id} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4"><p className="font-mono text-xs font-semibold text-[var(--accent)]">{record.license_record_id}</p><p className="mt-2 font-semibold">{record.provider}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{record.usage_terms}</p><p className="mt-2 text-xs">{record.attribution}</p><a href={record.license_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)] underline">核验使用条件</a></article>)}
        </div>
        <div className="wide-table-scroll mt-5 max-w-full">
          <table className="research-data-table w-full min-w-[1450px] border-separate border-spacing-0 text-left text-xs">
            <thead><tr className="text-[var(--muted)]">{["国家", "Geometry", "Region ID", "License", "Attribution", "Topology", "Boundary", "Population", "GDP", "GDP/capita", "Unemployment", "Project", "Blocker"].map((header) => <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>)}</tr></thead>
            <tbody>{spatialDisplayGateAudit.map((record) => <tr key={record.country_id} className="align-top"><td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{record.country_name_zh}</td>{[record.geometry_ready, record.region_ids_matched, record.license_checked, record.attribution_ready, record.topology_checked, record.boundary_layer_ready, record.population_layer_ready, record.gdp_layer_ready, record.gdp_per_capita_layer_ready, record.unemployment_layer_ready, record.project_layer_ready].map((value, index) => <td key={index} className="border-b border-[var(--line)] px-3 py-3">{value ? "通过" : "未通过"}</td>)}<td className="border-b border-[var(--line)] px-3 py-3 leading-5 text-[var(--muted)]">{record.public_display_blocker || "—"}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </main>
  );
}
