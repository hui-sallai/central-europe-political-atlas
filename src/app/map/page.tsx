import { InteractiveMapExplorer } from "@/components/InteractiveMapExplorer";

export default function MapPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Interactive Map</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">V4 交互地图</h1>
      <p className="mt-4 max-w-2xl text-[var(--muted)]">
        真实行政边界待接入；当前仅保留地图工作台入口和结构样例。不新增风险图层，不新增预测图层，不新增真实党派支持率图层。
      </p>

      <div className="mt-8">
        <InteractiveMapExplorer />
      </div>
    </main>
  );
}
