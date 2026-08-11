import { HungaryBoundaryVisualQaSandbox } from "@/components/HungaryBoundaryVisualQaSandbox";
import { InteractiveMapExplorer } from "@/components/InteractiveMapExplorer";
import { StatusSummary } from "@/components/StatusSummary";
import { mapDisplayBoundary, platformStatus } from "@/lib/platformStatus";
import {
  hungaryAuthoritativeTopologyValidationDecisionSummary,
  hungaryGiscoLicenseVerificationDecisionSummary,
  hungaryNuts3ValidationManifestSummary,
} from "@/lib/regionQualityChecks";

const availableLayers = [
  { label: "国家边界与国家选择", value: "可用", note: "用于十国导航与国家切换。" },
  { label: "一级行政区结构", value: "结构样例", note: "真实区域统计与公开展示资格尚未全部接入。" },
  { label: "匈牙利 NUTS3 证据", value: "已记录", note: "许可、主键和权威拓扑核验记录已保留。" },
  { label: "对华项目地区定位接口", value: "已预留", note: "可靠 region / city 记录可进入 future project-location layer；正式项目地图未启用。" },
] as const;

const disabledLayers = ["风险图层", "预测图层", "真实党派支持率图层", "区域评分"] as const;

export default function MapPage() {
  const topology = hungaryAuthoritativeTopologyValidationDecisionSummary;
  const license = hungaryGiscoLicenseVerificationDecisionSummary;
  const manifest = hungaryNuts3ValidationManifestSummary;

  return (
    <main className="page-shell">
      <p className="eyebrow">Map Workbench / {platformStatus.version}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">地图工作台</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        地图页用于国家导航、区域数据状态检查和未来图层承接。{mapDisplayBoundary}
      </p>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Workbench Status</p>
        <h2 className="mt-3 text-2xl font-semibold">当前地图状态</h2>
        <div className="mt-5">
          <StatusSummary
            items={[
              { label: "国家导航", value: "可用", note: "十国国家选择与国家详情入口保持开放。" },
              { label: "匈牙利 NUTS3 核验", value: "证据已记录", note: "20 个区域的许可、主键与拓扑记录已保留。" },
              { label: "正式真实地图", value: "未启用", note: "仍需独立完成公开展示准入判定。" },
              { label: "模型与预测", value: "未启用", note: "不生成风险分数或选举预测。" },
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
              { label: "public_display_ready", value: String(topology.public_display_ready) },
              { label: "is_ready_for_display", value: String(topology.is_ready_for_display) },
            ]}
          />
        </div>
      </section>

      <section className="mt-6">
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
            ["public_display_ready", "false"],
            ["is_ready_for_display", "false"],
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
