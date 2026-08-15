import { HungaryBoundaryVisualQaSandbox } from "@/components/HungaryBoundaryVisualQaSandbox";
import { FactualRegionalMap } from "@/components/FactualRegionalMap";
import { InteractiveMapExplorer } from "@/components/InteractiveMapExplorer";
import { SpatialResearchWorkbench } from "@/components/SpatialResearchWorkbench";
import { StatusSummary } from "@/components/StatusSummary";
import { mapDisplayBoundary, platformStatus } from "@/lib/platformStatus";
import {
  hungaryAuthoritativeTopologyValidationDecisionSummary,
  hungaryGiscoLicenseVerificationDecisionSummary,
  hungaryNuts3ValidationManifestSummary,
} from "@/lib/regionQualityChecks";
import { regionObservationRecords } from "@/lib/regionObservations";
import { mapLayerReadiness, regionalCoverageMatrixV086, spatialV086Summary } from "@/lib/spatialDataV086";

const availableLayers = [
  { label: "国家边界与国家选择", value: "可用", note: "用于十国导航与国家切换。" },
  { label: "一级行政区结构", value: "结构样例", note: "真实区域统计与公开展示资格尚未全部接入。" },
  { label: "匈牙利 NUTS3 证据", value: "已记录", note: "许可、主键和权威拓扑核验记录已保留。" },
  { label: "对华项目地区定位接口", value: "已预留", note: "可靠 region / city 记录可进入 future project-location layer；正式项目地图未启用。" },
  { label: "产业依赖与情景图层接口", value: "已预留", note: "模型先在 Models / Scenarios / Country 页面验证；地图色阶与风险图层未启用。" },
] as const;

const disabledLayers = ["风险图层", "预测图层", "真实党派支持率图层", "区域评分"] as const;
const factualLayerLabels: Record<string, string> = {
  regional_boundary: "区域边界",
  regional_population: "区域人口",
  regional_gdp: "区域 GDP",
  regional_gdp_per_capita: "区域人均 GDP",
  regional_unemployment_rate: "区域失业率",
  regional_manufacturing_share: "区域制造业比重",
  china_project_locations: "对华项目位置参考",
};

export default function MapPage() {
  const topology = hungaryAuthoritativeTopologyValidationDecisionSummary;
  const license = hungaryGiscoLicenseVerificationDecisionSummary;
  const manifest = hungaryNuts3ValidationManifestSummary;

  return (
    <main className="page-shell">
      <p className="eyebrow">Map Workbench / {platformStatus.version}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">地图工作台</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        地图页用于国家导航、事实区域图层和逐国展示闸门检查。{mapDisplayBoundary}
      </p>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Workbench Status</p>
        <h2 className="mt-3 text-2xl font-semibold">当前地图状态</h2>
        <div className="mt-5">
          <StatusSummary
            items={[
              { label: "国家导航", value: "可用", note: "十国国家选择与国家详情入口保持开放。" },
              { label: "十国边界映射", value: `${spatialV086Summary.geometry_mapped_country_count} / 10`, note: "几何、区域代码和 region_id 一对一映射已记录；各国展示闸门独立。" },
              { label: "事实区域统计", value: `${spatialV086Summary.factual_observation_count} 条`, note: "欧盟九国 2021–2024 人口、GDP 与可追溯人均 GDP；塞尔维亚保持待接入。" },
              { label: "公开事实图层", value: `${mapLayerReadiness.filter((item) => item.is_ready_for_display).length} 个国家-图层`, note: "当前仅开放满足全部闸门的匈牙利事实层。" },
              { label: "模型地图与预测", value: "未启用", note: "模型仅在研究页面验证，不生成地图风险分数或选举预测。" },
            ]}
          />
        </div>
      </section>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Boundary Readiness Summary</p>
        <h2 className="mt-3 text-2xl font-semibold">当前边界数据状态摘要</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          以下字段只说明匈牙利 NUTS3 边界证据与准入状态，不表示正式地图已经启用。
        </p>
        <div className="mt-5">
          <StatusSummary
            columns="three"
            items={[
              { label: "GISCO source", value: "recorded", note: topology.boundary_source_name },
              { label: "license_checked", value: String(license.license_checked) },
              { label: "region_id_final_matched", value: String(manifest.region_id_final_matched) },
              { label: "authoritative_topology_checked", value: String(topology.authoritative_topology_checked) },
              { label: "public_display_ready", value: "true", note: "仅适用于匈牙利 NUTS3 事实边界与 P0 图层。" },
              { label: "is_ready_for_display", value: "true", note: "不包含风险、预测、党派或情景图层。" },
            ]}
          />
        </div>
      </section>

      <FactualRegionalMap observations={regionObservationRecords.filter((record) => record.country_id === "hungary" && record.value !== null)} />

      <SpatialResearchWorkbench
        matrix={regionalCoverageMatrixV086.map((record) => ({
          country_id: record.country_id,
          country_name_zh: record.country_name_zh,
          region_count: record.region_count,
          preferred_level: `${record.classification_system} / ${record.admin_level}`,
          classification: record.admin_level,
          geometry_source: "v0.86 spatial boundary manifest",
          geometry_ready_count: record.geometry_count,
          expected_feature_count: record.region_count,
          actual_feature_count: record.geometry_count,
          duplicate_region_code_count: 0,
          missing_region_count: Math.max(0, record.region_count - record.geometry_count),
          invalid_geometry_count: 0,
          coordinate_system: "EPSG:4326",
          multipolygon_status: "recorded",
          overlap_status: record.boundary_ready ? "checked" : "pending country gate",
          gap_status: record.boundary_ready ? "checked" : "pending country gate",
          containment_status: record.boundary_ready ? "checked" : "pending country gate",
          region_id_one_to_one_match: record.geometry_match_status === "one_to_one_matched",
          topology_status: record.boundary_ready ? "recorded" : "pending country gate",
          license_status: record.boundary_ready ? "checked" : "file-level review pending",
          public_display_ready: record.boundary_ready,
          regional_indicator_count: record.p0_indicator_count + record.p1_indicator_count,
          regional_indicator_expected: 5,
          mapped_project_count: record.project_mapped_count,
          verified_mapped_project_count: record.project_display_eligible_count,
          comparability_status: record.country_id === "serbia" ? "national_admin; EU NUTS comparison pending" : "NUTS/ADM level recorded",
          priority_gaps: record.priority_gaps,
        }))}
        layers={mapLayerReadiness.filter((record) => record.country_id === "hungary").map((record) => ({ layer_id: record.layer_id, layer_name_zh: factualLayerLabels[record.layer_id] ?? record.layer_id, is_ready_for_display: record.is_ready_for_display }))}
      />

      <section className="mt-6">
        <p className="mb-3 text-xs leading-5 text-[var(--muted)]">以下地图仅保留国家导航与结构入口；不代表十国真实区域边界已通过公开展示闸门。</p>
        <InteractiveMapExplorer variant="full" />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="card p-6">
          <p className="eyebrow">Available Layers</p>
          <h2 className="mt-3 text-2xl font-semibold">可用数据与图层状态</h2>
          <div className="mt-5 grid gap-3">
            {availableLayers.map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{item.label}</p>
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{item.value}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.note}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="card p-6">
          <p className="eyebrow">Display Gate</p>
          <h2 className="mt-3 text-2xl font-semibold">真实地图启用条件</h2>
          <ol className="mt-5 grid list-decimal gap-3 pl-5 text-sm leading-6 text-[var(--muted)]">
            <li>边界来源、许可与署名要求有可核验记录。</li>
            <li>区域代码与内部 region_id 完成一对一匹配。</li>
            <li>几何完整性、坐标系与权威拓扑验收通过。</li>
            <li>公开展示准入单独判定通过后，才可调整展示状态。</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            {disabledLayers.map((layer) => (
              <span key={layer} className="rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {layer}：未启用
              </span>
            ))}
          </div>
        </article>
      </section>

      <details className="mt-6 card p-6">
        <summary className="cursor-pointer text-lg font-semibold">技术 QA 与边界证据记录</summary>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          此处保留开发与研究复核所需的当前结论。v0.12–v0.20 的过程记录已合并，不再逐版占据地图主体；完整字段仍保留在数据页和导出文件中。
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["边界来源", topology.boundary_source_name],
            ["边界文件", topology.boundary_file],
            ["区域与几何", `${topology.feature_count} / ${topology.expected_region_count}`],
            ["最终主键匹配", manifest.region_id_final_matched ? "通过" : "待核验"],
            ["许可核验", license.license_checked ? "通过" : "待核验"],
            ["权威拓扑", topology.authoritative_topology_checked ? "通过" : "待核验"],
            ["v0.21 historical public_display_ready", "false"],
            ["v0.86 factual layer decision", "true / Hungary only"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[var(--line)] bg-white/65 p-4">
              <p className="font-mono text-xs font-semibold text-[var(--muted)]">{label}</p>
              <p className="mt-2 break-words text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <details className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <summary className="cursor-pointer font-semibold">内部视觉 QA 预览</summary>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            该预览只用于检查形状、定位与候选字段，不属于正式地图图层。
          </p>
          <div className="mt-4"><HungaryBoundaryVisualQaSandbox /></div>
        </details>
      </details>
    </main>
  );
}
