import { InteractiveMapExplorer } from "@/components/InteractiveMapExplorer";

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

      <div className="mt-8">
        <InteractiveMapExplorer />
      </div>
    </main>
  );
}
