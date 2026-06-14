import { InteractiveMapExplorer } from "@/components/InteractiveMapExplorer";

export default function MapPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Interactive Map</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">V4 交互地图</h1>
      <p className="mt-4 max-w-2xl text-[var(--muted)]">
        这个页面保留为独立地图入口；首页已经是主交互页。侧边栏可在当前国家档案和新闻周报之间切换。
      </p>

      <div className="mt-8">
        <InteractiveMapExplorer />
      </div>
    </main>
  );
}
