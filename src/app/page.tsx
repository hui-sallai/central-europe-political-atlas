import { InteractiveMapExplorer } from "@/components/InteractiveMapExplorer";

export default function Home() {
  return (
    <main className="page-shell home-shell">
      <section className="home-first-screen">
        <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">V4 Prototype / Research Atlas</p>
            <h1 className="mt-1 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)]">
              中欧政治经济地图
            </h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--muted)]">
              点击地图或右侧国家按钮切换；首页只保留地图、当前国家、核心指标和新闻入口。
            </p>
          </div>
        </div>

        <InteractiveMapExplorer variant="home" />
      </section>
    </main>
  );
}
