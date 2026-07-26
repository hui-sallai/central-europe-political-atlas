import { InteractiveMapExplorer } from "@/components/InteractiveMapExplorer";
import { hungaryNuts3SandboxQaSummary } from "@/lib/regionQualityChecks";

export default function MapPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Interactive Map</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">V4 交互地图</h1>
      <p className="mt-4 max-w-2xl text-[var(--muted)]">
        真实行政边界待接入；当前仅保留地图工作台入口和结构样例。不新增风险图层，不新增预测图层，不新增真实党派支持率图层。
      </p>

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-white/65 p-5">
        <p className="eyebrow">Regional Map Data</p>
        <h2 className="mt-2 text-2xl font-semibold">区域地图数据准备状态</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["当前阶段", "v0.12 sandbox validation and topology QA"],
            ["区域地图数据", "匈牙利 NUTS3 沙盒验收中"],
            ["V4 ADM1 / NUTS2 边界", "待接入"],
            ["区域统计数据", "待接入"],
            ["对华项目地区定位", "准备中"],
            ["地图图层注册表", "已预留"],
            ["风险图层", "未启用"],
            ["预测图层", "未启用"],
            ["真实党派支持率图层", "未启用"],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3">
              <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">{value}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          地图页暂不显示假地图效果；边界、区域统计和项目定位通过来源与质量验收前，页面继续保持结构样例口径。
        </p>
      </section>

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-white/65 p-5">
        <p className="eyebrow">v0.12 Sandbox Validation And Topology QA</p>
        <h2 className="mt-2 text-2xl font-semibold">v0.12 匈牙利 NUTS3 沙盒验收状态</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--line)] bg-white/70">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs text-[var(--muted)]">
              <tr>
                <th className="border-b border-[var(--line)] px-4 py-3 font-semibold">字段</th>
                <th className="border-b border-[var(--line)] px-4 py-3 font-semibold">匈牙利试点值</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["试点国家", "匈牙利"],
                ["试点层级", "NUTS 3 / Megyék"],
                ["边界来源", "Eurostat GISCO NUTS 2024"],
                ["候选文件", "NUTS_RG_01M_2024_4326_LEVL_3.geojson"],
                ["边界格式", "GeoJSON"],
                ["坐标系", "EPSG:4326"],
                ["来源等级", "A"],
                ["许可状态", "待确认 / 待接受使用条款"],
                ["几何状态", "sandbox_downloaded / sandbox_filtered"],
                ["要素数量", `${hungaryNuts3SandboxQaSummary.feature_count} / ${hungaryNuts3SandboxQaSummary.expected_feature_count}`],
                ["NUTS code 数量", String(hungaryNuts3SandboxQaSummary.nuts_code_count)],
                ["CRS 确认", hungaryNuts3SandboxQaSummary.crs_confirmed ? "EPSG:4326 已确认（沙盒）" : "待确认"],
                ["几何完整性", `${hungaryNuts3SandboxQaSummary.geometry_present_count} / ${hungaryNuts3SandboxQaSummary.expected_feature_count}`],
                ["主键状态", "20 / 20 预匹配；待最终核验"],
                ["拓扑检查", "基础 QA 已执行；权威拓扑验收待完成"],
                ["topology_status", hungaryNuts3SandboxQaSummary.topology_status],
                ["是否进入真实地图展示", "否"],
                ["is_ready_for_display", "false"],
              ].map(([field, value]) => (
                <tr key={field} className="border-b border-[var(--line)] last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-[var(--foreground)]">{field}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          v0.12 只做沙盒验证与基础拓扑 QA；过滤完成或 20 / 20 预匹配均不代表正式验收通过。来源、许可、文件、CRS、几何、权威拓扑、最终主键和质量验收全部通过前，真实地图展示仍未启用。
        </p>
      </section>

      <div className="mt-8">
        <InteractiveMapExplorer />
      </div>
    </main>
  );
}
